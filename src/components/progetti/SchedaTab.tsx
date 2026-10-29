import { nanoid } from 'nanoid';
import { ExternalLink, Plus, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumeroInput } from '@/components/common/NumeroInput';
import { NOME_CLASSE, classeNostraImpresa } from '@/lib/dimensione/dimensione';
import { avvisiScheda, costoStimatoTotale, fineProgetto, intensitaNostra } from '@/lib/progetti/calcoli';
import { TIPI_SOGGETTO, presetAccordiInnovazione } from '@/lib/progetti/defaults';
import { useAppStore } from '@/lib/storage/store';
import type { Partner, Progetto, SchedaBando, TipoSoggetto, TipologiaRS } from '@/types/domain';
import { AreaTesto, AvvisiBox, Campo, Info, ListaRighe, dataBreve, eur } from './comuni';

const NESSUNA = '__nessuna__';

function TipologiaSelect({ value, onChange }: { value: TipologiaRS | null; onChange: (v: TipologiaRS | null) => void }) {
  return (
    <Select value={value ?? NESSUNA} onValueChange={(v) => onChange(v === NESSUNA ? null : (v as TipologiaRS))}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NESSUNA}>
          <span className="text-muted-foreground">Non indicata</span>
        </SelectItem>
        <SelectItem value="RI">Ricerca industriale (RI)</SelectItem>
        <SelectItem value="SS">Sviluppo sperimentale (SS)</SelectItem>
      </SelectContent>
    </Select>
  );
}

