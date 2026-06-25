/* Sparking — Base JS (var = global em non-module scripts) */
var charts={};
var deb=null;
var expState={};
var AC='#007575',AC2='#C8102E',AC3='#1B2E50',CEXP='#F0A500';

function get(id){return parseFloat(document.getElementById(id)?.value)||0;}
function gv(id){return parseFloat(document.getElementById(id)?.value);}
function setV(id,v){const el=document.getElementById(id);if(el)el.textContent=v;}
function fmN(v){if(Math.abs(v)>=1000)return v.toFixed(0);if(Math.abs(v)>=100)return v.toFixed(1);if(Math.abs(v)>=1)return v.toFixed(3);if(Math.abs(v)>=0.001)return v.toPrecision(3);return v.toExponential(2);}
function rRct(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

var crosshairPlugin={id:'crosshair',afterInit(c){c._chX=null;const cv=c.canvas;cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();c._chX=e.clientX-r.left;c.draw();});cv.addEventListener('mouseleave',()=>{c._chX=null;c.draw();});},afterDraw(c){const mx=c._chX;if(mx==null)return;const{ctx,scales,chartArea:ca}=c;if(mx<ca.left||mx>ca.right)return;const xv=scales.x.getValueForPixel(mx);ctx.save();ctx.beginPath();ctx.moveTo(mx,ca.top);ctx.lineTo(mx,ca.bottom);ctx.strokeStyle='rgba(27,46,80,.35)';ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);const vals=[];c.data.datasets.forEach(ds=>{if(ds.type==='scatter')return;const pts=ds.data;let lo=null,hi=null;for(let j=0;j<pts.length-1;j++){if(pts[j].x<=xv&&pts[j+1].x>=xv){lo=pts[j];hi=pts[j+1];break;}}if(!lo)return;const t=hi.x===lo.x?0:(xv-lo.x)/(hi.x-lo.x);const yv=lo.y+t*(hi.y-lo.y);const yScl=scales[ds.yAxisID||'y']||Object.values(scales).find(s=>s.axis==='y');if(!yScl)return;const yp=yScl.getPixelForValue(yv);ctx.beginPath();ctx.arc(mx,yp,4.5,0,2*Math.PI);ctx.fillStyle=typeof ds.borderColor==='string'?ds.borderColor:AC;ctx.fill();ctx.beginPath();ctx.arc(mx,yp,4.5,0,2*Math.PI);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();vals.push({label:ds.label,y:yv,color:typeof ds.borderColor==='string'?ds.borderColor:AC});});if(!vals.length){ctx.restore();return;}const pad=9,lh=18;ctx.font='600 12px Inter,sans-serif';const xLabel=c.options?.scales?.x?.title?.text||'x';const xUnit=(/\(([^)]+)\)/.exec(xLabel)||[])[1]||'';const yKey=Object.keys(c.options?.scales||{}).find(k=>k!=='x')||'y';const yUnit=(/\(([^)]+)\)/.exec(c.options?.scales?.[yKey]?.title?.text||'')||[])[1]||'';const lines=[`${xLabel}: ${fmN(xv)}${xUnit?' '+xUnit:''}`,...vals.map(v=>`${v.label}: ${fmN(v.y)}${yUnit?' '+yUnit:''}`)];const mw=Math.max(...lines.map(l=>ctx.measureText(l).width));const bw=mw+pad*2,bh=lines.length*lh+pad*2-2;let bx=mx+14;if(bx+bw>ca.right-4)bx=mx-bw-14;const by=ca.top+8;ctx.fillStyle='rgba(255,255,255,.96)';ctx.strokeStyle='#CDD3E0';ctx.lineWidth=1;rRct(ctx,bx,by,bw,bh,7);ctx.fill();ctx.stroke();lines.forEach((line,i)=>{ctx.fillStyle=i===0?'#556070':vals[i-1].color;ctx.font=i===0?'12px Inter,sans-serif':'700 12px Inter,sans-serif';ctx.fillText(line,bx+pad,by+pad+i*lh+12);});ctx.restore();}};

try{Chart.register({id:'_sd',beforeUpdate(c){const ll=c.options?.plugins?.legend?.labels;if(ll){ll.usePointStyle=false;if(!ll.boxWidth)ll.boxWidth=20;if(!ll.boxHeight)ll.boxHeight=3;}Object.values(c.options?.scales||{}).forEach(s=>{if(s.grid)s.grid.color='rgba(0,0,0,.15)';});}});}catch(e){}

