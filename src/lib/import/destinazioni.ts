import { nanoid } from 'nanoid';
import type {
  AppState,
  AttivitaPorter,
  Dipendente,
  ImpresaLegata,
  MembroOrgano,
  ObiettivoRealizzativo,
  OrganoId,
  Persona,
  Progetto,
  Rischio,
  StatoProgetto,
  StatoRischio,
  TipoAttore,
  TipoRischio,
  TipologiaRS,
} from '../../types/domain';
import { ORGANI, MODELLI } from '../governance/modelli';
import { fullName, wouldCreateCycle } from '../hr/hr';
import { orOrdinati, taskDiOr } from '../progetti/calcoli';
import { nuovoProgetto } from '../progetti/defaults';
import { aggiungiOr, aggiungiTask } from '../progetti/modifiche';
import { ATTIVITA, TIPI_ATTORE } from '../supplyChain/porter';
import type { RawSheet } from './parseFile';
import { parseAmount, parseDateToISO } from './valueParsing';

/**
 * Import "per schermata": every area of Regia can take rows from a CSV/Excel. Each destination
 * says which fields it has, how to recognise their columns, and how a row merges into the data.
 *
 * Two rules hold everywhere, so an import is never destructive:
 * - a row whose key already exists (same name, same person…) UPDATES that record instead of
 *   duplicating it, and nothing is ever deleted — links (a dipendente used in Governance or in a
 *   project) keep working;
 * - an empty cell never erases anything: only the values actually present overwrite.
 * That's also what makes the visible sheets of Regia's own Excel export re-importable.
 */

export interface CampoImport {
  key: string;
  label: string;
  obbligatorio?: boolean;
  /** Header names that map to this field (compared lower-case, accents and _ ignored). */
  sinonimi: string[];
}

/** One row, field key → raw cell text ('' when the column isn't mapped or the cell is empty). */
export type Riga = Record<string, string>;

export interface EsitoImport {
  nuovi: number;
  aggiornati: number;
  scartati: number;
  /** Why rows were skipped, or other things worth knowing (first few shown in the UI). */
  note: string[];
  patch: Partial<AppState>;
}

export interface Destinazione {
  id: string;
  area: string;
  label: string;
  descrizione: string;
  campi: CampoImport[];
  /** At least one field of each group must be mapped (e.g. nome OR cognome OR nominativo). */
  almenoUno?: string[][];
  /** Sheet names of Regia's export that contain this data, to preselect the right sheet. */
  fogli: string[];
  importa: (state: AppState, righe: Riga[]) => EsitoImport;
}

// --- Helpers ---------------------------------------------------------------------------------

export function norm(s: string | undefined | null): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .trim();
}

function numero(s: string): number | null {
  return parseAmount(String(s ?? '').replace('%', ''));
}

function siNo(s: string): boolean | null {
  const v = norm(s);
  if (!v) return null;
  return ['si', 'sì', 'yes', 'true', 'x', '1', 'vero'].includes(v);
}

/** Only the non-empty values of a patch, so empty cells never overwrite existing data. */
function soloPieni<T extends object>(patch: T): { [K in keyof T]?: Exclude<T[K], null> } {
  const out: { [K in keyof T]?: Exclude<T[K], null> } = {};
  for (const [k, v] of Object.entries(patch) as Array<[keyof T, T[keyof T]]>) {
    if (v === '' || v === null || v === undefined) continue;
    out[k] = v as Exclude<T[keyof T], null>;
  }
  return out;
}

function personaDa(nome: string, dipendenti: Dipendente[]): Persona {
  const n = norm(nome);
  const d = dipendenti.find((x) => norm(fullName(x)) === n || norm(`${x.cognome} ${x.nome}`) === n);
  return d ? { dipendenteId: d.id, nomeEsterno: '' } : { dipendenteId: null, nomeEsterno: nome.trim() };
}

function tipologia(s: string): TipologiaRS | null {
  const v = norm(s);
  if (v === 'ri' || v.includes('ricerca')) return 'RI';
  if (v === 'ss' || v.includes('sviluppo')) return 'SS';
  return null;
}

