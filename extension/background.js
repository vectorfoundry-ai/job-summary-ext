try {
  importScripts('api-base.js');
} catch {
  // api-base.js is optional; it holds the public tunnel URL when present.
}

const DEFAULT_API = 'http://127.0.0.1:3001/api';
const ALARM = 'keep-alive';
const running = new Set();
const controllers = new Map();

function stateKey(tabId) {
  return `tab:${tabId}`;
}

function extractJobPage() {
  const selectors = [
    '[data-testid="jobDescriptionText"]',
    '[data-testid="job-description"]',
    '.jobs-description',
    '.jobs-description__content',
    '.jobsearch-JobComponent-description',
    '#jobDescriptionText',
    '.job-description',
    '#job-description',
    '[class*="job-description"]',
    '[class*="JobDescription"]',
    'article',
    'main',
    '[role="main"]'
  ];

  const seen = new Set();
  const chunks = [];
  for (const selector of selectors) {
    for (const node of document.querySelectorAll(selector)) {
      const text = (node.innerText || '').trim();
      if (text.length < 80 || seen.has(text.slice(0, 200))) continue;
      seen.add(text.slice(0, 200));
      chunks.push(text);
    }
    if (chunks.join('\n\n').length > 2500) break;
  }

  const pageText = (chunks.join('\n\n').trim() || document.body?.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
  return {
    title: document.title || '',
    url: window.location.href,
    pageText
  };
}

async function readPublicUrl() {
  try {
    const text = await fetch(chrome.runtime.getURL('api-base.js')).then((response) => response.text());
    const match = text.match(/JOB_TRACKER_PUBLIC_URL\s*=\s*(".*?"|'.*?')/);
    if (!match) return '';
    return String(JSON.parse(match[1]) || '').replace(/\/+$/, '');
  } catch {
    return String(globalThis.JOB_TRACKER_PUBLIC_URL || '').replace(/\/+$/, '');
  }
}

function isLoopbackApi(url) {
  return /127\.0\.0\.1|localhost|\[::1\]/i.test(String(url || ''));
}

async function apiBase(preferredPublicUrl) {
  const fromMessage = String(preferredPublicUrl || '').replace(/\/+$/, '');
  if (fromMessage) return `${fromMessage}/api`;
  const fromFile = await readPublicUrl();
  if (fromFile) return `${fromFile}/api`;
  const stored = await chrome.storage.sync.get(['apiBase']);
  if (stored.apiBase && !isLoopbackApi(stored.apiBase)) return stored.apiBase;
  return DEFAULT_API;
}

function networkHint(base, error) {
  if (!/Failed to fetch|NetworkError|ERR_CONNECTION|Load failed/i.test(error.message)) return '';
  if (isLoopbackApi(base)) {
    return '\n\nixBrowser cannot reach 127.0.0.1 through the proxy. Reload this extension after npm run tunnel prints a trycloudflare URL, or add 127.0.0.1 to this profile’s proxy bypass list and reopen the profile.';
  }
  return `\n\nCould not reach ${base}. The Cloudflare tunnel is down or this extension still has an old URL. Restart npm run tunnel, then reload the extension.`;
}

async function readState(tabId) {
  const key = stateKey(tabId);
  const stored = await chrome.storage.session.get(key);
  return stored[key] || { tabId, busy: false, phase: 'idle', message: '', runningCount: 0 };
}

async function writeState(tabId, patch) {
  const current = await readState(tabId);
  const next = { ...current, ...patch, tabId, runningCount: running.size };
  await chrome.storage.session.set({ [stateKey(tabId)]: next });
  await syncRunningCounts();
  return next;
}

async function syncRunningCounts() {
  const all = await chrome.storage.session.get(null);
  const updates = {};
  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith('tab:') || !value || typeof value !== 'object') continue;
    if (value.runningCount === running.size) continue;
    updates[key] = { ...value, runningCount: running.size };
  }
  if (Object.keys(updates).length) await chrome.storage.session.set(updates);
}

