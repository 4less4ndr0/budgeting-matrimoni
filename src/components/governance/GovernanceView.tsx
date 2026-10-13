import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fullName } from '@/lib/hr/hr';
import {
  MODELLI,
  ORGANI,
  modelloDef,
  nomeMembro,
  organiDelModello,
  riepilogoPerPersona,
  verificaGovernance,
  type Avviso,
  type NodoStruttura,
  type OrganoDef,
} from '@/lib/governance/modelli';
import { useAppStore } from '@/lib/storage/store';
import { cn } from '@/lib/utils';
import type { MembroOrgano, OrganoId } from '@/types/domain';

// One color per function, the same in the diagram, the organo cards and the summary table,
// so "who manages / who controls" reads at a glance.
const FUNZIONE: Record<OrganoDef['funzione'], { label: string; badge: string; bordo: string }> = {
  indirizzo: {
    label: 'Indirizzo',
    badge: 'border-transparent bg-secondary text-secondary-foreground',
    bordo: 'border-t-muted-foreground/50',
  },
  gestione: {
    label: 'Gestione',
    badge: 'border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300',
    bordo: 'border-t-sky-500',
  },
  controllo: {
    label: 'Controllo',
    badge: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300',
    bordo: 'border-t-amber-500',
  },
  revisione: {
    label: 'Revisione',
    badge: 'border-transparent bg-violet-500/15 text-violet-700 dark:text-violet-300',
    bordo: 'border-t-violet-500',
  },
};

const ESTERNO = '__esterno__';

function FunzioneBadge({ organo }: { organo: OrganoId }) {
  const f = FUNZIONE[ORGANI[organo].funzione];
  return <Badge className={cn('font-medium', f.badge)}>{f.label}</Badge>;
}

