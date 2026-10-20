"""JARVIS Locale — Python 3.10+, nessun servizio cloud richiesto."""
import ast
import base64
import datetime as dt
import json
import operator
import os
from pathlib import Path
import sqlite3
import threading
import urllib.request
import urllib.error
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get('JARVIS_DATA', str(ROOT / 'data')))
MODEL = os.environ.get('JARVIS_MODEL', 'qwen2.5:1.5b')
SYSTEM = ('Sei JARVIS, assistente personale locale. Rispondi in italiano, in modo chiaro e conciso. '
          'Ragiona con cura e spiega brevemente la soluzione. Non fingere di accedere a file, internet, '
          'calendari o dispositivi. Non puoi eseguire azioni dal testo: usa i comandi locali documentati.')

def connect():
    DATA.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DATA / 'jarvis.db')
    db.row_factory = sqlite3.Row
    db.execute('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, kind TEXT, text TEXT, due TEXT, done INTEGER DEFAULT 0)')
    return db

def items():
    with connect() as db:
        return [dict(r) for r in db.execute('SELECT * FROM items ORDER BY id DESC')]

def add(kind, text, due=''):
    text = text.strip()
    if not text or len(text) > 4000:
        raise ValueError('Inserisci un testo tra 1 e 4000 caratteri.')
    if kind not in ('note', 'reminder'):
        raise ValueError('Tipo non valido.')
    if kind == 'reminder':
        if not due:
            raise ValueError('Scegli data e ora del promemoria.')
        dt.datetime.fromisoformat(due)
    with connect() as db:
        db.execute('INSERT INTO items(kind,text,due) VALUES (?,?,?)', (kind,text,due))
    return items()

def calculate(expr):
    if len(expr) > 160:
        raise ValueError('Espressione troppo lunga.')
    ops = {ast.Add:operator.add, ast.Sub:operator.sub, ast.Mult:operator.mul, ast.Div:operator.truediv, ast.Mod:operator.mod}
    def visit(n):
        if isinstance(n, ast.Constant) and type(n.value) in (int,float) and abs(n.value) < 1e15:
            return n.value
        if isinstance(n, ast.UnaryOp) and isinstance(n.op,(ast.USub,ast.UAdd)):
            return -visit(n.operand) if isinstance(n.op,ast.USub) else visit(n.operand)
        if isinstance(n, ast.BinOp) and type(n.op) in ops:
            v=ops[type(n.op)](visit(n.left),visit(n.right))
            if abs(v) > 1e30: raise ValueError('Risultato troppo grande.')
            return v
        raise ValueError('Usa solo numeri, parentesi e + - * / %.')
    return visit(ast.parse(expr,mode='eval').body)

