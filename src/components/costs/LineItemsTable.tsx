import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppStore } from '@/lib/storage/store';
import type { EntryType } from '@/types/domain';

export default function LineItemsTable() {
  const lineItems = useAppStore((s) => s.lineItems);
  const addLineItem = useAppStore((s) => s.addLineItem);
  const updateLineItem = useAppStore((s) => s.updateLineItem);
  const removeLineItem = useAppStore((s) => s.removeLineItem);

  const sorted = [...lineItems].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voci di costo ed entrata</CardTitle>
        <CardDescription>
          Modifica liberamente qualsiasi valore: sono i tuoi dati di lavoro, non il file importato.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            {sorted.map((item) => (
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
                  <Button variant="ghost" size="icon" onClick={() => removeLineItem(item.id)} title="Elimina">
                    <Trash2 className="text-muted-foreground hover:text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {sorted.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">
            Nessuna voce ancora. Importa un file o aggiungine una.
          </p>
        )}

        <Button
          variant="secondary"
          className="mt-4"
          onClick={() =>
            addLineItem({
              date: new Date().toISOString().slice(0, 10),
              category: '',
              description: '',
              amount: 0,
              type: 'cost',
              source: 'manual',
            })
          }
        >
          <Plus />
          Aggiungi voce
        </Button>
      </CardContent>
    </Card>
  );
}
