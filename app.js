// ============================================
// CONFIGURAÇÃO DO SUPABASE
// Preencha com os dados do seu projeto:
// Painel Supabase → Project Settings → API
// ============================================
const SUPABASE_URL = 'https://etvoolebvbycbqoclyyz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7rMCjL5sultiZ7lFqZm_Gw_Qc9k7SAJ';

const isConfigured = SUPABASE_URL !== 'SUA_URL_AQUI' && SUPABASE_ANON_KEY !== 'SUA_CHAVE_AQUI';
let supabase = null;
if (isConfigured) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  document.getElementById('config-warning').classList.add('show');
}

const STATUSES = [
  { id: 'novo', label: 'Novo' },
  { id: 'and', label: 'Em andamento' },
  { id: 'aguard', label: 'Aguardando' },
  { id: 'ok', label: 'Concluído' },
];
const TYPE_LABEL = { terceiro: 'Produto Terceiro', interna: 'Produto Interno', recado: 'Anotações / Recados' };
const TYPE_CLASS = { terceiro: 't-terceiro', interna: 't-interna', recado: 't-recado' };
const PRIO_CLASS = { Alta: 'p-alta', 'Média': 'p-media', Baixa: 'p-baixa' };
const ST_CLASS = { novo: 's-novo', and: 's-and', aguard: 's-aguard', ok: 's-ok' };

const STEP_DEFS = {
  interna: [
    { cat: 'ERP / NW', steps: ['Criação Cód NW', 'Estrutura Eng'] },
    { cat: 'Criação Geral', steps: ['Projeto 3D', 'Simulação Fundição', 'Montagem 3D', '2D Produção Usinagem', '2D Moldagem Lista', '2D Modelação Corte'] },
    { cat: 'Programação Master Cam', steps: ['Gabarito', 'Cx Frente', 'CX Traseira', 'Modelo'] },
    { cat: 'Execução CNC', steps: ['Entrada em Máquina', 'Gabarito', 'Furação Geral'] },
    { cat: 'Modelação', steps: ['Entrega Modelação', 'Finalização Lateral'] },
    { cat: 'Modagem', steps: ['Acompanhamento Inicial', 'Qtd de Peças', 'Peso molde'] },
    { cat: 'Fundição Protótipo', steps: ['Data', 'Corrida', 'Peso peça', 'Peso Bruto', 'Peso Luva', 'Peso Canal', 'Liga'] },
    { cat: 'Inspeção de Medidas', steps: ['Conferência', 'Liberação Produção', 'Endereço Almoxarifado'] },
  ],
  terceiro: [
    { cat: 'ERP / NW', steps: ['Criação Cód NW', 'Estrutura Eng'] },
    { cat: 'Modagem', steps: ['Acompanhamento Inicial', 'Qtd de Peças', 'Peso molde'] },
    { cat: 'Fundição Protótipo', steps: ['Data', 'Corrida', 'Peso peça', 'Peso Bruto', 'Peso Luva', 'Peso Canal', 'Liga'] },
    { cat: 'Inspeção de Medidas', steps: ['Conferência', 'Liberação Produção', 'Endereço Almoxarifado'] },
  ],
  recado: []
};

