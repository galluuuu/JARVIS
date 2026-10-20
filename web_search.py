"""Ricerca web senza chiavi API: estratti pubblici, nessuna esecuzione di pagine."""
import html
from html.parser import HTMLParser
import ipaddress
import re
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

MAX_BYTES = 1_000_000
MAX_RESULTS = 4

class SearchUnavailable(Exception):
    pass

def clean(text):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', text))).strip()

def public_link(url):
    """Validate links for display; never fetch arbitrary result destinations."""
    try:
        if url.startswith('//'): url = 'https:' + url
        parsed = urllib.parse.urlsplit(url)
        if parsed.hostname in ('duckduckgo.com', 'html.duckduckgo.com'):
            url = urllib.parse.parse_qs(parsed.query).get('uddg', [url])[0]
            parsed = urllib.parse.urlsplit(url)
        if parsed.scheme not in ('https', 'http') or not parsed.hostname or parsed.username or parsed.password:
            return ''
        if parsed.port not in (None, 80, 443): return ''
        host = parsed.hostname.lower()
        if '.' not in host or host.endswith(('.localhost', '.local', '.internal')): return ''
        try:
            if not ipaddress.ip_address(host).is_global: return ''
        except ValueError:
            pass
        if len(url) > 2000: return ''
        return url
    except ValueError:
        return ''

class DuckParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.results=[]; self.current=None; self.capture=None; self.depth=0
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs); classes=attrs.get('class','').split()
        if 'result__a' in classes:
            self.current={'title':'','url':public_link(attrs.get('href','')),'snippet':''}
            self.results.append(self.current); self.capture='title'; self.depth=1
        elif 'result__snippet' in classes and self.current is not None:
            self.capture='snippet'; self.depth=1
        elif self.capture and tag not in ('br','img','meta','input','hr','link'):
            self.depth+=1
    def handle_endtag(self,tag):
        if self.capture:
            self.depth-=1
            if self.depth<=0:self.capture=None
    def handle_data(self,data):
        if self.capture and self.current is not None:self.current[self.capture]+=data

def fetch(url):
    request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; JarvisLocale/2.0)','Accept':'text/html, application/rss+xml, application/json'})
    with urllib.request.urlopen(request,timeout=9) as response:
        raw=response.read(MAX_BYTES+1)
        if len(raw)>MAX_BYTES:raise ValueError('Risposta troppo grande')
        return raw.decode('utf-8',errors='replace')

def duck_search(query):
    parser=DuckParser()
    parser.feed(fetch('https://html.duckduckgo.com/html/?'+urllib.parse.urlencode({'q':query,'kl':'it-it'})))
    return parser.results

def bing_search(query):
    root=ET.fromstring(fetch('https://www.bing.com/search?'+urllib.parse.urlencode({'q':query,'format':'rss','setlang':'it'})))
    return [{'title':node.findtext('title',''),'url':public_link(node.findtext('link','')),'snippet':node.findtext('description','')} for node in root.findall('./channel/item')]

def search(query):
    if not isinstance(query,str) or not query.strip():raise ValueError('Inserisca una ricerca, signore.')
    query=query.strip()
    if len(query)>500:raise ValueError('Ricerca troppo lunga: massimo 500 caratteri. Disattivi il web per testi lunghi.')
    for provider in (duck_search,bing_search):
        try:
            results=[]; seen=set()
            for row in provider(query):
                url=public_link(row['url']); title=clean(row['title'])[:220]; snippet=clean(row['snippet'])[:1000]
                if url and title and snippet and url not in seen:
                    results.append({'title':title,'url':url,'snippet':snippet});seen.add(url)
                if len(results)==MAX_RESULTS:break
            if results:return results
        except (OSError,ValueError,ET.ParseError):
            continue
    raise SearchUnavailable('La ricerca web non ha restituito estratti utilizzabili. Il motore può essere bloccato, richiedere un CAPTCHA o essere irraggiungibile. Signore, riprovi con parole diverse oppure disattivi “Cerca sul web” per usare solo il modello locale.')
