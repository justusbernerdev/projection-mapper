// Output management — create, name, track output windows
import { state } from './state.js';

export function createOutput(name = null) {
  const id = state.nextOutputId++;
  const output = {
    id,
    name: name || `Output ${id}`,
    resolution: { w: 1920, h: 1080 },
    windowRef: null,
    isOpen: false,
  };
  state.outputs.push(output);
  return output;
}

export function openOutputWindow(outputId = null) {
  let output;
  if (outputId) {
    output = state.outputs.find(o => o.id === outputId);
  }
  if (!output) {
    output = createOutput();
  }

  const win = window.open('', `projection-output-${output.id}`,
    `width=${output.resolution.w},height=${output.resolution.h},popup`);

  if (!win) {
    alert('Popup blocked — allow popups for this site');
    return null;
  }

  output.windowRef = win;
  output.isOpen = true;

  win.document.write(buildOutputHTML(output));
  win.document.close();

  // Track window close
  const checkClosed = setInterval(() => {
    if (win.closed) {
      output.isOpen = false;
      output.windowRef = null;
      clearInterval(checkClosed);
    }
  }, 1000);

  return output;
}

export function removeOutput(id) {
  const idx = state.outputs.findIndex(o => o.id === id);
  if (idx < 0) return;
  const output = state.outputs[idx];
  if (output.windowRef && !output.windowRef.closed) {
    output.windowRef.close();
  }
  state.outputs.splice(idx, 1);
}

export function renameOutput(id, name) {
  const output = state.outputs.find(o => o.id === id);
  if (output) output.name = name;
}

export function setOutputResolution(id, w, h) {
  const output = state.outputs.find(o => o.id === id);
  if (output) {
    output.resolution = { w, h };
  }
}

export function serializeOutputs() {
  return state.outputs.map(o => ({
    id: o.id,
    name: o.name,
    resolution: o.resolution,
  }));
}

export function deserializeOutputs(data) {
  state.outputs = (data || []).map(o => ({
    ...o,
    windowRef: null,
    isOpen: false,
  }));
  state.nextOutputId = Math.max(...state.outputs.map(o => o.id), 0) + 1;
}

