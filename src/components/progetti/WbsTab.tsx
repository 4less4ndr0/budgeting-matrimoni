import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { NumeroInput } from '@/components/common/NumeroInput';
import {
  avvisiWbs,
  codiceOr,
  codiceTask,
  costoStimatoTotale,
  costoTask,
  mesiOr,
  orOrdinati,
  taskDiOr,
  termini,
} from '@/lib/progetti/calcoli';
import { INFO_CATEGORIE } from '@/lib/progetti/glossario';
import { aggiungiDeliverable, aggiungiMilestone, aggiungiOr, aggiungiTask, rimuoviOr, rimuoviTask, spostaOr } from '@/lib/progetti/modifiche';
import { cn } from '@/lib/utils';
import type { Deliverable, Milestone, Nomenclatura, ObiettivoRealizzativo, Progetto, StatoDeliverable, Task, TipologiaRS } from '@/types/domain';
import { AreaTesto, AvvisiBox, Campo, Info, PersonaSelect, eur, pulisci } from './comuni';

type Aggiorna = (c: Partial<Progetto> | ((p: Progetto) => Progetto)) => void;

export const COLORE_RS: Record<TipologiaRS, string> = {
  RI: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  SS: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
};

/** A compact multi-select: a button that opens a checklist. */
function MultiScelta({
  etichetta,
  opzioni,
  selezionati,
  onChange,
  vuoto = 'Nessuno',
}: {
  etichetta: string;
  opzioni: Array<{ id: string; label: string }>;
  selezionati: string[];
  onChange: (ids: string[]) => void;
  vuoto?: string;
}) {
  const scelti = opzioni.filter((o) => selezionati.includes(o.id));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal" disabled={opzioni.length === 0}>
          <span className={cn('truncate', scelti.length === 0 && 'text-muted-foreground')}>
            {scelti.length === 0 ? (opzioni.length === 0 ? `${vuoto} disponibile` : vuoto) : scelti.map((s) => s.label).join(', ')}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-64 overflow-y-auto">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{etichetta}</DropdownMenuLabel>
        {opzioni.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.id}
            checked={selezionati.includes(o.id)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(c) => onChange(c ? [...selezionati, o.id] : selezionati.filter((x) => x !== o.id))}
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function opzioniPartner(p: Progetto) {
  return [...p.partner]
    .sort((a, b) => a.numeroAssociato - b.numeroAssociato)
    .map((x) => ({ id: x.id, label: x.nome.trim() || (x.isNostraImpresa ? 'Nostra impresa' : `Associato ${x.numeroAssociato}`) }));
}

function TaskRiga({ p, t, aggiorna }: { p: Progetto; t: Task; aggiorna: Aggiorna }) {
  const [aperto, setAperto] = useState(false);
  const set = (patch: Partial<Task>) => aggiorna((x) => ({ ...x, task: x.task.map((y) => (y.id === t.id ? { ...y, ...patch } : y)) }));
  const categorie = pulisci(p.bando.categorieCosto);
  const deliverable = p.deliverable.filter((d) => d.taskId === t.id);
  const altriTask = p.task.filter((x) => x.id !== t.id).sort((a, b) => codiceTask(p, a).localeCompare(codiceTask(p, b), 'it', { numeric: true }));

  return (
    <div className="rounded-md border bg-background p-2">
      <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 sm:grid-cols-[2.5rem_1fr_4.5rem_4.5rem_5rem_auto]">
        <span className="font-mono text-xs text-muted-foreground">{codiceTask(p, t)}</span>
        <Input placeholder="Titolo del task" value={t.titolo} onChange={(e) => set({ titolo: e.target.value })} />
        <div className="col-span-3 grid grid-cols-3 gap-2 sm:contents">
          <NumeroInput aria-label="Mese di inizio" step="1" min="1" placeholder="Da M" value={t.meseInizio} onChange={(v) => set({ meseInizio: v ?? 1 })} />
          <NumeroInput aria-label="Mese di fine" step="1" min="1" placeholder="A M" value={t.meseFine} onChange={(v) => set({ meseFine: v ?? t.meseInizio })} />
          <NumeroInput aria-label="Avanzamento %" step="5" max="100" placeholder="%" value={t.avanzamentoPct} onChange={(v) => set({ avanzamentoPct: Math.min(Math.max(v ?? 0, 0), 100) })} />
        </div>
        <div className="col-start-3 row-start-1 flex sm:col-start-auto sm:row-start-auto">
          <Button variant="ghost" size="icon" onClick={() => setAperto(!aperto)} title={aperto ? 'Chiudi dettagli' : 'Dettagli: partner, dipendenze, costi'}>
            {aperto ? <ChevronDown /> : <ChevronRight />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => aggiorna((x) => rimuoviTask(x, [t.id]))} title="Elimina task">
            <Trash2 className="text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[3rem] text-xs text-muted-foreground">
        <span>M{t.meseInizio}–M{t.meseFine}</span>
        <span>{t.avanzamentoPct}% completato</span>
        {costoTask(t) > 0 && <span>{eur(costoTask(t))}</span>}
        {deliverable.length > 0 && <span>{deliverable.map((d) => d.codice).join(', ')}</span>}
      </div>

      {aperto && (
        <div className="mt-3 space-y-3 border-t pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Partner" info="partnerTask">
              <MultiScelta etichetta="Partner coinvolti" opzioni={opzioniPartner(p)} selezionati={t.partnerIds} onChange={(ids) => set({ partnerIds: ids })} />
            </Campo>
            <Campo label="Predecessori (facoltativi)" info="predecessori">
              <MultiScelta
                etichetta="Questo task parte dopo…"
                opzioni={altriTask.map((x) => ({ id: x.id, label: `${codiceTask(p, x)} ${x.titolo}`.trim() }))}
                selezionati={t.predecessoriIds}
                onChange={(ids) => set({ predecessoriIds: ids })}
                vuoto="Nessun altro task"
              />
            </Campo>
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              Costo stimato per categoria (€) · totale {eur(costoTask(t))}
              <Info k="costiTask" />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {categorie.map((c) => (
                <Campo key={c} label={c} infoTesto={INFO_CATEGORIE[c]}>
                  <NumeroInput
                    value={t.costiStimati[c] ?? null}
                    onChange={(v) => {
                      const costiStimati = { ...t.costiStimati };
                      if (v === null) delete costiStimati[c];
                      else costiStimati[c] = v;
                      set({ costiStimati });
                    }}
                  />
                </Campo>
              ))}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => aggiorna((x) => aggiungiDeliverable(x, t.id))}>
            <Plus />
            Aggiungi deliverable a questo task
          </Button>
        </div>
      )}
    </div>
  );
}

