(function(){
'use strict';

var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var rootEl=document.documentElement;
var cs=getComputedStyle(rootEl);
function tok(k){return cs.getPropertyValue(k).trim();}
var COL={ink:tok('--ink'),bone:tok('--bone'),mist:tok('--mist'),sage:tok('--sage'),gilt:tok('--gilt'),lit:tok('--gilt-lit'),near:tok('--ground-near'),deep:tok('--ground-deep')};
function rgba(hex,a){var h=hex.replace('#','');return 'rgba('+parseInt(h.substr(0,2),16)+','+parseInt(h.substr(2,2),16)+','+parseInt(h.substr(4,2),16)+','+a+')';}
function ss(a,b,x){var t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
function lerp(a,b,t){return a+(b-a)*t;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
var rnd=mulberry32(557);

/* ---------- tree structure ---------- */
var N=[],tips=[];
function mk(p,rel,len,w,depth,first){
  var i=N.length;
  N.push({p:p,rel:rel,len:len,w:w,depth:depth,th:(p>=0?N[p].th:0)+rel,jr:depth===0?0:(first?(rnd()-0.5)*0.26:(rnd()-0.5)*0.05),ph:rnd()*6.283});
  return i;
}
var MAXD=7;
function grow(parent,rel0,len,w0,depth,o){
  o=o||{};
  var segLen=depth<=1?20:depth===2?15:depth===3?12:10;
  var nSeg=Math.max(2,Math.round(len/segLen));
  var tau=o.tau!==undefined?o.tau:(depth<=1?0.07:0.05);
  var wEnd=Math.max(0.7,w0*(o.endR||0.55));
  var sc=rnd()<0.5?-1:1,side=rnd()<0.5?-1:1,bend=0,last=-9,prev=parent;
  var ids=[];
  var gap=depth<=3?3:4,prob=depth<=1?0.9:depth===2?0.8:depth===3?0.65:0.5;
  var forced=o.forced||[];
  for(var k=0;k<nSeg;k++){
    var u=(k+0.5)/nSeg,thp=prev>=0?N[prev].th:0;
    bend=bend*0.8+(rnd()-0.5)*0.14;
    var curv=sc*Math.sin(u*6.283)*0.055;
    var rel=k===0?rel0:(bend+curv-tau*thp);
    var w=w0+(wEnd-w0)*u;
    var id=mk(prev,rel,len/nSeg,w,depth,k===0);
    ids.push(id);prev=id;
    if(depth<MAXD&&k>=2&&k<nSeg-1&&!o.bare){
      var done=false;
      for(var f=0;f<forced.length;f++){
        if(Math.round(nSeg*forced[f].at)===k){
          var cids=grow(id,forced[f].side*(0.55+rnd()*0.3),len*0.5,Math.max(1,w*0.7),depth+1,{});
          o.out[forced[f].tag]=cids[Math.floor(cids.length*0.6)];
          last=k;done=true;
        }
      }
      if(!done&&k-last>=gap&&rnd()<prob){
        var cl=len*(0.3+rnd()*0.2)*(1-0.35*u);
        if(cl>=18)grow(id,side*(0.5+rnd()*0.55),cl,Math.max(0.8,w*0.62),depth+1,{});
        side=-side;last=k;
      }
    }
  }
  if(o.out&&o.domAt!==undefined)o.out.dom=ids[Math.floor(nSeg*o.domAt)];
  if(depth<MAXD&&len>=40&&!o.noFork){
    grow(prev,-(0.3+rnd()*0.35),len*(0.5+rnd()*0.15),Math.max(0.8,wEnd),depth+1,{});
    grow(prev,0.3+rnd()*0.35,len*(0.5+rnd()*0.15),Math.max(0.8,wEnd),depth+1,{});
  }else if(depth>=4)tips.push(prev);
  return ids;
}

/* trunk: straight, widening smoothly toward the ground */
var trunk=[],TK=18,TL=230,prevT=-1;
for(var tk=0;tk<TK;tk++){
  var tu=(tk+0.5)/TK;
  prevT=mk(prevT,0,TL/TK,17+43*Math.pow(1-tu,2.4),0,false);
  trunk.push(prevT);
}
var trunkEnd=trunk[trunk.length-1];

/* four main limbs carry the domains; the rest of the crown fills in around them */
var domNode=[],projNode=[[],[],[],[]];
function limb(d,from,rel,len,w0){
  var og=d<2?-1:1,out={};
  grow(from,rel,len,w0,1,{out:out,domAt:0.46,forced:[{at:0.42,side:og,tag:0},{at:0.68,side:-og,tag:1}]});
  domNode[d]=out.dom;projNode[d][0]=out[0];projNode[d][1]=out[1];
}
limb(0,trunk[14],-1.1,230,9.5);
limb(1,trunk[17],-0.5,260,11);
limb(2,trunk[17],0.45,260,11);
limb(3,trunk[15],1.05,220,9.5);
grow(trunk[17],0.03,250,10.5,1,{});
grow(trunk[16],-0.85,170,7.5,2,{});
grow(trunk[15],0.85,175,7.5,2,{});

var NN=N.length;
var PAR=new Int32Array(NN),REL=new Float32Array(NN),LEN=new Float32Array(NN),JR=new Float32Array(NN),PH=new Float32Array(NN),DEP=new Float32Array(NN);
var X=new Float32Array(NN),Y=new Float32Array(NN),XR=new Float32Array(NN),YR=new Float32Array(NN),TH=new Float32Array(NN),THR=new Float32Array(NN);
var SXT=new Float32Array(NN),SYT=new Float32Array(NN),SXR=new Float32Array(NN),SYR=new Float32Array(NN);
for(var q=0;q<NN;q++){PAR[q]=N[q].p;REL[q]=N[q].rel;LEN[q]=N[q].len;JR[q]=N[q].jr;PH[q]=N[q].ph;DEP[q]=N[q].depth;}

function solve(t,k){
  for(var i=0;i<NN;i++){
    var p=PAR[i],dm=DEP[i]===0?0:1+DEP[i]*0.25;
    var a=(Math.sin(t*0.7+PH[i])*0.006+Math.sin(t*0.31+PH[i]*0.5)*0.004)*dm*k*0.85;
    var th=(p>=0?TH[p]:0)+REL[i]+a;TH[i]=th;
    X[i]=(p>=0?X[p]:0)+LEN[i]*Math.sin(th);
    Y[i]=(p>=0?Y[p]:0)-LEN[i]*Math.cos(th);
    var b=(Math.sin(t*0.5+PH[i]+1.7)*0.007+Math.sin(t*0.23+PH[i])*0.004)*dm*k*0.85;
    var thr=(p>=0?THR[p]:0)+REL[i]+JR[i]+b;THR[i]=thr;
    XR[i]=(p>=0?XR[p]:0)+LEN[i]*Math.sin(thr);
    YR[i]=(p>=0?YR[p]:0)+LEN[i]*Math.cos(thr);
  }
}
solve(0,0);
var RY=new Float32Array(Y),RXR=new Float32Array(XR),RYR=new Float32Array(YR);
var minY=0,maxX=0;
for(var m=0;m<NN;m++){minY=Math.min(minY,Y[m]);maxX=Math.max(maxX,Math.abs(X[m]),Math.abs(XR[m]));}
var H1=-minY+24;maxX+=12;

/* ---------- camera anchor deep in the roots ---------- */
var SKC={x:0,y:330};
var culled=new Uint8Array(NN);

/* ---------- stroke classes (batched by width) ---------- */
var CLS=21,byCls=[],clsW=[];
for(var c=0;c<CLS;c++){byCls.push([]);clsW.push(0.7*Math.pow(2,c/3));}
for(var e=0;e<NN;e++){
  if(DEP[e]===0)continue;
  var cc=Math.max(0,Math.min(CLS-1,Math.round(3*Math.log2(N[e].w/0.7))));
  byCls[cc].push(e);
}

/* ---------- content ---------- */
var DATA=window.__AIVILO__.domains;
var NODES=[];
function addNode(o){o.id=NODES.length;o.mirror=null;NODES.push(o);return o;}
var NOW=window.__AIVILO__.now;
addNode({kind:'now',side:'mid',name:NOW.name,kicker:'The Horizon',text:NOW.text,url:NOW.url||null,lastUpdated:NOW.lastUpdated||null});
DATA.forEach(function(dd,di){
  var A=addNode({kind:'domain',side:'above',dom:di,idx:domNode[di],name:dd.name,kicker:'Above',text:dd.text});
  var B=addNode({kind:'domain',side:'below',dom:di,idx:domNode[di],name:dd.under,kicker:'Below, '+dd.name,text:dd.underText});
  A.mirror=B.id;B.mirror=A.id;
  dd.projects.forEach(function(pr,pj){
    var a=addNode({kind:'project',side:'above',dom:di,idx:projNode[di][pj],name:pr.name,kicker:'Above, '+dd.name,text:pr.text,url:pr.url||null,linkLabel:pr.linkLabel||null,media:pr.media||null});
    var b=addNode({kind:'project',side:'below',dom:di,idx:projNode[di][pj],name:pr.under,kicker:'Below, shadow of '+pr.name,text:pr.underText,url:null});
    a.mirror=b.id;b.mirror=a.id;
  });
});
var CH=window.__AIVILO__.chapters;

/* ---------- canvas, camera ---------- */
var cv=document.getElementById('stage'),ctx=cv.getContext('2d');
var track=document.getElementById('track'),probe=document.getElementById('probe');
/* The world is a loop. Its bottom edge (end of The Core) meets its top edge (start of The Beyond). */
var Y_TOP=-3400,Y_BOT=2900,LP=Y_BOT-Y_TOP,SEAM_D=7;
/* seven levels, each LV long: Beyond -3, Sky -2, Branches -1, Horizon 0 (the start), Roots 1, Deep 2, Core 3 */
var LV=0.4,WA=-3*LV,PW=7*LV,NP=40,QS=8,KPX=1000,PER=1,DOCMAX=1,LO=0,HI=0;
var dir=1,off=0,sc=0,ready=false;
var BG=[[0,COL.deep],[(-2700-Y_TOP)/LP,'#0c0c0d'],[(-2000-Y_TOP)/LP,'#3b3a37'],[(-1400-Y_TOP)/LP,COL.sage],[(0-Y_TOP)/LP,COL.mist],[(0-Y_TOP)/LP,COL.near],[(1500-Y_TOP)/LP,COL.deep],[1,COL.deep]];
var STARS=(function(){
  var r=mulberry32(99),o=[],i,y;
  for(i=0;i<2000;i++){
    y=r()<0.5?Y_TOP+r()*1900:1000+r()*1900;
    var stv={x:(r()-0.5)*4400,y:y,r:0.5+r()*1.2,ph:r()*6.28,a:y<0?ss(1700,2700,-y):0};
    if(y<0)o.push(stv);
  }
  return o;
})();
var W=0,H=0,DPR=1,cx=0,cy=0,s0=1,sxF=1,keys=[],camYv=0,hmH=100,dustN=200,hdrB=64,hmark=document.getElementById('hmark');
var kx=1,ky=1,S=1,sgnG=1,camYg=0;
function sx(wx){return cx+wx*kx;}
function sy(wy){return cy+sgnG*(wy-camYg)*ky;}
function wrapW(w){return((w-WA)%PW+PW)%PW+WA;}
function measureSeams(){
  CH.forEach(function(c){if(c.kind!=='fixed'&&c.el){var h=c.el.offsetHeight;if(h>0)c.hh=h;}});
}
function layout(){
  var wrOld=ready?wrapW(dir*(sc/KPX)+off):0;
  DPR=Math.min(window.devicePixelRatio||1,2);
  W=cv.clientWidth;H=cv.clientHeight;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  cx=W/2;cy=H/2;
  sxF=Math.max(0.78,Math.min(1,(W/H)*1.6));
  s0=Math.min(0.47*H/H1,0.94*W/(2*maxX*sxF));
  /* the opening mark is left-aligned and sized so it stops short of the trunk and anything else near the horizon */
  var hmW=Math.min(0.78*W,430),hmL=Math.max(16,(parseFloat(getComputedStyle(probe).paddingLeft)||0)),kxL=s0*sxF;
  for(;hmW>90;hmW-=6){
    var bw=(hmW/2.3747/2+14)/s0,xl=1e9;
    for(var i2=0;i2<NN;i2++){
      var wn=N[i2].w*0.5*kxL;
      if(Y[i2]>-bw-24&&Y[i2]<24&&X[i2]<=2)xl=Math.min(xl,cx+X[i2]*kxL-wn);
      if(YR[i2]<bw+24&&YR[i2]>-24&&XR[i2]<=2)xl=Math.min(xl,cx+XR[i2]*kxL-wn);
    }
    if(hmL+hmW+12<=xl)break;
  }
  hmark.style.width=hmW+"px";hmH=hmW/2.3747;
  dustN=Math.min(dust.length,Math.round(1000*(W/kxL)*(H/s0)/(4400*1900)));
  var pcs=getComputedStyle(probe),topIn=parseFloat(pcs.paddingTop)||0,botIn=parseFloat(pcs.paddingBottom)||0;
  /* at both ends of the loop the whole mirrored pair of marks sits in view: the Core mark above the Beyond mark */
  var pairH=(wmTop&&wmTop.offsetHeight>0?wmTop.offsetHeight:90)+2*SEAM_D*s0;
  hdrB=topIn+64;
  var camBeyond=(Y_TOP+SEAM_D)+(cy-(topIn+74+pairH))/s0;
  var camCore=(Y_BOT-SEAM_D)-(H-botIn-22-pairH-cy)/s0;
  keys=[[-3*LV,camBeyond],[-2*LV,-1400],[-LV,-330],[0,0],[LV,620],[2*LV,1250],[3*LV,camCore],[4*LV,camBeyond+LP]];
  KPX=1.4*window.innerHeight;PER=PW*KPX;DOCMAX=NP*PER;LO=NP*0.3*PER;HI=NP*0.7*PER;
  track.style.height=(DOCMAX+window.innerHeight)+'px';
  if(ready)off+=wrOld-wrapW(dir*(sc/KPX)+off);
  measureSeams();
}
function cr(a,b,c,d,t){return 0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
/* periodic Catmull-Rom: the segment after the last key continues into the first, one loop further down */
function camAt(w){
  var n=keys.length-1,i=0;
  while(i<n-1&&w>keys[i+1][0])i++;
  var a=i>0?keys[i-1][1]:keys[n-1][1]-LP;
  var d=i+2<=n?keys[i+2][1]:keys[1][1]+LP;
  var t=Math.max(0,Math.min(1,(w-keys[i][0])/(keys[i+1][0]-keys[i][0])));
  camYv=cr(a,keys[i][1],keys[i+1][1],d,t);
}

/* ---------- dom refs, state ---------- */
var elRead=document.getElementById('read'),elHero=document.getElementById('hero'),elCue=document.getElementById('cue');
var chWrap=document.getElementById('chapters');
var wmTop=null,wmBot=null,tfTop='',tfBot='',flipState=false;
CH.forEach(function(c){
  var sec=document.createElement('section'),txt='<div class="txt"><p class="eyebrow"></p><h2></h2><p class="body"></p></div>',logo='<span class="wm" role="img" aria-label="AIVILO"></span>';
  if(c.kind==='fixed'){sec.className='ch';sec.innerHTML=txt;chWrap.appendChild(sec);}
  else{sec.className='seam seam-'+c.kind;sec.innerHTML=c.kind==='top'?logo+txt:txt+logo;document.body.appendChild(sec);c.hh=240;}
  sec.querySelector('.eyebrow').textContent=c.k;
  sec.querySelector('h2').textContent=c.h;
  sec.querySelector('.body').textContent=c.t;
  c.el=sec;c.txt=sec.querySelector('.txt');
  if(c.kind==='top')wmTop=sec.querySelector('.wm');
  if(c.kind==='bottom')wmBot=sec.querySelector('.wm');
});
var panel=document.getElementById('panel'),pKick=document.getElementById('pKick'),pTitle=document.getElementById('pTitle'),pText=document.getElementById('pText'),pMirror=document.getElementById('pMirror'),pClose=document.getElementById('pClose'),pLink=document.getElementById('pLink');
var pMedia=document.getElementById('pMedia'),pImg=document.getElementById('pImg'),pVid=document.getElementById('pVid');
var pUpdated=document.getElementById('pUpdated');
function fmtUpdated(iso){
  if(!iso)return null;
  var d=new Date(iso),now=new Date(),diff=Math.round((now-d)/86400000);
  if(isNaN(diff))return null;
  if(diff===0)return'Updated today';
  if(diff===1)return'Updated yesterday';
  if(diff<7)return'Updated '+diff+' days ago';
  /* older: show month + year */
  return'Updated '+d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
}
var idx=document.getElementById('index');
var fl=0,flT=0,sel=null,hover=null,hits=[],placed=[],chapState='',hdrState='',readState='';
var peG=0; /* current world position, updated every frame for keyboard nav */
var dust=[];for(var di2=0;di2<900;di2++)dust.push({x:Math.random(),y:Math.random(),r:0.6+Math.random()*1.4,sp:4+Math.random()*10,ph:Math.random()*6.28,k:Math.random()});
/* atmosphere state */
var AURORA=['0,175,125','90,55,175'];
var lastFrameTs=0;
/* skull constellation in The Beyond: points relative to center, scale applied at draw time */
var SKULL_PTS=[[0,-400],[-170,-350],[-270,-180],[-260,60],[-140,200],[140,200],[260,60],[270,-180],[170,-350],[-185,-70],[-75,-70],[-185,70],[-75,70],[75,-70],[185,-70],[75,70],[185,70],[-45,110],[45,110],[0,-210]];
var SKULL_LINS=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,0],[9,10],[10,12],[12,11],[11,9],[13,14],[14,16],[16,15],[15,13],[17,18],[19,0],[19,9],[19,14]];
/* shooting stars */
var shoots=[],shootTick=3;
var lastHashT=0;
var hoverPh={}; /* node-id → pulse phase 0..1 for hover ring animation */

/* ---------- drawing helpers ---------- */
function strokeSet(XS,YS,useCull,color,ox,oy){
  ctx.strokeStyle=color;ctx.lineCap='round';
  for(var c=0;c<CLS;c++){
    var list=byCls[c];if(!list.length)continue;
    ctx.lineWidth=Math.max(0.6,clsW[c]*S);
    ctx.beginPath();
    for(var q=0;q<list.length;q++){
      var i=list[q];if(useCull&&culled[i])continue;
      var p=PAR[i],x0=p>=0?XS[p]:ox,y0=p>=0?YS[p]:oy,x1=XS[i],y1=YS[i];
      if((x0<-40&&x1<-40)||(x0>W+40&&x1>W+40)||(y0<-40&&y1<-40)||(y0>H+40&&y1>H+40))continue;
      ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);
    }
    ctx.stroke();
  }
}
function trunkW(u){return 17+43*Math.pow(1-u,2.4);}
function drawTrunk(dir,color){
  var n=40,i,u;
  ctx.fillStyle=color;ctx.beginPath();
  for(i=0;i<=n;i++){u=i/n;var px=sx(-trunkW(u)/2),py=sy(-dir*TL*u);if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);}
  for(i=n;i>=0;i--){u=i/n;ctx.lineTo(sx(trunkW(u)/2),sy(-dir*TL*u));}
  ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.arc(sx(0),sy(-dir*TL),trunkW(1)/2*S*sxF,0,6.2832);ctx.fill();
}
function polyPath(pts,sc,ox,oy){
  ctx.beginPath();
  for(var j=0;j<pts.length;j++){
    var px=sx(SKC.x+pts[j][0]*sc+ox),py=sy(SKC.y+pts[j][1]*sc+oy);
    if(j)ctx.lineTo(px,py);else ctx.moveTo(px,py);
  }
  ctx.closePath();
}
var dirSkyG=-1;
function drawNowLabel(n,x,y,a,active){
  var parts=n.name.split(' '),i,w=0;
  ctx.font='400 19px "IM Fell English SC", Georgia, serif';ctx.letterSpacing='1.2px';
  ctx.textAlign='right';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=4;
  for(i=0;i<parts.length;i++)w=Math.max(w,ctx.measureText(parts[i]).width);
  var tx=x-18;
  placed.push({x1:tx-w,x2:tx,y1:y-24,y2:y+24});
  for(i=0;i<parts.length;i++){
    var ly=y+(i-(parts.length-1)/2)*23;
    var sky=dirSkyG<0?ly<y:ly>y;
    ctx.globalAlpha=0.88*a;ctx.strokeStyle=sky?COL.mist:COL.deep;ctx.strokeText(parts[i],tx,ly);
    ctx.globalAlpha=a;ctx.fillStyle=active?(sky?COL.gilt:COL.lit):(sky?COL.ink:COL.bone);ctx.fillText(parts[i],tx,ly);
  }
  ctx.globalAlpha=1;
}
function rectHit(a,b){return !(a.x2<b.x1||a.x1>b.x2||a.y2<b.y1||a.y1>b.y2);}
function anyHit(r){for(var i=0;i<placed.length;i++)if(rectHit(r,placed[i]))return true;return false;}
function drawLabel(n,x,y,a,force,active){
  if(n.kind==='now'){drawNowLabel(n,x,y,a,active);return;}
  var dom=n.kind!=='project';
  ctx.font=dom?'400 21px "IM Fell English SC", Georgia, serif':'500 11px "IBM Plex Mono", ui-monospace, monospace';
  ctx.letterSpacing=dom?'1.2px':'1.4px';
  var txt=dom?n.name:n.name.toUpperCase();
  var w=ctx.measureText(txt).width,h=dom?22:14,off=dom?16:12;
  var pref=x>=cx?1:-1;
  var tries=[[pref,0],[-pref,0],[pref,-18],[-pref,-18],[pref,18],[-pref,18]];
  var chosen=null,rect;
  for(var t=0;t<tries.length;t++){
    var side=tries[t][0],dy=tries[t][1];
    var x1=side>0?x+off:x-off-w;
    rect={x1:x1,x2:x1+w,y1:y+dy-h/2,y2:y+dy+h/2};
    if(rect.x1<6||rect.x2>W-6)continue;
    if(!anyHit(rect)){chosen={rect:rect,side:side,dy:dy};break;}
  }
  if(!chosen){
    if(!force)return;
    var sd=tries[0][0],xx=sd>0?x+off:x-off-w;
    chosen={rect:{x1:xx,x2:xx+w,y1:y-h/2,y2:y+h/2},side:sd,dy:0};
  }
  placed.push(chosen.rect);
  var above=n.side==='above',below=n.side==='below';
  var halo=above?COL.mist:COL.deep;
  var fill=above?COL.ink:COL.bone;
  if(n.kind==='now'){halo=COL.deep;fill=COL.bone;}
  if(active)fill=above?COL.gilt:COL.lit;
  ctx.textAlign=chosen.side>0?'left':'right';ctx.textBaseline='middle';
  var tx=chosen.side>0?x+off:x-off,ty=y+chosen.dy;
  ctx.lineJoin='round';ctx.lineWidth=4;
  ctx.globalAlpha=a*0.88;ctx.strokeStyle=halo;ctx.strokeText(txt,tx,ty);
  ctx.globalAlpha=a;ctx.fillStyle=fill;ctx.fillText(txt,tx,ty);
  ctx.globalAlpha=1;
  void below;
}
function drawMarker(n,x,y,a,active,t){
  var dom=n.kind==='domain',above=n.side==='above';
  var r=(dom?8:5)*(0.85+0.3*Math.min(1,S));
  var ring=above?COL.gilt:COL.lit;
  ctx.globalAlpha=a;
  if(dom&&!reduce){
    var ph=(t*0.5+n.id*0.37)%1;
    ctx.strokeStyle=ring;ctx.globalAlpha=a*(1-ph)*0.5;ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(x,y,r+ph*12,0,6.2832);ctx.stroke();ctx.globalAlpha=a;
  }
  ctx.fillStyle=above?COL.mist:COL.near;
  ctx.beginPath();ctx.arc(x,y,r,0,6.2832);ctx.fill();
  ctx.strokeStyle=ring;ctx.lineWidth=1.6;ctx.stroke();
  ctx.fillStyle=ring;ctx.beginPath();ctx.arc(x,y,dom?3:2,0,6.2832);ctx.fill();
  if(active){ctx.strokeStyle=ring;ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x,y,r+6,0,6.2832);ctx.stroke();}
  /* hover pulse: a second expanding ring that breathes while the pointer is over this node */
  if(!reduce&&!active){
    var hp=hoverPh[n.id]||0;
    if(hp>0.001){
      ctx.globalAlpha=a*hp*(1-hp)*2.6;
      ctx.strokeStyle=ring;ctx.lineWidth=1.4;
      ctx.beginPath();ctx.arc(x,y,r+4+hp*10,0,6.2832);ctx.stroke();
    }
  }
  ctx.globalAlpha=1;
}
function drawNow(n,x,y,t,dirSky,active,ga){
  var r=9;ga=ga===undefined?1:ga;ctx.globalAlpha=ga;
  if(!reduce){
    var ph=(t*0.6)%1;
    ctx.strokeStyle=COL.lit;ctx.globalAlpha=(1-ph)*0.8*ga;ctx.lineWidth=1.4;
    ctx.beginPath();ctx.arc(x,y,r+ph*22,0,6.2832);ctx.stroke();ctx.globalAlpha=ga;
    /* second faster ring when content is fresh (updated within 7 days) */
    if(n.lastUpdated){
      var ageDays=(Date.now()-new Date(n.lastUpdated))/86400000;
      if(ageDays<7){
        var ph2=(t*1.1+0.5)%1;
        ctx.strokeStyle=COL.lit;ctx.globalAlpha=(1-ph2)*0.55*ga;ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(x,y,r+ph2*14,0,6.2832);ctx.stroke();ctx.globalAlpha=ga;
      }
    }
  }
  ctx.save();ctx.beginPath();ctx.rect(x-20,dirSky<0?y-20:y,40,20);ctx.clip();
  ctx.fillStyle=COL.mist;ctx.beginPath();ctx.arc(x,y,r,0,6.2832);ctx.fill();ctx.restore();
  ctx.save();ctx.beginPath();ctx.rect(x-20,dirSky<0?y:y-20,40,20);ctx.clip();
  ctx.fillStyle=COL.deep;ctx.beginPath();ctx.arc(x,y,r,0,6.2832);ctx.fill();ctx.restore();
  ctx.strokeStyle=COL.lit;ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(x,y,r,0,6.2832);ctx.stroke();
  if(active){ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x,y,r+7,0,6.2832);ctx.stroke();}
  ctx.globalAlpha=1;
}