function PartnerRiga({
  partner,
  classe,
  onChange,
  onRemove,
}: {
  partner: Partner;
  classe: ReturnType<typeof classeNostraImpresa>;
  onChange: (patch: Partial<Partner>) => void;
  onRemove: () => void;
}) {
  const daDimensione = partner.isNostraImpresa && classe !== null;
  return (
    <div className="grid grid-cols-[3.5rem_1fr_auto] items-start gap-2 rounded-lg border p-2 sm:grid-cols-[3.5rem_1fr_13rem_auto]">
      <NumeroInput
        aria-label="Numero associato"
        step="1"
        min="1"
        value={partner.numeroAssociato}
        onChange={(v) => onChange({ numeroAssociato: v ?? 1 })}
      />
      <div className="min-w-0 space-y-1">
        <Input
          placeholder={partner.isNostraImpresa ? 'La nostra impresa' : 'Nome del partner'}
          value={partner.nome}
          onChange={(e) => onChange({ nome: e.target.value })}
        />
        <div className="text-xs text-muted-foreground">
          {partner.numeroAssociato === 1 ? 'Capofila' : `Associato ${partner.numeroAssociato}`}
          {partner.isNostraImpresa && ' · nostra impresa'}
        </div>
      </div>
      <div className="col-span-3 sm:col-span-1">
        {daDimensione ? (
          <div className="flex h-11 items-center gap-1 text-sm sm:h-9">
            <Badge variant="secondary" className="font-normal">
              {NOME_CLASSE[classe!]}
            </Badge>
            <InfoTooltip content="Per la nostra impresa la dimensione arriva dal calcolatore in Gestione economica → Dimensione d'impresa." />
          </div>
        ) : (
          <Select value={partner.tipo} onValueChange={(v) => onChange({ tipo: v as TipoSoggetto })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPI_SOGGETTO.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="col-start-3 row-start-1 sm:col-start-auto sm:row-start-auto"
        onClick={onRemove}
        title="Elimina partner"
        disabled={partner.isNostraImpresa}
      >
        <Trash2 className="text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  );
}

function SchedaProgettoCard({ p, aggiorna }: { p: Progetto; aggiorna: (c: Partial<Progetto> | ((p: Progetto) => Progetto)) => void }) {
  const dim = useAppStore((s) => s.dimensioneImpresa);
  const numeroDipendenti = useAppStore((s) => s.dipendenti.length);
  const classe = classeNostraImpresa(dim, numeroDipendenti);
  const fine = fineProgetto(p);
  const quotaCofin = p.budgetTotale && p.cofinanziamento !== null ? (p.cofinanziamento / p.budgetTotale) * 100 : null;
  const partner = [...p.partner].sort((a, b) => a.numeroAssociato - b.numeroAssociato);
  const setPartner = (id: string, patch: Partial<Partner>) =>
    aggiorna((x) => ({ ...x, partner: x.partner.map((q) => (q.id === id ? { ...q, ...patch } : q)) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Scheda progetto
          <InfoTooltip content="La compila chi ha l'idea (il capofila). Serve anche a capire quali competenze mancano e quindi quali partner cercare." />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Campo label="Titolo" htmlFor="sp-titolo" info="titolo">
          <Input id="sp-titolo" value={p.titolo} onChange={(e) => aggiorna({ titolo: e.target.value })} />
        </Campo>
        <Campo label="Sintesi" htmlFor="sp-sintesi" info="sintesi">
          <AreaTesto id="sp-sintesi" value={p.sintesi} onChange={(v) => aggiorna({ sintesi: v })} />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Capofila" htmlFor="sp-capofila" info="capofila">
            <Input id="sp-capofila" value={p.capofila} onChange={(e) => aggiorna({ capofila: e.target.value })} />
          </Campo>
          <Campo label="Ambito di intervento" htmlFor="sp-ambito" info="ambito">
            <Input
              id="sp-ambito"
              placeholder="Area/traiettoria del bando"
              value={p.ambito}
              onChange={(e) => aggiorna({ ambito: e.target.value })}
            />
          </Campo>
          <Campo label="Tipo di attività prevalente" info="attivitaPrevalente">
            <TipologiaSelect value={p.attivitaPrevalente} onChange={(v) => aggiorna({ attivitaPrevalente: v })} />
          </Campo>
          <Campo label="Data di inizio" htmlFor="sp-inizio" info="dataInizio">
            <Input id="sp-inizio" type="date" value={p.dataInizio} onChange={(e) => aggiorna({ dataInizio: e.target.value })} />
          </Campo>
          <Campo label="Durata (mesi)" htmlFor="sp-durata" info="durata">
            <NumeroInput id="sp-durata" step="1" min="1" value={p.durataMesi} onChange={(v) => aggiorna({ durataMesi: v })} />
          </Campo>
          <Campo label="Fine (calcolata)" info="fine">
            <div className="flex h-11 items-center text-sm sm:h-9">{dataBreve(fine)}</div>
          </Campo>
          <Campo label="Budget totale (€)" htmlFor="sp-budget" info="budget">
            <NumeroInput id="sp-budget" value={p.budgetTotale} onChange={(v) => aggiorna({ budgetTotale: v })} />
          </Campo>
          <Campo
            label={`Cofinanziamento del partenariato (€)${quotaCofin !== null ? ` · ${quotaCofin.toLocaleString('it-IT', { maximumFractionDigits: 1 })}% del budget` : ''}`}
            htmlFor="sp-cofin"
            info="cofinanziamento"
          >
            <NumeroInput id="sp-cofin" value={p.cofinanziamento} onChange={(v) => aggiorna({ cofinanziamento: v })} />
          </Campo>
        </div>

        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            Partner
            <Info k="partner" />
          </div>
          {/* Column hints for the partner rows, which have no labels of their own. */}
          <div className="hidden grid-cols-[3.5rem_1fr_13rem_2.5rem] gap-2 px-2 text-xs text-muted-foreground sm:grid">
            <span className="flex items-center gap-1">
              N° <Info k="numeroAssociato" />
            </span>
            <span>Nome</span>
            <span className="flex items-center gap-1">
              Tipo di soggetto <Info k="tipoSoggetto" />
            </span>
          </div>
          {partner.map((q) => (
            <PartnerRiga
              key={q.id}
              partner={q}
              classe={classe}
              onChange={(patch) => setPartner(q.id, patch)}
              onRemove={() => aggiorna((x) => ({ ...x, partner: x.partner.filter((y) => y.id !== q.id) }))}
            />
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              aggiorna((x) => ({
                ...x,
                partner: [
                  ...x.partner,
                  {
                    id: nanoid(),
                    nome: '',
                    tipo: 'piccola',
                    numeroAssociato: Math.max(0, ...x.partner.map((y) => y.numeroAssociato)) + 1,
                    isNostraImpresa: false,
                  },
                ],
              }))
            }
          >
            <Plus />
            Aggiungi partner
          </Button>
          <div className="flex items-center gap-1 pt-1 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={p.collaborazioneEffettiva}
                onCheckedChange={(c) => aggiorna({ collaborazioneEffettiva: c === true })}
              />
              Collaborazione effettiva tra i partner
            </label>
            <Info k="collaborazioneEffettiva" />
          </div>
        </div>

        <Campo label="Info utili per completare il partenariato" htmlFor="sp-partenariato" info="infoPartenariato">
          <AreaTesto
            id="sp-partenariato"
            placeholder="Competenze mancanti → partner search"
            value={p.infoPartenariato}
            onChange={(v) => aggiorna({ infoPartenariato: v })}
          />
        </Campo>
      </CardContent>
    </Card>
  );
}

function SchedaBandoCard({ p, aggiorna }: { p: Progetto; aggiorna: (c: Partial<Progetto> | ((p: Progetto) => Progetto)) => void }) {
  const b = p.bando;
  const set = (patch: Partial<SchedaBando>) => aggiorna((x) => ({ ...x, bando: { ...x.bando, ...patch } }));
  const dim = useAppStore((s) => s.dimensioneImpresa);
  const numeroDipendenti = useAppStore((s) => s.dipendenti.length);
  const noi = intensitaNostra(p, classeNostraImpresa(dim, numeroDipendenti));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-1.5">
          Scheda di sintesi del bando
          <InfoTooltip content="La compila il consulente dopo lo scouting settimanale dei bandi. Riassume chi può partecipare, cosa si finanzia e quanto." />
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => {
              set(presetAccordiInnovazione(b));
              toast.success("Precompilato con Accordi per l'innovazione", {
                description: 'Intensità, maggiorazione e range di spesa: tutto resta modificabile.',
              });
            }}
          >
            <Wand2 />
            Preset Accordi per l&apos;innovazione
          </Button>
          <Info k="presetAccordi" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Nome / oggetto del bando" htmlFor="sb-nome" className="sm:col-span-2" info="nomeBando">
            <Input id="sb-nome" value={b.nome} onChange={(e) => set({ nome: e.target.value })} />
          </Campo>
          <Campo
            label={
              <span className="flex items-center gap-1">
                Link alla pagina del bando
                {b.link && (
                  <a href={b.link} target="_blank" rel="noreferrer" className="text-foreground" title="Apri">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </span>
            }
            htmlFor="sb-link"
            className="sm:col-span-2"
            info="linkBando"
          >
            <Input id="sb-link" type="url" inputMode="url" value={b.link} onChange={(e) => set({ link: e.target.value })} />
          </Campo>
          <Campo label="Data rilevazione" htmlFor="sb-ril" info="dataRilevazione">
            <Input id="sb-ril" type="date" value={b.dataRilevazione} onChange={(e) => set({ dataRilevazione: e.target.value })} />
          </Campo>
          <Campo label="Scadenza presentazione" htmlFor="sb-scad" info="scadenzaBando">
            <Input id="sb-scad" type="date" value={b.scadenza} onChange={(e) => set({ scadenza: e.target.value })} />
          </Campo>
        </div>
        <Campo label="Obiettivi" htmlFor="sb-obiettivi" info="obiettiviBando">
          <AreaTesto id="sb-obiettivi" value={b.obiettivi} onChange={(v) => set({ obiettivi: v })} />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Ambiti d'intervento (tecnologie) · uno per riga" htmlFor="sb-ambiti" info="ambitiBando">
            <ListaRighe id="sb-ambiti" value={b.ambiti} onChange={(v) => set({ ambiti: v })} />
          </Campo>
          <Campo label="Codici Ateco ammessi · uno per riga" htmlFor="sb-ateco" info="ateco">
            <ListaRighe id="sb-ateco" value={b.ateco} onChange={(v) => set({ ateco: v })} placeholder="Es. 62.01" />
          </Campo>
          <Campo label="Soggetti beneficiari" htmlFor="sb-benef" info="beneficiari">
            <Input id="sb-benef" value={b.beneficiari} onChange={(e) => set({ beneficiari: e.target.value })} />
          </Campo>
          <Campo label="Regime di aiuto" info="regime">
            <Select value={b.regime ?? NESSUNA} onValueChange={(v) => set({ regime: v === NESSUNA ? null : (v as SchedaBando['regime']) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NESSUNA}>
                  <span className="text-muted-foreground">Non indicato</span>
                </SelectItem>
                <SelectItem value="gber">GBER</SelectItem>
                <SelectItem value="de-minimis">De minimis</SelectItem>
                <SelectItem value="altro">Altro</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
        </div>
        <Campo label="Caratteristiche dei progetti e risorse disponibili" htmlFor="sb-caratt" info="caratteristicheBando">
          <AreaTesto id="sb-caratt" value={b.caratteristiche} onChange={(v) => set({ caratteristiche: v })} />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo label="Spesa minima (€)" htmlFor="sb-min" info="spesaMinMax">
            <NumeroInput id="sb-min" value={b.spesaMin} onChange={(v) => set({ spesaMin: v })} />
          </Campo>
          <Campo label="Spesa massima (€)" htmlFor="sb-max" info="spesaMinMax">
            <NumeroInput id="sb-max" value={b.spesaMax} onChange={(v) => set({ spesaMax: v })} />
          </Campo>
          <Campo label="Durata massima (mesi)" htmlFor="sb-durata" info="durataMax">
            <NumeroInput id="sb-durata" step="1" value={b.durataMaxMesi} onChange={(v) => set({ durataMaxMesi: v })} />
          </Campo>
        </div>
        <Campo label="Costi ammissibili (categorie) · una per riga" htmlFor="sb-categorie" info="categorieCosto">
          <ListaRighe id="sb-categorie" rows={5} value={b.categorieCosto} onChange={(v) => set({ categorieCosto: v })} />
        </Campo>

        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            Intensità di aiuto (%)
            <Info k="intensita" />
          </div>
          <div className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2 text-sm">
            <span className="text-xs text-muted-foreground">Soggetto</span>
            <span className="text-xs text-muted-foreground">RI</span>
            <span className="text-xs text-muted-foreground">SS</span>
            {b.intensita.map((r) => (
              <div key={r.tipo} className="contents">
                <span className={noi.tipo === r.tipo ? 'font-semibold' : undefined}>
                  {TIPI_SOGGETTO.find((t) => t.id === r.tipo)?.label}
                  {noi.tipo === r.tipo && <span className="ml-1 text-xs font-normal text-muted-foreground">(noi)</span>}
                </span>
                {(['ri', 'ss'] as const).map((k) => (
                  <NumeroInput
                    key={k}
                    aria-label={`${k.toUpperCase()} ${r.tipo}`}
                    step="1"
                    value={r[k]}
                    onChange={(v) =>
                      set({ intensita: b.intensita.map((x) => (x.tipo === r.tipo ? { ...x, [k]: v ?? 0 } : x)) })
                    }
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Finanziamento agevolato (fino al %)" htmlFor="sb-fin" info="finanziamentoAgevolato">
              <NumeroInput id="sb-fin" step="1" value={b.finanziamentoAgevolatoPct} onChange={(v) => set({ finanziamentoAgevolatoPct: v })} />
            </Campo>
            <Campo label="Maggiorazione per collaborazione effettiva (punti %)" htmlFor="sb-magg" info="maggiorazione">
              <NumeroInput id="sb-magg" step="1" value={b.maggiorazionePct} onChange={(v) => set({ maggiorazionePct: v })} />
            </Campo>
          </div>
        </div>

        <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
          <Campo label="Modalità di erogazione" htmlFor="sb-erog" info="erogazione">
            <Input
              id="sb-erog"
              placeholder="Anticipo / SAL / saldo"
              value={b.erogazione}
              onChange={(e) => set({ erogazione: e.target.value })}
            />
          </Campo>
          <Campo label="Scadenza per presentare ogni SAL (giorni dalla chiusura)" htmlFor="sb-gsal" info="giorniSal">
            <NumeroInput id="sb-gsal" step="1" value={b.giorniPresentazioneSal} onChange={(v) => set({ giorniPresentazioneSal: v })} />
          </Campo>
          <Campo label="Modalità di presentazione" htmlFor="sb-pres" info="modalitaPresentazione">
            <Input
              id="sb-pres"
              placeholder="PEC / piattaforma / altro"
              value={b.modalitaPresentazione}
              onChange={(e) => set({ modalitaPresentazione: e.target.value })}
            />
          </Campo>
          <Campo label="Modulistica (link) · uno per riga" htmlFor="sb-modul" info="modulistica">
            <ListaRighe id="sb-modul" value={b.modulistica} onChange={(v) => set({ modulistica: v })} />
          </Campo>
        </div>
        <Campo label="Criteri di valutazione" htmlFor="sb-criteri" info="criteriValutazione">
          <AreaTesto id="sb-criteri" value={b.criteriValutazione} onChange={(v) => set({ criteriValutazione: v })} />
        </Campo>
        <Campo label="Nota bene" htmlFor="sb-nb" info="notaBene">
          <AreaTesto id="sb-nb" value={b.notaBene} onChange={(v) => set({ notaBene: v })} />
        </Campo>
      </CardContent>
    </Card>
  );
}

export default function SchedaTab({ p, aggiorna }: { p: Progetto; aggiorna: (c: Partial<Progetto> | ((p: Progetto) => Progetto)) => void }) {
  return (
    <div className="space-y-4">
      <AvvisiBox avvisi={avvisiScheda(p)} />
      {p.task.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Costo stimato dai task della WBS: <span className="font-medium text-foreground">{eur(costoStimatoTotale(p))}</span>
          {p.budgetTotale !== null && <> · budget dichiarato {eur(p.budgetTotale)}</>}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <SchedaProgettoCard p={p} aggiorna={aggiorna} />
        <SchedaBandoCard p={p} aggiorna={aggiorna} />
      </div>
    </div>
  );
}
