import { classifyBP } from './classify.js';
import { formatDate } from './dateUtils.js';
import { loadRecords, saveRecords, upsertRecord } from './records.js';

const FIELDS = [
  { key: 'sysL', arm: 'left', kind: 'sys' },
  { key: 'diaL', arm: 'left', kind: 'dia' },
  { key: 'sysR', arm: 'right', kind: 'sys' },
  { key: 'diaR', arm: 'right', kind: 'dia' },
];
const RANGE = { sys: { min: 70, max: 200 }, dia: { min: 40, max: 130 } };
const DEFAULTS = { sysL: 120, diaL: 80, sysR: 120, diaR: 80 };

function armSection(arm, name, tag) {
  const sys = `sys${arm === 'left' ? 'L' : 'R'}`;
  const dia = `dia${arm === 'left' ? 'L' : 'R'}`;
  const dial = (key, kind, label) => `
    <div class="dial">
      <span class="dial-label">${label}</span>
      <div class="stepper-row">
        <button type="button" class="step-btn" data-field="${key}" data-step="-5">−5</button>
        <button type="button" class="step-btn" data-field="${key}" data-step="-1">−1</button>
        <div class="slider-wrap">
          <input type="range" data-field="${key}" min="${RANGE[kind].min}" max="${RANGE[kind].max}" step="1" aria-label="${label}">
          <div class="ruler" aria-hidden="true"></div>
        </div>
        <button type="button" class="step-btn" data-field="${key}" data-step="1">＋1</button>
        <button type="button" class="step-btn" data-field="${key}" data-step="5">＋5</button>
      </div>
    </div>`;
  return `
  <section class="arm-card arm-${arm}">
    <div class="arm-head">
      <span class="arm-name">${name}<span class="arm-tag">${tag}</span></span>
      <span class="cat-badge" data-badge="${arm}"></span>
    </div>
    <div class="bp-readout">
      <span class="readout-num" data-readout="${sys}">120</span><span class="readout-sep">/</span><span class="readout-num" data-readout="${dia}">80</span>
      <span class="readout-unit">mmHg</span>
    </div>
    ${dial(sys, 'sys', '最高血圧(上)')}
    ${dial(dia, 'dia', '最低血圧(下)')}
  </section>`;
}

export function renderRecordView(container) {
  const today = formatDate(new Date());
  const state = { date: today, values: { ...DEFAULTS } };

  container.innerHTML = `
    <label class="date-field">測定日
      <input type="date" id="record-date" value="${today}" max="${today}">
    </label>
    ${armSection('left', '左腕', 'LEFT')}
    ${armSection('right', '右腕', 'RIGHT')}
    <button type="button" id="save-record" class="save-btn">今日の記録を保存する</button>
    <p id="save-message" class="save-message" role="status"></p>
  `;

  const saveBtn = container.querySelector('#save-record');
  const message = container.querySelector('#save-message');
  const dateInput = container.querySelector('#record-date');

  function existingFor(date) {
    return loadRecords(localStorage).find((r) => r.date === date) || null;
  }

  function updateDisplays() {
    for (const { key } of FIELDS) {
      container.querySelector(`[data-readout="${key}"]`).textContent = state.values[key];
      container.querySelector(`input[data-field="${key}"]`).value = state.values[key];
    }
    for (const arm of ['left', 'right']) {
      const suffix = arm === 'left' ? 'L' : 'R';
      const cat = classifyBP(state.values[`sys${suffix}`], state.values[`dia${suffix}`]);
      const badge = container.querySelector(`[data-badge="${arm}"]`);
      badge.textContent = cat.label;
      badge.style.setProperty('--cat-color', cat.color);
    }
    saveBtn.textContent = existingFor(state.date)
      ? `${state.date === formatDate(new Date()) ? '今日' : 'この日'}の記録を更新する`
      : `${state.date === formatDate(new Date()) ? '今日' : 'この日'}の記録を保存する`;
  }

  function setValue(key, value) {
    const kind = key.startsWith('sys') ? 'sys' : 'dia';
    state.values[key] = Math.min(RANGE[kind].max, Math.max(RANGE[kind].min, value));
    message.textContent = '';
    updateDisplays();
  }

  function loadDate(date) {
    state.date = date;
    const existing = existingFor(date);
    state.values = existing
      ? { sysL: existing.sysL, diaL: existing.diaL, sysR: existing.sysR, diaR: existing.diaR }
      : { ...DEFAULTS };
    message.textContent = '';
    updateDisplays();
  }

  container.addEventListener('click', (event) => {
    const btn = event.target.closest('.step-btn');
    if (!btn) return;
    setValue(btn.dataset.field, state.values[btn.dataset.field] + Number(btn.dataset.step));
  });

  container.addEventListener('input', (event) => {
    const input = event.target.closest('input[type="range"]');
    if (!input) return;
    setValue(input.dataset.field, Number(input.value));
  });

  dateInput.addEventListener('change', () => {
    if (!dateInput.value) return;
    loadDate(dateInput.value);
  });

  saveBtn.addEventListener('click', () => {
    const records = loadRecords(localStorage);
    const record = { date: state.date, ...state.values, createdAt: new Date().toISOString() };
    saveRecords(localStorage, upsertRecord(records, record));
    message.textContent = '測定結果を保存しました。';
    updateDisplays();
  });

  loadDate(today);
}
