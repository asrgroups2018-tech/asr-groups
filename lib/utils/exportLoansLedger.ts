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

import ExcelJS from 'exceljs';

function getExportTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

export async function exportLoansToExcel(loans: Loan[], dateRangeLabel?: string) {
  const rows = flattenLoansForExport(loans);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ASR Groups Internal Finance ERP';
  workbook.lastModifiedBy = 'ASR Groups ERP';
  workbook.created = new Date();
  workbook.modified = new Date();

  const ws = workbook.addWorksheet('LOANS DATA', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 1, activeCell: 'A2' }],
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  // Define All 28 Columns with Metadata & Alignment
  const columnsDef = [
    { header: 'LOAN ID', key: 'loanId', width: 15, align: 'center', type: 'base' },
    { header: 'S.NO', key: 'seqNo', width: 8, align: 'center', type: 'base' },
    { header: 'CLIENT NAME', key: 'clientName', width: 34, align: 'left', type: 'base' },
    { header: 'CODE NO', key: 'codeNo', width: 12, align: 'center', type: 'base' },
    { header: 'PLACE', key: 'place', width: 15, align: 'left', type: 'base' },
    { header: 'DUE DATE', key: 'dueDate', width: 14, align: 'center', type: 'base' },
    { header: 'AMOUNT', key: 'amountDue', width: 18, align: 'right', type: 'amount' },
    { header: 'STATUS', key: 'status', width: 13, align: 'center', type: 'base' },
    { header: 'RECD DATE', key: 'recdDate', width: 14, align: 'center', type: 'base' },
    { header: 'DEP NAME', key: 'depName', width: 15, align: 'center', type: 'base' },
    { header: 'CHQ NO', key: 'chqNo', width: 14, align: 'center', type: 'base' },
    // 10 ASR Group Own Companies
    { header: 'PASS ENTERPRISES', key: 'pass', width: 18, align: 'right', type: 'asr' },
    { header: 'KARS ENTERPRISES', key: 'kars', width: 18, align: 'right', type: 'asr' },
    { header: 'INFIN GROUP', key: 'ig', width: 16, align: 'right', type: 'asr' },
    { header: 'INFINITY ENTERPRISES', key: 'ine', width: 18, align: 'right', type: 'asr' },
    { header: 'INNOVATIVE SOLUTIONS', key: 'ins', width: 20, align: 'right', type: 'asr' },
    { header: 'MARS SOLUTION', key: 'mars', width: 16, align: 'right', type: 'asr' },
    { header: 'MM ASSOCIATES', key: 'mm', width: 16, align: 'right', type: 'asr' },
    { header: 'TRIVENI GROUP', key: 'tg', width: 16, align: 'right', type: 'asr' },
    { header: 'GLOBAL SOLITAIRE', key: 'gs', width: 18, align: 'right', type: 'asr' },
    { header: 'ALAGESH', key: 'ala', width: 15, align: 'right', type: 'asr' },
    // 6 Outside Party Companies
    { header: 'FINCUBE VENTURES', key: 'fin', width: 18, align: 'right', type: 'outside' },
    { header: 'CS ASSOCIATES', key: 'cs', width: 16, align: 'right', type: 'outside' },
    { header: 'M CHINNIAH', key: 'mc', width: 15, align: 'right', type: 'outside' },
    { header: 'TATVA ENTERPRISES', key: 'tatva', width: 18, align: 'right', type: 'outside' },
    { header: 'BHAVANA CORP', key: 'bhavna', width: 16, align: 'right', type: 'outside' },
    { header: 'THIRUCHENDURAON ASSOCIATE', key: 'taSS', width: 24, align: 'right', type: 'outside' },
    // Remarks
    { header: 'REMARKS', key: 'remarks', width: 28, align: 'left', type: 'base' },
  ];

  // Map Data Rows into 2D Array for Table
  const tableDataRows = rows.map((r, rowIdx) => [
    r.loanId,
    r.seqNo || rowIdx + 1,
    r.clientName,
    r.codeNo || '',
    r.place || 'CHENNAI',
    r.dueDate || '',
    r.amountDue || 0,
    r.status || 'PENDING',
    r.recdDate || '',
    r.depName || '',
    r.chqNo || '',
    r.pass || 0,
    r.kars || 0,
    r.ig || 0,
    r.ine || 0,
    r.ins || 0,
    r.mars || 0,
    r.mm || 0,
    r.tg || 0,
    r.gs || 0,
    r.ala || 0,
    r.fin || 0,
    r.cs || 0,
    r.mc || 0,
    r.tatva || 0,
    r.bhavna || 0,
    r.taSS || 0,
    r.remarks || '',
  ]);

  // Add True Native Excel Table with Built-In Filter Buttons & Totals
  ws.addTable({
    name: 'LoansLedgerTable',
    ref: 'A1',
    headerRow: true,
    totalsRow: true,
    style: {
      theme: 'TableStyleMedium16',
      showRowStripes: true,
    },
    columns: columnsDef.map((c) => ({
      name: c.header,
      filterButton: true,
      totalsRowLabel: c.key === 'loanId' ? 'TOTAL' : undefined,
      totalsRowFunction: (c.type === 'amount' || c.type === 'asr' || c.type === 'outside') ? 'sum' : undefined,
    })),
    rows: tableDataRows,
  });

  // Set friendly column widths
  columnsDef.forEach((col, idx) => {
    ws.getColumn(idx + 1).width = col.width;
  });

  // Style Header Row (Row 1) with Application Brand Colors
  const headerRow = ws.getRow(1);
  headerRow.height = 32;

  columnsDef.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);

    let fillArgb = 'FF701A35'; // Deep Maroon (Application Brand)
    let fontColor = 'FFFFFFFF'; // White

    if (col.type === 'asr') {
      fillArgb = 'FF831843'; // ASR Internal Wine
      fontColor = 'FFEED8A1'; // Gold text
    } else if (col.type === 'outside') {
      fillArgb = 'FF451A03'; // Outside Party Bronze
      fontColor = 'FFFCD34D'; // Amber text
    }

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fillArgb },
    };

    cell.font = {
      name: 'Segoe UI',
      size: 10,
      bold: true,
      color: { argb: fontColor },
    };

    cell.alignment = {
      vertical: 'middle',
      horizontal: (col.align as any) || 'center',
      wrapText: true,
    };

    cell.border = {
      top: { style: 'thin', color: { argb: 'FF3D0E1C' } },
      left: { style: 'thin', color: { argb: 'FF3D0E1C' } },
      bottom: { style: 'medium', color: { argb: 'FF240710' } },
      right: { style: 'thin', color: { argb: 'FF3D0E1C' } },
    };
  });

  // Style Data Rows
  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const rowNumber = rIdx + 2;
    const row = ws.getRow(rowNumber);
    row.height = 20;

    const isEven = rIdx % 2 === 1;

    columnsDef.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFAF8F5' : 'FFFFFFFF' },
      };

      cell.font = {
        name: 'Segoe UI',
        size: 9.5,
        color: { argb: 'FF1E293B' },
      };

      cell.alignment = {
        vertical: 'middle',
        horizontal: (col.align as any) || 'left',
      };

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE6E1D6' } },
        left: { style: 'thin', color: { argb: 'FFE6E1D6' } },
        bottom: { style: 'thin', color: { argb: 'FFE6E1D6' } },
        right: { style: 'thin', color: { argb: 'FFE6E1D6' } },
      };

      // Numeric columns formatting
      if (col.type === 'amount' || col.type === 'asr' || col.type === 'outside') {
        cell.numFmt = '#,##,##0';
        if (typeof cell.value === 'number') {
          cell.font = {
            name: 'Segoe UI',
            size: 9.5,
            bold: col.type === 'amount',
            color: { argb: col.type === 'amount' ? 'FF111827' : 'FF334155' },
          };
        }
      }

      // Status pill color coding
      if (col.key === 'status') {
        const st = String(cell.value || '').toUpperCase();
        if (['PASS', 'PAID', 'NEFT', 'CASH', 'CLS'].includes(st)) {
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF047857' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
        } else if (['RET', 'RET NEFT', 'RET PASS', 'BOUNCED'].includes(st)) {
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
        } else if (st === 'PENDING') {
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFB45309' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
        }
      }
    });
  }

  // Style the Totals Row (Row N + 2)
  const totalRowNumber = rows.length + 2;
  const totalRow = ws.getRow(totalRowNumber);
  totalRow.height = 26;

  columnsDef.forEach((col, colIdx) => {
    const cell = totalRow.getCell(colIdx + 1);

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2EBE1' },
    };

    cell.font = {
      name: 'Segoe UI',
      size: 10,
      bold: true,
      color: { argb: 'FF701A35' },
    };

    cell.alignment = {
      vertical: 'middle',
      horizontal: (col.align as any) || 'left',
    };

    cell.border = {
      top: { style: 'thin', color: { argb: 'FF701A35' } },
      bottom: { style: 'double', color: { argb: 'FF701A35' } },
      left: { style: 'thin', color: { argb: 'FFD4C8B8' } },
      right: { style: 'thin', color: { argb: 'FFD4C8B8' } },
    };

    if (col.type === 'amount' || col.type === 'asr' || col.type === 'outside') {
      cell.numFmt = '#,##,##0';
    }
  });

  // Generate Excel Buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sanitizedRange = (dateRangeLabel || 'All_Dates').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `ASR_Loans_Ledger_${sanitizedRange}_${getExportTimestamp()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
    'All Funding Entities Involved',
  ];

  const tableBody = rows.map((r) => {
    // List ALL companies involved with their split amounts
    const allCompanySplits: [string, number][] = [
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

    const activeSplits = allCompanySplits.filter(([_, amt]) => amt > 0);
    const splitText = activeSplits.length > 0
      ? activeSplits.map(([name, amt]) => `${name} (${amt.toLocaleString('en-IN')})`).join(' · ')
      : (r.depName ? `${r.depName} (${r.amountDue.toLocaleString('en-IN')})` : '-');

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
      splitText,
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
        `Total ${loans.length} Loans (${rows.length} entries)`,
        '',
        '',
        '',
        `INR ${totalAmount.toLocaleString('en-IN')}`,
        '',
        '',
        '',
        'All 16 Portfolios Consolidated',
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
      0: { fontStyle: 'bold', cellWidth: 62 },  // Loan ID
      1: { halign: 'center', cellWidth: 18 },   // #
      2: { fontStyle: 'bold', cellWidth: 120 }, // Client Name
      3: { cellWidth: 38 },                     // Code
      4: { cellWidth: 48 },                     // Place
      5: { cellWidth: 48 },                     // Due Date
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 60 }, // Amount
      7: { halign: 'center', cellWidth: 42 },   // Status
      8: { cellWidth: 48 },                     // Recd Date
      9: { cellWidth: 48 },                     // Cheque
      10: { cellWidth: 245 },                   // All Funding Entities Involved
    },
    margin: { top: 115, right: 25, bottom: 40, left: 25 },
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
  const filename = `ASR_Loans_Report_${sanitizedRange}_${getExportTimestamp()}.pdf`;
  doc.save(filename);
}