function buildOutputHTML(output) {
  const { name, resolution } = output;
  const W = resolution.w;
  const H = resolution.h;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#000;cursor:none}
#stage{position:absolute;top:0;left:0;width:${W}px;height:${H}px;transform-origin:0 0}
.surface-container{position:absolute;top:0;left:0;transform-origin:0 0}
.surface-content{width:100%;height:100%}
#test-pattern{position:absolute;top:0;left:0;width:${W}px;height:${H}px}
#info{position:fixed;bottom:10px;right:10px;color:rgba(255,255,255,0.3);font:11px sans-serif;pointer-events:none;z-index:10}
</style>
</head>
<body>
<div id="stage">
  <canvas id="test-pattern" width="${W}" height="${H}"></canvas>
</div>
<div id="info">${name} (${W}x${H}) — click for fullscreen</div>
<script>
var W=${W}, H=${H};
var stage = document.getElementById('stage');
function scaleStage() {
  var w = window.innerWidth, h = window.innerHeight;
  var s = Math.min(w / W, h / H);
  var ox = (w - W * s) / 2, oy = (h - H * s) / 2;
  stage.style.transform = 'translate(' + ox + 'px,' + oy + 'px) scale(' + s + ')';
}
scaleStage();
window.addEventListener('resize', scaleStage);

// Test pattern
var tc = document.getElementById('test-pattern');
var tctx = tc.getContext('2d');
tctx.fillStyle = '#000'; tctx.fillRect(0, 0, W, H);
tctx.strokeStyle = 'rgba(255,255,255,0.12)'; tctx.lineWidth = 1;
for (var x = 0; x <= W; x += 120) { tctx.beginPath(); tctx.moveTo(x,0); tctx.lineTo(x,H); tctx.stroke(); }
for (var y = 0; y <= H; y += 120) { tctx.beginPath(); tctx.moveTo(0,y); tctx.lineTo(W,y); tctx.stroke(); }
tctx.strokeStyle = 'rgba(255,255,255,0.3)'; tctx.lineWidth = 2;
tctx.beginPath(); tctx.moveTo(W/2,0); tctx.lineTo(W/2,H); tctx.stroke();
tctx.beginPath(); tctx.moveTo(0,H/2); tctx.lineTo(W,H/2); tctx.stroke();
tctx.beginPath(); tctx.arc(W/2,H/2,100,0,Math.PI*2);
tctx.strokeStyle='rgba(0,180,255,0.4)'; tctx.stroke();
var cc=['#f00','#0f0','#00f','#ff0'];
[[0,0],[W-60,0],[W-60,H-60],[0,H-60]].forEach(function(p,i){ tctx.fillStyle=cc[i]; tctx.fillRect(p[0],p[1],60,60); });
tctx.fillStyle='#fff'; tctx.font='bold 28px sans-serif'; tctx.textAlign='center'; tctx.textBaseline='middle';
tctx.fillText(W+' x '+H+' — ${name}', W/2, H/2-30);
tctx.fillStyle='#666'; tctx.font='16px sans-serif';
tctx.fillText('Click for fullscreen', W/2, H/2+10);
var bars=['#fff','#ff0','#0ff','#0f0','#f0f','#f00','#00f','#000'];
bars.forEach(function(c,i){ tctx.fillStyle=c; tctx.fillRect(i*(W/8), H-40, W/8, 40); });

// BroadcastChannel
var channel = new BroadcastChannel('projection-mapper');
var surfaces = [];
var groups = [];
var globalContent = { enabled: false };
var blackout = false;
var testPattern = null;
var groupCanvases = {};

channel.onmessage = function(e) {
  var msg = e.data;
  if (msg.type === 'full-state') {
    surfaces = msg.surfaces;
    groups = msg.groups || [];
    globalContent = msg.globalContent || { enabled: false };
    blackout = msg.blackout;
    testPattern = msg.activeTestPattern || null;
    tc.style.display = surfaces.length > 0 ? 'none' : '';
  }
};
channel.postMessage({ type: 'request-state' });

// Find group for surface
function getGroup(sid) {
  for (var i = 0; i < groups.length; i++) {
    if (groups[i].surfaceIds && groups[i].surfaceIds.indexOf(sid) >= 0) return groups[i];
  }
  return null;
}

// Get group bounding box
function getGroupBounds(g) {
  var minX=9999,minY=9999,maxX=0,maxY=0;
  g.surfaceIds.forEach(function(sid) {
    var s = surfaces.find(function(x){return x.id===sid});
    if (!s) return;
    s.corners.forEach(function(c){ if(c.x<minX)minX=c.x; if(c.y<minY)minY=c.y; if(c.x>maxX)maxX=c.x; if(c.y>maxY)maxY=c.y; });
  });
  return {x:minX, y:minY, w:maxX-minX, h:maxY-minY};
}

// Render group unified content to offscreen canvas
function renderGroupCanvas(g, time) {
  if (!g.content || !g.content.enabled) return null;
  var bounds = getGroupBounds(g);
  if (bounds.w < 1 || bounds.h < 1) return null;
  var bw = Math.round(bounds.w), bh = Math.round(bounds.h);
  if (!groupCanvases[g.id] || groupCanvases[g.id].width !== bw || groupCanvases[g.id].height !== bh) {
    var c = document.createElement('canvas'); c.width = bw; c.height = bh;
    groupCanvases[g.id] = c;
  }
  var gc = groupCanvases[g.id];
  var gctx = gc.getContext('2d');
  var ct = g.content.contentType || 'animation';
  if (ct === 'solid') { gctx.fillStyle = g.content.color || '#0066ff'; gctx.fillRect(0,0,bw,bh); }
  else if (ct === 'animation') { renderAnim({animationPreset: g.content.animationPreset || 'waves'}, gctx, bw, bh, time); }
  return { canvas: gc, bounds: bounds };
}

// Render surface using pre-rendered group canvases
function renderSurfaceWithGroup(surface, ctx, time, groupRenders) {
  var w = surface.w, h = surface.h;

  if (testPattern) {
    renderTestPatternSimple(testPattern, ctx, w, h, surface._index || 0);
    return;
  }

  // Check group — use pre-rendered canvas
  var group = getGroup(surface.id);
  var groupResult = group ? groupRenders[group.id] : null;

  if (groupResult) {
    // Slice from unified group canvas
    var gc = groupResult.canvas, bounds = groupResult.bounds;
    var tl = surface.corners[0];
    var tr = surface.corners[1];
    var bl = surface.corners[3];
    // Visual size from corners
    var visW = Math.abs(tr.x - tl.x) || w;
    var visH = Math.abs(bl.y - tl.y) || h;

    var srcX = (tl.x - bounds.x) / bounds.w * gc.width;
    var srcY = (tl.y - bounds.y) / bounds.h * gc.height;
    var srcW = visW / bounds.w * gc.width;
    var srcH = visH / bounds.h * gc.height;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(gc, srcX, srcY, srcW, srcH, 0, 0, w, h);
  } else if (surface.solo) {
    renderOwnContent(surface, ctx, w, h, time);
  } else if (globalContent.enabled) {
    if (globalContent.contentType === 'solid') { ctx.fillStyle = globalContent.color || '#0066ff'; ctx.fillRect(0,0,w,h); }
    else if (globalContent.contentType === 'animation') { renderAnim({animationPreset: globalContent.animationPreset || 'waves'}, ctx, w, h, time); }
    else if (globalContent.contentType === 'text' && globalContent.textContent) {
      ctx.fillStyle = globalContent.textBgColor || '#000'; ctx.fillRect(0,0,w,h);
      ctx.fillStyle = globalContent.textColor || '#fff'; ctx.font = (globalContent.textBold?'bold ':'')+(globalContent.textSize||48)+'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(globalContent.textContent, w/2, h/2);
    }
  } else {
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);
  }
}

function renderOwnContent(surface, ctx, w, h, time) {
  switch (surface.contentType) {
    case 'solid': ctx.fillStyle = surface.color || '#ff0066'; ctx.fillRect(0,0,w,h); break;
    case 'animation': renderAnim(surface, ctx, w, h, time); break;
    case 'text':
      ctx.fillStyle = surface.textBgColor || '#000';
      ctx.globalAlpha = surface.textBgOpacity != null ? surface.textBgOpacity : 1;
      ctx.fillRect(0,0,w,h); ctx.globalAlpha = 1;
      if (surface.textContent) {
        ctx.fillStyle = surface.textColor||'#fff'; ctx.font = (surface.textBold?'bold ':'')+(surface.textSize||48)+'px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(surface.textContent, w/2, h/2);
      } break;
    default: ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);
  }
}

function renderTestPatternSimple(name, ctx, w, h, idx) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  switch(name) {
    case 'checkerboard':
      var sz = 40;
      for(var y=0;y<h;y+=sz) for(var x=0;x<w;x+=sz) {
        ctx.fillStyle = ((x/sz+y/sz)%2===0)?'#fff':'#000';
        ctx.fillRect(x,y,sz,sz);
      } break;
    case 'grid':
      ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1;
      for(var x=0;x<=w;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
      for(var y=0;y<=h;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
      ctx.strokeStyle='#fff'; ctx.lineWidth=2;
      ctx.strokeRect(0,0,w,h);
      break;
    case 'colorBars':
      var colors=['#fff','#ff0','#0ff','#0f0','#f0f','#f00','#00f'];
      var bw=w/colors.length;
      colors.forEach(function(c,i){ctx.fillStyle=c;ctx.fillRect(i*bw,0,bw,h);});
      break;
    case 'white':
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); break;
    case 'numbering':
      ctx.fillStyle='#fff'; ctx.font='bold '+Math.min(w,h)*0.6+'px sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(''+(idx+1), w/2, h/2); break;
    case 'gradient':
      var g=ctx.createLinearGradient(0,0,w,0);
      g.addColorStop(0,'#000');g.addColorStop(0.5,'#fff');g.addColorStop(1,'#000');
      ctx.fillStyle=g; ctx.fillRect(0,0,w,h); break;
    case 'crosshatch':
      ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=1;
      for(var i=-h;i<w+h;i+=30){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+h,h);ctx.stroke();
      ctx.beginPath();ctx.moveTo(i,h);ctx.lineTo(i+h,0);ctx.stroke();} break;
    case 'circle':
      var cx=w/2,cy=h/2,mr=Math.min(w,h)/2;
      for(var r=mr;r>0;r-=20){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.strokeStyle='rgba(255,255,255,'+(r/mr*0.6+0.1)+')';ctx.lineWidth=1;ctx.stroke();} break;
  }
}

