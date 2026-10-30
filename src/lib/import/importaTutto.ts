import type { AppState } from '../../types/domain';
import {
  DESTINAZIONI,
  mappaturaIncompleta,
  movimenti,
  norm,
  righeDaFoglio,
  suggerisciColonne,
  type Destinazione,
  type EsitoImport,
} from './destinazioni';
import type { NamedSheet } from './parseFile';

/**
 * Whole-file import: one Excel (or CSV), every sheet recognised on its own — by name for Regia's
 * export, by its columns for anything else — and imported with the same non-destructive rules as
 * the per-screen import (upsert by key, empty cells never erase, nothing deleted).
 */

const TUTTE: Destinazione[] = [movimenti, ...DESTINAZIONI];

/** Where one sheet refers to another: ruoli before dipendenti before governance, progetti before WBS. */
const ORDINE = ['movimenti', 'fondi', 'budget', 'imprese-legate', 'ruoli', 'dipendenti', 'organi', 'filiera', 'progetti', 'task', 'rischi'];

/** Sheets of Regia's export that are computed or only for reading: skipped, not "unrecognised". */
const SOLO_LETTURA = ['leggimi', 'assunzioni', 'proiezioni mensili', 'progetti - gantt', 'progetti - organizzazione', 'progetti - sal'];

export interface FoglioImportato {
  foglio: string;
  destinazione: Destinazione;
  esito: EsitoImport;
}

export interface FoglioIgnorato {
  foglio: string;
  motivo: string;
}

export interface EsitoTotale {
  importati: FoglioImportato[];
  ignorati: FoglioIgnorato[];
  patch: Partial<AppState>;
}

/** The destination a sheet holds: its name if it's one of Regia's, otherwise the best column match. */
export function riconosciFoglio({ name, sheet }: NamedSheet): Destinazione | null {
  const perNome = TUTTE.find((d) => d.fogli.some((f) => norm(f) === norm(name)));
  if (perNome) return perNome;
  let migliore: Destinazione | null = null;
  let punti = 0;
  let pari = false;
  for (const d of TUTTE) {
    const colonne = suggerisciColonne(d.campi, sheet.headers);
    if (mappaturaIncompleta(d, colonne).length > 0) continue;
    const p = Object.values(colonne).filter((i) => i > -1).length;
    if (p > punti) [migliore, punti, pari] = [d, p, false];
    else if (p === punti) pari = true;
  }
  // Two equally good guesses (or a single matching column) is a coin toss: better to ask.
  return migliore && punti >= 2 && !pari ? migliore : null;
}

export function importaTutto(state: AppState, fogli: NamedSheet[]): EsitoTotale {
  const ignorati: FoglioIgnorato[] = [];
  const daImportare: Array<{ foglio: NamedSheet; d: Destinazione }> = [];
  for (const f of fogli) {
    if (f.sheet.rows.length === 0) ignorati.push({ foglio: f.name, motivo: 'vuoto' });
    else if (SOLO_LETTURA.includes(norm(f.name))) ignorati.push({ foglio: f.name, motivo: 'calcolato o da leggere' });
    else {
      const d = riconosciFoglio(f);
      if (d) daImportare.push({ foglio: f, d });
      else ignorati.push({ foglio: f.name, motivo: 'non riconosciuto: usa l’import per schermata' });
    }
  }
  daImportare.sort((a, b) => ORDINE.indexOf(a.d.id) - ORDINE.indexOf(b.d.id));

  let s = state;
  let patch: Partial<AppState> = {};
  const importati = daImportare.map(({ foglio, d }) => {
    const esito = d.importa(s, righeDaFoglio(foglio.sheet, suggerisciColonne(d.campi, foglio.sheet.headers)));
    s = { ...s, ...esito.patch };
    patch = { ...patch, ...esito.patch };
    return { foglio: foglio.name, destinazione: d, esito };
  });
  return { importati, ignorati, patch };
}
