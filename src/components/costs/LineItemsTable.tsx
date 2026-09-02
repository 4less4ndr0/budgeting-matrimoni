import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMonthLabel, groupByMonth } from '@/lib/groupByMonth';
import { useAppStore } from '@/lib/storage/store';
import { cn } from '@/lib/utils';
import type { EntryType, LineItem } from '@/types/domain';

function formatEUR(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function LineItemCard({
  item,
  onUpdate,
  onRemove,
}: {
  item: LineItem;
  onUpdate: (patch: Partial<Omit<LineItem, 'id'>>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <Input
          type="date"
          className="flex-1"
          value={item.date}
          onChange={(e) => onUpdate({ date: e.target.value })}
        />
        <Button variant="ghost" size="icon" onClick={onRemove} title="Elimina">
          <Trash2 className="text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
      <Input
        type="text"
        placeholder="Categoria"
        className="mb-2"
        value={item.category}
        onChange={(e) => onUpdate({ category: e.target.value })}
      />
      <Input
        type="text"
        placeholder="Descrizione"
        className="mb-2"
        value={item.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
      />
      <div className="flex gap-2">
        <Input
          type="number"
          step="0.01"
          placeholder="Importo (€)"
          className="min-w-0 flex-1"
          value={item.amount}
          onChange={(e) => onUpdate({ amount: Number(e.target.value) })}
        />
        <Select value={item.type} onValueChange={(value) => onUpdate({ type: value as EntryType })}>
          <SelectTrigger className="w-32 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cost">Costo</SelectItem>
            <SelectItem value="income">Entrata</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function LineItemsTable() {
  const lineItems = useAppStore((s) => s.lineItems);
  const addLineItem = useAppStore((s) => s.addLineItem);
  const updateLineItem = useAppStore((s) => s.updateLineItem);
  const removeLineItem = useAppStore((s) => s.removeLineItem);

  const groups = useMemo(() => groupByMonth(lineItems), [lineItems]);
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [openMonth, setOpenMonth] = useState<string | undefined>(() => groups[0]?.[0]);

  function handleAdd() {
    addLineItem({
      date: new Date().toISOString().slice(0, 10),
      category: '',
      description: '',
      amount: 0,
      type: 'cost',
      source: 'manual',
    });
    // Jump to (and reveal) the current month's group, since that's always where a new entry lands.
    setOpenMonth(currentMonthKey);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voci di costo ed entrata</CardTitle>
        <CardDescription>
          Modifica liberamente qualsiasi valore: sono i tuoi dati di lavoro, non il file importato. Raggruppate
          per mese, dal più recente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Top CTA: adding an entry shouldn't require scrolling past the whole list first. */}
        <Button variant="secondary" className="mb-4 w-full sm:w-auto" onClick={handleAdd}>
          <Plus />
          Aggiungi voce
        </Button>

        {groups.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">
            Nessuna voce ancora. Importa un file o aggiungine una.
          </p>
        )}

        <Accordion type="single" collapsible value={openMonth} onValueChange={setOpenMonth}>
          {groups.map(([month, items]) => {
            const totalCost = items.filter((i) => i.type === 'cost').reduce((sum, i) => sum + i.amount, 0);
            const totalIncome = items.filter((i) => i.type === 'income').reduce((sum, i) => sum + i.amount, 0);
            const net = totalIncome - totalCost;

            return (
              <AccordionItem key={month} value={month}>
                <AccordionTrigger>
                  <div className="flex flex-1 items-baseline justify-between gap-3 pr-2">
                    <span className="flex items-baseline gap-2">
                      <span>{formatMonthLabel(month)}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {items.length} {items.length === 1 ? 'voce' : 'voci'}
                      </span>
                    </span>
                    <span className={cn('font-semibold', net < 0 ? 'text-destructive' : 'text-emerald-600')}>
                      {formatEUR(net)}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {/* Mobile: one card per row. */}
                  <div className="space-y-3 sm:hidden">
                    {items.map((item) => (
                      <LineItemCard
                        key={item.id}
                        item={item}
                        onUpdate={(patch) => updateLineItem(item.id, patch)}
                        onRemove={() => removeLineItem(item.id)}
                      />
                    ))}
                  </div>

                  {/* Desktop/tablet: table, one per month group. */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Descrizione</TableHead>
                          <TableHead>Importo (€)</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Input
                                type="date"
                                value={item.date}
                                onChange={(e) => updateLineItem(item.id, { date: e.target.value })}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={item.category}
                                onChange={(e) => updateLineItem(item.id, { category: e.target.value })}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.amount}
                                onChange={(e) => updateLineItem(item.id, { amount: Number(e.target.value) })}
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.type}
                                onValueChange={(value) => updateLineItem(item.id, { type: value as EntryType })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cost">Costo</SelectItem>
                                  <SelectItem value="income">Entrata</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLineItem(item.id)}
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
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
