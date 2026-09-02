import { useAppStore } from '../../lib/storage/store';
import type { EntryType } from '../../types/domain';

export default function LineItemsTable() {
  const lineItems = useAppStore((s) => s.lineItems);
  const addLineItem = useAppStore((s) => s.addLineItem);
  const updateLineItem = useAppStore((s) => s.updateLineItem);
  const removeLineItem = useAppStore((s) => s.removeLineItem);

  const sorted = [...lineItems].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="card">
      <h2>Voci di costo ed entrata</h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>
        Modifica liberamente qualsiasi valore: sono i tuoi dati di lavoro, non il file
        importato.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Categoria</th>
              <th>Descrizione</th>
              <th>Importo (€)</th>
              <th>Tipo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.id}>
                <td>
                  <input
                    type="date"
                    value={item.date}
                    onChange={(e) => updateLineItem(item.id, { date: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={item.category}
                    onChange={(e) => updateLineItem(item.id, { category: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => updateLineItem(item.id, { amount: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <select
                    value={item.type}
                    onChange={(e) => updateLineItem(item.id, { type: e.target.value as EntryType })}
                  >
                    <option value="cost">Costo</option>
                    <option value="income">Entrata</option>
                  </select>
                </td>
                <td>
                  <button className="icon-btn" onClick={() => removeLineItem(item.id)} title="Elimina">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && <p className="muted">Nessuna voce ancora. Importa un file o aggiungine una.</p>}

      <button
        className="btn secondary"
        style={{ marginTop: 14 }}
        onClick={() =>
          addLineItem({
            date: new Date().toISOString().slice(0, 10),
            category: '',
            description: '',
            amount: 0,
            type: 'cost',
            source: 'manual',
          })
        }
      >
        + Aggiungi voce
      </button>
    </div>
  );
}
