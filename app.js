/* Noor Parfum · Control — lógica de la app
   Datos en Supabase: cada tabla guarda {id, data(jsonb)}.
   Tablas: productos, compras, movimientos, gastos, separados, socios_mov, ajustes, duenos. */
const TABLES=['productos','movimientos','compras','gastos','separados','socios_mov','ajustes'];
const S={prod:{},mov:[],comp:[],gastos:[],sep:[],smov:[],ajustes:{},ready:{},sb:null,email:null,names:{},view:'resumen',q:'',fcat:'',fstock:''};
const VIEWS=['resumen','inventario','ventas','separados','cobranza','gastos','compras','socios','instrucciones'];
const YAPE_DEF='952 894 623';
const yape=()=>S.ajustes.negocio?.yape||YAPE_DEF;
const SIN='Sin asignar';
const CAJA='Cuenta del negocio',AMBOS='Ambos (50/50)';

/* ---------- utilidades ---------- */
const PEN=n=>'S/ '+(Math.round((+n||0)*100)/100).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const PEN0=n=>(n<0?'-':'')+'S/ '+Math.abs(Math.round(+n||0)).toLocaleString('es-PE');
const r2=n=>Math.round((+n||0)*100)/100;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const fdate=s=>{if(!s)return'';const [y,m,d]=s.split('-');return d+'/'+m+'/'+y.slice(2)};
const MES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];
const PAGOS=['Yape','Plin','Efectivo','Transferencia','Tarjeta'];
const GASTO_CAT=['Publicidad','Envíos y delivery','Empaques y bolsas','Frascos para decants','Transporte','Comisiones','Otros'];
const socios=()=>{const n=[...new Set(Object.values(S.names))].filter(Boolean);return n.length?n:['Jesús']};
const yo=()=>S.names[S.email]||socios()[0];
const socioOpts=(sel,extra)=>[...socios(),...(extra||[])].map(n=>`<option ${n===sel?'selected':''}>${esc(n)}</option>`).join('');
const cajaOpts=sel=>`<option ${!sel||sel===CAJA?'selected':''}>${CAJA}</option>`+socioOpts(sel,[]);
const payOpts=sel=>`<option ${!sel||sel===CAJA?'selected':''}>${CAJA}</option><option ${sel===AMBOS?'selected':''}>${AMBOS}</option>`+socioOpts(sel,[]);
function waLink(tel,txt){const d=String(tel||'').replace(/\D/g,'');const num=d?(d.length===9?'51'+d:d):'';return `https://wa.me/${num}?text=${encodeURIComponent(txt)}`}

/* cobros: cada entrada {fecha,monto,metodo,recibio}. Ventas antiguas solo tenían "pagado". */
function cobrosOf(m){if(Array.isArray(m.cobros))return m.cobros;const c=[];const ab=m.abonos||[];const ini=(+m.pagado||0)-ab.reduce((s,a)=>s+(+a.monto||0),0);
  if(ini>0.005)c.push({fecha:m.fecha,monto:ini,metodo:m.pago,recibio:m.recibio||CAJA});ab.forEach(a=>c.push({fecha:a.fecha,monto:+a.monto||0,metodo:a.metodo,recibio:a.recibio||CAJA}));return c}
const pagadoOf=m=>cobrosOf(m).reduce((s,c)=>s+(+c.monto||0),0);
const saldoOf=m=>Math.max(0,(+m.total||0)-pagadoOf(m));

/* ---------- cálculos ---------- */
function calc(){
  const P={};
  for(const [id,p] of Object.entries(S.prod)) P[id]={...p,id,comprado:0,inv:0,vendido:0,devuelto:0,otras:0,separado:0,ingresos:0,costoVend:0};
  for(const c of S.comp){
    const total=(+c.monto||0)+(+c.envio||0);const items=c.items||[];
    const W=items.reduce((s,it)=>s+(it.regalo?0:(+it.precioRef||+(P[it.codigo]?.precio)||0)*(+it.cant||0)),0);
    for(const it of items){const p=P[it.codigo];if(!p)continue;const w=it.regalo?0:(+it.precioRef||+p.precio||0)*(+it.cant||0);p.comprado+=+it.cant||0;p.inv+=W>0?total*w/W:0}
  }
  for(const p of Object.values(P)) p.costo=p.comprado?p.inv/p.comprado:0;
  for(const m of S.mov){const p=P[m.codigo];if(!p)continue;const q=+m.cant||0;
    if(m.tipo==='Venta'){p.vendido+=q;p.ingresos+=+m.total||0;p.costoVend+=q*(m.costoUnit??p.costo)}
    else if(m.tipo==='Devolución'){p.devuelto+=q;p.ingresos-=+m.total||0;p.costoVend-=q*(m.costoUnit??p.costo)}
    else p.otras+=q;}
  for(const s of S.sep){if(s.estado==='Apartado'&&P[s.codigo])P[s.codigo].separado+=+s.cant||0}
  for(const p of Object.values(P)){p.stock=p.comprado-p.vendido-p.otras+p.devuelto;p.disp=p.stock-p.separado;
    p.estado=p.stock<=0?(p.comprado?'AGOTADO':'SIN STOCK'):p.disp<=0?'SEPARADO':p.disp<=(+p.stockMin||1)?'STOCK BAJO':'DISPONIBLE'}
  /* Packs: no tienen stock propio; se arman con el disponible de sus componentes */
  for(const p of Object.values(P)){if(!Array.isArray(p.componentes)||!p.componentes.length)continue;p.esPack=true;
    const cs=p.componentes.filter(c=>P[c.codigo]&&!P[c.codigo].componentes);
    p.disp=p.stock=cs.length?Math.max(0,Math.min(...cs.map(c=>Math.floor(P[c.codigo].disp/(+c.cant||1))))):0;
    p.costo=cs.reduce((t,c)=>t+P[c.codigo].costo*(+c.cant||1),0);p.normal=cs.reduce((t,c)=>t+(+P[c.codigo].precio||0)*(+c.cant||1),0);
    p.estado=p.disp<=0?'AGOTADO':p.disp<=1?'STOCK BAJO':'DISPONIBLE'}
  return P;
}
function totals(P){
  const inv=S.comp.reduce((s,c)=>s+(+c.monto||0)+(+c.envio||0),0);
  const gastos=S.gastos.reduce((s,g)=>s+(+g.monto||0),0);
  let ing=0,costo=0,cobrado=0,porCobrar=0,uds=0,stockU=0,stockV=0,stockC=0;
  for(const m of S.mov){if(m.tipo==='Venta'){ing+=+m.total||0;cobrado+=Math.min(pagadoOf(m),+m.total||0);porCobrar+=saldoOf(m);uds+=+m.cant||0}
    if(m.tipo==='Devolución')ing-=+m.total||0}
  const adelantos=S.sep.filter(s=>s.estado==='Apartado').reduce((t,s)=>t+pagadoOf(s),0);
  const retenido=S.sep.filter(s=>s.estado==='Cancelado').reduce((t,s)=>t+Math.max(0,pagadoOf(s)),0);ing+=retenido;cobrado+=retenido;
  for(const p of Object.values(P)){if(p.esPack)continue;costo+=p.costoVend;if(p.stock>0){stockU+=p.stock;stockV+=p.stock*(+p.precio||0);stockC+=p.stock*p.costo}}
  return{inv,gastos,ing,costo,gan:ing-costo,neta:ing-costo-gastos,cobrado,porCobrar,uds,stockU,stockV,stockC,adelantos};
}
/* Cuentas: posición = dinero del negocio que tiene − lo que puso de su bolsillo.
   "Cuenta del negocio" guarda lo cobrado; "Ambos (50/50)" reparte un pago en partes iguales entre los socios. */
function cuentas(){
  const so=socios();const A={};const add=(n,k,v)=>{n=n||CAJA;if(n===AMBOS){so.forEach(x=>add(x,k,v/so.length));return}A[n]=A[n]||{cobro:0,pago:0,trIn:0,trOut:0};A[n][k]+=v};
  so.forEach(n=>add(n,'cobro',0));add(CAJA,'cobro',0);
  for(const m of S.mov){for(const c of cobrosOf(m)){const v=+c.monto||0;add(c.recibio,'cobro',m.tipo==='Devolución'?-v:v)}}
  for(const s of S.sep){if(s.estado==='Entregado')continue;for(const c of cobrosOf(s))add(c.recibio,'cobro',+c.monto||0)}
  for(const c of S.comp)add(c.pagadoPor||AMBOS,'pago',(+c.monto||0)+(+c.envio||0));
  for(const g of S.gastos)add(g.pagadoPor||CAJA,'pago',+g.monto||0);
  for(const t of S.smov){add(t.de,'trOut',+t.monto||0);add(t.a,'trIn',+t.monto||0)}
  const pct=S.ajustes.socios?.pct||{};const def=100/so.length;
  const pos=a=>a.cobro-a.pago+a.trIn-a.trOut;
  const rows=so.map(n=>{const a=A[n];return{n,...a,pos:pos(a),aporte:-pos(a),pct:pct[n]??def}});
  const caja={...A[CAJA],saldo:pos(A[CAJA])};
  const totAp=rows.reduce((s,r)=>s+r.aporte,0);
  rows.forEach(r=>{r.dif=totAp*r.pct/100-r.aporte});
  return{rows,caja,totAp};
}
/* ---------- vistas ---------- */
function pill(e){return `<span class="pill ${e==='DISPONIBLE'?'p-ok':e==='STOCK BAJO'||e==='SEPARADO'?'p-warn':'p-bad'}">${e}</span>`}
function payPill(m){if(m.tipo!=='Venta')return `<span class="pill p-mu">${esc(m.tipo)}</span>`;const s=saldoOf(m);
  return s<=0.005?`<span class="pill p-ok">Pagado</span>`:(pagadoOf(m)>0?`<span class="pill p-warn">Debe ${PEN(s)}</span>`:`<span class="pill p-bad">Debe ${PEN(s)}</span>`)}
const byDate=(a,b)=>(b.fecha||'').localeCompare(a.fecha||'')||(b.creado||0)-(a.creado||0);
function who(e){return e?(S.names[e]||e):''}
const head=(t,sub,btns)=>`<div class="head"><div><div class="eyebrow">Noor Parfum</div><h2>${t}</h2><div class="sub">${sub}</div></div>${btns?`<div class="hbtns">${btns}</div>`:''}</div>`;

