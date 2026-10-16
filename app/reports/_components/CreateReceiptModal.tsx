'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { Download, FileText, IndianRupee, ReceiptText, Save, X } from 'lucide-react';
import jsPDF from 'jspdf';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { useApp } from '@/lib/store';
import { formatINR, numberToWordsINR } from '@/lib/utils/formatCurrency';
import { getTodayIsoDate } from '@/components/ui/DatePicker';
import {
  ManualReceipt,
  ManualReceiptDebitCredit,
  ManualReceiptPaymentMode,
} from '@/lib/types';

interface CreateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (receipt: ManualReceipt) => void;
}

type ReceiptFormState = Omit<ManualReceipt, 'id' | 'createdAt' | 'createdBy'>;
type ReceiptOrientation = 'portrait' | 'landscape';

const PAYMENT_MODE_OPTIONS: Array<{ value: ManualReceiptPaymentMode; label: string }> = [
  { value: 'UPI', label: 'UPI' },
  { value: 'NEFT', label: 'NEFT' },
  { value: 'RTGS', label: 'RTGS' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CASH', label: 'Cash' },
  { value: 'IMPS', label: 'IMPS' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
];

const EMPTY_FORM: ReceiptFormState = {
  receiptNumber: '',
  accountNumber: '',
  transactionDate: getTodayIsoDate(),
  transactionAmount: 0,
  debitCredit: 'CREDIT',
  paymentMode: 'UPI',
  chequeNumber: '',
  transactionDescription: '',
  transactionId: '',
  remarks: '',
};

function formatReceiptDate(value: string): string {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function displayValue(value: string): string {
  return value.trim() || '—';
}

function paymentModeLabel(mode: ManualReceiptPaymentMode): string {
  return PAYMENT_MODE_OPTIONS.find((option) => option.value === mode)?.label || mode;
}

const RECEIPT_LOGO = '/groups-finalized.png';
const RECEIPT_COLORS = {
  page: { hex: '#F1F5F9', rgb: [241, 245, 249] as const },
  paper: { hex: '#FFFFFF', rgb: [255, 255, 255] as const },
  maroon: { hex: '#701A35', rgb: [112, 26, 53] as const },
  gold: { hex: '#EED8A1', rgb: [238, 216, 161] as const },
  text: { hex: '#172033', rgb: [23, 32, 51] as const },
  slate: { hex: '#475569', rgb: [71, 85, 105] as const },
  divider: { hex: '#94A3B8', rgb: [148, 163, 184] as const },
  subtext: { hex: '#64748B', rgb: [100, 116, 139] as const },
};

interface ReceiptRow {
  label: string;
  value: string;
  emphasis?: 'amount' | 'words';
}

function getReceiptRows(receipt: ManualReceipt): ReceiptRow[] {
  return [
    { label: 'Account number', value: displayValue(receipt.accountNumber) },
    { label: 'Transaction date', value: formatReceiptDate(receipt.transactionDate) },
    { label: 'Transaction amount', value: formatINR(receipt.transactionAmount), emphasis: 'amount' },
    { label: 'Amount in words', value: numberToWordsINR(receipt.transactionAmount), emphasis: 'words' },
    { label: 'Debit / Credit', value: receipt.debitCredit },
    { label: 'Payment mode', value: paymentModeLabel(receipt.paymentMode) },
    { label: 'Cheque number', value: displayValue(receipt.chequeNumber) },
    { label: 'Transaction description', value: displayValue(receipt.transactionDescription) },
    { label: 'Transaction ID', value: displayValue(receipt.transactionId) },
    { label: 'Transaction remarks', value: displayValue(receipt.remarks) },
  ];
}

function safeReceiptFileName(receipt: ManualReceipt): string {
  const receiptName = receipt.receiptNumber.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '');
  return `ASR_Receipt_${receiptName || 'draft'}`;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function loadImageDataUrl(source: string): Promise<string> {
  return fetch(source)
    .then((response) => {
      if (!response.ok) throw new Error('Unable to load the ASR GROUP logo.');
      return response.blob();
    })
    .then((blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error('Unable to read the ASR GROUP logo.'));
      reader.readAsDataURL(blob);
    }));
}

function loadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load the ASR GROUP logo.'));
    image.src = source;
  });
}

