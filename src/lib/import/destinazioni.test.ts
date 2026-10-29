import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { DESTINAZIONI, mappaturaIncompleta, organoDa, righeDaFoglio, suggerisciColonne, type Destinazione } from './destinazioni';
import { readSheets, type RawSheet } from './parseFile';
import { buildWorkbook } from '../export/exportWorkbook';
import { defaultRevenueAssumptions, defaultRunwayAssumptions } from '../defaults';
import { criteriPredefiniti, nuovoProgetto } from '../progetti/defaults';
import { aggiungiOr, aggiungiTask } from '../progetti/modifiche';
import type { AppState, Progetto } from '../../types/domain';

function vuoto(): AppState {
  return {
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
    governance: { modello: null, membri: [] },
    supplyChain: { prodotti: [], attori: [] },
    dimensioneImpresa: { esercizio: '', ulaManuale: null, fatturato: null, totaleBilancio: null, imprese: [] },
    progetti: { criteri: criteriPredefiniti(), progetti: [], progettoAttivoId: null },
    schemaVersion: 8,
  };
}

function ricco(): AppState {
  let p: Progetto = { ...nuovoProgetto('Gemello digitale'), stato: 'in-corso', dataInizio: '2026-04-01', durataMesi: 24, budgetTotale: 6_500_000 };
  p = aggiungiOr(aggiungiOr(p));
  p = { ...p, or: p.or.map((o, i) => ({ ...o, titolo: ['Requisiti', 'Prototipo'][i], tipologia: i ? ('SS' as const) : ('RI' as const) })) };
  p = aggiungiTask(aggiungiTask(p, p.or[0].id), p.or[1].id);
  p = { ...p, task: p.task.map((t, i) => ({ ...t, titolo: ['Analisi', 'Sviluppo'][i], meseInizio: i ? 7 : 1, meseFine: i ? 18 : 6, avanzamentoPct: i ? 0 : 50 })) };
  return {
    ...vuoto(),
    fundEntries: [{ id: 'f', date: '2026-01-10', amount: 50_000, description: 'Capitale iniziale', category: 'Soci' }],
    fundCategories: ['Soci'],
    budgetItems: [{ id: 'b', nome: 'Marketing', importo: 12_000, bloccato: true }],
    budgetTotale: 30_000,
    dipendenti: [
      { id: 'd1', nome: 'Mario', cognome: 'Bianchi', dataNascita: '1980-10-13', ruoloId: 'r1', email: 'mario@esempio.it', telefono: '', dataAssunzione: '2019-03-01', note: '' },
      { id: 'd2', nome: 'Giulia', cognome: 'Verdi', dataNascita: '', ruoloId: 'r2', email: '', telefono: '', dataAssunzione: '', note: 'Part-time' },
    ],
    ruoli: [
      { id: 'r1', nome: 'CEO', superioreId: null },
      { id: 'r2', nome: 'CTO', superioreId: 'r1' },
    ],
    governance: {
      modello: 'dualistico-orizzontale',
      membri: [
        { id: 'm1', organo: 'cda', dipendenteId: 'd1', nomeEsterno: '', carica: 'Presidente' },
        { id: 'm2', organo: 'collegio-sindacale', dipendenteId: null, nomeEsterno: 'Rita Moro', carica: 'Presidente' },
      ],
    },
    supplyChain: {
      prodotti: [{ id: 'p1', nome: 'Sito Tier 2', descrizione: '' }],
      attori: [
        { id: 'a1', prodottoId: 'p1', attivita: 'tecnologia', tipo: 'fornitore', dipendenteId: null, nome: 'Vercel', note: 'hosting' },
        { id: 'a2', prodottoId: 'p1', attivita: 'operations', tipo: 'interno', dipendenteId: 'd2', nome: '', note: '' },
      ],
    },
    dimensioneImpresa: {
      esercizio: '2025',
      ulaManuale: 14,
      fatturato: 1_232_712,
      totaleBilancio: 1_915_055,
      imprese: [{ id: 'i1', nome: 'B S.p.A.', quota: 25, controlloCda: false, investitoreEsente: false, ula: 12, fatturato: 220_683, totaleBilancio: 2_380_918 }],
    },
    progetti: { criteri: criteriPredefiniti(), progetti: [p], progettoAttivoId: p.id },
  };
}

