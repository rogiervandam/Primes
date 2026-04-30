import { describe, it, expect } from 'vitest';
import { bitToNumber, numberToBit } from '../bitMath';

// WHEEL30_RESIDUES = [1, 7, 11, 13, 17, 19, 23, 29]
// Each wheel group covers 30 consecutive numbers; 8 residues per group.

describe('bitToNumber', () => {
  describe("model 'half' (default)", () => {
    it('maps bit 0 → 1', () => expect(bitToNumber(0, 'half')).toBe(1));
    it('maps bit 1 → 3', () => expect(bitToNumber(1, 'half')).toBe(3));
    it('maps bit 2 → 5', () => expect(bitToNumber(2, 'half')).toBe(5));
    it('maps bit 49 → 99', () => expect(bitToNumber(49, 'half')).toBe(99));
    it('uses half as the default when model is undefined', () =>
      expect(bitToNumber(3, undefined)).toBe(7));
    it('uses half as the default when model is an unknown string', () =>
      expect(bitToNumber(3, 'bogus')).toBe(7));
  });

  describe("model 'full'", () => {
    it('maps bit 0 → 0', () => expect(bitToNumber(0, 'full')).toBe(0));
    it('maps bit 7 → 7', () => expect(bitToNumber(7, 'full')).toBe(7));
    it('is identity', () => expect(bitToNumber(1000, 'full')).toBe(1000));
  });

  describe("model 'wheel'", () => {
    // group 0: residues at positions 0-7
    it('bit 0 → 1  (group 0, residue index 0)', () => expect(bitToNumber(0, 'wheel')).toBe(1));
    it('bit 1 → 7  (group 0, residue index 1)', () => expect(bitToNumber(1, 'wheel')).toBe(7));
    it('bit 2 → 11 (group 0, residue index 2)', () => expect(bitToNumber(2, 'wheel')).toBe(11));
    it('bit 7 → 29 (group 0, residue index 7)', () => expect(bitToNumber(7, 'wheel')).toBe(29));
    // group 1: 30 + residues
    it('bit 8 → 31 (group 1, residue index 0)', () => expect(bitToNumber(8, 'wheel')).toBe(31));
    it('bit 9 → 37 (group 1, residue index 1)', () => expect(bitToNumber(9, 'wheel')).toBe(37));
    it('bit 15 → 59 (group 1, residue index 7)', () => expect(bitToNumber(15, 'wheel')).toBe(59));
  });
});

describe('numberToBit', () => {
  describe("model 'half'", () => {
    it('maps 1 → 0', () => expect(numberToBit(1, 'half')).toBe(0));
    it('maps 3 → 1', () => expect(numberToBit(3, 'half')).toBe(1));
    it('maps 99 → 49', () => expect(numberToBit(99, 'half')).toBe(49));
    it('even numbers return -1', () => expect(numberToBit(4, 'half')).toBe(-1));
    it('zero returns -1', () => expect(numberToBit(0, 'half')).toBe(-1));
    it('negative numbers return -1', () => expect(numberToBit(-1, 'half')).toBe(-1));
    it('is the inverse of bitToNumber for odd numbers', () => {
      for (let i = 0; i < 50; i++) {
        expect(numberToBit(bitToNumber(i, 'half'), 'half')).toBe(i);
      }
    });
  });

  describe("model 'full'", () => {
    it('maps 0 → 0', () => expect(numberToBit(0, 'full')).toBe(0));
    it('maps 1000 → 1000', () => expect(numberToBit(1000, 'full')).toBe(1000));
    it('is identity', () => {
      for (let i = 0; i < 100; i++) {
        expect(numberToBit(i, 'full')).toBe(i);
      }
    });
  });

  describe("model 'wheel'", () => {
    it('maps 1 → 0', () => expect(numberToBit(1, 'wheel')).toBe(0));
    it('maps 7 → 1', () => expect(numberToBit(7, 'wheel')).toBe(1));
    it('maps 29 → 7', () => expect(numberToBit(29, 'wheel')).toBe(7));
    it('maps 31 → 8', () => expect(numberToBit(31, 'wheel')).toBe(8));
    it('maps 37 → 9', () => expect(numberToBit(37, 'wheel')).toBe(9));
    it('non-residue numbers return -1 (e.g. 2)', () =>
      expect(numberToBit(2, 'wheel')).toBe(-1));
    it('non-residue numbers return -1 (e.g. 5)', () =>
      expect(numberToBit(5, 'wheel')).toBe(-1));
    it('is the inverse of bitToNumber for wheel bits', () => {
      for (let i = 0; i < 80; i++) {
        expect(numberToBit(bitToNumber(i, 'wheel'), 'wheel')).toBe(i);
      }
    });
  });

  describe('round-trip (bitToNumber → numberToBit)', () => {
    const models = ['half', 'full', 'wheel'];
    for (const model of models) {
      it(`${model}: numberToBit(bitToNumber(i)) === i for i in 0..99`, () => {
        for (let i = 0; i < 100; i++) {
          expect(numberToBit(bitToNumber(i, model), model)).toBe(i);
        }
      });
    }
  });
});
