// ============================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================
const SUPABASE_URL = 'https://etvoolebvbycbqoclyyz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7rMCjL5sultiZ7lFqZm_Gw_Qc9k7SAJ';

const isConfigured = SUPABASE_URL !== 'SUA_URL_AQUI' && SUPABASE_ANON_KEY !== 'SUA_CHAVE_AQUI';
let sbClient = null;
if (isConfigured) { sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); }
else { var cw = document.getElementById('config-warning'); if (cw) cw.classList.add('show'); }

function setSync(st, msg) {
  const d = document.getElementById('sync-dot'); if (!d) return;
  d.className = 'sync-dot' + (st === 'saving' ? ' saving' : st === 'error' ? ' error' : '');
  document.getElementById('sync-text').textContent = msg;
}

// ===== CONSTANTES =====
const DIAS = [{ k: 'seg', l: 'Segunda' }, { k: 'ter', l: 'Terça' }, { k: 'qua', l: 'Quarta' }, { k: 'qui', l: 'Quinta' }, { k: 'sex', l: 'Sexta' }];
const PERIODS = [{ k: 'manha', l: 'Manhã', i: 'ti-sun' }, { k: 'tarde', l: 'Tarde', i: 'ti-sunset' }];
const TYPE_LABEL = { interna: 'Produto Interno', terceiro: 'Produto Terceiro', diversos: 'Diversos' };
const TC = { interna: 't-interna', terceiro: 't-terceiro', diversos: 't-diversos' };
const BT = { interna: 'b-interna', terceiro: 'b-terceiro', diversos: 'b-diversos' };
const BP = { Alta: 'b-alta', 'Média': 'b-media', Baixa: 'b-baixa' };
const PC = { Alta: 'd-alta', 'Média': 'd-media', Baixa: 'd-baixa' };
const todayIdx = (new Date().getDay() + 6) % 7;
const todayKey = todayIdx < 5 ? DIAS[todayIdx].k : null;

