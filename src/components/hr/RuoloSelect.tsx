import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/lib/storage/store';

// Radix Select doesn't allow '' as an item value: sentinels instead.
const NESSUNO = '__nessuno__';
const NUOVO = '__nuovo__';

/**
 * Picks a ruolo for a dipendente, or creates a new one on the spot (it lands at the top of
 * the organigramma; the hierarchy is set from the Organigramma page).
 */
export default function RuoloSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (ruoloId: string | null) => void;
}) {
  const ruoli = useAppStore((s) => s.ruoli);
  const addRuolo = useAppStore((s) => s.addRuolo);
  const [creating, setCreating] = useState(false);
  const [nuovoNome, setNuovoNome] = useState('');

  const sorted = [...ruoli].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

  function crea() {
    const nome = nuovoNome.trim();
    if (!nome) return;
    const existing = ruoli.find((r) => r.nome.toLowerCase() === nome.toLowerCase());
    onChange(existing ? existing.id : addRuolo(nome));
    setNuovoNome('');
    setCreating(false);
  }

  if (creating) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          placeholder="Nome del nuovo ruolo"
          value={nuovoNome}
          onChange={(e) => setNuovoNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              crea();
            }
            if (e.key === 'Escape') {
              e.stopPropagation();
              setCreating(false);
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={crea} disabled={!nuovoNome.trim()}>
          Crea
        </Button>
        <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
          Annulla
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value ?? NESSUNO}
      onValueChange={(v) => {
        if (v === NUOVO) setCreating(true);
        else onChange(v === NESSUNO ? null : v);
      }}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NESSUNO}>
          <span className="text-muted-foreground">Nessun ruolo</span>
        </SelectItem>
        {sorted.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.nome || 'Ruolo senza nome'}
          </SelectItem>
        ))}
        <SelectSeparator />
        <SelectItem value={NUOVO}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuovo ruolo…
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
