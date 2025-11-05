// popup.js - reads logs from chrome.storage.local and renders them
document.addEventListener('DOMContentLoaded', async () => {
  const clearBtn = document.getElementById('clearBtn');
  const logsBody = document.getElementById('logsBody');
  const noLogs = document.getElementById('noLogs');
  const logsTable = document.getElementById('logsTable');

  function renderLogs(logs) {
    logsBody.innerHTML = '';
    if (!logs || logs.length === 0) {
      logsTable.style.display = 'none';
      noLogs.textContent = 'No recent requests recorded';
      noLogs.style.display = 'block';
      return;
    }

    noLogs.style.display = 'none';
    logsTable.style.display = 'table';

    // Show last 10 logs, already stored newest-first
    const slice = logs.slice(0, 10);

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

  // Request logs from background via storage
  chrome.runtime.sendMessage({ type: 'GET_LOGS' }, (resp) => {
    const logs = (resp && resp.logs) ? resp.logs : [];
    renderLogs(logs);
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm('Clear all saved network logs?')) return;
    chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' }, (resp) => {
      renderLogs([]);
    });
  });
});