/* ---------- frame ---------- */
function frame(ts){
  requestAnimationFrame(frame);
  if(document.hidden||!W)return;
  var t=ts/1000;
  var fdt=lastFrameTs>0?(ts-lastFrameTs)/1000:0.016;lastFrameTs=ts;
  var target=window.scrollY;
  if(target<LO||target>HI){
    /* far from the middle of the long track: hop a whole number of loops, which looks identical */
    var was=target;
    window.scrollTo(0,target+(target<LO?QS*PER:-QS*PER));
    target=window.scrollY;
    sc+=target-was;
  }
  sc+=(target-sc)*(reduce?1:0.3);if(Math.abs(target-sc)<0.3)sc=target;
  fl+=(flT-fl)*(reduce?1:0.075);if(Math.abs(flT-fl)<0.002)fl=flT;
  var sgn=Math.cos(Math.PI*fl),fe=(1-sgn)/2;
  var pe=wrapW(dir*(sc/KPX)+off);
  peG=pe;
  /* update location hash at most once per second so the URL reflects current level */
  if(t-lastHashT>1){
    lastHashT=t;
    var hid='horizon';
    if(pe<-2*LV)hid='beyond';
    else if(pe<-LV)hid='sky';
    else if(pe<-0.25*LV)hid='branches';
    else if(pe<0.25*LV)hid='horizon';
    else if(pe<1.5*LV)hid='roots';
    else if(pe<2.5*LV)hid='deep';
    else hid='core';
    try{history.replaceState(null,'','#'+hid);}catch(e){}
  }
  var hoL=1-ss(0.15*LV,0.5*LV,Math.abs(pe));   /* how strongly the opening mark shows */
  camAt(pe);
  var camY=camYv;
  S=s0;kx=S*sxF;ky=S;sgnG=sgn;camYg=camY;
  solve(t,reduce?0:1);
  for(var i=0;i<NN;i++){SXT[i]=sx(X[i]);SYT[i]=sy(Y[i]);SXR[i]=sx(XR[i]);SYR[i]=sy(YR[i]);}
  var ox=sx(0),oy=sy(0),hy=oy,dirSky=sgn>=0?-1:1;dirSkyG=dirSky;

  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.globalAlpha=1;
  ctx.clearRect(0,0,W,H);

  /* background: one periodic gradient drawn at three offsets, so the bottom edge meets the top edge */
  var kk,gs;
  for(kk=-1;kk<=1;kk++){
    var p0=sy(Y_TOP+kk*LP),p1=sy(Y_BOT+kk*LP),lo2=Math.min(p0,p1)-1,hi2=Math.max(p0,p1)+1;
    if(hi2<0||lo2>H)continue;
    var g=ctx.createLinearGradient(0,p0,0,p1);
    for(gs=0;gs<BG.length;gs++)g.addColorStop(BG[gs][0],BG[gs][1]);
    ctx.fillStyle=g;
    var ry0=Math.max(0,lo2),ry1=Math.min(H,hi2);
    ctx.fillRect(0,ry0,W,ry1-ry0);
  }
  var sy0=Math.max(0,dirSky<0?0:hy),sy1=Math.min(H,dirSky<0?hy:H);
  var gy0=Math.max(0,dirSky<0?hy:0),gy1=Math.min(H,dirSky<0?H:hy);

  /* stars in The Beyond, repeated one loop up and down so they continue across the seam */
  ctx.fillStyle=COL.bone;
  for(var si=0;si<STARS.length;si++){
    var st=STARS[si];
    if(st.a<0.02)continue;
    var stx=sx(st.x);
    if(stx<-4||stx>W+4)continue;
    var al=st.a*(reduce?0.8:0.45+0.45*Math.sin(t*(0.8+st.r)+st.ph));
    if(al<=0.01)continue;
    for(var k2=-1;k2<=1;k2++){
      var sty=sy(st.y+k2*LP);
      if(sty<-4||sty>H+4)continue;
      ctx.globalAlpha=al;ctx.beginPath();ctx.arc(stx,sty,st.r,0,6.2832);ctx.fill();
    }
  }
  ctx.globalAlpha=1;

  /* aurora: faint coloured veils in The Beyond, gate on camera altitude */
  var auroraA=ss(-1400,-2600,camY)*0.8;
  if(auroraA>0.01&&!reduce){
    for(var ak=-1;ak<=1;ak++){
      var aWY=-2300+ak*LP,apy=sy(aWY);
      if(apy<-W||apy>H+W)continue;
      for(var aj=0;aj<AURORA.length;aj++){
        var aox=cx+Math.sin(t*0.09+aj*1.6)*W*0.38;
        var ag=ctx.createRadialGradient(aox,apy,0,aox,apy,W*0.7);
        ag.addColorStop(0,'rgba('+AURORA[aj]+','+(auroraA*0.08).toFixed(3)+')');
        ag.addColorStop(1,'rgba('+AURORA[aj]+',0)');
        ctx.fillStyle=ag;ctx.fillRect(0,0,W,H);
      }
    }
    ctx.globalAlpha=1;
  }

  /* skull constellation: faint star-chart of the skull logo, visible in The Beyond */
  if(auroraA>0.05&&!reduce){
    var scS=0.52,scWY2=-2650;
    for(var skk=-1;skk<=1;skk++){
      var scOY=scWY2+skk*LP,scCY=sy(scOY);
      if(scCY<-500||scCY>H+500)continue;
      var scAlp=auroraA*0.9;
      ctx.strokeStyle=COL.bone;ctx.lineWidth=0.7;
      for(var sli=0;sli<SKULL_LINS.length;sli++){
        var sla=SKULL_PTS[SKULL_LINS[sli][0]],slb=SKULL_PTS[SKULL_LINS[sli][1]];
        ctx.globalAlpha=scAlp*0.18;ctx.beginPath();
        ctx.moveTo(sx(sla[0]*scS),sy(scOY+sla[1]*scS));
        ctx.lineTo(sx(slb[0]*scS),sy(scOY+slb[1]*scS));
        ctx.stroke();
      }
      for(var spi=0;spi<SKULL_PTS.length;spi++){
        var spp=SKULL_PTS[spi],isStar=spi===19;
        var spr=(isStar?2.8:1.4)*(0.4+S*0.6);
        var spa=scAlp*(isStar?1:(spi<9?0.85:0.65))*(0.6+0.4*Math.sin(t*(isStar?2.3:1.1)+spi*0.73));
        ctx.globalAlpha=spa;ctx.fillStyle=COL.bone;
        ctx.beginPath();ctx.arc(sx(spp[0]*scS),sy(scOY+spp[1]*scS),spr,0,6.2832);ctx.fill();
      }
    }
    ctx.globalAlpha=1;
  }

  /* shooting stars: brief streaks across The Beyond */
  if(auroraA>0.1&&!reduce){
    shootTick-=fdt;
    if(shootTick<=0){
      shootTick=3+Math.random()*8;
      var sSpeed=90+Math.random()*110;
      shoots.push({x:Math.random()*W,y:Math.random()*H*0.7,vx:-sSpeed*(0.8+Math.random()*0.4),vy:sSpeed*(0.3+Math.random()*0.3),life:0,dur:0.5+Math.random()*0.4,tailPx:40+Math.random()*60});
    }
    for(var ssi=shoots.length-1;ssi>=0;ssi--){
      var ssh=shoots[ssi];ssh.life+=fdt;
      if(ssh.life>=ssh.dur){shoots.splice(ssi,1);continue;}
      var ssMag=Math.sqrt(ssh.vx*ssh.vx+ssh.vy*ssh.vy);
      var ssTailT=ssh.tailPx/ssMag;
      var ssal=Math.sin(ssh.life/ssh.dur*Math.PI)*0.9*auroraA;
      var ssx1=ssh.x+ssh.vx*ssh.life,ssy1=ssh.y+ssh.vy*ssh.life;
      var ssx0=ssh.x+ssh.vx*Math.max(0,ssh.life-ssTailT),ssy0=ssh.y+ssh.vy*Math.max(0,ssh.life-ssTailT);
      var ssg=ctx.createLinearGradient(ssx0,ssy0,ssx1,ssy1);
      ssg.addColorStop(0,'rgba(239,232,220,0)');ssg.addColorStop(1,'rgba(239,232,220,'+ssal.toFixed(3)+')');
      ctx.strokeStyle=ssg;ctx.lineWidth=1.3;
      ctx.beginPath();ctx.moveTo(ssx0,ssy0);ctx.lineTo(ssx1,ssy1);ctx.stroke();
    }
    ctx.globalAlpha=1;
  }

  /* drifting dots below the horizon: sparse in The Roots, thicker through The Deep, and as dense as the stars of The Beyond by The Core */
  if(Math.abs(sgn)>0.05){
    var dCnt=Math.min(dust.length,dustN),dBase=Math.min(1,(W<600?50:90)/dCnt);
    ctx.fillStyle=COL.bone;
    for(var dk=0;dk>=-1;dk--){
      var da=sy(dk*LP),db=sy(dk*LP+Y_BOT),dlo=Math.max(0,Math.min(da,db)),dhi=Math.min(H,Math.max(da,db));
      if(dhi<=dlo)continue;
      ctx.save();ctx.beginPath();ctx.rect(0,dlo,W,dhi-dlo);ctx.clip();
      for(var d2=0;d2<dCnt;d2++){
        var mt=dust[d2];
        var yy=((mt.y*H-sgn*camY*ky*0.3-(reduce?0:t*mt.sp))%H+H)%H;
        var wyp=camY+(yy-cy)/(sgn*ky)-dk*LP;
        var dg=ss(500,2750,wyp);
        if(mt.k>dBase+(1-dBase)*dg)continue;
        var xx=mt.x*W+(reduce?0:Math.sin(t*0.3+mt.ph)*8);
        var da2=(0.1+0.14*mt.r)*(1-dg)+(0.3+0.2*mt.r)*dg;
        if(!reduce)da2*=0.8+0.2*Math.sin(t*0.9+mt.ph);
        ctx.globalAlpha=da2;
        ctx.beginPath();ctx.arc(xx,yy,mt.r,0,6.2832);ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha=1;
  }

  /* low fog drifting along the horizon */
  if(hy>-80&&hy<H+80){
    for(var fg=0;fg<3;fg++){
      var fx=((reduce?0:t*(7+fg*4))+fg*W*0.45)%(W*1.5)-W*0.25;
      ctx.save();ctx.translate(fx,hy+(fg-1)*12);ctx.scale(1,0.16);
      var fgr=ctx.createRadialGradient(0,0,0,0,0,W*0.4);
      fgr.addColorStop(0,'rgba(238,242,236,'+(0.3-fg*0.05)+')');fgr.addColorStop(1,'rgba(238,242,236,0)');
      ctx.fillStyle=fgr;ctx.fillRect(-W*0.5,-W*0.5,W,W);
      ctx.restore();
    }
  }

  /* horizon line and mirrored motto */
  ctx.globalAlpha=1;
  if(hy>-60&&hy<H+60){
    var hgr=ctx.createLinearGradient(0,hy-32,0,hy+32);
    hgr.addColorStop(0,'rgba(148,111,31,0)');hgr.addColorStop(0.5,'rgba(148,111,31,0.09)');hgr.addColorStop(1,'rgba(148,111,31,0)');
    ctx.fillStyle=hgr;ctx.fillRect(0,hy-32,W,64);
  }
  ctx.strokeStyle=COL.gilt;ctx.lineWidth=1.2;
  if(hy>-4&&hy<H+4){
    ctx.beginPath();ctx.moveTo(0,hy);ctx.lineTo(W,hy);ctx.stroke();
    var motto='Quod est superius est sicut quod est inferius';
    ctx.font='italic 400 16px "IM Fell English", Georgia, serif';ctx.letterSpacing='0.4px';
    var mw=ctx.measureText(motto).width,mx=ox+38;
    if(mx+mw<W-10&&Math.abs(sgn)>0.5&&hoL<0.98){
      ctx.textAlign='left';
      ctx.save();ctx.translate(mx,hy+dirSky*6);
      ctx.textBaseline=sgn>=0?'alphabetic':'top';
      ctx.fillStyle=COL.ink;ctx.globalAlpha=0.78*(1-hoL);ctx.fillText(motto,0,0);ctx.restore();
      ctx.save();ctx.translate(mx,hy-dirSky*6);ctx.scale(1,-1);
      ctx.textBaseline=sgn>=0?'alphabetic':'top';
      ctx.fillStyle=COL.bone;ctx.globalAlpha=0.78*(1-hoL);ctx.fillText(motto,0,0);ctx.restore();
      ctx.globalAlpha=1;
    }
  }

  /* crown in ink, roots in bone */
  if(sy1>sy0){ctx.save();ctx.beginPath();ctx.rect(0,sy0,W,sy1-sy0);ctx.clip();strokeSet(SXT,SYT,false,COL.ink,ox,oy);drawTrunk(1,COL.ink);ctx.restore();}
  if(gy1>gy0){ctx.save();ctx.beginPath();ctx.rect(0,gy0,W,gy1-gy0);ctx.clip();strokeSet(SXR,SYR,true,COL.bone,ox,oy);drawTrunk(-1,COL.bone);ctx.restore();}

  /* fruit on the crown, spores in the roots */
  for(var ti=0;ti<tips.length;ti+=2){
    var tn=tips[ti];
    var fa=Math.sin(t*1.7+PH[tn]*7)*Math.sin(t*0.9+PH[tn]*3);var tw=reduce?0.4:0.06+0.9*Math.pow(Math.max(0,fa),2);
    var fr=1+S*1.3;
    ctx.fillStyle=COL.gilt;ctx.globalAlpha=tw;
    ctx.beginPath();ctx.arc(SXT[tn],SYT[tn],fr,0,6.2832);ctx.fill();
    if(!culled[tn]){
      ctx.fillStyle=COL.bone;ctx.globalAlpha=tw*0.7;
      ctx.beginPath();ctx.arc(SXR[tn],SYR[tn],fr*0.9,0,6.2832);ctx.fill();
    }
  }
  ctx.globalAlpha=1;

  /* vignette */
  var vg=ctx.createRadialGradient(cx,cy,Math.min(W,H)*0.35,cx,cy,Math.max(W,H)*0.8);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.52)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);

  /* nodes: markers first, then labels with collision handling */
  /* advance hover pulse phases */
  if(!reduce){
    for(var hpi=0;hpi<NODES.length;hpi++){
      var hn=NODES[hpi],hid2=hn.id;
      if(hover===hn){
        hoverPh[hid2]=Math.min(1,(hoverPh[hid2]||0)+fdt*1.4);
      } else {
        hoverPh[hid2]=Math.max(0,(hoverPh[hid2]||0)-fdt*2.2);
      }
    }
  }
  hits=[];placed=[];
  var cands=[];
  for(var ni=0;ni<NODES.length;ni++){
    var n=NODES[ni],nx,ny;
    if(n.kind==='now'){nx=ox;ny=oy;}
    else if(n.side==='above'){nx=SXT[n.idx];ny=SYT[n.idx];}
    else{nx=SXR[n.idx];ny=SYR[n.idx];}
    if(nx<-30||nx>W+30||ny<-30||ny>H+30)continue;
    var la=1;
    if(n.kind==='project')la=ss(0.3*LV,0.7*LV,Math.abs(pe))*(1-ss(0.3,0.5,Math.abs(ny-H/2)/H));
    if(n.kind==='now')la=1-hoL;
    /* each side's nodes fade out while you are on the other side of the horizon */
    var sideA=n.side==='below'?ss(-0.45*LV,0.1*LV,pe):(n.side==='above'?1-ss(-0.1*LV,0.45*LV,pe):1);
    if(sideA<0.02)continue;
    var ma=(n.kind==='project'?0.5+0.5*la:1)*sideA;
    la*=sideA;
    var active=(sel===n)||(sel&&sel.mirror===n.id);
    if(n.kind==='now')drawNow(n,nx,ny,t,dirSky,sel===n,1-hoL);
    else drawMarker(n,nx,ny,ma,active,t);
    if((n.kind!=='now'||hoL<0.7)&&sideA>0.4)hits.push({n:n,x:nx,y:ny});
    cands.push({n:n,x:nx,y:ny,a:la,pr:n.kind==='project'?1+Math.abs(ny-H/2)/H:0});
  }
  cands.sort(function(a,b){return a.pr-b.pr;});
  for(var ci=0;ci<cands.length;ci++){
    var cd=cands[ci];
    var forced=(hover===cd.n)||(sel===cd.n);
    if(cd.a<0.04&&!forced)continue;
    drawLabel(cd.n,cd.x,cd.y,forced?1:cd.a,forced,forced);
  }

  /* chrome */
  var wyTop=camY+(56-cy)/(Math.abs(sgn)<0.02?0.02:sgn*ky);
  var topSky=wyTop<0&&-wyTop<1700;
  var hs=topSky?COL.ink:COL.bone;
  if(hs!==hdrState){hdrState=hs;rootEl.style.setProperty('--hdr',hs);}
  var camP=camY>Y_BOT?camY-LP:camY;
  var rd=(camP<0?'ABOVE ':'BELOW ')+Math.round(Math.abs(camP));
  if(rd!==readState){readState=rd;elRead.textContent=rd;}
  var ho=hoL*(1-ss(0.2,0.8,fe));
  /* the mark straddles the horizon: upper half in ink on the sky, lower half in bone on the ground */
  hmark.style.transform='translate3d(0,'+(hy-hmH/2).toFixed(1)+'px,0)';
  hmark.style.opacity=hoL.toFixed(3);
  hmark.style.visibility=hoL<0.02?'hidden':'visible';
  elHero.style.opacity=ho.toFixed(3);
  elHero.style.visibility=ho<0.02?'hidden':'visible';
  elHero.style.transform='translateY('+(-(pe*KPX*0.5)).toFixed(1)+'px)';
  var wyC=camY+(H*0.82-cy)/(Math.abs(sgn)<0.02?0.02:sgn*ky);
  var cc2=(wyC<0&&-wyC<1700)?'s':'g';
  if(cc2!==chapState){chapState=cc2;rootEl.style.setProperty('--chap',cc2==='s'?COL.ink:COL.bone);rootEl.style.setProperty('--halo',cc2==='s'?COL.mist:COL.deep);}

  /* chapters: five fade in place, two (The Beyond and The Core) sit in the world either side of the seam */
  for(var ck=0;ck<CH.length;ck++){
    var chc=CH[ck];
    if(chc.kind==='fixed'){
      var cW=chc.c*LV,oc=ss(cW-0.5*LV,cW-0.2*LV,pe)*(1-ss(cW+(chc.oa!==undefined?chc.oa:0.2)*LV,cW+(chc.ob!==undefined?chc.ob:0.5)*LV,pe));
      chc.el.style.opacity=oc.toFixed(3);
      chc.el.style.visibility=oc<0.02?'hidden':'visible';
    }else{
      var edge=chc.kind==='top'?Y_TOP+SEAM_D:Y_BOT-SEAM_D;
      var kc=Math.round((camY-edge)/LP);
      var ty=sy(edge+kc*LP)-(chc.kind==='top'?chc.hh*fe:chc.hh*(1-fe));
      chc.el.style.transform='translate3d(0,'+ty.toFixed(1)+'px,0)';
      /* the text beside the mirrored marks fades out before it slides under the header buttons */
      var textFirst=(chc.kind==='bottom')!==(sgn<0),tb=textFirst?ty+chc.hh-(wmTop?wmTop.offsetHeight:90)-24:ty+chc.hh,tOp=ss(hdrB-14,hdrB+26,tb).toFixed(3);
      if(chc.txt.style.opacity!==tOp)chc.txt.style.opacity=tOp;
      chc.el.style.visibility=(ty+chc.hh>-40&&ty<H+40)?'visible':'hidden';
    }
  }
  var tTop='scaleY('+sgn.toFixed(3)+')',tBot='scaleY('+(-sgn).toFixed(3)+')';
  if(wmTop&&tTop!==tfTop){tfTop=tTop;wmTop.style.transform=tTop;}
  if(wmBot&&tBot!==tfBot){tfBot=tBot;wmBot.style.transform=tBot;}
  if((sgn<0)!==flipState){flipState=sgn<0;document.body.setAttribute('data-flip',flipState?'1':'0');hmark.classList.toggle('flip',flipState);}
}

