import type { ImpresaLegata } from '../../types/domain';

/**
 * Dimensione d'impresa secondo la Raccomandazione 2003/361/CE (DM 18 aprile 2005):
 * il criterio degli effettivi (ULA) è obbligatorio, poi basta rispettare UNO dei due criteri
 * finanziari (fatturato o totale di bilancio).
 */
export type ClasseImpresa = 'micro' | 'piccola' | 'media' | 'grande';

export interface Soglia {
  classe: Exclude<ClasseImpresa, 'grande'>;
  ulaMax: number; // strettamente inferiore
  fatturatoMax: number; // minore o uguale
  bilancioMax: number; // minore o uguale
}

export const SOGLIE: Soglia[] = [
  { classe: 'micro', ulaMax: 10, fatturatoMax: 2_000_000, bilancioMax: 2_000_000 },
  { classe: 'piccola', ulaMax: 50, fatturatoMax: 10_000_000, bilancioMax: 10_000_000 },
  { classe: 'media', ulaMax: 250, fatturatoMax: 50_000_000, bilancioMax: 43_000_000 },
];

export const NOME_CLASSE: Record<ClasseImpresa, string> = {
  micro: 'Micro impresa',
  piccola: 'Piccola impresa',
  media: 'Media impresa',
  grande: 'Grande impresa',
};

export type TipoRelazione = 'autonoma' | 'associata' | 'collegata';

export interface Relazione {
  tipo: TipoRelazione;
  /** Share of the other company's figures that adds up to ours (0–1). */
  peso: number;
}

/**
 * - collegata: maggioranza (> 50%) oppure diritto di nominare la maggioranza del CdA → 100%;
 * - associata: almeno il 25% (fino al 50%) → pro quota;
 * - autonoma: sotto il 25%, o tra 25% e 50% se a detenerla è un investitore "esente" → 0.
 */
export function relazione(i: Pick<ImpresaLegata, 'quota' | 'controlloCda' | 'investitoreEsente'>): Relazione {
  const q = Number.isFinite(i.quota) ? i.quota : 0;
  if (i.controlloCda || q > 50) return { tipo: 'collegata', peso: 1 };
  if (q >= 25 && !i.investitoreEsente) return { tipo: 'associata', peso: q / 100 };
  return { tipo: 'autonoma', peso: 0 };
}

export interface Dati {
  ula: number | null;
  fatturato: number | null;
  totaleBilancio: number | null;
}

/**
 * Our figures plus the linked companies' ones, weighted by relazione. A figure missing on our
 * side stays missing (we can't guess it); one missing on a linked company counts as 0 and is
 * reported in `incomplete` so the UI can say the result may be underestimated.
 */
export function totaliConLegate(
  propri: Dati,
  imprese: ImpresaLegata[],
): Dati & { incomplete: string[] } {
  const incomplete: string[] = [];
  const somma = (proprio: number | null, campo: keyof Dati) => {
    if (proprio === null) return null;
    let tot = proprio;
    for (const i of imprese) {
      const { peso } = relazione(i);
      if (peso === 0) continue;
      const v = i[campo];
      if (v === null) {
        if (!incomplete.includes(i.id)) incomplete.push(i.id);
        continue;
      }
      tot += v * peso;
    }
    return tot;
  };
  return {
    ula: somma(propri.ula, 'ula'),
    fatturato: somma(propri.fatturato, 'fatturato'),
    totaleBilancio: somma(propri.totaleBilancio, 'totaleBilancio'),
    incomplete,
  };
}

export interface EsitoSoglia {
  soglia: Soglia;
  ulaOk: boolean | null;
  fatturatoOk: boolean | null;
  bilancioOk: boolean | null;
  /** ULA ok AND (fatturato ok OR bilancio ok); null if it can't be decided yet. */
  rispettata: boolean | null;
}

export interface Classificazione {
  classe: ClasseImpresa | null; // null = mancano le ULA
  /** True when neither financial figure is known: the class comes from ULA alone. */
  provvisoria: boolean;
  esiti: EsitoSoglia[];
}

export function classifica(d: Dati): Classificazione {
  const esiti = SOGLIE.map((soglia): EsitoSoglia => {
    const ulaOk = d.ula === null ? null : d.ula < soglia.ulaMax;
    const fatturatoOk = d.fatturato === null ? null : d.fatturato <= soglia.fatturatoMax;
    const bilancioOk = d.totaleBilancio === null ? null : d.totaleBilancio <= soglia.bilancioMax;
    const finanziario =
      fatturatoOk === true || bilancioOk === true
        ? true
        : fatturatoOk === null && bilancioOk === null
          ? null
          : false;
    const rispettata = ulaOk === false || finanziario === false ? false : ulaOk && finanziario ? true : null;
    return { soglia, ulaOk, fatturatoOk, bilancioOk, rispettata };
  });

  if (d.ula === null) return { classe: null, provvisoria: true, esiti };
  const provvisoria = d.fatturato === null && d.totaleBilancio === null;
  // Provisional: judge by ULA alone (the only mandatory criterion we know).
  const prima = esiti.find((e) => (provvisoria ? e.ulaOk : e.rispettata));
  return { classe: prima ? prima.soglia.classe : 'grande', provvisoria, esiti };
}

/** "100% A + 25% B + 41% C" — the formula as written in the course notes. */
export function formula(nomeProprio: string, imprese: ImpresaLegata[]): string {
  const parti = [`100% ${nomeProprio}`];
  for (const i of imprese) {
    const { peso } = relazione(i);
    if (peso > 0) parti.push(`${Math.round(peso * 10000) / 100}% ${i.nome.trim() || 'impresa senza nome'}`);
  }
  return parti.join(' + ');
}

/**
 * Our own company's class as the Dimensione d'impresa page computes it: ULA from the HR
 * headcount unless overridden, plus the linked companies. Shared so Progetti can pick the right
 * aid intensity without re-deriving it.
 */
export function classeNostraImpresa(
  dim: { ulaManuale: number | null; fatturato: number | null; totaleBilancio: number | null; imprese: ImpresaLegata[] },
  numeroDipendenti: number,
): ClasseImpresa | null {
  const propri = { ula: dim.ulaManuale ?? numeroDipendenti, fatturato: dim.fatturato, totaleBilancio: dim.totaleBilancio };
  return classifica(totaliConLegate(propri, dim.imprese)).classe;
}
