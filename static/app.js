'use strict';
const $ = selector => document.querySelector(selector);
let history = [], allItems = [], busy = false, kind = 'note';
let recording = false, transcribing = false, stream, ctx, processor, source;
let chunks = [], recordTimer, speechId = 0, speaking = false;
let greetingText = 'Benvenuto, signore. Come posso aiutarla?';
let greetingPending = true, greetingReady = false, lastGreetingHour = null;

async function api(path, body) {
  const response = await fetch(path, body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  } : {});
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Richiesta fallita.');
  return data;
}
let toastTimer;
function toast(text) {
  $('#toast').textContent = text;
  $('#toast').style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').style.display = 'none', 8500);
}
function updateActivity() {
  const mode = recording ? 'listening' : transcribing ? 'transcribing' : busy ? 'thinking' : speaking ? 'speaking' : 'idle';
  const labels = { idle: 'AL SUO SERVIZIO', listening: 'LA ASCOLTO, SIGNORE', transcribing: 'TRASCRIZIONE IN CORSO', thinking: $('#webSearch').checked ? 'RICERCA WEB ED ELABORAZIONE' : 'ELABORAZIONE IN CORSO', speaking: 'RISPOSTA VOCALE' };
  $('#core').dataset.state = mode;
  $('#state').textContent = labels[mode];
  window.JarvisNetwork?.setState(mode);
}
function tab(id) {
  document.querySelectorAll('.tab').forEach(element => element.classList.toggle('hidden', element.id !== id));
  document.querySelectorAll('[data-tab]').forEach(element => {
    element.classList.toggle('active', element.dataset.tab === id);
    if (element.closest('nav')) element.setAttribute('aria-current', element.dataset.tab === id ? 'page' : 'false');
  });
}
document.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => tab(button.dataset.tab));
function bubble(role, text) {
  const message = document.createElement('div');
  message.className = 'message ' + role;
  const avatar = document.createElement('span'); avatar.className = 'avatar'; avatar.textContent = role === 'user' ? 'S' : 'J'; avatar.setAttribute('aria-hidden', 'true');
  const content = document.createElement('div');
  const meta = document.createElement('div'); meta.className = 'message-meta'; meta.append(document.createTextNode(role === 'user' ? 'LEI' : 'JARVIS'));
  const time = document.createElement('time'); time.dateTime = new Date().toISOString(); time.textContent = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); meta.append(time);
  const body = document.createElement('div'); body.className = 'message-body'; body.textContent = text;
  content.append(meta, body); message.append(avatar, content); $('#messages').append(message);
  $('#messages').scrollTop = $('#messages').scrollHeight;
  return body;
}
let initialGreeting = bubble('assistant', greetingText);
async function loadGreeting(hour) {
  try {
    const data = await api('/api/greeting?hour=' + hour);
    greetingText = data.message; greetingReady = true;
    $('#greetingTitle').textContent = data.title;
    $('#greetingSubtitle').textContent = data.subtitle;
    if (initialGreeting?.isConnected) initialGreeting.textContent = greetingText;
  } catch { /* The base UI remains usable if the greeting request fails. */ }
}
function tick() {
  const date = new Date();
  $('#clock').textContent = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  $('#date').textContent = date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  if (lastGreetingHour !== date.getHours()) { lastGreetingHour = date.getHours(); loadGreeting(lastGreetingHour); }
}
tick(); setInterval(tick, 1000);
function renderSources(target, data) {
  if (!data.sources?.length) {
    if (data.search_url) {
      const link = document.createElement('a'); link.textContent = 'Apra la ricerca nel browser';
      const url = new URL(data.search_url);
      if (!['http:', 'https:'].includes(url.protocol)) return;
      link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.className = 'sources'; target.append(link);
    }
    return;
  }
  const box = document.createElement('div'); box.className = 'sources';
  const title = document.createElement('strong');
  title.textContent = data.answer_status === 'model_unavailable' ? 'Fonti trovate · sintesi non disponibile' : 'Fonti trovate · estratti di ricerca'; box.append(title);
  for (const [index, row] of data.sources.entries()) {
    const link = document.createElement('a'); link.textContent = '[' + (index + 1) + '] ' + row.title;
    try { const url = new URL(row.url); if (!['https:', 'http:'].includes(url.protocol)) continue; link.href = url.href; } catch { continue; }
    link.target = '_blank'; link.rel = 'noopener noreferrer'; box.append(link);
  }
  target.append(box);
}
$('#webSearch').checked = localStorage.getItem('jarvisWeb') === 'true';
$('#webSearch').onchange = () => localStorage.setItem('jarvisWeb', $('#webSearch').checked);
$('#speak').checked = localStorage.getItem('jarvisSpeak') === 'true';
$('#autoGreet').checked = localStorage.getItem('jarvisAutoGreet') !== 'false';
function stopSpeech() {
  speechId++;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  speaking = false; updateActivity();
}
function speak(text, force = false) {
  if ((!force && !$('#speak').checked) || !('speechSynthesis' in window)) return false;
  stopSpeech();
  const id = speechId, utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'it-IT'; utterance.rate = .97;
  utterance.voice = speechSynthesis.getVoices().find(voice => voice.voiceURI === $('#voices').value) || null;
  utterance.onstart = () => { if (id === speechId) { speaking = true; updateActivity(); } };
  const end = () => { if (id === speechId) { speaking = false; updateActivity(); } };
  utterance.onend = end;
  utterance.onerror = event => {
    end();
    if (!['canceled', 'interrupted'].includes(event.error)) toast('Signore, non riesco a riprodurre la voce. Verifichi la voce selezionata, i permessi audio e il volume.');
  };
  speechSynthesis.speak(utterance);
  return true;
}
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices().filter(voice => voice.lang.toLowerCase().startsWith('it'));
  const preferred = localStorage.getItem('jarvisVoice') || $('#voices').value;
  $('#voices').replaceChildren();
  for (const voice of voices) {
    const option = document.createElement('option'); option.value = voice.voiceURI;
    option.textContent = voice.name + (voice.localService ? ' · locale' : ' · possibile rete'); $('#voices').append(option);
  }
  const chosen = voices.find(voice => voice.voiceURI === preferred) || voices.find(voice => voice.localService) || voices[0];
  if (chosen) $('#voices').value = chosen.voiceURI;
  else { const option = document.createElement('option'); option.value = ''; option.textContent = 'Voce italiana non disponibile'; $('#voices').append(option); }
}
if ('speechSynthesis' in window) { speechSynthesis.onvoiceschanged = loadVoices; loadVoices(); }
$('#voices').onchange = () => localStorage.setItem('jarvisVoice', $('#voices').value);
$('#speak').onchange = () => { localStorage.setItem('jarvisSpeak', $('#speak').checked); if (!$('#speak').checked) stopSpeech(); };
$('#autoGreet').onchange = () => localStorage.setItem('jarvisAutoGreet', $('#autoGreet').checked);
$('#stopSpeech').onclick = stopSpeech;
$('#greet').onclick = () => {
  if (!greetingReady) return toast('Signore, attenda un istante che il saluto sia pronto.');
  greetingPending = false;
  if (recording || transcribing || busy) return toast('Signore, attenda che l’operazione in corso sia terminata.');
  if (!speak(greetingText, true)) toast('La sintesi vocale non è disponibile in questo browser, signore.');
};
document.addEventListener('click', event => {
  if (!greetingPending || !greetingReady || !$('#speak').checked || !$('#autoGreet').checked || busy || recording || transcribing) return;
  if (event.target.closest('#chatForm, #greet, #clear, #stopSpeech, #speak, #autoGreet, #voices, [data-command], #itemForm')) return;
  greetingPending = false; speak(greetingText);
});
async function send(text) {
  if (busy || recording || transcribing) return;
  greetingPending = false; stopSpeech(); initialGreeting = null;
  busy = true; $('#send').disabled = true; updateActivity();
  bubble('user', text); $('#prompt').value = '';
  const pending = bubble('assistant', 'Un momento, signore…');
  try {
    const data = await api('/api/chat', { text, history, web: $('#webSearch').checked });
    pending.textContent = data.reply; renderSources(pending, data);
    history.push({ role: 'user', content: text }, { role: 'assistant', content: data.reply }); history = history.slice(-12);
    $('#messages').scrollTop = $('#messages').scrollHeight;
    speak(data.reply); await refresh();
  } catch (error) { pending.textContent = 'Signore, si è verificato un errore: ' + error.message; }
  finally { busy = false; $('#send').disabled = false; updateActivity(); }
}
$('#chatForm').onsubmit = event => { event.preventDefault(); const text = $('#prompt').value.trim(); if (text) send(text); };
document.querySelectorAll('[data-command]').forEach(button => button.onclick = () => { tab('home'); send(button.dataset.command); });
$('#clear').onclick = () => {
  if (busy) return;
  greetingPending = false; stopSpeech(); history = []; $('#messages').replaceChildren();
  initialGreeting = bubble('assistant', greetingText);
};
function renderItem(row, full) {
  const item = document.createElement('div'); item.className = 'item';
  const text = document.createElement('p'); text.textContent = row.text; item.append(text);
  if (row.due) { const due = document.createElement('small'); due.textContent = new Date(row.due).toLocaleString('it-IT') + (row.done ? ' · Completato' : ''); item.append(due); }
  if (full) {
    const actions = document.createElement('div');
    if (row.kind === 'reminder' && !row.done) { const done = document.createElement('button'); done.textContent = '✓ Completi'; done.onclick = () => modify('/api/done', row.id); actions.append(done); }
    const remove = document.createElement('button'); remove.textContent = 'Elimini'; remove.onclick = () => { if (confirm('Desidera eliminare questo elemento, signore?')) modify('/api/delete', row.id); }; actions.append(remove); item.append(actions);
  }
  return item;
}
function renderList(id, rows, full) {
  const element = $(id); element.replaceChildren();
  if (!rows.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'Nessun elemento, signore.'; element.append(empty); }
  rows.forEach(row => element.append(renderItem(row, full)));
}
function render() {
  const notes = allItems.filter(row => row.kind === 'note');
  const reminders = allItems.filter(row => row.kind === 'reminder').sort((a,b) => a.due.localeCompare(b.due));
  renderList('#notesList', notes, true); renderList('#recentNotes', notes.slice(0,2), false);
  renderList('#remindersList', reminders, true); renderList('#recentReminders', reminders.filter(row => !row.done).slice(0,2), false);
}
async function refresh() { allItems = await api('/api/items'); render(); }
async function modify(path, id) { try { allItems = await api(path, { id }); render(); } catch (error) { toast(error.message); } }
function editor(type) {
  kind = type; $('#editorTitle').textContent = type === 'note' ? 'Nuova nota' : 'Nuovo promemoria';
  $('#itemText').value = ''; $('#itemDue').value = ''; $('#dueLabel').classList.toggle('hidden', type === 'note');
  $('#itemDue').required = type === 'reminder'; $('#editor').showModal(); $('#itemText').focus();
}
$('#newNote').onclick = $('#addNote').onclick = () => editor('note');
$('#newReminder').onclick = $('#addReminder').onclick = () => editor('reminder');
$('#cancel').onclick = () => $('#editor').close();
$('#itemForm').onsubmit = async event => {
  event.preventDefault();
  try { allItems = await api('/api/items', { kind, text: $('#itemText').value, due: kind === 'reminder' ? $('#itemDue').value : '' }); render(); $('#editor').close(); toast('Salvato sul suo computer, signore.'); }
  catch (error) { toast(error.message); }
};
const notified = new Set();
function checkReminders() {
  for (const row of allItems) {
    if (row.kind === 'reminder' && !row.done && new Date(row.due) <= new Date() && !notified.has(row.id)) {
      notified.add(row.id); toast('Signore, un promemoria: ' + row.text);
      if (!recording && !transcribing && !busy) speak('Signore, le ricordo: ' + row.text);
    }
  }
}
setInterval(checkReminders, 10000);
$('#export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(allItems, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'jarvis-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
function microphoneButton(active) {
  $('#mic').setAttribute('aria-pressed', String(active)); $('#mic').setAttribute('aria-label', active ? 'Termini la dettatura' : 'Microfono');
  if (active) { const square = document.createElement('span'); square.className = 'stop-square'; $('#mic').replaceChildren(square); }
  else { $('#mic').innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-mic"/></svg>'; }
}
async function finishRecording() {
  if (!recording) return;
  recording = false; transcribing = true; clearTimeout(recordTimer);
  if (processor) { processor.onaudioprocess = null; processor.disconnect(); }
  if (source) source.disconnect();
  if (stream) stream.getTracks().forEach(track => track.stop());
  if (ctx && ctx.state !== 'closed') await ctx.close();
  window.JarvisNetwork?.setLevel(0); microphoneButton(false); $('#mic').disabled = true; updateActivity();
  $('#voiceHint').textContent = 'Trascrizione locale in corso, signore…';
  try {
    const total = chunks.reduce((length,chunk) => length+chunk.length, 0), pcm = new Int16Array(total);
    let offset = 0; for (const chunk of chunks) { pcm.set(chunk,offset); offset += chunk.length; }
    const bytes = new Uint8Array(pcm.buffer); let binary = '';
    for (let i=0;i<bytes.length;i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
    const data = await api('/api/transcribe', { audio: btoa(binary) });
    $('#prompt').value = data.text; $('#prompt').focus();
    toast(data.text ? 'Trascrizione pronta, signore. La controlli e prema Invio.' : 'Non ho riconosciuto parole, signore. Provi ad avvicinarsi al microfono.');
  } catch (error) { toast(error.message); }
  finally { transcribing = false; $('#mic').disabled = false; updateActivity(); $('#voiceHint').textContent = 'Dettatura locale · controlli il testo prima di inviare.'; }
}
$('#mic').onclick = async () => {
  if (recording) return finishRecording();
  if (busy || transcribing) return toast('Un momento, signore: attenda la fine dell’operazione in corso.');
  greetingPending = false; stopSpeech(); $('#mic').disabled = true;
  try {
    if (!navigator.mediaDevices) throw Error('Microfono non disponibile. Apra JARVIS da localhost con Chrome, Edge o Firefox.');
    stream = await navigator.mediaDevices.getUserMedia({ audio: true }); ctx = new AudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    source = ctx.createMediaStreamSource(stream); processor = ctx.createScriptProcessor(4096,1,1); chunks = [];
    let sampleBuffer = [], phase = 0, samples = 0; const ratio = ctx.sampleRate/16000, maxSamples = 16000*30;
    processor.onaudioprocess = event => {
      if (!recording) return;
      const input = event.inputBuffer.getChannelData(0);
      const rms = Math.sqrt(input.reduce((sum,value) => sum+value*value,0)/input.length);
      window.JarvisNetwork?.setLevel(Math.min(1,rms*9));
      sampleBuffer.push(...input); const out = [];
      while (phase+ratio <= sampleBuffer.length && samples < maxSamples) {
        let sum = 0, count = 0;
        for (let j=Math.floor(phase);j<Math.floor(phase+ratio);j++) { sum+=sampleBuffer[j]; count++; }
        out.push(Math.round(Math.max(-1,Math.min(1,sum/Math.max(1,count)))*32767)); phase+=ratio; samples++;
      }
      const used = Math.floor(phase); sampleBuffer = sampleBuffer.slice(used); phase-=used; chunks.push(Int16Array.from(out));
      if (samples >= maxSamples) finishRecording();
    };
    recording = true; source.connect(processor); processor.connect(ctx.destination);
    microphoneButton(true); updateActivity(); $('#voiceHint').textContent = 'La ascolto, signore… prema stop per terminare (massimo 30 secondi).'; recordTimer = setTimeout(finishRecording,30000);
  } catch (error) {
    recording = false;
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (ctx && ctx.state !== 'closed') await ctx.close();
    updateActivity(); toast('Microfono: ' + error.message);
  } finally { $('#mic').disabled = false; }
};
async function status() {
  try {
    const data = await api('/api/status');
    $('#modelStatus').textContent = data.ready ? 'Modello pronto' : 'Modalità essenziale';
    $('#modelName').textContent = data.model + (data.ready ? ' · Ollama' : ' · avvii Ollama per la chat libera');
    $('#modelDot').dataset.ready = String(data.ready);
    if (!data.voice_model && !recording && !transcribing) $('#voiceHint').textContent = 'Per il microfono installi il modello italiano Vosk: veda il manuale.';
  } catch { $('#modelStatus').textContent = 'Server non raggiungibile'; $('#modelDot').dataset.ready = 'false'; }
}
refresh().then(checkReminders).catch(error => toast(error.message)); status(); setInterval(status,30000);
