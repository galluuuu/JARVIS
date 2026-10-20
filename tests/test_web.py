import io
import json
import unittest
import urllib.error
from unittest.mock import patch
import app
import web_search as web

ROWS=[{'title':'Fonte di esempio','url':'https://example.org/notizia','snippet':'Il progetto dimostrativo è stato presentato il 20 ottobre 2026.'}]
DDG='''<html><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org%2Farticolo">Titolo <b>italiano</b></a><div><a class="result__snippet">Un estratto <b>utile</b> e verificabile.</a></div></html>'''
RSS='''<rss><channel><item><title>Notizia &amp; fonte</title><link>https://example.org/news</link><description>Descrizione della notizia</description></item></channel></rss>'''

class WebTests(unittest.TestCase):
    def test_ddg_extracts_link_title_snippet(self):
        with patch('web_search.fetch',return_value=DDG):
            rows=web.duck_search('ricerca')
        self.assertEqual(rows[0]['url'],'https://example.org/articolo')
        self.assertEqual(rows[0]['title'],'Titolo italiano')
        self.assertIn('utile',rows[0]['snippet'])
    def test_bing_rss(self):
        with patch('web_search.fetch',return_value=RSS):
            rows=web.bing_search('notizie')
        self.assertEqual(rows[0]['title'],'Notizia & fonte')
    def test_fallback_and_filter(self):
        rows=[dict(ROWS[0],url='javascript:alert(1)'),*ROWS,*ROWS]
        with patch('web_search.duck_search',side_effect=urllib.error.URLError('blocked')),patch('web_search.bing_search',return_value=rows):
            self.assertEqual(web.search('esempio'),ROWS)
    def test_captcha_not_claimed_as_results(self):
        with patch('web_search.duck_search',return_value=[]),patch('web_search.bing_search',return_value=[]):
            with self.assertRaises(web.SearchUnavailable):web.search('notizie')
    def test_query_limits(self):
        for value in ('','x'*501,None):
            with self.assertRaises(ValueError):web.search(value)
    def test_link_restrictions(self):
        for value in ('javascript:alert(1)','file:///etc/passwd','http://127.0.0.1/a','http://192.168.1.1/x','http://localhost/x','https://example.org:8080/x','https://user:secret@example.org/x'):
            self.assertFalse(web.public_link(value),value)
    def test_response_size_limit(self):
        with patch('web_search.urllib.request.urlopen',return_value=io.BytesIO(b'x'*(web.MAX_BYTES+1))):
            with self.assertRaises(ValueError):web.fetch('https://www.bing.com/search?q=test')
    def test_web_context_and_sources(self):
        metadata={}
        with patch('app.search',return_value=ROWS),patch('app.urllib.request.urlopen',return_value=io.BytesIO(b'{"message":{"content":"Risposta [1]"}}')) as call:
            reply=app.chat('Cosa è successo?',[],True,metadata)
        self.assertEqual(reply,'Risposta [1]')
        self.assertEqual(metadata['sources'],ROWS)
        sent=json.loads(call.call_args.args[0].data)
        self.assertIn('DATI NON ATTENDIBILI',sent['messages'][0]['content'])
        self.assertIn(ROWS[0]['snippet'],sent['messages'][-1]['content'])
    def test_explicit_voice_command_searches_even_toggle_off(self):
        with patch('app.search',return_value=ROWS) as search,patch('app.urllib.request.urlopen',return_value=io.BytesIO(b'{"message":{"content":"Risposta"}}')):
            app.chat('cerca sul web: notizie scienza',[])
            search.assert_called_once_with('notizie scienza')
    def test_search_failure_does_not_invent_answer(self):
        metadata={}
        with patch('app.search',side_effect=web.SearchUnavailable('Ricerca bloccata')),patch('app.urllib.request.urlopen') as model:
            self.assertEqual(app.chat('notizie',[],True,metadata),'Ricerca bloccata')
            model.assert_not_called()
            self.assertEqual(metadata['web_status'],'unavailable')
    def test_local_commands_do_not_leave_computer(self):
        with patch('app.search') as search:
            self.assertIn('60',app.chat('calcola: 20*3',[],True))
            search.assert_not_called()
    def test_no_network_when_disabled(self):
        with patch('app.search') as search,patch('app.urllib.request.urlopen',side_effect=urllib.error.URLError('offline')):
            app.chat('spiegami un concetto',[])
            search.assert_not_called()

if __name__=='__main__':unittest.main()
