// popup.js - reads logs from chrome.storage.local and renders them with extra features
document.addEventListener('DOMContentLoaded', async () => {
  const clearBtn = document.getElementById('clearBtn');
  const exportBtn = document.getElementById('exportBtn');
  const sampleBtn = document.getElementById('sampleBtn');
  const retentionInput = document.getElementById('retentionInput');
  const filterInput = document.getElementById('filterInput');
  const logsBody = document.getElementById('logsBody');
  const noLogs = document.getElementById('noLogs');
  const logsTable = document.getElementById('logsTable');

  let currentLogs = [];

  function applyFilter(logs) {
    const q = filterInput.value.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(l => (l.domain || l.url || '').toLowerCase().includes(q));
  }

  function renderLogs(logs) {
    currentLogs = logs || [];
    const filtered = applyFilter(currentLogs);
    logsBody.innerHTML = '';
    if (!filtered || filtered.length === 0) {
      logsTable.style.display = 'none';
      noLogs.textContent = currentLogs.length === 0 ? 'No recent requests recorded' : 'No results for filter';
      noLogs.style.display = 'block';
      return;
    }

    noLogs.style.display = 'none';
    logsTable.style.display = 'table';

    // Show last 10 logs after filtering
    const slice = filtered.slice(0, 10);

    slice.forEach((entry) => {
      const tr = document.createElement('tr');
      const tdDomain = document.createElement('td');
      const tdLatency = document.createElement('td');
      const tdStatus = document.createElement('td');

      tdDomain.textContent = entry.domain || entry.url || '-';
      tdLatency.textContent = (entry.latencyMs != null) ? entry.latencyMs : '-';
      tdStatus.textContent = (entry.statusCode != null) ? entry.statusCode : (entry.error ? 'ERR' : '-');

      tr.appendChild(tdDomain);
      tr.appendChild(tdLatency);
      tr.appendChild(tdStatus);
      logsBody.appendChild(tr);
    });
  }

  // Load initial retention value
  chrome.storage.local.get({ retention: 100 }, (data) => {
    retentionInput.value = data.retention || 100;
  });

  // Load logs and render
  function loadAndRender() {
    chrome.runtime.sendMessage({ type: 'GET_LOGS' }, (resp) => {
      const logs = (resp && resp.logs) ? resp.logs : [];
      renderLogs(logs);
    });
  }

  loadAndRender();

  // Live update when storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.networkLogs) {
      const newLogs = changes.networkLogs.newValue || [];
      renderLogs(newLogs);
    }
  });

  filterInput.addEventListener('input', () => {
    renderLogs(currentLogs);
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm('Clear all saved network logs?')) return;
    chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' }, (resp) => {
      renderLogs([]);
    });
  });

  exportBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'EXPORT_LOGS' }, (resp) => {
      const logs = (resp && resp.logs) ? resp.logs : [];
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `network-logs-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  });

  sampleBtn.addEventListener('click', () => {
    if (!confirm('Insert sample logs for testing?')) return;
    chrome.runtime.sendMessage({ type: 'INSERT_SAMPLE' }, (resp) => {
      loadAndRender();
    });
  });

  retentionInput.addEventListener('change', () => {
    let v = parseInt(retentionInput.value, 10);
    if (isNaN(v) || v < 10) v = 10;
    chrome.storage.local.set({ retention: v }, () => {
      // storage.onChanged will trim logs if needed
    });
  });
});
