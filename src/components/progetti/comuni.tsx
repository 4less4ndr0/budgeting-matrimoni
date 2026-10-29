import { useMemo, useRef, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fullName } from '@/lib/hr/hr';
import { useAppStore } from '@/lib/storage/store';
import { cn } from '@/lib/utils';
import type { Persona, Progetto } from '@/types/domain';

export function eur(n: number | null | undefined, decimali = 0): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: decimali });
}

export function dataBreve(d: Date | null): string {
  return d ? format(d, 'd MMM yyyy', { locale: it }) : '—';
}

/** The active project plus a setter that edits it (patch or function of the current one). */
export function useProgettoAttivo(): { progetto: Progetto | null; aggiorna: (c: Partial<Progetto> | ((p: Progetto) => Progetto)) => void } {
  const progetti = useAppStore((s) => s.progetti);
  const updateProgetto = useAppStore((s) => s.updateProgetto);
  const progetto = progetti.progetti.find((p) => p.id === progetti.progettoAttivoId) ?? null;
  return {
    progetto,
    aggiorna: (c) => {
      if (progetto) updateProgetto(progetto.id, c);
    },
  };
}

/** Warnings box at the top of a tab: never blocks anything, like Governance. */
export function AvvisiBox({ avvisi }: { avvisi: string[] }) {
  if (avvisi.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <div className="mb-1 flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4" />
        Da controllare
      </div>
      <ul className="space-y-0.5 text-amber-800 dark:text-amber-200">
        {avvisi.map((a) => (
          <li key={a}>· {a}</li>
        ))}
      </ul>
    </div>
  );
}

export function Campo({ label, children, className, htmlFor }: { label: ReactNode; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="font-normal text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

const TEXTAREA =
  'w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:text-sm';

export function AreaTesto({
  value,
  onChange,
  rows = 3,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  id?: string;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      placeholder={placeholder}
      className={TEXTAREA}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/**
 * A string list edited one item per line. Blank lines are kept while typing (otherwise Enter at
 * the end would be swallowed) and dropped wherever the list is used.
 */
export function ListaRighe({
  value,
  onChange,
  rows = 3,
  placeholder,
  id,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  rows?: number;
  placeholder?: string;
  id?: string;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      placeholder={placeholder}
      className={TEXTAREA}
      value={value.join('\n')}
      onChange={(e) => onChange(e.target.value.split('\n'))}
    />
  );
}

export function pulisci(lista: string[]): string[] {
  return lista.map((x) => x.trim()).filter(Boolean);
}

const NESSUNO = '__nessuno__';
const ESTERNO = '__esterno__';

/** A seat filled by a dipendente from HR or by an external person typed by hand. */
export function PersonaSelect({
  value,
  onChange,
  placeholder = 'Scegli una persona',
}: {
  value: Persona;
  onChange: (p: Persona) => void;
  placeholder?: string;
}) {
  const dipendenti = useAppStore((s) => s.dipendenti);
  const [esternoAperto, setEsternoAperto] = useState(false);
  // Closing a Select hands focus back to its trigger, which would steal it from the name field
  // that has just appeared (same fix as in Governance).
  const tieniFocusSulNome = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ordinati = useMemo(
    () => [...dipendenti].sort((a, b) => fullName(a).localeCompare(fullName(b), 'it')),
    [dipendenti],
  );

  const esterno = !value.dipendenteId && (esternoAperto || value.nomeEsterno !== '');
  const selezione = value.dipendenteId ?? (esterno ? ESTERNO : NESSUNO);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Select
        value={selezione}
        onValueChange={(v) => {
          if (v === ESTERNO) {
            tieniFocusSulNome.current = true;
            setEsternoAperto(true);
            onChange({ dipendenteId: null, nomeEsterno: value.dipendenteId ? '' : value.nomeEsterno });
          } else {
            setEsternoAperto(false);
            onChange({ dipendenteId: v === NESSUNO ? null : v, nomeEsterno: '' });
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          onCloseAutoFocus={(e) => {
            if (tieniFocusSulNome.current) {
              e.preventDefault();
              tieniFocusSulNome.current = false;
              inputRef.current?.focus();
            }
          }}
        >
          <SelectItem value={NESSUNO}>
            <span className="text-muted-foreground">Nessuno</span>
          </SelectItem>
          {ordinati.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {fullName(d) || 'Senza nome'}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={ESTERNO}>Persona esterna…</SelectItem>
        </SelectContent>
      </Select>
      {esterno && (
        <Input
          ref={inputRef}
          autoFocus={esternoAperto && value.nomeEsterno === ''}
          placeholder="Nome e cognome (esterno)"
          value={value.nomeEsterno}
          onChange={(e) => onChange({ dipendenteId: null, nomeEsterno: e.target.value })}
        />
      )}
    </div>
  );
}

export const PERSONA_VUOTA: Persona = { dipendenteId: null, nomeEsterno: '' };
