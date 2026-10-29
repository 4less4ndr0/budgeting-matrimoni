import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseRegiaBuffer } from './readRegiaFile';
import { buildWorkbook, DATA_SHEET } from '../export/exportWorkbook';
import { buildSnapshot } from '../export/exportSnapshot';
import { defaultRevenueAssumptions, defaultRunwayAssumptions } from '../defaults';
import type { AppState, Progetto } from '../../types/domain';
import { nuovoProgetto } from '../progetti/defaults';
import { aggiungiOr, aggiungiTask } from '../progetti/modifiche';

function stato(): AppState {
  return {
    lineItems: [
      { id: 'l1', date: '2026-01-10', category: 'Dominio', description: 'Rinnovo', amount: 12, type: 'cost', source: 'manual', recurring: false },
    ],
    fundEntries: [],
    budgetItems: [],
    budgetTotale: 0,
    lineItemCategories: ['Dominio'],
    fundCategories: [],
    revenueAssumptions: { ...defaultRevenueAssumptions(), costRunRateOverride: 0 },
    runwayAssumptions: defaultRunwayAssumptions(),
    dipendenti: [
      { id: 'd1', nome: 'Anna', cognome: 'Rossi', dataNascita: '1990-05-04', ruoloId: 'r1', email: '', telefono: '', dataAssunzione: '', note: '' },
    ],
    ruoli: [{ id: 'r1', nome: 'CEO', superioreId: null }],
    governance: { modello: 'monistico', membri: [{ id: 'm1', organo: 'cda', dipendenteId: 'd1', nomeEsterno: '', carica: 'Presidente' }] },
    supplyChain: {
      prodotti: [{ id: 'p1', nome: 'Sito', descrizione: '' }],
      // Long enough that the hidden sheet needs more than one 30k-character cell.
      attori: Array.from({ length: 400 }, (_, i) => ({
        id: `a${i}`,
        prodottoId: 'p1',
        attivita: 'operations' as const,
        tipo: 'fornitore' as const,
        dipendenteId: null,
        nome: `Fornitore ${i}`,
        note: 'x'.repeat(100),
      })),
    },
    dimensioneImpresa: { esercizio: '2025', ulaManuale: 3.5, fatturato: 120000, totaleBilancio: null, imprese: [] },
      progetti: { criteri: [], progetti: [], progettoAttivoId: null },
    schemaVersion: 6,
  };
}

function toBuffer(wb: XLSX.WorkBook): ArrayBuffer {
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

describe('file Regia', () => {
  it('round-trips the whole state through the .xlsx, via the hidden data sheet', () => {
    const s = stato();
    const savedAt = '2026-10-13T10:00:00.000Z';
    const wb = buildWorkbook(s, savedAt);
    expect(wb.Workbook?.Sheets?.find((x) => x.name === DATA_SHEET)?.Hidden).toBe(1);

    const back = parseRegiaBuffer('regia.xlsx', toBuffer(wb));

    expect(back).toEqual(buildSnapshot(s, savedAt));
    expect(back.revenueAssumptions.costRunRateOverride).toBe(0);
  });

  it('reads the .json snapshot too', () => {
    const snapshot = buildSnapshot(stato());
    const buffer = new TextEncoder().encode(JSON.stringify(snapshot)).buffer as ArrayBuffer;
    expect(parseRegiaBuffer('stato-sito.json', buffer)).toEqual(snapshot);
  });

  it('explains when an Excel is not a Regia export', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['data', 'importo']]), 'Foglio1');
    expect(() => parseRegiaBuffer('estratto-conto.xlsx', toBuffer(wb))).toThrow(/foglio nascosto/);
  });

  it('adds one sheet per Progetti tab, with the Gantt marked month by month', () => {
    let p: Progetto = { ...nuovoProgetto('Prototipo'), dataInizio: '2026-01-01', durataMesi: 4 };
    p = aggiungiOr(p);
    p = { ...p, or: p.or.map((o) => ({ ...o, tipologia: 'RI' as const })) };
    p = aggiungiTask(p, p.or[0].id);
    const s = { ...stato(), progetti: { criteri: [], progetti: [p], progettoAttivoId: p.id } };
    const wb = buildWorkbook(s, '2026-10-13T09:30:00.000Z');
    expect(wb.SheetNames).toEqual(
      expect.arrayContaining(['Progetti - Portafoglio', 'Progetti - WBS', 'Progetti - Gantt', 'Progetti - SAL']),
    );
    const gantt = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets['Progetti - Gantt']);
    expect([gantt[1].M1, gantt[1].M3, gantt[1].M4]).toEqual(['■', '■', '']);
  });
});