function fogliEsportati(state: AppState): Map<string, RawSheet> {
  const buffer = XLSX.write(buildWorkbook(state), { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Map(readSheets(buffer).map((s) => [s.name, s.sheet]));
}

function importaFoglio(d: Destinazione, state: AppState, sheet: RawSheet) {
  const colonne = suggerisciColonne(d.campi, sheet.headers);
  expect(mappaturaIncompleta(d, colonne), `${d.label}: colonne non riconosciute`).toEqual([]);
  return d.importa(state, righeDaFoglio(sheet, colonne));
}

describe('import per schermata dal foglio Excel di Regia', () => {
  const state = ricco();
  const fogli = fogliEsportati(state);

  it('hides Regia’s data sheet from the importable ones', () => {
    expect(fogli.has('_regia')).toBe(false);
  });

  for (const d of DESTINAZIONI) {
    it(`${d.label}: re-importing its own sheet changes nothing and duplicates nothing`, () => {
      const sheet = fogli.get(d.fogli[0]);
      expect(sheet, `manca il foglio ${d.fogli[0]}`).toBeDefined();
      const e = importaFoglio(d, state, sheet!);
      expect(e.nuovi).toBe(0);
      expect(e.scartati).toBe(0);
    });
  }

  it('rebuilds each area into an empty Regia', () => {
    let s = vuoto();
    // Order matters only where one sheet refers to another: ruoli/dipendenti before governance,
    // progetti before their WBS and rischi.
    for (const id of ['fondi', 'budget', 'imprese-legate', 'ruoli', 'dipendenti', 'organi', 'filiera', 'progetti', 'task', 'rischi']) {
      const d = DESTINAZIONI.find((x) => x.id === id)!;
      s = { ...s, ...importaFoglio(d, s, fogli.get(d.fogli[0])!).patch };
    }
    expect(s.fundEntries).toMatchObject([{ date: '2026-01-10', amount: 50_000, category: 'Soci' }]);
    expect(s.budgetTotale).toBe(30_000);
    expect(s.budgetItems).toMatchObject([{ nome: 'Marketing', importo: 12_000, bloccato: true }]);
    expect(s.dimensioneImpresa.imprese).toMatchObject([{ nome: 'B S.p.A.', quota: 25, ula: 12 }]);
    expect(s.dipendenti.map((d) => `${d.nome} ${d.cognome}`)).toEqual(['Mario Bianchi', 'Giulia Verdi']);
    const cto = s.ruoli.find((r) => r.nome === 'CTO')!;
    expect(s.ruoli.find((r) => r.id === cto.superioreId)?.nome).toBe('CEO');
    expect(s.governance.modello).toBe('dualistico-orizzontale');
    const mario = s.dipendenti.find((d) => d.nome === 'Mario')!;
    expect(s.governance.membri).toMatchObject([
      { organo: 'cda', dipendenteId: mario.id, carica: 'Presidente' },
      { organo: 'collegio-sindacale', dipendenteId: null, nomeEsterno: 'Rita Moro' },
    ]);
    const giulia = s.dipendenti.find((d) => d.nome === 'Giulia')!;
    expect(s.supplyChain.attori).toMatchObject([
      { attivita: 'tecnologia', tipo: 'fornitore', nome: 'Vercel', note: 'hosting' },
      { attivita: 'operations', tipo: 'interno', dipendenteId: giulia.id },
    ]);
    const [p] = s.progetti.progetti;
    expect(p).toMatchObject({ titolo: 'Gemello digitale', stato: 'in-corso', dataInizio: '2026-04-01', durataMesi: 24 });
    expect(p.or.map((o) => [o.titolo, o.tipologia])).toEqual([
      ['Requisiti', 'RI'],
      ['Prototipo', 'SS'],
    ]);
    expect(p.task.map((t) => [t.titolo, t.meseInizio, t.meseFine, t.avanzamentoPct])).toEqual([
      ['Analisi', 1, 6, 50],
      ['Sviluppo', 7, 18, 0],
    ]);
    expect(p.rischi).toHaveLength(4);
  });
});

describe('import da file qualsiasi', () => {
  const foglio = (headers: string[], rows: string[][]): RawSheet => ({ headers, rows });

  it('reads a dipendenti list with name and surname in one column, and creates missing roles', () => {
    const d = DESTINAZIONI.find((x) => x.id === 'dipendenti')!;
    const sheet = foglio(['Nominativo', 'Mansione', 'E-mail'], [['Anna Rossi', 'Designer', 'anna@x.it'], ['', '', '']]);
    const e = d.importa(vuoto(), righeDaFoglio(sheet, suggerisciColonne(d.campi, sheet.headers)));
    expect(e.nuovi).toBe(1);
    expect(e.scartati).toBe(1);
    expect(e.patch.dipendenti?.[0]).toMatchObject({ nome: 'Anna', cognome: 'Rossi', email: 'anna@x.it' });
    expect(e.patch.ruoli?.[0].nome).toBe('Designer');
  });

  it('never erases with empty cells: an update only overwrites what is filled in', () => {
    const d = DESTINAZIONI.find((x) => x.id === 'dipendenti')!;
    const s = ricco();
    const sheet = foglio(['Nome', 'Cognome', 'Email', 'Telefono'], [['Mario', 'Bianchi', '', '333 1234567']]);
    const e = d.importa(s, righeDaFoglio(sheet, suggerisciColonne(d.campi, sheet.headers)));
    expect(e.aggiornati).toBe(1);
    expect(e.patch.dipendenti?.[0]).toMatchObject({ email: 'mario@esempio.it', telefono: '333 1234567' });
  });

  it('recognises organi from loose names, the most specific first', () => {
    expect(organoDa('Comitato per il controllo sulla gestione')).toBe('comitato-controllo');
    expect(organoDa('Consiglio di gestione')).toBe('consiglio-gestione');
    expect(organoDa('CdA')).toBe('cda');
    expect(organoDa('Sindaci')).toBe('collegio-sindacale');
    expect(organoDa('Pippo')).toBeNull();
  });

  it('tasks go into the active project, with a note when there is none', () => {
    const d = DESTINAZIONI.find((x) => x.id === 'task')!;
    const sheet = foglio(['OR', 'Task', 'Mesi', 'TP'], [['Analisi requisiti', 'Interviste', 'M1-M3', 'ri']]);
    const colonne = suggerisciColonne(d.campi, sheet.headers);
    const senza = d.importa(vuoto(), righeDaFoglio(sheet, colonne));
    expect(senza.scartati).toBe(1);
    expect(senza.note[0]).toMatch(/nessun progetto attivo/);

    const s = vuoto();
    const p = nuovoProgetto('X');
    s.progetti = { ...s.progetti, progetti: [p], progettoAttivoId: p.id };
    const e = d.importa(s, righeDaFoglio(sheet, colonne));
    const [q] = e.patch.progetti!.progetti;
    expect(q.or).toMatchObject([{ titolo: 'Analisi requisiti', tipologia: 'RI' }]);
    expect(q.task).toMatchObject([{ titolo: 'Interviste', meseInizio: 1, meseFine: 3 }]);
  });
});
