import { getTursoClient } from './turso';
import { getLoans, generateNextLoanId } from './loans';
import { getCompanies } from './companies';
import { Loan, LoanCompanySplit } from '@/lib/types';

export interface RawIncomingRow {
  sNo?: number | string;
  date: string; // YYYY-MM-DD or formatted string
  codeNo?: string;
  place?: string;
  clientName: string;
  depName?: string;
  chqNo?: string;
  amount: number;
  status?: string;
  splits: Record<string, number>; // e.g. { PASS: 300000, "TA (SS)": 150000 }
  remarks?: string;
}

export interface MatchedImportRow {
  rowIndex: number;
  raw: RawIncomingRow;
  normalizedClient: string;
  signature: string;
  decision: 'CONTINUATION' | 'NEW_LOAN';
  targetLoanId?: string;
  targetLoanSummary?: string;
  proposedSeqNo?: number;
  candidateLoans: {
    loanId: string;
    codeNo?: string;
    totalAmount: number;
    installmentCount: number;
    signature: string;
    splitsSummary: string;
  }[];
}

export interface ImportMatchResult {
  totalRows: number;
  totalVolume: number;
  continuationCount: number;
  newLoanCount: number;
  rows: MatchedImportRow[];
}

export function buildSignature(amount: number, splits: Record<string, number>, depName?: string): string {
  const cleanAmt = Math.round(Number(amount) || 0);
  const cleanDep = (depName || '').trim().toUpperCase();
  
  // Sort split keys for consistent hash
  const sortedSplits = Object.entries(splits)
    .filter(([_, val]) => Number(val) > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([comp, val]) => `${comp.toUpperCase()}:${Math.round(Number(val))}`)
    .join('+');

  return `AMT:${cleanAmt}|SPLITS:${sortedSplits}|DEP:${cleanDep}`;
}

export function buildLoanSignature(loan: Loan): string {
  // If loan has installments, signature is based on recurring installment profile
  if (loan.installments && loan.installments.length > 0) {
    const firstInst = loan.installments[0];
    return buildSignature(firstInst.amountDue, firstInst.companySplits || {}, firstInst.depName);
  }
  
  // Fallback to loan-level splits
  const splitsMap: Record<string, number> = {};
  loan.splits.forEach(s => {
    splitsMap[s.companyCode || s.companyName] = s.splitAmount;
  });
  return buildSignature(loan.totalAmount, splitsMap);
}

export function normalizeClientName(rawName: string): string {
  const n = String(rawName || '').trim().toUpperCase();
  if (n === 'CON CORD') return 'CON CORD VOYAGES';
  if (n === 'DSK HOSPITAL') return 'DSK HOSPITAL PVT LTD';
  if (n === 'DSM PROTIENS') return 'DSM PROTEINS';
  if (n === 'STEPUP 999') return 'STEP UP 999';
  if (n === 'OMKARFILLING') return 'OMKAR FILLING';
  if (n === 'IVL MATRIC') return 'IVL MATRIC HR SEC SCHOOL';
  if (n === 'AEDEN FRUIT') return 'AEDEN FRUITS INTERNATIONAL PVT LTD';
  return n;
}

/**
 * Runs dry-run continuation signature matching for incoming rows against live loans.
 */
export async function matchIncomingRows(rawRows: RawIncomingRow[]): Promise<ImportMatchResult> {
  const existingLoans = await getLoans();

  // Group existing loans by normalized customer name
  const loansByCustomer = new Map<string, Loan[]>();
  existingLoans.forEach(l => {
    const cname = normalizeClientName(l.customerName);
    if (!loansByCustomer.has(cname)) loansByCustomer.set(cname, []);
    loansByCustomer.get(cname)!.push(l);
  });

  let continuationCount = 0;
  let newLoanCount = 0;
  let totalVolume = 0;

  const matchedRows: MatchedImportRow[] = [];

  for (let idx = 0; idx < rawRows.length; idx++) {
    const raw = rawRows[idx];
    const normalizedClient = normalizeClientName(raw.clientName);
    const signature = buildSignature(raw.amount, raw.splits, raw.depName);
    totalVolume += raw.amount;

    const clientLoans = loansByCustomer.get(normalizedClient) || [];

    const candidateLoans = clientLoans.map(l => ({
      loanId: l.id,
      codeNo: l.codeNo,
      totalAmount: l.totalAmount,
      installmentCount: l.installmentCount,
      signature: buildLoanSignature(l),
      splitsSummary: l.splits.map(s => `${s.companyCode || s.companyName}: ₹${s.splitAmount.toLocaleString('en-IN')}`).join(', '),
    }));

    // Find candidate matching signature
    let matchedLoan: Loan | undefined;

    for (const l of clientLoans) {
      const loanSig = buildLoanSignature(l);
      if (loanSig === signature) {
        matchedLoan = l;
        break;
      }
    }

    if (matchedLoan) {
      continuationCount++;
      const currentEMICount = matchedLoan.installments?.length || matchedLoan.installmentCount || 0;
      matchedRows.push({
        rowIndex: idx,
        raw,
        normalizedClient,
        signature,
        decision: 'CONTINUATION',
        targetLoanId: matchedLoan.id,
        targetLoanSummary: `${matchedLoan.id} (${matchedLoan.customerName} - ₹${matchedLoan.totalAmount.toLocaleString('en-IN')})`,
        proposedSeqNo: currentEMICount + 1,
        candidateLoans,
      });
    } else {
      newLoanCount++;
      matchedRows.push({
        rowIndex: idx,
        raw,
        normalizedClient,
        signature,
        decision: 'NEW_LOAN',
        candidateLoans,
      });
    }
  }

  return {
    totalRows: rawRows.length,
    totalVolume,
    continuationCount,
    newLoanCount,
    rows: matchedRows,
  };
}