/** "M1–M4", "1-4", "M3 – M12" → [1, 4]. */
function intervalloMesi(s: string): [number, number] | null {
  const m = String(s ?? '').match(/(\d+)\D+(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

function esito(): EsitoImport {
  return { nuovi: 0, aggiornati: 0, scartati: 0, note: [], patch: {} };
}

function scarta(e: EsitoImport, riga: number, motivo: string) {
  e.scartati++;
  if (e.note.length < 50) e.note.push(`Riga ${riga + 2}: ${motivo}`);
}

/** Suggests the column for each field: exact header match first, then "contains". */
export function suggerisciColonne(campi: CampoImport[], headers: string[]): Record<string, number> {
  const h = headers.map(norm);
  const out: Record<string, number> = {};
  const usate = new Set<number>();
  for (const passaggio of ['esatto', 'contiene'] as const) {
    for (const c of campi) {
      if (out[c.key] !== undefined && out[c.key] > -1) continue;
      const idx = h.findIndex(
        (x, i) =>
          !usate.has(i) &&
          c.sinonimi.some((syn) => (passaggio === 'esatto' ? x === norm(syn) : x.includes(norm(syn)))),
      );
      out[c.key] = idx;
      if (idx > -1) usate.add(idx);
    }
  }
  return out;
}

export function righeDaFoglio(sheet: RawSheet, colonne: Record<string, number>): Riga[] {
  return sheet.rows.map((r) => {
    const riga: Riga = {};
    for (const [k, idx] of Object.entries(colonne)) riga[k] = idx > -1 ? String(r[idx] ?? '').trim() : '';
    return riga;
  });
}

/** Mapping problems that block the import (missing required fields). */
export function mappaturaIncompleta(d: Destinazione, colonne: Record<string, number>): string[] {
  const mancanti = d.campi.filter((c) => c.obbligatorio && !(colonne[c.key] > -1)).map((c) => c.label);
  for (const gruppo of d.almenoUno ?? []) {
    if (!gruppo.some((k) => colonne[k] > -1)) {
      mancanti.push(gruppo.map((k) => d.campi.find((c) => c.key === k)?.label ?? k).join(' o '));
    }
  }
  return mancanti;
}

function aggiungiCategoria(lista: string[], nome: string): string[] {
  const t = nome.trim();
  return t && !lista.some((c) => norm(c) === norm(t)) ? [...lista, t] : lista;
}

// --- Gestione economica ----------------------------------------------------------------------

/**
 * Costi ed entrate as Regia exports them. Not in the selector (the dedicated movimenti wizard
 * handles bank statements, with sign and replace options): it's here for the whole-file import.
 */
export const movimenti: Destinazione = {
  id: 'movimenti',
  area: 'Gestione economica',
  label: 'Movimenti (costi ed entrate)',
  descrizione: 'Costi ed entrate del conto economico, con data e importo.',
  fogli: ['Costi e entrate'],
  campi: [
    { key: 'data', label: 'Data', obbligatorio: true, sinonimi: ['data', 'date', 'giorno'] },
    { key: 'importo', label: 'Importo', obbligatorio: true, sinonimi: ['importo', 'amount', 'valore', 'euro'] },
    { key: 'descrizione', label: 'Descrizione', sinonimi: ['descrizione', 'description', 'causale'] },
    { key: 'categoria', label: 'Categoria', sinonimi: ['categoria', 'category'] },
    { key: 'tipo', label: 'Tipo (costo/entrata)', obbligatorio: true, sinonimi: ['tipo', 'type'] },
    { key: 'ricorrente', label: 'Ricorrente (sì/no)', sinonimi: ['ricorrente', 'recurring'] },
  ],
  importa(state, righe) {
    const e = esito();
    const lineItems = [...state.lineItems];
    let lineItemCategories = state.lineItemCategories;
    righe.forEach((r, i) => {
      const date = parseDateToISO(r.data);
      const valore = numero(r.importo);
      const t = norm(r.tipo);
      const type = ['costo', 'cost', 'uscita', 'spesa'].includes(t)
        ? ('cost' as const)
        : ['entrata', 'income', 'ricavo', 'incasso'].includes(t)
          ? ('income' as const)
          : null;
      if (!date || valore === null) return scarta(e, i, 'data o importo non leggibili');
      if (!type) return scarta(e, i, `tipo «${r.tipo}» non riconosciuto (costo o entrata)`);
      const amount = Math.abs(valore);
      const ricorrente = siNo(r.ricorrente);
      // Same date, description, amount and type = the same movimento: re-importing doesn't duplicate it.
      const chiave = `${date}|${norm(r.descrizione)}|${amount}|${type}`;
      const idx = lineItems.findIndex((l) => `${l.date}|${norm(l.description)}|${l.amount}|${l.type}` === chiave);
      if (idx > -1) {
        lineItems[idx] = {
          ...lineItems[idx],
          ...soloPieni({ category: r.categoria }),
          ...(ricorrente !== null ? { recurring: ricorrente } : {}),
        };
        e.aggiornati++;
      } else {
        lineItems.push({
          id: nanoid(),
          date,
          amount,
          type,
          description: r.descrizione,
          category: r.categoria,
          source: 'imported',
          recurring: ricorrente ?? false,
        });
        e.nuovi++;
      }
      lineItemCategories = aggiungiCategoria(lineItemCategories, r.categoria);
    });
    e.patch = { lineItems, lineItemCategories };
    return e;
  },
};

const fondi: Destinazione = {
  id: 'fondi',
  area: 'Gestione economica',
  label: 'Fondi disponibili',
  descrizione: 'Capitale disponibile: risparmi, investimenti, incassi già avvenuti.',
  fogli: ['Fondi'],
  campi: [
    { key: 'data', label: 'Data', obbligatorio: true, sinonimi: ['data', 'date', 'giorno'] },
    { key: 'importo', label: 'Importo', obbligatorio: true, sinonimi: ['importo', 'amount', 'valore', 'euro'] },
    { key: 'descrizione', label: 'Descrizione', sinonimi: ['descrizione', 'description', 'note'] },
    { key: 'categoria', label: 'Categoria', sinonimi: ['categoria', 'category', 'fonte'] },
  ],
  importa(state, righe) {
    const e = esito();
    const fundEntries = [...state.fundEntries];
    let fundCategories = state.fundCategories;
    righe.forEach((r, i) => {
      const date = parseDateToISO(r.data);
      const amount = numero(r.importo);
      if (!date || amount === null) return scarta(e, i, 'data o importo non leggibili');
      // Same date, description and amount = the same fund: re-importing doesn't duplicate it.
      const chiave = `${date}|${norm(r.descrizione)}|${amount}`;
      const idx = fundEntries.findIndex((f) => `${f.date}|${norm(f.description)}|${f.amount}` === chiave);
      if (idx > -1) {
        fundEntries[idx] = { ...fundEntries[idx], ...soloPieni({ category: r.categoria }) };
        e.aggiornati++;
      } else {
        fundEntries.push({ id: nanoid(), date, amount, description: r.descrizione, category: r.categoria });
        e.nuovi++;
      }
      fundCategories = aggiungiCategoria(fundCategories, r.categoria);
    });
    e.patch = { fundEntries, fundCategories };
    return e;
  },
};

const budget: Destinazione = {
  id: 'budget',
  area: 'Gestione economica',
  label: 'Voci di budget',
  descrizione: 'Voce e importo. Una riga «Budget totale previsto» imposta il budget totale.',
  fogli: ['Budget'],
  campi: [
    { key: 'voce', label: 'Voce', obbligatorio: true, sinonimi: ['voce', 'nome', 'descrizione'] },
    { key: 'importo', label: 'Importo', obbligatorio: true, sinonimi: ['importo', 'amount', 'valore', 'euro'] },
    { key: 'bloccato', label: 'Bloccato (sì/no)', sinonimi: ['bloccato', 'lock'] },
  ],
  importa(state, righe) {
    const e = esito();
    const budgetItems = [...state.budgetItems];
    let budgetTotale = state.budgetTotale;
    righe.forEach((r, i) => {
      const importo = numero(r.importo);
      if (!r.voce || importo === null) return scarta(e, i, 'voce o importo mancanti');
      if (norm(r.voce) === 'budget totale previsto') {
        budgetTotale = importo;
        e.aggiornati++;
        return;
      }
      const bloccato = siNo(r.bloccato);
      const idx = budgetItems.findIndex((b) => norm(b.nome) === norm(r.voce));
      if (idx > -1) {
        budgetItems[idx] = { ...budgetItems[idx], importo, ...(bloccato !== null ? { bloccato } : {}) };
        e.aggiornati++;
      } else {
        budgetItems.push({ id: nanoid(), nome: r.voce, importo, bloccato: bloccato ?? false });
        e.nuovi++;
      }
    });
    e.patch = { budgetItems, budgetTotale };
    return e;
  },
};

const impreseLegate: Destinazione = {
  id: 'imprese-legate',
  area: 'Gestione economica',
  label: 'Imprese associate e collegate',
  descrizione: 'Per la dimensione d’impresa: quota di partecipazione e dati di bilancio di ciascuna.',
  fogli: ['Dimensione impresa'],
  campi: [
    { key: 'nome', label: 'Impresa', obbligatorio: true, sinonimi: ['impresa', 'nome', 'ragione sociale', 'societa'] },
    { key: 'quota', label: 'Quota (%)', obbligatorio: true, sinonimi: ['quota', 'partecipazione', '%'] },
    { key: 'ula', label: 'ULA', sinonimi: ['ula', 'effettivi', 'dipendenti'] },
    { key: 'fatturato', label: 'Fatturato', sinonimi: ['fatturato', 'ricavi'] },
    { key: 'totaleBilancio', label: 'Totale di bilancio', sinonimi: ['totale bilancio', 'totale di bilancio', 'attivo'] },
    { key: 'controlloCda', label: 'Controllo del CdA (sì/no)', sinonimi: ['controllo cda', 'controllo'] },
    { key: 'investitoreEsente', label: 'Investitore esente (sì/no)', sinonimi: ['investitore esente', 'esente'] },
  ],
  importa(state, righe) {
    const e = esito();
    const imprese = [...state.dimensioneImpresa.imprese];
    righe.forEach((r, i) => {
      // Summary rows of Regia's own export are not companies.
      if (['la mia impresa', 'totale', 'dimensione'].includes(norm(r.nome))) return;
      const quota = numero(r.quota);
      if (!r.nome || quota === null) return scarta(e, i, 'nome o quota mancanti');
      const patch: Partial<ImpresaLegata> = soloPieni({
        quota,
        ula: numero(r.ula),
        fatturato: numero(r.fatturato),
        totaleBilancio: numero(r.totaleBilancio),
        controlloCda: siNo(r.controlloCda),
        investitoreEsente: siNo(r.investitoreEsente),
      });
      const idx = imprese.findIndex((x) => norm(x.nome) === norm(r.nome));
      if (idx > -1) {
        imprese[idx] = { ...imprese[idx], ...patch };
        e.aggiornati++;
      } else {
        imprese.push({
          id: nanoid(),
          nome: r.nome,
          quota,
          controlloCda: false,
          investitoreEsente: false,
          ula: null,
          fatturato: null,
          totaleBilancio: null,
          ...patch,
        });
        e.nuovi++;
      }
    });
    e.patch = { dimensioneImpresa: { ...state.dimensioneImpresa, imprese } };
    return e;
  },
};

// --- HR --------------------------------------------------------------------------------------

/** Finds a ruolo by name or creates it at the top of the organigramma. */
function ruoloPerNome(ruoli: AppState['ruoli'], nome: string): { ruoli: AppState['ruoli']; id: string } {
  const esistente = ruoli.find((r) => norm(r.nome) === norm(nome));
  if (esistente) return { ruoli, id: esistente.id };
  const id = nanoid();
  return { ruoli: [...ruoli, { id, nome: nome.trim(), superioreId: null }], id };
}

const dipendenti: Destinazione = {
  id: 'dipendenti',
  area: 'HR',
  label: 'Dipendenti',
  descrizione: 'L’anagrafica. I ruoli che non esistono ancora vengono creati.',
  fogli: ['Dipendenti'],
  almenoUno: [['nome', 'cognome', 'nominativo']],
  campi: [
    { key: 'nome', label: 'Nome', sinonimi: ['nome', 'first name', 'name'] },
    { key: 'cognome', label: 'Cognome', sinonimi: ['cognome', 'last name', 'surname'] },
    { key: 'nominativo', label: 'Nome e cognome (in una colonna)', sinonimi: ['nominativo', 'nome e cognome', 'nome cognome', 'dipendente'] },
    { key: 'ruolo', label: 'Ruolo', sinonimi: ['ruolo', 'mansione', 'posizione', 'qualifica'] },
    { key: 'dataNascita', label: 'Data di nascita', sinonimi: ['data nascita', 'data di nascita', 'nascita', 'compleanno'] },
    { key: 'dataAssunzione', label: 'Data di assunzione', sinonimi: ['data assunzione', 'data di assunzione', 'assunzione', 'assunto'] },
    { key: 'email', label: 'Email', sinonimi: ['email', 'e-mail', 'mail'] },
    { key: 'telefono', label: 'Telefono', sinonimi: ['telefono', 'cellulare', 'tel'] },
    { key: 'note', label: 'Note', sinonimi: ['note', 'notes'] },
  ],
  importa(state, righe) {
    const e = esito();
    const lista = [...state.dipendenti];
    let ruoli = state.ruoli;
    righe.forEach((r, i) => {
      let nome = r.nome;
      let cognome = r.cognome;
      if (!nome && !cognome && r.nominativo) {
        // "Mario Rossi": first word is the name, the rest the surname.
        const parti = r.nominativo.trim().split(/\s+/);
        nome = parti[0] ?? '';
        cognome = parti.slice(1).join(' ');
      }
      if (!nome && !cognome) return scarta(e, i, 'senza nome né cognome');
      let ruoloId: string | null = null;
      if (r.ruolo) ({ ruoli, id: ruoloId } = ruoloPerNome(ruoli, r.ruolo));
      const patch: Partial<Dipendente> = soloPieni({
        ruoloId,
        dataNascita: parseDateToISO(r.dataNascita),
        dataAssunzione: parseDateToISO(r.dataAssunzione),
        email: r.email,
        telefono: r.telefono,
        note: r.note,
      });
      const chiave = norm(`${nome} ${cognome}`);
      const idx = lista.findIndex((d) => norm(`${d.nome} ${d.cognome}`) === chiave);
      if (idx > -1) {
        lista[idx] = { ...lista[idx], ...patch };
        e.aggiornati++;
      } else {
        lista.push({
          id: nanoid(),
          nome,
          cognome,
          dataNascita: '',
          ruoloId: null,
          email: '',
          telefono: '',
          dataAssunzione: '',
          note: '',
          ...patch,
        });
        e.nuovi++;
      }
    });
    e.patch = { dipendenti: lista, ruoli };
    return e;
  },
};

const ruoli: Destinazione = {
  id: 'ruoli',
  area: 'HR',
  label: 'Ruoli (organigramma)',
  descrizione: 'Ruolo e a chi riporta: costruisce l’organigramma. I superiori mancanti vengono creati.',
  fogli: ['Ruoli'],
  campi: [
    { key: 'ruolo', label: 'Ruolo', obbligatorio: true, sinonimi: ['ruolo', 'nome', 'posizione'] },
    { key: 'riportaA', label: 'Riporta a', sinonimi: ['riporta a', 'superiore', 'responsabile', 'capo'] },
  ],
  importa(state, righe) {
    const e = esito();
    let lista = state.ruoli;
    // First every ruolo, then the hierarchy: a row may point to a ruolo defined further down.
    righe.forEach((r, i) => {
      if (!r.ruolo) return scarta(e, i, 'ruolo mancante');
      const esisteva = lista.some((x) => norm(x.nome) === norm(r.ruolo));
      ({ ruoli: lista } = ruoloPerNome(lista, r.ruolo));
      if (esisteva) e.aggiornati++;
      else e.nuovi++;
    });
    for (const r of righe) {
      if (!r.ruolo || !r.riportaA) continue;
      const figlio = lista.find((x) => norm(x.nome) === norm(r.ruolo))!;
      let superioreId: string;
      ({ ruoli: lista, id: superioreId } = ruoloPerNome(lista, r.riportaA));
      if (wouldCreateCycle(lista, figlio.id, superioreId)) {
        e.note.push(`«${r.ruolo}» non può riportare a «${r.riportaA}»: l’organigramma girerebbe in tondo.`);
        continue;
      }
      lista = lista.map((x) => (x.id === figlio.id ? { ...x, superioreId } : x));
    }
    e.patch = { ruoli: lista };
    return e;
  },
};

// --- Governance ------------------------------------------------------------------------------

/** Most specific first: "comitato per il controllo sulla gestione" must not match "gestione". */
const PAROLE_ORGANO: Array<[OrganoId, string[]]> = [
  ['comitato-controllo', ['comitato']],
  ['consiglio-sorveglianza', ['sorveglianza']],
  ['consiglio-gestione', ['gestione']],
  ['collegio-sindacale', ['collegio', 'sindac']],
  ['revisore', ['revision', 'revisore']],
  ['cda', ['amministrazione', 'cda', 'c.d.a', 'amministratore']],
  ['assemblea', ['assemblea', 'soci']],
];

export function organoDa(testo: string): OrganoId | null {
  const v = norm(testo);
  if (!v) return null;
  const esatto = (Object.keys(ORGANI) as OrganoId[]).find((id) => norm(ORGANI[id].nome) === v || id === v);
  if (esatto) return esatto;
  return PAROLE_ORGANO.find(([, parole]) => parole.some((p) => v.includes(p)))?.[0] ?? null;
}

const membriOrgani: Destinazione = {
  id: 'organi',
  area: 'Governance',
  label: 'Membri degli organi',
  descrizione: 'Chi siede in quale organo e con che carica. Una riga «Modello» sceglie il modello di governance.',
  fogli: ['Governance'],
  campi: [
    { key: 'organo', label: 'Organo', obbligatorio: true, sinonimi: ['organo'] },
    { key: 'persona', label: 'Persona', obbligatorio: true, sinonimi: ['persona', 'nome', 'membro', 'componente'] },
    { key: 'carica', label: 'Carica', sinonimi: ['carica', 'ruolo'] },
  ],
  importa(state, righe) {
    const e = esito();
    const membri = [...state.governance.membri];
    let modello = state.governance.modello;
    righe.forEach((r, i) => {
      if (norm(r.organo) === 'modello') {
        const m = MODELLI.find((x) => norm(x.nome) === norm(r.persona) || x.id === norm(r.persona));
        if (m) modello = m.id;
        return;
      }
      const organo = organoDa(r.organo);
      if (!organo) return scarta(e, i, `organo «${r.organo}» non riconosciuto`);
      if (!r.persona) return scarta(e, i, 'persona mancante');
      const persona = personaDa(r.persona, state.dipendenti);
      const chiave = persona.dipendenteId ?? norm(persona.nomeEsterno);
      const idx = membri.findIndex(
        (m) => m.organo === organo && (m.dipendenteId ?? norm(m.nomeEsterno)) === chiave,
      );
      if (idx > -1) {
        membri[idx] = { ...membri[idx], ...soloPieni({ carica: r.carica }) };
        e.aggiornati++;
      } else {
        const nuovo: MembroOrgano = { id: nanoid(), organo, ...persona, carica: r.carica || ORGANI[organo].caricaDefault };
        membri.push(nuovo);
        e.nuovi++;
      }
    });
    e.patch = { governance: { modello, membri } };
    return e;
  },
};

// --- Supply Chain ----------------------------------------------------------------------------

function attivitaDa(testo: string): AttivitaPorter | null {
  const v = norm(testo);
  if (!v) return null;
  const esatta = ATTIVITA.find((a) => norm(a.nome) === v || a.id === v);
  if (esatta) return esatta.id;
  // Loose match on the distinctive word: "entrata", "operative", "vendite", "approvvigionament"…
  const parole: Array<[AttivitaPorter, string[]]> = [
    ['logistica-entrata', ['entrata', 'inbound']],
    ['logistica-uscita', ['uscita', 'outbound']],
    ['operations', ['operativ', 'operations', 'produzione']],
    ['marketing-vendite', ['marketing', 'vendit']],
    ['servizi', ['post-vendita', 'post vendita', 'assistenza', 'servizi']],
    ['infrastruttura', ['infrastruttura']],
    ['risorse-umane', ['risorse umane', 'personale', 'hr']],
    ['tecnologia', ['tecnologia', 'r&s', 'ricerca']],
    ['approvvigionamento', ['approvvigion', 'acquisti', 'procurement']],
  ];
  return parole.find(([, p]) => p.some((x) => v.includes(x)))?.[0] ?? null;
}

function tipoAttoreDa(testo: string): TipoAttore {
  const v = norm(testo);
  return TIPI_ATTORE.find((t) => norm(t.label) === v || t.id === v)?.id ?? 'altro';
}

const attoriFiliera: Destinazione = {
  id: 'filiera',
  area: 'Supply Chain',
  label: 'Attori della filiera',
  descrizione: 'Chi presidia ogni attività della catena del valore, per prodotto. I prodotti mancanti vengono creati.',
  fogli: ['Supply chain'],
  campi: [
    { key: 'prodotto', label: 'Prodotto', obbligatorio: true, sinonimi: ['prodotto', 'servizio'] },
    { key: 'attivita', label: 'Attività (Porter)', obbligatorio: true, sinonimi: ['attivita', 'fase'] },
    { key: 'attore', label: 'Attore', obbligatorio: true, sinonimi: ['attore', 'fornitore', 'nome', 'soggetto'] },
    { key: 'tipo', label: 'Tipo (interno, fornitore…)', sinonimi: ['tipo'] },
    { key: 'note', label: 'Note', sinonimi: ['note'] },
  ],
  importa(state, righe) {
    const e = esito();
    let prodotti = state.supplyChain.prodotti;
    const attori = [...state.supplyChain.attori];
    righe.forEach((r, i) => {
      const attivita = attivitaDa(r.attivita);
      if (!r.prodotto || !r.attore) return scarta(e, i, 'prodotto o attore mancanti');
      if (!attivita) return scarta(e, i, `attività «${r.attivita}» non riconosciuta`);
      let prodotto = prodotti.find((p) => norm(p.nome) === norm(r.prodotto));
      if (!prodotto) {
        prodotto = { id: nanoid(), nome: r.prodotto.trim(), descrizione: '' };
        prodotti = [...prodotti, prodotto];
      }
      const tipo = r.tipo ? tipoAttoreDa(r.tipo) : null;
      const persona = tipo === 'interno' ? personaDa(r.attore, state.dipendenti) : null;
      const idx = attori.findIndex(
        (a) => a.prodottoId === prodotto!.id && a.attivita === attivita && norm(a.nome || '') === norm(r.attore),
      );
      const idxDip = persona?.dipendenteId
        ? attori.findIndex((a) => a.prodottoId === prodotto!.id && a.attivita === attivita && a.dipendenteId === persona.dipendenteId)
        : -1;
      const trovato = idx > -1 ? idx : idxDip;
      if (trovato > -1) {
        attori[trovato] = { ...attori[trovato], ...soloPieni({ tipo, note: r.note }) };
        e.aggiornati++;
      } else {
        attori.push({
          id: nanoid(),
          prodottoId: prodotto.id,
          attivita,
          tipo: tipo ?? 'altro',
          dipendenteId: persona?.dipendenteId ?? null,
          nome: persona?.dipendenteId ? '' : r.attore.trim(),
          note: r.note,
        });
        e.nuovi++;
      }
    });
    e.patch = { supplyChain: { prodotti, attori } };
    return e;
  },
};

// --- Progetti --------------------------------------------------------------------------------

const STATI: Array<[StatoProgetto, string[]]> = [
  ['idea', ['idea']],
  ['pronto', ['pronto']],
  ['candidato', ['candidato']],
  ['in-corso', ['in corso', 'in-corso', 'avviato']],
  ['chiuso', ['chiuso', 'concluso']],
  ['revocato', ['revocato']],
];

function statoDa(testo: string): StatoProgetto | null {
  const v = norm(testo);
  return STATI.find(([, p]) => p.includes(v))?.[0] ?? null;
}

const progetti: Destinazione = {
  id: 'progetti',
  area: 'Progetti',
  label: 'Progetti (portafoglio)',
  descrizione: 'L’elenco dei progetti con stato, bando, date e budget.',
  fogli: ['Progetti - Portafoglio'],
  campi: [
    { key: 'titolo', label: 'Progetto', obbligatorio: true, sinonimi: ['progetto', 'titolo', 'nome'] },
    { key: 'stato', label: 'Stato', sinonimi: ['stato'] },
    { key: 'bando', label: 'Bando', sinonimi: ['bando'] },
    { key: 'inizio', label: 'Data di inizio', sinonimi: ['inizio', 'data inizio', 'data di inizio'] },
    { key: 'durata', label: 'Durata (mesi)', sinonimi: ['durata mesi', 'durata'] },
    { key: 'budget', label: 'Budget', sinonimi: ['budget', 'budget totale'] },
  ],
  importa(state, righe) {
    const e = esito();
    const lista = [...state.progetti.progetti];
    righe.forEach((r, i) => {
      if (!r.titolo) return scarta(e, i, 'titolo mancante');
      const idx = lista.findIndex((p) => norm(p.titolo) === norm(r.titolo));
      const base = idx > -1 ? lista[idx] : nuovoProgetto(r.titolo.trim());
      const aggiornato: Progetto = {
        ...base,
        ...soloPieni({
          stato: statoDa(r.stato),
          dataInizio: parseDateToISO(r.inizio),
          durataMesi: numero(r.durata),
          budgetTotale: numero(r.budget),
        }),
        bando: r.bando ? { ...base.bando, nome: r.bando } : base.bando,
      };
      if (idx > -1) {
        lista[idx] = aggiornato;
        e.aggiornati++;
      } else {
        lista.push(aggiornato);
        e.nuovi++;
      }
    });
    e.patch = {
      progetti: { ...state.progetti, progetti: lista, progettoAttivoId: state.progetti.progettoAttivoId ?? lista[0]?.id ?? null },
    };
    return e;
  },
};

/**
 * Rows for one project: the one named in the «progetto» column, or the active one. Returns the
 * project to edit, or a note when there's none.
 */
function progettoPerRiga(state: AppState, lista: Progetto[], nome: string): Progetto | string {
  if (nome) {
    return lista.find((p) => norm(p.titolo) === norm(nome)) ?? `progetto «${nome}» non trovato (crealo prima nel Portafoglio)`;
  }
  return lista.find((p) => p.id === state.progetti.progettoAttivoId) ?? 'nessun progetto attivo: scegline uno o indica la colonna «progetto»';
}

function orDa(p: Progetto, testo: string): ObiettivoRealizzativo | null {
  const ordinati = orOrdinati(p);
  const m = norm(testo).match(/^(?:or|wp)\s*(\d+)$/);
  if (m) return ordinati[Number(m[1]) - 1] ?? null;
  return ordinati.find((o) => norm(o.titolo) === norm(testo)) ?? null;
}

/** OR number n, creating empty ORs up to it if needed. */
function orNumero(p: Progetto, n: number): { p: Progetto; or: ObiettivoRealizzativo } {
  let q = p;
  while (orOrdinati(q).length < n) q = aggiungiOr(q);
  return { p: q, or: orOrdinati(q)[n - 1] };
}

const taskWbs: Destinazione = {
  id: 'task',
  area: 'Progetti',
  label: 'WBS: OR e task',
  descrizione:
    'Gli OR e i loro task. Righe con codice «OR n» aggiornano l’OR, righe «n.m» o con la colonna OR sono task. Senza la colonna progetto vanno nel progetto attivo.',
  fogli: ['Progetti - WBS'],
  almenoUno: [['titolo', 'codice']],
  campi: [
    { key: 'progetto', label: 'Progetto', sinonimi: ['progetto'] },
    { key: 'codice', label: 'Codice (OR 1, 1.2…)', sinonimi: ['codice', 'cod', 'id'] },
    { key: 'or', label: 'OR di appartenenza', sinonimi: ['or', 'obiettivo realizzativo', 'wp', 'work package'] },
    { key: 'titolo', label: 'Titolo', sinonimi: ['titolo', 'task', 'attivita', 'nome'] },
    { key: 'tipologia', label: 'Tipologia (RI/SS)', sinonimi: ['tipologia', 'tp', 'tipo'] },
    { key: 'mesi', label: 'Mesi (es. M1–M4)', sinonimi: ['mesi', 'periodo'] },
    { key: 'meseInizio', label: 'Mese di inizio', sinonimi: ['mese inizio', 'da mese', 'inizio'] },
    { key: 'meseFine', label: 'Mese di fine', sinonimi: ['mese fine', 'a mese', 'fine'] },
    { key: 'avanzamento', label: 'Avanzamento (%)', sinonimi: ['avanzamento', 'completamento', '%'] },
    { key: 'responsabile', label: 'OR Leader', sinonimi: ['responsabile', 'or leader', 'leader'] },
  ],
  importa(state, righe) {
    const e = esito();
    let lista = [...state.progetti.progetti];
    righe.forEach((r, i) => {
      const trovato = progettoPerRiga(state, lista, r.progetto);
      if (typeof trovato === 'string') return scarta(e, i, trovato);
      let p = trovato;
      const tip = tipologia(r.tipologia);
      const mesi = intervalloMesi(r.mesi);
      const codiceOr = norm(r.codice).match(/^(?:or|wp)\s*(\d+)$/);
      const codiceTask = norm(r.codice).match(/^(\d+)\.(\d+)$/);

      if (codiceOr) {
        // An OR row.
        const n = Number(codiceOr[1]);
        const esisteva = orOrdinati(p).length >= n;
        let or: ObiettivoRealizzativo;
        ({ p, or } = orNumero(p, n));
        const patch: Partial<ObiettivoRealizzativo> = soloPieni({
          titolo: r.titolo,
          tipologia: tip,
          leader: r.responsabile ? personaDa(r.responsabile, state.dipendenti) : null,
        });
        p = { ...p, or: p.or.map((o) => (o.id === or.id ? { ...o, ...patch } : o)) };
        if (esisteva) e.aggiornati++;
        else e.nuovi++;
      } else {
        // A task row: find its OR from the «OR» column or from the code n.m.
        if (!r.titolo) return scarta(e, i, 'task senza titolo');
        let or: ObiettivoRealizzativo | null = null;
        if (r.or) {
          or = orDa(p, r.or);
          if (!or) {
            p = aggiungiOr(p);
            const nuovo = orOrdinati(p)[orOrdinati(p).length - 1];
            p = { ...p, or: p.or.map((o) => (o.id === nuovo.id ? { ...o, titolo: r.or.trim(), tipologia: tip } : o)) };
            or = orOrdinati(p).find((o) => o.id === nuovo.id)!;
          }
        } else if (codiceTask) {
          ({ p, or } = orNumero(p, Number(codiceTask[1])));
        }
        if (!or) return scarta(e, i, 'non si capisce a quale OR appartiene (serve la colonna OR o un codice come 1.2)');
        if (tip && !or.tipologia) p = { ...p, or: p.or.map((o) => (o.id === or!.id ? { ...o, tipologia: tip } : o)) };

        const inizio = mesi?.[0] ?? numero(r.meseInizio);
        const fine = mesi?.[1] ?? numero(r.meseFine);
        const avanzamento = numero(r.avanzamento);
        const patch = soloPieni({
          titolo: r.titolo,
          meseInizio: inizio,
          meseFine: fine,
          avanzamentoPct: avanzamento !== null ? Math.min(Math.max(avanzamento, 0), 100) : null,
        });
        const esistente = taskDiOr(p, or.id).find((t) => norm(t.titolo) === norm(r.titolo));
        if (esistente) {
          p = { ...p, task: p.task.map((t) => (t.id === esistente.id ? { ...t, ...patch } : t)) };
          e.aggiornati++;
        } else {
          p = aggiungiTask(p, or.id);
          const nuovo = p.task[p.task.length - 1];
          p = { ...p, task: p.task.map((t) => (t.id === nuovo.id ? { ...t, ...patch } : t)) };
          e.nuovi++;
        }
      }
      lista = lista.map((x) => (x.id === p.id ? p : x));
    });
    e.patch = { progetti: { ...state.progetti, progetti: lista } };
    return e;
  },
};

function tipoRischioDa(testo: string): TipoRischio | null {
  const v = norm(testo);
  return (['tecnico', 'gestionale', 'economico'] as const).find((t) => v.includes(t)) ?? null;
}

function statoRischioDa(testo: string): StatoRischio | null {
  const v = norm(testo);
  if (v.includes('controllo')) return 'sotto-controllo';
  if (v.includes('chius')) return 'chiuso';
  if (v.includes('apert')) return 'aperto';
  return null;
}

function scala(testo: string): number | null {
  const n = numero(testo);
  return n === null ? null : Math.min(Math.max(Math.round(n), 1), 5);
}

const rischi: Destinazione = {
  id: 'rischi',
  area: 'Progetti',
  label: 'Rischi',
  descrizione: 'Il registro dei rischi. Senza la colonna progetto vanno nel progetto attivo.',
  fogli: ['Progetti - Rischi'],
  campi: [
    { key: 'progetto', label: 'Progetto', sinonimi: ['progetto'] },
    { key: 'descrizione', label: 'Descrizione', obbligatorio: true, sinonimi: ['descrizione', 'rischio'] },
    { key: 'tipo', label: 'Tipo (tecnico, gestionale, economico)', sinonimi: ['tipo'] },
    { key: 'or', label: 'OR collegato', sinonimi: ['or', 'obiettivo realizzativo', 'wp'] },
    { key: 'probabilita', label: 'Probabilità (1–5)', sinonimi: ['probabilita', 'prob'] },
    { key: 'impatto', label: 'Impatto (1–5)', sinonimi: ['impatto'] },
    { key: 'segnale', label: 'Segnale da monitorare', sinonimi: ['segnale'] },
    { key: 'azione', label: 'Azione / prevenzione', sinonimi: ['azione o prevenzione', 'azione', 'prevenzione'] },
    { key: 'responsabile', label: 'Responsabile', sinonimi: ['responsabile'] },
    { key: 'stato', label: 'Stato', sinonimi: ['stato'] },
  ],
  importa(state, righe) {
    const e = esito();
    let lista = [...state.progetti.progetti];
    righe.forEach((r, i) => {
      const trovato = progettoPerRiga(state, lista, r.progetto);
      if (typeof trovato === 'string') return scarta(e, i, trovato);
      const p = trovato;
      if (!r.descrizione) return scarta(e, i, 'descrizione mancante');
      const orId = r.or && norm(r.or) !== 'progetto' ? (orDa(p, r.or)?.id ?? null) : null;
      const patch: Partial<Rischio> = soloPieni({
        tipo: tipoRischioDa(r.tipo),
        orId,
        probabilita: scala(r.probabilita),
        impatto: scala(r.impatto),
        segnale: r.segnale,
        azione: r.azione,
        responsabile: r.responsabile ? personaDa(r.responsabile, state.dipendenti) : null,
        stato: statoRischioDa(r.stato),
      });
      const idx = p.rischi.findIndex((x) => norm(x.descrizione) === norm(r.descrizione));
      let rischiP: Rischio[];
      if (idx > -1) {
        rischiP = p.rischi.map((x, j) => (j === idx ? { ...x, ...patch } : x));
        e.aggiornati++;
      } else {
        rischiP = [
          ...p.rischi,
          {
            id: nanoid(),
            tipo: 'tecnico',
            descrizione: r.descrizione,
            orId: null,
            probabilita: 3,
            impatto: 3,
            segnale: '',
            azione: '',
            responsabile: { dipendenteId: null, nomeEsterno: '' },
            stato: 'aperto',
            ...patch,
          },
        ];
        e.nuovi++;
      }
      lista = lista.map((x) => (x.id === p.id ? { ...p, rischi: rischiP } : x));
    });
    e.patch = { progetti: { ...state.progetti, progetti: lista } };
    return e;
  },
};

/** Every destination except «movimenti», which keeps its own dedicated wizard. */
export const DESTINAZIONI: Destinazione[] = [
  fondi,
  budget,
  impreseLegate,
  dipendenti,
  ruoli,
  membriOrgani,
  attoriFiliera,
  progetti,
  taskWbs,
  rischi,
];

export function destinazione(id: string): Destinazione | undefined {
  return DESTINAZIONI.find((d) => d.id === id);
}
