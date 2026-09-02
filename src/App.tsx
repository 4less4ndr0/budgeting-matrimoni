import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import AssumptionsView from './components/assumptions/AssumptionsView';
import FundsTable from './components/costs/FundsTable';
import LineItemsTable from './components/costs/LineItemsTable';
import DashboardView from './components/dashboard/DashboardView';
import ImportView from './components/import/ImportView';
import { exportWorkbook } from './lib/export/exportWorkbook';
import { useAppStore } from './lib/storage/store';

type Tab = 'dashboard' | 'costi' | 'assunzioni' | 'importa';

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'costi', label: 'Costi & Fondi' },
  { key: 'assunzioni', label: 'Assunzioni ricavi' },
  { key: 'importa', label: 'Importa' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const state = useAppStore(
    useShallow((s) => ({
      lineItems: s.lineItems,
      fundEntries: s.fundEntries,
      revenueAssumptions: s.revenueAssumptions,
      schemaVersion: s.schemaVersion,
    })),
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Budgeting matrimoni.top</h1>
          <p>Burn rate e proiezione break-even per il business matrimoni.top</p>
        </div>
        <button className="btn secondary" onClick={() => exportWorkbook(state)}>
          Esporta Excel
        </button>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-button ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'dashboard' && <DashboardView />}
      {tab === 'costi' && (
        <>
          <LineItemsTable />
          <FundsTable />
        </>
      )}
      {tab === 'assunzioni' && <AssumptionsView />}
      {tab === 'importa' && <ImportView />}
    </div>
  );
}
