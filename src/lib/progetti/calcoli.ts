import { addDays, addMonths, differenceInCalendarDays, differenceInCalendarMonths, format, isValid, parseISO, subDays } from 'date-fns';
import { nanoid } from 'nanoid';
import type {
  CriterioValutazione,
  Dipendente,
  ObiettivoRealizzativo,
  Persona,
  Progetto,
  Riunione,
  Sal,
  Task,
  TipoSoggetto,
  TipologiaRS,
} from '../../types/domain';
import type { ClasseImpresa } from '../dimensione/dimensione';
import { fullName } from '../hr/hr';
import { DOCUMENTI_SAL } from './defaults';

// --- Persone ---------------------------------------------------------------------------------

export function nomePersona(p: Persona, dipendenti: Dipendente[]): string {
  if (p.dipendenteId) {
    const d = dipendenti.find((x) => x.id === p.dipendenteId);
    return d ? fullName(d) || 'Senza nome' : 'Dipendente rimosso';
  }
  return p.nomeEsterno.trim();
}

/** Same person across roles: the dipendente, or the external name case/space-insensitively. */
export function chiavePersona(p: Persona): string | null {
  if (p.dipendenteId) return `d:${p.dipendenteId}`;
  const n = p.nomeEsterno.trim().toLowerCase().replace(/\s+/g, ' ');
  return n ? `e:${n}` : null;
}

// --- Struttura: OR e task --------------------------------------------------------------------

export function orOrdinati(p: Progetto): ObiettivoRealizzativo[] {
  return [...p.or].sort((a, b) => a.ordine - b.ordine);
}

export function taskDiOr(p: Progetto, orId: string): Task[] {
  return p.task.filter((t) => t.orId === orId).sort((a, b) => a.ordine - b.ordine);
}

/** The words for the WBS parts of this project: OR (bandi nazionali) or WP (bandi europei). */
export function termini(p: Pick<Progetto, 'nomenclatura'>) {
  const wp = p.nomenclatura === 'WP';
  return {
    sigla: wp ? 'WP' : 'OR',
    singolare: wp ? 'Work Package' : 'Obiettivo realizzativo',
    plurale: wp ? 'Work Package' : 'Obiettivi realizzativi',
    leader: wp ? 'WP Leader' : 'OR Leader',
    /** "l'OR" / "il WP" */
    il: wp ? 'il WP' : "l'OR",
    /** "dell'OR" / "del WP" */
    del: wp ? 'del WP' : "dell'OR",
  };
}

/** OR/WP codes follow their position, not the stored `ordine`, so they never have gaps. */
export function codiceOr(p: Progetto, orId: string): string {
  return `${termini(p).sigla} ${orOrdinati(p).findIndex((o) => o.id === orId) + 1}`;
}

export function codiceTask(p: Progetto, task: Task): string {
  const n = orOrdinati(p).findIndex((o) => o.id === task.orId) + 1;
  const m = taskDiOr(p, task.orId).findIndex((t) => t.id === task.id) + 1;
  return `${n}.${m}`;
}

export function tipologiaTask(p: Progetto, task: Task): TipologiaRS | null {
  return p.or.find((o) => o.id === task.orId)?.tipologia ?? null;
}

/** OR months: the manual override if set, otherwise derived from its tasks (null if none). */
export function mesiOr(p: Progetto, or: ObiettivoRealizzativo): { inizio: number | null; fine: number | null } {
  const tasks = taskDiOr(p, or.id);
  const inizio = or.meseInizio ?? (tasks.length ? Math.min(...tasks.map((t) => t.meseInizio)) : null);
  const fine = or.meseFine ?? (tasks.length ? Math.max(...tasks.map((t) => t.meseFine)) : null);
  return { inizio, fine };
}

/** Average progress of an OR, weighted by each task's length in months. */
export function avanzamentoOr(p: Progetto, orId: string): number {
  const tasks = taskDiOr(p, orId);
  const pesi = tasks.map((t) => Math.max(t.meseFine - t.meseInizio + 1, 1));
  const tot = pesi.reduce((s, x) => s + x, 0);
  if (tot === 0) return 0;
  return tasks.reduce((s, t, i) => s + t.avanzamentoPct * pesi[i], 0) / tot;
}

