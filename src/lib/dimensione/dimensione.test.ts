import { describe, expect, it } from 'vitest';
import { classifica, formula, relazione, totaliConLegate } from './dimensione';
import type { ImpresaLegata } from '../../types/domain';

// Dati dell'esercitazione della lezione 2 (Laboratorio di finanza agevolata).
const A = { ula: 14, fatturato: 1_232_712, totaleBilancio: 1_915_055 };
function impresa(nome: string, quota: number, ula: number, fatturato: number, totaleBilancio: number): ImpresaLegata {
  return { id: nome, nome, quota, controlloCda: false, investitoreEsente: false, ula, fatturato, totaleBilancio };
}
const B = (q: number) => impresa('B', q, 12, 220_683, 2_380_918);
const C = (q: number) => impresa('C', q, 33, 2_132_892, 3_386_860);
const D = (q: number) => impresa('D', q, 88, 14_480_921, 13_182_854);

describe('relazione', () => {
  it('follows the 25% / 50% thresholds', () => {
    const base = { controlloCda: false, investitoreEsente: false };
    expect(relazione({ ...base, quota: 24.9 }).tipo).toBe('autonoma');
    expect(relazione({ ...base, quota: 25 })).toEqual({ tipo: 'associata', peso: 0.25 });
    expect(relazione({ ...base, quota: 50 })).toEqual({ tipo: 'associata', peso: 0.5 });
    expect(relazione({ ...base, quota: 51 })).toEqual({ tipo: 'collegata', peso: 1 });
  });

  it('control of the board makes it collegata, an exempt investor keeps it autonoma', () => {
    expect(relazione({ quota: 10, controlloCda: true, investitoreEsente: false }).tipo).toBe('collegata');
    expect(relazione({ quota: 40, controlloCda: false, investitoreEsente: true }).tipo).toBe('autonoma');
  });
});

describe('esercitazione dimensione d’impresa', () => {
  it('A on its own is PICCOLA', () => {
    expect(classifica(A).classe).toBe('piccola');
  });

  it('caso 1: 100%A + 25%B + 41%C + 37%D → MEDIA', () => {
    const imprese = [B(25), C(41), D(37)];
    const t = totaliConLegate(A, imprese);
    expect(t.ula).toBeCloseTo(63.09, 2);
    expect(t.fatturato).toBeCloseTo(7_520_309.24, 2);
    // La slide 15 riporta 8.776.565,38 €: ha 41% × 3.386.860 = 1.388.624,90 invece di
    // 1.388.612,60 (refuso di 12,30 €). Il totale corretto è questo.
    expect(t.totaleBilancio).toBeCloseTo(8_776_553.08, 2);
    expect(classifica(t).classe).toBe('media');
    expect(formula('A', imprese)).toBe('100% A + 25% B + 41% C + 37% D');
  });

  it('caso 2: all collegate at 100% → MEDIA', () => {
    const t = totaliConLegate(A, [B(60), C(51), D(100)]);
    expect(t.ula).toBe(147);
    expect(t.fatturato).toBe(18_067_208);
    expect(t.totaleBilancio).toBe(20_865_687);
    expect(classifica(t).classe).toBe('media');
  });

  it('caso 3: 100%A + 100%B + 32%C + 25%D → MEDIA', () => {
    const t = totaliConLegate(A, [B(60), C(32), D(25)]);
    expect(t.ula).toBeCloseTo(58.56, 2);
    expect(t.fatturato).toBeCloseTo(5_756_150.69, 2);
    expect(t.totaleBilancio).toBeCloseTo(8_675_481.7, 2);
    expect(classifica(t).classe).toBe('media');
  });
});

describe('classifica', () => {
  it('stays in a class when only one of the two financial limits is exceeded', () => {
    expect(classifica({ ula: 5, fatturato: 3_000_000, totaleBilancio: 1_500_000 }).classe).toBe('micro');
  });

  it('ULA are mandatory: 10 ULA is no longer micro', () => {
    expect(classifica({ ula: 10, fatturato: 100, totaleBilancio: 100 }).classe).toBe('piccola');
  });

  it('above every threshold is grande; media uses 50M fatturato / 43M bilancio', () => {
    expect(classifica({ ula: 100, fatturato: 60_000_000, totaleBilancio: 43_000_000 }).classe).toBe('media');
    expect(classifica({ ula: 100, fatturato: 60_000_000, totaleBilancio: 44_000_000 }).classe).toBe('grande');
    expect(classifica({ ula: 250, fatturato: 1, totaleBilancio: 1 }).classe).toBe('grande');
  });

  it('is provisional (ULA only) without financial figures', () => {
    const c = classifica({ ula: 3, fatturato: null, totaleBilancio: null });
    expect(c).toMatchObject({ classe: 'micro', provvisoria: true });
  });

  it('flags linked companies with missing figures', () => {
    const legata: ImpresaLegata = { ...C(41), fatturato: null };
    expect(totaliConLegate(A, [legata]).incomplete).toEqual(['C']);
  });
});
