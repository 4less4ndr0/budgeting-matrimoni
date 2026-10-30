import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { AppState, MonthlyProjection } from '../../types/domain';
import { buildProjection } from '../calculations/projection';
import { buildSnapshot, type StateSnapshot } from './exportSnapshot';
import { fogliProgetti } from './progettiSheets';
import { NOME_CLASSE, classeNostraImpresa, relazione, totaliConLegate } from '../dimensione/dimensione';
import { attivitaDef, nomeAttore, tipoLabel } from '../supplyChain/porter';
import { ORGANI, modelloDef, nomeMembro, organiDelModello } from '../governance/modelli';

function flattenAssumptions(state: AppState) {
  const a = state.revenueAssumptions;
  const r = state.runwayAssumptions;
  return [
    { campo: 'Modello attivo', valore: a.activeModel },
    { campo: 'Data inizio proiezione', valore: a.projectionStartDate },
    { campo: 'Data target break-even', valore: a.targetBreakEvenDate },
    { campo: 'Override run-rate costi', valore: a.costRunRateOverride ?? '(automatico)' },
    { campo: '--- Modello semplice ---', valore: '' },
    { campo: 'Prezzo Tier 1', valore: a.simple.tier1Price },
    { campo: 'Siti Tier 1 / mese', valore: a.simple.tier1SitesPerMonth },
    { campo: 'Prezzo Tier 2', valore: a.simple.tier2Price },
    { campo: 'Siti Tier 2 / mese', valore: a.simple.tier2SitesPerMonth },
    { campo: 'Prezzo Tier 3', valore: a.simple.tier3Price },
    { campo: 'Siti Tier 3 / mese', valore: a.simple.tier3SitesPerMonth },
    { campo: 'Prezzo wholesale', valore: a.simple.wholesalePrice },
    { campo: 'Siti wholesale / mese', valore: a.simple.wholesaleSitesPerMonth },
    { campo: 'Crescita mensile % (semplice)', valore: a.simple.monthlyGrowthRatePct },
    { campo: '--- Modello funnel ---', valore: '' },
    { campo: 'Lead mensili', valore: a.funnel.monthlyLeads },
    { campo: 'Partnership attive', valore: a.funnel.activePartnerships },
    { campo: 'Tasso di conversione %', valore: a.funnel.conversionRatePct },
    { campo: 'Modalità vendita', valore: a.funnel.saleMode },
    { campo: 'Prezzo medio vendita', valore: a.funnel.avgSalePrice },
    { campo: 'Commissione %', valore: a.funnel.commissionRatePct },
    { campo: 'Crescita mensile % (funnel)', valore: a.funnel.monthlyGrowthRatePct },
    { campo: '--- Runway ---', valore: '' },
    { campo: 'Tipo input spesa', valore: r.burnInputMode },
    { campo: 'Proiezione', valore: r.projectionMode },
    { campo: 'Liquidità disponibile (Runway)', valore: r.cashAvailable },
    { campo: 'Spesa mensile aggregata', valore: r.aggregateMonthlyBurn },
    { campo: 'Spesa: Stipendi & Team', valore: r.detailedBurn.salariesAndTeam },
    { campo: 'Spesa: Strumenti & Software', valore: r.detailedBurn.toolsAndSoftware },
    { campo: 'Spesa: Ufficio & Operazioni', valore: r.detailedBurn.officeAndOperations },
    { campo: 'Spesa: Marketing & Vendite', valore: r.detailedBurn.marketingAndSales },
    { campo: 'Spesa: Altro', valore: r.detailedBurn.other },
    { campo: 'Entrate mensili', valore: r.monthlyRevenue },
    { campo: 'Crescita mensile % spesa', valore: r.burnGrowthPct },
    { campo: 'Crescita mensile % entrate', valore: r.revenueGrowthPct },
  ];
}

/**
 * Hidden sheet holding the exact snapshot as JSON, so the same .xlsx can be re-imported into
 * Regia with nothing lost (ids, links between dipendenti/ruoli/organi, override…). The visible
 * sheets are only a readable view: edits made there are not read back.
 */
export const DATA_SHEET = '_regia';
// Excel caps a cell at 32,767 characters: the JSON is split across rows of column A.
const CHUNK = 30_000;

function snapshotToRows(snapshot: StateSnapshot): string[][] {
  const json = JSON.stringify(snapshot);
  const rows: string[][] = [];
  for (let i = 0; i < json.length; i += CHUNK) rows.push([json.slice(i, i + CHUNK)]);
  return rows;
}

/** Reads the snapshot back from a workbook exported by Regia; null if it isn't one. */
export function snapshotJsonFromWorkbook(wb: XLSX.WorkBook): string | null {
  const sheet = wb.Sheets[DATA_SHEET];
  if (!sheet) return null;
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: true, defval: '' });
  return rows.map((r) => String(r[0] ?? '')).join('');
}

