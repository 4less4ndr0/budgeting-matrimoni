import { useAppStore } from '../../lib/storage/store';

export default function FundsTable() {
  const fundEntries = useAppStore((s) => s.fundEntries);
  const addFundEntry = useAppStore((s) => s.addFundEntry);
  const updateFundEntry = useAppStore((s) => s.updateFundEntry);
  const removeFundEntry = useAppStore((s) => s.removeFundEntry);

  const sorted = [...fundEntries].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="card">
      <h2>Fondi disponibili</h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>
        Capitale già disponibile per il business (risparmi, investimenti, incassi già
        raccolti) — si somma ai ricavi proiettati per calcolare il break-even.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrizione</th>
              <th>Importo (€)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <input
                    type="date"
                    value={entry.date}
                    onChange={(e) => updateFundEntry(entry.id, { date: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={entry.description}
                    onChange={(e) => updateFundEntry(entry.id, { description: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={entry.amount}
                    onChange={(e) => updateFundEntry(entry.id, { amount: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <button className="icon-btn" onClick={() => removeFundEntry(entry.id)} title="Elimina">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && <p className="muted">Nessun fondo ancora registrato.</p>}

      <button
        className="btn secondary"
        style={{ marginTop: 14 }}
        onClick={() =>
          addFundEntry({
            date: new Date().toISOString().slice(0, 10),
            amount: 0,
            description: '',
          })
        }
      >
        + Aggiungi fondo
      </button>
    </div>
  );
}