export function costoTask(t: Task): number {
  return Object.values(t.costiStimati).reduce((s, v) => s + (v || 0), 0);
}

export function costoStimatoTotale(p: Progetto): number {
  return p.task.reduce((s, t) => s + costoTask(t), 0);
}

// --- Date ------------------------------------------------------------------------------------

function data(iso: string): Date | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
}

/** Month N of the project (M1 = the month that starts on dataInizio): first and last day. */
export function periodoMese(p: Progetto, mese: number): { dal: Date; al: Date } | null {
  const inizio = data(p.dataInizio);
  if (!inizio) return null;
  const dal = addMonths(inizio, mese - 1);
  return { dal, al: subDays(addMonths(inizio, mese), 1) };
}

export function fineProgetto(p: Progetto): Date | null {
  return p.durataMesi ? (periodoMese(p, p.durataMesi)?.al ?? null) : null;
}

/** Fractional month position of `oggi` on the Gantt (0 = start of M1), null outside the project. */
export function posizioneOggi(p: Progetto, oggi: Date = new Date()): number | null {
  const inizio = data(p.dataInizio);
  if (!inizio || !p.durataMesi) return null;
  const mesi = differenceInCalendarMonths(oggi, inizio) - (oggi.getDate() < inizio.getDate() ? 1 : 0);
  if (mesi < 0 || mesi >= p.durataMesi) return null;
  const meseCorrente = periodoMese(p, mesi + 1)!;
  const giorniMese = differenceInCalendarDays(meseCorrente.al, meseCorrente.dal) + 1;
  return mesi + differenceInCalendarDays(oggi, meseCorrente.dal) / giorniMese;
}

