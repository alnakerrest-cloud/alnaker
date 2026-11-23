import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { assertNotProduction } from "./persistence-mode";

export interface LocalOverlayData {
  updated: Record<string, Record<string, any>>;
  created: Record<string, any[]>;
  deleted: Record<string, string[]>;
}

const OVERLAY_FILE = path.join(process.cwd(), "data", "local-db-overlay.json");
const BACKUP_FILE = path.join(process.cwd(), "backups", "backup-naqer-verified.json");

// Prisma returns real Date objects; the JSON backup/overlay only stores ISO strings.
// Normalising the known DateTime fields on read keeps page code (`createdAt.toISOString()`)
// working identically in local mode and on Neon.
const DATE_FIELDS = new Set([
  "createdAt", "updatedAt", "lastLoginAt", "expiresAt",
  "startedAt", "finishedAt", "startDate", "endDate",
]);

// Relations that the engine can resolve. Used to translate nested Prisma `select`
// clauses into relation resolution (the dashboard uses both `include` and `select`).
const RELATION_KEYS: Partial<Record<keyof TableState, string[]>> = {
  Category: ["sections"],
  Section: ["category", "products"],
  Product: ["variants", "images", "section", "optionGroups"],
  ProductImage: ["product"],
  OptionGroup: ["options", "productAssignments"],
  OptionItem: ["group"],
  ProductOptionGroup: ["group", "product"],
  Offer: ["productTargets", "categoryTargets", "locationTargets"],
};

interface TableState {
  Category: any[];
  Section: any[];
  Product: any[];
  ProductVariant: any[];
  ProductImage: any[];
  Branch: any[];
  RestaurantSettings: any[];
  Offer: any[];
  OptionGroup: any[];
  OptionItem: any[];
  ProductOptionGroup: any[];
  AddonGroup: any[];
  Addon: any[];
  AuditLog: any[];
  ImportJob: any[];
}

class LocalDbEngine {
  private tables: TableState | null = null;
  private overlay: LocalOverlayData = {
    updated: {},
    created: {},
    deleted: {},
  };

  constructor() {
    this.init();
  }

