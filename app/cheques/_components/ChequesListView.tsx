'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { Cheque, ChequeStatus } from '@/lib/types';
import {
  Landmark,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  Trash2,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { formatDisplayDate, parseDateString } from '@/components/ui/DatePicker';
import { DateRangePicker, DateRangeValue } from '@/components/ui/DateRangePicker';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { AddChequeModal } from './AddChequeModal';
import { DepositConfirmModal } from './DepositConfirmModal';

export const ChequesListView: React.FC = () => {
  const { cheques, deleteCheque, isLoading } = useApp();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Deposited'>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: null,
    endDate: null,
    presetLabel: 'all',
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [depositingCheque, setDepositingCheque] = useState<Cheque | null>(null);
  const [deletingCheque, setDeletingCheque] = useState<Cheque | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Statistics across entire database
  const stats = useMemo(() => {
    const all = cheques || [];
    let totalAmt = 0;
    let pendingCount = 0;
    let pendingAmt = 0;
    let depositedCount = 0;
    let depositedAmt = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingDates: Date[] = [];

    all.forEach((c) => {
      const amt = Number(c.amount || 0);
      totalAmt += amt;
      if (c.status === 'Pending') {
        pendingCount++;
        pendingAmt += amt;
        const d = parseDateString(c.depositDate) || (c.depositDate ? new Date(c.depositDate) : null);
        if (d && !isNaN(d.getTime())) {
          pendingDates.push(d);
        }
      } else if (c.status === 'Deposited') {
        depositedCount++;
        depositedAmt += amt;
      }
    });

    pendingDates.sort((a, b) => a.getTime() - b.getTime());
    let nextDepositDate: string = 'None scheduled';
    if (pendingDates.length > 0) {
      const upcoming = pendingDates.find((d) => d.getTime() >= today.getTime());
      const chosen = upcoming || pendingDates[0];
      nextDepositDate = chosen.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    return {
      totalCount: all.length,
      totalAmt,
      pendingCount,
      pendingAmt,
      depositedCount,
      depositedAmt,
      nextDepositDate,
    };
  }, [cheques]);

  // Filtered dataset for table (status + date range)
  const filteredData = useMemo(() => {
    let list = cheques || [];
    if (statusFilter !== 'ALL') {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (dateRange.startDate || dateRange.endDate) {
      list = list.filter((c) => {
        if (!c.depositDate) return false;
        const d = parseDateString(c.depositDate) || new Date(c.depositDate);
        if (isNaN(d.getTime())) return false;
        const iso = d.toISOString().slice(0, 10);
        if (dateRange.startDate && iso < dateRange.startDate) return false;
        if (dateRange.endDate && iso > dateRange.endDate) return false;
        return true;
      });
    }
    return list;
  }, [cheques, statusFilter, dateRange]);

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    if (!deletingCheque) return;
    setIsDeleting(true);
    try {
      await deleteCheque(deletingCheque.id);
      setDeletingCheque(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // DataTable columns definition
  const columns: ColumnDef<Cheque>[] = [
    {
      key: 'chequeNumber',
      header: 'Cheque Number',
      sortable: true,
      filterable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#701A35]/10 border border-[#701A35]/20 text-[#701A35] flex items-center justify-center shrink-0">
            <Landmark className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono font-bold text-slate-900 text-xs tracking-wider">
            #{item.chequeNumber}
          </span>
        </div>
      ),
      exportValue: (item) => item.chequeNumber,
    },
    {
      key: 'customerName',
      header: 'Customer Name',
      sortable: true,
      filterable: true,
      render: (item) => (
        <div className="space-y-0.5">
          <span className="font-bold text-slate-900 text-xs block">{item.customerName}</span>
          {item.customerId && (
            <span className="font-mono text-[10px] text-slate-400 block">ID: {item.customerId}</span>
          )}
        </div>
      ),
      exportValue: (item) => item.customerName,
    },
    {
      key: 'amount',
      header: 'Amount (₹)',
      sortable: true,
      align: 'right',
      render: (item) => (
        <MoneyDisplay
          amount={item.amount}
          size="sm"
          amountClassName="text-slate-900 font-bold font-mono text-xs"
        />
      ),
      exportValue: (item) => item.amount,
    },
    {
      key: 'depositDate',
      header: 'Date to Deposit',
      sortable: true,
      filterable: true,
      render: (item) => (
        <span className="font-mono text-xs text-slate-700 font-medium whitespace-nowrap">
          {formatDisplayDate(item.depositDate)}
        </span>
      ),
      exportValue: (item) => item.depositDate,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      align: 'center',
      render: (item) => <StatusPill status={item.status} size="sm" />,
      exportValue: (item) => item.status,
    },
    {
      key: 'depositedAt',
      header: 'Deposited Date',
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs text-slate-600 whitespace-nowrap">
          {item.depositedAt ? formatDisplayDate(item.depositedAt) : '—'}
        </span>
      ),
      exportValue: (item) => item.depositedAt || '',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
          {item.status === 'Pending' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDepositingCheque(item);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition-all shadow-2xs flex items-center gap-1.5 group"
              title="Mark this cheque as deposited in bank"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white/90" />
              <span>Mark as Deposited</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200/80">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Deposited</span>
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeletingCheque(item);
            }}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Delete cheque entry"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // Totals Footer matching DataTable grid pattern
  const totalsFooter = (
    <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-xs font-mono">
      <div>
        <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">
          Total Cheques
        </span>
        <span className="font-bold text-slate-900 text-sm font-serif">
          {filteredData.length} Instruments
        </span>
      </div>
      <div>
        <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">
          Total Value
        </span>
        <MoneyDisplay
          amount={filteredData.reduce((sum, c) => sum + Number(c.amount || 0), 0)}
          size="sm"
          amountClassName="font-bold text-slate-900 text-sm"
        />
      </div>
      <div>
        <span className="text-amber-800 block uppercase text-[10px] font-bold tracking-wider">
          Pending Amount ({filteredData.filter((c) => c.status === 'Pending').length})
        </span>
        <MoneyDisplay
          amount={filteredData.filter((c) => c.status === 'Pending').reduce((s, c) => s + Number(c.amount || 0), 0)}
          size="sm"
          amountClassName="font-bold text-amber-800 text-sm"
        />
      </div>
      <div className="md:text-right">
        <span className="text-emerald-800 block uppercase text-[10px] font-bold tracking-wider">
          Deposited Amount ({filteredData.filter((c) => c.status === 'Deposited').length})
        </span>
        <MoneyDisplay
          amount={filteredData.filter((c) => c.status === 'Deposited').reduce((s, c) => s + Number(c.amount || 0), 0)}
          size="sm"
          amountClassName="font-bold text-emerald-700 text-sm"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── Page Top Banner ─── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#701A35] text-[#EED8A1] shadow-sm flex items-center justify-center shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-slate-950 tracking-tight">
              Cheque Deposits Register
            </h1>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Physical instrument logging & presentation tracking before bank deposit
            </p>
          </div>
        </div>

        {/* Action Button (Single Plus) */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#701A35] text-white hover:bg-[#852040] font-bold text-xs cursor-pointer transition-all shadow-sm flex items-center gap-2 btn-press"
          >
            <Plus className="w-4 h-4" />
            <span>Add Cheque</span>
          </button>
        </div>
      </div>

      {/* ─── 4 KPI Summary Cards (All Colored) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Logged Cheques (Maroon / ASR theme) */}
        <div className="bg-gradient-to-br from-[#701A35]/12 via-[#FAF8F5] to-white p-4.5 rounded-2xl border-2 border-[#701A35]/30 shadow-sm hover:border-[#701A35]/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#701A35] font-mono uppercase tracking-wider">
              Total Cheques Logged
            </span>
            <div className="p-2 rounded-xl bg-[#701A35]/10 text-[#701A35]">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-[#701A35]">
                {stats.totalCount}
              </span>
              <span className="text-xs text-slate-600 font-medium">Instruments</span>
            </div>
            <MoneyDisplay
              amount={stats.totalAmt}
              size="sm"
              amountClassName="text-slate-700 font-bold block mt-1"
            />
          </div>
        </div>

        {/* Card 2: Pending Cheques (Amber styling) */}
        <div className="bg-gradient-to-br from-amber-100/90 via-amber-50 to-white p-4.5 rounded-2xl border-2 border-amber-300 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 font-mono uppercase tracking-wider">
              Cheque Deposits Pending
            </span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-amber-800">
                {stats.pendingCount}
              </span>
              <span className="text-xs text-amber-900 font-semibold">Pending Cheques</span>
            </div>
            <MoneyDisplay
              amount={stats.pendingAmt}
              size="sm"
              amountClassName="text-amber-800 font-bold block mt-1"
            />
          </div>
        </div>

        {/* Card 3: Deposited Cheques (Emerald styling) */}
        <div className="bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white p-4.5 rounded-2xl border-2 border-emerald-300 shadow-sm hover:border-emerald-400 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-900 font-mono uppercase tracking-wider">
              Deposited In Bank
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-emerald-800">
                {stats.depositedCount}
              </span>
              <span className="text-xs text-emerald-900 font-semibold">Deposited</span>
            </div>
            <MoneyDisplay
              amount={stats.depositedAmt}
              size="sm"
              amountClassName="text-emerald-700 font-bold block mt-1"
            />
          </div>
        </div>

        {/* Card 4: Next Scheduled Deposit (Purple styling) */}
        <div className="bg-gradient-to-br from-purple-100/90 via-purple-50 to-white p-4.5 rounded-2xl border-2 border-purple-300 shadow-sm hover:border-purple-400 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-900 font-mono uppercase tracking-wider">
              Next Scheduled Deposit
            </span>
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-black font-mono text-purple-950 block truncate">
              {stats.nextDepositDate}
            </span>
            <span className="text-[11px] text-purple-800 font-semibold mt-1 block">
              {stats.pendingCount > 0 ? `${stats.pendingCount} cheques awaiting presentation` : 'All cheques up to date'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Excel-Style Data Table Card ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Filter Bar Header: Status Tabs + DateRangePicker */}
        <div className="p-4 border-b border-slate-200/80 bg-[#FAF8F5] flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl border border-slate-300/60 flex-wrap">
            {[
              { id: 'ALL', label: 'All Cheques', count: stats.totalCount },
              { id: 'Pending', label: 'Pending', count: stats.pendingCount },
              { id: 'Deposited', label: 'Deposited', count: stats.depositedCount },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold btn-press transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-[#701A35] text-white'
                        : 'bg-slate-300/80 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Date Range Picker Filter */}
          <div className="flex items-center gap-2">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              label="Deposit Date Range"
            />
          </div>
        </div>

        {/* DataTable */}
        <DataTable
          data={filteredData}
          columns={columns}
          keyExtractor={(item) => item.id}
          title="Cheque Deposits"
          exportFileName="ASR_Cheques"
          searchPlaceholder="Search by cheque number, customer name, amount..."
          pageSizeDefault={15}
          emptyStateMessage="No cheques logged for the selected filter."
          footerTotals={totalsFooter}
        />
      </div>

      {/* ─── Add Cheque Modal ─── */}
      <AddChequeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* ─── Deposit Confirmation Modal ─── */}
      <DepositConfirmModal
        isOpen={!!depositingCheque}
        cheque={depositingCheque}
        onClose={() => setDepositingCheque(null)}
      />

      {/* ─── Delete Confirmation Modal (Standard Component) ─── */}
      <ConfirmModal
        isOpen={!!deletingCheque}
        onClose={() => setDeletingCheque(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Cheque Record"
        itemName={deletingCheque ? `${deletingCheque.customerName} (Cheque #${deletingCheque.chequeNumber})` : undefined}
        itemAmount={deletingCheque?.amount}
        message="Are you sure you want to permanently delete this cheque from the deposit register?"
        confirmText="Delete Cheque"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