function render(){
  if(!TABLES.every(t=>S.ready[t]))return;
  const P=calc(),T=totals(P);
  const debts=S.mov.filter(m=>m.tipo==='Venta'&&saldoOf(m)>0.005);
  const apart=S.sep.filter(s=>s.estado==='Apartado');
  document.querySelectorAll('#nav a').forEach(a=>{const v=a.dataset.v;a.classList.toggle('on',v===S.view);
    const n=v==='cobranza'?debts.length:v==='separados'?apart.length:0;a.innerHTML=a.dataset.l+(n?`<span class="n">${n}</span>`:'')});
  const v={resumen,inventario,ventas,separados,cobranza,gastos,compras,socios:vSocios,instrucciones}[S.view]||resumen;
  document.getElementById('main').innerHTML=v(P,T,debts,apart);
  bind();
}
function resumen(P,T,debts,apart){
  const recup=T.inv?T.cobrado/T.inv:0;
  const low=Object.values(P).filter(p=>p.comprado&&p.disp<=(+p.stockMin||1)).sort((a,b)=>a.disp-b.disp);
  const byM={};const put=(k,f,v)=>{byM[k]=byM[k]||{i:0,g:0,x:0};byM[k][f]+=v};
  for(const m of S.mov){if(m.tipo!=='Venta'&&m.tipo!=='Devolución')continue;const k=(m.fecha||'').slice(0,7);const sg=m.tipo==='Venta'?1:-1;const p=P[m.codigo];
    put(k,'i',sg*(+m.total||0));put(k,'g',sg*((+m.total||0)-(+m.cant||0)*(m.costoUnit??p?.costo??0)))}
  for(const g of S.gastos)put((g.fecha||'').slice(0,7),'x',+g.monto||0);
  const ks=Object.keys(byM).sort().slice(-6);const mx=Math.max(1,...ks.map(k=>byM[k].i));
  const bars=ks.length?ks.map(k=>{const [y,mm]=k.split('-');const net=byM[k].g-byM[k].x;return `<div class="barrow"><span>${MES[+mm-1]} ${y.slice(2)}</span><div class="track"><i style="width:${byM[k].i/mx*100}%"></i><b style="width:${Math.max(0,net)/mx*100}%"></b></div><span style="text-align:right">${PEN0(byM[k].i)}</span></div>`}).join('')+'<div class="small muted" style="margin-top:4px"><span style="color:var(--gold)">■</span> Vendido &nbsp; <span style="color:var(--ok)">■</span> Ganancia neta (después de gastos)</div>':'<div class="empty">Aún no hay ventas registradas.</div>';
  const rec=[...S.mov].sort(byDate).slice(0,6).map(m=>`<div class="item"><div><b>${esc(P[m.codigo]?.nombre||m.codigo)}</b><div class="small muted">${fdate(m.fecha)} · ${esc(m.cliente||'—')}${m.cant>1?' · '+m.cant+' und':''}</div></div><div style="text-align:right"><div>${m.tipo==='Venta'?PEN(m.total):''}</div>${payPill(m)}</div></div>`).join('')||'<div class="empty">Sin movimientos todavía.</div>';
  return head('Resumen del negocio','Se actualiza solo cuando tú o tu socio registran algo.','<button class="btn pri" data-a="venta">+ Registrar venta</button>')+`
  <div class="kpis">
   <div class="kpi"><div class="l">Inversión</div><div class="v">${PEN0(T.inv)}</div><div class="d">${S.comp.length} compras</div></div>
   <div class="kpi"><div class="l">Vendido</div><div class="v">${PEN0(T.ing)}</div><div class="d">${T.uds} unidades</div></div>
   <div class="kpi"><div class="l">Gastos</div><div class="v">${PEN0(T.gastos)}</div><div class="d">${S.gastos.length} registrados</div></div>
   <div class="kpi hl"><div class="l">Ganancia neta</div><div class="v">${PEN0(T.neta)}</div><div class="d">Bruta ${PEN0(T.gan)} − gastos</div></div>
   <div class="kpi"><div class="l">Cobrado</div><div class="v">${PEN0(T.cobrado)}</div><div class="d">Recuperado ${Math.round(recup*100)}% de la inversión</div></div>
   <div class="kpi"><div class="l">Por cobrar</div><div class="v" style="color:${T.porCobrar?'var(--bad)':'inherit'}">${PEN0(T.porCobrar)}</div><div class="d">${debts.length} venta${debts.length===1?'':'s'} pendiente${debts.length===1?'':'s'}</div></div>
   <div class="kpi"><div class="l">Separados</div><div class="v">${apart.length}</div><div class="d">Adelantos ${PEN0(T.adelantos)}</div></div>
   <div class="kpi"><div class="l">Stock</div><div class="v">${T.stockU} und</div><div class="d">Vale ${PEN0(T.stockV)} a precio de venta</div></div>
  </div>
  <div class="grid2">
   <div class="box"><h3>Ventas por mes</h3><div class="bars">${bars}</div></div>
   <div class="box"><h3>Últimos movimientos</h3>${rec}</div>
   <div class="box"><h3>Reponer pronto (${low.length})</h3>${low.length?low.map(p=>`<div class="item"><div>${esc(p.nombre)}<div class="small muted">${esc(p.marca)}</div></div><div>${pill(p.estado)} <span class="small muted">${p.disp} und</span></div></div>`).join(''):'<div class="empty">Todo con stock suficiente.</div>'}</div>
  </div>`;
}
function inventario(P){
  let L=Object.values(P).sort((a,b)=>a.id.localeCompare(b.id));
  const q=S.q.toLowerCase();if(q)L=L.filter(p=>(p.nombre+' '+p.marca).toLowerCase().includes(q));
  if(S.fcat)L=L.filter(p=>p.categoria===S.fcat);
  if(S.fstock==='con')L=L.filter(p=>p.disp>0);if(S.fstock==='sin')L=L.filter(p=>p.disp<=0);
  const cats=[...new Set(Object.values(P).map(p=>p.categoria))].sort();
  const rows=L.map(p=>`<tr><td class="hide-m muted">${esc(p.id)}</td><td><b>${esc(p.nombre)}</b><div class="small muted">${p.esPack?'Pack: '+p.componentes.map(c=>esc(P[c.codigo]?.nombre||c.codigo)+(c.cant>1?' ×'+c.cant:'')).join(' + ')+` · normal ${PEN0(p.normal)}`:`${esc(p.marca)} · ${esc(p.para||'')}${p.ml?' · '+p.ml+' ml':''}`}</div></td>
   <td class="r"><b>${p.disp}</b>${p.separado?`<div class="small muted">+${p.separado} separado</div>`:''}${p.esPack?'':`<div class="small muted hide-m">de ${p.comprado}</div>`}</td><td>${pill(p.estado)}</td>
   <td class="r">${PEN(p.precio)}</td><td class="r hide-m">${PEN(p.costo)}</td><td class="r hide-m">${p.precio?Math.round((p.precio-p.costo)/p.precio*100)+'%':'—'}</td>
   <td class="r hide-m">${PEN(p.ingresos)}</td><td class="r"><button class="btn sm" data-a="${p.esPack?'editpack':'editp'}" data-id="${esc(p.id)}">Editar</button></td></tr>`).join('');
  return head('Inventario',`${L.length} productos · el costo se reparte por pack según el precio de venta`,'<button class="btn" data-a="newpack">+ Nuevo pack</button><button class="btn" data-a="newp">+ Nuevo producto</button>')+`
  <div class="tools"><input id="q" type="search" placeholder="Buscar perfume o marca" value="${esc(S.q)}">
   <select id="fcat"><option value="">Todas las categorías</option>${cats.map(c=>`<option ${S.fcat===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
   <select id="fstock"><option value="">Todo</option><option value="con" ${S.fstock==='con'?'selected':''}>Disponibles</option><option value="sin" ${S.fstock==='sin'?'selected':''}>Sin stock</option></select></div>
  <div class="box tblw"><table><thead><tr><th class="hide-m">Cód.</th><th>Producto</th><th class="r">Disponible</th><th>Estado</th><th class="r">Precio</th><th class="r hide-m">Costo</th><th class="r hide-m">Margen</th><th class="r hide-m">Vendido</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="9" class="empty">Ningún producto coincide.</td></tr>'}</tbody></table></div>`;
}
function ventas(P){
  const rows=[...S.mov].sort(byDate).map(m=>{const p=P[m.codigo];const g=m.tipo==='Venta'?(+m.total||0)-(+m.cant||0)*(m.costoUnit??p?.costo??0):null;
   const rec=[...new Set(cobrosOf(m).map(c=>c.recibio))];
   return `<tr><td class="muted">${fdate(m.fecha)}</td><td><b>${esc(p?.nombre||m.codigo)}</b>${m.cant>1?` <span class="muted">×${m.cant}</span>`:''}<div class="small muted">${esc(m.cliente||'—')}${m.telefono?' · '+esc(m.telefono):''} · ${esc(m.canal||'')} · ${esc(m.pago||'')}${m.notas?'<br>'+esc(m.notas):''}${rec.length?'<br>Entró a: '+rec.map(esc).join(', '):''}${who(m.por)?' · Registró: '+esc(who(m.por)):''}</div></td>
   <td class="r">${m.tipo==='Venta'||m.tipo==='Devolución'?PEN(m.total):'—'}${+m.descuento?`<div class="small muted">dscto ${PEN(m.descuento)}</div>`:''}</td><td class="r hide-m">${g==null?'—':PEN(g)}</td><td>${payPill(m)}</td>
   <td class="r nowrap"><button class="btn sm" data-a="editm" data-id="${esc(m.id)}">Editar</button> <button class="btn sm danger" data-a="delm" data-id="${esc(m.id)}">Borrar</button></td></tr>`}).join('');
  return head('Ventas y salidas','Ventas, obsequios, frascos abiertos para decants y devoluciones','<button class="btn" data-a="salida">+ Otra salida</button><button class="btn pri" data-a="venta">+ Registrar venta</button>')+`
  <div class="box tblw"><table><thead><tr><th>Fecha</th><th>Detalle</th><th class="r">Total</th><th class="r hide-m">Ganancia</th><th>Pago</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="empty">Aún no hay ventas. Registra la primera con el botón de arriba.</td></tr>'}</tbody></table></div>`;
}
function msgCobro(cliente,ms,P){
  const nom=(cliente||'').split(' ')[0];const tot=ms.reduce((s,m)=>s+saldoOf(m),0);
  return `Hola ${nom} 👋, te saluda *Noor Parfum* ✨\n\nTe escribo para recordarte tu saldo pendiente:\n`+ms.map(m=>`• ${P[m.codigo]?.nombre||m.codigo} (${fdate(m.fecha)}): ${PEN(saldoOf(m))}`).join('\n')+
  `\n\n*Total: ${PEN(tot)}*\n\nPuedes pagar por Yape o Plin al ${yape()}. Si ya pagaste, avísanos para registrarlo 🙏\n¡Gracias por tu confianza! 🌙`;
}
function cobranza(P,T,debts){
  const byC={};for(const m of debts){const k=(m.cliente||'Sin nombre').trim();(byC[k]=byC[k]||[]).push(m)}
  const blocks=Object.entries(byC).sort((a,b)=>b[1].reduce((s,m)=>s+saldoOf(m),0)-a[1].reduce((s,m)=>s+saldoOf(m),0)).map(([c,ms])=>{
    const tot=ms.reduce((s,m)=>s+saldoOf(m),0);const tel=ms.map(m=>m.telefono).find(Boolean)||'';
    return `<div class="box"><div class="item" style="padding-top:0"><div><b style="font-size:16px">${esc(c)}</b><div class="small muted">${ms.length} venta${ms.length>1?'s':''}${tel?' · '+esc(tel):''}</div></div><div style="text-align:right"><div class="small muted">Debe</div><b style="font-size:18px;color:var(--bad)">${PEN(tot)}</b></div></div>
    ${ms.map(m=>`<div class="item"><div>${esc(P[m.codigo]?.nombre||m.codigo)}<div class="small muted">${fdate(m.fecha)} · total ${PEN(m.total)}${pagadoOf(m)?' · pagó '+PEN(pagadoOf(m)):''}</div></div><div><button class="btn sm pri" data-a="abono" data-id="${esc(m.id)}">Registrar pago</button></div></div>`).join('')}
    <div class="acts" style="margin-top:8px"><a class="btn sm wa" href="${esc(waLink(tel,msgCobro(c,ms,P)))}" target="_blank" rel="noopener">Recordar por WhatsApp</a></div>
    ${tel?'':'<div class="small muted" style="text-align:right;margin-top:4px">Sin celular: WhatsApp te pedirá elegir el contacto. Agrégalo con Editar en Ventas.</div>'}</div>`}).join('');
  return head('Por cobrar',`Ventas a crédito o con pago pendiente · Yape/Plin para cobrar: <b>${esc(yape())}</b> <button class="out" data-a="yape">Cambiar</button>`,`<div class="kpi" style="padding:8px 14px"><div class="l">Total pendiente</div><div class="v" style="font-size:20px;color:${T.porCobrar?'var(--bad)':'inherit'}">${PEN(T.porCobrar)}</div></div>`)+
  (blocks?`<div class="grid2">${blocks}</div>`:'<div class="box empty">Nadie te debe. Las ventas que no se paguen completas aparecerán aquí.</div>');
}
function separados(P){
  const act=S.sep.filter(s=>s.estado==='Apartado').sort(byDate);const hist=S.sep.filter(s=>s.estado!=='Apartado').sort(byDate).slice(0,20);
  const card=s=>{const p=P[s.codigo];const tot=(+s.precio||0)*(+s.cant||1);const pag=pagadoOf(s);const falta=Math.max(0,tot-pag);
    const msg=`Hola ${(s.cliente||'').split(' ')[0]} 👋, te saluda *Noor Parfum* ✨\n\nTu *${p?.nombre||s.codigo}* está separado para ti 🎁\nAdelanto: ${PEN(pag)}\nTe falta: *${PEN(falta)}*\n\n${s.encargo?'Te avisamos apenas llegue 📦':'Cuando quieras coordinamos la entrega 🚚'}\n¡Gracias! 🌙`;
    return `<div class="box"><div class="item" style="padding-top:0"><div><b style="font-size:16px">${esc(s.cliente||'Sin nombre')}</b><div class="small muted">${fdate(s.fecha)}${s.telefono?' · '+esc(s.telefono):''}${s.encargo?' · <span class="pill p-warn">Encargo</span>':''}</div></div><div style="text-align:right"><div class="small muted">Falta</div><b style="font-size:18px;color:${falta?'var(--warn)':'var(--ok)'}">${PEN(falta)}</b></div></div>
     <div class="item"><div>${esc(p?.nombre||s.codigo)}${s.cant>1?' ×'+s.cant:''}<div class="small muted">Precio ${PEN(tot)} · adelanto ${PEN(pag)}${s.notas?' · '+esc(s.notas):''}</div></div></div>
     <div class="acts" style="margin-top:6px"><a class="btn sm wa" href="${esc(waLink(s.telefono,msg))}" target="_blank" rel="noopener">WhatsApp</a><button class="btn sm" data-a="sepabono" data-id="${esc(s.id)}">Abono</button><button class="btn sm danger" data-a="sepcancel" data-id="${esc(s.id)}">Cancelar</button><button class="btn sm pri" data-a="sepentrega" data-id="${esc(s.id)}">Entregar</button></div></div>`};
  return head('Separados','Perfumes apartados con adelanto o encargados al proveedor','<button class="btn pri" data-a="sepnew">+ Nuevo separado</button>')+
  (act.length?`<div class="grid2">${act.map(card).join('')}</div>`:'<div class="box empty">No hay separados. Cuando un cliente deje un adelanto, regístralo aquí: el perfume queda apartado y no se puede vender a otro.</div>')+
  (hist.length?`<div class="box" style="margin-top:14px"><h3>Historial</h3>${hist.map(s=>`<div class="item"><div>${esc(P[s.codigo]?.nombre||s.codigo)} · ${esc(s.cliente||'')}<div class="small muted">${fdate(s.fecha)}${s.notas?' · '+esc(s.notas):''}</div></div><span class="pill ${s.estado==='Entregado'?'p-ok':'p-mu'}">${esc(s.estado)}</span></div>`).join('')}</div>`:'');
}
function gastos(){
  const L=[...S.gastos].sort(byDate);const tot=L.reduce((s,g)=>s+(+g.monto||0),0);
  const byCat={};L.forEach(g=>byCat[g.categoria]=(byCat[g.categoria]||0)+(+g.monto||0));
  const rows=L.map(g=>`<tr><td class="muted">${fdate(g.fecha)}</td><td><b>${esc(g.descripcion||g.categoria)}</b><div class="small muted">${esc(g.categoria)} · pagado con ${esc(g.pagadoPor||CAJA)}</div></td><td class="r">${PEN(g.monto)}</td><td class="r"><button class="btn sm danger" data-a="delg" data-id="${esc(g.id)}">Borrar</button></td></tr>`).join('');
  return head('Gastos',`Total ${PEN(tot)} · se descuentan de la ganancia`,'<button class="btn pri" data-a="gasto">+ Registrar gasto</button>')+
  (Object.keys(byCat).length?`<div class="kpis">${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div class="kpi"><div class="l">${esc(c)}</div><div class="v">${PEN0(v)}</div></div>`).join('')}</div>`:'')+
  `<div class="box tblw"><table><thead><tr><th>Fecha</th><th>Gasto</th><th class="r">Monto</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="4" class="empty">Aún no hay gastos. Registra publicidad, envíos, bolsas o frascos para decants.</td></tr>'}</tbody></table></div>`;
}
function compras(P){
  const L=[...S.comp].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')||(b.nombre||'').localeCompare(a.nombre||''));
  const rows=L.map(c=>{const n=(c.items||[]).reduce((s,i)=>s+(+i.cant||0),0);const pp=esc(c.pagadoPor||AMBOS);
   return `<tr><td class="muted">${fdate(c.fecha)}</td><td><b>${esc(c.nombre)}</b><div class="small muted">${esc(c.proveedor||'')} · pagado con ${pp}<br>${(c.items||[]).map(i=>esc(P[i.codigo]?.nombre||i.codigo)+(i.cant>1?' ×'+i.cant:'')+(i.regalo?' (regalo)':'')).join(', ')}</div></td>
   <td class="r">${n}</td><td class="r">${PEN(c.monto)}${+c.envio?`<div class="small muted">+ envío ${PEN(c.envio)}</div>`:''}</td><td class="r nowrap"><button class="btn sm" data-a="editc" data-id="${esc(c.id)}">Editar</button> <button class="btn sm danger" data-a="delc" data-id="${esc(c.id)}">Borrar</button></td></tr>`}).join('');
  const inv=S.comp.reduce((s,c)=>s+(+c.monto||0)+(+c.envio||0),0);
  return head('Compras',`Inversión total ${PEN(inv)} · cada pack reparte su costo entre lo que trajo`,'<button class="btn pri" data-a="compra">+ Registrar compra</button>')+`
  <div class="box tblw"><table><thead><tr><th>Fecha</th><th>Compra / pack</th><th class="r">Und</th><th class="r">Pagado</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty">Sin compras registradas.</td></tr>'}</tbody></table></div>`;
}
function vSocios(P,T){
  const C=cuentas();const so=C.rows;
  const patr=C.caja.saldo+T.stockC+T.porCobrar;const gan=patr-C.totAp;
  const cards=so.map(r=>`<div class="kpi"><div class="l">${esc(r.n)} · ${Math.round(r.pct)}%</div><div class="v">${PEN0(r.aporte)}</div>
    <div class="d">Capital aportado${r.cobro?` · cobró a su cuenta ${PEN0(r.cobro)}`:''}</div></div>`).join('');
  const pares=[];{const d=so.filter(r=>r.dif>0.5).map(r=>({...r})),a=so.filter(r=>r.dif<-0.5).map(r=>({...r}));let i=0,j=0;while(i<d.length&&j<a.length){const m=Math.min(d[i].dif,-a[j].dif);pares.push([d[i].n,a[j].n,m]);d[i].dif-=m;a[j].dif+=m;if(d[i].dif<0.5)i++;if(a[j].dif>-0.5)j++}}
  const liq=pares.length?pares.map(([de,a,m])=>`<div class="liq"><b>${esc(de)}</b> puso <b class="gold">${PEN(m)}</b> menos de lo que le toca. Puede pasárselos a <b>${esc(a)}</b> o aportarlos al negocio.</div>`).join(''):'<div class="liq">Aportes parejos: cada uno puso su parte.</div>';
  const tr=[...S.smov].sort(byDate).map(t=>`<div class="item"><div><b>${esc(t.de)}</b> → <b>${esc(t.a)}</b><div class="small muted">${fdate(t.fecha)} · ${t.a===CAJA?'Aporte de capital':t.de===CAJA?'Retiro':'Entre socios'}${t.nota?' · '+esc(t.nota):''}</div></div><div style="display:flex;gap:8px;align-items:center"><b>${PEN(t.monto)}</b><button class="btn sm danger" data-a="delt" data-id="${esc(t.id)}">Borrar</button></div></div>`).join('');
  const share=so.map(r=>`<div class="item"><div>${esc(r.n)} (${Math.round(r.pct)}%)</div><b>${PEN(patr*r.pct/100)}</b></div>`).join('');
  return head('Socios y capital','Cuánto puso cada uno y cuánto vale hoy el negocio','<button class="btn" data-a="pct">Porcentajes</button><button class="btn pri" data-a="traspaso">+ Aporte, retiro o traspaso</button>')+`
  <div class="kpis">${cards}<div class="kpi hl"><div class="l">${CAJA}</div><div class="v">${PEN0(C.caja.saldo)}</div><div class="d">Cobrado ${PEN0(C.caja.cobro)} − pagado ${PEN0(C.caja.pago)}${C.caja.trIn||C.caja.trOut?` ± aportes y retiros ${PEN0(C.caja.trIn-C.caja.trOut)}`:''}</div></div></div>
  <div class="grid2">
   <div class="box"><h3>Cuánto vale el negocio hoy</h3>
    <div class="item"><div>Dinero en la cuenta del negocio</div><b>${PEN(C.caja.saldo)}</b></div>
    <div class="item"><div>Mercadería en stock (a costo)</div><b>${PEN(T.stockC)}</b></div>
    <div class="item"><div>Lo que les deben (por cobrar)</div><b>${PEN(T.porCobrar)}</b></div>
    <div class="item"><div><b>Patrimonio total</b></div><b class="gold" style="font-size:18px">${PEN(patr)}</b></div>
    <div class="item"><div>Capital que pusieron</div><b>${PEN(C.totAp)}</b></div>
    <div class="item"><div>Ganancia acumulada (sin repartir)</div><b style="color:${gan>=0?'var(--ok)':'var(--bad)'}">${PEN(gan)}</b></div>
    <h3 style="margin-top:14px">Parte de cada socio</h3>${share}</div>
   <div class="box"><h3>Aportes parejos</h3>${liq}<p class="small muted" style="margin-top:10px">Compara lo que puso cada uno con su porcentaje. Las compras marcadas "${AMBOS}" se dividen en partes iguales.</p>
    <h3 style="margin-top:14px">Aportes, retiros y traspasos</h3>${tr||'<div class="empty">Registra aquí si alguno mete más dinero al negocio (aporte), si sacan ganancia (retiro) o si se pasan dinero entre ustedes.</div>'}</div>
  </div>`;
}
function instrucciones(){
  return head('Instrucciones','Cómo usar la app día a día')+`<div class="ins grid2">
   <div class="box"><h3>Registrar una venta</h3><ol><li>Toca <b>+ Registrar venta</b>.</li><li>Elige el perfume. El precio se llena solo; puedes cambiarlo.</li><li>Si hiciste descuento, escribe el monto en <b>Descuento total</b>.</li><li>Pon el cliente y su celular (sirve para cobrarle por WhatsApp).</li><li>En <b>¿Cuánto pagó ahora?</b> deja el total si pagó todo. Si pagó una parte o es a crédito, escribe lo que pagó: el resto va a <b>Por cobrar</b>.</li><li>En <b>¿Dónde entró el dinero?</b> deja <b>Cuenta del negocio</b>, salvo que lo haya recibido un socio en su cuenta personal.</li></ol></div>
   <div class="box"><h3>Cobrar una deuda</h3><ol><li>Entra a <b>Por cobrar</b>. Las deudas están agrupadas por cliente.</li><li>Toca <b>Recordar por WhatsApp</b>: se abre WhatsApp con el mensaje y el saldo listos para enviar.</li><li>Cuando te paguen, toca <b>Registrar pago</b> y escribe el monto.</li></ol></div>
   <div class="box"><h3>Separados y encargos</h3><ol><li>En <b>Separados › + Nuevo separado</b> registra al cliente, el perfume y el adelanto (tu regla: 50%).</li><li>Si el perfume está en stock, queda apartado y nadie más lo puede vender. Si no hay, márcalo como <b>Encargo</b>.</li><li>Con <b>Abono</b> registras pagos parciales; con <b>WhatsApp</b> le avisas cuánto le falta.</li><li>Al entregarlo toca <b>Entregar</b>: se convierte en venta y, si aún debe algo, pasa a Por cobrar.</li><li>Si el cliente se arrepiente, <b>Cancelar</b> registra cuánto le devolviste.</li></ol></div>
   <div class="box"><h3>Catálogo para clientes</h3><p>La dirección <b>…/noor-parfum-app/catalogo.html</b> es pública: muestra fotos, notas y precios solo de lo que hay en stock, y cada perfume tiene un botón para pedir por WhatsApp. Se actualiza solo con cada venta o compra. Ponla en la biografía de Instagram y TikTok.</p></div>
   <div class="box"><h3>Packs de regalo</h3><p>Un pack junta varios productos con un precio especial (ej. perfume + body spray). No tiene stock propio: la app calcula cuántos puedes armar con lo que hay. Al venderlo, se descuenta cada producto y el cobro se reparte entre ellos. Se crean en <b>Inventario › + Nuevo pack</b>.</p></div>
   <div class="box"><h3>Gastos</h3><p>Registra todo lo que sale para el negocio y no es mercadería: publicidad, delivery, bolsas, frascos para decants, pasajes. Se restan de la ganancia, así ves la <b>ganancia neta</b> real. Normalmente se pagan con la Cuenta del negocio.</p></div>
   <div class="box"><h3>Socios y capital</h3><ul><li>Lo que se cobra entra a la <b>Cuenta del negocio</b> (opción por defecto en ventas y pagos).</li><li>Las compras se marcan <b>Ambos (50/50)</b> cuando cada uno puso la mitad. Si uno puso todo, elige su nombre.</li><li>Los gastos se pagan con la <b>Cuenta del negocio</b>, salvo que alguno lo pague de su bolsillo.</li><li>En <b>Socios</b> ves el capital que puso cada uno, el saldo de la cuenta, cuánto vale hoy el negocio (dinero + mercadería + por cobrar) y la ganancia acumulada.</li><li>Si alguno mete más dinero, regístralo como <b>Aporte de capital</b>; cuando decidan repartir, como <b>Retiro de ganancia</b>.</li></ul></div>
   <div class="box"><h3>Obsequios, decants y devoluciones</h3><ul><li><b>Obsequio:</b> baja el stock sin ingreso.</li><li><b>Decants (frasco abierto):</b> ese frasco ya no se vende sellado.</li><li><b>Devolución:</b> vuelve al stock y se descuenta lo devuelto.</li></ul><p class="small muted">Ventas › <b>+ Otra salida</b>.</p></div>
   <div class="box"><h3>Registrar una compra</h3><ol><li>Si llegó un perfume nuevo, créalo en <b>Inventario › + Nuevo producto</b>.</li><li>En <b>Compras › + Registrar compra</b> pon lo que pagaste, el envío y <b>con qué se pagó</b> (por defecto Ambos 50/50).</li><li>Agrega cada producto y su cantidad. Marca <b>Regalo</b> en lo que vino gratis.</li></ol><p class="small muted">El costo del pack se reparte entre los perfumes según su precio de venta; los regalos cuestan S/ 0.</p></div>
   <div class="box"><h3>Instalar en el celular</h3><ul><li><b>iPhone:</b> Safari › Compartir › <b>Agregar a pantalla de inicio</b>.</li><li><b>Android:</b> Chrome › menú ⋮ › <b>Instalar app</b>.</li></ul></div>
   <div class="box"><h3>Acceso y cambios</h3><ul><li>Solo entran los correos registrados como dueños. Cada registro guarda quién lo hizo.</li><li>Si prestas tu celular, toca <b>Cerrar sesión</b>.</li><li>Para pedir mejoras, díselo a Claude: el cambio queda como una versión nueva en GitHub y se publica solo.</li></ul></div>
  </div>`;
}

