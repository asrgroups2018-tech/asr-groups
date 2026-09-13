import xlsx from 'xlsx';

const wb = xlsx.readFile('ASR - DATA - Copy.xlsx');
const ws = wb.Sheets['JULY RECEIPT DATA'];
const raw = xlsx.utils.sheet_to_json(ws, { header: 1 });
const headers = raw[0].map(h => String(h || '').trim());
const rows = raw.slice(1).map(r => {
  const obj = {};
  headers.forEach((h, i) => { if (h) obj[h] = r[i]; });
  return obj;
});

console.log('Total data rows:', rows.length);

const splitCompanyCols = ['PASS', 'ALA', 'IG', 'GS', 'MARS', 'TG', 'FIN', 'MM', 'CS', 'MC', 'TA (SS)', 'OTHERS'];
let mismatchCount = 0;
const mismatches = [];

rows.forEach((r, idx) => {
  const amt = Number(r['AMOUNT']) || 0;
  let splitSum = 0;
  splitCompanyCols.forEach(c => {
    splitSum += Number(r[c]) || 0;
  });
  if (Math.abs(amt - splitSum) > 0.01) {
    mismatchCount++;
    mismatches.push({
      rowIndex: idx + 1,
      sNo: r['S.NO'],
      clientName: r['CLIENT NAME'],
      amount: amt,
      splitSum,
      diff: amt - splitSum
    });
  }
});

console.log('Total mismatches found:', mismatchCount);
console.log('Mismatches details:', mismatches);

// Client name groupings
const clientGroups = {};
rows.forEach(r => {
  const name = String(r['CLIENT NAME'] || '').trim();
  if (!name) return;
  if (!clientGroups[name]) clientGroups[name] = [];
  clientGroups[name].push(r);
});

console.log('Unique Client Count:', Object.keys(clientGroups).length);
const multiEmiClients = Object.entries(clientGroups).filter(([name, list]) => list.length > 1);
console.log(`Clients with multiple EMIs: ${multiEmiClients.length}`);
console.log('Sample multi-EMI client (ABI ASSOCIATES):', clientGroups['ABI ASSOCIATES']);