function keepAlive() {
  if (running.size) chrome.alarms.create(ALARM, { periodInMinutes: 1 });
  else chrome.alarms.clear(ALARM);
}

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM && running.size === 0) chrome.alarms.clear(ALARM);
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'sidepanel') return;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  controllers.get(tabId)?.abort();
  controllers.delete(tabId);
  running.delete(tabId);
  chrome.storage.session.remove(stateKey(tabId));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GET_STATE') {
    readState(message.tabId).then((state) => sendResponse({ ...state, runningCount: running.size }));
    return true;
  }
  if (message?.type === 'GENERATE') {
    generateForTab(message.tabId, message.publicUrl);
    sendResponse({ ok: true });
  }
  if (message?.type === 'STOP') {
    stopForTab(message.tabId);
    sendResponse({ ok: true });
  }
  return false;
});

function stopForTab(tabId) {
  if (!tabId) return;
  const controller = controllers.get(tabId);
  if (controller) controller.abort();
  else running.delete(tabId);
  readState(tabId).then((state) => {
    if (state.applicationId) {
      apiBase().then((base) => fetch(`${base}/applications/${state.applicationId}/cancel`, { method: 'POST' })).catch(() => {});
    }
    writeState(tabId, { busy: false, phase: 'stopped', message: 'Stopped.' });
  });
}

function throwIfStopped(controller) {
  if (controller?.signal.aborted) {
    const error = new Error('Stopped.');
    error.name = 'AbortError';
    throw error;
  }
}

async function generateForTab(tabId, preferredPublicUrl) {
  if (!tabId || running.has(tabId)) return;
  const controller = new AbortController();
  running.add(tabId);
  controllers.set(tabId, controller);
  keepAlive();

  let apiUrl = '';
  try {
    const tab = await chrome.tabs.get(tabId);
    throwIfStopped(controller);
    if (!/^https?:/.test(tab.url || '')) {
      throw new Error('Open a normal job web page first.');
    }

    await writeState(tabId, {
      busy: true,
      phase: 'running',
      title: tab.title || 'Unknown page',
      url: tab.url || '',
      message: 'Reading job page…'
    });

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractJobPage
    });
    throwIfStopped(controller);

    if (!result?.pageText || result.pageText.length < 100) {
      throw new Error('Could not read enough text from this page.');
    }

    apiUrl = await apiBase(preferredPublicUrl);
    await writeState(tabId, {
      busy: true,
      phase: 'running',
      title: result.title || tab.title || 'Unknown page',
      url: result.url || tab.url || '',
      message: `Saving job text…\n${result.title || tab.title || ''}`
    });

    const response = await fetch(`${apiUrl}/summaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: result.url, pageText: result.pageText, pageTitle: result.title || tab.title }),
      signal: controller.signal
    });
    throwIfStopped(controller);
    const data = await response.json().catch(() => ({}));
    if (!response.ok && response.status !== 409) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    const application = data.application;
    if (!application?._id) {
      throw new Error(data.error || 'The API did not queue the application. Check that the server is running.');
    }
    await writeState(tabId, {
      busy: false,
      phase: 'done',
      applicationId: application._id,
      message: response.status === 409
        ? `${data.error || 'Already saved'}:\n${application.company}\n${application.jobTitle}`
        : `Queued on server:\n${application.jobTitle}\nWatch the dashboard for analysis status.`
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      await writeState(tabId, { busy: false, phase: 'stopped', message: 'Stopped.' });
      return;
    }
    const hint = networkHint(apiUrl, error);
    await writeState(tabId, {
      busy: false,
      phase: 'error',
      message: `Error: ${error.message}${hint}`
    });
  } finally {
    controllers.delete(tabId);
    running.delete(tabId);
    keepAlive();
    await syncRunningCounts();
  }
}