function mkSteps(type) {
  const defs = STEP_DEFS[type];
  if (!defs || !defs.length) return [];
  const s = [];
  defs.forEach(c => c.steps.forEach(n => s.push({ name: n, cat: c.cat, done: false, doneAt: null })));
  return s;
}
function fmtNow() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}`;
}

let view = 'board', modalItemId = null, items = [];

function setSyncStatus(status, msg) {
  const dot = document.getElementById('sync-dot');
  const txt = document.getElementById('sync-text');
  dot.className = 'sync-dot' + (status === 'saving' ? ' saving' : status === 'error' ? ' error' : '');
  txt.textContent = msg;
}

// ============================================
// CARREGAR E SALVAR DADOS (Supabase)
// ============================================
async function loadData() {
  if (!isConfigured) {
    setSyncStatus('error', 'Supabase não configurado — edite app.js');
    items = [];
    render();
    return;
  }
  setSyncStatus('saving', 'Carregando dados...');
  const { data, error } = await supabase.from('kanban_items').select('*').order('created_at', { ascending: false });
  if (error) {
    setSyncStatus('error', 'Erro ao carregar: ' + error.message);
    return;
  }
  items = data.map(rowToItem);
  setSyncStatus('ok', 'Sincronizado com Supabase — tempo real ativo');
  render();
}

function rowToItem(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    prio: row.prio,
    resp: row.resp,
    date: row.due_date || '',
    obs: row.obs || '',
    status: row.status,
    steps: row.steps || [],
    statusLog: row.status_log || [],
  };
}

async function insertItem(item) {
  setSyncStatus('saving', 'Salvando...');
  const { data, error } = await supabase.from('kanban_items').insert({
    title: item.title, type: item.type, prio: item.prio, resp: item.resp,
    due_date: item.date || null, obs: item.obs, status: item.status,
    steps: item.steps, status_log: item.statusLog,
  }).select();
  if (error) { setSyncStatus('error', 'Erro ao salvar: ' + error.message); return null; }
  setSyncStatus('ok', 'Salvo — sincronizado');
  return data[0];
}

async function updateItem(id, fields) {
  setSyncStatus('saving', 'Salvando...');
  const { error } = await supabase.from('kanban_items').update(fields).eq('id', id);
  if (error) { setSyncStatus('error', 'Erro ao salvar: ' + error.message); return; }
  setSyncStatus('ok', 'Salvo — sincronizado');
}

async function deleteItemRemote(id) {
  setSyncStatus('saving', 'Removendo...');
  const { error } = await supabase.from('kanban_items').delete().eq('id', id);
  if (error) { setSyncStatus('error', 'Erro ao remover: ' + error.message); return; }
  setSyncStatus('ok', 'Removido — sincronizado');
}

// ============================================
// REALTIME — escuta alterações feitas pelo outro usuário
// ============================================
function subscribeRealtime() {
  if (!isConfigured) return;
  supabase.channel('kanban_items_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_items' }, () => {
      loadData();
    })
    .subscribe();
}

// ============================================
// AÇÕES DO USUÁRIO
// ============================================
function setView(v) {
  view = v;
  document.getElementById('btn-board').className = v === 'board' ? 'btn btn-active' : 'btn';
  document.getElementById('btn-list').className = v === 'list' ? 'btn btn-active' : 'btn';
  document.getElementById('view-board').style.display = v === 'board' ? 'block' : 'none';
  document.getElementById('view-list').style.display = v === 'list' ? 'block' : 'none';
  render();
}
function toggleForm() { document.getElementById('form-wrap').classList.toggle('open'); }

async function addItem() {
  const title = document.getElementById('f-title').value.trim();
  if (!title) { document.getElementById('f-title').focus(); return; }
  const type = document.getElementById('f-type').value;
  const newItem = {
    title, type,
    prio: document.getElementById('f-prio').value,
    resp: document.getElementById('f-resp').value,
    date: document.getElementById('f-date').value,
    obs: document.getElementById('f-obs').value,
    status: 'novo',
    steps: mkSteps(type),
    statusLog: [],
  };
  document.getElementById('f-title').value = '';
  document.getElementById('f-date').value = '';
  document.getElementById('f-obs').value = '';
  toggleForm();
  if (isConfigured) {
    await insertItem(newItem);
    await loadData();
  } else {
    newItem.id = Date.now();
    items.unshift(newItem);
    render();
  }
}

async function deleteItem(id) {
  if (!confirm('Remover este item?')) return;
  if (isConfigured) { await deleteItemRemote(id); await loadData(); }
  else { items = items.filter(x => x.id !== id); render(); }
}

async function moveItem(id, dir) {
  const order = STATUSES.map(s => s.id);
  const item = items.find(x => x.id === id);
  const ni = order.indexOf(item.status) + dir;
  if (ni < 0 || ni >= 4) return;
  item.status = order[ni];
  if (isConfigured) { await updateItem(id, { status: item.status }); await loadData(); }
  else render();
}

async function setStatus(id, val) {
  const item = items.find(x => x.id === id);
  item.status = val;
  if (isConfigured) { await updateItem(id, { status: val }); await loadData(); }
  else render();
}

async function toggleStep(itemId, si) {
  const item = items.find(x => x.id === itemId);
  const s = item.steps[si];
  s.done = !s.done;
  s.doneAt = s.done ? fmtNow() : null;
  const done = item.steps.filter(s => s.done).length, total = item.steps.length;
  if (total > 0) { if (done === total) item.status = 'ok'; else if (done > 0) item.status = 'and'; }
  if (isConfigured) {
    await updateItem(itemId, { steps: item.steps, status: item.status });
    await loadData();
    if (modalItemId === itemId) openModal(itemId);
  } else {
    render();
    if (modalItemId === itemId) openModal(itemId);
  }
}

// Histórico de observações (status escrito à mão, com data)
async function addLogEntry(itemId) {
  const input = document.getElementById('new-log-text');
  const text = input.value.trim();
  if (!text) { input.focus(); return; }
  const item = items.find(x => x.id === itemId);
  if (!item.statusLog) item.statusLog = [];
  item.statusLog.unshift({ text, date: fmtNow() });
  if (isConfigured) {
    await updateItem(itemId, { status_log: item.statusLog });
    await loadData();
  }
  openModal(itemId);
}

async function deleteLogEntry(itemId, idx) {
  const item = items.find(x => x.id === itemId);
  item.statusLog.splice(idx, 1);
  if (isConfigured) {
    await updateItem(itemId, { status_log: item.statusLog });
    await loadData();
  }
  openModal(itemId);
}

function stepProg(item) {
  if (!item.steps.length) return null;
  const done = item.steps.filter(s => s.done).length;
  return { done, total: item.steps.length, pct: Math.round(done / item.steps.length * 100) };
}

function filtered() {
  const q = document.getElementById('f-search').value.toLowerCase();
  const ft = document.getElementById('f-ftype').value, fr = document.getElementById('f-fresp').value, fp = document.getElementById('f-fprio').value;
  return items.filter(x => (!q || x.title.toLowerCase().includes(q) || (x.obs || '').toLowerCase().includes(q)) && (!ft || x.type === ft) && (!fr || x.resp === fr || x.resp === 'Ambos') && (!fp || x.prio === fp));
}

// ============================================
// RENDER
// ============================================
function renderStats() {
  document.getElementById('stats').innerHTML = `
    <div class="stat"><div class="stat-n">${items.length}</div><div class="stat-l">Total de entradas</div></div>
    <div class="stat"><div class="stat-n" style="color:#185FA5">${items.filter(x => x.status === 'and').length}</div><div class="stat-l">Em andamento</div></div>
    <div class="stat"><div class="stat-n" style="color:#854F0B">${items.filter(x => x.status === 'aguard').length}</div><div class="stat-l">Aguardando</div></div>
    <div class="stat"><div class="stat-n" style="color:#3B6D11">${items.filter(x => x.status === 'ok').length}</div><div class="stat-l">Concluídas</div></div>`;
}

function cardHTML(x, si) {
  const prog = stepProg(x);
  const logCount = (x.statusLog || []).length;
  return `<div class="card">
    <div class="card-title" onclick="openModal(${x.id})">${x.title}</div>
    <div class="card-badges"><span class="type-badge ${TYPE_CLASS[x.type]}">${TYPE_LABEL[x.type]}</span><span class="prio-badge ${PRIO_CLASS[x.prio]}">${x.prio}</span></div>
    ${x.obs ? `<div class="card-obs">${x.obs}</div>` : ''}
    ${prog ? `<div class="prog-wrap"><div class="prog-row"><span style="font-size:12px;color:var(--text-secondary)">Progresso</span><span style="font-size:12px;font-weight:500">${prog.done}/${prog.total} etapas</span></div><div class="prog-bar"><div class="prog-fill" style="width:${prog.pct}%"></div></div></div>` : ''}
    <div class="card-footer">
      <span class="card-resp"><i class="ti ti-user" aria-hidden="true" style="font-size:14px"></i>${x.resp}</span>
      ${x.date ? `<span class="card-date"><i class="ti ti-calendar" aria-hidden="true" style="font-size:13px"></i>${fmtDate(x.date)}</span>` : ''}
    </div>
    <div class="card-actions">
      ${si > 0 ? `<button class="btn-xs" onclick="moveItem(${x.id},-1)"><i class="ti ti-arrow-left" aria-hidden="true"></i>Voltar</button>` : ''}
      ${si < 3 ? `<button class="btn-xs" onclick="moveItem(${x.id},1)">Avançar<i class="ti ti-arrow-right" aria-hidden="true"></i></button>` : ''}
      <button class="btn-xs" onclick="openModal(${x.id})" style="margin-left:auto"><i class="ti ti-message-circle" aria-hidden="true"></i>${logCount ? logCount + ' nota' + (logCount > 1 ? 's' : '') : 'Notas'}</button>
      <button class="btn-xs btn-xs-danger" onclick="deleteItem(${x.id})"><i class="ti ti-trash" aria-hidden="true"></i></button>
    </div>
  </div>`;
}

function renderBoard() {
  const f = filtered();
  document.getElementById('view-board').innerHTML = `<div class="board">${STATUSES.map((st, si) => {
    const cards = f.filter(x => x.status === st.id);
    return `<div class="col-wrap"><div class="col-head"><span class="col-head-title">${st.label}</span><span class="col-count">${cards.length}</span></div><div class="col-body">${cards.length === 0 ? '<div class="empty-col">Nenhum item</div>' : cards.map(x => cardHTML(x, si)).join('')}</div></div>`;
  }).join('')}</div>`;
}

function renderList() {
  const f = filtered();
  if (!f.length) { document.getElementById('view-list').innerHTML = '<p style="font-size:14px;color:var(--text-tertiary);text-align:center;padding:3rem 0">Nenhum item encontrado</p>'; return; }
  document.getElementById('view-list').innerHTML = `<div class="list-wrap"><table class="list-table">
    <thead><tr><th style="width:28%">Título</th><th style="width:13%">Tipo</th><th style="width:8%">Prio.</th><th style="width:10%">Resp.</th><th style="width:9%">Prazo</th><th style="width:13%">Progresso</th><th style="width:9%">Notas</th><th style="width:10%">Status</th></tr></thead>
    <tbody>${f.map(x => { const prog = stepProg(x); return `<tr>
      <td style="font-weight:500;cursor:pointer" onclick="openModal(${x.id})">${x.title}</td>
      <td><span class="type-badge ${TYPE_CLASS[x.type]}">${TYPE_LABEL[x.type]}</span></td>
      <td><span class="prio-badge ${PRIO_CLASS[x.prio]}">${x.prio}</span></td>
      <td style="font-size:13px">${x.resp}</td>
      <td style="font-size:13px">${fmtDate(x.date) || '—'}</td>
      <td>${prog ? `<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:6px;background:var(--bg-secondary);border-radius:999px;overflow:hidden"><div style="height:100%;width:${prog.pct}%;background:var(--green);border-radius:999px"></div></div><span style="font-size:12px;color:var(--text-secondary)">${prog.pct}%</span></div>` : '—'}</td>
      <td style="font-size:13px;color:var(--text-secondary)">${(x.statusLog || []).length || '—'}</td>
      <td><select class="st-sel ${ST_CLASS[x.status]}" onchange="setStatus(${x.id},this.value)">${STATUSES.map(s => `<option value="${s.id}" ${x.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}</select></td>
    </tr>`; }).join('')}</tbody></table></div>`;
}

function openModal(id) {
  modalItemId = id;
  const x = items.find(i => i.id === id);
  const prog = stepProg(x);
  let stepsHTML = '';
  if (x.steps.length) {
    const cats = [...new Set(x.steps.map(s => s.cat))];
    stepsHTML = cats.map(cat => {
      const cs = x.steps.map((s, i) => ({ ...s, i })).filter(s => s.cat === cat);
      return `<div><div class="cat-title">${cat}</div>${cs.map(s => `
        <div class="step-row ${s.done ? 'done' : ''}" onclick="toggleStep(${x.id},${s.i})">
          <div class="step-check ${s.done ? 'done' : ''}"><i class="ti ti-check" aria-hidden="true" style="font-size:12px;color:white;${s.done ? '' : 'opacity:0'}"></i></div>
          <span class="step-name ${s.done ? 'done' : ''}">${s.name}</span>
          ${s.done && s.doneAt ? `<span class="step-date"><i class="ti ti-clock" aria-hidden="true" style="font-size:11px;margin-right:3px"></i>${s.doneAt}</span>` : ''}
        </div>`).join('')}</div>`;
    }).join('');
  } else {
    stepsHTML = '<p style="font-size:14px;color:var(--text-tertiary);text-align:center;padding:1rem 0">Sem etapas para este tipo</p>';
  }

  const log = x.statusLog || [];
  const logHTML = log.length
    ? log.map((entry, idx) => `
      <div style="display:flex;gap:10px;padding:10px 0;border-bottom:0.5px solid var(--border-tertiary)">
        <div style="flex:1">
          <div style="font-size:13px;line-height:1.5;color:var(--text-primary)">${entry.text}</div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-top:3px"><i class="ti ti-clock" aria-hidden="true" style="font-size:10px;margin-right:3px"></i>${entry.date}</div>
        </div>
        <button class="btn-xs btn-xs-danger" onclick="deleteLogEntry(${x.id},${idx})" style="align-self:flex-start" aria-label="Remover nota"><i class="ti ti-x" aria-hidden="true"></i></button>
      </div>`).join('')
    : '<p style="font-size:13px;color:var(--text-tertiary);padding:8px 0">Nenhuma nota registrada ainda.</p>';

  document.getElementById('modal-body').innerHTML = `
    <div class="modal-top">
      <div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          <span class="type-badge ${TYPE_CLASS[x.type]}">${TYPE_LABEL[x.type]}</span>
          <span class="prio-badge ${PRIO_CLASS[x.prio]}">${x.prio}</span>
          <span class="${ST_CLASS[x.status]}" style="font-size:12px;padding:3px 10px;border-radius:999px;font-weight:500">${STATUSES.find(s => s.id === x.status).label}</span>
        </div>
        <div class="modal-title">${x.title}</div>
      </div>
      <button class="modal-close" onclick="closeModal()" aria-label="Fechar"><i class="ti ti-x" aria-hidden="true"></i></button>
    </div>
    ${x.obs ? `<div style="font-size:14px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;padding:12px 16px;background:var(--bg-secondary);border-radius:var(--radius-md)">${x.obs}</div>` : ''}
    <div class="modal-info">
      <div class="modal-info-item"><span>Responsável</span><span>${x.resp}</span></div>
      ${x.date ? `<div class="modal-info-item"><span>Prazo</span><span>${fmtDate(x.date)}</span></div>` : ''}
    </div>
    ${prog ? `<div style="margin-bottom:20px"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13px;color:var(--text-secondary)">Progresso geral</span><span style="font-size:13px;font-weight:500">${prog.done} de ${prog.total} etapas (${prog.pct}%)</span></div><div class="prog-bar" style="height:8px"><div class="prog-fill" style="width:${prog.pct}%"></div></div></div>` : ''}
    ${x.steps.length ? `<div style="font-size:13px;font-weight:500;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Etapas do processo</div>${stepsHTML}` : ''}

    <div style="font-size:13px;font-weight:500;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.06em;margin:20px 0 10px">Notas e acompanhamento</div>
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <input id="new-log-text" placeholder="Escreva uma atualização..." style="flex:1" onkeydown="if(event.key==='Enter'){addLogEntry(${x.id})}">
      <button class="btn btn-primary" onclick="addLogEntry(${x.id})" style="white-space:nowrap"><i class="ti ti-plus" aria-hidden="true"></i>Adicionar</button>
    </div>
    <div>${logHTML}</div>
  `;
  document.getElementById('modal-wrap').classList.add('open');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modal-wrap')) {
    document.getElementById('modal-wrap').classList.remove('open');
    modalItemId = null;
  }
}

function render() { renderStats(); if (view === 'board') renderBoard(); else renderList(); }

loadData();
subscribeRealtime();
