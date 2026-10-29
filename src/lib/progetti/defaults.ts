import { nanoid } from 'nanoid';
import type {
  CriterioValutazione,
  IntensitaAiuto,
  Progetti,
  Progetto,
  Rischio,
  SchedaBando,
  TipoSoggetto,
} from '../../types/domain';

/** Check list di valutazione dei progetti (L5 · slide 5): 1 = cattivo, 5 = eccellente. */
export function criteriPredefiniti(): CriterioValutazione[] {
  return [
    { id: 'costo', nome: 'Costo totale del progetto', peso: 1, nota: '5 = costo favorevole (basso)' },
    { id: 'successo', nome: 'Probabilità di successo tecnico', peso: 1, nota: '' },
    { id: 'investimenti', nome: 'Necessità di investimenti iniziali', peso: 1, nota: '5 = servono pochi investimenti' },
    { id: 'brevetti', nome: 'Brevettabilità dei risultati', peso: 1, nota: '' },
    { id: 'redditivita', nome: 'Redditività incrementale', peso: 1, nota: '' },
  ];
}

/** Categorie di costo ammissibili (art. 5 visto in L4), modificabili dalla scheda bando. */
export const CATEGORIE_COSTO_PREDEFINITE = [
  'Personale',
  'Strumenti e attrezzature',
  'Consulenze e servizi',
  'Spese generali',
  'Materiali',
];

/** Documenti da raccogliere per ogni OR a ogni SAL. */
export const DOCUMENTI_SAL = [
  'Time sheet del personale',
  'Ordini di servizio',
  'DSAN sui requisiti del personale',
  'Relazione tecnica semestrale',
  'Deliverable del periodo',
  'Giustificativi di spesa con pagamento tracciabile',
];

export const TIPI_SOGGETTO: Array<{ id: TipoSoggetto; label: string }> = [
  { id: 'micro', label: 'Micro impresa' },
  { id: 'piccola', label: 'Piccola impresa' },
  { id: 'media', label: 'Media impresa' },
  { id: 'grande', label: 'Grande impresa' },
  { id: 'organismo-ricerca', label: 'Organismo di ricerca' },
];

export function bandoVuoto(): SchedaBando {
  return {
    nome: '',
    link: '',
    dataRilevazione: '',
    scadenza: '',
    obiettivi: '',
    ambiti: [],
    beneficiari: '',
    ateco: [],
    regime: null,
    caratteristiche: '',
    spesaMin: null,
    spesaMax: null,
    durataMaxMesi: null,
    categorieCosto: [...CATEGORIE_COSTO_PREDEFINITE],
    intensita: TIPI_SOGGETTO.map((t) => ({ tipo: t.id, ri: 0, ss: 0 })),
    finanziamentoAgevolatoPct: null,
    maggiorazionePct: null,
    erogazione: '',
    giorniPresentazioneSal: null,
    criteriValutazione: '',
    modulistica: [],
    modalitaPresentazione: '',
    notaBene: '',
  };
}

/**
 * "Accordi per l'innovazione (MIMIT)": intensità e maggiorazioni dell'art. 6 viste in L4 e range
 * di spesa 5–40 mln €. Micro e piccola hanno le stesse intensità. Si applica sopra la scheda
 * esistente: sovrascrive solo questi campi, il resto resta com'è.
 */
export function presetAccordiInnovazione(bando: SchedaBando): SchedaBando {
  const intensita: IntensitaAiuto[] = [
    { tipo: 'micro', ri: 45, ss: 45 },
    { tipo: 'piccola', ri: 45, ss: 45 },
    { tipo: 'media', ri: 35, ss: 35 },
    { tipo: 'grande', ri: 25, ss: 25 },
    { tipo: 'organismo-ricerca', ri: 50, ss: 25 },
  ];
  return {
    ...bando,
    nome: bando.nome || "Accordi per l'innovazione (MIMIT)",
    regime: 'gber',
    spesaMin: 5_000_000,
    spesaMax: 40_000_000,
    intensita,
    finanziamentoAgevolatoPct: 20,
    maggiorazionePct: 15,
  };
}

/** Rischi tipici visti in L4, precompilati su ogni progetto nuovo (eliminabili). */
export function rischiPredefiniti(): Rischio[] {
  const base = {
    orId: null,
    probabilita: 3,
    impatto: 3,
    segnale: '',
    azione: '',
    responsabile: { dipendenteId: null, nomeEsterno: '' },
    stato: 'aperto' as const,
  };
  return [
    { ...base, id: nanoid(), tipo: 'tecnico', descrizione: 'Risultati ottenuti diversi da quelli attesi' },
    { ...base, id: nanoid(), tipo: 'gestionale', descrizione: 'Competenze del gruppo di lavoro insufficienti' },
    { ...base, id: nanoid(), tipo: 'gestionale', descrizione: 'Binario morto nella ricerca che ritarda il Gantt' },
    { ...base, id: nanoid(), tipo: 'economico', descrizione: 'Costi spesi diversi da quelli pianificati' },
  ];
}

export function nuovoProgetto(titolo: string): Progetto {
  return {
    id: nanoid(),
    stato: 'idea',
    titolo,
    sintesi: '',
    capofila: '',
    infoPartenariato: '',
    ambito: '',
    attivitaPrevalente: null,
    dataInizio: '',
    durataMesi: null,
    budgetTotale: null,
    cofinanziamento: null,
    collaborazioneEffettiva: false,
    partner: [{ id: nanoid(), nome: '', tipo: 'piccola', numeroAssociato: 1, isNostraImpresa: true }],
    bando: bandoVuoto(),
    voti: {},
    or: [],
    task: [],
    deliverable: [],
    milestone: [],
    organizzazione: [],
    riunioni: [],
    rischi: rischiPredefiniti(),
    salMesi: 6,
    targetInternoGiorni: 45,
    sal: [],
  };
}

export function progettiVuoti(): Progetti {
  return { criteri: criteriPredefiniti(), progetti: [], progettoAttivoId: null };
}

/**
 * Backfills a Progetto saved by an older build (or a hand-edited snapshot): every field the
 * current shape expects is there, nested bando included.
 */
export function withProgettoDefaults(p: Partial<Progetto> & { id: string }): Progetto {
  const base = nuovoProgetto('');
  return {
    ...base,
    rischi: [],
    ...p,
    bando: { ...bandoVuoto(), ...p.bando },
  };
}

export function withProgettiDefaults(p: Partial<Progetti> | undefined): Progetti {
  const vuoti = progettiVuoti();
  return {
    criteri: p?.criteri ?? vuoti.criteri,
    progetti: (p?.progetti ?? []).map(withProgettoDefaults),
    progettoAttivoId: p?.progettoAttivoId ?? null,
  };
}

/**
 * When a dipendente is deleted their seats in every project (OR Leader, organizzazione, rischi)
 * stay, turned into an external person with the same name — same rule as Governance.
 */
export function sganciaDipendente(progetti: Progetti, dipendenteId: string, nome: string): Progetti {
  const fix = <T extends { dipendenteId: string | null; nomeEsterno: string }>(p: T): T =>
    p.dipendenteId === dipendenteId ? { ...p, dipendenteId: null, nomeEsterno: nome } : p;
  return {
    ...progetti,
    progetti: progetti.progetti.map((p) => ({
      ...p,
      or: p.or.map((o) => ({ ...o, leader: fix(o.leader) })),
      organizzazione: p.organizzazione.map(fix),
      rischi: p.rischi.map((r) => ({ ...r, responsabile: fix(r.responsabile) })),
    })),
  };
}
