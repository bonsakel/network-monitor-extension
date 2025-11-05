// background.js - service worker for Network Monitor
// Listens to outgoing HTTP/HTTPS requests, measures latency, and stores logs locally.

// Keep a simple in-memory map for request start times keyed by requestId
const requestStartTimes = new Map();

// Helper: get domain from URL
function getDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch (e) {
    return url;
  }
}

// Save a log entry to chrome.storage.local keeping max 100 entries
async function saveLog(entry) {
  try {
    const data = await chrome.storage.local.get({ networkLogs: [] });
    const logs = data.networkLogs || [];
    logs.unshift(entry); // newest first
    if (logs.length > 100) logs.length = 100; // trim to 100
    await chrome.storage.local.set({ networkLogs: logs });
  } catch (err) {
    // Storage failures are non-fatal; log to console for debugging
    console.error('Failed to save network log', err);
  }
}

// onBeforeRequest: record start time
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Only HTTP/HTTPS
    if (!details.url.startsWith('http')) return;
    requestStartTimes.set(details.requestId, Date.now());
  },
  { urls: ["<all_urls>"] },
  []
);

// onCompleted: calculate latency and log
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (!details.url.startsWith('http')) return;
    const start = requestStartTimes.get(details.requestId) || details.timeStamp || Date.now();
    const end = Date.now();
    const latency = Math.max(0, end - start);
    requestStartTimes.delete(details.requestId);

    const entry = {
      url: details.url,
      domain: getDomain(details.url),
      method: details.method,
      statusCode: details.statusCode,
      latencyMs: latency,
      timestamp: new Date().toISOString()
    };

    // Save to storage
    await saveLog(entry);
    // Also log to console for debug
    console.log('Network Monitor log:', entry);
  },
  { urls: ["<all_urls>"] }
);

// onErrorOccurred: log failed requests with statusCode = 0
chrome.webRequest.onErrorOccurred.addListener(
  async (details) => {
    if (!details.url.startsWith('http')) return;
    const start = requestStartTimes.get(details.requestId) || details.timeStamp || Date.now();
    const end = Date.now();
    const latency = Math.max(0, end - start);
    requestStartTimes.delete(details.requestId);

    const entry = {
      url: details.url,
      domain: getDomain(details.url),
      method: details.method,
      statusCode: 0,
      error: details.error,
      latencyMs: latency,
      timestamp: new Date().toISOString()
    };

    await saveLog(entry);
    console.warn('Network Monitor error log:', entry);
  },
  { urls: ["<all_urls>"] }
);

// Provide an onMessage handler so popup can request logs or clear them
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'GET_LOGS') {
    chrome.storage.local.get({ networkLogs: [] }, (data) => {
      sendResponse({ logs: data.networkLogs || [] });
    });
    return true; // will respond asynchronously
  }
  if (msg && msg.type === 'CLEAR_LOGS') {
    chrome.storage.local.set({ networkLogs: [] }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});
