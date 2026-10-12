'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { Loan, Installment, Company, AppStatus, LoanStatus, RepaymentFrequency } from '@/lib/types';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { DatePicker } from '@/components/ui/DatePicker';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { numberToIndianWords } from '@/lib/utils/numberToWords';
import {
  FileSpreadsheet,
  X,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';

interface EditLoanExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
}

interface EditableInstallmentRow {
  id?: string;
  seqNo: number;
  dueDate: string;
  amountDue: number;
  status: AppStatus | string;
  recdDate: string;
  chqNo: string;
  place: string;
  depName: string;
  bank?: string;
  remarks: string;
  // ASR Companies (10)
  pass: number;
  kars: number;
  ig: number;
  ine: number;
  ins: number;
  mars: number;
  mm: number;
  tg: number;
  gs: number;
  ala: number;
  // Outside Companies (6)
  fin: number;
  cs: number;
  mc: number;
  tatva: number;
  bhavna: number;
  taSS: number;
}

function formatToIso(dStr: string | null | undefined): string {
  if (!dStr) return '';
  const trimmed = dStr.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parts = trimmed.split(/[-/]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1];
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(year) && isNaN(Number(monthStr))) {
      const monthIdx = [
        'jan', 'feb', 'mar', 'apr', 'may', 'jun',
        'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
      ].indexOf(monthStr.toLowerCase().slice(0, 3));
      if (monthIdx !== -1) {
        const fullYear = year < 100 ? 2000 + year : year;
        return `${fullYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return '';
}

export interface CompanyColumnDef {
  key: keyof EditableInstallmentRow;
  label: string;
  isOutside: boolean;
}

export const ALL_COMPANY_COLUMNS: CompanyColumnDef[] = [
  // 10 ASR Group Companies
  { key: 'pass', label: 'PASS ENTERPRISES', isOutside: false },
  { key: 'kars', label: 'KARS ENTERPRISES', isOutside: false },
  { key: 'ig', label: 'INFIN GROUP', isOutside: false },
  { key: 'ine', label: 'INFINITY ENTERPRISES', isOutside: false },
  { key: 'ins', label: 'INNOVATIVE SOLUTIONS', isOutside: false },
  { key: 'mars', label: 'MARS SOLUTION', isOutside: false },
  { key: 'mm', label: 'MM ASSOCIATES', isOutside: false },
  { key: 'tg', label: 'TRIVENI GROUP', isOutside: false },
  { key: 'gs', label: 'GLOBAL SOLITAIRE', isOutside: false },
  { key: 'ala', label: 'ALAGESH', isOutside: false },
  // 6 Outside Parties
  { key: 'fin', label: 'FINCUBE', isOutside: true },
  { key: 'cs', label: 'CS ASSOCIATES', isOutside: true },
  { key: 'mc', label: 'M CHINNIAH', isOutside: true },
  { key: 'tatva', label: 'TATVA ENTERPRISES', isOutside: true },
  { key: 'bhavna', label: 'BHAVANA CORP', isOutside: true },
  { key: 'taSS', label: 'THIRUCHENDUR (SS)', isOutside: true },
];

const COMPANY_KEYS: (keyof EditableInstallmentRow)[] = ALL_COMPANY_COLUMNS.map((c) => c.key);

function getFieldKeyForCompanyCode(code: string): keyof EditableInstallmentRow | null {
  const c = code.trim().toUpperCase();
  if (c === 'PASS' || c.includes('PASS')) return 'pass';
  if (c === 'KARS' || c.includes('KARS')) return 'kars';
  if (c === 'IG' || c === 'INFIN' || c.includes('INFIN')) return 'ig';
  if (c === 'INE' || c.includes('INFINITY')) return 'ine';
  if (c === 'INS' || c.includes('INNOVAT')) return 'ins';
  if (c === 'MARS' || c.includes('MARS')) return 'mars';
  if (c === 'MM' || c.includes('MM')) return 'mm';
  if (c === 'TG' || c.includes('TRIVENI') || c.includes('TREVINI')) return 'tg';
  if (c === 'GS' || c.includes('SOLITAIRE') || c.includes('SOLITARE')) return 'gs';
  if (c === 'ALA' || c.includes('ALAGESH')) return 'ala';
  if (c === 'FIN' || c.includes('FINCUBE')) return 'fin';
  if (c === 'CS' || c.includes('CS ASSOC')) return 'cs';
  if (c === 'MC' || c.includes('CHINNIAH')) return 'mc';
  if (c === 'TATVA' || c.includes('TATVA')) return 'tatva';
  if (c === 'BHAVNA' || c === 'BHAVANA' || c.includes('BHAVAN')) return 'bhavna';
  if (c.includes('TA') || c.includes('THIRUCHENDUR')) return 'taSS';
  return null;
}

export const ALLOWED_STATUS_LIST: AppStatus[] = ['Pending', 'Cleared', 'NEFT', 'RTGS', 'Cash'];
export const ALLOWED_LOAN_STATUS_LIST = ['Active', 'Closed', 'Overdue'] as const;
export type TopLoanStatus = (typeof ALLOWED_LOAN_STATUS_LIST)[number];

export function isStatusPaid(st: string | null | undefined): boolean {
  if (!st) return false;
  const u = st.trim().toUpperCase();
  return ['CLEARED', 'NEFT', 'RTGS', 'CASH', 'PASS', 'CLS', 'CS', 'PAID', 'CLOSED', 'SETTLED'].includes(u);
}

export function normalizeLoanStatus(st: string | null | undefined): TopLoanStatus {
  if (!st) return 'Active';
  const u = st.trim().toUpperCase();
  if (['CLOSED', 'SETTLED', 'CLEARED', 'PAID', 'CLS', 'CS', 'PASS'].includes(u)) return 'Closed';
  if (['OVERDUE', 'DELAYED'].includes(u)) return 'Overdue';
  return 'Active';
}

export function normalizeStatus(st: string | null | undefined): AppStatus {
  if (!st) return 'Pending';
  const u = st.trim().toUpperCase();
  if (['CLEARED', 'PASS', 'CLS', 'PAID', 'CS', 'CLOSED', 'SETTLED'].includes(u)) return 'Cleared';
  if (['NEFT', 'RET NEFT'].includes(u)) return 'NEFT';
  if (['RTGS'].includes(u)) return 'RTGS';
  if (['CASH', 'CSH'].includes(u)) return 'Cash';
  return 'Pending';
}

const LOAN_STATUS_OPTIONS: { value: TopLoanStatus; label: string; colorClass: string }[] = [
  { value: 'Active', label: 'Active', colorClass: 'text-emerald-900 font-bold' },
  { value: 'Closed', label: 'Closed', colorClass: 'text-slate-900 font-bold' },
  { value: 'Overdue', label: 'Overdue', colorClass: 'text-rose-950 font-bold' },
];

const FREQUENCY_OPTIONS: { value: RepaymentFrequency; label: string }[] = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Bi-Weekly', label: 'Bi-Weekly (14 days)' },
  { value: 'Custom', label: 'Custom' },
];

const ROW_STATUS_OPTIONS: { value: AppStatus; label: string; colorClass?: string }[] = [
  { value: 'Pending', label: 'Pending', colorClass: 'text-amber-900 font-bold' },
  { value: 'Cleared', label: 'Cleared', colorClass: 'text-emerald-900 font-bold' },
  { value: 'NEFT', label: 'NEFT', colorClass: 'text-teal-900 font-bold' },
  { value: 'RTGS', label: 'RTGS', colorClass: 'text-indigo-900 font-bold' },
  { value: 'Cash', label: 'Cash', colorClass: 'text-emerald-900 font-bold' },
];

export const EditLoanExcelModal: React.FC<EditLoanExcelModalProps> = ({
  isOpen,
  onClose,
  loan,
}) => {
  const { updateFullLoan, showToast } = useApp();

  // Top Loan Form Fields
  const [customerName, setCustomerName] = useState('');
  const [codeNo, setCodeNo] = useState('');
  const [place, setPlace] = useState('');
  const [startDate, setStartDate] = useState('');
  const [frequency, setFrequency] = useState<RepaymentFrequency>('Monthly');
  const [status, setStatus] = useState<TopLoanStatus>('Active');
  const [disbursedAmount, setDisbursedAmount] = useState<number | ''>('');
  const [interestAmount, setInterestAmount] = useState<number | ''>('');

  // Spreadsheet Rows
  const [rows, setRows] = useState<EditableInstallmentRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Column View Filter
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'SELECTED_ONLY' | 'ASR_ONLY' | 'OUTSIDE_ONLY'>('ALL');
  const [isPropsExpanded, setIsPropsExpanded] = useState(false);

  // Capital limit for the current loan
  const capitalAmount = useMemo(() => {
    return loan ? Number(loan.totalAmount || 0) : 0;
  }, [loan]);

  // Initialize rows when loan changes
  useEffect(() => {
    if (!loan) return;

    setCustomerName(loan.customerName || '');
    setCodeNo(loan.codeNo || '');
    setPlace(loan.place || 'CHENNAI');
    setStartDate(formatToIso(loan.startDate) || new Date().toISOString().slice(0, 10));
    setFrequency((loan.frequency as RepaymentFrequency) || 'Monthly');
    setStatus(normalizeLoanStatus(loan.status));
    setDisbursedAmount(loan.disbursedAmount != null ? loan.disbursedAmount : '');
    setInterestAmount(loan.interestAmount != null ? loan.interestAmount : '');

    const mappedRows: EditableInstallmentRow[] = (loan.installments || []).map((inst, idx) => {
      const splits = inst.companySplits || {};
      return {
        id: inst.id,
        seqNo: inst.seqNo || idx + 1,
        dueDate: formatToIso(inst.dueDate) || '2026-07-01',
        amountDue: inst.amountDue || 0,
        status: normalizeStatus(inst.status),
        recdDate: formatToIso(inst.recdDate) || '',
        chqNo: inst.chqNo || '',
        place: inst.place || loan.place || 'CHENNAI',
        depName: inst.depName || '',
        bank: inst.bank || '',
        remarks: inst.remarks || '',
        // ASR Companies (10)
        pass: Number(splits['PASS'] || splits['PASS ENTERPRISES'] || 0),
        kars: Number(splits['KARS'] || splits['KARS ENTERPRISES'] || 0),
        ig: Number(splits['IG'] || splits['INFIN GROUP'] || splits['INFIN'] || 0),
        ine: Number(splits['INE'] || splits['INFINITY ENTERPRISES'] || 0),
        ins: Number(splits['INS'] || splits['INNOVATIVE SOLUTIONS'] || splits['INNOVATE SOLUTIONS'] || 0),
        mars: Number(splits['MARS'] || splits['MARS SOLUTION'] || 0),
        mm: Number(splits['MM'] || splits['MM ASSOCIATES'] || 0),
        tg: Number(splits['TG'] || splits['TRIVENI GROUP'] || splits['TREVINI GROUP'] || 0),
        gs: Number(splits['GS'] || splits['GLOBAL SOLITAIRE'] || splits['GLOBAL SOLITARE'] || 0),
        ala: Number(splits['ALA'] || splits['ALAGESH'] || 0),
        // Outside Companies (6)
        fin: Number(splits['FIN'] || splits['FINCUBE VENTURES'] || 0),
        cs: Number(splits['CS'] || splits['CS ASSOCIATES'] || 0),
        mc: Number(splits['MC'] || splits['M CHINNIAH'] || 0),
        tatva: Number(splits['TATVA'] || splits['TATVA ENTERPRISES'] || 0),
        bhavna: Number(splits['BHAVNA'] || splits['BHAVANA'] || splits['BHAVANA CORP'] || 0),
        taSS: Number(splits['TA (SS)'] || splits['TA'] || splits['THIRUCHENDURAON ASSOCIATE'] || 0),
      };
    });

    setRows(mappedRows);
  }, [loan]);

  // Live totals
  const totalLoanAmount = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.amountDue) || 0), 0);
  }, [rows]);

  const totalPaidAmount = useMemo(() => {
    return rows.reduce((sum, r) => (isStatusPaid(r.status) ? sum + (Number(r.amountDue) || 0) : sum), 0);
  }, [rows]);

  const paidRowsCount = useMemo(() => {
    return rows.filter((r) => isStatusPaid(r.status)).length;
  }, [rows]);

  const pendingRowsCount = useMemo(() => {
    return rows.length - paidRowsCount;
  }, [rows, paidRowsCount]);

  const totalPendingAmount = useMemo(() => {
    return Math.max(0, capitalAmount - totalPaidAmount);
  }, [capitalAmount, totalPaidAmount]);

  // Auto-adjust top loan status when all installments are fully paid or unpaid
  useEffect(() => {
    if (rows.length === 0) return;
    if (totalPendingAmount === 0 && paidRowsCount === rows.length && paidRowsCount > 0) {
      setStatus('Closed');
    } else if (status === 'Closed' && totalPendingAmount > 0) {
      setStatus('Active');
    }
  }, [totalPendingAmount, paidRowsCount, rows.length]);

  // Column totals
  const companySums = useMemo(() => {
    return {
      pass: rows.reduce((s, r) => s + (Number(r.pass) || 0), 0),
      kars: rows.reduce((s, r) => s + (Number(r.kars) || 0), 0),
      ig: rows.reduce((s, r) => s + (Number(r.ig) || 0), 0),
      ine: rows.reduce((s, r) => s + (Number(r.ine) || 0), 0),
      ins: rows.reduce((s, r) => s + (Number(r.ins) || 0), 0),
      mars: rows.reduce((s, r) => s + (Number(r.mars) || 0), 0),
      mm: rows.reduce((s, r) => s + (Number(r.mm) || 0), 0),
      tg: rows.reduce((s, r) => s + (Number(r.tg) || 0), 0),
      gs: rows.reduce((s, r) => s + (Number(r.gs) || 0), 0),
      ala: rows.reduce((s, r) => s + (Number(r.ala) || 0), 0),
      fin: rows.reduce((s, r) => s + (Number(r.fin) || 0), 0),
      cs: rows.reduce((s, r) => s + (Number(r.cs) || 0), 0),
      mc: rows.reduce((s, r) => s + (Number(r.mc) || 0), 0),
      tatva: rows.reduce((s, r) => s + (Number(r.tatva) || 0), 0),
      bhavna: rows.reduce((s, r) => s + (Number(r.bhavna) || 0), 0),
      taSS: rows.reduce((s, r) => s + (Number(r.taSS) || 0), 0),
    };
  }, [rows]);

  // Active/selected funding companies for this specific loan
  const activeCompanyKeys = useMemo(() => {
    const set = new Set<keyof EditableInstallmentRow>();

    // 1. From loan.splits
    if (loan?.splits && Array.isArray(loan.splits)) {
      loan.splits.forEach((sp) => {
        const k = getFieldKeyForCompanyCode(sp.companyCode || sp.companyName || '');
        if (k && ((sp.splitPercent || 0) > 0 || (sp.splitAmount || 0) > 0)) {
          set.add(k);
        }
      });
    }

    // 2. From existing rows in the loan
    COMPANY_KEYS.forEach((k) => {
      if (companySums[k as keyof typeof companySums] > 0) {
        set.add(k);
      }
    });

    return set;
  }, [loan, companySums]);

  const visibleCompanyColumns = useMemo(() => {
    return ALL_COMPANY_COLUMNS.filter((col) => {
      if (categoryFilter === 'SELECTED_ONLY') {
        return activeCompanyKeys.has(col.key);
      }
      if (categoryFilter === 'ASR_ONLY') {
        return !col.isOutside;
      }
      if (categoryFilter === 'OUTSIDE_ONLY') {
        return col.isOutside;
      }
      return true; // 'ALL'
    });
  }, [categoryFilter, activeCompanyKeys]);

  // Check row validation mismatches
  const rowMismatches = useMemo(() => {
    return rows.map((r) => {
      const splitSum =
        (Number(r.pass) || 0) +
        (Number(r.kars) || 0) +
        (Number(r.ig) || 0) +
        (Number(r.ine) || 0) +
        (Number(r.ins) || 0) +
        (Number(r.mars) || 0) +
        (Number(r.mm) || 0) +
        (Number(r.tg) || 0) +
        (Number(r.gs) || 0) +
        (Number(r.ala) || 0) +
        (Number(r.fin) || 0) +
        (Number(r.cs) || 0) +
        (Number(r.mc) || 0) +
        (Number(r.tatva) || 0) +
        (Number(r.bhavna) || 0) +
        (Number(r.taSS) || 0);

      const amt = Number(r.amountDue) || 0;
      const isMismatch = splitSum > 0 && Math.abs(amt - splitSum) > 0.01;
      return {
        seqNo: r.seqNo,
        splitSum,
        amt,
        diff: amt - splitSum,
        isMismatch,
      };
    });
  }, [rows]);

  const hasAnyMismatches = rowMismatches.some((m) => m.isMismatch);

  // Capital limit & required validations
  const hasExceededCapital = useMemo(() => {
    return rows.some((r) => (Number(r.amountDue) || 0) > capitalAmount) || totalLoanAmount > capitalAmount;
  }, [rows, totalLoanAmount, capitalAmount]);

  const hasEmptyOrZeroAmount = useMemo(() => {
    return rows.some((r) => !r.amountDue || Number(r.amountDue) <= 0);
  }, [rows]);

  const isTotalEqualCapital = Math.abs(totalLoanAmount - capitalAmount) < 0.01;

  // Validation error message
  const validationError = useMemo(() => {
    if (hasExceededCapital) {
      return `Amount cannot exceed capital amount (₹${capitalAmount.toLocaleString('en-IN')})`;
    }
    if (hasEmptyOrZeroAmount) {
      return 'Loan amount is required. Installment amount cannot be empty or zero.';
    }
    if (!isTotalEqualCapital) {
      const diff = capitalAmount - totalLoanAmount;
      return `Total installments (₹${totalLoanAmount.toLocaleString('en-IN')}) must equal capital amount (₹${capitalAmount.toLocaleString('en-IN')}). Difference: ₹${Math.abs(diff).toLocaleString('en-IN')}`;
    }
    if (hasAnyMismatches) {
      return 'Some individual row company splits do not sum to their installment amount.';
    }
    return null;
  }, [hasExceededCapital, hasEmptyOrZeroAmount, isTotalEqualCapital, hasAnyMismatches, capitalAmount, totalLoanAmount]);

  const isSaveDisabled = Boolean(validationError) || isSaving;

  // Fixed funding company split ratios for this loan
  const loanSplitRatios = useMemo(() => {
    const ratios: Partial<Record<keyof EditableInstallmentRow, number>> = {};

    // 1. From loan.splits
    const validSplits = (loan?.splits || []).filter(
      (sp) => (sp.splitPercent || 0) > 0 || (sp.splitAmount || 0) > 0
    );

    if (validSplits.length > 0) {
      const totalPct = validSplits.reduce((sum, sp) => sum + (sp.splitPercent || 0), 0);
      validSplits.forEach((sp) => {
        const k = getFieldKeyForCompanyCode(sp.companyCode || sp.companyName || '');
        if (k) {
          ratios[k] = totalPct > 0 ? (sp.splitPercent || 0) / totalPct : (sp.splitAmount || 1) / (loan?.totalAmount || 1);
        }
      });
      return ratios;
    }

    // 2. From installments mapped on load
    if (loan?.installments && loan.installments.length > 0) {
      const sums: Record<string, number> = {};
      let totalAll = 0;
      loan.installments.forEach((inst) => {
        const sp = inst.companySplits || {};
        Object.entries(sp).forEach(([code, amt]) => {
          const k = getFieldKeyForCompanyCode(code);
          if (k && Number(amt) > 0) {
            sums[k] = (sums[k] || 0) + Number(amt);
            totalAll += Number(amt);
          }
        });
      });

      if (totalAll > 0) {
        Object.entries(sums).forEach(([k, s]) => {
          ratios[k as keyof EditableInstallmentRow] = s / totalAll;
        });
        return ratios;
      }
    }

    // 3. Fallback to equal split among active companies
    const activeList = Array.from(activeCompanyKeys);
    if (activeList.length > 0) {
      activeList.forEach((k) => {
        ratios[k] = 1 / activeList.length;
      });
    }

    return ratios;
  }, [loan, activeCompanyKeys]);

  // Distribute splits helper based on established loan ratio
  const distributeSplits = (amt: number, splitsObj: any) => {
    COMPANY_KEYS.forEach((k) => {
      splitsObj[k] = 0;
    });

    if (amt <= 0) return splitsObj;

    const entries = Object.entries(loanSplitRatios).filter(
      ([k, ratio]) => (ratio || 0) > 0 && activeCompanyKeys.has(k as keyof EditableInstallmentRow)
    ) as [keyof EditableInstallmentRow, number][];

    if (entries.length === 0) return splitsObj;

    const totalRatio = entries.reduce((sum, [_, r]) => sum + r, 0);
    let allocated = 0;

    entries.forEach(([key, ratio], idx) => {
      if (idx === entries.length - 1) {
        splitsObj[key] = Math.max(0, amt - allocated);
      } else {
        const normalizedRatio = totalRatio > 0 ? ratio / totalRatio : 1 / entries.length;
        const share = Math.round(amt * normalizedRatio);
        splitsObj[key] = share;
        allocated += share;
      }
    });

    return splitsObj;
  };

  // Update cell handler
  const handleCellChange = (index: number, field: keyof EditableInstallmentRow, val: any) => {
    setRows((prev) => {
      const next = [...prev];
      const currentRow = next[index];
      if (!currentRow) return prev;

      // Prevent editing unselected company columns
      if (COMPANY_KEYS.includes(field) && !activeCompanyKeys.has(field)) {
        return prev;
      }

      if (field === 'amountDue') {
        const newAmt = Number(val) || 0;
        const updatedRow: EditableInstallmentRow = { ...currentRow, amountDue: newAmt };

        if (newAmt <= 0) {
          COMPANY_KEYS.forEach((k) => {
            (updatedRow as any)[k] = 0;
          });
        } else {
          distributeSplits(newAmt, updatedRow);
        }

        next[index] = updatedRow;
        return next;
      }

      next[index] = { ...currentRow, [field]: val };
      return next;
    });
  };

  // Auto-balance remaining difference to capital
  const handleAutoBalanceRemainder = () => {
    const diff = capitalAmount - totalLoanAmount;
    if (diff <= 0) return;

    const nextSeq = rows.length + 1;
    const lastDate = rows.length > 0 ? rows[rows.length - 1].dueDate : '2026-07-01';

    const autoRow: EditableInstallmentRow = {
      id: `INST-NEW-BAL-${Date.now()}-${nextSeq}`,
      seqNo: nextSeq,
      dueDate: lastDate,
      amountDue: diff,
      status: 'Pending',
      recdDate: '',
      chqNo: '',
      place: place || 'CHENNAI',
      depName: '',
      remarks: 'Auto-balanced remainder',
      pass: 0,
      kars: 0,
      ig: 0,
      ine: 0,
      ins: 0,
      mars: 0,
      mm: 0,
      tg: 0,
      gs: 0,
      ala: 0,
      fin: 0,
      cs: 0,
      mc: 0,
      tatva: 0,
      bhavna: 0,
      taSS: 0,
    };

    distributeSplits(diff, autoRow);
    setRows((prev) => [...prev, autoRow]);
    showToast(
      'Remainder Balanced',
      `Added EMI #${nextSeq} with ₹${diff.toLocaleString('en-IN')} to equal capital amount of ₹${capitalAmount.toLocaleString('en-IN')}.`,
      'success'
    );
  };

  // Add new EMI row
  const handleAddRow = () => {
    const nextSeq = rows.length + 1;
    let nextDate = '2026-07-01';
    if (rows.length > 0) {
      const lastDate = rows[rows.length - 1].dueDate;
      nextDate = lastDate || '2026-07-01';
    }

    const remaining = Math.max(0, capitalAmount - totalLoanAmount);
    const defaultAmt = remaining > 0 ? remaining : rows.length > 0 ? rows[0].amountDue : 50000;

    const newRow: EditableInstallmentRow = {
      id: `INST-NEW-${Date.now()}-${nextSeq}`,
      seqNo: nextSeq,
      dueDate: nextDate,
      amountDue: defaultAmt,
      status: 'Pending',
      recdDate: '',
      chqNo: '',
      place: place || 'CHENNAI',
      depName: '',
      remarks: '',
      pass: 0,
      kars: 0,
      ig: 0,
      ine: 0,
      ins: 0,
      mars: 0,
      mm: 0,
      tg: 0,
      gs: 0,
      ala: 0,
      fin: 0,
      cs: 0,
      mc: 0,
      tatva: 0,
      bhavna: 0,
      taSS: 0,
    };

    distributeSplits(defaultAmt, newRow);
    setRows((prev) => [...prev, newRow]);
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    if (rows.length <= 1) {
      showToast('Action Blocked', 'A loan must have at least one installment.', 'warning');
      return;
    }
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((r, i) => ({ ...r, seqNo: i + 1 }));
    });
  };

  // Auto-balance row splits based on initial percentages
  const handleAutoBalanceRow = (index: number) => {
    const row = rows[index];
    if (!row) return;
    const amt = Number(row.amountDue) || 0;
    if (amt <= 0) return;

    const updatedRow = { ...row };
    COMPANY_KEYS.forEach((k) => {
      (updatedRow as any)[k] = 0;
    });

    distributeSplits(amt, updatedRow);

    setRows((prev) => {
      const next = [...prev];
      next[index] = updatedRow;
      return next;
    });
    showToast('Row Balanced', `EMI #${row.seqNo} company splits aligned to loan ratio.`, 'info');
  };

  // Save changes back to Turso Cloud DB in one atomic transaction
  const handleSave = async () => {
    if (!loan) return;
    if (!customerName.trim()) {
      showToast('Validation Error', 'Customer / Client Name is required.', 'warning');
      return;
    }
    if (validationError) {
      showToast('Validation Error', validationError, 'warning');
      return;
    }

    setIsSaving(true);

    const payload = {
      customerName: customerName.trim(),
      codeNo: codeNo.trim() || undefined,
      place: place.trim() || 'CHENNAI',
      status,
      frequency,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      disbursedAmount: disbursedAmount !== '' && disbursedAmount !== null ? Number(disbursedAmount) : null,
      interestAmount: interestAmount !== '' && interestAmount !== null ? Number(interestAmount) : null,
      installments: rows.map((r) => {
        const companySplits: Record<string, number> = {};
        // ASR Companies (10)
        if (r.pass > 0) companySplits['PASS'] = Number(r.pass);
        if (r.kars > 0) companySplits['KARS'] = Number(r.kars);
        if (r.ig > 0) companySplits['IG'] = Number(r.ig);
        if (r.ine > 0) companySplits['INE'] = Number(r.ine);
        if (r.ins > 0) companySplits['INS'] = Number(r.ins);
        if (r.mars > 0) companySplits['MARS'] = Number(r.mars);
        if (r.mm > 0) companySplits['MM'] = Number(r.mm);
        if (r.tg > 0) companySplits['TG'] = Number(r.tg);
        if (r.gs > 0) companySplits['GS'] = Number(r.gs);
        if (r.ala > 0) companySplits['ALA'] = Number(r.ala);
        // Outside Companies (6)
        if (r.fin > 0) companySplits['FIN'] = Number(r.fin);
        if (r.cs > 0) companySplits['CS'] = Number(r.cs);
        if (r.mc > 0) companySplits['MC'] = Number(r.mc);
        if (r.tatva > 0) companySplits['TATVA'] = Number(r.tatva);
        if (r.bhavna > 0) companySplits['BHAVNA'] = Number(r.bhavna);
        if (r.taSS > 0) companySplits['TA (SS)'] = Number(r.taSS);

        return {
          id: r.id && !r.id.startsWith('INST-NEW') ? r.id : undefined,
          seqNo: Number(r.seqNo),
          dueDate: r.dueDate,
          amountDue: Number(r.amountDue) || 0,
          status: normalizeStatus(r.status),
          recdDate: r.recdDate && r.recdDate.trim() ? r.recdDate.trim() : null,
          chqNo: r.chqNo && r.chqNo.trim() ? r.chqNo.trim() : null,
          place: r.place || place || 'CHENNAI',
          depName: r.depName && r.depName.trim() ? r.depName.trim() : null,
          bank: r.bank && r.bank.trim() ? r.bank.trim() : null,
          remarks: r.remarks && r.remarks.trim() ? r.remarks.trim() : null,
          companySplits,
        };
      }),
    };

    try {
      const result = await updateFullLoan(loan.id, payload);
      setIsSaving(false);

      if (result) {
        showToast('Saved Successfully', 'Loan edits and balanced installments synced to database.', 'success');
        onClose();
      }
    } catch (err: any) {
      setIsSaving(false);
      showToast('Save Failed', err.message || 'Error updating loan.', 'error');
    }
  };

  if (!isOpen || !loan) return null;

  const remainingDiff = capitalAmount - totalLoanAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#FAF8F5] rounded-2xl border border-[#D0C8B8] shadow-2xl w-full max-w-[99vw] h-[98vh] sm:h-[96vh] flex flex-col overflow-hidden motion-modal">
        {/* ─── Excel Modal Top Toolbar ─── */}
        <div className="p-3 sm:p-4 bg-white border-b border-[#D0C8B8] flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#701A35]/10 border border-[#701A35]/20 flex items-center justify-center text-[#701A35] shrink-0 mt-0.5 sm:mt-0">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 font-serif truncate max-w-[220px] sm:max-w-none" title={loan.customerName}>
                  Spreadsheet: {loan.customerName}
                </h2>
                <span className="font-mono text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded bg-[#701A35] text-white shrink-0">
                  {loan.id}
                </span>
                <span className="font-mono text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1 shrink-0 shadow-2xs">
                  <span className="text-amber-800">Capital:</span>
                  <MoneyDisplay amount={capitalAmount} size="xs" amountClassName="text-amber-950 font-bold" />
                </span>

                {totalPaidAmount > 0 && (
                  <span className="font-mono text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1 shrink-0 shadow-2xs transition-all animate-in fade-in duration-150">
                    <span className="text-emerald-800">Paid:</span>
                    <MoneyDisplay amount={totalPaidAmount} size="xs" amountClassName="text-emerald-950 font-bold" />
                  </span>
                )}

                <span className={`font-mono text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1 shrink-0 shadow-2xs transition-all duration-150 ${
                  totalPendingAmount === 0
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    : 'bg-rose-100 text-rose-950 border-rose-300'
                }`}>
                  <span className={totalPendingAmount === 0 ? 'text-emerald-800' : 'text-rose-800'}>Pending:</span>
                  <MoneyDisplay
                    amount={totalPendingAmount}
                    size="xs"
                    amountClassName={totalPendingAmount === 0 ? 'text-emerald-950 font-bold' : 'text-rose-950 font-bold'}
                  />
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-mono mt-0.5 hidden sm:block">
                Capital Limit: ₹{capitalAmount.toLocaleString('en-IN')} ({numberToIndianWords(capitalAmount)}) • Paid: ₹{totalPaidAmount.toLocaleString('en-IN')} ({paidRowsCount} Paid) • Pending: ₹{totalPendingAmount.toLocaleString('en-IN')} ({pendingRowsCount} EMIs) • Atomic Sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 self-end md:self-auto shrink-0">
            <button
              onClick={handleAddRow}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-white border border-[#D0C8B8] hover:bg-[#FAF8F5] text-slate-800 text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1 transition-all cursor-pointer btn-press"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#701A35]" />
              <span>Insert Row</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaveDisabled}
              title={validationError || 'Save loan changes'}
              className="px-3 sm:px-5 py-1.5 sm:py-2 bg-[#701A35] hover:bg-[#5C142B] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed btn-press"
            >
              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200" />
              <span>{isSaving ? 'Saving...' : 'Save & Sync'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer btn-press"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── Validation Error Banner (When Capital Exceeded, Zero Amount, or Total Mismatch) ─── */}
        {validationError && (
          <div className="px-4 py-2 bg-rose-100 border-b border-rose-300 text-rose-900 text-xs font-bold font-mono flex items-center justify-between shrink-0 flex-wrap gap-2 animate-in fade-in duration-100">
            <div className="flex items-center gap-2 flex-wrap">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
              <span>{validationError}</span>
              {remainingDiff > 0 && (
                <button
                  type="button"
                  onClick={handleAutoBalanceRemainder}
                  className="px-2.5 py-0.5 rounded-md bg-[#701A35] hover:bg-[#5C142B] text-white text-[11px] font-bold shadow-xs cursor-pointer transition-colors"
                >
                  + Auto-Add Remainder Row (₹{remainingDiff.toLocaleString('en-IN')})
                </button>
              )}
            </div>
            <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-rose-200 text-rose-900 border border-rose-400">
              Save Blocked
            </span>
          </div>
        )}

        {/* ─── Mobile Properties Bar Collapsible Toggle ─── */}
        <div className="sm:hidden px-3.5 py-2 bg-[#FDFCFA] border-b border-[#D0C8B8] flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsPropsExpanded(!isPropsExpanded)}
            className="flex items-center gap-1 text-xs font-bold text-[#701A35]"
          >
            <span>{isPropsExpanded ? '▲ Hide Loan Info' : '▼ Edit Loan Info (Borrower, Dates, Status)'}</span>
          </button>
          <span className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">{customerName}</span>
        </div>

        {/* ─── Excel Metadata Properties Bar ─── */}
        <div className={`${isPropsExpanded ? 'grid' : 'hidden sm:grid'} px-3.5 sm:px-5 py-3 bg-[#FDFCFA] border-b border-[#D0C8B8] grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3 text-xs shrink-0 max-h-[35vh] sm:max-h-none overflow-y-auto`}>
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Borrower Name *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-bold text-slate-900 focus:outline-2 focus:outline-[#701A35] text-xs uppercase"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Code No
            </label>
            <input
              type="text"
              value={codeNo}
              onChange={(e) => setCodeNo(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono text-slate-800 focus:outline-2 focus:outline-[#701A35] text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Place
            </label>
            <input
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-800 focus:outline-2 focus:outline-[#701A35] text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Start Date
            </label>
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              theme="light"
              size="sm"
              className="w-full"
              buttonClassName="w-full py-1.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Paid / Disbursed (₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 850000"
              value={disbursedAmount}
              onChange={(e) => {
                const val = e.target.value === '' ? '' : Number(e.target.value);
                setDisbursedAmount(val);
                if (val !== '' && capitalAmount > 0 && Number(val) <= capitalAmount) {
                  setInterestAmount(capitalAmount - Number(val));
                }
              }}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:outline-2 focus:outline-[#701A35] text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono flex items-center justify-between">
              <span>Interest (₹)</span>
              <span className="text-[9px] text-[#701A35] font-bold">ASR Earning</span>
            </label>
            <input
              type="number"
              placeholder="e.g. 150000"
              value={interestAmount}
              onChange={(e) => {
                const val = e.target.value === '' ? '' : Number(e.target.value);
                setInterestAmount(val);
                if (val !== '' && capitalAmount > 0 && Number(val) <= capitalAmount) {
                  setDisbursedAmount(capitalAmount - Number(val));
                }
              }}
              className="w-full px-2.5 py-1.5 rounded border border-amber-300 bg-amber-50/70 font-mono font-bold text-amber-950 focus:outline-2 focus:outline-[#701A35] text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Frequency
            </label>
            <CustomSelect
              value={frequency}
              options={FREQUENCY_OPTIONS}
              onChange={(val) => setFrequency(val as RepaymentFrequency)}
              size="sm"
              buttonClassName="bg-white border-slate-300 py-1.5"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-mono">
              Status
            </label>
            <CustomSelect
              value={status}
              options={LOAN_STATUS_OPTIONS}
              onChange={(val) => setStatus(val as TopLoanStatus)}
              size="sm"
              buttonClassName="bg-white border-slate-300 py-1.5"
            />
          </div>
        </div>

        {/* ─── Filter & Balance Status Bar ─── */}
        <div className="px-3 sm:px-5 py-2 bg-[#F4F1EA] border-b border-[#D0C8B8] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 font-mono uppercase shrink-0">View Columns:</span>
            <div className="flex items-center bg-white rounded border border-[#D0C8B8] p-0.5 shrink-0">
              {[
                { id: 'ALL', label: 'All Companies (16)' },
                { id: 'SELECTED_ONLY', label: `Selected Only (${activeCompanyKeys.size})` },
                { id: 'ASR_ONLY', label: 'ASR Companies (10)' },
                { id: 'OUTSIDE_ONLY', label: 'Outside Companies (6)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id as any)}
                  className={`px-2 sm:px-3 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    categoryFilter === tab.id
                      ? 'bg-[#701A35] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-auto">
            {isTotalEqualCapital && !hasAnyMismatches ? (
              <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold border border-emerald-300 flex items-center gap-1 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Balanced
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 font-mono text-[11px] font-bold border border-rose-300 flex items-center gap-1 shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-700" /> Capital Mismatch
              </span>
            )}
            <span className="text-[11px] font-mono text-slate-500 font-bold">{rows.length} Rows</span>
          </div>
        </div>

        {/* ─── Excel Main Data Grid Table ─── */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-xs text-left border-collapse min-w-[1500px]">
            {/* Table Header */}
            <thead className="bg-[#EBE5DC] text-slate-800 font-mono text-[11px] uppercase tracking-wider font-bold border-b-2 border-slate-400 sticky top-0 z-20 shadow-2xs">
              <tr className="divide-x divide-slate-300">
                <th className="p-2.5 w-10 text-center sticky left-0 bg-[#E5DFC7] z-30 border-r border-slate-400">#</th>
                <th className="p-2.5 w-36">Due Date</th>
                <th className="p-2.5 w-28">Place</th>
                <th className="p-2.5 w-24">Dep Name</th>
                <th className="p-2.5 w-24">Chq No</th>
                <th className="p-2.5 w-36 text-right font-bold text-amber-950 bg-amber-100/80">Amount Due (₹)</th>
                <th className="p-2.5 w-28 text-center">Status</th>
                <th className="p-2.5 w-36">Recd Date</th>

                {/* Dynamic Funding Company Headers */}
                {visibleCompanyColumns.map((col) => {
                  const isSelected = activeCompanyKeys.has(col.key);
                  return (
                    <th
                      key={col.key}
                      className={`p-2.5 text-right w-28 transition-colors ${
                        !isSelected
                          ? 'bg-slate-200/50 text-slate-400 font-medium opacity-60 select-none'
                          : col.isOutside
                          ? 'bg-purple-100 text-purple-950 font-bold'
                          : 'bg-[#701A35]/10 text-[#701A35] font-bold'
                      }`}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>{col.label}</span>
                        {!isSelected && <span className="text-[9px] text-slate-400 font-mono font-normal">(off)</span>}
                      </div>
                    </th>
                  );
                })}

                <th className="p-2.5 w-36">Remarks</th>
                <th className="p-2.5 w-20 text-center">Action</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-300 font-mono text-xs">
              {rows.map((row, idx) => {
                const validation = rowMismatches[idx] || { isMismatch: false };
                const isRowPaid = isStatusPaid(row.status);
                const isOverCapital = (Number(row.amountDue) || 0) > capitalAmount;

                return (
                  <tr
                    key={row.id || row.seqNo}
                    className={`divide-x divide-slate-300 transition-colors ${
                      isOverCapital
                        ? 'bg-rose-100/90'
                        : isRowPaid
                        ? 'bg-emerald-100/90 hover:bg-emerald-200/80 font-bold'
                        : validation.isMismatch
                        ? 'bg-rose-50/60'
                        : idx % 2 === 0
                        ? 'bg-white'
                        : 'bg-[#FAF9F6]'
                    } hover:bg-amber-50/40`}
                  >
                    {/* S.No */}
                    <td className={`p-0 text-center font-bold sticky left-0 z-10 border-r border-slate-300 ${
                      isRowPaid ? 'bg-emerald-200/90 text-emerald-950 font-black' : 'bg-[#F4F1EA] text-slate-500'
                    }`}>
                      <div className="py-2">{row.seqNo}</div>
                    </td>

                    {/* Due Date with Custom DatePicker */}
                    <td className={`p-1 ${isRowPaid ? 'bg-emerald-100/90' : ''}`}>
                      <DatePicker
                        value={row.dueDate}
                        onChange={(d) => handleCellChange(idx, 'dueDate', d)}
                        theme="light"
                        size="sm"
                        compact={true}
                        buttonClassName={`w-full text-xs ${isRowPaid ? 'bg-emerald-50/90 text-emerald-950 font-bold border-emerald-300' : ''}`}
                      />
                    </td>

                    {/* Place */}
                    <td className={`p-0 ${isRowPaid ? 'bg-emerald-100/90' : ''}`}>
                      <input
                        type="text"
                        value={row.place}
                        onChange={(e) => handleCellChange(idx, 'place', e.target.value)}
                        className={`w-full h-full px-2.5 py-2 bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] ${
                          isRowPaid ? 'text-emerald-950 font-bold' : 'text-slate-800'
                        }`}
                      />
                    </td>

                    {/* Dep Name */}
                    <td className={`p-0 ${isRowPaid ? 'bg-emerald-100/90' : ''}`}>
                      <input
                        type="text"
                        value={row.depName}
                        onChange={(e) => handleCellChange(idx, 'depName', e.target.value)}
                        placeholder="DEP"
                        className={`w-full h-full px-2.5 py-2 bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] uppercase ${
                          isRowPaid ? 'text-emerald-950 font-black' : 'font-bold text-slate-800'
                        }`}
                      />
                    </td>

                    {/* Chq No */}
                    <td className={`p-0 ${isRowPaid ? 'bg-emerald-100/90' : ''}`}>
                      <input
                        type="text"
                        value={row.chqNo}
                        onChange={(e) => handleCellChange(idx, 'chqNo', e.target.value)}
                        placeholder="CHQ"
                        className={`w-full h-full px-2.5 py-2 bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] font-mono ${
                          isRowPaid ? 'text-emerald-950 font-bold' : 'text-slate-700'
                        }`}
                      />
                    </td>

                    {/* Amount Due (With capital restriction & paid green highlight) */}
                    <td className={`p-0 transition-colors ${
                      isOverCapital
                        ? 'bg-rose-200 text-rose-950 font-black'
                        : isRowPaid
                        ? 'bg-emerald-200/90 text-emerald-950 font-black border-x border-emerald-300'
                        : 'bg-amber-50/50'
                    }`}>
                      <input
                        type="number"
                        min="0"
                        max={capitalAmount}
                        value={row.amountDue || ''}
                        onChange={(e) => handleCellChange(idx, 'amountDue', Number(e.target.value) || 0)}
                        className={`w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 ${
                          isOverCapital
                            ? 'text-rose-900 font-black focus:outline-rose-600'
                            : isRowPaid
                            ? 'text-emerald-950 font-black focus:outline-emerald-600'
                            : 'text-slate-900 font-bold focus:outline-amber-600'
                        } [appearance:textfield] [&::-webkit-inner-spin-button]:hidden`}
                      />
                    </td>

                    {/* Status Dropdown - Allowed: Pending, Cleared, NEFT, RTGS, Cash */}
                    <td className={`p-0.5 text-center ${isRowPaid ? 'bg-emerald-100/90' : ''}`}>
                      <CustomSelect
                        value={normalizeStatus(row.status)}
                        options={ROW_STATUS_OPTIONS}
                        onChange={(val) => handleCellChange(idx, 'status', val)}
                        size="sm"
                        buttonClassName={`border-none bg-transparent hover:bg-white/80 focus:bg-white text-xs ${
                          isRowPaid ? 'text-emerald-950 font-black' : 'text-amber-900 font-bold'
                        }`}
                        menuClassName="w-32"
                      />
                    </td>

                    {/* Recd Date with Custom DatePicker */}
                    <td className={`p-1 ${isRowPaid ? 'bg-emerald-100/90' : ''}`}>
                      <DatePicker
                        value={row.recdDate}
                        onChange={(d) => handleCellChange(idx, 'recdDate', d)}
                        theme="light"
                        size="sm"
                        compact={true}
                        placeholder="—"
                        buttonClassName={`w-full text-xs ${isRowPaid ? 'bg-emerald-50/90 text-emerald-950 font-bold border-emerald-300' : ''}`}
                      />
                    </td>

                    {/* Dynamic Funding Company Cells */}
                    {visibleCompanyColumns.map((col) => {
                      const isSelected = activeCompanyKeys.has(col.key);
                      const val = Number(row[col.key]) || 0;

                      if (!isSelected) {
                        return (
                          <td
                            key={col.key}
                            className={`p-0 border-slate-200 select-none ${
                              isRowPaid ? 'bg-emerald-50/40 text-emerald-800/40' : 'bg-slate-100/70 text-slate-300'
                            }`}
                            title={`${col.label} is not a funding company for this loan (non-editable)`}
                          >
                            <div className="w-full h-full px-2.5 py-2 text-right font-mono select-none cursor-not-allowed">
                              —
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={col.key}
                          className={`p-0 ${
                            isRowPaid
                              ? 'bg-emerald-100/90 text-emerald-950 font-bold'
                              : col.isOutside
                              ? 'bg-purple-50/30'
                              : 'bg-[#701A35]/5'
                          }`}
                        >
                          <input
                            type="number"
                            value={val || ''}
                            placeholder="0"
                            onChange={(e) => handleCellChange(idx, col.key, Number(e.target.value) || 0)}
                            className={`w-full h-full px-2.5 py-2 text-right bg-transparent focus:bg-white focus:outline-2 ${
                              col.isOutside
                                ? 'focus:outline-purple-700'
                                : 'focus:outline-[#701A35]'
                            } ${
                              isRowPaid ? 'text-emerald-950 font-bold' : 'text-slate-900 font-semibold'
                            } [appearance:textfield] [&::-webkit-inner-spin-button]:hidden`}
                          />
                        </td>
                      );
                    })}

                    {/* Remarks */}
                    <td className={`p-0 ${isRowPaid ? 'bg-emerald-100/90' : ''}`}>
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => handleCellChange(idx, 'remarks', e.target.value)}
                        placeholder="Remarks"
                        className={`w-full h-full px-2.5 py-2 bg-transparent focus:bg-white focus:outline-2 focus:outline-[#701A35] text-xs ${
                          isRowPaid ? 'text-emerald-950 font-bold placeholder:text-emerald-800/50' : 'text-slate-700 font-sans'
                        }`}
                      />
                    </td>

                    {/* Actions: Re-balance & Delete */}
                    <td className={`p-0 text-center ${isRowPaid ? 'bg-emerald-100/90' : ''}`}>
                      <div className="flex items-center justify-center gap-1 py-1">
                        <button
                          type="button"
                          onClick={() => handleAutoBalanceRow(idx)}
                          className={`p-1 rounded cursor-pointer ${
                            isRowPaid
                              ? 'text-emerald-900 hover:text-emerald-950 hover:bg-emerald-200/90'
                              : 'text-slate-400 hover:text-[#701A35] hover:bg-slate-200'
                          }`}
                          title="Auto-balance row"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* ─── Exact Aligned Footer Totals Row ─── */}
            <tfoot className="bg-[#EBE5DC] border-t-2 border-[#701A35] font-mono text-xs font-bold text-slate-900 sticky bottom-0 z-20 shadow-xs divide-x divide-slate-400">
              <tr>
                <td className="p-2.5 text-center sticky left-0 bg-[#E5DFC7] z-30 font-extrabold border-r border-slate-400">
                  TOTAL
                </td>
                <td className="p-2.5 text-slate-700 font-bold">
                  {rows.length} EMIs
                </td>
                <td className="p-2.5" />
                <td className="p-2.5" />
                <td className="p-2.5" />
                <td className={`p-2.5 text-right font-extrabold border-x border-slate-400 ${
                  isTotalEqualCapital ? 'bg-amber-200 text-amber-950' : 'bg-rose-200 text-rose-950'
                }`}>
                  ₹{totalLoanAmount.toLocaleString('en-IN')}
                </td>
                <td className="p-2.5 text-center text-emerald-800 font-bold bg-emerald-50/60">
                  {paidRowsCount} Paid
                </td>
                <td className="p-2.5" />

                {/* Dynamic Funding Company Column Totals */}
                {visibleCompanyColumns.map((col) => {
                  const isSelected = activeCompanyKeys.has(col.key);
                  const sum = companySums[col.key as keyof typeof companySums] || 0;
                  return (
                    <td
                      key={col.key}
                      className={`p-2.5 text-right font-bold transition-colors ${
                        !isSelected
                          ? 'bg-slate-200/50 text-slate-400 opacity-60'
                          : col.isOutside
                          ? 'text-purple-950 bg-purple-100'
                          : 'text-[#701A35] bg-[#701A35]/15'
                      }`}
                    >
                      {isSelected ? `₹${sum.toLocaleString('en-IN')}` : '—'}
                    </td>
                  );
                })}

                <td className="p-2.5" />
                <td className="p-2.5 text-center text-slate-500 font-normal">Sync</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