function OrCard({ p, or, aggiorna }: { p: Progetto; or: ObiettivoRealizzativo; aggiorna: Aggiorna }) {
  const t = termini(p);
  const set = (patch: Partial<ObiettivoRealizzativo>) => aggiorna((x) => ({ ...x, or: x.or.map((o) => (o.id === or.id ? { ...o, ...patch } : o)) }));
  const derivati = mesiOr(p, { ...or, meseInizio: null, meseFine: null });
  const tasks = taskDiOr(p, or.id);
  const ordinati = orOrdinati(p);
  const primo = ordinati[0]?.id === or.id;
  const ultimo = ordinati[ordinati.length - 1]?.id === or.id;

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold">{codiceOr(p, or.id)}</span>
        {or.tipologia && <Badge className={cn('border-transparent font-normal', COLORE_RS[or.tipologia])}>{or.tipologia}</Badge>}
        <Input className="min-w-0 flex-1 basis-full sm:w-auto sm:basis-auto" placeholder={`Titolo ${t.del}`} value={or.titolo} onChange={(e) => set({ titolo: e.target.value })} />
        <div className="ml-auto flex sm:ml-0">
          <Button variant="ghost" size="icon" disabled={primo} onClick={() => aggiorna((x) => spostaOr(x, or.id, -1))} title="Sposta su">
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon" disabled={ultimo} onClick={() => aggiorna((x) => spostaOr(x, or.id, 1))} title="Sposta giù">
            <ArrowDown />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => aggiorna((x) => rimuoviOr(x, or.id))} title={`Elimina ${t.il} con i suoi task`}>
            <Trash2 className="text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Obiettivo operativo" className="sm:col-span-2 lg:col-span-4" info="obiettivoOperativo">
          <AreaTesto rows={2} value={or.obiettivo} onChange={(v) => set({ obiettivo: v })} placeholder={`Cosa deve ottenere ${t.il}`} />
        </Campo>
        <Campo label="Tipologia" info="tipologiaOr">
          <ToggleGroup
            type="single"
            variant="outline"
            className="justify-start"
            value={or.tipologia ?? ''}
            onValueChange={(v) => set({ tipologia: (v || null) as TipologiaRS | null })}
          >
            <ToggleGroupItem value="RI">RI</ToggleGroupItem>
            <ToggleGroupItem value="SS">SS</ToggleGroupItem>
          </ToggleGroup>
        </Campo>
        <Campo label={t.leader} info="orLeader">
          <PersonaSelect value={or.leader} onChange={(leader) => set({ leader })} />
        </Campo>
        <Campo label="Partner coinvolti" info="partnerOr">
          <MultiScelta etichetta={`Partner ${t.del}`} opzioni={opzioniPartner(p)} selezionati={or.partnerIds} onChange={(ids) => set({ partnerIds: ids })} />
        </Campo>
        <div className="grid grid-cols-2 gap-2">
          <Campo label="Mese inizio" info="mesiOr">
            <NumeroInput step="1" min="1" placeholder={derivati.inizio ? `M${derivati.inizio}` : 'auto'} value={or.meseInizio} onChange={(v) => set({ meseInizio: v })} />
          </Campo>
          <Campo label="Mese fine" info="mesiOr">
            <NumeroInput step="1" min="1" placeholder={derivati.fine ? `M${derivati.fine}` : 'auto'} value={or.meseFine} onChange={(v) => set({ meseFine: v })} />
          </Campo>
        </div>
      </div>

      <div className="mt-3 space-y-2 border-t pt-3">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          Task
          <InfoTooltip content="L'unità più piccola del progetto. Sommati nel tempo danno il Gantt, sommati nei costi danno il budget." />
        </div>
        {tasks.length > 0 && (
          // Column hints for the task rows (desktop: same grid as TaskRiga).
          <div className="hidden grid-cols-[2.5rem_1fr_4.5rem_4.5rem_5rem_5.5rem] gap-2 px-2 text-xs text-muted-foreground sm:grid">
            <span>Cod.</span>
            <span>Titolo</span>
            <span className="col-span-2 flex items-center gap-1">
              Da M · a M <Info k="mesiTask" />
            </span>
            <span className="flex items-center gap-1">
              % <Info k="avanzamento" />
            </span>
          </div>
        )}
        {tasks.map((t) => (
          <TaskRiga key={t.id} p={p} t={t} aggiorna={aggiorna} />
        ))}
        <Button variant="secondary" size="sm" onClick={() => aggiorna((x) => aggiungiTask(x, or.id))}>
          <Plus />
          Aggiungi task
        </Button>
      </div>
    </div>
  );
}

