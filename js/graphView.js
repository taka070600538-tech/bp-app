import { buildBpChartSvg, SERIES } from './bpChart.js';
import { formatDate, shiftDate } from './dateUtils.js';
import { loadRecords } from './records.js';
import { filterByPeriod, averages, distribution } from './stats.js';
import { CATEGORIES } from './classify.js';

const PERIODS = [7, 14, 30];

function legendHtml() {
  return `<div class="chart-legend">${SERIES.map((s) => `<span class="legend-item ${s.cls}">${s.label}</span>`).join('')}</div>`;
}

function averageCards(avg) {
  const card = (title, cls, { sys, dia }) => `
    <div class="avg-card ${cls}">
      <span class="avg-title">${title}</span>
      <span class="avg-value">${sys}<span class="avg-sep">/</span>${dia}</span>
      <span class="avg-unit">mmHg</span>
    </div>`;
  return `<div class="avg-cards">
    ${card('左腕 平均', 'avg-left', avg.left)}
    ${card('右腕 平均', 'avg-right', avg.right)}
    ${card('左右総合 平均', 'avg-overall', avg.overall)}
  </div>`;
}

function distributionHtml(records) {
  const counts = distribution(records);
  const max = Math.max(...Object.values(counts), 1);
  const rows = CATEGORIES.map((c) => `
    <div class="dist-row">
      <span class="dist-label">${c.label}</span>
      <div class="dist-track"><div class="dist-bar" style="width:${(counts[c.id] / max) * 100}%;background:${c.color}"></div></div>
      <span class="dist-count">${counts[c.id]}</span>
    </div>`).join('');
  return `<section class="panel">
    <h2 class="panel-title">血圧判定の分布 <span class="panel-note">(左腕基準)</span></h2>
    ${rows}
  </section>`;
}

export function renderGraphView(container) {
  const state = { days: 7 };

  function render() {
    const today = formatDate(new Date());
    const records = filterByPeriod(loadRecords(localStorage), state.days, today);

    const periodButtons = `<div class="period-row">${PERIODS.map((d) =>
      `<button type="button" class="period-btn ${d === state.days ? 'is-active' : ''}" data-days="${d}">過去 ${d} 日間</button>`
    ).join('')}</div>`;

    if (records.length === 0) {
      container.innerHTML = `
        ${periodButtons}
        <div class="empty-state">
          <p class="empty-title">グラフデータがありません</p>
          <p>「記録」タブから毎日の血圧を登録して、血圧トレンドグラフを確認しましょう。</p>
        </div>`;
      bind();
      return;
    }

    const avg = averages(records);
    container.innerHTML = `
      <section class="panel">
        <h2 class="panel-title">血圧トレンド</h2>
        <p class="panel-note">基準線: 高血圧 140/90 ・ 正常 120/70</p>
        ${legendHtml()}
        ${buildBpChartSvg(records, { fromDate: shiftDate(today, -(state.days - 1)), toDate: today })}
      </section>
      ${periodButtons}
      ${averageCards(avg)}
      ${distributionHtml(records)}
    `;
    bind();
  }

  function bind() {
    container.querySelectorAll('.period-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.days = Number(btn.dataset.days);
        render();
      });
    });
  }

  render();
}
