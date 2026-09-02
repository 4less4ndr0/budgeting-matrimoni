import { useAppStore } from '../../lib/storage/store';
import type { RevenueModelType, SaleMode } from '../../types/domain';

export default function AssumptionsView() {
  const assumptions = useAppStore((s) => s.revenueAssumptions);
  const update = useAppStore((s) => s.updateRevenueAssumptions);

  return (
    <div>
      <div className="card">
        <h2>Obiettivo break-even</h2>
        <div className="field-row">
          <label>Data target</label>
          <input
            type="date"
            value={assumptions.targetBreakEvenDate}
            onChange={(e) => update({ targetBreakEvenDate: e.target.value })}
          />
        </div>
        <div className="field-row">
          <label>Modello di ricavo attivo</label>
          <select
            value={assumptions.activeModel}
            onChange={(e) => update({ activeModel: e.target.value as RevenueModelType })}
          >
            <option value="simple">Semplice (prezzo × volume)</option>
            <option value="funnel">Funnel B2B (lead × conversione)</option>
          </select>
        </div>
        <div className="field-row">
          <label>Override run-rate costi mensile</label>
          <input
            type="number"
            step="0.01"
            placeholder="automatico (media ultimi 3 mesi)"
            value={assumptions.costRunRateOverride ?? ''}
            onChange={(e) =>
              update({
                costRunRateOverride: e.target.value === '' ? null : Number(e.target.value),
              })
            }
          />
        </div>
        <p className="muted">
          Lasciando vuoto l'override, i mesi futuri senza costi reali usano la media degli
          ultimi 3 mesi con dati.
        </p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Modello semplice</h2>
          <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>
            Ricavo mensile = prezzo × numero di siti venduti al mese, con crescita composta.
          </p>

          <h3>Tier 1 — automatizzato (48h)</h3>
          <div className="field-row">
            <label>Prezzo (€)</label>
            <input
              type="number"
              value={assumptions.simple.tier1Price}
              onChange={(e) =>
                update({ simple: { ...assumptions.simple, tier1Price: Number(e.target.value) } })
              }
            />
          </div>
          <div className="field-row">
            <label>Siti / mese</label>
            <input
              type="number"
              value={assumptions.simple.tier1SitesPerMonth}
              onChange={(e) =>
                update({
                  simple: { ...assumptions.simple, tier1SitesPerMonth: Number(e.target.value) },
                })
              }
            />
          </div>

          <h3>Tier 2 — su misura</h3>
          <div className="field-row">
            <label>Prezzo (€)</label>
            <input
              type="number"
              value={assumptions.simple.tier2Price}
              onChange={(e) =>
                update({ simple: { ...assumptions.simple, tier2Price: Number(e.target.value) } })
              }
            />
          </div>
          <div className="field-row">
            <label>Siti / mese</label>
            <input
              type="number"
              value={assumptions.simple.tier2SitesPerMonth}
              onChange={(e) =>
                update({
                  simple: { ...assumptions.simple, tier2SitesPerMonth: Number(e.target.value) },
                })
              }
            />
          </div>

          <h3>Wholesale B2B</h3>
          <div className="field-row">
            <label>Prezzo (€)</label>
            <input
              type="number"
              value={assumptions.simple.wholesalePrice}
              onChange={(e) =>
                update({
                  simple: { ...assumptions.simple, wholesalePrice: Number(e.target.value) },
                })
              }
            />
          </div>
          <div className="field-row">
            <label>Siti / mese</label>
            <input
              type="number"
              value={assumptions.simple.wholesaleSitesPerMonth}
              onChange={(e) =>
                update({
                  simple: {
                    ...assumptions.simple,
                    wholesaleSitesPerMonth: Number(e.target.value),
                  },
                })
              }
            />
          </div>

          <div className="field-row">
            <label>Crescita mensile (%)</label>
            <input
              type="number"
              step="0.1"
              value={assumptions.simple.monthlyGrowthRatePct}
              onChange={(e) =>
                update({
                  simple: {
                    ...assumptions.simple,
                    monthlyGrowthRatePct: Number(e.target.value),
                  },
                })
              }
            />
          </div>
        </div>

        <div className="card">
          <h2>Modello funnel B2B</h2>
          <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>
            Ricavo mensile = lead × tasso di conversione × prezzo (vendita diretta o
            commissione di segnalazione).
          </p>

          <div className="field-row">
            <label>Lead mensili</label>
            <input
              type="number"
              value={assumptions.funnel.monthlyLeads}
              onChange={(e) =>
                update({ funnel: { ...assumptions.funnel, monthlyLeads: Number(e.target.value) } })
              }
            />
          </div>
          <div className="field-row">
            <label>Partnership attive</label>
            <input
              type="number"
              value={assumptions.funnel.activePartnerships}
              onChange={(e) =>
                update({
                  funnel: { ...assumptions.funnel, activePartnerships: Number(e.target.value) },
                })
              }
            />
          </div>
          <div className="field-row">
            <label>Tasso di conversione (%)</label>
            <input
              type="number"
              step="0.1"
              value={assumptions.funnel.conversionRatePct}
              onChange={(e) =>
                update({
                  funnel: { ...assumptions.funnel, conversionRatePct: Number(e.target.value) },
                })
              }
            />
          </div>
          <div className="field-row">
            <label>Modalità vendita</label>
            <select
              value={assumptions.funnel.saleMode}
              onChange={(e) =>
                update({ funnel: { ...assumptions.funnel, saleMode: e.target.value as SaleMode } })
              }
            >
              <option value="direct">Vendita diretta</option>
              <option value="referral_commission">Commissione di segnalazione</option>
            </select>
          </div>
          <div className="field-row">
            <label>Prezzo medio vendita (€)</label>
            <input
              type="number"
              value={assumptions.funnel.avgSalePrice}
              onChange={(e) =>
                update({ funnel: { ...assumptions.funnel, avgSalePrice: Number(e.target.value) } })
              }
            />
          </div>
          {assumptions.funnel.saleMode === 'referral_commission' && (
            <div className="field-row">
              <label>Commissione (%)</label>
              <input
                type="number"
                step="0.1"
                value={assumptions.funnel.commissionRatePct}
                onChange={(e) =>
                  update({
                    funnel: { ...assumptions.funnel, commissionRatePct: Number(e.target.value) },
                  })
                }
              />
            </div>
          )}
          <div className="field-row">
            <label>Crescita lead mensile (%)</label>
            <input
              type="number"
              step="0.1"
              value={assumptions.funnel.monthlyGrowthRatePct}
              onChange={(e) =>
                update({
                  funnel: {
                    ...assumptions.funnel,
                    monthlyGrowthRatePct: Number(e.target.value),
                  },
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
