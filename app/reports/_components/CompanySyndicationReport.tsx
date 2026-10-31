'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/lib/store';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';

interface CompanySyndicationRow {
  id: string;
  shortCode: string;
  name: string;
  isOutsideParty: boolean;
  activeLoansCount: number;
  openingDebit: number;
  openingCredit: number;
  totalFunded: number;
  totalCollected: number;
  loanOutstanding: number;
  closingDebit: number;
  closingCredit: number;
  recoveryRate: number;
  sharePercent: number;
}

function splitBalance(signedBalance: number) {
  return {
    debit: signedBalance > 0 ? signedBalance : 0,
    credit: signedBalance < 0 ? Math.abs(signedBalance) : 0,
  };
}

function BalanceCell({ debit, credit }: { debit: number; credit: number }) {
  if (!debit && !credit) return <span className="text-slate-400">—</span>;
  const isCredit = credit > 0;
  return (
    <div className="text-right">
      <MoneyDisplay
        amount={isCredit ? credit : debit}
        size="sm"
        amountClassName={`font-bold block text-right ${isCredit ? 'text-emerald-700' : 'text-[#701A35]'}`}
      />
      <span className={`text-[10px] font-bold ${isCredit ? 'text-emerald-700' : 'text-[#701A35]'}`}>
        {isCredit ? 'Cr' : 'Dr'}
      </span>
    </div>
  );
}

