# budgeting-matrimoni

**Live: https://4less4ndr0.github.io/budgeting-matrimoni/**

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

Ogni merge su `main` fa partire automaticamente il workflow GitHub Actions
(`.github/workflows/deploy.yml`) che builda e pubblica su GitHub Pages:
https://4less4ndr0.github.io/budgeting-matrimoni/. Lo stesso workflow gira anche (solo
build + test, senza deploy) su ogni Pull Request verso `main`, per far emergere un errore
prima del merge. **Passo manuale una tantum**: in Settings → Pages della repo, imposta
Source = "GitHub Actions".

## Lavorare in due sulla repo

`main` è protetto: niente push diretti, nemmeno per gli admin — solo via Pull Request.
Ognuno lavora sul proprio branch persistente (es. `<nome>/lavoro`), e quando una modifica
è pronta apre una PR verso `main`:

```bash
git checkout -b <tuo-nome>/lavoro origin/main   # la prima volta
git push -u origin <tuo-nome>/lavoro
# ... lavori, committi ...
gh pr create --base main
```

Non serve l'approvazione dell'altra persona per mergere la propria PR (evita blocchi
quando uno dei due non è online) — la PR è comunque il momento in cui build e test girano
e in cui si vede il diff prima che vada in produzione.

## File di esempio

In `sample-data/esempio-costi.csv` trovi un file CSV di prova con header italiani per
testare subito il flusso di import.

## Import automatico da cartella

Oltre al drag&drop manuale, la sezione "Importa" rileva **in automatico** ogni CSV
presente nella cartella [`csv-imports/`](csv-imports/): appena ce n'è uno basta cliccare
"Importa" per farlo passare nello stesso wizard di mappatura colonne. Dettagli e
attenzione sulla repo pubblica in [`csv-imports/README.md`](csv-imports/README.md).

Il tasto "Esporta" in alto è un menu con due opzioni: Excel (come prima) e **"Salva stato
(.json)"**, che scarica uno snapshot completo — costi, fondi, assunzioni ricavi, override
inclusi — pensato per essere spostato in `csv-imports/`: la stessa tab "Importa" lo rileva
e lo ricarica con un click, così puoi portare la stessa identica situazione su un altro
dispositivo (i dati normalmente vivono solo nel `localStorage` del browser, non sono
condivisi).
