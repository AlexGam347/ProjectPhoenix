import { SB } from './engine.js';
/* Bocetos de las salas desde su cámara fija (dossier, rooms.js). Capas: .up (mejoras), .base-only (huecos vacíos), .nt (noche + avería). */
(function(){
const {P,box,fz,fx,fy,line,cyl,sphere,shell,win,marker,banner,night,alarm,svgWrap,shade,ari}=SB;
const r1=v=>Math.round(v*10)/10;
const TXT=(p,t,size,fill='#fff',anchor='middle',w=600)=>{const [x,y]=p.length===3?P(...p):p;return `<text x="${r1(x)}" y="${r1(y)}" font-family="IBM Plex Mono,monospace" font-size="${size}" font-weight="${w}" fill="${fill}" text-anchor="${anchor}">${t}</text>`;};
const DASH='stroke="#FFFFFF" stroke-opacity=".85" stroke-width="2" stroke-dasharray="7 5"';
const COL={agua:'#2A86DE',oxi:'#14A8A8',com:'#46A040',ene:'#E3A42A'};
const night2=(t,sub)=>`<g transform="translate(0,62)">${banner(t,sub,'#7A1F1A')}</g>`;
function bars(x0,x1,y0,y1,z,vals){ // panel con 4 barras sobre un plano z
  let s=fz(x0,x1,y0,y1,z,'#0B1622');
  const cs=[COL.agua,COL.oxi,COL.com,COL.ene], n=4, gap=(y1-y0)/(n*2+1);
  cs.forEach((c,i)=>{const yb=y1-gap*(1+i*2), yt=yb-gap; s+=fz(x0+.08,x0+.08+(x1-x0-.16)*vals[i],yt,yb,z-.001,c);});
  return s;
}
function door(x,z0,z1,col,label,id){
  const s=Math.sign(x), xi=x-s*.01; let o='';
  o+=fx(xi,z0-.12,z1+.12,0,2.55,col)+fx(xi-s*.005,z0,z1,0,2.4,'#77818B');
  o+=fx(xi-s*.01,z0+.15,z1-.15,1.3,2.1,'#2F3943')+SB.line([xi-s*.01,1.25,(z0+z1)/2],[xi-s*.01,.1,(z0+z1)/2],'#4F5963',1.5);
  o+=fx(xi,z0,z1,2.7,3.05,col);
  const c=P(x,2.86,(z0+z1)/2), fs=Math.max(8,Math.min(12,6+40/((z0+z1)/2)));
  o+=TXT([c[0],c[1]+fs*.35],label,fs);
  o+=`<circle cx="${r1(P(x,2.47,(z0+z1)/2)[0])}" cy="${r1(P(x,2.47,(z0+z1)/2)[1])}" r="3.5" fill="#46D27A"/>`;
  return o;
}
SB.scenes={};

/* ---------------- 1 · CONTROL ---------------- */
SB.scenes.control=function(){
  const id='c1'; SB.setF(480); const d=12,w=14,h=4.8; let s='';
  s+=`<defs><radialGradient id="c1-earth" cx=".62" cy=".38" r=".75"><stop offset="0" stop-color="#A8D6FF"/><stop offset=".5" stop-color="#2F74C0"/><stop offset="1" stop-color="#0B2550"/></radialGradient></defs>`;
  s+=shell({w,h,d,pal:{floor:'#57606B',ceil:'#B4BCC4',wallL:'#A7B0B9',wallR:'#9DA6AF',back:'#BBC3CB'},lightX:[-2.4,2.4],lampW:.22});
  // pantalla Tierra
  s+=fz(-3.95,3.95,1.18,4.32,d-.02,'#262D34');
  const scr=fz(-3.8,3.8,1.3,4.2,d-.03,'#03060B'); s+=scr;
  const [ex,ey]=P(.4,2.75,d), er=r1(480*.92/d);
  s+=`<clipPath id="c1-ec"><circle cx="${r1(ex)}" cy="${r1(ey)}" r="${er}"/></clipPath>`;
  s+=`<g clip-path="url(#c1-ec)"><circle cx="${r1(ex)}" cy="${r1(ey)}" r="${er}" fill="url(#c1-earth)"/>`;
  [[-.3,-.4,.5,.12],[.2,.1,.6,.1],[-.1,.5,.45,.1],[.4,-.2,.3,.09]].forEach(([a,b,rx,ry])=>s+=`<ellipse cx="${r1(ex+a*er)}" cy="${r1(ey+b*er)}" rx="${r1(rx*er)}" ry="${r1(ry*er)}" fill="#fff" opacity=".75"/>`);
  s+=`<circle cx="${r1(ex-er*.62)}" cy="${r1(ey)}" r="${r1(er*1.02)}" fill="#03060B" opacity=".9"/></g>`;
  s+=`<circle cx="${r1(ex+er*1.9)}" cy="${r1(ey-er*.7)}" r="${r1(er*.27)}" fill="#A9AFB5"/><circle cx="${r1(ex+er*1.9-er*.17)}" cy="${r1(ey-er*.7)}" r="${r1(er*.27)}" fill="#03060B" opacity=".85"/>`;
  s+=TXT(P(-3.6,3.95,d),'TIERRA · imagen de hace 12 min',11,'#7FD3FF','start',500);
  s+=TXT(P(-3.6,1.48,d),'TELESCOPIO · CÚPULA SUPERIOR',9.5,'#5D7D99','start',500);
  // monitores laterales con las 4 barras
  const m1=bars(-5.9,-4.35,1.75,2.85,d-.03,[.8,.7,.45,.6]), m2=bars(4.35,5.9,1.75,2.85,d-.03,[.8,.7,.45,.6]);
  s+=m1+m2;
  // puertas: izquierda Energía (cerca) y Agua (lejos); derecha Invernadero y Oxígeno
  s+=door(-7,7.6,8.7,COL.ene,'ENERGÍA',id)+door(-7,9.8,10.9,COL.agua,'AGUA',id);
  s+=door(7,7.6,8.7,COL.com,'INVERNADERO',id)+door(7,9.8,10.9,COL.oxi,'OXÍGENO',id);
  // terminal del catálogo
  s+=box(-5.4,-4.5,0,1.15,6.6,7.2,'#66707B',{front:'#4E5862'});
  const cat=fz(-5.3,-4.6,.66,1.06,6.59,'#0E2A3E'); s+=cat+TXT(P(-4.95,.9,6.59),'CATÁLOGO',7.5,'#9FD6FF');
  // consola principal
  s+=box(-3.2,3.2,0,.8,4.9,5.7,'#5A6470',{top:'#3B434C'});
  const MX=[[-2.6,-1.5],[-.55,.55],[1.5,2.6]];
  s+=MX.map(([a,b])=>box(a,b,.8,1.36,5.35,5.42,'#2A3139',{front:'#0D1E2D'})).join('');
  const monFronts=MX.map(([a,b])=>bars(a+.06,b-.06,.86,1.3,5.349,[.8,.7,.45,.6]));
  s+=monFronts.join('');
  // YANA en su base de carga
  const g=P(4.3,0,4.9), sc=.55; s+=`<ellipse cx="${r1(g[0])}" cy="${r1(g[1])}" rx="60" ry="9" fill="#2C333B" opacity=".55"/>`;
  s+=`<g transform="translate(${r1(g[0])},${r1(g[1]-81*sc)}) scale(${sc})">${ari('ok')}</g>`;
  // mejoras
  s+=`<g class="base-only">${fz(4.5,6.4,3.15,4.05,d-.035,'none',DASH)}${TXT(P(5.45,3.5,d),'Blindaje',11)}</g>`;
  s+=`<g class="up">${fz(4.5,6.4,3.15,4.05,d-.035,'#0B1622')}<ellipse cx="${r1(P(5.45,3.6,d)[0])}" cy="${r1(P(5.45,3.6,d)[1])}" rx="16" ry="11" fill="none" stroke="#F0A040" stroke-width="3"/><ellipse cx="${r1(P(5.45,3.6,d)[0])}" cy="${r1(P(5.45,3.6,d)[1])}" rx="7" ry="5" fill="#F0A040"/>${TXT(P(5.45,3.27,d),'BLINDAJE ACTIVO',5.5,'#9FE0A0','middle',500)}
    ${marker(P(5.45,4.35,d),'Blindaje','u')}</g>`;
  s+=banner('C1 · SALA DE CONTROL','Cámara fija · lo primero que ve el jugador');
  s+=marker(P(0,4.5,d),'1','b')+marker(P(0,1.75,5.3),'2','b')+marker(P(-4.95,1.5,6.9),'3','b')+marker([g[0],g[1]-125],'4','b')+marker(P(-7,3.35,10.3),'5','b');
  { // Noche 4: tormenta solar (clímax). Luces rojas de emergencia, pantalla sin señal, barras bajando.
    const sp=SB.pts([[-3.8,1.3,d-.04],[3.8,1.3,d-.04],[3.8,4.2,d-.04],[-3.8,4.2,d-.04]]);
    let noise=''; for(let i=0;i<46;i++){const y=1.35+i*0.062; noise+=SB.line([-3.75,y,d-.05],[3.75,y,d-.05],i%3?'#3A4048':'#8A929B',2.2);}
    const lamps=[-2.4,2.4].map(x=>fy(h-.03,x-.22,x+.22,3,d-.6,'#FF2A1F')).join('');
    const beacons=[[-7,2.47,8.15],[-7,2.47,10.35],[7,2.47,8.15],[7,2.47,10.35]].map(p=>alarm(p,46,id)+`<circle cx="${r1(P(...p)[0])}" cy="${r1(P(...p)[1])}" r="4.5" fill="#FF4A3D"/>`).join('');
    const dark=`<g opacity=".75">${MX.map(([a,b])=>fz(a+.06,b-.06,.86,1.3,5.348,'#2A0A08')).join('')}</g>`;
    s+=night(id,[],`<rect width="960" height="540" fill="#C21E12" opacity=".22"/>${lamps}<polygon points="${sp}" fill="#14181D"/>${noise}`+TXT(P(0,2.75,d),'SIN SEÑAL',22,'#FF6A5E')+TXT(P(0,2.35,d),'tormenta solar · comunicaciones caídas',10,'#C9CFD6','middle',500)+dark+beacons
      +night2('NOCHE 4 · TORMENTA SOLAR','Todo en rojo: reinicia las salas mientras bajan las barras')+marker(P(-7,1.4,10.35),'!','h')+marker(P(7,1.4,10.35),'!','h'));
  }
  return svgWrap(id,'Boceto de la Sala de Control',s);
};

/* ---------------- 2 · AGUA ---------------- */
function hall(o){ // nave detrás del ventanal
  let s=fy(0,-o.w,o.w,o.z0,o.z1,o.floor)+fy(o.h,-o.w,o.w,o.z0,o.z1,o.ceil)+fx(-o.w,o.z0,o.z1,0,o.h,o.wall)+fx(o.w,o.z0,o.z1,0,o.h,shade(o.wall,-.1))+fz(-o.w,o.w,0,o.h,o.z1,shade(o.wall,.08));
  for(let z=o.z0+3;z<o.z1;z+=5) s+=fy(o.h-.02,-o.w*.5,-o.w*.5+1.2,z,z+1.6,'#E9F0F5')+fy(o.h-.02,o.w*.5-1.2,o.w*.5,z,z+1.6,'#E9F0F5');
  return s;
}
SB.scenes.agua=function(){
  const id='c2'; SB.setF(560); const d=12,w=12,h=4.6; let s='';
  s+=shell({w,h,d,pal:{floor:'#5E6670',ceil:'#B7C0C8',wallL:'#AFB9C2',wallR:'#A5AFB8',back:'#BDC6CE'}});
  let H=hall({w:16,h:12,z0:12,z1:48,floor:'#65707A',ceil:'#7B8690',wall:'#8E99A3'});
  [[-5,38,1.9,9],[5.5,38,1.9,9],[-8,24,1.7,8],[0.5,27,1.9,9],[8,24,1.7,8]].forEach(([x,z,r,hh])=>H+=cyl(x,z,r,0,hh,'#2F6FB0',id));
  H+=SB.line([-16,10,20],[16,10,20],'#5E86A8',5)+SB.line([-16,10.6,30],[16,10.6,30],'#5E86A8',4);
  H+=`<g class="up">${box(-2.6,-1.1,0,1.1,13.5,34,'#6B5A47')}${[15,19,23,27,31].map(z=>box(-2.4,-1.4,1.1,1.5,z,z+.9,'#DDEEFF')).join('')}${box(-12,-9.5,0,11,32,34.5,'#B57D3C')}${SB.line([-12,11,32],[-9.5,0,32],'#7E5427',3)}${SB.line([-9.5,11,32],[-12,0,32],'#7E5427',3)}</g>`;
  H+=`<g class="up">${[[-3.2,16.5],[3.4,16.5]].map(([x,z])=>cyl(x,z,1.3,0,6,'#3A86CF',id)).join('')}</g>`;
  s+=win(id,-4.2,4.2,.9,3.9,d,H,{mull:3});
  s+=SB.line([-6,4.05,d-.02],[6,4.05,d-.02],'#5E86A8',6)+SB.line([5.98,3.0,7],[5.98,3.0,d],'#5E86A8',5)+SB.line([5.98,3.4,7],[5.98,3.4,d],'#5E86A8',5);
  // fundidor de hielo
  s+=box(-4.9,-2.3,0,1.7,7.0,8.8,'#7C8792')+box(-4.5,-2.7,1.7,2.35,7.4,8.4,'#68737E');
  const heat=fz(-4.3,-2.9,.55,1.05,6.99,'#FF8A3C'); s+=heat+fz(-4.3,-2.9,1.25,1.5,6.99,'#D9DEE3')+TXT(P(-3.6,1.33,6.99),'FUNDIDOR',8,'#2A333C');
  s+=SB.line([-3.6,2.35,7.9],[-3.6,4.05,d],'#5E86A8',5);
  // filtro
  s+=cyl(1.1,9.2,.4,0,1.9,'#8FA9C0',id)+SB.line([1.1,1.9,9.2],[1.1,4.05,d],'#5E86A8',4);
  s+=`<g class="base-only">${fy(.01,2.5,4.4,6.0,7.0,'none',DASH)}${TXT(P(3.45,.05,6.5),'P2',14)}</g>`;
  s+=`<g class="up">${box(2.5,4.4,0,1.9,6.0,7.0,'#E3E8EC')}${fz(2.65,4.25,1.3,1.75,5.99,'#C7D0D8')}${fz(2.65,3.4,.25,1.15,5.99,'#B9C4CE')}${fz(3.5,4.25,.25,1.15,5.99,'#B9C4CE')}${TXT(P(3.45,1.47,5.99),'RECICLADOR',8,'#2A333C')}
    ${marker(P(-6.5,5.5,22),'P1','u')}${marker(P(3.45,2.3,6.0),'P2','u')}${marker(P(-3.2,4.6,16.5),'C1','u')}</g>`;
  s+=banner('C2 · PLANTA DE AGUA','Mirando al ventanal de los depósitos');
  s+=marker(P(-3.6,2.75,7.4),'1','b')+marker(P(1.1,2.35,9.2),'2','b')+marker(P(-2.2,3.4,d),'3','b');
  s+=night(id,[heat],alarm(P(1.1,1.0,9.2),60,id)+`<ellipse cx="${r1(P(1.1,.9,9.1)[0])}" cy="${r1(P(1.1,.9,9.1)[1])}" rx="20" ry="38" fill="#7A4A22" opacity=".6"/>`+night2('NOCHE · Avería: filtro sucio','Clic en el filtro → cartucho nuevo')+marker(P(1.1,2.35,9.2),'!','h'));
  return svgWrap(id,'Boceto de la Planta de Agua',s);
};

/* ---------------- 3 · OXÍGENO ---------------- */
SB.scenes.oxigeno=function(){
  const id='c3'; SB.setF(560); const d=12,w=12,h=4.6; let s='';
  s+=shell({w,h,d,pal:{floor:'#5C6769',ceil:'#B7C3C3',wallL:'#AEBDBD',wallR:'#A4B3B3',back:'#BCC9C9'}});
  let H=hall({w:16,h:13,z0:12,z1:50,floor:'#66716F',ceil:'#7B8888',wall:'#8E9C9C'});
  [[-1,4.4,40,3.4],[-8,3.8,30,3],[7,3.8,30,3],[-4,3.4,20,2.6],[4.5,3.4,20,2.6]].forEach(([x,y,z,r])=>{H+=box(x-.15,x+.15,0,y-r+.3,z,z+.3,'#59666A')+sphere(x,y,z,r,'#E6ECEE',id);const [cx,cy]=P(x,y,z);H+=`<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(560*r/z)}" ry="${r1(560*r/z*.18)}" fill="none" stroke="#14A8A8" stroke-width="3"/>`;});
  H+=`<g class="up">${[[-4.2,16],[4.4,16]].map(([x,z])=>{const [cx,cy]=P(x,2.2,z);return box(x-.12,x+.12,0,1,z,z+.24,'#59666A')+sphere(x,2.2,z,1.4,'#E6ECEE',id)+`<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(560*1.4/z)}" ry="${r1(560*1.4/z*.18)}" fill="none" stroke="#14A8A8" stroke-width="3"/>`;}).join('')}</g>`;
  s+=win(id,-4.2,4.2,.9,3.9,d,H,{mull:3});
  s+=`<g class="up">${box(-4.9,-2.4,0,2.0,9.0,10.0,'#E1E6E9')}${SB.line([-3.6,2.0,9.5],[-3.6,4.6,9.5],'#14A8A8',5)}</g>`;
  // electrolizador
  s+=box(-4.9,-2.1,0,2.1,6.8,8.0,'#E1E6E9');
  s+=fz(-4.55,-2.45,.45,1.75,6.79,'#9AA8B0');
  for(let y=.55;y<1.75;y+=.11) s+=SB.line([-4.55,y,6.78],[-2.45,y,6.78],'#6F7E86',1);
  s+=SB.line([-4.1,2.1,7.4],[-4.1,4.6,7.4],'#8F99A3',6)+SB.line([-2.9,2.1,7.4],[-2.9,4.6,7.4],'#14A8A8',6);
  s+=TXT(P(-4.1,2.45,6.8),'H₂',11,'#2A333C')+TXT(P(-2.9,2.45,6.8),'O₂',11,'#0B6E6E');
  const led=`<circle cx="${r1(P(-2.35,1.95,6.79)[0])}" cy="${r1(P(-2.35,1.95,6.79)[1])}" r="5" fill="#46D27A"/>`; s+=led;
  // filtro de CO2 en la pared derecha
  s+=fx(5.98,7.6,9.6,1.0,2.5,'#8E9AA4');
  [7.9,8.45,9.0].forEach(z=>s+=fx(5.96,z,z+.4,1.15,2.35,'#6E7A84'));
  s+=TXT(P(5.98,2.75,8.6),'FILTRO CO₂',9,'#2A333C');
  s+=`<g class="base-only">${fy(.01,1.5,3.8,6.6,7.6,'none',DASH)}${TXT(P(2.65,.05,7.1),'P2',13)}${fy(.01,-4.9,-2.4,9.0,10.0,'none',DASH)}${TXT(P(-3.65,.05,9.5),'P1',12)}</g>`;
  s+=`<g class="up">${box(1.5,3.8,0,1.35,6.6,7.6,'#C9A43A',{front:'#D9B44C'})}${box(2.6,6,1.35,1.75,6.9,7.3,'#9AA4AE')}${TXT(P(2.65,.85,6.59),'MOXIE',11,'#3A2E0A')}

    ${marker(P(2.65,1.75,6.6),'P2','u')}${marker(P(-2.2,2.4,9.4),'P1','u')}${marker(P(-4.2,4.2,16),'C1','u')}</g>`;
  s+=banner('C3 · SALA DE OXÍGENO','Mirando a la nave de tanques');
  s+=marker(P(-3.5,2.95,7.4),'1','b')+marker(P(5.98,1.75,8.6),'2','b')+marker(P(0,4.25,d),'3','b');
  s+=night(id,[led],alarm(P(-2.35,1.95,6.79),75,id)+`<circle cx="${r1(P(-2.35,1.95,6.79)[0])}" cy="${r1(P(-2.35,1.95,6.79)[1])}" r="6" fill="#FF4A3D"/>`+night2('NOCHE · Avería: electrolizador parado','Botón de reinicio → bajar la palanca')+marker(P(-3.5,1.1,6.8),'!','h'));
  return svgWrap(id,'Boceto de la Sala de Oxígeno',s);
};

/* ---------------- 4 · INVERNADERO ---------------- */
SB.scenes.invernadero=function(){
  const id='c4'; SB.setF(560); const d=12,w=12,h=4.6; let s='';
  s+=shell({w,h,d,pal:{floor:'#5F6660',ceil:'#BCC4BB',wallL:'#B3BCB1',wallR:'#A9B2A7',back:'#C2CAC0'}});
  // nave de cultivo enorme con lucernarios de agua
  let H=fy(0,-34,34,12,110,'#4C4943')+fy(16,-34,34,12,110,'#6F7B80')+fx(-34,12,110,0,16,'#7F8A8E')+fx(34,12,110,0,16,'#76828A')+fz(-34,34,0,16,110,'#8C979B');
  for(let z=14;z<110;z+=7) H+=fy(15.95,-30,30,z,z+2.6,'#DDEDF4');
  const rows=[-22,-14,-6,6,14,22];
  rows.forEach((x,i)=>{
    const filled=(i===2||i===3);
    const shelvesL=x<0?x+1.4:x-1.4, rk=c=>[.9,1.75].map(y=>SB.line([shelvesL,y,16],[shelvesL,y,96],c,1.2)).join('');
    H+=box(x-1.4,x+1.4,0,2.6,16,96,filled?'#3E7D39':'#5B6066',{top:filled?'#5FA455':'#6E747A'})+rk(filled?'#2A5A26':'#474C52');
    if(!filled) H+=`<g class="up">${box(x-1.4,x+1.4,0,2.6,16,96,'#3E7D39',{top:'#5FA455'})}${rk('#2A5A26')}</g>`;
  });
  s+=win(id,-4.6,4.6,.8,4.1,d,H,{mull:4});
  // estante de lechugas (izquierda)
  [[-4.9,5.6],[-2.8,5.6],[-4.9,9.5],[-2.8,9.5]].forEach(([x,z])=>s+=box(x,x+.1,0,2.05,z,z+.1,'#9AA3AC'));
  const shelves=[.45,1.05,1.65];
  let lettuce='';
  shelves.forEach(y=>{ s+=box(-4.9,-2.7,y-.06,y,5.6,9.6,'#D6DCE1');
    for(let z=5.9;z<9.4;z+=.42){const [px,py]=P(-2.75,y+.13,z);lettuce+=`<ellipse cx="${r1(px)}" cy="${r1(py)}" rx="${r1(560*.2/z)}" ry="${r1(560*.12/z)}" fill="#5DB04F" stroke="#2F6B28" stroke-width=".8"/>`;}});
  s+=lettuce;
  s+=`<g class="base-only">${fy(.01,2.7,4.9,5.6,9.6,'none',DASH)}${TXT(P(3.8,.05,7.6),'P1',14)}</g>`;
  let up='';
  [[2.7,5.6],[4.8,5.6],[2.7,9.5],[4.8,9.5]].forEach(([x,z])=>up+=box(x,x+.1,0,2.05,z,z+.1,'#9AA3AC'));
  shelves.forEach(y=>{ up+=box(2.7,4.9,y-.06,y,5.6,9.6,'#D6DCE1');
    for(let z=5.9;z<9.4;z+=.5){const [px,py]=P(2.75,y+.2,z);up+=`<ellipse cx="${r1(px)}" cy="${r1(py)}" rx="${r1(560*.25/z)}" ry="${r1(560*.17/z)}" fill="#3F8A3A" stroke="#245521" stroke-width=".8"/><circle cx="${r1(px+4)}" cy="${r1(py-3)}" r="2" fill="#F2F2E6"/>`;}});
  shelves.forEach(y=>up+=fy(y+.55,-3.2,-2.85,5.7,9.5,'#F57BD6')+fy(y+.55,2.85,3.2,5.7,9.5,'#F57BD6'));
  up+=`<polygon points="${SB.pts([[-2.7,0,5.6],[-2.7,0,9.6],[-2.7,2.2,9.6],[-2.7,2.2,5.6]])}" fill="#FF4FC8" opacity=".16"/><polygon points="${SB.pts([[2.7,0,5.6],[2.7,0,9.6],[2.7,2.2,9.6],[2.7,2.2,5.6]])}" fill="#FF4FC8" opacity=".16"/>`;
  shelves.forEach(y=>up+=SB.line([-2.68,y+.42,5.6],[-2.68,y+.42,9.6],'#3D8FE0',2.5)+SB.line([2.68,y+.42,5.6],[2.68,y+.42,9.6],'#3D8FE0',2.5));
  up+=box(1.0,2.3,0,2.1,10.4,11.0,'#E6EBEF')+fz(1.1,2.2,1.55,1.95,10.39,'#C9D3DB')+TXT(P(1.65,1.68,10.39),'DESPENSA',7,'#2A333C');
  up+=marker(P(3.8,2.5,7.6),'P1','u')+marker(P(-3.85,2.75,7.6),'P2','u')+marker(P(1.65,2.55,10.7),'C1','u');
  s+=`<g class="up">${up}</g>`;
  s+=banner('C4 · INVERNADERO','Mirando a la nave de cultivo (88 × 54 m)');
  s+=marker(P(-3.8,2.45,7.6),'1','b')+marker(P(0,3.4,d),'2','b');
  let wilt=''; shelves.forEach(y=>{for(let z=5.9;z<9.4;z+=.84){const [px,py]=P(-2.75,y+.13,z);wilt+=`<ellipse cx="${r1(px)}" cy="${r1(py)}" rx="${r1(560*.2/z)}" ry="${r1(560*.12/z)}" fill="#9C7A35" opacity=".85"/>`;}});
  s+=night(id,[],wilt+alarm(P(-2.8,1.1,7.4),80,id)+night2('NOCHE · Plantas mustias','Clic en la bandeja → abrir el agua')+marker(P(-2.6,2.45,6.4),'!','h'));
  return svgWrap(id,'Boceto del Invernadero',s);
};

/* ---------------- 5 · ENERGÍA ---------------- */
SB.scenes.energia=function(){
  const id='c5'; SB.setF(560); const d=12,w=12,h=4.6; let s='';
  s+=`<defs><linearGradient id="c5-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9925F"/><stop offset="1" stop-color="#EBCB9E"/></linearGradient></defs>`;
  s+=shell({w,h,d,pal:{floor:'#5D636B',ceil:'#B9BEC4',wallL:'#B1B6BD',wallR:'#A7ACB3',back:'#C1C6CC'}});
  let X=`<rect width="960" height="282" fill="url(#c5-sky)"/>`+fy(0,-900,900,12,2000,'#B07240');
  X+=`<polygon points="200,282 250,262 330,258 360,270 420,272 470,252 560,250 600,268 700,270 760,282" fill="#9A5E33"/>`;
  [[1.5,'#A9683A'],[3,'#B5764A']].forEach(()=>{});
  const row=(z,c='#22324F')=>box(-80,80,.3,1.0,z,z+2.4,c,{top:'#4B6A9E',noline:true})+SB.line([-80,1.0,z],[80,1.0,z],'#1C2A44',1.2)+SB.line([-80,1.0,z+2.4],[80,1.0,z+2.4],'#33507E',1);
  [110,80,60,46].forEach(z=>X+=row(z));
  X+=`<g transform="translate(${r1(P(26,0,160)[0])},${r1(P(26,0,160)[1])})"><rect x="-2" y="-40" width="4" height="40" fill="#D9DDE0"/><ellipse cx="0" cy="-44" rx="20" ry="13" fill="#E8ECEF" stroke="#9AA3AC"/></g>`;
  X+=box(6,12,0,3,70,80,'#C8CDD2');
  X+=`<g class="up">${[24,30,37].map(z=>row(z)).join('')}${box(-3.2,-2.2,1.0,1.45,24.4,25.4,'#F1F3F5')}${SB.line([-3.2,1.04,24.3],[-2.2,1.04,24.3],'#E3A42A',3)}
    <polygon points="${r1(P(-30,0,170)[0])},${r1(P(-30,0,170)[1])} ${r1(P(-24,2.2,170)[0])},${r1(P(-24,2.2,170)[1])} ${r1(P(-14,2.2,170)[0])},${r1(P(-14,2.2,170)[1])} ${r1(P(-8,0,170)[0])},${r1(P(-8,0,170)[1])}" fill="#8E5530"/>
    ${box(-20,-18,2.2,5.5,170,172,'#D5DADE')}${[-24,-22.5,-15.5,-14].map(x=>box(x,x+.6,2.2,7,171,171.4,'#EEF1F3')).join('')}</g>`;
  s+=win(id,-4.6,4.6,.9,3.9,d,X,{mull:4});
  s+=`<g class="up">${box(-4.9,-2.6,0,2.1,10.2,11.8,'#56616C')}</g>`;
  // baterías (izquierda)
  s+=box(-4.9,-2.6,0,2.1,6.4,9.8,'#5E6974');
  for(let z=6.8;z<9.6;z+=.6) for(let y=.4;y<2;y+=.55) s+=fx(-2.61,z,z+.45,y,y+.4,'#4A545E');
  let leds=''; for(let z=6.9;z<9.6;z+=.6) leds+=`<circle cx="${r1(P(-2.6,1.9,z)[0])}" cy="${r1(P(-2.6,1.9,z)[1])}" r="3" fill="#46D27A"/>`;
  s+=leds;
  // cuadro eléctrico (pared derecha) con un interruptor por sala
  s+=fx(5.98,8.0,10.6,1.0,2.7,'#D3D8DD');
  [[COL.agua,8.25],[COL.oxi,8.8],[COL.com,9.35],['#8A96A3',9.9]].forEach(([c,z])=>s+=fx(5.96,z,z+.38,1.5,2.25,c));
  s+=TXT(P(5.98,2.95,9.3),'CUADRO',9,'#2A333C');
  s+=`<g class="base-only">${fz(4.6,5.8,2.4,3.25,d-.03,'none',DASH)}${TXT(P(5.2,2.75,d),'P2',12)}</g>`;
  s+=`<g class="up">${fz(4.6,5.8,2.4,3.25,d-.03,'#0B1622')}${TXT(P(5.2,2.95,d),'REACTOR',8,'#F0C060')}${TXT(P(5.2,2.6,d),'+12',9,'#9FE0A0')}
    ${marker(P(-1.5,2.6,d),'P1','u')}${marker(P(-1.6,.55,d),'Robot','u')}${marker(P(5.2,3.6,d),'P2','u')}${marker(P(-3.75,2.5,11),'C1','u')}</g>`;
  s+=banner('C5 · SALA DE ENERGÍA','Mirando al exterior: campo solar');
  s+=marker(P(-3.75,2.45,8.1),'1','b')+marker(P(5.98,3.35,9.3),'2','b')+marker(P(2.4,3.45,d),'3','b');
  const haze=`<clipPath id="c5-hz"><polygon points="${SB.pts([[-4.6,.9,d],[4.6,.9,d],[4.6,3.9,d],[-4.6,3.9,d]])}"/></clipPath><rect width="960" height="540" fill="#9C5A2E" opacity=".72" clip-path="url(#c5-hz)"/>`;
  let red=''; for(let z=6.9;z<9.6;z+=.6) red+=`<circle cx="${r1(P(-2.6,1.9,z)[0])}" cy="${r1(P(-2.6,1.9,z)[1])}" r="3.4" fill="#FF4A3D"/>`;
  s+=night(id,[],haze+red+alarm(P(5.98,1.9,9.3),75,id)+night2('NOCHE 3 · Tormenta de arena','Filtros obstruidos y paneles a la mitad')+marker(P(5.98,1.2,9.3),'!','h'));
  return svgWrap(id,'Boceto de la Sala de Energía',s);
};

})();
export default SB.scenes;