export function isoGiorno(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

// --- Portafoglio -----------------------------------------------------------------------------

export interface Punteggio {
  progettoId: string;
  somma: number;
  mediaPesata: number | null;
  votiMancanti: number;
}

/** Sum of the votes (as on the slide) and Σ(voto × peso) / Σ(pesi) over the votes given. */
export function punteggio(criteri: CriterioValutazione[], p: Progetto): Punteggio {
  let somma = 0;
  let pesato = 0;
  let pesi = 0;
  let votiMancanti = 0;
  for (const c of criteri) {
    const v = p.voti[c.id];
    if (!v) {
      votiMancanti++;
      continue;
    }
    somma += v;
    pesato += v * c.peso;
    pesi += c.peso;
  }
  return { progettoId: p.id, somma, mediaPesata: pesi > 0 ? pesato / pesi : null, votiMancanti };
}

export const STATI_VALUTABILI: Progetto['stato'][] = ['idea', 'pronto'];

export interface Classifica {
  punteggi: Punteggio[];
  /**
   * Projects with the highest weighted average (ties broken by the sum). More than one means a
   * genuine tie: marking just one would be an arbitrary pick dressed up as a result.
   */
  prioritariIds: string[];
  /** True when ranking by sum and by weighted average disagree. */
  ordiniDiversi: boolean;
}

export function classificaPortafoglio(criteri: CriterioValutazione[], progetti: Progetto[]): Classifica {
  const punteggi = progetti.filter((p) => STATI_VALUTABILI.includes(p.stato)).map((p) => punteggio(criteri, p));
  const conVoti = punteggi.filter((x) => x.mediaPesata !== null);
  const perMedia = [...conVoti].sort((a, b) => b.mediaPesata! - a.mediaPesata! || b.somma - a.somma);
  const perSomma = [...conVoti].sort((a, b) => b.somma - a.somma || b.mediaPesata! - a.mediaPesata!);
  return {
    punteggi,
    prioritariIds: perMedia
      .filter((x) => x.mediaPesata === perMedia[0].mediaPesata && x.somma === perMedia[0].somma)
      .map((x) => x.progettoId),
    ordiniDiversi: perMedia.some((x, i) => x.progettoId !== perSomma[i].progettoId),
  };
}

// --- Aiuti e SAL -----------------------------------------------------------------------------

/**
 * Our row of the bando's aid intensity: the class computed in Dimensione d'impresa when
 * available, else whatever the "nostra impresa" partner says. With effective collaboration the
 * bando's maggiorazione is added, capped at 80% (the GBER ceiling for R&S).
 */
export function intensitaNostra(p: Progetto, classe: ClasseImpresa | null): { tipo: TipoSoggetto; ri: number; ss: number } {
  const noi = p.partner.find((x) => x.isNostraImpresa);
  const tipo: TipoSoggetto = classe ?? noi?.tipo ?? 'piccola';
  const riga = p.bando.intensita.find((i) => i.tipo === tipo) ?? { ri: 0, ss: 0 };
  const extra = p.collaborazioneEffettiva ? (p.bando.maggiorazionePct ?? 0) : 0;
  return { tipo, ri: Math.min(riga.ri + extra, 80), ss: Math.min(riga.ss + extra, 80) };
}

export interface PeriodoSal {
  numero: number;
  meseDa: number;
  meseA: number;
  dal: Date;
  al: Date;
  scadenza: Date | null; // fine SAL + giorni del bando
  target: Date; // fine SAL + target interno
}

export function periodiSal(p: Progetto): PeriodoSal[] {
  if (!data(p.dataInizio) || !p.durataMesi || p.salMesi < 1) return [];
  const out: PeriodoSal[] = [];
  for (let n = 1, da = 1; da <= p.durataMesi; n++, da += p.salMesi) {
    const a = Math.min(da + p.salMesi - 1, p.durataMesi);
    const dal = periodoMese(p, da)!.dal;
    const al = periodoMese(p, a)!.al;
    out.push({
      numero: n,
      meseDa: da,
      meseA: a,
      dal,
      al,
      scadenza: p.bando.giorniPresentazioneSal !== null ? addDays(al, p.bando.giorniPresentazioneSal) : null,
      target: addDays(al, p.targetInternoGiorni),
    });
  }
  return out;
}

export type CostiRS = Record<TipologiaRS, Record<string, number>>;

/**
 * Planned costs in months [da, a]: each task's estimate spread evenly over its months, split by
 * RI/SS through its OR. Tasks of an unclassified OR can't be split and are left out (the WBS
 * warns about the missing tipologia).
 */
export function costiPianificati(p: Progetto, da: number, a: number): CostiRS {
  const out: CostiRS = { RI: {}, SS: {} };
  for (const t of p.task) {
    const tip = tipologiaTask(p, t);
    if (!tip) continue;
    const durata = Math.max(t.meseFine - t.meseInizio + 1, 1);
    const sovrapposti = Math.max(Math.min(t.meseFine, a) - Math.max(t.meseInizio, da) + 1, 0);
    if (sovrapposti === 0) continue;
    for (const [cat, v] of Object.entries(t.costiStimati)) {
      if (!v) continue;
      out[tip][cat] = (out[tip][cat] ?? 0) + (v * sovrapposti) / durata;
    }
  }
  return out;
}

export function totaleCosti(c: CostiRS, tip?: TipologiaRS): number {
  const tipi: TipologiaRS[] = tip ? [tip] : ['RI', 'SS'];
  return tipi.reduce((s, x) => s + Object.values(c[x]).reduce((t, v) => t + (v || 0), 0), 0);
}

export function contributoAtteso(rendicontati: CostiRS, intensita: { ri: number; ss: number }): number {
  return (totaleCosti(rendicontati, 'RI') * intensita.ri + totaleCosti(rendicontati, 'SS') * intensita.ss) / 100;
}

export function salVuoto(numero: number): Sal {
  return { id: nanoid(), numero, stato: 'aperto', costiRendicontati: { RI: {}, SS: {} }, documenti: {} };
}

/** The stored SAL for each computed period, creating empty ones as needed (never deletes). */
export function allineaSal(p: Progetto): Sal[] {
  const periodi = periodiSal(p);
  const sal = [...p.sal];
  for (const per of periodi) if (!sal.some((s) => s.numero === per.numero)) sal.push(salVuoto(per.numero));
  return sal.sort((a, b) => a.numero - b.numero);
}

export function documentiMancanti(p: Progetto, sal: Sal): number {
  let mancanti = 0;
  for (const or of p.or) for (const doc of DOCUMENTI_SAL) if (!sal.documenti[or.id]?.[doc]) mancanti++;
  return mancanti;
}

// --- Rischi ----------------------------------------------------------------------------------

export type LivelloRischio = 'basso' | 'medio' | 'alto';

/** Probabilità × impatto: basso ≤ 6, medio 8–12, alto ≥ 15 (7, 11, 13, 14 non sono possibili). */
export function livelloRischio(probabilita: number, impatto: number): { punteggio: number; livello: LivelloRischio } {
  const punteggio = probabilita * impatto;
  return { punteggio, livello: punteggio >= 15 ? 'alto' : punteggio >= 8 ? 'medio' : 'basso' };
}

// --- Riunioni --------------------------------------------------------------------------------

/**
 * The meeting calendar from the project dates: kick-off on day one, a Steering Committee every
 * 2 months, one a week before each SAL closes, and the closing meeting on the last day.
 * Meetings already held (or with notes) are kept as they are; the rest are regenerated.
 */
export function generaRiunioni(p: Progetto): Riunione[] {
  const inizio = data(p.dataInizio);
  const fine = fineProgetto(p);
  if (!inizio || !fine) return p.riunioni;

  const nuove: Array<Omit<Riunione, 'id' | 'fatta' | 'nota'>> = [{ tipo: 'kick-off', data: isoGiorno(inizio) }];
  for (let m = 2; addMonths(inizio, m) < fine; m += 2) {
    nuove.push({ tipo: 'steering-committee', data: isoGiorno(addMonths(inizio, m)) });
  }
  for (const s of periodiSal(p)) nuove.push({ tipo: 'pre-sal', data: isoGiorno(subDays(s.al, 7)) });
  nuove.push({ tipo: 'chiusura', data: isoGiorno(fine) });

  const tenute = p.riunioni.filter((r) => r.fatta || r.nota.trim());
  const chiave = (r: { tipo: string; data: string }) => `${r.tipo}|${r.data}`;
  const giaTenute = new Set(tenute.map(chiave));
  return [
    ...tenute,
    ...nuove.filter((r) => !giaTenute.has(chiave(r))).map((r) => ({ ...r, id: nanoid(), fatta: false, nota: '' })),
  ].sort((a, b) => a.data.localeCompare(b.data));
}

// --- Avvisi ----------------------------------------------------------------------------------

export function avvisiScheda(p: Progetto): string[] {
  const out: string[] = [];
  const max = p.bando.durataMaxMesi;
  if (p.durataMesi && max && p.durataMesi > max) {
    out.push(`Il progetto dura ${p.durataMesi} mesi, il bando ne ammette al massimo ${max}.`);
  }
  const { spesaMin: min, spesaMax: mx } = p.bando;
  if (p.budgetTotale !== null && ((min !== null && p.budgetTotale < min) || (mx !== null && p.budgetTotale > mx))) {
    const eur = (n: number | null) => (n === null ? '—' : n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }));
    out.push(`Il budget è fuori dal range ammesso (${eur(min)} – ${eur(mx)}).`);
  }
  return out;
}

