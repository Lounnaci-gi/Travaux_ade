import { formatNumberWithThousands } from './numberFormat';

describe('formatNumberWithThousands', () => {
  test('formats numbers with thousand separators', () => {
    expect(formatNumberWithThousands(1500.63)).toBe('1\u202F500,63');
    expect(formatNumberWithThousands(1015106.33)).toBe('1\u202F015\u202F106,33');
    expect(formatNumberWithThousands(1000)).toBe('1\u202F000,00');
    expect(formatNumberWithThousands(0)).toBe('0,00');
    expect(formatNumberWithThousands(50.5)).toBe('50,50');
  });

  test('handles string inputs', () => {
    expect(formatNumberWithThousands('1500.63')).toBe('1\u202F500,63');
    expect(formatNumberWithThousands('1015106.33')).toBe('1\u202F015\u202F106,33');
  });

  test('handles edge cases', () => {
    expect(formatNumberWithThousands('')).toBe('');
    expect(formatNumberWithThousands(null)).toBe('');
    expect(formatNumberWithThousands(undefined)).toBe('');
    expect(formatNumberWithThousands('invalid')).toBe('invalid');
  });
});