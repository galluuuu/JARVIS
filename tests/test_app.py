import base64
import json
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.request
import urllib.error
from unittest.mock import patch
import app

class JarvisTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.old=app.DATA;app.DATA=Path(self.temp.name)
    def tearDown(self):
        app.DATA=self.old;self.temp.cleanup()
    def test_persistent_notes(self):
        self.assertIn('salvata',app.chat('nota: progetto nuovo',[]))
        self.assertEqual(app.items()[0]['text'],'progetto nuovo')
        self.assertEqual(app.chat('note',[]),'progetto nuovo')
    def test_reminder_validation(self):
        with self.assertRaises(ValueError):app.add('reminder','test','')
        app.add('reminder','visita','2030-01-01T09:30')
        self.assertIn('visita',app.chat('promemoria',[]))
    def test_safe_calculator(self):
        self.assertEqual(app.calculate('(12 + 8) * 3 / 2'),30)
        for expr in ['__import__("os").system("true")','2**10000000','[1,2]']:
            with self.assertRaises(ValueError):app.calculate(expr)
        with self.assertRaises(ZeroDivisionError):app.calculate('1/0')
    def test_ollama_protocol(self):
        class Response:
            def __enter__(self):return self
            def __exit__(self,*a):pass
            def read(self):return b'{"message":{"content":"Ciao dal modello"}}'
        with patch('app.urllib.request.urlopen',return_value=Response()) as call:
            self.assertEqual(app.chat('Spiegami la gravita',[]),'Ciao dal modello')
            body=json.loads(call.call_args.args[0].data)
            self.assertEqual(body['model'],'qwen2.5:1.5b')
            self.assertEqual(body['messages'][-1]['role'],'user')
    def test_missing_ollama(self):
        with patch('app.urllib.request.urlopen',side_effect=urllib.error.URLError('offline')):
            self.assertIn('non è disponibile',app.chat('ciao',[]))
    def test_http_workflow(self):
        server=app.ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        base=f'http://127.0.0.1:{server.server_port}'
        def post(path,body,origin='http://127.0.0.1:8765'):
            req=urllib.request.Request(base+path,json.dumps(body).encode(),headers={'Content-Type':'application/json','Host':'127.0.0.1:8765','Origin':origin})
            with urllib.request.urlopen(req) as r:return json.load(r)
        try:
            with urllib.request.urlopen(base+'/') as r:self.assertIn(b'JARVIS',r.read())
            rows=post('/api/items',{'kind':'reminder','text':'Test','due':'2030-01-01T10:00'})
            ident=rows[0]['id'];self.assertEqual(post('/api/done',{'id':ident})[0]['done'],1)
            self.assertEqual(post('/api/delete',{'id':ident}),[])
            self.assertIn('30',post('/api/chat',{'text':'calcola: 5*6'})['reply'])
            with self.assertRaises(urllib.error.HTTPError) as err:post('/api/items',{'kind':'note','text':'x'},'https://example.com')
            self.assertEqual(err.exception.code,403)
            with self.assertRaises(urllib.error.HTTPError) as err:post('/api/chat',{'text':'calcola: 1/0'})
            self.assertEqual(err.exception.code,400)
        finally:server.shutdown();server.server_close();thread.join()

if __name__=='__main__':unittest.main()
