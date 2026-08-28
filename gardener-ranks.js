// Plot & Season — gardener rank progression
(function () {
  'use strict';

  const STORAGE_KEY = 'plotandseason-gardener-ranks-v1';

  function blankState() {
    return {
      gardenGoals: { harvests: 0, compostStarted: 0, plantsWatered: 0 },
      planted: false,
      currentSeason: null,
      currentSeasonHarvests: [],
      seasonHistory: [],
      lastRankId: 'seed-starter'
    };
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return blankState();
      const saved = JSON.parse(raw);
      return {
        ...blankState(),
        ...saved,
        gardenGoals: { ...blankState().gardenGoals, ...(saved.gardenGoals || {}) },
        currentSeasonHarvests: Array.isArray(saved.currentSeasonHarvests) ? saved.currentSeasonHarvests : [],
        seasonHistory: Array.isArray(saved.seasonHistory) ? saved.seasonHistory : []
      };
    } catch (e) {
      return blankState();
    }
  }

  let state = loadState();

  function saveState() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { }
  }

  function qualifyingSeasonCount(minHealth) {
    return state.seasonHistory.filter((s) =>
      s && s.harvestCount > 0 && Number(s.minimumHealth) >= minHealth
    ).length;
  }

  const RANKS = [
    {
      id: 'seed-starter', icon: '🌱', name: 'Seed Starter',
      description: 'You are learning how to establish and care for your first crops.',
      qualifies: () => true,
      requirements: () => ['Begin gardening and learn the basic care cycle.']
    },
    {
      id: 'grower', icon: '🪴', name: 'Grower',
      description: 'You can establish crops, water them, and bring food to harvest.',
      qualifies: () => state.planted && state.gardenGoals.plantsWatered >= 5 && state.gardenGoals.harvests >= 3,
      requirements: () => [
        `${state.planted ? '✓' : '○'} Plant at least one crop`,
        `${state.gardenGoals.plantsWatered >= 5 ? '✓' : '○'} Water 5 plants by hand (${Math.min(state.gardenGoals.plantsWatered, 5)}/5)`,
        `${state.gardenGoals.harvests >= 3 ? '✓' : '○'} Complete 3 harvests (${Math.min(state.gardenGoals.harvests, 3)}/3)`
      ]
    },
    {
      id: 'hobbyist-cultivator', icon: '🌿', name: 'Hobbyist / Cultivator',
      description: 'You have completed a full successful growing season and can maintain a healthy crop cycle.',
      qualifies: () => qualifyingSeasonCount(60) >= 1,
      requirements: () => [
        `${qualifyingSeasonCount(60) >= 1 ? '✓' : '○'} Complete 1 successful growing season (${Math.min(qualifyingSeasonCount(60), 1)}/1)`,
        'Every harvested crop in that qualifying season must be at least 60% health.'
      ]
    },
    {
      id: 'gardener', icon: '🌻', name: 'Gardener',
      description: 'You have repeated healthy gardening across multiple growing seasons.',
      qualifies: () => qualifyingSeasonCount(70) >= 2,
      requirements: () => [
        `${qualifyingSeasonCount(70) >= 2 ? '✓' : '○'} Complete 2 successful growing seasons (${Math.min(qualifyingSeasonCount(70), 2)}/2)`,
        'Every harvested crop in each qualifying season must be at least 70% health.'
      ]
    },
    {
      id: 'master-gardener', icon: '🏅', name: 'Master Gardener',
      description: 'You have demonstrated sustained, high-quality gardening over three full growing seasons.',
      qualifies: () => qualifyingSeasonCount(80) >= 3,
      requirements: () => [
        `${qualifyingSeasonCount(80) >= 3 ? '✓' : '○'} Complete 3 successful growing seasons (${Math.min(qualifyingSeasonCount(80), 3)}/3)`,
        'Every harvested crop in each qualifying season must be at least 80% health.'
      ]
    }
  ];

  function currentRankInfo() {
    let currentIndex = 0;
    for (let i = 0; i < RANKS.length; i += 1) {
      if (RANKS[i].qualifies()) currentIndex = i;
      else break;
    }
    return {
      current: RANKS[currentIndex],
      next: RANKS[currentIndex + 1] || null,
      currentIndex
    };
  }

  function detectSeason() {
    if (!document.body) return null;
    const text = document.body.innerText || '';
    const match = text.match(/\b(Spring|Summer|Fall|Winter)\b\s*[•·-]\s*Day\s+\d+\/20/i);
    return match ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : null;
  }

  function finalizeSeason(name) {
    const harvests = state.currentSeasonHarvests || [];
    if (!harvests.length) {
      state.seasonHistory.push({
        id: `${Date.now()}-${name}`,
        season: name,
        harvestCount: 0,
        minimumHealth: null
      });
    } else {
      state.seasonHistory.push({
        id: `${Date.now()}-${name}`,
        season: name,
        harvestCount: harvests.length,
        minimumHealth: Math.min(...harvests.map((h) => Number(h.health) || 0))
      });
    }
    state.seasonHistory = state.seasonHistory.slice(-24);
  }

  function syncSeason() {
    const season = detectSeason();
    if (!season) return;
    if (!state.currentSeason) {
      state.currentSeason = season;
      saveState();
      return;
    }
    if (state.currentSeason !== season) {
      finalizeSeason(state.currentSeason);
      state.currentSeason = season;
      state.currentSeasonHarvests = [];
      saveState();
    }
  }

  function recordHarvest(item) {
    syncSeason();
    const health = Math.max(0, Math.min(100, Number(item && item.health != null ? item.health : 100)));
    state.currentSeasonHarvests.push({
      id: item.id,
      plantId: item.plantId,
      health
    });
    saveState();
  }

  function looksLikeBasket(value) {
    return Array.isArray(value) && value.some((x) =>
      x && typeof x === 'object' && 'plantId' in x && 'health' in x && 'daysIn' in x
    );
  }

  function inspectState(prev, next) {
    if (next && typeof next === 'object' && !Array.isArray(next)) {
      if ('harvests' in next && 'compostStarted' in next && 'plantsWatered' in next) {
        state.gardenGoals = {
          harvests: Number(next.harvests || 0),
          compostStarted: Number(next.compostStarted || 0),
          plantsWatered: Number(next.plantsWatered || 0)
        };
        saveState();
      }
      const keys = Object.keys(next);
      if (keys.some((k) => k.startsWith('planted-'))) {
        state.planted = true;
        saveState();
      }
    }

    if (looksLikeBasket(next)) {
      const beforeIds = new Set((Array.isArray(prev) ? prev : []).map((x) => x && x.id));
      next.forEach((item) => {
        if (item && !beforeIds.has(item.id)) recordHarvest(item);
      });
    }
  }

  if (window.React && window.React.useState && !window.React.__plotSeasonGardenerRanks) {
    const originalUseState = window.React.useState;
    window.React.useState = function rankAwareUseState(initialValue) {
      const pair = originalUseState(initialValue);
      const originalSetter = pair[1];
      return [pair[0], function rankAwareSetter(nextValue) {
        if (typeof nextValue === 'function') {
          originalSetter(function (prev) {
            const next = nextValue(prev);
            inspectState(prev, next);
            return next;
          });
        } else {
          originalSetter(function (prev) {
            inspectState(prev, nextValue);
            return nextValue;
          });
        }
      }];
    };
    window.React.__plotSeasonGardenerRanks = true;
  }

  function showRankToast(rank) {
    const existing = document.getElementById('gardener-rank-toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'gardener-rank-toast';
    el.textContent = `${rank.icon} New Gardener Rank: ${rank.name}`;
    Object.assign(el.style, {
      position: 'fixed', top: '82px', left: '50%', transform: 'translateX(-50%)', zIndex: '300',
      background: '#F7F2E7', border: '2px solid #4A3728', borderRadius: '8px', padding: '12px 18px',
      color: '#3D2B1F', fontWeight: '900', boxShadow: '4px 4px 0 #4A3728'
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }

  function journeyRoot() {
    const headings = Array.from(document.querySelectorAll('div'));
    const heading = headings.find((el) => el.textContent && el.textContent.trim() === '🏆 Your Garden Journey');
    return heading ? heading.parentElement : null;
  }

  function gameIsRunning() {
    const text = document.body ? document.body.innerText || '' : '';
    return /Plant Nursery/.test(text) && /Yard/.test(text) && /Garden Journey/.test(text);
  }

  function nextRankProgress(info) {
    if (!info.next) return 'Highest rank achieved';
    if (info.next.id === 'grower') {
      const planted = state.planted ? 1 : 0;
      const water = Math.min(state.gardenGoals.plantsWatered, 5) / 5;
      const harvest = Math.min(state.gardenGoals.harvests, 3) / 3;
      return `${Math.round(((planted + water + harvest) / 3) * 100)}% to Grower`;
    }
    if (info.next.id === 'hobbyist-cultivator') return `${Math.min(qualifyingSeasonCount(60), 1)}/1 season at 60%+`;
    if (info.next.id === 'gardener') return `${Math.min(qualifyingSeasonCount(70), 2)}/2 seasons at 70%+`;
    if (info.next.id === 'master-gardener') return `${Math.min(qualifyingSeasonCount(80), 3)}/3 seasons at 80%+`;
    return `Next: ${info.next.name}`;
  }

  function renderAlwaysVisibleBadge() {
    let badge = document.getElementById('gardener-rank-badge');
    if (!gameIsRunning()) {
      if (badge) badge.remove();
      return;
    }

    const info = currentRankInfo();
    if (!badge) {
      badge = document.createElement('button');
      badge.id = 'gardener-rank-badge';
      badge.type = 'button';
      badge.title = 'Open Garden Journey to view the full gardener rank ladder';
      badge.setAttribute('aria-label', 'Gardener rank progress');
      Object.assign(badge.style, {
        position: 'fixed',
        top: '10px',
        right: '12px',
        zIndex: '180',
        minWidth: '172px',
        padding: '7px 10px',
        border: '2px solid #4A3728',
        borderRadius: '8px',
        background: '#FFFDF6',
        color: '#3D2B1F',
        boxShadow: '2px 2px 0 #4A3728',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit'
      });
      badge.addEventListener('click', function () {
        const buttons = Array.from(document.querySelectorAll('button'));
        const journey = buttons.find((button) => button.textContent && button.textContent.includes('Garden Journey'));
        if (journey) journey.click();
      });
      document.body.appendChild(badge);
    }

    badge.innerHTML = `
      <div style="font-size:9px;font-weight:900;letter-spacing:.7px;text-transform:uppercase;color:#6b5844">Gardener Rank</div>
      <div style="font-size:13px;font-weight:900;margin-top:1px">${info.current.icon} ${info.current.name}</div>
      <div style="font-size:9px;color:#6b5844;margin-top:2px">${nextRankProgress(info)}</div>
    `;
  }

  function renderRankPanel() {
    syncSeason();
    const info = currentRankInfo();

    if (state.lastRankId !== info.current.id) {
      state.lastRankId = info.current.id;
      saveState();
      if (document.body) showRankToast(info.current);
    }

    renderAlwaysVisibleBadge();

    const root = journeyRoot();
    if (!root) return;

    let panel = document.getElementById('gardener-rank-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'gardener-rank-panel';
      Object.assign(panel.style, {
        margin: '0 0 14px', padding: '14px', background: '#FFFDF6', border: '1.5px solid #C9B98F',
        borderRadius: '8px', color: '#3D2B1F'
      });
      const children = Array.from(root.children);
      const heading = children.find((el) => el.textContent && el.textContent.trim() === '🏆 Your Garden Journey');
      if (heading && heading.nextSibling) root.insertBefore(panel, heading.nextSibling);
      else root.insertBefore(panel, root.firstChild);
    }

    const ladder = RANKS.map((rank, index) => {
      const earned = index <= info.currentIndex;
      return `<div style="flex:1;min-width:120px;padding:8px;border:1px solid #C9B98F;border-radius:7px;background:${earned ? '#E8F1DF' : '#F7F2E7'};opacity:${earned ? '1' : '.62'}"><div style="font-size:20px">${earned ? rank.icon : '🔒'}</div><div style="font-size:11px;font-weight:900">${rank.name}</div></div>`;
    }).join('');

    const requirements = info.next
      ? info.next.requirements().map((text) => `<div style="font-size:11px;line-height:1.55">${text}</div>`).join('')
      : '<div style="font-size:11px;color:#5C7A4F;font-weight:900">Highest rank achieved.</div>';

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div>
          <div style="font-size:10px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;color:#6b5844">Gardener Rank</div>
          <div style="font-size:22px;font-weight:900;margin-top:2px">${info.current.icon} ${info.current.name}</div>
          <div style="font-size:11px;color:#6b5844;margin-top:3px">${info.current.description}</div>
        </div>
        <div style="font-size:10px;line-height:1.5;background:#FFF8DF;border-radius:7px;padding:8px 10px">
          <b>Season standards</b><br>
          Hobbyist/Cultivator: 1 season ≥60%<br>
          Gardener: 2 seasons ≥70%<br>
          Master Gardener: 3 seasons ≥80%
        </div>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px">${ladder}</div>
      ${info.next ? `<div style="margin-top:12px;padding-top:10px;border-top:1px solid #D6C5A6"><div style="font-size:12px;font-weight:900;margin-bottom:5px">Next: ${info.next.icon} ${info.next.name}</div>${requirements}</div>` : ''}
    `;
  }

  window.addEventListener('DOMContentLoaded', function () {
    renderRankPanel();
    setInterval(renderRankPanel, 1200);
  });
})();
