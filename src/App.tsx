import { Download } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import AssumptionsView from '@/components/assumptions/AssumptionsView';
import FundsTable from '@/components/costs/FundsTable';
import LineItemsTable from '@/components/costs/LineItemsTable';
import DashboardView from '@/components/dashboard/DashboardView';
import ImportView from '@/components/import/ImportView';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportWorkbook } from '@/lib/export/exportWorkbook';
import { useAppStore } from '@/lib/storage/store';

export default function App() {
  const state = useAppStore(
    useShallow((s) => ({
      lineItems: s.lineItems,
      fundEntries: s.fundEntries,
      revenueAssumptions: s.revenueAssumptions,
      schemaVersion: s.schemaVersion,
    })),
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 pb-16">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Budgeting matrimoni.top</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Burn rate e proiezione break-even per il business matrimoni.top
          </p>
        </div>
        <Button variant="secondary" onClick={() => exportWorkbook(state)} className="self-start">
          <Download />
          Esporta Excel
        </Button>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="costi">Costi & Fondi</TabsTrigger>
          <TabsTrigger value="assunzioni">Assunzioni ricavi</TabsTrigger>
          <TabsTrigger value="importa">Importa</TabsTrigger>
        </TabsList>

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
        <TabsContent value="importa">
          <ImportView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
