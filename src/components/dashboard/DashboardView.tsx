import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildProjection, computeBreakEvenStatus } from '../../lib/calculations/projection';
import { useAppStore } from '../../lib/storage/store';
import type { BreakEvenStatus } from '../../types/domain';

const CATEGORY_COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#38bdf8'];

const STATUS_COPY: Record<BreakEvenStatus, string> = {
  ahead: 'Sei in anticipo sull’obiettivo di break-even 🎉',
  'on-track': 'Sei esattamente in linea con l’obiettivo di break-even ✅',
  behind: 'Sei in ritardo rispetto all’obiettivo di break-even ⚠️',
  'at-risk': 'A queste condizioni non raggiungi il break-even nel periodo proiettato 🚨',
};

function eur(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export default function DashboardView() {
  const state = useAppStore((s) => ({
    lineItems: s.lineItems,
    fundEntries: s.fundEntries,
    revenueAssumptions: s.revenueAssumptions,
    schemaVersion: s.schemaVersion,
  }));

  const projections = useMemo(() => buildProjection(state), [state]);
  const breakEven = useMemo(
    () => computeBreakEvenStatus(projections, state.revenueAssumptions.targetBreakEvenDate),
    [projections, state.revenueAssumptions.targetBreakEvenDate],
  );

  const categoryBreakdown = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const item of state.lineItems) {
      if (item.type !== 'cost') continue;
      byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.amount);
    }
    return Array.from(byCategory.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [state.lineItems]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonth = projections.find((p) => p.month === currentMonthKey) ?? projections[0];

  const avgBurnRate = useMemo(() => {
    if (projections.length === 0) return 0;
    return projections.reduce((sum, p) => sum + p.burnRate, 0) / projections.length;
  }, [projections]);

  const chartMonths = projections.map((p) => ({
    ...p,
    label: p.month,
  }));

  return (
    <div>
      <div className={`status-banner ${breakEven.status}`}>
        <div>
          <strong>{STATUS_COPY[breakEven.status]}</strong>
          <div className="muted" style={{ marginTop: 4 }}>
            {breakEven.breakEvenMonth
              ? `Break-even proiettato: ${breakEven.breakEvenMonth} — target: ${breakEven.targetMonth}${
                  breakEven.monthsDelta ? ` (${breakEven.monthsDelta > 0 ? '+' : ''}${breakEven.monthsDelta} mesi)` : ''
                }`
              : `Nessun break-even entro l'orizzonte proiettato — target: ${breakEven.targetMonth}`}
          </div>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="label">Posizione cumulativa attuale</div>
          <div className="value">{eur(currentMonth?.cumulativePosition ?? 0)}</div>
        </div>
        <div className="stat-tile">
          <div className="label">Burn rate mensile (mese corrente)</div>
          <div className="value">{eur(currentMonth?.burnRate ?? 0)}</div>
        </div>
        <div className="stat-tile">
          <div className="label">Burn rate medio proiettato</div>
          <div className="value">{eur(avgBurnRate)}</div>
        </div>
        <div className="stat-tile">
          <div className="label">Ricavo proiettato (mese corrente)</div>
          <div className="value">{eur(currentMonth?.projectedRevenue ?? 0)}</div>
        </div>
      </div>

      <div className="card">
        <h2>Posizione cumulativa: fondi + ricavi vs costi</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartMonths}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3450" />
            <XAxis dataKey="label" stroke="#9aa5c0" fontSize={11} />
            <YAxis stroke="#9aa5c0" fontSize={11} tickFormatter={(v) => eur(v)} width={80} />
            <Tooltip
              formatter={(v: number) => eur(v)}
              contentStyle={{ background: '#171e2e', border: '1px solid #2a3450', fontSize: 12 }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="cumulativePosition"
              name="Posizione cumulativa"
              stroke="#34d399"
              fill="#34d399"
              fillOpacity={0.15}
            />
            <Area
              type="monotone"
              dataKey="cumulativeCosts"
              name="Costi cumulati"
              stroke="#f87171"
              fill="#f87171"
              fillOpacity={0.08}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Burn rate mensile</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartMonths}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3450" />
              <XAxis dataKey="label" stroke="#9aa5c0" fontSize={11} />
              <YAxis stroke="#9aa5c0" fontSize={11} tickFormatter={(v) => eur(v)} width={80} />
              <Tooltip
                formatter={(v: number) => eur(v)}
                contentStyle={{ background: '#171e2e', border: '1px solid #2a3450', fontSize: 12 }}
              />
              <Bar dataKey="burnRate" name="Burn rate" fill="#fbbf24" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Costi per categoria</h2>
          {categoryBreakdown.length === 0 ? (
            <p className="muted">Nessun costo ancora registrato.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" outerRadius={90} label>
                  {categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => eur(v)}
                  contentStyle={{ background: '#171e2e', border: '1px solid #2a3450', fontSize: 12 }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Tabella mensile</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Mese</th>
                <th>Costo reale</th>
                <th>Entrata reale</th>
                <th>Ricavo proiettato</th>
                <th>Burn rate</th>
                <th>Posizione cumulativa</th>
                <th>Break-even</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((p) => (
                <tr key={p.month}>
                  <td>{p.month}</td>
                  <td>{eur(p.actualCost)}</td>
                  <td>{eur(p.actualIncome)}</td>
                  <td>{eur(p.projectedRevenue)}</td>
                  <td>{eur(p.burnRate)}</td>
                  <td>{eur(p.cumulativePosition)}</td>
                  <td>{p.isBreakEven ? '✅' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