/* ---------- formularios ---------- */
function open(html,onMount){document.getElementById('modal').innerHTML=`<div class="ov" id="ov"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  const ov=document.getElementById('ov');ov.addEventListener('click',e=>{if(e.target===ov)close()});ov.querySelectorAll('[data-x]').forEach(b=>b.onclick=close);onMount&&onMount(ov);const f=ov.querySelector('input,select');f&&f.focus()}
function close(){document.getElementById('modal').innerHTML=''}
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2200)}
function prodOpts(P,sel,onlyStock,noPacks){return Object.values(P).filter(p=>!(noPacks&&p.esPack)).sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(p=>`<option value="${esc(p.id)}" ${p.id===sel?'selected':''} ${onlyStock&&p.disp<=0&&p.id!==sel?'disabled':''}>${esc(p.nombre)} · ${p.disp} disp. · ${PEN0(p.precio)}</option>`).join('')}
const sel=(id,opts,v)=>`<select id="${id}">${opts.map(o=>`<option ${o===v?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
const clientesList=()=>`<datalist id="clientes">${[...new Set([...S.mov,...S.sep].map(m=>m.cliente).filter(Boolean))].map(c=>`<option value="${esc(c)}">`).join('')}</datalist>`;
const telDe=c=>{const x=[...S.mov,...S.sep].filter(m=>m.cliente===c&&m.telefono).sort(byDate)[0];return x?x.telefono:''};
async function save(fn,okMsg,errEl){try{await fn();close();toast(okMsg);await loadAll()}catch(e){console.error(e);const m=/JWT|auth|permission|row-level/i.test(e?.message||'')?'Tu sesión venció o no tienes permiso. Vuelve a ingresar.':/relation|does not exist|schema cache/i.test(e?.message||'')?'Falta crear esta tabla en Supabase (supabase/002_gastos_separados_socios.sql).':'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';if(errEl)errEl.textContent=m;else toast(m)}}
const $in=ov=>id=>ov.querySelector('#'+id);
function autoTel(ov,cl,tel){const $=$in(ov);$(cl).addEventListener('change',()=>{if(!$(tel).value)$(tel).value=telDe($(cl).value.trim())})}

function formVenta(){
  const P=calc();
  open(`<h3>Registrar venta</h3><form class="f" onsubmit="return false">
   <label class="full">Producto<select id="v-p"><option value="">Elige un producto</option>${prodOpts(P,'',true)}</select></label>
   <label>Cantidad<input id="v-c" type="number" min="1" value="1"></label>
   <label>Precio unitario<input id="v-pr" type="number" min="0" step="0.01"></label>
   <label>Descuento total (S/)<input id="v-d" type="number" min="0" step="0.01" value="0"></label>
   <label>Fecha<input id="v-f" type="date" value="${today()}"></label>
   <label>Cliente<input id="v-cl" placeholder="Nombre del cliente" autocomplete="off" list="clientes"></label>${clientesList()}
   <label>Celular<input id="v-tel" type="tel" inputmode="tel" placeholder="9xx xxx xxx"></label>
   <label>Canal${sel('v-ca',['WhatsApp','Instagram','TikTok','Facebook','Tienda / en persona','Página web','Otro'],'WhatsApp')}</label>
   <label>Forma de pago${sel('v-pg',[...PAGOS,'Crédito'],'Yape')}</label>
   <label>¿Cuánto pagó ahora? (S/)<input id="v-pa" type="number" min="0" step="0.01"></label>
   <label>¿Dónde entró el dinero?<select id="v-rc">${cajaOpts()}</select></label>
   <label class="full">Notas<input id="v-n" placeholder="Opcional"></label>
   </form><div class="tot"><span class="muted">Total</span><b id="v-t">S/ 0.00</b></div><div class="small muted" id="v-g"></div><div class="err" id="v-e"></div>
   <div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pri" id="v-s">Guardar venta</button></div>`,ov=>{
    const $=$in(ov);let paTouched=false;autoTel(ov,'v-cl','v-tel');
    const upd=()=>{const p=P[$('v-p').value];const t=Math.max(0,(+$('v-c').value||0)*(+$('v-pr').value||0)-(+$('v-d').value||0));$('v-t').textContent=PEN(t);
      if(!paTouched)$('v-pa').value=$('v-pg').value==='Crédito'?0:t.toFixed(2);
      $('v-g').textContent=p?`Disponible: ${p.disp} und · costo aprox. ${PEN(p.costo)} c/u · ganas ${PEN(t-(+$('v-c').value||0)*p.costo)}`:'';return t};
    $('v-p').onchange=()=>{const p=P[$('v-p').value];if(p)$('v-pr').value=p.precio;upd()};
    ['v-c','v-pr','v-d'].forEach(i=>$(i).addEventListener('input',upd));$('v-pg').addEventListener('change',()=>{paTouched=false;upd()});
    $('v-pa').addEventListener('input',()=>paTouched=true);
    $('v-s').onclick=()=>{const p=P[$('v-p').value];const c=+$('v-c').value||0;const t=upd();const pa=Math.min(t,+$('v-pa').value||0);
      if(!p)return $('v-e').textContent='Elige el producto vendido.';
      if(c<1)return $('v-e').textContent='La cantidad debe ser al menos 1.';
      if(c>p.disp)return $('v-e').textContent=`Solo hay ${p.disp} unidades disponibles de ${p.nombre}.`;
      const f=$('v-f').value||today();const metodo=$('v-pg').value==='Crédito'?'Efectivo':$('v-pg').value;
      if(p.esPack){const cs=p.componentes.map(x=>({...x,q:(+x.cant||1)*c,pr:+P[x.codigo].precio||0}));const W=cs.reduce((a,x)=>a+x.pr*x.q,0)||1;
        const docs=cs.map((x,i)=>{const sh=x.pr*x.q/W;const tt=r2(t*sh);const pp=r2(pa*sh);return{fecha:f,tipo:'Venta',codigo:x.codigo,cant:x.q,precio:r2(tt/x.q),descuento:0,total:tt,costoUnit:r2(P[x.codigo].costo),
          cliente:$('v-cl').value.trim(),telefono:$('v-tel').value.trim(),canal:$('v-ca').value,pago:$('v-pg').value,cobros:pp>0?[{fecha:f,monto:pp,metodo,recibio:$('v-rc').value}]:[],pagado:pp,
          notas:[p.nombre+(c>1?' ×'+c:''),$('v-n').value.trim()].filter(Boolean).join(' · '),pack:p.id,creado:Date.now()+i,por:S.email}});
        return save(async()=>{for(const d of docs)await api.add('movimientos',d)},'Venta del pack guardada',$('v-e'))}
      const doc={fecha:f,tipo:'Venta',codigo:p.id,cant:c,precio:+$('v-pr').value||0,descuento:+$('v-d').value||0,total:t,costoUnit:r2(p.costo),
        cliente:$('v-cl').value.trim(),telefono:$('v-tel').value.trim(),canal:$('v-ca').value,pago:$('v-pg').value,
        cobros:pa>0?[{fecha:f,monto:pa,metodo,recibio:$('v-rc').value}]:[],pagado:pa,notas:$('v-n').value.trim(),creado:Date.now(),por:S.email};
      save(()=>api.add('movimientos',doc),'Venta guardada',$('v-e'))};
  });
}
function formEditMov(id){
  const m=S.mov.find(x=>x.id===id);if(!m)return;const cb=cobrosOf(m).map(c=>({...c}));
  open(`<h3>Editar registro</h3><div class="sub" style="margin-bottom:10px">${esc(m.tipo)} del ${fdate(m.fecha)}</div><form class="f" onsubmit="return false">
   <label>Cliente<input id="e-cl" value="${esc(m.cliente||'')}" list="clientes"></label>${clientesList()}
   <label>Celular<input id="e-tel" type="tel" value="${esc(m.telefono||'')}"></label>
   <label class="full">Notas<input id="e-n" value="${esc(m.notas||'')}"></label>
   ${cb.map((c,i)=>`<label class="full">Cobro ${fdate(c.fecha)} · ${PEN(c.monto)} · ${esc(c.metodo||'')} — ¿dónde entró?<select id="e-r${i}">${cajaOpts(c.recibio)}</select></label>`).join('')}
   </form><div class="err" id="e-e"></div><div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pri" id="e-s">Guardar</button></div>`,ov=>{
    const $=$in(ov);
    $('e-s').onclick=()=>{cb.forEach((c,i)=>c.recibio=$('e-r'+i).value);
      save(()=>api.update('movimientos',id,{cliente:$('e-cl').value.trim(),telefono:$('e-tel').value.trim(),notas:$('e-n').value.trim(),cobros:cb,pagado:r2(cb.reduce((s,c)=>s+(+c.monto||0),0))}),'Actualizado',$('e-e'))};
  });
}
function formSalida(){
  const P=calc();
  open(`<h3>Otra salida o devolución</h3><form class="f" onsubmit="return false">
   <label class="full">Tipo${sel('s-t',['Obsequio','Decants (frasco abierto)','Otra salida','Devolución'],'Obsequio')}</label>
   <label class="full">Producto<select id="s-p"><option value="">Elige un producto</option>${prodOpts(P,'',false,true)}</select></label>
   <label>Cantidad<input id="s-c" type="number" min="1" value="1"></label>
   <label>Fecha<input id="s-f" type="date" value="${today()}"></label>
   <label id="s-mw" hidden>Monto devuelto al cliente (S/)<input id="s-m" type="number" min="0" step="0.01" value="0"></label>
   <label id="s-dw" hidden>¿De dónde salió la devolución?<select id="s-d">${cajaOpts()}</select></label>
   <label class="full">Cliente o motivo<input id="s-cl"></label>
   <label class="full">Notas<input id="s-n"></label></form><div class="err" id="s-e"></div>
   <div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pri" id="s-s">Guardar</button></div>`,ov=>{
    const $=$in(ov);
    $('s-t').onchange=()=>{const d=$('s-t').value!=='Devolución';$('s-mw').hidden=d;$('s-dw').hidden=d};
    $('s-s').onclick=()=>{const p=P[$('s-p').value];const c=+$('s-c').value||0;const t=$('s-t').value;const dev=t==='Devolución';const mo=dev?(+$('s-m').value||0):0;
      if(!p)return $('s-e').textContent='Elige el producto.';if(c<1)return $('s-e').textContent='La cantidad debe ser al menos 1.';
      if(!dev&&c>p.disp)return $('s-e').textContent=`Solo hay ${p.disp} unidades disponibles.`;
      const f=$('s-f').value||today();
      const doc={fecha:f,tipo:t,codigo:p.id,cant:c,precio:+p.precio||0,descuento:0,total:mo,costoUnit:r2(p.costo),
        cliente:$('s-cl').value.trim(),canal:'',pago:'',cobros:dev&&mo>0?[{fecha:f,monto:mo,metodo:'Devolución',recibio:$('s-d').value}]:[],pagado:mo,notas:$('s-n').value.trim(),creado:Date.now(),por:S.email};
      save(()=>api.add('movimientos',doc),'Guardado',$('s-e'))};
  });
}
function formCobro(table,id){
  const arr=table==='movimientos'?S.mov:S.sep;const m=arr.find(x=>x.id===id);if(!m)return;const P=calc();
  const tot=table==='movimientos'?(+m.total||0):(+m.precio||0)*(+m.cant||1);const saldo=Math.max(0,tot-pagadoOf(m));
  open(`<h3>${table==='movimientos'?'Registrar pago':'Registrar abono'}</h3><div class="sub" style="margin-bottom:10px">${esc(m.cliente||'Cliente')} · ${esc(P[m.codigo]?.nombre||'')} · falta ${PEN(saldo)}</div>
   <form class="f" onsubmit="return false"><label>Monto que pagó (S/)<input id="a-m" type="number" min="0" step="0.01" value="${saldo.toFixed(2)}"></label>
   <label>Forma de pago${sel('a-p',PAGOS,'Yape')}</label>
   <label>Fecha<input id="a-f" type="date" value="${today()}"></label>
   <label>¿Dónde entró el dinero?<select id="a-r">${cajaOpts()}</select></label></form><div class="err" id="a-e"></div>
   <div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pri" id="a-s">Guardar pago</button></div>`,ov=>{
    const $=$in(ov);
    $('a-s').onclick=()=>{const a=+$('a-m').value||0;if(a<=0)return $('a-e').textContent='Escribe cuánto pagó.';if(a>saldo+0.005)return $('a-e').textContent=`Falta ${PEN(saldo)}; el pago no puede ser mayor.`;
      const cb=[...cobrosOf(m),{fecha:$('a-f').value||today(),monto:a,metodo:$('a-p').value,recibio:$('a-r').value}];
      save(()=>api.update(table,id,{cobros:cb,pagado:r2(cb.reduce((s,c)=>s+(+c.monto||0),0))}),a>=saldo-0.005?'Pagado completo':'Pago registrado',$('a-e'))};
  });
}
function formSeparado(){
  const P=calc();
  open(`<h3>Nuevo separado</h3><form class="f" onsubmit="return false">
   <label class="full">Producto<select id="p-p"><option value="">Elige un producto</option>${prodOpts(P,'',false,true)}</select></label>
   <label>Cantidad<input id="p-c" type="number" min="1" value="1"></label>
   <label>Precio unitario (S/)<input id="p-pr" type="number" min="0" step="0.01"></label>
   <label>Cliente<input id="p-cl" list="clientes" autocomplete="off"></label>${clientesList()}
   <label>Celular<input id="p-tel" type="tel" inputmode="tel"></label>
   <label>Adelanto (S/)<input id="p-a" type="number" min="0" step="0.01"></label>
   <label>Forma de pago${sel('p-m',PAGOS,'Yape')}</label>
   <label>¿Dónde entró el adelanto?<select id="p-r">${cajaOpts()}</select></label>
   <label>Fecha<input id="p-f" type="date" value="${today()}"></label>
   <label class="full chk"><input type="checkbox" id="p-enc"> Es encargo (no hay en stock, se pide al proveedor)</label>
   <label class="full">Notas<input id="p-n" placeholder="Ej. entrega el sábado"></label></form>
   <div class="small muted" id="p-g"></div><div class="err" id="p-e"></div>
   <div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pri" id="p-s">Guardar separado</button></div>`,ov=>{
    const $=$in(ov);autoTel(ov,'p-cl','p-tel');
    const upd=()=>{const p=P[$('p-p').value];const t=(+$('p-c').value||0)*(+$('p-pr').value||0);if(p)$('p-g').textContent=`Disponible: ${p.disp} und · total ${PEN(t)} · 50% = ${PEN(t/2)}`};
    $('p-p').onchange=()=>{const p=P[$('p-p').value];if(p){$('p-pr').value=p.precio;$('p-a').value=(p.precio*(+$('p-c').value||1)/2).toFixed(2);$('p-enc').checked=p.disp<=0}upd()};
    ['p-c','p-pr'].forEach(i=>$(i).addEventListener('input',upd));
    $('p-s').onclick=()=>{const p=P[$('p-p').value];const c=+$('p-c').value||0;const a=+$('p-a').value||0;const enc=$('p-enc').checked;
      if(!p)return $('p-e').textContent='Elige el producto.';if(c<1)return $('p-e').textContent='La cantidad debe ser al menos 1.';
      if(!enc&&c>p.disp)return $('p-e').textContent=`Solo hay ${p.disp} disponibles. Si lo vas a pedir, marca "Es encargo".`;
      if(!$('p-cl').value.trim())return $('p-e').textContent='Escribe el nombre del cliente.';
      const f=$('p-f').value||today();
      const doc={fecha:f,codigo:p.id,cant:c,precio:+$('p-pr').value||0,cliente:$('p-cl').value.trim(),telefono:$('p-tel').value.trim(),encargo:enc,estado:'Apartado',
        cobros:a>0?[{fecha:f,monto:a,metodo:$('p-m').value,recibio:$('p-r').value}]:[],notas:$('p-n').value.trim(),creado:Date.now(),por:S.email};
      save(()=>api.add('separados',doc),'Separado guardado',$('p-e'))};
  });
}
function formEntrega(id){
  const s=S.sep.find(x=>x.id===id);if(!s)return;const P=calc();const p=P[s.codigo];const tot=(+s.precio||0)*(+s.cant||1);const falta=Math.max(0,tot-pagadoOf(s));
  open(`<h3>Entregar separado</h3><div class="sub" style="margin-bottom:10px">${esc(s.cliente)} · ${esc(p?.nombre||s.codigo)} · total ${PEN(tot)} · adelanto ${PEN(pagadoOf(s))}</div>
   <form class="f" onsubmit="return false"><label>Pagó al recoger (S/)<input id="g-m" type="number" min="0" step="0.01" value="${falta.toFixed(2)}"></label>
   <label>Forma de pago${sel('g-p',PAGOS,'Yape')}</label><label>¿Dónde entró el dinero?<select id="g-r">${cajaOpts()}</select></label>
   <label>Canal${sel('g-ca',['WhatsApp','Instagram','TikTok','Facebook','Tienda / en persona','Página web','Otro'],'WhatsApp')}</label>
   <label>Fecha<input id="g-f" type="date" value="${today()}"></label></form>
   <div class="small muted">Se registra como venta. Si queda saldo, pasa a Por cobrar.</div><div class="err" id="g-e"></div>
   <div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pri" id="g-s">Entregar y registrar venta</button></div>`,ov=>{
    const $=$in(ov);
    $('g-s').onclick=()=>{if(!p)return $('g-e').textContent='El producto ya no existe en el inventario.';
      if((+s.cant||1)>p.stock)return $('g-e').textContent=`No hay stock de ${p.nombre}. Registra primero la compra cuando llegue.`;
      const m=+$('g-m').value||0;const f=$('g-f').value||today();
      const cb=[...cobrosOf(s),...(m>0?[{fecha:f,monto:m,metodo:$('g-p').value,recibio:$('g-r').value}]:[])];
      const venta={fecha:f,tipo:'Venta',codigo:s.codigo,cant:+s.cant||1,precio:+s.precio||0,descuento:0,total:tot,costoUnit:r2(p.costo),cliente:s.cliente,telefono:s.telefono||'',
        canal:$('g-ca').value,pago:$('g-p').value,cobros:cb,pagado:r2(cb.reduce((t,c)=>t+(+c.monto||0),0)),notas:'Separado del '+fdate(s.fecha)+(s.notas?' · '+s.notas:''),separadoId:s.id,creado:Date.now(),por:S.email};
      save(async()=>{await api.add('movimientos',venta);await api.update('separados',id,{estado:'Entregado',entregado:f})},'Entregado y registrado como venta',$('g-e'))};
  });
}
function formCancelSep(id){
  const s=S.sep.find(x=>x.id===id);if(!s)return;const pag=pagadoOf(s);
  open(`<h3>Cancelar separado</h3><div class="sub" style="margin-bottom:10px">${esc(s.cliente)} dejó ${PEN(pag)} de adelanto.</div>
   <form class="f" onsubmit="return false"><label>¿Cuánto le devolviste? (S/)<input id="x-m" type="number" min="0" step="0.01" value="${pag.toFixed(2)}"></label>
   <label>¿De dónde salió la devolución?<select id="x-r">${cajaOpts()}</select></label><label class="full">Motivo<input id="x-n"></label></form>
   <div class="small muted">Lo que no devuelvas queda como ingreso del negocio.</div><div class="err" id="x-e"></div>
   <div class="acts"><button class="btn" data-x>Volver</button><button class="btn pri" id="x-s" style="background:var(--bad);border-color:var(--bad);color:#fff">Cancelar separado</button></div>`,ov=>{
    const $=$in(ov);
    $('x-s').onclick=()=>{const d=+$('x-m').value||0;if(d>pag+0.005)return $('x-e').textContent='No puedes devolver más que el adelanto.';
      const cb=[...cobrosOf(s),...(d>0?[{fecha:today(),monto:-d,metodo:'Devolución',recibio:$('x-r').value}]:[])];
      const ret=r2(pag-d);
      save(()=>api.update('separados',id,{estado:'Cancelado',cobros:cb,notas:[s.notas,$('x-n').value.trim(),ret>0?'Se quedó '+PEN(ret)+' del adelanto':''].filter(Boolean).join(' · ')}),'Separado cancelado',$('x-e'))};
  });
}
function formGasto(){
  open(`<h3>Registrar gasto</h3><form class="f" onsubmit="return false">
   <label>Categoría${sel('g-c',GASTO_CAT,'Publicidad')}</label><label>Monto (S/)<input id="g-m" type="number" min="0" step="0.01"></label>
   <label class="full">Descripción<input id="g-d" placeholder="Ej. Anuncio Instagram 7 días"></label>
   <label>Fecha<input id="g-f" type="date" value="${today()}"></label><label>¿Con qué se pagó?<select id="g-p">${payOpts(CAJA)}</select></label></form>
   <div class="err" id="g-e"></div><div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pri" id="g-s">Guardar gasto</button></div>`,ov=>{
    const $=$in(ov);
    $('g-s').onclick=()=>{const m=+$('g-m').value||0;if(m<=0)return $('g-e').textContent='Escribe el monto del gasto.';
      save(()=>api.add('gastos',{fecha:$('g-f').value||today(),categoria:$('g-c').value,descripcion:$('g-d').value.trim(),monto:m,pagadoPor:$('g-p').value,creado:Date.now(),por:S.email}),'Gasto guardado',$('g-e'))};
  });
}
function formTraspaso(){
  const so=socios();
  open(`<h3>Aporte, retiro o traspaso</h3><form class="f" onsubmit="return false">
   <label class="full">Tipo${sel('t-t',['Aporte de capital','Retiro de ganancia','Entre socios'],'Aporte de capital')}</label>
   <label>De<select id="t-de"></select></label><label>Para<select id="t-a"></select></label>
   <label>Monto (S/)<input id="t-m" type="number" min="0" step="0.01"></label><label>Fecha<input id="t-f" type="date" value="${today()}"></label>
   <label class="full">Nota<input id="t-n" placeholder="Ej. Aporte para el pedido de sets"></label></form>
   <div class="small muted" id="t-h"></div><div class="err" id="t-e"></div><div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pri" id="t-s">Guardar</button></div>`,ov=>{
    const $=$in(ov);const o=l=>l.map(n=>`<option>${esc(n)}</option>`).join('');
    const upd=()=>{const t=$('t-t').value;if(t==='Aporte de capital'){$('t-de').innerHTML=o(so);$('t-a').innerHTML=o([CAJA]);$('t-h').textContent='Un socio mete dinero suyo al negocio.'}
      else if(t==='Retiro de ganancia'){$('t-de').innerHTML=o([CAJA]);$('t-a').innerHTML=o(so);$('t-h').textContent='Se saca dinero de la cuenta del negocio para un socio.'}
      else{$('t-de').innerHTML=o(so);$('t-a').innerHTML=o(so);$('t-a').value=so.find(n=>n!==$('t-de').value)||so[0];$('t-h').textContent='Un socio le pasa dinero al otro.'}};
    $('t-t').onchange=upd;upd();
    $('t-s').onclick=()=>{const m=+$('t-m').value||0;if(m<=0)return $('t-e').textContent='Escribe el monto.';if($('t-de').value===$('t-a').value)return $('t-e').textContent='Elige origen y destino distintos.';
      save(()=>api.add('socios_mov',{fecha:$('t-f').value||today(),tipo:$('t-t').value,de:$('t-de').value,a:$('t-a').value,monto:m,nota:$('t-n').value.trim(),creado:Date.now(),por:S.email}),'Guardado',$('t-e'))};
  });
}
function formYape(){
  open(`<h3>Número para cobrar</h3><form class="f" onsubmit="return false"><label class="full">Yape / Plin que aparece en los mensajes de cobro<input id="y-n" type="tel" inputmode="tel" value="${esc(yape())}"></label></form>
   <div class="err" id="y-e"></div><div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pri" id="y-s">Guardar</button></div>`,ov=>{
    const $=$in(ov);$('y-s').onclick=()=>{const n=$('y-n').value.trim();if(n.replace(/\D/g,'').length<9)return $('y-e').textContent='Escribe el número completo (9 dígitos).';
      save(()=>api.set('ajustes','negocio',{...(S.ajustes.negocio||{}),yape:n}),'Número actualizado',$('y-e'))};
  });
}
function formPct(){
  const so=socios();const pct=S.ajustes.socios?.pct||{};
  open(`<h3>Porcentajes de cada socio</h3><form class="f" onsubmit="return false">${so.map((n,i)=>`<label>${esc(n)} (%)<input id="pc${i}" type="number" min="0" max="100" step="1" value="${pct[n]??Math.round(100/so.length)}"></label>`).join('')}</form>
   <div class="err" id="pc-e"></div><div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pri" id="pc-s">Guardar</button></div>`,ov=>{
    const $=$in(ov);
    $('pc-s').onclick=()=>{const o={};let t=0;so.forEach((n,i)=>{o[n]=+$('pc'+i).value||0;t+=o[n]});if(Math.abs(t-100)>0.01)return $('pc-e').textContent=`Deben sumar 100%. Ahora suman ${t}%.`;
      save(()=>api.set('ajustes','socios',{pct:o}),'Porcentajes guardados',$('pc-e'))};
  });
}
function formProd(id){
  const p=id?S.prod[id]:null;const ids=Object.keys(S.prod).map(k=>+k.replace(/\D/g,'')||0);const next='P'+String(Math.max(0,...ids)+1).padStart(2,'0');
  open(`<h3>${p?'Editar producto':'Nuevo producto'}</h3><form class="f" onsubmit="return false">
   <label class="full">Nombre<input id="p-n" value="${esc(p?.nombre||'')}"></label>
   <label>Marca<input id="p-m" value="${esc(p?.marca||'')}"></label>
   <label>Categoría${sel('p-c',['Perfume','Set','Body spray','Aceite','Decant','Otro'],p?.categoria||'Perfume')}</label>
   <label>Para${sel('p-pa',['Varones','Damas','Unisex'],p?.para||'Unisex')}</label>
   <label>ml<input id="p-ml" type="number" min="0" value="${esc(p?.ml??100)}"></label>
   <label>Precio de venta (S/)<input id="p-pr" type="number" min="0" step="0.01" value="${esc(p?.precio??'')}"></label>
   <label>Stock mínimo<input id="p-sm" type="number" min="0" value="${esc(p?.stockMin??1)}"></label></form><div class="err" id="p-e"></div>
   <div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pri" id="p-s">Guardar</button></div>`,ov=>{
    const $=$in(ov);
    $('p-s').onclick=()=>{const n=$('p-n').value.trim();if(!n)return $('p-e').textContent='Escribe el nombre del producto.';
      const d={codigo:id||next,nombre:n,marca:$('p-m').value.trim(),categoria:$('p-c').value,para:$('p-pa').value,ml:+$('p-ml').value||0,precio:+$('p-pr').value||0,stockMin:+$('p-sm').value||0};
      save(()=>api.set('productos',id||next,d),p?'Producto actualizado':'Producto creado',$('p-e'))};
  });
}
function formPack(id){
  const P=calc();const p=id?S.prod[id]:null;const ids=Object.keys(S.prod).filter(k=>/^PK/.test(k)).map(k=>+k.slice(2)||0);const next='PK'+String(Math.max(0,...ids)+1).padStart(2,'0');
  const row=(c)=>`<div class="irow"><select class="i-p"><option value="">Producto</option>${prodOpts(P,c?.codigo||'',false,true)}</select><input class="i-c" type="number" min="1" value="${c?.cant||1}" aria-label="Cantidad"><span></span><button type="button" class="btn sm" data-rm aria-label="Quitar">✕</button></div>`;
  open(`<h3>${p?'Editar pack':'Nuevo pack de regalo'}</h3><form class="f" onsubmit="return false">
   <label class="full">Nombre del pack<input id="k-n" value="${esc(p?.nombre||'')}" placeholder="Ej. Pack Él Fresco"></label>
   <label>Precio del pack (S/)<input id="k-pr" type="number" min="0" step="0.01" value="${esc(p?.precio??'')}"></label>
   <label>Para${sel('k-pa',['Varones','Damas','Unisex'],p?.para||'Unisex')}</label>
   <label class="full">Descripción para el catálogo<input id="k-d" value="${esc(p?.descripcion||'')}" placeholder="Ej. Perfume + body spray, listo para regalar"></label>
   <div class="full"><div class="small muted" style="font-weight:600;margin-bottom:6px">Qué incluye</div><div id="k-items">${(p?.componentes||[null,null]).map(row).join('')}</div>
   <button type="button" class="btn sm" id="k-add">+ Agregar producto</button></div></form>
   <div class="small muted" id="k-g"></div><div class="err" id="k-e"></div>
   <div class="acts">${p?'<button class="btn danger" id="k-del">Borrar pack</button>':''}<button class="btn" data-x>Cancelar</button><button class="btn pri" id="k-s">Guardar pack</button></div>`,ov=>{
    const $=$in(ov);const box=$('k-items');
    const items=()=>[...box.children].map(r=>({codigo:r.querySelector('.i-p').value,cant:+r.querySelector('.i-c').value||0})).filter(i=>i.codigo&&i.cant>0);
    const upd=()=>{const it=items();const n=it.reduce((t,i)=>t+(+P[i.codigo].precio||0)*i.cant,0),co=it.reduce((t,i)=>t+P[i.codigo].costo*i.cant,0),pr=+$('k-pr').value||0;
      $('k-g').textContent=it.length?`Por separado costaría ${PEN(n)} · costo ${PEN(co)}${pr?` · ganancia ${PEN(pr-co)} (${Math.round((pr-co)/pr*100)}%)`:''}`:''};
    const wire=()=>{box.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{if(box.children.length>1){b.parentElement.remove();upd()}});box.querySelectorAll('select,input').forEach(x=>x.oninput=upd)};wire();upd();
    $('k-pr').oninput=upd;$('k-add').onclick=()=>{box.insertAdjacentHTML('beforeend',row());wire()};
    if(p)$('k-del').onclick=()=>{close();confirmDel('productos',id,`Pack "${p.nombre}". Las ventas ya registradas no cambian.`)};
    $('k-s').onclick=()=>{const it=items();const n=$('k-n').value.trim();if(!n)return $('k-e').textContent='Escribe el nombre del pack.';if(it.length<2)return $('k-e').textContent='Un pack necesita al menos dos productos.';
      const d={codigo:id||next,nombre:n,marca:'Noor Parfum',categoria:'Pack',para:$('k-pa').value,ml:0,precio:+$('k-pr').value||0,stockMin:0,descripcion:$('k-d').value.trim(),componentes:it};
      save(()=>api.set('productos',id||next,d),p?'Pack actualizado':'Pack creado',$('k-e'))};
  });
}
function formCompra(){
  const P=calc();
  const row=()=>`<div class="irow"><select class="i-p"><option value="">Producto</option>${prodOpts(P,'',false,true)}</select><input class="i-c" type="number" min="1" value="1" aria-label="Cantidad"><label class="chk"><input type="checkbox" class="i-r">Regalo</label><button type="button" class="btn sm" data-rm aria-label="Quitar">✕</button></div>`;
  open(`<h3>Registrar compra</h3><form class="f" onsubmit="return false">
   <label>Fecha<input id="c-f" type="date" value="${today()}"></label>
   <label>Nombre del pack o compra<input id="c-n" placeholder="Ej. Pack Sets noviembre"></label>
   <label>Proveedor<input id="c-pv" value="United Perfumes"></label>
   <label>¿Con qué se pagó?<select id="c-pp">${payOpts(AMBOS)}</select></label>
   <label>Pagaste por los productos (S/)<input id="c-m" type="number" min="0" step="0.01"></label>
   <label>Envío (S/)<input id="c-e" type="number" min="0" step="0.01" value="0"></label>
   <div class="full"><div class="small muted" style="font-weight:600;margin-bottom:6px">Qué trajo</div><div id="c-items">${row()}</div>
   <button type="button" class="btn sm" id="c-add">+ Agregar producto</button>
   <div class="small muted" style="margin-top:6px">¿No está en la lista? Créalo primero en Inventario › Nuevo producto.</div></div></form>
   <div class="err" id="c-er"></div><div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pri" id="c-s">Guardar compra</button></div>`,ov=>{
    const $=$in(ov);const box=$('c-items');
    const wire=()=>box.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{if(box.children.length>1)b.parentElement.remove()});wire();
    $('c-add').onclick=()=>{box.insertAdjacentHTML('beforeend',row());wire()};
    $('c-s').onclick=()=>{const items=[...box.children].map(r=>({codigo:r.querySelector('.i-p').value,cant:+r.querySelector('.i-c').value||0,regalo:r.querySelector('.i-r').checked})).filter(i=>i.codigo&&i.cant>0).map(i=>({...i,precioRef:+P[i.codigo].precio||0}));
      if(!items.length)return $('c-er').textContent='Agrega al menos un producto.';
      const d={fecha:$('c-f').value||today(),nombre:$('c-n').value.trim()||('Compra '+fdate($('c-f').value)),proveedor:$('c-pv').value.trim(),pagadoPor:$('c-pp').value,monto:+$('c-m').value||0,envio:+$('c-e').value||0,items,creado:Date.now(),por:S.email};
      save(()=>api.add('compras',d),'Compra guardada · stock actualizado',$('c-er'))};
  });
}
function formEditCompra(id){
  const c=S.comp.find(x=>x.id===id);if(!c)return;
  open(`<h3>Editar compra</h3><form class="f" onsubmit="return false">
   <label class="full">Nombre<input id="k-n" value="${esc(c.nombre||'')}"></label>
   <label>Proveedor<input id="k-pv" value="${esc(c.proveedor||'')}"></label>
   <label>¿Con qué se pagó?<select id="k-pp">${payOpts(c.pagadoPor||AMBOS)}</select></label>
   <label>Pagado por productos (S/)<input id="k-m" type="number" min="0" step="0.01" value="${esc(c.monto)}"></label>
   <label>Envío (S/)<input id="k-e" type="number" min="0" step="0.01" value="${esc(c.envio||0)}"></label></form>
   <div class="err" id="k-er"></div><div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pri" id="k-s">Guardar</button></div>`,ov=>{
    const $=$in(ov);
    $('k-s').onclick=()=>save(()=>api.update('compras',id,{nombre:$('k-n').value.trim()||c.nombre,proveedor:$('k-pv').value.trim(),pagadoPor:$('k-pp').value,monto:+$('k-m').value||0,envio:+$('k-e').value||0}),'Compra actualizada',$('k-er'));
  });
}
function confirmDel(table,id,label){open(`<h3>¿Borrar?</h3><p>${esc(label)}</p><p class="small muted">Los totales se recalculan. No se puede deshacer.</p><div class="err" id="d-e"></div>
  <div class="acts"><button class="btn" data-x>Cancelar</button><button class="btn pri" id="d-s" style="background:var(--bad);border-color:var(--bad);color:#fff">Borrar</button></div>`,ov=>{
  ov.querySelector('#d-s').onclick=()=>save(()=>api.del(table,id),'Borrado',ov.querySelector('#d-e'))})}

