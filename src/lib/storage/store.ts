import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultRevenueAssumptions } from '../defaults';
import type { AppState, BudgetItem, FundEntry, LineItem, RevenueAssumptions } from '../../types/domain';

const SCHEMA_VERSION = 2;

/**
 * Backfills fields added after data may already have been saved (persisted localStorage,
 * or an older stato-sito.json snapshot) with their defaults, so old data doesn't turn into
 * NaN in the projections just because a newer field is missing.
 */
function withAssumptionDefaults(assumptions: RevenueAssumptions): RevenueAssumptions {
  const defaults = defaultRevenueAssumptions();
  return {
    ...assumptions,
    simple: { ...defaults.simple, ...assumptions.simple },
    funnel: { ...defaults.funnel, ...assumptions.funnel },
  };
}

/** Backfills `bloccato` on voci saved before the lock feature existed. */
function withBudgetItemDefaults(
  items: Array<Omit<BudgetItem, 'bloccato'> & { bloccato?: boolean }>,
): BudgetItem[] {
  return items.map((item) => ({ bloccato: false, ...item }));
}

export interface AppStore extends AppState {
  addLineItem: (item: Omit<LineItem, 'id'>) => void;
  updateLineItem: (id: string, patch: Partial<Omit<LineItem, 'id'>>) => void;
  removeLineItem: (id: string) => void;
  importLineItems: (items: Omit<LineItem, 'id'>[], mode: 'append' | 'replace') => void;

  addFundEntry: (entry: Omit<FundEntry, 'id'>) => void;
  updateFundEntry: (id: string, patch: Partial<Omit<FundEntry, 'id'>>) => void;
  removeFundEntry: (id: string) => void;

  addBudgetItem: (item: Omit<BudgetItem, 'id'>) => void;
  updateBudgetItem: (id: string, patch: Partial<Omit<BudgetItem, 'id'>>) => void;
  removeBudgetItem: (id: string) => void;
  setBudgetTotale: (value: number) => void;

  updateRevenueAssumptions: (patch: Partial<RevenueAssumptions>) => void;
  loadSnapshot: (
    snapshot: Pick<AppState, 'lineItems' | 'fundEntries' | 'revenueAssumptions'> & {
      // Optional: snapshots saved before "Budget" existed won't have these.
      budgetItems?: AppState['budgetItems'];
      budgetTotale?: AppState['budgetTotale'];
    },
  ) => void;
  resetAll: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      lineItems: [],
      fundEntries: [],
      budgetItems: [],
      budgetTotale: 0,
      revenueAssumptions: defaultRevenueAssumptions(),
      schemaVersion: SCHEMA_VERSION,

      addLineItem: (item) =>
        set((state) => ({ lineItems: [...state.lineItems, { ...item, id: nanoid() }] })),

      updateLineItem: (id, patch) =>
        set((state) => ({
          lineItems: state.lineItems.map((li) => (li.id === id ? { ...li, ...patch } : li)),
        })),

      removeLineItem: (id) =>
        set((state) => ({ lineItems: state.lineItems.filter((li) => li.id !== id) })),

      importLineItems: (items, mode) =>
        set((state) => {
          const newItems = items.map((item) => ({ ...item, id: nanoid() }));
          return {
            lineItems: mode === 'replace' ? newItems : [...state.lineItems, ...newItems],
          };
        }),

      addFundEntry: (entry) =>
        set((state) => ({ fundEntries: [...state.fundEntries, { ...entry, id: nanoid() }] })),

      updateFundEntry: (id, patch) =>
        set((state) => ({
          fundEntries: state.fundEntries.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),

      removeFundEntry: (id) =>
        set((state) => ({ fundEntries: state.fundEntries.filter((f) => f.id !== id) })),

      addBudgetItem: (item) =>
        set((state) => ({ budgetItems: [...state.budgetItems, { ...item, id: nanoid() }] })),

      updateBudgetItem: (id, patch) =>
        set((state) => ({
          budgetItems: state.budgetItems.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),

      removeBudgetItem: (id) =>
        set((state) => ({ budgetItems: state.budgetItems.filter((b) => b.id !== id) })),

      setBudgetTotale: (value) => set({ budgetTotale: value }),

      updateRevenueAssumptions: (patch) =>
        set((state) => ({ revenueAssumptions: { ...state.revenueAssumptions, ...patch } })),

      loadSnapshot: (snapshot) =>
        set({
          lineItems: snapshot.lineItems,
          fundEntries: snapshot.fundEntries,
          budgetItems: withBudgetItemDefaults(snapshot.budgetItems ?? []),
          budgetTotale: snapshot.budgetTotale ?? 0,
          revenueAssumptions: withAssumptionDefaults(snapshot.revenueAssumptions),
          schemaVersion: SCHEMA_VERSION,
        }),

      resetAll: () =>
        set({
          lineItems: [],
          fundEntries: [],
          budgetItems: [],
          budgetTotale: 0,
          revenueAssumptions: defaultRevenueAssumptions(),
          schemaVersion: SCHEMA_VERSION,
        }),
    }),
    {
      name: 'budgeting-matrimoni-store',
      version: SCHEMA_VERSION,
      migrate: (persisted) => {
        const state = persisted as AppStore;
        return {
          ...state,
          revenueAssumptions: withAssumptionDefaults(state.revenueAssumptions),
          budgetItems: withBudgetItemDefaults(state.budgetItems ?? []),
        };
      },
    },
  ),
);
