export type EntryType = 'cost' | 'income';

export interface LineItem {
  id: string;
  date: string; // ISO yyyy-mm-dd
  category: string;
  description: string;
  amount: number; // always positive; sign implied by `type`
  type: EntryType;
  source: 'imported' | 'manual';
  // Marks this row as part of a recurring series (display only — the calc engine treats it
  // like any other dated row; the actual monthly rows are real materialized LineItems, not a
  // calc-time projection). Toggling it on a not-yet-expanded item generates one real LineItem
  // per month through targetBreakEvenDate, all sharing `recurringGroupId`.
  recurring: boolean;
  recurringGroupId?: string;
}

export interface FundEntry {
  id: string;
  date: string; // ISO yyyy-mm-dd
  amount: number; // capital available (savings, investment, prior revenue already collected)
  description: string;
  category: string;
}

/** A free-form voce di budget: name + amount, shown as a slice of the donut chart in "Budget". */
export interface BudgetItem {
  id: string;
  nome: string;
  importo: number;
  bloccato: boolean; // locked: importo is frozen while reallocating the other voci
}

export type RevenueModelType = 'simple' | 'funnel';

export interface SimpleModelAssumptions {
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  wholesalePrice: number;
  tier1SitesPerMonth: number;
  tier2SitesPerMonth: number;
  tier3SitesPerMonth: number;
  wholesaleSitesPerMonth: number;
  monthlyGrowthRatePct: number;
}

export type SaleMode = 'direct' | 'referral_commission';

export interface FunnelModelAssumptions {
  monthlyLeads: number;
  activePartnerships: number;
  conversionRatePct: number;
  saleMode: SaleMode;
  avgSalePrice: number;
  commissionRatePct: number;
  monthlyGrowthRatePct: number;
}

export interface RevenueAssumptions {
  activeModel: RevenueModelType;
  simple: SimpleModelAssumptions;
  funnel: FunnelModelAssumptions;
  projectionStartDate: string; // ISO yyyy-mm-dd, default = today
  costRunRateOverride: number | null; // null = auto trailing 3-month average
  targetBreakEvenDate: string; // ISO yyyy-mm-dd, default = today + 6 months
}

export interface MonthlyProjection {
  month: string; // yyyy-MM
  actualCost: number;
  actualIncome: number;
  projectedCost: number;
  projectedRevenue: number;
  netCashFlow: number;
  burnRate: number; // = -netCashFlow; positive means burning cash
  cumulativeFunds: number;
  cumulativeCosts: number;
  cumulativeRevenue: number;
  cumulativePosition: number; // cumulativeFunds + cumulativeRevenue - cumulativeCosts
  cumulativeNetProfit: number; // cumulativeRevenue - cumulativeCosts, EXCLUDING cumulativeFunds — P&L view, not cash position
  isBreakEven: boolean;
}

export type BreakEvenStatus = 'ahead' | 'on-track' | 'behind' | 'at-risk';

export interface BreakEvenResult {
  status: BreakEvenStatus;
  breakEvenMonth: string | null;
  targetMonth: string;
  monthsDelta: number | null; // negative = ahead, positive = behind, null if at-risk
}

export type BurnInputMode = 'aggregate' | 'detailed';
export type RunwayProjectionMode = 'static' | 'dynamic';

export interface RunwayDetailedBurn {
  salariesAndTeam: number;
  toolsAndSoftware: number;
  officeAndOperations: number;
  marketingAndSales: number;
  other: number;
}

export interface RunwayAssumptions {
  burnInputMode: BurnInputMode;
  projectionMode: RunwayProjectionMode;
  cashAvailable: number; // valore libero scelto dall'utente, scollegato dai Fondi disponibili
  aggregateMonthlyBurn: number;
  detailedBurn: RunwayDetailedBurn;
  monthlyRevenue: number;
  burnGrowthPct: number; // usato solo in modalità dynamic
  revenueGrowthPct: number; // usato solo in modalità dynamic
}

export interface RunwayResult {
  totalMonthlyBurn: number;
  netMonthlyBurn: number; // totalMonthlyBurn - monthlyRevenue, prima di eventuale crescita
  isProfitable: boolean;
  runwayMonths: number | null; // con decimali; null quando isProfitable
}

/**
 * Un ruolo aziendale (HR). I ruoli, collegati tra loro da `superioreId`, formano l'albero
 * dell'organigramma; i dipendenti si appendono al proprio ruolo.
 */
export interface Ruolo {
  id: string;
  nome: string;
  superioreId: string | null; // null = ruolo di vertice
}

export interface Dipendente {
  id: string;
  nome: string;
  cognome: string;
  dataNascita: string; // ISO yyyy-mm-dd, '' = non indicata
  ruoloId: string | null; // null = nessun ruolo assegnato
  email: string;
  telefono: string;
  dataAssunzione: string; // ISO yyyy-mm-dd, '' = non indicata
  note: string;
}