export function avvisiWbs(p: Progetto): string[] {
  const out: string[] = [];
  const ors = orOrdinati(p);
  if (ors.length > 0 && (ors.length < 5 || ors.length > 10)) {
    out.push(`Il progetto ha ${ors.length} ${termini(p).sigla}: la buona pratica è tra 5 e 10.`);
  }
  for (const or of ors) {
    const cod = codiceOr(p, or.id);
    if (!or.tipologia) out.push(`${cod} non è classificato come RI o SS.`);
    if (or.partnerIds.length > 1) {
      out.push(`${cod} è a partecipazione mista: va bene per system integration e test, altrimenti valuta di dividerlo.`);
    }
    if (!chiavePersona(or.leader)) out.push(`${cod} non ha un ${termini(p).leader}.`);
    const testo = `${or.titolo} ${or.obiettivo}`.toLowerCase();
    if (or.tipologia === 'RI' && testo.includes("stato dell'arte") && !/\btrl\b/.test(testo)) {
      out.push(`${cod}: se parli di stato dell'arte, esplicita che parti da TRL 3/4.`);
    }
    for (const t of taskDiOr(p, or.id)) {
      const ct = codiceTask(p, t);
      if ((or.meseInizio !== null && t.meseInizio < or.meseInizio) || (or.meseFine !== null && t.meseFine > or.meseFine)) {
        out.push(`Il task ${ct} esce dai mesi ${termini(p).del}.`);
      }
      if (!p.deliverable.some((d) => d.taskId === t.id)) out.push(`Il task ${ct} non produce nessun deliverable.`);
      if (or.tipologia === 'SS') {
        const ricercaNonFinita = t.predecessoriIds
          .map((id) => p.task.find((x) => x.id === id))
          .some((q) => q && tipologiaTask(p, q) === 'RI' && t.meseInizio <= q.meseFine);
        if (ricercaNonFinita) out.push(`Il task ${ct} (SS) parte prima che finisca la ricerca da cui dipende.`);
      }
    }
  }
  return out;
}