export function buildWorkbook(state: AppState, savedAt: string = new Date().toISOString()): XLSX.WorkBook {
  const projections: MonthlyProjection[] = buildProjection(state);
  const snapshot = buildSnapshot(state, savedAt);
  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: object[]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);

  const ruoloById = new Map(state.ruoli.map((r) => [r.id, r]));
  const prodottoById = new Map(state.supplyChain.prodotti.map((p) => [p.id, p.nome]));
  const { modello, membri } = state.governance;

  add('Leggimi', [
    { voce: 'Esportato da', valore: 'Regia — sistema unico di controllo d’impresa' },
    { voce: 'Data esportazione', valore: format(new Date(savedAt), 'dd/MM/yyyy HH:mm') },
    { voce: 'Movimenti (costi/entrate)', valore: state.lineItems.length },
    { voce: 'Fondi', valore: state.fundEntries.length },
    { voce: 'Voci di budget', valore: state.budgetItems.length },
    { voce: 'Dipendenti', valore: state.dipendenti.length },
    { voce: 'Ruoli', valore: state.ruoli.length },
    { voce: 'Modello di governance', valore: modello ? modelloDef(modello).nome : '(non scelto)' },
    { voce: 'Prodotti in Supply Chain', valore: state.supplyChain.prodotti.length },
    { voce: 'Progetti', valore: state.progetti.progetti.length },
    { voce: '', valore: '' },
    {
      voce: 'Ripristinare tutto',
      valore:
        'In Regia: Importa / Esporta → Ripristina da file. Torna tutto com’era al momento dell’esportazione ' +
        `(dal foglio nascosto "${DATA_SHEET}", da non modificare né cancellare).`,
    },
    {
      voce: 'Reimportare il file modificato',
      valore:
        'In Regia: Importa / Esporta → Importa dati → «Tutto il file», e carica questo file: ogni foglio torna da ' +
        'solo nella sua schermata. Le righe con lo stesso nome aggiornano quelle esistenti, le celle vuote non ' +
        'cancellano nulla.',
    },
  ]);

  add(
    'Costi e entrate',
    state.lineItems.map(({ date, category, description, amount, type, recurring }) => ({
      data: date,
      categoria: category,
      descrizione: description,
      importo: amount,
      tipo: type === 'cost' ? 'costo' : 'entrata',
      ricorrente: recurring ? 'sì' : '',
    })),
  );
  add(
    'Fondi',
    state.fundEntries.map(({ date, category, amount, description }) => ({
      data: date,
      categoria: category,
      importo: amount,
      descrizione: description,
    })),
  );
  add('Assunzioni', flattenAssumptions(state));
  add('Budget', [
    { voce: 'Budget totale previsto', importo: state.budgetTotale, bloccato: '' },
    ...state.budgetItems.map(({ nome, importo, bloccato }) => ({ voce: nome, importo, bloccato: bloccato ? 'sì' : '' })),
  ]);
  add('Proiezioni mensili', projections);

  add(
    'Dipendenti',
    state.dipendenti.map((d) => ({
      nome: d.nome,
      cognome: d.cognome,
      ruolo: (d.ruoloId && ruoloById.get(d.ruoloId)?.nome) || '',
      data_nascita: d.dataNascita,
      data_assunzione: d.dataAssunzione,
      email: d.email,
      telefono: d.telefono,
      note: d.note,
    })),
  );
  add(
    'Ruoli',
    state.ruoli.map((r) => ({
      ruolo: r.nome,
      riporta_a: (r.superioreId && ruoloById.get(r.superioreId)?.nome) || '',
    })),
  );

  if (modello) {
    const organi = organiDelModello(modello);
    add('Governance', [
      { organo: 'Modello', persona: modelloDef(modello).nome, carica: '' },
      ...membri
        .filter((m) => organi.includes(m.organo))
        .sort((a, b) => organi.indexOf(a.organo) - organi.indexOf(b.organo))
        .map((m) => ({ organo: ORGANI[m.organo].nome, persona: nomeMembro(m, state.dipendenti), carica: m.carica })),
    ]);
  }

  if (state.supplyChain.prodotti.length > 0) {
    add(
      'Supply chain',
      state.supplyChain.attori.map((a) => ({
        prodotto: prodottoById.get(a.prodottoId) ?? '',
        area: attivitaDef(a.attivita).area,
        attivita: attivitaDef(a.attivita).nome,
        attore: nomeAttore(a, state.dipendenti),
        tipo: tipoLabel(a.tipo),
        note: a.note,
      })),
    );
  }

  const dim = state.dimensioneImpresa;
  const propri = { ula: dim.ulaManuale ?? state.dipendenti.length, fatturato: dim.fatturato, totaleBilancio: dim.totaleBilancio };
  const totali = totaliConLegate(propri, dim.imprese);
  const classe = classeNostraImpresa(dim, state.dipendenti.length);
  add('Dimensione impresa', [
    { impresa: 'La mia impresa', relazione: '', quota: '', peso: '100%', ula: propri.ula, fatturato: propri.fatturato ?? '', totale_bilancio: propri.totaleBilancio ?? '' },
    ...dim.imprese.map((i) => {
      const r = relazione(i);
      return { impresa: i.nome, relazione: r.tipo, quota: `${i.quota}%`, peso: `${Math.round(r.peso * 10000) / 100}%`, ula: i.ula ?? '', fatturato: i.fatturato ?? '', totale_bilancio: i.totaleBilancio ?? '' };
    }),
    { impresa: 'TOTALE', relazione: '', quota: '', peso: '', ula: totali.ula ?? '', fatturato: totali.fatturato ?? '', totale_bilancio: totali.totaleBilancio ?? '' },
    { impresa: 'Dimensione', relazione: classe ? NOME_CLASSE[classe] : '(dati insufficienti)', quota: '', peso: '', ula: '', fatturato: '', totale_bilancio: '' },
  ]);

  // Progetti: one sheet per tab, prefixed so they don't clash with other areas' sheet names.
  for (const { nome, righe } of fogliProgetti(state)) add(`Progetti - ${nome}`, righe);

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(snapshotToRows(snapshot)), DATA_SHEET);
  // Hidden (1), not "very hidden" (2): still recoverable from Excel's "Scopri foglio".
  wb.Workbook = { Sheets: wb.SheetNames.map((name) => ({ name, Hidden: name === DATA_SHEET ? 1 : 0 })) };

  return wb;
}

export function exportWorkbook(state: AppState): void {
  XLSX.writeFile(buildWorkbook(state), `regia-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}