/**
 * I tre sistemi di amministrazione e controllo delle S.p.A. italiane. "Dualistico orizzontale"
 * è il sistema tradizionale (CdA e collegio sindacale affiancati, entrambi nominati
 * dall'assemblea); "dualistico verticale" è il dualistico vero e proprio (sorveglianza sopra
 * la gestione).
 */
export type ModelloGovernance = 'monistico' | 'dualistico-verticale' | 'dualistico-orizzontale';

export type OrganoId =
  | 'assemblea'
  | 'cda'
  | 'collegio-sindacale'
  | 'consiglio-sorveglianza'
  | 'consiglio-gestione'
  | 'comitato-controllo'
  | 'revisore';

/** Una persona dentro un organo: un dipendente dell'anagrafica oppure un esterno (nome libero). */
export interface MembroOrgano {
  id: string;
  organo: OrganoId;
  dipendenteId: string | null; // null = persona esterna, vedi nomeEsterno
  nomeEsterno: string;
  carica: string;
}

export interface Governance {
  modello: ModelloGovernance | null; // null = non ancora scelto
  // Tenuti per organo, non per modello: cambiando modello gli organi in comune (assemblea,
  // CdA, revisore) conservano i loro membri, gli altri restano salvati ma nascosti.
  membri: MembroOrgano[];
}

/** Le nove attività della catena del valore di Porter: 5 primarie + 4 di supporto. */
export type AttivitaPorter =
  | 'logistica-entrata'
  | 'operations'
  | 'logistica-uscita'
  | 'marketing-vendite'
  | 'servizi'
  | 'infrastruttura'
  | 'risorse-umane'
  | 'tecnologia'
  | 'approvvigionamento';

export type TipoAttore = 'interno' | 'fornitore' | 'partner' | 'distributore' | 'consulente' | 'altro';

export interface Prodotto {
  id: string;
  nome: string;
  descrizione: string;
}

/** Chi presidia un'attività della catena del valore per un certo prodotto. */
export interface AttoreFiliera {
  id: string;
  prodottoId: string;
  attivita: AttivitaPorter;
  tipo: TipoAttore;
  dipendenteId: string | null; // solo per tipo 'interno': collegato all'anagrafica HR
  nome: string; // nome libero; ignorato in visualizzazione se dipendenteId è valorizzato
  note: string;
}

export interface SupplyChain {
  prodotti: Prodotto[];
  attori: AttoreFiliera[];
}

/**
 * Un'impresa che detiene quote della nostra o in cui la nostra detiene quote: ai fini della
 * dimensione d'impresa (Raccomandazione 2003/361/CE) i suoi dati si sommano pro quota
 * (associata) o al 100% (collegata).
 */
export interface ImpresaLegata {
  id: string;
  nome: string;
  quota: number; // % di partecipazione (capitale o diritti di voto), la più alta tra le due direzioni
  controlloCda: boolean; // diritto di nominare/revocare la maggioranza del CdA → collegata anche sotto il 50%
  investitoreEsente: boolean; // venture capital, università, investitori istituzionali… → resta autonoma fino al 50%
  ula: number | null;
  fatturato: number | null;
  totaleBilancio: number | null;
}

export interface DimensioneImpresa {
  esercizio: string; // es. "2025": ultimo esercizio contabile chiuso
  ulaManuale: number | null; // null = numero di dipendenti dell'anagrafica HR
  fatturato: number | null; // voce A.1 del Conto Economico
  totaleBilancio: number | null; // totale attivo dello Stato Patrimoniale
  imprese: ImpresaLegata[];
}

// ---------------------------------------------------------------------------------------------
// Progetti (project management di progetti di R&S co-finanziati) — vedi project-management-spec
// ---------------------------------------------------------------------------------------------

export type StatoProgetto = 'idea' | 'pronto' | 'candidato' | 'in-corso' | 'chiuso' | 'revocato';
export type TipologiaRS = 'RI' | 'SS'; // ricerca industriale / sviluppo sperimentale
export type TipoSoggetto = 'micro' | 'piccola' | 'media' | 'grande' | 'organismo-ricerca';

/** Un posto nel progetto: un dipendente dell'anagrafica oppure una persona esterna. */
export interface Persona {
  dipendenteId: string | null;
  nomeEsterno: string;
}

export interface Partner {
  id: string;
  nome: string;
  tipo: TipoSoggetto;
  numeroAssociato: number; // 1 = capofila
  isNostraImpresa: boolean; // true → tipo letto da Dimensione d'impresa
}

export interface CriterioValutazione {
  id: string;
  nome: string;
  peso: number;
  nota: string;
}

export interface IntensitaAiuto {
  tipo: TipoSoggetto;
  ri: number; // %
  ss: number; // %
}

