import { describe, expect, it, beforeEach } from 'vitest';
import { useAppStore } from './store';
import { defaultRevenueAssumptions } from '../defaults';
import type { StateSnapshot } from '../export/exportSnapshot';
import type { AppState } from '../../types/domain';

describe('loadSnapshot', () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
  });

  it('replaces lineItems, fundEntries and revenueAssumptions with the snapshot, override included', () => {
    const snapshot: StateSnapshot = {
      lineItems: [
        { id: 'x', date: '2026-02-20', category: 'Dominio', description: 'Rinnovo', amount: 3, type: 'cost', source: 'imported' },
      ],
      fundEntries: [{ id: 'f1', date: '2026-01-01', amount: 500, description: 'Fondo iniziale' }],
      budgetItems: [{ id: 'b1', nome: 'Location', importo: 5000, bloccato: true }],
      budgetTotale: 8000,
      revenueAssumptions: { ...defaultRevenueAssumptions(), costRunRateOverride: 0 },
      schemaVersion: 1,
      savedAt: '2026-09-02T12:00:00.000Z',
    };

    useAppStore.getState().loadSnapshot(snapshot);
    const state = useAppStore.getState();

    expect(state.lineItems).toEqual(snapshot.lineItems);
    expect(state.fundEntries).toEqual(snapshot.fundEntries);
    expect(state.budgetItems).toEqual(snapshot.budgetItems);
    expect(state.budgetTotale).toBe(8000);
    // The whole point: an override deliberately left at 0 must survive as 0, not be
    // dropped/coerced to null ("automatico") by the round-trip.
    expect(state.revenueAssumptions.costRunRateOverride).toBe(0);
  });

  it('defaults budgetItems to [] and budgetTotale to 0 when loading a snapshot saved before "Budget" existed', () => {
    const oldSnapshot = {
      lineItems: [],
      fundEntries: [],
      revenueAssumptions: defaultRevenueAssumptions(),
    } as unknown as Pick<AppState, 'lineItems' | 'fundEntries' | 'revenueAssumptions'>;

    useAppStore.getState().loadSnapshot(oldSnapshot);

    expect(useAppStore.getState().budgetItems).toEqual([]);
    expect(useAppStore.getState().budgetTotale).toBe(0);
  });

  it('backfills bloccato:false on voci saved before the lock feature existed', () => {
    const oldSnapshot = {
      lineItems: [],
      fundEntries: [],
      budgetItems: [{ id: 'b1', nome: 'Location', importo: 5000 }],
      revenueAssumptions: defaultRevenueAssumptions(),
    } as unknown as Pick<AppState, 'lineItems' | 'fundEntries' | 'revenueAssumptions' | 'budgetItems'>;

    useAppStore.getState().loadSnapshot(oldSnapshot);

    expect(useAppStore.getState().budgetItems[0].bloccato).toBe(false);
  });

  it('overwrites data left over from a previous session rather than merging it', () => {
    useAppStore.getState().addLineItem({
      date: '2020-01-01',
      category: 'Vecchio',
      description: 'Dato da sovrascrivere',
      amount: 999,
      type: 'cost',
      source: 'manual',
    });

    useAppStore.getState().loadSnapshot({
      lineItems: [],
      fundEntries: [],
      revenueAssumptions: defaultRevenueAssumptions(),
    });

    expect(useAppStore.getState().lineItems).toEqual([]);
  });

  it('backfills fields added later (e.g. Tier 3) with defaults instead of leaving them undefined', () => {
    // Simulates a snapshot saved before Tier 3 existed — the shape genuinely lacks the field,
    // as opposed to a TS-literal test object that the compiler would just reject.
    const oldSnapshot = {
      lineItems: [],
      fundEntries: [],
      revenueAssumptions: {
        ...defaultRevenueAssumptions(),
        simple: { tier1Price: 200, tier2Price: 600, tier1SitesPerMonth: 3, tier2SitesPerMonth: 1 },
      },
    } as unknown as Pick<AppState, 'lineItems' | 'fundEntries' | 'revenueAssumptions'>;

    useAppStore.getState().loadSnapshot(oldSnapshot);
    const { simple } = useAppStore.getState().revenueAssumptions;

    expect(simple.tier3Price).toBe(defaultRevenueAssumptions().simple.tier3Price);
    expect(simple.tier3SitesPerMonth).toBe(defaultRevenueAssumptions().simple.tier3SitesPerMonth);
    // Fields the old snapshot did have must survive, not just fall back to defaults.
    expect(simple.tier1Price).toBe(200);
  });
});

describe('budgetItems CRUD', () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
  });

  it('adds, updates and removes a voce di budget', () => {
    useAppStore.getState().addBudgetItem({ nome: 'Location', importo: 5000, bloccato: false });
    const [added] = useAppStore.getState().budgetItems;
    expect(added).toMatchObject({ nome: 'Location', importo: 5000, bloccato: false });
    expect(added.id).toBeTruthy();

    useAppStore.getState().updateBudgetItem(added.id, { importo: 5500 });
    expect(useAppStore.getState().budgetItems[0].importo).toBe(5500);

    useAppStore.getState().removeBudgetItem(added.id);
    expect(useAppStore.getState().budgetItems).toEqual([]);
  });

  it('locking a voce is just a flag on updateBudgetItem — no dedicated action needed', () => {
    useAppStore.getState().addBudgetItem({ nome: 'Location', importo: 5000, bloccato: false });
    const [added] = useAppStore.getState().budgetItems;

    useAppStore.getState().updateBudgetItem(added.id, { bloccato: true });
    expect(useAppStore.getState().budgetItems[0].bloccato).toBe(true);
  });
});

describe('setBudgetTotale', () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
  });

  it('sets budgetTotale, defaulting to 0 after resetAll', () => {
    expect(useAppStore.getState().budgetTotale).toBe(0);

    useAppStore.getState().setBudgetTotale(10000);
    expect(useAppStore.getState().budgetTotale).toBe(10000);

    useAppStore.getState().resetAll();
    expect(useAppStore.getState().budgetTotale).toBe(0);
  });
});
