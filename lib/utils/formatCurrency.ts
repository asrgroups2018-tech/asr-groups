/**
 * Indian Rupee (INR) currency formatting and parsing utilities.
 * Conforms to standard Indian numbering system formatting (e.g. ₹1,46,51,195)
 * and Indian currency words (e.g. 100000 = One Lakh Rupees).
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function twoDigitsToWords(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const rest = n % 10;
  return rest > 0 ? `${TENS[ten]} ${ONES[rest]}` : TENS[ten];
}

function threeDigitsToWords(n: number): string {
  if (n === 0) return '';
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds > 0) {
    parts.push(`${ONES[hundreds]} Hundred`);
  }
  if (rest > 0) {
    parts.push(twoDigitsToWords(rest));
  }
  return parts.join(' ');
}

function convertBelowOneCrore(n: number): string {
  if (n === 0) return '';
  const lakhs = Math.floor(n / 100000);
  n %= 100000;
  const thousands = Math.floor(n / 1000);
  n %= 1000;
  const hundredsAndUnits = n;

  const parts: string[] = [];
  if (lakhs > 0) {
    parts.push(`${twoDigitsToWords(lakhs)} Lakh`);
  }
  if (thousands > 0) {
    parts.push(`${twoDigitsToWords(thousands)} Thousand`);
  }
  if (hundredsAndUnits > 0) {
    parts.push(threeDigitsToWords(hundredsAndUnits));
  }
  return parts.join(' ');
}

/**
 * Converts a numeric amount to Indian Rupee Words (e.g. 100000 -> "One Lakh Rupees")
 */
export function numberToWordsINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Zero Rupees';
  }

  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const wholePart = Math.floor(absVal);
  const fractionPart = Math.round((absVal - wholePart) * 100);

  if (wholePart === 0 && fractionPart === 0) {
    return 'Zero Rupees';
  }

  const parts: string[] = [];

  if (wholePart > 0) {
    const crores = Math.floor(wholePart / 10000000);
    const remainder = wholePart % 10000000;

    if (crores > 0) {
      if (crores >= 100) {
        parts.push(`${convertBelowOneCrore(crores)} Crore`);
      } else {
        parts.push(`${twoDigitsToWords(crores)} Crore`);
      }
    }

    if (remainder > 0) {
      parts.push(convertBelowOneCrore(remainder));
    }
    parts.push('Rupees');
  }

  if (fractionPart > 0) {
    if (parts.length > 0) {
      parts.push(`and ${twoDigitsToWords(fractionPart)} Paise`);
    } else {
      parts.push(`${twoDigitsToWords(fractionPart)} Paise`);
    }
  }

  const result = parts.join(' ').trim();
  return isNegative ? `Minus ${result}` : result;
}

export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export function formatINRWithoutSymbol(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }
  return Number(amount).toLocaleString('en-IN');
}

export function parseINR(str: string | null | undefined): number {
  if (!str) return 0;
  const cleaned = str.replace(/[₹,\s]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}