const STATI_DELIVERABLE: Array<{ id: StatoDeliverable; label: string }> = [
  { id: 'da-fare', label: 'Da fare' },
  { id: 'in-revisione', label: 'In revisione' },
  { id: 'approvato', label: 'Approvato' },
];

function DeliverableCard({ p, aggiorna }: { p: Progetto; aggiorna: Aggiorna }) {
  const set = (id: string, patch: Partial<Deliverable>) =>
    aggiorna((x) => ({ ...x, deliverable: x.deliverable.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
  const tasks = [...p.task].sort((a, b) => codiceTask(p, a).localeCompare(codiceTask(p, b), 'it', { numeric: true }));
  const elenco = [...p.deliverable].sort((a, b) => a.codice.localeCompare(b.codice, 'it', { numeric: true }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Deliverable
          <InfoTooltip content="Il risultato concreto di un task: un documento, un prototipo, un software. Lo approva lo Steering Committee." />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {elenco.length === 0 && <p className="text-sm text-muted-foreground">Nessun deliverable: aggiungili dai dettagli di un task.</p>}
        {elenco.length > 0 && (
          <div className="hidden grid-cols-[5.5rem_1fr_10rem_4.5rem_9rem_2.5rem] gap-2 text-xs text-muted-foreground sm:grid">
            <span className="flex items-center gap-1">
              Codice <Info k="codiceDeliverable" />
            </span>
            <span>Titolo</span>
            <span className="flex items-center gap-1">
              Task <Info k="taskDeliverable" />
            </span>
            <span className="flex items-center gap-1">
              Mese <Info k="meseDeliverable" />
            </span>
            <span className="flex items-center gap-1">
              Stato <Info k="statoDeliverable" />
            </span>
          </div>
        )}
        {elenco.map((d) => (
          <div key={d.id} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 sm:grid-cols-[5.5rem_1fr_10rem_4.5rem_9rem_auto]">
            <Input aria-label="Codice" value={d.codice} onChange={(e) => set(d.id, { codice: e.target.value })} />
            <Input placeholder="Titolo" value={d.titolo} onChange={(e) => set(d.id, { titolo: e.target.value })} />
            <div className="col-span-3 grid grid-cols-[1fr_4.5rem_1fr] gap-2 sm:contents">
              <Select value={d.taskId} onValueChange={(v) => set(d.id, { taskId: v })}>
                <SelectTrigger aria-label="Task">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      Task {codiceTask(p, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <NumeroInput aria-label="Mese di consegna" step="1" min="1" value={d.mese} onChange={(v) => set(d.id, { mese: v ?? 1 })} />
              <Select value={d.stato} onValueChange={(v) => set(d.id, { stato: v as StatoDeliverable })}>
                <SelectTrigger aria-label="Stato">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATI_DELIVERABLE.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="col-start-3 row-start-1 sm:col-start-auto sm:row-start-auto"
              title="Elimina deliverable"
              onClick={() =>
                aggiorna((x) => ({
                  ...x,
                  deliverable: x.deliverable.filter((y) => y.id !== d.id),
                  milestone: x.milestone.map((m) => ({ ...m, deliverableIds: m.deliverableIds.filter((id) => id !== d.id) })),
                }))
              }
            >
              <Trash2 className="text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MilestoneCard({ p, aggiorna }: { p: Progetto; aggiorna: Aggiorna }) {
  const set = (id: string, patch: Partial<Milestone>) =>
    aggiorna((x) => ({ ...x, milestone: x.milestone.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  const opzioni = [...p.deliverable]
    .sort((a, b) => a.codice.localeCompare(b.codice, 'it', { numeric: true }))
    .map((d) => ({ id: d.id, label: `${d.codice} ${d.titolo}`.trim() }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Milestone
          <InfoTooltip content="Un momento di verifica: entro quel mese deve esserci un risultato. Se salta, si rivede il Gantt." />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {p.milestone.length === 0 && <p className="text-sm text-muted-foreground">Nessuna milestone.</p>}
        {p.milestone.length > 0 && (
          <div className="hidden grid-cols-[4.5rem_1fr_4.5rem_12rem_5.5rem_2.5rem] gap-2 text-xs text-muted-foreground sm:grid">
            <span className="flex items-center gap-1">
              Codice <Info k="codiceMilestone" />
            </span>
            <span>Titolo</span>
            <span className="flex items-center gap-1">
              Mese <Info k="meseMilestone" />
            </span>
            <span className="flex items-center gap-1">
              Deliverable <Info k="deliverableMilestone" />
            </span>
            <span className="flex items-center gap-1">
              Raggiunta <Info k="raggiunta" />
            </span>
          </div>
        )}
        {[...p.milestone]
          .sort((a, b) => a.mese - b.mese)
          .map((m) => (
            <div key={m.id} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 sm:grid-cols-[4.5rem_1fr_4.5rem_12rem_auto_auto]">
              <Input aria-label="Codice" value={m.codice} onChange={(e) => set(m.id, { codice: e.target.value })} />
              <Input placeholder="Titolo" value={m.titolo} onChange={(e) => set(m.id, { titolo: e.target.value })} />
              <div className="col-span-3 grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 sm:contents">
                <NumeroInput aria-label="Mese" step="1" min="1" value={m.mese} onChange={(v) => set(m.id, { mese: v ?? 1 })} />
                <MultiScelta
                  etichetta="Deliverable che la sbloccano"
                  opzioni={opzioni}
                  selezionati={m.deliverableIds}
                  onChange={(ids) => set(m.id, { deliverableIds: ids })}
                  vuoto="Nessun deliverable"
                />
                <label className="flex items-center gap-1.5 whitespace-nowrap text-sm">
                  <Checkbox checked={m.raggiunta} onCheckedChange={(c) => set(m.id, { raggiunta: c === true })} />
                  Raggiunta
                </label>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="col-start-3 row-start-1 sm:col-start-auto sm:row-start-auto"
                title="Elimina milestone"
                onClick={() => aggiorna((x) => ({ ...x, milestone: x.milestone.filter((y) => y.id !== m.id) }))}
              >
                <Trash2 className="text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
        <Button variant="secondary" size="sm" onClick={() => aggiorna(aggiungiMilestone)}>
          <Plus />
          Aggiungi milestone
        </Button>
      </CardContent>
    </Card>
  );
}

export default function WbsTab({ p, aggiorna }: { p: Progetto; aggiorna: Aggiorna }) {
  const ors = orOrdinati(p);
  const t = termini(p);
  return (
    <div className="space-y-4">
      <AvvisiBox avvisi={avvisiWbs(p)} />
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-1.5">
            Work Breakdown Structure
            <InfoTooltip
              content={`Scomponi il progetto in ${t.plurale.toLowerCase()} (${t.sigla}) e poi in task, fino a pezzi che puoi stimare e assegnare. Ogni pezzo produce un deliverable.`}
            />
            <span className="text-sm font-normal text-muted-foreground">
              · {ors.length} {t.sigla} · {p.task.length} task · costo stimato {eur(costoStimatoTotale(p))}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              Chiamali <Info k="nomenclatura" />
            </span>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={p.nomenclatura ?? 'OR'}
              onValueChange={(v) => v && aggiorna({ nomenclatura: v as Nomenclatura })}
            >
              <ToggleGroupItem value="OR">Obiettivi realizzativi (OR)</ToggleGroupItem>
              <ToggleGroupItem value="WP">Work Package (WP)</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {t.plurale}
            <InfoTooltip content="Un sotto-progetto con un obiettivo chiaro, date di inizio e fine e dei deliverable. Tienilo tutto ricerca industriale o tutto sviluppo sperimentale." />
          </div>
          {ors.map((or) => (
            <OrCard key={or.id} p={p} or={or} aggiorna={aggiorna} />
          ))}
          <Button variant="secondary" onClick={() => aggiorna(aggiungiOr)}>
            <Plus />
            Aggiungi {t.sigla}
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <DeliverableCard p={p} aggiorna={aggiorna} />
        <MilestoneCard p={p} aggiorna={aggiorna} />
      </div>
    </div>
  );
}
