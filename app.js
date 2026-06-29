// ============================================
// CONFIGURAÇÃO DO SUPABASE
// Painel Supabase -> Project Settings -> API
// Cole a URL e a chave anon (public) abaixo:
// ============================================
const SUPABASE_URL = 'https://etvoolebvbycbqoclyyz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7rMCjL5sultiZ7lFqZm_Gw_Qc9k7SAJ';

const isConfigured = SUPABASE_URL !== 'SUA_URL_AQUI' && SUPABASE_ANON_KEY !== 'SUA_CHAVE_AQUI';
let supabase = null;
if (isConfigured) { supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); }
else { var cw = document.getElementById('config-warning'); if (cw) cw.classList.add('show'); }

function setSyncStatus(status, msg){ const dot=document.getElementById('sync-dot'); if(!dot)return; dot.className='sync-dot'+(status==='saving'?' saving':status==='error'?' error':''); document.getElementById('sync-text').textContent=msg; }


const DIAS=[{k:'seg',l:'Segunda'},{k:'ter',l:'Terça'},{k:'qua',l:'Quarta'},{k:'qui',l:'Quinta'},{k:'sex',l:'Sexta'}];
const ORDER=DIAS.map(d=>d.k);
const PERIODS=[{k:'manha',l:'Manhã',icon:'ti-sun'},{k:'tarde',l:'Tarde',icon:'ti-sunset'}];
const DAY_LABEL={seg:'Segunda',ter:'Terça',qua:'Quarta',qui:'Quinta',sex:'Sexta'};
const AB={seg:'Seg',ter:'Ter',qua:'Qua',qui:'Qui',sex:'Sex'};
const PER_LABEL={manha:'manhã',tarde:'tarde',dia:'dia inteiro'};
const STATUSES=[{id:'novo',label:'Novo'},{id:'and',label:'Em andamento'},{id:'aguard',label:'Aguardando'},{id:'ok',label:'Concluído'}];
const TYPE_LABEL={terceiro:'Produto Terceiro',interna:'Produto Interno',diversos:'Diversos'};
const TYPE_CLASS={terceiro:'t-terceiro',interna:'t-interna',diversos:'t-diversos'};
const PRIO_CLASS={Alta:'p-alta','Média':'p-media',Baixa:'p-baixa'};
const ST_CLASS={novo:'s-novo',and:'s-and',aguard:'s-aguard',ok:'s-ok'};
const ST_LABEL={novo:'Novo',and:'Em andamento',aguard:'Aguardando',ok:'Concluído'};
const todayIdx=(new Date().getDay()+6)%7;
const todayKey=todayIdx<5?DIAS[todayIdx].k:null;
const STEP_DEFS={
  interna:[{cat:'ERP / NW',steps:['Criação Cód NW','Estrutura Eng']},{cat:'Criação Geral',steps:['Projeto 3D','Simulação Fundição','Montagem 3D','2D Produção Usinagem','2D Moldagem Lista','2D Modelação Corte']},{cat:'Programação Master Cam',steps:['Gabarito','Cx Frente','CX Traseira','Modelo']},{cat:'Execução CNC',steps:['Entrada em Máquina','Gabarito','Furação Geral']},{cat:'Modelação',steps:['Entrega Modelação','Finalização Lateral']},{cat:'Modagem',steps:['Acompanhamento Inicial','Qtd de Peças','Peso molde']},{cat:'Fundição Protótipo',steps:['Data','Corrida','Peso peça','Peso Bruto','Peso Luva','Peso Canal','Liga']},{cat:'Inspeção de Medidas',steps:['Conferência','Liberação Produção','Endereço Almoxarifado']}],
  terceiro:[{cat:'ERP / NW',steps:['Criação Cód NW','Estrutura Eng']},{cat:'Modagem',steps:['Acompanhamento Inicial','Qtd de Peças','Peso molde']},{cat:'Fundição Protótipo',steps:['Data','Corrida','Peso peça','Peso Bruto','Peso Luva','Peso Canal','Liga']},{cat:'Inspeção de Medidas',steps:['Conferência','Liberação Produção','Endereço Almoxarifado']}],
  diversos:[]
};
function mkSteps(type){const defs=STEP_DEFS[type];if(!defs||!defs.length)return[];const s=[];defs.forEach(c=>c.steps.forEach(n=>s.push({name:n,cat:c.cat,done:false,doneAt:null})));return s;}
function fmtNow(){const d=new Date();return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
function fmtDate(d){if(!d)return'';const[y,m,day]=d.split('-');return`${day}/${m}`;}
function esc(s){return String(s).replace(/"/g,'&quot;');}

let WEEKLY=[
  {day:'Segunda-feira',tasks:['Planejamento da semana','Revisar cronograma dos projetos']},
  {day:'Terça-feira',tasks:['Acompanhar projetos em andamento']},
  {day:'Quarta-feira',tasks:['Reunião técnica','Revisão de melhorias']},
  {day:'Quinta-feira',tasks:['Auditoria dos processos','Organização da documentação']},
  {day:'Sexta-feira',tasks:['Revisão dos indicadores','Fechamento das pendências','Planejamento da próxima semana']},
];
const INDICATORS=['Projetos entregues no prazo','Horas gastas por projeto','Retrabalhos','Solicitações da produção','Não conformidades','Melhorias implantadas'];
function updWeekDay(i,v){WEEKLY[i].day=v;}
function updWeekTask(i,j,v){WEEKLY[i].tasks[j]=v;}
function delWeekTask(i,j){WEEKLY[i].tasks.splice(j,1);renderSemanal();}
function addWeekTask(i){WEEKLY[i].tasks.push('Nova tarefa');renderSemanal();}
function delWeekRow(i){WEEKLY.splice(i,1);renderSemanal();}
function addWeekRow(){WEEKLY.push({day:'Novo dia',tasks:['Nova tarefa']});renderSemanal();}
function renderSemanal(){
  document.getElementById('rot-semanal').innerHTML=`<div class="section-label">Por dia da semana</div>`+WEEKLY.map((w,i)=>`<div class="week-row"><div class="week-day-wrap"><input class="edit-field" value="${esc(w.day)}" onchange="updWeekDay(${i},this.value)"></div><div class="week-tasks">${w.tasks.map((t,j)=>`<div class="block-item-row"><span class="dot"></span><input class="edit-field" value="${esc(t)}" onchange="updWeekTask(${i},${j},this.value)"><button class="item-del" onclick="delWeekTask(${i},${j})" aria-label="Remover"><i class="ti ti-x" aria-hidden="true"></i></button></div>`).join('')}<button class="add-item-btn" onclick="addWeekTask(${i})"><i class="ti ti-plus" aria-hidden="true"></i>Adicionar tarefa</button></div><button class="item-del" style="opacity:1" onclick="delWeekRow(${i})" aria-label="Remover dia"><i class="ti ti-trash" aria-hidden="true"></i></button></div>`).join('')+`<button class="btn btn-add-block" onclick="addWeekRow()"><i class="ti ti-plus" aria-hidden="true"></i>Adicionar dia</button><div class="section-label">Indicadores semanais</div>`+INDICATORS.map(i=>`<div class="block-item" style="margin-bottom:7px"><span class="dot"></span>${i}</div>`).join('');
}

let cellNotes={'seg-manha':['Planejamento da semana'],'qua-manha':['Reunião técnica (quando houver)','Conferir e-mails de clientes'],'sex-tarde':['Revisão dos indicadores']};
function addNote(key){if(!cellNotes[key])cellNotes[key]=[];cellNotes[key].push('');renderSemana();}
function updNote(key,idx,v){cellNotes[key][idx]=v;}
function delNote(key,idx){cellNotes[key].splice(idx,1);renderSemana();}

let view='board',modalItemId=null,nextId=6;
let items=[];


/* ===== SUPABASE: carga, insert, update, delete, realtime ===== */
function rowToItem(r){return{id:r.id,title:r.title,type:r.type,resp:r.resp,prio:r.prio,day1:r.day1||'',day2:r.day2||'',period:r.period||'manha',date:r.due_date||'',obs:r.obs||'',status:r.status,steps:r.steps||[],statusLog:r.status_log||[]};}
async function loadData(){
  if(!isConfigured){setSyncStatus('error','Supabase não configurado — edite app.js');items=[];render();renderSemana();renderResumo();return;}
  setSyncStatus('saving','Carregando...');
  const{data,error}=await supabase.from('kanban_items').select('*').order('created_at',{ascending:false});
  if(error){setSyncStatus('error','Erro: '+error.message);return;}
  items=data.map(rowToItem);
  setSyncStatus('ok','Sincronizado — tempo real ativo');
  render();renderSemana();renderResumo();
}
async function insertItem(item){setSyncStatus('saving','Salvando...');const{error}=await supabase.from('kanban_items').insert({title:item.title,type:item.type,resp:item.resp,prio:item.prio,day1:item.day1||null,day2:item.day2||null,period:item.period,due_date:item.date||null,obs:item.obs,status:item.status,steps:item.steps,status_log:item.statusLog});if(error){setSyncStatus('error','Erro: '+error.message);return;}setSyncStatus('ok','Salvo');}
async function updateItemRemote(id,fields){setSyncStatus('saving','Salvando...');const{error}=await supabase.from('kanban_items').update(fields).eq('id',id);if(error){setSyncStatus('error','Erro: '+error.message);return;}setSyncStatus('ok','Salvo');}
async function deleteItemRemote(id){setSyncStatus('saving','Removendo...');const{error}=await supabase.from('kanban_items').delete().eq('id',id);if(error){setSyncStatus('error','Erro: '+error.message);return;}setSyncStatus('ok','Removido');}
function subscribeRealtime(){if(!isConfigured)return;supabase.channel('kanban_changes').on('postgres_changes',{event:'*',schema:'public',table:'kanban_items'},()=>loadData()).subscribe();}

function setMain(m){
  document.getElementById('mt-rotina').className='main-tab'+(m==='rotina'?' active':'');
  document.getElementById('mt-afazeres').className='main-tab'+(m==='afazeres'?' active':'');
  document.getElementById('main-rotina').style.display=m==='rotina'?'block':'none';
  document.getElementById('main-afazeres').style.display=m==='afazeres'?'block':'none';
  if(m==='rotina'){renderSemana();renderResumo();}
}
function setRotina(r){
  ['semana','semanal','resumo'].forEach(k=>{document.getElementById('st-'+k).className='sub-tab'+(k===r?' active':'');document.getElementById('rot-'+k).style.display=k===r?'block':'none';});
  document.getElementById('semana-note').style.display=r==='semana'?'block':'none';
  if(r==='semana')renderSemana();if(r==='semanal')renderSemanal();if(r==='resumo')renderResumo();
}

function coversCell(x,dayKey,periodKey){if(!x.day1)return false;const di=ORDER.indexOf(dayKey),s=ORDER.indexOf(x.day1),e=ORDER.indexOf(x.day2||x.day1);if(di<s||di>e)return false;if(x.period==='dia')return true;return x.period===periodKey;}
function spanLabel(x){const multiDay=x.day2&&x.day1!==x.day2;if(multiDay)return `${AB[x.day1]}–${AB[x.day2]}`;if(x.period==='dia')return 'dia todo';return null;}
function isContinuation(x,dayKey,periodKey){const firstPeriod=(x.period==='tarde')?'tarde':'manha';return !(dayKey===x.day1&&periodKey===firstPeriod);}
function chipHTML(x,dayKey,periodKey){const sl=spanLabel(x);const cont=isContinuation(x,dayKey,periodKey);return`<div class="chip ${TYPE_CLASS[x.type]} ${cont?'cont':''} ${x.status==='ok'?'done':''}" onclick="openModal(${x.id})"><div class="chip-title">${x.title}</div><div class="chip-meta"><span class="chip-resp"><i class="ti ti-user" aria-hidden="true" style="font-size:10px;margin-right:2px"></i>${x.resp}</span><span class="mini-prio ${PRIO_CLASS[x.prio]}">${x.prio}</span>${sl?`<span class="span-tag"><i class="ti ti-arrows-horizontal" aria-hidden="true" style="font-size:9px"></i>${sl}</span>`:''}</div></div>`;}
function renderSemana(){
  const el=document.getElementById('rot-semana');if(!el)return;
  el.innerHTML=`<div class="week-scroll"><div class="week-grid">`+DIAS.map(d=>`<div class="day-col ${d.k===todayKey?'today':''}"><div class="day-head">${d.l}${d.k===todayKey?'<span class="today-tag">hoje</span>':''}</div>${PERIODS.map(p=>{const key=d.k+'-'+p.k;const notes=cellNotes[key]||[];const chips=items.filter(x=>coversCell(x,d.k,p.k));return`<div class="period"><div class="period-label"><i class="ti ${p.icon}" aria-hidden="true" style="font-size:12px"></i>${p.l}</div><div class="notes-list">${notes.map((n,idx)=>`<div class="note-row"><input class="note-input" placeholder="lembrete..." value="${esc(n||'')}" onchange="updNote('${key}',${idx},this.value)"><button class="note-del" onclick="delNote('${key}',${idx})" aria-label="Remover"><i class="ti ti-x" aria-hidden="true"></i></button></div>`).join('')}</div><button class="add-note" onclick="addNote('${key}')"><i class="ti ti-plus" aria-hidden="true"></i>lembrete</button><div class="chips">${chips.length?chips.map(x=>chipHTML(x,d.k,p.k)).join(''):'<div class="chip-empty">—</div>'}</div></div>`;}).join('')}</div>`).join('')+`</div></div>`;
}

function personItems(name){return items.filter(x=>(x.resp===name||x.resp==='Ambos')&&x.status!=='ok');}
function schedText(x){if(!x.day1)return'';const multi=x.day2&&x.day1!==x.day2;if(multi)return`${AB[x.day1]}–${AB[x.day2]}`;return`${DAY_LABEL[x.day1]} ${PER_LABEL[x.period]}`;}
function colHTML(name){const list=personItems(name);const initials=name.substring(0,2).toUpperCase();const body=list.length?list.map(x=>`<div class="resumo-item" onclick="openModal(${x.id})"><div class="resumo-item-title">${x.title}</div><div class="resumo-item-badges"><span class="type-badge ${TYPE_CLASS[x.type]}">${TYPE_LABEL[x.type]}</span><span class="prio-badge ${PRIO_CLASS[x.prio]}">${x.prio}</span><span class="mini-status ${ST_CLASS[x.status]}">${ST_LABEL[x.status]}</span>${x.day1?`<span style="font-size:11px;color:var(--text-tertiary);margin-left:auto">${schedText(x)}</span>`:''}</div></div>`).join(''):'<div class="resumo-empty">Sem afazeres em aberto</div>';return`<div class="resumo-col"><div class="resumo-head"><span class="resumo-head-name"><span class="resumo-avatar">${initials}</span>${name}</span><span class="resumo-count">${list.length} em aberto</span></div><div class="resumo-body">${body}</div></div>`;}
function renderResumo(){const el=document.getElementById('rot-resumo');if(!el)return;el.innerHTML=`<div class="intro-note"><i class="ti ti-info-circle" aria-hidden="true" style="margin-right:5px"></i>Resumo automático dos afazeres em aberto de cada um. Itens "Ambos" aparecem nas duas colunas. Concluídos não aparecem aqui.</div><div class="resumo-grid">${colHTML('Gabriel')}${colHTML('Anderson')}</div>`;}

function setView(v){view=v;document.getElementById('btn-board').className=v==='board'?'btn active':'btn';document.getElementById('btn-list').className=v==='list'?'btn active':'btn';document.getElementById('view-board').style.display=v==='board'?'block':'none';document.getElementById('view-list').style.display=v==='list'?'block':'none';render();}
function toggleForm(){document.getElementById('form-wrap').classList.toggle('open');}
function addItem(){
  const title=document.getElementById('f-title').value.trim();if(!title){document.getElementById('f-title').focus();return;}
  const type=document.getElementById('f-type').value;const d1=document.getElementById('f-day1').value;let d2=document.getElementById('f-day2').value||d1;if(d1&&d2&&ORDER.indexOf(d2)<ORDER.indexOf(d1))d2=d1;
  const newItem={title,type,resp:document.getElementById('f-resp').value,prio:document.getElementById('f-prio').value,day1:d1,day2:d2,period:document.getElementById('f-period').value,date:document.getElementById('f-date').value,obs:document.getElementById('f-obs').value,status:'novo',steps:mkSteps(type),statusLog:[]};
  document.getElementById('f-title').value='';document.getElementById('f-date').value='';document.getElementById('f-obs').value='';toggleForm();
  if(isConfigured){insertItem(newItem).then(loadData);}else{newItem.id=Date.now();items.unshift(newItem);render();renderSemana();renderResumo();}
}
function deleteItem(id){if(!confirm('Remover este item?'))return;if(isConfigured){deleteItemRemote(id).then(loadData);}else{items=items.filter(x=>x.id!==id);render();renderSemana();renderResumo();}}
function moveItem(id,dir){const order=STATUSES.map(s=>s.id);const item=items.find(x=>x.id===id);const ni=order.indexOf(item.status)+dir;if(ni<0||ni>=4)return;item.status=order[ni];if(isConfigured){updateItemRemote(id,{status:item.status}).then(loadData);}else{render();renderSemana();renderResumo();}}
function setStatus(id,val){const item=items.find(x=>x.id===id);item.status=val;if(isConfigured){updateItemRemote(id,{status:val}).then(loadData);}else{render();renderSemana();renderResumo();}}
function toggleStep(itemId,si){const item=items.find(x=>x.id===itemId);const s=item.steps[si];s.done=!s.done;s.doneAt=s.done?fmtNow():null;const done=item.steps.filter(s=>s.done).length,total=item.steps.length;if(total>0){if(done===total)item.status='ok';else if(done>0)item.status='and';}if(isConfigured){updateItemRemote(itemId,{steps:item.steps,status:item.status}).then(loadData);}else{render();renderSemana();renderResumo();}if(modalItemId===itemId)openModal(itemId);}
function addLogEntry(itemId){const input=document.getElementById('new-log-text');const text=input.value.trim();if(!text){input.focus();return;}const item=items.find(x=>x.id===itemId);if(!item.statusLog)item.statusLog=[];item.statusLog.unshift({text,date:fmtNow()});if(isConfigured){updateItemRemote(itemId,{status_log:item.statusLog});}openModal(itemId);}
function deleteLogEntry(itemId,idx){const item=items.find(x=>x.id===itemId);item.statusLog.splice(idx,1);if(isConfigured){updateItemRemote(itemId,{status_log:item.statusLog});}openModal(itemId);}
function stepProg(item){if(!item.steps.length)return null;const done=item.steps.filter(s=>s.done).length;return{done,total:item.steps.length,pct:Math.round(done/item.steps.length*100)};}
function filtered(){const q=document.getElementById('f-search').value.toLowerCase();const ft=document.getElementById('f-ftype').value,fr=document.getElementById('f-fresp').value,fp=document.getElementById('f-fprio').value;return items.filter(x=>(!q||x.title.toLowerCase().includes(q)||(x.obs||'').toLowerCase().includes(q))&&(!ft||x.type===ft)&&(!fr||x.resp===fr||x.resp==='Ambos')&&(!fp||x.prio===fp));}
function renderStats(){document.getElementById('stats').innerHTML=`<div class="stat"><div class="stat-n">${items.length}</div><div class="stat-l">Total</div></div><div class="stat"><div class="stat-n" style="color:#185FA5">${items.filter(x=>x.status==='and').length}</div><div class="stat-l">Em andamento</div></div><div class="stat"><div class="stat-n" style="color:#854F0B">${items.filter(x=>x.status==='aguard').length}</div><div class="stat-l">Aguardando</div></div><div class="stat"><div class="stat-n" style="color:#3B6D11">${items.filter(x=>x.status==='ok').length}</div><div class="stat-l">Concluídas</div></div>`;}
function cardHTML(x,si){const prog=stepProg(x);const logCount=(x.statusLog||[]).length;const sched=schedText(x);return`<div class="card"><div class="card-title" onclick="openModal(${x.id})">${x.title}</div><div class="card-badges"><span class="type-badge ${TYPE_CLASS[x.type]}">${TYPE_LABEL[x.type]}</span><span class="prio-badge ${PRIO_CLASS[x.prio]}">${x.prio}</span></div>${x.obs?`<div class="card-obs">${x.obs}</div>`:''}${prog?`<div class="prog-wrap"><div class="prog-row"><span style="font-size:12px;color:var(--text-secondary)">Progresso</span><span style="font-size:12px;font-weight:500">${prog.done}/${prog.total}</span></div><div class="prog-bar"><div class="prog-fill" style="width:${prog.pct}%"></div></div></div>`:''}<div class="card-footer"><span class="card-resp"><i class="ti ti-user" aria-hidden="true" style="font-size:14px"></i>${x.resp}</span>${sched?`<span class="card-sched"><i class="ti ti-calendar-event" aria-hidden="true" style="font-size:13px"></i>${sched}</span>`:''}</div><div class="card-actions">${si>0?`<button class="btn-xs" onclick="moveItem(${x.id},-1)"><i class="ti ti-arrow-left" aria-hidden="true"></i></button>`:''}${si<3?`<button class="btn-xs" onclick="moveItem(${x.id},1)">Avançar<i class="ti ti-arrow-right" aria-hidden="true"></i></button>`:''}<button class="btn-xs" onclick="openModal(${x.id})" style="margin-left:auto"><i class="ti ti-message-circle" aria-hidden="true"></i>${logCount?logCount:''} Notas</button><button class="btn-xs btn-xs-danger" onclick="deleteItem(${x.id})"><i class="ti ti-trash" aria-hidden="true"></i></button></div></div>`;}
function renderBoard(){const f=filtered();document.getElementById('view-board').innerHTML=`<div class="board">${STATUSES.map((st,si)=>{const cards=f.filter(x=>x.status===st.id);return`<div class="col-wrap"><div class="col-head"><span class="col-head-title">${st.label}</span><span class="col-count">${cards.length}</span></div><div class="col-body">${cards.length===0?'<div class="empty-col">Nenhum item</div>':cards.map(x=>cardHTML(x,si)).join('')}</div></div>`;}).join('')}</div>`;}
function renderList(){const f=filtered();if(!f.length){document.getElementById('view-list').innerHTML='<p style="font-size:14px;color:var(--text-tertiary);text-align:center;padding:3rem 0">Nenhum item encontrado</p>';return;}document.getElementById('view-list').innerHTML=`<div class="list-wrap"><table class="list-table"><thead><tr><th style="width:26%">Título</th><th style="width:13%">Tipo</th><th style="width:8%">Prio.</th><th style="width:10%">Resp.</th><th style="width:14%">Quando</th><th style="width:13%">Progresso</th><th style="width:11%">Status</th></tr></thead><tbody>${f.map(x=>{const prog=stepProg(x);return`<tr><td style="font-weight:500;cursor:pointer" onclick="openModal(${x.id})">${x.title}</td><td><span class="type-badge ${TYPE_CLASS[x.type]}">${TYPE_LABEL[x.type]}</span></td><td><span class="prio-badge ${PRIO_CLASS[x.prio]}">${x.prio}</span></td><td style="font-size:13px">${x.resp}</td><td style="font-size:13px">${schedText(x)||'—'}</td><td>${prog?`<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:6px;background:var(--bg-secondary);border-radius:999px;overflow:hidden"><div style="height:100%;width:${prog.pct}%;background:var(--green);border-radius:999px"></div></div><span style="font-size:12px;color:var(--text-secondary)">${prog.pct}%</span></div>`:'—'}</td><td><select class="st-sel ${ST_CLASS[x.status]}" onchange="setStatus(${x.id},this.value)">${STATUSES.map(s=>`<option value="${s.id}" ${x.status===s.id?'selected':''}>${s.label}</option>`).join('')}</select></td></tr>`;}).join('')}</tbody></table></div>`;}
function openModal(id){
  modalItemId=id;const x=items.find(i=>i.id===id);const prog=stepProg(x);const sched=schedText(x);
  let stepsHTML='';
  if(x.steps.length){const cats=[...new Set(x.steps.map(s=>s.cat))];stepsHTML=cats.map(cat=>{const cs=x.steps.map((s,i)=>({...s,i})).filter(s=>s.cat===cat);return`<div><div class="cat-title">${cat}</div>${cs.map(s=>`<div class="step-row ${s.done?'done':''}" onclick="toggleStep(${x.id},${s.i})"><div class="step-check ${s.done?'done':''}"><i class="ti ti-check" aria-hidden="true" style="font-size:12px;color:white;${s.done?'':'opacity:0'}"></i></div><span class="step-name ${s.done?'done':''}">${s.name}</span>${s.done&&s.doneAt?`<span class="step-date">${s.doneAt}</span>`:''}</div>`).join('')}</div>`;}).join('');}else{stepsHTML='<p style="font-size:14px;color:var(--text-tertiary);text-align:center;padding:1rem 0">Sem etapas para este tipo</p>';}
  const log=x.statusLog||[];const logHTML=log.length?log.map((e,idx)=>`<div class="log-entry"><div style="flex:1"><div style="font-size:13px;line-height:1.5">${e.text}</div><div style="font-size:11px;color:var(--text-tertiary);margin-top:3px"><i class="ti ti-clock" aria-hidden="true" style="font-size:10px;margin-right:3px"></i>${e.date}</div></div><button class="btn-xs btn-xs-danger" onclick="deleteLogEntry(${x.id},${idx})" aria-label="Remover"><i class="ti ti-x" aria-hidden="true"></i></button></div>`).join(''):'<p style="font-size:13px;color:var(--text-tertiary);padding:8px 0">Nenhuma nota registrada ainda.</p>';
  const schedFull=sched?(x.day2&&x.day1!==x.day2?`${DAY_LABEL[x.day1]} a ${DAY_LABEL[x.day2]} (${PER_LABEL[x.period]})`:`${DAY_LABEL[x.day1]} de ${PER_LABEL[x.period]}`):'';
  document.getElementById('modal-body').innerHTML=`<div class="modal-top"><div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><span class="type-badge ${TYPE_CLASS[x.type]}">${TYPE_LABEL[x.type]}</span><span class="prio-badge ${PRIO_CLASS[x.prio]}">${x.prio}</span><span class="${ST_CLASS[x.status]}" style="font-size:12px;padding:3px 10px;border-radius:999px;font-weight:500">${ST_LABEL[x.status]}</span></div><div class="modal-title">${x.title}</div></div><button class="modal-close" onclick="closeModal()" aria-label="Fechar"><i class="ti ti-x" aria-hidden="true"></i></button></div>${schedFull?`<div class="sched-line"><i class="ti ti-calendar-event" aria-hidden="true"></i>Agendado para <strong style="color:var(--text-primary)">${schedFull}</strong></div>`:''}${x.obs?`<div style="font-size:14px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;padding:12px 16px;background:var(--bg-secondary);border-radius:var(--radius-md)">${x.obs}</div>`:''}<div class="modal-info"><div class="modal-info-item"><span>Responsável</span><span>${x.resp}</span></div>${x.date?`<div class="modal-info-item"><span>Prazo</span><span>${fmtDate(x.date)}</span></div>`:''}</div>${prog?`<div style="margin-bottom:20px"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13px;color:var(--text-secondary)">Progresso geral</span><span style="font-size:13px;font-weight:500">${prog.done} de ${prog.total} (${prog.pct}%)</span></div><div class="prog-bar" style="height:8px"><div class="prog-fill" style="width:${prog.pct}%"></div></div></div>`:''}${x.steps.length?`<div style="font-size:13px;font-weight:500;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Etapas do processo</div>${stepsHTML}`:''}<div style="font-size:13px;font-weight:500;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.06em;margin:20px 0 10px">Notas e acompanhamento</div><div style="display:flex;gap:8px;margin-bottom:8px"><input id="new-log-text" placeholder="Escreva uma atualização..." style="flex:1" onkeydown="if(event.key==='Enter'){addLogEntry(${x.id})}"><button class="btn btn-primary" onclick="addLogEntry(${x.id})" style="white-space:nowrap"><i class="ti ti-plus" aria-hidden="true"></i>Adicionar</button></div><div>${logHTML}</div>`;
  document.getElementById('modal-wrap').classList.add('open');
}
function closeModal(e){if(!e||e.target===document.getElementById('modal-wrap')){document.getElementById('modal-wrap').classList.remove('open');modalItemId=null;}}
function render(){renderStats();if(view==='board')renderBoard();else renderList();}

renderSemanal();
if(isConfigured){loadData();subscribeRealtime();}else{renderSemana();renderResumo();render();setSyncStatus('error','Configure o Supabase no app.js');}
