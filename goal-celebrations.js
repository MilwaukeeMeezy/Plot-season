// Plot & Season — Garden Journey goal celebrations and rewards
(function () {
  'use strict';

  const STORAGE_KEY = 'plotandseason-goal-celebrations-v1';
  const GOALS = [
    {
      id: 'water5',
      icon: '🌱',
      title: 'Learn Your Plants',
      desc: 'Water 5 individual plants by hand.',
      stat: 'plantsWatered', target: 5,
      reward: { type: 'seeds', plantId: 'lettuce', amount: 4, label: '4 lettuce seeds' }
    },
    {
      id: 'harvest3',
      icon: '🥕',
      title: 'From Soil to Basket',
      desc: 'Bring 3 crops successfully to harvest.',
      stat: 'harvests', target: 3,
      reward: { type: 'cash', amount: 8, label: '$8 for the garden fund' }
    },
    {
      id: 'compost1',
      icon: '♻️',
      title: 'Waste Nothing',
      desc: 'Start your first compost batch.',
      stat: 'compostStarted', target: 1,
      reward: { type: 'compost', amount: 1, label: '1 bag of finished compost' }
    },
    {
      id: 'water25',
      icon: '💧',
      title: 'Learn the Watering Rhythm',
      desc: 'Water 25 plants by hand.',
      stat: 'plantsWatered', target: 25,
      reward: { type: 'seeds', plantId: 'carrot', amount: 4, label: '4 carrot seeds' }
    },
    {
      id: 'harvest10',
      icon: '🌿',
      title: 'Season Grower',
      desc: 'Complete 10 successful harvests.',
      stat: 'harvests', target: 10,
      reward: { type: 'compost', amount: 2, label: '2 bags of finished compost' }
    },
    {
      id: 'harvest25',
      icon: '🌻',
      title: 'Garden Steward',
      desc: 'Complete 25 successful harvests.',
      stat: 'harvests', target: 25,
      reward: { type: 'cash', amount: 15, label: '$15 garden stewardship bonus' }
    }
  ];

  function blankState() {
    return { completed: {}, journalExpanded: false };
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return blankState();
      const parsed = JSON.parse(raw);
      return {
        ...blankState(),
        ...parsed,
        completed: parsed && parsed.completed && typeof parsed.completed === 'object' ? parsed.completed : {}
      };
    } catch (e) {
      return blankState();
    }
  }

  let state = loadState();
  let latestGoals = { harvests: 0, compostStarted: 0, plantsWatered: 0 };
  let baselineReady = false;
  let baselineScheduled = false;
  let celebrationQueue = [];
  let celebrationShowing = false;
  let numeric300Seen = 0;

  const refs = {
    cash: null,
    inventory: null,
    log: null
  };

  function saveState() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { }
  }

  function isGoalState(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value) &&
      Object.prototype.hasOwnProperty.call(value, 'harvests') &&
      Object.prototype.hasOwnProperty.call(value, 'compostStarted') &&
      Object.prototype.hasOwnProperty.call(value, 'plantsWatered');
  }

  function isInventoryState(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value) &&
      value.seeds && value.livePlants && value.soils &&
      typeof value.seeds === 'object' && typeof value.soils === 'object';
  }

  function normalizeGoals(value) {
    return {
      harvests: Math.max(0, Number(value && value.harvests || 0)),
      compostStarted: Math.max(0, Number(value && value.compostStarted || 0)),
      plantsWatered: Math.max(0, Number(value && value.plantsWatered || 0))
    };
  }

  function gameIsRunning() {
    return Array.from(document.querySelectorAll('button')).some((button) =>
      button.textContent && button.textContent.includes('Garden Journey')
    );
  }

  function goalIsComplete(goal, goals) {
    return Number(goals[goal.stat] || 0) >= goal.target;
  }

  function rewardLabel(goal) {
    return goal.reward && goal.reward.label ? goal.reward.label : 'Journal stamp';
  }

  function addGardenLog(message) {
    if (!refs.log) return false;
    try {
      refs.log((prev) => [message, ...(Array.isArray(prev) ? prev : [])].slice(0, 6));
      return true;
    } catch (e) {
      return false;
    }
  }

  function grantReward(goal) {
    const reward = goal.reward || { type: 'none' };
    try {
      if (reward.type === 'cash') {
        if (!refs.cash) return false;
        refs.cash((value) => Number(value || 0) + Number(reward.amount || 0));
        return true;
      }

      if (reward.type === 'seeds') {
        if (!refs.inventory) return false;
        refs.inventory((inv) => ({
          ...inv,
          seeds: {
            ...(inv && inv.seeds ? inv.seeds : {}),
            [reward.plantId]: Number(inv && inv.seeds && inv.seeds[reward.plantId] || 0) + Number(reward.amount || 0)
          }
        }));
        return true;
      }

      if (reward.type === 'compost') {
        if (!refs.inventory) return false;
        refs.inventory((inv) => ({
          ...inv,
          soils: {
            ...(inv && inv.soils ? inv.soils : {}),
            compost: Number(inv && inv.soils && inv.soils.compost || 0) + Number(reward.amount || 0)
          }
        }));
        return true;
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  function tryGrantPendingReward(goal, attempt) {
    const entry = state.completed[goal.id];
    if (!entry || entry.rewardGranted) return;
    if (grantReward(goal)) {
      state.completed[goal.id] = { ...entry, rewardGranted: true };
      saveState();
      return;
    }
    if ((attempt || 0) < 12) {
      setTimeout(() => tryGrantPendingReward(goal, (attempt || 0) + 1), 250);
    }
  }

  function playCelebrationSound() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const notes = [523.25, 659.25, 783.99];
      const start = ctx.currentTime;
      notes.forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.055, start + index * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.1 + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start + index * 0.1);
        osc.stop(start + index * 0.1 + 0.26);
      });
      setTimeout(() => { try { ctx.close(); } catch (e) { } }, 900);
    } catch (e) { }
  }

  function ensureStyles() {
    if (document.getElementById('goal-celebration-styles')) return;
    const style = document.createElement('style');
    style.id = 'goal-celebration-styles';
    style.textContent = `
      @keyframes goal-celebration-pop {
        0% { opacity: 0; transform: translate(-50%, -14px) scale(.92); }
        55% { opacity: 1; transform: translate(-50%, 5px) scale(1.025); }
        100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
      }
      @keyframes goal-celebration-spark {
        0% { opacity: 0; transform: translateY(7px) scale(.7) rotate(0deg); }
        30% { opacity: 1; }
        100% { opacity: 0; transform: translateY(-42px) scale(1.15) rotate(24deg); }
      }
      #goal-celebration-card { animation: goal-celebration-pop .42s ease-out both; }
      #goal-celebration-card .goal-spark { animation: goal-celebration-spark 1.5s ease-out infinite; }
      #goal-journal-stamps button:hover { transform: translateY(-1px); }
    `;
    document.head.appendChild(style);
  }

  function showNextCelebration() {
    if (celebrationShowing || !celebrationQueue.length || !document.body) return;
    celebrationShowing = true;
    const goal = celebrationQueue.shift();
    ensureStyles();

    const old = document.getElementById('goal-celebration-card');
    if (old) old.remove();

    const card = document.createElement('div');
    card.id = 'goal-celebration-card';
    card.setAttribute('role', 'status');
    card.setAttribute('aria-live', 'polite');
    Object.assign(card.style, {
      position: 'fixed',
      left: '50%',
      top: '92px',
      transform: 'translateX(-50%)',
      width: 'min(430px, calc(100vw - 28px))',
      zIndex: '500',
      background: '#FFFDF6',
      border: '2px solid #7A5B32',
      borderRadius: '14px',
      boxShadow: '0 14px 32px rgba(47, 35, 24, .28)',
      padding: '16px 18px 15px',
      color: '#3D2B1F',
      textAlign: 'left',
      cursor: 'pointer',
      overflow: 'hidden',
      fontFamily: 'inherit'
    });

    const sparks = ['✨', '🌱', '✨', '🍃', '✨'].map((spark, index) =>
      `<span class="goal-spark" style="position:absolute;left:${8 + index * 21}%;bottom:1px;font-size:${12 + (index % 2) * 3}px;animation-delay:${index * .13}s">${spark}</span>`
    ).join('');

    card.innerHTML = `
      ${sparks}
      <div style="position:relative;z-index:1">
        <div style="font-size:10px;font-weight:900;letter-spacing:1.4px;text-transform:uppercase;color:#7A5B32">✨ Goal Complete</div>
        <div style="display:flex;gap:10px;align-items:center;margin-top:5px">
          <div style="font-size:30px;line-height:1">${goal.icon}</div>
          <div>
            <div style="font-size:19px;font-weight:900;line-height:1.15">${goal.title}</div>
            <div style="font-size:11px;color:#6B5844;margin-top:3px">${goal.desc}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <div style="background:#EAF3DF;border:1px solid #AEC08F;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:800">🎁 ${rewardLabel(goal)}</div>
          <div style="background:#F7F2E7;border:1px solid #D6C5A6;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:800">📔 Journal stamped</div>
        </div>
        <div style="font-size:9px;color:#8A7560;margin-top:9px">Click to dismiss</div>
      </div>
    `;

    document.body.appendChild(card);
    playCelebrationSound();

    let done = false;
    const dismiss = () => {
      if (done) return;
      done = true;
      card.style.transition = 'opacity .2s ease, transform .2s ease';
      card.style.opacity = '0';
      card.style.transform = 'translate(-50%, -8px)';
      setTimeout(() => {
        if (card.parentElement) card.remove();
        celebrationShowing = false;
        showNextCelebration();
      }, 220);
    };
    card.addEventListener('click', dismiss, { once: true });
    setTimeout(dismiss, 5000);
  }

  function queueCelebration(goal) {
    celebrationQueue.push(goal);
    showNextCelebration();
  }

  function completeGoal(goal) {
    if (state.completed[goal.id]) return;
    state.completed[goal.id] = {
      completedAt: Date.now(),
      rewardGranted: false,
      rewardLabel: rewardLabel(goal)
    };
    saveState();

    tryGrantPendingReward(goal, 0);
    addGardenLog(`✨ Goal complete — ${goal.icon} ${goal.title}. Reward: ${rewardLabel(goal)}. 📔 Journal stamped.`);
    queueCelebration(goal);
    renderJournalStamps();
  }

  function processGoals(goals) {
    if (!baselineReady) return;
    GOALS.forEach((goal) => {
      if (goalIsComplete(goal, goals) && !state.completed[goal.id]) completeGoal(goal);
    });
  }

  function observeGoals(value) {
    latestGoals = normalizeGoals(value);
    setTimeout(() => processGoals(latestGoals), 0);
  }

  function establishBaseline() {
    if (!gameIsRunning()) {
      baselineScheduled = false;
      return;
    }

    // Completed stamps are tied to the current game's counters. If a different/new game
    // has lower counters, old stamps are removed instead of suppressing its goals.
    const kept = {};
    GOALS.forEach((goal) => {
      if (goalIsComplete(goal, latestGoals)) {
        const existing = state.completed[goal.id];
        kept[goal.id] = existing || {
          completedAt: Date.now(),
          rewardGranted: true,
          rewardLabel: rewardLabel(goal),
          imported: true
        };
      }
    });
    state.completed = kept;
    baselineReady = true;
    saveState();

    GOALS.forEach((goal) => tryGrantPendingReward(goal, 0));
    renderJournalStamps();
  }

  function journalRoot() {
    const candidates = Array.from(document.querySelectorAll('div'));
    const heading = candidates.find((el) => el.textContent && el.textContent.trim() === '📔 Garden Journal');
    return heading ? heading.parentElement : null;
  }

  function renderJournalStamps() {
    if (!document.body) return;
    let shelf = document.getElementById('goal-journal-stamps');
    const root = journalRoot();
    const completedGoals = GOALS.filter((goal) => !!state.completed[goal.id]);

    if (!root || !completedGoals.length) {
      if (shelf) shelf.style.display = 'none';
      return;
    }

    if (!shelf) {
      shelf = document.createElement('div');
      shelf.id = 'goal-journal-stamps';
      document.body.appendChild(shelf);
      shelf.addEventListener('click', () => {
        state.journalExpanded = !state.journalExpanded;
        saveState();
        renderJournalStamps();
      });
    }

    const rect = root.getBoundingClientRect();
    const width = state.journalExpanded ? Math.min(330, Math.max(230, rect.width - 24)) : 154;
    Object.assign(shelf.style, {
      display: 'block',
      position: 'absolute',
      top: `${window.scrollY + rect.top + 8}px`,
      left: `${Math.max(8, window.scrollX + rect.right - width - 10)}px`,
      width: `${width}px`,
      zIndex: '120',
      background: '#FFF8DF',
      border: '1.5px solid #C9B98F',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(61,43,31,.12)',
      padding: state.journalExpanded ? '10px' : '7px 9px',
      color: '#3D2B1F',
      fontFamily: 'inherit',
      cursor: 'pointer'
    });

    if (state.journalExpanded) {
      shelf.innerHTML = `
        <div style="font-size:10px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;color:#7A5B32">📔 Goal Stamps</div>
        <div style="font-size:9px;color:#7A6B58;margin-top:2px">Proof of the gardening skills you practiced.</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">
          ${completedGoals.map((goal) => `<div style="background:#FFFDF6;border:1px solid #D6C5A6;border-radius:8px;padding:7px"><div style="font-size:18px">${goal.icon} ✓</div><div style="font-size:9px;font-weight:900;line-height:1.25;margin-top:2px">${goal.title}</div></div>`).join('')}
        </div>
        <div style="font-size:8px;color:#8A7560;margin-top:7px">Click to collapse</div>
      `;
    } else {
      shelf.innerHTML = `
        <button type="button" style="all:unset;display:block;width:100%;cursor:pointer">
          <div style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.7px;color:#7A5B32">📔 Goal Stamps</div>
          <div style="display:flex;gap:3px;align-items:center;margin-top:3px;font-size:14px;white-space:nowrap;overflow:hidden">${completedGoals.slice(-5).map((goal) => `<span title="${goal.title}">${goal.icon}</span>`).join('')}<span style="font-size:9px;font-weight:900;margin-left:2px">${completedGoals.length}</span></div>
        </button>
      `;
    }
  }

  if (window.React && window.React.useState && !window.React.__plotSeasonGoalCelebrations) {
    const originalUseState = window.React.useState;
    window.React.useState = function goalAwareUseState(initialValue) {
      const pair = originalUseState(initialValue);
      const value = pair[0];
      const originalSetter = pair[1];

      if (isGoalState(value) || isGoalState(initialValue)) latestGoals = normalizeGoals(value);
      if (!refs.inventory && (isInventoryState(value) || isInventoryState(initialValue))) refs.inventory = originalSetter;
      if (!refs.log && Array.isArray(initialValue) && initialValue.length === 1 && initialValue[0] === 'Welcome to the garden.') refs.log = originalSetter;
      if (!refs.cash && typeof initialValue === 'number' && initialValue === 300) {
        numeric300Seen += 1;
        if (numeric300Seen === 2) refs.cash = originalSetter;
      }

      return [value, function goalAwareSetter(nextValue) {
        if (isGoalState(value) || isGoalState(initialValue)) {
          originalSetter(function (prev) {
            const next = typeof nextValue === 'function' ? nextValue(prev) : nextValue;
            observeGoals(next);
            return next;
          });
        } else {
          originalSetter(nextValue);
        }
      }];
    };
    window.React.__plotSeasonGoalCelebrations = true;
  }

  function tick() {
    if (!baselineReady && !baselineScheduled && gameIsRunning()) {
      baselineScheduled = true;
      setTimeout(establishBaseline, 1000);
    }
    renderJournalStamps();
  }

  function start() {
    ensureStyles();
    setInterval(tick, 700);
    tick();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
