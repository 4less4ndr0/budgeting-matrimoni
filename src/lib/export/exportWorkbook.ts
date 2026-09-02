import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { AppState, MonthlyProjection } from '../../types/domain';
import { buildProjection } from '../calculations/projection';

function flattenAssumptions(state: AppState) {
  const a = state.revenueAssumptions;
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
  ];
}

export function exportWorkbook(state: AppState): void {
  const projections: MonthlyProjection[] = buildProjection(state);

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      state.lineItems.map(({ date, category, description, amount, type }) => ({
        date,
        category,
        description,
        amount,
        type,
      })),
    ),
    'Line Items',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      state.fundEntries.map(({ date, amount, description }) => ({ date, amount, description })),
    ),
    'Fund Entries',
  );

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flattenAssumptions(state)), 'Assumptions');

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(state.budgetItems.map(({ nome, importo }) => ({ voce: nome, importo }))),
    'Bilancio',
  );

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projections), 'Monthly Projections');

  XLSX.writeFile(wb, `budgeting-matrimoni-export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}
