import { PartnerPortalData, PartnerPortalMonth, PartnerPortalTransaction } from '@/lib/types';
import { isPaidStatus } from '@/lib/utils/statusMapping';
import { initializeSchema } from './schema';
import { getTursoClient } from './turso';

export async function getPartnerPortalData(companyId: string): Promise<PartnerPortalData | null> {
  const client = getTursoClient();
  await initializeSchema(client);

  const [companyResult, fundingResult, installmentResult] = await client.batch([
    {
      sql: 'SELECT id, name, short_code, opening_balance, opening_balance_type FROM companies WHERE id = ? LIMIT 1',
      args: [companyId],
    },
    {
      sql: `SELECT COALESCE(NULLIF(l.start_date, ''), substr(l.created_at, 1, 10)) AS transaction_date,
                   SUM(lcs.split_amount) AS amount,
                   SUM(l.total_amount) AS related_portfolio_amount,
                   SUM(CASE WHEN l.is_opening_balance_only = 1 THEN 0
                     ELSE (CASE WHEN COALESCE(l.disbursed_amount, 0) > 0 THEN l.disbursed_amount
                                ELSE MAX(0, l.total_amount - COALESCE(l.interest_amount, 0)) END)
                          * lcs.split_percent / 100 END) AS capital_deployed,
                   SUM(CASE WHEN l.is_opening_balance_only = 1 THEN 0
                     ELSE COALESCE(l.interest_amount, 0) * lcs.split_percent / 100 END) AS projected_profit_loss
            FROM loan_company_splits lcs
            JOIN loans l ON l.id = lcs.loan_id
            WHERE lcs.company_id = ?
            GROUP BY COALESCE(NULLIF(l.start_date, ''), substr(l.created_at, 1, 10))`,
      args: [companyId],
    },
    {
      sql: `SELECT i.due_date, i.recd_date, i.status, ics.amount
            FROM installment_company_splits ics
            JOIN installments i ON i.id = ics.installment_id
            WHERE ics.company_id = ?
            ORDER BY COALESCE(i.recd_date, i.due_date) DESC, i.due_date DESC`,
      args: [companyId],
    },
  ], 'read');

  const companyRow = companyResult.rows[0];
  if (!companyRow) return null;

  const monthMap = new Map<string, PartnerPortalMonth>();
  const getMonth = (date: string) => {
    const key = String(date || '').slice(0, 7);
    if (!key) return null;
    let month = monthMap.get(key);
    if (!month) {
      month = { month: key, capitalAllocated: 0, scheduledReturn: 0, receivedReturn: 0 };
      monthMap.set(key, month);
    }
    return month;
  };

  const transactions: PartnerPortalTransaction[] = [];
  let totalFunded = 0;
  let capitalDeployed = 0;
  let projectedProfitLoss = 0;
  let relatedPortfolioAmount = 0;
  for (const row of fundingResult.rows) {
    const amount = Number(row.amount || 0);
    const date = String(row.transaction_date || '');
    totalFunded += amount;
    capitalDeployed += Number(row.capital_deployed || 0);
    projectedProfitLoss += Number(row.projected_profit_loss || 0);
    relatedPortfolioAmount += Number(row.related_portfolio_amount || 0);
    const month = getMonth(date);
    if (month) month.capitalAllocated += amount;
    transactions.push({ date, category: 'Capital allocated', expectedAmount: amount, receivedAmount: 0, status: 'Allocated' });
  }

  let totalScheduledReturn = 0;
  let totalReceivedReturn = 0;
  for (const row of installmentResult.rows) {
    const amount = Number(row.amount || 0);
    const dueDate = String(row.due_date || '');
    const receivedDate = String(row.recd_date || '');
    const paid = isPaidStatus(String(row.status || ''));
    totalScheduledReturn += amount;
    if (paid) totalReceivedReturn += amount;
    const scheduledMonth = getMonth(dueDate);
    if (scheduledMonth) scheduledMonth.scheduledReturn += amount;
    if (paid) {
      const receivedMonth = getMonth(receivedDate || dueDate);
      if (receivedMonth) receivedMonth.receivedReturn += amount;
    }
    transactions.push({
      date: dueDate || receivedDate,
      dueDate: dueDate || undefined,
      receivedDate: receivedDate || undefined,
      category: 'Scheduled return',
      expectedAmount: amount,
      receivedAmount: paid ? amount : 0,
      status: paid ? 'Paid' : String(row.status || 'Pending'),
    });
  }

  const openingAmount = Math.max(0, Number(companyRow.opening_balance || 0));
  const openingBalance = String(companyRow.opening_balance_type || 'DEBIT').toUpperCase() === 'CREDIT'
    ? -openingAmount
    : openingAmount;

  transactions.sort((a, b) => b.date.localeCompare(a.date) || a.category.localeCompare(b.category));
  const monthly = Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month));

  return {
    company: { name: String(companyRow.name), shortCode: String(companyRow.short_code) },
    openingBalance,
    totalFunded,
    capitalDeployed,
    totalScheduledReturn,
    totalReceivedReturn,
    remainingScheduledReturn: Math.max(0, totalScheduledReturn - totalReceivedReturn),
    capitalSharePercent: relatedPortfolioAmount > 0 ? (totalFunded / relatedPortfolioAmount) * 100 : 0,
    recoveryPercent: totalScheduledReturn > 0 ? (totalReceivedReturn / totalScheduledReturn) * 100 : 0,
    projectedProfitLoss,
    projectedProfitLossPercent: capitalDeployed > 0 ? (projectedProfitLoss / capitalDeployed) * 100 : 0,
    transactions,
    monthly,
  };
}
