/** Builds the Data & Analytics charts and sector selector. */
(function () {
  const data = window.CHD_ANALYTICS_DATA || {};

  // Read colors from CSS to support dark mode correctly.
  // Fallback to neutral colors if the variables aren't defined.
  const style = getComputedStyle(document.documentElement);
  const text = style.getPropertyValue('--text-muted').trim() || '#8A94A6';
  const grid = style.getPropertyValue('--border-light').trim() || '#E2E8F0';
  const bronze = '#B97231';
  const teal = '#C5A485';

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: text, boxWidth: 10, boxHeight: 10, usePointStyle: true } },
      tooltip: { intersect: false, mode: 'index' },
    },
    scales: {
      x: { ticks: { color: text }, grid: { display: false }, border: { display: false } },
      y: {
        ticks: { color: text, callback: (value) => `${Number(value).toFixed(2)}%` },
        grid: { color: grid },
        border: { display: false },
      },
    },
    elements: { point: { radius: 0, hoverRadius: 4 }, line: { tension: 0.4, borderWidth: 2, fill: false } },
  };

  let macroChartInstance = null;

  function renderMacroChart(target) {
    const macroCanvas = document.getElementById('macroTrendChart');
    if (!macroCanvas || !data.macro) return;
    if (macroChartInstance) macroChartInstance.destroy();

    let datasets = [];
    let isPercent = true;

    if (target === 'inflation') {
      datasets = [
        { label: 'Inflation', data: data.macro.inflation || [], borderColor: bronze, backgroundColor: bronze },
        { label: 'MPR', data: data.macro.mpr || [], borderColor: teal, backgroundColor: teal },
      ];
    } else if (target === 'gdp') {
      datasets = [
        { type: 'bar', label: 'GDP Growth', data: data.macro.gdp || [], backgroundColor: teal, borderColor: teal, borderWidth: 1 }
      ];
    }

    const options = JSON.parse(JSON.stringify(baseOptions));
    options.scales.y.ticks.callback = (value) => isPercent ? `${Number(value).toFixed(2)}%` : Number(value).toFixed(2);
    options.plugins.tooltip.callbacks = {
      label: (context) => `${context.dataset.label || ''}: ${Number(context.parsed.y).toFixed(2)}${isPercent ? '%' : ''}`,
    };

    macroChartInstance = new Chart(macroCanvas, {
      type: 'line',
      data: {
        labels: data.macro.labels || ['Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026'],
        datasets: datasets,
      },
      options: options,
    });
  }

  function initCharts() {
    if (!window.Chart) return;

    // KMI Tabs
    const tabs = document.querySelectorAll('.kmi-tab');
    if (tabs.length) {
      tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          tabs.forEach(t => {
            t.classList.remove('active');
          });
          e.currentTarget.classList.add('active');
          renderMacroChart(e.currentTarget.dataset.kmiTarget);
        });
      });
      renderMacroChart('inflation');
    } else {
      renderMacroChart('inflation');
    }

    // Paramount Chart
    const paramountCanvas = document.getElementById('paramountChart');
    if (paramountCanvas && data.paramount) {
      const ctx = paramountCanvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, paramountCanvas.clientHeight || 220);
      gradient.addColorStop(0, 'rgba(185, 114, 49, 0.26)'); // Neutral bronze
      gradient.addColorStop(1, 'rgba(185, 114, 49, 0.00)');

      new Chart(paramountCanvas, {
        type: 'line',
        data: {
          labels: data.paramount.labels || [],
          datasets: [{ 
            label: 'Paramount Index', 
            data: data.paramount.series || [], 
            borderColor: bronze,
            backgroundColor: gradient,
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointBackgroundColor: bronze
          }],
        },
        options: {
          ...baseOptions,
          plugins: { ...baseOptions.plugins, legend: { display: false } },
          scales: {
            ...baseOptions.scales,
            y: { ...baseOptions.scales.y, ticks: { color: text, callback: (value) => Number(value).toFixed(2) } },
          },
        },
      });
    }
  }

  function formatMetricText(value, forceSign = false) {
    const textValue = String(value ?? '').trim();
    if (!textValue || textValue === '—') return textValue;
    if (textValue === '+') return '+0.00';

    return textValue.replace(/(^|[^A-Za-z])([+-])?([N₦$])?(\d[\d,]*(?:\.\d+)?)(mbpd|ppt|trn|mn|m|%)?/gu, (match, lead, sign, prefix, number, suffix) => {
      const numeric = Number(String(number).replace(/,/g, ''));
      if (!Number.isFinite(numeric)) return match;
      const resolvedPrefix = prefix === '₦' ? 'N' : (prefix || '');
      let resolvedSign = '';
      if (sign === '-' || numeric < 0) resolvedSign = '-';
      else if (sign === '+' || forceSign) resolvedSign = '+';
      return `${lead}${resolvedSign}${resolvedPrefix}${Math.abs(numeric).toFixed(2)}${suffix || ''}`;
    });
  }

  function sectorMarkup(name, sector) {
    const stats = (sector?.stats || []).map(([label, value]) => {
      const valStr = String(value || '').trim();
      const isMissing = valStr === '' || valStr === 'null' || valStr === 'undefined';
      const displayVal = isMissing ? '—' : escapeHtml(formatMetricText(value));
      const note = isMissing ? '<small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Awaiting data</small>' : '';
      return `<article class="sector-stat-box"><span>${escapeHtml(label)}</span><strong>${displayVal}</strong>${note}</article>`;
    }).join('');

    // Treat operators as normal stat boxes to standardise layout
    const operators = (sector?.operators || []).map(([label, value]) => {
      return `<article class="sector-stat-box"><span>${escapeHtml(label)} (Operator)</span><strong>${escapeHtml(formatMetricText(value))}</strong></article>`;
    }).join('');

    const commentaryLines = (sector?.commentary || []).slice(0, 3);
    const commentaryBody = commentaryLines.length 
      ? commentaryLines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')
      : '<p>—</p><small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Latest dataset not available in local environment.</small>';

    return `<div class="sector-detail-head"><h3>${escapeHtml(name)}</h3></div><div class="sector-stat-grid">${stats}${operators}</div><div class="sector-commentary"><strong style="display:block;margin-bottom:8px;color:var(--chd-navy-ui);font-family:\'IBM Plex Sans\', sans-serif;">Sector Commentary</strong>${commentaryBody}</div>`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function initSectors() {
    const panel = document.querySelector('[data-sector-panel]');
    const buttons = [...document.querySelectorAll('[data-sector]')];
    if (!panel || !buttons.length) return;
    const render = (name) => {
      buttons.forEach((button) => button.classList.toggle('active', button.dataset.sector === name));
      panel.innerHTML = sectorMarkup(name, data.sectors?.[name] || {});
    };
    buttons.forEach((button) => button.addEventListener('click', () => render(button.dataset.sector)));
    render('Banking');
  }

  document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    initSectors();
  });
}());
