const DEFAULT_API = 'http://127.0.0.1:3001/api';
const publicUrl = String(globalThis.JOB_TRACKER_PUBLIC_URL || '').replace(/\/+$/, '');
const button = document.getElementById('summary');
const statusEl = document.getElementById('status');
const urlEl = document.getElementById('url');
const titleEl = document.getElementById('title');
const dashboardEl = document.getElementById('dashboard');

if (publicUrl && dashboardEl) dashboardEl.href = publicUrl;

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

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function apiBase() {
  const stored = await chrome.storage.sync.get(['apiBase']);
  if (stored.apiBase) return stored.apiBase;
  if (publicUrl) return `${publicUrl}/api`;
  return DEFAULT_API;
}

(async () => {
  const tab = await currentTab();
  titleEl.textContent = tab?.title || 'Unknown page';
  urlEl.textContent = tab?.url || '';
})();

button.addEventListener('click', async () => {
  button.disabled = true;
  statusEl.textContent = 'Reading job page…';
  try {
    const tab = await currentTab();
    if (!tab?.id || !/^https?:/.test(tab.url || '')) throw new Error('Open a normal job web page first.');

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractJobPage
    });

    if (!result?.pageText || result.pageText.length < 100) {
      throw new Error('Could not read enough text from this page.');
    }

    statusEl.textContent = 'Analyzing job and company…';
    const base = await apiBase();
    const response = await fetch(`${base}/summaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: result.url, pageText: result.pageText })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok && response.status !== 409) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    const application = data.application;
    if (!application?.company) {
      throw new Error(data.error || 'The API did not return a saved application. Check that the server and Ollama are running.');
    }
    const fileName = data.file?.name || application.fileName;
    statusEl.textContent = response.status === 409
      ? `Already saved:\n${application.company}\n${application.jobTitle}`
      : `Saved on server:\n${application.company}\n${application.jobTitle}\n${fileName}`;
  } catch (error) {
    const hint = /Failed to fetch|NetworkError|ERR_CONNECTION/i.test(error.message)
      ? '\n\nixBrowser cannot reach 127.0.0.1 through the proxy. Use the public tunnel URL from npm run tunnel, or add 127.0.0.1 to this profile’s proxy bypass list and reopen the profile.'
      : '';
    statusEl.textContent = `Error: ${error.message}${hint}`;
  } finally {
    button.disabled = false;
  }
});
