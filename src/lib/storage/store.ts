import { addMonths, differenceInCalendarMonths, format, parseISO, startOfMonth } from 'date-fns';
import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultRevenueAssumptions, defaultRunwayAssumptions } from '../defaults';
import type {
  AppState,
  AttoreFiliera,
  BudgetItem,
  Dipendente,
  DimensioneImpresa,
  FundEntry,
  Governance,
  ImpresaLegata,
  LineItem,
  MembroOrgano,
  ModelloGovernance,
  Prodotto,
  Progetti,
  Progetto,
  CriterioValutazione,
  RevenueAssumptions,
  Ruolo,
  RunwayAssumptions,
  SupplyChain,
} from '../../types/domain';
import { fullName, wouldCreateCycle } from '../hr/hr';
import { nuovoProgetto, progettiVuoti, sganciaDipendente, withProgettiDefaults } from '../progetti/defaults';

const SCHEMA_VERSION = 9;

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

/** Stesso ruolo di withAssumptionDefaults, per il calcolatore Runway. */
function withRunwayDefaults(assumptions: RunwayAssumptions): RunwayAssumptions {
  const defaults = defaultRunwayAssumptions();
  return {
    ...defaults,
    ...assumptions,
    detailedBurn: { ...defaults.detailedBurn, ...assumptions.detailedBurn },
  };
}

function defaultGovernance(): Governance {
  return { modello: null, membri: [] };
}

/** Backfills the governance section on data saved before it existed (or saved partially). */
function withGovernanceDefaults(governance: Partial<Governance> | undefined): Governance {
  return { ...defaultGovernance(), ...governance };
}

function defaultSupplyChain(): SupplyChain {
  return { prodotti: [], attori: [] };
}

function withSupplyChainDefaults(supplyChain: Partial<SupplyChain> | undefined): SupplyChain {
  return { ...defaultSupplyChain(), ...supplyChain };
}

function defaultDimensioneImpresa(): DimensioneImpresa {
  return { esercizio: '', ulaManuale: null, fatturato: null, totaleBilancio: null, imprese: [] };
}

function withDimensioneDefaults(d: Partial<DimensioneImpresa> | undefined): DimensioneImpresa {
  return { ...defaultDimensioneImpresa(), ...d };
}

/** Backfills `bloccato` on voci saved before the lock feature existed. */
function withBudgetItemDefaults(
  items: Array<Omit<BudgetItem, 'bloccato'> & { bloccato?: boolean }>,
): BudgetItem[] {
  return items.map((item) => ({ bloccato: false, ...item }));
}

/** Backfills `recurring` on voci saved before the recurring-item feature existed. */
function withLineItemDefaults(
  items: Array<Omit<LineItem, 'recurring'> & { recurring?: boolean }>,
): LineItem[] {
  return items.map((item) => ({ recurring: false, ...item }));
}

/** Backfills `category` on fondi saved before categories existed. */
function withFundEntryDefaults(items: Array<Omit<FundEntry, 'category'> & { category?: string }>): FundEntry[] {
  return items.map((item) => ({ category: '', ...item }));
}

/**
 * Seeds a managed category list from whatever's already in use in the data, so historical
 * free-text categories aren't invisible in the new managed list the first time it's built
 * (from an old snapshot/localStorage that predates managed categories entirely).
 */
function withCategoryListDefaults(list: string[] | undefined, items: { category: string }[]): string[] {
  const inUse = items.map((i) => i.category).filter((c): c is string => Boolean(c));
  return Array.from(new Set([...(list ?? []), ...inUse]));
}

/** Adds `name` to `list` if it's non-empty and not already present (case-insensitive). */
function registerCategory(list: string[], name: string | undefined): string[] {
  const trimmed = name?.trim();
  if (!trimmed) return list;
  const exists = list.some((c) => c.toLowerCase() === trimmed.toLowerCase());
  return exists ? list : [...list, trimmed];
}

