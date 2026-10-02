import xlsx from 'xlsx';
import fs from 'fs';

const wb = xlsx.readFile('ASR - DATA - Copy.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rawRows = xlsx.utils.sheet_to_json(sheet);

function cleanKey(k) {
  return String(k || '').trim().toUpperCase();
}

const cleanedRows = rawRows.map((r, idx) => {
  const obj = {};
  for (const [k, v] of Object.entries(r)) {
    obj[cleanKey(k)] = typeof v === 'string' ? v.trim() : v;
  }
  obj._rawIndex = idx + 2;
  return obj;
});

// Group by client name
const clientGroups = new Map();
for (const r of cleanedRows) {
  const cname = r['CLIENT NAME'];
  if (!cname) continue;
  if (!clientGroups.has(cname)) clientGroups.set(cname, []);
  clientGroups.get(cname).push(r);
}

console.log(`Total unique clients: ${clientGroups.size}`);

const analysis = [];

for (const [clientName, rows] of clientGroups.entries()) {
  // Sort rows by date (Excel date serial or formatted)
  rows.sort((a, b) => (Number(a.DATE) || 0) - (Number(b.DATE) || 0));

  // Check if multiple rows share the same date
  const dateMap = new Map();
  for (const r of rows) {
    const d = r.DATE;
    if (!dateMap.has(d)) dateMap.set(d, []);
    dateMap.get(d).push(r);
  }

  const multiRowDates = Array.from(dateMap.entries()).filter(([d, list]) => list.length > 1);

  if (multiRowDates.length > 0) {
    analysis.push({
      clientName,
      totalRows: rows.length,
      totalAmount: rows.reduce((s, r) => s + (Number(r.AMOUNT) || 0), 0),
      multiRowDateCount: multiRowDates.length,
      dates: Array.from(dateMap.keys()),
      rows: rows.map(r => ({
        sNo: r['S.NO'],
        date: r.DATE,
        codeNo: r['CODE NO'],
        place: r.PLACE,
        depName: r['DEP NAME'],
        chqNo: r['CHQ NO'],
        amount: r.AMOUNT,
        status: r.STATUS,
        pass: r.PASS,
        ala: r.ALA,
        ig: r.IG,
        gs: r.GS,
        mars: r.MARS,
        tg: r.TG,
        fin: r.FIN,
        mm: r.MM,
        cs: r.CS,
        mc: r.MC,
        taSS: r['TA (SS)'] || r['TA(SS)']
      }))
    });
  }
}

fs.writeFileSync('scripts/client_merge_deep_analysis.json', JSON.stringify(analysis, null, 2));
console.log(`Clients with overlapping rows on the same dates: ${analysis.length}`);
