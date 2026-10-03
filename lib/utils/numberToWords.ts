/**
 * Indian Rupee (INR) Number-to-Words and Currency Formatting Utilities.
 * Converts numbers to Indian English Words (Crore, Lakh, Thousand, Hundred, Rupees).
 * E.g.:
 *  - 1000 => "One Thousand Rupees"
 *  - 100000 => "One Lakh Rupees"
 *  - 150000 => "One Lakh Fifty Thousand Rupees"
 *  - 5000000 => "Fifty Lakh Rupees"
 *  - 10000000 => "One Crore Rupees"
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
 * Converts any numeric amount into Indian Rupees in words.
 * E.g., 1000 -> "One Thousand Rupees"
 * E.g., 100000 -> "One Lakh Rupees"
 * E.g., 2500000 -> "Twenty Five Lakh Rupees"
 */
export function numberToIndianWords(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '';
  }

  const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
  if (isNaN(num)) return '';
  if (num === 0) return 'Zero Rupees';

  const isNegative = num < 0;
  const absVal = Math.abs(num);
  const wholePart = Math.floor(absVal);
  const fractionPart = Math.round((absVal - wholePart) * 100);

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

/**
 * Formats a raw number to Indian currency string with commas (e.g. 100000 -> "1,00,000")
 */
export function formatIndianCommas(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const numStr = String(val).replace(/,/g, '').trim();
  if (!numStr) return '';
  const num = Number(numStr);
  if (isNaN(num)) return numStr;

  // Split integer and decimal parts
  const parts = numStr.split('.');
  let integerPart = parts[0];
  const decimalPart = parts.length > 1 ? `.${parts[1]}` : '';

  // Handle negative
  const isNeg = integerPart.startsWith('-');
  if (isNeg) integerPart = integerPart.slice(1);

  // Indian formatting regex on integer part
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  return (isNeg ? '-' : '') + integerPart + decimalPart;
}

/**
 * Parses a comma-formatted string to raw number
 */
export function parseFormattedNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const clean = val.replace(/[^0-9.-]/g, '');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}