export function avvisiOrganizzazione(p: Progetto): string[] {
  const out: string[] = [];
  const sc = p.organizzazione.filter((m) => m.ruolo === 'steering-committee');
  if (sc.length < 3 || sc.length > 5) out.push(`Lo Steering Committee ha ${sc.length} membri: ne servono 3–5.`);
  const pm = p.organizzazione.find((m) => m.ruolo === 'pm');
  const chiavePm = pm ? chiavePersona(pm) : null;
  if (chiavePm && !sc.some((m) => chiavePersona(m) === chiavePm)) {
    out.push('Il PM deve presiedere lo Steering Committee.');
  }
  return out;
}

export function avvisiGantt(p: Progetto, oggi: Date = new Date()): string[] {
  return p.milestone
    .filter((m) => {
      const fine = periodoMese(p, m.mese)?.al;
      return !m.raggiunta && fine && fine < oggi;
    })
    .sort((a, b) => a.mese - b.mese)
    .map((m) => `${m.codice || 'Una milestone'} è in ritardo: aggiorna il Gantt.`);
}

export function avvisiSal(p: Progetto, oggi: Date = new Date()): string[] {
  const out: string[] = [];
  const sal = allineaSal(p);
  for (const per of periodiSal(p)) {
    const s = sal.find((x) => x.numero === per.numero)!;
    if (per.scadenza && per.target > per.scadenza) {
      out.push(`SAL ${per.numero}: il target interno cade dopo la scadenza del bando.`);
    }
    const chiuso = s.stato !== 'aperto' && s.stato !== 'in-preparazione';
    if (per.scadenza && !chiuso) {
      const giorni = differenceInCalendarDays(per.scadenza, oggi);
      const mancanti = documentiMancanti(p, s);
      if (giorni >= 0 && giorni < 15 && mancanti > 0) {
        out.push(`SAL ${per.numero}: mancano ${giorni} giorni e ${mancanti} documenti.`);
      }
    }
    const pianificati = costiPianificati(p, per.meseDa, per.meseA);
    for (const tip of ['RI', 'SS'] as const) {
      for (const [cat, v] of Object.entries(s.costiRendicontati[tip] ?? {})) {
        if (v > (pianificati[tip][cat] ?? 0) + 0.005) {
          out.push(`SAL ${per.numero}: sforamento su ${cat} (${tip}).`);
        }
      }
    }
  }
  return out;
}
