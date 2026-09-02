import { describe, expect, it, beforeEach } from 'vitest';
import { useAppStore } from './store';
import { defaultRevenueAssumptions } from '../defaults';
import type { StateSnapshot } from '../export/exportSnapshot';

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
      revenueAssumptions: { ...defaultRevenueAssumptions(), costRunRateOverride: 0 },
      schemaVersion: 1,
      savedAt: '2026-09-02T12:00:00.000Z',
    };

    useAppStore.getState().loadSnapshot(snapshot);
    const state = useAppStore.getState();

    expect(state.lineItems).toEqual(snapshot.lineItems);
    expect(state.fundEntries).toEqual(snapshot.fundEntries);
    // The whole point: an override deliberately left at 0 must survive as 0, not be
    // dropped/coerced to null ("automatico") by the round-trip.
    expect(state.revenueAssumptions.costRunRateOverride).toBe(0);
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
});
