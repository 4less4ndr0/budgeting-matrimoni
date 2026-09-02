import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AlertTriangle, CheckCircle2, PartyPopper, TrendingDown } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buildProjection, computeBreakEvenStatus } from '@/lib/calculations/projection';
import { useAppStore } from '@/lib/storage/store';
import type { BreakEvenStatus } from '@/types/domain';

const CATEGORY_COLORS = [
  'hsl(158 64% 52%)',
  'hsl(217 91% 68%)',
  'hsl(43 96% 56%)',
  'hsl(0 84% 70%)',
  'hsl(262 70% 68%)',
  'hsl(330 81% 70%)',
  'hsl(199 89% 58%)',
];

const STATUS_META: Record<
  BreakEvenStatus,
  { title: string; variant: 'success' | 'warning' | 'destructive'; icon: typeof PartyPopper }
> = {
  ahead: { title: 'Sei in anticipo sull’obiettivo di break-even', variant: 'success', icon: PartyPopper },
  'on-track': { title: 'Sei esattamente in linea con l’obiettivo di break-even', variant: 'success', icon: CheckCircle2 },
  behind: { title: 'Sei in ritardo rispetto all’obiettivo di break-even', variant: 'warning', icon: TrendingDown },
  'at-risk': {
    title: 'A queste condizioni non raggiungi il break-even nel periodo proiettato',
    variant: 'destructive',
    icon: AlertTriangle,
  },
};

const CUMULATIVE_CHART_CONFIG = {
  cumulativePosition: { label: 'Posizione cumulativa', color: 'hsl(158 64% 52%)' },
  cumulativeCosts: { label: 'Costi cumulati', color: 'hsl(0 84% 70%)' },
} satisfies ChartConfig;

const BURN_RATE_CHART_CONFIG = {
  burnRate: { label: 'Burn rate', color: 'hsl(43 96% 56%)' },
} satisfies ChartConfig;

const NET_PROFIT_CHART_CONFIG = {
  netCashFlow: { label: 'Utile netto mese', color: 'hsl(217 91% 68%)' },
  cumulativeNetProfit: { label: 'Utile netto cumulato', color: 'hsl(158 64% 52%)' },
} satisfies ChartConfig;

