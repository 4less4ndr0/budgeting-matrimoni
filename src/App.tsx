import { useShallow } from 'zustand/react/shallow';
import AssumptionsView from '@/components/assumptions/AssumptionsView';
import BilancioView from '@/components/bilancio/BilancioView';
import FundsTable from '@/components/costs/FundsTable';
import LineItemsTable from '@/components/costs/LineItemsTable';
import DashboardView from '@/components/dashboard/DashboardView';
import ExportMenu from '@/components/export/ExportMenu';
import ImportView from '@/components/import/ImportView';
import SnapshotRestoreCard from '@/components/import/SnapshotRestoreCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/storage/store';

export default function App() {
  const state = useAppStore(
    useShallow((s) => ({
      lineItems: s.lineItems,
      fundEntries: s.fundEntries,
      budgetItems: s.budgetItems,
      revenueAssumptions: s.revenueAssumptions,
      schemaVersion: s.schemaVersion,
    })),
  );

  return (
    <Tabs defaultValue="bep">
      {/* Title + top-level tabs pinned to the top of the viewport: they no longer scroll
          away with the page, so there's nothing left to look like it's "moving" while
          scrolling. */}
      <div className="sticky top-0 z-20 bg-background">
        <div className="mx-auto max-w-6xl px-5 pt-6">
          <header className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Budgeting matrimoni.top</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Burn rate e proiezione break-even per il business matrimoni.top
              </p>
            </div>
            <ExportMenu state={state} />
          </header>

          <TabsList>
            <TabsTrigger value="bep">BEP</TabsTrigger>
            <TabsTrigger value="bilancio">Bilancio</TabsTrigger>
          </TabsList>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-4">
        <TabsContent value="bep">
          {/* Own sub-navigation, only visible while BEP is the active top-level tab. */}
          <Tabs defaultValue="dashboard">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="costi">Costi & Fondi</TabsTrigger>
              <TabsTrigger value="assunzioni">Assunzioni ricavi</TabsTrigger>
              <TabsTrigger value="importa">Importa</TabsTrigger>
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
              <TabsContent value="importa" className="space-y-4">
                <SnapshotRestoreCard />
                <ImportView />
              </TabsContent>
            </div>
          </Tabs>
        </TabsContent>

        {/* Bilancio stands on its own: no sub-tabs, nothing from BEP shows through. */}
        <TabsContent value="bilancio">
          <BilancioView />
        </TabsContent>
      </div>
    </Tabs>
  );
}
