import React, { useState, useEffect, useRef, useCallback } from 'react';

// ---------- DATA ----------

const BED_MATERIAL = { id: 'wood', name: 'Wood Raised Bed', costPerSqFt: 3, insulation: 0 };
const WOOD_BUNDLES = [
  { id: 'wood-10', sqFt: 10, cost: 30 },
  { id: 'wood-25', sqFt: 25, cost: 70 },
  { id: 'wood-50', sqFt: 50, cost: 135 },
];
const ALUMINUM_BUNDLES = [
  { id: 'alum-10', sqFt: 10, cost: 45 },
  { id: 'alum-25', sqFt: 25, cost: 105 },
  { id: 'alum-50', sqFt: 50, cost: 200 },
];

// Watering tools — can be bought/removed anytime.
// Can = simple owned count, click-to-water. Spigot = a fixture placed once. PVC = bought in feet, run pipe-to-pipe.
const WATER_TOOLS = [
  { id: 'can', name: 'Watering Can', icon: '🫗', cost: 5, coverage: 'square', desc: 'Waters one square per click. Cheap, but slow for a big garden.' },
];
const SPIGOT = { id: 'spigot', name: 'Water Spigot', icon: '🚰', cost: 40, desc: 'An outdoor spigot fixture. Place it once, then touch it to turn the water on or off.' };
const PVC_BUNDLES = [
  { id: 'pvc-10', feet: 10, cost: 3 },
  { id: 'pvc-50', feet: 50, cost: 13 },
];
const RAIN_BARREL = { id: 'barrel', name: 'Rain Barrel (50gal)', icon: '🛢️', cost: 25, capacity: 50, refillPerDay: 4 };

// Light sources required for the Heat/Light Germination stage. Higher successBonus = better odds/speed.
const LIGHT_SOURCES = [
  { id: 'growlight', name: 'Grow Light', icon: '💡', desc: 'Best light. Highest, most consistent germination success.', successMult: 1.15, speedMult: 0.85 },
  { id: 'sunlight', name: 'Direct Sunlight', icon: '☀️', desc: 'A sunny spot outdoors or in a bright window. High to moderate success.', successMult: 1.0, speedMult: 1.0 },
  { id: 'windowlight', name: 'Window / Indirect Light', icon: '🪟', desc: 'Indoor ambient light. Moderate to low success — inconsistent with weather.', successMult: 0.8, speedMult: 1.2 },
];

// Growth stage thresholds as % of a plant's total maturity time, matching real growth: seed -> seedling -> baby -> ready -> oversized -> dying.
const GROWTH_STAGES = [
  { id: 'seed', label: 'Seed', icon: '🌰', min: 0, max: 0.1 },
  { id: 'seedling', label: 'Seedling', icon: '🌱', min: 0.1, max: 0.3 },
  { id: 'baby', label: 'Baby Plant', icon: '🌿', min: 0.3, max: 0.7 },
  { id: 'ready', label: 'Ready to Transplant', icon: '🪴', min: 0.7, max: 1.0 },
  { id: 'oversized', label: 'Oversized — Transplant Soon!', icon: '⚠️', min: 1.0, max: 1.25 },
  { id: 'dying', label: 'Dying — Overdue!', icon: '💀', min: 1.25, max: Infinity },
];
function growthStageFor(ageInDays, totalDaysNeeded) {
  const pct = totalDaysNeeded > 0 ? ageInDays / totalDaysNeeded : 0;
  return GROWTH_STAGES.find((s) => pct >= s.min && pct < s.max) || GROWTH_STAGES[GROWTH_STAGES.length - 1];
}

const ADDITIVES = [
  { id: 'vermiculite', name: 'Vermiculite', icon: '🟤', cost: 5, desc: 'Improves water retention in soil mixes.' },
  { id: 'perlite', name: 'Perlite', icon: '⚪', cost: 5, desc: 'Improves drainage and aeration in soil mixes.' },
  { id: 'coir', name: 'Coconut Coir', icon: '🥥', cost: 4, desc: 'A renewable peat-moss alternative for moisture retention.' },
];
const PLANT_LIGHT = { id: 'light', name: 'Grow Light', icon: '💡', cost: 35, desc: 'Supplemental light for indoor trays. Helps seedlings that need more sun than a windowsill gives.' };
const PLANT_FOOD = { id: 'food', name: 'Plant Food', icon: '🧪', cost: 8, desc: 'General-purpose fertilizer. A boost for hungry, heavy-feeding plants.' };

const BASE_NURSERY_DAYS = 12;

const PLANTS = [
  { id: 'lettuce', name: 'Lettuce', emoji: '🥬', seedCost: 3, plantCost: 9, daysToMature: 6, minTemp: 'cool', sellValue: 9, waterNeed: 'med', soilPref: 'starting', perSqFt: 4, stratDays: 0 },
  { id: 'carrot', name: 'Carrot', emoji: '🥕', seedCost: 2, plantCost: 6, daysToMature: 10, minTemp: 'cool', sellValue: 8, waterNeed: 'low', soilPref: 'garden', perSqFt: 16, stratDays: 0 },
  { id: 'tomato', name: 'Tomato', emoji: '🍅', seedCost: 5, plantCost: 15, daysToMature: 14, minTemp: 'warm', sellValue: 18, waterNeed: 'high', soilPref: 'starting', perSqFt: 1, stratDays: 0 },
  { id: 'pepper', name: 'Bell Pepper', emoji: '🫑', seedCost: 5, plantCost: 15, daysToMature: 15, minTemp: 'warm', sellValue: 16, waterNeed: 'med', soilPref: 'starting', perSqFt: 1, stratDays: 0 },
  { id: 'kale', name: 'Kale', emoji: '🥬', seedCost: 3, plantCost: 9, daysToMature: 8, minTemp: 'cold', sellValue: 10, waterNeed: 'low', soilPref: 'potting', perSqFt: 1, stratDays: 0 },
  { id: 'squash', name: 'Squash', emoji: '🎃', seedCost: 4, plantCost: 12, daysToMature: 12, minTemp: 'warm', sellValue: 14, waterNeed: 'high', soilPref: 'potting', perSqFt: 1, stratDays: 0 },
  { id: 'garlic', name: 'Garlic', emoji: '🧄', seedCost: 2, plantCost: 6, daysToMature: 16, minTemp: 'cold', sellValue: 12, waterNeed: 'low', soilPref: 'garden', perSqFt: 9, stratDays: 0 },
  { id: 'bean', name: 'Bush Bean', emoji: '🫘', seedCost: 3, plantCost: 9, daysToMature: 9, minTemp: 'warm', sellValue: 11, waterNeed: 'med', soilPref: 'potting', perSqFt: 9, stratDays: 0 },
  { id: 'lavender', name: 'Lavender', emoji: '💜', seedCost: 4, plantCost: 14, daysToMature: 18, minTemp: 'cool', sellValue: 15, waterNeed: 'low', soilPref: 'starting', perSqFt: 1, stratDays: 30 },
  { id: 'milkweed', name: 'Milkweed', emoji: '🦋', seedCost: 3, plantCost: 10, daysToMature: 12, minTemp: 'cool', sellValue: 10, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 30 },
  { id: 'oregano', name: 'Oregano', emoji: '🌿', seedCost: 3, plantCost: 9, daysToMature: 10, minTemp: 'cool', sellValue: 9, waterNeed: 'low', soilPref: 'potting', perSqFt: 4, stratDays: 21 },
  { id: 'sage', name: 'Sage', emoji: '🌱', seedCost: 3, plantCost: 9, daysToMature: 11, minTemp: 'cool', sellValue: 10, waterNeed: 'low', soilPref: 'potting', perSqFt: 1, stratDays: 21 },
];

const ZONES = [
  { id: 3, name: 'Zone 3', tempProfile: 'cold', label: 'Very Cold (-40 to -30°F)' },
  { id: 5, name: 'Zone 5', tempProfile: 'cool', label: 'Cold (-20 to -10°F)' },
  { id: 7, name: 'Zone 7', tempProfile: 'warm', label: 'Mild (0 to 10°F)' },
  { id: 9, name: 'Zone 9', tempProfile: 'warm', label: 'Warm (20 to 30°F)' },
];

const SOILS = [
  { id: 'starting', name: 'Seed-Starting Mix', cost: 6, desc: 'Light, sterile, fine-textured. Best odds and speed for most seedlings.', speedMult: 1, baseSuccess: 0.95 },
  { id: 'potting', name: 'Potting Soil', cost: 4, desc: 'Richer and heavier. Fine for many seedlings, a bit slower to germinate.', speedMult: 1.25, baseSuccess: 0.85 },
  { id: 'garden', name: 'Garden Soil', cost: 2, desc: 'Dense, can compact. Cheapest, but riskiest for starting tender seeds.', speedMult: 1.6, baseSuccess: 0.65 },
];

const TRAY_SIZES = [
  { id: 'starter', slots: 4, cost: 6 },
  { id: 'small', slots: 12, cost: 14 },
  { id: 'medium', slots: 32, cost: 28 },
  { id: 'large', slots: 72, cost: 50 },
];

const METHOD_OPTIONS = [
  { id: 'beds', label: 'Build Garden Beds', desc: 'Construct raised beds to plant in.', icon: '🪵' },
  { id: 'indoor', label: 'Start Seeds Indoor', desc: 'Germinate seeds in trays before transplanting.', icon: '🪴' },
  { id: 'nursery', label: 'Buy from Plant Nursery', desc: 'Shop for soil, live plants, and seed packets.', icon: '🏬' },
  { id: 'sow', label: 'Direct Sow', desc: 'Plant seeds or live plants straight into the ground or a bed.', icon: '🌱' },
];

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];
const DAYS_PER_SEASON = 20;
const STARTING_CASH_DEFAULT = 300;
const MAX_BUDGET = 1000;
const GRID_COLS = 12;
const GRID_ROWS = 8;
const CELL_PX = 40;
const MIN_DAY_SECONDS = 2;
const MAX_DAY_SECONDS = 30;
const DEFAULT_DAY_SECONDS = 10;

function canGrowInZone(plant, zoneProfile) {
  if (plant.minTemp === 'warm') return zoneProfile === 'warm';
  if (plant.minTemp === 'cool') return zoneProfile === 'warm' || zoneProfile === 'cool';
  return true;
}
function daysToMatureFrom(plant, sourceType) {
  const offset = sourceType === 'plant' ? -8 : sourceType === 'seedling' ? -5 : 0;
  return Math.max(1, plant.daysToMature + offset);
}
function soilMatchesPlant(soilId, plant) { return soilId === plant.soilPref; }
function nurseryDaysFor(soil, light, boosted) {
  let days = BASE_NURSERY_DAYS * soil.speedMult;
  if (boosted) days *= 0.85;
  if (light) days *= light.speedMult;
  return Math.max(1, Math.round(days));
}
function germinationSuccessFor(plant, soil, light, boosted) {
  const match = soilMatchesPlant(soil.id, plant);
  let success = match ? soil.baseSuccess : Math.max(0.15, soil.baseSuccess - 0.35);
  if (boosted) success = Math.min(0.98, success + 0.08);
  if (light) success = Math.min(0.98, success * light.successMult);
  return success;
}

// ---------- MAIN ----------

