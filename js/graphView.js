import { buildBpChartSvg } from './bpChart.js';
import { formatDate, shiftDate } from './dateUtils.js';
import { loadRecords } from './records.js';
import { filterFromDate, averages, distribution } from './stats.js';
import { CATEGORIES } from './classify.js';

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
  const today = formatDate(new Date());
  const state = { fromDate: shiftDate(today, -7) };

  function dateFieldHtml() {
    return `<label class="date-field">表示開始日(この日から今日まで)
      <input type="date" id="graph-from-date" value="${state.fromDate}" max="${today}">
    </label>`;
  }

  function render() {
    const records = filterFromDate(loadRecords(localStorage), state.fromDate, today);

    if (records.length === 0) {
      container.innerHTML = `
        ${dateFieldHtml()}
        <div class="empty-state">
          <p class="empty-title">グラフデータがありません</p>
          <p>「記録」タブから毎日の血圧を登録して、血圧トレンドグラフを確認しましょう。</p>
        </div>`;
      bind();
      return;
    }

    const avg = averages(records);
    container.innerHTML = `
      ${dateFieldHtml()}
      <section class="panel">
        <h2 class="panel-title">血圧トレンド</h2>
        <div class="chart-scroll">${buildBpChartSvg(records)}</div>
      </section>
      ${averageCards(avg)}
      ${distributionHtml(records)}
    `;
    bind();

    // 横スクロールを最新日付側(右端)に合わせる。
    const scroller = container.querySelector('.chart-scroll');
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  }

  function bind() {
    const dateInput = container.querySelector('#graph-from-date');
    if (dateInput) {
      dateInput.addEventListener('change', () => {
        state.fromDate = dateInput.value;
        render();
      });
    }
  }

  render();
}
