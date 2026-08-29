// Plot & Season — Garden Journey live dashboard
(function () {
  'use strict';

  const STYLE_ID = 'plot-season-journey-dashboard-styles';
  const LAYER_ID = 'plot-season-journey-dashboard-layer';
  const FAIL_KEY = 'plotandseason-dashboard-failures-v1';
  const YEAR_KEY = 'plotandseason-dashboard-year-v1';

  const live = {
    beds: [],
    groundPlants: [],
    greenhouses: [],
    planterBuckets: [],
    treeContainers: [],
    compostBatches: [],
    inventory: null,
    goals: { harvests: 0, compostStarted: 0, plantsWatered: 0 },
    log: [],
  };

  let failureState = loadJson(FAIL_KEY, { count: 0, known: {}, baselineReady: false });
  let yearState = loadJson(YEAR_KEY, { year: 1, lastSeason: null, lastDayKey: null, dayStartedAt: Date.now() });

  function loadJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed && typeof parsed === 'object' ? { ...fallback, ...parsed } : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { }
  }

  function isPlant(p) {
    return !!p && typeof p === 'object' && typeof p.health === 'number' && typeof p.name === 'string' && ('age' in p || 'daysToMature' in p);
  }

  function classifyArray(arr, initialValue) {
    if (!Array.isArray(arr)) return;
    if ((arr.length === 1 && arr[0] === 'Welcome to the garden.') || (Array.isArray(initialValue) && initialValue.length === 1 && initialValue[0] === 'Welcome to the garden.')) {
      live.log = arr;
      return;
    }
    const first = arr.find(Boolean);
    if (!first || typeof first !== 'object') return;

    if (Array.isArray(first.plants) && 'material' in first && 'soilId' in first && 'w' in first && 'h' in first) {
      live.beds = arr;
      return;
    }
    if (Array.isArray(first.plants) && typeof first.typeId === 'string' && /^gh/i.test(first.typeId)) {
      live.greenhouses = arr;
      return;
    }
    if (isPlant(first) && 'gx' in first && 'gy' in first) {
      live.groundPlants = arr;
      return;
    }
    if ('plant' in first && typeof first.typeId === 'string' && 'greenhouseId' in first) {
      live.treeContainers = arr;
      return;
    }
    if ('plant' in first && typeof first.typeId === 'string' && !('greenhouseId' in first)) {
      live.planterBuckets = arr;
      return;
    }
    if ('daysIn' in first && 'daysNeeded' in first && 'ready' in first && !('plantId' in first) && !('recipeId' in first)) {
      live.compostBatches = arr;
    }
  }

  function classifyValue(value, initialValue) {
    if (Array.isArray(value)) {
      classifyArray(value, initialValue);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (!Array.isArray(value) && value.seeds && value.livePlants && value.soils) {
      live.inventory = value;
      return;
    }
    if (!Array.isArray(value) && 'harvests' in value && 'compostStarted' in value && 'plantsWatered' in value) {
      live.goals = {
        harvests: Number(value.harvests || 0),
        compostStarted: Number(value.compostStarted || 0),
        plantsWatered: Number(value.plantsWatered || 0),
      };
    }
  }

  // Capture the existing GardenGame state without replacing any of its gameplay systems.
  // This script loads before app.js, after the other gameplay observers, so preserve their wrapper chain.
  if (window.React && window.React.useState && !window.React.__plotSeasonJourneyDashboardCapture) {
    const previousUseState = window.React.useState;
    window.React.useState = function journeyDashboardUseState(initialValue) {
      const pair = previousUseState(initialValue);
      const currentValue = pair[0];
      const previousSetter = pair[1];
      classifyValue(currentValue, initialValue);
      return [currentValue, function journeyDashboardSetter(nextValue) {
        previousSetter(function (prev) {
          const next = typeof nextValue === 'function' ? nextValue(prev) : nextValue;
          classifyValue(next, initialValue);
          return next;
        });
      }];
    };
    window.React.__plotSeasonJourneyDashboardCapture = true;
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      [data-journey-dashboard-original="true"] {
        visibility: hidden !important;
        max-width: none !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      #${LAYER_ID} {
        position: absolute;
        z-index: 30;
        box-sizing: border-box;
        font-family: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        color: #3d2b1f;
      }
      #${LAYER_ID} * { box-sizing: border-box; }
      #${LAYER_ID} .jd-shell {
        display: grid;
        grid-template-columns: 230px minmax(0,1fr);
        gap: 18px;
        align-items: start;
        width: 100%;
      }
      #${LAYER_ID} .jd-sidebar {
        background: rgba(255,250,235,.94);
        border: 1.5px solid rgba(151,125,82,.42);
        border-radius: 16px;
        padding: 12px;
        box-shadow: 0 12px 30px rgba(55,47,35,.17);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        position: sticky;
        top: 12px;
      }
      #${LAYER_ID} .jd-nav {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      #${LAYER_ID} .jd-nav-btn {
        width: 100%;
        border: 0;
        background: transparent;
        border-radius: 9px;
        padding: 11px 10px;
        display: grid;
        grid-template-columns: 27px 1fr 10px;
        align-items: center;
        gap: 8px;
        color: #493526;
        font-size: 12px;
        font-weight: 750;
        text-align: left;
        cursor: pointer;
      }
      #${LAYER_ID} .jd-nav-btn:hover,
      #${LAYER_ID} .jd-nav-btn.jd-current {
        background: linear-gradient(90deg,rgba(150,181,101,.42),rgba(210,220,167,.48));
        color: #31552f;
      }
      #${LAYER_ID} .jd-nav-icon { font-size: 19px; text-align: center; }
      #${LAYER_ID} .jd-dot { width: 7px; height: 7px; border-radius: 50%; background: #ed6a2c; justify-self: end; }
      #${LAYER_ID} .jd-rank-card {
        margin-top: 13px;
        padding: 12px;
        border-radius: 12px;
        border: 1px solid #d7c69e;
        background: rgba(255,253,244,.88);
      }
      #${LAYER_ID} .jd-rank-title { font-size: 12px; font-weight: 900; line-height: 1.35; color: #3f542e; }
      #${LAYER_ID} .jd-rank-sub { font-size: 9px; color: #75634f; margin-top: 4px; }
      #${LAYER_ID} .jd-rank-bar { height: 7px; border-radius: 99px; background: #e4ddc9; overflow: hidden; margin-top: 9px; }
      #${LAYER_ID} .jd-rank-fill { height: 100%; width: 32%; background: #4f8062; border-radius: 99px; }
      #${LAYER_ID} .jd-main { min-width: 0; }
      #${LAYER_ID} .jd-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }
      #${LAYER_ID} .jd-date-card,
      #${LAYER_ID} .jd-wallet-card {
        background: rgba(255,252,239,.94);
        border: 1px solid rgba(181,154,105,.38);
        border-radius: 999px;
        padding: 9px 15px;
        box-shadow: 0 7px 18px rgba(55,47,35,.12);
        display: flex;
        align-items: center;
        gap: 16px;
        font-size: 11px;
        font-weight: 800;
      }
      #${LAYER_ID} .jd-weather-big { font-size: 23px; line-height: 1; }
      #${LAYER_ID} .jd-date-main { font-size: 13px; font-weight: 900; color: #3d2b1f; }
      #${LAYER_ID} .jd-date-sub { font-size: 9px; color: #75634f; margin-top: 1px; }
      #${LAYER_ID} .jd-card {
        background: rgba(255,251,238,.95);
        border: 1.5px solid rgba(176,145,93,.34);
        border-radius: 14px;
        box-shadow: 0 10px 25px rgba(55,47,35,.13);
        overflow: hidden;
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
      }
      #${LAYER_ID} .jd-overview-head {
        padding: 13px 16px;
        background: linear-gradient(115deg,#426f3c,#5f8b4d);
        color: #fff9e8;
        font-family: Georgia,"Times New Roman",serif;
        font-size: 18px;
        font-weight: 900;
      }
      #${LAYER_ID} .jd-stats {
        display: grid;
        grid-template-columns: repeat(5,minmax(0,1fr));
        border-bottom: 1px solid #ddd0b5;
      }
      #${LAYER_ID} .jd-stat {
        padding: 13px 9px;
        text-align: center;
        min-width: 0;
        border-right: 1px solid #e3d7be;
      }
      #${LAYER_ID} .jd-stat:last-child { border-right: 0; }
      #${LAYER_ID} .jd-stat-icon { font-size: 25px; }
      #${LAYER_ID} .jd-stat-number { font-size: 22px; font-weight: 950; color: #3e3528; line-height: 1.1; margin-top: 2px; }
      #${LAYER_ID} .jd-stat-label { font-size: 9px; font-weight: 800; color: #5e5140; line-height: 1.25; margin-top: 3px; }
      #${LAYER_ID} .jd-greeting {
        margin: 11px;
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(255,255,255,.52);
        border: 1px solid #e4d8c1;
        display: flex;
        align-items: center;
        gap: 11px;
      }
      #${LAYER_ID} .jd-greeting-avatar { width: 48px; height: 48px; border-radius: 50%; display:flex;align-items:center;justify-content:center;background:#d9e8c8;border:2px solid #7a9b62;font-size:28px;flex-shrink:0; }
      #${LAYER_ID} .jd-greeting-copy { flex: 1; min-width: 0; }
      #${LAYER_ID} .jd-greeting-title { font-size: 13px; font-weight: 900; }
      #${LAYER_ID} .jd-greeting-text { font-size: 10px; color: #5f4f3e; line-height: 1.4; margin-top: 2px; }
      #${LAYER_ID} .jd-primary-btn { border: 0; border-radius: 8px; padding: 9px 15px; background: #5b833d; color: white; font-weight: 850; font-size: 10px; cursor: pointer; white-space: nowrap; }
      #${LAYER_ID} .jd-grid {
        display: grid;
        grid-template-columns: minmax(0,1.45fr) minmax(285px,.72fr);
        gap: 13px;
        align-items: start;
        margin-top: 13px;
      }
      #${LAYER_ID} .jd-stack { display: flex; flex-direction: column; gap: 13px; }
      #${LAYER_ID} .jd-section-head { display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px 8px;font-family:Georgia,"Times New Roman",serif;font-size:16px;font-weight:900;color:#3e3326; }
      #${LAYER_ID} .jd-section-action { border:0;background:transparent;color:#6b5844;font-size:9px;font-weight:800;cursor:pointer; }
      #${LAYER_ID} .jd-bed-list { margin: 0 10px 10px; border: 1px solid #dfd2b9; border-radius: 10px; overflow: hidden; background: rgba(255,255,255,.36); }
      #${LAYER_ID} .jd-bed-row { display:grid;grid-template-columns:115px minmax(0,1fr) 76px 58px 20px;gap:9px;align-items:center;padding:8px;border-bottom:1px solid #e4d8c1;min-height:72px; }
      #${LAYER_ID} .jd-bed-row:last-child { border-bottom:0; }
      #${LAYER_ID} .jd-bed-visual { height:55px;border-radius:8px;border:1px solid #c8b17e;background:linear-gradient(#b7cf83 0 36%,#92663f 36% 100%);display:flex;align-items:flex-end;justify-content:center;gap:2px;padding:5px;overflow:hidden;font-size:20px; }
      #${LAYER_ID} .jd-bed-name { font-size:12px;font-weight:900;color:#244a32; }
      #${LAYER_ID} .jd-bed-crops { font-size:9px;color:#6a5946;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      #${LAYER_ID} .jd-health { font-size:15px;font-weight:900;color:#3f733e; }
      #${LAYER_ID} .jd-mini { font-size:9px;color:#6a5946;margin-top:1px; }
      #${LAYER_ID} .jd-ready { text-align:center;font-size:14px;font-weight:900;color:#315c39; }
      #${LAYER_ID} .jd-bed-actions { display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 10px 11px; }
      #${LAYER_ID} .jd-action-btn { border:0;border-radius:8px;padding:10px 7px;color:white;font-size:10px;font-weight:850;cursor:pointer; }
      #${LAYER_ID} .jd-action-green { background:#5f8b43; } #${LAYER_ID} .jd-action-blue { background:#4580a4; } #${LAYER_ID} .jd-action-gold { background:#a97636; }
      #${LAYER_ID} .jd-list { padding: 0 11px 11px; display:flex;flex-direction:column;gap:7px; }
      #${LAYER_ID} .jd-list-row { padding:8px;border:1px solid #e4d8c1;border-radius:8px;background:rgba(255,255,255,.38);display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:8px;align-items:center; }
      #${LAYER_ID} .jd-list-icon { font-size:21px;text-align:center; }
      #${LAYER_ID} .jd-list-title { font-size:10px;font-weight:900;color:#433425; }
      #${LAYER_ID} .jd-list-desc { font-size:8.5px;color:#72604d;line-height:1.35;margin-top:2px; }
      #${LAYER_ID} .jd-progress { height:6px;border-radius:99px;background:#e4dcc8;overflow:hidden;margin-top:5px; }
      #${LAYER_ID} .jd-progress > i { display:block;height:100%;border-radius:99px;background:#6e9955; }
      #${LAYER_ID} .jd-count { font-size:9px;font-weight:900;color:#675743;white-space:nowrap; }
      #${LAYER_ID} .jd-journal-row { padding:7px 9px;border-bottom:1px solid #e4d8c1;font-size:9px;line-height:1.35;color:#584837; }
      #${LAYER_ID} .jd-journal-row:last-child { border-bottom:0; }
      #${LAYER_ID} .jd-wide { margin-top:13px; }
      #${LAYER_ID} .jd-seed-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:7px;padding:0 11px 12px; }
      #${LAYER_ID} .jd-seed-chip { padding:8px;border:1px solid #dfd2b9;border-radius:8px;background:rgba(255,255,255,.42);font-size:9px;display:flex;justify-content:space-between;gap:7px; }
      #${LAYER_ID} .jd-calendar-body { padding:0 12px 12px;font-size:10px;color:#5e4d3d;line-height:1.5; }
      #${LAYER_ID} .jd-empty { padding:18px;text-align:center;color:#786955;font-size:10px;font-style:italic; }
      @media(max-width:1080px){
        #${LAYER_ID} .jd-shell{grid-template-columns:190px minmax(0,1fr);gap:12px}
        #${LAYER_ID} .jd-stats{grid-template-columns:repeat(3,1fr)}
        #${LAYER_ID} .jd-stat:nth-child(3){border-right:0}
        #${LAYER_ID} .jd-grid{grid-template-columns:1fr}
      }
      @media(max-width:760px){
        #${LAYER_ID} .jd-shell{grid-template-columns:1fr}
        #${LAYER_ID} .jd-sidebar{position:relative;top:auto}
        #${LAYER_ID} .jd-nav{display:grid;grid-template-columns:repeat(2,1fr)}
        #${LAYER_ID} .jd-rank-card{display:none}
        #${LAYER_ID} .jd-bed-row{grid-template-columns:80px minmax(0,1fr) 60px 45px}
        #${LAYER_ID} .jd-bed-row > :last-child{display:none}
        #${LAYER_ID} .jd-stats{grid-template-columns:repeat(2,1fr)}
        #${LAYER_ID} .jd-stat{border-bottom:1px solid #e3d7be}
        #${LAYER_ID} .jd-greeting{align-items:flex-start;flex-wrap:wrap}
      }
    `;
    document.head.appendChild(style);
  }

  function findJourneyRoot() {
    const heading = Array.from(document.querySelectorAll('#root div')).find((el) =>
      (el.textContent || '').trim() === '🏆 Your Garden Journey'
    );
    return heading ? heading.parentElement : null;
  }

  function collectPlants() {
    const entries = [];
    (live.beds || []).forEach((bed) => (bed.plants || []).forEach((p) => p && entries.push({ key: `bed-${bed.id}-${p.sx}-${p.sy}-${p.id}`, plant: p, bedId: bed.id })));
    (live.groundPlants || []).forEach((p) => p && entries.push({ key: `ground-${p.gx}-${p.gy}-${p.id}`, plant: p }));
    (live.greenhouses || []).forEach((g) => {
      (g.plants || []).forEach((p, i) => p && entries.push({ key: `greenhouse-${g.id}-${i}-${p.id}`, plant: p }));
      (g.hydroponics || []).forEach((sys, si) => (sys.plants || []).forEach((p, pi) => p && entries.push({ key: `hydro-${g.id}-${si}-${pi}-${p.id}`, plant: p })));
    });
    (live.planterBuckets || []).forEach((c) => c && c.plant && entries.push({ key: `bucket-${c.id}-${c.plant.id}`, plant: c.plant }));
    (live.treeContainers || []).forEach((c) => c && c.plant && entries.push({ key: `tree-${c.id}-${c.plant.id}`, plant: c.plant }));
    return entries;
  }

  function updateFailures() {
    const entries = collectPlants();
    const now = {};
    entries.forEach(({ key, plant }) => { now[key] = !!(plant.dead || Number(plant.health || 0) <= 0); });
    if (!failureState.baselineReady) {
      failureState.known = now;
      failureState.baselineReady = true;
      saveJson(FAIL_KEY, failureState);
      return;
    }
    let changed = false;
    Object.keys(now).forEach((key) => {
      if (now[key] && failureState.known[key] === false) {
        failureState.count = Number(failureState.count || 0) + 1;
        changed = true;
      }
    });
    failureState.known = now;
    if (changed || entries.length) saveJson(FAIL_KEY, failureState);
  }

  function topBarInfo() {
    const bodyText = document.body ? document.body.innerText : '';
    const seasonMatch = bodyText.match(/\b(Spring|Summer|Fall|Winter)\b\s*[•·-]\s*Day\s+(\d+)\/20/i);
    const dateMatch = bodyText.match(/📅\s*([A-Z][a-z]+)\s+(\d{1,2})/);
    const season = seasonMatch ? seasonMatch[1] : 'Spring';
    const day = seasonMatch ? Number(seasonMatch[2]) : 1;
    const dateLabel = dateMatch ? `${dateMatch[1]} ${dateMatch[2]}` : `${season} Day ${day}`;
    const dayKey = `${season}-${day}-${dateLabel}`;

    if (yearState.lastSeason === 'Winter' && season === 'Spring' && day <= 2 && yearState.lastDayKey !== dayKey) {
      yearState.year = Number(yearState.year || 1) + 1;
    }
    if (yearState.lastDayKey !== dayKey) {
      yearState.dayStartedAt = Date.now();
      yearState.lastDayKey = dayKey;
    }
    yearState.lastSeason = season;
    saveJson(YEAR_KEY, yearState);

    const speedInput = Array.from(document.querySelectorAll('input[type="range"]')).find((el) => (el.title || '').includes('real seconds per in-game day'));
    const daySeconds = Math.max(10, Number(speedInput && speedInput.value || 60));
    const planning = /Planning Phase/i.test(bodyText);
    const paused = /▶\s*Resume/.test(bodyText);
    const elapsed = Math.max(0, Math.min(1, (Date.now() - Number(yearState.dayStartedAt || Date.now())) / (daySeconds * 1000)));
    const minutes = planning ? 8 * 60 : Math.round((6 * 60) + elapsed * (14 * 60));
    const hour24 = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = ((hour24 + 11) % 12) + 1;
    const timeLabel = paused ? `${hour12}:${String(mins).padStart(2, '0')} ${ampm} · Paused` : planning ? 'Planning' : `${hour12}:${String(mins).padStart(2, '0')} ${ampm}`;

    const weather = /🔥\s*Heat Wave/.test(bodyText) ? 'heatwave' : /❄️\s*Freeze/.test(bodyText) ? 'freeze' : /🌧️\s*Rain/.test(bodyText) ? 'rain' : null;
    const base = { Spring: 58, Summer: 82, Fall: 64, Winter: 39 }[season] || 60;
    const variation = ((day * 7) % 9) - 4;
    const weatherAdj = weather === 'heatwave' ? 12 : weather === 'freeze' ? -18 : weather === 'rain' ? -4 : 0;
    const temperature = base + variation + weatherAdj;
    const weatherIcon = weather === 'heatwave' ? '🔥' : weather === 'freeze' ? '❄️' : weather === 'rain' ? '🌧️' : season === 'Winter' ? '🌤️' : '☀️';

    const cashEl = Array.from(document.querySelectorAll('#root div')).find((el) => (el.textContent || '').trim() === 'Cash');
    let cash = '';
    if (cashEl && cashEl.parentElement) {
      const text = cashEl.parentElement.textContent || '';
      const m = text.match(/\$\s*([\d,]+)/);
      if (m) cash = m[1];
    }
    return { season, day, dateLabel, year: Number(yearState.year || 1), timeLabel, temperature, weatherIcon, weather, cash };
  }

  function rankInfo() {
    const badge = document.getElementById('gardener-rank-badge');
    const text = badge ? (badge.innerText || badge.textContent || '').trim() : '';
    const lines = text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
    let title = lines.find((x) => !/Gardener Rank|%|season|Highest/i.test(x)) || '🌱 Seed Starter';
    let progress = lines.find((x) => /%|season|Highest/i.test(x)) || 'Keep learning by doing';
    const percent = progress.match(/(\d+)%/);
    return { title, progress, percent: percent ? Math.max(0, Math.min(100, Number(percent[1]))) : 18 };
  }

  function challengeInfo() {
    const state = loadJson('plotandseason-challenge-goals-v1', { active: {}, completed: {} });
    const defs = [
      { id: 'heatwave', icon: '🔥', title: 'Heat Wave', desc: 'Protect your garden during extreme heat.' },
      { id: 'pest', icon: '🔎', title: 'Pest Patrol', desc: 'Identify and control an active pest.' },
      { id: 'rescue', icon: '🩹', title: 'Rescue Mission', desc: 'Restore a stressed plant to healthy condition.' },
    ];
    return defs.map((d) => ({ ...d, active: !!(state.active && state.active[d.id]), complete: !!(state.completed && state.completed[d.id]) }));
  }

  function activeGoals() {
    const g = live.goals || {};
    return [
      { icon: '🌱', title: 'Learn Your Plants', value: Number(g.plantsWatered || 0), target: 5 },
      { icon: '🥕', title: 'From Soil to Basket', value: Number(g.harvests || 0), target: 3 },
      { icon: '♻️', title: 'Waste Nothing', value: Number(g.compostStarted || 0), target: 1 },
      { icon: '💧', title: 'Learn the Watering Rhythm', value: Number(g.plantsWatered || 0), target: 25 },
      { icon: '🌿', title: 'Season Grower', value: Number(g.harvests || 0), target: 10 },
      { icon: '🌻', title: 'Garden Steward', value: Number(g.harvests || 0), target: 25 },
    ].filter((x) => x.value < x.target).slice(0, 3);
  }

  function learningSteps(originalRoot) {
    const defs = [
      { icon: '👀', title: 'Meet Your Garden', short: 'Observe your site before you act.' },
      { icon: '🌱', title: 'Plant Something', short: 'Give roots the right start.' },
      { icon: '💧', title: 'Water by Hand', short: 'Learn each crop’s watering rhythm.' },
      { icon: '🧺', title: 'Harvest at the Right Time', short: 'Ripeness affects quality and value.' },
      { icon: '♻️', title: 'Return Waste to the Soil', short: 'Turn garden waste back into resources.' },
      { icon: '📔', title: 'Read Your Garden Journal', short: 'Learn from what happened this season.' },
    ];
    const source = originalRoot ? (originalRoot.innerText || originalRoot.textContent || '') : '';
    return defs.map((d) => {
      const idx = source.indexOf(d.title);
      const nearby = idx >= 0 ? source.slice(Math.max(0, idx - 70), idx + d.title.length + 180) : '';
      const complete = /✓|complete/i.test(nearby);
      return { ...d, complete };
    });
  }

  function plantEmoji(p) { return p && p.emoji ? p.emoji : '🌱'; }

  function bedRows() {
    return (live.beds || []).map((bed, idx) => {
      const plants = (bed.plants || []).filter(Boolean);
      const living = plants.filter((p) => !p.dead && !p.harvested && Number(p.health || 0) > 0);
      const avg = living.length ? Math.round(living.reduce((sum, p) => sum + Number(p.health || 0), 0) / living.length) : null;
      const ready = living.filter((p) => Number(p.age || 0) >= Number(p.daysToMature || Infinity)).length;
      const names = [...new Set(living.map((p) => p.name))];
      const emojis = living.slice(0, 6).map(plantEmoji);
      return { id: bed.id, label: `Bed ${bed.id || idx + 1}`, names, emojis, avg, ready, count: living.length };
    });
  }

  function overviewStats() {
    const entries = collectPlants();
    const living = entries.map((e) => e.plant).filter((p) => !p.dead && !p.harvested && Number(p.health || 0) > 0);
    const avgHealth = living.length ? Math.round(living.reduce((sum, p) => sum + Number(p.health || 0), 0) / living.length) : 0;
    return {
      growing: living.length,
      successful: Number((live.goals && live.goals.harvests) || 0),
      failed: Number(failureState.count || 0),
      avgHealth,
      compost: (live.compostBatches || []).filter((b) => b && !b.ready).length,
    };
  }

  function seedRows() {
    if (!live.inventory || !live.inventory.seeds) return [];
    return Object.entries(live.inventory.seeds)
      .filter(([, count]) => Number(count || 0) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 16)
      .map(([id, count]) => ({ id, count: Number(count) }));
  }

  function recentLogs() {
    return (live.log || []).filter((x) => typeof x === 'string').slice(0, 4);
  }

  function greeting(stats, beds) {
    const ready = beds.reduce((sum, b) => sum + b.ready, 0);
    if (ready > 0) return `${ready} plant${ready === 1 ? ' is' : 's are'} ready to harvest. Check the beds below before the harvest window passes.`;
    if (stats.avgHealth > 0 && stats.avgHealth < 65) return 'Some plants are stressed. Check plant health and watering before advancing another day.';
    if (stats.growing > 0) return `You have ${stats.growing} plant${stats.growing === 1 ? '' : 's'} growing. Keep watching health, water, pests, and maturity.`;
    return 'Your garden is ready for a plan. Add a bed or plant directly in the Yard to start building this season’s story.';
  }

  function progressRow(icon, title, desc, value, target, complete) {
    const pct = complete ? 100 : Math.max(0, Math.min(100, Math.round((Number(value || 0) / Math.max(1, Number(target || 1))) * 100)));
    return `<div class="jd-list-row"><div class="jd-list-icon">${icon}</div><div><div class="jd-list-title">${esc(title)}</div><div class="jd-list-desc">${esc(desc || '')}</div><div class="jd-progress"><i style="width:${pct}%"></i></div></div><div class="jd-count">${complete ? '✓' : `${Number(value || 0)}/${Number(target || 0)}`}</div></div>`;
  }

  function renderDashboard(originalRoot) {
    updateFailures();
    const top = topBarInfo();
    const stats = overviewStats();
    const beds = bedRows();
    const goals = activeGoals();
    const learning = learningSteps(originalRoot);
    const challenges = challengeInfo();
    const logs = recentLogs();
    const seeds = seedRows();
    const rank = rankInfo();
    const anyChallengeActive = challenges.some((x) => x.active);

    const bedHtml = beds.length ? beds.map((b) => `<div class="jd-bed-row">
      <div class="jd-bed-visual">${b.emojis.length ? b.emojis.map(esc).join('') : '🌱'}</div>
      <div><div class="jd-bed-name">${esc(b.label)}</div><div class="jd-bed-crops">${esc(b.names.length ? b.names.join(', ') : 'Empty bed')}</div><div class="jd-mini">${b.count} growing</div></div>
      <div><div class="jd-health">${b.avg == null ? '—' : `♥ ${b.avg}%`}</div><div class="jd-mini">Health</div></div>
      <div><div class="jd-ready">${b.ready || '–'}</div><div class="jd-mini" style="text-align:center">Ready</div></div>
      <div style="font-size:22px;color:#82725e">›</div>
    </div>`).join('') : `<div class="jd-empty">No raised beds yet. Build your first bed in My Garden and it will appear here automatically.</div>`;

    const learningHtml = learning.slice(0, 4).map((s, i) => progressRow(s.icon, s.title, s.short, s.complete ? 1 : 0, 1, s.complete)).join('');
    const goalHtml = goals.length ? goals.map((g) => progressRow(g.icon, g.title, 'Current Garden Journey goal', g.value, g.target, false)).join('') : `<div class="jd-empty">All current Journey goals are complete. 🌻</div>`;
    const challengeHtml = challenges.map((c) => `<div class="jd-list-row"><div class="jd-list-icon">${c.icon}</div><div><div class="jd-list-title">${esc(c.title)}</div><div class="jd-list-desc">${esc(c.desc)}</div></div><div class="jd-count" style="color:${c.complete ? '#4f7a3c' : c.active ? '#b15e24' : '#75634f'}">${c.complete ? '✓ COMPLETE' : c.active ? 'ACTIVE' : 'REACTIVE'}</div></div>`).join('');
    const logsHtml = logs.length ? logs.map((x) => `<div class="jd-journal-row">${esc(x)}</div>`).join('') : `<div class="jd-empty">Your recent garden notes will appear here.</div>`;
    const seedsHtml = seeds.length ? seeds.map((s) => `<div class="jd-seed-chip"><span>🌱 ${esc(s.id.replace(/-/g,' '))}</span><strong>${s.count}</strong></div>`).join('') : `<div class="jd-empty" style="grid-column:1/-1">No seed packets in storage yet.</div>`;

    return `<div class="jd-shell">
      <aside class="jd-sidebar">
        <div class="jd-nav">
          <button class="jd-nav-btn jd-current" data-jd-target="my-garden"><span class="jd-nav-icon">🌱</span><span>My Garden</span><span></span></button>
          <button class="jd-nav-btn" data-jd-target="plant-guide"><span class="jd-nav-icon">📖</span><span>Plant Guide</span><span></span></button>
          <button class="jd-nav-btn" data-jd-target="challenges"><span class="jd-nav-icon">🏆</span><span>Challenges</span>${anyChallengeActive ? '<span class="jd-dot"></span>' : '<span></span>'}</button>
          <button class="jd-nav-btn" data-jd-target="learning"><span class="jd-nav-icon">🌿</span><span>Learning Path</span><span></span></button>
          <button class="jd-nav-btn" data-jd-target="active-goals"><span class="jd-nav-icon">🎯</span><span>Active Goals</span>${goals.length ? '<span class="jd-dot"></span>' : '<span></span>'}</button>
          <button class="jd-nav-btn" data-jd-target="journal"><span class="jd-nav-icon">📜</span><span>Gardener Journal</span><span></span></button>
          <button class="jd-nav-btn" data-jd-target="seeds"><span class="jd-nav-icon">🫘</span><span>Seed Storage</span><span></span></button>
          <button class="jd-nav-btn" data-jd-target="calendar"><span class="jd-nav-icon">🗓️</span><span>Calendar</span><span></span></button>
          <button class="jd-nav-btn" data-jd-target="store"><span class="jd-nav-icon">🏪</span><span>Store</span><span></span></button>
        </div>
        <div class="jd-rank-card"><div style="display:flex;gap:9px;align-items:center"><div style="font-size:34px">🧑‍🌾</div><div><div class="jd-rank-title">${esc(rank.title)}</div><div class="jd-rank-sub">Gardener Rank</div></div></div><div class="jd-rank-bar"><div class="jd-rank-fill" style="width:${rank.percent}%"></div></div><div class="jd-rank-sub" style="text-align:center">${esc(rank.progress)}</div></div>
      </aside>

      <main class="jd-main">
        <div class="jd-topline">
          <div class="jd-date-card"><span class="jd-weather-big">${top.weatherIcon}</span><div><div class="jd-date-main">${esc(top.dateLabel)}, Year ${top.year}</div><div class="jd-date-sub">${esc(top.season)} · ${esc(top.timeLabel)}</div></div><div style="font-size:18px">🌤️</div><div class="jd-date-main">${top.temperature}°F</div></div>
          ${top.cash ? `<div class="jd-wallet-card"><span>💰 $${esc(top.cash)}</span><span>🌱 ${stats.growing}</span><span>🪱 ${stats.compost}</span></div>` : ''}
        </div>

        <section class="jd-card" id="jd-my-garden">
          <div class="jd-overview-head">Garden Overview</div>
          <div class="jd-stats">
            <div class="jd-stat"><div class="jd-stat-icon">🌱</div><div class="jd-stat-number">${stats.growing}</div><div class="jd-stat-label">Plants Growing</div></div>
            <div class="jd-stat"><div class="jd-stat-icon">🧺</div><div class="jd-stat-number">${stats.successful}</div><div class="jd-stat-label">Successfully Grown</div></div>
            <div class="jd-stat"><div class="jd-stat-icon">🥀</div><div class="jd-stat-number">${stats.failed}</div><div class="jd-stat-label">Failed Plants</div></div>
            <div class="jd-stat"><div class="jd-stat-icon">💧</div><div class="jd-stat-number">${stats.avgHealth}%</div><div class="jd-stat-label">Avg. Plant Health</div></div>
            <div class="jd-stat"><div class="jd-stat-icon">🪱</div><div class="jd-stat-number">${stats.compost}</div><div class="jd-stat-label">Compost Bins Active</div></div>
          </div>
          <div class="jd-greeting"><div class="jd-greeting-avatar">🧑‍🌾</div><div class="jd-greeting-copy"><div class="jd-greeting-title">Good ${/AM/.test(top.timeLabel) || top.timeLabel === 'Planning' ? 'morning' : 'afternoon'}, Gardener!</div><div class="jd-greeting-text">${esc(greeting(stats,beds))}</div></div><button class="jd-primary-btn" data-jd-action="yard">View My Garden ›</button></div>
        </section>

        <div class="jd-grid">
          <div class="jd-stack">
            <section class="jd-card" id="jd-beds"><div class="jd-section-head"><span>Garden Beds</span><button class="jd-section-action" data-jd-action="yard">View Garden</button></div><div class="jd-bed-list">${bedHtml}</div><div class="jd-bed-actions"><button class="jd-action-btn jd-action-green" data-jd-action="water">💧 Water All</button><button class="jd-action-btn jd-action-blue" data-jd-action="yard">♡ Check Health</button><button class="jd-action-btn jd-action-gold" data-jd-action="yard">🧺 Harvest All Ready</button></div></section>
          </div>
          <div class="jd-stack">
            <section class="jd-card" id="jd-learning"><div class="jd-section-head"><span>Learning Path</span><button class="jd-section-action" data-jd-scroll="learning">View All</button></div><div class="jd-list">${learningHtml}</div></section>
            <section class="jd-card" id="jd-active-goals"><div class="jd-section-head"><span>Active Goals</span><span class="jd-section-action">${goals.length} active</span></div><div class="jd-list">${goalHtml}</div></section>
            <section class="jd-card" id="jd-journal"><div class="jd-section-head"><span>Recent Journal</span><span class="jd-section-action">Garden Log</span></div><div>${logsHtml}</div></section>
          </div>
        </div>

        <section class="jd-card jd-wide" id="jd-challenges"><div class="jd-section-head"><span>🌦️ Challenges</span><span class="jd-section-action">Reactive garden problems</span></div><div class="jd-list">${challengeHtml}</div></section>
        <section class="jd-card jd-wide" id="jd-seeds"><div class="jd-section-head"><span>🫘 Seed Storage</span><button class="jd-section-action" data-jd-action="store">Get Seeds</button></div><div class="jd-seed-grid">${seedsHtml}</div></section>
        <section class="jd-card jd-wide" id="jd-calendar"><div class="jd-section-head"><span>🗓️ Garden Calendar</span><span class="jd-section-action">Year ${top.year}</span></div><div class="jd-calendar-body"><strong>${esc(top.dateLabel)} · ${esc(top.season)} Day ${top.day}/20</strong><br>Current simulated garden temperature: <strong>${top.temperature}°F</strong>${top.weather ? ` · ${esc(top.weather.replace('heatwave','Heat Wave').replace('freeze','Freeze').replace('rain','Rain'))}` : ''}. Your calendar advances with the growing season and the dashboard keeps a running garden year when Winter rolls back into Spring.</div></section>
      </main>
    </div>`;
  }

  function clickTopTab(label) {
    const button = Array.from(document.querySelectorAll('#root button')).find((b) => (b.textContent || '').trim().includes(label));
    if (button) { button.click(); return true; }
    return false;
  }

  function scrollToDashboard(id) {
    const layer = document.getElementById(LAYER_ID);
    if (!layer) return;
    const target = layer.querySelector(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function wireLayer(layer) {
    if (layer.dataset.wired === 'true') return;
    layer.dataset.wired = 'true';
    layer.addEventListener('click', (event) => {
      const nav = event.target.closest('[data-jd-target]');
      if (nav) {
        const target = nav.dataset.jdTarget;
        if (target === 'my-garden') scrollToDashboard('#jd-my-garden');
        else if (target === 'plant-guide') clickTopTab('Garden Catalog');
        else if (target === 'challenges') scrollToDashboard('#jd-challenges');
        else if (target === 'learning') scrollToDashboard('#jd-learning');
        else if (target === 'active-goals') scrollToDashboard('#jd-active-goals');
        else if (target === 'journal') scrollToDashboard('#jd-journal');
        else if (target === 'seeds') scrollToDashboard('#jd-seeds');
        else if (target === 'calendar') scrollToDashboard('#jd-calendar');
        else if (target === 'store') clickTopTab('Plant Nursery');
        return;
      }
      const action = event.target.closest('[data-jd-action]');
      if (action) {
        const name = action.dataset.jdAction;
        if (name === 'store') clickTopTab('Plant Nursery');
        if (name === 'yard' || name === 'water') {
          clickTopTab('Yard');
          if (name === 'water') {
            setTimeout(() => {
              const water = Array.from(document.querySelectorAll('#root button')).find((b) => /^💧?\s*Water$/i.test((b.textContent || '').trim()) || (b.textContent || '').trim() === 'Water');
              if (water) water.click();
            }, 220);
          }
        }
      }
    });
  }

  function positionLayer(layer, originalRoot) {
    const rect = originalRoot.getBoundingClientRect();
    const maxWidth = Math.min(1420, Math.max(320, window.innerWidth - 28));
    layer.style.width = `${maxWidth}px`;
    layer.style.left = `${Math.max(14, window.scrollX + (window.innerWidth - maxWidth) / 2)}px`;
    layer.style.top = `${window.scrollY + rect.top}px`;
    const height = Math.max(layer.scrollHeight + 24, 780);
    originalRoot.style.setProperty('min-height', `${height}px`, 'important');
  }

  function decorate() {
    ensureStyles();
    const originalRoot = findJourneyRoot();
    let layer = document.getElementById(LAYER_ID);

    if (!originalRoot) {
      if (layer) layer.remove();
      return;
    }

    originalRoot.dataset.journeyDashboardOriginal = 'true';
    if (!layer) {
      layer = document.createElement('div');
      layer.id = LAYER_ID;
      document.body.appendChild(layer);
      wireLayer(layer);
    }

    layer.innerHTML = renderDashboard(originalRoot);
    positionLayer(layer, originalRoot);
  }

  function start() {
    decorate();
    setInterval(decorate, 850);
    window.addEventListener('resize', decorate);
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
