# Changelog

Storico delle modifiche pubblicate su `main`, una voce per Pull Request (in ordine di
merge, più recente in cima). Ogni riga corrisponde al titolo della PR, che è anche il
messaggio dello squash-merge su `main` — quindi trovi lo stesso testo anche in
`git log --oneline main`.

**Prima di aprire una PR, aggiungi una riga qui sotto la data di oggi** (vedi
[`README.md`](README.md#lavorare-in-due-sulla-repo)).

## 2026-09-03
- Fix category list not migrating from existing data (#29)
- Categorie gestibili con dropdown e filtro multi-select (#28)
- Confirm before ending an active recurring series (#27)
- Replace run-rate auto-fill with an explicit checkbox (#26)

## 2026-09-02
- Pre-fill cost run-rate override with recurring cost total (#25)
- Spiegazione più chiara per Override run-rate costi mensile (#24)
- Voci ricorrenti: genera righe vere invece di un calcolo invisibile (#23)
- Conferma cancellazione + voci ricorrenti su Costi & Fondi (#22)
- Runway: liquidità disponibile scollegata dai Fondi disponibili (#21)
- Grafico Costi per categoria: da torta a ciambella (#20)
- Dashboard: tile Runway al posto di Burn rate medio proiettato (#19)
- Sposta il box Runway dalla Dashboard alla tab Budget (#18)
- Break-even = ricavi vs costi, aggiunto indicatore ROI (#17)
- Tabella mensile limitata al target, utile netto mensile navigabile (#16)
- Rinomina Bilancio in Budget, aggiungi blocco voci e budget totale (#15)
- Aggiungi stato-sito.json in csv-imports/ (#14)
- Delete stato-sito.json (#13)
- Aggiungi pagina Gestione del bilancio con grafico a ciambella (#12)
- Reset revenue assumption defaults (Tier1 150 / Tier2 300 / Tier3 600, resto a 0) (#11)
- Fix definitivo: navbar sticky, data target senza input nativo (#10)
- CTA Aggiungi voce/fondo in alto anche su desktop (#9)
- Raggruppa costi/fondi per mese in accordion, CTA in alto su mobile (#8)
- Add files via upload (#7)
- Fix: la barra dei tab si muoveva da sola su iOS Safari (#6)
- Aggiungi Tier 3 al modello di ricavo semplice (#5)
- Aggiorna README con tutte le novità (#4)
- Esporta: menu Excel/JSON + snapshot stato completo da csv-imports/ (#3)
- Audit mobile UX: card layout per tabelle editabili, colonna mese fissa (#2)
- Workflow a branch per lavorare in due sulla repo (#1)
