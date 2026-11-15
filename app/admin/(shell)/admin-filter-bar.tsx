"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SearchIcon, CloseIcon } from "@/components/Icons";

export interface QuickChip {
  label: string;
  href: string;
  active: boolean;
}

export interface FilterSelectOption {
  value: string;
  label: string;
}

export interface FilterFieldConfig {
  name: string;
  label: string;
  value?: string;
  defaultValue?: string;
  options: FilterSelectOption[];
  disabled?: boolean;
}

export interface AdminFilterBarProps {
  action: string;
  searchName?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  totalCount?: number;
  countLabel?: string;
  activeCount?: number;
  clearHref?: string;
  quickChips?: QuickChip[];
  filters?: FilterFieldConfig[];
  children?: React.ReactNode;
  extraDesktopActions?: React.ReactNode;
}

function FilterSlidersIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

export default function AdminFilterBar({
  action,
  searchName = "q",
  searchValue = "",
  searchPlaceholder = "بحث…",
  totalCount,
  countLabel = "عنصر",
  activeCount,
  clearHref,
  quickChips,
  filters,
  children,
  extraDesktopActions,
}: AdminFilterBarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchVal, setSearchVal] = useState(searchValue);

  // Sync state if searchValue prop changes from server
  useEffect(() => {
    setSearchVal(searchValue);
  }, [searchValue]);

  // Compute active filters count (excluding search itself)
  const computedActiveCount =
    activeCount !== undefined
      ? activeCount
      : filters
      ? filters.filter((f) => f.value && f.value !== "").length
      : 0;

  const hasAnyFilterActive = computedActiveCount > 0 || Boolean(searchVal);

  // Escape key listener & body scroll lock for mobile drawer
  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [isDrawerOpen]);

  const hasFilterControls = Boolean(filters && filters.length > 0) || Boolean(children);

  return (
    <form method="GET" action={action} className="admin-filter-bar">
      {/* Main Bar (Desktop: inline row; Mobile: compact search + trigger) */}
      <div className="admin-filter-main">
        {/* Search input container */}
        <div className="admin-filter-toprow">
          <div className="admin-search-wrap">
            <span className="admin-search-icon">
              <SearchIcon width={16} height={16} />
            </span>
            <input
              type="search"
              name={searchName}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder={searchPlaceholder}
              className="admin-search-input"
              autoComplete="off"
              suppressHydrationWarning
            />
            {searchVal ? (
              <button
                type="button"
                onClick={() => setSearchVal("")}
                className="admin-search-clear"
                aria-label="مسح نص البحث"
                title="مسح البحث"
              >
                <CloseIcon width={14} height={14} />
              </button>
            ) : null}
          </div>

          {/* Mobile Filter Trigger Button */}
          {hasFilterControls ? (
            <button
              type="button"
              className={`admin-filter-trigger ${computedActiveCount > 0 ? "has-active" : ""}`}
              onClick={() => setIsDrawerOpen(true)}
              aria-expanded={isDrawerOpen}
              aria-label="فتح خيارات التصفية"
            >
              <FilterSlidersIcon />
              <span className="admin-filter-trigger-text">تصفية</span>
              {computedActiveCount > 0 ? (
                <span className="admin-filter-badge">{computedActiveCount}</span>
              ) : null}
            </button>
          ) : null}

          {/* Result Count Chip (on Mobile top row or Desktop) */}
          {totalCount !== undefined ? (
            <span className="admin-user-chip admin-filter-count">
              {totalCount} {countLabel}
            </span>
          ) : null}

          {extraDesktopActions ? (
            <div className="admin-filter-extra">{extraDesktopActions}</div>
          ) : null}
        </div>

        {/* Drawer container (Desktop: inline flex; Mobile: bottom sheet modal) */}
        {hasFilterControls ? (
          <>
            <div
              className={`admin-drawer-backdrop ${isDrawerOpen ? "open" : ""}`}
              onClick={() => setIsDrawerOpen(false)}
              aria-hidden="true"
            />
            <div
              className={`admin-filter-drawer ${isDrawerOpen ? "open" : ""}`}
              role="dialog"
              aria-modal={isDrawerOpen}
              aria-label="خيارات التصفية"
            >
              <div className="admin-drawer-handle" />
              <div className="admin-drawer-header">
                <div className="admin-drawer-title-wrap">
                  <FilterSlidersIcon />
                  <h3 className="admin-drawer-title">تصفية متقدمة</h3>
                  {computedActiveCount > 0 ? (
                    <span className="admin-filter-badge">{computedActiveCount}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="admin-filter-drawer-close"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="إغلاق التصفية"
                >
                  <CloseIcon width={16} height={16} />
                </button>
              </div>

              <div className="admin-drawer-body">
                {filters
                  ? filters.map((f) => (
                      <div key={f.name} className="admin-filter-field">
                        <label htmlFor={`filter-${f.name}`}>{f.label}</label>
                        <select
                          id={`filter-${f.name}`}
                          name={f.name}
                          defaultValue={f.value ?? f.defaultValue ?? ""}
                          disabled={f.disabled}
                          className="admin-filter-select"
                        >
                          {f.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))
                  : null}
                {children}
              </div>

              <div className="admin-drawer-footer">
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary admin-filter-submit-btn"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  تطبيق الفلاتر
                </button>
                {clearHref && hasAnyFilterActive ? (
                  <Link
                    href={clearHref}
                    className="admin-btn admin-filter-reset-btn"
                    onClick={() => {
                      setSearchVal("");
                      setIsDrawerOpen(false);
                    }}
                  >
                    إعادة ضبط
                  </Link>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Quick Filter Chips (Horizontally Scrollable) */}
      {(quickChips && quickChips.length > 0) || (clearHref && hasAnyFilterActive) ? (
        <div className="admin-quick-chips">
          {clearHref && hasAnyFilterActive ? (
            <Link
              href={clearHref}
              className="admin-chip admin-chip-reset"
              onClick={() => setSearchVal("")}
              title="مسح كافة الفلاتر النشطة"
            >
              ✕ مسح الكل
            </Link>
          ) : null}
          {quickChips?.map((chip, idx) => (
            <Link
              key={idx}
              href={chip.href}
              className={`admin-chip ${chip.active ? "active" : ""}`}
            >
              {chip.label}
            </Link>
          ))}
        </div>
      ) : null}
    </form>
  );
}
