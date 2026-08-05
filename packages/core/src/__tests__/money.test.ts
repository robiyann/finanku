import { describe, expect, it } from 'vitest';
import { formatMoney, parseAmount, getCurrencyDecimals } from '../money';

describe('getCurrencyDecimals', () => {
  it('should return 0 decimals for IDR, JPY, KRW', () => {
    expect(getCurrencyDecimals('IDR')).toBe(0);
    expect(getCurrencyDecimals('jpy')).toBe(0);
    expect(getCurrencyDecimals('Krw')).toBe(0);
  });

  it('should return 2 decimals for USD, MYR, SGD, EUR', () => {
    expect(getCurrencyDecimals('USD')).toBe(2);
    expect(getCurrencyDecimals('myr')).toBe(2);
    expect(getCurrencyDecimals('SGD')).toBe(2);
    expect(getCurrencyDecimals('EUR')).toBe(2);
  });
});

describe('formatMoney', () => {
  it('should format IDR correctly', () => {
    expect(formatMoney(50000, 'IDR')).toBe('Rp 50.000');
    expect(formatMoney(1500000, 'idr')).toBe('Rp 1.500.000');
    expect(formatMoney(0, 'IDR')).toBe('Rp 0');
  });

  it('should format MYR correctly', () => {
    expect(formatMoney(5050, 'MYR')).toBe('RM 50.50');
    expect(formatMoney(120000, 'myr')).toBe('RM 1,200.00');
    expect(formatMoney(0, 'MYR')).toBe('RM 0.00');
  });

  it('should format USD correctly', () => {
    expect(formatMoney(1000, 'USD')).toBe('$10.00');
  });
});

describe('parseAmount', () => {
  describe('IDR Currency parsing', () => {
    it('should parse simple integers', () => {
      expect(parseAmount('50000', 'IDR')).toBe(50000);
      expect(parseAmount('Rp 100.000', 'IDR')).toBe(100000);
    });

    it('should parse suffix multipliers', () => {
      expect(parseAmount('50k', 'IDR')).toBe(50000);
      expect(parseAmount('50rb', 'IDR')).toBe(50000);
      expect(parseAmount('25ribu', 'IDR')).toBe(25000);
      expect(parseAmount('1.5jt', 'IDR')).toBe(1500000);
      expect(parseAmount('1,5 juta', 'IDR')).toBe(1500000);
    });

    it('should parse invalid input to null', () => {
      expect(parseAmount('', 'IDR')).toBeNull();
      expect(parseAmount('abc', 'IDR')).toBeNull();
    });
  });

  describe('MYR Currency parsing', () => {
    it('should parse simple decimal amounts to cents', () => {
      expect(parseAmount('50.50', 'MYR')).toBe(5500 !== 5050 ? 5050 : 5500); // 50.50 RM = 5050 sen
      expect(parseAmount('50', 'MYR')).toBe(5000); // 50 RM = 5000 sen
      expect(parseAmount('RM 10.25', 'MYR')).toBe(1025);
    });

    it('should parse multipliers to cents', () => {
      expect(parseAmount('5k', 'MYR')).toBe(500000); // 5000 RM = 500000 sen
    });
  });
});
