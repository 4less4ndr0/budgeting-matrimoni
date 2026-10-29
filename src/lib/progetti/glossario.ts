/**
 * Spiegazioni dei campi dell'area Progetti, mostrate nelle InfoTooltip. Tratte dagli appunti del
 * Laboratorio di finanza agevolata (prof. de Renzi): `fonte` rimanda a lezione e slide, così chi
 * studia ritrova il punto. Tenute tutte qui per poterle rileggere e correggere in un posto solo.
 */
export interface VoceGlossario {
  testo: string;
  fonte?: string;
}

export const GLOSSARIO = {
  // --- Portafoglio ------------------------------------------------------------------------------
  progettoAttivo: {
    testo: 'Le tab da Scheda progetto a SAL mostrano il progetto scelto qui. Il Portafoglio invece li mostra tutti: da lì li crei e li valuti.',
    fonte: 'L5 · slide 3–4',
  },
  statoProgetto: {
    testo:
      'Idea: c’è solo l’idea. Pronto: maturo per partire. Candidato: presentato a un bando. In corso: finanziato e avviato. Chiuso: obiettivi raggiunti. Revocato: chiuso prima perché gli obiettivi non sono più raggiungibili o il progetto non serve più. Si valutano nella check list solo Idea e Pronto.',
    fonte: 'L4 · slide 21 · L5 · slide 3–4',
  },
  punteggio: {
    testo: 'La media pesata dei voti della check list: Σ(voto × peso) / Σ(pesi). Con tutti i pesi a 1 dà la stessa classifica della somma della slide.',
    fonte: 'L5 · slide 5',
  },
  pesoCriterio: {
    testo: 'Quanto conta il criterio rispetto agli altri. Con peso 2 un voto vale il doppio. La slide usa la somma semplice, cioè tutti i pesi a 1.',
  },
  votoCriterio: {
    testo: 'Il giudizio del PM aziendale sul progetto per quel criterio: 1 = cattivo, 5 = eccellente. Sul costo, 5 vuol dire costo favorevole (basso).',
    fonte: 'L5 · slide 5',
  },

  // --- Scheda progetto --------------------------------------------------------------------------
  titolo: {
    testo: 'Il nome del progetto come comparirà nella domanda e nelle schede finanziarie.',
    fonte: 'L5 · slide 10–11',
  },
  sintesi: {
    testo: 'In poche righe: problema, soluzione innovativa e risultato atteso. È la prima cosa che legge il valutatore dell’ente.',
    fonte: 'L5 · slide 10',
  },
  capofila: {
    testo:
      'Il soggetto proponente che guida il partenariato (lead partner): di solito chi ha l’idea progettuale e compila la scheda progetto. Gli altri partner gli conferiscono un mandato collettivo con rappresentanza, quindi è lui a tenere i rapporti con il Ministero o l’ente finanziatore.',
    fonte: 'L4 · slide 5 · L5 · slide 8–10',
  },
  ambito: {
    testo: 'L’area di intervento o traiettoria tecnologica del bando in cui ricade il progetto (es. «Salute dell’uomo e biotecnologie»). Nasce dall’incrocio tra le finalità del bando e i progetti prioritari del portafoglio.',
    fonte: 'L5 · slide 8',
  },
  attivitaPrevalente: {
    testo:
      'Ricerca industriale (RI, on desk): acquisire nuove conoscenze per nuovi prodotti, processi o servizi, es. stato dell’arte da TRL 3/4, specifiche funzionali, progettazione di un algoritmo. Sviluppo sperimentale (SS, on field): concretizzarle, es. sviluppo dell’algoritmo, system integration, prototipo dimostratore non commerciale, test. Il bando può finanziarle con intensità diverse.',
    fonte: 'L4 · slide 30 · L5 · slide 2',
  },
  dataInizio: {
    testo: 'Il primo giorno del mese 1 (M1): da qui si contano mesi, Gantt e SAL. Le spese sono ammissibili solo dopo la domanda e il progetto va avviato entro il termine fissato dal bando.',
    fonte: 'L4 · slide 8–9',
  },
  durata: {
    testo: 'In mesi. Un progetto co-finanziato dura di solito 24–36 mesi, salvo proroghe concesse dall’ente; alcuni bandi fissano un massimo più basso.',
    fonte: 'L4 · slide 21 · L5 · slide 11',
  },
  fine: {
    testo: 'Calcolata da data di inizio e durata. Il progetto si chiude anche prima se gli obiettivi diventano irraggiungibili o il progetto non serve più: in un progetto co-finanziato è un caso di revoca.',
    fonte: 'L4 · slide 21',
  },
  budget: {
    testo: 'La stima dei costi ammissibili totali del progetto, di tutto il partenariato. Va confrontata con il range del bando: negli Accordi per l’innovazione 5–40 mln € e, per le imprese, non oltre il 60% della media del fatturato degli ultimi due esercizi.',
    fonte: 'L4 · slide 9 · L5 · slide 11',
  },
  cofinanziamento: {
    testo: 'La parte del budget che il partenariato paga con risorse proprie, cioè quella non coperta dall’agevolazione. La percentuale sul budget totale si calcola da sola.',
    fonte: 'L5 · slide 11',
  },
  partner: {
    testo: 'I soggetti del partenariato, associati ATS ed esterni, numerati come nelle schede finanziarie (Associato 2, 3…). Negli Accordi per l’innovazione al massimo 5 co-proponenti, legati da contratto di rete, consorzio o accordo di partenariato che divide competenze e costi e regola la proprietà dei risultati.',
    fonte: 'L4 · slide 5 · L5 · slide 11',
  },
  numeroAssociato: {
    testo: 'La numerazione delle schede finanziarie: 1 è il capofila, poi Associato 2, 3…',
    fonte: 'L5 · slide 11',
  },
  tipoSoggetto: {
    testo: 'Micro, piccola, media, grande impresa o organismo di ricerca: decide quale riga dell’intensità di aiuto si applica a quel partner.',
    fonte: 'L4 · slide 4',
  },
  collaborazioneEffettiva: {
    testo:
      'Negli Accordi per l’innovazione dà +15 punti di intensità se: a) collaborano più imprese, almeno una PMI, e nessuna sostiene da sola più del 70% dei costi; b) il progetto è tutto nelle regioni meno sviluppate; c) un’impresa collabora con organismi di ricerca che sostengono almeno il 10% dei costi e possono pubblicare i risultati. Qui si applica al contributo atteso, con tetto all’80%.',
    fonte: 'L4 · slide 4',
  },
  infoPartenariato: {
    testo: 'Le competenze che mancano per realizzare il progetto. Servono per la partner search: cercare partner pubblici o privati che completino il partenariato.',
    fonte: 'L5 · slide 9–11',
  },

  // --- Scheda di sintesi del bando --------------------------------------------------------------
  presetAccordi: {
    testo: 'Precompila intensità, finanziamento agevolato, maggiorazione e range di spesa dell’art. 6 del decreto MIMIT visto a lezione. Il resto della scheda non viene toccato e tutto resta modificabile.',
    fonte: 'L4 · slide 4 e 9',
  },
  nomeBando: { testo: 'L’oggetto del bando come pubblicato dall’ente.', fonte: 'L5 · slide 12' },
  linkBando: { testo: 'La pagina ufficiale del bando, da girare al cliente o al management.', fonte: 'L5 · slide 10' },
  dataRilevazione: {
    testo: 'Quando hai trovato il bando. Lo scouting dei bandi va fatto ogni settimana: il consulente manda le schede ai clienti, il PM o il Grant Office al management.',
    fonte: 'L5 · slide 12',
  },
  scadenzaBando: { testo: 'Il termine ultimo per presentare la domanda.', fonte: 'L5 · slide 12' },
  obiettiviBando: {
    testo: 'Le finalità del bando: servono per trovare l’«incrocio perfetto» con i progetti prioritari e pronti del portafoglio.',
    fonte: 'L5 · slide 8',
  },
  ambitiBando: {
    testo: 'Le tecnologie e le aree di intervento ammesse, ad esempio le tecnologie abilitanti fondamentali (KETs) negli Accordi per l’innovazione.',
    fonte: 'L4 · slide 9 · L5 · slide 12',
  },
  ateco: {
    testo: 'La classificazione Istat delle attività economiche. Quasi tutti i bandi chiedono un codice Ateco specifico come requisito di accesso: va verificato subito. Dal 2025 è in vigore l’ATECO 2025.',
    fonte: 'L4 · slide 6',
  },
  beneficiari: {
    testo: 'Chi può partecipare: MPMI (anche liberi professionisti), grandi imprese, organismi di ricerca, startup innovative, imprenditoria femminile o giovanile… Oltre a rientrare tra i soggetti ammessi bisogna avere i requisiti: Ateco, regola de minimis, sicurezza dei lavoratori.',
    fonte: 'L4 · slide 5',
  },
  regime: {
    testo:
      'GBER: il regolamento generale di esenzione (Reg. UE 651/2014), con intensità massime per tipo di soggetto, usato per la R&S. De minimis (Reg. UE 2023/2831): aiuti piccoli che non serve notificare alla Commissione, massimo 300.000 € per impresa unica (richiedente + collegate) in 3 anni, sommando tutti gli aiuti de minimis ricevuti; registrati nell’RNA.',
    fonte: 'L4 · slide 4 e 10–11',
  },
  caratteristicheBando: {
    testo: 'I requisiti tecnici che i progetti devono avere per essere finanziati (es. RI e SS strettamente connesse, avanzamenti tecnologici significativi, unità locali in Italia) e la dotazione del bando.',
    fonte: 'L4 · slide 9',
  },
  spesaMinMax: {
    testo: 'Il range dei costi ammissibili di un progetto. Un budget fuori range rende il progetto non ammissibile.',
    fonte: 'L4 · slide 9',
  },
  durataMax: { testo: 'La durata massima ammessa dal bando, in mesi.', fonte: 'L5 · slide 11' },
  categorieCosto: {
    testo:
      'Le spese che il bando agevola. Per essere ammissibili devono essere sostenute nel periodo del progetto, dal beneficiario, dopo la domanda, ed essere tracciabili. Negli Accordi: personale di R&S (esclusi amministrativi e commerciali), strumenti nuovi (solo la quota d’uso o d’ammortamento), consulenze a prezzi di mercato, spese generali, materiali; niente titoli di spesa sotto i 500 €.',
    fonte: 'L4 · slide 7–8',
  },
  intensita: {
    testo: 'La percentuale dei costi ammissibili coperta dal contributo, per tipo di soggetto e per RI/SS (art. 25 GBER). La riga della nostra impresa la sceglie la dimensione calcolata in Gestione economica.',
    fonte: 'L4 · slide 4',
  },
  finanziamentoAgevolato: {
    testo: 'Un prestito a medio-lungo termine a tasso inferiore a quello di mercato, che può affiancare il contributo a fondo perduto. Negli Accordi per l’innovazione fino al 20% dei costi ammissibili.',
    fonte: 'L3 · slide 16 · L4 · slide 4',
  },
  maggiorazione: {
    testo: 'Punti percentuali in più sull’intensità quando c’è collaborazione effettiva (negli Accordi +15). Si applica solo se nella Scheda progetto spunti «Collaborazione effettiva».',
    fonte: 'L4 · slide 4',
  },
  erogazione: {
    testo: 'Come arriva il contributo: anticipo, per stati di avanzamento (SAL) o a saldo a progetto concluso, sempre dopo la verifica della rendicontazione.',
    fonte: 'L3 · slide 16',
  },
  giorniSal: {
    testo: 'I giorni dalla chiusura di ogni SAL entro cui il bando chiede la rendicontazione. Da qui si calcolano le scadenze nella tab SAL.',
    fonte: 'L5 · slide 22',
  },
  modalitaPresentazione: { testo: 'Come si presenta la domanda: PEC, piattaforma online dell’ente, altro.', fonte: 'L5 · slide 10' },
  modulistica: { testo: 'I moduli da compilare per la domanda, con i link. Uno per riga.', fonte: 'L5 · slide 10' },
  criteriValutazione: {
    testo: 'Come l’ente valuta le proposte (qualità tecnica, metodologia, governance, congruità dei costi…): scrivi il progetto pensando a questi.',
    fonte: 'L3 · slide 19 · L5 · slide 10',
  },
  notaBene: { testo: 'Tutto ciò che conta e non sta negli altri campi: vincoli particolari, cumulabilità, verifiche da fare subito.', fonte: 'L5 · slide 12' },

  // --- WBS ----------------------------------------------------------------------------------------
  obiettivoOperativo: {
    testo: 'Cosa deve ottenere l’OR: un risultato chiaro, che produce deliverable e contribuisce agli obiettivi del progetto.',
    fonte: 'L5 · slide 16',
  },
  tipologiaOr: {
    testo: 'RI o SS, mai tutte e due: niente OR misti. Il suggerimento è un OR di RI e uno di SS per partner, più un OR a partecipazione mista per system integration e test. La tipologia vale per tutti i task dell’OR.',
    fonte: 'L5 · slide 16–17',
  },
  orLeader: {
    testo: 'Il responsabile tecnico e amministrativo dell’OR, dei suoi task e del gruppo di lavoro. È l’unico riferimento per PM, Grant Office e auditor; raccoglie time sheet e ordini di servizio e prepara le DSAN sui requisiti del personale.',
    fonte: 'L4 · slide 19',
  },
  partnerOr: {
    testo: 'Chi lavora sull’OR. Meglio un solo partner per OR: più partner insieme vanno bene per system integration, test e sperimentazione.',
    fonte: 'L5 · slide 16',
  },
  mesiOr: {
    testo: 'Mese di inizio e di fine (M1, M2…), a livello di mese perché è una previsione. Se li lasci vuoti si calcolano dai task; se li scrivi, i task che escono vengono segnalati.',
    fonte: 'L5 · slide 16',
  },
  mesiTask: { testo: 'Mese di inizio e di fine del task (M1 = primo mese del progetto). Aggregati nel tempo danno il Gantt.', fonte: 'L5 · slide 17' },
  avanzamento: { testo: 'Quanto del task è fatto, in %. Lo aggiorna l’OR Leader; nel Gantt è il tratto più intenso della barra.', fonte: 'L4 · slide 19' },
  partnerTask: { testo: 'I partner che svolgono il task. Nel Gantt della slide stanno accanto alle barre.', fonte: 'L5 · slide 19' },
  predecessori: {
    testo: 'I task che devono finire prima che questo parta (vincoli input/output). Facoltativi: servono per avvisarti se uno sviluppo sperimentale parte prima che finisca la ricerca da cui dipende.',
    fonte: 'L5 · slide 23',
  },
  costiTask: {
    testo: 'La stima dei costi del task per categoria ammissibile. Sommati danno il budget; distribuiti sui mesi danno i costi pianificati di ogni SAL, divisi tra RI e SS.',
    fonte: 'L5 · slide 17',
  },
  codiceDeliverable: { testo: 'D + codice del task (D1.2). Se un task ha più deliverable: D1.2.2, D1.2.3…' },
  taskDeliverable: { testo: 'Il task che produce questo deliverable. Ogni task dovrebbe produrne almeno uno.', fonte: 'L5 · slide 13' },
  meseDeliverable: { testo: 'Il mese in cui va consegnato.' },
  statoDeliverable: {
    testo: 'Da fare → in revisione → approvato. L’approvazione definitiva è dello Steering Committee.',
    fonte: 'L4 · slide 19',
  },
  codiceMilestone: { testo: 'M1, M2…: un punto di verifica numerato in ordine.' },
  meseMilestone: { testo: 'Entro la fine di questo mese il risultato deve esserci. Se il mese è passato e non è raggiunta, nel Gantt diventa rossa.', fonte: 'L5 · slide 19' },
  deliverableMilestone: { testo: 'I deliverable che, approvati, fanno scattare la milestone.' },
  raggiunta: { testo: 'Spunta quando la verifica è superata. Una milestone mancata è il segnale per rivedere il Gantt.' },

  // --- Organizzazione -----------------------------------------------------------------------------
  riunioneFatta: { testo: 'Spunta le riunioni tenute: rigenerando il calendario restano così come sono.' },
  riunioneNota: { testo: 'Le decisioni prese: utili per le relazioni semestrali e per l’audit.', fonte: 'L4 · slide 18' },
  tipiRiunione: {
    testo: 'Kick-off all’avvio; Steering Committee ogni due mesi; una riunione in prossimità di ogni chiusura di SAL; riunione di chiusura. Servono a tenere allineati i gruppi di lavoro sugli obiettivi dichiarati nella domanda.',
    fonte: 'L4 · slide 17–18',
  },

  // --- Rischi -------------------------------------------------------------------------------------
  tipoRischio: {
    testo: 'Tecnico: scostamento tra risultati attesi e ottenuti. Gestionale: tra competenze pianificate e capacità reale del gruppo, oppure imprevisti e binari morti che ritardano il Gantt. Economico: tra costi pianificati e spesi.',
    fonte: 'L4 · slide 16',
  },
  orRischio: { testo: 'L’OR su cui pesa il rischio, oppure «Progetto» se riguarda tutto il progetto.' },
  probabilita: { testo: 'Quanto è probabile che succeda: 1 = quasi impossibile, 5 = quasi certo.' },
  impatto: { testo: 'Quanto danneggia tempi, costi o qualità se succede: 1 = trascurabile, 5 = compromette il progetto.' },
  segnale: { testo: 'L’indizio da tenere d’occhio che ti dice che il rischio si sta avverando: es. una milestone che slitta, ore rendicontate sopra il previsto.' },
  azione: { testo: 'Cosa fai se il rischio si verifica: es. integrare il gruppo di lavoro con nuove competenze, rivedere il Gantt.', fonte: 'L4 · slide 16' },
  prevenzione: {
    testo: 'Sui rischi economici, una volta che succedono, nessuna azione correttiva è possibile: conta prevenirli, es. monitorando i costi rendicontati a ogni SAL.',
    fonte: 'L4 · slide 16',
  },
  responsabileRischio: { testo: 'Chi tiene d’occhio il segnale e fa scattare l’azione.' },
  statoRischio: { testo: 'Aperto: da presidiare. Sotto controllo: c’è un’azione in corso. Chiuso: non è più un rischio.' },

  // --- SAL ----------------------------------------------------------------------------------------
  periodicitaSal: { testo: 'Ogni quanti mesi si chiude un SAL. Di solito sei: i SAL semestrali.', fonte: 'L5 · slide 21–22' },
  targetInterno: {
    testo: 'Entro quanti giorni dalla chiusura del SAL vuoi avere pronta la documentazione. Il consiglio è massimo 45: meno errori, flussi finanziari equilibrati e margine per i ritardi dell’istruttoria.',
    fonte: 'L5 · slide 22',
  },
  intensitaNoi: { testo: 'L’intensità di aiuto della nostra impresa presa dalla scheda bando, in base alla dimensione calcolata in Gestione economica.', fonte: 'L4 · slide 4' },
  contributoAtteso: {
    testo: 'Costi rendicontati RI × intensità RI + costi rendicontati SS × intensità SS. È una stima: l’ente eroga dopo aver verificato la rendicontazione.',
    fonte: 'L3 · slide 16',
  },
  statoSal: {
    testo: 'Aperto: periodo in corso. In preparazione: raccolta dei documenti. Presentato: rendicontazione inviata. Approvato: verificata dall’ente. Erogato: contributo incassato.',
  },
  scadenzaSal: { testo: 'Fine SAL + i giorni indicati nella scheda bando: oltre questa data la rendicontazione è fuori termine.', fonte: 'L5 · slide 22' },
  costiRendicontati: {
    testo: 'Le spese effettivamente sostenute e documentate nel periodo, per categoria. RI e SS restano sempre separati (contabilità separata), perché il bando li finanzia con intensità diverse.',
    fonte: 'L4 · slide 8',
  },
  documentiSal: { testo: 'Per ogni OR, a ogni SAL. Li raccoglie l’OR Leader e li gestisce il Responsabile Amministrativo con il Grant Office.', fonte: 'L4 · slide 19' },
} satisfies Record<string, VoceGlossario>;

