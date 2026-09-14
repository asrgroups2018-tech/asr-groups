import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Loan } from '@/lib/types';

export interface FlattenedLoanExportRow {
  loanId: string;
  seqNo: number | string;
  clientName: string;
  codeNo: string;
  place: string;
  dueDate: string;
  amountDue: number;
  status: string;
  recdDate: string;
  depName: string;
  chqNo: string;
  // 10 ASR Companies
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
  // 6 Outside Companies
  fin: number;
  cs: number;
  mc: number;
  tatva: number;
  bhavna: number;
  taSS: number;
  remarks: string;
}

export function flattenLoansForExport(loans: Loan[]): FlattenedLoanExportRow[] {
  const rows: FlattenedLoanExportRow[] = [];

  loans.forEach((loan) => {
    const installments = loan.installments || [];

    if (installments.length === 0) {
      // Loan with no specific installments yet - output loan facility row
      const splits = loan.splits || [];
      const splitMap: Record<string, number> = {};
      splits.forEach((s) => {
        splitMap[s.companyCode] = s.splitAmount;
      });

      rows.push({
        loanId: loan.id,
        seqNo: 1,
        clientName: loan.customerName,
        codeNo: loan.codeNo || '',
        place: loan.place || 'CHENNAI',
        dueDate: loan.startDate || '',
        amountDue: loan.totalAmount || 0,
        status: loan.status || 'Active',
        recdDate: '',
        depName: '',
        chqNo: '',
        pass: Number(splitMap['PASS'] || splitMap['PASS ENTERPRISES'] || 0),
        kars: Number(splitMap['KARS'] || splitMap['KARS ENTERPRISES'] || 0),
        ig: Number(splitMap['IG'] || splitMap['INFIN GROUP'] || splitMap['INFIN'] || 0),
        ine: Number(splitMap['INE'] || splitMap['INFINITY ENTERPRISES'] || 0),
        ins: Number(splitMap['INS'] || splitMap['INNOVATIVE SOLUTIONS'] || 0),
        mars: Number(splitMap['MARS'] || splitMap['MARS SOLUTION'] || 0),
        mm: Number(splitMap['MM'] || splitMap['MM ASSOCIATES'] || 0),
        tg: Number(splitMap['TG'] || splitMap['TRIVENI GROUP'] || 0),
        gs: Number(splitMap['GS'] || splitMap['GLOBAL SOLITAIRE'] || 0),
        ala: Number(splitMap['ALA'] || splitMap['ALAGESH'] || 0),
        fin: Number(splitMap['FIN'] || splitMap['FINCUBE VENTURES'] || 0),
        cs: Number(splitMap['CS'] || splitMap['CS ASSOCIATES'] || 0),
        mc: Number(splitMap['MC'] || splitMap['M CHINNIAH'] || 0),
        tatva: Number(splitMap['TATVA'] || splitMap['TATVA ENTERPRISES'] || 0),
        bhavna: Number(splitMap['BHAVNA'] || splitMap['BHAVANA'] || 0),
        taSS: Number(splitMap['TA (SS)'] || splitMap['TA'] || 0),
        remarks: (loan as any).remarks || '',
      });
      return;
    }

    installments.forEach((inst, idx) => {
      const splits = inst.companySplits || {};

      rows.push({
        loanId: loan.id,
        seqNo: inst.seqNo || idx + 1,
        clientName: loan.customerName,
        codeNo: loan.codeNo || '',
        place: inst.place || loan.place || 'CHENNAI',
        dueDate: inst.dueDate || loan.startDate || '',
        amountDue: Number(inst.amountDue) || 0,
        status: inst.status || 'PENDING',
        recdDate: inst.recdDate || '',
        depName: inst.depName || '',
        chqNo: inst.chqNo || '',
        // 10 ASR Companies
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
        // 6 Outside Companies
        fin: Number(splits['FIN'] || splits['FINCUBE VENTURES'] || 0),
        cs: Number(splits['CS'] || splits['CS ASSOCIATES'] || 0),
        mc: Number(splits['MC'] || splits['M CHINNIAH'] || 0),
        tatva: Number(splits['TATVA'] || splits['TATVA ENTERPRISES'] || 0),
        bhavna: Number(splits['BHAVNA'] || splits['BHAVANA'] || splits['BHAVANA CORP'] || 0),
        taSS: Number(splits['TA (SS)'] || splits['TA'] || splits['THIRUCHENDURAON ASSOCIATE'] || 0),
        remarks: inst.remarks || '',
      });
    });
  });

  return rows;
}