export interface AppStore extends AppState {
  addLineItem: (item: Omit<LineItem, 'id'>) => void;
  updateLineItem: (id: string, patch: Partial<Omit<LineItem, 'id'>>) => void;
  removeLineItem: (id: string) => void;
  importLineItems: (items: Omit<LineItem, 'id'>[], mode: 'append' | 'replace') => void;
  /**
   * First click on a not-yet-expanded item: materializes one real LineItem per month from
   * the item's own month through targetBreakEvenDate (same category/description/amount/type),
   * all sharing a recurringGroupId. Click on a not-currently-recurring item that still has a
   * recurringGroupId (individually toggled off before): just flips it back on, no regeneration.
   * A no-op if the item is already recurring — ending an active series goes through
   * `endRecurringFrom` instead (it needs user confirmation first, since it deletes rows).
   */
  expandRecurring: (id: string) => void;
  /**
   * Ends a recurring series starting the month after the given item: deletes every sibling
   * (same recurringGroupId) dated after it, and clears `recurring`/`recurringGroupId` on the
   * item itself and every earlier sibling — the whole surviving series stops counting as
   * recurring, not just the future. A no-op if the item doesn't exist.
   */
  endRecurringFrom: (id: string) => void;

  addFundEntry: (entry: Omit<FundEntry, 'id'>) => void;
  updateFundEntry: (id: string, patch: Partial<Omit<FundEntry, 'id'>>) => void;
  removeFundEntry: (id: string) => void;

  addBudgetItem: (item: Omit<BudgetItem, 'id'>) => void;
  updateBudgetItem: (id: string, patch: Partial<Omit<BudgetItem, 'id'>>) => void;
  removeBudgetItem: (id: string) => void;
  setBudgetTotale: (value: number) => void;

  /** Rimuove solo dall'elenco gestito — non tocca le voci che già usano questa categoria. */
  removeLineItemCategory: (name: string) => void;
  removeFundCategory: (name: string) => void;

  /** Returns the new dipendente's id. */
  addDipendente: (dipendente: Omit<Dipendente, 'id'>) => string;
  updateDipendente: (id: string, patch: Partial<Omit<Dipendente, 'id'>>) => void;
  removeDipendente: (id: string) => void;

  /** Returns the new ruolo's id, so a form can create a ruolo and assign it in one go. */
  addRuolo: (nome: string, superioreId?: string | null) => string;
  /** Ignores a `superioreId` that would make the organigramma loop back on itself. */
  updateRuolo: (id: string, patch: Partial<Omit<Ruolo, 'id'>>) => void;
  /**
   * Removes the ruolo without losing anyone: its sub-ruoli move up to its own superiore
   * and its dipendenti are left without a ruolo (they stay in the list).
   */
  removeRuolo: (id: string) => void;

  setModelloGovernance: (modello: ModelloGovernance | null) => void;
  addMembroOrgano: (membro: Omit<MembroOrgano, 'id'>) => void;
  updateMembroOrgano: (id: string, patch: Partial<Omit<MembroOrgano, 'id'>>) => void;
  removeMembroOrgano: (id: string) => void;

  /** Returns the new prodotto's id, so the view can select it right away. */
  addProdotto: (nome: string) => string;
  updateProdotto: (id: string, patch: Partial<Omit<Prodotto, 'id'>>) => void;
  /** Also removes every attore of that prodotto. */
  removeProdotto: (id: string) => void;
  addAttore: (attore: Omit<AttoreFiliera, 'id'>) => void;
  updateAttore: (id: string, patch: Partial<Omit<AttoreFiliera, 'id'>>) => void;
  removeAttore: (id: string) => void;

  updateDimensioneImpresa: (patch: Partial<Omit<DimensioneImpresa, 'imprese'>>) => void;
  addImpresaLegata: () => void;
  updateImpresaLegata: (id: string, patch: Partial<Omit<ImpresaLegata, 'id'>>) => void;
  removeImpresaLegata: (id: string) => void;