export type ChiaveGlossario = keyof typeof GLOSSARIO;

/** Spiegazione di ciascun documento della checklist SAL. */
export const INFO_DOCUMENTI: Record<string, string> = {
  'Time sheet del personale': 'Le ore lavorate da ogni persona sul progetto, giorno per giorno: giustificano il costo del personale.',
  'Ordini di servizio': 'L’atto con cui l’impresa assegna formalmente una persona alle attività del progetto.',
  'DSAN sui requisiti del personale': 'Dichiarazione sostitutiva di atto di notorietà che attesta che il personale ha i requisiti richiesti (es. tecnici o ricercatori).',
  'Relazione tecnica semestrale': 'Cosa è stato fatto nel periodo rispetto al piano: la approva lo Steering Committee.',
  'Deliverable del periodo': 'I risultati previsti in consegna nel periodo del SAL.',
  'Giustificativi di spesa con pagamento tracciabile': 'Fatture e altri titoli di spesa con la prova del pagamento tracciabile (bonifico, estratto conto).',
};

/** Cosa entra in ogni categoria di costo predefinita (art. 5 degli Accordi per l'innovazione, L4 · slide 8). */
export const INFO_CATEGORIE: Record<string, string> = {
  Personale: 'Tecnici, ricercatori e ausiliari impiegati nelle attività di R&S. Esclusi amministrativi, contabili e commerciali.',
  'Strumenti e attrezzature':
    'Di nuova fabbricazione, nella misura e per il periodo d’uso nel progetto: se l’uso è più breve della vita utile, solo le quote di ammortamento del periodo.',
  'Consulenze e servizi': 'Consulenze, ricerca contrattuale, brevetti e know-how acquisiti o in licenza, alle normali condizioni di mercato.',
  'Spese generali': 'Costi indiretti collegati al progetto: funzionamento, forniture per uffici, materiali minuti, pulizie.',
  Materiali: 'I materiali consumati nelle attività del progetto.',
};