export async function downloadManualReceiptPdf(receipt: ManualReceipt, orientation: ReceiptOrientation = 'portrait'): Promise<void> {
  const document = new jsPDF({ orientation, unit: 'pt', format: 'a5' });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = orientation === 'landscape' ? 24 : 28;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin + 9;

  document.setFillColor(...RECEIPT_COLORS.page.rgb);
  document.rect(0, 0, pageWidth, pageHeight, 'F');
  document.setFillColor(...RECEIPT_COLORS.paper.rgb);
  document.roundedRect(margin, margin, contentWidth, pageHeight - (margin * 2), 8, 8, 'F');
  document.setDrawColor(...RECEIPT_COLORS.maroon.rgb);
  document.setLineWidth(2.5);
  document.roundedRect(margin, margin, contentWidth, pageHeight - (margin * 2), 8, 8, 'S');
  document.setFillColor(...RECEIPT_COLORS.maroon.rgb);
  document.rect(margin, margin, contentWidth, 66, 'F');

  try {
    const logoDataUrl = await loadImageDataUrl(RECEIPT_LOGO);
    document.addImage(logoDataUrl, 'PNG', margin + 18, y, 48, 48, undefined, 'FAST');
  } catch {
    document.setFillColor(...RECEIPT_COLORS.maroon.rgb);
    document.roundedRect(margin + 18, y, 48, 48, 6, 6, 'F');
  }

  document.setTextColor(...RECEIPT_COLORS.paper.rgb);
  document.setFont('helvetica', 'bold');
  document.setFontSize(16);
  document.text('ASR GROUP', margin + 78, y + 21);
  document.setTextColor(...RECEIPT_COLORS.gold.rgb);
  document.setFontSize(7.5);
  document.text('TRANSACTION RECEIPT', margin + 78, y + 35);
  y = margin + 66;
  document.setDrawColor(...RECEIPT_COLORS.gold.rgb);
  document.setLineWidth(1.8);
  document.line(margin + 18, y, pageWidth - margin - 18, y);
  y += 28;

  document.setTextColor(...RECEIPT_COLORS.text.rgb);
  document.setFontSize(15);
  document.text('Transaction Details', pageWidth / 2, y, { align: 'center' });
  y += 22;

  const rows = getReceiptRows(receipt);
  const tableX = margin + 18;
  const tableWidth = contentWidth - 36;
  const labelWidth = tableWidth * (orientation === 'landscape' ? 0.28 : 0.36);
  const valueWidth = tableWidth - labelWidth - 26;
  const bodyFontSize = orientation === 'landscape' ? 7.5 : 8.5;
  const lineHeight = orientation === 'landscape' ? 9 : 11;
  const rowHeights = rows.map((row) => {
    document.setFontSize(row.emphasis === 'words' ? bodyFontSize : row.emphasis === 'amount' ? 11 : bodyFontSize);
    const valueLines = document.splitTextToSize(row.value, valueWidth);
    const labelLines = document.splitTextToSize(row.label, labelWidth - 18);
    return Math.max(valueLines.length, labelLines.length) * lineHeight + (orientation === 'landscape' ? 11 : 15);
  });
  const tableHeight = rowHeights.reduce((total, height) => total + height, 0);

  document.setDrawColor(...RECEIPT_COLORS.slate.rgb);
  document.setLineWidth(1.6);
  document.roundedRect(tableX, y, tableWidth, tableHeight, 5, 5, 'S');
  rows.forEach((row, index) => {
    const rowHeight = rowHeights[index];
    const rowY = y;
    if (index > 0) {
      document.setDrawColor(...RECEIPT_COLORS.divider.rgb);
      document.setLineWidth(0.9);
      document.line(tableX, rowY, tableX + tableWidth, rowY);
    }
    document.setTextColor(...RECEIPT_COLORS.slate.rgb);
    document.setFont('helvetica', 'bold');
    document.setFontSize(bodyFontSize);
    document.text(document.splitTextToSize(row.label, labelWidth - 18), tableX + 10, rowY + (orientation === 'landscape' ? 11 : 14));
    const valueColor = row.emphasis === 'amount' ? RECEIPT_COLORS.maroon.rgb : RECEIPT_COLORS.text.rgb;
    document.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    document.setFont('helvetica', 'bold');
    document.setFontSize(row.emphasis === 'amount' ? 10 : row.emphasis === 'words' ? bodyFontSize : bodyFontSize);
    document.text(document.splitTextToSize(row.value, valueWidth), tableX + labelWidth + 8, rowY + (orientation === 'landscape' ? 11 : 14));
    y += rowHeight;
  });

  document.save(`${safeReceiptFileName(receipt)}_${orientation}.pdf`);
}

function drawWrappedCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current || lines.length === 0) lines.push(current);
  lines.forEach((line, index) => context.fillText(line, x, startY + (index * lineHeight)));
  return lines.length;
}

export async function downloadManualReceiptImage(receipt: ManualReceipt, orientation: ReceiptOrientation = 'portrait'): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = orientation === 'landscape' ? 1754 : 1240;
  canvas.height = orientation === 'landscape' ? 1240 : 1754;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create the receipt image.');

  const maroon = RECEIPT_COLORS.maroon.hex;
  const text = RECEIPT_COLORS.text.hex;
  const slate = RECEIPT_COLORS.slate.hex;
  const border = RECEIPT_COLORS.slate.hex;
  context.fillStyle = RECEIPT_COLORS.page.hex;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = RECEIPT_COLORS.paper.hex;
  context.fillRect(32, 32, canvas.width - 64, canvas.height - 64);
  context.strokeStyle = maroon;
  context.lineWidth = 8;
  context.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);
  context.fillStyle = maroon;
  context.fillRect(32, 32, canvas.width - 64, 148);

  let y = 52;
  try {
    const logo = await loadImageElement(RECEIPT_LOGO);
    context.drawImage(logo, 78, y, 92, 92);
  } catch {
    context.fillStyle = maroon;
    context.fillRect(78, y, 92, 92);
  }
  context.fillStyle = RECEIPT_COLORS.paper.hex;
  context.font = '700 42px Arial, sans-serif';
  context.fillText('ASR GROUP', 198, y + 43);
  context.fillStyle = RECEIPT_COLORS.gold.hex;
  context.font = '700 18px Arial, sans-serif';
  context.fillText('TRANSACTION RECEIPT', 198, y + 73);
  y = 180;
  context.strokeStyle = RECEIPT_COLORS.gold.hex;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(78, y);
  context.lineTo(canvas.width - 78, y);
  context.stroke();
  y += 68;

  context.fillStyle = text;
  context.font = '700 36px Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText('Transaction Details', canvas.width / 2, y);
  context.textAlign = 'left';
  y += 48;

  const rows = getReceiptRows(receipt);
  const tableX = 78;
  const tableWidth = canvas.width - 156;
  const labelWidth = tableWidth * (orientation === 'landscape' ? 0.28 : 0.36);
  const valueX = tableX + labelWidth + 26;
  const valueWidth = tableWidth - labelWidth - 48;
  const rowHeights = rows.map((row) => {
    const bodyFontSize = orientation === 'landscape' ? 19 : 24;
    context.font = `${row.emphasis === 'amount' ? '700 27px' : `700 ${bodyFontSize}px`} Arial, sans-serif`;
    const words = row.value.split(/\s+/);
    let current = '';
    let lines = 1;
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (context.measureText(next).width > valueWidth && current) {
        lines += 1;
        current = word;
      } else current = next;
    }
    context.font = `700 ${orientation === 'landscape' ? 19 : 22}px Arial, sans-serif`;
    const labelLines = context.measureText(row.label).width > labelWidth - 30 ? 2 : 1;
    return Math.max(lines, labelLines) * (orientation === 'landscape' ? 25 : 32) + (orientation === 'landscape' ? 20 : 30);
  });
  const tableHeight = rowHeights.reduce((total, height) => total + height, 0);
  context.strokeStyle = border;
  context.lineWidth = 4;
  context.strokeRect(tableX, y, tableWidth, tableHeight);

  rows.forEach((row, index) => {
    const rowHeight = rowHeights[index];
    if (index > 0) {
      context.strokeStyle = RECEIPT_COLORS.divider.hex;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(tableX, y);
      context.lineTo(tableX + tableWidth, y);
      context.stroke();
    }
    context.fillStyle = slate;
    context.font = `700 ${orientation === 'landscape' ? 19 : 22}px Arial, sans-serif`;
    drawWrappedCanvasText(context, row.label, tableX + 18, y + (orientation === 'landscape' ? 25 : 32), labelWidth - 30, orientation === 'landscape' ? 23 : 28);
    context.fillStyle = row.emphasis === 'amount' ? maroon : text;
    context.font = `${row.emphasis === 'amount' ? '700 27px' : `700 ${orientation === 'landscape' ? 19 : 24}px`} Arial, sans-serif`;
    drawWrappedCanvasText(context, row.value, valueX, y + (orientation === 'landscape' ? 25 : 32), valueWidth, orientation === 'landscape' ? 23 : 32);
    y += rowHeight;
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Unable to export the receipt image.')), 'image/png');
  });
  downloadBlob(blob, `${safeReceiptFileName(receipt)}_${orientation}.png`);
}