function eur(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-secondary/60">
      <CardContent className="p-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1.5 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function DashboardView() {
  const state = useAppStore(
    useShallow((s) => ({
      lineItems: s.lineItems,
      fundEntries: s.fundEntries,
      revenueAssumptions: s.revenueAssumptions,
      schemaVersion: s.schemaVersion,
    })),
  );

  const projections = useMemo(() => buildProjection(state), [state]);
  const breakEven = useMemo(
    () => computeBreakEvenStatus(projections, state.revenueAssumptions.targetBreakEvenDate),
    [projections, state.revenueAssumptions.targetBreakEvenDate],
  );

  const categoryBreakdown = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const item of state.lineItems) {
      if (item.type !== 'cost') continue;
      byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.amount);
    }
    return Array.from(byCategory.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [state.lineItems]);

  const categoryChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    categoryBreakdown.forEach((entry, i) => {
      config[entry.name] = { label: entry.name, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] };
    });
    return config;
  }, [categoryBreakdown]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonth = projections.find((p) => p.month === currentMonthKey) ?? projections[0];

  const avgBurnRate = useMemo(() => {
    if (projections.length === 0) return 0;
    return projections.reduce((sum, p) => sum + p.burnRate, 0) / projections.length;
  }, [projections]);

  const statusMeta = STATUS_META[breakEven.status];
  const StatusIcon = statusMeta.icon;

  return (
    <div className="space-y-4">
      <Alert variant={statusMeta.variant}>
        <StatusIcon className="h-4 w-4" />
        <AlertTitle>{statusMeta.title}</AlertTitle>
        <AlertDescription>
          {breakEven.breakEvenMonth
            ? `Break-even proiettato: ${breakEven.breakEvenMonth} — target: ${breakEven.targetMonth}${
                breakEven.monthsDelta ? ` (${breakEven.monthsDelta > 0 ? '+' : ''}${breakEven.monthsDelta} mesi)` : ''
              }`
            : `Nessun break-even entro l'orizzonte proiettato — target: ${breakEven.targetMonth}`}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Posizione cumulativa attuale" value={eur(currentMonth?.cumulativePosition ?? 0)} />
        <StatTile label="Burn rate mensile (mese corrente)" value={eur(currentMonth?.burnRate ?? 0)} />
        <StatTile label="Burn rate medio proiettato" value={eur(avgBurnRate)} />
        <StatTile label="Ricavo proiettato (mese corrente)" value={eur(currentMonth?.projectedRevenue ?? 0)} />
        <StatTile label="Utile netto mensile" value={eur(currentMonth?.netCashFlow ?? 0)} />
        <StatTile label="Utile netto totale" value={eur(currentMonth?.cumulativeNetProfit ?? 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Posizione cumulativa: fondi + ricavi vs costi</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={CUMULATIVE_CHART_CONFIG} className="h-[280px] w-full">
            <AreaChart data={projections}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v: number) => eur(v)} width={80} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => eur(Number(v))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="cumulativePosition"
                stroke="var(--color-cumulativePosition)"
                fill="var(--color-cumulativePosition)"
                fillOpacity={0.15}
              />
              <Area
                type="monotone"
                dataKey="cumulativeCosts"
                stroke="var(--color-cumulativeCosts)"
                fill="var(--color-cumulativeCosts)"
                fillOpacity={0.08}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Burn rate mensile</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={BURN_RATE_CHART_CONFIG} className="h-[240px] w-full">
              <BarChart data={projections}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(v: number) => eur(v)}
                  width={80}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => eur(Number(v))} />} />
                <Bar dataKey="burnRate" fill="var(--color-burnRate)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Costi per categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun costo ancora registrato.</p>
            ) : (
              <ChartContainer config={categoryChartConfig} className="h-[240px] w-full">
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="value" nameKey="name" outerRadius={90} label>
                    {categoryBreakdown.map((entry, i) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => eur(Number(v))} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Utile netto: mensile e cumulato</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Entrate + ricavi meno costi, senza contare i Fondi disponibili — è il conto economico puro, diverso
            dalla posizione cumulativa qui sopra (che invece include il capitale).
          </p>
          <ChartContainer config={NET_PROFIT_CHART_CONFIG} className="h-[280px] w-full">
            <ComposedChart data={projections}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v: number) => eur(v)} width={80} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => eur(Number(v))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="netCashFlow" fill="var(--color-netCashFlow)" radius={[3, 3, 0, 0]} />
              <Line
                type="monotone"
                dataKey="cumulativeNetProfit"
                stroke="var(--color-cumulativeNetProfit)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tabella mensile</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mese</TableHead>
                <TableHead>Costo reale</TableHead>
                <TableHead>Entrata reale</TableHead>
                <TableHead>Ricavo proiettato</TableHead>
                <TableHead>Burn rate</TableHead>
                <TableHead>Utile netto mese</TableHead>
                <TableHead>Utile netto cumulato</TableHead>
                <TableHead>Posizione cumulativa</TableHead>
                <TableHead>Break-even</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projections.map((p) => (
                <TableRow key={p.month}>
                  <TableCell>{p.month}</TableCell>
                  <TableCell>{eur(p.actualCost)}</TableCell>
                  <TableCell>{eur(p.actualIncome)}</TableCell>
                  <TableCell>{eur(p.projectedRevenue)}</TableCell>
                  <TableCell>{eur(p.burnRate)}</TableCell>
                  <TableCell>{eur(p.netCashFlow)}</TableCell>
                  <TableCell>{eur(p.cumulativeNetProfit)}</TableCell>
                  <TableCell>{eur(p.cumulativePosition)}</TableCell>
                  <TableCell>{p.isBreakEven ? '✅' : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
