import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/storage/store';
import type { RevenueModelType, SaleMode } from '@/types/domain';

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <Label className="font-normal text-muted-foreground sm:w-48 sm:shrink-0">{label}</Label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function AssumptionsView() {
  const assumptions = useAppStore((s) => s.revenueAssumptions);
  const update = useAppStore((s) => s.updateRevenueAssumptions);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Obiettivo break-even</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Data target">
            <Input
              type="date"
              value={assumptions.targetBreakEvenDate}
              onChange={(e) => update({ targetBreakEvenDate: e.target.value })}
            />
          </Field>
          <Field label="Modello di ricavo attivo">
            <Select
              value={assumptions.activeModel}
              onValueChange={(value) => update({ activeModel: value as RevenueModelType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Semplice (prezzo × volume)</SelectItem>
                <SelectItem value="funnel">Funnel B2B (lead × conversione)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Override run-rate costi mensile">
            <Input
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
          </Field>
          <p className="text-sm text-muted-foreground">
            Lasciando vuoto l&apos;override, i mesi futuri senza costi reali usano la media degli ultimi 3 mesi
            con dati.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Modello semplice</CardTitle>
            <CardDescription>
              Ricavo mensile = prezzo × numero di siti venduti al mese, con crescita composta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tier 1 — automatizzato (48h)
            </h3>
            <Field label="Prezzo (€)">
              <Input
                type="number"
                value={assumptions.simple.tier1Price}
                onChange={(e) =>
                  update({ simple: { ...assumptions.simple, tier1Price: Number(e.target.value) } })
                }
              />
            </Field>
            <Field label="Siti / mese">
              <Input
                type="number"
                value={assumptions.simple.tier1SitesPerMonth}
                onChange={(e) =>
                  update({
                    simple: { ...assumptions.simple, tier1SitesPerMonth: Number(e.target.value) },
                  })
                }
              />
            </Field>

            <Separator className="my-4" />

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tier 2 — su misura
            </h3>
            <Field label="Prezzo (€)">
              <Input
                type="number"
                value={assumptions.simple.tier2Price}
                onChange={(e) =>
                  update({ simple: { ...assumptions.simple, tier2Price: Number(e.target.value) } })
                }
              />
            </Field>
            <Field label="Siti / mese">
              <Input
                type="number"
                value={assumptions.simple.tier2SitesPerMonth}
                onChange={(e) =>
                  update({
                    simple: { ...assumptions.simple, tier2SitesPerMonth: Number(e.target.value) },
                  })
                }
              />
            </Field>

            <Separator className="my-4" />

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Wholesale B2B
            </h3>
            <Field label="Prezzo (€)">
              <Input
                type="number"
                value={assumptions.simple.wholesalePrice}
                onChange={(e) =>
                  update({
                    simple: { ...assumptions.simple, wholesalePrice: Number(e.target.value) },
                  })
                }
              />
            </Field>
            <Field label="Siti / mese">
              <Input
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
            </Field>

            <Separator className="my-4" />

            <Field label="Crescita mensile (%)">
              <Input
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
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modello funnel B2B</CardTitle>
            <CardDescription>
              Ricavo mensile = lead × tasso di conversione × prezzo (vendita diretta o commissione di
              segnalazione).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field label="Lead mensili">
              <Input
                type="number"
                value={assumptions.funnel.monthlyLeads}
                onChange={(e) =>
                  update({ funnel: { ...assumptions.funnel, monthlyLeads: Number(e.target.value) } })
                }
              />
            </Field>
            <Field label="Partnership attive">
              <Input
                type="number"
                value={assumptions.funnel.activePartnerships}
                onChange={(e) =>
                  update({
                    funnel: { ...assumptions.funnel, activePartnerships: Number(e.target.value) },
                  })
                }
              />
            </Field>
            <Field label="Tasso di conversione (%)">
              <Input
                type="number"
                step="0.1"
                value={assumptions.funnel.conversionRatePct}
                onChange={(e) =>
                  update({
                    funnel: { ...assumptions.funnel, conversionRatePct: Number(e.target.value) },
                  })
                }
              />
            </Field>
            <Field label="Modalità vendita">
              <Select
                value={assumptions.funnel.saleMode}
                onValueChange={(value) =>
                  update({ funnel: { ...assumptions.funnel, saleMode: value as SaleMode } })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Vendita diretta</SelectItem>
                  <SelectItem value="referral_commission">Commissione di segnalazione</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Prezzo medio vendita (€)">
              <Input
                type="number"
                value={assumptions.funnel.avgSalePrice}
                onChange={(e) =>
                  update({ funnel: { ...assumptions.funnel, avgSalePrice: Number(e.target.value) } })
                }
              />
            </Field>
            {assumptions.funnel.saleMode === 'referral_commission' && (
              <Field label="Commissione (%)">
                <Input
                  type="number"
                  step="0.1"
                  value={assumptions.funnel.commissionRatePct}
                  onChange={(e) =>
                    update({
                      funnel: { ...assumptions.funnel, commissionRatePct: Number(e.target.value) },
                    })
                  }
                />
              </Field>
            )}
            <Field label="Crescita lead mensile (%)">
              <Input
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
            </Field>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
