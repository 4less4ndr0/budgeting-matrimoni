import { nanoid } from 'nanoid';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { codiceOr, livelloRischio, orOrdinati, type LivelloRischio } from '@/lib/progetti/calcoli';
import { cn } from '@/lib/utils';
import type { Progetto, Rischio, StatoRischio, TipoRischio } from '@/types/domain';
import { Campo, PERSONA_VUOTA, PersonaSelect } from './comuni';

type Aggiorna = (c: Partial<Progetto> | ((p: Progetto) => Progetto)) => void;

const TIPI: Array<{ id: TipoRischio; label: string }> = [
  { id: 'tecnico', label: 'Tecnico' },
  { id: 'gestionale', label: 'Gestionale' },
  { id: 'economico', label: 'Economico' },
];

const STATI: Array<{ id: StatoRischio; label: string }> = [
  { id: 'aperto', label: 'Aperto' },
  { id: 'sotto-controllo', label: 'Sotto controllo' },
  { id: 'chiuso', label: 'Chiuso' },
];

const COLORE_LIVELLO: Record<LivelloRischio, string> = {
  basso: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  medio: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  alto: 'bg-red-500/15 text-red-700 dark:text-red-300',
};

const SCALA = ['1', '2', '3', '4', '5'];
const PROGETTO = '__progetto__';

function RischioCard({ p, r, aggiorna }: { p: Progetto; r: Rischio; aggiorna: Aggiorna }) {
  const set = (patch: Partial<Rischio>) => aggiorna((x) => ({ ...x, rischi: x.rischi.map((y) => (y.id === r.id ? { ...y, ...patch } : y)) }));
  const { punteggio, livello } = livelloRischio(r.probabilita, r.impatto);
  const economico = r.tipo === 'economico';

  return (
    <div className={cn('rounded-lg border p-3', r.stato === 'chiuso' && 'opacity-60')}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge className={cn('border-transparent font-medium', COLORE_LIVELLO[livello])}>
          {livello} · {punteggio}
        </Badge>
        <Input className="min-w-0 flex-1 basis-full sm:w-auto sm:basis-auto" placeholder="Descrizione del rischio" value={r.descrizione} onChange={(e) => set({ descrizione: e.target.value })} />
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto sm:ml-0"
          title="Elimina rischio"
          onClick={() => aggiorna((x) => ({ ...x, rischi: x.rischi.filter((y) => y.id !== r.id) }))}
        >
          <Trash2 className="text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Campo label="Tipo" info="tipoRischio">
          <Select value={r.tipo} onValueChange={(v) => set({ tipo: v as TipoRischio })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPI.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo label="OR collegato" info="orRischio">
          <Select value={r.orId ?? PROGETTO} onValueChange={(v) => set({ orId: v === PROGETTO ? null : v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PROGETTO}>Progetto</SelectItem>
              {orOrdinati(p).map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {codiceOr(p, o.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo label="Probabilità (1–5)" info="probabilita">
          <Select value={String(r.probabilita)} onValueChange={(v) => set({ probabilita: Number(v) })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCALA.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo label="Impatto (1–5)" info="impatto">
          <Select value={String(r.impatto)} onValueChange={(v) => set({ impatto: Number(v) })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCALA.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo label="Stato" className="col-span-2 md:col-span-1" info="statoRischio">
          <Select value={r.stato} onValueChange={(v) => set({ stato: v as StatoRischio })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATI.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Campo label="Segnale da monitorare" info="segnale">
          <Input placeholder="Cosa ti dice che sta succedendo" value={r.segnale} onChange={(e) => set({ segnale: e.target.value })} />
        </Campo>
        <Campo label={economico ? 'Prevenzione' : 'Azione'} info={economico ? 'prevenzione' : 'azione'}>
          <Input
            placeholder={economico ? 'Come eviti che succeda' : 'Cosa fai se succede'}
            value={r.azione}
            onChange={(e) => set({ azione: e.target.value })}
          />
        </Campo>
        <Campo label="Responsabile" info="responsabileRischio">
          <PersonaSelect value={r.responsabile} onChange={(responsabile) => set({ responsabile })} />
        </Campo>
      </div>
    </div>
  );
}

export default function RischiTab({ p, aggiorna }: { p: Progetto; aggiorna: Aggiorna }) {
  // Insertion order on purpose: sorting by level would make a card jump away while you edit it.
  const ordinati = p.rischi;
  const conteggio = (l: LivelloRischio) =>
    p.rischi.filter((r) => r.stato !== 'chiuso' && livelloRischio(r.probabilita, r.impatto).livello === l).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-1.5">
          Registro dei rischi
          <InfoTooltip content="Tecnici (risultati diversi dal previsto), gestionali (persone e tempi) ed economici (costi diversi dal pianificato). Per questi ultimi conta la prevenzione." />
          <span className="flex gap-1 text-sm font-normal">
            {(['alto', 'medio', 'basso'] as const).map((l) => (
              <Badge key={l} className={cn('border-transparent font-normal', COLORE_LIVELLO[l])}>
                {conteggio(l)} {l}
              </Badge>
            ))}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Livello = probabilità × impatto: basso fino a 6, medio 8–12, alto da 15.</p>
        {ordinati.map((r) => (
          <RischioCard key={r.id} p={p} r={r} aggiorna={aggiorna} />
        ))}
        <Button
          variant="secondary"
          onClick={() =>
            aggiorna((x) => ({
              ...x,
              rischi: [
                ...x.rischi,
                {
                  id: nanoid(),
                  tipo: 'tecnico',
                  descrizione: '',
                  orId: null,
                  probabilita: 3,
                  impatto: 3,
                  segnale: '',
                  azione: '',
                  responsabile: PERSONA_VUOTA,
                  stato: 'aperto',
                },
              ],
            }))
          }
        >
          <Plus />
          Aggiungi rischio
        </Button>
      </CardContent>
    </Card>
  );
}