export interface SchedaBando {
  nome: string;
  link: string;
  dataRilevazione: string;
  scadenza: string;
  obiettivi: string;
  ambiti: string[];
  beneficiari: string;
  ateco: string[];
  regime: 'gber' | 'de-minimis' | 'altro' | null;
  caratteristiche: string;
  spesaMin: number | null;
  spesaMax: number | null;
  durataMaxMesi: number | null;
  categorieCosto: string[];
  intensita: IntensitaAiuto[];
  finanziamentoAgevolatoPct: number | null;
  maggiorazionePct: number | null; // punti in più con collaborazione effettiva
  erogazione: string; // anticipo / SAL / saldo
  giorniPresentazioneSal: number | null;
  criteriValutazione: string;
  modulistica: string[];
  modalitaPresentazione: string;
  notaBene: string;
}

export interface ObiettivoRealizzativo {
  id: string;
  ordine: number;
  titolo: string;
  obiettivo: string;
  tipologia: TipologiaRS | null;
  leader: Persona;
  partnerIds: string[];
  meseInizio: number | null; // null = derivato dai task
  meseFine: number | null;
}

export interface Task {
  id: string;
  orId: string;
  ordine: number;
  titolo: string;
  meseInizio: number;
  meseFine: number;
  partnerIds: string[];
  predecessoriIds: string[];
  costiStimati: Record<string, number>; // categoria → €
  avanzamentoPct: number;
}

export type StatoDeliverable = 'da-fare' | 'in-revisione' | 'approvato';

export interface Deliverable {
  id: string;
  taskId: string;
  codice: string;
  titolo: string;
  mese: number;
  stato: StatoDeliverable;
}

export interface Milestone {
  id: string;
  codice: string;
  titolo: string;
  mese: number;
  deliverableIds: string[];
  raggiunta: boolean;
}

export type RuoloCommessa = 'steering-committee' | 'pm' | 'ra' | 'referente-istruttori' | 'gruppo-lavoro';

export interface MembroCommessa extends Persona {
  id: string;
  ruolo: RuoloCommessa;
  orId: string | null; // solo per gruppo-lavoro
}

export type TipoRiunione = 'kick-off' | 'steering-committee' | 'pre-sal' | 'chiusura';

export interface Riunione {
  id: string;
  tipo: TipoRiunione;
  data: string;
  fatta: boolean;
  nota: string;
}

export type TipoRischio = 'tecnico' | 'gestionale' | 'economico';
export type StatoRischio = 'aperto' | 'sotto-controllo' | 'chiuso';

export interface Rischio {
  id: string;
  tipo: TipoRischio;
  descrizione: string;
  orId: string | null; // null = progetto nel suo complesso
  probabilita: number; // 1–5
  impatto: number; // 1–5
  segnale: string;
  azione: string; // "prevenzione" per i rischi economici
  responsabile: Persona;
  stato: StatoRischio;
}

export type StatoSal = 'aperto' | 'in-preparazione' | 'presentato' | 'approvato' | 'erogato';

export interface Sal {
  id: string;
  numero: number;
  stato: StatoSal;
  costiRendicontati: Record<TipologiaRS, Record<string, number>>; // RI/SS → categoria → €
  documenti: Record<string, Record<string, boolean>>; // orId → documento → raccolto
}

export interface Progetto {
  id: string;
  stato: StatoProgetto;
  titolo: string;
  sintesi: string;
  capofila: string;
  infoPartenariato: string;
  ambito: string;
  attivitaPrevalente: TipologiaRS | null;
  dataInizio: string;
  durataMesi: number | null;
  budgetTotale: number | null;
  cofinanziamento: number | null;
  // Aggiunto alla bozza della spec: la maggiorazione del bando si applica al contributo
  // atteso solo se c'è davvero collaborazione effettiva tra i partner.
  collaborazioneEffettiva: boolean;
  partner: Partner[];
  bando: SchedaBando;
  voti: Record<string, number>; // criterioId → 1–5
  or: ObiettivoRealizzativo[];
  task: Task[];
  deliverable: Deliverable[];
  milestone: Milestone[];
  organizzazione: MembroCommessa[];
  riunioni: Riunione[];
  rischi: Rischio[];
  salMesi: number; // periodicità, default 6
  targetInternoGiorni: number; // default 45
  sal: Sal[];
}

export interface Progetti {
  criteri: CriterioValutazione[];
  progetti: Progetto[];
  progettoAttivoId: string | null;
}

export interface AppState {
  lineItems: LineItem[];
  fundEntries: FundEntry[];
  budgetItems: BudgetItem[];
  budgetTotale: number; // 0 = non impostato, nessun avviso di sforamento
  // Elenchi gestiti delle categorie disponibili per nuove scelte — indipendenti tra loro.
  // Eliminare una categoria da qui NON tocca le voci esistenti che la usano già (restano
  // com'erano, semplicemente quella categoria non ricompare più tra le opzioni).
  lineItemCategories: string[];
  fundCategories: string[];
  revenueAssumptions: RevenueAssumptions;
  runwayAssumptions: RunwayAssumptions;
  dipendenti: Dipendente[];
  ruoli: Ruolo[];
  governance: Governance;
  supplyChain: SupplyChain;
  dimensioneImpresa: DimensioneImpresa;
  progetti: Progetti;
  schemaVersion: number;
}
