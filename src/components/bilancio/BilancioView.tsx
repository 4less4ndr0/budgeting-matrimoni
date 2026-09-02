import { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Cell, Pie, PieChart } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CHART_COLORS } from '@/lib/charts/colors';
import { useAppStore } from '@/lib/storage/store';
import type { BudgetItem } from '@/types/domain';

function eur(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function colorFor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function BudgetItemCard({
  item,
  color,
  onUpdate,
  onRemove,
}: {
  item: BudgetItem;
  color: string;
  onUpdate: (patch: Partial<Omit<BudgetItem, 'id'>>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <Input
          type="text"
          placeholder="Voce"
          className="flex-1"
          value={item.nome}
          onChange={(e) => onUpdate({ nome: e.target.value })}
        />
        <Button variant="ghost" size="icon" onClick={onRemove} title="Elimina">
          <Trash2 className="text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
      <Input
        type="number"
        step="0.01"
        placeholder="Importo (€)"
        value={item.importo}
        onChange={(e) => onUpdate({ importo: Number(e.target.value) })}
      />
    </div>
  );
}

export default function BilancioView() {
  const budgetItems = useAppStore((s) => s.budgetItems);
  const addBudgetItem = useAppStore((s) => s.addBudgetItem);
  const updateBudgetItem = useAppStore((s) => s.updateBudgetItem);
  const removeBudgetItem = useAppStore((s) => s.removeBudgetItem);

  const total = useMemo(() => budgetItems.reduce((sum, i) => sum + (i.importo || 0), 0), [budgetItems]);

  // Chart slices skip zero/negative amounts (an empty or negative slice has nothing to draw)
  // and unnamed voci fall back to a placeholder label so the legend/tooltip aren't blank.
  const chartData = useMemo(
    () =>
      budgetItems
        .filter((i) => i.importo > 0)
        .map((i, idx) => ({ id: i.id, name: i.nome.trim() || `Voce ${idx + 1}`, value: i.importo })),
    [budgetItems],
  );

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    chartData.forEach((entry, i) => {
      config[entry.id] = { label: entry.name, color: colorFor(i) };
    });
    return config;
  }, [chartData]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Voci di bilancio</CardTitle>
          <CardDescription>Nome libero e importo per ogni voce — aggiungine quante ne servono.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile: one card per row, consistent with LineItemsTable/FundsTable. */}
          <div className="space-y-3 sm:hidden">
            {budgetItems.map((item, i) => (
              <BudgetItemCard
                key={item.id}
                item={item}
                color={colorFor(i)}
                onUpdate={(patch) => updateBudgetItem(item.id, patch)}
                onRemove={() => removeBudgetItem(item.id)}
              />
            ))}
          </div>

          {/* Desktop/tablet: the original table. */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>Voce</TableHead>
                  <TableHead>Importo (€)</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetItems.map((item, i) => (
                  <TableRow key={item.id}>
                    <TableCell className="w-4">
                      <span
                        className="block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: colorFor(i) }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Voce"
                        value={item.nome}
                        onChange={(e) => updateBudgetItem(item.id, { nome: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.importo}
                        onChange={(e) => updateBudgetItem(item.id, { importo: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBudgetItem(item.id)}
                        title="Elimina"
                      >
                        <Trash2 className="text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {budgetItems.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">Nessuna voce ancora inserita.</p>
          )}

          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => addBudgetItem({ nome: '', importo: 0 })}
          >
            <Plus />
            Aggiungi voce
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ripartizione del bilancio</CardTitle>
          <CardDescription>Ogni voce con un importo &gt; 0 diventa una fetta della ciambella.</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aggiungi almeno una voce con un importo per vedere il grafico.
            </p>
          ) : (
            <>
              <p className="mb-3 text-sm">
                Totale: <span className="font-semibold">{eur(total)}</span>
              </p>
              <ChartContainer config={chartConfig} className="h-[320px] w-full">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={80}
                    outerRadius={130}
                    paddingAngle={chartData.length > 1 ? 2 : 0}
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={entry.id} fill={colorFor(i)} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => eur(Number(v))} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
