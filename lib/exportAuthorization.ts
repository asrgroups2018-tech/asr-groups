import { Loan } from './types';

export async function getAuthorizedLoansForExport(): Promise<Loan[] | null> {
  try {
    const response = await fetch('/api/exports/loans', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.success || !Array.isArray(payload.data)) return null;
    return payload.data as Loan[];
  } catch {
    return null;
  }
}

export async function requestLoanExportAccess(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/access-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleId: 'loans',
        action: 'export',
        reason: 'Requested loan export access from the Loans page.',
      }),
    });
    const payload = await response.json();
    return { success: Boolean(payload.success), error: payload.error };
  } catch {
    return { success: false, error: 'Unable to submit the access request.' };
  }
}
