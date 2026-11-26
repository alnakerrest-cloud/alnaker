import Link from "next/link";

type Props = {
  action: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  pageSizeOptions?: number[];
  params: Record<string, string | undefined>;
};

function buildHref(action: string, params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, v);
  }
  const q = sp.toString();
  return q ? `${action}?${q}` : action;
}

export default function TablePagination({
  action,
  page,
  totalPages,
  total,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  params,
}: Props) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  const pages: number[] = [];
  const start = Math.max(1, safePage - 2);
  const end = Math.min(safeTotalPages, start + 4);
  const adjStart = Math.max(1, end - 4);
  for (let i = adjStart; i <= end; i++) pages.push(i);

  return (
    <div className="admin-pagination" dir="rtl">
      <div className="admin-pagination-info">
        <span>عرض {from}–{to} من {total}</span>
        <span className="admin-pagination-sep">•</span>
        <span>صفحة {safePage} من {safeTotalPages}</span>
      </div>
      <div className="admin-pagination-controls">
        <label className="admin-pagination-size">
          <span>عدد العناصر</span>
          <select defaultValue={String(pageSize)} aria-label="عدد العناصر في الصفحة" data-pagination-size="true">
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>عرض {s}</option>
            ))}
          </select>
        </label>
        <div className="admin-pagination-nav">
          <Link
            className={`admin-btn admin-btn-sm ${safePage <= 1 ? "is-disabled" : ""}`}
            aria-disabled={safePage <= 1}
            tabIndex={safePage <= 1 ? -1 : 0}
            href={safePage <= 1 ? "#" : buildHref(action, { ...params, page: String(safePage - 1), limit: String(pageSize) })}
          >الصفحة السابقة</Link>
          <div className="admin-pagination-pages">
            {pages.map((p) => (
              <Link
                key={p}
                href={buildHref(action, { ...params, page: String(p), limit: String(pageSize) })}
                className={`admin-page-num ${p === safePage ? "active" : ""}`}
                aria-current={p === safePage ? "page" : undefined}
              >{p}</Link>
            ))}
          </div>
          <Link
            className={`admin-btn admin-btn-sm ${safePage >= safeTotalPages ? "is-disabled" : ""}`}
            aria-disabled={safePage >= safeTotalPages}
            tabIndex={safePage >= safeTotalPages ? -1 : 0}
            href={safePage >= safeTotalPages ? "#" : buildHref(action, { ...params, page: String(safePage + 1), limit: String(pageSize) })}
          >الصفحة التالية</Link>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{__html:"(function(){var s=document.currentScript;var r=s&&s.parentElement;if(!r)return;r.querySelectorAll('[data-pagination-size]').forEach(function(el){el.addEventListener('change',function(){var u=new URL(window.location.href);u.searchParams.set('limit',this.value);u.searchParams.set('page','1');window.location.href=u.toString();});});})();"}} />
    </div>
  );
}
