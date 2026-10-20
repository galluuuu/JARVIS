# Verifica iniziale (prima versione)

- Python 3.12 Linux: 6 test unittest superati, suite `tests/test_app.py`.
- Persistenza SQLite e recupero note; validazione scadenze; calcolatrice con blocco esecuzione codice.
- HTTP reale: pagina, creazione/completamento/eliminazione promemoria, calcolo, rifiuto origine esterna e input non valido.
- Protocollo Ollama verificato con risposta simulata; fallback con servizio non disponibile.
- Chromium: invio calcolo da interfaccia, creazione e cancellazione nota, layout 1440 px e 390 px, nessun errore JavaScript o overflow mobile.
- Pacchetto Vosk 0.3.45 installato correttamente in ambiente virtuale Linux/Python 3.12.
- NON verificati: inferenza su modello Ollama reale, riconoscimento su modello Vosk reale, microfono fisico, altoparlanti e voci del sistema, esecuzione nativa Windows/macOS.
- Motivo: ambiente cloud senza dispositivi audio locali e rete che rifiuta i siti Ollama/Vosk (HTTP 403). Nessun modello è incluso nell'archivio.

Questi limiti non impediscono l'utilizzo delle funzioni locali già verificate. Per abilitare chat libera e voce sul proprio PC sono necessari i download descritti nel manuale. Non si dichiara un collaudo completo delle funzioni vocali o AI.


# Aggiornamento ricerca web

18 test superati, inclusi test del parsing di estratti DuckDuckGo/Bing, fallback, limiti e richiesta Ollama con contesto web. Verifica Chromium con server locale, estratti simulati e Ollama simulato: fonti cliccabili, interruttore persistente, calcolatrice e mobile passati. Ricerca reale bloccata dalla rete cloud (HTTP 403 Domain forbidden). Vedi AGGIORNAMENTO-WEB.md per limiti e prova sul PC.