/* ---------- interaction ---------- */
function hitAt(px,py){
  var best=null,bd=22*22;
  for(var i=0;i<hits.length;i++){var dx=hits[i].x-px,dy=hits[i].y-py,dd=dx*dx+dy*dy;if(dd<bd){bd=dd;best=hits[i];}}
  return best;
}
cv.addEventListener('pointermove',function(e){var h=hitAt(e.clientX,e.clientY);hover=h?h.n:null;cv.style.cursor=h?'pointer':'default';});
cv.addEventListener('pointerleave',function(){hover=null;});
cv.addEventListener('click',function(e){var h=hitAt(e.clientX,e.clientY);if(h)openNode(h.n,false);});

function goTo(n){
  var wy=n.kind==='now'?0:(n.side==='above'?RY[n.idx]:RYR[n.idx]);
  var best=WA,bd=1e9,i,p,d;
  for(i=0;i<=400;i++){p=WA+PW*i/400;camAt(p);d=Math.abs(camYv-wy);if(d<bd){bd=d;best=p;}}
  /* the nearest copy of that place along the endless track */
  var wCur=dir*(sc/KPX)+off;
  var wT=best+Math.round((wCur-best)/PW)*PW;
  var s=(wT-off)*dir*KPX;
  while(s<LO)s+=PER;
  while(s>HI)s-=PER;
  window.scrollTo({top:s,behavior:reduce?'auto':'smooth'});
}
function resolveMedia(m){
  /* returns {type:'image'|'youtube'|'vimeo', src:string} or null */
  if(!m)return null;
  var yt=m.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if(yt)return{type:'youtube',src:'https://www.youtube-nocookie.com/embed/'+yt[1]+'?rel=0'};
  var vm=m.match(/vimeo\.com\/(\d+)/);
  if(vm)return{type:'vimeo',src:'https://player.vimeo.com/video/'+vm[1]};
  if(/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(m))return{type:'image',src:m};
  /* bare URL with no recognised extension — treat as image */
  return{type:'image',src:m};
}
function openNode(n,nav){
  sel=n;
  pKick.textContent=n.kicker;pTitle.textContent=n.name;pText.textContent=n.text;
  if(n.mirror==null){pMirror.hidden=true;}
  else{pMirror.hidden=false;pMirror.textContent=n.side==='above'?'See what grew below':'See the work above';}
  if(n.url){pLink.hidden=false;pLink.href=n.url;pLink.textContent=(n.linkLabel||'View project')+' ↗';}
  else{pLink.hidden=true;}
  /* last-updated line: only for the now node */
  var upStr=n.kind==='now'?fmtUpdated(n.lastUpdated):null;
  if(upStr){pUpdated.textContent=upStr;pUpdated.hidden=false;}
  else{pUpdated.hidden=true;}
  /* media */
  var med=resolveMedia(n.media);
  if(med){
    pMedia.hidden=false;
    if(med.type==='image'){
      pImg.src=med.src;pImg.hidden=false;pVid.src='';pVid.hidden=true;
    } else {
      pVid.src=med.src;pVid.title=n.name;pVid.hidden=false;pImg.src='';pImg.hidden=true;
    }
  } else {
    pMedia.hidden=true;pImg.src='';pVid.src='';pImg.hidden=true;pVid.hidden=true;
  }
  panel.hidden=false;document.body.classList.add('has-panel');
  if(nav)goTo(n);
}
function closePanel(){
  sel=null;panel.hidden=true;document.body.classList.remove('has-panel');
  pVid.src=''; /* stop video playback */
}
pClose.addEventListener('click',closePanel);
pMirror.addEventListener('click',function(){if(sel&&sel.mirror!=null)openNode(NODES[sel.mirror],true);});

