# Aggiornamento Web — istruzioni per Windows

1. Ferma JARVIS con Ctrl+C nel terminale.
2. Estrai JARVIS-Aggiornamento-Web.zip in una cartella temporanea.
3. Copia tutto il contenuto estratto nella cartella esistente `C:\Users\OEM\Desktop\PIPPO\JARVIS`, confermando la sostituzione dei file. Non eliminare quella cartella: conserva `.venv`, `models` e `data`.
4. Apri `cmd` nella cartella del progetto e avvia `.venv\Scripts\python app.py`.
5. Nel browser premi Ctrl+F5. Sopra la casella della chat trovi **Cerca sul web**: attivala e invia una domanda specifica. In alternativa scrivi/detta `cerca sul web: nuove missioni spaziali europee`.

La ricerca usa DuckDuckGo, poi Bing RSS se il primo non fornisce estratti utilizzabili. Non richiede account, chiavi o nuovi pacchetti Python. La domanda viene trasmessa al motore, ma la cronologia non viene trasmessa al motore di ricerca. Non inserire informazioni riservate nelle ricerche. La sintesi rimane affidata a Ollama locale. Per restare offline disattiva Cerca sul web.

JARVIS legge solo titoli ed estratti dei risultati, non le pagine complete. I link delle fonti sono mostrati sotto la risposta; aprili per verificare i fatti. L'ordine dei risultati non garantisce attendibilità o aggiornamento. I numeri citati dal modello possono essere errati: confrontali con i link mostrati. Il testo web è trattato come contenuto non attendibile, mai come comandi del computer.

Se la ricerca non restituisce risultati o viene bloccata (CAPTCHA, rate limit, rete), JARVIS lo dice e offre il collegamento per cercare manualmente nel browser. Non esistono garanzie di disponibilità per endpoint pubblici senza API. Non vengono aggirati CAPTCHA o limitazioni. Se Ollama non risponde, i link trovati restano visibili senza una sintesi inventata.

Il piccolo modello 1.5B non viene migliorato internamente dalla ricerca: riceve informazioni nuove ma può comunque ragionare male. L'aggiornamento non introduce eventi creati dalla chat né nuove voci.

## Verifica di questa versione

18 test automatici passati su Python 3.12: inclusi parsing HTML/RSS, fallback, link, limiti, contesto del modello, errore ricerca e funzioni locali offline. Risposte del motore e di Ollama simulate nei test. Prova browser con rete simulata per verificare interruttore, fonti e regressioni. Richieste reali ai motori non riuscite in questo ambiente cloud: il proxy risponde HTTP 403 “Domain forbidden”. Occorre provare una ricerca sul PC locale per confermare la compatibilità con la propria rete e i motori correnti.
