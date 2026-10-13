import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildOrgTree, fullName, wouldCreateCycle, type OrgNode } from '@/lib/hr/hr';
import { useAppStore } from '@/lib/storage/store';
import { cn } from '@/lib/utils';
import type { Ruolo } from '@/types/domain';

const VERTICE = '__vertice__';

function SuperioreSelect({ ruolo, ruoli }: { ruolo: Ruolo; ruoli: Ruolo[] }) {
  const updateRuolo = useAppStore((s) => s.updateRuolo);
  // Only offer superiori that keep the organigramma a tree: not itself, not its own sub-ruoli.
  const opzioni = ruoli
    .filter((r) => !wouldCreateCycle(ruoli, ruolo.id, r.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

  return (
    <Select
      value={ruolo.superioreId ?? VERTICE}
      onValueChange={(v) => updateRuolo(ruolo.id, { superioreId: v === VERTICE ? null : v })}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={VERTICE}>
          <span className="text-muted-foreground">Nessuno (vertice)</span>
        </SelectItem>
        {opzioni.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.nome || 'Ruolo senza nome'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function OrgBranch({ node }: { node: OrgNode }) {
  const vacante = node.dipendenti.length === 0;
  return (
    <li>
      <div
        className={cn(
          'min-w-[9rem] max-w-[13rem] rounded-lg border bg-card px-3 py-2 text-center shadow-sm',
          vacante && 'border-red-500/70 bg-red-500/10',
        )}
      >
        <div className={cn('text-sm font-semibold leading-tight', vacante && 'text-red-600 dark:text-red-400')}>
          {node.ruolo.nome || 'Ruolo senza nome'}
        </div>
        <div className="mt-1 space-y-0.5 text-xs">
          {vacante ? (
            <div className="italic text-red-600 dark:text-red-400">Posizione vacante</div>
          ) : (
            node.dipendenti.map((d) => (
              <div key={d.id} className="truncate text-muted-foreground" title={fullName(d)}>
                {fullName(d) || 'Senza nome'}
              </div>
            ))
          )}
        </div>
      </div>
      {node.figli.length > 0 && (
        <ul>
          {node.figli.map((f) => (
            <OrgBranch key={f.ruolo.id} node={f} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function OrganigrammaView() {
  const ruoli = useAppStore((s) => s.ruoli);
  const dipendenti = useAppStore((s) => s.dipendenti);
  const addRuolo = useAppStore((s) => s.addRuolo);
  const updateRuolo = useAppStore((s) => s.updateRuolo);
  const removeRuolo = useAppStore((s) => s.removeRuolo);
  const [pendingDelete, setPendingDelete] = useState<Ruolo | null>(null);

  const albero = useMemo(() => buildOrgTree(ruoli, dipendenti), [ruoli, dipendenti]);

  // On a phone the chart is wider than the screen: start scrolled to the middle so the top
  // of the organigramma is in view instead of its leftmost branch.
  const scrollRef = useRef<HTMLDivElement>(null);
  const haAlbero = albero.length > 0;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [haAlbero]);
  const senzaRuolo = useMemo(() => {
    const ids = new Set(ruoli.map((r) => r.id));
    return dipendenti.filter((d) => !d.ruoloId || !ids.has(d.ruoloId));
  }, [ruoli, dipendenti]);
  const contaPerRuolo = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of dipendenti) if (d.ruoloId) m.set(d.ruoloId, (m.get(d.ruoloId) ?? 0) + 1);
    return m;
  }, [dipendenti]);

  const pendingInfo = pendingDelete
    ? {
        persone: contaPerRuolo.get(pendingDelete.id) ?? 0,
        sotto: ruoli.filter((r) => r.superioreId === pendingDelete.id).length,
      }
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Organigramma
            <InfoTooltip content="Generato dai ruoli qui sotto: ogni ruolo sta sotto quello a cui riporta, con i dipendenti che lo ricoprono." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {albero.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aggiungi almeno un ruolo per vedere l&apos;organigramma.
            </p>
          ) : (
            // w-max + min-w-full: centered while it fits, horizontally scrollable once it doesn't.
            <div ref={scrollRef} className="-mx-2 overflow-x-auto px-2 pb-2">
              <div className="org-tree mx-auto w-max min-w-full">
                <ul>
                  {albero.map((n) => (
                    <OrgBranch key={n.ruolo.id} node={n} />
                  ))}
                </ul>
              </div>
            </div>
          )}

          {senzaRuolo.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-3 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                Senza ruolo:
              </span>
              {senzaRuolo.map((d, i) => (
                <span key={d.id}>
                  {fullName(d) || 'Senza nome'}
                  {i < senzaRuolo.length - 1 ? ',' : ''}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Ruoli
            <InfoTooltip content="Per ogni ruolo scegli a chi riporta: è questo che costruisce la gerarchia. I ruoli assegnati ai dipendenti si possono creare anche dalla scheda del dipendente." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ruoli.length > 0 && (
            <div className="space-y-3">
              <div className="hidden grid-cols-[1fr_1fr_5rem_2.5rem] gap-2 text-xs font-medium text-muted-foreground sm:grid">
                <span>Ruolo</span>
                <span>Riporta a</span>
                <span className="text-center">Persone</span>
                <span />
              </div>
              {ruoli.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_5rem_2.5rem] sm:items-center sm:rounded-none sm:border-0 sm:p-0"
                >
                  <Input
                    placeholder="Nome del ruolo"
                    value={r.nome}
                    onChange={(e) => updateRuolo(r.id, { nome: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="sm:order-last"
                    onClick={() => setPendingDelete(r)}
                    title="Elimina ruolo"
                  >
                    <Trash2 className="text-muted-foreground hover:text-destructive" />
                  </Button>
                  <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                    <span className="shrink-0 text-xs text-muted-foreground sm:hidden">Riporta a</span>
                    <SuperioreSelect ruolo={r} ruoli={ruoli} />
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground sm:col-span-1 sm:text-center sm:text-sm sm:text-foreground">
                    <span className="sm:hidden">Persone: </span>
                    {contaPerRuolo.get(r.id) ?? 0}
                  </div>
                </div>
              ))}
            </div>
          )}

          {ruoli.length === 0 && <p className="py-2 text-sm text-muted-foreground">Nessun ruolo ancora definito.</p>}

          <Button variant="secondary" className="mt-4" onClick={() => addRuolo('')}>
            <Plus />
            Aggiungi ruolo
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il ruolo &quot;{pendingDelete?.nome || 'senza nome'}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Nessun dipendente viene cancellato.
              {pendingInfo && pendingInfo.persone > 0 &&
                ` ${pendingInfo.persone === 1 ? 'La persona che lo ricopre resta' : `Le ${pendingInfo.persone} persone che lo ricoprono restano`} senza ruolo.`}
              {pendingInfo && pendingInfo.sotto > 0 &&
                ` ${pendingInfo.sotto === 1 ? 'Il ruolo che gli riporta sale' : `I ${pendingInfo.sotto} ruoli che gli riportano salgono`} di un livello.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) {
                  removeRuolo(pendingDelete.id);
                  toast.success(`Ruolo "${pendingDelete.nome || 'senza nome'}" eliminato`);
                }
                setPendingDelete(null);
              }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