function fmtNow() { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

let items = [], dragId = null, modalId = null;

// ===== SUPABASE =====
function rowToItem(r) {
  return { id: r.id, title: r.title, type: r.type, resp: r.resp, prio: r.prio, day: r.day1 || null, per: r.period || null, obs: r.obs || '', status: r.status, statusLog: r.status_log || [] };
}
async function loadData() {
  if (!isConfigured) { setSync('error', 'Configure o Supabase no app.js'); render(); return; }
  setSync('saving', 'Carregando...');
  const { data, error } = await sbClient.from('kanban_items').select('*').order('created_at', { ascending: false });
  if (error) { setSync('error', 'Erro: ' + error.message); return; }
  items = data.map(rowToItem);
  setSync('ok', 'Sincronizado');
  render();
}
async function insertRemote(it) {
  setSync('saving', 'Salvando...');
  const { error } = await sbClient.from('kanban_items').insert({ title: it.title, type: it.type, resp: it.resp, prio: it.prio, day1: null, day2: null, period: 'manha', obs: it.obs, status: 'novo', steps: [], status_log: [] });
  if (error) { setSync('error', 'Erro: ' + error.message); return; }
  setSync('ok', 'Salvo');
}
async function updateRemote(id, fields) {
  setSync('saving', 'Salvando...');
  const { error } = await sbClient.from('kanban_items').update(fields).eq('id', id);
  if (error) { setSync('error', 'Erro: ' + error.message); return; }
  setSync('ok', 'Salvo');
}
async function deleteRemote(id) {
  setSync('saving', 'Removendo...');
  const { error } = await sbClient.from('kanban_items').delete().eq('id', id);
  if (error) { setSync('error', 'Erro: ' + error.message); return; }
  setSync('ok', 'Removido');
}
function subscribeRealtime() {
  if (!isConfigured) return;
  sbClient.channel('kanban_ch').on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_items' }, () => loadData()).subscribe();
}

// ===== FORMULÁRIO =====
function toggleForm() {
  const f = document.getElementById('form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}
function addItem() {
  const title = document.getElementById('f-title').value.trim();
  if (!title) { document.getElementById('f-title').focus(); return; }
  const it = {
    title,
    type: document.getElementById('f-type').value,
    resp: document.getElementById('f-resp').value,
    prio: document.getElementById('f-prio').value,
    obs: document.getElementById('f-obs').value
  };
  document.getElementById('f-title').value = '';
  document.getElementById('f-obs').value = '';
  toggleForm();
  if (isConfigured) { insertRemote(it).then(loadData); }
  else { items.unshift({ ...it, id: Date.now(), day: null, per: null, status: 'novo', statusLog: [] }); render(); }
}
function deleteItem(id) {
  if (!confirm('Remover este item?')) return;
  if (isConfigured) { deleteRemote(id).then(loadData); }
  else { items = items.filter(x => x.id !== id); render(); }
  closeModal();
}

// ===== EDIÇÃO =====
let editing = false;
function startEdit() { editing = true; openModal(modalId); }
function cancelEdit() { editing = false; openModal(modalId); }
function saveEdit(id) {
  const t = items.find(x => x.id === id); if (!t) return;
  const title = document.getElementById('e-title').value.trim();
  if (!title) { document.getElementById('e-title').focus(); return; }
  t.title = title;
  t.type = document.getElementById('e-type').value;
  t.resp = document.getElementById('e-resp').value;
  t.prio = document.getElementById('e-prio').value;
  t.obs = document.getElementById('e-obs').value;
  editing = false;
  if (isConfigured) { updateRemote(id, { title: t.title, type: t.type, resp: t.resp, prio: t.prio, obs: t.obs }).then(loadData); }
  else render();
  openModal(id);
}

// ===== DRAG & DROP =====
let wasDragging = false;
function dgStart(e, id) { dragId = id; wasDragging = true; e.dataTransfer.effectAllowed = 'move'; e.target.classList.add('dragging'); }
function dgEnd(e) { e.target.classList.remove('dragging'); setTimeout(() => { wasDragging = false; }, 50); }
function cardClick(id) { if (wasDragging) return; openModal(id); }
function dgOver(e, el) { e.preventDefault(); el.classList.add('drag-over'); }
function dgLeave(el) { el.classList.remove('drag-over'); }
function dropCell(e, day, per) {
  e.preventDefault();
  const t = items.find(x => x.id === dragId); if (!t) return;
  t.day = day; t.per = per; t.status = 'and';
  if (isConfigured) { updateRemote(t.id, { day1: day, day2: day, period: per, status: 'and' }).then(loadData); }
  else render();
}
function dropPool(e) {
  e.preventDefault();
  const t = items.find(x => x.id === dragId); if (!t) return;
  t.day = null; t.per = null; t.status = 'novo';
  if (isConfigured) { updateRemote(t.id, { day1: null, day2: null, status: 'novo' }).then(loadData); }
  else render();
}
function dropFin(e) {
  e.preventDefault();
  const t = items.find(x => x.id === dragId); if (!t) return;
  t.day = null; t.per = null; t.status = 'ok';
  if (isConfigured) { updateRemote(t.id, { day1: null, day2: null, status: 'ok' }).then(loadData); }
  else render();
}

// ===== NOTAS =====
function addLog(id) {
  const inp = document.getElementById('new-log'); const txt = inp.value.trim();
  if (!txt) { inp.focus(); return; }
  const t = items.find(x => x.id === id);
  if (!t.statusLog) t.statusLog = [];
  t.statusLog.unshift({ text: txt, date: fmtNow() });
  if (isConfigured) updateRemote(id, { status_log: t.statusLog });
  openModal(id);
}
function delLog(id, idx) {
  const t = items.find(x => x.id === id);
  t.statusLog.splice(idx, 1);
  if (isConfigured) updateRemote(id, { status_log: t.statusLog });
  openModal(id);
}

// ===== RENDER =====
function chip(x) {
  return `<div class="chip ${TC[x.type]} ${x.status === 'ok' ? 'done' : ''}" draggable="true" ondragstart="dgStart(event,${x.id})" ondragend="dgEnd(event)" onclick="cardClick(${x.id})">
    <div class="ct">${x.title}</div>
    <div class="cm"><span class="dot ${PC[x.prio]}"></span><span class="cr"><i class="ti ti-user" aria-hidden="true" style="font-size:10px"></i> ${x.resp}</span></div>
  </div>`;
}
function render() {
  const semDia = items.filter(x => !x.day && x.status !== 'ok');
  const fin = items.filter(x => x.status === 'ok');
  document.getElementById('pool-list').innerHTML = semDia.length ? semDia.map(chip).join('') : '<div class="empty">Vazio</div>';
  document.getElementById('fin-cards').innerHTML = fin.length ? fin.map(chip).join('') : '<div class="empty">Arraste aqui o que terminou</div>';
  document.getElementById('wk').innerHTML = DIAS.map(d => `
    <div class="day ${d.k === todayKey ? 'today' : ''}">
      <div class="dh">${d.l}${d.k === todayKey ? '<span class="today-tag">hoje</span>' : ''}</div>
      ${PERIODS.map(p => {
        const cs = items.filter(x => x.day === d.k && x.per === p.k && x.status !== 'ok');
        return `<div class="slot" ondragover="dgOver(event,this)" ondragleave="dgLeave(this)" ondrop="dropCell(event,'${d.k}','${p.k}')">
          <div class="sl"><i class="ti ${p.i}" aria-hidden="true"></i>${p.l}</div>
          ${cs.length ? cs.map(chip).join('') : '<div class="empty">—</div>'}
        </div>`;
      }).join('')}
    </div>`).join('');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

// ===== MODAL =====
function openModal(id) {
  modalId = id;
  const x = items.find(i => i.id === id); if (!x) return;

  if (editing) {
    document.getElementById('modal-body').innerHTML = `
      <div class="modal-top">
        <div class="modal-title">Editar afazer</div>
        <button class="modal-close" onclick="cancelEdit()" aria-label="Fechar"><i class="ti ti-x" aria-hidden="true"></i></button>
      </div>
      <div class="form" style="display:block">
        <label>Título</label><input id="e-title" value="${(x.title || '').replace(/"/g, '&quot;')}">
        <label>Tipo</label><select id="e-type">
          <option value="interna" ${x.type === 'interna' ? 'selected' : ''}>Produto Interno</option>
          <option value="terceiro" ${x.type === 'terceiro' ? 'selected' : ''}>Produto Terceiro</option>
          <option value="diversos" ${x.type === 'diversos' ? 'selected' : ''}>Diversos</option>
        </select>
        <label>Responsável</label><select id="e-resp">
          <option ${x.resp === 'Gabriel' ? 'selected' : ''}>Gabriel</option>
          <option ${x.resp === 'Anderson' ? 'selected' : ''}>Anderson</option>
          <option ${x.resp === 'Ambos' ? 'selected' : ''}>Ambos</option>
        </select>
        <label>Prioridade</label><select id="e-prio">
          <option ${x.prio === 'Alta' ? 'selected' : ''}>Alta</option>
          <option ${x.prio === 'Média' ? 'selected' : ''}>Média</option>
          <option ${x.prio === 'Baixa' ? 'selected' : ''}>Baixa</option>
        </select>
        <label>Observação</label><textarea id="e-obs">${x.obs || ''}</textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
        <button class="btn-x" onclick="cancelEdit()">Cancelar</button>
        <button class="btn btn-p" style="width:auto" onclick="saveEdit(${x.id})"><i class="ti ti-check" aria-hidden="true"></i>Salvar alterações</button>
      </div>`;
    document.getElementById('modal-wrap').classList.add('open');
    return;
  }

  const log = x.statusLog || [];
  const logHTML = log.length
    ? log.map((e, i) => `<div class="log-e"><div style="flex:1"><div style="font-size:13px;line-height:1.5">${e.text}</div><div style="font-size:11px;color:var(--text-tertiary);margin-top:3px">${e.date}</div></div><button class="btn-x btn-x-d" onclick="delLog(${x.id},${i})" aria-label="Remover"><i class="ti ti-x" aria-hidden="true"></i></button></div>`).join('')
    : '<p style="font-size:13px;color:var(--text-tertiary);padding:6px 0">Nenhuma nota ainda.</p>';
  const onde = x.status === 'ok' ? 'Finalizado' : (x.day ? `${DIAS.find(d => d.k === x.day).l} — ${PERIODS.find(p => p.k === x.per).l}` : 'Sem dia');
  document.getElementById('modal-body').innerHTML = `
    <div class="modal-top">
      <div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:8px">
          <span class="badge ${BT[x.type]}">${TYPE_LABEL[x.type]}</span>
          <span class="badge ${BP[x.prio]}">${x.prio}</span>
        </div>
        <div class="modal-title">${x.title}</div>
      </div>
      <button class="modal-close" onclick="closeModal()" aria-label="Fechar"><i class="ti ti-x" aria-hidden="true"></i></button>
    </div>
    ${x.obs ? `<div class="m-obs">${x.obs}</div>` : ''}
    <div class="m-info">
      <div><span>Responsável</span><span>${x.resp}</span></div>
      <div><span>Quando</span><span>${onde}</span></div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:4px">
      <button class="btn-x" onclick="startEdit()"><i class="ti ti-pencil" aria-hidden="true"></i>Editar</button>
    </div>
    <div class="m-lbl">Notas e acompanhamento</div>
    <div class="row" style="margin-bottom:8px">
      <input id="new-log" placeholder="Escreva uma atualização..." onkeydown="if(event.key==='Enter'){addLog(${x.id})}">
      <button class="btn btn-p" onclick="addLog(${x.id})"><i class="ti ti-plus" aria-hidden="true"></i>Add</button>
    </div>
    <div>${logHTML}</div>
    <div style="margin-top:18px;display:flex;justify-content:flex-end">
      <button class="btn-x btn-x-d" onclick="deleteItem(${x.id})"><i class="ti ti-trash" aria-hidden="true"></i>Remover afazer</button>
    </div>`;
  document.getElementById('modal-wrap').classList.add('open');
}
function closeModal(e) {
  if (!e || e.target === document.getElementById('modal-wrap')) {
    document.getElementById('modal-wrap').classList.remove('open');
    modalId = null;
    editing = false;
  }
}

// ===== INICIALIZAÇÃO =====
if (isConfigured) { loadData(); subscribeRealtime(); }
else { render(); setSync('error', 'Configure o Supabase no app.js'); }
