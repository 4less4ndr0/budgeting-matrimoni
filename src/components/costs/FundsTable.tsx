import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMonthLabel, groupByMonth } from '@/lib/groupByMonth';
import { useAppStore } from '@/lib/storage/store';
import type { FundEntry } from '@/types/domain';

function formatEUR(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function FundEntryCard({
  entry,
  onUpdate,
  onRemove,
}: {
  entry: FundEntry;
  onUpdate: (patch: Partial<Omit<FundEntry, 'id'>>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <Input
          type="date"
          className="flex-1"
          value={entry.date}
          onChange={(e) => onUpdate({ date: e.target.value })}
        />
        <Button variant="ghost" size="icon" onClick={onRemove} title="Elimina">
          <Trash2 className="text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
      <Input
        type="text"
        placeholder="Descrizione"
        className="mb-2"
        value={entry.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
      />
      <Input
        type="number"
        step="0.01"
        placeholder="Importo (€)"
        value={entry.amount}
        onChange={(e) => onUpdate({ amount: Number(e.target.value) })}
      />
    </div>
  );
}

export default function FundsTable() {
  const fundEntries = useAppStore((s) => s.fundEntries);
  const addFundEntry = useAppStore((s) => s.addFundEntry);
  const updateFundEntry = useAppStore((s) => s.updateFundEntry);
  const removeFundEntry = useAppStore((s) => s.removeFundEntry);

  const groups = useMemo(() => groupByMonth(fundEntries), [fundEntries]);
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [openMonth, setOpenMonth] = useState<string | undefined>(() => groups[0]?.[0]);

  function handleAdd() {
    addFundEntry({
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      description: '',
    });
    setOpenMonth(currentMonthKey);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fondi disponibili</CardTitle>
        <CardDescription>
          Capitale già disponibile per il business (risparmi, investimenti, incassi già raccolti) — si somma ai
          ricavi proiettati per calcolare il break-even. Raggruppati per mese, dal più recente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Top CTA: adding a fund shouldn't require scrolling past the whole list first. */}
        <Button variant="secondary" className="mb-4 w-full sm:w-auto" onClick={handleAdd}>
          <Plus />
          Aggiungi fondo
        </Button>

        {groups.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nessun fondo ancora registrato.</p>}

        <Accordion type="single" collapsible value={openMonth} onValueChange={setOpenMonth}>
          {groups.map(([month, entries]) => {
            const total = entries.reduce((sum, e) => sum + e.amount, 0);

            return (
              <AccordionItem key={month} value={month}>
                <AccordionTrigger>
                  <div className="flex flex-1 items-baseline justify-between gap-3 pr-2">
                    <span className="flex items-baseline gap-2">
                      <span>{formatMonthLabel(month)}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {entries.length} {entries.length === 1 ? 'fondo' : 'fondi'}
                      </span>
                    </span>
                    <span className="font-semibold text-emerald-600">{formatEUR(total)}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {/* Mobile: one card per row. */}
                  <div className="space-y-3 sm:hidden">
                    {entries.map((entry) => (
                      <FundEntryCard
                        key={entry.id}
                        entry={entry}
                        onUpdate={(patch) => updateFundEntry(entry.id, patch)}
                        onRemove={() => removeFundEntry(entry.id)}
                      />
                    ))}
                  </div>

                  {/* Desktop/tablet: table, one per month group. */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrizione</TableHead>
                          <TableHead>Importo (€)</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <Input
                                type="date"
                                value={entry.date}
                                onChange={(e) => updateFundEntry(entry.id, { date: e.target.value })}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={entry.description}
                                onChange={(e) => updateFundEntry(entry.id, { description: e.target.value })}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={entry.amount}
                                onChange={(e) => updateFundEntry(entry.id, { amount: Number(e.target.value) })}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFundEntry(entry.id)}
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
