import { useShallow } from 'zustand/react/shallow';
import AssumptionsView from '@/components/assumptions/AssumptionsView';
import BudgetView from '@/components/budget/BudgetView';
import ChangelogButton from '@/components/changelog/ChangelogButton';
import FundsTable from '@/components/costs/FundsTable';
import LineItemsTable from '@/components/costs/LineItemsTable';
import DashboardView from '@/components/dashboard/DashboardView';
import DimensioneImpresaView from '@/components/dimensione/DimensioneImpresaView';
import ImportExportMenu from '@/components/export/ImportExportMenu';
import ProgettiView from '@/components/progetti/ProgettiView';
import GovernanceView from '@/components/governance/GovernanceView';
import DipendentiView from '@/components/hr/DipendentiView';
import OrganigrammaView from '@/components/hr/OrganigrammaView';
import SupplyChainView from '@/components/supplyChain/SupplyChainView';
import ThemeToggle, { useTheme } from '@/components/theme/ThemeToggle';
import { Toaster } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/storage/store';

// Primo livello (aree dell'azienda) come controllo segmentato, così si distingue a colpo
// d'occhio dai livelli sotto, che restano tab sottolineate. Su telefono le cinque aree non
// stanno in una riga: griglia a due colonne, così restano tutte visibili senza scorrere. Niente
// sfumatura di scorrimento (scroll-fade-x): coprirebbe lo sfondo.
const AREA_LIST = 'grid h-auto w-full grid-cols-2 gap-1 rounded-lg border-b-0 bg-muted !bg-none p-1 sm:flex sm:w-fit';
const AREA_TRIGGER =
  'flex-1 rounded-md border-b-0 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:flex-none sm:py-1.5';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const state = useAppStore(
    useShallow((s) => ({
      lineItems: s.lineItems,
      fundEntries: s.fundEntries,
      budgetItems: s.budgetItems,
      budgetTotale: s.budgetTotale,
      lineItemCategories: s.lineItemCategories,
      fundCategories: s.fundCategories,
      revenueAssumptions: s.revenueAssumptions,
      runwayAssumptions: s.runwayAssumptions,
      dipendenti: s.dipendenti,
      ruoli: s.ruoli,
      governance: s.governance,
      supplyChain: s.supplyChain,
      dimensioneImpresa: s.dimensioneImpresa,
      progetti: s.progetti,
      schemaVersion: s.schemaVersion,
    })),
  );

  return (
    // Un solo provider per tutti i tooltip dell'app (richiesto da Radix).
    <TooltipProvider delayDuration={200}>
      <Tabs defaultValue="economica">
        {/* Title + top-level tabs pinned to the top of the viewport: they no longer scroll
            away with the page, so there's nothing left to look like it's "moving" while
            scrolling. */}
        <div className="sticky top-0 z-20 bg-background">
          <div className="mx-auto max-w-6xl px-safe pt-6">
            <header className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Regia</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Il sistema unico di controllo d&apos;impresa: conti, persone, governance, filiera e progetti
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start">
                <ImportExportMenu state={state} />
                <ChangelogButton />
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
              </div>
            </header>

            <TabsList className={AREA_LIST}>
              <TabsTrigger value="economica" className={AREA_TRIGGER}>
                Gestione economica
              </TabsTrigger>
              <TabsTrigger value="hr" className={AREA_TRIGGER}>
                HR
              </TabsTrigger>
              <TabsTrigger value="governance" className={AREA_TRIGGER}>
                Governance
              </TabsTrigger>
              <TabsTrigger value="supply-chain" className={AREA_TRIGGER}>
                Supply Chain
              </TabsTrigger>
              <TabsTrigger value="progetti" className={AREA_TRIGGER}>
                Progetti
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-safe pb-safe pt-1">
          <TabsContent value="economica">
            <Tabs defaultValue="bep">
              <TabsList>
                <TabsTrigger value="bep">BEP</TabsTrigger>
                <TabsTrigger value="budget">Budget</TabsTrigger>
                <TabsTrigger value="dimensione">Dimensione d&apos;impresa</TabsTrigger>
              </TabsList>

              <TabsContent value="bep">
                {/* Own sub-navigation, only visible while BEP is the active tab. */}
                <Tabs defaultValue="dashboard">
                  <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="costi">Costi & Fondi</TabsTrigger>
                    <TabsTrigger value="assunzioni">Assunzioni ricavi</TabsTrigger>
                  </TabsList>

                  <div className="pt-4">
                    <TabsContent value="dashboard">
                      <DashboardView />
                    </TabsContent>
                    <TabsContent value="costi" className="space-y-4">
                      <LineItemsTable />
                      <FundsTable />
                    </TabsContent>
                    <TabsContent value="assunzioni">
                      <AssumptionsView />
                    </TabsContent>
                  </div>
                </Tabs>
              </TabsContent>

              {/* Budget stands on its own: no sub-tabs, nothing from BEP shows through. */}
              <TabsContent value="budget">
                <BudgetView />
              </TabsContent>

              <TabsContent value="dimensione">
                <DimensioneImpresaView />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="hr">
            <Tabs defaultValue="dipendenti">
              <TabsList>
                <TabsTrigger value="dipendenti">Dipendenti</TabsTrigger>
                <TabsTrigger value="organigramma">Organigramma</TabsTrigger>
              </TabsList>
              <TabsContent value="dipendenti">
                <DipendentiView />
              </TabsContent>
              <TabsContent value="organigramma">
                <OrganigrammaView />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="governance">
            <GovernanceView />
          </TabsContent>

          <TabsContent value="supply-chain">
            <SupplyChainView />
          </TabsContent>

          <TabsContent value="progetti">
            <ProgettiView />
          </TabsContent>
        </div>
      </Tabs>
      <Toaster position="bottom-right" theme={theme} />
    </TooltipProvider>
  );
}
