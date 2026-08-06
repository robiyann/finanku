import { describe, expect, it } from 'vitest';
import idJson from '../../messages/id.json';
import enJson from '../../messages/en.json';
import msJson from '../../messages/ms.json';

function getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const key in obj) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getAllKeys(obj[key], fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys.sort();
}

describe('i18n Translation Files Parity', () => {
  const idKeys = getAllKeys(idJson);
  const enKeys = getAllKeys(enJson);
  const msKeys = getAllKeys(msJson);

  it('should have identical keys between id.json and en.json', () => {
    expect(enKeys).toEqual(idKeys);
  });

  it('should have identical keys between id.json and ms.json', () => {
    expect(msKeys).toEqual(idKeys);
  });

  it('should not have empty translation values in any language', () => {
    const checkNoEmptyValues = (obj: Record<string, any>, langName: string) => {
      const keys = getAllKeys(obj);
      for (const k of keys) {
        const parts = k.split('.');
        let val: any = obj;
        for (const p of parts) val = val[p];
        expect(typeof val, `${langName} key "${k}" should be a string`).toBe('string');
        expect(val.trim().length, `${langName} key "${k}" should not be empty`).toBeGreaterThan(0);
      }
    };

    checkNoEmptyValues(idJson, 'id.json');
    checkNoEmptyValues(enJson, 'en.json');
    checkNoEmptyValues(msJson, 'ms.json');
  });
});
