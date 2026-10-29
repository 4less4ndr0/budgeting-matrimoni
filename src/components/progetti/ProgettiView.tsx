import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/storage/store';
import { useProgettoAttivo } from './comuni';
import GanttTab from './GanttTab';
import OrganizzazioneTab from './OrganizzazioneTab';
import PortafoglioTab, { STATI } from './PortafoglioTab';
import RischiTab from './RischiTab';
import SalTab from './SalTab';
import SchedaTab from './SchedaTab';
import WbsTab from './WbsTab';

/** The seven tabs follow the project life cycle; everything but Portafoglio is per project. */
export default function ProgettiView() {
  const progetti = useAppStore((s) => s.progetti.progetti);
  const setProgettoAttivo = useAppStore((s) => s.setProgettoAttivo);
  const { progetto, aggiorna } = useProgettoAttivo();

  const senzaProgetto = (
    <p className="text-sm text-muted-foreground">
      {progetti.length === 0 ? 'Crea il primo progetto nel Portafoglio.' : 'Scegli un progetto qui sopra.'}
    </p>
  );

  return (
    <div className="space-y-3">
      {progetti.length > 0 && (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-sm text-muted-foreground">Progetto attivo</span>
          <div className="sm:w-96">
            <Select value={progetto?.id ?? ''} onValueChange={(v) => setProgettoAttivo(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Scegli un progetto" />
              </SelectTrigger>
              <SelectContent>
                {progetti.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.titolo.trim() || 'Progetto senza titolo'}
                    <span className="ml-2 text-xs text-muted-foreground">{STATI.find((s) => s.id === p.stato)?.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Tabs defaultValue="portafoglio">
        <TabsList>
          <TabsTrigger value="portafoglio">Portafoglio</TabsTrigger>
          <TabsTrigger value="scheda">Scheda progetto</TabsTrigger>
          <TabsTrigger value="wbs">WBS</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
          <TabsTrigger value="organizzazione">Organizzazione</TabsTrigger>
          <TabsTrigger value="rischi">Rischi</TabsTrigger>
          <TabsTrigger value="sal">SAL e rendicontazione</TabsTrigger>
        </TabsList>
        <TabsContent value="portafoglio">
          <PortafoglioTab />
        </TabsContent>
        <TabsContent value="scheda">{progetto ? <SchedaTab p={progetto} aggiorna={aggiorna} /> : senzaProgetto}</TabsContent>
        <TabsContent value="wbs">{progetto ? <WbsTab p={progetto} aggiorna={aggiorna} /> : senzaProgetto}</TabsContent>
        <TabsContent value="gantt">{progetto ? <GanttTab p={progetto} /> : senzaProgetto}</TabsContent>
        <TabsContent value="organizzazione">
          {progetto ? <OrganizzazioneTab p={progetto} aggiorna={aggiorna} /> : senzaProgetto}
        </TabsContent>
        <TabsContent value="rischi">{progetto ? <RischiTab p={progetto} aggiorna={aggiorna} /> : senzaProgetto}</TabsContent>
        <TabsContent value="sal">{progetto ? <SalTab p={progetto} aggiorna={aggiorna} /> : senzaProgetto}</TabsContent>
      </Tabs>
    </div>
  );
}