function makeChart(id,datasets,xL,yL,opts){
  opts=opts||{};
  const ctx=document.getElementById('chart-'+id).getContext('2d');
  if(charts[id])charts[id].destroy();
  const ts=opts.tickSize||11;
  function mkScale(label,o){
    o=o||{};
    const s={type:o.type||'linear',grid:{color:'rgba(0,0,0,.06)'},ticks:{color:'#556070',font:{size:ts}},title:{display:true,text:label,color:'#556070',font:{size:11}}};
    if(o.min!==undefined)s.min=o.min;
    if(o.max!==undefined)s.max=o.max;
    return s;
  }
  charts[id]=new Chart(ctx,{type:'line',plugins:opts.plugins!==undefined?opts.plugins:[crosshairPlugin],data:{datasets},options:{responsive:true,maintainAspectRatio:false,animation:{duration:200},plugins:{legend:{display:true,position:'top',labels:{font:{size:opts.legendSize||13,family:'Inter',weight:'600'},color:'#556070',usePointStyle:true,pointStyleWidth:10}},tooltip:{enabled:false}},scales:{x:mkScale(xL,opts.x),y:mkScale(yL,opts.y)}}});
  return charts[id];
}
function makeCrosshair(xLabel,yLabel){return{id:'crosshair',afterInit:function(c){c._chX=null;c.canvas.addEventListener('mousemove',function(e){var r=c.canvas.getBoundingClientRect();c._chX=e.clientX-r.left;c.draw();});c.canvas.addEventListener('mouseleave',function(){c._chX=null;c.draw();});},afterDraw:function(c){var mx=c._chX;if(mx==null)return;var ctx=c.ctx,ca=c.chartArea;if(mx<ca.left||mx>ca.right)return;var xv=c.scales.x.getValueForPixel(mx);ctx.save();ctx.beginPath();ctx.moveTo(mx,ca.top);ctx.lineTo(mx,ca.bottom);ctx.strokeStyle='rgba(27,46,80,.35)';ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);var vals=[];c.data.datasets.forEach(function(ds){if(ds.type==='scatter')return;var pts=ds.data,lo=null,hi=null;for(var j=0;j<pts.length-1;j++){if(pts[j].x<=xv&&pts[j+1].x>=xv){lo=pts[j];hi=pts[j+1];break;}}if(!lo)return;var t=hi.x===lo.x?0:(xv-lo.x)/(hi.x-lo.x);var yv=lo.y+t*(hi.y-lo.y);var yp=c.scales.y.getPixelForValue(yv);ctx.beginPath();ctx.arc(mx,yp,4,0,2*Math.PI);ctx.fillStyle=ds.borderColor;ctx.fill();vals.push({label:ds.label,y:yv,color:ds.borderColor});});if(!vals.length){ctx.restore();return;}var pad=9,lh=18;ctx.font='600 12px Inter,sans-serif';var lines=[xLabel+': '+fmN(xv)].concat(vals.map(function(v){return v.label+': '+fmN(v.y)+' '+yLabel;}));var mw=Math.max.apply(null,lines.map(function(l){return ctx.measureText(l).width;}));var bw=mw+pad*2,bh=lines.length*lh+pad*2-2,bx=mx+14;if(bx+bw>ca.right-4)bx=mx-bw-14;ctx.fillStyle='rgba(255,255,255,.96)';ctx.strokeStyle='#CDD3E0';ctx.lineWidth=1;rRct(ctx,bx,ca.top+8,bw,bh,7);ctx.fill();ctx.stroke();lines.forEach(function(line,i){ctx.fillStyle=i===0?'#556070':vals[i-1].color;ctx.font=i===0?'12px Inter,sans-serif':'700 12px Inter,sans-serif';ctx.fillText(line,bx+pad,ca.top+8+pad+i*lh+12);});ctx.restore();}};}
var ln=(data,label,cor)=>({label,data,borderColor:cor||AC,backgroundColor:(cor||AC)+'22',borderWidth:2.5,pointRadius:0,tension:0.1,fill:true});
var sc=(data,label)=>({type:'scatter',label,data,borderColor:CEXP,backgroundColor:CEXP+'CC',pointRadius:3,pointHoverRadius:5,showLine:true,borderWidth:2,borderDash:[]});
var rl=(data,label)=>({label,data,borderColor:CEXP+'99',backgroundColor:'transparent',borderWidth:1.5,borderDash:[5,4],pointRadius:0,type:'line'});

function calcReg(pts){
  const n=pts.length;if(n<2)return null;
  const sx=pts.reduce((a,p)=>a+p.x,0),sy=pts.reduce((a,p)=>a+p.y,0);
  const mx=sx/n,my=sy/n;
  const sxx=pts.reduce((a,p)=>a+(p.x-mx)**2,0);
  const sxy=pts.reduce((a,p)=>a+(p.x-mx)*(p.y-my),0);
  const syy=pts.reduce((a,p)=>a+(p.y-my)**2,0);
  const m=sxx?sxy/sxx:0,b=my-m*mx;
  const r2=sxx&&syy?(sxy**2)/(sxx*syy):0;
  const sdx=n>1?Math.sqrt(sxx/(n-1)):0,sdy=n>1?Math.sqrt(syy/(n-1)):0;
  return{n,mx,my,sdx,sdy,m,b,r2};
}

