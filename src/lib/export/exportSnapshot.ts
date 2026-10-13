import type { AppState } from '../../types/domain';

export const SNAPSHOT_FILENAME = 'stato-sito.json';

/** Full app state as saved by exportStateSnapshot — everything needed to restore it exactly. */
export interface StateSnapshot {
  lineItems: AppState['lineItems'];
  fundEntries: AppState['fundEntries'];
  budgetItems: AppState['budgetItems'];
  budgetTotale: AppState['budgetTotale'];
  lineItemCategories: AppState['lineItemCategories'];
  fundCategories: AppState['fundCategories'];
  revenueAssumptions: AppState['revenueAssumptions'];
  runwayAssumptions: AppState['runwayAssumptions'];
  dipendenti: AppState['dipendenti'];
  ruoli: AppState['ruoli'];
  governance: AppState['governance'];
  supplyChain: AppState['supplyChain'];
  dimensioneImpresa: AppState['dimensioneImpresa'];
  schemaVersion: number;
  savedAt: string;
}

/** Everything needed to restore the app exactly — all four areas, override included. */
export function buildSnapshot(state: AppState, savedAt: string = new Date().toISOString()): StateSnapshot {
  return {
    lineItems: state.lineItems,
    fundEntries: state.fundEntries,
    budgetItems: state.budgetItems,
    budgetTotale: state.budgetTotale,
    lineItemCategories: state.lineItemCategories,
    fundCategories: state.fundCategories,
    revenueAssumptions: state.revenueAssumptions,
    runwayAssumptions: state.runwayAssumptions,
    dipendenti: state.dipendenti,
    ruoli: state.ruoli,
    governance: state.governance,
    supplyChain: state.supplyChain,
    dimensioneImpresa: state.dimensioneImpresa,
    schemaVersion: state.schemaVersion,
    savedAt,
  };
}

/**
 * Parses a snapshot from JSON text; null if it isn't one. Only the fields every snapshot
 * ever had are required — anything newer is optional and backfilled by loadSnapshot.
 */
export function parseSnapshotJson(content: string): StateSnapshot | null {
  try {
    const data: unknown = JSON.parse(content);
    if (
      typeof data !== 'object' ||
      data === null ||
      !Array.isArray((data as Partial<StateSnapshot>).lineItems) ||
      !Array.isArray((data as Partial<StateSnapshot>).fundEntries) ||
      typeof (data as Partial<StateSnapshot>).revenueAssumptions !== 'object'
    ) {
      return null;
    }
    return data as StateSnapshot;
  } catch {
    return null;
  }
}

/**
 * Downloads the whole Regia as JSON. Pensato anche per essere spostato manualmente in
 * csv-imports/ come stato-sito.json: il sito lo rileva e lo ricarica in un click, anche da
 * un altro dispositivo (il browser non può scrivere da solo nel repo).
 */
export function exportStateSnapshot(state: AppState): void {
  const snapshot = buildSnapshot(state);
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = SNAPSHOT_FILENAME;
  a.click();
  URL.revokeObjectURL(url);
}
