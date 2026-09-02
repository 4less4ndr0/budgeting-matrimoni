import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppStore } from '@/lib/storage/store';
import type { FundEntry } from '@/types/domain';

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

  const sorted = [...fundEntries].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fondi disponibili</CardTitle>
        <CardDescription>
          Capitale già disponibile per il business (risparmi, investimenti, incassi già raccolti) — si somma ai
          ricavi proiettati per calcolare il break-even.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Mobile: one card per row, consistent with LineItemsTable. */}
        <div className="space-y-3 sm:hidden">
          {sorted.map((entry) => (
            <FundEntryCard
              key={entry.id}
              entry={entry}
              onUpdate={(patch) => updateFundEntry(entry.id, patch)}
              onRemove={() => removeFundEntry(entry.id)}
            />
          ))}
        </div>

        {/* Desktop/tablet: the original table. */}
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
              {sorted.map((entry) => (
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
                    <Button variant="ghost" size="icon" onClick={() => removeFundEntry(entry.id)} title="Elimina">
                      <Trash2 className="text-muted-foreground hover:text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {sorted.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">Nessun fondo ancora registrato.</p>
        )}

        <Button
          variant="secondary"
          className="mt-4"
          onClick={() =>
            addFundEntry({
              date: new Date().toISOString().slice(0, 10),
              amount: 0,
              description: '',
            })
          }
        >
          <Plus />
          Aggiungi fondo
        </Button>
      </CardContent>
    </Card>
  );
}