export default function GardenGame() {
  const [screen, setScreen] = useState('setup');
  const [activeTab, setActiveTab] = useState(null);
  const [zone, setZone] = useState(ZONES[2]);
  const [budget, setBudget] = useState(STARTING_CASH_DEFAULT);
  const [enabledMethods, setEnabledMethods] = useState({ beds: true, indoor: false, nursery: true, sow: true });

  const [cash, setCash] = useState(STARTING_CASH_DEFAULT);
  const [day, setDay] = useState(1);
  const [seasonIdx, setSeasonIdx] = useState(0);
  const [daySeconds, setDaySeconds] = useState(DEFAULT_DAY_SECONDS);
  const [paused, setPaused] = useState(false);
  const [isPlanning, setIsPlanning] = useState(true);

  const [beds, setBeds] = useState([]);
  const bedIdRef = useRef(0);
  const [groundPlants, setGroundPlants] = useState([]);

  const [mode, setMode] = useState('build');
  const [selectedBuildMaterial, setSelectedBuildMaterial] = useState('wood'); // wood | aluminum
  const [selectedWaterTool, setSelectedWaterTool] = useState(null);
  const [barrels, setBarrels] = useState([]); // physical barrel objects on grid: {id, x, y, on}
  const barrelIdRef = useRef(0);
  const [spigots, setSpigots] = useState([]); // physical spigot objects on grid: {id, x, y, on}
  const spigotIdRef = useRef(0);
  const [pipes, setPipes] = useState([]); // PVC pipe runs only: {id, type: 'pvc', x0, y0, x1, y1}
  const pipeIdRef = useRef(0);
  const [pipeStart, setPipeStart] = useState(null); // {x, y} while placing a pipe run
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  const [selectedSource, setSelectedSource] = useState('seed');
  const [pendingTransplant, setPendingTransplant] = useState(null);

  const [trays, setTrays] = useState([]);
  const trayIdRef = useRef(0);

  const [inventory, setInventory] = useState({
    seeds: {}, livePlants: {}, soils: { starting: 0, potting: 0, garden: 0 }, emptyTrays: {},
    boostedSoils: { starting: 0, potting: 0, garden: 0 }, // soil bags mixed with vermiculite/perlite
    strattedSeeds: {}, // plantId -> count of seeds that finished cold stratification, ready to germinate
    woodSqFt: 0, aluminumSqFt: 0,
    waterTools: { can: 0 },
    pvcFeet: 0, spigots: 0,
    rainBarrels: 0, rainBarrelGallons: 0,
    additives: { vermiculite: 0, perlite: 0, coir: 0 },
    lights: 0, plantFood: 0,
  });
  const [coldStratBatches, setColdStratBatches] = useState([]); // {id, plantId, daysIn, daysNeeded, ready}
  const coldStratIdRef = useRef(0);
  const [selectedLightSource, setSelectedLightSource] = useState(null);
  const [indoorSubTab, setIndoorSubTab] = useState('table'); // soil | stratify | germinate | table
  const [openTrayId, setOpenTrayId] = useState(null);
  const [discovered, setDiscovered] = useState({});

  const [score, setScore] = useState(0);
  const [log, setLog] = useState(['Welcome to the garden.']);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);

  const tickRef = useRef(null);
  const addLog = useCallback((msg) => setLog((l) => [msg, ...l].slice(0, 6)), []);
  const markDiscovered = useCallback((key) => setDiscovered((d) => (d[key] ? d : { ...d, [key]: true })), []);

  useEffect(() => {
    if (paused || isPlanning) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(advanceDay, daySeconds * 1000);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daySeconds, paused, isPlanning, beds, trays, groundPlants]);

  function advanceDay() {
    const nextDayVal = day + 1;
    setDay(() => {
      if (nextDayVal > DAYS_PER_SEASON) { setSeasonIdx((s) => (s + 1) % SEASONS.length); return 1; }
      return nextDayVal;
    });
    const needsLog = [];
    const ageFn = (p) => {
      if (!p || p.harvested) return p;
      const health = Math.max(0, p.health - (p.wateredToday ? 0 : healthDropFor(p.waterNeed)));
      if (!p.wateredToday && health < 60 && health > 0) needsLog.push(`${p.emoji} ${p.name} needs water (health ${health}%).`);
      if (health <= 0 && p.health > 0) needsLog.push(`${p.emoji} ${p.name} died from lack of water.`);
      return { ...p, health, age: p.age + 1, wateredToday: false, dead: health <= 0 };
    };
    setBeds((prev) => prev.map((bed) => ({ ...bed, plants: bed.plants.map(ageFn) })));
    setGroundPlants((prev) => prev.map(ageFn));
    setTrays((prev) => prev.map((t) => ({ ...t, cells: t.cells.map((c) => (c && !c.ready && !c.failed ? { ...c, daysIn: c.daysIn + 1, ready: c.daysIn + 1 >= c.daysNeeded } : c)) })));
    setColdStratBatches((prev) => prev.map((b) => (b.ready ? b : { ...b, daysIn: b.daysIn + 1, ready: b.daysIn + 1 >= b.daysNeeded })));
    setInventory((inv) => {
      if (inv.rainBarrels < 1) return inv;
      const maxGallons = inv.rainBarrels * RAIN_BARREL.capacity;
      const refilled = Math.min(maxGallons, inv.rainBarrelGallons + inv.rainBarrels * RAIN_BARREL.refillPerDay);
      return { ...inv, rainBarrelGallons: refilled };
    });
    if (needsLog.length > 0) setLog((l) => [...needsLog.slice(0, 3), ...l].slice(0, 6));
  }
  function healthDropFor(need) { return need === 'high' ? 18 : need === 'med' ? 11 : 6; }

  function addSeed(plantId, n = 1) {
    setInventory((inv) => ({ ...inv, seeds: { ...inv.seeds, [plantId]: (inv.seeds[plantId] || 0) + n } }));
    markDiscovered(`seed-${plantId}`);
  }
  function removeSeed(plantId, n = 1) {
    setInventory((inv) => ({ ...inv, seeds: { ...inv.seeds, [plantId]: Math.max(0, (inv.seeds[plantId] || 0) - n) } }));
  }
  function addLivePlant(plantId, n = 1) {
    setInventory((inv) => ({ ...inv, livePlants: { ...inv.livePlants, [plantId]: (inv.livePlants[plantId] || 0) + n } }));
    markDiscovered(`plant-${plantId}`);
  }
  function removeLivePlant(plantId, n = 1) {
    setInventory((inv) => ({ ...inv, livePlants: { ...inv.livePlants, [plantId]: Math.max(0, (inv.livePlants[plantId] || 0) - n) } }));
  }
  function addSoil(soilId, n = 1) {
    setInventory((inv) => ({ ...inv, soils: { ...inv.soils, [soilId]: inv.soils[soilId] + n } }));
    markDiscovered(`soil-${soilId}`);
  }
  function removeSoilInv(soilId, n = 1) {
    setInventory((inv) => ({ ...inv, soils: { ...inv.soils, [soilId]: Math.max(0, inv.soils[soilId] - n) } }));
  }
  function addEmptyTray(sizeId, n = 1) {
    setInventory((inv) => ({ ...inv, emptyTrays: { ...inv.emptyTrays, [sizeId]: (inv.emptyTrays[sizeId] || 0) + n } }));
    markDiscovered(`tray-${sizeId}`);
  }
  function removeEmptyTray(sizeId, n = 1) {
    setInventory((inv) => ({ ...inv, emptyTrays: { ...inv.emptyTrays, [sizeId]: Math.max(0, (inv.emptyTrays[sizeId] || 0) - n) } }));
  }

  const SEEDS_PER_PACKET_MIN = 5;
  const SEEDS_PER_PACKET_MAX = 10;

  function buySeedPacket(plant) {
    if (cash < plant.seedCost) { addLog(`Not enough cash for ${plant.name} seeds ($${plant.seedCost}).`); return; }
    const yieldCount = Math.floor(Math.random() * (SEEDS_PER_PACKET_MAX - SEEDS_PER_PACKET_MIN + 1)) + SEEDS_PER_PACKET_MIN;
    setCash((c) => c - plant.seedCost);
    addSeed(plant.id, yieldCount);
    addLog(`Bought a ${plant.name} seed packet for $${plant.seedCost} — ${yieldCount} seeds inside.`);
  }
  function sellSeedPacket(plant) {
    const owned = inventory.seeds[plant.id] || 0;
    if (owned < 1) return;
    const removeCount = Math.min(owned, SEEDS_PER_PACKET_MIN);
    const refund = Math.round(plant.seedCost * (removeCount / SEEDS_PER_PACKET_MIN));
    removeSeed(plant.id, removeCount);
    setCash((c) => c + refund);
    addLog(`Returned ${removeCount} ${plant.name} seeds for $${refund}.`);
  }
  function buyLivePlant(plant) {
    if (cash < plant.plantCost) { addLog(`Not enough cash for a live ${plant.name} ($${plant.plantCost}).`); return; }
    setCash((c) => c - plant.plantCost);
    addLivePlant(plant.id, 1);
    addLog(`Bought a live ${plant.name} for $${plant.plantCost}.`);
  }
  function sellLivePlant(plant) {
    if ((inventory.livePlants[plant.id] || 0) < 1) return;
    removeLivePlant(plant.id, 1);
    setCash((c) => c + plant.plantCost);
    addLog(`Returned a live ${plant.name} for $${plant.plantCost}.`);
  }
  function buySoilBagShop(soilId) {
    const soil = SOILS.find((s) => s.id === soilId);
    if (cash < soil.cost) { addLog(`Not enough cash for ${soil.name} ($${soil.cost}).`); return; }
    setCash((c) => c - soil.cost);
    addSoil(soilId, 1);
    addLog(`Bought a bag of ${soil.name} for $${soil.cost}.`);
  }
  function sellSoilBagShop(soilId) {
    const soil = SOILS.find((s) => s.id === soilId);
    if (inventory.soils[soilId] < 1) return;
    removeSoilInv(soilId, 1);
    setCash((c) => c + soil.cost);
    addLog(`Returned a bag of ${soil.name} for $${soil.cost}.`);
  }
  function buyWoodBundle(bundleId) {
    const bundle = WOOD_BUNDLES.find((w) => w.id === bundleId);
    if (cash < bundle.cost) { addLog(`Not enough cash for ${bundle.sqFt} sq ft of wood ($${bundle.cost}).`); return; }
    setCash((c) => c - bundle.cost);
    setInventory((inv) => ({ ...inv, woodSqFt: inv.woodSqFt + bundle.sqFt }));
    markDiscovered('material-wood');
    addLog(`Bought ${bundle.sqFt} sq ft of wood for $${bundle.cost}.`);
  }
  function sellWoodBundle(bundleId) {
    const bundle = WOOD_BUNDLES.find((w) => w.id === bundleId);
    if (inventory.woodSqFt < bundle.sqFt) return;
    setInventory((inv) => ({ ...inv, woodSqFt: inv.woodSqFt - bundle.sqFt }));
    setCash((c) => c + bundle.cost);
    addLog(`Returned ${bundle.sqFt} sq ft of wood for $${bundle.cost}.`);
  }
  function buyAluminumBundle(bundleId) {
    const bundle = ALUMINUM_BUNDLES.find((w) => w.id === bundleId);
    if (cash < bundle.cost) { addLog(`Not enough cash for ${bundle.sqFt} sq ft of aluminum ($${bundle.cost}).`); return; }
    setCash((c) => c - bundle.cost);
    setInventory((inv) => ({ ...inv, aluminumSqFt: inv.aluminumSqFt + bundle.sqFt }));
    markDiscovered('material-aluminum');
    addLog(`Bought ${bundle.sqFt} sq ft of aluminum for $${bundle.cost}.`);
  }
  function sellAluminumBundle(bundleId) {
    const bundle = ALUMINUM_BUNDLES.find((w) => w.id === bundleId);
    if (inventory.aluminumSqFt < bundle.sqFt) return;
    setInventory((inv) => ({ ...inv, aluminumSqFt: inv.aluminumSqFt - bundle.sqFt }));
    setCash((c) => c + bundle.cost);
    addLog(`Returned ${bundle.sqFt} sq ft of aluminum for $${bundle.cost}.`);
  }
  function buyWaterTool(toolId) {
    const tool = WATER_TOOLS.find((t) => t.id === toolId);
    if (cash < tool.cost) { addLog(`Not enough cash for a ${tool.name} ($${tool.cost}).`); return; }
    setCash((c) => c - tool.cost);
    setInventory((inv) => ({ ...inv, waterTools: { ...inv.waterTools, [toolId]: inv.waterTools[toolId] + 1 } }));
    markDiscovered(`tool-${toolId}`);
    addLog(`Bought a ${tool.name} for $${tool.cost}.`);
  }
  function sellWaterTool(toolId) {
    const tool = WATER_TOOLS.find((t) => t.id === toolId);
    if (inventory.waterTools[toolId] < 1) return;
    setInventory((inv) => ({ ...inv, waterTools: { ...inv.waterTools, [toolId]: inv.waterTools[toolId] - 1 } }));
    setCash((c) => c + tool.cost);
    addLog(`Returned a ${tool.name} for $${tool.cost}.`);
  }
  function buySpigot() {
    if (cash < SPIGOT.cost) { addLog(`Not enough cash for a spigot ($${SPIGOT.cost}).`); return; }
    setCash((c) => c - SPIGOT.cost);
    setInventory((inv) => ({ ...inv, spigots: inv.spigots + 1 }));
    markDiscovered('tool-spigot');
    addLog(`Bought a water spigot for $${SPIGOT.cost}.`);
  }
  function sellSpigot() {
    if (inventory.spigots < 1) return;
    setInventory((inv) => ({ ...inv, spigots: inv.spigots - 1 }));
    setCash((c) => c + SPIGOT.cost);
    addLog(`Returned a water spigot for $${SPIGOT.cost}.`);
  }
  function buyPvcBundle(bundleId) {
    const bundle = PVC_BUNDLES.find((p) => p.id === bundleId);
    if (cash < bundle.cost) { addLog(`Not enough cash for ${bundle.feet}ft of PVC ($${bundle.cost}).`); return; }
    setCash((c) => c - bundle.cost);
    setInventory((inv) => ({ ...inv, pvcFeet: inv.pvcFeet + bundle.feet }));
    markDiscovered('tool-pvc');
    addLog(`Bought ${bundle.feet}ft of PVC pipe for $${bundle.cost}.`);
  }
  function sellPvcBundle(bundleId) {
    const bundle = PVC_BUNDLES.find((p) => p.id === bundleId);
    if (inventory.pvcFeet < bundle.feet) return;
    setInventory((inv) => ({ ...inv, pvcFeet: inv.pvcFeet - bundle.feet }));
    setCash((c) => c + bundle.cost);
    addLog(`Returned ${bundle.feet}ft of PVC pipe for $${bundle.cost}.`);
  }
  function buyRainBarrel() {
    if (cash < RAIN_BARREL.cost) { addLog(`Not enough cash for a rain barrel ($${RAIN_BARREL.cost}).`); return; }
    setCash((c) => c - RAIN_BARREL.cost);
    setInventory((inv) => ({ ...inv, rainBarrels: inv.rainBarrels + 1, rainBarrelGallons: inv.rainBarrelGallons + RAIN_BARREL.capacity }));
    markDiscovered('material-barrel');
    addLog(`Bought a rain barrel for $${RAIN_BARREL.cost}, filled with ${RAIN_BARREL.capacity} gallons.`);
  }
  function sellRainBarrel() {
    if (inventory.rainBarrels < 1) return;
    setInventory((inv) => ({ ...inv, rainBarrels: inv.rainBarrels - 1, rainBarrelGallons: Math.max(0, inv.rainBarrelGallons - RAIN_BARREL.capacity) }));
    setCash((c) => c + RAIN_BARREL.cost);
    addLog(`Returned a rain barrel for $${RAIN_BARREL.cost}.`);
  }
  function buyAdditive(id) {
    const a = ADDITIVES.find((x) => x.id === id);
    if (cash < a.cost) { addLog(`Not enough cash for ${a.name} ($${a.cost}).`); return; }
    setCash((c) => c - a.cost);
    setInventory((inv) => ({ ...inv, additives: { ...inv.additives, [id]: inv.additives[id] + 1 } }));
    markDiscovered(`additive-${id}`);
    addLog(`Bought a bag of ${a.name} for $${a.cost}.`);
  }
  function sellAdditive(id) {
    const a = ADDITIVES.find((x) => x.id === id);
    if (inventory.additives[id] < 1) return;
    setInventory((inv) => ({ ...inv, additives: { ...inv.additives, [id]: inv.additives[id] - 1 } }));
    setCash((c) => c + a.cost);
    addLog(`Returned a bag of ${a.name} for $${a.cost}.`);
  }
  function buyLight() {
    if (cash < PLANT_LIGHT.cost) { addLog(`Not enough cash for a grow light ($${PLANT_LIGHT.cost}).`); return; }
    setCash((c) => c - PLANT_LIGHT.cost);
    setInventory((inv) => ({ ...inv, lights: inv.lights + 1 }));
    markDiscovered('material-light');
    addLog(`Bought a grow light for $${PLANT_LIGHT.cost}.`);
  }
  function sellLight() {
    if (inventory.lights < 1) return;
    setInventory((inv) => ({ ...inv, lights: inv.lights - 1 }));
    setCash((c) => c + PLANT_LIGHT.cost);
    addLog(`Returned a grow light for $${PLANT_LIGHT.cost}.`);
  }
  function buyPlantFood() {
    if (cash < PLANT_FOOD.cost) { addLog(`Not enough cash for plant food ($${PLANT_FOOD.cost}).`); return; }
    setCash((c) => c - PLANT_FOOD.cost);
    setInventory((inv) => ({ ...inv, plantFood: inv.plantFood + 1 }));
    markDiscovered('material-food');
    addLog(`Bought a bottle of plant food for $${PLANT_FOOD.cost}.`);
  }
  function sellPlantFood() {
    if (inventory.plantFood < 1) return;
    setInventory((inv) => ({ ...inv, plantFood: inv.plantFood - 1 }));
    setCash((c) => c + PLANT_FOOD.cost);
    addLog(`Returned a bottle of plant food for $${PLANT_FOOD.cost}.`);
  }
  function buyTrayShop(sizeId) {
    const size = TRAY_SIZES.find((t) => t.id === sizeId);
    if (cash < size.cost) { addLog(`Not enough cash for that tray ($${size.cost}).`); return; }
    setCash((c) => c - size.cost);
    addEmptyTray(sizeId, 1);
    addLog(`Bought a ${size.slots}-cell tray for $${size.cost}.`);
  }
  function sellTrayShop(sizeId) {
    const size = TRAY_SIZES.find((t) => t.id === sizeId);
    if ((inventory.emptyTrays[sizeId] || 0) < 1) return;
    removeEmptyTray(sizeId, 1);
    setCash((c) => c + size.cost);
    addLog(`Returned a ${size.slots}-cell tray for $${size.cost}.`);
  }

  function cellOccupied(x, y) {
    return beds.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) || barrels.some((br) => br.x === x && br.y === y) || spigots.some((sp) => sp.x === x && sp.y === y);
  }
  function rectFree(x0, y0, x1, y1) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) if (cellOccupied(x, y)) return false;
    return true;
  }
  function pipeLength(x0, y0, x1, y1) {
    return Math.round(Math.hypot(x1 - x0, y1 - y0)) || 1;
  }
  function handleGridMouseDown(x, y) {
    if (mode !== 'build') return;
    if (selectedBuildMaterial === 'barrel') {
      if (cellOccupied(x, y)) { addLog('Something is already there.'); return; }
      if (inventory.rainBarrels < 1) { addLog('No rain barrels in inventory — buy one at the Plant Nursery.'); return; }
      setInventory((inv) => ({ ...inv, rainBarrels: inv.rainBarrels - 1 }));
      barrelIdRef.current += 1;
      setBarrels((prev) => [...prev, { id: barrelIdRef.current, x, y, on: false }]);
      addLog('Placed a rain barrel. Touch it to turn the water on or off.');
      return;
    }
    if (selectedBuildMaterial === 'spigot') {
      if (cellOccupied(x, y)) { addLog('Something is already there.'); return; }
      if (inventory.spigots < 1) { addLog('No spigots in inventory — buy one at the Plant Nursery.'); return; }
      setInventory((inv) => ({ ...inv, spigots: inv.spigots - 1 }));
      spigotIdRef.current += 1;
      setSpigots((prev) => [...prev, { id: spigotIdRef.current, x, y, on: false }]);
      addLog('Placed a water spigot. Touch it to turn the water on or off.');
      return;
    }
    if (selectedBuildMaterial === 'pvc') {
      if (!pipeStart) {
        setPipeStart({ x, y });
        addLog('Pipe start set — click an endpoint to finish the run.');
        return;
      }
      const length = pipeLength(pipeStart.x, pipeStart.y, x, y);
      const feetNeeded = length * 10; // grid squares are ~10ft apart for pipe runs
      if ((inventory.pvcFeet || 0) < feetNeeded) {
        addLog(`Not enough PVC pipe — need ${feetNeeded}ft, have ${inventory.pvcFeet || 0}ft. Buy more at the Plant Nursery.`);
        setPipeStart(null);
        return;
      }
      setInventory((inv) => ({ ...inv, pvcFeet: inv.pvcFeet - feetNeeded }));
      pipeIdRef.current += 1;
      setPipes((prev) => [...prev, { id: pipeIdRef.current, type: 'pvc', x0: pipeStart.x, y0: pipeStart.y, x1: x, y1: y }]);
      addLog(`Laid ${feetNeeded}ft of PVC pipe (schedule 40).`);
      setPipeStart(null);
      return;
    }
    setDragStart({ x, y }); setDragCurrent({ x, y });
  }
  function handleGridMouseEnter(x, y) { if (mode === 'build' && dragStart && selectedBuildMaterial !== 'barrel' && selectedBuildMaterial !== 'spigot' && selectedBuildMaterial !== 'pvc') setDragCurrent({ x, y }); }
  function handleGridMouseUp() {
    if (mode !== 'build' || selectedBuildMaterial === 'barrel' || selectedBuildMaterial === 'spigot' || selectedBuildMaterial === 'pvc' || !dragStart || !dragCurrent) { setDragStart(null); setDragCurrent(null); return; }
    const x0 = Math.min(dragStart.x, dragCurrent.x), x1 = Math.max(dragStart.x, dragCurrent.x);
    const y0 = Math.min(dragStart.y, dragCurrent.y), y1 = Math.max(dragStart.y, dragCurrent.y);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    setDragStart(null); setDragCurrent(null);
    if (!rectFree(x0, y0, x1, y1)) { addLog('That footprint overlaps something already there.'); return; }
    const sqFtNeeded = w * h;
    const stockKey = selectedBuildMaterial === 'aluminum' ? 'aluminumSqFt' : 'woodSqFt';
    const stockLabel = selectedBuildMaterial === 'aluminum' ? 'aluminum' : 'wood';
    if (inventory[stockKey] < sqFtNeeded) {
      addLog(`Not enough ${stockLabel} — need ${sqFtNeeded} sq ft, have ${inventory[stockKey]}. Buy more at the Plant Nursery.`);
      return;
    }
    setInventory((inv) => ({ ...inv, [stockKey]: inv[stockKey] - sqFtNeeded }));
    bedIdRef.current += 1;
    setBeds((prev) => [...prev, { id: bedIdRef.current, x: x0, y: y0, w, h, material: selectedBuildMaterial, plants: [] }]);
    addLog(`Built a ${w}'×${h}' ${stockLabel} bed using ${sqFtNeeded} sq ft of ${stockLabel}.`);
  }
  function deleteBed(bedId) {
    setBeds((prev) => prev.filter((b) => b.id !== bedId));
    addLog('Removed the bed. (No material refund.)');
  }
  function deleteBarrel(barrelId) {
    setBarrels((prev) => prev.filter((b) => b.id !== barrelId));
    setInventory((inv) => ({ ...inv, rainBarrels: inv.rainBarrels + 1 }));
    addLog('Picked up the rain barrel — back in inventory.');
  }
  function toggleBarrel(barrelId) {
    setBarrels((prev) => prev.map((b) => {
      if (b.id !== barrelId) return b;
      const nowOn = !b.on;
      addLog(nowOn ? 'Rain barrel water turned on.' : 'Rain barrel water turned off.');
      return { ...b, on: nowOn };
    }));
  }
  function deleteSpigot(spigotId) {
    setSpigots((prev) => prev.filter((s) => s.id !== spigotId));
    setInventory((inv) => ({ ...inv, spigots: inv.spigots + 1 }));
    addLog('Picked up the spigot — back in inventory.');
  }
  function toggleSpigot(spigotId) {
    setSpigots((prev) => prev.map((s) => {
      if (s.id !== spigotId) return s;
      const nowOn = !s.on;
      addLog(nowOn ? 'Spigot turned on.' : 'Spigot turned off.');
      return { ...s, on: nowOn };
    }));
  }
  function deletePipe(pipeId) {
    const pipe = pipes.find((p) => p.id === pipeId);
    if (!pipe) return;
    const length = pipeLength(pipe.x0, pipe.y0, pipe.x1, pipe.y1);
    const feet = length * 10;
    setPipes((prev) => prev.filter((p) => p.id !== pipeId));
    setInventory((inv) => ({ ...inv, pvcFeet: inv.pvcFeet + feet }));
    addLog(`Picked up ${feet}ft of PVC pipe — back in inventory to reuse.`);
  }
  function pointsTouch(x0, y0, x1, y1) {
    return x0 === x1 && y0 === y1;
  }
  function pvcIsConnected(pipe) {
    const endpoints = [{ x: pipe.x0, y: pipe.y0 }, { x: pipe.x1, y: pipe.y1 }];
    const touchesBarrel = endpoints.some((e) => barrels.some((b) => pointsTouch(e.x, e.y, b.x, b.y)));
    const touchesSpigot = endpoints.some((e) => spigots.some((s) => pointsTouch(e.x, e.y, s.x, s.y)));
    return touchesBarrel || touchesSpigot;
  }

  const selectedPlant = PLANTS.find((p) => p.id === selectedPlantId) || null;

  function canUseSource(plant, source) {
    if (!plant) return false;
    if (source === 'seed') return (inventory.seeds[plant.id] || 0) > 0;
    if (source === 'plant') return (inventory.livePlants[plant.id] || 0) > 0;
    return false;
  }

  function plantAt(kind, targetId, sx, sy) {
    if (!selectedPlant) { addLog('Pick a seed or plant first, then click squares.'); return; }
    if (!canGrowInZone(selectedPlant, zone.tempProfile)) { addLog(`${selectedPlant.name} won't survive in ${zone.name}.`); return; }
    if (!canUseSource(selectedPlant, selectedSource)) {
      addLog(`You don't have any ${selectedSource === 'seed' ? 'seed packets' : 'live plants'} for ${selectedPlant.name}. Buy some from the Plant Nursery.`);
      return;
    }
    const newPlant = {
      sx, sy, ...selectedPlant,
      daysToMature: daysToMatureFrom(selectedPlant, selectedSource),
      health: 100, age: 0, wateredToday: true, dead: false, harvested: false,
    };
    if (selectedSource === 'seed') removeSeed(selectedPlant.id, 1);
    else removeLivePlant(selectedPlant.id, 1);

    if (kind === 'bed') {
      setBeds((prev) => prev.map((b) => (b.id === targetId ? { ...b, plants: [...b.plants, newPlant] } : b)));
    } else {
      setGroundPlants((prev) => [...prev, { ...newPlant, gx: sx, gy: sy }]);
    }
    addLog(`Planted ${selectedPlant.name} (${selectedSource === 'seed' ? 'seed' : 'live plant'}).`);
  }

  function getBedSquare(bed, sx, sy) { return bed.plants.find((p) => p.sx === sx && p.sy === sy) || null; }
  function getGroundSquare(gx, gy) { return groundPlants.find((p) => p.gx === gx && p.gy === gy) || null; }

  function clickBedSquare(bedId, sx, sy) {
    const bed = beds.find((b) => b.id === bedId);
    const sq = getBedSquare(bed, sx, sy);
    if (pendingTransplant) {
      if (sq) { addLog('Square occupied.'); return; }
      completeTransplant('bed', bedId, sx, sy);
      return;
    }
    if (sq && (sq.dead || sq.harvested)) { setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, plants: b.plants.filter((p) => !(p.sx === sx && p.sy === sy)) } : b))); return; }
    if (sq && !sq.dead && !sq.harvested && sq.age >= sq.daysToMature) { harvestBedSquare(bedId, sx, sy); return; }
    if (!sq && mode === 'plant') plantAt('bed', bedId, sx, sy);
  }

  function clickGroundSquare(gx, gy) {
    const sq = getGroundSquare(gx, gy);
    if (pendingTransplant) {
      if (sq) { addLog('Square occupied.'); return; }
      completeTransplant('ground', null, gx, gy);
      return;
    }
    if (sq && (sq.dead || sq.harvested)) { setGroundPlants((prev) => prev.filter((p) => !(p.gx === gx && p.gy === gy))); return; }
    if (sq && !sq.dead && !sq.harvested && sq.age >= sq.daysToMature) { harvestGroundSquare(gx, gy); return; }
    if (!sq && mode === 'plant') plantAt('ground', null, gx, gy);
  }

  function harvestBedSquare(bedId, sx, sy) {
    const bed = beds.find((b) => b.id === bedId);
    const sq = getBedSquare(bed, sx, sy);
    if (!sq) return;
    const qualityMult = sq.health >= 80 ? 1.2 : sq.health >= 50 ? 1 : 0.6;
    const value = Math.round(sq.sellValue * (sq.perSqFt || 1) * qualityMult);
    setCash((c) => c + value); setScore((s) => s + value);
    setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, plants: b.plants.map((p) => (p.sx === sx && p.sy === sy ? { ...p, harvested: true } : p)) } : b)));
    addLog(`Harvested ${sq.name} (×${sq.perSqFt}) for $${value}.`);
  }
  function harvestGroundSquare(gx, gy) {
    const sq = getGroundSquare(gx, gy);
    if (!sq) return;
    const qualityMult = sq.health >= 80 ? 1.2 : sq.health >= 50 ? 1 : 0.6;
    const value = Math.round(sq.sellValue * (sq.perSqFt || 1) * qualityMult);
    setCash((c) => c + value); setScore((s) => s + value);
    setGroundPlants((prev) => prev.map((p) => (p.gx === gx && p.gy === gy ? { ...p, harvested: true } : p)));
    addLog(`Harvested ${sq.name} (×${sq.perSqFt}) for $${value}.`);
  }
  function waterSquare(kind, targetId, sx, sy) {
    if (kind === 'bed') {
      setBeds((prev) => prev.map((b) => (b.id === targetId ? { ...b, plants: b.plants.map((p) => (p.sx === sx && p.sy === sy && !p.dead && !p.harvested ? { ...p, wateredToday: true, health: Math.min(100, p.health + 5) } : p)) } : b)));
    } else {
      setGroundPlants((prev) => prev.map((p) => (p.gx === sx && p.gy === sy && !p.dead && !p.harvested ? { ...p, wateredToday: true, health: Math.min(100, p.health + 5) } : p)));
    }
  }
  function waterBed(bedId) {
    setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, plants: b.plants.map((p) => (p.dead || p.harvested ? p : { ...p, wateredToday: true, health: Math.min(100, p.health + 5) })) } : b)));
  }
  function waterAllGround() {
    setGroundPlants((prev) => prev.map((p) => (p.dead || p.harvested ? p : { ...p, wateredToday: true, health: Math.min(100, p.health + 5) })));
  }
  function gallonsUsedFor(toolId) {
    return toolId === 'can' ? 0 : 5; // pvc draws from barrel gallons per click when barrel-sourced
  }
  function tryUseBarrelWater(toolId) {
    if (inventory.rainBarrels < 1) return true; // no barrel = using tap, always works
    const needed = gallonsUsedFor(toolId);
    if (inventory.rainBarrelGallons < needed) {
      addLog(`Rain barrel is low (${Math.round(inventory.rainBarrelGallons)} gal left) — refills ${RAIN_BARREL.refillPerDay}gal/day.`);
      return inventory.rainBarrelGallons > 0; // allow partial use down to empty rather than hard-block
    }
    setInventory((inv) => ({ ...inv, rainBarrelGallons: Math.max(0, inv.rainBarrelGallons - needed) }));
    return true;
  }

  function placeTray(sizeId, soilId, useBoosted) {
    const size = TRAY_SIZES.find((t) => t.id === sizeId);
    if ((inventory.emptyTrays[sizeId] || 0) < 1) { addLog(`No ${size.slots}-cell trays in inventory — buy one from the Plant Nursery.`); return; }
    const soilStock = useBoosted ? inventory.boostedSoils[soilId] : inventory.soils[soilId];
    if (soilStock < 1) { addLog(`You need a bag of ${useBoosted ? 'boosted ' : ''}${SOILS.find((s) => s.id === soilId).name} — make or buy some first.`); return; }
    removeEmptyTray(sizeId, 1);
    if (useBoosted) setInventory((inv) => ({ ...inv, boostedSoils: { ...inv.boostedSoils, [soilId]: inv.boostedSoils[soilId] - 1 } }));
    else removeSoilInv(soilId, 1);
    trayIdRef.current += 1;
    setTrays((prev) => [...prev, { tid: trayIdRef.current, size: size.slots, soilId, boosted: !!useBoosted, cells: Array(size.slots).fill(null) }]);
    addLog(`Filled a ${size.slots}-cell tray with ${useBoosted ? 'boosted ' : ''}${SOILS.find((s) => s.id === soilId).name}.`);
  }
  function placeEmptyTrayOnTable(sizeId) {
    const size = TRAY_SIZES.find((t) => t.id === sizeId);
    if ((inventory.emptyTrays[sizeId] || 0) < 1) { addLog(`No ${size.slots}-cell trays in inventory — buy one from the Plant Nursery.`); return; }
    removeEmptyTray(sizeId, 1);
    trayIdRef.current += 1;
    setTrays((prev) => [...prev, { tid: trayIdRef.current, size: size.slots, soilId: null, boosted: false, cells: Array(size.slots).fill(null) }]);
    addLog(`Placed an empty ${size.slots}-cell tray on the table. Click it to add soil.`);
  }
  function fillPlacedTray(trayId, soilId, useBoosted) {
    const soilStock = useBoosted ? inventory.boostedSoils[soilId] : inventory.soils[soilId];
    if (soilStock < 1) { addLog(`You need a bag of ${useBoosted ? 'boosted ' : ''}${SOILS.find((s) => s.id === soilId).name}.`); return; }
    if (useBoosted) setInventory((inv) => ({ ...inv, boostedSoils: { ...inv.boostedSoils, [soilId]: inv.boostedSoils[soilId] - 1 } }));
    else removeSoilInv(soilId, 1);
    setTrays((prev) => prev.map((t) => (t.tid === trayId ? { ...t, soilId, boosted: !!useBoosted } : t)));
    addLog(`Added ${useBoosted ? 'boosted ' : ''}${SOILS.find((s) => s.id === soilId).name} to the tray.`);
  }
  function plantTrayCell(tray, cellIdx) {
    if (!tray.soilId) { addLog('Add soil to this tray first.'); return; }
    if (!selectedPlant) { addLog('Pick a seed first, then tap tray cells.'); return; }
    if (!selectedLightSource) { addLog('Select a light source (Grow Light, Sunlight, or Window Light) before starting seeds.'); return; }
    const cell = tray.cells[cellIdx];
    if (cell) return; // occupied cells are handled by their own delete button now
    if (!canGrowInZone(selectedPlant, zone.tempProfile)) { addLog(`${selectedPlant.name} won't survive in ${zone.name}.`); return; }
    const needsStrat = selectedPlant.stratDays > 0;
    if (needsStrat) {
      if ((inventory.strattedSeeds[selectedPlant.id] || 0) < 1) {
        addLog(`${selectedPlant.name} needs ${selectedPlant.stratDays} days of Cold Stratification first — start it in that tab.`);
        return;
      }
    } else if ((inventory.seeds[selectedPlant.id] || 0) < 1) {
      addLog(`No ${selectedPlant.name} seed packets in inventory. Buy from the Plant Nursery.`);
      return;
    }
    const soil = SOILS.find((s) => s.id === tray.soilId);
    const light = LIGHT_SOURCES.find((l) => l.id === selectedLightSource);
    const successChance = germinationSuccessFor(selectedPlant, soil, light, tray.boosted);
    const daysNeeded = nurseryDaysFor(soil, light, tray.boosted);
    const willFail = Math.random() > successChance;
    if (needsStrat) {
      setInventory((inv) => ({ ...inv, strattedSeeds: { ...inv.strattedSeeds, [selectedPlant.id]: inv.strattedSeeds[selectedPlant.id] - 1 } }));
    } else {
      removeSeed(selectedPlant.id, 1);
    }
    setTrays((prev) => prev.map((t) => (t.tid === tray.tid ? { ...t, cells: t.cells.map((c, i) => (i === cellIdx ? { plant: selectedPlant, daysIn: 0, daysNeeded, ready: false, failed: willFail } : c)) } : t)));
  }
  function clearTrayCell(tray, cellIdx) {
    setTrays((prev) => prev.map((t) => (t.tid === tray.tid ? { ...t, cells: t.cells.map((c, i) => (i === cellIdx ? null : c)) } : t)));
    addLog('Removed the seed from that cell.');
  }
  function deleteTray(trayId) {
    setTrays((prev) => prev.filter((t) => t.tid !== trayId));
    addLog('Removed the tray from the table.');
  }
  function mixBoostedSoil(soilId) {
    if (inventory.soils[soilId] < 1) { addLog(`Need a bag of ${SOILS.find((s) => s.id === soilId).name} first.`); return; }
    if (inventory.additives.vermiculite < 1 || inventory.additives.perlite < 1) { addLog('Need 1 vermiculite and 1 perlite to mix a boosted batch.'); return; }
    setInventory((inv) => ({
      ...inv,
      soils: { ...inv.soils, [soilId]: inv.soils[soilId] - 1 },
      additives: { ...inv.additives, vermiculite: inv.additives.vermiculite - 1, perlite: inv.additives.perlite - 1 },
      boostedSoils: { ...inv.boostedSoils, [soilId]: inv.boostedSoils[soilId] + 1 },
    }));
    addLog(`Mixed a boosted bag of ${SOILS.find((s) => s.id === soilId).name} — better germination odds and speed.`);
  }
  function startStratification(plant) {
    if ((inventory.seeds[plant.id] || 0) < 1) { addLog(`No ${plant.name} seed packets in inventory.`); return; }
    removeSeed(plant.id, 1);
    coldStratIdRef.current += 1;
    setColdStratBatches((prev) => [...prev, { id: coldStratIdRef.current, plantId: plant.id, daysIn: 0, daysNeeded: plant.stratDays, ready: false }]);
    addLog(`Started cold-stratifying ${plant.name} — ${plant.stratDays} days in the fridge.`);
  }
  function collectStratifiedSeed(batchId) {
    const batch = coldStratBatches.find((b) => b.id === batchId);
    if (!batch || !batch.ready) return;
    setInventory((inv) => ({ ...inv, strattedSeeds: { ...inv.strattedSeeds, [batch.plantId]: (inv.strattedSeeds[batch.plantId] || 0) + 1 } }));
    setColdStratBatches((prev) => prev.filter((b) => b.id !== batchId));
    addLog(`Collected 1 stratified seed — ready for Heat/Light Germination.`);
  }
  function beginTransplant(tray, cellIdx) {
    const cell = tray.cells[cellIdx];
    if (!cell || !cell.ready) return;
    setPendingTransplant({ trayId: tray.tid, cellIdx, plant: cell.plant });
    setActiveTab('yard');
    setMode('plant');
    addLog(`Pick an empty square to transplant ${cell.plant.name}.`);
  }
  function completeTransplant(kind, bedId, sx, sy) {
    if (!pendingTransplant) return;
    const plant = pendingTransplant.plant;
    const newPlant = { sx, sy, ...plant, daysToMature: daysToMatureFrom(plant, 'seedling'), health: 100, age: 0, wateredToday: true, dead: false, harvested: false };
    if (kind === 'bed') setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, plants: [...b.plants, newPlant] } : b)));
    else setGroundPlants((prev) => [...prev, { ...newPlant, gx: sx, gy: sy }]);
    setTrays((prev) => prev.map((t) => (t.tid === pendingTransplant.trayId ? { ...t, cells: t.cells.map((c, i) => (i === pendingTransplant.cellIdx ? null : c)) } : t)));
    addLog(`Transplanted ${plant.name}.`);
    setPendingTransplant(null);
  }

  const QUIZ = [
    { q: 'Which nutrient deficiency causes yellowing between leaf veins?', options: ['Nitrogen', 'Magnesium', 'Potassium'], answer: 1 },
    { q: 'What soil pH range do most vegetables prefer?', options: ['4.0–4.5', '6.0–7.0', '8.5–9.0'], answer: 1 },
    { q: 'Which practice most improves soil water retention?', options: ['Tilling deeply every week', 'Adding organic compost', 'Removing all mulch'], answer: 1 },
  ];
  function answerQuiz(idx) {
    if (idx === QUIZ[quizIdx].answer) { setCash((c) => c + 15); addLog('Correct! +$15.'); }
    else addLog('Not quite.');
    if (quizIdx < QUIZ.length - 1) setQuizIdx((i) => i + 1);
    else { setQuizOpen(false); setQuizIdx(0); }
  }

  if (screen === 'setup') {
    return (
      <div style={styles.setupWrap}>
        <div style={styles.setupCard}>
          <h1 style={styles.title}>Plot &amp; Season</h1>
          <p style={styles.subtitle}>A garden-planning game grounded in real growing conditions.</p>
          <div style={styles.setupSection}>
            <div style={styles.setupLabel}>Choose your hardiness zone</div>
            <div style={styles.zoneGrid}>
              {ZONES.map((z) => (
                <button key={z.id} onClick={() => setZone(z)} style={{ ...styles.zoneBtn, ...(zone.id === z.id ? styles.zoneBtnActive : {}) }}>
                  <div style={{ fontWeight: 700 }}>{z.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{z.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={styles.setupSection}>
            <div style={styles.setupLabel}>Set your starting budget</div>
            <input type="range" min="100" max={MAX_BUDGET} step="25" value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ width: '100%' }} />
            <div style={styles.budgetValue}>${budget}</div>
          </div>
          <button style={styles.startBtn} onClick={() => { setCash(budget); setScreen('methods'); }}>
            Choose How to Garden →
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'methods') {
    return (
      <div style={styles.setupWrap}>
        <div style={{ ...styles.setupCard, maxWidth: 520 }}>
          <h1 style={styles.title}>How Will You Garden?</h1>
          <p style={styles.subtitle}>
            Pick as many as you like. There's more than one way to grow a garden — the ones you select become
            available as tabs. Some gardeners never build a bed at all.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {METHOD_OPTIONS.map((m) => (
              <div
                key={m.id}
                onClick={() => setEnabledMethods((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                style={{ ...styles.methodCard, ...(enabledMethods[m.id] ? styles.methodCardActive : {}) }}
              >
                <span style={{ fontSize: 22 }}>{m.icon}</span>
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{m.desc}</div>
                </div>
                <div style={{ ...styles.checkbox, ...(enabledMethods[m.id] ? styles.checkboxActive : {}) }}>
                  {enabledMethods[m.id] ? '✓' : ''}
                </div>
              </div>
            ))}
          </div>
          <button
            style={{ ...styles.startBtn, marginTop: 20 }}
            disabled={!Object.values(enabledMethods).some(Boolean)}
            onClick={() => {
              const firstTab = enabledMethods.nursery ? 'nursery' : enabledMethods.indoor ? 'indoor' : 'yard';
              setActiveTab(firstTab);
              setScreen('game');
            }}
          >
            Begin Planning →
          </button>
        </div>
      </div>
    );
  }

  const season = SEASONS[seasonIdx];
  const tabs = [
    enabledMethods.nursery ? { id: 'nursery', label: 'Plant Nursery', icon: '🏬' } : null,
    enabledMethods.indoor ? { id: 'indoor', label: 'Start Indoor', icon: '🪴' } : null,
    enabledMethods.beds || enabledMethods.sow ? { id: 'yard', label: 'Yard', icon: '🏡' } : null,
    { id: 'catalog', label: 'Garden Catalog', icon: '📖' },
  ].filter(Boolean);

  return (
    <div style={styles.playWrap} onMouseUp={handleGridMouseUp}>
      <TopBar zone={zone} isPlanning={isPlanning} season={season} day={day} daySeconds={daySeconds} setDaySeconds={setDaySeconds} paused={paused} setPaused={setPaused} cash={cash} />

      <div style={styles.tabBar}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ ...styles.tabBtn, ...(activeTab === t.id ? styles.tabBtnActive : {}) }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
        {isPlanning && (
          <button style={styles.startSeasonBtn} onClick={() => setIsPlanning(false)}>
            Start Growing Season →
          </button>
        )}
      </div>

      {pendingTransplant && (
        <div style={styles.transplantBanner}>
          Transplanting {pendingTransplant.plant.emoji} {pendingTransplant.plant.name} — click an empty square.
          <button style={styles.startSeasonBtn} onClick={() => setPendingTransplant(null)}>Cancel</button>
        </div>
      )}

      {activeTab === 'nursery' && (
        <NurseryShopTab
          cash={cash} inventory={inventory} zone={zone}
          buySeedPacket={buySeedPacket} sellSeedPacket={sellSeedPacket}
          buyLivePlant={buyLivePlant} sellLivePlant={sellLivePlant}
          buySoilBagShop={buySoilBagShop} sellSoilBagShop={sellSoilBagShop}
          buyTrayShop={buyTrayShop} sellTrayShop={sellTrayShop}
          buyWoodBundle={buyWoodBundle} sellWoodBundle={sellWoodBundle}
          buyAluminumBundle={buyAluminumBundle} sellAluminumBundle={sellAluminumBundle}
          buyWaterTool={buyWaterTool} sellWaterTool={sellWaterTool}
          buySpigot={buySpigot} sellSpigot={sellSpigot}
          buyPvcBundle={buyPvcBundle} sellPvcBundle={sellPvcBundle}
          buyRainBarrel={buyRainBarrel} sellRainBarrel={sellRainBarrel}
          buyAdditive={buyAdditive} sellAdditive={sellAdditive}
          buyLight={buyLight} sellLight={sellLight}
          buyPlantFood={buyPlantFood} sellPlantFood={sellPlantFood}
        />
      )}

      {activeTab === 'indoor' && (
        <StartIndoorTab
          trays={trays} inventory={inventory} zone={zone}
          selectedPlant={selectedPlant} selectedPlantId={selectedPlantId} setSelectedPlantId={setSelectedPlantId}
          placeEmptyTrayOnTable={placeEmptyTrayOnTable} fillPlacedTray={fillPlacedTray}
          plantTrayCell={plantTrayCell} clearTrayCell={clearTrayCell} deleteTray={deleteTray} beginTransplant={beginTransplant} log={log}
          mixBoostedSoil={mixBoostedSoil} coldStratBatches={coldStratBatches} startStratification={startStratification} collectStratifiedSeed={collectStratifiedSeed}
          selectedLightSource={selectedLightSource} setSelectedLightSource={setSelectedLightSource}
          indoorSubTab={indoorSubTab} setIndoorSubTab={setIndoorSubTab} openTrayId={openTrayId} setOpenTrayId={setOpenTrayId}
        />
      )}

      {activeTab === 'yard' && (
        <YardTab
          zone={zone} beds={beds} groundPlants={groundPlants} mode={mode} setMode={setMode}
          dragStart={dragStart} dragCurrent={dragCurrent}
          handleGridMouseDown={handleGridMouseDown} handleGridMouseEnter={handleGridMouseEnter}
          setDragStart={setDragStart} setDragCurrent={setDragCurrent}
          clickBedSquare={clickBedSquare} clickGroundSquare={clickGroundSquare}
          deleteBed={deleteBed} getBedSquare={getBedSquare} getGroundSquare={getGroundSquare}
          selectedPlant={selectedPlant} selectedPlantId={selectedPlantId} setSelectedPlantId={setSelectedPlantId}
          selectedSource={selectedSource} setSelectedSource={setSelectedSource}
          inventory={inventory} pendingTransplant={pendingTransplant}
          waterBed={waterBed} waterAllGround={waterAllGround} waterSquare={waterSquare}
          selectedWaterTool={selectedWaterTool} setSelectedWaterTool={setSelectedWaterTool}
          tryUseBarrelWater={tryUseBarrelWater}
          selectedBuildMaterial={selectedBuildMaterial} setSelectedBuildMaterial={setSelectedBuildMaterial}
          barrels={barrels} deleteBarrel={deleteBarrel} toggleBarrel={toggleBarrel}
          spigots={spigots} deleteSpigot={deleteSpigot} toggleSpigot={toggleSpigot}
          pipes={pipes} deletePipe={deletePipe} pipeStart={pipeStart} pvcIsConnected={pvcIsConnected}
          enabledMethods={enabledMethods}
          setQuizOpen={setQuizOpen} log={log} score={score}
        />
      )}

      {activeTab === 'catalog' && <CatalogTab discovered={discovered} />}

      {quizOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.panelTitle}>Soil Knowledge — Question {quizIdx + 1}/{QUIZ.length}</div>
            <div style={{ margin: '12px 0', fontWeight: 600 }}>{QUIZ[quizIdx].q}</div>
            {QUIZ[quizIdx].options.map((opt, i) => (
              <button key={i} style={styles.quizOption} onClick={() => answerQuiz(i)}>{opt}</button>
            ))}
            <button style={styles.modalClose} onClick={() => { setQuizOpen(false); setQuizIdx(0); }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TopBar({ zone, isPlanning, season, day, daySeconds, setDaySeconds, paused, setPaused, cash }) {
  return (
    <div style={styles.topBar}>
      <div style={styles.topBarLeft}>
        <span style={styles.gameTitle}>Plot &amp; Season</span>
        <span style={styles.zoneTag}>{zone.name}</span>
      </div>
      <div style={styles.clockBlock}>
        {isPlanning ? (
          <div style={styles.planningTag}>🗓 Planning Phase</div>
        ) : (
          <>
            <div style={styles.clockSeason}>{season} · Day {day}/{DAYS_PER_SEASON}</div>
            <button onClick={() => setPaused((p) => !p)} style={{ ...styles.speedBtn, ...(paused ? styles.speedBtnActive : {}) }}>
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <div style={styles.speedSliderWrap}>
              <input
                type="range" min={MIN_DAY_SECONDS} max={MAX_DAY_SECONDS} step="1"
                value={daySeconds} onChange={(e) => setDaySeconds(Number(e.target.value))}
                style={styles.speedSlider}
              />
              <span style={styles.speedSliderLabel}>{daySeconds}s/day</span>
            </div>
          </>
        )}
      </div>
      <div style={styles.cashBlock}>
        <div style={styles.cashLabel}>Cash</div>
        <div style={styles.cashValue}>${cash}</div>
      </div>
    </div>
  );
}

function NurseryShopTab({
  cash, inventory, zone, buySeedPacket, sellSeedPacket, buyLivePlant, sellLivePlant, buySoilBagShop, sellSoilBagShop,
  buyTrayShop, sellTrayShop, buyWoodBundle, sellWoodBundle, buyAluminumBundle, sellAluminumBundle,
  buyWaterTool, sellWaterTool, buySpigot, sellSpigot, buyPvcBundle, sellPvcBundle,
  buyRainBarrel, sellRainBarrel, buyAdditive, sellAdditive, buyLight, sellLight, buyPlantFood, sellPlantFood,
}) {
  const [subTab, setSubTab] = useState('seeds');
  return (
    <div style={styles.mainAreaSingle}>
      <div style={styles.subTabRow}>
        {['seeds', 'plants', 'soil', 'trays', 'materials'].map((s) => (
          <button key={s} onClick={() => setSubTab(s)} style={{ ...styles.subTabBtn, ...(subTab === s ? styles.subTabBtnActive : {}) }}>
            {s === 'seeds' ? '🌰 Seeds' : s === 'plants' ? '🪴 Live Plants' : s === 'soil' ? '🪱 Soil' : s === 'trays' ? '🧺 Trays' : '🪵 Materials'}
          </button>
        ))}
      </div>

      {subTab === 'materials' && (
        <div>
          <div style={styles.materialGroupLabel}>Bed Building</div>
          <div style={styles.shopGrid}>
            {WOOD_BUNDLES.map((w) => (
              <div key={w.id} style={styles.shopCard}>
                <div style={{ fontSize: 24 }}>🪵</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{w.sqFt} sq ft wood</div>
                <div style={{ fontSize: 10, color: '#6b5844', margin: '4px 0' }}>${(w.cost / w.sqFt).toFixed(2)}/sq ft · have: {inventory.woodSqFt}</div>
                <button style={styles.buyBtn} onClick={() => buyWoodBundle(w.id)} disabled={cash < w.cost}>Buy — ${w.cost}</button>
                <button style={styles.sellBtn} onClick={() => sellWoodBundle(w.id)} disabled={inventory.woodSqFt < w.sqFt}>Sell back {w.sqFt} sq ft</button>
              </div>
            ))}
            {ALUMINUM_BUNDLES.map((w) => (
              <div key={w.id} style={styles.shopCard}>
                <div style={{ fontSize: 24 }}>🔩</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{w.sqFt} sq ft aluminum</div>
                <div style={{ fontSize: 10, color: '#6b5844', margin: '4px 0' }}>${(w.cost / w.sqFt).toFixed(2)}/sq ft · have: {inventory.aluminumSqFt}</div>
                <button style={styles.buyBtn} onClick={() => buyAluminumBundle(w.id)} disabled={cash < w.cost}>Buy — ${w.cost}</button>
                <button style={styles.sellBtn} onClick={() => sellAluminumBundle(w.id)} disabled={inventory.aluminumSqFt < w.sqFt}>Sell back {w.sqFt} sq ft</button>
              </div>
            ))}
          </div>

          <div style={styles.materialGroupLabel}>Watering</div>
          <div style={styles.shopGrid}>
            {WATER_TOOLS.map((t) => (
              <div key={t.id} style={styles.shopCard}>
                <div style={{ fontSize: 24 }}>{t.icon}</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{t.name}</div>
                <div style={{ fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 }}>{t.desc}</div>
                <Stepper count={inventory.waterTools[t.id]} cost={t.cost} onAdd={() => buyWaterTool(t.id)} onRemove={() => sellWaterTool(t.id)} canAdd={cash >= t.cost} />
              </div>
            ))}
            <div style={styles.shopCard}>
              <div style={{ fontSize: 24 }}>{SPIGOT.icon}</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{SPIGOT.name}</div>
              <div style={{ fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 }}>{SPIGOT.desc}</div>
              <Stepper count={inventory.spigots} cost={SPIGOT.cost} onAdd={buySpigot} onRemove={sellSpigot} canAdd={cash >= SPIGOT.cost} />
            </div>
            {PVC_BUNDLES.map((p) => (
              <div key={p.id} style={styles.shopCard}>
                <div style={{ fontSize: 24 }}>🧵</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{p.feet}ft PVC (Schedule 40)</div>
                <div style={{ fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 }}>Best for big gardens, but must connect to a placed barrel or spigot to work. Drag point-to-point in Build mode.</div>
                <div style={{ fontSize: 10, color: '#4A3728', marginBottom: 4 }}>have: {inventory.pvcFeet}ft</div>
                <button style={styles.buyBtn} onClick={() => buyPvcBundle(p.id)} disabled={cash < p.cost}>Buy — ${p.cost}</button>
                <button style={styles.sellBtn} onClick={() => sellPvcBundle(p.id)} disabled={inventory.pvcFeet < p.feet}>Sell back {p.feet}ft</button>
              </div>
            ))}
            <div style={styles.shopCard}>
              <div style={{ fontSize: 24 }}>{RAIN_BARREL.icon}</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{RAIN_BARREL.name}</div>
              <div style={{ fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 }}>Connects to hose/PVC or dunk a can. Refills {RAIN_BARREL.refillPerDay}gal/day from rain.</div>
              <div style={{ fontSize: 10, color: '#4A3728', marginBottom: 4 }}>owned: {inventory.rainBarrels} · {Math.round(inventory.rainBarrelGallons)} gal stored</div>
              <button style={styles.buyBtn} onClick={buyRainBarrel} disabled={cash < RAIN_BARREL.cost}>Buy — ${RAIN_BARREL.cost}</button>
              <button style={styles.sellBtn} onClick={sellRainBarrel} disabled={inventory.rainBarrels < 1}>Sell back</button>
            </div>
          </div>

          <div style={styles.materialGroupLabel}>Soil Additives</div>
          <div style={styles.shopGrid}>
            {ADDITIVES.map((a) => (
              <div key={a.id} style={styles.shopCard}>
                <div style={{ fontSize: 24 }}>{a.icon}</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{a.name}</div>
                <div style={{ fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 }}>{a.desc}</div>
                <Stepper count={inventory.additives[a.id]} cost={a.cost} onAdd={() => buyAdditive(a.id)} onRemove={() => sellAdditive(a.id)} canAdd={cash >= a.cost} />
              </div>
            ))}
          </div>

          <div style={styles.materialGroupLabel}>Plant Care</div>
          <div style={styles.shopGrid}>
            <div style={styles.shopCard}>
              <div style={{ fontSize: 24 }}>{PLANT_LIGHT.icon}</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{PLANT_LIGHT.name}</div>
              <div style={{ fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 }}>{PLANT_LIGHT.desc}</div>
              <Stepper count={inventory.lights} cost={PLANT_LIGHT.cost} onAdd={buyLight} onRemove={sellLight} canAdd={cash >= PLANT_LIGHT.cost} />
            </div>
            <div style={styles.shopCard}>
              <div style={{ fontSize: 24 }}>{PLANT_FOOD.icon}</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{PLANT_FOOD.name}</div>
              <div style={{ fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 }}>{PLANT_FOOD.desc}</div>
              <Stepper count={inventory.plantFood} cost={PLANT_FOOD.cost} onAdd={buyPlantFood} onRemove={sellPlantFood} canAdd={cash >= PLANT_FOOD.cost} />
            </div>
          </div>
        </div>
      )}

      {subTab === 'soil' && (
        <div style={styles.shopGrid}>
          {SOILS.map((s) => (
            <div key={s.id} style={styles.shopCard}>
              <div style={{ fontWeight: 700, fontFamily: serif }}>{s.name}</div>
              <div style={{ fontSize: 11, color: '#6b5844', margin: '6px 0', minHeight: 40 }}>{s.desc}</div>
              <div style={{ fontSize: 10, color: '#4A3728', marginBottom: 8 }}>{Math.round(s.baseSuccess * 100)}% success</div>
              <Stepper count={inventory.soils[s.id]} cost={s.cost} onAdd={() => buySoilBagShop(s.id)} onRemove={() => sellSoilBagShop(s.id)} canAdd={cash >= s.cost} />
            </div>
          ))}
        </div>
      )}

      {subTab === 'trays' && (
        <div style={styles.shopGrid}>
          {TRAY_SIZES.map((t) => (
            <div key={t.id} style={styles.shopCard}>
              <div style={{ fontSize: 24 }}>🧺</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{t.slots}-cell tray</div>
              <div style={{ fontSize: 10, color: '#6b5844', margin: '4px 0' }}>${(t.cost / t.slots).toFixed(2)}/cell</div>
              <Stepper count={inventory.emptyTrays[t.id] || 0} cost={t.cost} onAdd={() => buyTrayShop(t.id)} onRemove={() => sellTrayShop(t.id)} canAdd={cash >= t.cost} />
            </div>
          ))}
        </div>
      )}

      {(subTab === 'seeds' || subTab === 'plants') && (
        <div style={styles.shopGrid}>
          {PLANTS.map((p) => {
            const growable = canGrowInZone(p, zone.tempProfile);
            const cost = subTab === 'seeds' ? p.seedCost : p.plantCost;
            const owned = subTab === 'seeds' ? inventory.seeds[p.id] || 0 : inventory.livePlants[p.id] || 0;
            return (
              <div key={p.id} style={{ ...styles.shopCard, opacity: growable ? 1 : 0.4 }}>
                <div style={{ fontSize: 26 }}>{p.emoji}</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: '#6b5844', margin: '2px 0' }}>
                  {subTab === 'seeds' ? `${owned} seeds owned` : `${owned} owned`}
                </div>
                <Stepper
                  count={owned} cost={cost} canAdd={growable && cash >= cost}
                  onAdd={() => (subTab === 'seeds' ? buySeedPacket(p) : buyLivePlant(p))}
                  onRemove={() => (subTab === 'seeds' ? sellSeedPacket(p) : sellLivePlant(p))}
                />
                {!growable && <div style={{ fontSize: 9, color: '#A33', marginTop: 4 }}>Won't survive this zone</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stepper({ count, cost, onAdd, onRemove, canAdd }) {
  return (
    <div style={styles.stepperRow}>
      <button style={styles.stepperBtnSmall} onClick={onRemove} disabled={count < 1}>−</button>
      <div style={styles.stepperCountSmall}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{count}</div>
        <div style={{ fontSize: 9, opacity: 0.6 }}>${cost}</div>
      </div>
      <button style={styles.stepperBtnSmall} onClick={onAdd} disabled={!canAdd}>+</button>
    </div>
  );
}

function StartIndoorTab({
  trays, inventory, zone, selectedPlant, selectedPlantId, setSelectedPlantId,
  placeEmptyTrayOnTable, fillPlacedTray, plantTrayCell, clearTrayCell, deleteTray, beginTransplant, log,
  mixBoostedSoil, coldStratBatches, startStratification, collectStratifiedSeed,
  selectedLightSource, setSelectedLightSource, indoorSubTab, setIndoorSubTab, openTrayId, setOpenTrayId,
}) {
  const subTabs = [
    { id: 'table', label: 'View Table', icon: '🗂️' },
    { id: 'soil', label: 'Make Soil', icon: '🪱' },
    { id: 'stratify', label: 'Cold Stratification', icon: '❄️' },
    { id: 'germinate', label: 'Heat/Light Germination', icon: '💡' },
  ];
  const openTray = trays.find((t) => t.tid === openTrayId) || null;

  return (
    <div style={styles.mainAreaSingle}>
      <div style={styles.subTabRow}>
        {subTabs.map((s) => (
          <button key={s.id} onClick={() => setIndoorSubTab(s.id)} style={{ ...styles.subTabBtn, ...(indoorSubTab === s.id ? styles.subTabBtnActive : {}) }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ---------- VIEW TABLE ---------- */}
      {indoorSubTab === 'table' && !openTray && (
        <div style={styles.mainArea}>
          <div style={styles.yardPanel}>
            <div style={styles.panelTitle}>The Table</div>
            <div style={styles.tableSurface}>
              {trays.length === 0 && <div style={{ padding: 20, color: '#EDE6D6', fontStyle: 'italic', fontSize: 13 }}>No trays on the table yet. Place one from the sidebar.</div>}
              <div style={styles.tableGrid}>
                {trays.map((tray) => {
                  const filled = tray.cells.filter((c) => c).length;
                  return (
                    <div key={tray.tid} style={styles.trayThumb} onClick={() => setOpenTrayId(tray.tid)}>
                      <div style={{ fontSize: 22 }}>🧺</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#EDE6D6' }}>{tray.size}-cell</div>
                      <div style={{ fontSize: 9, color: tray.soilId ? '#B8D8B8' : '#E8968A' }}>{tray.soilId ? `${filled}/${tray.size} planted` : 'needs soil'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={styles.hint}>Click a tray to open it and add seeds. Place new trays from the sidebar.</div>
          </div>
          <div style={styles.sidebar}>
            <div style={styles.shopPanel}>
              <div style={styles.panelTitle}>Place a Tray</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {TRAY_SIZES.filter((t) => (inventory.emptyTrays[t.id] || 0) > 0).map((t) => (
                  <button key={t.id} style={styles.seedRow} onClick={() => placeEmptyTrayOnTable(t.id)}>
                    <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 700 }}>{t.slots}-cell tray</span>
                    <span style={{ fontSize: 11, opacity: 0.7 }}>{inventory.emptyTrays[t.id]} owned</span>
                  </button>
                ))}
                {TRAY_SIZES.every((t) => (inventory.emptyTrays[t.id] || 0) === 0) && (
                  <div style={{ fontSize: 12, color: '#6b5844', fontStyle: 'italic' }}>No trays owned yet — buy some at the Plant Nursery.</div>
                )}
              </div>
            </div>
            <div style={styles.logPanel}>
              <div style={styles.panelTitle}>Garden Log</div>
              {log.map((l, i) => <div key={i} style={styles.logLine}>{l}</div>)}
            </div>
          </div>
        </div>
      )}

      {/* ---------- OPEN TRAY DETAIL VIEW (from table) ---------- */}
      {indoorSubTab === 'table' && openTray && (
        <div style={styles.mainArea}>
          <div style={styles.yardPanel}>
            <button style={styles.backLink} onClick={() => setOpenTrayId(null)}>← Back to Table</button>
            <div style={styles.trayBlock}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={styles.trayLabel}>
                  {openTray.size}-Cell Tray {openTray.soilId ? `· ${SOILS.find((s) => s.id === openTray.soilId).name}${openTray.boosted ? ' (boosted)' : ''}` : '· no soil yet'}
                </div>
                <button style={styles.deleteTrayBtn} onClick={() => { deleteTray(openTray.tid); setOpenTrayId(null); }} title="Remove this tray">✕ Remove Tray</button>
              </div>
              {!openTray.soilId ? (
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 12, color: '#EDE6D6', marginBottom: 8 }}>Pick a soil to fill this tray:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {SOILS.map((s) => (
                      <React.Fragment key={s.id}>
                        <button style={styles.fillSoilBtn} disabled={inventory.soils[s.id] < 1} onClick={() => fillPlacedTray(openTray.tid, s.id, false)}>
                          {s.name} ({inventory.soils[s.id]})
                        </button>
                        <button style={styles.fillSoilBtn} disabled={inventory.boostedSoils[s.id] < 1} onClick={() => fillPlacedTray(openTray.tid, s.id, true)}>
                          Boosted {s.name} ({inventory.boostedSoils[s.id]})
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {(() => {
                    const cols = openTray.size <= 4 ? 2 : openTray.size <= 12 ? 4 : openTray.size <= 32 ? 8 : 12;
                    return (
                      <div style={{ ...styles.trayGrid, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                        {openTray.cells.map((cell, i) => (
                          <div
                            key={i}
                            onClick={() => (cell?.ready ? beginTransplant(openTray, i) : cell ? undefined : plantTrayCell(openTray, i))}
                            style={{ ...styles.trayCell, ...(cell?.failed ? styles.trayCellFailed : {}), ...(cell?.ready ? styles.trayCellReady : {}) }}
                          >
                            {cell ? (cell.failed ? '✕' : cell.ready ? '🪴' : cell.plant.emoji) : <span style={{ opacity: 0.2, fontSize: 10 }}>+</span>}
                            {cell && !cell.ready && !cell.failed && (
                              <button style={styles.trayCellDeleteBtn} onClick={(e) => { e.stopPropagation(); clearTrayCell(openTray, i); }} title="Remove this seed">✕</button>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <div style={styles.hint}>
                    {selectedPlant ? `Selected: ${selectedPlant.emoji} ${selectedPlant.name} — tap empty cells to plant it.` : 'Pick a seed on the right, then tap tray cells.'}
                  </div>
                </>
              )}
            </div>
          </div>
          <div style={styles.sidebar}>
            {!selectedLightSource && (
              <div style={styles.warnBanner}>Pick a light source below — required before starting any seeds.</div>
            )}
            <div style={styles.shopPanel}>
              <div style={styles.panelTitle}>Light Source</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {LIGHT_SOURCES.map((l) => (
                  <button key={l.id} onClick={() => setSelectedLightSource(l.id)} style={{ ...styles.seedRow, ...(selectedLightSource === l.id ? styles.seedRowActive : {}) }}>
                    <span style={{ fontSize: 18 }}>{l.icon}</span>
                    <span style={{ flex: 1, textAlign: 'left', marginLeft: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{l.name}</div>
                      <div style={{ fontSize: 9, opacity: 0.7 }}>{l.desc}</div>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div style={styles.shopPanel}>
              <div style={styles.panelTitle}>Seed to Plant</div>
              <div style={styles.seedList}>
                {PLANTS.filter((p) => (p.stratDays > 0 ? (inventory.strattedSeeds[p.id] || 0) > 0 : (inventory.seeds[p.id] || 0) > 0)).map((p) => {
                  const growable = canGrowInZone(p, zone.tempProfile);
                  const stock = p.stratDays > 0 ? inventory.strattedSeeds[p.id] || 0 : inventory.seeds[p.id] || 0;
                  return (
                    <button key={p.id} onClick={() => setSelectedPlantId(p.id)} disabled={!growable} style={{ ...styles.seedRow, ...(selectedPlantId === p.id ? styles.seedRowActive : {}), opacity: growable ? 1 : 0.35 }}>
                      <span style={{ fontSize: 18 }}>{p.emoji}</span>
                      <span style={{ flex: 1, textAlign: 'left', marginLeft: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}{p.stratDays > 0 ? ' 🧊' : ''}</div>
                        <div style={{ fontSize: 10, opacity: 0.7 }}>{stock} ready</div>
                      </span>
                    </button>
                  );
                })}
                {PLANTS.every((p) => (p.stratDays > 0 ? (inventory.strattedSeeds[p.id] || 0) === 0 : (inventory.seeds[p.id] || 0) === 0)) && (
                  <div style={{ fontSize: 12, color: '#6b5844', fontStyle: 'italic' }}>No seeds ready. Buy some, or finish Cold Stratification for 🧊 plants.</div>
                )}
              </div>
            </div>
            <div style={styles.logPanel}>
              <div style={styles.panelTitle}>Garden Log</div>
              {log.map((l, i) => <div key={i} style={styles.logLine}>{l}</div>)}
            </div>
          </div>
        </div>
      )}

      {/* ---------- MAKE SOIL ---------- */}
      {indoorSubTab === 'soil' && (
        <div style={styles.mainAreaSingle}>
          <p style={{ fontSize: 12, color: '#6b5844', marginBottom: 14 }}>
            Mix a base soil bag with vermiculite and perlite to make a boosted batch — better germination odds and faster sprouting.
            Base soil and additives are bought at the Plant Nursery.
          </p>
          <div style={styles.shopGrid}>
            {SOILS.map((s) => (
              <div key={s.id} style={styles.shopCard}>
                <div style={{ fontWeight: 700, fontFamily: serif }}>{s.name}</div>
                <div style={{ fontSize: 10, color: '#6b5844', margin: '6px 0' }}>base: {inventory.soils[s.id]} · boosted: {inventory.boostedSoils[s.id]}</div>
                <div style={{ fontSize: 10, color: '#4A3728', marginBottom: 8 }}>uses 1 {s.name} + 1 vermiculite + 1 perlite</div>
                <button
                  style={styles.buyBtn}
                  onClick={() => mixBoostedSoil(s.id)}
                  disabled={inventory.soils[s.id] < 1 || inventory.additives.vermiculite < 1 || inventory.additives.perlite < 1}
                >
                  Mix a Boosted Bag
                </button>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#6b5844', marginTop: 14 }}>
            🟤 Vermiculite owned: {inventory.additives.vermiculite} · ⚪ Perlite owned: {inventory.additives.perlite}
          </div>
        </div>
      )}

      {/* ---------- COLD STRATIFICATION ---------- */}
      {indoorSubTab === 'stratify' && (
        <div style={styles.mainArea}>
          <div style={styles.yardPanel}>
            <div style={styles.panelTitle}>Cold Stratification (the fridge)</div>
            <div style={styles.tableSurface}>
              {coldStratBatches.length === 0 && <div style={{ padding: 20, color: '#EDE6D6', fontStyle: 'italic', fontSize: 13 }}>Nothing stratifying right now.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {coldStratBatches.map((b) => {
                  const plant = PLANTS.find((p) => p.id === b.plantId);
                  return (
                    <div key={b.id} style={styles.stratRow}>
                      <span style={{ fontSize: 18 }}>{plant.emoji}</span>
                      <span style={{ flex: 1, marginLeft: 8, fontSize: 12, color: '#EDE6D6' }}>
                        {plant.name} — {b.ready ? 'ready!' : `${b.daysIn}/${b.daysNeeded} days cold`}
                      </span>
                      {b.ready && <button style={styles.transplantBtnSmall} onClick={() => collectStratifiedSeed(b.id)}>Collect</button>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={styles.hint}>Seeds marked 🧊 need this before they can germinate. Takes weeks — plan ahead.</div>
          </div>
          <div style={styles.sidebar}>
            <div style={styles.shopPanel}>
              <div style={styles.panelTitle}>Start Stratifying</div>
              <div style={styles.seedList}>
                {PLANTS.filter((p) => p.stratDays > 0 && (inventory.seeds[p.id] || 0) > 0).map((p) => (
                  <button key={p.id} style={styles.seedRow} onClick={() => startStratification(p)}>
                    <span style={{ fontSize: 18 }}>{p.emoji}</span>
                    <span style={{ flex: 1, textAlign: 'left', marginLeft: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>{p.stratDays} days · {inventory.seeds[p.id]} seeds in stock</div>
                    </span>
                  </button>
                ))}
                {PLANTS.filter((p) => p.stratDays > 0).every((p) => (inventory.seeds[p.id] || 0) === 0) && (
                  <div style={{ fontSize: 12, color: '#6b5844', fontStyle: 'italic' }}>No stratification-needing seeds in stock. Buy Lavender, Milkweed, Oregano, or Sage seeds at the Plant Nursery.</div>
                )}
              </div>
            </div>
            <div style={styles.logPanel}>
              <div style={styles.panelTitle}>Garden Log</div>
              {log.map((l, i) => <div key={i} style={styles.logLine}>{l}</div>)}
            </div>
          </div>
        </div>
      )}

      {/* ---------- HEAT/LIGHT GERMINATION (info + shortcut) ---------- */}
      {indoorSubTab === 'germinate' && (
        <div style={styles.mainAreaSingle}>
          <p style={{ fontSize: 12, color: '#6b5844', marginBottom: 10, maxWidth: 560 }}>
            Every seed germinates here — pick a light source, then open a tray from the View Table tab to plant. Seeds needing Cold
            Stratification must finish that step first.
          </p>
          <div style={styles.shopGrid}>
            {LIGHT_SOURCES.map((l) => (
              <div key={l.id} style={{ ...styles.shopCard, ...(selectedLightSource === l.id ? { boxShadow: 'inset 0 0 0 2px #5C7A4F' } : {}) }}>
                <div style={{ fontSize: 26 }}>{l.icon}</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{l.name}</div>
                <div style={{ fontSize: 10, color: '#6b5844', margin: '6px 0', minHeight: 44 }}>{l.desc}</div>
                <button style={styles.buyBtn} onClick={() => setSelectedLightSource(l.id)}>
                  {selectedLightSource === l.id ? 'Selected' : 'Select'}
                </button>
              </div>
            ))}
          </div>
          <button style={{ ...styles.startBtn, marginTop: 16, maxWidth: 240, padding: '10px 0', fontSize: 13 }} onClick={() => setIndoorSubTab('table')}>
            Go to View Table →
          </button>
        </div>
      )}
    </div>
  );
}

function YardTab({
  zone, beds, groundPlants, mode, setMode, dragStart, dragCurrent, handleGridMouseDown, handleGridMouseEnter,
  setDragStart, setDragCurrent, clickBedSquare, clickGroundSquare, deleteBed, getBedSquare, getGroundSquare,
  selectedPlant, selectedPlantId, setSelectedPlantId, selectedSource, setSelectedSource, inventory, pendingTransplant,
  waterBed, waterAllGround, waterSquare, selectedWaterTool, setSelectedWaterTool, tryUseBarrelWater,
  selectedBuildMaterial, setSelectedBuildMaterial, barrels, deleteBarrel, toggleBarrel,
  spigots, deleteSpigot, toggleSpigot,
  pipes, deletePipe, pipeStart, pvcIsConnected,
  enabledMethods, setQuizOpen, log, score,
}) {
  const dragRect = (() => {
    if (!dragStart || !dragCurrent) return null;
    const x0 = Math.min(dragStart.x, dragCurrent.x), x1 = Math.max(dragStart.x, dragCurrent.x);
    const y0 = Math.min(dragStart.y, dragCurrent.y), y1 = Math.max(dragStart.y, dragCurrent.y);
    return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  })();

  const hasOnSpigot = spigots.some((s) => s.on);
  const hasPlacedPvc = pipes.length > 0;
  const hasConnectedPvc = pipes.some((p) => pvcIsConnected(p));
  const pvcHasOnSource = pipes.some((p) => {
    if (!pvcIsConnected(p)) return false;
    const endpoints = [{ x: p.x0, y: p.y0 }, { x: p.x1, y: p.y1 }];
    const onBarrel = endpoints.some((e) => barrels.some((b) => b.on && b.x === e.x && b.y === e.y));
    const onSpigot = endpoints.some((e) => spigots.some((s) => s.on && s.x === e.x && s.y === e.y));
    return onBarrel || onSpigot;
  });

  function renderSquareContent(sq) {
    if (!sq) return <span style={{ opacity: 0.15, fontSize: 9 }}>+</span>;
    const subCols = Math.ceil(Math.sqrt(sq.perSqFt || 1));
    const stage = !sq.dead && !sq.harvested ? growthStageFor(sq.age, sq.daysToMature) : null;
    return (
      <>
        <div style={{ ...styles.miniGrid, gridTemplateColumns: `repeat(${subCols}, 1fr)` }}>
          {Array.from({ length: sq.perSqFt || 1 }).map((_, i) => (
            <span key={i} style={{ fontSize: subCols >= 4 ? 7 : subCols >= 3 ? 9 : 13, opacity: sq.dead ? 0.35 : sq.harvested ? 0.3 : 1, lineHeight: 1 }}>
              {sq.dead ? '💀' : sq.harvested ? '✅' : sq.emoji}
            </span>
          ))}
        </div>
        {stage && (stage.id === 'ready' || stage.id === 'oversized' || stage.id === 'dying') && (
          <div style={{ ...styles.stageBadge, ...(stage.id === 'oversized' ? styles.stageBadgeWarn : {}), ...(stage.id === 'dying' ? styles.stageBadgeDanger : {}) }} title={stage.label}>
            {stage.icon}
          </div>
        )}
        {!sq.dead && !sq.harvested && (
          <div style={styles.healthBarWrap}>
            <div style={{ ...styles.healthBarFill, width: `${sq.health}%`, background: sq.health > 60 ? '#5C7A4F' : sq.health > 30 ? '#C16B3D' : '#A33' }} />
          </div>
        )}
      </>
    );
  }

  return (
    <div style={styles.mainArea}>
      <div style={styles.yardPanel}>
        <div style={styles.modeRow}>
          {enabledMethods.beds && (
            <button onClick={() => setMode('build')} style={{ ...styles.modeBtn, ...(mode === 'build' ? styles.modeBtnActive : {}) }}>🪵 Build</button>
          )}
          <button onClick={() => setMode('plant')} style={{ ...styles.modeBtn, ...(mode === 'plant' ? styles.modeBtnActive : {}) }}>🌱 Plant</button>
          <button onClick={() => setMode('water')} style={{ ...styles.modeBtn, ...(mode === 'water' ? styles.modeBtnActive : {}) }}>💧 Water</button>
          <button style={styles.quizBtn} onClick={() => setQuizOpen(true)}>📋 Soil Quiz</button>
        </div>

        <div style={{ ...styles.grid, gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_PX}px)`, gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL_PX}px)` }} onMouseLeave={() => { if (dragStart) { setDragStart(null); setDragCurrent(null); } }}>
          {Array.from({ length: GRID_ROWS }).map((_, y) =>
            Array.from({ length: GRID_COLS }).map((_, x) => {
              const inDrag = dragRect && x >= dragRect.x0 && x < dragRect.x0 + dragRect.w && y >= dragRect.y0 && y < dragRect.y0 + dragRect.h;
              const onBed = beds.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
              const onBarrel = barrels.some((br) => br.x === x && br.y === y);
              const groundSq = !onBed && !onBarrel ? getGroundSquare(x, y) : null;
              const isPipeStart = pipeStart && pipeStart.x === x && pipeStart.y === y;
              return (
                <div
                  key={`${x}-${y}`}
                  onMouseDown={() => handleGridMouseDown(x, y)}
                  onMouseEnter={() => handleGridMouseEnter(x, y)}
                  onClick={() => {
                    if (onBed || onBarrel) return;
                    if (mode === 'water') {
                      if (!selectedWaterTool) { return; }
                      if (selectedWaterTool === 'pvc' && !pvcHasOnSource) { return; }
                      if (!tryUseBarrelWater(selectedWaterTool)) return;
                      if (selectedWaterTool === 'can') waterSquare('ground', null, x, y);
                      else waterAllGround();
                    } else if (enabledMethods.sow) clickGroundSquare(x, y);
                  }}
                  style={{ ...styles.cell, ...(inDrag ? styles.cellDragPreview : {}), ...(isPipeStart ? styles.cellPipeStart : {}), ...(!onBed && !onBarrel && enabledMethods.sow && mode === 'plant' && !groundSq ? styles.sqftCellEmpty : {}) }}
                >
                  {!onBed && !onBarrel && groundSq && <div style={styles.groundSquareInner}>{renderSquareContent(groundSq)}</div>}
                </div>
              );
            })
          )}

          <svg style={styles.pipeSvgLayer} width={GRID_COLS * CELL_PX} height={GRID_ROWS * CELL_PX}>
            {pipes.map((p) => {
              const connected = pvcIsConnected(p);
              const cx0 = p.x0 * CELL_PX + CELL_PX / 2, cy0 = p.y0 * CELL_PX + CELL_PX / 2;
              const cx1 = p.x1 * CELL_PX + CELL_PX / 2, cy1 = p.y1 * CELL_PX + CELL_PX / 2;
              return (
                <g key={p.id} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} onClick={() => { if (mode === 'build') deletePipe(p.id); }}>
                  {/* Schedule 40 PVC: pale gray-white body with a slightly darker outline, like real pipe */}
                  <line x1={cx0} y1={cy0} x2={cx1} y2={cy1} stroke="#9AA0A6" strokeWidth={6} strokeLinecap="round" opacity={0.9} />
                  <line x1={cx0} y1={cy0} x2={cx1} y2={cy1} stroke="#F2F1EC" strokeWidth={4} strokeLinecap="round" opacity={0.95} />
                  {!connected && (
                    <line x1={cx0} y1={cy0} x2={cx1} y2={cy1} stroke="#A33" strokeWidth={1.5} strokeDasharray="4,4" />
                  )}
                </g>
              );
            })}
          </svg>

          {barrels.map((br) => (
            <div
              key={br.id}
              style={{ ...styles.barrelOverlay, ...(br.on ? styles.sourceOn : {}), left: br.x * CELL_PX, top: br.y * CELL_PX, width: CELL_PX, height: CELL_PX }}
              onClick={() => toggleBarrel(br.id)}
              title={br.on ? 'Water is ON — touch to turn off' : 'Water is OFF — touch to turn on'}
            >
              🛢️
              {br.on && <span style={styles.onIndicator}>💧</span>}
              {mode === 'build' && (
                <button style={styles.deleteFixtureBtn} onClick={(e) => { e.stopPropagation(); deleteBarrel(br.id); }} title="Remove">✕</button>
              )}
            </div>
          ))}

          {spigots.map((sp) => (
            <div
              key={sp.id}
              style={{ ...styles.spigotOverlay, ...(sp.on ? styles.sourceOn : {}), left: sp.x * CELL_PX, top: sp.y * CELL_PX, width: CELL_PX, height: CELL_PX }}
              onClick={() => toggleSpigot(sp.id)}
              title={sp.on ? 'Water is ON — touch to turn off' : 'Water is OFF — touch to turn on'}
            >
              🚰
              {sp.on && <span style={styles.onIndicator}>💧</span>}
              {mode === 'build' && (
                <button style={styles.deleteFixtureBtn} onClick={(e) => { e.stopPropagation(); deleteSpigot(sp.id); }} title="Remove">✕</button>
              )}
            </div>
          ))}

          {beds.map((bed) => (
            <div key={bed.id} style={{ ...styles.bedOverlay, ...(bed.material === 'aluminum' ? styles.bedOverlayAluminum : {}), left: bed.x * CELL_PX, top: bed.y * CELL_PX, width: bed.w * CELL_PX, height: bed.h * CELL_PX }}>
              {mode === 'build' && <button style={styles.deleteBedBtn} onClick={(e) => { e.stopPropagation(); deleteBed(bed.id); }}>✕</button>}
              <div style={styles.bedDims}>{bed.w}'×{bed.h}'</div>
              <div style={{ ...styles.sqftGrid, gridTemplateColumns: `repeat(${bed.w}, 1fr)`, gridTemplateRows: `repeat(${bed.h}, 1fr)` }} onClick={() => { if (mode === 'water' && selectedWaterTool && selectedWaterTool !== 'can') { if (selectedWaterTool === 'pvc' && !pvcHasOnSource) return; if (tryUseBarrelWater(selectedWaterTool)) waterBed(bed.id); } }}>
                {Array.from({ length: bed.h }).map((_, sy) =>
                  Array.from({ length: bed.w }).map((_, sx) => {
                    const sq = getBedSquare(bed, sx, sy);
                    return (
                      <div
                        key={`${sx}-${sy}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (mode !== 'water') { clickBedSquare(bed.id, sx, sy); return; }
                          if (!selectedWaterTool) return;
                          if (selectedWaterTool === 'pvc' && !pvcHasOnSource) return;
                          if (!tryUseBarrelWater(selectedWaterTool)) return;
                          if (selectedWaterTool === 'can') waterSquare('bed', bed.id, sx, sy);
                          else waterBed(bed.id);
                        }}
                        style={{ ...styles.sqftCell, ...(!sq && mode === 'plant' ? styles.sqftCellEmpty : {}), ...(!sq && pendingTransplant ? styles.sqftCellTransplantTarget : {}) }}
                      >
                        {renderSquareContent(sq)}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>

        {mode === 'build' && enabledMethods.beds && (
          <div style={styles.hint}>
            {selectedBuildMaterial === 'barrel'
              ? 'Click any empty square to place a rain barrel. Click a placed barrel to pick it back up.'
              : `Drag across the grid to paint a ${selectedBuildMaterial} bed, square by square. Uses 1 sq ft of ${selectedBuildMaterial} per square. Tap ✕ to remove (no refund).`}
          </div>
        )}
        {mode === 'plant' && (
          <div style={styles.hint}>
            {pendingTransplant ? `Click an empty square to transplant ${pendingTransplant.plant.name}.` :
              selectedPlant ? `Selected: ${selectedPlant.emoji} ${selectedPlant.name} (${selectedSource === 'seed' ? 'seed' : 'live plant'}) — click squares to plant, click several in a row.` :
              'Pick a seed/plant and source in the sidebar, then click squares (open ground works too if Direct Sow is enabled).'}
          </div>
        )}
        {mode === 'water' && (
          <div style={styles.hint}>
            {!selectedWaterTool ? 'Pick a watering tool in the sidebar first.' :
              selectedWaterTool === 'can' ? 'Watering Can selected — click one square at a time.' :
              'Click any square in a bed or on the ground to water the whole area at once.'}
          </div>
        )}
      </div>

      <div style={styles.sidebar}>
        {mode === 'build' && enabledMethods.beds && (
          <div style={styles.shopPanel}>
            <div style={styles.panelTitle}>Building Material</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                onClick={() => setSelectedBuildMaterial('wood')}
                disabled={inventory.woodSqFt < 1}
                style={{ ...styles.seedRow, ...(selectedBuildMaterial === 'wood' ? styles.seedRowActive : {}), opacity: inventory.woodSqFt < 1 ? 0.4 : 1 }}
              >
                <span style={{ fontSize: 18 }}>🪵</span>
                <span style={{ flex: 1, textAlign: 'left', marginLeft: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Wood</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{inventory.woodSqFt} sq ft owned</div>
                </span>
              </button>
              <button
                onClick={() => setSelectedBuildMaterial('aluminum')}
                disabled={inventory.aluminumSqFt < 1}
                style={{ ...styles.seedRow, ...(selectedBuildMaterial === 'aluminum' ? styles.seedRowActive : {}), opacity: inventory.aluminumSqFt < 1 ? 0.4 : 1 }}
              >
                <span style={{ fontSize: 18 }}>🔩</span>
                <span style={{ flex: 1, textAlign: 'left', marginLeft: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Aluminum</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{inventory.aluminumSqFt} sq ft owned</div>
                </span>
              </button>
              <button
                onClick={() => setSelectedBuildMaterial('barrel')}
                disabled={inventory.rainBarrels < 1}
                style={{ ...styles.seedRow, ...(selectedBuildMaterial === 'barrel' ? styles.seedRowActive : {}), opacity: inventory.rainBarrels < 1 ? 0.4 : 1 }}
              >
                <span style={{ fontSize: 18 }}>🛢️</span>
                <span style={{ flex: 1, textAlign: 'left', marginLeft: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Rain Barrel</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{inventory.rainBarrels} owned</div>
                </span>
              </button>
              <button
                onClick={() => setSelectedBuildMaterial('spigot')}
                disabled={inventory.spigots < 1}
                style={{ ...styles.seedRow, ...(selectedBuildMaterial === 'spigot' ? styles.seedRowActive : {}), opacity: inventory.spigots < 1 ? 0.4 : 1 }}
              >
                <span style={{ fontSize: 18 }}>🚰</span>
                <span style={{ flex: 1, textAlign: 'left', marginLeft: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Water Spigot</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{inventory.spigots} owned</div>
                </span>
              </button>
              <button
                onClick={() => setSelectedBuildMaterial('pvc')}
                disabled={inventory.pvcFeet < 1}
                style={{ ...styles.seedRow, ...(selectedBuildMaterial === 'pvc' ? styles.seedRowActive : {}), opacity: inventory.pvcFeet < 1 ? 0.4 : 1 }}
              >
                <span style={{ fontSize: 18 }}>🧵</span>
                <span style={{ flex: 1, textAlign: 'left', marginLeft: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>PVC Pipe (Schedule 40)</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{inventory.pvcFeet}ft owned</div>
                </span>
              </button>
              {inventory.woodSqFt < 1 && inventory.aluminumSqFt < 1 && inventory.rainBarrels < 1 && inventory.spigots < 1 && inventory.pvcFeet < 1 && (
                <div style={{ fontSize: 12, color: '#6b5844', fontStyle: 'italic' }}>No building materials yet — buy some at the Plant Nursery.</div>
              )}
            </div>
          </div>
        )}
        {mode === 'water' && (
          <div style={styles.shopPanel}>
            <div style={styles.panelTitle}>Watering Tool</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {inventory.waterTools.can > 0 && (
                <button onClick={() => setSelectedWaterTool('can')} style={{ ...styles.seedRow, ...(selectedWaterTool === 'can' ? styles.seedRowActive : {}) }}>
                  <span style={{ fontSize: 18 }}>🪣</span>
                  <span style={{ flex: 1, textAlign: 'left', marginLeft: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Watering Can</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{inventory.waterTools.can} owned</div>
                  </span>
                </button>
              )}
              {hasConnectedPvc && (
                <button onClick={() => setSelectedWaterTool('pvc')} style={{ ...styles.seedRow, ...(selectedWaterTool === 'pvc' ? styles.seedRowActive : {}) }}>
                  <span style={{ fontSize: 18 }}>🧵</span>
                  <span style={{ flex: 1, textAlign: 'left', marginLeft: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>PVC Pipe</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>connected — touch the spigot/barrel to turn water on</div>
                  </span>
                </button>
              )}
              {hasPlacedPvc && !hasConnectedPvc && (
                <div style={{ fontSize: 11, color: '#A33', fontStyle: 'italic' }}>PVC is placed but not connected to a barrel or spigot — it won't water yet.</div>
              )}
              {spigots.length === 0 && barrels.length === 0 && inventory.waterTools.can === 0 && !hasPlacedPvc && (
                <div style={{ fontSize: 12, color: '#6b5844', fontStyle: 'italic' }}>No watering tools yet — buy a can, spigot, or PVC at the Plant Nursery.</div>
              )}
              {(spigots.length > 0 || barrels.length > 0) && (
                <div style={{ fontSize: 11, color: '#4A3728', marginTop: 6 }}>
                  Touch a placed spigot or barrel on the grid to turn its water on or off.
                </div>
              )}
            </div>
            {inventory.rainBarrels > 0 && (
              <div style={{ fontSize: 11, color: '#4A3728', marginTop: 10, background: '#EDE6D6', padding: '6px 8px', borderRadius: 3 }}>
                🛢️ Rain barrel: {Math.round(inventory.rainBarrelGallons)}/{inventory.rainBarrels * RAIN_BARREL.capacity} gal
              </div>
            )}
          </div>
        )}
        {mode === 'plant' && !pendingTransplant && (
          <div style={styles.shopPanel}>
            <div style={styles.panelTitle}>Source</div>
            <div style={styles.methodRow}>
              <button onClick={() => setSelectedSource('seed')} style={{ ...styles.methodBtn, ...(selectedSource === 'seed' ? styles.methodBtnActive : {}) }}>🌰 Seed</button>
              <button onClick={() => setSelectedSource('plant')} style={{ ...styles.methodBtn, ...(selectedSource === 'plant' ? styles.methodBtnActive : {}) }}>🪴 Live Plant</button>
            </div>
            <div style={{ ...styles.panelTitle, marginTop: 14 }}>From Inventory — click once, plant many</div>
            <div style={styles.seedList}>
              {PLANTS.filter((p) => (selectedSource === 'seed' ? inventory.seeds[p.id] : inventory.livePlants[p.id]) > 0).map((p) => {
                const growable = canGrowInZone(p, zone.tempProfile);
                const owned = selectedSource === 'seed' ? inventory.seeds[p.id] : inventory.livePlants[p.id];
                return (
                  <button key={p.id} onClick={() => setSelectedPlantId(p.id)} disabled={!growable} style={{ ...styles.seedRow, ...(selectedPlantId === p.id ? styles.seedRowActive : {}), opacity: growable ? 1 : 0.35 }}>
                    <span style={{ fontSize: 18 }}>{p.emoji}</span>
                    <span style={{ flex: 1, textAlign: 'left', marginLeft: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{p.perSqFt}/sq ft · {owned} in stock</div>
                    </span>
                  </button>
                );
              })}
              {PLANTS.every((p) => (selectedSource === 'seed' ? inventory.seeds[p.id] : inventory.livePlants[p.id]) === 0) && (
                <div style={{ fontSize: 12, color: '#6b5844', fontStyle: 'italic' }}>
                  No {selectedSource === 'seed' ? 'seed packets' : 'live plants'} in inventory — buy some at the Plant Nursery.
                </div>
              )}
            </div>
          </div>
        )}

        <div style={styles.logPanel}>
          <div style={styles.panelTitle}>Garden Log</div>
          {log.map((l, i) => <div key={i} style={styles.logLine}>{l}</div>)}
        </div>
        <div style={styles.scorePanel}>
          <div style={styles.panelTitle}>Season Score</div>
          <div style={styles.scoreValue}>${score}</div>
        </div>
      </div>
    </div>
  );
}

function CatalogTab({ discovered }) {
  const entries = [
    ...PLANTS.map((p) => ({ key: `seed-${p.id}`, icon: p.emoji, label: `${p.name} (seed)` })),
    ...PLANTS.map((p) => ({ key: `plant-${p.id}`, icon: p.emoji, label: `${p.name} (live plant)` })),
    ...SOILS.map((s) => ({ key: `soil-${s.id}`, icon: '🪱', label: s.name })),
    ...TRAY_SIZES.map((t) => ({ key: `tray-${t.id}`, icon: '🧺', label: `${t.slots}-cell tray` })),
    { key: 'material-wood', icon: '🪵', label: 'Wood (bed material)' },
    { key: 'material-aluminum', icon: '🔩', label: 'Aluminum (bed material)' },
    ...WATER_TOOLS.map((t) => ({ key: `tool-${t.id}`, icon: t.icon, label: t.name })),
    { key: 'tool-hose', icon: '🚿', label: 'Water Hose' },
    { key: 'tool-pvc', icon: '🧵', label: 'PVC Pipe' },
    { key: 'material-barrel', icon: RAIN_BARREL.icon, label: RAIN_BARREL.name },
    ...ADDITIVES.map((a) => ({ key: `additive-${a.id}`, icon: a.icon, label: a.name })),
    { key: 'material-light', icon: PLANT_LIGHT.icon, label: PLANT_LIGHT.name },
    { key: 'material-food', icon: PLANT_FOOD.icon, label: PLANT_FOOD.name },
  ];
  const ownedCount = entries.filter((e) => discovered[e.key]).length;

  return (
    <div style={styles.mainAreaSingle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div style={styles.panelTitle}>Collection — All</div>
        <div style={{ fontSize: 12, color: '#6b5844' }}>{ownedCount}/{entries.length}</div>
      </div>
      <div style={styles.catalogGrid}>
        {entries.map((e) => {
          const owned = !!discovered[e.key];
          return (
            <div key={e.key} style={{ ...styles.catalogCell, ...(owned ? styles.catalogCellOwned : {}) }} title={owned ? e.label : '???'}>
              <div style={{ fontSize: 22, opacity: owned ? 1 : 0.15, filter: owned ? 'none' : 'grayscale(1)' }}>{e.icon}</div>
              {owned && <div style={styles.catalogCheck}>✓</div>}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: '#6b5844', marginTop: 12, fontStyle: 'italic' }}>
        Icons unlock as you buy seeds, live plants, soil, trays, and build beds.
      </div>
    </div>
  );
}

const serif = 'Georgia, "Times New Roman", serif';
const sans = 'system-ui, -apple-system, sans-serif';

const styles = {
  setupWrap: { minHeight: '100vh', background: '#EDE6D6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, padding: 20 },
  setupCard: { background: '#F7F2E7', border: '2px solid #4A3728', borderRadius: 4, padding: 32, maxWidth: 440, width: '100%', boxShadow: '4px 4px 0 #4A3728' },
  title: { fontFamily: serif, fontSize: 30, color: '#4A3728', margin: 0, letterSpacing: 0.5 },
  subtitle: { color: '#6b5844', fontSize: 13, marginTop: 6, marginBottom: 20, lineHeight: 1.5 },
  setupSection: { marginBottom: 22 },
  setupLabel: { fontWeight: 700, fontSize: 13, color: '#4A3728', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  zoneGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  zoneBtn: { textAlign: 'left', background: '#EDE6D6', border: '1.5px solid #B8A98A', borderRadius: 3, padding: '10px 12px', cursor: 'pointer', color: '#4A3728', fontFamily: sans },
  zoneBtnActive: { background: '#5C7A4F', borderColor: '#4A3728', color: '#fff' },
  budgetValue: { fontFamily: serif, fontSize: 26, color: '#4A3728', textAlign: 'center', marginTop: 6 },
  startBtn: { width: '100%', background: '#4A3728', color: '#EDE6D6', border: 'none', borderRadius: 3, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.4 },

  methodCard: { display: 'flex', alignItems: 'center', background: '#EDE6D6', border: '1.5px solid #B8A98A', borderRadius: 4, padding: 12, cursor: 'pointer' },
  methodCardActive: { borderColor: '#5C7A4F', background: '#E3EADD' },
  checkbox: { width: 22, height: 22, border: '2px solid #B8A98A', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' },
  checkboxActive: { background: '#5C7A4F', borderColor: '#4A3728' },

  playWrap: { minHeight: '100vh', background: '#EDE6D6', fontFamily: sans, color: '#3D2B1F', userSelect: 'none' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#4A3728', color: '#EDE6D6', padding: '10px 18px', flexWrap: 'wrap', gap: 10 },
  topBarLeft: { display: 'flex', alignItems: 'baseline', gap: 10 },
  gameTitle: { fontFamily: serif, fontSize: 18, fontWeight: 700 },
  zoneTag: { fontSize: 11, background: '#5C7A4F', padding: '2px 8px', borderRadius: 10 },
  clockBlock: { display: 'flex', alignItems: 'center', gap: 10 },
  planningTag: { fontSize: 13, fontWeight: 700, color: '#D4B483' },
  clockSeason: { fontSize: 13, fontWeight: 600 },
  speedControls: { display: 'flex', gap: 4 },
  speedSliderWrap: { display: 'flex', alignItems: 'center', gap: 6 },
  speedSlider: { width: 90 },
  speedSliderLabel: { fontSize: 11, minWidth: 50 },
  speedBtn: { background: 'transparent', border: '1px solid #8FA6B8', color: '#EDE6D6', borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: 'pointer' },
  speedBtnActive: { background: '#8FA6B8', color: '#3D2B1F', fontWeight: 700 },
  cashBlock: { textAlign: 'right' },
  cashLabel: { fontSize: 10, opacity: 0.7, textTransform: 'uppercase' },
  cashValue: { fontFamily: serif, fontSize: 20, fontWeight: 700 },

  tabBar: { display: 'flex', gap: 4, background: '#3D2B1F', padding: '6px 14px', flexWrap: 'wrap', alignItems: 'center' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#D4B483', padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRadius: '4px 4px 0 0' },
  tabBtnActive: { background: '#EDE6D6', color: '#4A3728' },
  startSeasonBtn: { background: '#5C7A4F', color: '#fff', border: 'none', borderRadius: 3, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginLeft: 'auto' },
  transplantBanner: { background: '#5C7A4F', color: '#fff', padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },

  mainArea: { display: 'flex', gap: 16, padding: 16, flexWrap: 'wrap' },
  mainAreaSingle: { padding: 16 },
  yardPanel: { flex: '2 1 560px' },
  modeRow: { display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  modeBtn: { background: '#F7F2E7', border: '1.5px solid #B8A98A', borderRadius: 3, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#4A3728' },
  modeBtnActive: { background: '#5C7A4F', color: '#fff', borderColor: '#4A3728' },
  quizBtn: { background: '#8FA6B8', border: 'none', borderRadius: 3, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#22303A' },
  woodStockBadge: { fontSize: 11, color: '#4A3728', alignSelf: 'center', fontWeight: 600, background: '#D4B483', padding: '4px 10px', borderRadius: 12 },

  grid: { position: 'relative', display: 'grid', gap: 2, background: '#C9B98F', border: '2px solid #4A3728', borderRadius: 4, padding: 6, width: 'fit-content', maxWidth: '100%', overflow: 'auto' },
  cell: { background: 'repeating-linear-gradient(135deg, #DECBB0, #DECBB0 6px, #D7C1A0 6px, #D7C1A0 12px)', border: '1px solid #C9B98F', cursor: 'pointer', position: 'relative' },
  cellDragPreview: { background: 'rgba(92,122,79,0.45)' },
  groundSquareInner: { width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sqftCellEmpty: { background: 'rgba(92,122,79,0.35)' },

  bedOverlay: { position: 'absolute', background: '#B98452', backgroundImage: 'repeating-linear-gradient(90deg, #B98452, #B98452 5px, #A9764A 5px, #A9764A 10px)', border: '2px solid #6b4a2c', borderRadius: 2, padding: 2 },
  bedOverlayAluminum: {
    background: '#CDD3D8',
    backgroundImage: 'repeating-linear-gradient(90deg, #E8ECEF 0px, #E8ECEF 2px, #B4BCC2 2px, #B4BCC2 4px, #9AA3AA 4px, #9AA3AA 5px)',
    border: '2px solid #7C868E',
    boxShadow: 'inset 0 0 4px rgba(255,255,255,0.6)',
  },
  barrelOverlay: { position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', background: 'rgba(61,43,31,0.12)', borderRadius: '50%' },
  spigotOverlay: { position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', background: 'rgba(143,166,184,0.18)', borderRadius: '50%' },
  sourceOn: { boxShadow: '0 0 0 3px #5C9BD5, 0 0 10px 2px rgba(92,155,213,0.7)', background: 'rgba(92,155,213,0.25)' },
  onIndicator: { position: 'absolute', top: -6, right: -4, fontSize: 11 },
  deleteFixtureBtn: { position: 'absolute', bottom: -6, right: -6, width: 16, height: 16, borderRadius: '50%', background: '#A33', color: '#fff', border: '1px solid #4A3728', fontSize: 9, lineHeight: '14px', cursor: 'pointer', padding: 0, zIndex: 2 },
  pipeSvgLayer: { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' },
  cellPipeStart: { outline: '2px dashed #4A5D6E', outlineOffset: -2 },
  deleteBedBtn: { position: 'absolute', top: -8, right: -8, width: 18, height: 18, borderRadius: '50%', background: '#A33', color: '#fff', border: '1px solid #4A3728', fontSize: 10, lineHeight: '16px', cursor: 'pointer', padding: 0, zIndex: 2 },
  bedDims: { position: 'absolute', top: -16, left: 2, fontSize: 9, fontWeight: 700, color: '#4A3728' },
  sqftGrid: { display: 'grid', gap: 1, width: '100%', height: '100%' },
  sqftCell: { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', flexDirection: 'column' },
  sqftCellTransplantTarget: { background: 'rgba(143,166,184,0.5)' },
  miniGrid: { display: 'grid', gap: 0, width: '90%', height: '90%', alignItems: 'center', justifyItems: 'center' },
  healthBarWrap: { position: 'absolute', bottom: 1, left: '10%', width: '80%', height: 2, background: 'rgba(0,0,0,0.3)', borderRadius: 2 },
  stageBadge: { position: 'absolute', top: -3, right: -3, fontSize: 10, background: '#5C7A4F', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 1px #fff' },
  stageBadgeWarn: { background: '#C16B3D' },
  stageBadgeDanger: { background: '#A33' },
  healthBarFill: { height: '100%', borderRadius: 2 },
  hint: { marginTop: 10, fontSize: 12, color: '#6b5844', fontStyle: 'italic' },

  sidebar: { flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 240 },
  shopPanel: { background: '#F7F2E7', border: '1.5px solid #B8A98A', borderRadius: 4, padding: 12 },
  panelTitle: { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#4A3728', marginBottom: 8 },
  methodRow: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  methodBtn: { flex: '1 1 auto', background: '#EDE6D6', border: '1px solid #C9B98F', borderRadius: 3, padding: '6px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#4A3728' },
  methodBtnActive: { background: '#8FA6B8', color: '#22303A', borderColor: '#4A3728' },
  seedList: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' },
  seedRow: { display: 'flex', alignItems: 'center', background: '#EDE6D6', border: '1px solid #C9B98F', borderRadius: 3, padding: '6px 8px', cursor: 'pointer', color: '#3D2B1F', fontFamily: sans, width: '100%' },
  seedRowActive: { background: '#5C7A4F', color: '#fff', borderColor: '#4A3728' },
  soilPickRow: { display: 'flex', alignItems: 'center', gap: 6, background: '#EDE6D6', border: '1px solid #C9B98F', borderRadius: 3, padding: '6px 8px', cursor: 'pointer' },
  soilPickRowActive: { borderColor: '#4A3728', background: '#E3D9BF' },
  logPanel: { background: '#F7F2E7', border: '1.5px solid #B8A98A', borderRadius: 4, padding: 12 },
  logLine: { fontSize: 12, padding: '4px 0', borderBottom: '1px dashed #D7C9AC', color: '#5a4a38' },
  scorePanel: { background: '#4A3728', color: '#EDE6D6', borderRadius: 4, padding: 12, textAlign: 'center' },
  scoreValue: { fontFamily: serif, fontSize: 24, fontWeight: 700 },

  tableSurface: { background: '#8b6b47', backgroundImage: 'repeating-linear-gradient(90deg, #8b6b47, #8b6b47 8px, #7d5f3f 8px, #7d5f3f 16px)', border: '2px solid #4A3728', borderRadius: 4, padding: 14, minHeight: 200 },
  trayBlock: { background: 'rgba(0,0,0,0.15)', borderRadius: 4, padding: 10 },
  trayLabel: { fontSize: 11, fontWeight: 700, color: '#EDE6D6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  tableGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 },
  trayThumb: { background: 'rgba(0,0,0,0.2)', borderRadius: 4, padding: 10, textAlign: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)' },
  backLink: { background: 'none', border: 'none', color: '#4A3728', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginBottom: 8, padding: 0, textDecoration: 'underline' },
  fillSoilBtn: { background: '#F7F2E7', border: '1px solid #B8A98A', borderRadius: 3, padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#4A3728' },
  warnBanner: { background: '#E8968A', color: '#3D2B1F', fontSize: 11, fontWeight: 700, padding: '8px 10px', borderRadius: 4, marginBottom: 4 },
  stratRow: { display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 4, padding: '8px 10px' },
  transplantBtnSmall: { background: '#5C7A4F', color: '#fff', border: 'none', borderRadius: 3, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  trayGrid: { display: 'grid', gap: 3 },
  trayCell: { aspectRatio: '1', background: '#3D2B1F', border: '1px solid #241a12', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minWidth: 20, fontSize: 13, position: 'relative' },
  trayCellDeleteBtn: { position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#A33', color: '#fff', border: '1px solid #241a12', fontSize: 8, lineHeight: '12px', cursor: 'pointer', padding: 0 },
  deleteTrayBtn: { background: 'transparent', border: '1px solid #8FA6B8', color: '#D4B483', borderRadius: 3, padding: '3px 8px', fontSize: 10, cursor: 'pointer' },
  trayCellReady: { background: '#5C7A4F', boxShadow: '0 0 0 1px #EDE6D6 inset' },
  trayCellFailed: { background: '#5a2a2a' },

  subTabRow: { display: 'flex', gap: 8, marginBottom: 14 },
  subTabBtn: { background: '#F7F2E7', border: '1.5px solid #B8A98A', borderRadius: 3, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#4A3728' },
  subTabBtnActive: { background: '#5C7A4F', color: '#fff', borderColor: '#4A3728' },
  shopGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 },
  materialGroupLabel: { fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#4A3728', margin: '18px 0 8px', borderBottom: '1px solid #B8A98A', paddingBottom: 4 },
  shopCard: { background: '#F7F2E7', border: '1.5px solid #B8A98A', borderRadius: 4, padding: 12, textAlign: 'center' },
  buyBtn: { width: '100%', background: '#4A3728', color: '#EDE6D6', border: 'none', borderRadius: 3, padding: '7px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 6 },
  sellBtn: { width: '100%', background: 'transparent', color: '#6b5844', border: '1px solid #B8A98A', borderRadius: 3, padding: '6px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  stepperRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
  stepperBtnSmall: { width: 26, height: 26, borderRadius: '50%', border: '1.5px solid #4A3728', background: '#8FA6B8', color: '#22303A', fontSize: 14, fontWeight: 700, cursor: 'pointer', lineHeight: 1, padding: 0 },
  stepperCountSmall: { textAlign: 'center', minWidth: 34 },

  catalogGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', gap: 6, background: '#3D2B1F', padding: 10, borderRadius: 4 },
  catalogCell: { aspectRatio: '1', background: '#5a4632', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  catalogCellOwned: { background: '#6b5238', boxShadow: 'inset 0 0 0 2px #8FA6B8' },
  catalogCheck: { position: 'absolute', bottom: 1, right: 2, fontSize: 9, color: '#5C7A4F', fontWeight: 900 },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(61,43,31,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 },
  modalCard: { background: '#F7F2E7', border: '2px solid #4A3728', borderRadius: 4, padding: 24, maxWidth: 380, width: '100%', boxShadow: '4px 4px 0 #4A3728' },
  quizOption: { display: 'block', width: '100%', textAlign: 'left', background: '#EDE6D6', border: '1px solid #C9B98F', borderRadius: 3, padding: '8px 10px', marginBottom: 6, cursor: 'pointer', color: '#3D2B1F', fontFamily: sans },
  modalClose: { marginTop: 8, background: 'transparent', border: 'none', color: '#6b5844', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' },
};