export const CompanySyndicationReport: React.FC = () => {
  const { companies } = useApp();

  const reportData = useMemo(() => {
    const totalSystemFunded = companies.reduce((sum, c) => sum + (c.totalFunded || 0), 0);

    return companies.map((c) => {
      const openingAmount = Math.max(0, Number(c.openingBalance || 0));
      const openingSigned = c.openingBalanceType === 'CREDIT' ? -openingAmount : openingAmount;
      const opening = splitBalance(openingSigned);
      const totalFunded = Number(c.totalFunded || 0);
      const totalCollected = Number(c.totalCollected || 0);
      const loanOutstanding = Math.max(0, totalFunded - totalCollected);
      const closing = splitBalance(openingSigned + totalFunded - totalCollected);
      const recoveryRate = totalFunded > 0 ? Number(((totalCollected / totalFunded) * 100).toFixed(1)) : 0;
      const sharePercent = totalSystemFunded > 0 ? Number(((totalFunded / totalSystemFunded) * 100).toFixed(1)) : 0;

      return {
        id: c.id,
        shortCode: c.shortCode,
        name: c.name,
        isOutsideParty: c.isOutsideParty,
        activeLoansCount: c.activeLoansCount || 0,
        openingDebit: opening.debit,
        openingCredit: opening.credit,
        totalFunded,
        totalCollected,
        loanOutstanding,
        closingDebit: closing.debit,
        closingCredit: closing.credit,
        recoveryRate,
        sharePercent,
      };
    });
  }, [companies]);

  const stats = useMemo(() => {
    const totalFunded = reportData.reduce((sum, r) => sum + r.totalFunded, 0);
    const totalCollected = reportData.reduce((sum, r) => sum + r.totalCollected, 0);
    const totalLoanOutstanding = reportData.reduce((sum, r) => sum + r.loanOutstanding, 0);
    const openingDebit = reportData.reduce((sum, r) => sum + r.openingDebit, 0);
    const openingCredit = reportData.reduce((sum, r) => sum + r.openingCredit, 0);
    const closingDebit = reportData.reduce((sum, r) => sum + r.closingDebit, 0);
    const closingCredit = reportData.reduce((sum, r) => sum + r.closingCredit, 0);
    const overallRecovery = totalFunded > 0 ? ((totalCollected / totalFunded) * 100).toFixed(1) : '0.0';

    return {
      totalFunded,
      totalCollected,
      totalLoanOutstanding,
      openingDebit,
      openingCredit,
      closingDebit,
      closingCredit,
      overallRecovery,
      asrCount: reportData.filter((r) => !r.isOutsideParty).length,
      outsideCount: reportData.filter((r) => r.isOutsideParty).length,
    };
  }, [reportData]);

  const columns: ColumnDef<CompanySyndicationRow>[] = [
    {
      key: 'shortCode',
      header: 'Company',
      sortable: true,
      accessor: (r) => r.shortCode,
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-200">
            {r.shortCode}
          </span>
          <span className="font-bold text-slate-900 text-xs">{r.name}</span>
        </div>
      ),
      exportValue: (r) => `${r.shortCode} - ${r.name}`,
    },
    {
      key: 'classification',
      header: 'Ownership',
      sortable: true,
      align: 'center',
      accessor: (r) => (r.isOutsideParty ? 'Outside Party' : 'ASR GROUP'),
      render: (r) => (
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${r.isOutsideParty ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {r.isOutsideParty ? 'Outside Party' : 'ASR GROUP'}
        </span>
      ),
      exportValue: (r) => (r.isOutsideParty ? 'Outside Party' : 'ASR GROUP'),
    },
    {
      key: 'openingBalance',
      header: 'Opening Balance',
      sortable: true,
      align: 'right',
      accessor: (r) => r.openingDebit - r.openingCredit,
      render: (r) => <BalanceCell debit={r.openingDebit} credit={r.openingCredit} />,
      exportValue: (r) => r.openingDebit ? `${r.openingDebit} Dr` : r.openingCredit ? `${r.openingCredit} Cr` : '—',
    },
    {
      key: 'totalFunded',
      header: 'Debit · Funded',
      sortable: true,
      align: 'right',
      accessor: (r) => r.totalFunded,
      render: (r) => <MoneyDisplay amount={r.totalFunded} size="sm" amountClassName="font-bold text-slate-900" />,
      exportValue: (r) => r.totalFunded,
    },
    {
      key: 'totalCollected',
      header: 'Credit · Recovered',
      sortable: true,
      align: 'right',
      accessor: (r) => r.totalCollected,
      render: (r) => <MoneyDisplay amount={r.totalCollected} size="sm" amountClassName="font-bold text-emerald-700" />,
      exportValue: (r) => r.totalCollected,
    },
    {
      key: 'closingBalance',
      header: 'Closing Balance',
      sortable: true,
      align: 'right',
      accessor: (r) => r.closingDebit - r.closingCredit,
      render: (r) => <BalanceCell debit={r.closingDebit} credit={r.closingCredit} />,
      exportValue: (r) => r.closingDebit ? `${r.closingDebit} Dr` : r.closingCredit ? `${r.closingCredit} Cr` : '—',
    },
    {
      key: 'loanOutstanding',
      header: 'Loan Outstanding',
      sortable: true,
      align: 'right',
      accessor: (r) => r.loanOutstanding,
      render: (r) => <MoneyDisplay amount={r.loanOutstanding} size="sm" amountClassName="font-bold text-rose-700" />,
      exportValue: (r) => r.loanOutstanding,
    },
    {
      key: 'activeLoansCount',
      header: 'Facilities',
      sortable: true,
      align: 'center',
      accessor: (r) => r.activeLoansCount,
      render: (r) => <span className="font-mono text-xs font-bold text-slate-700">{r.activeLoansCount}</span>,
      exportValue: (r) => r.activeLoansCount,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">Company accounting</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#24131B]">Company Opening & Closing Balances</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Opening balance is optional. Debit funded capital and credit recovered capital are applied to calculate each company&apos;s closing balance.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2 border-t border-[#EEE8DE] pt-5 sm:grid-cols-4">
          <SummaryCard label="Opening · Dr" amount={stats.openingDebit} tone="maroon" />
          <SummaryCard label="Opening · Cr" amount={stats.openingCredit} tone="green" />
          <SummaryCard label="Closing · Dr" amount={stats.closingDebit} tone="blue" />
          <SummaryCard label="Closing · Cr" amount={stats.closingCredit} tone="green" />
        </div>
      </section>

      <DataTable
        data={reportData}
        columns={columns}
        keyExtractor={(r) => r.id}
        title="Company Capital Ledger"
        exportFileName="asr_company_capital_ledger"
        searchPlaceholder="Search by company code or legal name..."
        pageSizeDefault={20}
        footerTotals={
          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-5 gap-6 text-xs font-mono">
            <SummaryCard label="Debit · Funded" amount={stats.totalFunded} tone="maroon" />
            <SummaryCard label="Credit · Recovered" amount={stats.totalCollected} tone="green" />
            <SummaryCard label="Closing · Dr" amount={stats.closingDebit} tone="blue" />
            <SummaryCard label="Closing · Cr" amount={stats.closingCredit} tone="green" />
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">Loan Outstanding</span>
              <MoneyDisplay amount={stats.totalLoanOutstanding} size="sm" amountClassName="font-bold text-rose-700 text-sm" />
              <span className="mt-1 block text-[10px] text-slate-500">{stats.asrCount} ASR · {stats.outsideCount} outside · {stats.overallRecovery}% recovered</span>
            </div>
          </div>
        }
      />
    </div>
  );
};

function SummaryCard({ label, amount, tone }: { label: string; amount: number; tone: 'maroon' | 'green' | 'blue' }) {
  const colors = {
    maroon: 'text-[#701A35]',
    green: 'text-emerald-700',
    blue: 'text-[#245B9B]',
  };
  return (
    <div>
      <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider">{label}</span>
      <MoneyDisplay amount={amount} size="sm" amountClassName={`font-bold ${colors[tone]} text-sm`} />
    </div>
  );
}