function scrollToOrgano(id: OrganoId) {
  document.getElementById(`organo-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** One box of the diagram; organi built *inside* another (monistico's comitato) nest in it. */
function OrganoBox({
  organo,
  membri,
  avvisi,
  nome,
  children,
}: {
  organo: OrganoId;
  membri: MembroOrgano[];
  avvisi: Avviso[];
  nome: (m: MembroOrgano) => string;
  children?: React.ReactNode;
}) {
  const def = ORGANI[organo];
  const vuoto = membri.length === 0;
  const problemi = avvisi.filter((a) => a.organo === organo).length;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        scrollToOrgano(organo);
      }}
      onKeyDown={(e) => e.key === 'Enter' && scrollToOrgano(organo)}
      title="Vai alla composizione di questo organo"
      className={cn(
        'w-[13rem] cursor-pointer rounded-lg border border-t-4 bg-card px-3 py-2 text-center shadow-sm transition-colors hover:bg-secondary/60',
        FUNZIONE[def.funzione].bordo,
        vuoto && 'border-red-500/70 bg-red-500/10 hover:bg-red-500/15',
      )}
    >
      <div className={cn('text-sm font-semibold leading-tight', vuoto && 'text-red-600 dark:text-red-400')}>
        {def.nome}
      </div>
      <div className="mt-1 space-y-0.5 text-xs">
        {vuoto ? (
          <div className="italic text-red-600 dark:text-red-400">Nessun componente</div>
        ) : (
          membri.map((m) => (
            <div key={m.id} className="leading-snug text-muted-foreground">
              <span className="text-foreground">{nome(m)}</span> · {m.carica}
            </div>
          ))
        )}
      </div>
      {problemi > 0 && !vuoto && (
        <div className="mt-1.5 flex items-center justify-center gap-1 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-3 w-3" />
          {problemi === 1 ? '1 avviso' : `${problemi} avvisi`}
        </div>
      )}
      {children && <div className="mt-2 flex justify-center">{children}</div>}
    </div>
  );
}

function StrutturaBranch({
  nodo,
  ...rest
}: {
  nodo: NodoStruttura;
  membriDi: (o: OrganoId) => MembroOrgano[];
  avvisi: Avviso[];
  nome: (m: MembroOrgano) => string;
}) {
  const { membriDi, avvisi, nome } = rest;
  return (
    <li>
      <OrganoBox organo={nodo.organo} membri={membriDi(nodo.organo)} avvisi={avvisi} nome={nome}>
        {nodo.interni?.map((interno) => (
          <div key={interno} className="w-full [&>div]:w-full">
            <OrganoBox organo={interno} membri={membriDi(interno)} avvisi={avvisi} nome={nome} />
          </div>
        ))}
      </OrganoBox>
      {nodo.figli.length > 0 && (
        <ul>
          {nodo.figli.map((f) => (
            <StrutturaBranch key={f.organo} nodo={f} {...rest} />
          ))}
        </ul>
      )}
    </li>
  );
}

function AggiungiMembro({ organo }: { organo: OrganoId }) {
  const def = ORGANI[organo];
  const dipendenti = useAppStore((s) => s.dipendenti);
  const addMembroOrgano = useAppStore((s) => s.addMembroOrgano);
  const [persona, setPersona] = useState('');
  const [nomeEsterno, setNomeEsterno] = useState('');
  const [carica, setCarica] = useState(def.caricaDefault);
  // Closing a Select hands focus back to its trigger, which would steal it from the name
  // field that has just appeared for "Persona esterna…" (typing would go nowhere).
  const tieniFocusSulNome = useRef(false);

  const ordinati = useMemo(
    () => [...dipendenti].sort((a, b) => fullName(a).localeCompare(fullName(b), 'it')),
    [dipendenti],
  );
  const valido = persona !== '' && (persona !== ESTERNO || nomeEsterno.trim() !== '');

  function aggiungi() {
    if (!valido) return;
    addMembroOrgano({
      organo,
      dipendenteId: persona === ESTERNO ? null : persona,
      nomeEsterno: persona === ESTERNO ? nomeEsterno.trim() : '',
      carica,
    });
    setPersona('');
    setNomeEsterno('');
    setCarica(def.caricaDefault);
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-dashed p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          value={persona}
          onValueChange={(v) => {
            tieniFocusSulNome.current = v === ESTERNO;
            setPersona(v);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Scegli una persona" />
          </SelectTrigger>
          <SelectContent
            onCloseAutoFocus={(e) => {
              if (tieniFocusSulNome.current) {
                e.preventDefault();
                tieniFocusSulNome.current = false;
                document.getElementById(`esterno-${organo}`)?.focus();
              }
            }}
          >
            {ordinati.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {fullName(d) || 'Senza nome'}
              </SelectItem>
            ))}
            {ordinati.length > 0 && <SelectSeparator />}
            <SelectItem value={ESTERNO}>Persona esterna…</SelectItem>
          </SelectContent>
        </Select>
        <Select value={carica} onValueChange={setCarica}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {def.cariche.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {persona === ESTERNO && (
        <Input
          id={`esterno-${organo}`}
          autoFocus
          placeholder={organo === 'revisore' ? 'Nome del revisore o della società' : 'Nome e cognome'}
          value={nomeEsterno}
          onChange={(e) => setNomeEsterno(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && aggiungi()}
        />
      )}
      <Button variant="secondary" size="sm" onClick={aggiungi} disabled={!valido}>
        <Plus />
        Aggiungi
      </Button>
    </div>
  );
}

function OrganoCard({
  organo,
  membri,
  avvisi,
  nome,
}: {
  organo: OrganoId;
  membri: MembroOrgano[];
  avvisi: Avviso[];
  nome: (m: MembroOrgano) => string;
}) {
  const def = ORGANI[organo];
  const updateMembroOrgano = useAppStore((s) => s.updateMembroOrgano);
  const removeMembroOrgano = useAppStore((s) => s.removeMembroOrgano);
  const vuoto = membri.length === 0;
  const mieiAvvisi = avvisi.filter((a) => a.organo === organo && !(vuoto && a.testo === 'Nessuno ne fa parte.'));

  return (
    <Card id={`organo-${organo}`} className={cn('scroll-mt-[17rem] sm:scroll-mt-40', vuoto && 'border-red-500/60')}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span className={cn(vuoto && 'text-red-600 dark:text-red-400')}>{def.nome}</span>
          <FunzioneBadge organo={organo} />
          <InfoTooltip content={def.descrizione} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {vuoto ? (
          <p className="text-sm text-red-600 dark:text-red-400">Ancora nessun componente.</p>
        ) : (
          <ul className="space-y-3 sm:space-y-2">
            {membri.map((m) => {
              // A carica no longer offered for this organo (e.g. typed by hand in an old
              // snapshot) still shows up instead of rendering an empty select.
              const cariche = def.cariche.includes(m.carica) ? def.cariche : [m.carica, ...def.cariche];
              return (
                // Phone: name on its own line, carica + delete below; wider: one row.
                <li key={m.id} className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1 sm:flex">
                  <div className="col-span-2 min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{nome(m)}</div>
                    {!m.dipendenteId && <div className="text-xs text-muted-foreground">esterno</div>}
                  </div>
                  <div className="min-w-0 sm:w-52 sm:shrink-0">
                    <Select value={m.carica} onValueChange={(carica) => updateMembroOrgano(m.id, { carica })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cariche.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeMembroOrgano(m.id)} title="Togli da questo organo">
                    <Trash2 className="text-muted-foreground hover:text-destructive" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {mieiAvvisi.length > 0 && (
          <ul className="mt-3 space-y-1">
            {mieiAvvisi.map((a) => (
              <li key={a.testo} className="flex items-start gap-1.5 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {a.testo}
              </li>
            ))}
          </ul>
        )}

        <AggiungiMembro organo={organo} />
      </CardContent>
    </Card>
  );
}

export default function GovernanceView() {
  const governance = useAppStore((s) => s.governance);
  const dipendenti = useAppStore((s) => s.dipendenti);
  const setModelloGovernance = useAppStore((s) => s.setModelloGovernance);
  const { modello, membri } = governance;

  const nome = (m: MembroOrgano) => nomeMembro(m, dipendenti);
  const membriDi = (o: OrganoId) => membri.filter((m) => m.organo === o);
  const avvisi = useMemo(() => (modello ? verificaGovernance(modello, membri) : []), [modello, membri]);
  const riepilogo = useMemo(
    () => (modello ? riepilogoPerPersona(modello, membri, dipendenti) : []),
    [modello, membri, dipendenti],
  );
  const nascosti = useMemo(() => {
    if (!modello) return 0;
    const organi = organiDelModello(modello);
    return membri.filter((m) => !organi.includes(m.organo)).length;
  }, [modello, membri]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Modello di governance
            <InfoTooltip content="I tre sistemi di amministrazione e controllo previsti dal codice civile per le S.p.A. Scegli quello della tua società: sotto compaiono i suoi organi da compilare." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" className="grid gap-3 md:grid-cols-3">
            {MODELLI.map((m) => {
              const attivo = m.id === modello;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={attivo}
                  onClick={() => setModelloGovernance(m.id)}
                  className={cn(
                    'relative rounded-lg border p-4 text-left transition-colors hover:bg-secondary/60',
                    attivo && 'border-primary bg-secondary/60 ring-1 ring-primary',
                  )}
                >
                  {attivo && <Check className="absolute right-3 top-3 h-4 w-4" />}
                  <div className="font-semibold">{m.nome}</div>
                  <div className="text-xs text-muted-foreground">{m.alias}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{m.sintesi}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {organiDelModello(m.id).map((o) => (
                      <span key={o} className="rounded bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground ring-1 ring-border">
                        {ORGANI[o].nome}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {!modello ? (
        <p className="px-1 text-sm text-muted-foreground">Scegli un modello per comporre i suoi organi.</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                Struttura · {modelloDef(modello).nome}
                <InfoTooltip content="Ogni organo è nominato da quello che sta sopra. Clicca un riquadro per andare alla sua composizione." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-2">
                {(['indirizzo', 'gestione', 'controllo', 'revisione'] as const).map((f) => (
                  <Badge key={f} className={cn('font-medium', FUNZIONE[f].badge)}>
                    {FUNZIONE[f].label}
                  </Badge>
                ))}
              </div>
              <div className="-mx-2 overflow-x-auto px-2 pb-2">
                <div className="org-tree mx-auto w-max min-w-full">
                  <ul>
                    <StrutturaBranch
                      nodo={modelloDef(modello).struttura}
                      membriDi={membriDi}
                      avvisi={avvisi}
                      nome={nome}
                    />
                  </ul>
                </div>
              </div>
              {nascosti > 0 && (
                <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                  {nascosti === 1 ? '1 incarico è' : `${nascosti} incarichi sono`} in organi che questo modello non
                  prevede: {nascosti === 1 ? 'resta salvato e ricompare' : 'restano salvati e ricompaiono'} se passi a un
                  modello che li prevede.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            {organiDelModello(modello).map((o) => (
              <OrganoCard key={o} organo={o} membri={membriDi(o)} avvisi={avvisi} nome={nome} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                Chi fa cosa
                <InfoTooltip content="La stessa composizione vista per persona: tutti gli incarichi di ciascuno nel modello scelto." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {riepilogo.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessuna persona assegnata agli organi.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Persona</TableHead>
                      <TableHead>Incarichi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riepilogo.map((p) => (
                      <TableRow key={p.chiave}>
                        <TableCell className="align-top">
                          <div className="font-medium">{p.nome}</div>
                          <div className="text-xs text-muted-foreground">{p.dipendente ? 'dipendente' : 'esterno'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {p.incarichi.map((i, idx) => (
                              <Badge key={idx} className={cn('font-normal', FUNZIONE[ORGANI[i.organo].funzione].badge)}>
                                {ORGANI[i.organo].nome} · {i.carica}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
