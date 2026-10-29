import { nanoid } from 'nanoid';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarPlus, Crown, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Input } from '@/components/ui/input';
import { avvisiOrganizzazione, chiavePersona, codiceOr, generaRiunioni, orOrdinati, termini } from '@/lib/progetti/calcoli';
import { cn } from '@/lib/utils';
import type { MembroCommessa, Persona, Progetto, RuoloCommessa, TipoRiunione } from '@/types/domain';
import { AvvisiBox, Info, PERSONA_VUOTA, PersonaSelect } from './comuni';

type Aggiorna = (c: Partial<Progetto> | ((p: Progetto) => Progetto)) => void;

/** Role descriptions; they name the OR/WP Leader the way this project calls it. */
function compiti(t: ReturnType<typeof termini>): Record<Exclude<RuoloCommessa, 'gruppo-lavoro'> | 'or-leader' | 'gruppo-lavoro', string> {
  return {
    'steering-committee':
      'Decide strategia e cambiamenti, approva deliverable e relazioni semestrali, monitora milestone e SAL. 3–5 membri, il PM è chair.',
    pm: "Responsabilità totale su tempi, costi e qualità; tiene i rapporti tecnici con l'ente finanziatore.",
    ra: `Coordina PM, ${t.leader}, consulenti e Grant Office; monitora scadenze e costi rendicontati per SAL.`,
    'referente-istruttori': "Interfaccia con l'ente finanziatore.",
    'or-leader': `Coordina il proprio ${t.sigla}, raccoglie time sheet, ordini di servizio, DSAN.`,
    'gruppo-lavoro': 'Svolge le attività giornaliere.',
  };
}

const ETICHETTA_RIUNIONE: Record<TipoRiunione, string> = {
  'kick-off': 'Kick-off',
  'steering-committee': 'Steering Committee',
  'pre-sal': 'Prima della chiusura SAL',
  chiusura: 'Riunione di chiusura',
};

function Livello({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{titolo}</div>
      {children}
    </div>
  );
}

function Ruolo({ nome, compiti, children }: { nome: string; compiti: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
        {nome}
        <InfoTooltip content={compiti} />
      </div>
      {children}
    </div>
  );
}