  private ensureDir() {
    const dir = path.dirname(OVERLAY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadOverlay(): LocalOverlayData {
    this.ensureDir();
    if (!fs.existsSync(OVERLAY_FILE)) {
      return { updated: {}, created: {}, deleted: {} };
    }
    try {
      const content = fs.readFileSync(OVERLAY_FILE, "utf8");
      return JSON.parse(content);
    } catch (err) {
      console.error("[local-db-engine] Failed to parse overlay, using empty:", err);
      return { updated: {}, created: {}, deleted: {} };
    }
  }

  private lastOverlayMtime = 0;

  private checkDiskSync(): void {
    if (fs.existsSync(OVERLAY_FILE)) {
      try {
        const mtime = fs.statSync(OVERLAY_FILE).mtimeMs;
        if (mtime > this.lastOverlayMtime) {
          this.lastOverlayMtime = mtime;
          if (this.tables) {
            this.init(true);
          }
        }
      } catch {}
    }
  }

  private saveOverlay(): void {
    assertNotProduction("LocalDbEngine.saveOverlay");
    this.ensureDir();
    const tmp = `${OVERLAY_FILE}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.overlay, null, 2), "utf8");
    fs.renameSync(tmp, OVERLAY_FILE);
    try {
      this.lastOverlayMtime = fs.statSync(OVERLAY_FILE).mtimeMs;
    } catch {}
  }

  public init(forceReload = false): void {
    if (this.tables && !forceReload) return;

    if (!fs.existsSync(BACKUP_FILE)) {
      throw new Error(`[local-db-engine] Verified backup not found at ${BACKUP_FILE}`);
    }

    const backupContent = fs.readFileSync(BACKUP_FILE, "utf8");
    const backupJson = JSON.parse(backupContent);
    const backupTables = backupJson.tables || {};

    this.overlay = this.loadOverlay();

    // Deep clone backup tables
    const state: TableState = {
      Category: JSON.parse(JSON.stringify(backupTables.Category || [])),
      Section: JSON.parse(JSON.stringify(backupTables.Section || [])),
      Product: JSON.parse(JSON.stringify(backupTables.Product || [])),
      ProductVariant: JSON.parse(JSON.stringify(backupTables.ProductVariant || [])),
      ProductImage: JSON.parse(JSON.stringify(backupTables.ProductImage || [])),
      Branch: JSON.parse(JSON.stringify(backupTables.Branch || [])),
      RestaurantSettings: JSON.parse(JSON.stringify(backupTables.RestaurantSettings || [])),
      Offer: JSON.parse(JSON.stringify(backupTables.Offer || [])),
      OptionGroup: JSON.parse(JSON.stringify(backupTables.OptionGroup || [])),
      OptionItem: JSON.parse(JSON.stringify(backupTables.OptionItem || [])),
      ProductOptionGroup: JSON.parse(JSON.stringify(backupTables.ProductOptionGroup || [])),
      AddonGroup: JSON.parse(JSON.stringify(backupTables.OptionGroup || [])),
      Addon: JSON.parse(JSON.stringify(backupTables.OptionItem || [])),
      AuditLog: JSON.parse(JSON.stringify(backupTables.AuditLog || [])),
      ImportJob: JSON.parse(JSON.stringify(backupTables.ImportJob || [])),
    };

    // Apply overlay
    for (const [tableName, records] of Object.entries(this.overlay.created || {})) {
      if ((state as any)[tableName] && Array.isArray(records)) {
        for (const rec of records) {
          (state as any)[tableName].push(rec);
        }
      }
    }

    for (const [tableName, updates] of Object.entries(this.overlay.updated || {})) {
      if ((state as any)[tableName] && typeof updates === "object") {
        for (const [id, patch] of Object.entries(updates)) {
          const idx = (state as any)[tableName].findIndex((r: any) => r.id === id);
          if (idx !== -1) {
            (state as any)[tableName][idx] = { ...(state as any)[tableName][idx], ...patch };
          }
        }
      }
    }

    for (const [tableName, deletedIds] of Object.entries(this.overlay.deleted || {})) {
      if ((state as any)[tableName] && Array.isArray(deletedIds)) {
        const delSet = new Set(deletedIds);
        (state as any)[tableName] = (state as any)[tableName].filter((r: any) => !delSet.has(r.id));
      }
    }

    this.tables = state;
  }

  public getTables(): TableState {
    this.checkDiskSync();
    this.init();
    return this.tables!;
  }

  public getRawTable(name: keyof TableState): any[] {
    this.checkDiskSync();
    this.init();
    return this.tables![name] || [];
  }

  // Record mutation helpers
  public recordUpdate(tableName: string, id: string, patch: any): void {
    assertNotProduction(`LocalDbEngine.recordUpdate(${tableName})`);
    if (!this.overlay.updated[tableName]) {
      this.overlay.updated[tableName] = {};
    }
    this.overlay.updated[tableName][id] = {
      ...(this.overlay.updated[tableName][id] || {}),
      ...patch,
    };
    this.saveOverlay();
  }

  public recordCreate(tableName: string, record: any): void {
    assertNotProduction(`LocalDbEngine.recordCreate(${tableName})`);
    if (!this.overlay.created[tableName]) {
      this.overlay.created[tableName] = [];
    }
    this.overlay.created[tableName].push(record);
    this.saveOverlay();
  }

  public recordDelete(tableName: string, id: string): void {
    assertNotProduction(`LocalDbEngine.recordDelete(${tableName})`);
    if (!this.overlay.deleted[tableName]) {
      this.overlay.deleted[tableName] = [];
    }
    if (!this.overlay.deleted[tableName].includes(id)) {
      this.overlay.deleted[tableName].push(id);
    }
    // Remove from created if it was created locally
    if (this.overlay.created[tableName]) {
      this.overlay.created[tableName] = this.overlay.created[tableName].filter((r) => r.id !== id);
    }
    if (this.overlay.updated[tableName]) {
      delete this.overlay.updated[tableName][id];
    }
    this.saveOverlay();
  }

  // Model Delegate Factory
  public getDelegate(modelName: keyof TableState) {
    const engine = this;

    return {
      async count(args?: { where?: any }): Promise<number> {
        const rows = engine.filterRows(modelName, args?.where);
        return rows.length;
      },

      async findMany(args?: {
        where?: any;
        orderBy?: any;
        skip?: number;
        take?: number;
        include?: any;
        select?: any;
        distinct?: string[];
      }): Promise<any[]> {
        let rows = engine.filterRows(modelName, args?.where);
        rows = engine.sortRows(rows, args?.orderBy);

        if (args?.distinct?.length) {
          const seen = new Set<string>();
          rows = rows.filter((row) => {
            const key = args.distinct!.map((field) => JSON.stringify(row[field])).join("|");
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }

        if (args?.skip != null && args.skip > 0) {
          rows = rows.slice(args.skip);
        }
        if (args?.take != null && args.take >= 0) {
          rows = rows.slice(0, args.take);
        }

        return rows.map((r) => engine.resolveRelations(modelName, r, args?.include, args?.select));
      },

      async findUnique(args: { where: any; include?: any; select?: any }): Promise<any | null> {
        const rows = engine.filterRows(modelName, args.where);
        if (!rows.length) return null;
        return engine.resolveRelations(modelName, rows[0], args.include, args.select);
      },

      async findFirst(args?: {
        where?: any;
        orderBy?: any;
        include?: any;
        select?: any;
      }): Promise<any | null> {
        let rows = engine.filterRows(modelName, args?.where);
        rows = engine.sortRows(rows, args?.orderBy);
        if (!rows.length) return null;
        return engine.resolveRelations(modelName, rows[0], args?.include, args?.select);
      },

      async create(args: { data: any; include?: any; select?: any }): Promise<any> {
        const data = { ...args.data };
        const id = data.id || crypto.randomUUID();
        const now = new Date().toISOString();

        // Handle nested creates
        const nestedVariants = data.variants?.create;
        delete data.variants;

        const nestedImages = data.images?.create;
        delete data.images;

        const nestedOptions = data.options?.create;
        delete data.options;

        const nestedAssignments = data.productAssignments?.create;
        delete data.productAssignments;

        const nestedProductTargets = Array.isArray(data.productTargets?.create)
          ? data.productTargets.create
          : Array.isArray(data.productTargets)
          ? data.productTargets
          : [];
        delete data.productTargets;

        const nestedCategoryTargets = Array.isArray(data.categoryTargets?.create)
          ? data.categoryTargets.create
          : Array.isArray(data.categoryTargets)
          ? data.categoryTargets
          : [];
        delete data.categoryTargets;

        const nestedLocationTargets = Array.isArray(data.locationTargets?.create)
          ? data.locationTargets.create
          : Array.isArray(data.locationTargets)
          ? data.locationTargets
          : [];
        delete data.locationTargets;

        const record = {
          ...data,
          id,
          createdAt: data.createdAt || now,
          updatedAt: data.updatedAt || now,
          productTargets: nestedProductTargets.map((pt: any) => ({
            id: pt.id || crypto.randomUUID(),
            offerId: id,
            productId: pt.productId,
            createdAt: now,
          })),
          categoryTargets: nestedCategoryTargets.map((ct: any) => ({
            id: ct.id || crypto.randomUUID(),
            offerId: id,
            categoryId: ct.categoryId,
            createdAt: now,
          })),
          locationTargets: nestedLocationTargets.map((lt: any) => ({
            id: lt.id || crypto.randomUUID(),
            offerId: id,
            targetLocationId: lt.targetLocationId,
            createdAt: now,
          })),
        };

        const table = engine.getRawTable(modelName);
        table.push(record);
        engine.recordCreate(modelName, record);

        // Nested variants create
        if (nestedVariants && Array.isArray(nestedVariants)) {
          const varTable = engine.getRawTable("ProductVariant");
          for (let i = 0; i < nestedVariants.length; i++) {
            const v = nestedVariants[i];
            const vRec = {
              id: crypto.randomUUID(),
              productId: id,
              labelAr: v.labelAr ?? null,
              price: String(v.price),
              maxPrice: v.maxPrice != null ? String(v.maxPrice) : null,
              sortOrder: v.sortOrder ?? i,
              isAvailable: v.isAvailable ?? true,
            };
            varTable.push(vRec);
            engine.recordCreate("ProductVariant", vRec);
          }
        }

        // Nested images create
        if (nestedImages && Array.isArray(nestedImages)) {
          const imgTable = engine.getRawTable("ProductImage");
          for (let i = 0; i < nestedImages.length; i++) {
            const img = nestedImages[i];
            const imgRec = {
              id: crypto.randomUUID(),
              productId: id,
              url: img.url,
              publicId: img.publicId,
              altAr: img.altAr ?? null,
              isPrimary: img.isPrimary ?? (i === 0),
              sortOrder: img.sortOrder ?? i,
              createdAt: now,
            };
            imgTable.push(imgRec);
            engine.recordCreate("ProductImage", imgRec);
          }
        }

        // Nested option items & assignments create
        if (nestedOptions && Array.isArray(nestedOptions)) {
          const optTable = engine.getRawTable("OptionItem");
          for (let i = 0; i < nestedOptions.length; i++) {
            const opt = nestedOptions[i];
            const optRec = {
              id: crypto.randomUUID(),
              groupId: id,
              nameAr: opt.nameAr,
              nameEn: opt.nameEn ?? null,
              price: Number(opt.price ?? 0),
              isActive: opt.isActive ?? true,
              sortOrder: opt.sortOrder ?? i,
              createdAt: now,
              updatedAt: now,
            };
            optTable.push(optRec);
            engine.recordCreate("OptionItem", optRec);
          }
        }

        if (nestedAssignments && Array.isArray(nestedAssignments)) {
          const pogTable = engine.getRawTable("ProductOptionGroup");
          for (let i = 0; i < nestedAssignments.length; i++) {
            const a = nestedAssignments[i];
            const aRec = {
              id: crypto.randomUUID(),
              groupId: id,
              productId: a.productId,
              sortOrder: a.sortOrder ?? i,
            };
            pogTable.push(aRec);
            engine.recordCreate("ProductOptionGroup", aRec);
          }
        }

        return engine.resolveRelations(modelName, record, args.include, args.select);
      },

      async createMany(args: { data: any[] }): Promise<{ count: number }> {
        const records = Array.isArray(args.data) ? args.data : [args.data];
        let count = 0;
        const now = new Date().toISOString();
        const table = engine.getRawTable(modelName);

        for (const d of records) {
          const id = d.id || crypto.randomUUID();
          const rec = { ...d, id, createdAt: d.createdAt || now, updatedAt: d.updatedAt || now };
          table.push(rec);
          engine.recordCreate(modelName, rec);
          count++;
        }
        return { count };
      },

      async update(args: { where: any; data: any; include?: any; select?: any }): Promise<any> {
        const rows = engine.filterRows(modelName, args.where);
        if (!rows.length) {
          throw new Error(`Record to update not found in ${modelName}`);
        }
        const existing = rows[0];
        const data = { ...args.data };
        const now = new Date().toISOString();

        // Handle nested variant replacements (deleteMany + create)
        if (data.variants) {
          const varTable = engine.getRawTable("ProductVariant");
          if (data.variants.deleteMany) {
            const oldVars = varTable.filter((v: any) => v.productId === existing.id);
            for (const v of oldVars) {
              engine.recordDelete("ProductVariant", v.id);
            }
            engine.tables!.ProductVariant = varTable.filter((v: any) => v.productId !== existing.id);
          }
          if (data.variants.create && Array.isArray(data.variants.create)) {
            for (let i = 0; i < data.variants.create.length; i++) {
              const v = data.variants.create[i];
              const vRec = {
                id: crypto.randomUUID(),
                productId: existing.id,
                labelAr: v.labelAr ?? null,
                price: String(v.price),
                maxPrice: v.maxPrice != null ? String(v.maxPrice) : null,
                sortOrder: v.sortOrder ?? i,
                isAvailable: v.isAvailable ?? true,
              };
              engine.tables!.ProductVariant.push(vRec);
              engine.recordCreate("ProductVariant", vRec);
            }
          }
          delete data.variants;
        }

        // Handle nested image replacements
        if (data.images) {
          const imgTable = engine.getRawTable("ProductImage");
          if (data.images.deleteMany) {
            const oldImgs = imgTable.filter((m: any) => m.productId === existing.id);
            for (const m of oldImgs) {
              engine.recordDelete("ProductImage", m.id);
            }
            engine.tables!.ProductImage = imgTable.filter((m: any) => m.productId !== existing.id);
          }
          if (data.images.create && Array.isArray(data.images.create)) {
            for (let i = 0; i < data.images.create.length; i++) {
              const img = data.images.create[i];
              const imgRec = {
                id: crypto.randomUUID(),
                productId: existing.id,
                url: img.url,
                publicId: img.publicId,
                altAr: img.altAr ?? null,
                isPrimary: img.isPrimary ?? (i === 0),
                sortOrder: img.sortOrder ?? i,
                createdAt: now,
              };
              engine.tables!.ProductImage.push(imgRec);
              engine.recordCreate("ProductImage", imgRec);
            }
          }
          delete data.images;
        }

        const updated = {
          ...existing,
          ...data,
          updatedAt: now,
        };

        const table = engine.getRawTable(modelName);
        const idx = table.findIndex((r: any) => r.id === existing.id);
        if (idx !== -1) {
          table[idx] = updated;
        }

        engine.recordUpdate(modelName, existing.id, data);
        return engine.resolveRelations(modelName, updated, args.include, args.select);
      },

      async delete(args: { where: any; include?: any; select?: any }): Promise<any> {
        const rows = engine.filterRows(modelName, args.where);
        if (!rows.length) {
          throw new Error(`Record to delete not found in ${modelName}`);
        }
        const existing = rows[0];

        // Also cascade delete variants and images if deleting a Product
        if (modelName === "Product") {
          const varTable = engine.getRawTable("ProductVariant");
          const varsToDelete = varTable.filter((v: any) => v.productId === existing.id);
          for (const v of varsToDelete) {
            engine.recordDelete("ProductVariant", v.id);
          }
          engine.tables!.ProductVariant = varTable.filter((v: any) => v.productId !== existing.id);

          const imgTable = engine.getRawTable("ProductImage");
          const imgsToDelete = imgTable.filter((m: any) => m.productId === existing.id);
          for (const m of imgsToDelete) {
            engine.recordDelete("ProductImage", m.id);
          }
          engine.tables!.ProductImage = imgTable.filter((m: any) => m.productId !== existing.id);
        }

        if (modelName === "OptionGroup") {
          const optTable = engine.getRawTable("OptionItem");
          const optsToDelete = optTable.filter((o: any) => o.groupId === existing.id);
          for (const o of optsToDelete) {
            engine.recordDelete("OptionItem", o.id);
          }
          engine.tables!.OptionItem = optTable.filter((o: any) => o.groupId !== existing.id);

          const pogTable = engine.getRawTable("ProductOptionGroup");
          const pogsToDelete = pogTable.filter((p: any) => p.groupId === existing.id);
          for (const p of pogsToDelete) {
            engine.recordDelete("ProductOptionGroup", p.id);
          }
          engine.tables!.ProductOptionGroup = pogTable.filter((p: any) => p.groupId !== existing.id);
        }

        const table = engine.getRawTable(modelName);
        engine.tables![modelName] = table.filter((r: any) => r.id !== existing.id);
        engine.recordDelete(modelName, existing.id);

        return engine.resolveRelations(modelName, existing, args.include, args.select);
      },

      async deleteMany(args: { where?: any }): Promise<{ count: number }> {
        const rows = engine.filterRows(modelName, args?.where);
        const toDeleteIds = new Set(rows.map((r: any) => r.id));

        const table = engine.getRawTable(modelName);
        engine.tables![modelName] = table.filter((r: any) => !toDeleteIds.has(r.id));

        for (const id of toDeleteIds) {
          engine.recordDelete(modelName, id);
        }
        return { count: rows.length };
      },

      async upsert(args: { where: any; create: any; update: any; include?: any; select?: any }): Promise<any> {
        const rows = engine.filterRows(modelName, args.where);
        if (rows.length > 0) {
          return this.update({ where: args.where, data: args.update, include: args.include, select: args.select });
        } else {
          return this.create({ data: args.create, include: args.include, select: args.select });
        }
      },
    };
  }

  // Row filtering implementation
  private filterRows(modelName: keyof TableState, where?: any): any[] {
    const all = this.getRawTable(modelName);
    if (!where || Object.keys(where).length === 0) return [...all];

    return all.filter((row) => this.matchWhere(row, where));
  }

  private matchWhere(row: any, where: any): boolean {
    if (!where) return true;

    for (const [key, cond] of Object.entries(where)) {
      if (key === "AND") {
        const conditions = Array.isArray(cond) ? cond : [cond];
        for (const c of conditions) {
          if (!this.matchWhere(row, c)) return false;
        }
        continue;
      }

      if (key === "OR") {
        const conditions = Array.isArray(cond) ? cond : [cond];
        if (!conditions.length) continue;
        const anyMatch = conditions.some((c) => this.matchWhere(row, c));
        if (!anyMatch) return false;
        continue;
      }

      if (key === "NOT") {
        const conditions = Array.isArray(cond) ? cond : [cond];
        for (const c of conditions) {
          if (this.matchWhere(row, c)) return false;
        }
        continue;
      }

      // Check relation filter: e.g. section: { categoryId: ... }
      if (key === "section" && typeof cond === "object" && cond !== null) {
        const section = this.getRawTable("Section").find((s) => s.id === row.sectionId);
        if (!section || !this.matchWhere(section, cond)) return false;
        continue;
      }

      if (key === "category" && typeof cond === "object" && cond !== null) {
        const cat = this.getRawTable("Category").find((c) => c.id === row.categoryId);
        if (!cat || !this.matchWhere(cat, cond)) return false;
        continue;
      }

      const val = row[key];

      if (cond === undefined) continue;

      if (cond === null) {
        if (val !== null && val !== undefined) return false;
        continue;
      }

      if (typeof cond === "object" && !Array.isArray(cond)) {
        const cObj = cond as Record<string, any>;
        if (cObj.equals !== undefined && val !== cObj.equals) return false;
        if (cObj.not !== undefined && val === cObj.not) return false;
        if (cObj.in && Array.isArray(cObj.in) && !cObj.in.includes(val)) return false;
        if (cObj.notIn && Array.isArray(cObj.notIn) && cObj.notIn.includes(val)) return false;

        if (cObj.contains !== undefined) {
          const strVal = String(val ?? "");
          const search = String(cObj.contains);
          if (cObj.mode === "insensitive") {
            if (!strVal.toLowerCase().includes(search.toLowerCase())) return false;
          } else {
            if (!strVal.includes(search)) return false;
          }
        }

        if (cObj.startsWith !== undefined && !String(val ?? "").startsWith(String(cObj.startsWith))) return false;
        if (cObj.endsWith !== undefined && !String(val ?? "").endsWith(String(cObj.endsWith))) return false;

        if (cObj.gte !== undefined) {
          const dVal = val instanceof Date ? val.getTime() : new Date(val).getTime();
          const dTarget = cObj.gte instanceof Date ? cObj.gte.getTime() : new Date(cObj.gte).getTime();
          if (Number.isFinite(dVal) && Number.isFinite(dTarget)) {
            if (dVal < dTarget) return false;
          } else if (Number(val) < Number(cObj.gte)) {
            return false;
          }
        }

        if (cObj.gt !== undefined) {
          const dVal = val instanceof Date ? val.getTime() : new Date(val).getTime();
          const dTarget = cObj.gt instanceof Date ? cObj.gt.getTime() : new Date(cObj.gt).getTime();
          if (Number.isFinite(dVal) && Number.isFinite(dTarget)) {
            if (dVal <= dTarget) return false;
          } else if (Number(val) <= Number(cObj.gt)) {
            return false;
          }
        }

        if (cObj.lte !== undefined) {
          const dVal = val instanceof Date ? val.getTime() : new Date(val).getTime();
          const dTarget = cObj.lte instanceof Date ? cObj.lte.getTime() : new Date(cObj.lte).getTime();
          if (Number.isFinite(dVal) && Number.isFinite(dTarget)) {
            if (dVal > dTarget) return false;
          } else if (Number(val) > Number(cObj.lte)) {
            return false;
          }
        }

        if (cObj.lt !== undefined) {
          const dVal = val instanceof Date ? val.getTime() : new Date(val).getTime();
          const dTarget = cObj.lt instanceof Date ? cObj.lt.getTime() : new Date(cObj.lt).getTime();
          if (Number.isFinite(dVal) && Number.isFinite(dTarget)) {
            if (dVal >= dTarget) return false;
          } else if (Number(val) >= Number(cObj.lt)) {
            return false;
          }
        }

        continue;
      }

      // Simple direct equality
      if (val !== cond) return false;
    }

    return true;
  }

  private sortRows(rows: any[], orderBy?: any): any[] {
    if (!orderBy) return rows;
    const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
    if (!orders.length) return rows;

    return [...rows].sort((a, b) => {
      for (const ord of orders) {
        for (const [key, dir] of Object.entries(ord)) {
          const isDesc = String(dir).toLowerCase() === "desc";
          const aVal = a[key];
          const bVal = b[key];

          if (aVal === bVal) continue;
          if (aVal == null) return isDesc ? -1 : 1;
          if (bVal == null) return isDesc ? 1 : -1;

          if (typeof aVal === "number" && typeof bVal === "number") {
            return isDesc ? bVal - aVal : aVal - bVal;
          }
          const cmp = String(aVal).localeCompare(String(bVal));
          if (cmp !== 0) return isDesc ? -cmp : cmp;
        }
      }
      return 0;
    });
  }

  /** JSON storage keeps dates as strings; Prisma callers expect Date instances. */
  private normalizeDates(row: any): any {
    if (!row || typeof row !== "object") return row;
    const out: any = { ...row };
    for (const field of DATE_FIELDS) {
      const value = out[field];
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) continue;
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) out[field] = parsed;
    }
    return out;
  }

  /** Turn relation keys requested via `select` into the same shape used by `include`. */
  private relationsFromSelect(modelName: keyof TableState, select?: any): any {
    const out: any = {};
    const allowed = RELATION_KEYS[modelName] ?? [];
    if (!select || typeof select !== "object" || Array.isArray(select)) return out;

    for (const [key, spec] of Object.entries(select)) {
      if (!allowed.includes(key)) continue;
      if (spec === true) {
        out[key] = true;
      } else if (spec && typeof spec === "object" && !Array.isArray(spec)) {
        out[key] =
          "select" in spec || "include" in spec || "where" in spec || "orderBy" in spec
            ? spec
            : { select: spec };
      }
    }
    return out;
  }

  /** Merge explicit `include` with relations implied by a nested `select`. */
  private effectiveInclude(modelName: keyof TableState, include?: any, select?: any): any {
    const fromSelect = this.relationsFromSelect(modelName, select);
    if (!include) return Object.keys(fromSelect).length ? fromSelect : include;
    if (!Object.keys(fromSelect).length) return include;

    const merged: any = { ...fromSelect };
    for (const [key, value] of Object.entries(include)) {
      const existing = merged[key];
      if (
        existing && value &&
        typeof existing === "object" && typeof value === "object" &&
        !Array.isArray(existing) && !Array.isArray(value)
      ) {
        merged[key] = { ...existing, ...value };
      } else {
        merged[key] = value;
      }
    }
    return merged;
  }

  /** Prisma-style `_count` for the relations the admin UI actually counts. */
  private countRelation(modelName: keyof TableState, row: any, relation: string): number | undefined {
    switch (modelName) {
      case "Category":
        if (relation === "sections") return this.getRawTable("Section").filter((s) => s.categoryId === row.id).length;
        break;
      case "Section":
        if (relation === "products") return this.getRawTable("Product").filter((p) => p.sectionId === row.id).length;
        break;
      case "Product":
        if (relation === "variants") return this.getRawTable("ProductVariant").filter((v) => v.productId === row.id).length;
        if (relation === "images") return this.getRawTable("ProductImage").filter((m) => m.productId === row.id).length;
        if (relation === "optionGroups") return this.getRawTable("ProductOptionGroup").filter((p) => p.productId === row.id).length;
        break;
      case "OptionGroup":
        if (relation === "options") return this.getRawTable("OptionItem").filter((o) => o.groupId === row.id).length;
        if (relation === "productAssignments") return this.getRawTable("ProductOptionGroup").filter((p) => p.groupId === row.id).length;
        break;
    }
    return undefined;
  }

  private resolveRelations(
    modelName: keyof TableState,
    row: any,
    include?: any,
    select?: any
  ): any {
    if (!row) return row;
    const result: any = this.normalizeDates(row);
    include = this.effectiveInclude(modelName, include, select);

    // Resolve inclusions
    if (include) {
      if (include._count) {
        const requested = include._count.select ?? include._count;
        const counts: Record<string, number> = {};
        for (const [relation, wanted] of Object.entries(requested)) {
          if (wanted !== true) continue;
          const count = this.countRelation(modelName, row, relation);
          if (count !== undefined) counts[relation] = count;
        }
        result._count = counts;
      }

      if (modelName === "Product") {
        if (include.variants) {
          let vars = this.getRawTable("ProductVariant").filter((v) => v.productId === row.id);
          if (include.variants.orderBy) {
            vars = this.sortRows(vars, include.variants.orderBy);
          }
          if (include.variants.select) {
            vars = vars.map((v) => this.pickSelect(v, include.variants.select));
          }
          result.variants = vars;
        }

        if (include.images) {
          let imgs = this.getRawTable("ProductImage").filter((m) => m.productId === row.id);
          if (include.images.orderBy) {
            imgs = this.sortRows(imgs, include.images.orderBy);
          }
          result.images = imgs;
        }

        if (include.section) {
          const sec = this.getRawTable("Section").find((s) => s.id === row.sectionId);
          if (sec) {
            result.section = this.resolveRelations("Section", sec, include.section.include, include.section.select);
          } else {
            result.section = null;
          }
        }

        if (include.optionGroups) {
          let pogs = this.getRawTable("ProductOptionGroup").filter((pog) => pog.productId === row.id);
          if (include.optionGroups.orderBy) {
            pogs = this.sortRows(pogs, include.optionGroups.orderBy);
          }
          result.optionGroups = pogs.map((pog) => {
            const group = this.getRawTable("OptionGroup").find((g) => g.id === pog.groupId);
            return {
              ...pog,
              group: group ? this.resolveRelations("OptionGroup", group, include.optionGroups.include?.group?.include, include.optionGroups.include?.group?.select) : null,
            };
          });
        }
      }

      if (modelName === "Section") {
        if (include.category) {
          const cat = this.getRawTable("Category").find((c) => c.id === row.categoryId);
          if (cat) {
            result.category = this.resolveRelations("Category", cat, include.category.include, include.category.select);
          } else {
            result.category = null;
          }
        }

        if (include.products) {
          let prods = this.getRawTable("Product").filter((p) => p.sectionId === row.id);
          if (include.products.orderBy) {
            prods = this.sortRows(prods, include.products.orderBy);
          }
          result.products = prods.map((p) =>
            this.resolveRelations("Product", p, include.products.include, include.products.select)
          );
        }
      }

      if (modelName === "Category") {
        if (include.sections) {
          let secs = this.getRawTable("Section").filter((s) => s.categoryId === row.id);
          if (include.sections.orderBy) {
            secs = this.sortRows(secs, include.sections.orderBy);
          }
          result.sections = secs.map((s) =>
            this.resolveRelations("Section", s, include.sections.include, include.sections.select)
          );
        }
      }

      if (modelName === "Offer") {
        if (include.productTargets) {
          const rawTargets = Array.isArray(row.productTargets)
            ? row.productTargets
            : Array.isArray(row.productTargets?.create)
            ? row.productTargets.create
            : [];
          result.productTargets = rawTargets.map((pt: any) => {
            const prod = this.getRawTable("Product").find((p) => p.id === pt.productId);
            return {
              ...pt,
              product: prod ? this.resolveRelations("Product", prod, pt.include?.product?.include, pt.include?.product?.select) : null,
            };
          });
        }
        if (include.categoryTargets) {
          result.categoryTargets = Array.isArray(row.categoryTargets)
            ? row.categoryTargets
            : Array.isArray(row.categoryTargets?.create)
            ? row.categoryTargets.create
            : [];
        }
        if (include.locationTargets) {
          result.locationTargets = Array.isArray(row.locationTargets)
            ? row.locationTargets
            : Array.isArray(row.locationTargets?.create)
            ? row.locationTargets.create
            : [];
        }
      }

      if (modelName === "OptionGroup") {
        if (include.options) {
          let opts = this.getRawTable("OptionItem").filter((o) => o.groupId === row.id);
          if (include.options.where) {
            opts = opts.filter((o) => this.matchWhere(o, include.options.where));
          }
          if (include.options.orderBy) {
            opts = this.sortRows(opts, include.options.orderBy);
          }
          result.options = opts;
        }
        if (include.productAssignments) {
          let pogs = this.getRawTable("ProductOptionGroup").filter((pog) => pog.groupId === row.id);
          if (include.productAssignments.include?.product) {
            pogs = pogs.map((pog) => {
              const prod = this.getRawTable("Product").find((p) => p.id === pog.productId);
              return {
                ...pog,
                product: prod ? this.resolveRelations("Product", prod, include.productAssignments.include.product.include, include.productAssignments.include.product.select) : null,
              };
            });
          }
          result.productAssignments = pogs;
        }
      }

      if (modelName === "OptionItem") {
        if (include.group) {
          const grp = this.getRawTable("OptionGroup").find((g) => g.id === row.groupId);
          result.group = grp ? this.resolveRelations("OptionGroup", grp, include.group.include, include.group.select) : null;
        }
      }

      if (modelName === "ProductOptionGroup") {
        if (include.group) {
          const grp = this.getRawTable("OptionGroup").find((g) => g.id === row.groupId);
          result.group = grp ? this.resolveRelations("OptionGroup", grp, include.group.include, include.group.select) : null;
        }
        if (include.product) {
          const prod = this.getRawTable("Product").find((p) => p.id === row.productId);
          result.product = prod ? this.resolveRelations("Product", prod, include.product.include, include.product.select) : null;
        }
      }

      if (modelName === "ProductImage" && include.product) {
        const prod = this.getRawTable("Product").find((p) => p.id === row.productId);
        result.product = prod ? this.resolveRelations("Product", prod, include.product.include, include.product.select) : null;
      }
    }

    if (select) {
      return this.pickSelect(result, select);
    }

    return result;
  }

  private pickSelect(record: any, select: Record<string, any>): any {
    const out: any = {};
    for (const [key, val] of Object.entries(select)) {
      if (val === false) continue;
      if (val === true) {
        out[key] = record?.[key];
      } else if (typeof val === "object" && val !== null) {
        // Prisma nested selections are wrapped as `{ select: {...} }` (or
        // `{ include: {...} }`); unwrap them before copying the chosen fields.
        const nested = val.select && typeof val.select === "object" ? val.select : val;
        const value = record?.[key];
        if (Array.isArray(value)) {
          out[key] = value.map((item: any) => this.pickSelect(item, nested));
        } else if (value && typeof value === "object") {
          out[key] = this.pickSelect(value, nested);
        } else {
          out[key] = value;
        }
      }
    }
    return out;
  }
}

// Singleton Engine
const globalForLocalDb = globalThis as unknown as { localDbEngine?: LocalDbEngine };

export function getLocalDbEngine(): LocalDbEngine {
  if (!globalForLocalDb.localDbEngine) {
    globalForLocalDb.localDbEngine = new LocalDbEngine();
  }
  return globalForLocalDb.localDbEngine;
}
