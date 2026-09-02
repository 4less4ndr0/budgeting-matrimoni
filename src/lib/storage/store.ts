import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultRevenueAssumptions } from '../defaults';
import type { AppState, FundEntry, LineItem, RevenueAssumptions } from '../../types/domain';

const SCHEMA_VERSION = 1;

export interface AppStore extends AppState {
  addLineItem: (item: Omit<LineItem, 'id'>) => void;
  updateLineItem: (id: string, patch: Partial<Omit<LineItem, 'id'>>) => void;
  removeLineItem: (id: string) => void;
  importLineItems: (items: Omit<LineItem, 'id'>[], mode: 'append' | 'replace') => void;

  addFundEntry: (entry: Omit<FundEntry, 'id'>) => void;
  updateFundEntry: (id: string, patch: Partial<Omit<FundEntry, 'id'>>) => void;
  removeFundEntry: (id: string) => void;

  updateRevenueAssumptions: (patch: Partial<RevenueAssumptions>) => void;
  resetAll: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      lineItems: [],
      fundEntries: [],
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

      updateRevenueAssumptions: (patch) =>
        set((state) => ({ revenueAssumptions: { ...state.revenueAssumptions, ...patch } })),

      resetAll: () =>
        set({
          lineItems: [],
          fundEntries: [],
          revenueAssumptions: defaultRevenueAssumptions(),
          schemaVersion: SCHEMA_VERSION,
        }),
    }),
    {
      name: 'budgeting-matrimoni-store',
      version: SCHEMA_VERSION,
    },
  ),
);
