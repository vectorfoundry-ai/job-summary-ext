const publicUrl = String(globalThis.JOB_TRACKER_PUBLIC_URL || '').replace(/\/+$/, '');
const button = document.getElementById('summary');
const stopBtn = document.getElementById('stop');
const retryBtn = document.getElementById('retry');
const statusEl = document.getElementById('status');
const urlEl = document.getElementById('url');
const titleEl = document.getElementById('title');
const hintEl = document.getElementById('hint');
const dashboardEl = document.getElementById('dashboard');

if (publicUrl && dashboardEl) dashboardEl.href = publicUrl;

chrome.runtime.connect({ name: 'sidepanel' });

let activeTabId = null;

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function startGenerate(tabId) {
  activeTabId = tabId;
  button.disabled = true;
  stopBtn.disabled = false;
  retryBtn.disabled = true;
  statusEl.textContent = 'Reading job page…';
  chrome.runtime.sendMessage({ type: 'GENERATE', tabId });
}

function renderPage(tab, state = {}) {
  titleEl.textContent = tab?.title || state.title || 'Unknown page';
  urlEl.textContent = tab?.url || state.url || '';
  statusEl.textContent = state.message || '';
  const busy = Boolean(state.busy);
  button.disabled = busy;
  stopBtn.disabled = !busy;
  retryBtn.disabled = busy || (state.phase !== 'error' && state.phase !== 'stopped');
  const extra = state.runningCount > 1
    ? `${state.runningCount} tabs generating. This tab keeps its own progress.`
    : 'Each tab has its own session. You can generate on several tabs at once.';
  hintEl.textContent = extra;
}

async function showActiveTab() {
  const tab = await currentTab();
  activeTabId = tab?.id ?? null;
  if (!activeTabId) {
    renderPage(tab);
    return;
  }
  const state = await chrome.runtime.sendMessage({ type: 'GET_STATE', tabId: activeTabId }).catch(() => ({}));
  renderPage(tab, state);
}

showActiveTab();
chrome.tabs.onActivated.addListener(() => {
  showActiveTab();
});
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (!tab.active || (!changeInfo.url && !changeInfo.title && changeInfo.status !== 'complete')) return;
  showActiveTab();
});
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area !== 'session') return;
  showActiveTab();
});

button.addEventListener('click', async () => {
  const tab = await currentTab();
  if (!tab?.id) {
    statusEl.textContent = 'Error: Open a normal job web page first.';
    return;
  }
  startGenerate(tab.id);
});

stopBtn.addEventListener('click', async () => {
  const tab = await currentTab();
  if (!tab?.id) return;
  chrome.runtime.sendMessage({ type: 'STOP', tabId: tab.id });
});

retryBtn.addEventListener('click', async () => {
  const tab = await currentTab();
  if (!tab?.id) {
    statusEl.textContent = 'Error: Open a normal job web page first.';
    return;
  }
  startGenerate(tab.id);
});
