/* Simulazione decorativa in Canvas 2D: nessun CDN, nessun dato del modello. */
(() => {
  'use strict';
  const canvas = document.querySelector('#neuralCanvas');
  const stage = document.querySelector('#neuralStage');
  const core = document.querySelector('#core');
  const button = document.querySelector('#animationToggle');
  const context = canvas.getContext('2d');
  if (!context) {
    document.querySelector('#canvasFallback').classList.remove('hidden');
    button.disabled = true;
    return;
  }
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let stored = null;
  try { stored = localStorage.getItem('jarvisAnimationPaused'); } catch {}
  let paused = preference.matches || stored === 'true';
  let visible = true, width = 0, height = 0, frame = 0, last = 0, time = 0;
  let state = 'idle', inputLevel = 0, level = 0, pointerX = 0, pointerY = 0;
  let seed = 84219;
  const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  const nodes = [];
  // Two folded hemispheres, a recessed midline and some internal connections.
  for (let i = 0; i < 880; i++) {
    const side = i % 2 ? 1 : -1;
    const theta = Math.acos(2 * random() - 1), phi = random() * Math.PI * 2;
    const inner = i > 740;
    const radius = inner ? .3 + random() * .5 : .94 + random() * .1;
    const folds = 1 + .045 * Math.sin(phi * 9 + theta * 5) + .035 * Math.sin(theta * 12 - phi * 3);
    const x = side * (.055 + Math.abs(Math.sin(theta) * Math.cos(phi)) * .96 * radius * folds);
    const y = Math.cos(theta) * .84 * radius * folds;
    const z = Math.sin(theta) * Math.sin(phi) * .73 * radius * folds;
    nodes.push({ x: x*1.2, y: y*.93 + (y < -.4 ? .17*Math.exp(-x*x*50) : 0) + .08 * Math.sin(z * 3), z, size: .6 + random() * 1.1, violet: random() < .11, phase: random() * Math.PI * 2, inner });
  }
  const edges = [], keys = new Set();
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const neighbours = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const b = nodes[j];
      const d = (a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2;
      if (d < .15) neighbours.push({ j, d });
    }
    neighbours.sort((a,b) => a.d-b.d);
    for (const { j } of neighbours.slice(0, 6)) {
      const key = Math.min(i,j) + ':' + Math.max(i,j);
      if (!keys.has(key)) { keys.add(key); edges.push({ a:i, b:j, phase:random(), speed:.12 + random()*.18, active:random() < .14 }); }
    }
  }
  const stars = Array.from({ length: 100 }, () => ({ x:random(), y:random(), alpha:.08+random()*.22 }));
  const colors = {
    idle: [38,220,237], listening: [55,247,184], thinking: [159,143,255],
    transcribing: [100,191,255], speaking: [38,235,247], error: [255,174,112]
  };
  function project(node, angleY, angleX, scale) {
    const breathing = 1 + Math.sin(time*.65 + node.phase)*.006 + level*.018;
    const x = node.x*breathing, y = node.y*breathing, z = node.z*breathing;
    const rx = x*Math.cos(angleY) + z*Math.sin(angleY);
    const rz = -x*Math.sin(angleY) + z*Math.cos(angleY);
    const ry = y*Math.cos(angleX) - rz*Math.sin(angleX);
    const depth = y*Math.sin(angleX) + rz*Math.cos(angleX);
    const perspective = 3.8/(3.8-depth);
    return { x:width/2+rx*scale*perspective, y:height*.51+ry*scale*perspective, depth, perspective };
  }
  function draw() {
    if (!width || !height) return;
    const c = context;
    c.clearRect(0,0,width,height);
    const color = colors[state] || colors.idle;
    const rgb = color.join(',');
    const scale = Math.min(width*.35, height*.48);
    const glow = c.createRadialGradient(width*.5,height*.52,10,width*.5,height*.52,scale*1.3);
    glow.addColorStop(0,`rgba(${rgb},.055)`); glow.addColorStop(1,`rgba(${rgb},0)`);
    c.fillStyle=glow; c.fillRect(0,0,width,height);
    c.strokeStyle='rgba(52,125,145,.10)'; c.lineWidth=.6;
    const gap=38;
    for(let x=width/2%gap;x<width;x+=gap){c.beginPath();c.moveTo(x,32);c.lineTo(x,height-20);c.stroke();}
    for(let y=height/2%gap;y<height;y+=gap){c.beginPath();c.moveTo(10,y);c.lineTo(width-10,y);c.stroke();}
    for(const star of stars){c.fillStyle=`rgba(${rgb},${star.alpha})`;c.fillRect(star.x*width,star.y*height,1,1);}
    const tiltY = -.22 + Math.sin(time*.12)*.14 + pointerX*.16;
    const tiltX = -.13 + Math.cos(time*.1)*.035 + pointerY*.08;
    const projected = nodes.map(node => project(node,tiltY,tiltX,scale));
    const energy = state==='thinking' ? 1.65 : state==='listening' ? 1.2+level : state==='speaking' ? 1.5 : .8;
    for (const edge of edges) {
      const a=projected[edge.a], b=projected[edge.b];
      const depth=(a.depth+b.depth+1.8)/3.6;
      const alpha=(.07+depth*.29)* (nodes[edge.a].inner ? .6:1);
      c.strokeStyle=`rgba(${edge.a%13===0?'143,143,249':rgb},${alpha})`;
      c.lineWidth=.45+depth*.25;
      c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
      if(edge.active){
        const progress=(time*edge.speed*energy+edge.phase)%1;
        const x=a.x+(b.x-a.x)*progress, y=a.y+(b.y-a.y)*progress;
        c.fillStyle=`rgba(${rgb},${.3+depth*.5})`;
        c.beginPath();c.arc(x,y,1.1,0,Math.PI*2);c.fill();
      }
    }
    const order=projected.map((p,i)=>({ ...p, i })).sort((a,b)=>a.depth-b.depth);
    for(const p of order){
      const node=nodes[p.i];
      const alpha=Math.min(.98,.48+(p.depth+1)*.3);
      const pulse=.75+.25*Math.sin(time*energy*1.5+node.phase);
      const size=node.size*p.perspective*(.7+pulse*.4+level*.2);
      const dotRGB=node.violet?'173,159,255':rgb;
      if(p.i%13===0 && p.depth>-.25){
        const halo=c.createRadialGradient(p.x,p.y,0,p.x,p.y,13);
        halo.addColorStop(0,`rgba(${dotRGB},.75)`);halo.addColorStop(.22,`rgba(${dotRGB},.15)`);halo.addColorStop(1,`rgba(${dotRGB},0)`);
        c.fillStyle=halo;c.fillRect(p.x-13,p.y-13,26,26);
      }
      c.fillStyle=`rgba(${dotRGB},${alpha})`;c.beginPath();c.arc(p.x,p.y,size,0,Math.PI*2);c.fill();
      if(p.i%13===0){c.fillStyle='rgba(230,255,255,.95)';c.fillRect(p.x-.6,p.y-.6,1.2,1.2);}
    }
    // Small technical registration marks, never a circular frame.
    c.strokeStyle=`rgba(${rgb},.35)`;c.lineWidth=1;
    for(const [x,y] of [[width*.15,height*.25],[width*.87,height*.72]]){
      c.beginPath();c.moveTo(x-4,y);c.lineTo(x+4,y);c.moveTo(x,y-4);c.lineTo(x,y+4);c.stroke();
    }
  }
  function loop(stamp) {
    frame=0;
    if(paused || !visible || document.hidden)return;
    if(stamp-last>=1000/30){
      const delta=Math.min((stamp-last)/1000,.05);last=stamp;time+=delta;
      level+=(inputLevel-level)*.22;draw();
    }
    frame=requestAnimationFrame(loop);
  }
  function restart() {
    if(frame)cancelAnimationFrame(frame);frame=0;last=performance.now();
    draw();
    if(!paused && visible && !document.hidden)frame=requestAnimationFrame(loop);
  }
  function syncButton() {
    button.innerHTML='<svg class="icon" aria-hidden="true"><use href="#'+(paused?'i-play':'i-pause')+'"/></svg>';button.setAttribute('aria-pressed',String(paused));
    button.setAttribute('aria-label',paused?'Riprenda l’animazione':'Metta in pausa l’animazione');
    core.dataset.motion=paused?'paused':'running';
  }
  button.addEventListener('click',()=>{
    paused=!paused;try{localStorage.setItem('jarvisAnimationPaused',String(paused));}catch{}
    syncButton();restart();
  });
  preference.addEventListener('change',event=>{paused=event.matches;syncButton();restart();});
  new ResizeObserver(entries=>{
    const rect=entries[0].contentRect;width=rect.width;height=rect.height;
    const ratio=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    context.setTransform(ratio,0,0,ratio,0,0);restart();
  }).observe(stage);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;restart();}).observe(stage);
  document.addEventListener('visibilitychange',restart);
  stage.addEventListener('pointermove',event=>{
    const rect=stage.getBoundingClientRect();pointerX=(event.clientX-rect.left)/rect.width-.5;pointerY=(event.clientY-rect.top)/rect.height-.5;
    if(paused)draw();
  });
  stage.addEventListener('pointerleave',()=>{pointerX=pointerY=0;if(paused)draw();});
  window.JarvisNetwork={
    setState(value){state=value;core.dataset.state=value;if(paused)draw();},
    setLevel(value){inputLevel=Math.max(0,Math.min(1,value));},
  };
  syncButton();restart();
})();