function bind(){
  const m=document.getElementById('main');
  m.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{const a=b.dataset.a,id=b.dataset.id;const P=calc();
    const F={venta:formVenta,salida:formSalida,newp:()=>formProd(),compra:formCompra,sepnew:formSeparado,gasto:formGasto,traspaso:formTraspaso,pct:formPct,yape:formYape,newpack:()=>formPack()};
    if(F[a])return F[a]();
    if(a==='abono')formCobro('movimientos',id);else if(a==='sepabono')formCobro('separados',id);else if(a==='sepentrega')formEntrega(id);else if(a==='sepcancel')formCancelSep(id);
    else if(a==='editp')formProd(id);else if(a==='editpack')formPack(id);else if(a==='editm')formEditMov(id);else if(a==='editc')formEditCompra(id);
    else if(a==='delm'){const x=S.mov.find(z=>z.id===id);confirmDel('movimientos',id,`${x.tipo} de ${P[x.codigo]?.nombre||x.codigo} del ${fdate(x.fecha)}${x.cliente?' a '+x.cliente:''}.`)}
    else if(a==='delc'){const x=S.comp.find(z=>z.id===id);confirmDel('compras',id,`Compra "${x.nombre}" del ${fdate(x.fecha)}. Las unidades que trajo se quitarán del stock.`)}
    else if(a==='delg'){const x=S.gastos.find(z=>z.id===id);confirmDel('gastos',id,`Gasto "${x.descripcion||x.categoria}" de ${PEN(x.monto)}.`)}
    else if(a==='delt'){const x=S.smov.find(z=>z.id===id);confirmDel('socios_mov',id,`Movimiento de ${x.de} a ${x.a} por ${PEN(x.monto)}.`)}});
  const q=document.getElementById('q');if(q){q.oninput=()=>{S.q=q.value;const pos=q.selectionStart;render();const n=document.getElementById('q');n.focus();n.setSelectionRange(pos,pos)}}
  const fc=document.getElementById('fcat');if(fc)fc.onchange=()=>{S.fcat=fc.value;render()};
  const fs=document.getElementById('fstock');if(fs)fs.onchange=()=>{S.fstock=fs.value;render()};
}
function route(){const h=(location.hash||'').slice(1);S.view=VIEWS.includes(h)?h:'resumen';render();window.scrollTo(0,0)}
window.addEventListener('hashchange',route);

