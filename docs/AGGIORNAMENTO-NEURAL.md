# Neural Edition — nuova interfaccia e tono formale

## Aggiornamento Windows senza perdere la configurazione

1. Chiuda JARVIS con Ctrl+C nella finestra del terminale.
2. Scarichi `downloads/JARVIS-Aggiornamento-Neural.zip` da GitHub ed estragga lo ZIP in una cartella temporanea.
3. Copi tutto il contenuto estratto nella cartella **esistente** `C:\Users\OEM\Desktop\PIPPO\JARVIS`, confermando la sostituzione dei file.
4. Non cancelli la vecchia cartella: `.venv`, `models` e `data` devono restare. Lo ZIP non contiene queste cartelle. Riutilizza Python, voce Vosk, dati e modello Ollama già installati. Nessuna nuova libreria richiesta.
5. Apra `cmd` dalla barra dell'indirizzo della cartella JARVIS ed esegua:

```bat
.venv\Scripts\python app.py
```

6. Nel browser prema **Ctrl+F5** per caricare i nuovi file.

Questo pacchetto include anche la precedente funzione di ricerca web: può aggiornare sia la prima versione sia quella con ricerca già installata.

## Saluto e tono

All'apertura JARVIS mostra un saluto in base all'orologio del computer:

- Dalle 05:00 alle 11:59: «Buongiorno, signore. Come posso aiutarla?»
- Dalle 12:00 alle 17:59: «Buon pomeriggio, signore. Come posso aiutarla?»
- Dalle 18:00 alle 04:59: «Buonasera, signore. Come posso aiutarla?»

I comandi locali rispondono dando del Lei. Il messaggio di sistema di Ollama richiede lo stesso tono cortese, professionale e discreto. Un piccolo modello può occasionalmente non rispettare lo stile: questa istruzione non garantisce ogni singola risposta generata. I saluti e i comandi locali non dipendono dal modello.

In **Impostazioni**, abiliti **Legga le risposte ad alta voce** e **Saluto vocale al primo clic di ogni apertura**. Se entrambi sono attivi, il primo clic adatto nell'interfaccia avvia il saluto una volta per apertura della pagina. Non parte automaticamente mentre si invia un messaggio o si avvia il microfono. Un browser può comunque richiedere permessi audio o non offrire voci italiane. Il pulsante **Ascolti il saluto** riproduce il saluto su richiesta anche con lettura automatica disattivata. **Interrompa la lettura** ferma la voce. La voce selezionata viene ricordata nel browser.

## Rete simulata

La nuova interfaccia usa una rete di punti e connessioni in prospettiva tridimensionale, disegnata localmente in Canvas. Non scarica librerie o risorse grafiche da internet. Gli stati visivi corrispondono ad attività effettive dell'app:

- Attesa: ciano, «Al suo servizio».
- Ascolto: verde, «La ascolto, signore»; l'intensità reagisce al volume del microfono.
- Trascrizione: azzurro.
- Elaborazione: violetto; se selezionata, ricerca web indicata nello stato.
- Lettura: ciano, fino alla fine della riproduzione o alla sua interruzione.

È una visualizzazione decorativa **simulata**, non la rete interna del modello AI. Il movimento può essere messo in pausa con il pulsante sotto la rete. Rispetta per impostazione iniziale la preferenza di movimento ridotto del sistema, riduce la risoluzione su schermi ad alta densità e ferma l'animazione quando la pagina o la rete non sono visibili. Su computer molto limitati conviene metterla in pausa.

## Verifiche

20 test Python passati, inclusi saluti ai confini degli orari, risposte locali senza Ollama, prompt formale e regressioni della ricerca web. Chromium: rete disegnata e animata, pausa, movimento ridotto, saluto automatico singolo e manuale, transizioni ascolto/trascrizione/elaborazione/lettura, note, calcoli, link delle fonti e layout mobile verificati. La prova browser usa microfono virtuale, riconoscimento, sintesi e Ollama simulati: non sostituisce un test con i dispositivi audio del suo PC. La ricerca esterna è ancora bloccata dalla rete del cloud; restano i limiti descritti nell'aggiornamento Web.

Non sono cambiate le capacità del modello, la disponibilità dei motori web o la gestione dei promemoria. Il bozzetto approvato era una proposta grafica; l'interfaccia realizzata ne riprende colori, organizzazione e rete di nodi, con un rendering Canvas più leggero.