function hueC(t,off,a){var h=((t/1000)*30+off)%360;return'hsla('+h+',90%,60%,'+a+')';}

function renderAnim(s, ctx, w, h, t) {
  var p = s.animationPreset || 'circles';
  var T = t/1000;

  if(p==='circles'){
    ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(0,0,w,h);
    for(var i=0;i<8;i++){var ph=(T+i*Math.PI*2/8)%(Math.PI*2);var pulse=1-Math.pow(((performance.now()%500)/500),2);
    var r=w*0.06+i*w*0.08+pulse*w*0.04;ctx.beginPath();ctx.arc(w/2,h/2,r,0,Math.PI*2);
    ctx.strokeStyle=hueC(t,i*30,0.6+pulse*0.4);ctx.lineWidth=2+pulse*4;ctx.stroke();}
  } else if(p==='particles'){
    ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(0,0,w,h);
    for(var i=0;i<60;i++){var seed=i*137.508;var x=((seed*7.3+T*50*(1+i*0.1))%(w*1.2))-w*0.1;
    var y=((seed*3.1+T*30*(1+i*0.05))%(h*1.2))-h*0.1;var r=1+Math.sin(T+i)*1.5;
    ctx.beginPath();ctx.arc(x,y,r+1,0,Math.PI*2);ctx.fillStyle='hsl('+((i*12+T*20)%360)+',80%,60%)';ctx.fill();}
  } else if(p==='tunnel'){
    ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(0,0,w,h);var cx=w/2,cy=h/2;
    for(var i=0;i<20;i++){var d=(i-(T*4)%1)/20;var sz=Math.pow(d,1.5)*Math.max(w,h)*0.8;var rot=T*0.5+d*Math.PI*2;
    ctx.beginPath();for(var s2=0;s2<=6;s2++){var a=(s2/6)*Math.PI*2+rot;var px=cx+Math.cos(a)*sz;var py=cy+Math.sin(a)*sz;
    s2===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}ctx.strokeStyle=hueC(t,d*360,0.4+(1-d)*0.5);ctx.lineWidth=1+(1-d)*5;ctx.stroke();}
  } else if(p==='kaleidoscope'){
    ctx.fillStyle='rgba(0,0,0,0.08)';ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(w/2,h/2);
    for(var s2=0;s2<12;s2++){ctx.save();ctx.rotate((s2/12)*Math.PI*2+T*0.3);if(s2%2===0)ctx.scale(1,-1);
    for(var i=0;i<4;i++){var r=w*0.1+i*w*0.08+Math.sin(T+i)*w*0.04;var sz=w*0.02+i*w*0.01;
    ctx.beginPath();ctx.arc(r,0,sz,0,Math.PI*2);ctx.fillStyle=hueC(t,s2*30+i*60,0.6);ctx.fill();}ctx.restore();}ctx.restore();
  } else if(p==='waves'){
    ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(0,0,w,h);var amp=h*0.08;
    for(var layer=0;layer<5;layer++){ctx.beginPath();var oy=(layer/5)*h+h*0.1;var freq=0.01+layer*0.003;var sp=T*(1+layer*0.3);
    for(var x=0;x<=w;x+=2){var y=oy+Math.sin(x*freq+sp)*amp+Math.sin(x*freq*2+sp*1.5)*amp*0.5;
    x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.strokeStyle=hueC(t,layer*60,0.7);ctx.lineWidth=2+layer;ctx.stroke();}
  } else if(p==='gridMorph'){
    ctx.fillStyle='rgba(0,0,0,0.12)';ctx.fillRect(0,0,w,h);var cols=12,rows=Math.round(cols*h/w);var cW=w/cols,cH=h/rows;
    for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){var dx=c-cols/2,dy=r-rows/2;var dist=Math.sqrt(dx*dx+dy*dy);
    var wave=Math.sin(dist*0.6-T*3)*0.5+0.5;var sz=wave*Math.min(cW,cH)*0.9;
    ctx.fillStyle=hueC(t,dist*40,wave*0.9);ctx.fillRect(c*cW+cW/2-sz/2,r*cH+cH/2-sz/2,sz,sz);}
  } else if(p==='starfield'){
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(0,0,w,h);var cx=w/2,cy=h/2;
    for(var i=0;i<150;i++){var seed=i*137.508;var z=((seed*0.001+t*0.004)%1);var angle=seed*2.399;
    var r=z*Math.max(w,h)*0.7;var x=cx+Math.cos(angle)*r;var y=cy+Math.sin(angle)*r;
    ctx.beginPath();ctx.arc(x,y,z*3,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+z+')';ctx.fill();}
  } else if(p==='wash'){
    var grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,'hsl('+((T*30)%360)+',80%,50%)');
    grad.addColorStop(0.5,'hsl('+((T*30+120)%360)+',80%,50%)');grad.addColorStop(1,'hsl('+((T*30+240)%360)+',80%,50%)');
    ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  } else if(p==='strobe'){
    ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
    for(var i=0;i<15;i++){var phase=(i/15+T*0.3)%1;var x=phase*w;var bw=w/15*0.6;
    ctx.fillStyle='hsla('+((i*30+T*50)%360)+',90%,60%,0.6)';ctx.fillRect(x,0,bw,h);}
  } else if(p==='fire'){
    ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(0,0,w,h);
    for(var i=0;i<40;i++){var seed=i*73.13;var x=w*0.2+(seed*3.7%(w*0.6));var life=(T*0.5+seed*0.01)%1;
    var y=h-life*h;var sz=(1-life)*w*0.04;ctx.beginPath();ctx.arc(x+Math.sin(T*3+i)*10,y,sz,0,Math.PI*2);
    ctx.fillStyle='hsla('+(20+life*30)+',100%,'+(50+(1-life)*40)+'%,'+((1-life)*0.8)+')';ctx.fill();}
  } else if(p==='matrix'){
    ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(0,0,w,h);var cols=20;var colW=w/cols;
    ctx.font=Math.round(colW*0.8)+'px monospace';ctx.textAlign='center';
    for(var c=0;c<cols;c++){var sp=0.5+(c*7.3%1)*2;var y=((T*sp*h*0.1+c*137)%(h*1.3))-h*0.15;
    var ch=String.fromCharCode(0x30A0+Math.floor((T*10+c*7)%96));ctx.fillStyle='rgba(0,255,70,0.9)';ctx.fillText(ch,c*colW+colW/2,y);
    for(var tr=1;tr<6;tr++){ctx.fillStyle='rgba(0,255,70,'+(0.6-tr*0.1)+')';
    ctx.fillText(String.fromCharCode(0x30A0+Math.floor((T*10+c*7+tr*3)%96)),c*colW+colW/2,y-tr*colW);}}
  } else if(p==='plasma'){
    var step=4;for(var y=0;y<h;y+=step)for(var x=0;x<w;x+=step){
    var v1=Math.sin(x*0.03+T);var v2=Math.sin(y*0.03+T*0.7);var v3=Math.sin((x+y)*0.02+T*0.5);
    var v=(v1+v2+v3)/3;var r=Math.sin(v*Math.PI)*127+128;var g=Math.sin(v*Math.PI+2)*127+128;var b=Math.sin(v*Math.PI+4)*127+128;
    ctx.fillStyle='rgb('+Math.round(r)+','+Math.round(g)+','+Math.round(b)+')';ctx.fillRect(x,y,step,step);}
  } else if(p==='dna'){
    ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(0,0,w,h);var cx=w/2;
    for(var i=0;i<40;i++){var y=(i/40)*h;var phase=T*2+i*0.3;var x1=cx+Math.sin(phase)*w*0.2;var x2=cx+Math.sin(phase+Math.PI)*w*0.2;
    ctx.beginPath();ctx.arc(x1,y,4,0,Math.PI*2);ctx.fillStyle=hueC(t,i*20,0.8);ctx.fill();
    ctx.beginPath();ctx.arc(x2,y,4,0,Math.PI*2);ctx.fillStyle=hueC(t,i*20+180,0.8);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.stroke();}
  } else if(p==='rain'){
    ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(0,0,w,h);
    for(var i=0;i<80;i++){var seed=i*73.7;var x=(seed*3.1)%w;var sp=200+(seed%150);var y=(T*sp+seed*7)%(h+40)-20;
    ctx.strokeStyle='rgba(100,180,255,'+(0.3+(seed%5)*0.1)+')';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+8+(seed%12));ctx.stroke();}
  } else if(p==='rings'){
    ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(0,0,w,h);var cx=w/2,cy=h/2;
    for(var i=0;i<12;i++){var a=(i/12)*Math.PI*2+T*0.5;var d=w*0.15+Math.sin(T+i)*w*0.05;
    ctx.beginPath();ctx.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,w*0.04,0,Math.PI*2);ctx.strokeStyle=hueC(t,i*30,0.7);ctx.lineWidth=2;ctx.stroke();}
  } else if(p==='lightning'){
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(0,0,w,h);
    if(((performance.now()%500)/500)<0.1){var x=w*0.3+Math.random()*w*0.4,y=0;ctx.beginPath();ctx.moveTo(x,y);ctx.strokeStyle='rgba(200,220,255,0.8)';ctx.lineWidth=2;
    while(y<h){x+=(Math.random()-0.5)*40;y+=10+Math.random()*20;ctx.lineTo(x,y);}ctx.stroke();ctx.fillStyle='rgba(200,220,255,0.05)';ctx.fillRect(0,0,w,h);}
  } else if(p==='flower'){
    ctx.fillStyle='rgba(0,0,0,0.06)';ctx.fillRect(0,0,w,h);var cx=w/2,cy=h/2;
    for(var p2=0;p2<8;p2++){var a=(p2/8)*Math.PI*2+T*0.3;var r=w*0.15;
    for(var d=0;d<r;d+=3){var spread=Math.sin((d/r)*Math.PI)*w*0.06;
    var x=cx+Math.cos(a)*d+Math.cos(a+Math.PI/2)*Math.sin(d*0.1+T)*spread;
    var y=cy+Math.sin(a)*d+Math.sin(a+Math.PI/2)*Math.sin(d*0.1+T)*spread;
    ctx.fillStyle=hueC(t,p2*45+d,0.5);ctx.fillRect(x,y,2,2);}}
  } else if(p==='worm3d'){
    ctx.fillStyle='rgba(0,0,0,0.12)';ctx.fillRect(0,0,w,h);var cx=w/2,cy=h/2;
    for(var s=0;s<3;s++){ctx.beginPath();for(var i=0;i<40;i++){var seg=i/40;var ang=seg*Math.PI*4+T*2+s*Math.PI*2/3;
    var rad=w*0.15+Math.sin(seg*Math.PI*2+T)*w*0.08;var x3=Math.cos(ang)*rad;var z3=Math.sin(ang)*rad;
    var y3=(seg-0.5)*h*0.6;var dep=1+z3/(w*0.5);var px=cx+x3/dep;var py=cy+y3/dep;
    i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}ctx.strokeStyle=hueC(t,s*120,0.8);ctx.lineWidth=3;ctx.stroke();}
  } else if(p==='cubes3d'){
    ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(0,0,w,h);var cx=w/2,cy=h/2;
    for(var ci=0;ci<6;ci++){var ang=(ci/6)*Math.PI*2+T*0.5;var ox=Math.cos(ang)*w*0.2;var oz=Math.sin(ang)*w*0.2;
    var sz=w*0.04;var pts=[];for(var v=0;v<8;v++){var vx=((v&1)?1:-1)*sz;var vy=((v&2)?1:-1)*sz;var vz=((v&4)?1:-1)*sz;
    var ca=Math.cos(T+ci),sa=Math.sin(T+ci);var rx=vx*ca-vz*sa;var rz=vx*sa+vz*ca;
    var sc=w*0.6/(w*0.6+rz+oz+w*0.3);pts.push({x:cx+(rx+ox)*sc,y:cy+vy*sc});}
    var edges=[[0,1],[1,3],[3,2],[2,0],[4,5],[5,7],[7,6],[6,4],[0,4],[1,5],[2,6],[3,7]];
    ctx.strokeStyle=hueC(t,ci*60,0.6);ctx.lineWidth=1.5;edges.forEach(function(e){ctx.beginPath();ctx.moveTo(pts[e[0]].x,pts[e[0]].y);ctx.lineTo(pts[e[1]].x,pts[e[1]].y);ctx.stroke();});}
  } else if(p==='sphere3d'){
    ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(0,0,w,h);var cx=w/2,cy=h/2;var rad=Math.min(w,h)*0.3;
    for(var lat=0;lat<=12;lat++)for(var lon=0;lon<16;lon++){var phi=(lat/12)*Math.PI;var theta=(lon/16)*Math.PI*2;
    var x=Math.sin(phi)*Math.cos(theta)*rad;var y=Math.cos(phi)*rad;var z=Math.sin(phi)*Math.sin(theta)*rad;
    var ca=Math.cos(T*0.5),sa=Math.sin(T*0.5);var rx=x*ca-z*sa;var rz=x*sa+z*ca;
    var sc=w/(w+rz+rad*1.5);var px=cx+rx*sc;var py=cy+y*sc;var br=(rz+rad)/(rad*2);
    ctx.beginPath();ctx.arc(px,py,Math.max(1,4*sc),0,Math.PI*2);ctx.fillStyle='hsla('+((T*20+lat*15+lon*10)%360)+',90%,'+(40+br*30)+'%,'+(br*0.8)+')';ctx.fill();}
  } else if(p==='terrain3d'){
    ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);var cx=w/2;var hor=h*0.35;
    for(var row=20;row>=1;row--){var z=row*40;var ps=w*0.8/(w*0.8+z);ctx.beginPath();
    for(var col=0;col<=30;col++){var x=(col/30-0.5)*w*2;var ht=Math.sin(col*0.4+T+row*0.3)*40+Math.sin(col*0.8+T*1.5+row*0.2)*20;
    var sx=cx+x*ps;var sy=hor+z*ps*0.5-ht*ps;col===0?ctx.moveTo(sx,sy):ctx.lineTo(sx,sy);}
    ctx.strokeStyle='hsla('+((T*30+row*8)%360)+',80%,'+(30+(1-row/20)*30)+'%,'+(0.3+(1-row/20)*0.5)+')';ctx.lineWidth=1+(1-row/20)*2;ctx.stroke();}
  } else if(p==='vortex3d'){
    ctx.fillStyle='rgba(0,0,0,0.08)';ctx.fillRect(0,0,w,h);var cx=w/2,cy=h/2;
    for(var i=0;i<200;i++){var seed=i*137.508;var ba=seed*2.399+T*0.3;var sr=(i/200)*Math.min(w,h)*0.45;
    var z=Math.sin(ba*2+T)*0.5+0.5;var dep=0.5+z*0.5;var ang=ba+sr*0.005+T;
    ctx.beginPath();ctx.arc(cx+Math.cos(ang)*sr*dep,cy+Math.sin(ang)*sr*dep,(1+z*3)*dep,0,Math.PI*2);
    ctx.fillStyle='hsla('+((seed*0.5+T*40)%360)+',90%,'+(50+z*30)+'%,'+(0.3+z*0.5)+')';ctx.fill();}
  } else if(p==='wall3d'){
    ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);var cols=8,rows=5;var bw=w/cols,bh=h/rows;
    for(var r=0;r<rows;r++){var off=(r%2)*bw*0.5;for(var c=0;c<cols+1;c++){var bx=c*bw+off-bw*0.25;var by=r*bh;
    var dist=Math.sqrt(Math.pow(c-cols/2,2)+Math.pow(r-rows/2,2));var push=Math.sin(dist*0.8-T*3)*0.5+0.5;
    var hv=(T*20+dist*40)%360;var lt=30+push*35;var mg=2;var sh=push*20*0.3;
    ctx.fillStyle='hsla('+hv+',60%,'+(lt*0.3)+'%,0.8)';ctx.fillRect(bx+mg+sh,by+mg+sh,bw-mg*2,bh-mg*2);
    ctx.fillStyle='hsla('+hv+',70%,'+lt+'%,0.9)';ctx.fillRect(bx+mg,by+mg,bw-mg*2-sh*0.5,bh-mg*2-sh*0.5);}}
  } else if(p==='ivy'){
    ctx.fillStyle='rgba(0,0,0,0.03)';ctx.fillRect(0,0,w,h);
    var corners=[[0,0],[w,0],[0,h],[w,h]];for(var ci=0;ci<4;ci++){var sx=corners[ci][0],sy=corners[ci][1];
    var dx=sx===0?1:-1;var dy=sy===0?1:-1;var growth=Math.min(1,(T*0.1+ci*0.3)%2);var len=growth*Math.max(w,h)*0.6;
    var px=sx,py=sy;ctx.beginPath();ctx.moveTo(px,py);for(var s=0;s<30*growth;s++){
    px+=dx*(len/30)*(0.5+Math.random()*0.5);py+=dy*(len/30)*(0.3+Math.sin(T+s+ci)*0.4);ctx.lineTo(px,py);}
    ctx.strokeStyle='hsla(90,40%,25%,0.6)';ctx.lineWidth=2;ctx.stroke();}
  } else if(p==='laserText'){
    ctx.fillStyle='rgba(0,0,0,0.06)';ctx.fillRect(0,0,w,h);
    var text='YSIEN TANSSIT';var sub='2026';var fs=Math.min(w*0.09,h*0.22);var ss=fs*0.7;
    var cx=w/2,cy=h/2;var cycle=9;var phase=T%cycle;var drawDur=3;
    ctx.font='bold '+fs+'px Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    var tW=ctx.measureText(text).width;var tL=cx-tW/2;var prog=Math.min(1,phase/drawDur);
    // Laser beams
    if(phase<drawDur+1){var focusX=tL+tW*prog;var focusY=cy;
    var srcs=[[0,0],[w,0],[0,h],[w,h]];var ba=Math.min(1,prog*3)*(phase<drawDur?1:Math.max(0,1-(phase-drawDur)));
    for(var i=0;i<4;i++){ctx.save();ctx.globalAlpha=ba;ctx.strokeStyle='rgba(0,255,120,0.15)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(srcs[i][0],srcs[i][1]);ctx.lineTo(focusX,focusY);ctx.stroke();ctx.restore();}
    if(phase<drawDur){var g=ctx.createRadialGradient(focusX,focusY,0,focusX,focusY,w*0.04);
    g.addColorStop(0,'rgba(255,255,255,0.95)');g.addColorStop(0.3,'rgba(150,255,150,0.5)');g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.fillRect(focusX-w*0.04,focusY-w*0.04,w*0.08,w*0.08);}}
    // Text
    var ha=phase>=drawDur?1:prog;var fo=phase>cycle-1.5?Math.max(0,(cycle-phase)/1.5):1;
    ctx.save();ctx.beginPath();ctx.rect(0,0,tL+tW*prog+5,h);ctx.clip();
    ctx.font='bold '+fs+'px Arial,sans-serif';
    ctx.shadowBlur=30;ctx.shadowColor='rgba(0,255,120,'+(0.4*ha*fo)+')';
    ctx.strokeStyle='rgba(0,255,120,'+(0.3*ha*fo)+')';ctx.lineWidth=4;ctx.strokeText(text,cx,cy-ss*0.3);
    ctx.shadowBlur=8;ctx.shadowColor='rgba(200,255,220,'+(0.8*ha*fo)+')';
    ctx.strokeStyle='rgba(220,255,230,'+(0.9*ha*fo)+')';ctx.lineWidth=1.5;ctx.strokeText(text,cx,cy-ss*0.3);
    ctx.font='bold '+ss+'px Arial,sans-serif';ctx.shadowBlur=20;ctx.shadowColor='rgba(0,255,120,'+(0.3*ha*fo)+')';
    ctx.strokeStyle='rgba(150,255,180,'+(0.6*ha*fo)+')';ctx.lineWidth=1.5;ctx.strokeText(sub,cx,cy+fs*0.5);
    ctx.restore();
  } else if(p==='magicReveal'){
    ctx.fillStyle='rgba(0,0,0,0.06)';ctx.fillRect(0,0,w,h);var cx=w/2,cy=h/2;
    var wp=(T*0.12)%1;var wx=w*0.1+wp*w*0.8;var wy=cy+Math.sin(wp*Math.PI)*h*-0.2;
    for(var i=0;i<60;i++){var age=i/60;if(age>wp)continue;var px=w*0.1+age*w*0.8;var py=cy+Math.sin(age*Math.PI)*h*-0.2;
    var drift=Math.sin(T*3+i*7)*15;var fall=(wp-age)*80;var sp=Math.sin(T*10+i*13)*0.5+0.5;var sz=(1-(wp-age)*2)*3*sp;
    if(sz>0){ctx.beginPath();ctx.arc(px+drift,py+fall,sz,0,Math.PI*2);ctx.fillStyle='rgba(255,200,50,'+sp*0.8+')';ctx.fill();}}
    if(wp<0.95){var g=ctx.createRadialGradient(wx,wy,0,wx,wy,w*0.06);g.addColorStop(0,'rgba(255,255,255,0.9)');g.addColorStop(0.3,'rgba(255,200,50,0.5)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(wx-w*0.06,wy-w*0.06,w*0.12,w*0.12);}
  } else if(p==='glitterRain'){
    ctx.fillStyle='rgba(0,0,0,0.08)';ctx.fillRect(0,0,w,h);
    for(var i=0;i<120;i++){var seed=i*73.7;var x=(seed*3.1)%w;var sp=60+(seed%100);var y=(T*sp+seed*5)%(h+20)-10;
    var sh=Math.sin(T*8+seed)*0.5+0.5;var sz=1+sh*2;ctx.beginPath();ctx.arc(x+Math.sin(T+i)*3,y,sz,0,Math.PI*2);
    ctx.fillStyle=i%3===0?'rgba(255,200,50,'+sh*0.9+')':i%3===1?'rgba(255,255,255,'+sh*0.6+')':'rgba(200,180,255,'+sh*0.5+')';ctx.fill();}
  } else if(p==='washUp'){
    ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
    for(var i=0;i<5;i++){var x=(i+0.5)/5*w;var sp=w/5*0.8;var hv=(T*15+i*40)%360;
    var g=ctx.createLinearGradient(x,h,x,h*0.1);g.addColorStop(0,'hsla('+hv+',70%,50%,0.7)');g.addColorStop(0.3,'hsla('+hv+',70%,40%,0.3)');g.addColorStop(1,'transparent');
    ctx.beginPath();ctx.moveTo(x-sp*0.15,h);ctx.lineTo(x-sp*0.6,h*0.05);ctx.lineTo(x+sp*0.6,h*0.05);ctx.lineTo(x+sp*0.15,h);ctx.closePath();ctx.fillStyle=g;ctx.fill();}
  } else if(p==='shadowWall'){
    ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(0,0,w,h);
    for(var i=0;i<6;i++){var ang=Math.sin(T*0.3+i*1.5)*0.3;var x=(i/5)*w;var int=Math.sin(T*0.5+i*0.8)*0.5+0.5;
    ctx.save();ctx.translate(x,0);ctx.rotate(ang);var g=ctx.createLinearGradient(0,0,0,h*1.2);
    g.addColorStop(0,'hsla('+(30+i*10+T*8)%60+',60%,70%,'+int*0.2+')');g.addColorStop(0.5,'hsla('+(30+i*10)%60+',60%,50%,'+int*0.06+')');g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.fillRect(-w*0.08,0,w*0.16,h*1.2);ctx.restore();}
  } else if(p==='dancerIntro'){
    ctx.fillStyle='rgba(0,0,0,0.08)';ctx.fillRect(0,0,w,h);var cx=w/2,cy=h/2;
    var ss=w*0.3+Math.sin(T*2)*w*0.03;var g=ctx.createRadialGradient(cx,cy,0,cx,cy,ss);
    g.addColorStop(0,'rgba(255,240,200,0.25)');g.addColorStop(0.5,'rgba(255,220,150,0.08)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    for(var i=0;i<8;i++){var a=(i/8)*Math.PI*2+T*0.5;var d=ss*0.8+Math.sin(T*3+i)*20;var sx=cx+Math.cos(a)*d;var sy=cy+Math.sin(a)*d;
    var sp=Math.sin(T*6+i*3)*0.5+0.5;if(sp>0.3){ctx.save();ctx.translate(sx,sy);ctx.rotate(T*2+i);ctx.fillStyle='rgba(255,220,100,'+sp*0.6+')';ctx.fillRect(-1,-6,2,12);ctx.fillRect(-6,-1,12,2);ctx.restore();}}
  } else if(p==='blinderFlash'){
    var b2=((performance.now()%((60000/120)))/((60000/120)));var fl=Math.pow(1-b2,12);
    ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);if(fl>0.01){ctx.fillStyle='rgba(255,245,230,'+fl+')';ctx.fillRect(0,0,w,h);}
  } else if(p==='hazeBeams'){
    ctx.fillStyle='rgba(0,0,0,0.06)';ctx.fillRect(0,0,w,h);
    for(var i=0;i<4;i++){var ba2=(i/4)*Math.PI*0.6-Math.PI*0.3+Math.sin(T*0.7+i*2)*0.15;var sx=w*0.5+(i-2)*w*0.15;
    ctx.save();ctx.translate(sx,-h*0.1);ctx.rotate(ba2);var bw2=w*0.06;var g=ctx.createLinearGradient(0,0,0,h*1.5);
    g.addColorStop(0,'hsla('+(40+i*30+T*10)%360+',50%,80%,0.15)');g.addColorStop(0.5,'hsla('+(40+i*30)%360+',50%,60%,0.04)');g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.fillRect(-bw2/2,0,bw2,h*1.5);ctx.restore();}
  } else if(p==='nameReveal'){
    ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(0,0,w,h);var cx=w/2,cy=h/2;var pad=w*0.08;
    ctx.strokeStyle='rgba(255,200,50,'+(0.15+Math.sin(T*2)*0.05)+')';ctx.lineWidth=1;ctx.strokeRect(pad,h*0.3,w-pad*2,h*0.4);
    var cs=w*0.04;var cors=[[pad,h*0.3],[w-pad,h*0.3],[pad,h*0.7],[w-pad,h*0.7]];
    cors.forEach(function(c,i){var dx=i%2===0?1:-1;var dy=i<2?1:-1;ctx.strokeStyle='rgba(255,200,50,'+(0.3+Math.sin(T*3+i)*0.1)+')';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(c[0],c[1]+dy*cs);ctx.lineTo(c[0],c[1]);ctx.lineTo(c[0]+dx*cs,c[1]);ctx.stroke();});
    var g=ctx.createRadialGradient(cx,cy,0,cx,cy,w*0.3);g.addColorStop(0,'rgba(255,220,150,0.06)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  } else if(p==='strobeBlobs'){
    ctx.fillStyle='rgba(0,0,0,0.25)';ctx.fillRect(0,0,w,h);
    var b2=((performance.now()%500)/500);var fl=Math.pow(1-b2,6);
    for(var i=0;i<12;i++){var seed=i*97.3;var bx=(Math.sin(seed*3.1+Math.floor(T*2)*seed)*0.5+0.5)*w;
    var by=(Math.cos(seed*2.3+Math.floor(T*2)*seed*0.7)*0.5+0.5)*h;var sz=w*0.03+w*0.06*fl;
    var vis=((Math.floor(T*3+seed)%3)===0)?fl:0;if(vis>0.05){var g=ctx.createRadialGradient(bx,by,0,bx,by,sz);
    g.addColorStop(0,'rgba(255,255,255,'+vis+')');g.addColorStop(0.4,'rgba(255,240,200,'+vis*0.5+')');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(bx,by,sz,0,Math.PI*2);ctx.fill();}}
  } else if(p==='explosion'){
    ctx.fillStyle='rgba(0,0,0,0.08)';ctx.fillRect(0,0,w,h);var cx=w/2,cy=h/2;var cycle=4;var phase=T%cycle;
    if(phase<0.3){var fl=1-phase/0.3;ctx.fillStyle='rgba(255,200,50,'+fl*0.8+')';ctx.fillRect(0,0,w,h);}
    if(phase>0.1&&phase<2.5){var exp=Math.min(1,(phase-0.1)/1.5);var fade=phase>2?Math.max(0,1-(phase-2)/0.5):1;
    var rR=exp*Math.max(w,h)*0.6;ctx.beginPath();ctx.arc(cx,cy,rR,0,Math.PI*2);ctx.strokeStyle='rgba(255,200,100,'+((1-exp)*fade*0.6)+')';ctx.lineWidth=3+(1-exp)*10;ctx.stroke();
    for(var i=0;i<50;i++){var a=(i/50)*Math.PI*2+i*0.3;var sp=0.5+(i*7.3%1)*0.8;var d=exp*sp*Math.max(w,h)*0.5;
    var px=cx+Math.cos(a)*d;var py=cy+Math.sin(a)*d+exp*exp*30;var sz=(1-exp)*4*fade;
    if(sz>0.2){ctx.beginPath();ctx.arc(px,py,sz,0,Math.PI*2);ctx.fillStyle='hsla('+((i*15)%60+20)+',100%,'+(50+(1-exp)*30)+'%,'+fade*0.8+')';ctx.fill();}}}
  } else if(p==='wipeReveal'){
    var cycle=4;var phase=(T%cycle)/cycle;var wp=phase*w*1.3-w*0.15;ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
    var eW=w*0.05;var g=ctx.createLinearGradient(wp-eW,0,wp+eW,0);var hv=(T*30)%360;
    g.addColorStop(0,'transparent');g.addColorStop(0.4,'hsla('+hv+',90%,60%,0.8)');g.addColorStop(0.5,'rgba(255,255,255,1)');g.addColorStop(0.6,'hsla('+hv+',90%,60%,0.8)');g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);if(wp>0){ctx.fillStyle='hsla('+hv+',60%,50%,0.15)';ctx.fillRect(0,0,Math.min(wp,w),h);}
  } else if(p==='spotlight'){
    ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
    for(var i=0;i<3;i++){var a=T*(0.5+i*0.3)+i*Math.PI*2/3;var cx=w/2+Math.cos(a)*w*0.25;var cy=h/2+Math.sin(a*0.7)*h*0.2;
    var r=w*0.15;var g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);var hv=(T*30+i*120)%360;
    g.addColorStop(0,'hsla('+hv+',80%,80%,0.8)');g.addColorStop(0.3,'hsla('+hv+',80%,50%,0.4)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
  } else if(p==='ledPixels'){
    ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);var cols=16,rows=Math.round(cols*h/w)||8;var cW=w/cols,cH=h/rows;
    for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){var wave=Math.sin(c*0.5+T*3)*Math.sin(r*0.5+T*2);var br=(wave*0.5+0.5);
    var hv=(T*40+c*15+r*10)%360;ctx.beginPath();ctx.arc(c*cW+cW/2,r*cH+cH/2,Math.min(cW,cH)*0.35,0,Math.PI*2);
    ctx.fillStyle='hsla('+hv+',90%,'+(30+br*50)+'%,'+br+')';ctx.fill();}
  }
}

