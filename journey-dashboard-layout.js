// Plot & Season — Garden Journey dashboard layout refinements
(function () {
  'use strict';

  const LAYER_ID = 'plot-season-journey-dashboard-layer';
  const STYLE_ID = 'plot-season-journey-dashboard-layout-refinements';
  let applying = false;
  let observer = null;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${LAYER_ID} #jd-seeds,
      #${LAYER_ID} #jd-challenges,
      #${LAYER_ID} #jd-forecast {
        margin-top: 0 !important;
        width: 100% !important;
      }
      #${LAYER_ID} #jd-challenges .jd-list,
      #${LAYER_ID} #jd-active-goals .jd-list {
        padding-bottom: 11px !important;
      }
      #${LAYER_ID} #jd-challenges .jd-list-row,
      #${LAYER_ID} #jd-active-goals .jd-list-row {
        min-height: 64px;
      }
      #${LAYER_ID} #jd-journal {
        overflow: hidden;
      }
      #${LAYER_ID} .jd-journal-calendar-divider {
        height: 1px;
        background: #e1d5bc;
        margin: 8px 12px 10px;
      }
      #${LAYER_ID} .jd-calendar-merged-label {
        padding: 0 12px 7px;
        font-size: 9px;
        font-weight: 900;
        color: #49633f;
        text-transform: uppercase;
        letter-spacing: .04em;
      }
      #${LAYER_ID} .jd-forecast-body {
        padding: 0 11px 11px;
      }
      #${LAYER_ID} .jd-forecast-grid {
        display: grid;
        grid-template-columns: repeat(3,minmax(0,1fr));
        gap: 7px;
      }
      #${LAYER_ID} .jd-forecast-day {
        min-width: 0;
        padding: 9px 7px;
        border: 1px solid #d9d4bd;
        border-radius: 9px;
        background: rgba(238,246,235,.68);
        text-align: center;
      }
      #${LAYER_ID} .jd-forecast-day:first-child {
        background: rgba(226,241,220,.86);
        border-color: #b8cfaa;
      }
      #${LAYER_ID} .jd-forecast-label {
        font-size: 8px;
        font-weight: 900;
        color: #71604c;
        text-transform: uppercase;
        letter-spacing: .04em;
      }
      #${LAYER_ID} .jd-forecast-icon {
        font-size: 23px;
        line-height: 1;
        margin: 5px 0 4px;
      }
      #${LAYER_ID} .jd-forecast-temp {
        font-size: 14px;
        font-weight: 950;
        color: #36543a;
      }
      #${LAYER_ID} .jd-forecast-condition {
        margin-top: 2px;
        font-size: 8px;
        color: #695a48;
        line-height: 1.25;
      }
      #${LAYER_ID} .jd-forecast-note {
        margin-top: 7px;
        font-size: 8px;
        color: #7a6954;
        line-height: 1.35;
      }
      @media(max-width:760px){
        #${LAYER_ID} .jd-forecast-grid{grid-template-columns:1fr 1fr 1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function currentWeather(layer) {
    const dateCard = layer.querySelector('.jd-date-card');
    const mains = dateCard ? Array.from(dateCard.querySelectorAll('.jd-date-main')) : [];
    const tempText = (mains.find((el) => /°F/.test(el.textContent || '')) || {}).textContent || '60°F';
    const temperature = Number((tempText.match(/-?\d+/) || ['60'])[0]);
    const seasonText = dateCard && dateCard.querySelector('.jd-date-sub') ? dateCard.querySelector('.jd-date-sub').textContent || '' : '';
    const season = (seasonText.match(/Spring|Summer|Fall|Winter/i) || ['Spring'])[0];
    const weatherIcon = dateCard && dateCard.querySelector('.jd-weather-big') ? (dateCard.querySelector('.jd-weather-big').textContent || '☀️').trim() : '☀️';
    const dateText = mains.length ? (mains[0].textContent || '') : '';
    const dayNumber = Number((dateText.match(/\b(\d{1,2})\b/) || ['1'])[0]);
    return { temperature, season, weatherIcon, dayNumber };
  }

  function conditionFor(icon, season, offset, dayNumber) {
    if (offset === 0) {
      if (icon.includes('🔥')) return { icon: '🔥', label: 'Heat Wave' };
      if (icon.includes('❄')) return { icon: '❄️', label: 'Freeze' };
      if (icon.includes('🌧')) return { icon: '🌧️', label: 'Rain' };
      return { icon: icon || '☀️', label: season === 'Winter' ? 'Cool & Bright' : 'Clear' };
    }
    const patterns = {
      Spring: [
        { icon: '🌦️', label: 'Variable' },
        { icon: '🌤️', label: 'Mild' },
        { icon: '🌧️', label: 'Rain Chance' }
      ],
      Summer: [
        { icon: '☀️', label: 'Sunny' },
        { icon: '🌤️', label: 'Warm' },
        { icon: '⛅', label: 'Partly Cloudy' }
      ],
      Fall: [
        { icon: '🌤️', label: 'Mild' },
        { icon: '🌦️', label: 'Variable' },
        { icon: '☁️', label: 'Cooler' }
      ],
      Winter: [
        { icon: '🌤️', label: 'Cool' },
        { icon: '☁️', label: 'Cloudy' },
        { icon: '❄️', label: 'Frost Risk' }
      ]
    };
    const list = patterns[season] || patterns.Spring;
    return list[(dayNumber + offset) % list.length];
  }

  function forecastHtml(layer) {
    const current = currentWeather(layer);
    const variation = [0, ((current.dayNumber % 3) - 1) * 2, (((current.dayNumber + 1) % 3) - 1) * 3];
    const labels = ['Today', 'Next Day', '+2 Days'];
    const days = labels.map((label, i) => {
      const condition = conditionFor(current.weatherIcon, current.season, i, current.dayNumber);
      const temp = current.temperature + variation[i];
      return `<div class="jd-forecast-day"><div class="jd-forecast-label">${label}</div><div class="jd-forecast-icon">${condition.icon}</div><div class="jd-forecast-temp">${temp}°F</div><div class="jd-forecast-condition">${esc(condition.label)}</div></div>`;
    }).join('');
    return `<div class="jd-section-head"><span>🌦️ Forecast</span><span class="jd-section-action">Garden outlook</span></div><div class="jd-forecast-body"><div class="jd-forecast-grid">${days}</div><div class="jd-forecast-note">Today reflects the current in-game weather. Future cards show the seasonal outlook; special weather events are still rolled when each new game day begins.</div></div>`;
  }

  function mergeJournalAndCalendar(layer, rightStack) {
    const journal = layer.querySelector('#jd-journal');
    const calendar = layer.querySelector('section#jd-calendar');
    if (!journal || !calendar) return;

    const journalHeader = journal.querySelector('.jd-section-head > span:first-child');
    if (journalHeader) journalHeader.textContent = '🗓️ Gardener Calendar & Journal';

    let anchor = journal.querySelector('#jd-calendar');
    if (!anchor) {
      anchor = document.createElement('div');
      anchor.id = 'jd-calendar';
      anchor.style.scrollMarginTop = '14px';
      journal.appendChild(anchor);
    }

    if (!journal.querySelector('.jd-journal-calendar-divider')) {
      const divider = document.createElement('div');
      divider.className = 'jd-journal-calendar-divider';
      journal.insertBefore(divider, anchor);
    }
    if (!journal.querySelector('.jd-calendar-merged-label')) {
      const label = document.createElement('div');
      label.className = 'jd-calendar-merged-label';
      label.textContent = 'Garden Calendar';
      journal.insertBefore(label, anchor);
    }

    const calendarBody = calendar.querySelector('.jd-calendar-body');
    if (calendarBody) anchor.appendChild(calendarBody);
    calendar.remove();
    rightStack.appendChild(journal);
  }

  function ensureForecast(layer, rightStack, beforeNode) {
    let forecast = layer.querySelector('#jd-forecast');
    if (!forecast) {
      forecast = document.createElement('section');
      forecast.className = 'jd-card';
      forecast.id = 'jd-forecast';
    }
    forecast.innerHTML = forecastHtml(layer);
    if (beforeNode && beforeNode.parentElement === rightStack) rightStack.insertBefore(forecast, beforeNode);
    else rightStack.appendChild(forecast);
  }

  function applyLayout() {
    if (applying) return;
    const layer = document.getElementById(LAYER_ID);
    if (!layer) return;
    const grid = layer.querySelector('.jd-grid');
    if (!grid) return;
    const stacks = Array.from(grid.children).filter((el) => el.classList && el.classList.contains('jd-stack'));
    if (stacks.length < 2) return;

    applying = true;
    try {
      ensureStyles();
      const leftStack = stacks[0];
      const rightStack = stacks[1];
      const beds = layer.querySelector('#jd-beds');
      const seeds = layer.querySelector('#jd-seeds');
      const activeGoals = layer.querySelector('#jd-active-goals');
      const challenges = layer.querySelector('#jd-challenges');

      if (beds && seeds) {
        seeds.classList.remove('jd-wide');
        leftStack.insertBefore(seeds, beds.nextSibling);
      }

      if (activeGoals && challenges) {
        challenges.classList.remove('jd-wide');
        rightStack.insertBefore(challenges, activeGoals.nextSibling);
        const activeHeight = Math.round(activeGoals.getBoundingClientRect().height);
        if (activeHeight > 0) challenges.style.minHeight = `${activeHeight}px`;
      }

      const currentJournal = layer.querySelector('#jd-journal');
      if (currentJournal && currentJournal.parentElement !== rightStack) rightStack.appendChild(currentJournal);
      mergeJournalAndCalendar(layer, rightStack);

      const mergedJournal = layer.querySelector('#jd-journal');
      ensureForecast(layer, rightStack, mergedJournal);
    } finally {
      applying = false;
    }
  }

  function scheduleApply() {
    if (applying) return;
    requestAnimationFrame(applyLayout);
  }

  function start() {
    ensureStyles();
    applyLayout();
    observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', scheduleApply);
    setInterval(applyLayout, 500);
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