/** A list of people for one role (Steering Committee, or a work group of an OR). */
function ElencoPersone({
  membri,
  onChange,
  onRemove,
  onAdd,
  etichettaAggiungi,
  evidenzia,
}: {
  membri: MembroCommessa[];
  onChange: (id: string, p: Persona) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  etichettaAggiungi: string;
  evidenzia?: (m: MembroCommessa) => boolean;
}) {
  return (
    <div className="space-y-2">
      {membri.map((m) => (
        <div key={m.id} className="flex items-start gap-2">
          {evidenzia?.(m) ? (
            <Crown className="mt-3 h-4 w-4 shrink-0 text-amber-600" aria-label="Chair" />
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <PersonaSelect value={m} onChange={(p) => onChange(m.id, p)} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => onRemove(m.id)} title="Togli">
            <Trash2 className="text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={onAdd}>
        <Plus />
        {etichettaAggiungi}
      </Button>
    </div>
  );
}

export default function OrganizzazioneTab({ p, aggiorna }: { p: Progetto; aggiorna: Aggiorna }) {
  const membri = (ruolo: RuoloCommessa, orId: string | null = null) =>
    p.organizzazione.filter((m) => m.ruolo === ruolo && (ruolo !== 'gruppo-lavoro' || m.orId === orId));
  const aggiungi = (ruolo: RuoloCommessa, orId: string | null = null) =>
    aggiorna((x) => ({ ...x, organizzazione: [...x.organizzazione, { id: nanoid(), ruolo, orId, ...PERSONA_VUOTA }] }));
  const cambia = (id: string, persona: Persona) =>
    aggiorna((x) => ({ ...x, organizzazione: x.organizzazione.map((m) => (m.id === id ? { ...m, ...persona } : m)) }));
  const togli = (id: string) => aggiorna((x) => ({ ...x, organizzazione: x.organizzazione.filter((m) => m.id !== id) }));

  /** Single-seat roles (PM, RA, referente): replace whoever holds it. */
  const posto = (ruolo: RuoloCommessa) => p.organizzazione.find((m) => m.ruolo === ruolo) ?? null;
  const occupa = (ruolo: RuoloCommessa, persona: Persona) =>
    aggiorna((x) => {
      const altri = x.organizzazione.filter((m) => m.ruolo !== ruolo);
      const esistente = x.organizzazione.find((m) => m.ruolo === ruolo);
      return { ...x, organizzazione: [...altri, { id: esistente?.id ?? nanoid(), ruolo, orId: null, ...persona }] };
    });

  const pm = posto('pm');
  const chiavePm = pm ? chiavePersona(pm) : null;
  const ors = orOrdinati(p);
  const t = termini(p);
  const COMPITI = compiti(t);
  const riunioni = [...p.riunioni].sort((a, b) => a.data.localeCompare(b.data));
  const setRiunione = (id: string, patch: Partial<(typeof riunioni)[number]>) =>
    aggiorna((x) => ({ ...x, riunioni: x.riunioni.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));

  return (
    <div className="space-y-4">
      <AvvisiBox avvisi={avvisiOrganizzazione(p)} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Organizzazione di commessa
            <InfoTooltip content={`Chi decide (Steering Committee), chi guida (PM e Responsabile Amministrativo) e chi esegue (${t.leader} e gruppi di lavoro).`} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Livello titolo="Livello strategico">
            <Ruolo nome={`Steering Committee · ${membri('steering-committee').length} membri`} compiti={COMPITI['steering-committee']}>
              <ElencoPersone
                membri={membri('steering-committee')}
                onChange={cambia}
                onRemove={togli}
                onAdd={() => aggiungi('steering-committee')}
                etichettaAggiungi="Aggiungi membro"
                evidenzia={(m) => chiavePm !== null && chiavePersona(m) === chiavePm}
              />
            </Ruolo>
          </Livello>

          <Livello titolo="Livello tecnico">
            <div className="grid gap-3 md:grid-cols-3">
              {(
                [
                  ['pm', 'Responsabile tecnico (PM)'],
                  ['ra', 'Responsabile Amministrativo (RA)'],
                  ['referente-istruttori', 'Referente rapporti istruttori'],
                ] as const
              ).map(([ruolo, nome]) => (
                <Ruolo key={ruolo} nome={nome} compiti={COMPITI[ruolo]}>
                  <PersonaSelect value={posto(ruolo) ?? PERSONA_VUOTA} onChange={(persona) => occupa(ruolo, persona)} />
                </Ruolo>
              ))}
            </div>
          </Livello>

          <Livello titolo="Livello operativo">
            {ors.length === 0 && <p className="text-sm text-muted-foreground">Aggiungi gli {t.sigla} nella WBS per assegnare {t.leader} e gruppi di lavoro.</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {ors.map((or) => (
                <div key={or.id} className="rounded-lg border p-3">
                  <div className="mb-3 truncate text-sm font-semibold">
                    {codiceOr(p, or.id)} {or.titolo}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {t.leader}
                        <InfoTooltip content={COMPITI['or-leader']} />
                      </div>
                      <PersonaSelect
                        value={or.leader}
                        onChange={(leader) => aggiorna((x) => ({ ...x, or: x.or.map((o) => (o.id === or.id ? { ...o, leader } : o)) }))}
                      />
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        Gruppo di lavoro
                        <InfoTooltip content={COMPITI['gruppo-lavoro']} />
                      </div>
                      <ElencoPersone
                        membri={membri('gruppo-lavoro', or.id)}
                        onChange={cambia}
                        onRemove={togli}
                        onAdd={() => aggiungi('gruppo-lavoro', or.id)}
                        etichettaAggiungi="Aggiungi persona"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Livello>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-1.5">
            Calendario riunioni
            <InfoTooltip content="Kick-off al primo giorno, Steering Committee ogni 2 mesi, una riunione una settimana prima di ogni chiusura di SAL e la riunione di chiusura. Rigenerando, le riunioni già fatte o con note restano." />
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              disabled={!p.dataInizio || !p.durataMesi}
              onClick={() => {
                aggiorna((x) => ({ ...x, riunioni: generaRiunioni(x) }));
                toast.success('Calendario generato dalle date del progetto');
              }}
            >
              <CalendarPlus />
              {p.riunioni.length ? 'Rigenera calendario' : 'Genera calendario'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(!p.dataInizio || !p.durataMesi) && (
            <p className="text-sm text-muted-foreground">Imposta data di inizio e durata nella Scheda progetto.</p>
          )}
          {riunioni.length > 0 && (
            <div className="hidden grid-cols-[1rem_8rem_12rem_1fr_2.5rem] gap-2 px-2 text-xs text-muted-foreground sm:grid">
              <Info k="riunioneFatta" />
              <span>Data</span>
              <span className="flex items-center gap-1">
                Tipo <Info k="tipiRiunione" />
              </span>
              <span className="flex items-center gap-1">
                Nota <Info k="riunioneNota" />
              </span>
            </div>
          )}
          {riunioni.map((r) => (
            <div
              key={r.id}
              className={cn(
                'grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border p-2 sm:grid-cols-[auto_8rem_12rem_1fr_auto]',
                r.fatta && 'bg-secondary/40',
              )}
            >
              <Checkbox checked={r.fatta} onCheckedChange={(c) => setRiunione(r.id, { fatta: c === true })} aria-label="Fatta" />
              <span className="text-sm tabular-nums">{format(parseISO(r.data), 'd MMM yyyy', { locale: it })}</span>
              <Button
                variant="ghost"
                size="icon"
                className="col-start-3 row-start-1 sm:col-start-5"
                title="Elimina riunione"
                onClick={() => aggiorna((x) => ({ ...x, riunioni: x.riunioni.filter((y) => y.id !== r.id) }))}
              >
                <Trash2 className="text-muted-foreground hover:text-destructive" />
              </Button>
              <Badge variant="secondary" className="col-span-3 w-fit font-normal sm:col-span-1 sm:col-start-3 sm:row-start-1">
                {ETICHETTA_RIUNIONE[r.tipo]}
              </Badge>
              <Input
                className="col-span-3 sm:col-span-1 sm:col-start-4 sm:row-start-1"
                placeholder="Decisioni prese"
                value={r.nota}
                onChange={(e) => setRiunione(r.id, { nota: e.target.value })}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
