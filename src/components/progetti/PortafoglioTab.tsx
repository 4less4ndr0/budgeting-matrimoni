import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Plus, Star, Trash2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NumeroInput } from '@/components/common/NumeroInput';
import { STATI_VALUTABILI, classificaPortafoglio, fineProgetto, periodoMese } from '@/lib/progetti/calcoli';
import { useAppStore } from '@/lib/storage/store';
import { cn } from '@/lib/utils';
import type { Progetto, StatoProgetto } from '@/types/domain';
import { AvvisiBox, Info, dataBreve } from './comuni';

export const STATI: Array<{ id: StatoProgetto; label: string }> = [
  { id: 'idea', label: 'Idea' },
  { id: 'pronto', label: 'Pronto' },
  { id: 'candidato', label: 'Candidato' },
  { id: 'in-corso', label: 'In corso' },
  { id: 'chiuso', label: 'Chiuso' },
  { id: 'revocato', label: 'Revocato' },
];

const VOTI = ['1', '2', '3', '4', '5'];
const SENZA_VOTO = '__senza__';

function titolo(p: Progetto): string {
  return p.titolo.trim() || 'Progetto senza titolo';
}

export default function PortafoglioTab() {
  const { criteri, progetti, progettoAttivoId } = useAppStore((s) => s.progetti);
  const addProgetto = useAppStore((s) => s.addProgetto);
  const updateProgetto = useAppStore((s) => s.updateProgetto);
  const removeProgetto = useAppStore((s) => s.removeProgetto);
  const setProgettoAttivo = useAppStore((s) => s.setProgettoAttivo);
  const setCriteri = useAppStore((s) => s.setCriteri);
  const [nuovo, setNuovo] = useState('');
  const [daEliminare, setDaEliminare] = useState<Progetto | null>(null);

  const classifica = classificaPortafoglio(criteri, progetti);
  const valutabili = progetti.filter((p) => STATI_VALUTABILI.includes(p.stato));
  const punteggioDi = (id: string) => classifica.punteggi.find((x) => x.progettoId === id);

  function crea() {
    if (!nuovo.trim()) return;
    addProgetto(nuovo);
    setNuovo('');
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Portafoglio progetti
            <InfoTooltip content="I progetti di innovazione dell'impresa. Si valutano periodicamente per capire quali sono maturi per partire, da soli o con un bando." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 sm:max-w-md">
            <Input
              placeholder={progetti.length ? 'Nuovo progetto' : 'Titolo del primo progetto'}
              value={nuovo}
              onChange={(e) => setNuovo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && crea()}
            />
            <Button variant="secondary" onClick={crea} disabled={!nuovo.trim()}>
              <Plus />
              Aggiungi
            </Button>
          </div>

          {progetti.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun progetto ancora.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Progetto</TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        Stato <Info k="statoProgetto" />
                      </span>
                    </TableHead>
                    <TableHead>
                      <span className="flex items-center justify-end gap-1">
                        Punteggio <Info k="punteggio" />
                      </span>
                    </TableHead>
                    <TableHead>Bando</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progetti.map((p) => {
                    const pt = punteggioDi(p.id);
                    const attivo = p.id === progettoAttivoId;
                    return (
                      <TableRow key={p.id} className={cn(attivo && 'bg-secondary/60')}>
                        <TableCell>
                          <button
                            type="button"
                            className="text-left font-medium hover:underline"
                            onClick={() => setProgettoAttivo(p.id)}
                            title="Rendi attivo questo progetto"
                          >
                            {titolo(p)}
                          </button>
                          <div className="flex gap-1">
                            {attivo && <Badge variant="secondary" className="font-normal">attivo</Badge>}
                            {classifica.prioritariIds.includes(p.id) && (
                              <Badge className="border-transparent bg-amber-500/15 font-normal text-amber-700 dark:text-amber-300">
                                <Star className="mr-1 h-3 w-3" />
                                {classifica.prioritariIds.length > 1 ? 'a pari merito' : 'prioritario'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[9rem]">
                          <Select
                            value={p.stato}
                            onValueChange={(v) => updateProgetto(p.id, { stato: v as StatoProgetto })}
                          >
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
                        </TableCell>
                        <TableCell className="text-right">
                          {pt?.mediaPesata != null ? pt.mediaPesata.toLocaleString('it-IT', { maximumFractionDigits: 2 }) : '—'}
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate">{p.bando.nome || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {p.dataInizio ? `${dataBreve(periodoMese(p, 1)?.dal ?? null)} → ${dataBreve(fineProgetto(p))}` : '—'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setDaEliminare(p)} title="Elimina progetto">
                            <Trash2 className="text-muted-foreground hover:text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Check list di valutazione
            <InfoTooltip content="Dai un voto da 1 (cattivo) a 5 (eccellente) su ogni criterio. Vince il punteggio più alto. Con i pesi puoi far contare di più i criteri importanti." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AvvisiBox
            avvisi={[
              ...(classifica.ordiniDiversi
                ? ['La classifica per somma e quella per media pesata sono diverse: i pesi stanno cambiando il risultato.']
                : []),
              ...(classifica.prioritariIds.length > 1
                ? [`${classifica.prioritariIds.length} progetti sono a pari merito in testa: serve un criterio in più o un peso diverso per scegliere.`]
                : []),
            ]}
          />
          {valutabili.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Si valutano i progetti in stato &quot;Idea&quot; o &quot;Pronto&quot;: per ora non ce ne sono.
            </p>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[14rem]">Criterio</TableHead>
                  <TableHead className="w-20">
                    <span className="flex items-center gap-1">
                      Peso <Info k="pesoCriterio" />
                    </span>
                  </TableHead>
                  {valutabili.map((p, i) => (
                    <TableHead key={p.id} className="min-w-[7rem] text-center">
                      <span className="inline-flex items-center gap-1">
                        <span className={cn(classifica.prioritariIds.includes(p.id) && 'font-semibold text-foreground')}>
                          {titolo(p)}
                        </span>
                        {i === 0 && <Info k="votoCriterio" />}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {criteri.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Input
                        value={c.nome}
                        aria-label="Nome del criterio"
                        onChange={(e) => setCriteri(criteri.map((x) => (x.id === c.id ? { ...x, nome: e.target.value } : x)))}
                      />
                      {c.nota && <div className="mt-1 text-xs text-muted-foreground">{c.nota}</div>}
                    </TableCell>
                    <TableCell>
                      <NumeroInput
                        aria-label={`Peso di ${c.nome}`}
                        step="1"
                        value={c.peso}
                        onChange={(v) => setCriteri(criteri.map((x) => (x.id === c.id ? { ...x, peso: v ?? 0 } : x)))}
                      />
                    </TableCell>
                    {valutabili.map((p) => (
                      <TableCell key={p.id}>
                        <Select
                          value={p.voti[c.id] ? String(p.voti[c.id]) : SENZA_VOTO}
                          onValueChange={(v) =>
                            updateProgetto(p.id, (x) => {
                              const voti = { ...x.voti };
                              if (v === SENZA_VOTO) delete voti[c.id];
                              else voti[c.id] = Number(v);
                              return { ...x, voti };
                            })
                          }
                        >
                          <SelectTrigger aria-label={`Voto di ${titolo(p)} su ${c.nome}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SENZA_VOTO}>—</SelectItem>
                            {VOTI.map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Elimina criterio"
                        onClick={() => setCriteri(criteri.filter((x) => x.id !== c.id))}
                      >
                        <Trash2 className="text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {valutabili.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2}>Somma dei voti</TableCell>
                    {valutabili.map((p) => (
                      <TableCell key={p.id} className="text-center">
                        {punteggioDi(p.id)?.somma ?? 0}
                      </TableCell>
                    ))}
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2}>Media pesata</TableCell>
                    {valutabili.map((p) => {
                      const pt = punteggioDi(p.id);
                      return (
                        <TableCell
                          key={p.id}
                          className={cn('text-center', classifica.prioritariIds.includes(p.id) && 'font-bold')}
                        >
                          {pt?.mediaPesata != null ? pt.mediaPesata.toLocaleString('it-IT', { maximumFractionDigits: 2 }) : '—'}
                          {pt && pt.votiMancanti > 0 && (
                            <div className="text-xs font-normal text-muted-foreground">{pt.votiMancanti} voti mancanti</div>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
          <Button
            variant="secondary"
            onClick={() => setCriteri([...criteri, { id: nanoid(), nome: '', peso: 1, nota: '' }])}
          >
            <Plus />
            Aggiungi criterio
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={daEliminare !== null} onOpenChange={(o) => !o && setDaEliminare(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare &quot;{daEliminare ? titolo(daEliminare) : ''}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Si cancellano scheda, WBS, Gantt, organizzazione, rischi e SAL di questo progetto. Gli altri progetti e
              l&apos;anagrafica dipendenti non vengono toccati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (daEliminare) {
                  removeProgetto(daEliminare.id);
                  toast.success(`Progetto "${titolo(daEliminare)}" eliminato`);
                }
                setDaEliminare(null);
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
