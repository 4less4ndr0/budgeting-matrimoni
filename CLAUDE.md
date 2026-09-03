# Istruzioni per Claude Code in questa repo

Prima di iniziare un task in questa repo, dai un'occhiata a [`README.md`](README.md) (setup,
workflow, convenzioni) e alle voci più recenti di [`CHANGELOG.md`](CHANGELOG.md) — così sai
cosa è già stato fatto (anche dall'altra persona) prima di continuare.

## Changelog

Ogni PR che questa sessione apre deve includere una riga nuova in `CHANGELOG.md`, sotto la
data di oggi (crea la sezione `## YYYY-MM-DD` se non esiste ancora per oggi) **e** sotto
l'argomento giusto (`### Argomento`, crealo dentro la data se non c'è già). Usa la stessa
frase del titolo della PR — diventa anche il messaggio dello squash-merge su `main`, quindi
restano coerenti. Se la voce menziona la PR con `(#N)` alla fine, l'app la trasforma in
automatico in un link a quella PR — mantieni questo formato.

Tassonomia fissa degli argomenti (usa uno di questi, o aggiungine uno nuovo solo se
davvero non calza nessuno): **Categorie · Runway & Budget · Dashboard · Costi & Fondi ·
Assunzioni ricavi · Import/Export · Fix tecnici · Documentazione & processo**.

Questo file è anche quello che l'app mostra dal vivo nel popup del bottone "Changelog"
accanto a "Esporta" (`src/components/changelog/ChangelogButton.tsx`, importato via `?raw`
— ogni build prende automaticamente l'ultima versione, non serve altro).

## Branch

Devono esistere solo due branch di lavoro oltre a `main`: `alessandro/lavoro` e
`leo/lavoro`. Regole:
- Lavora solo sul branch persistente della persona che ha avviato la sessione (chiedi se
  non è chiaro chi sta usando questa sessione). **Mai** `git checkout -b <nome-nuovo>` —
  niente branch nuovi, nemmeno temporanei per un singolo task.
- Se il branch corrente (`git branch --show-current`) non è `alessandro/lavoro` o
  `leo/lavoro`, fermati e chiedi prima di procedere.
- Non cancellare, forzare o riscrivere la storia del branch di lavoro dell'altra persona
  senza conferma esplicita nella chat.
- Prima di iniziare a committare, sincronizza il branch con `origin/main` (fetch + merge)
  così le PR restano piccole e senza conflitti inutili.

`main` è protetto (niente push diretti): ogni modifica passa da una PR aperta dal proprio
branch persistente. Vedi la sezione "Lavorare in due sulla repo" in `README.md` per il
dettaglio del workflow e per il motivo esatto per cui compaiono branch tipo
`<utente>-patch-N` se si modifica un file dall'editor web di GitHub partendo da `main`.