/* ---------- datos (Supabase) ---------- */
const api={
  async add(t,data){const {error}=await S.sb.from(t).insert({data});if(error)throw error},
  async set(t,id,data){const {error}=await S.sb.from(t).upsert({id,data});if(error)throw error},
  async update(t,id,patch){const src={productos:null,movimientos:S.mov,compras:S.comp,gastos:S.gastos,separados:S.sep,socios_mov:S.smov}[t];
    const cur=(t==='productos'?S.prod[id]:src.find(x=>x.id===id))||{};const {id:_,...rest}=cur;
    const {error}=await S.sb.from(t).update({data:{...rest,...patch},actualizado_en:new Date().toISOString()}).eq('id',id);if(error)throw error},
  async del(t,id){const {error}=await S.sb.from(t).delete().eq('id',id);if(error)throw error}
};
const OPTIONAL=['gastos','separados','socios_mov','ajustes'];
async function loadTable(t){
  const {data,error}=await S.sb.from(t).select('id,data').limit(5000);
  if(error){if(OPTIONAL.includes(t)){console.warn('Tabla '+t+' no disponible',error.message);S.ready[t]=1;S.missing=(S.missing||new Set()).add(t);return}throw error}
  const rows=data.map(r=>({...r.data,id:r.id}));
  if(t==='productos'){S.prod={};data.forEach(r=>S.prod[r.id]=r.data)}
  else if(t==='movimientos')S.mov=rows;else if(t==='compras')S.comp=rows;else if(t==='gastos')S.gastos=rows;
  else if(t==='separados')S.sep=rows;else if(t==='socios_mov')S.smov=rows;else if(t==='ajustes'){S.ajustes={};data.forEach(r=>S.ajustes[r.id]=r.data)}
  S.ready[t]=1;
}
async function loadAll(){try{await Promise.all(TABLES.map(loadTable));render()}catch(e){console.error(e);toast('No se pudieron cargar los datos.')}}
async function loadNames(){const {data}=await S.sb.from('duenos').select('email,nombre');(data||[]).forEach(d=>S.names[d.email]=d.nombre||d.email);
  document.getElementById('who').textContent=S.names[S.email]||S.email||''}