function showStats(pid,pts){
  let el=document.getElementById('stats-'+pid);
  if(!el){
    const wrap=document.getElementById('chart-'+pid)?.closest('.chart-card');
    if(!wrap)return;
    el=document.createElement('div');el.id='stats-'+pid;wrap.appendChild(el);
  }
  if(!pts||pts.length<2){el.innerHTML='';return;}
  const s=calcReg(pts);if(!s){el.innerHTML='';return;}
  const f=v=>Math.abs(v)>=1000?v.toFixed(1):Math.abs(v)>=10?v.toFixed(2):Math.abs(v)>=0.01?v.toFixed(4):v.toPrecision(3);
  el.innerHTML=`<div class="stats-box"><div class="stat"><span>Pontos</span><b>${s.n}</b></div><div class="stat"><span>Inclinação</span><b>${f(s.m)}</b></div><div class="stat"><span>Intercepto</span><b>${f(s.b)}</b></div><div class="stat stat-r2"><span>R² — qualidade</span><b>${s.r2.toFixed(4)}</b></div></div>`;
}

function regDataset(pts,xMin,xMax,label){
  const s=calcReg(pts);if(!s)return null;
  const data=[{x:xMin,y:s.m*xMin+s.b},{x:xMax,y:s.m*xMax+s.b}];
  return rl(data,label||`Regressão (R²=${s.r2.toFixed(3)})`);
}

function addExpRow(pid){
  if(!expState[pid])expState[pid]=[];
  expState[pid].push({id:Date.now()+Math.random(),x:NaN,y:NaN});
  renderExpTable(pid);
}
function delExpRow(pid,rowId){
  expState[pid]=expState[pid].filter(r=>r.id!==rowId);
  renderExpTable(pid);
  if(typeof CALC!=='undefined')CALC[pid]?.();
}
function clearExp(pid){expState[pid]=[];renderExpTable(pid);if(typeof CALC!=='undefined')CALC[pid]?.();}
function renderExpTable(pid){
  const tbody=document.getElementById('exp-tbody-'+pid);
  if(!tbody)return;
  tbody.innerHTML='';
  if(!expState[pid])return;
  expState[pid].forEach(row=>{
    const tr=document.createElement('tr');
    ['x','y'].forEach(k=>{
      const td=document.createElement('td');
      const inp=document.createElement('input');
      inp.type='number';inp.step='any';
      if(!isNaN(row[k]))inp.value=row[k];
      inp.oninput=e=>{row[k]=parseFloat(e.target.value);if(typeof CALC!=='undefined')CALC[pid]?.();};
      td.appendChild(inp);tr.appendChild(td);
    });
    const tdDel=document.createElement('td');
    const btn=document.createElement('button');
    btn.className='exp-del';btn.textContent='✕';
    btn.onclick=()=>delExpRow(pid,row.id);
    tdDel.appendChild(btn);tr.appendChild(tdDel);
    tbody.appendChild(tr);
  });
}
function getExpPts(pid){
  const rows=expState[pid];
  if(!rows||!rows.length)return null;
  const pts=rows.map(r=>({x:r.x,y:r.y})).filter(p=>!isNaN(p.x)&&!isNaN(p.y)&&isFinite(p.x)&&isFinite(p.y));
  return pts.length?pts:null;
}

function setPanel(id,el){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('panel-'+id).classList.add('active');
  el.classList.add('active');
  requestAnimationFrame(()=>{if(typeof CALC!=='undefined')CALC[id]?.();MathJax?.typesetPromise?.([document.getElementById('panel-'+id)]);});
}
function setSubPanel(pid,spid,btn){
  const panel=document.getElementById('panel-'+pid);
  panel.querySelectorAll('.sub-panel').forEach(p=>p.classList.remove('active'));
  panel.querySelectorAll('.sub-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('sp-'+pid+'-'+spid).classList.add('active');
  btn.classList.add('active');
  if(spid==='exp'&&(!expState[pid]||expState[pid].length===0))addExpRow(pid);
  if(typeof CALC!=='undefined')CALC[pid]?.();
}
var setTab=setPanel;

function isExpActive(pid){
  return!!document.getElementById('sp-'+pid+'-exp')?.classList.contains('active');
}

window.addEventListener('pageshow',function(e){
  if(e.persisted){
    document.querySelectorAll('link[rel=stylesheet]').forEach(function(l){
      var h=l.href;l.href='';l.href=h;
    });
    Object.values(charts).forEach(function(c){try{c.resize();}catch(_){}});
  }
});
