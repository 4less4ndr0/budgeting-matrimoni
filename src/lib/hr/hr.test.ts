import { describe, expect, it } from 'vitest';
import { anzianita, buildOrgTree, nextBirthday, prossimiCompleanni, wouldCreateCycle } from './hr';
import type { Dipendente, Ruolo } from '../../types/domain';

function dip(id: string, patch: Partial<Dipendente> = {}): Dipendente {
  return {
    id,
    nome: id,
    cognome: '',
    dataNascita: '',
    ruoloId: null,
    email: '',
    telefono: '',
    dataAssunzione: '',
    note: '',
    ...patch,
  };
}

const ruoli: Ruolo[] = [
  { id: 'ceo', nome: 'CEO', superioreId: null },
  { id: 'cto', nome: 'CTO', superioreId: 'ceo' },
  { id: 'dev', nome: 'Sviluppatore', superioreId: 'cto' },
  { id: 'mkt', nome: 'Marketing', superioreId: 'ceo' },
];

describe('buildOrgTree', () => {
  it('nests ruoli under their superiore and attaches dipendenti to their ruolo', () => {
    const tree = buildOrgTree(ruoli, [
      dip('Anna', { ruoloId: 'dev' }),
      dip('Bruno', { ruoloId: 'dev' }),
      dip('Carla', { ruoloId: 'ceo' }),
      dip('Senza ruolo'),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].ruolo.id).toBe('ceo');
    expect(tree[0].dipendenti.map((d) => d.id)).toEqual(['Carla']);
    expect(tree[0].figli.map((n) => n.ruolo.id)).toEqual(['cto', 'mkt']);
    expect(tree[0].figli[0].figli[0].dipendenti.map((d) => d.id)).toEqual(['Anna', 'Bruno']);
  });

  it('promotes ruoli with a missing superiore to roots instead of dropping them', () => {
    const tree = buildOrgTree([{ id: 'orfano', nome: 'Orfano', superioreId: 'cancellato' }], []);
    expect(tree.map((n) => n.ruolo.id)).toEqual(['orfano']);
  });

  it('never drops ruoli caught in a cycle (e.g. a hand-edited snapshot)', () => {
    const tree = buildOrgTree(
      [
        { id: 'a', nome: 'A', superioreId: 'b' },
        { id: 'b', nome: 'B', superioreId: 'a' },
      ],
      [],
    );
    const ids = tree.flatMap(function collect(n): string[] {
      return [n.ruolo.id, ...n.figli.flatMap(collect)];
    });
    expect(ids.sort()).toEqual(['a', 'b']);
  });
});

describe('wouldCreateCycle', () => {
  it('rejects making a ruolo its own superiore or a descendant its superiore', () => {
    expect(wouldCreateCycle(ruoli, 'ceo', 'ceo')).toBe(true);
    expect(wouldCreateCycle(ruoli, 'ceo', 'dev')).toBe(true);
  });

  it('allows any non-descendant (or no superiore at all)', () => {
    expect(wouldCreateCycle(ruoli, 'dev', 'mkt')).toBe(false);
    expect(wouldCreateCycle(ruoli, 'dev', null)).toBe(false);
  });
});

describe('nextBirthday', () => {
  const today = new Date(2026, 9, 13); // 13 ottobre 2026

  it('counts today as 0 days away', () => {
    expect(nextBirthday('1990-10-13', today)).toMatchObject({ giorniMancanti: 0, eta: 36 });
  });

  it('rolls over to next year once this year’s birthday has passed', () => {
    const info = nextBirthday('1990-10-12', today);
    expect(info?.prossimo.getFullYear()).toBe(2027);
    expect(info?.eta).toBe(37);
  });

  it('puts Feb 29 birthdays on Feb 28 in non-leap years', () => {
    const info = nextBirthday('2000-02-29', today);
    expect(info?.prossimo.getMonth()).toBe(1);
    expect(info?.prossimo.getDate()).toBe(28);
  });

  it('returns null for a missing date', () => {
    expect(nextBirthday('', today)).toBeNull();
  });
});

describe('prossimiCompleanni', () => {
  it('keeps only birthdays within the window, soonest first', () => {
    const today = new Date(2026, 9, 13);
    const result = prossimiCompleanni(
      [dip('tra20', { dataNascita: '1990-11-02' }), dip('oggi', { dataNascita: '1985-10-13' }), dip('lontano', { dataNascita: '1990-03-01' }), dip('senza')],
      30,
      today,
    );
    expect(result.map((r) => r.dipendente.id)).toEqual(['oggi', 'tra20']);
  });
});

describe('anzianita', () => {
  it('is null for future or missing hire dates', () => {
    const today = new Date(2026, 9, 13);
    expect(anzianita('2030-01-01', today)).toBeNull();
    expect(anzianita('', today)).toBeNull();
    expect(anzianita('2020-10-13', today)).toBe(6);
  });
});
