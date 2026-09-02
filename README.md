# budgeting-matrimoni

Dashboard finanziaria per **matrimoni.top**: importa i tuoi costi (CSV/Excel), tienili
aggiornati in una dashboard interattiva e capisci il **burn rate** e se raggiungerai il
**break-even** entro la data che ti sei dato (default: 6 mesi da oggi).

App 100% client-side: nessun backend, nessun database. I dati restano nel browser
(localStorage) e il file che importi non viene mai modificato — viene solo letto e copiato
nella dashboard.

## Funzionalità

- **Import CSV/Excel** con mappatura colonne (il tuo file può avere qualsiasi struttura:
  scegli tu quale colonna è data, categoria, importo, ecc.)
- **Tabelle editabili** per costi/entrate e fondi disponibili
- **Due modelli di proiezione ricavi**, selezionabili:
  - *Semplice*: prezzo per sito × siti venduti al mese
  - *Funnel B2B*: lead mensili × tasso di conversione × vendita diretta o commissione di
    segnalazione
- **Dashboard**: burn rate mensile, posizione cumulativa, stato rispetto al target di
  break-even (in anticipo / in linea / in ritardo / a rischio), grafici e tabella mensile
- **Export Excel** con i dati aggiornati, riaggiornabile e riapribile su Google Sheets

## Stack UI

Componenti [shadcn/ui](https://ui.shadcn.com) (Radix UI + Tailwind CSS) — sorgenti in
`src/components/ui/`, non un pacchetto npm. `components.json` è già configurato, quindi
una volta installato Node puoi aggiungere altri componenti con:

```bash
npx shadcn@latest add <componente>
```

## Prerequisiti

Serve **Node.js** (versione 20 o superiore) e npm, non ancora installati su questa
macchina. Per installarli:

```bash
brew install node
```

Se `brew` non è installato, prima esegui l'installer ufficiale da
[brew.sh](https://brew.sh), oppure scarica Node direttamente da
[nodejs.org](https://nodejs.org/) (installer `.pkg`).

## Sviluppo locale

```bash
npm install
npm run dev
```

## Test

```bash
npm run test
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

Il push su `main` fa partire automaticamente il workflow GitHub Actions
(`.github/workflows/deploy.yml`) che builda e pubblica su GitHub Pages
(`https://<utente>.github.io/budgeting-matrimoni/`). **Passo manuale una tantum**: in
Settings → Pages della repo, imposta Source = "GitHub Actions".

## File di esempio

In `sample-data/esempio-costi.csv` trovi un file CSV di prova con header italiani per
testare subito il flusso di import.
