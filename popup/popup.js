// popup.js - reads logs from chrome.storage.local and renders them with extra features
document.addEventListener('DOMContentLoaded', async () => {
  const clearBtn = document.getElementById('clearBtn');
  const exportBtn = document.getElementById('exportBtn');
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
      updateMetrics(currentLogs);
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

      // Latency styling: small text for fast, warn for medium, err for slow
      const latencyVal = (entry.latencyMs != null) ? entry.latencyMs : null;
      tdLatency.textContent = latencyVal != null ? `${latencyVal} ms` : '-';
      if (latencyVal != null) {
        if (latencyVal < 150) tdLatency.className = 'muted';
        else if (latencyVal < 400) tdLatency.className = 'badge-warn';
        else tdLatency.className = 'badge-err';
      }

      // Status badge
      const statusCode = entry.statusCode != null ? entry.statusCode : (entry.error ? 'ERR' : '-');
      const badge = document.createElement('span');
      badge.textContent = statusCode;
      let badgeClass = 'badge-err';
      if (statusCode === 'ERR' || statusCode === 0) badgeClass = 'badge-err';
      else if (statusCode >= 200 && statusCode < 300) badgeClass = 'badge-ok';
      else if (statusCode >= 300 && statusCode < 400) badgeClass = 'badge-warn';
      else if (statusCode >= 400) badgeClass = 'badge-err';
      badge.className = 'badge ' + badgeClass;
      tdStatus.appendChild(badge);

      tr.appendChild(tdDomain);
      tr.appendChild(tdLatency);
      tr.appendChild(tdStatus);
      logsBody.appendChild(tr);
    });

    updateMetrics(currentLogs);
  }

  // Update dashboard metrics
  function updateMetrics(allLogs) {
    const total = allLogs.length || 0;
    const avg = total ? Math.round((allLogs.reduce((s, l) => s + (l.latencyMs || 0), 0) / total)) : 0;
    const successes = allLogs.filter(l => (l.statusCode >= 200 && l.statusCode < 300)).length;
    const successRate = total ? Math.round((successes / total) * 100) : 0;

    const totalEl = document.getElementById('totalCount');
    const avgEl = document.getElementById('avgLatency');
    const succEl = document.getElementById('successRate');

    if (totalEl) totalEl.textContent = total;
    if (avgEl) avgEl.textContent = total ? `${avg} ms` : '-';
    if (succEl) succEl.textContent = total ? `${successRate} %` : '-';
    // render speed chart using recent latencies
    renderSpeedChart(allLogs);
  }

  // Render a compact bar-chart representing recent latencies
  function renderSpeedChart(allLogs) {
    const chartEl = document.getElementById('speedChart');
    const speedEl = document.getElementById('speedValue');
    if (!chartEl || !speedEl) return;

    const recent = (allLogs || []).slice(0, 10); // newest-first
    if (recent.length === 0) {
      chartEl.innerHTML = '<div class="muted">No data</div>';
      speedEl.textContent = '-';
      return;
    }

    // latencies in ms, convert to numbers
    const latencies = recent.map(l => Number(l.latencyMs || 0));
    const maxLatency = Math.max(...latencies, 0) || 1;

    // create bars (oldest on left)
    const bars = [];
    for (let i = latencies.length - 1; i >= 0; i--) {
      const val = latencies[i];
      // height: inverse proportional to latency (lower latency => taller bar)
      const heightPct = Math.max(6, Math.round((1 - (val / maxLatency)) * 100));
      let cls = 'small';
      if (val >= 400) cls = 'large';
      else if (val >= 150) cls = 'medium';
      bars.push(`<div class="bar ${cls}" style="height:${heightPct}%" title="${val} ms"></div>`);
    }

    chartEl.innerHTML = bars.join('');

    // compute responsiveness score (not real Mbps; a proxy based on latency)
    const avg = Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length);
    const score = Math.min(100, Math.round((1000 / Math.max(avg, 1)) * 10));
    speedEl.textContent = `${score} • Avg ${avg} ms`;
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

  // Insert Sample feature removed: no-op

  retentionInput.addEventListener('change', () => {
    let v = parseInt(retentionInput.value, 10);
    if (isNaN(v) || v < 10) v = 10;
    chrome.storage.local.set({ retention: v }, () => {
      // storage.onChanged will trim logs if needed
    });
  });
});
