// Plot & Season — reactive challenge goals
(function () {
  'use strict';

  const STORAGE_KEY = 'plotandseason-challenge-goals-v1';
  const CHALLENGES = {
    heatwave: {
      id: 'heatwave', icon: '🔥', title: 'Heat Wave', subtitle: 'Protect your garden',
      trigger: 'Appears when a heat wave hits.',
      objective: 'During the heat wave, water 3 living plants or apply Shade Cloth.'
    },
    pest: {
      id: 'pest', icon: '🔎', title: 'Pest Patrol', subtitle: 'Identify and control a pest',
      trigger: 'Appears when a pest infestation is detected.',
      objective: 'Inspect the infestation in Pest Patrol and clear the pest using the existing control system.'
    },
    rescue: {
      id: 'rescue', icon: '🩹', title: 'Rescue Mission', subtitle: 'Restore a stressed plant',
      trigger: 'Appears when a living plant falls to 60% health or lower.',
      objective: 'Restore that same plant to at least 75% health without losing it.'
    }
  };

  function blankState() {
    return {
      completed: {},
      active: { heatwave: false, pest: false, rescue: false },
      heatWateredKeys: [],
      heatAttempts: 0,
      rescueTargetKey: null,
      rescueTargetName: null,
      rescueStartingHealth: null
    };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!parsed) return blankState();
      return {
        ...blankState(),
        ...parsed,
        completed: parsed.completed && typeof parsed.completed === 'object' ? parsed.completed : {},
        active: { ...blankState().active, ...(parsed.active || {}) },
        heatWateredKeys: Array.isArray(parsed.heatWateredKeys) ? parsed.heatWateredKeys : []
      };
    } catch (e) {
      return blankState();
    }
  }

  let state = loadState();
  let heatwaveActiveNow = false;
  let pestVisibleNow = false;
  let stressedPlants = new Map();
  const refs = { log: null };

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { }
  }

  function gameIsRunning() {
    return Array.from(document.querySelectorAll('button')).some((button) =>
      button.textContent && button.textContent.includes('Garden Journey')
    );
  }

  function addLog(message) {
    if (!refs.log) return;
    try { refs.log((prev) => [message, ...(Array.isArray(prev) ? prev : [])].slice(0, 6)); } catch (e) { }
  }

  function isLogState(value) {
    return Array.isArray(value) && value.length === 1 && value[0] === 'Welcome to the garden.';
  }

  function isPlant(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value) &&
      typeof value.health === 'number' && typeof value.name === 'string' &&
      (typeof value.id === 'string' || typeof value.id === 'number') &&
      ('dead' in value || 'harvested' in value || 'wateredToday' in value || 'age' in value);
  }

  function collectPlants(root) {
    const found = new Map();
    const seen = new WeakSet();

    function walk(value, context, depth) {
      if (!value || depth > 7) return;
      if (typeof value !== 'object') return;
      if (seen.has(value)) return;
      seen.add(value);

      if (isPlant(value)) {
        const coords = value.gx != null ? `g:${value.gx},${value.gy}` : value.sx != null ? `s:${value.sx},${value.sy}` : 'plant';
        const key = `${context}|${value.id}|${coords}`;
        found.set(key, value);
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => walk(item, context, depth + 1));
        return;
      }

      let nextContext = context;
      if (value.id != null && (Array.isArray(value.plants) || value.plant || Array.isArray(value.hydroponics))) {
        nextContext = `${context}/${value.id}`;
      }
      Object.keys(value).forEach((key) => walk(value[key], `${nextContext}/${key}`, depth + 1));
    }

    walk(root, 'root', 0);
    return found;
  }

  function countPlacedShadeCloth(root) {
    let count = 0;
    const seen = new WeakSet();
    function walk(value, depth) {
      if (!value || depth > 6 || typeof value !== 'object') return;
      if (seen.has(value)) return;
      seen.add(value);
      if (!Array.isArray(value) && value.mulchId === 'shadecloth') count += 1;
      if (Array.isArray(value)) value.forEach((item) => walk(item, depth + 1));
      else Object.keys(value).forEach((key) => walk(value[key], depth + 1));
    }
    walk(root, 0);
    return count;
  }

  function observeCurrentPlants(value) {
    if (!Array.isArray(value)) return;
    const plants = collectPlants(value);
    plants.forEach((plant, key) => {
      if (!plant.dead && !plant.harvested && plant.health > 0 && plant.health <= 60) {
        stressedPlants.set(key, { name: plant.name, health: plant.health });
      } else if (plant.dead || plant.harvested || plant.health >= 75) {
        stressedPlants.delete(key);
      }
    });
  }

  function startChallenge(id, detail) {
    if (state.completed[id] || state.active[id]) return;
    state.active[id] = true;
    if (id === 'heatwave') {
      state.heatAttempts += 1;
      state.heatWateredKeys = [];
    }
    if (id === 'rescue' && detail) {
      state.rescueTargetKey = detail.key;
      state.rescueTargetName = detail.name;
      state.rescueStartingHealth = Math.round(detail.health);
    }
    saveState();

    const c = CHALLENGES[id];
    if (id === 'heatwave') addLog('🌦️ Challenge started — Heat Wave: protect 3 plants by watering them during the heat event, or apply Shade Cloth.');
    if (id === 'pest') addLog('🌦️ Challenge started — Pest Patrol: inspect the infestation, identify the pest, and clear it using the existing control system.');
    if (id === 'rescue') addLog(`🌦️ Challenge started — Rescue Mission: ${detail.name} is stressed at ${Math.round(detail.health)}%. Restore it to at least 75% health.`);
    showChallengeNotice(c, 'started');
    renderChallengePanel();
  }

  function completeChallenge(id, detail) {
    if (state.completed[id]) return;
    const c = CHALLENGES[id];
    state.completed[id] = { completedAt: Date.now(), detail: detail || '' };
    state.active[id] = false;
    if (id === 'heatwave') state.heatWateredKeys = [];
    if (id === 'rescue') {
      state.rescueTargetKey = null;
      state.rescueTargetName = null;
      state.rescueStartingHealth = null;
    }
    saveState();
    addLog(`🏆 Challenge complete — ${c.icon} ${c.title}: ${c.subtitle}. 📔 Challenge badge earned.`);
    showChallengeNotice(c, 'completed', detail);
    renderChallengePanel();
    renderChallengeBadges();
  }

  function inspectTransition(prev, next) {
    if (Array.isArray(next)) observeCurrentPlants(next);
    if (!Array.isArray(prev) && !Array.isArray(next)) return;

    const prevPlants = collectPlants(prev);
    const nextPlants = collectPlants(next);

    nextPlants.forEach((plant, key) => {
      const before = prevPlants.get(key);

      if (!state.completed.rescue && !plant.dead && !plant.harvested && plant.health > 0 && plant.health <= 60) {
        stressedPlants.set(key, { name: plant.name, health: plant.health });
      }

      if (state.active.rescue && state.rescueTargetKey === key) {
        if (plant.dead || plant.harvested || plant.health <= 0) {
          state.active.rescue = false;
          state.rescueTargetKey = null;
          state.rescueTargetName = null;
          state.rescueStartingHealth = null;
          saveState();
          addLog('🩹 Rescue Mission paused — that plant was lost. The challenge will return when another plant becomes stressed.');
        } else if (plant.health >= 75) {
          completeChallenge('rescue', `${plant.name} recovered to ${Math.round(plant.health)}% health.`);
        }
      }

      if (heatwaveActiveNow && state.active.heatwave && before && !plant.dead && !plant.harvested && before.wateredToday === false && plant.wateredToday === true) {
        const watered = new Set(state.heatWateredKeys || []);
        watered.add(key);
        state.heatWateredKeys = Array.from(watered);
        saveState();
        if (state.heatWateredKeys.length >= 3) {
          completeChallenge('heatwave', 'Protected 3 living plants with timely watering during the heat wave.');
        }
      }
    });

    if (heatwaveActiveNow && state.active.heatwave && countPlacedShadeCloth(next) > countPlacedShadeCloth(prev)) {
      completeChallenge('heatwave', 'Applied Shade Cloth during the heat wave.');
    }
  }

  function inspectLog(next) {
    if (!Array.isArray(next) || state.completed.pest) return;
    const hit = next.find((line) => typeof line === 'string' && /Pest Patrol cleared/i.test(line));
    if (hit) completeChallenge('pest', 'Identified and cleared an active pest infestation.');
  }

  function detectHeatwave() {
    return Array.from(document.querySelectorAll('div,span')).some((el) => {
      const text = (el.textContent || '').trim();
      return text === '🔥 Heat Wave' || text === '🔥 Heat Wave!';
    });
  }

  function detectPestAlert() {
    return Array.from(document.querySelectorAll('button')).some((button) =>
      /Inspect Garden/i.test(button.textContent || '')
    );
  }

  function playSound(kind) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const notes = kind === 'completed' ? [523.25, 659.25, 783.99] : [440, 554.37];
      const start = ctx.currentTime;
      notes.forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start + index * .11);
        gain.gain.exponentialRampToValueAtTime(.045, start + index * .11 + .02);
        gain.gain.exponentialRampToValueAtTime(.0001, start + index * .11 + .22);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(start + index * .11); osc.stop(start + index * .11 + .24);
      });
      setTimeout(() => { try { ctx.close(); } catch (e) { } }, 800);
    } catch (e) { }
  }

  function showChallengeNotice(challenge, kind, detail) {
    if (!document.body) return;
    const old = document.getElementById('reactive-challenge-notice');
    if (old) old.remove();
    const card = document.createElement('div');
    card.id = 'reactive-challenge-notice';
    Object.assign(card.style, {
      position: 'fixed', left: '50%', top: '94px', transform: 'translateX(-50%)', zIndex: '520',
      width: 'min(440px, calc(100vw - 28px))', padding: '13px 16px', borderRadius: '12px',
      border: kind === 'completed' ? '2px solid #5C7A4F' : '2px solid #A46A2A',
      background: '#FFFDF6', color: '#3D2B1F', boxShadow: '0 12px 28px rgba(47,35,24,.24)',
      fontFamily: 'inherit', cursor: 'pointer'
    });
    card.innerHTML = `
      <div style="font-size:9px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:${kind === 'completed' ? '#5C7A4F' : '#A46A2A'}">${kind === 'completed' ? '🏆 Challenge Complete' : '🌦️ New Challenge'}</div>
      <div style="font-size:18px;font-weight:900;margin-top:3px">${challenge.icon} ${challenge.title} — ${challenge.subtitle}</div>
      <div style="font-size:11px;color:#6B5844;margin-top:4px">${kind === 'completed' ? (detail || 'Challenge complete.') : challenge.objective}</div>
      ${kind === 'completed' ? '<div style="font-size:10px;font-weight:800;margin-top:7px;color:#5C7A4F">📔 Challenge badge earned</div>' : ''}
    `;
    document.body.appendChild(card);
    playSound(kind);
    const dismiss = () => { if (card.parentElement) card.remove(); };
    card.addEventListener('click', dismiss, { once: true });
    setTimeout(dismiss, kind === 'completed' ? 5200 : 6200);
  }

  function journeyRoot() {
    const heading = Array.from(document.querySelectorAll('div')).find((el) =>
      el.textContent && el.textContent.trim() === '🏆 Your Garden Journey'
    );
    return heading ? heading.parentElement : null;
  }

  function challengeStatus(id) {
    if (state.completed[id]) return { label: 'COMPLETE', bg: '#E8F1DF', border: '#9CAF88', color: '#49633E' };
    if (state.active[id]) return { label: 'ACTIVE', bg: '#FFF1D7', border: '#D8A35D', color: '#8A5522' };
    return { label: 'REACTIVE', bg: '#F7F2E7', border: '#D6C5A6', color: '#786653' };
  }

  function challengeProgress(id) {
    if (state.completed[id]) return 'Completed ✓';
    if (id === 'heatwave') {
      if (state.active.heatwave) return `${Math.min((state.heatWateredKeys || []).length, 3)}/3 plants watered — or apply Shade Cloth`;
      return state.heatAttempts ? 'Waiting for the next heat wave' : CHALLENGES[id].trigger;
    }
    if (id === 'pest') return state.active.pest ? 'Open Pest Patrol and clear the infestation' : CHALLENGES[id].trigger;
    if (id === 'rescue') {
      if (state.active.rescue) return `${state.rescueTargetName || 'Stressed plant'}: restore to 75%+ health`;
      return CHALLENGES[id].trigger;
    }
    return '';
  }

  function renderChallengePanel() {
    const root = journeyRoot();
    let panel = document.getElementById('reactive-challenge-panel');
    if (!root) {
      if (panel) panel.remove();
      return;
    }
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'reactive-challenge-panel';
      const heading = Array.from(root.children).find((el) => el.textContent && el.textContent.trim() === '🏆 Your Garden Journey');
      if (heading && heading.nextSibling) root.insertBefore(panel, heading.nextSibling.nextSibling || null);
      else root.insertBefore(panel, root.firstChild);
    }
    Object.assign(panel.style, {
      margin: '0 0 14px', padding: '13px', background: '#F9F5E9', border: '1.5px solid #C9B98F',
      borderRadius: '8px', color: '#3D2B1F'
    });

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
        <div><div style="font-size:15px;font-weight:900">🌦️ Reactive Challenges</div><div style="font-size:10px;color:#6B5844;margin-top:2px">These goals appear when the garden gives you a real problem to solve.</div></div>
        <div style="font-size:10px;font-weight:800;color:#6B5844">${Object.keys(state.completed).length}/3 completed</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px">
        ${Object.values(CHALLENGES).map((c) => {
          const s = challengeStatus(c.id);
          return `<div style="padding:10px;border:1px solid ${s.border};border-radius:8px;background:${s.bg}">
            <div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start"><div style="font-size:22px">${c.icon}</div><div style="font-size:8px;font-weight:900;letter-spacing:.7px;color:${s.color}">${s.label}</div></div>
            <div style="font-size:11px;font-weight:900;margin-top:3px">${c.title}</div>
            <div style="font-size:9px;color:#6B5844;margin-top:1px">${c.subtitle}</div>
            <div style="font-size:9px;line-height:1.4;margin-top:7px;color:#4A3728">${challengeProgress(c.id)}</div>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  function journalRoot() {
    const heading = Array.from(document.querySelectorAll('div')).find((el) =>
      el.textContent && el.textContent.trim() === '📔 Garden Journal'
    );
    return heading ? heading.parentElement : null;
  }

  function renderChallengeBadges() {
    const root = journalRoot();
    let badges = document.getElementById('challenge-journal-badges');
    const earned = Object.values(CHALLENGES).filter((c) => !!state.completed[c.id]);
    if (!root || !earned.length) {
      if (badges) badges.remove();
      return;
    }
    if (!badges) {
      badges = document.createElement('div');
      badges.id = 'challenge-journal-badges';
      const heading = Array.from(root.children).find((el) => el.textContent && el.textContent.trim() === '📔 Garden Journal');
      if (heading && heading.nextSibling) root.insertBefore(badges, heading.nextSibling);
      else root.appendChild(badges);
    }
    Object.assign(badges.style, {
      margin: '7px 0 10px', padding: '8px 10px', border: '1px dashed #C49A55', borderRadius: '8px',
      background: '#FFF8DF', color: '#4A3728'
    });
    badges.innerHTML = `<div style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.8px">🌦️ Challenge Badges</div><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:5px">${earned.map((c) => `<span title="${c.title}: ${c.subtitle}" style="font-size:11px;font-weight:800;background:#FFFDF6;border:1px solid #D6C5A6;border-radius:999px;padding:4px 7px">${c.icon} ${c.title} ✓</span>`).join('')}</div>`;
  }

  if (window.React && window.React.useState && !window.React.__plotSeasonChallengeGoals) {
    const originalUseState = window.React.useState;
    window.React.useState = function challengeAwareUseState(initialValue) {
      const pair = originalUseState(initialValue);
      const value = pair[0];
      const originalSetter = pair[1];

      if (!refs.log && isLogState(initialValue)) refs.log = originalSetter;
      if (Array.isArray(value)) observeCurrentPlants(value);

      return [value, function challengeAwareSetter(nextValue) {
        originalSetter(function (prev) {
          const next = typeof nextValue === 'function' ? nextValue(prev) : nextValue;
          inspectTransition(prev, next);
          if (Array.isArray(next)) inspectLog(next);
          return next;
        });
      }];
    };
    window.React.__plotSeasonChallengeGoals = true;
  }

  function tick() {
    if (!gameIsRunning()) return;

    const heat = detectHeatwave();
    if (heat && !heatwaveActiveNow && !state.completed.heatwave) startChallenge('heatwave');
    if (!heat && heatwaveActiveNow && state.active.heatwave && !state.completed.heatwave) {
      state.active.heatwave = false;
      state.heatWateredKeys = [];
      saveState();
      addLog('🔥 Heat Wave challenge paused — the event ended. It will return during the next heat wave.');
    }
    heatwaveActiveNow = heat;

    const pest = detectPestAlert();
    if (pest && !pestVisibleNow && !state.completed.pest) startChallenge('pest');
    if (!pest && pestVisibleNow && state.active.pest && !state.completed.pest) {
      state.active.pest = false;
      saveState();
    }
    pestVisibleNow = pest;

    if (!state.completed.rescue && !state.active.rescue && stressedPlants.size) {
      const first = stressedPlants.entries().next().value;
      if (first) startChallenge('rescue', { key: first[0], name: first[1].name, health: first[1].health });
    }

    renderChallengePanel();
    renderChallengeBadges();
  }

  function start() {
    tick();
    setInterval(tick, 650);
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