// Homography
function adj(m){return[m[4]*m[8]-m[5]*m[7],m[2]*m[7]-m[1]*m[8],m[1]*m[5]-m[2]*m[4],m[5]*m[6]-m[3]*m[8],m[0]*m[8]-m[2]*m[6],m[2]*m[3]-m[0]*m[5],m[3]*m[7]-m[4]*m[6],m[1]*m[6]-m[0]*m[7],m[0]*m[4]-m[1]*m[3]];}
function mul(a,b){var c=[];for(var i=0;i<3;i++)for(var j=0;j<3;j++){var s=0;for(var k=0;k<3;k++)s+=a[3*i+k]*b[3*k+j];c.push(s);}return c;}
function mulv(m,v){return[m[0]*v[0]+m[1]*v[1]+m[2]*v[2],m[3]*v[0]+m[4]*v[1]+m[5]*v[2],m[6]*v[0]+m[7]*v[1]+m[8]*v[2]];}
function basis(x1,y1,x2,y2,x3,y3,x4,y4){var m=[x1,x2,x3,y1,y2,y3,1,1,1];var v=mulv(adj(m),[x4,y4,1]);return mul(m,[v[0],0,0,0,v[1],0,0,0,v[2]]);}
function matrix3d(w,h,corners){
  var tl=corners[0],tr=corners[1],br=corners[2],bl=corners[3];
  var s=basis(0,0,w,0,0,h,w,h);
  var d=basis(tl.x,tl.y,tr.x,tr.y,bl.x,bl.y,br.x,br.y);
  var t=mul(d,adj(s));
  for(var i=0;i<9;i++)t[i]/=t[8];
  return'matrix3d('+[t[0],t[3],0,t[6],t[1],t[4],0,t[7],0,0,1,0,t[2],t[5],0,t[8]].join(',')+')';
}

