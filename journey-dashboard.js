// Plot & Season — Garden Journey dashboard presentation
(function () {
  'use strict';

  const STYLE_ID = 'plot-season-journey-dashboard-styles';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      [data-journey-dashboard="true"] {
        display: grid !important;
        grid-template-columns: minmax(0, 1.5fr) minmax(310px, .82fr) !important;
        gap: 14px !important;
        align-items: start !important;
        max-width: 1180px !important;
        padding: 20px !important;
        margin: 0 auto !important;
        background: transparent !important;
        box-sizing: border-box !important;
      }

      [data-journey-dashboard="true"] > [data-journey-section] {
        min-width: 0;
        margin: 0 !important;
        border-radius: 14px !important;
        box-shadow: 0 10px 24px rgba(55, 47, 35, .12) !important;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        box-sizing: border-box !important;
      }

      [data-journey-dashboard="true"] > [data-journey-section="hero"] {
        grid-column: 1 / -1;
        padding: 18px 22px 8px !important;
        margin-bottom: -14px !important;
        color: #fff !important;
        font-family: Georgia, 'Times New Roman', serif !important;
        font-size: 27px !important;
        font-weight: 900 !important;
        border: 1px solid rgba(255,255,255,.25) !important;
        border-bottom: 0 !important;
        border-radius: 16px 16px 0 0 !important;
        background: linear-gradient(125deg, rgba(62,103,53,.97), rgba(88,137,73,.93)) !important;
        box-shadow: 0 12px 26px rgba(51, 74, 43, .20) !important;
      }

      [data-journey-dashboard="true"] > [data-journey-section="intro"] {
        grid-column: 1 / -1;
        padding: 3px 22px 17px !important;
        margin-bottom: 2px !important;
        color: #eef7e9 !important;
        font-size: 12px !important;
        line-height: 1.5 !important;
        border: 1px solid rgba(255,255,255,.25) !important;
        border-top: 0 !important;
        border-radius: 0 0 16px 16px !important;
        background: linear-gradient(125deg, rgba(62,103,53,.97), rgba(88,137,73,.93)) !important;
        box-shadow: 0 12px 26px rgba(51, 74, 43, .20) !important;
      }

      [data-journey-dashboard="true"] > [data-journey-section="rank"] {
        grid-column: 2;
        background: rgba(239, 248, 232, .96) !important;
        border: 1.5px solid rgba(118, 153, 94, .48) !important;
      }

      [data-journey-dashboard="true"] > [data-journey-section="learning"] {
        grid-column: 1;
        background: rgba(255, 253, 246, .96) !important;
        border: 1.5px solid rgba(178, 151, 96, .38) !important;
      }

      [data-journey-dashboard="true"] > [data-journey-section="active"] {
        grid-column: 1;
        background: rgba(255, 246, 210, .96) !important;
        border: 1.5px solid rgba(207, 162, 64, .42) !important;
      }

      [data-journey-dashboard="true"] > [data-journey-section="challenges"] {
        grid-column: 2;
        background: rgba(232, 246, 246, .96) !important;
        border: 1.5px solid rgba(76, 137, 137, .42) !important;
      }

      [data-journey-dashboard="true"] > [data-journey-section="milestones"] {
        grid-column: 1;
        background: rgba(239, 247, 233, .95) !important;
        border: 1.5px solid rgba(105, 147, 79, .35) !important;
        padding: 11px !important;
      }

      [data-journey-dashboard="true"] > [data-journey-section="journal"] {
        grid-column: 2;
        background: rgba(245, 249, 250, .97) !important;
        border: 1.5px solid rgba(91, 133, 154, .34) !important;
        position: sticky !important;
        top: 14px !important;
      }

      [data-journey-dashboard="true"] [data-dashboard-accent="green"] {
        border-top: 5px solid #668b55 !important;
      }
      [data-journey-dashboard="true"] [data-dashboard-accent="gold"] {
        border-top: 5px solid #c6953d !important;
      }
      [data-journey-dashboard="true"] [data-dashboard-accent="blue"] {
        border-top: 5px solid #568a97 !important;
      }

      [data-journey-dashboard="true"] > [data-journey-section="learning"] > div:first-child,
      [data-journey-dashboard="true"] > [data-journey-section="active"] > div:first-child,
      [data-journey-dashboard="true"] > [data-journey-section="journal"] > div:first-child {
        color: #314b32 !important;
      }

      @media (max-width: 1050px) {
        [data-journey-dashboard="true"] {
          grid-template-columns: 1fr !important;
          padding: 14px !important;
        }
        [data-journey-dashboard="true"] > [data-journey-section] {
          grid-column: 1 !important;
          position: relative !important;
          top: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function findJourneyRoot() {
    const heading = Array.from(document.querySelectorAll('div')).find((el) =>
      (el.textContent || '').trim() === '🏆 Your Garden Journey'
    );
    return heading ? heading.parentElement : null;
  }

  function sectionFor(child) {
    if (!child || child.nodeType !== 1) return null;
    if (child.id === 'gardener-rank-panel') return 'rank';
    if (child.id === 'reactive-challenge-panel') return 'challenges';

    const text = (child.textContent || '').replace(/\s+/g, ' ').trim();
    if (text === '🏆 Your Garden Journey') return 'hero';
    if (text.startsWith('Learn by doing. Finish active goals')) return 'intro';
    if (text.includes('🌻 Beginner Learning Path')) return 'learning';
    if (text.includes('🎯 Active Goals')) return 'active';
    if (text.includes('📔 Garden Journal')) return 'journal';

    const milestoneHits = [
      'Learn Your Plants',
      'From Soil to Basket',
      'Waste Nothing',
      'Learn the Watering Rhythm',
      'Season Grower',
      'Garden Steward'
    ].filter((label) => text.includes(label)).length;
    if (milestoneHits >= 3) return 'milestones';
    return null;
  }

  function decorate() {
    ensureStyles();
    const root = findJourneyRoot();
    if (!root) return;
    root.dataset.journeyDashboard = 'true';

    Array.from(root.children).forEach((child) => {
      const section = sectionFor(child);
      if (!section) return;
      child.dataset.journeySection = section;
      if (section === 'learning' || section === 'rank' || section === 'milestones') child.dataset.dashboardAccent = 'green';
      if (section === 'active') child.dataset.dashboardAccent = 'gold';
      if (section === 'challenges' || section === 'journal') child.dataset.dashboardAccent = 'blue';
    });
  }

  function start() {
    decorate();
    setInterval(decorate, 350);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
