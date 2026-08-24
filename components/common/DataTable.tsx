'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  FileSpreadsheet,
  Printer,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { exportToCSV, printTablePDF } from '@/lib/exportUtils';

export interface ColumnDef<T> {
  key: string;
  header: string;
  accessor?: (item: T) => any;
  sortable?: boolean;
  filterable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render?: (item: T) => React.ReactNode;
  exportValue?: (item: T) => string | number;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string;
  title?: string;
  exportFileName?: string;
  searchPlaceholder?: string;
  pageSizeDefault?: number;
  onRowClick?: (item: T) => void;
  selectedKeys?: Set<string>;
  onToggleSelect?: (key: string) => void;
  onSelectAll?: (keys: string[]) => void;
  toolbarExtra?: React.ReactNode;
  emptyStateMessage?: string;
  footerTotals?: React.ReactNode;
  mobileCardRender?: (item: T) => React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  title = 'Data Table',
  exportFileName = 'export',
  searchPlaceholder = 'Search records...',
  pageSizeDefault = 10,
  onRowClick,
  selectedKeys,
  onToggleSelect,
  onSelectAll,
  toolbarExtra,
  emptyStateMessage = 'No matching records found.',
  footerTotals,
  mobileCardRender,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeDefault);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Filter & Search
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Global Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesGlobal = columns.some((col) => {
          const val = col.accessor ? col.accessor(item) : (item as any)[col.key];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
        if (!matchesGlobal) return false;
      }

      // Column Filters
      for (const [key, filterVal] of Object.entries(columnFilters)) {
        if (!filterVal.trim()) continue;
        const col = columns.find((c) => c.key === key);
        const val = col && col.accessor ? col.accessor(item) : (item as any)[key];
        if (val === null || val === undefined) return false;
        if (!String(val).toLowerCase().includes(filterVal.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [data, searchQuery, columnFilters, columns]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const col = columns.find((c) => c.key === sortKey);

    return [...filteredData].sort((a, b) => {
      const valA = col && col.accessor ? col.accessor(a) : (a as any)[sortKey];
      const valB = col && col.accessor ? col.accessor(b) : (b as any)[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc'
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA);
    });
  }, [filteredData, sortKey, sortDirection, columns]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = () => {
    const headers = columns.map((c) => c.header);
    const rows = sortedData.map((item) =>
      columns.map((col) => {
        if (col.exportValue) return col.exportValue(item);
        if (col.accessor) return col.accessor(item);
        return (item as any)[col.key] ?? '';
      })
    );
    exportToCSV(exportFileName, headers, rows);
  };

  const handlePrintPDF = () => {
    const headers = columns.map((c) => c.header);
    const rows = sortedData.map((item) =>
      columns.map((col) => {
        if (col.exportValue) return col.exportValue(item);
        if (col.accessor) return col.accessor(item);
        return (item as any)[col.key] ?? '';
      })
    );
    printTablePDF(title, headers, rows);
  };

  const isAllPageSelected =
    paginatedData.length > 0 &&
    selectedKeys &&
    paginatedData.every((item) => selectedKeys.has(keyExtractor(item)));

  const handleHeaderCheckbox = () => {
    if (!onSelectAll || !paginatedData.length) return;
    const pageKeys = paginatedData.map(keyExtractor);
    if (isAllPageSelected) {
      onSelectAll([]);
    } else {
      onSelectAll(pageKeys);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
      {/* Top Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F5]/60">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            title="Toggle inline column filters"
            className={`p-2 text-xs rounded-xl border transition-colors flex items-center gap-1.5 shrink-0 ${
              showFilters || Object.values(columnFilters).some(Boolean)
                ? 'bg-amber-100/80 border-amber-300 text-amber-900 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {toolbarExtra}

          <div className="flex items-center border border-slate-200 rounded-xl bg-white p-0.5 shadow-2xs">
            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5 transition-colors"
              title="Export to Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">Export Excel</span>
            </button>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <button
              onClick={handlePrintPDF}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors"
              title="Export to PDF / Print view"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden md:inline">Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Spreadsheet Table View */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#FAF8F5] border-b border-slate-200 sticky top-0 z-10">
              {selectedKeys && onToggleSelect && (
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={!!isAllPageSelected}
                    onChange={handleHeaderCheckbox}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`px-4 py-3 font-bold uppercase tracking-wider text-[11px] text-slate-600 select-none ${
                    col.sortable !== false ? 'cursor-pointer hover:text-slate-900' : ''
                  } ${
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left'
                  } ${col.className || ''}`}
                >
                  <div
                    className={`flex items-center gap-1.5 ${
                      col.align === 'center'
                        ? 'justify-center'
                        : col.align === 'right'
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  >
                    <span>{col.header}</span>
                    {col.sortable !== false && (
                      <span className="text-slate-400">
                        {sortKey === col.key ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-amber-600" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-amber-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>

            {/* Optional Inline Column Filters */}
            {showFilters && (
              <tr className="bg-[#FAF8F5]/80 border-b border-slate-200">
                {selectedKeys && onToggleSelect && <th className="px-4 py-1.5" />}
                {columns.map((col) => (
                  <th key={`filter-${col.key}`} className="px-3 py-1.5">
                    {col.filterable !== false ? (
                      <input
                        type="text"
                        placeholder={`Filter ${col.header}...`}
                        value={columnFilters[col.key] || ''}
                        onChange={(e) => {
                          setColumnFilters((prev) => ({
                            ...prev,
                            [col.key]: e.target.value,
                          }));
                          setCurrentPage(1);
                        }}
                        className="w-full px-2 py-1 text-[11px] font-normal rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-slate-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectedKeys ? 1 : 0)}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  <p className="text-sm font-medium">{emptyStateMessage}</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => {
                const key = keyExtractor(item);
                const isSelected = selectedKeys?.has(key);

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`transition-colors group ${
                      isSelected
                        ? 'bg-amber-50/60 hover:bg-amber-50'
                        : 'hover:bg-slate-50/80'
                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {selectedKeys && onToggleSelect && (
                      <td
                        className="w-10 px-4 py-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSelect(key);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => onToggleSelect(key)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const content = col.render
                        ? col.render(item)
                        : col.accessor
                        ? col.accessor(item)
                        : (item as any)[col.key];

                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-slate-700 ${
                            col.align === 'center'
                              ? 'text-center'
                              : col.align === 'right'
                              ? 'text-right'
                              : 'text-left'
                          } ${col.className || ''}`}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>

          {footerTotals && (
            <tfoot>
              <tr className="bg-[#FAF8F5] border-t-2 border-slate-300 font-semibold text-slate-800">
                {footerTotals}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Mobile Card List View (Responsive) */}
      <div className="block md:hidden divide-y divide-slate-100">
        {paginatedData.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">{emptyStateMessage}</div>
        ) : (
          paginatedData.map((item) => {
            const key = keyExtractor(item);
            if (mobileCardRender) {
              return (
                <div
                  key={key}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={onRowClick ? 'cursor-pointer active:bg-slate-50' : ''}
                >
                  {mobileCardRender(item)}
                </div>
              );
            }

            return (
              <div
                key={key}
                onClick={() => onRowClick && onRowClick(item)}
                className="p-4 space-y-2 hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                {columns.map((col) => {
                  const content = col.render
                    ? col.render(item)
                    : col.accessor
                    ? col.accessor(item)
                    : (item as any)[col.key];

                  return (
                    <div key={col.key} className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-500">{col.header}:</span>
                      <span className="text-slate-800 text-right">{content}</span>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Pagination */}
      <div className="p-4 border-t border-slate-100 bg-[#FAF8F5]/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-semibold"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-slate-400 font-mono">
            Showing {(currentPage - 1) * pageSize + (sortedData.length ? 1 : 0)}–
            {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} entries
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="First Page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-3 py-1 font-semibold text-slate-800 tabular-nums">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Last Page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