let chan=null,timer=null;
async function enter(session){
  S.email=session.user.email;
  document.getElementById('loginView').hidden=true;document.getElementById('appView').hidden=false;
  timer=setTimeout(()=>{const b=document.getElementById('boot');if(b)b.innerHTML='<img src="icons/logo.png" alt=""><div>No se pudo conectar con los datos todavía.</div><div class="small">Revisa tu conexión a internet.</div>'},10000);
  await loadNames();await loadAll();clearTimeout(timer);
  if(!chan){chan=S.sb.channel('noor');TABLES.forEach(t=>chan.on('postgres_changes',{event:'*',schema:'public',table:t},()=>loadTable(t).then(render)));chan.subscribe()}
}
function showLogin(){document.getElementById('appView').hidden=true;document.getElementById('loginView').hidden=false;document.getElementById('l-e').focus()}
(async()=>{
  document.querySelectorAll('#nav a').forEach(a=>a.dataset.l=a.textContent);
  if(!window.NOOR_CONFIG||!NOOR_CONFIG.supabaseUrl||NOOR_CONFIG.supabaseUrl.includes('TU-PROYECTO')){
    document.body.innerHTML='<div class="wrap" style="padding-block:60px;text-align:center">Falta configurar <b>config.js</b> con los datos de Supabase. Revisa el README.</div>';return}
  S.sb=supabase.createClient(NOOR_CONFIG.supabaseUrl,NOOR_CONFIG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
  route();
  document.getElementById('lf').addEventListener('submit',async e=>{e.preventDefault();const b=document.getElementById('l-b'),er=document.getElementById('l-err');b.disabled=true;er.textContent='';
    const {data,error}=await S.sb.auth.signInWithPassword({email:document.getElementById('l-e').value.trim(),password:document.getElementById('l-p').value});
    b.disabled=false;if(error){er.textContent='Correo o contraseña incorrectos.';return}
    const {data:ok}=await S.sb.from('duenos').select('email').ilike('email',data.user.email).maybeSingle();
    if(!ok){await S.sb.auth.signOut();er.textContent='Este correo no está autorizado como dueño.';return}
    enter(data.session)});
  document.getElementById('logout').onclick=async()=>{await S.sb.auth.signOut();if(chan){S.sb.removeChannel(chan);chan=null}location.reload()};
  const {data:{session}}=await S.sb.auth.getSession();
  if(session)enter(session);else showLogin();
})();