var btnFlip=document.getElementById('btnFlip');
btnFlip.addEventListener('click',function(){
  /* keep the same place in the world, mirror the view, and reverse the scroll direction */
  var wCur=dir*(sc/KPX)+off;
  flT=flT?0:1;dir=flT?-1:1;
  off=wCur-dir*(sc/KPX);
  btnFlip.setAttribute('aria-pressed',flT?'true':'false');
  elCue.textContent=flT?'Scroll to climb':'Scroll to descend';
});

var idxSearch=document.getElementById('idxSearch');
var idxEmpty=document.getElementById('idxEmpty');
function buildIndex(){
  var up=document.getElementById('idxAbove'),dn=document.getElementById('idxBelow');
  NODES.forEach(function(n){
    var li=document.createElement('li'),b=document.createElement('button');
    b.type='button';b.className='idx-item';
    var t=document.createElement('span');t.className='t';t.textContent=n.name;
    var k=document.createElement('span');k.className='k';k.textContent=n.kicker;
    b.appendChild(t);b.appendChild(k);li.appendChild(b);
    li.dataset.search=(n.name+' '+n.kicker).toLowerCase();
    b.addEventListener('click',function(){idx.hidden=true;idxSearch.value='';filterIndex('');openNode(n,true);});
    (n.side==='below'?dn:up).appendChild(li);
  });
}
function filterIndex(q){
  q=q.toLowerCase().trim();
  var items=idx.querySelectorAll('li[data-search]');
  var shown=0;
  items.forEach(function(li){
    var match=!q||li.dataset.search.indexOf(q)!==-1;
    li.hidden=!match;
    if(match)shown++;
  });
  idxEmpty.hidden=shown>0;
}
buildIndex();
document.getElementById('btnIndex').addEventListener('click',function(){
  idx.hidden=false;idxSearch.value='';filterIndex('');idxSearch.focus();
});
document.getElementById('idxClose').addEventListener('click',function(){idx.hidden=true;idxSearch.value='';filterIndex('');});
idxSearch.addEventListener('input',function(){filterIndex(idxSearch.value);});
idxSearch.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    if(idxSearch.value){idxSearch.value='';filterIndex('');e.stopPropagation();}
    /* else let the outer keydown handler close the index */
  }
});
/* level centres in world-position order (Beyond → Core) */
var LEVELS=[-2.5*LV,-2*LV,-LV,0,LV,2*LV,2.75*LV];
function goToLevel(targetPe){
  /* convert a target pe into a scroll position and smooth-scroll there */
  var wCur=dir*(sc/KPX)+off;
  var wT=targetPe+Math.round((wCur-targetPe)/PW)*PW;
  var s=(wT-off)*dir*KPX;
  while(s<LO)s+=PER;
  while(s>HI)s-=PER;
  window.scrollTo({top:s,behavior:reduce?'auto':'smooth'});
}
document.addEventListener('keydown',function(e){
  /* don't intercept when typing in an input or when a dialog is fully open */
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
  if(e.key==='Escape'){
    if(!idx.hidden){idx.hidden=true;return;}
    if(!panel.hidden){closePanel();return;}
  }
  if(!idx.hidden)return; /* let the index handle its own focus */
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();
    /* find the level we're closest to, then step one in the pressed direction */
    var step=e.key==='ArrowDown'?1:-1;
    var closest=0,cd2=1e9;
    for(var li2=0;li2<LEVELS.length;li2++){
      var d2=Math.abs(peG-LEVELS[li2]);if(d2<cd2){cd2=d2;closest=li2;}
    }
    var next=Math.max(0,Math.min(LEVELS.length-1,closest+step));
    goToLevel(LEVELS[next]);
  }
  if(e.key==='Enter'&&panel.hidden){
    /* open the node closest to the screen centre */
    if(hits.length===0)return;
    var bestH=null,bestD=1e9;
    for(var hi2=0;hi2<hits.length;hi2++){
      var dx=hits[hi2].x-W/2,dy=hits[hi2].y-H/2,d3=dx*dx+dy*dy;
      if(d3<bestD){bestD=d3;bestH=hits[hi2];}
    }
    if(bestH)openNode(bestH.n,false);
  }
});

window.addEventListener('resize',layout);
layout();
try{if('scrollRestoration' in history)history.scrollRestoration='manual';}catch(e){}
var initPe=0;
(function(){
  var hmap={beyond:-2.5*LV,sky:-1.5*LV,branches:-0.75*LV,horizon:0,roots:LV,deep:2*LV,core:2.75*LV};
  var h=(location.hash||'').replace('#','').toLowerCase();
  /* also support node slugs: #node-interfaces, #node-automation, etc. */
  if(h.indexOf('node-')===0){
    var slug=h.slice(5);
    for(var ni=0;ni<NODES.length;ni++){
      if(NODES[ni].name.toLowerCase().replace(/\s+/g,'-')===slug){initPe=NODES[ni].side==='above'?-LV:LV;break;}
    }
  } else if(hmap[h]!==undefined){
    initPe=hmap[h];
  }
})();
var initS=(initPe-off)*dir*KPX+NP/2*PER;
window.scrollTo(0,initS);
sc=window.scrollY;off=-dir*(sc/KPX)+initPe;ready=true;
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(measureSeams);
requestAnimationFrame(frame);
})();