// Render loop
function render(time) {
  // Pre-render all group canvases ONCE per frame
  var groupRenders = {};
  groups.forEach(function(g) {
    var result = renderGroupCanvas(g, time);
    if (result) groupRenders[g.id] = result;
  });

  surfaces.forEach(function(surface, idx) {
    surface._index = idx;
    var el = stage.querySelector('[data-surface-id="'+surface.id+'"]');
    if (!el) {
      el = document.createElement('div');
      el.className = 'surface-container';
      el.dataset.surfaceId = surface.id;
      var c = document.createElement('canvas');
      c.className = 'surface-content';
      c.width = surface.w; c.height = surface.h;
      el.appendChild(c);
      stage.appendChild(el);
    }
    if (!surface.visible || blackout) { el.style.display='none'; return; }
    el.style.display='';
    el.style.transform = matrix3d(surface.w, surface.h, surface.corners);
    el.style.opacity = surface.opacity;
    el.style.filter = surface.brightness!==1?'brightness('+surface.brightness+')':'';
    el.style.width = surface.w+'px';
    el.style.height = surface.h+'px';
    var c = el.querySelector('.surface-content');
    var ctx = c.getContext('2d');
    renderSurfaceWithGroup(surface, ctx, time, groupRenders);
  });
  stage.querySelectorAll('[data-surface-id]').forEach(function(el){
    if(el.id==='test-pattern')return;
    var id=parseInt(el.dataset.surfaceId);
    if(!surfaces.find(function(s){return s.id===id}))el.remove();
  });
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

document.body.addEventListener('click', function(){
  if(!document.fullscreenElement) document.documentElement.requestFullscreen();
});
<\/script>
</body></html>`;
}