def chat(text, history):
    text=text.strip()
    if not text or len(text)>6000: raise ValueError('Messaggio vuoto o troppo lungo (massimo 6000 caratteri).')
    low=text.lower()
    if low in ('aiuto','help'):
        return 'Comandi locali: ora; data; nota: testo; note; promemoria; calcola: (12 + 3) * 2. Per creare promemoria usa il pulsante dedicato. Le altre domande usano il modello locale Ollama.'
    if low in ('ora','che ore sono','che ore sono?'):
        return 'Sono le '+dt.datetime.now().strftime('%H:%M')+'.'
    if low in ('data','che giorno è oggi?'):
        return 'Oggi è il '+dt.datetime.now().strftime('%d/%m/%Y')+'.'
    if low.startswith('nota:'):
        add('note',text.split(':',1)[1]); return 'Nota salvata sul tuo computer.'
    if low in ('note','mostra note'):
        return '\n'.join(r['text'] for r in items() if r['kind']=='note') or 'Non hai ancora note.'
    if low in ('promemoria','mostra promemoria'):
        return '\n'.join(r['due'].replace('T',' ')+' — '+r['text'] for r in items() if r['kind']=='reminder' and not r['done']) or 'Nessun promemoria attivo.'
    if low.startswith('calcola:'):
        return 'Il risultato è '+str(calculate(text.split(':',1)[1].strip()))+'.'
    messages=[{'role':'system','content':SYSTEM}]
    if not isinstance(history,list): raise ValueError('Cronologia non valida.')
    for m in history[-12:]:
        if isinstance(m,dict) and m.get('role') in ('user','assistant') and isinstance(m.get('content'),str):
            messages.append({'role':m['role'],'content':m['content'][:6000]})
    messages.append({'role':'user','content':text})
    req=urllib.request.Request('http://127.0.0.1:11434/api/chat',data=json.dumps({'model':MODEL,'messages':messages,'stream':False,'options':{'num_predict':600}}).encode(),headers={'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=180) as response:
            return json.load(response)['message']['content']
    except urllib.error.HTTPError as e:
        if e.code==404: return f'Il modello {MODEL} manca. Esegui nel terminale: ollama pull {MODEL}. I comandi locali restano disponibili.'
        raise ValueError('Ollama ha restituito un errore. Controlla il suo terminale.') from e
    except (urllib.error.URLError,TimeoutError):
        return 'Ollama non è disponibile o ha impiegato troppo tempo. Avvialo e scarica il modello indicato nel manuale. Intanto puoi usare note, promemoria, ora e calcolatrice.'

_voice_model=None
_voice_lock=threading.Lock()
def transcribe(encoded):
    global _voice_model
    from vosk import Model, KaldiRecognizer
    path=ROOT/'models'/'vosk-it'
    if not path.is_dir(): raise ValueError('Modello vocale mancante: consulta il manuale, sezione Voce.')
    pcm=base64.b64decode(encoded,validate=True)
    if len(pcm)>16000*2*30: raise ValueError('Registrazione troppo lunga: massimo 30 secondi.')
    with _voice_lock:
        if _voice_model is None: _voice_model=Model(str(path))
        rec=KaldiRecognizer(_voice_model,16000)
        rec.AcceptWaveform(pcm)
        return json.loads(rec.FinalResult()).get('text','')

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def send(self,status,data,ctype='application/json; charset=utf-8'):
        raw=json.dumps(data,ensure_ascii=False).encode() if ctype.startswith('application/json') else data
        self.send_response(status); self.send_header('Content-Type',ctype)
        self.send_header('Content-Length',str(len(raw)))
        self.send_header('X-Content-Type-Options','nosniff'); self.send_header('Cache-Control','no-store')
        self.end_headers(); self.wfile.write(raw)
    def do_GET(self):
        if self.path=='/api/items': return self.send(200,items())
        if self.path=='/api/status':
            available=False
            try:
                with urllib.request.urlopen('http://127.0.0.1:11434/api/tags',timeout=2) as r:
                    available=any(m['name']==MODEL for m in json.load(r).get('models',[]))
            except (OSError,ValueError): pass
            return self.send(200,{'model':MODEL,'ready':available,'voice_model':(ROOT/'models'/'vosk-it').is_dir()})
        files={'/':('index.html','text/html; charset=utf-8'),'/style.css':('style.css','text/css'),'/app.js':('app.js','text/javascript')}
        if self.path not in files: return self.send(404,{'error':'Non trovato'})
        name,mime=files[self.path]; self.send(200,(ROOT/'static'/name).read_bytes(),mime)
    def do_POST(self):
        # Local-only API: reject cross-origin browser writes and DNS rebinding.
        if self.headers.get('Host') not in ('127.0.0.1:8765','localhost:8765'):
            return self.send(403,{'error':'Host non consentito'})
        if self.headers.get('Origin') not in (None,'http://127.0.0.1:8765','http://localhost:8765'):
            return self.send(403,{'error':'Origine non consentita'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=1500000: raise ValueError('Richiesta troppo grande o vuota.')
            body=json.loads(self.rfile.read(length))
            if self.path=='/api/chat': result={'reply':chat(body['text'],body.get('history',[]))}
            elif self.path=='/api/items': result=add(body['kind'],body['text'],body.get('due',''))
            elif self.path=='/api/delete':
                with connect() as db: db.execute('DELETE FROM items WHERE id=?',(int(body['id']),))
                result=items()
            elif self.path=='/api/done':
                with connect() as db: db.execute('UPDATE items SET done=1 WHERE id=?',(int(body['id']),))
                result=items()
            elif self.path=='/api/transcribe': result={'text':transcribe(body['audio'])}
            else: return self.send(404,{'error':'Non trovato'})
            self.send(200,result)
        except ImportError: self.send(400,{'error':'Installa la libreria opzionale vosk: consulta il manuale.'})
        except (ValueError,KeyError,TypeError,SyntaxError,ZeroDivisionError) as e: self.send(400,{'error':str(e)})
        except Exception: self.send(500,{'error':'Errore interno. Verifica configurazione e spazio su disco.'})

if __name__=='__main__':
    server=ThreadingHTTPServer(('127.0.0.1',8765),Handler)
    print('JARVIS attivo: http://127.0.0.1:8765 — Ctrl+C per uscire')
    if '--no-browser' not in __import__('sys').argv: webbrowser.open('http://127.0.0.1:8765')
    try: server.serve_forever()
    except KeyboardInterrupt: server.server_close()