export const CreateReceiptModal: React.FC<CreateReceiptModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { showToast } = useApp();
  const [form, setForm] = useState<ReceiptFormState>(EMPTY_FORM);
  const [savedReceipt, setSavedReceipt] = useState<ManualReceipt | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [orientation, setOrientation] = useState<ReceiptOrientation>('portrait');

  const previewReceipt = useMemo<ManualReceipt>(() => ({
    id: savedReceipt?.id || 'preview',
    receiptNumber: savedReceipt?.receiptNumber || form.receiptNumber,
    accountNumber: form.accountNumber,
    transactionDate: form.transactionDate,
    transactionAmount: Number(form.transactionAmount) || 0,
    debitCredit: form.debitCredit,
    paymentMode: form.paymentMode,
    chequeNumber: form.chequeNumber,
    transactionDescription: form.transactionDescription,
    transactionId: form.transactionId,
    remarks: form.remarks,
    createdAt: savedReceipt?.createdAt || '',
    createdBy: savedReceipt?.createdBy || null,
  }), [form, savedReceipt]);

  if (!isOpen) return null;

  const updateField = <K extends keyof ReceiptFormState>(field: K, value: ReceiptFormState[K]) => {
    setSavedReceipt(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const close = () => {
    setForm({ ...EMPTY_FORM, transactionDate: getTodayIsoDate() });
    setSavedReceipt(null);
    setOrientation('portrait');
    onClose();
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.transactionDate) {
      showToast('Validation Error', 'Transaction date is required.', 'warning');
      return;
    }
    if (Number(form.transactionAmount) <= 0) {
      showToast('Validation Error', 'Transaction amount must be greater than ₹0.', 'warning');
      return;
    }
    if (form.paymentMode === 'CHEQUE' && !form.chequeNumber.trim()) {
      showToast('Validation Error', 'Cheque number is required for cheque payments.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const isEditing = Boolean(savedReceipt?.id);
      const response = await fetch('/api/manual-receipts', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: savedReceipt?.id, transactionAmount: Number(form.transactionAmount) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || (isEditing ? 'Unable to update receipt.' : 'Unable to save receipt.'));
      setSavedReceipt(result.data);
      setForm((current) => ({ ...current, receiptNumber: result.data.receiptNumber }));
      onSaved(result.data);
      showToast(isEditing ? 'Receipt Updated' : 'Receipt Saved', `${result.data.receiptNumber} was saved separately.`, 'success');
      close();
    } catch (error) {
      showToast('Save Error', error instanceof Error ? error.message : 'Unable to save receipt.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalFrame onClose={close} dismissible={!isSaving} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-[#FCFBF9] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#701A35] text-[#EED8A1]">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950">Create New Receipt</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">Saved separately from the historical collection register</p>
            </div>
          </div>
          <button type="button" onClick={close} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close create receipt">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_460px]">
          <form onSubmit={handleSave} className="min-w-0 space-y-5 p-5 sm:p-7">
            <div className="rounded-2xl border border-[#E7DFD2] bg-[#FCFBF9] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-[#EEE8DE] pb-3">
                <FileText className="h-4 w-4 text-[#701A35]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Transaction details</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">Enter the information shown on the receipt.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReceiptField label="Account number">
                  <input value={form.accountNumber} onChange={(event) => updateField('accountNumber', event.target.value)} placeholder="Enter account number" className={INPUT_CLASS} />
                </ReceiptField>
                <ReceiptField label="Transaction date" required>
                  <input type="date" value={form.transactionDate} onChange={(event) => updateField('transactionDate', event.target.value)} className={INPUT_CLASS} required />
                </ReceiptField>
                <ReceiptField label="Transaction amount" required>
                  <div className="relative">
                    <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type="number" min="0" step="0.01" value={form.transactionAmount || ''} onChange={(event) => updateField('transactionAmount', Number(event.target.value) || 0)} placeholder="0.00" className={`${INPUT_CLASS} pl-9 font-mono font-bold`} required />
                  </div>
                </ReceiptField>
                <ReceiptField label="Debit / Credit" required>
                  <select value={form.debitCredit} onChange={(event) => updateField('debitCredit', event.target.value as ManualReceiptDebitCredit)} className={SELECT_CLASS}>
                    <option value="CREDIT">Credit</option>
                    <option value="DEBIT">Debit</option>
                  </select>
                </ReceiptField>
                <ReceiptField label="Payment mode" required>
                  <select value={form.paymentMode} onChange={(event) => {
                    const mode = event.target.value as ManualReceiptPaymentMode;
                    updateField('paymentMode', mode);
                    if (mode !== 'CHEQUE') updateField('chequeNumber', '');
                  }} className={SELECT_CLASS}>
                    {PAYMENT_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </ReceiptField>
                {form.paymentMode === 'CHEQUE' && (
                  <ReceiptField label="Cheque number" required>
                    <input value={form.chequeNumber} onChange={(event) => updateField('chequeNumber', event.target.value)} placeholder="Enter cheque number" className={`${INPUT_CLASS} font-mono`} required />
                  </ReceiptField>
                )}
                <ReceiptField label="Transaction ID">
                  <input value={form.transactionId} onChange={(event) => updateField('transactionId', event.target.value)} placeholder="Enter transaction reference" className={`${INPUT_CLASS} font-mono`} />
                </ReceiptField>
              </div>

              <div className="mt-4 space-y-4">
                <ReceiptField label="Transaction description">
                  <textarea value={form.transactionDescription} onChange={(event) => updateField('transactionDescription', event.target.value)} placeholder="e.g. MMT/IMPS/628019800334/ FOR SOFTWARE / JOB PAYMENT" rows={3} className={`${TEXTAREA_CLASS} min-h-20`} />
                </ReceiptField>
                <ReceiptField label="Transaction remarks">
                  <textarea value={form.remarks} onChange={(event) => updateField('remarks', event.target.value)} placeholder="Add any additional remarks" rows={2} className={`${TEXTAREA_CLASS} min-h-16`} />
                </ReceiptField>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-[11px] text-slate-500">The receipt record is saved separately. Download it as a PDF or image.</p>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => void downloadManualReceiptPdf(previewReceipt, orientation)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                  <Download className="h-4 w-4" /> PDF
                </button>
                <button type="button" onClick={() => void downloadManualReceiptImage(previewReceipt, orientation)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                  <Download className="h-4 w-4" /> Image
                </button>
                <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-[#701A35] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#5C142B] disabled:cursor-not-allowed disabled:opacity-50">
                  <Save className="h-4 w-4" /> {isSaving ? 'Saving…' : savedReceipt ? 'Save Changes' : 'Save Receipt'}
                </button>
              </div>
            </div>
          </form>

          <aside className="flex min-w-0 flex-col items-center gap-4 border-t border-slate-200 bg-[#F5F2EE] p-5 sm:p-7 lg:border-l lg:border-t-0">
            <div className="w-full max-w-[420px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">Live preview</p>
                  <h3 className="mt-1 text-sm font-bold text-slate-900">Receipt preview</h3>
                </div>
                <div className="flex rounded-lg border border-[#D8C7A6] bg-white p-0.5" role="group" aria-label="Receipt orientation">
                  {(['portrait', 'landscape'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setOrientation(option)}
                      aria-pressed={orientation === option}
                      className={`rounded-md px-2 py-1 text-[10px] font-bold capitalize transition ${orientation === option ? 'bg-[#701A35] text-white' : 'text-[#701A35] hover:bg-[#F5EEE3]'}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <ReceiptPreview receipt={previewReceipt} orientation={orientation} />
          </aside>
        </div>
      </div>
    </ModalFrame>
  );
};

function ReceiptField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">{label}{required && <span className="ml-1 text-rose-500">*</span>}</span>
      {children}
    </label>
  );
}

function ReceiptPreview({ receipt, orientation }: { receipt: ManualReceipt; orientation: ReceiptOrientation }) {
  const rows = getReceiptRows(receipt);
  const isLandscape = orientation === 'landscape';
  const paperSizeClass = orientation === 'portrait'
    ? 'h-[min(62vh,500px)] aspect-[148/210] w-auto'
    : 'aspect-[210/148] w-full';

  return (
    <div className="flex w-full max-w-[420px] justify-center rounded-2xl border-2 p-2 shadow-inner" style={{ borderColor: '#701A35', backgroundColor: '#F1F5F9' }}>
      <div className={`flex max-w-full flex-col overflow-hidden rounded-lg border-2 shadow-xl ${paperSizeClass}`} style={{ borderColor: '#701A35', backgroundColor: '#FFFFFF' }}>
        <div className={`flex shrink-0 items-center gap-2 border-b-2 text-white ${isLandscape ? 'px-3 py-2' : 'px-4 py-3'}`} style={{ borderBottomColor: '#EED8A1', backgroundColor: '#701A35' }}>
          <Image src={RECEIPT_LOGO} alt="ASR GROUP" width={isLandscape ? 32 : 38} height={isLandscape ? 32 : 38} className={`${isLandscape ? 'h-8 w-8' : 'h-9 w-9'} rounded-lg object-contain p-1.5`} style={{ backgroundColor: '#561329' }} />
          <div>
            <p className={`${isLandscape ? 'text-[10px]' : 'text-xs'} font-black tracking-[0.12em]`}>ASR GROUP</p>
            <p className="mt-0.5 text-[6px] font-bold uppercase tracking-[0.16em]" style={{ color: '#EED8A1' }}>Transaction Receipt</p>
          </div>
        </div>
        <div className={`min-h-0 flex-1 overflow-hidden ${isLandscape ? 'px-3 py-2' : 'px-4 py-3'}`}>
          <div className="text-center">
            <h4 className={`${isLandscape ? 'text-[10px]' : 'text-xs'} font-bold`} style={{ color: '#172033' }}>Transaction Details</h4>
          </div>
          <div className="mt-1 overflow-hidden rounded-lg border-2" style={{ borderColor: '#475569' }}>
            {rows.map((row, index) => (
              <div key={row.label} className={`grid ${isLandscape ? 'grid-cols-[28%_72%] px-2 py-0.5 text-[6px] leading-2.5' : 'grid-cols-[36%_64%] px-2 py-1 text-[7px] leading-3'} gap-1 ${index < rows.length - 1 ? 'border-b' : ''}`} style={index < rows.length - 1 ? { borderBottomColor: '#94A3B8' } : undefined}>
                <span className="font-bold" style={{ color: '#475569' }}>{row.label}</span>
                <span className={`min-w-0 break-words font-bold ${row.emphasis === 'amount' ? (isLandscape ? 'text-[8px]' : 'text-[9px]') : ''}`} style={{ color: row.emphasis === 'amount' ? '#701A35' : '#172033' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const INPUT_CLASS = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-[#701A35] focus:ring-2 focus:ring-[#701A35]/10 placeholder:text-slate-400';
const SELECT_CLASS = `${INPUT_CLASS} cursor-pointer appearance-none`;
const TEXTAREA_CLASS = 'w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-[#701A35] focus:ring-2 focus:ring-[#701A35]/10 placeholder:text-slate-400';
