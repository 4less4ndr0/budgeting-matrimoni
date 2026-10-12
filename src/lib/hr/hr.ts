import { differenceInCalendarDays, differenceInYears, getDaysInMonth, isValid, parseISO, startOfDay } from 'date-fns';
import type { Dipendente, Ruolo } from '../../types/domain';

export interface OrgNode {
  ruolo: Ruolo;
  dipendenti: Dipendente[];
  figli: OrgNode[];
}

/**
 * Builds the organigramma forest from the flat ruoli list. A ruolo whose superiore doesn't
 * exist (deleted, or never set) becomes a root. Any ruolo caught in a cycle (shouldn't happen,
 * the store refuses to create one, but hand-edited snapshots could) is also promoted to root
 * so it's never silently dropped from the chart.
 */
export function buildOrgTree(ruoli: Ruolo[], dipendenti: Dipendente[]): OrgNode[] {
  const byId = new Map(ruoli.map((r) => [r.id, r]));
  const childrenOf = new Map<string | null, Ruolo[]>();
  for (const r of ruoli) {
    const parent = r.superioreId && byId.has(r.superioreId) && !isInCycle(r.id, byId) ? r.superioreId : null;
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), r]);
  }

  const build = (r: Ruolo): OrgNode => ({
    ruolo: r,
    dipendenti: dipendenti
      .filter((d) => d.ruoloId === r.id)
      .sort((a, b) => fullName(a).localeCompare(fullName(b), 'it')),
    figli: (childrenOf.get(r.id) ?? []).map(build),
  });

  return (childrenOf.get(null) ?? []).map(build);
}

function isInCycle(id: string, byId: Map<string, Ruolo>): boolean {
  const seen = new Set<string>();
  let current = byId.get(id)?.superioreId ?? null;
  while (current && byId.has(current)) {
    if (current === id) return true;
    if (seen.has(current)) return false; // cycle further up, not through `id`
    seen.add(current);
    current = byId.get(current)?.superioreId ?? null;
  }
  return false;
}

/** True if making `superioreId` the superiore of `ruoloId` would close a loop (incl. itself). */
export function wouldCreateCycle(ruoli: Ruolo[], ruoloId: string, superioreId: string | null): boolean {
  if (superioreId === null) return false;
  const byId = new Map(ruoli.map((r) => [r.id, r]));
  const seen = new Set<string>();
  let current: string | null = superioreId;
  while (current) {
    if (current === ruoloId) return true;
    if (seen.has(current)) return false;
    seen.add(current);
    current = byId.get(current)?.superioreId ?? null;
  }
  return false;
}

export function fullName(d: Pick<Dipendente, 'nome' | 'cognome'>): string {
  return `${d.nome} ${d.cognome}`.trim();
}

function parseDate(iso: string): Date | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
}

export interface BirthdayInfo {
  /** Next occurrence of the birthday, today included. */
  prossimo: Date;
  giorniMancanti: number; // 0 = oggi
  /** Age they turn on `prossimo`. */
  eta: number;
}

/** null if dataNascita is missing/invalid. Feb 29 birthdays fall on Feb 28 in non-leap years. */
export function nextBirthday(dataNascita: string, today: Date = new Date()): BirthdayInfo | null {
  const nascita = parseDate(dataNascita);
  if (!nascita) return null;
  const oggi = startOfDay(today);
  // Native setFullYear would roll Feb 29 over to Mar 1 in non-leap years: clamp instead.
  const inYear = (year: number) =>
    new Date(year, nascita.getMonth(), Math.min(nascita.getDate(), getDaysInMonth(new Date(year, nascita.getMonth()))));
  let prossimo = inYear(oggi.getFullYear());
  if (differenceInCalendarDays(prossimo, oggi) < 0) prossimo = inYear(oggi.getFullYear() + 1);
  return {
    prossimo,
    giorniMancanti: differenceInCalendarDays(prossimo, oggi),
    eta: prossimo.getFullYear() - nascita.getFullYear(),
  };
}

export function eta(dataNascita: string, today: Date = new Date()): number | null {
  const nascita = parseDate(dataNascita);
  return nascita ? differenceInYears(today, nascita) : null;
}

/** Years of service, null if dataAssunzione is missing/invalid or in the future. */
export function anzianita(dataAssunzione: string, today: Date = new Date()): number | null {
  const assunzione = parseDate(dataAssunzione);
  if (!assunzione || assunzione > today) return null;
  return differenceInYears(today, assunzione);
}

/** Dipendenti with a birthday in the next `giorni` days (today included), soonest first. */
export function prossimiCompleanni(
  dipendenti: Dipendente[],
  giorni: number,
  today: Date = new Date(),
): Array<{ dipendente: Dipendente; info: BirthdayInfo }> {
  return dipendenti
    .map((dipendente) => ({ dipendente, info: nextBirthday(dipendente.dataNascita, today) }))
    .filter((x): x is { dipendente: Dipendente; info: BirthdayInfo } => x.info !== null && x.info.giorniMancanti <= giorni)
    .sort((a, b) => a.info.giorniMancanti - b.info.giorniMancanti);
}