export function exportLoansToExcel(loans: Loan[], dateRangeLabel?: string) {
  const rows = flattenLoansForExport(loans);

  // Map to full edit structure with exact headers
  const exportData = rows.map((r, i) => ({
    'LOAN ID': r.loanId,
    'S.NO': r.seqNo || i + 1,
    'CLIENT NAME': r.clientName,
    'CODE NO': r.codeNo,
    'PLACE': r.place,
    'DUE DATE': r.dueDate,
    'AMOUNT': r.amountDue,
    'STATUS': r.status,
    'RECD DATE': r.recdDate,
    'DEP NAME': r.depName,
    'CHQ NO': r.chqNo,
    'PASS ENTERPRISES': r.pass || '',
    'KARS ENTERPRISES': r.kars || '',
    'INFIN GROUP': r.ig || '',
    'INFINITY ENTERPRISES': r.ine || '',
    'INNOVATIVE SOLUTIONS': r.ins || '',
    'MARS SOLUTION': r.mars || '',
    'MM ASSOCIATES': r.mm || '',
    'TRIVENI GROUP': r.tg || '',
    'GLOBAL SOLITAIRE': r.gs || '',
    'ALAGESH': r.ala || '',
    'FINCUBE VENTURES': r.fin || '',
    'CS ASSOCIATES': r.cs || '',
    'M CHINNIAH': r.mc || '',
    'TATVA ENTERPRISES': r.tatva || '',
    'BHAVANA CORP': r.bhavna || '',
    'THIRUCHENDURAON ASSOCIATE': r.taSS || '',
    'REMARKS': r.remarks,
  }));

  // Append summary row
  const totalAmount = rows.reduce((s, r) => s + r.amountDue, 0);
  const totalPass = rows.reduce((s, r) => s + r.pass, 0);
  const totalKars = rows.reduce((s, r) => s + r.kars, 0);
  const totalIg = rows.reduce((s, r) => s + r.ig, 0);
  const totalIne = rows.reduce((s, r) => s + r.ine, 0);
  const totalIns = rows.reduce((s, r) => s + r.ins, 0);
  const totalMars = rows.reduce((s, r) => s + r.mars, 0);
  const totalMm = rows.reduce((s, r) => s + r.mm, 0);
  const totalTg = rows.reduce((s, r) => s + r.tg, 0);
  const totalGs = rows.reduce((s, r) => s + r.gs, 0);
  const totalAla = rows.reduce((s, r) => s + r.ala, 0);
  const totalFin = rows.reduce((s, r) => s + r.fin, 0);
  const totalCs = rows.reduce((s, r) => s + r.cs, 0);
  const totalMc = rows.reduce((s, r) => s + r.mc, 0);
  const totalTatva = rows.reduce((s, r) => s + r.tatva, 0);
  const totalBhavna = rows.reduce((s, r) => s + r.bhavna, 0);
  const totalTaSS = rows.reduce((s, r) => s + r.taSS, 0);

  exportData.push({
    'LOAN ID': 'TOTAL',
    'S.NO': '',
    'CLIENT NAME': `Total (${rows.length} entries across ${loans.length} loans)`,
    'CODE NO': '',
    'PLACE': '',
    'DUE DATE': '',
    'AMOUNT': totalAmount,
    'STATUS': '',
    'RECD DATE': '',
    'DEP NAME': '',
    'CHQ NO': '',
    'PASS ENTERPRISES': totalPass || '',
    'KARS ENTERPRISES': totalKars || '',
    'INFIN GROUP': totalIg || '',
    'INFINITY ENTERPRISES': totalIne || '',
    'INNOVATIVE SOLUTIONS': totalIns || '',
    'MARS SOLUTION': totalMars || '',
    'MM ASSOCIATES': totalMm || '',
    'TRIVENI GROUP': totalTg || '',
    'GLOBAL SOLITAIRE': totalGs || '',
    'ALAGESH': totalAla || '',
    'FINCUBE VENTURES': totalFin || '',
    'CS ASSOCIATES': totalCs || '',
    'M CHINNIAH': totalMc || '',
    'TATVA ENTERPRISES': totalTatva || '',
    'BHAVANA CORP': totalBhavna || '',
    'THIRUCHENDURAON ASSOCIATE': totalTaSS || '',
    'REMARKS': '',
  });

  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set friendly column widths
  const colWidths = [
    { wch: 14 }, // LOAN ID
    { wch: 8 },  // S.NO
    { wch: 28 }, // CLIENT NAME
    { wch: 10 }, // CODE NO
    { wch: 14 }, // PLACE
    { wch: 12 }, // DUE DATE
    { wch: 16 }, // AMOUNT
    { wch: 12 }, // STATUS
    { wch: 12 }, // RECD DATE
    { wch: 16 }, // DEP NAME
    { wch: 14 }, // CHQ NO
    // 10 ASR Companies
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    // 6 Outside Companies
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 24 }, // REMARKS
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'LOANS DATA');

  const sanitizedRange = (dateRangeLabel || 'All_Dates').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `ASR_Loans_Ledger_${sanitizedRange}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportLoansToPDF(loans: Loan[], dateRangeLabel?: string) {
  const rows = flattenLoansForExport(loans);
  const totalAmount = rows.reduce((s, r) => s + r.amountDue, 0);
  const collectedAmount = loans.reduce((sum, l) => {
    return sum + (l.installments || []).reduce((instSum, inst) => {
      if (inst.status === 'PASS' || inst.status === 'CLS' || inst.status === 'Paid') {
        return instSum + (inst.amountDue || 0);
      }
      return instSum;
    }, 0);
  }, 0);

  // Initialize Landscape A4 PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Background Bar
  doc.setFillColor(112, 26, 53); // #701A35 ASR Brand Maroon
  doc.rect(0, 0, pageWidth, 55, 'F');

  // Brand Logo / Gold Accent
  doc.setFillColor(197, 160, 89); // #C5A059 Gold Accent
  doc.rect(0, 52, pageWidth, 3, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('ASR GROUPS · EXECUTIVE LOANS & EMI LEDGER', 30, 28);

  // Subtitle / Filters
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(238, 216, 161);
  const subtitle = `Filter Range: ${dateRangeLabel || 'All Dates'}  |  Total Facilities: ${loans.length}  |  Total Entries: ${rows.length}  |  Generated: ${new Date().toLocaleString('en-IN')}`;
  doc.text(subtitle, 30, 44);

  // Summary KPI Cards on top
  doc.setDrawColor(230, 225, 214);
  doc.setFillColor(248, 246, 241);
  doc.roundedRect(30, 65, 230, 40, 6, 6, 'FD');
  doc.roundedRect(275, 65, 230, 40, 6, 6, 'FD');
  doc.roundedRect(520, 65, 230, 40, 6, 6, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 110, 100);
  doc.text('TOTAL PORTFOLIO VOLUME', 40, 78);
  doc.text('TOTAL RECOVERED / SETTLED', 285, 78);
  doc.text('OUTSTANDING BALANCE', 530, 78);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(`INR ${totalAmount.toLocaleString('en-IN')}`, 40, 96);
  doc.setTextColor(4, 120, 87);
  doc.text(`INR ${collectedAmount.toLocaleString('en-IN')}`, 285, 96);
  doc.setTextColor(180, 83, 9);
  doc.text(`INR ${Math.max(0, totalAmount - collectedAmount).toLocaleString('en-IN')}`, 530, 96);

  // Table Columns
  const tableHeaders = [
    'Loan ID',
    '#',
    'Client / Borrower',
    'Code',
    'Place',
    'Due Date',
    'Amount (INR)',
    'Status',
    'Recd Date',
    'Cheque / Ref',
    'Main Funding Entity',
  ];

  const tableBody = rows.map((r) => {
    // Find top funding entity
    let maxComp = '-';
    let maxAmt = 0;
    const comps: [string, number][] = [
      ['PASS', r.pass],
      ['KARS', r.kars],
      ['IG', r.ig],
      ['INE', r.ine],
      ['INS', r.ins],
      ['MARS', r.mars],
      ['MM', r.mm],
      ['TG', r.tg],
      ['GS', r.gs],
      ['ALA', r.ala],
      ['FIN', r.fin],
      ['CS', r.cs],
      ['MC', r.mc],
      ['TATVA', r.tatva],
      ['BHAVNA', r.bhavna],
      ['TA', r.taSS],
    ];
    comps.forEach(([name, amt]) => {
      if (amt > maxAmt) {
        maxAmt = amt;
        maxComp = `${name} (${amt.toLocaleString('en-IN')})`;
      }
    });

    return [
      r.loanId,
      String(r.seqNo),
      r.clientName,
      r.codeNo || '-',
      r.place || 'CHENNAI',
      r.dueDate || '-',
      r.amountDue.toLocaleString('en-IN'),
      r.status || 'PENDING',
      r.recdDate || '-',
      r.chqNo || '-',
      maxComp,
    ];
  });

  autoTable(doc, {
    startY: 115,
    head: [tableHeaders],
    body: tableBody,
    foot: [
      [
        'TOTAL',
        '',
        `Total ${loans.length} Loans`,
        '',
        '',
        '',
        `INR ${totalAmount.toLocaleString('en-IN')}`,
        '',
        '',
        '',
        '',
      ],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [112, 26, 53],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    footStyles: {
      fillColor: [243, 239, 230],
      textColor: [112, 26, 53],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [250, 248, 245],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 65 }, // Loan ID
      1: { halign: 'center', cellWidth: 20 },  // #
      2: { fontStyle: 'bold', cellWidth: 140 }, // Client Name
      3: { cellWidth: 40 },                    // Code
      4: { cellWidth: 60 },                    // Place
      5: { cellWidth: 55 },                    // Due Date
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 65 }, // Amount
      7: { halign: 'center', cellWidth: 50 },  // Status
      8: { cellWidth: 55 },                    // Recd Date
      9: { cellWidth: 55 },                    // Cheque
      10: { cellWidth: 120 },                  // Main Funding
    },
    margin: { top: 115, right: 30, bottom: 40, left: 30 },
    didDrawPage: (data) => {
      // Footer page numbering
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      const str = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}  |  ASR Groups Financial ERP  |  Confidential & Proprietary`;
      doc.text(str, pageWidth / 2, pageHeight - 15, { align: 'center' });
    },
  });

  const sanitizedRange = (dateRangeLabel || 'All_Dates').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `ASR_Loans_Report_${sanitizedRange}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
