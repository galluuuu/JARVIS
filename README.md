# JARVIS Locale

## Aggiornamento: ricerca internet

Attiva **Cerca sul web** nella chat oppure scrivi/detta **cerca sul web: ultime notizie sull’esplorazione spaziale**. La domanda viene inviata a DuckDuckGo (HTML), con Bing RSS come alternativa. Il modello locale riassume gli estratti e l’interfaccia mostra fino a quattro fonti cliccabili. Non vengono scaricate le pagine complete. Nessuna API key o nuova libreria richiesta. I comandi locali restano offline. I motori possono bloccare le richieste automatiche o restituire risultati vecchi/non pertinenti: controlla le fonti. Se la ricerca fallisce, non viene generata una falsa risposta aggiornata; puoi aprire la ricerca nel browser o disattivare il web.

### Aggiornare un’installazione esistente su Windows

1. Ferma JARVIS con Ctrl+C nella sua finestra del terminale.
2. Scarica [JARVIS-Aggiornamento-Web.zip](downloads/JARVIS-Aggiornamento-Web.zip?raw=true) ed estrailo in una cartella temporanea.
3. Copia **tutto il contenuto estratto** nella tua cartella JARVIS (quella con app.py), confermando la sostituzione dei file. Non cancellare la vecchia cartella: `.venv`, `models` e `data` devono restare al loro posto. Il pacchetto di aggiornamento non contiene queste cartelle.
4. Da quella cartella avvia `.venv\Scripts\python app.py`.
5. Nel browser premi Ctrl+F5, abilita **Cerca sul web** e poni una domanda specifica.

La voce e il modello già installati vengono riutilizzati. Questa modifica non aggiunge la creazione di eventi dalla chat e non cambia il modello AI. Per conversazioni senza ricerca disattiva la casella.

## Download
- [Scarica il progetto ZIP](downloads/JARVIS-Locale.zip?raw=true)
- [Leggi o scarica il manuale PDF](docs/Manuale-JARVIS.pdf)

Il PDF è incluso anche nello ZIP. Su GitHub puoi usare il pulsante **Download raw file** nella pagina del file.
Assistente personale Python, dashboard animata e dati locali. Nessuna API a pagamento.

## Avvio rapido
Richiede Python 3.10 o successivo (consigliato 3.11/3.12). Esegui `python app.py` (`python3 app.py` su macOS/Linux), poi apri l'indirizzo stampato dal programma nel browser. Windows: anche `Avvia-Windows.bat`. macOS/Linux: `sh avvia-macos-linux.sh`.

Senza librerie aggiuntive: note, promemoria, calcolatrice, ora/data, esportazione JSON e dashboard. Per domande libere installa **Ollama** da https://ollama.com e scarica il modello con `ollama pull qwen2.5:1.5b`. Se il servizio non è già attivo: `ollama serve`. Nessuna chiave API. Il primo download richiede internet e diversi GB di spazio. Le risposte vengono calcolate sul computer; non sono sempre corrette.

## Voce opzionale, senza servizi di riconoscimento cloud
1. Crea un ambiente virtuale: `python -m venv .venv` (o `python3`).
2. Installa `vosk` con `.venv\Scripts\python -m pip install -r requirements-voice.txt` su Windows; `.venv/bin/python -m pip install -r requirements-voice.txt` su macOS/Linux.
3. Scarica `vosk-model-small-it-0.22` dalla tabella italiana di https://alphacephei.com/vosk/models. Estrai il contenuto in `models/vosk-it/` (dentro devono esserci `am`, `conf`, `graph`, ecc.; non una cartella annidata).
4. Avvia con il Python dell'ambiente virtuale: `.venv\Scripts\python app.py` oppure `.venv/bin/python app.py`. I launcher normali usano il Python di sistema.
5. Autorizza il microfono nel browser. Premi il microfono, parla, premi stop. Controlla la trascrizione e premi Invia.
6. In Impostazioni abilita la lettura e scegli una voce italiana locale installata sul sistema. Disponibilità e qualità dipendono da sistema/browser. Nessuna voce viene fornita nello ZIP.

## Comandi
`aiuto`, `ora`, `data`, `nota: testo`, `note`, `promemoria`, `calcola: (12 + 3) * 2`.
Le altre domande passano a Ollama. Note e promemoria si creano anche con i pulsanti. Il modello non esegue azioni: una risposta come “ho salvato” non sostituisce un comando locale. Nessuna esecuzione di comandi di sistema.

## Dati e limiti
Database SQLite: `data/jarvis.db`, creato al primo uso. Per un backup completo chiudi JARVIS e copia `data/`; l'esportazione JSON è consultabile ma non è previsto un import automatico. La chat resta solo nella scheda corrente e viene persa al ricaricamento. Nome e preferenza lettura sono nel browser. Nessuna autenticazione: usare solo sul proprio computer. Server vincolato a 127.0.0.1; non esporlo in rete.

Promemoria: il browser deve restare aperto e il computer sveglio. Non è un servizio in background. Le scadenze passate sono segnalate alla riapertura. Più schede possono produrre avvisi duplicati. Gli orari seguono il fuso del computer.

## Modelli e risorse
Default: `qwen2.5:1.5b` (Apache 2.0). Suggeriti almeno 8 GB RAM e 5 GB di spazio libero complessivo; non sono requisiti minimi garantiti. Il download del modello è circa 1 GB. La velocità dipende dall’hardware. Per usare un altro modello scaricalo con Ollama e imposta la variabile `JARVIS_MODEL` prima di avviare Python. Consulta sempre la licenza del modello scelto.

## Test
`python -m unittest discover -s tests -v`

Vedi **docs/Manuale-JARVIS.pdf** per installazione dettagliata, relazione e risoluzione problemi. Progetto distribuito con licenza MIT; librerie, modelli e voci mantengono le proprie licenze. Nessun costo software o abbonamento richiesto; hardware, connessione ed elettricità restano a carico dell'utente.