  /** Creates a project, makes it the active one and returns its id. */
  addProgetto: (titolo: string) => string;
  /** A patch, or a function from the current project to the new one (for nested edits). */
  updateProgetto: (id: string, change: Partial<Progetto> | ((p: Progetto) => Progetto)) => void;
  removeProgetto: (id: string) => void;
  setProgettoAttivo: (id: string | null) => void;
  setCriteri: (criteri: CriterioValutazione[]) => void;

  updateRevenueAssumptions: (patch: Partial<RevenueAssumptions>) => void;
  updateRunwayAssumptions: (patch: Partial<RunwayAssumptions>) => void;
  loadSnapshot: (
    snapshot: Pick<AppState, 'lineItems' | 'fundEntries' | 'revenueAssumptions'> & {
      // Optional: snapshots saved before "Gestione del bilancio"/Runway/Budget/categorie esistessero non li hanno.
      budgetItems?: AppState['budgetItems'];
      budgetTotale?: AppState['budgetTotale'];
      runwayAssumptions?: AppState['runwayAssumptions'];
      lineItemCategories?: AppState['lineItemCategories'];
      fundCategories?: AppState['fundCategories'];
      // Optional: snapshots saved before the HR section existed don't have them.
      dipendenti?: AppState['dipendenti'];
      ruoli?: AppState['ruoli'];
      governance?: Partial<AppState['governance']>;
      supplyChain?: Partial<AppState['supplyChain']>;
      dimensioneImpresa?: Partial<AppState['dimensioneImpresa']>;
      progetti?: Partial<Progetti>;
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
      lineItemCategories: [],
      fundCategories: [],
      revenueAssumptions: defaultRevenueAssumptions(),
      runwayAssumptions: defaultRunwayAssumptions(),
      dipendenti: [],
      ruoli: [],
      governance: defaultGovernance(),
      supplyChain: defaultSupplyChain(),
      dimensioneImpresa: defaultDimensioneImpresa(),
      progetti: progettiVuoti(),
      schemaVersion: SCHEMA_VERSION,

      addLineItem: (item) =>
        set((state) => ({
          lineItems: [...state.lineItems, { ...item, id: nanoid() }],
          lineItemCategories: registerCategory(state.lineItemCategories, item.category),
        })),

      updateLineItem: (id, patch) =>
        set((state) => ({
          lineItems: state.lineItems.map((li) => (li.id === id ? { ...li, ...patch } : li)),
          lineItemCategories: registerCategory(state.lineItemCategories, patch.category),
        })),

      removeLineItem: (id) =>
        set((state) => ({ lineItems: state.lineItems.filter((li) => li.id !== id) })),

      importLineItems: (items, mode) =>
        set((state) => {
          const newItems = items.map((item) => ({ ...item, id: nanoid() }));
          let lineItemCategories = state.lineItemCategories;
          for (const item of items) {
            lineItemCategories = registerCategory(lineItemCategories, item.category);
          }
          return {
            lineItems: mode === 'replace' ? newItems : [...state.lineItems, ...newItems],
            lineItemCategories,
          };
        }),

      expandRecurring: (id) =>
        set((state) => {
          const item = state.lineItems.find((li) => li.id === id);
          // Ending an already-active series needs confirmation first — see endRecurringFrom.
          if (!item || item.recurring) return {};

          // Individually toggled off before, still linked to its group — just flip it back on.
          if (item.recurringGroupId) {
            return {
              lineItems: state.lineItems.map((li) => (li.id === id ? { ...li, recurring: true } : li)),
            };
          }

          const groupId = nanoid();
          const itemDate = parseISO(item.date);
          const itemMonth = startOfMonth(itemDate);
          const targetMonth = startOfMonth(parseISO(state.revenueAssumptions.targetBreakEvenDate));
          const monthsToGenerate = Math.max(differenceInCalendarMonths(targetMonth, itemMonth), 0);

          const generated: LineItem[] = [];
          for (let i = 1; i <= monthsToGenerate; i++) {
            generated.push({
              ...item,
              id: nanoid(),
              // Same day-of-month as the original (date-fns clamps overflow, e.g. Jan 31 -> Feb 28).
              date: format(addMonths(itemDate, i), 'yyyy-MM-dd'),
              recurring: true,
              recurringGroupId: groupId,
            });
          }

          return {
            lineItems: [
              ...state.lineItems.map((li) =>
                li.id === id ? { ...li, recurring: true, recurringGroupId: groupId } : li,
              ),
              ...generated,
            ],
          };
        }),

      endRecurringFrom: (id) =>
        set((state) => {
          const item = state.lineItems.find((li) => li.id === id);
          if (!item) return {};

          const groupId = item.recurringGroupId;
          // Without a real group, the clicked item is its own group of one — the logic below
          // still reduces to just switching that single row off.
          const inGroup = (li: LineItem) => (groupId ? li.recurringGroupId === groupId : li.id === id);

          return {
            lineItems: state.lineItems
              .filter((li) => !(inGroup(li) && li.date > item.date))
              .map((li) =>
                inGroup(li) && li.date <= item.date
                  ? { ...li, recurring: false, recurringGroupId: undefined }
                  : li,
              ),
          };
        }),

      addFundEntry: (entry) =>
        set((state) => ({
          fundEntries: [...state.fundEntries, { ...entry, id: nanoid() }],
          fundCategories: registerCategory(state.fundCategories, entry.category),
        })),

      updateFundEntry: (id, patch) =>
        set((state) => ({
          fundEntries: state.fundEntries.map((f) => (f.id === id ? { ...f, ...patch } : f)),
          fundCategories: registerCategory(state.fundCategories, patch.category),
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

      removeLineItemCategory: (name) =>
        set((state) => ({
          lineItemCategories: state.lineItemCategories.filter((c) => c !== name),
        })),

      removeFundCategory: (name) =>
        set((state) => ({
          fundCategories: state.fundCategories.filter((c) => c !== name),
        })),

      addDipendente: (dipendente) => {
        const id = nanoid();
        set((state) => ({ dipendenti: [...state.dipendenti, { ...dipendente, id }] }));
        return id;
      },

      updateDipendente: (id, patch) =>
        set((state) => ({
          dipendenti: state.dipendenti.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),

      // Leaving the company doesn't mean leaving the cap table or the board: their seats in
      // the organi sociali stay, turned into an external person with the same name.
      removeDipendente: (id) =>
        set((state) => {
          const removed = state.dipendenti.find((d) => d.id === id);
          return {
            dipendenti: state.dipendenti.filter((d) => d.id !== id),
            governance: {
              ...state.governance,
              membri: state.governance.membri.map((m) =>
                m.dipendenteId === id
                  ? { ...m, dipendenteId: null, nomeEsterno: removed ? fullName(removed) : m.nomeEsterno }
                  : m,
              ),
            },
            // Same for the supply chain: the activity keeps its actor, by name.
            supplyChain: {
              ...state.supplyChain,
              attori: state.supplyChain.attori.map((a) =>
                a.dipendenteId === id
                  ? { ...a, dipendenteId: null, nome: removed ? fullName(removed) : a.nome }
                  : a,
              ),
            },
            progetti: removed ? sganciaDipendente(state.progetti, id, fullName(removed)) : state.progetti,
          };
        }),

      addRuolo: (nome, superioreId = null) => {
        const id = nanoid();
        set((state) => ({ ruoli: [...state.ruoli, { id, nome: nome.trim(), superioreId }] }));
        return id;
      },

      updateRuolo: (id, patch) =>
        set((state) => {
          if (patch.superioreId !== undefined && wouldCreateCycle(state.ruoli, id, patch.superioreId)) {
            return {};
          }
          return { ruoli: state.ruoli.map((r) => (r.id === id ? { ...r, ...patch } : r)) };
        }),

      removeRuolo: (id) =>
        set((state) => {
          const removed = state.ruoli.find((r) => r.id === id);
          if (!removed) return {};
          return {
            ruoli: state.ruoli
              .filter((r) => r.id !== id)
              .map((r) => (r.superioreId === id ? { ...r, superioreId: removed.superioreId } : r)),
            dipendenti: state.dipendenti.map((d) => (d.ruoloId === id ? { ...d, ruoloId: null } : d)),
          };
        }),

      setModelloGovernance: (modello) =>
        set((state) => ({ governance: { ...state.governance, modello } })),

      addMembroOrgano: (membro) =>
        set((state) => ({
          governance: { ...state.governance, membri: [...state.governance.membri, { ...membro, id: nanoid() }] },
        })),

      updateMembroOrgano: (id, patch) =>
        set((state) => ({
          governance: {
            ...state.governance,
            membri: state.governance.membri.map((m) => (m.id === id ? { ...m, ...patch } : m)),
          },
        })),

      removeMembroOrgano: (id) =>
        set((state) => ({
          governance: { ...state.governance, membri: state.governance.membri.filter((m) => m.id !== id) },
        })),

      addProdotto: (nome) => {
        const id = nanoid();
        set((state) => ({
          supplyChain: {
            ...state.supplyChain,
            prodotti: [...state.supplyChain.prodotti, { id, nome: nome.trim(), descrizione: '' }],
          },
        }));
        return id;
      },

      updateProdotto: (id, patch) =>
        set((state) => ({
          supplyChain: {
            ...state.supplyChain,
            prodotti: state.supplyChain.prodotti.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          },
        })),

      removeProdotto: (id) =>
        set((state) => ({
          supplyChain: {
            prodotti: state.supplyChain.prodotti.filter((p) => p.id !== id),
            attori: state.supplyChain.attori.filter((a) => a.prodottoId !== id),
          },
        })),

      addAttore: (attore) =>
        set((state) => ({
          supplyChain: { ...state.supplyChain, attori: [...state.supplyChain.attori, { ...attore, id: nanoid() }] },
        })),

      updateAttore: (id, patch) =>
        set((state) => ({
          supplyChain: {
            ...state.supplyChain,
            attori: state.supplyChain.attori.map((a) => (a.id === id ? { ...a, ...patch } : a)),
          },
        })),

      removeAttore: (id) =>
        set((state) => ({
          supplyChain: { ...state.supplyChain, attori: state.supplyChain.attori.filter((a) => a.id !== id) },
        })),

      updateDimensioneImpresa: (patch) =>
        set((state) => ({ dimensioneImpresa: { ...state.dimensioneImpresa, ...patch } })),

      addImpresaLegata: () =>
        set((state) => ({
          dimensioneImpresa: {
            ...state.dimensioneImpresa,
            imprese: [
              ...state.dimensioneImpresa.imprese,
              {
                id: nanoid(),
                nome: '',
                quota: 0,
                controlloCda: false,
                investitoreEsente: false,
                ula: null,
                fatturato: null,
                totaleBilancio: null,
              },
            ],
          },
        })),

      updateImpresaLegata: (id, patch) =>
        set((state) => ({
          dimensioneImpresa: {
            ...state.dimensioneImpresa,
            imprese: state.dimensioneImpresa.imprese.map((i) => (i.id === id ? { ...i, ...patch } : i)),
          },
        })),

      removeImpresaLegata: (id) =>
        set((state) => ({
          dimensioneImpresa: {
            ...state.dimensioneImpresa,
            imprese: state.dimensioneImpresa.imprese.filter((i) => i.id !== id),
          },
        })),

      addProgetto: (titolo) => {
        const p = nuovoProgetto(titolo.trim());
        set((state) => ({
          progetti: { ...state.progetti, progetti: [...state.progetti.progetti, p], progettoAttivoId: p.id },
        }));
        return p.id;
      },

      updateProgetto: (id, change) =>
        set((state) => ({
          progetti: {
            ...state.progetti,
            progetti: state.progetti.progetti.map((p) =>
              p.id === id ? (typeof change === 'function' ? change(p) : { ...p, ...change }) : p,
            ),
          },
        })),

      removeProgetto: (id) =>
        set((state) => {
          const progetti = state.progetti.progetti.filter((p) => p.id !== id);
          const attivo = state.progetti.progettoAttivoId === id ? (progetti[0]?.id ?? null) : state.progetti.progettoAttivoId;
          return { progetti: { ...state.progetti, progetti, progettoAttivoId: attivo } };
        }),

      setProgettoAttivo: (id) => set((state) => ({ progetti: { ...state.progetti, progettoAttivoId: id } })),

      setCriteri: (criteri) => set((state) => ({ progetti: { ...state.progetti, criteri } })),

      updateRevenueAssumptions: (patch) =>
        set((state) => ({ revenueAssumptions: { ...state.revenueAssumptions, ...patch } })),

      updateRunwayAssumptions: (patch) =>
        set((state) => ({ runwayAssumptions: { ...state.runwayAssumptions, ...patch } })),

      loadSnapshot: (snapshot) => {
        const lineItems = withLineItemDefaults(snapshot.lineItems);
        const fundEntries = withFundEntryDefaults(snapshot.fundEntries);
        set({
          lineItems,
          fundEntries,
          budgetItems: withBudgetItemDefaults(snapshot.budgetItems ?? []),
          budgetTotale: snapshot.budgetTotale ?? 0,
          lineItemCategories: withCategoryListDefaults(snapshot.lineItemCategories, lineItems),
          fundCategories: withCategoryListDefaults(snapshot.fundCategories, fundEntries),
          revenueAssumptions: withAssumptionDefaults(snapshot.revenueAssumptions),
          runwayAssumptions: snapshot.runwayAssumptions
            ? withRunwayDefaults(snapshot.runwayAssumptions)
            : defaultRunwayAssumptions(),
          dipendenti: snapshot.dipendenti ?? [],
          ruoli: snapshot.ruoli ?? [],
          governance: withGovernanceDefaults(snapshot.governance),
          supplyChain: withSupplyChainDefaults(snapshot.supplyChain),
          dimensioneImpresa: withDimensioneDefaults(snapshot.dimensioneImpresa),
          progetti: withProgettiDefaults(snapshot.progetti),
          schemaVersion: SCHEMA_VERSION,
        });
      },

      resetAll: () =>
        set({
          lineItems: [],
          fundEntries: [],
          budgetItems: [],
          budgetTotale: 0,
          lineItemCategories: [],
          fundCategories: [],
          revenueAssumptions: defaultRevenueAssumptions(),
          runwayAssumptions: defaultRunwayAssumptions(),
          dipendenti: [],
          ruoli: [],
          governance: defaultGovernance(),
          supplyChain: defaultSupplyChain(),
          dimensioneImpresa: defaultDimensioneImpresa(),
          progetti: progettiVuoti(),
          schemaVersion: SCHEMA_VERSION,
        }),
    }),
    {
      name: 'budgeting-matrimoni-store',
      version: SCHEMA_VERSION,
      migrate: (persisted) => {
        const state = persisted as AppStore;
        const fundEntries = withFundEntryDefaults(state.fundEntries ?? []);
        return {
          ...state,
          fundEntries,
          revenueAssumptions: withAssumptionDefaults(state.revenueAssumptions),
          budgetItems: withBudgetItemDefaults(state.budgetItems ?? []),
          lineItemCategories: withCategoryListDefaults(state.lineItemCategories, state.lineItems ?? []),
          fundCategories: withCategoryListDefaults(state.fundCategories, fundEntries),
          dipendenti: state.dipendenti ?? [],
          ruoli: state.ruoli ?? [],
          governance: withGovernanceDefaults(state.governance),
          supplyChain: withSupplyChainDefaults(state.supplyChain),
          dimensioneImpresa: withDimensioneDefaults(state.dimensioneImpresa),
          progetti: withProgettiDefaults(state.progetti),
        };
      },
    },
  ),
);
