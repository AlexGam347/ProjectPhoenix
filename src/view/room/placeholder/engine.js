/* Motor mínimo de perspectiva de un punto para los bocetos de sala.
   Cámara en el origen mirando +z. x: derecha, y: arriba (suelo = 0), z: profundidad (m). */
// Motor de perspectiva del dossier (engine.js), adaptado como arte provisional del juego.
// Sin etiquetas de diagrama: marker() y banner() no dibujan nada.
export const SB = (function(){
let F=560; const SW=960, SH=540, CX=480, CY=280, EYE=1.6, ZN=0.9;
const setF=v=>{F=v;};
const P=(x,y,z)=>[CX+F*x/z, CY-F*(y-EYE)/z];
const f1=v=>Math.round(v*10)/10;
const pts=a=>a.map(p=>P(...p).map(f1).join(',')).join(' ');
function hex(h){h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.substr(i,2),16));}
function shade(h,k){ // k>0 aclara, k<0 oscurece
  const c=hex(h).map(v=>k>=0? v+(255-v)*k : v*(1+k));
  return '#'+c.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
const OL='stroke="rgba(10,16,24,.45)" stroke-width=".8" stroke-linejoin="round"';
const poly=(a,fill,extra='')=>`<polygon points="${pts(a)}" fill="${fill}" ${extra}/>`;
function box(x0,x1,y0,y1,z0,z1,col,o={}){
  const ol=o.noline?'':OL; let s='';
  if(y1<EYE) s+=poly([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],o.top||shade(col,.28),ol);
  if(y0>EYE) s+=poly([[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],shade(col,-.3),ol);
  if(x0>0) s+=poly([[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]],o.side||shade(col,-.22),ol);
  if(x1<0) s+=poly([[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0]],o.side||shade(col,-.22),ol);
  s+=poly([[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]],o.front||col,ol);
  return s;
}
// rectángulo en la cara frontal de un objeto o en la pared del fondo (plano z)
const fz=(x0,x1,y0,y1,z,fill,extra='')=>poly([[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]],fill,extra);
// rectángulo en pared lateral (plano x)
const fx=(x,z0,z1,y0,y1,fill,extra='')=>poly([[x,y0,z0],[x,y0,z1],[x,y1,z1],[x,y1,z0]],fill,extra);
// rectángulo en suelo/techo (plano y)
const fy=(y,x0,x1,z0,z1,fill,extra='')=>poly([[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]],fill,extra);
const line=(a,b,stroke,w=1,extra='')=>{const p=P(...a),q=P(...b);return `<line x1="${f1(p[0])}" y1="${f1(p[1])}" x2="${f1(q[0])}" y2="${f1(q[1])}" stroke="${stroke}" stroke-width="${w}" ${extra}/>`;};
function cyl(x,z,r,y0,y1,col,id){
  const [sx,sb]=P(x,y0,z), st=P(x,y1,z)[1], rx=F*r/z;
  const k=y=>Math.max(.07,Math.min(.45,Math.abs(EYE-y)/z*.9))*rx;
  let s=`<ellipse cx="${f1(sx)}" cy="${f1(sb)}" rx="${f1(rx)}" ry="${f1(k(y0))}" fill="${shade(col,-.25)}" ${OL}/>`;
  s+=`<rect x="${f1(sx-rx)}" y="${f1(st)}" width="${f1(2*rx)}" height="${f1(sb-st)}" fill="${col}"/>`;
  s+=`<rect x="${f1(sx-rx)}" y="${f1(st)}" width="${f1(2*rx)}" height="${f1(sb-st)}" fill="url(#${id}-cs)"/>`;
  s+=`<line x1="${f1(sx-rx)}" y1="${f1(st)}" x2="${f1(sx-rx)}" y2="${f1(sb)}" stroke="rgba(10,16,24,.45)" stroke-width=".8"/><line x1="${f1(sx+rx)}" y1="${f1(st)}" x2="${f1(sx+rx)}" y2="${f1(sb)}" stroke="rgba(10,16,24,.45)" stroke-width=".8"/>`;
  if(y1<EYE) s+=`<ellipse cx="${f1(sx)}" cy="${f1(st)}" rx="${f1(rx)}" ry="${f1(k(y1))}" fill="${shade(col,.3)}" ${OL}/>`;
  else s+=`<ellipse cx="${f1(sx)}" cy="${f1(st)}" rx="${f1(rx)}" ry="${f1(k(y1))}" fill="${shade(col,-.35)}" ${OL}/>`;
  return s;
}
function sphere(x,y,z,r,col,id){
  const [sx,sy]=P(x,y,z), rr=F*r/z;
  return `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(rr)}" fill="${col}" ${OL}/><circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(rr)}" fill="url(#${id}-sp)"/>`;
}
function defs(id){
  return `<defs>
  <linearGradient id="${id}-cs" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".38" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
  <radialGradient id="${id}-sp" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
  <radialGradient id="${id}-alarm"><stop offset="0" stop-color="#ff4a3d" stop-opacity=".95"/><stop offset=".35" stop-color="#ff3a2d" stop-opacity=".45"/><stop offset="1" stop-color="#ff3a2d" stop-opacity="0"/></radialGradient>
  <radialGradient id="${id}-glow"><stop offset="0" stop-color="#9cc8ff" stop-opacity=".5"/><stop offset="1" stop-color="#9cc8ff" stop-opacity="0"/></radialGradient>
  </defs>`;
}
// Carcasa de sala: suelo con juntas, techo con luminarias, paredes con paneles
function shell(o){
  const w=o.w/2, h=o.h, d=o.d, pal=o.pal; let s='';
  s+=fy(0,-w,w,ZN,d,pal.floor);
  for(let i=1;i<o.w/1.2;i++){const x=-w+i*1.2; s+=line([x,0,ZN+.6],[x,0,d],'rgba(0,0,0,.18)',1);}
  for(let z=2;z<d;z+=1.5) s+=line([-w,0,z],[w,0,z],'rgba(0,0,0,.14)',1);
  s+=fy(h,-w,w,ZN,d,pal.ceil);
  for(let z=1.5;z<d;z+=1.6) s+=line([-w,h,z],[w,h,z],'rgba(0,0,0,.12)',1);
  s+=fx(-w,ZN,d,0,h,pal.wallL)+fx(w,ZN,d,0,h,pal.wallR);
  [2,3.5,5,6.5,8,9.5].filter(z=>z<d).forEach(z=>{s+=line([-w,0,z],[-w,h,z],'rgba(0,0,0,.16)',1)+line([w,0,z],[w,h,z],'rgba(0,0,0,.16)',1);});
  s+=line([-w,1,ZN],[-w,1,d],'rgba(0,0,0,.18)',1.2)+line([w,1,ZN],[w,1,d],'rgba(0,0,0,.18)',1.2);
  s+=fz(-w,w,0,h,d,pal.back);
  s+=fx(-w+.01,ZN,d,0,.18,shade(pal.wallL,-.35))+fx(w-.01,ZN,d,0,.18,shade(pal.wallR,-.35))+fz(-w,w,0,.18,d-.01,shade(pal.back,-.35));
  // bandejas de cables y conducciones en el encuentro techo-pared
  s+=box(-w,-w+.35,h-.45,h-.25,ZN,d,'#8A939C',{noline:true})+box(w-.35,w,h-.45,h-.25,ZN,d,'#8A939C',{noline:true});
  s+=line([-w+.1,h-.65,ZN],[-w+.1,h-.65,d],'#5E86A8',3)+line([w-.1,h-.65,ZN],[w-.1,h-.65,d],'#B0703A',3);
  const lw=o.lampW||.3; if(o.lights!==false) for(const x of (o.lightX||[-1.6,1.6])) s+=fy(h-.01,x-lw,x+lw,3,d-.6,o.lightCol||'#F4F7FA','class="lamp"');
  return s;
}
// Ventanal en la pared del fondo con contenido detrás (z > d)
function win(id,x0,x1,y0,y1,d,content,o={}){
  const cp=`${id}-w${Math.round(x0*10)}`;
  let s=`<clipPath id="${cp}"><polygon points="${pts([[x0,y0,d],[x1,y0,d],[x1,y1,d],[x0,y1,d]])}"/></clipPath>`;
  s+=`<g clip-path="url(#${cp})">${content}<polygon points="${pts([[x0,y0,d],[x1,y0,d],[x1,y1,d],[x0,y1,d]])}" fill="rgba(175,210,240,.10)"/></g>`;
  const n=o.mull||3, fr=o.frame||'#3A434C';
  for(let i=1;i<n;i++){const x=x0+(x1-x0)*i/n; s+=line([x,y0,d],[x,y1,d],fr,4);}
  s+=`<polygon points="${pts([[x0,y0,d],[x1,y0,d],[x1,y1,d],[x0,y1,d]])}" fill="none" stroke="${fr}" stroke-width="7"/>`;
  s+=fz(x0-.05,x1+.05,y0-.12,y0,d-.02,'#56606A');
  return s;
}
function marker(){ return ''; }
function banner(){ return ''; }
function night(id,holes,extra){ // capa nocturna con huecos para pantallas encendidas
  let m=`<mask id="${id}-nm"><rect width="${SW}" height="${SH}" fill="#fff"/>${holes.map(h=>h.replace(/fill="[^"]*"/,'fill="#000"')).join('')}</mask>`;
  return `<g class="nt">${m}<rect width="${SW}" height="${SH}" fill="#050b1c" fill-opacity=".62" mask="url(#${id}-nm)"/>${extra}</g>`;
}
function alarm(p,r=70,id){const [x,y]=p.length===3?P(...p):p;return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="url(#${id}-alarm)"/>`;}
function svgWrap(id,label,body){
  return `<svg viewBox="0 0 ${SW} ${SH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">${defs(id)}<rect width="${SW}" height="${SH}" fill="#20262d"/>${body}</svg>`;
}

/* Robot YANA: dibujo 2D (vista frontal tres cuartos) */
function ari(state){
  const lightC={ok:'#3FBF6A',hint:'#E8AE3A',alarm:'#E5483D',party:'#6F8FFF'}[state||'ok'];
  return `<g>
  <rect x="-58" y="58" width="116" height="10" rx="5" fill="#3B4450"/>
  <path d="M-52,60 L-30,40 L0,58 L30,40 L52,60" fill="none" stroke="#5B6672" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  ${[-52,0,52].map(x=>`<circle cx="${x}" cy="66" r="15" fill="#2E353D"/><circle cx="${x}" cy="66" r="6" fill="#8A96A3"/>`).join('')}
  <rect x="-44" y="-6" width="88" height="50" rx="7" fill="#E9EDF1" stroke="#7D8894" stroke-width="2"/>
  <rect x="-36" y="2" width="30" height="16" rx="2" fill="#C9D1D9"/><rect x="2" y="2" width="34" height="6" rx="2" fill="#C9D1D9"/><rect x="2" y="12" width="34" height="6" rx="2" fill="#C9D1D9"/>
  <circle cx="28" cy="32" r="5.5" fill="${lightC}"/><text x="-36" y="36" font-family="IBM Plex Mono,monospace" font-size="9" font-weight="600" fill="#4A5561">YANA</text>
  <rect x="-5" y="-62" width="10" height="58" fill="#9AA5B1" stroke="#6C7783" stroke-width="1.5"/>
  <rect x="-34" y="-104" width="68" height="44" rx="8" fill="#E9EDF1" stroke="#7D8894" stroke-width="2"/>
  <rect x="-24" y="-96" width="48" height="26" rx="4" fill="#0F1B28"/>
  <circle cx="-10" cy="-85" r="4" fill="#7FD3FF"/><circle cx="10" cy="-85" r="4" fill="#7FD3FF"/><path d="M-8,-76 Q0,-71 8,-76" fill="none" stroke="#7FD3FF" stroke-width="2.2" stroke-linecap="round"/>
  <rect x="-30" y="-118" width="22" height="14" rx="3" fill="#4A5561"/><circle cx="-19" cy="-111" r="4.5" fill="#1A2530" stroke="#9AA5B1"/>
  <rect x="8" y="-118" width="22" height="14" rx="3" fill="#4A5561"/><circle cx="19" cy="-111" r="4.5" fill="#1A2530" stroke="#9AA5B1"/>
  <path d="M44,8 L72,-8 L92,14" fill="none" stroke="#9AA5B1" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="72" cy="-8" r="5" fill="#6C7783"/>
  <path d="M90,12 L100,26 M94,10 L106,18" stroke="#6C7783" stroke-width="4" stroke-linecap="round"/>
  </g>`;
}
function ariFigure(){
  const lab=(x,y,ty,t)=>`<line x1="${x}" y1="${y}" x2="256" y2="${ty}" style="stroke:var(--muted)" stroke-width="1"/><circle cx="${x}" cy="${y}" r="2.5" style="fill:var(--muted)"/><text x="262" y="${ty+4}" font-family="IBM Plex Sans,sans-serif" font-size="13" style="fill:var(--ink)">${t}</text>`;
  return `<svg viewBox="0 0 420 330" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(120,190) scale(1.1)">${ari('ok')}</g>
  ${lab(141,68,46,'2 cámaras en el mástil')}
  ${lab(146,99,98,'pantalla de expresiones')}
  ${lab(232,216,190,'pinza (tipo Robonaut 2)')}
  ${lab(151,225,248,'luz de estado')}
  ${lab(186,276,304,'ruedas tipo Curiosity')}
  </svg>`;
}
return {SW,SH,setF,EYE,ZN,P,pts,poly,box,fz,fx,fy,line,cyl,sphere,shell,win,marker,banner,night,alarm,svgWrap,shade,ari,ariFigure};
})();
