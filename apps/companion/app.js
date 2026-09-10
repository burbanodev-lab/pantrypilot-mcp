/**
 * Minimal Streamable HTTP MCP client (JSON response mode) for demo UX.
 * No secrets; talks to PantryPilot /mcp.
 */

const $ = (id) => document.getElementById(id);

const PROTOCOL = '2025-11-25';
let rpcId = 1;
let sessionId = null;

function log(msg) {
  const el = $('log');
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.textContent = `${el.textContent ? el.textContent + '\n' : ''}${line}`;
  el.scrollTop = el.scrollHeight;
}

function setStatus(state, text) {
  const el = $('connStatus');
  el.dataset.state = state;
  el.textContent = text;
}

function mcpUrl() {
  const raw = $('mcpUrl').value.trim() || '/mcp';
  try {
    return new URL(raw, window.location.origin).toString();
  } catch {
    return raw;
  }
}

async function mcpRequest(method, params, { notification = false } = {}) {
  const body = notification
    ? { jsonrpc: '2.0', method, params }
    : { jsonrpc: '2.0', id: rpcId++, method, params };

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream'
  };
  if (sessionId) headers['mcp-session-id'] = sessionId;

  const res = await fetch(mcpUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const sid = res.headers.get('mcp-session-id');
  if (sid) sessionId = sid;

  if (notification) {
    if (!res.ok && res.status !== 202) {
      throw new Error(`notification ${method} HTTP ${res.status}`);
    }
    return null;
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  return data.result;
}

async function ensureSession() {
  if (sessionId) return;
  setStatus('busy', 'Connecting…');
  await mcpRequest('initialize', {
    protocolVersion: PROTOCOL,
    capabilities: {},
    clientInfo: { name: 'pantrypilot-companion', version: '0.1.0' }
  });
  await mcpRequest('notifications/initialized', {}, { notification: true });
  setStatus('ok', `Session ${sessionId?.slice(0, 8) || 'ok'}…`);
  log(`initialized session=${sessionId}`);
}

function parseToolJson(result) {
  const parts = Array.isArray(result?.content) ? result.content : [];
  const text = parts.map((c) => c.text || '').join('');
  if (!text) throw new Error('empty tool content');
  return JSON.parse(text);
}

async function callTool(name, args) {
  await ensureSession();
  log(`tools/call ${name}`);
  const result = await mcpRequest('tools/call', { name, arguments: args });
  if (result?.isError) {
    throw new Error(`${name} error: ${JSON.stringify(result)}`);
  }
  return parseToolJson(result);
}

function renderSteps(steps) {
  const ol = $('steps');
  ol.innerHTML = '';
  if (!steps?.length) {
    ol.innerHTML = '<li class="empty">No steps yet</li>';
    return;
  }
  for (const s of steps) {
    const li = document.createElement('li');
    const cls = s.ok ? 'ok' : 'bad';
    li.innerHTML = `<strong class="${cls}">${s.tool}</strong> · ${s.ms}ms` +
      (s.detail ? ` · ${escapeHtml(s.detail)}` : '') +
      (s.error ? ` · <span class="bad">${escapeHtml(s.error)}</span>` : '');
    ol.appendChild(li);
  }
}

function renderCards(cards) {
  const root = $('cards');
  root.innerHTML = '';
  if (!cards?.length) {
    root.innerHTML = '<p class="empty">No media cards yet — run the kitchen loop.</p>';
    return;
  }
  for (const c of cards) {
    const el = document.createElement('article');
    el.className = 'card';
    const img = c.imageUrl
      ? `<img src="${escapeAttr(c.imageUrl)}" alt="" loading="lazy" />`
      : `<div style="height:120px;background:#0c1117;display:flex;align-items:center;justify-content:center;color:#9aabbc;font-size:0.8rem">No image</div>`;
    const link = c.detailPageUrl
      ? `<a href="${escapeAttr(c.detailPageUrl)}" target="_blank" rel="noopener">Open detail</a>`
      : '';
    el.innerHTML = `${img}<div class="body"><h3>${escapeHtml(c.title || 'Untitled')}</h3>` +
      (c.subtitle ? `<div class="sub">${escapeHtml(c.subtitle)}</div>` : '') +
      (c.text ? `<p>${escapeHtml(c.text)}</p>` : '') +
      link +
      `</div>`;
    root.appendChild(el);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

function money(cents) {
  if (cents == null) return '—';
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

async function stockPantry() {
  const householdId = $('householdId').value.trim() || 'demo';
  $('btnStock').disabled = true;
  try {
    sessionId = null;
    await callTool('prefs_set', {
      householdId,
      diet: ['omnivore'],
      allergies: ['peanuts'],
      servings: 2,
      budgetCents: Number($('budgetCents').value) || 5000
    });
    await callTool('pantry_upsert', {
      householdId,
      items: [
        { name: 'eggs', quantity: 6, unit: 'count' },
        { name: 'milk', quantity: 1, unit: 'L', expiresAt: '2026-10-16' },
        { name: 'rice', quantity: 2, unit: 'cup' },
        { name: 'onion', quantity: 2, unit: 'count' }
      ]
    });
    log('sample pantry + prefs ready');
    setStatus('ok', 'Pantry stocked');
  } catch (err) {
    setStatus('err', 'Stock failed');
    log(String(err?.message || err));
  } finally {
    $('btnStock').disabled = false;
  }
}

async function runKitchen() {
  const householdId = $('householdId').value.trim() || 'demo';
  const days = Number($('days').value) || 3;
  const goal = $('goal').value || 'weekly';
  const budgetRaw = $('budgetCents').value;
  const args = { householdId, days, goal };
  if (budgetRaw !== '') args.budgetCents = Number(budgetRaw);

  $('btnRun').disabled = true;
  setStatus('busy', 'kitchen_run…');
  renderCards([]);
  renderSteps([]);
  $('summary').textContent = '';
  try {
    // Fresh session each demo click keeps the story clear on video.
    sessionId = null;
    const payload = await callTool('kitchen_run', args);
    renderSteps(payload.steps || []);
    renderCards(payload.mediaCards || []);
    const cart = payload.cart;
    $('summary').textContent =
      `ok=${payload.ok} · ${payload.totalMs}ms · meals=${payload.mealPlan?.length ?? 0}` +
      ` · shop=${payload.shopList?.length ?? 0}` +
      ` · cart=${cart ? `${cart.lines?.length ?? 0} lines / ${money(cart.totalCents)}` : 'none'}` +
      ` · source=${payload.mealPlanSource}`;
    setStatus(payload.ok ? 'ok' : 'err', payload.ok ? 'Run complete' : 'Partial run');
    log(`kitchen_run ok=${payload.ok} cards=${payload.mediaCards?.length ?? 0}`);
  } catch (err) {
    setStatus('err', 'Run failed');
    log(String(err?.message || err));
  } finally {
    $('btnRun').disabled = false;
  }
}

$('btnStock').addEventListener('click', () => void stockPantry());
$('btnRun').addEventListener('click', () => void runKitchen());
$('mcpUrl').addEventListener('change', () => {
  sessionId = null;
  setStatus('idle', 'Idle');
});

renderCards([]);
log('Ready. Stock pantry, then Run weekly kitchen.');
