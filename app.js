const React = window.React;
const { useState, useEffect, useRef, useCallback, useId } = React;
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
const CEMENT_BUNDLES = [
    { id: 'cement-10', sqFt: 10, cost: 40 },
    { id: 'cement-25', sqFt: 25, cost: 95 },
    { id: 'cement-50', sqFt: 50, cost: 180 },
];
const STICK_BUNDLES = [
    { id: 'sticks-10', sqFt: 10, cost: 8 },
    { id: 'sticks-25', sqFt: 25, cost: 18 },
    { id: 'sticks-50', sqFt: 50, cost: 32 },
];
const LEAVES_ITEM = { id: 'leaves', name: 'Bag of Leaves', icon: '🍂', cost: 2, desc: 'Dry leaves — a "brown," carbon-rich compost ingredient.' };
const CARDBOARD_ITEM = { id: 'cardboard', name: 'Cardboard', icon: '📦', cost: 2, desc: 'Shredded cardboard — another carbon-rich "brown" for the compost bin.' };
const COMPOST_RECIPE = { deadMatter: 1, leaves: 0, cardboard: 0, soil: 0 };
const COMPOST_DAYS = 18;
const COMPOST_YIELD = 2;
const COMPOSTABLE_KEYS = ['deadMatter','leaves','cardboard','coffeegrounds','bananapeels','eggshells'];
function compostIngredientValue(key) {
    if (key === 'deadMatter' || key === 'coffeegrounds' || key === 'bananapeels') return { green: 1, brown: 0, nutrient: 1.2 };
    if (key === 'leaves' || key === 'cardboard') return { green: 0, brown: 1, nutrient: .65 };
    if (key === 'eggshells') return { green: 0, brown: .3, nutrient: .9 };
    return { green: 0, brown: 0, nutrient: .5 };
}
function compostStats(ingredients) {
    const ing = ingredients || {};
    let total = 0, greens = 0, browns = 0, nutrients = 0;
    COMPOSTABLE_KEYS.forEach((k) => {
        const n = Math.max(0, Number(ing[k] || 0));
        const v = compostIngredientValue(k);
        total += n; greens += n * v.green; browns += n * v.brown; nutrients += n * v.nutrient;
    });
    const balanced = greens > 0 && browns > 0;
    const balanceBonus = balanced ? Math.min(greens, browns) / Math.max(greens, browns) : 0;
    const daysNeeded = Math.max(6, Math.round(COMPOST_DAYS - Math.min(8, total * .8) - balanceBonus * 4));
    const nutrientScore = Math.max(1, Math.round((nutrients + balanceBonus * 3) * 10) / 10);
    const yieldCount = Math.max(1, Math.min(8, Math.floor(total / 2) + 1));
    return { total, greens, browns, balanced, balanceBonus, daysNeeded, nutrientScore, yieldCount };
}
const BURN_RECOVERY_DAYS = 14; // about two calendar months in the compressed 80-day game year
// ---------- HOMEMADE FERTILIZERS ----------
// Real natural fertilizer techniques: gather raw kitchen/garden scraps, steep them into liquid feeds.
const EGGSHELL_ITEM = { id: 'eggshells', name: 'Crushed Eggshells', icon: '🥚', cost: 2, desc: 'Calcium-rich — best ground fine or steeped, since whole shells break down too slowly to help this season.' };
const BANANAPEEL_ITEM = { id: 'bananapeels', name: 'Banana Peels', icon: '🍌', cost: 2, desc: 'Rich in potassium — bury directly, dry and crush, or steep into a "tea" like this recipe does.' };
const COFFEEGROUNDS_ITEM = { id: 'coffeegrounds', name: 'Coffee Grounds', icon: '☕', cost: 2, desc: "Mild nitrogen — best composted first, since fresh grounds are acidic enough to stress seedlings." };
const FERTILIZER_RECIPES = [
    {
        id: 'calciumtea', name: 'Calcium Tea', icon: '🥚', ingredient: 'eggshells', ingredientCost: 3, days: 4, yieldAmt: 3,
        desc: 'Crushed eggshells steeped in water. Prevents blossom end rot on tomatoes, peppers, squash, and melons — the real cause is a calcium shortage at the fruit, often made worse by uneven watering.',
    },
    {
        id: 'potassiumbrew', name: 'Potassium Brew', icon: '🍌', ingredient: 'bananapeels', ingredientCost: 3, days: 4, yieldAmt: 3,
        desc: 'Banana peels steeped into a potassium-rich tea. Potassium supports fruiting and flowering — treated plants yield noticeably better fruit.',
    },
    {
        id: 'comfreytea', name: 'Comfrey Tea', icon: '🟩', ingredient: 'comfreyleaves', ingredientCost: 3, days: 6, yieldAmt: 3,
        desc: "Comfrey is a \"dynamic accumulator\" — its deep roots pull nutrients up from far below the topsoil. Steeped leaves make a balanced, general-purpose liquid feed for any plant.",
    },
];
// Fruiting vegetables where calcium deficiency (often paired with inconsistent watering) causes real
// blossom end rot — a dark, sunken, unsellable patch at the fruit's blossom end.
const BER_SUSCEPTIBLE = ['tomato', 'tomatoindeterminate', 'pepper', 'squash', 'cucumber', 'watermelon', 'cantaloupe'];
const BER_DAILY_CHANCE = 0.025; // per eligible unwatered/unprotected plant, per day
const BER_SELLVALUE_PENALTY = 0.5; // spoiled-looking fruit sells for half
// ---------- COMPANION PLANTING ----------
// Real, well-documented pairings. Good neighbors give a small daily health bonus; bad neighbors
// (mostly fennel, which is famously allelopathic — it inhibits growth in most nearby plants — plus
// alliums stunting legumes) give a small daily penalty. Checked against orthogonally adjacent squares.
const GOOD_COMPANIONS = [
    ['tomato', 'garlic'], ['tomato', 'carrot'], ['tomato', 'lettuce'],
    ['carrot', 'garlicchives'], ['carrot', 'chives'],
    ['bean', 'squash'], ['cucumber', 'garlic'], ['cucumber', 'dill'],
    ['kale', 'rosemary'], ['squash', 'dill'],
];
const BAD_COMPANIONS = [
    ['tomato', 'fennel'], ['carrot', 'fennel'], ['lettuce', 'fennel'], ['squash', 'fennel'],
    ['bean', 'garlic'], ['bean', 'chives'], ['bean', 'garlicchives'],
];
function companionRelation(idA, idB) {
    const good = GOOD_COMPANIONS.some(([a, b]) => (a === idA && b === idB) || (a === idB && b === idA));
    if (good)
        return 'good';
    const bad = BAD_COMPANIONS.some(([a, b]) => (a === idA && b === idB) || (a === idB && b === idA));
    if (bad)
        return 'bad';
    return null;
}
// Mulch: applied on top of soil in a bed/ground square. Real effects — cuts weed sprouting chance and
// slows moisture loss (less water-related health decay), matching how mulch actually works in a garden.
const MULCH_TYPES = [
    { id: 'pinebark', name: 'Pine Bark Mulch', icon: null, cost: 4, weedReduction: 0.6, moistureBonus: 0.25, heatProtection: 0.1, soilHealthPenalty: 0, desc: 'Chunky, slow to break down — strong weed suppression and good moisture retention.' },
    { id: 'cedarmulch', name: 'Cedar Mulch', icon: null, cost: 5, weedReduction: 0.65, moistureBonus: 0.2, heatProtection: 0.1, soilHealthPenalty: 0, desc: 'Naturally pest-resistant and long-lasting — great all-around weed barrier.' },
    { id: 'pineneedles', name: 'Pine Needles', icon: null, cost: 3, weedReduction: 0.45, moistureBonus: 0.2, heatProtection: 0.05, soilHealthPenalty: 0, desc: 'Light and airy — decent weed suppression, especially good for acid-loving plants.' },
    { id: 'straw', name: 'Straw', icon: null, cost: 2, weedReduction: 0.4, moistureBonus: 0.15, heatProtection: 0.1, soilHealthPenalty: 0, desc: 'Cheap and classic for vegetable beds — moderate weed suppression, breaks down fast.' },
    { id: 'woodmulch', name: 'Wood Mulch', icon: null, cost: 4, weedReduction: 0.55, moistureBonus: 0.2, heatProtection: 0.1, soilHealthPenalty: 0, desc: 'General-purpose shredded wood — solid weed suppression and moisture retention.' },
    { id: 'rocks', name: 'Rocks', icon: '🪨', cost: 6, weedReduction: 0.35, moistureBonus: 0.05, heatProtection: 0, soilHealthPenalty: 0, desc: "Doesn't break down or feed the soil, but permanent — lowest moisture benefit of the group." },
    { id: 'shadecloth', name: 'Shade Cloth', icon: null, cost: 8, weedReduction: 0.15, moistureBonus: 0.15, heatProtection: 0.7, soilHealthPenalty: 0, desc: 'Woven fabric cover — the real answer to heat waves. Cuts sun/heat stress far more than any mulch, modest weed and moisture benefit on the side.' },
    { id: 'weedcloth', name: 'Weed Cloth', icon: null, cost: 5, weedReduction: 0.85, moistureBonus: 0.3, heatProtection: 0.15, soilHealthPenalty: 0.15, desc: "Woven landscape fabric — the single best weed barrier here, but it's a real tradeoff: it blocks organic matter from working into the soil and stops earthworms and microbes from moving freely, so soil health quietly declines the longer it's down." },
];
// Yard weed types. Most ordinary weeds can be composted as nitrogen-rich "greens".
// Pokeweed is treated as a bad weed in gameplay and must be disposed of instead of composted.
const WEED_TYPES = [
    { id: 'common', name: 'Common Weed', icon: '🌿', compostable: true, weight: 5 },
    { id: 'dandelion', name: 'Dandelion', icon: '🌱', compostable: true, weight: 3 },
    { id: 'chickweed', name: 'Chickweed', icon: '☘️', compostable: true, weight: 3 },
    { id: 'crabgrass', name: 'Crabgrass', icon: '🌾', compostable: true, weight: 3 },
    { id: 'pokeweed', name: 'Pokeweed', icon: '☠️', compostable: false, weight: 1 },
];
function randomWeedTypeId() {
    const pool = WEED_TYPES.flatMap((w) => Array(w.weight || 1).fill(w.id));
    return pool[Math.floor(Math.random() * pool.length)] || 'common';
}
function getWeedInfo(weed) {
    return WEED_TYPES.find((w) => w.id === (weed === null || weed === void 0 ? void 0 : weed.weedType)) || WEED_TYPES[0];
}
// Can = simple owned count, click-to-water. Spigot = a fixture placed once. PVC = bought in feet, run pipe-to-pipe.
// Watering tools — can be bought/removed anytime.
const WATER_TOOLS = [
    { id: 'can', name: 'Watering Can', icon: '🫗', cost: 5, coverage: 'square', desc: 'Waters one square per click. Cheap, but slow for a big garden.' },
];
const SPIGOT = { id: 'spigot', name: 'Water Spigot', icon: '🚰', cost: 40, desc: 'An outdoor spigot fixture. Place it once, then touch it to turn the water on or off.' };
const PVC_BUNDLES = [
    { id: 'pvc-10', feet: 10, cost: 3 },
    { id: 'pvc-50', feet: 50, cost: 13 },
];
const RAIN_BARREL = { id: 'barrel', name: 'Rain Barrel (50gal)', icon: '🛢️', cost: 25, capacity: 50, refillPerDay: 4 };
// ---------- GREENHOUSES ----------
// Footprints are measured in the same 1-foot yard grid used for beds.
const GREENHOUSE_TYPES = [
    { id: 'gh4x4', name: '4×4 Greenhouse', w: 4, h: 4, cost: 180, plantSlots: 6, decorSlots: 3, icon: '🏡', desc: 'Compact starter greenhouse for a few frost-tender crops.' },
    { id: 'gh6x6', name: '6×6 Greenhouse', w: 6, h: 6, cost: 320, plantSlots: 12, decorSlots: 5, icon: '🏡', desc: 'Room for a mixed warm-season crop collection.' },
    { id: 'gh8x10', name: '8×10 Greenhouse', w: 8, h: 10, cost: 650, plantSlots: 24, decorSlots: 8, icon: '🏡', desc: 'Large growing house with space for serious year-round production.' },
    { id: 'gh6x12', name: '6×12 Greenhouse', w: 12, h: 6, cost: 590, plantSlots: 22, decorSlots: 8, icon: '🏡', desc: 'Long greenhouse that fits rows, benches, and climbing crops.' },
];
const KRATKY_SYSTEM = { id: 'kratky', name: 'Kratky Hydroponics Kit', icon: '🫙', cost: 32, slots: 4, desc: 'A passive, pump-free hydroponic reservoir. As plants drink, the falling solution creates the air gap their upper roots need.' };
const KRATKY_CROP_IDS = new Set(['lettuce','spinach','kale','bokchoy','basil','cilantro','parsley','arugula','chard','strawberry']);
function kratkyCropSuitable(p) { return !!p && (KRATKY_CROP_IDS.has(p.id) || /lettuce|spinach|kale|bok|basil|cilantro|parsley|arugula|chard|strawber|herb/i.test(`${p.id || ''} ${p.name || ''}`)); }
const GREENHOUSE_DECOR = [
    { id: 'pottingbench', name: 'Potting Bench', icon: '🪵', cost: 35, desc: 'A dedicated work surface for your greenhouse.' },
    { id: 'shelving', name: 'Plant Shelving', icon: '🗄️', cost: 28, desc: 'Vertical storage and seedling display space.' },
    { id: 'growlight', name: 'Greenhouse Grow Light', icon: '💡', cost: 45, desc: 'Functional: plants mature about 20% faster while installed.' },
    { id: 'heater', name: 'Greenhouse Heater', icon: '♨️', cost: 55, desc: 'Functional: reinforces protection for tender crops in winter.' },
    { id: 'ventfan', name: 'Circulation / Vent Fan', icon: '🌀', cost: 40, desc: 'Functional: reduces greenhouse heat-wave stress.' },
    { id: 'hangingbaskets', name: 'Hanging Baskets', icon: '🪴', cost: 24, desc: 'Adds overhead greenery and character.' },
    { id: 'thermometer', name: 'Thermometer', icon: '🌡️', cost: 15, desc: 'A small climate-monitoring detail for the greenhouse.' },
];
// ---------- PONDS ----------
// Pond footprints use the same 1-foot yard grid as beds and greenhouses.
const POND_TYPES = [
    { id: 'pond1x1', name: '1×1 Mini Pond', w: 1, h: 1, cost: 38, fishSlots: 2, icon: '💧', desc: 'A tiny water feature for aquatic plants and a very small number of mosquito-control fish.' },
    { id: 'pond2x2', name: '2×2 Patio Pond', w: 2, h: 2, cost: 65, fishSlots: 4, icon: '💧', desc: 'Small patio-scale pond with enough water volume for mosquitofish or a couple of goldfish.' },
    { id: 'pond3x3', name: '3×3 Wildlife Pond', w: 3, h: 3, cost: 95, fishSlots: 6, icon: '💧', desc: 'A compact backyard pond for a few small fish and wildlife.' },
    { id: 'pond4x6', name: '4×6 Garden Pond', w: 6, h: 4, cost: 185, fishSlots: 12, icon: '💧', desc: 'A medium pond with room for goldfish, mosquito control, and landscaping.' },
    { id: 'pond6x8', name: '6×8 Koi Pond', w: 8, h: 6, cost: 340, fishSlots: 20, icon: '💧', desc: 'A larger ornamental pond with enough space for koi and mixed fish.' },
];
const POND_FISH = [
    { id: 'goldfish', name: 'Goldfish', icon: '🐠', cost: 8, mosquitoControl: 0.25, minPondArea: 4, desc: 'Hardy ornamental fish. They may eat mosquito larvae, but need more water volume than a mini pond.' },
    { id: 'mosquitofish', name: 'Mosquitofish', icon: '🐟', cost: 5, mosquitoControl: 0.85, minPondArea: 1, desc: 'Small surface-feeding fish that actively eat mosquito larvae. They can be invasive in some regions, so local rules matter.' },
    { id: 'koi', name: 'Koi', icon: '🐟', cost: 25, mosquitoControl: 0.15, minPondArea: 24, desc: 'Large ornamental carp for bigger ponds. Beautiful, but require the larger garden/koi pond footprints.' },
];
function pondFishCount(pond) {
    return Object.values((pond === null || pond === void 0 ? void 0 : pond.fish) || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
}
function pondMosquitoControl(pond) {
    const total = pondFishCount(pond);
    if (!total)
        return 0;
    const weighted = POND_FISH.reduce((sum, fish) => { var _a; return sum + (((_a = pond === null || pond === void 0 ? void 0 : pond.fish) === null || _a === void 0 ? void 0 : _a[fish.id]) || 0) * fish.mosquitoControl; }, 0);
    return Math.max(0, Math.min(1, weighted / Math.max(1, total)));
}
// ---------- TRELLISES ----------
const TRELLIS_TYPES = [
    { id: 'woodtrellis', name: 'Wood Trellis', icon: '🪵', cost: 28, growthMult: 1.10, desc: 'Classic lattice support for cucumbers, peas, pole beans, and other climbing vines.' },
    { id: 'cattlepanel', name: 'Cattle Panel Arch', icon: '⌒', cost: 48, growthMult: 1.15, footprintW: 3, footprintH: 2, desc: 'A curved galvanized cattle-panel tunnel. Place it over a bed or open-ground planting area; vines can be planted underneath and will climb up and over the arch.' },
    { id: 'tpostnet', name: 'T-Post + Garden Net Trellis', icon: '🕸️', cost: 36, growthMult: 1.12, desc: 'Two T-posts with reusable garden netting. Flexible support for peas, beans, cucumbers, tomatoes, and lighter vines.' },
];
// ---------- PROTECTION, PLANTERS & PATHS ----------
const TREE_BUSH_NET = { id: 'treebushnet', name: 'Plant Insect Net', icon: '🕸️', cost: 18, protection: 0.72, desc: 'Fine reusable netting placed over a living crop, bush, or tree to greatly reduce insect attack. Remove or open it during bloom when pollinators need access.' };
const PATH_TYPES = [
    { id: 'brickpath', name: 'Brick Path', icon: '🧱', cost: 5, desc: 'One square of durable brick pathway.' },
    { id: 'stonepath', name: 'Natural Rock Path', icon: '🪨', cost: 4, desc: 'One square of natural stone pathway.' },
];
const PLANTER_BUCKET_TYPES = [1, 5, 10, 15, 20, 25, 30, 40, 50].map((gallons) => ({
    id: `bucket${gallons}`, gallons, name: `${gallons}-gal Planter Bucket`, icon: '🪣', cost: Math.max(4, Math.round(3 + gallons * 0.75)),
    desc: `${gallons} gallons of soil capacity. Larger crops need larger containers.`
}));
function planterGallonsNeeded(plant) {
    if (!plant)
        return 1;
    if (plant.growthForm === 'tree' || plant.movableTree)
        return 25;
    if (plant.growthForm === 'shrub')
        return 15;
    if (['tomato', 'tomatoindeterminate', 'pepper', 'eggplant', 'corn', 'okra'].includes(plant.id))
        return 5;
    if (plant.category === 'cucurbits')
        return 10;
    if (plant.category === 'fruit')
        return 5;
    return plant.perSqFt >= 9 ? 1 : plant.perSqFt >= 4 ? 2 : 3;
}
function isTreeOrBush(plant) { return !!plant && (plant.growthForm === 'tree' || plant.growthForm === 'shrub' || plant.movableTree); }
function monthInWindow(month, months) { return !months || months.length === 0 || months.includes(month); }
function seasonalFruitSummary(plant) {
    if (!(plant === null || plant === void 0 ? void 0 : plant.bloomMonths) && !(plant === null || plant === void 0 ? void 0 : plant.harvestMonths))
        return '';
    const fmt = (arr) => (arr === null || arr === void 0 ? void 0 : arr.map((m) => MONTH_NAMES[m - 1].slice(0, 3)).join('–')) || 'varies';
    return `🌸 Bloom: ${fmt(plant.bloomMonths)} · 🧺 Harvest: ${fmt(plant.harvestMonths)}`;
}
const VINE_PLANT_IDS = new Set([
    'cucumber', 'squash', 'watermelon', 'cantaloupe', 'polebean', 'limabean', 'yardlongbean', 'cowpea', 'honeydew', 'canarymelon', 'luffa',
    'grape', 'hardykiwi', 'sweetpotato', 'snowpea', 'fieldpea', 'trumpethoneysuckle', 'tomatoindeterminate'
]);
const MELON_IDS = new Set(['watermelon', 'cantaloupe']);
const MELON_DRY_DAY_GRACE = 2;
const MELON_SALVAGE_DAYS = 2;
function isViningPlant(plant) { return !!plant && VINE_PLANT_IDS.has(plant.id); }
function isMelonPlant(plant) { return !!plant && MELON_IDS.has(plant.id); }
function isMelonSalvageable(plant) {
    return !!plant && isMelonPlant(plant) && plant.dead && !plant.harvested && plant.age >= plant.daysToMature &&
        !plant.salvageExpired && Number(plant.salvageDaysLeft || 0) > 0;
}
const LEGUME_SOIL_BUILDERS = new Set(['bushbean', 'polebean', 'limabean', 'yardlongbean', 'cowpea', 'favabean', 'snowpea', 'fieldpea', 'crimsonclover', 'hairyvetch', 'lupine']);
function soilBuilderProfile(plant) {
    if (!plant)
        return null;
    return plant.soilBuilder || (LEGUME_SOIL_BUILDERS.has(plant.id) ? { n: 0.65, organic: 0.15, aeration: 0.05 } : null);
}
// ---------- MOVABLE TREE CONTAINERS ----------
// Heat-loving perennial fruit can spend the warm season outdoors, then be rolled into a greenhouse before frost.
const TREE_CONTAINER_TYPES = [
    { id: 'treepot25', name: '25-gal Rolling Tree Container', icon: '🪴', cost: 38, desc: 'Large wheeled container for a young tropical/subtropical fruit tree. Move it between yard and greenhouse.' },
    { id: 'treepot35', name: '35-gal Heavy Tree Container', icon: '🪴', cost: 55, desc: 'Extra-large container for established heat-loving trees. Holds moisture longer and is suitable for overwintering.' },
];
const GREENHOUSE_TREE_CAPACITY = { gh4x4: 1, gh6x6: 2, gh8x10: 4, gh6x12: 3 };
function greenhouseTreeCapacity(typeId) { return GREENHOUSE_TREE_CAPACITY[typeId] || 1; }
function isMovableTreePlant(plant) { return !!(plant === null || plant === void 0 ? void 0 : plant.movableTree); }
const ELBOW_COST = 2; // cash cost per elbow fitting when bending a PVC run
// Embedded audio data (base64) for the two licensed tracks, compressed to 80kbps AAC so they can live
// directly in this single file and work inside a sandboxed artifact preview with no external file access.
const AUDIO_SLOWLY_SURELY = './assets/audio-slowly-surely.m4a';
const AUDIO_LONG_WALK = './assets/audio-long-walk.m4a';
// Background music "playlist": real licensed tracks (audioSrc, played via an <audio> element) plus a few
// procedurally generated fallback loops (played via the Web Audio API when no audioSrc is set).
// Embedded title-screen artwork (base64) — real vector illustration rasterized and optimized
// (2078 vector paths compressed to a single ~410KB PNG at display resolution).
const PLANTING_SEASON_HERO = "./assets/planting-season-hero.webp";
const MUSIC_TRACKS = [
    { id: 'slowlysurely', name: 'Slowly Surely', audioSrc: AUDIO_SLOWLY_SURELY },
    { id: 'alongwalk', name: 'A Long Walk', audioSrc: AUDIO_LONG_WALK },
    { id: 'morningmeadow', name: 'Morning Meadow', bpm: 76, notes: [261.6, 293.7, 329.6, 392.0, 440.0, 392.0, 329.6, 293.7, 261.6, 329.6, 392.0, 440.0] },
    { id: 'gentlebreeze', name: 'Gentle Breeze', bpm: 66, notes: [220.0, 261.6, 293.7, 329.6, 293.7, 261.6, 220.0, 196.0, 220.0, 261.6, 293.7, 220.0] },
    { id: 'harvesttime', name: 'Harvest Time', bpm: 88, notes: [329.6, 392.0, 440.0, 493.9, 440.0, 392.0, 349.2, 392.0, 329.6, 293.7, 329.6, 392.0] },
];
// ---------- PESTS ----------
const PESTS = {
    aphids: {
        id: 'aphids', name: 'Aphids', icon: '🐛', dailyDamage: 8,
        why: 'Sap-feeding aphids gather on tender new growth. Lush soft growth and stressed plants can make colonies easier to establish.',
        remove: 'Knock or rinse colonies from tender growth, then keep checking new leaves and the undersides of foliage.',
        prevention: ['Encourage ladybugs and green lacewings.', 'Inspect tender new growth early so a small colony never becomes a large one.', 'Keep plants evenly watered and avoid pushing excessive soft growth.'],
        preferredBeneficials: ['ladybugs', 'lacewings'],
    },
    junebugs: {
        id: 'junebugs', name: 'June Bugs', icon: '🪲', dailyDamage: 12,
        why: 'Adult June bugs chew foliage while their grubs develop in soil and turf. Gardens beside lawn or moist organic soil can see repeat beetle pressure.',
        remove: 'Hand-pick visible adults from plants. Beneficial nematodes are the strongest long-term tool here because they attack the soil-dwelling grubs.',
        prevention: ['Use beneficial nematodes against grubs in the soil.', 'Check foliage in the evening when adult beetles are easier to find.', 'Keep plants healthy so chewing damage is less likely to overwhelm them.'],
        preferredBeneficials: ['nematodes', 'rovebeetles'],
    },
    rootmaggots: {
        id: 'rootmaggots', name: 'Root Maggots', icon: '🪱', dailyDamage: 11,
        why: 'Root-maggot larvae feed below ground on roots and underground stems. Brassicas, onions, and root crops are especially vulnerable in cool moist soil.',
        remove: 'Remove badly damaged plants and avoid leaving infested roots in the bed. Beneficial nematodes and soil predators can attack larvae in the root zone.',
        prevention: ['Rotate susceptible crops.', 'Use beneficial nematodes or rove beetles in the soil.', 'Keep beds free of badly infested roots and avoid repeatedly planting the same host family in one spot.'],
        preferredBeneficials: ['nematodes', 'rovebeetles'],
    },
    rootaphids: {
        id: 'rootaphids', name: 'Root Aphids', icon: '🪱', dailyDamage: 9,
        why: 'Root aphids feed on roots below the soil line, causing unexplained wilting, poor growth, and nutrient-like symptoms even when the soil looks adequate.',
        remove: 'Inspect the root zone of a struggling plant. Soil predators and beneficial nematodes can reduce populations; severely infested roots should be removed.',
        prevention: ['Keep transplants and potting media clean.', 'Encourage a diverse soil food web.', 'Use beneficial nematodes and rove beetles when a root-zone infestation is confirmed.'],
        preferredBeneficials: ['nematodes', 'rovebeetles'],
    },
};
function pestReasonForPlant(pestId, plant) {
    const pest = PESTS[pestId];
    if (!pest || !plant)
        return '';
    const reasons = [pest.why];
    if ((plant.health || 100) < 70)
        reasons.push(`${plant.name} is already stressed at ${Math.round(plant.health || 0)}% health, which makes pest damage more serious.`);
    if ((plant.daysUnwatered || 0) >= 2)
        reasons.push('Water stress is also present, so the plant has less reserve to recover from feeding damage.');
    if (pestId === 'aphids' && ['fruit', 'otherherbs', 'mint'].includes(plant.category))
        reasons.push(`${plant.name} produces the kind of tender growing tips aphids commonly exploit.`);
    if (pestId === 'junebugs')
        reasons.push('The beetles are not necessarily attracted to this crop alone; the surrounding yard and soil can create the pest pressure.');
    if (pestId === 'rootmaggots')
        reasons.push('This crop is a known root-maggot host, so the damage is happening below ground rather than mainly on the leaves.');
    if (pestId === 'rootaphids')
        reasons.push('Root aphids can make a plant look drought- or nutrient-stressed even when the visible foliage has few insects.');
    return reasons.join(' ');
}
const PEST_INFEST_CHANCE = 0.03; // per living plant, per day, while growing season is active
const PEST_AphidWeight = 0.65; // legacy weighting retained for older saves
const ROOT_MAGGOT_HOSTS = new Set(['carrot', 'radish', 'beet', 'turnip', 'rutabaga', 'cabbage', 'pakchoi', 'tatsoi', 'brusselssprouts', 'garlic', 'chives', 'onionshort', 'oniondayneutral', 'onionlong']);
const ROOT_APHID_HOSTS = new Set(['lettuce', 'carrot', 'beet', 'corn', 'tomato', 'tomatoindeterminate', 'pepper', 'eggplant', 'strawberry', 'bushbean', 'polebean', 'cowpea']);
function pestCandidatesForPlant(plant) {
    const weighted = [{ id: 'aphids', weight: 0.55 }, { id: 'junebugs', weight: 0.30 }];
    if (ROOT_MAGGOT_HOSTS.has(plant === null || plant === void 0 ? void 0 : plant.id))
        weighted.push({ id: 'rootmaggots', weight: 0.55 });
    if (ROOT_APHID_HOSTS.has(plant === null || plant === void 0 ? void 0 : plant.id))
        weighted.push({ id: 'rootaphids', weight: 0.45 });
    const total = weighted.reduce((sum, x) => sum + x.weight, 0);
    let roll = Math.random() * total;
    for (const item of weighted) {
        roll -= item.weight;
        if (roll <= 0)
            return item.id;
    }
    return weighted[0].id;
}
function beneficialEffectForPest(bug, pestId) {
    if (!bug)
        return 0;
    if (pestId === 'aphids')
        return bug.vsAphids || 0;
    if (pestId === 'junebugs')
        return bug.vsJunebugs || 0;
    if (pestId === 'rootmaggots')
        return bug.vsRootMaggots || 0;
    if (pestId === 'rootaphids')
        return bug.vsRootAphids || 0;
    return 0;
}
// ---------- WEATHER ----------
// A daily chance of a weather event, independent of season/frost. Rain helps; freeze and heat wave hurt
// unless the player has prepared for them (freeze needs nothing special — it's just a smaller, random echo
// of seasonal frost; heat wave is mitigated by Shade Cloth).
const WEATHER_CHANCE = 0.05; // per day, while growing season is active
const WEATHER_WEIGHTS = { rain: 0.5, freeze: 0.2, heatwave: 0.3 };
const FREEZE_DAMAGE = 30; // half of a seasonal frost kill — a scare, not usually fatal on its own
const HEATWAVE_EXTRA_DECAY_MULT = 1.8; // how much worse water-related health decay gets in a heat wave
// Real predator/prey relationships: soil-dwelling hunters counter June Bug grubs well but do little for aphids;
// aphid specialists are the reverse. General predators are moderate against both.
const BENEFICIAL_BUGS = [
    { id: 'nematodes', name: 'Beneficial Nematodes', cost: 15, vsAphids: 0.1, vsJunebugs: 0.7, vsRootMaggots: 0.8, vsRootAphids: 0.55, duration: 14, desc: 'Microscopic beneficial worms that hunt soil pests — excellent against grubs and root maggots, useful against some root-zone pests.' },
    { id: 'earthworms', name: 'Beneficial Earthworms', cost: 12, vsAphids: 0, vsJunebugs: 0, vsRootMaggots: 0, vsRootAphids: 0, duration: 30, soilBuilder: true, desc: 'Soil-building worms. They do not hunt pests; they improve aggregation, aeration, organic-matter cycling, and nutrient availability over time.' },
    { id: 'lacewings', name: 'Green Lacewings', cost: 12, vsAphids: 0.6, vsJunebugs: 0.15, vsRootMaggots: 0.05, vsRootAphids: 0.1, duration: 10, desc: 'Voracious aphid predators, especially as larvae.' },
    { id: 'ladybugs', name: 'Ladybugs', cost: 10, vsAphids: 0.65, vsJunebugs: 0.1, vsRootMaggots: 0, vsRootAphids: 0.1, duration: 10, desc: 'Classic aphid hunters — a single ladybug can eat dozens a day.' },
    { id: 'mantids', name: 'Praying Mantids', cost: 14, vsAphids: 0.3, vsJunebugs: 0.35, vsRootMaggots: 0.05, vsRootAphids: 0.05, duration: 12, desc: 'General predators that ambush a wide range of above-ground garden pests.' },
    { id: 'assassinbugs', name: 'Assassin Bugs', cost: 13, vsAphids: 0.35, vsJunebugs: 0.3, vsRootMaggots: 0.05, vsRootAphids: 0.1, duration: 12, desc: 'Aggressive general predators of soft-bodied and larger pests alike.' },
    { id: 'rovebeetles', name: 'Rove Beetles', cost: 11, vsAphids: 0.15, vsJunebugs: 0.6, vsRootMaggots: 0.65, vsRootAphids: 0.35, duration: 12, desc: 'Soil-dwelling hunters that target beetle larvae, root maggots, and other small root-zone pests.' },
];
// ---------- AVATAR ----------
// Skin tones spanning a light-to-deep spectrum, inspired by inclusive foundation shade ranges (not exact
// trademarked shade numbers). Hairstyles and body types are player-chosen; age is fixed at 20-30, not selectable.
const SKIN_TONES = [
    '#FDE0C4', '#F5D0A9', '#EEC194', '#E3AD7C', '#D69A66', '#C68652',
    '#B37142', '#9C5F37', '#84502F', '#6B3F27', '#54311F', '#3E2417',
];
const HAIRSTYLES = [
    { id: 'afro', label: 'Afro' },
    { id: 'dreadlocks', label: 'Dreadlocks' },
    { id: 'boxbraids', label: 'Box Braids' },
    { id: 'islandtwists', label: 'Boho Island Twists' },
    { id: 'cornrows', label: 'Cornrows' },
    { id: 'ponytail', label: 'Ponytail' },
    { id: 'hairwrap', label: 'Colorful Hair Wrap' },
    { id: 'bald', label: 'Bald' },
    { id: 'taperedfade', label: 'Tapered Fade' },
];
const HAIR_COLORS = ['#1C1410', '#3B2417', '#5C3A21', '#8B5A2B', '#A65B2E', '#2E2E2E'];
const WRAP_COLORS = ['#C1443C', '#D98E2B', '#3F8F5F', '#3A6EA5', '#8E4B9E'];
const FACIAL_HAIR = [
    { id: 'none', label: 'None' },
    { id: 'stubble', label: 'Stubble' },
    { id: 'mustache', label: 'Mustache' },
    { id: 'goatee', label: 'Goatee' },
    { id: 'fullbeard', label: 'Full Beard' },
];
const BODY_TYPES = [
    { id: 'slender', label: 'Slender', widthMult: 0.82 },
    { id: 'slim', label: 'Slim', widthMult: 0.9 },
    { id: 'average', label: 'Average', widthMult: 1.0 },
    { id: 'thick', label: 'Thick', widthMult: 1.12 },
    { id: 'big', label: 'Big', widthMult: 1.26 },
];
const AVATAR_BODIES = [{ "id": "body-1", "label": "Skin 1", "src": "./assets/body-1.webp" }, { "id": "body-2", "label": "Skin 2", "src": "./assets/body-2.webp" }, { "id": "body-3", "label": "Skin 3", "src": "./assets/body-3.webp" }, { "id": "body-4", "label": "Skin 4", "src": "./assets/body-4.webp" }, { "id": "body-5", "label": "Skin 5", "src": "./assets/body-5.webp" }, { "id": "body-6", "label": "Skin 6", "src": "./assets/body-6.webp" }, { "id": "body-7", "label": "Skin 7", "src": "./assets/body-7.webp" }, { "id": "body-8", "label": "Skin 8", "src": "./assets/body-8.webp" }, { "id": "body-9", "label": "Skin 9", "src": "./assets/body-9.webp" }, { "id": "body-10", "label": "Skin 10", "src": "./assets/body-10.webp" }];
const AVATAR_HAIRS = [{ "id": "bald", "label": "Bald / No Hair", "src": null, "category": "Bald", "color": "None" }, { "id": "hair-afro-black", "label": "Afro Black", "src": "./assets/hair-afro-black.webp", "category": "Afros", "typeLabel": "Afro", "color": "Black" }, { "id": "hair-afro-brown", "label": "Afro Brown", "src": "./assets/hair-afro-brown.webp", "category": "Afros", "typeLabel": "Afro", "color": "Brown" }, { "id": "hair-afro-ginger", "label": "Afro Ginger", "src": "./assets/hair-afro-ginger.webp", "category": "Afros", "typeLabel": "Afro", "color": "Ginger" }, { "id": "hair-afro-blonde", "label": "Afro Blonde", "src": "./assets/hair-afro-blonde.webp", "category": "Afros", "typeLabel": "Afro", "color": "Blonde" }, { "id": "hair-picked-afro-black", "label": "Picked Afro Black", "src": "./assets/hair-picked-afro-black.webp", "thumbSrc": "./assets/asset-019.webp", "category": "Picked Afros", "typeLabel": "Picked Afro", "color": "Black" }, { "id": "hair-picked-afro-brown", "label": "Picked Afro Brown", "src": "./assets/hair-picked-afro-brown.webp", "thumbSrc": "./assets/asset-021.webp", "category": "Picked Afros", "typeLabel": "Picked Afro", "color": "Brown" }, { "id": "hair-picked-afro-ginger", "label": "Picked Afro Ginger", "src": "./assets/hair-picked-afro-ginger.webp", "thumbSrc": "./assets/asset-023.webp", "category": "Picked Afros", "typeLabel": "Picked Afro", "color": "Ginger" }, { "id": "hair-picked-afro-blonde", "label": "Picked Afro Blonde", "src": "./assets/hair-picked-afro-blonde.webp", "thumbSrc": "./assets/asset-025.webp", "category": "Picked Afros", "typeLabel": "Picked Afro", "color": "Blonde" }, { "id": "hair-locs-black", "label": "Locs Black", "src": "./assets/hair-locs-black.webp", "category": "Locs", "typeLabel": "Locs", "color": "Black" }, { "id": "hair-locs-brown", "label": "Locs Brown", "src": "./assets/hair-locs-brown.webp", "category": "Locs", "typeLabel": "Locs", "color": "Brown" }, { "id": "hair-locs-ginger", "label": "Locs Ginger", "src": "./assets/hair-locs-ginger.webp", "category": "Locs", "typeLabel": "Locs", "color": "Ginger" }, { "id": "hair-locs-blonde", "label": "Locs Blonde", "src": "./assets/hair-locs-blonde.webp", "category": "Locs", "typeLabel": "Locs", "color": "Blonde" }, { "id": "hair-braids-black", "label": "Braids Black", "src": "./assets/hair-braids-black.webp", "category": "Braids", "typeLabel": "Braids", "color": "Black" }, { "id": "hair-braids-brown", "label": "Braids Brown", "src": "./assets/hair-braids-brown.webp", "category": "Braids", "typeLabel": "Braids", "color": "Brown" }, { "id": "hair-braids-ginger", "label": "Braids Ginger", "src": "./assets/hair-braids-ginger.webp", "category": "Braids", "typeLabel": "Braids", "color": "Ginger" }, { "id": "hair-braids-blonde", "label": "Braids Blonde", "src": "./assets/hair-braids-blonde.webp", "category": "Braids", "typeLabel": "Braids", "color": "Blonde" }, { "id": "hair-straight-hair-black", "label": "Straight Hair Black", "src": "./assets/hair-straight-hair-black.webp", "category": "Straight Hair", "typeLabel": "Straight Hair", "color": "Black" }, { "id": "hair-straight-hair-brown", "label": "Straight Hair Brown", "src": "./assets/hair-straight-hair-brown.webp", "category": "Straight Hair", "typeLabel": "Straight Hair", "color": "Brown" }, { "id": "hair-straight-hair-ginger", "label": "Straight Hair Ginger", "src": "./assets/hair-straight-hair-ginger.webp", "category": "Straight Hair", "typeLabel": "Straight Hair", "color": "Ginger" }, { "id": "hair-straight-hair-blonde", "label": "Straight Hair Blonde", "src": "./assets/hair-straight-hair-blonde.webp", "category": "Straight Hair", "typeLabel": "Straight Hair", "color": "Blonde" }, { "id": "hair-short-cut-brown", "label": "Short Cut Brown", "src": "./assets/hair-short-cut-brown.webp", "category": "Short Cuts", "typeLabel": "Short Cut", "color": "Brown" }, { "id": "hair-short-cut-blonde", "label": "Short Cut Blonde", "src": "./assets/hair-short-cut-blonde.webp", "category": "Short Cuts", "typeLabel": "Short Cut", "color": "Blonde" }, { "id": "hair-fade-black", "label": "Fade Black", "src": "./assets/hair-fade-black.webp", "category": "Short Cuts", "typeLabel": "Fade", "color": "Black" }];
const AVATAR_EYES = [{ "id": "eyes-brown", "label": "Brown Eyes", "src": "./assets/eyes-brown.webp" }, { "id": "eyes-hazel", "label": "Hazel Eyes", "src": "./assets/eyes-hazel.webp" }, { "id": "eyes-green", "label": "Green Eyes", "src": "./assets/eyes-green.webp" }, { "id": "eyes-gray", "label": "Gray Eyes", "src": "./assets/eyes-gray.webp" }, { "id": "eyes-blue", "label": "Blue Eyes", "src": "./assets/eyes-blue.webp" }];
const AVATAR_LIPS = [{ "id": "lips-none", "label": "No Lips Selected", "src": null }, { "id": "lips-relaxed-brown", "label": "Relaxed Brown Lips", "src": "./assets/lips-relaxed-brown.webp" }, { "id": "lips-relaxed-rose", "label": "Relaxed Rose Lips", "src": "./assets/lips-relaxed-rose.webp", "thumbSrc": "./assets/asset-048.webp" }, { "id": "lips-relaxed-maroon", "label": "Relaxed Maroon Lips", "src": "./assets/lips-relaxed-maroon.webp" }, { "id": "lips-gloss-brown", "label": "Brown Lip Gloss", "src": "./assets/lips-gloss-brown.webp" }, { "id": "lips-gloss-gold", "label": "Gold Lip Gloss", "src": "./assets/lips-gloss-gold.webp" }, { "id": "lips-gloss-rose", "label": "Rose Lip Gloss", "src": "./assets/lips-gloss-rose.webp" }, { "id": "lips-smile", "label": "Smile", "src": "./assets/lips-smile.webp", "thumbSrc": "./assets/asset-054.webp" }];
const AVATAR_BEARDS = [{ "id": "beard-none", "label": "No Beard", "src": null }, { "id": "beard-1", "label": "Beard 1", "src": "./assets/beard-1.webp" }, { "id": "beard-2", "label": "Beard 2", "src": "./assets/beard-2.webp" }, { "id": "beard-3", "label": "Beard 3", "src": "./assets/beard-3.webp" }];
const AVATAR_MUSTACHES = [{ "id": "mustache-none", "label": "No Mustache", "src": null }, { "id": "mustache-1", "label": "Mustache 1", "src": "./assets/mustache-1.webp" }, { "id": "mustache-2", "label": "Mustache 2", "src": "./assets/mustache-2.webp" }, { "id": "mustache-3", "label": "Mustache 3", "src": "./assets/mustache-3.webp" }, { "id": "mustache-4", "label": "Mustache 4", "src": "./assets/mustache-4.webp" }];
const AVATAR_SHIRTS = [{ "id": "shirt-none", "label": "Original Shirt" }, { "id": "shirt-pink", "label": "Pink Shirt", "src": "./assets/shirt-pink.webp" }, { "id": "shirt-green", "label": "Green Shirt", "src": "./assets/shirt-green.webp" }, { "id": "shirt-orange", "label": "Orange Shirt", "src": "./assets/shirt-orange.png" }, { "id": "shirt-purple", "label": "Purple Shirt", "src": "./assets/shirt-purple.png" }, { "id": "shirt-yellow", "label": "Yellow Shirt", "src": "./assets/shirt-yellow.png" }, { "id": "shirt-blue", "label": "Blue Shirt", "src": "./assets/shirt-blue.webp" }];
const AVATAR_OVERALLS = [{ "id": "overalls-blue", "label": "Blue Overalls", "src": "./assets/overalls-blue.png" }, { "id": "overalls-green", "label": "Green Overalls", "src": "./assets/overalls-green.png" }, { "id": "overalls-stone", "label": "Stone Overalls", "src": "./assets/overalls-stone.png" }, { "id": "overalls-black", "label": "Black Overalls", "src": "./assets/overalls-black.png" }, { "id": "overalls-gold", "label": "Gold Overalls", "src": "./assets/overalls-gold.png" }, { "id": "overalls-maroon", "label": "Maroon Overalls", "src": "./assets/overalls-maroon.png" }];
const AVATAR_HATS = [{ "id": "hat-none", "label": "No Hat", "src": null }, { "id": "hat-1", "label": "Sun Hat 1", "src": "./assets/hat-1.webp", "thumbSrc": "./assets/asset-075.webp" }, { "id": "hat-2", "label": "Sun Hat 2", "src": "./assets/hat-2.webp", "thumbSrc": "./assets/asset-077.webp" }, { "id": "hat-3", "label": "Sun Hat 3", "src": "./assets/hat-3.webp", "thumbSrc": "./assets/asset-079.webp" }, { "id": "hat-4", "label": "Sun Hat 4", "src": "./assets/hat-4.webp", "thumbSrc": "./assets/asset-081.webp" }];
const DEFAULT_AVATAR = {
    bodyId: AVATAR_BODIES[0].id,
    hairId: 'bald',
    eyesId: AVATAR_EYES[0].id,
    lipsId: 'lips-none',
    beardId: 'beard-none',
    mustacheId: 'mustache-none',
    shirtId: 'shirt-none',
    overallsId: 'overalls-blue',
    hatId: 'hat-none',
};
function getAssetById(list, id, fallbackId) {
    return list.find((item) => item.id === id) || list.find((item) => item.id === fallbackId) || list[0];
}
function normalizeAvatarData(input) {
    const next = input && typeof input === 'object' ? { ...input } : {};
    return {
        bodyId: getAssetById(AVATAR_BODIES, next.bodyId, DEFAULT_AVATAR.bodyId).id,
        hairId: getAssetById(AVATAR_HAIRS, next.hairId || next.hairstyleId, DEFAULT_AVATAR.hairId).id,
        eyesId: getAssetById(AVATAR_EYES, next.eyesId, DEFAULT_AVATAR.eyesId).id,
        lipsId: getAssetById(AVATAR_LIPS, next.lipsId, DEFAULT_AVATAR.lipsId).id,
        beardId: getAssetById(AVATAR_BEARDS, next.beardId, DEFAULT_AVATAR.beardId).id,
        mustacheId: getAssetById(AVATAR_MUSTACHES, next.mustacheId, DEFAULT_AVATAR.mustacheId).id,
        shirtId: getAssetById(AVATAR_SHIRTS, next.shirtId, DEFAULT_AVATAR.shirtId).id,
        overallsId: getAssetById(AVATAR_OVERALLS, next.overallsId, DEFAULT_AVATAR.overallsId).id,
        hatId: getAssetById(AVATAR_HATS, next.hatId, DEFAULT_AVATAR.hatId).id,
    };
}
function getAvatarBody(avatar) { return getAssetById(AVATAR_BODIES, avatar === null || avatar === void 0 ? void 0 : avatar.bodyId, DEFAULT_AVATAR.bodyId); }
function getAvatarHair(avatar) { return getAssetById(AVATAR_HAIRS, (avatar === null || avatar === void 0 ? void 0 : avatar.hairId) || (avatar === null || avatar === void 0 ? void 0 : avatar.hairstyleId), DEFAULT_AVATAR.hairId); }
function getAvatarEyes(avatar) { return getAssetById(AVATAR_EYES, avatar === null || avatar === void 0 ? void 0 : avatar.eyesId, DEFAULT_AVATAR.eyesId); }
function getAvatarLips(avatar) { return getAssetById(AVATAR_LIPS, avatar === null || avatar === void 0 ? void 0 : avatar.lipsId, DEFAULT_AVATAR.lipsId); }
function getAvatarBeard(avatar) { return getAssetById(AVATAR_BEARDS, avatar === null || avatar === void 0 ? void 0 : avatar.beardId, DEFAULT_AVATAR.beardId); }
function getAvatarMustache(avatar) { return getAssetById(AVATAR_MUSTACHES, avatar === null || avatar === void 0 ? void 0 : avatar.mustacheId, DEFAULT_AVATAR.mustacheId); }
function getAvatarShirt(avatar) { return getAssetById(AVATAR_SHIRTS, avatar === null || avatar === void 0 ? void 0 : avatar.shirtId, DEFAULT_AVATAR.shirtId); }
function getAvatarOveralls(avatar) { return getAssetById(AVATAR_OVERALLS, avatar === null || avatar === void 0 ? void 0 : avatar.overallsId, DEFAULT_AVATAR.overallsId); }
function getAvatarHat(avatar) { return getAssetById(AVATAR_HATS, avatar === null || avatar === void 0 ? void 0 : avatar.hatId, DEFAULT_AVATAR.hatId); }
function AvatarOptionButton({ item, selected, onClick, thumbHeight = 72 }) {
    const previewSrc = item.thumbSrc || item.src;
    return (React.createElement("button", { onClick: onClick, title: item.label, style: {
            background: '#fff', borderRadius: 6, padding: 6, cursor: 'pointer',
            border: selected ? '3px solid #5C7A4F' : '1.5px solid #B8A98A',
            color: '#4A3728', fontFamily: sans,
        } },
        previewSrc ? (React.createElement("img", { src: previewSrc, alt: item.label, style: { width: '100%', height: thumbHeight, objectFit: 'contain', objectPosition: 'center center', display: 'block' } })) : (React.createElement("div", { style: { height: thumbHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#4A3728', background: '#F7F2E7', borderRadius: 4 } }, item.label)),
        React.createElement("div", { style: { fontSize: 10, fontWeight: 700, marginTop: 4, color: '#4A3728', lineHeight: 1.2 } }, item.label)));
}
// ---------- TOOLS & CLOTHES ----------
// Real gameplay effects, not just cosmetic: Hoe cuts bed material cost, Shovel cuts ground soil cost,
// Gloves reduce health loss from missed watering, Apron adds basket capacity.
const TOOLS = [
    { id: 'hoe', name: 'Hoe', icon: '⛏️', cost: 20, effect: 'bedMaterialDiscount', amount: 0.15, desc: 'Tills efficiently — beds use 15% less wood/aluminum once owned.' },
    { id: 'shovel', name: 'Shovel', icon: '🪏', cost: 20, effect: 'groundSoilDiscount', amount: 0.15, desc: 'Digs cleanly — 15% chance filling a ground square costs no soil.' },
    { id: 'tiller', name: 'Tiller', icon: '⚙️', cost: 35, effect: 'tilledWeedReduction', amount: 0.25, desc: 'Breaks up ground thoroughly — squares tilled with it spawn 25% fewer weeds. Also works as a valid tool for tilling ground before planting.' },
    { id: 'handrake', name: 'Hand Rake', icon: '🪮', cost: 14, effect: 'weedControl', amount: 0.25, desc: 'Makes routine weed cleanup faster and reduces weed establishment after surface cultivation.' },
    { id: 'wheelbarrow', name: 'Wheelbarrow', icon: '🛒', cost: 45, effect: 'haulCapacity', amount: 8, desc: 'Hauls soil, compost, mulch, and harvests around the yard. Adds 8 temporary transport slots to your harvest capacity.' },
];
const CLOTHES = [
    { id: 'gloves', name: 'Garden Gloves', icon: '🧤', cost: 15, effect: 'healthProtect', amount: 0.2, desc: 'Gentler handling — plants lose 20% less health from missed watering.' },
    { id: 'apron', name: 'Garden Apron', icon: null, cost: 18, effect: 'basketBonus', amount: 5, desc: 'Extra pockets — adds 5 slots to your harvest basket capacity.' },
    { id: 'hat', name: 'Garden Hat', icon: null, cost: 12, effect: 'spoilSlow', amount: 0.25, desc: 'Shades your harvest — basket items spoil 25% slower.' },
];
// ---------- BASKET ----------
const BASKET_SIZES = [
    { id: 'small', name: 'Small Basket', icon: '🧺', slots: 10, cost: 15 },
    { id: 'medium', name: 'Medium Basket', icon: '🧺', slots: 18, cost: 30 },
    { id: 'large', name: 'Large Basket', icon: '🧺', slots: 25, cost: 50 },
];
const SPOIL_DAYS = 4; // days a harvested item sits in the basket before it's fully spoiled (worthless)
// Light sources required for the Heat/Light Germination stage. Higher successBonus = better odds/speed.
const LIGHT_SOURCES = [
    { id: 'growlight', name: 'Grow Light', icon: '💡', desc: 'Best light. Highest, most consistent germination success.', successMult: 1.15, speedMult: 0.85 },
    { id: 'sunlight', name: 'Direct Sunlight', icon: '☀️', desc: 'A sunny spot outdoors or in a bright window. High to moderate success.', successMult: 1.0, speedMult: 1.0 },
    { id: 'windowlight', name: 'Window / Indirect Light', icon: '🪟', desc: 'Indoor ambient light. Moderate to low success — inconsistent with weather.', successMult: 0.8, speedMult: 1.2 },
];
// Growth stage thresholds as % of a plant's total maturity time, matching real growth: seed -> seedling -> baby -> ready -> oversized -> dying.
const SEED_PACKET_ICON = './assets/seed-packet-icon.svg';;
const GROWTH_STAGES = [
    { id: 'seed', label: 'Seed', icon: SEED_PACKET_ICON, min: 0, max: 0.1 },
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
// Harvest quality for bed/ground plants specifically — separate from growthStageFor (which is also used
// for tray/transplant readiness and has different, overlapping-feeling boundaries for that purpose).
// Green = harvest now for full value. Yellow = past its peak, half value. Red = weak — worth keeping and
// storing, but not worth selling. An actually dead plant (sq.dead) is a wholly separate, health-driven
// state and can only be cleared for compost, handled elsewhere.
function harvestQualityTier(ageInDays, totalDaysNeeded) {
    if (totalDaysNeeded <= 0)
        return null;
    const pct = ageInDays / totalDaysNeeded;
    if (pct < 1.0)
        return null; // still growing, not ready yet
    if (pct < 1.15)
        return 'full';
    if (pct < 1.3)
        return 'half';
    return 'weak';
}
const ADDITIVES = [
    { id: 'vermiculite', name: 'Vermiculite', icon: '🟤', cost: 5, desc: 'Improves water retention in soil mixes.', aerationEffect: 10, moistureEffect: 15, nitrogenEffect: 0, phosphorusEffect: 0, potassiumEffect: 5 },
    { id: 'perlite', name: 'Perlite', icon: '⚪', cost: 5, desc: 'Improves drainage and aeration in soil mixes.', aerationEffect: 20, moistureEffect: -5, nitrogenEffect: 0, phosphorusEffect: 0, potassiumEffect: 0 },
    { id: 'coir', name: 'Coconut Coir', icon: '🥥', cost: 4, desc: 'A renewable peat-moss alternative for moisture retention.', aerationEffect: 8, moistureEffect: 18, nitrogenEffect: 0, phosphorusEffect: 0, potassiumEffect: 5 },
    { id: 'manure', name: 'Manure', icon: '🟫', cost: 4, desc: 'Aged organic manure. Boosts nutrients — great mixed into compost or native soil for beds.', aerationEffect: -5, moistureEffect: 10, nitrogenEffect: 20, phosphorusEffect: 10, potassiumEffect: 12 },
    { id: 'sand', name: 'Sand', icon: null, cost: 3, desc: 'Loosens heavy, compacted soil and improves drainage — good for root crops in dense native soil.', aerationEffect: 25, moistureEffect: -20, nitrogenEffect: 0, phosphorusEffect: 0, potassiumEffect: 0 },
    { id: 'woodash', name: 'Wood Ash', icon: null, cost: 3, desc: 'Raises soil pH and adds potassium — use sparingly, best on acidic soil.', aerationEffect: 0, moistureEffect: 0, nitrogenEffect: -5, phosphorusEffect: 5, potassiumEffect: 25 },
    { id: 'mushroomcompost', name: 'Mushroom Compost', icon: null, cost: 6, desc: 'Nutrient-rich spent mushroom substrate — improves soil structure and water retention.', aerationEffect: 8, moistureEffect: 15, nitrogenEffect: 12, phosphorusEffect: 15, potassiumEffect: 8 },
    { id: 'acidifier', name: 'Soil Acidifier', icon: null, cost: 5, desc: 'Lowers soil pH — essential for acid-loving plants like blueberries.', aerationEffect: 0, moistureEffect: 0, nitrogenEffect: 0, phosphorusEffect: 0, potassiumEffect: 0 },
];
const PLANT_LIGHT = { id: 'light', name: 'Grow Light', icon: '💡', cost: 35, desc: 'Supplemental light for indoor trays. Helps seedlings that need more sun than a windowsill gives.' };
const PLANT_FOOD = { id: 'food', name: 'Plant Food', icon: null, cost: 8, desc: 'General-purpose fertilizer. A boost for hungry, heavy-feeding plants.' };
const BASE_NURSERY_DAYS = 12;
const PLANT_CATEGORIES = [
    { id: 'vegetables', label: 'Vegetables', icon: '🥕' },
    { id: 'mint', label: 'Mint Family', icon: '🌱' },
    { id: 'native', label: 'Native Flowers', icon: '🦋' },
    { id: 'alliums', label: 'Alliums', icon: '🧅' },
    { id: 'cucurbits', label: 'Cucurbitaceae', icon: '🎃' },
    { id: 'legumes', label: 'Legumes', icon: '🫘' },
    { id: 'fruit', label: 'Fruit', icon: '🫐' },
    { id: 'otherherbs', label: 'Other Herbs & Flowers', icon: '🌿' },
    { id: 'covercrops', label: 'Cover Crops', icon: '🌾' },
];
const PLANTS = [
    { id: 'lettuce', name: 'Lettuce', emoji: '🥬', seedCost: 3, plantCost: 9, daysToMature: 6, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 9, waterNeed: 'med', soilPref: 'starting', perSqFt: 4, stratDays: 0, category: 'vegetables', phMin: 6.0, phMax: 7.0 },
    { id: 'carrot', name: 'Carrot', emoji: '🥕', seedCost: 2, plantCost: 6, daysToMature: 10, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 8, waterNeed: 'low', soilPref: 'garden', perSqFt: 16, stratDays: 0, category: 'vegetables', phMin: 6.0, phMax: 7.0 },
    { id: 'tomato', name: 'Determinate Tomato', emoji: '🍅', seedCost: 5, plantCost: 15, daysToMature: 14, minTemp: 'warm', minZone: 4, maxZone: 13, frostTender: true, sellValue: 22, waterNeed: 'high', soilPref: 'starting', perSqFt: 1, stratDays: 0, category: 'vegetables', phMin: 6.0, phMax: 7.0, tomatoHabit: 'determinate', climateNote: 'Compact bush habit. Most fruit ripens in a concentrated flush; a cage or stake can help, but it does not need a tall trellis.' },
    { id: 'tomatoindeterminate', name: 'Indeterminate Tomato', emoji: '🍅', seedCost: 6, plantCost: 17, daysToMature: 15, minTemp: 'warm', minZone: 4, maxZone: 13, frostTender: true, sellValue: 17, waterNeed: 'high', soilPref: 'starting', perSqFt: 1, stratDays: 0, category: 'vegetables', phMin: 6.0, phMax: 7.0, tomatoHabit: 'indeterminate', repeatHarvest: true, regrowDays: 4, climateNote: 'Vining habit. Keeps growing and setting fruit until frost; trellising strongly improves support and airflow.' },
    { id: 'corn', name: 'Sweet Corn', emoji: '🌽', seedCost: 4, plantCost: 10, daysToMature: 13, minTemp: 'warm', minZone: 3, maxZone: 13, frostTender: true, sellValue: 10, waterNeed: 'high', soilPref: 'garden', perSqFt: 2, stratDays: 0, category: 'vegetables', phMin: 5.8, phMax: 7.0, heatTolerance: 'high', coldTolerance: 'low', climateNote: 'Heat-loving grass crop. Plant in blocks rather than a single row for better wind pollination.' },
    { id: 'elephantear', name: 'Elephant Ear', emoji: '🌿', seedCost: 5, plantCost: 16, daysToMature: 16, minTemp: 'warm', minZone: 8, maxZone: 13, frostTender: true, sellValue: 8, waterNeed: 'high', soilPref: 'garden', perSqFt: 1, stratDays: 0, category: 'otherherbs', phMin: 5.5, phMax: 7.0, heatTolerance: 'high', coldTolerance: 'low', climateNote: 'Tropical ornamental foliage that loves warmth and moisture. Frost kills the top growth.' },
    { id: 'citronella', name: 'Citronella Grass', emoji: '🌾', seedCost: 4, plantCost: 13, daysToMature: 14, minTemp: 'warm', minZone: 9, maxZone: 13, frostTender: true, sellValue: 7, waterNeed: 'med', soilPref: 'garden', perSqFt: 2, stratDays: 0, category: 'otherherbs', phMin: 5.5, phMax: 7.0, heatTolerance: 'high', coldTolerance: 'low', climateNote: 'Aromatic tropical grass. Growing the plant alone is not reliable mosquito control; pond management and predators matter more.' },
    { id: 'soursop', name: 'Soursop Tree', emoji: '🍈', seedCost: 8, plantCost: 30, daysToMature: 36, minTemp: 'warm', minZone: 10, maxZone: 13, frostTender: true, sellValue: 30, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 0, category: 'fruit', phMin: 5.5, phMax: 7.0, heatTolerance: 'high', coldTolerance: 'low', movableTree: true, growthForm: 'tree', bloomMonths: [4, 5, 6], harvestMonths: [8, 9, 10], repeatHarvest: true, climateNote: 'Tropical fruit tree. In colder zones, grow it in a large movable container outdoors during hot weather and overwinter it inside a greenhouse.' },
    { id: 'pawpaw', name: 'Pawpaw Tree', emoji: '🍈', seedCost: 7, plantCost: 25, daysToMature: 32, minTemp: 'cool', minZone: 5, maxZone: 9, frostTender: false, sellValue: 24, waterNeed: 'med', soilPref: 'native', perSqFt: 1, stratDays: 90, category: 'fruit', phMin: 5.5, phMax: 7.0, growthForm: 'tree', bloomMonths: [3, 4, 5], harvestMonths: [8, 9, 10], repeatHarvest: true, climateNote: 'Native understory fruit tree. Flowers in spring; custard-like fruit ripens late summer into fall.' },
    { id: 'persimmontree', name: 'Persimmon Tree', emoji: '🟠', seedCost: 7, plantCost: 29, daysToMature: 36, minTemp: 'cool', minZone: 5, maxZone: 9, frostTender: false, sellValue: 27, waterNeed: 'low', soilPref: 'native', perSqFt: 1, stratDays: 60, category: 'fruit', phMin: 6.0, phMax: 7.5, growthForm: 'tree', bloomMonths: [5, 6], harvestMonths: [9, 10, 11], repeatHarvest: true, climateNote: 'Late spring bloom and a distinctly fall harvest.' },
    { id: 'serviceberry', name: 'Serviceberry Bush', emoji: '🫐', seedCost: 5, plantCost: 19, daysToMature: 24, minTemp: 'cold', minZone: 3, maxZone: 9, frostTender: false, sellValue: 18, waterNeed: 'med', soilPref: 'native', perSqFt: 1, stratDays: 60, category: 'fruit', phMin: 5.5, phMax: 7.0, growthForm: 'shrub', bloomMonths: [3, 4, 5], harvestMonths: [6, 7], repeatHarvest: true, climateNote: 'Early white blossoms followed by berries in early summer.' },
    { id: 'currant', name: 'Currant Bush', emoji: '🔴', seedCost: 5, plantCost: 18, daysToMature: 24, minTemp: 'cold', minZone: 3, maxZone: 8, frostTender: false, sellValue: 18, waterNeed: 'med', soilPref: 'native', perSqFt: 1, stratDays: 60, category: 'fruit', phMin: 5.5, phMax: 7.0, growthForm: 'shrub', bloomMonths: [4, 5], harvestMonths: [6, 7, 8], repeatHarvest: true, climateNote: 'Cool-climate berry shrub with spring bloom and early/midsummer harvest.' },
    { id: 'gooseberry', name: 'Gooseberry Bush', emoji: '🟢', seedCost: 5, plantCost: 18, daysToMature: 24, minTemp: 'cold', minZone: 3, maxZone: 8, frostTender: false, sellValue: 18, waterNeed: 'med', soilPref: 'native', perSqFt: 1, stratDays: 60, category: 'fruit', phMin: 5.5, phMax: 7.0, growthForm: 'shrub', bloomMonths: [4, 5], harvestMonths: [6, 7, 8], repeatHarvest: true, climateNote: 'Spring flowers produce tart berries in summer.' },
    { id: 'aronia', name: 'Aronia / Chokeberry Bush', emoji: '🫐', seedCost: 5, plantCost: 18, daysToMature: 26, minTemp: 'cold', minZone: 3, maxZone: 9, frostTender: false, sellValue: 19, waterNeed: 'low', soilPref: 'native', perSqFt: 1, stratDays: 60, category: 'fruit', phMin: 5.0, phMax: 7.0, growthForm: 'shrub', bloomMonths: [5, 6], harvestMonths: [8, 9, 10], repeatHarvest: true, climateNote: 'Late-spring bloom with dark berries ripening late summer into fall.' },
    { id: 'alfalfa', name: 'Alfalfa', emoji: '🌱', seedCost: 2, plantCost: 5, daysToMature: 10, minTemp: 'cool', minZone: 3, maxZone: 10, frostTender: false, sellValue: 2, waterNeed: 'low', soilPref: 'native', perSqFt: 9, stratDays: 0, category: 'covercrops', phMin: 6.2, phMax: 7.5, soilBuilder: { n: 1.4, organic: 0.35, aeration: 0.15 }, coverCrop: true, coverBenefit: 'Deep-rooted legume that fixes nitrogen and contributes organic matter when residues return to soil.' },
    { id: 'whiteclover', name: 'White Clover', emoji: '☘️', seedCost: 2, plantCost: 5, daysToMature: 9, minTemp: 'cool', minZone: 3, maxZone: 10, frostTender: false, sellValue: 2, waterNeed: 'low', soilPref: 'native', perSqFt: 12, stratDays: 0, category: 'covercrops', phMin: 5.8, phMax: 7.0, soilBuilder: { n: 1.2, organic: 0.3, aeration: 0.1 }, coverCrop: true, coverBenefit: 'Living legume cover that fixes nitrogen and protects bare soil.' },
    { id: 'sunnhemp', name: 'Sunn Hemp', emoji: '🌱', seedCost: 2, plantCost: 6, daysToMature: 10, minTemp: 'warm', minZone: 7, maxZone: 13, frostTender: true, sellValue: 2, waterNeed: 'low', soilPref: 'native', perSqFt: 9, stratDays: 0, category: 'covercrops', phMin: 5.5, phMax: 7.5, heatTolerance: 'high', soilBuilder: { n: 1.6, organic: 0.5, aeration: 0.15 }, coverCrop: true, coverBenefit: 'Fast warm-season legume that fixes nitrogen and produces large amounts of biomass.' },
    { id: 'pepper', name: 'Bell Pepper', heatTolerance: 'high', coldTolerance: 'low', climateNote: 'Warm-season crop that performs well in heat but is damaged by frost.', emoji: '🫑', seedCost: 5, plantCost: 15, daysToMature: 15, minTemp: 'warm', minZone: 4, maxZone: 13, frostTender: true, sellValue: 16, waterNeed: 'med', soilPref: 'starting', perSqFt: 1, stratDays: 0, category: 'vegetables', phMin: 6.0, phMax: 7.0 },
    { id: 'kale', name: 'Kale', heatTolerance: 'low', coldTolerance: 'high', climateNote: 'Very cold hardy; flavor often improves after light frost.', emoji: '🥬', seedCost: 3, plantCost: 9, daysToMature: 8, minTemp: 'cold', minZone: 1, maxZone: 13, frostTender: false, sellValue: 10, waterNeed: 'low', soilPref: 'potting', perSqFt: 1, stratDays: 0, category: 'vegetables', phMin: 6.0, phMax: 7.0 },
    { id: 'squash', name: 'Squash', emoji: '🎃', seedCost: 4, plantCost: 12, daysToMature: 12, minTemp: 'warm', minZone: 4, maxZone: 13, frostTender: true, sellValue: 14, waterNeed: 'high', soilPref: 'potting', perSqFt: 1, stratDays: 0, category: 'cucurbits', phMin: 6.0, phMax: 7.0 },
    { id: 'cucumber', name: 'Cucumber', emoji: '🥒', seedCost: 3, plantCost: 10, daysToMature: 12, minTemp: 'warm', minZone: 4, maxZone: 13, frostTender: true, sellValue: 13, waterNeed: 'high', soilPref: 'starting', perSqFt: 2, stratDays: 0, category: 'cucurbits', phMin: 6.0, phMax: 7.0 },
    { id: 'watermelon', name: 'Watermelon', emoji: '🍉', seedCost: 4, plantCost: 14, daysToMature: 22, minTemp: 'warm', minZone: 5, maxZone: 13, frostTender: true, sellValue: 20, waterNeed: 'high', soilPref: 'garden', perSqFt: 1, stratDays: 0, category: 'cucurbits', phMin: 6.0, phMax: 7.0 },
    { id: 'cantaloupe', name: 'Cantaloupe', emoji: '🍈', seedCost: 4, plantCost: 12, daysToMature: 18, minTemp: 'warm', minZone: 4, maxZone: 13, frostTender: true, sellValue: 16, waterNeed: 'high', soilPref: 'garden', perSqFt: 1, stratDays: 0, category: 'cucurbits', phMin: 6.0, phMax: 7.0 },
    { id: 'garlic', name: 'Garlic', emoji: '🧄', seedCost: 2, plantCost: 6, daysToMature: 16, minTemp: 'cold', minZone: 1, maxZone: 13, frostTender: false, sellValue: 12, waterNeed: 'low', soilPref: 'garden', perSqFt: 9, stratDays: 0, category: 'alliums', phMin: 6.0, phMax: 7.0 },
    { id: 'bean', name: 'Bush Bean', emoji: '🫘', seedCost: 3, plantCost: 9, daysToMature: 9, minTemp: 'warm', minZone: 4, maxZone: 13, frostTender: true, sellValue: 11, waterNeed: 'med', soilPref: 'potting', perSqFt: 9, stratDays: 0, category: 'legumes', phMin: 6.0, phMax: 7.0 },
    { id: 'lavender', name: 'Lavender', emoji: '🪻', seedCost: 4, plantCost: 14, daysToMature: 18, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 15, waterNeed: 'low', soilPref: 'starting', perSqFt: 1, stratDays: 30, category: 'mint', phMin: 6.5, phMax: 7.8 },
    { id: 'milkweed', name: 'Milkweed', emoji: '🦋', seedCost: 3, plantCost: 10, daysToMature: 12, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 10, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 30, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'oregano', name: 'Oregano', emoji: '🌿', seedCost: 3, plantCost: 9, daysToMature: 10, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 9, waterNeed: 'low', soilPref: 'potting', perSqFt: 4, stratDays: 21, category: 'mint', phMin: 6.0, phMax: 7.0 },
    { id: 'sage', name: 'Sage', emoji: '🌱', seedCost: 3, plantCost: 9, daysToMature: 11, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 10, waterNeed: 'low', soilPref: 'potting', perSqFt: 1, stratDays: 21, category: 'mint', phMin: 6.0, phMax: 7.0 },
    { id: 'anisehyssop', name: 'Anise Hyssop', emoji: '🌸', seedCost: 4, plantCost: 12, daysToMature: 20, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 11, waterNeed: 'low', soilPref: 'potting', perSqFt: 1, stratDays: 28, category: 'mint', phMin: 6.0, phMax: 7.0 },
    { id: 'butterflyweed', name: 'Butterfly Weed', emoji: '🏵️', seedCost: 3, plantCost: 10, daysToMature: 16, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 10, waterNeed: 'low', soilPref: 'garden', perSqFt: 1, stratDays: 30, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'catmint', name: 'Catmint', emoji: '💮', seedCost: 3, plantCost: 9, daysToMature: 14, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 9, waterNeed: 'low', soilPref: 'potting', perSqFt: 4, stratDays: 28, category: 'mint', phMin: 6.0, phMax: 7.0 },
    { id: 'chamomile', name: 'Chamomile', emoji: '🌼', seedCost: 3, plantCost: 8, daysToMature: 12, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 8, waterNeed: 'low', soilPref: 'starting', perSqFt: 4, stratDays: 21, category: 'otherherbs', phMin: 6.0, phMax: 7.0 },
    { id: 'chives', name: 'Chives', emoji: '🧅', seedCost: 2, plantCost: 6, daysToMature: 10, minTemp: 'cold', minZone: 1, maxZone: 13, frostTender: false, sellValue: 7, waterNeed: 'low', soilPref: 'garden', perSqFt: 4, stratDays: 14, category: 'alliums', phMin: 6.0, phMax: 7.0 },
    { id: 'cilantro', name: 'Cilantro', heatTolerance: 'low', coldTolerance: 'high', climateNote: 'Cool-season herb; bolts quickly in sustained heat.', emoji: '🍃', seedCost: 2, plantCost: 6, daysToMature: 8, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 7, waterNeed: 'med', soilPref: 'potting', perSqFt: 9, stratDays: 14, category: 'otherherbs', phMin: 6.0, phMax: 7.0 },
    { id: 'elderberry', name: 'Elderberry', growthForm: 'shrub', bloomMonths: [6, 7], harvestMonths: [8, 9], repeatHarvest: true, emoji: '🍇', seedCost: 6, plantCost: 20, daysToMature: 30, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 22, waterNeed: 'high', soilPref: 'native', perSqFt: 1, stratDays: 90, category: 'fruit', phMin: 5.5, phMax: 6.5 },
    { id: 'blueberry', name: 'Blueberry Bush', growthForm: 'shrub', bloomMonths: [4, 5], harvestMonths: [6, 7, 8], repeatHarvest: true, emoji: '🫐', seedCost: 6, plantCost: 22, daysToMature: 32, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 20, waterNeed: 'high', soilPref: 'native', perSqFt: 1, stratDays: 90, category: 'fruit', phMin: 4.5, phMax: 5.5 },
    { id: 'blackberry', name: 'Blackberry Bush', growthForm: 'shrub', bloomMonths: [5, 6], harvestMonths: [6, 7, 8], repeatHarvest: true, emoji: '🖤', seedCost: 4, plantCost: 16, daysToMature: 24, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 16, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 60, category: 'fruit', phMin: 5.5, phMax: 6.5 },
    { id: 'raspberry', name: 'Raspberry Bush', growthForm: 'shrub', bloomMonths: [5, 6], harvestMonths: [6, 7, 8, 9], repeatHarvest: true, emoji: '🍒', seedCost: 4, plantCost: 16, daysToMature: 24, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 17, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 60, category: 'fruit', phMin: 5.5, phMax: 6.5 },
    { id: 'echinacea', name: 'Echinacea', emoji: '🌺', seedCost: 4, plantCost: 12, daysToMature: 22, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 12, waterNeed: 'low', soilPref: 'garden', perSqFt: 1, stratDays: 30, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'hollyhocks', name: 'Hollyhocks', emoji: '🌷', seedCost: 3, plantCost: 10, daysToMature: 24, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 13, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 21, category: 'otherherbs', phMin: 6.0, phMax: 7.0 },
    { id: 'lemonbalm', name: 'Lemon Balm', emoji: '🍋', seedCost: 3, plantCost: 9, daysToMature: 14, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 9, waterNeed: 'med', soilPref: 'potting', perSqFt: 4, stratDays: 30, category: 'mint', phMin: 6.0, phMax: 7.0 },
    { id: 'marshmallow', name: 'Marshmallow', emoji: '🪷', seedCost: 4, plantCost: 12, daysToMature: 20, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 12, waterNeed: 'high', soilPref: 'native', perSqFt: 1, stratDays: 21, category: 'otherherbs', phMin: 6.0, phMax: 7.0 },
    { id: 'mullein', name: 'Mullein', emoji: '🌻', seedCost: 2, plantCost: 8, daysToMature: 18, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 9, waterNeed: 'low', soilPref: 'native', perSqFt: 1, stratDays: 21, category: 'otherherbs', phMin: 6.0, phMax: 7.0 },
    { id: 'phlox', name: 'Phlox', emoji: '💐', seedCost: 3, plantCost: 10, daysToMature: 20, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 11, waterNeed: 'med', soilPref: 'potting', perSqFt: 4, stratDays: 30, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'thyme', name: 'Thyme', heatTolerance: 'high', coldTolerance: 'high', climateNote: 'Established plants handle drought, summer heat, and winter cold well.', emoji: '🍀', seedCost: 2, plantCost: 6, daysToMature: 12, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 8, waterNeed: 'low', soilPref: 'garden', perSqFt: 9, stratDays: 21, category: 'mint', phMin: 6.0, phMax: 7.0 },
    { id: 'garlicchives', name: 'Garlic Chives', emoji: '🌾', seedCost: 2, plantCost: 6, daysToMature: 10, minTemp: 'cold', minZone: 1, maxZone: 13, frostTender: false, sellValue: 7, waterNeed: 'low', soilPref: 'garden', perSqFt: 4, stratDays: 0, category: 'alliums', phMin: 6.0, phMax: 7.0 },
    { id: 'fennel', name: 'Fennel', heatTolerance: 'medium', coldTolerance: 'medium', climateNote: 'Best in mild weather; excessive heat can reduce bulb quality.', emoji: '🍂', seedCost: 3, plantCost: 10, daysToMature: 16, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 10, waterNeed: 'med', soilPref: 'potting', perSqFt: 1, stratDays: 0, category: 'otherherbs', phMin: 6.0, phMax: 7.0 },
    { id: 'frenchtarragon', name: 'French Tarragon', emoji: '🥬', seedCost: 4, plantCost: 12, daysToMature: 14, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 11, waterNeed: 'low', soilPref: 'potting', perSqFt: 1, stratDays: 0, category: 'otherherbs', phMin: 6.0, phMax: 7.0 },
    { id: 'lovage', name: 'Lovage', emoji: '🎋', seedCost: 3, plantCost: 10, daysToMature: 18, minTemp: 'cold', minZone: 1, maxZone: 13, frostTender: false, sellValue: 10, waterNeed: 'med', soilPref: 'native', perSqFt: 1, stratDays: 0, category: 'otherherbs', phMin: 6.0, phMax: 7.0 },
    { id: 'mexicanmintmarigold', name: 'Mexican Mint Marigold', emoji: '🍁', seedCost: 3, plantCost: 9, daysToMature: 14, minTemp: 'warm', minZone: 4, maxZone: 13, frostTender: true, sellValue: 9, waterNeed: 'low', soilPref: 'garden', perSqFt: 1, stratDays: 0, category: 'otherherbs', phMin: 6.0, phMax: 7.0 },
    { id: 'mint', name: 'Mint', emoji: '☘️', seedCost: 2, plantCost: 6, daysToMature: 10, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 7, waterNeed: 'high', soilPref: 'potting', perSqFt: 4, stratDays: 0, category: 'mint', phMin: 6.0, phMax: 7.0 },
    { id: 'rosemary', name: 'Rosemary', emoji: '🌲', seedCost: 3, plantCost: 10, daysToMature: 16, minTemp: 'warm', minZone: 4, maxZone: 13, frostTender: true, sellValue: 11, waterNeed: 'low', soilPref: 'garden', perSqFt: 1, stratDays: 0, category: 'mint', phMin: 6.0, phMax: 7.0 },
    { id: 'sweetwoodruff', name: 'Sweet Woodruff', emoji: '🍄', seedCost: 3, plantCost: 8, daysToMature: 12, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 8, waterNeed: 'med', soilPref: 'potting', perSqFt: 9, stratDays: 0, category: 'otherherbs', phMin: 6.0, phMax: 7.0 },
    { id: 'dill', name: 'Dill', emoji: '🌾', seedCost: 2, plantCost: 6, daysToMature: 14, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 8, waterNeed: 'med', soilPref: 'potting', perSqFt: 1, stratDays: 0, category: 'otherherbs', phMin: 6.0, phMax: 7.0 },
    { id: 'parsley', name: 'Parsley', emoji: '🌿', seedCost: 2, plantCost: 6, daysToMature: 14, minTemp: 'cool', minZone: 2, maxZone: 13, frostTender: false, sellValue: 8, waterNeed: 'med', soilPref: 'potting', perSqFt: 4, stratDays: 0, category: 'otherherbs', phMin: 6.0, phMax: 7.0 },
    { id: 'blackeyedsusan', name: 'Black-Eyed Susan', emoji: '🌞', seedCost: 3, plantCost: 10, daysToMature: 20, minTemp: 'cold', minZone: 3, maxZone: 13, frostTender: false, sellValue: 12, waterNeed: 'low', soilPref: 'garden', perSqFt: 1, stratDays: 21, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'beebalm', name: 'Wild Bergamot (Bee Balm)', emoji: '💜', seedCost: 3, plantCost: 10, daysToMature: 18, minTemp: 'cold', minZone: 3, maxZone: 13, frostTender: false, sellValue: 11, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 14, category: 'mint', phMin: 6.0, phMax: 7.0 },
    { id: 'blanketflower', name: 'Blanketflower', emoji: '🟠', seedCost: 3, plantCost: 9, daysToMature: 16, minTemp: 'cool', minZone: 3, maxZone: 13, frostTender: false, sellValue: 10, waterNeed: 'low', soilPref: 'garden', perSqFt: 4, stratDays: 0, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'joepyeweed', name: 'Joe Pye Weed', emoji: '🟣', seedCost: 4, plantCost: 13, daysToMature: 24, minTemp: 'cool', minZone: 4, maxZone: 13, frostTender: false, sellValue: 14, waterNeed: 'high', soilPref: 'native', perSqFt: 1, stratDays: 30, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'newenglandaster', name: 'New England Aster', emoji: '💠', seedCost: 3, plantCost: 10, daysToMature: 22, minTemp: 'cold', minZone: 3, maxZone: 13, frostTender: false, sellValue: 11, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 21, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'goldenrod', name: 'Goldenrod', emoji: '🟡', seedCost: 2, plantCost: 8, daysToMature: 18, minTemp: 'cold', minZone: 3, maxZone: 13, frostTender: false, sellValue: 9, waterNeed: 'low', soilPref: 'native', perSqFt: 1, stratDays: 0, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'cardinalflower', name: 'Cardinal Flower', emoji: '❤️', seedCost: 4, plantCost: 13, daysToMature: 22, minTemp: 'cool', minZone: 3, maxZone: 13, frostTender: false, sellValue: 14, waterNeed: 'high', soilPref: 'native', perSqFt: 1, stratDays: 30, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'blazingstar', name: 'Blazing Star', emoji: '🟪', seedCost: 3, plantCost: 10, daysToMature: 18, minTemp: 'cold', minZone: 3, maxZone: 13, frostTender: false, sellValue: 11, waterNeed: 'med', soilPref: 'garden', perSqFt: 4, stratDays: 0, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'littlebluestem', name: 'Little Bluestem', emoji: '🟤', seedCost: 2, plantCost: 7, daysToMature: 16, minTemp: 'cold', minZone: 3, maxZone: 13, frostTender: false, sellValue: 7, waterNeed: 'low', soilPref: 'native', perSqFt: 4, stratDays: 0, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'wildcolumbine', name: 'Wild Columbine', emoji: '🔷', seedCost: 3, plantCost: 10, daysToMature: 20, minTemp: 'cold', minZone: 3, maxZone: 13, frostTender: false, sellValue: 12, waterNeed: 'med', soilPref: 'potting', perSqFt: 4, stratDays: 30, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'yarrow', name: 'Yarrow', emoji: '⚪', seedCost: 2, plantCost: 7, daysToMature: 14, minTemp: 'cold', minZone: 3, maxZone: 13, frostTender: false, sellValue: 8, waterNeed: 'low', soilPref: 'garden', perSqFt: 4, stratDays: 0, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'coreopsis', name: 'Lance-Leaf Coreopsis', emoji: '🟨', seedCost: 2, plantCost: 8, daysToMature: 16, minTemp: 'cool', minZone: 4, maxZone: 13, frostTender: false, sellValue: 9, waterNeed: 'low', soilPref: 'garden', perSqFt: 4, stratDays: 0, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'wildgeranium', name: 'Wild Geranium', emoji: '💟', seedCost: 3, plantCost: 10, daysToMature: 20, minTemp: 'cold', minZone: 3, maxZone: 13, frostTender: false, sellValue: 11, waterNeed: 'med', soilPref: 'potting', perSqFt: 4, stratDays: 30, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'trumpethoneysuckle', name: 'Trumpet Honeysuckle', emoji: '🧡', seedCost: 4, plantCost: 14, daysToMature: 24, minTemp: 'cool', minZone: 4, maxZone: 13, frostTender: false, sellValue: 14, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 30, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'beardtongue', name: 'Foxglove Beardtongue', emoji: '🤍', seedCost: 3, plantCost: 9, daysToMature: 18, minTemp: 'cold', minZone: 3, maxZone: 13, frostTender: false, sellValue: 10, waterNeed: 'med', soilPref: 'garden', perSqFt: 4, stratDays: 21, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'mexicanhat', name: 'Prairie Coneflower (Mexican Hat)', emoji: '🎩', seedCost: 3, plantCost: 9, daysToMature: 16, minTemp: 'cold', minZone: 3, maxZone: 13, frostTender: false, sellValue: 10, waterNeed: 'low', soilPref: 'garden', perSqFt: 4, stratDays: 0, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'spiderwort', name: 'Spiderwort', emoji: '🔹', seedCost: 2, plantCost: 8, daysToMature: 16, minTemp: 'cool', minZone: 4, maxZone: 13, frostTender: false, sellValue: 9, waterNeed: 'med', soilPref: 'garden', perSqFt: 4, stratDays: 0, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'virginiabluebells', name: 'Virginia Bluebells', emoji: '🔔', seedCost: 3, plantCost: 10, daysToMature: 18, minTemp: 'cold', minZone: 3, maxZone: 13, frostTender: false, sellValue: 11, waterNeed: 'high', soilPref: 'potting', perSqFt: 4, stratDays: 30, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'pricklypear', name: 'Prickly Pear Cactus', emoji: '🌵', seedCost: 4, plantCost: 12, daysToMature: 20, minTemp: 'cool', minZone: 4, maxZone: 13, frostTender: false, sellValue: 13, waterNeed: 'low', soilPref: 'native', perSqFt: 1, stratDays: 0, category: 'fruit', phMin: 6.0, phMax: 8.0 },
    { id: 'appletree', name: 'Apple Tree', growthForm: 'tree', bloomMonths: [4, 5], harvestMonths: [8, 9, 10], repeatHarvest: true, emoji: '🍎', seedCost: 7, plantCost: 26, daysToMature: 35, minTemp: 'cold', minZone: 3, maxZone: 8, frostTender: false, sellValue: 24, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 75, category: 'fruit', phMin: 6.0, phMax: 7.0 },
    { id: 'peartree', name: 'Pear Tree', growthForm: 'tree', bloomMonths: [4, 5], harvestMonths: [8, 9, 10], repeatHarvest: true, emoji: '🍐', seedCost: 7, plantCost: 25, daysToMature: 35, minTemp: 'cold', minZone: 4, maxZone: 9, frostTender: false, sellValue: 22, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 75, category: 'fruit', phMin: 6.0, phMax: 7.0 },
    { id: 'peachtree', name: 'Peach Tree', growthForm: 'tree', bloomMonths: [3, 4], harvestMonths: [6, 7, 8], repeatHarvest: true, emoji: '🍑', seedCost: 7, plantCost: 26, daysToMature: 32, minTemp: 'cool', minZone: 5, maxZone: 9, frostTender: false, sellValue: 23, waterNeed: 'high', soilPref: 'garden', perSqFt: 1, stratDays: 80, category: 'fruit', phMin: 6.0, phMax: 7.0 },
    { id: 'cherrytree', name: 'Cherry Tree', growthForm: 'tree', bloomMonths: [3, 4], harvestMonths: [5, 6, 7], repeatHarvest: true, emoji: '🔴', seedCost: 8, plantCost: 28, daysToMature: 34, minTemp: 'cool', minZone: 5, maxZone: 8, frostTender: false, sellValue: 26, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 100, category: 'fruit', phMin: 6.0, phMax: 7.0 },
    { id: 'plumtree', name: 'Plum Tree', growthForm: 'tree', bloomMonths: [3, 4], harvestMonths: [7, 8, 9], repeatHarvest: true, emoji: '🔵', seedCost: 6, plantCost: 24, daysToMature: 32, minTemp: 'cold', minZone: 4, maxZone: 9, frostTender: false, sellValue: 21, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 70, category: 'fruit', phMin: 6.0, phMax: 7.0 },
    { id: 'figtree', name: 'Fig Tree', heatTolerance: 'high', coldTolerance: 'low', climateNote: 'Loves heat; winter protection is important near the cold edge of its range.', emoji: '🟫', seedCost: 6, plantCost: 22, daysToMature: 28, minTemp: 'warm', minZone: 7, maxZone: 11, frostTender: true, sellValue: 20, waterNeed: 'med', soilPref: 'native', perSqFt: 1, stratDays: 20, category: 'fruit', phMin: 6.0, phMax: 7.5, movableTree: true },
    { id: 'lemontree', name: 'Lemon Tree', emoji: '🍋', seedCost: 6, plantCost: 24, daysToMature: 30, minTemp: 'warm', minZone: 9, maxZone: 11, frostTender: true, sellValue: 22, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 0, category: 'fruit', phMin: 6.0, phMax: 6.5, movableTree: true },
    { id: 'orangetree', name: 'Orange Tree', emoji: '🍊', seedCost: 6, plantCost: 25, daysToMature: 32, minTemp: 'warm', minZone: 9, maxZone: 11, frostTender: true, sellValue: 23, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 0, category: 'fruit', phMin: 6.0, phMax: 6.5 },
    { id: 'redbud', name: 'Eastern Redbud', emoji: '🍥', seedCost: 6, plantCost: 22, daysToMature: 30, minTemp: 'cool', minZone: 4, maxZone: 13, frostTender: false, sellValue: 20, waterNeed: 'med', soilPref: 'native', perSqFt: 1, stratDays: 60, category: 'native', phMin: 6.0, phMax: 7.0 },
    { id: 'comfrey', name: 'Comfrey', emoji: '🟩', seedCost: 4, plantCost: 13, daysToMature: 16, minTemp: 'cold', minZone: 3, maxZone: 13, frostTender: false, sellValue: 9, waterNeed: 'med', soilPref: 'garden', perSqFt: 1, stratDays: 0, category: 'otherherbs', phMin: 6.0, phMax: 7.0 },
    // Expanded crop library: beans, melons, peppers, fruits, roots, herbs, flowers, climate-resilient crops, and cover crops.
    { id: "polebean", name: "Pole Bean", emoji: "🫘", seedCost: 3, plantCost: 9, daysToMature: 11, minTemp: "warm", minZone: 4, maxZone: 13, frostTender: true, sellValue: 12, waterNeed: "med", soilPref: "garden", perSqFt: 8, stratDays: 0, category: "legumes", phMin: 6.0, phMax: 7.0, heatTolerance: "high", coldTolerance: "low", climateNote: "Climbing warm-season bean; keeps producing when picked regularly." },
    { id: "limabean", name: "Lima Bean", emoji: "🫘", seedCost: 3, plantCost: 10, daysToMature: 14, minTemp: "warm", minZone: 5, maxZone: 13, frostTender: true, sellValue: 13, waterNeed: "med", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "legumes", phMin: 6.0, phMax: 7.0, heatTolerance: "high", coldTolerance: "low", climateNote: "Likes a long warm season and warm soil." },
    { id: "yardlongbean", name: "Yardlong Bean", emoji: "🫘", seedCost: 4, plantCost: 11, daysToMature: 12, minTemp: "warm", minZone: 6, maxZone: 13, frostTender: true, sellValue: 14, waterNeed: "med", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "legumes", phMin: 6.0, phMax: 7.5, heatTolerance: "high", coldTolerance: "low", climateNote: "Excellent hot-weather bean; thrives when common beans slow down." },
    { id: "favabean", name: "Fava Bean", emoji: "🫘", seedCost: 3, plantCost: 9, daysToMature: 12, minTemp: "cold", minZone: 2, maxZone: 10, frostTender: false, sellValue: 12, waterNeed: "med", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "legumes", phMin: 6.0, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", climateNote: "Cool-season bean that tolerates light frost but dislikes summer heat." },
    { id: "cowpea", name: "Cowpea / Black-Eyed Pea", emoji: "🫘", seedCost: 3, plantCost: 9, daysToMature: 12, minTemp: "warm", minZone: 5, maxZone: 13, frostTender: true, sellValue: 12, waterNeed: "low", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "legumes", phMin: 5.8, phMax: 7.0, heatTolerance: "high", coldTolerance: "low", climateNote: "Heat- and drought-tolerant legume that also fixes nitrogen." },
    { id: "honeydew", name: "Honeydew Melon", emoji: "🍈", seedCost: 4, plantCost: 13, daysToMature: 20, minTemp: "warm", minZone: 5, maxZone: 13, frostTender: true, sellValue: 18, waterNeed: "high", soilPref: "garden", perSqFt: 1, stratDays: 0, category: "cucurbits", phMin: 6.0, phMax: 7.0, heatTolerance: "high", coldTolerance: "low", climateNote: "Needs a long warm season and steady moisture while fruit sizes." },
    { id: "canarymelon", name: "Canary Melon", emoji: "🍈", seedCost: 4, plantCost: 13, daysToMature: 19, minTemp: "warm", minZone: 5, maxZone: 13, frostTender: true, sellValue: 18, waterNeed: "high", soilPref: "garden", perSqFt: 1, stratDays: 0, category: "cucurbits", phMin: 6.0, phMax: 7.0, heatTolerance: "high", coldTolerance: "low", climateNote: "Heat-loving melon; best with full sun and warm nights." },
    { id: "luffa", name: "Luffa Gourd", emoji: "🥒", seedCost: 4, plantCost: 12, daysToMature: 24, minTemp: "warm", minZone: 6, maxZone: 13, frostTender: true, sellValue: 17, waterNeed: "high", soilPref: "garden", perSqFt: 1, stratDays: 0, category: "cucurbits", phMin: 6.0, phMax: 7.5, heatTolerance: "high", coldTolerance: "low", climateNote: "Very long warm-season vine; mature fruit can be dried into natural sponges." },
    { id: "jalapeno", name: "Jalapeño Pepper", emoji: "🌶️", seedCost: 4, plantCost: 13, daysToMature: 14, minTemp: "warm", minZone: 5, maxZone: 13, frostTender: true, sellValue: 15, waterNeed: "med", soilPref: "starting", perSqFt: 1, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.0, heatTolerance: "high", coldTolerance: "low", climateNote: "Warm-season pepper; handles summer heat better than cool weather." },
    { id: "habanero", name: "Habanero Pepper", emoji: "🌶️", seedCost: 5, plantCost: 15, daysToMature: 18, minTemp: "warm", minZone: 6, maxZone: 13, frostTender: true, sellValue: 18, waterNeed: "med", soilPref: "starting", perSqFt: 1, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.0, heatTolerance: "high", coldTolerance: "low", climateNote: "Very heat-loving pepper that needs a long frost-free season." },
    { id: "poblano", name: "Poblano Pepper", emoji: "🌶️", seedCost: 4, plantCost: 13, daysToMature: 16, minTemp: "warm", minZone: 5, maxZone: 13, frostTender: true, sellValue: 16, waterNeed: "med", soilPref: "starting", perSqFt: 1, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.0, heatTolerance: "high", coldTolerance: "low", climateNote: "Productive in warm weather; frost tender." },
    { id: "bananapepper", name: "Banana Pepper", emoji: "🌶️", seedCost: 4, plantCost: 12, daysToMature: 13, minTemp: "warm", minZone: 5, maxZone: 13, frostTender: true, sellValue: 14, waterNeed: "med", soilPref: "starting", perSqFt: 1, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.0, heatTolerance: "high", coldTolerance: "low", climateNote: "Fast, warm-season pepper that produces through summer." },
    { id: "shishito", name: "Shishito Pepper", emoji: "🌶️", seedCost: 4, plantCost: 12, daysToMature: 13, minTemp: "warm", minZone: 5, maxZone: 13, frostTender: true, sellValue: 14, waterNeed: "med", soilPref: "starting", perSqFt: 1, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.0, heatTolerance: "high", coldTolerance: "low", climateNote: "Warm-weather pepper with steady harvests in summer." },
    { id: "grape", name: "Grape Vine", emoji: "🍇", seedCost: 6, plantCost: 22, daysToMature: 30, minTemp: "cool", minZone: 4, maxZone: 10, frostTender: false, sellValue: 22, waterNeed: "med", soilPref: "garden", perSqFt: 1, stratDays: 60, category: "fruit", phMin: 5.5, phMax: 7.0, heatTolerance: "medium", coldTolerance: "high", climateNote: "Perennial vine; established vines handle winter cold and summer sun." },
    { id: "hardykiwi", name: "Hardy Kiwi Vine", emoji: "🥝", seedCost: 7, plantCost: 24, daysToMature: 34, minTemp: "cold", minZone: 4, maxZone: 9, frostTender: false, sellValue: 24, waterNeed: "high", soilPref: "garden", perSqFt: 1, stratDays: 60, category: "fruit", phMin: 5.5, phMax: 7.0, heatTolerance: "medium", coldTolerance: "high", climateNote: "Cold-hardy kiwi vine; needs strong support and consistent moisture." },
    { id: "bananatree", name: "Banana Plant", emoji: "🍌", seedCost: 8, plantCost: 28, daysToMature: 34, minTemp: "warm", minZone: 9, maxZone: 13, frostTender: true, sellValue: 26, waterNeed: "high", soilPref: "garden", perSqFt: 1, stratDays: 0, category: "fruit", phMin: 5.5, phMax: 7.0, heatTolerance: "high", coldTolerance: "low", climateNote: "Tropical plant that loves heat, water, and frost-free weather.", movableTree: true },
    { id: "jostaberry", name: "Jostaberry", emoji: "🫐", seedCost: 6, plantCost: 21, daysToMature: 28, minTemp: "cold", minZone: 3, maxZone: 8, frostTender: false, sellValue: 20, waterNeed: "med", soilPref: "garden", perSqFt: 1, stratDays: 60, category: "fruit", phMin: 6.0, phMax: 7.0, heatTolerance: "medium", coldTolerance: "high", climateNote: "Cold-hardy currant-gooseberry hybrid; prefers cooler climates." },
    { id: "strawberry", name: "Strawberry", emoji: "🍓", seedCost: 4, plantCost: 12, daysToMature: 14, minTemp: "cool", minZone: 3, maxZone: 10, frostTender: false, sellValue: 14, waterNeed: "med", soilPref: "garden", perSqFt: 4, stratDays: 21, category: "fruit", phMin: 5.5, phMax: 6.8, heatTolerance: "medium", coldTolerance: "high", climateNote: "Perennial fruit that tolerates cold winters; mulch helps protect crowns." },
    { id: "celery", name: "Celery", emoji: "🥬", seedCost: 3, plantCost: 10, daysToMature: 18, minTemp: "cool", minZone: 2, maxZone: 11, frostTender: false, sellValue: 13, waterNeed: "high", soilPref: "potting", perSqFt: 4, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.0, heatTolerance: "low", coldTolerance: "medium", climateNote: "Cool-season crop that needs steady moisture and struggles in high heat." },
    { id: "radish", name: "Radish", emoji: "🔴", seedCost: 2, plantCost: 5, daysToMature: 5, minTemp: "cold", minZone: 1, maxZone: 13, frostTender: false, sellValue: 6, waterNeed: "low", soilPref: "garden", perSqFt: 16, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.0, heatTolerance: "low", coldTolerance: "high", climateNote: "Fast, frost-tolerant root crop; hot weather makes roots pithy or spicy." },
    { id: "beet", name: "Beet", emoji: "🫜", seedCost: 2, plantCost: 6, daysToMature: 9, minTemp: "cold", minZone: 1, maxZone: 13, frostTender: false, sellValue: 8, waterNeed: "med", soilPref: "garden", perSqFt: 9, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", climateNote: "Cool-season root crop with good frost tolerance." },
    { id: "tatsoi", name: "Tatsoi", emoji: "🥬", seedCost: 2, plantCost: 7, daysToMature: 7, minTemp: "cold", minZone: 1, maxZone: 13, frostTender: false, sellValue: 8, waterNeed: "med", soilPref: "garden", perSqFt: 9, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", climateNote: "Very cold-hardy Asian green; excellent for fall and winter gardens." },
    { id: "pakchoi", name: "Pak Choi", emoji: "🥬", seedCost: 2, plantCost: 7, daysToMature: 7, minTemp: "cool", minZone: 2, maxZone: 13, frostTender: false, sellValue: 8, waterNeed: "med", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", climateNote: "Cool-season brassica; heat and long days encourage bolting." },
    { id: "brusselssprouts", name: "Brussels Sprouts", emoji: "🥬", seedCost: 3, plantCost: 10, daysToMature: 18, minTemp: "cold", minZone: 2, maxZone: 11, frostTender: false, sellValue: 14, waterNeed: "med", soilPref: "garden", perSqFt: 1, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", climateNote: "Long-season cold-hardy brassica; sprouts sweeten after frost." },
    { id: "cabbage", name: "Cabbage", emoji: "🥬", seedCost: 3, plantCost: 9, daysToMature: 13, minTemp: "cold", minZone: 1, maxZone: 12, frostTender: false, sellValue: 12, waterNeed: "med", soilPref: "garden", perSqFt: 1, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", climateNote: "Cold-tolerant brassica that performs best in spring and fall." },
    { id: "amaranth", name: "Amaranth", emoji: "🌾", seedCost: 3, plantCost: 9, daysToMature: 14, minTemp: "warm", minZone: 4, maxZone: 13, frostTender: true, sellValue: 11, waterNeed: "low", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "vegetables", phMin: 5.5, phMax: 7.5, heatTolerance: "high", coldTolerance: "low", climateNote: "Heat-tolerant leafy green and grain crop that thrives in summer." },
    { id: "asparagus", name: "Asparagus", emoji: "🌱", seedCost: 5, plantCost: 17, daysToMature: 26, minTemp: "cold", minZone: 2, maxZone: 9, frostTender: false, sellValue: 17, waterNeed: "med", soilPref: "garden", perSqFt: 1, stratDays: 21, category: "vegetables", phMin: 6.5, phMax: 7.5, heatTolerance: "medium", coldTolerance: "high", climateNote: "Long-lived perennial; established crowns survive very cold winters." },
    { id: "sweetpotato", name: "Sweet Potato", emoji: "🍠", seedCost: 4, plantCost: 13, daysToMature: 18, minTemp: "warm", minZone: 6, maxZone: 13, frostTender: true, sellValue: 15, waterNeed: "med", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "vegetables", phMin: 5.5, phMax: 6.5, heatTolerance: "high", coldTolerance: "low", climateNote: "Heat-loving vine crop; cold soil and frost quickly damage it." },
    { id: "redpotato", name: "Red Potato", emoji: "🥔", seedCost: 3, plantCost: 9, daysToMature: 13, minTemp: "cool", minZone: 3, maxZone: 11, frostTender: false, sellValue: 12, waterNeed: "med", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "vegetables", phMin: 5.0, phMax: 6.5, heatTolerance: "low", coldTolerance: "medium", climateNote: "Cool-season potato; tuber formation slows in prolonged heat." },
    { id: "russetpotato", name: "Russet Potato", emoji: "🥔", seedCost: 3, plantCost: 9, daysToMature: 15, minTemp: "cool", minZone: 3, maxZone: 10, frostTender: false, sellValue: 13, waterNeed: "med", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "vegetables", phMin: 5.0, phMax: 6.5, heatTolerance: "low", coldTolerance: "medium", climateNote: "Prefers cool soil and a long mild growing season." },
    { id: "purplepotato", name: "Purple Potato", emoji: "🥔", seedCost: 4, plantCost: 10, daysToMature: 14, minTemp: "cool", minZone: 3, maxZone: 10, frostTender: false, sellValue: 14, waterNeed: "med", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "vegetables", phMin: 5.0, phMax: 6.5, heatTolerance: "low", coldTolerance: "medium", climateNote: "Cool-season potato with colorful antioxidant-rich tubers." },
    { id: "shortdayonion", name: "Short-Day Onion", emoji: "🧅", seedCost: 2, plantCost: 7, daysToMature: 14, minTemp: "cool", minZone: 7, maxZone: 13, frostTender: false, sellValue: 10, waterNeed: "med", soilPref: "garden", perSqFt: 9, stratDays: 0, category: "alliums", phMin: 6.0, phMax: 7.0, heatTolerance: "medium", coldTolerance: "medium", dayLength: "short", climateNote: "Bulbs with roughly 10–12 hours of daylight; best suited to southern latitudes." },
    { id: "dayneutralonion", name: "Day-Neutral Onion", emoji: "🧅", seedCost: 2, plantCost: 7, daysToMature: 14, minTemp: "cool", minZone: 5, maxZone: 10, frostTender: false, sellValue: 10, waterNeed: "med", soilPref: "garden", perSqFt: 9, stratDays: 0, category: "alliums", phMin: 6.0, phMax: 7.0, heatTolerance: "medium", coldTolerance: "medium", dayLength: "neutral", climateNote: "Bulbs around 12–14 hours of daylight; useful across many mid-latitude gardens." },
    { id: "longdayonion", name: "Long-Day Onion", emoji: "🧅", seedCost: 2, plantCost: 7, daysToMature: 15, minTemp: "cold", minZone: 2, maxZone: 7, frostTender: false, sellValue: 11, waterNeed: "med", soilPref: "garden", perSqFt: 9, stratDays: 0, category: "alliums", phMin: 6.0, phMax: 7.0, heatTolerance: "low", coldTolerance: "high", dayLength: "long", climateNote: "Needs roughly 14–16 hours of daylight to bulb well; best for northern latitudes." },
    { id: "creepingthyme", name: "Creeping Thyme", emoji: "🌿", seedCost: 3, plantCost: 9, daysToMature: 14, minTemp: "cold", minZone: 4, maxZone: 10, frostTender: false, sellValue: 8, waterNeed: "low", soilPref: "garden", perSqFt: 9, stratDays: 21, category: "mint", phMin: 6.0, phMax: 8.0, heatTolerance: "high", coldTolerance: "high", climateNote: "Low-growing, drought-tolerant perennial that handles both heat and winter cold." },
    { id: "curryleaf", name: "Curry Leaf Plant", emoji: "🌿", seedCost: 5, plantCost: 16, daysToMature: 20, minTemp: "warm", minZone: 9, maxZone: 13, frostTender: true, sellValue: 14, waterNeed: "med", soilPref: "potting", perSqFt: 1, stratDays: 0, category: "otherherbs", phMin: 6.0, phMax: 7.0, heatTolerance: "high", coldTolerance: "low", climateNote: "Tropical aromatic shrub; loves warmth and must be protected from frost." },
    { id: "stevia", name: "Stevia", emoji: "🌿", seedCost: 4, plantCost: 12, daysToMature: 16, minTemp: "warm", minZone: 8, maxZone: 13, frostTender: true, sellValue: 12, waterNeed: "med", soilPref: "potting", perSqFt: 4, stratDays: 0, category: "otherherbs", phMin: 6.5, phMax: 7.5, heatTolerance: "high", coldTolerance: "low", climateNote: "Warm-weather herb grown for naturally sweet leaves." },
    { id: "lemongrass", name: "Lemongrass", emoji: "🌾", seedCost: 4, plantCost: 12, daysToMature: 16, minTemp: "warm", minZone: 8, maxZone: 13, frostTender: true, sellValue: 12, waterNeed: "med", soilPref: "garden", perSqFt: 1, stratDays: 0, category: "otherherbs", phMin: 6.0, phMax: 7.5, heatTolerance: "high", coldTolerance: "low", climateNote: "Tropical grass that thrives in summer heat and is frost tender." },
    { id: "celosia", name: "Celosia", emoji: "🌺", seedCost: 3, plantCost: 9, daysToMature: 14, minTemp: "warm", minZone: 4, maxZone: 13, frostTender: true, sellValue: 10, waterNeed: "low", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "otherherbs", phMin: 6.0, phMax: 7.0, heatTolerance: "high", coldTolerance: "low", climateNote: "Heat-loving ornamental/edible flower that excels in hot summers." },
    { id: "lupine", name: "Lupine", emoji: "🪻", seedCost: 3, plantCost: 10, daysToMature: 20, minTemp: "cool", minZone: 3, maxZone: 9, frostTender: false, sellValue: 11, waterNeed: "med", soilPref: "garden", perSqFt: 1, stratDays: 21, category: "otherherbs", phMin: 5.5, phMax: 7.0, heatTolerance: "low", coldTolerance: "high", climateNote: "Cool-climate flower and nitrogen-fixing legume; struggles in prolonged heat." },
    { id: "marigold", name: "Marigold", emoji: "🌼", seedCost: 2, plantCost: 7, daysToMature: 10, minTemp: "warm", minZone: 4, maxZone: 13, frostTender: true, sellValue: 8, waterNeed: "low", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "otherherbs", phMin: 6.0, phMax: 7.5, heatTolerance: "high", coldTolerance: "low", climateNote: "Tough summer flower that tolerates heat and is useful in diverse garden plantings." },
    { id: "spinach", name: "Spinach", emoji: "🥬", seedCost: 2, plantCost: 7, daysToMature: 6, minTemp: "cold", minZone: 1, maxZone: 13, frostTender: false, sellValue: 8, waterNeed: "med", soilPref: "garden", perSqFt: 9, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", climateNote: "Very cold-hardy leafy green; heat triggers bolting." },
    { id: "collards", name: "Collard Greens", emoji: "🥬", seedCost: 3, plantCost: 8, daysToMature: 9, minTemp: "cold", minZone: 2, maxZone: 13, frostTender: false, sellValue: 10, waterNeed: "med", soilPref: "garden", perSqFt: 1, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "medium", coldTolerance: "high", climateNote: "Tough brassica that tolerates frost and more heat than many other greens." },
    { id: "mustardgreens", name: "Mustard Greens", emoji: "🥬", seedCost: 2, plantCost: 7, daysToMature: 7, minTemp: "cold", minZone: 2, maxZone: 13, frostTender: false, sellValue: 8, waterNeed: "med", soilPref: "garden", perSqFt: 9, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", climateNote: "Cold-tolerant green; best flavor in cool weather." },
    { id: "arugula", name: "Arugula", emoji: "🥬", seedCost: 2, plantCost: 6, daysToMature: 6, minTemp: "cold", minZone: 2, maxZone: 13, frostTender: false, sellValue: 7, waterNeed: "low", soilPref: "garden", perSqFt: 9, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.0, heatTolerance: "low", coldTolerance: "high", climateNote: "Quick cool-season green; heat makes leaves stronger and causes bolting." },
    { id: "turnip", name: "Turnip", emoji: "🫜", seedCost: 2, plantCost: 6, daysToMature: 8, minTemp: "cold", minZone: 1, maxZone: 13, frostTender: false, sellValue: 8, waterNeed: "low", soilPref: "garden", perSqFt: 9, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", climateNote: "Fast frost-tolerant root and leafy crop." },
    { id: "rutabaga", name: "Rutabaga", emoji: "🫜", seedCost: 2, plantCost: 7, daysToMature: 12, minTemp: "cold", minZone: 1, maxZone: 11, frostTender: false, sellValue: 9, waterNeed: "med", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", climateNote: "Longer-season root crop that sweetens after cool weather." },
    { id: "parsnip", name: "Parsnip", emoji: "🥕", seedCost: 2, plantCost: 7, daysToMature: 15, minTemp: "cold", minZone: 1, maxZone: 11, frostTender: false, sellValue: 10, waterNeed: "med", soilPref: "garden", perSqFt: 9, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.0, heatTolerance: "low", coldTolerance: "high", climateNote: "Very cold-hardy root crop; frost improves sweetness." },
    { id: "mache", name: "Mâche / Corn Salad", emoji: "🥬", seedCost: 2, plantCost: 6, daysToMature: 7, minTemp: "cold", minZone: 2, maxZone: 10, frostTender: false, sellValue: 7, waterNeed: "med", soilPref: "garden", perSqFt: 9, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.0, heatTolerance: "low", coldTolerance: "high", climateNote: "Extremely cold-tolerant salad green for late fall and winter." },
    { id: "mizuna", name: "Mizuna", emoji: "🥬", seedCost: 2, plantCost: 7, daysToMature: 7, minTemp: "cold", minZone: 2, maxZone: 13, frostTender: false, sellValue: 8, waterNeed: "med", soilPref: "garden", perSqFt: 9, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", climateNote: "Cold-hardy Japanese mustard green with fast regrowth." },
    { id: "kohlrabi", name: "Kohlrabi", emoji: "🟢", seedCost: 2, plantCost: 7, daysToMature: 9, minTemp: "cold", minZone: 2, maxZone: 12, frostTender: false, sellValue: 9, waterNeed: "med", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", climateNote: "Cool-season brassica; light frost is no problem." },
    { id: "snowpea", name: "Snow Pea", emoji: "🫛", seedCost: 3, plantCost: 8, daysToMature: 9, minTemp: "cold", minZone: 2, maxZone: 11, frostTender: false, sellValue: 10, waterNeed: "med", soilPref: "garden", perSqFt: 8, stratDays: 0, category: "legumes", phMin: 6.0, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", climateNote: "Cool-season climbing pea; tolerates light frost and dislikes heat." },
    { id: "okra", name: "Okra", emoji: "🌿", seedCost: 3, plantCost: 9, daysToMature: 12, minTemp: "warm", minZone: 5, maxZone: 13, frostTender: true, sellValue: 12, waterNeed: "med", soilPref: "garden", perSqFt: 1, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "high", coldTolerance: "low", climateNote: "Classic heat-loving crop; production increases in hot weather." },
    { id: "eggplant", name: "Eggplant", emoji: "🍆", seedCost: 4, plantCost: 13, daysToMature: 16, minTemp: "warm", minZone: 5, maxZone: 13, frostTender: true, sellValue: 16, waterNeed: "med", soilPref: "starting", perSqFt: 1, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.0, heatTolerance: "high", coldTolerance: "low", climateNote: "Warm-season nightshade that prefers hot days and warm soil." },
    { id: "malabarspinach", name: "Malabar Spinach", emoji: "🥬", seedCost: 3, plantCost: 9, daysToMature: 11, minTemp: "warm", minZone: 6, maxZone: 13, frostTender: true, sellValue: 10, waterNeed: "med", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "high", coldTolerance: "low", climateNote: "Heat-loving vine green that replaces true spinach in summer." },
    { id: "newzealandspinach", name: "New Zealand Spinach", emoji: "🥬", seedCost: 3, plantCost: 9, daysToMature: 11, minTemp: "warm", minZone: 5, maxZone: 13, frostTender: true, sellValue: 10, waterNeed: "med", soilPref: "garden", perSqFt: 4, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "high", coldTolerance: "low", climateNote: "Heat-tolerant leafy green that keeps producing in summer." },
    { id: "purslane", name: "Purslane", emoji: "🌿", seedCost: 2, plantCost: 6, daysToMature: 7, minTemp: "warm", minZone: 5, maxZone: 13, frostTender: true, sellValue: 7, waterNeed: "low", soilPref: "garden", perSqFt: 9, stratDays: 0, category: "vegetables", phMin: 5.5, phMax: 7.5, heatTolerance: "high", coldTolerance: "low", climateNote: "Succulent edible green with excellent heat and drought tolerance." },
    { id: "roselle", name: "Roselle", emoji: "🌺", seedCost: 4, plantCost: 12, daysToMature: 18, minTemp: "warm", minZone: 7, maxZone: 13, frostTender: true, sellValue: 15, waterNeed: "med", soilPref: "garden", perSqFt: 1, stratDays: 0, category: "otherherbs", phMin: 5.5, phMax: 7.5, heatTolerance: "high", coldTolerance: "low", climateNote: "Tropical hibiscus crop that thrives in long, hot summers." },
    { id: "tomatillo", name: "Tomatillo", emoji: "🟢", seedCost: 4, plantCost: 12, daysToMature: 14, minTemp: "warm", minZone: 5, maxZone: 13, frostTender: true, sellValue: 14, waterNeed: "med", soilPref: "starting", perSqFt: 1, stratDays: 0, category: "vegetables", phMin: 6.0, phMax: 7.5, heatTolerance: "high", coldTolerance: "low", climateNote: "Warm-season relative of tomato; productive in summer heat." },
    { id: "crimsonclover", name: "Crimson Clover", emoji: "🌱", seedCost: 2, plantCost: 6, daysToMature: 12, minTemp: "cool", minZone: 3, maxZone: 11, frostTender: false, sellValue: 3, waterNeed: "low", soilPref: "garden", perSqFt: 16, stratDays: 0, category: "covercrops", phMin: 6.0, phMax: 7.0, heatTolerance: "medium", coldTolerance: "high", coverCrop: true, coverBenefit: "Nitrogen fixer; protects bare soil and feeds pollinators." },
    { id: "hairyvetch", name: "Hairy Vetch", emoji: "🌱", seedCost: 2, plantCost: 6, daysToMature: 14, minTemp: "cold", minZone: 3, maxZone: 10, frostTender: false, sellValue: 3, waterNeed: "low", soilPref: "garden", perSqFt: 16, stratDays: 0, category: "covercrops", phMin: 6.0, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", coverCrop: true, coverBenefit: "Cold-hardy nitrogen fixer that protects winter soil." },
    { id: "winterrye", name: "Winter Rye", emoji: "🌾", seedCost: 2, plantCost: 5, daysToMature: 12, minTemp: "cold", minZone: 2, maxZone: 10, frostTender: false, sellValue: 2, waterNeed: "low", soilPref: "garden", perSqFt: 16, stratDays: 0, category: "covercrops", phMin: 5.5, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", coverCrop: true, coverBenefit: "Excellent winter soil cover with dense roots that reduce erosion." },
    { id: "coveroats", name: "Cover-Crop Oats", emoji: "🌾", seedCost: 2, plantCost: 5, daysToMature: 10, minTemp: "cool", minZone: 3, maxZone: 10, frostTender: false, sellValue: 2, waterNeed: "low", soilPref: "garden", perSqFt: 16, stratDays: 0, category: "covercrops", phMin: 5.5, phMax: 7.5, heatTolerance: "low", coldTolerance: "medium", coverCrop: true, coverBenefit: "Fast biomass and fibrous roots; often winter-kills into easy mulch." },
    { id: "buckwheatcover", name: "Buckwheat Cover Crop", emoji: "🌾", seedCost: 2, plantCost: 5, daysToMature: 7, minTemp: "warm", minZone: 4, maxZone: 13, frostTender: true, sellValue: 2, waterNeed: "low", soilPref: "garden", perSqFt: 16, stratDays: 0, category: "covercrops", phMin: 5.0, phMax: 7.0, heatTolerance: "high", coldTolerance: "low", coverCrop: true, coverBenefit: "Very fast summer cover that suppresses weeds and attracts beneficial insects." },
    { id: "fieldpea", name: "Field Pea Cover Crop", emoji: "🫛", seedCost: 2, plantCost: 5, daysToMature: 10, minTemp: "cold", minZone: 3, maxZone: 10, frostTender: false, sellValue: 2, waterNeed: "low", soilPref: "garden", perSqFt: 16, stratDays: 0, category: "covercrops", phMin: 6.0, phMax: 7.5, heatTolerance: "low", coldTolerance: "high", coverCrop: true, coverBenefit: "Cool-season nitrogen fixer that adds biomass." },
    { id: "daikoncover", name: "Daikon Radish Cover Crop", emoji: "🫜", seedCost: 2, plantCost: 5, daysToMature: 9, minTemp: "cold", minZone: 2, maxZone: 11, frostTender: false, sellValue: 2, waterNeed: "low", soilPref: "garden", perSqFt: 9, stratDays: 0, category: "covercrops", phMin: 5.8, phMax: 7.0, heatTolerance: "low", coldTolerance: "high", coverCrop: true, coverBenefit: "Deep taproot helps break compacted soil and capture nutrients." },
    { id: "sorghumsudan", name: "Sorghum-Sudangrass", emoji: "🌾", seedCost: 2, plantCost: 6, daysToMature: 12, minTemp: "warm", minZone: 5, maxZone: 13, frostTender: true, sellValue: 2, waterNeed: "low", soilPref: "garden", perSqFt: 16, stratDays: 0, category: "covercrops", phMin: 5.5, phMax: 7.5, heatTolerance: "high", coldTolerance: "low", coverCrop: true, coverBenefit: "Huge warm-season biomass and roots that help build organic matter." },
];
// Current USDA 2023 Plant Hardiness Zone Map half-zones (1a–13b), each spanning 5°F of average annual extreme minimum winter temperature. lastFrostDay/firstFrostDay are
// days within Spring/Fall (1-20) marking the safe planting window — colder zones get a later last frost
// and earlier first frost (shorter season); null firstFrostDay means effectively frost-free.
const ZONES = [
    { id: '1a', code: '1a', baseZone: 1, name: 'Zone 1a', label: '-60 to -55°F', lastFrostDay: 20, firstFrostDay: 3 },
    { id: '1b', code: '1b', baseZone: 1, name: 'Zone 1b', label: '-55 to -50°F', lastFrostDay: 20, firstFrostDay: 3 },
    { id: '2a', code: '2a', baseZone: 2, name: 'Zone 2a', label: '-50 to -45°F', lastFrostDay: 18, firstFrostDay: 4 },
    { id: '2b', code: '2b', baseZone: 2, name: 'Zone 2b', label: '-45 to -40°F', lastFrostDay: 18, firstFrostDay: 4 },
    { id: '3a', code: '3a', baseZone: 3, name: 'Zone 3a', label: '-40 to -35°F', lastFrostDay: 16, firstFrostDay: 6 },
    { id: '3b', code: '3b', baseZone: 3, name: 'Zone 3b', label: '-35 to -30°F', lastFrostDay: 16, firstFrostDay: 6 },
    { id: '4a', code: '4a', baseZone: 4, name: 'Zone 4a', label: '-30 to -25°F', lastFrostDay: 14, firstFrostDay: 8 },
    { id: '4b', code: '4b', baseZone: 4, name: 'Zone 4b', label: '-25 to -20°F', lastFrostDay: 14, firstFrostDay: 8 },
    { id: '5a', code: '5a', baseZone: 5, name: 'Zone 5a', label: '-20 to -15°F', lastFrostDay: 12, firstFrostDay: 10 },
    { id: '5b', code: '5b', baseZone: 5, name: 'Zone 5b', label: '-15 to -10°F', lastFrostDay: 12, firstFrostDay: 10 },
    { id: '6a', code: '6a', baseZone: 6, name: 'Zone 6a', label: '-10 to -5°F', lastFrostDay: 10, firstFrostDay: 12 },
    { id: '6b', code: '6b', baseZone: 6, name: 'Zone 6b', label: '-5 to 0°F', lastFrostDay: 10, firstFrostDay: 12 },
    { id: '7a', code: '7a', baseZone: 7, name: 'Zone 7a', label: '0 to 5°F', lastFrostDay: 8, firstFrostDay: 14 },
    { id: '7b', code: '7b', baseZone: 7, name: 'Zone 7b', label: '5 to 10°F', lastFrostDay: 8, firstFrostDay: 14 },
    { id: '8a', code: '8a', baseZone: 8, name: 'Zone 8a', label: '10 to 15°F', lastFrostDay: 6, firstFrostDay: 16 },
    { id: '8b', code: '8b', baseZone: 8, name: 'Zone 8b', label: '15 to 20°F', lastFrostDay: 6, firstFrostDay: 16 },
    { id: '9a', code: '9a', baseZone: 9, name: 'Zone 9a', label: '20 to 25°F', lastFrostDay: 4, firstFrostDay: 18 },
    { id: '9b', code: '9b', baseZone: 9, name: 'Zone 9b', label: '25 to 30°F', lastFrostDay: 4, firstFrostDay: 18 },
    { id: '10a', code: '10a', baseZone: 10, name: 'Zone 10a', label: '30 to 35°F', lastFrostDay: 2, firstFrostDay: 20 },
    { id: '10b', code: '10b', baseZone: 10, name: 'Zone 10b', label: '35 to 40°F', lastFrostDay: 2, firstFrostDay: 20 },
    { id: '11a', code: '11a', baseZone: 11, name: 'Zone 11a', label: '40 to 45°F', lastFrostDay: 0, firstFrostDay: null },
    { id: '11b', code: '11b', baseZone: 11, name: 'Zone 11b', label: '45 to 50°F', lastFrostDay: 0, firstFrostDay: null },
    { id: '12a', code: '12a', baseZone: 12, name: 'Zone 12a', label: '50 to 55°F', lastFrostDay: 0, firstFrostDay: null },
    { id: '12b', code: '12b', baseZone: 12, name: 'Zone 12b', label: '55 to 60°F', lastFrostDay: 0, firstFrostDay: null },
    { id: '13a', code: '13a', baseZone: 13, name: 'Zone 13a', label: '60 to 65°F', lastFrostDay: 0, firstFrostDay: null },
    { id: '13b', code: '13b', baseZone: 13, name: 'Zone 13b', label: '65 to 70°F', lastFrostDay: 0, firstFrostDay: null },
];
// Representative U.S. locations used by the setup screen to teach that USDA hardiness zones
// describe average annual extreme minimum winter temperature — not a complete local climate profile.
const ZONE_LOCATION_INFO = {
    1: { locations: 'the coldest parts of interior Alaska', examples: 'remote Interior Alaska communities', examplesLabel: 'Example places' },
    2: { locations: 'interior Alaska and a few exceptionally cold northern pockets', examples: 'Fairbanks-area communities • Interior Alaska', examplesLabel: 'Example places' },
    3: { locations: 'Alaska, Minnesota, North Dakota, Montana, Wisconsin, Maine & other far-northern areas', examples: 'International Falls • Ely • northern Minnesota communities' },
    4: { locations: 'North Dakota, South Dakota, Minnesota, Montana, Wyoming, northern New England, upstate New York & more', examples: 'Bismarck • Fargo • Bozeman • northern New England communities' },
    5: { locations: 'Nebraska, Iowa, Illinois, Indiana, Ohio, Pennsylvania, New York, New England, mountain West areas & more', examples: 'Des Moines-area communities • northern Illinois • central Pennsylvania • inland New England', examplesLabel: 'Example areas' },
    6: { locations: 'Colorado, Kansas, Missouri, Kentucky, Ohio, Pennsylvania, New Jersey, southern New England & more', examples: 'Denver • Pittsburgh • Columbus • Cincinnati' },
    7: { locations: 'Maryland, Virginia, Delaware, North Carolina, Tennessee, Arkansas, Oklahoma, Texas, New Mexico & more', examples: 'Baltimore-area communities • Richmond-area communities • Nashville • Oklahoma City' },
    8: { locations: 'the Mid-Atlantic and Southeast, including parts of Maryland and Virginia, plus the Carolinas, Georgia, Texas and parts of the Pacific Northwest', examples: 'Southern Maryland • Richmond-area communities • Raleigh • Atlanta • Dallas • Portland-area communities' },
    9: { locations: 'Florida, coastal Georgia and South Carolina, Gulf Coast Texas and Louisiana, Arizona, California & more', examples: 'Houston • Jacksonville • Charleston • Sacramento' },
    10: { locations: 'central and southern Florida, southern Texas, southern Arizona, coastal Southern California & more', examples: 'Orlando • Tampa • Los Angeles • San Diego' },
    11: { locations: 'South Florida, the Florida Keys, warm coastal Southern California, Hawaii, Puerto Rico & other subtropical pockets', examples: 'Key West • Miami-area coastal communities • warm Southern California pockets', examplesLabel: 'Example areas' },
    12: { locations: 'Hawaii, Puerto Rico, the U.S. Virgin Islands and a few of the warmest U.S. subtropical locations', examples: 'Honolulu-area communities • Puerto Rico • U.S. Virgin Islands', examplesLabel: 'Example areas' },
    13: { locations: 'the warmest parts of Puerto Rico, Hawaii and U.S. Caribbean territories', examples: 'San Juan-area communities • Hilo-area communities • Caribbean tropical locations', examplesLabel: 'Example areas' },
    '7a': { locations: 'cooler parts of the Mid-Atlantic and interior South, including portions of Maryland, Virginia, West Virginia, Tennessee and nearby regions', examples: 'western/central Maryland areas • inland Virginia areas • higher-elevation southern communities', examplesLabel: 'Example areas' },
    '7b': { locations: 'warmer parts of the Mid-Atlantic and upper South, including portions of Maryland, Virginia, Delaware, Tennessee and North Carolina', examples: 'Baltimore-area communities • Richmond-area communities • Nashville-area communities', examplesLabel: 'Example areas' },
    '8a': { locations: 'parts of Southern Maryland and the Chesapeake Bay coast, plus portions of Virginia, North Carolina, South Carolina, Georgia, Arkansas, Oklahoma, Texas and other regions', examples: 'Southern St. Mary’s County, MD • coastal Chesapeake communities • parts of Richmond-area VA • Raleigh-area NC', examplesLabel: 'Example areas' },
    '8b': { locations: 'warmer parts of the Southeast and lower Mid-Atlantic, plus portions of Texas and the Pacific Northwest', examples: 'Atlanta-area communities • Dallas-area communities • coastal Carolinas • Portland-area communities', examplesLabel: 'Example areas' },
};
function zoneBaseNumber(zone) {
    if (zone == null) return 7;
    if (typeof zone === 'number') return Math.floor(zone);
    if (typeof zone === 'string') return parseInt(zone, 10) || 7;
    if (zone.baseZone != null) return Number(zone.baseZone);
    return parseInt(zone.id, 10) || 7;
}
function normalizeZone(zone) {
    if (!zone) return ZONES.find((z) => z.id === '8a');
    if (zone.code && ZONES.some((z) => z.id === zone.code)) return ZONES.find((z) => z.id === zone.code);
    if (typeof zone.id === 'string' && ZONES.some((z) => z.id === zone.id)) return ZONES.find((z) => z.id === zone.id);
    const legacy = zoneBaseNumber(zone);
    return ZONES.find((z) => z.id === `${legacy}a`) || ZONES.find((z) => z.id === '8a');
}
const SOILS = [
    { id: 'starting', name: 'Seed-Starting Mix', cost: 6, desc: 'Light, sterile, fine-textured. Best odds and speed for most seedlings.', speedMult: 1, baseSuccess: 0.95, groundOk: false, aeration: 85, moistureRetention: 55, nitrogen: 10, phosphorus: 10, potassium: 10 },
    { id: 'potting', name: 'Potting Soil', cost: 4, desc: 'Richer and heavier. Fine for many seedlings, a bit slower to germinate.', speedMult: 1.25, baseSuccess: 0.85, groundOk: false, aeration: 65, moistureRetention: 60, nitrogen: 35, phosphorus: 30, potassium: 30 },
    { id: 'garden', name: 'Garden Soil', cost: 2, desc: 'Dense, can compact. Cheapest, but riskiest for starting tender seeds.', speedMult: 1.6, baseSuccess: 0.65, groundOk: false, aeration: 45, moistureRetention: 50, nitrogen: 40, phosphorus: 35, potassium: 35 },
    { id: 'compost', name: 'Compost', cost: 5, desc: 'Rich, organic, nutrient-dense. Excellent for beds and ground planting — not ideal for delicate seed starting.', speedMult: 1.4, baseSuccess: 0.6, groundOk: true, aeration: 55, moistureRetention: 75, nitrogen: 70, phosphorus: 65, potassium: 60 },
    { id: 'native', name: 'Native Soil', cost: 1, desc: "The dirt that's already there. Free-ish, but benefits a lot from added organic matter like manure.", speedMult: 1.5, baseSuccess: 0.55, groundOk: true, aeration: 40, moistureRetention: 45, nitrogen: 30, phosphorus: 25, potassium: 30 },
    { id: 'clay', name: 'Clay Soil', cost: 1, desc: 'Heavy and compacted. Terrible drainage and aeration, but holds water and nutrients unusually well once plants can get roots into it.', speedMult: 1.9, baseSuccess: 0.4, groundOk: true, aeration: 15, moistureRetention: 85, nitrogen: 45, phosphorus: 40, potassium: 55 },
];
const EXTENSION_SOIL_TEST_COST = 15;
const EXTENSION_SOIL_TEST_DAYS = 3;
const MASTER_GARDENER_REPLY_DAYS = 1;
const EXTENSION_SAMPLE_SOURCES = [
    { id: 'yard', label: 'Yard / Native Ground', desc: 'Composite sample from several spots in the open yard.' },
    { id: 'beds', label: 'Raised Beds', desc: 'Composite sample from the soil currently filling your raised beds.' },
];
const MASTER_GARDENER_TOPICS = [
    { id: 'diagnose', label: 'Diagnose My Garden' },
    { id: 'soil', label: 'Soil & pH' },
    { id: 'pests', label: 'Pests & Beneficial Insects' },
    { id: 'water', label: 'Watering & Plant Health' },
    { id: 'season', label: 'What Should I Focus on This Season?' },
    { id: 'greenhouse', label: 'Greenhouse Growing' },
];
function extensionLevelLabel(value) {
    if (value < 34)
        return 'Low';
    if (value < 67)
        return 'Medium';
    return 'High';
}
const TRAY_SIZES = [
    { id: 'starter', slots: 4, cost: 6 },
    { id: 'small', slots: 12, cost: 14 },
    { id: 'medium', slots: 32, cost: 28 },
    { id: 'large', slots: 72, cost: 50 },
];
const METHOD_OPTIONS = [
    { id: 'beds', label: 'Build Garden Beds', desc: 'Construct raised beds to plant in.', icon: '🪵' },
    { id: 'indoor', label: 'Start Seeds Indoor', desc: 'Germinate seeds in trays before transplanting.', icon: '🪴' },
    { id: 'sow', label: 'Direct Sow', desc: 'Plant seeds or live plants straight into the ground or a bed.', icon: '🌱' },
];
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];
const DAYS_PER_SEASON = 20;
const STARTING_CASH_DEFAULT = 300;
const MAX_BUDGET = 1000;
const GRID_COLS = 16;
const GRID_ROWS = 10;
const CELL_PX = 52;
// A real backyard isn't a blank slate — trees are permanent design constraints, rocks are surface
// obstacles you can actually clear with a Shovel or Tiller. Generated once per new game.
function generateGroundObstacles() {
    const obstacles = [];
    const taken = new Set();
    function place(kind, count) {
        let placed = 0;
        let attempts = 0;
        while (placed < count && attempts < 500) {
            attempts++;
            const gx = Math.floor(Math.random() * GRID_COLS);
            const gy = Math.floor(Math.random() * GRID_ROWS);
            const key = `${gx},${gy}`;
            if (taken.has(key))
                continue;
            taken.add(key);
            obstacles.push({ id: obstacles.length + 1, gx, gy, kind });
            placed++;
        }
    }
    place('tree', 3);
    place('rock', 10);
    return obstacles;
}
const MIN_DAY_SECONDS = 2;
const MAX_DAY_SECONDS = 30;
const DEFAULT_DAY_SECONDS = 10;
function plantWithinZone(plant, zone) {
    const z = zoneBaseNumber(zone);
    return z >= ((plant === null || plant === void 0 ? void 0 : plant.minZone) || 1) && z <= ((plant === null || plant === void 0 ? void 0 : plant.maxZone) || 13);
}
function canGrowInZone(plant, zone) {
    if (plant === null || plant === void 0 ? void 0 : plant.movableTree)
        return true; // movable heat-loving trees keep their seasonal outdoors/greenhouse exception
    return plantWithinZone(plant, zone);
}
function greenhouseTemperatureBand(greenhouse, season, weatherToday) {
    const decor = (greenhouse === null || greenhouse === void 0 ? void 0 : greenhouse.decor) || [];
    const controls = (greenhouse === null || greenhouse === void 0 ? void 0 : greenhouse.controls) || {};
    const heaterOn = decor.includes('heater') && !!controls.heaterOn;
    const fanOn = decor.includes('ventfan') && !!controls.fanOn;
    let band = season === 'Winter' ? 'cold' : (season === 'Spring' || season === 'Fall') ? 'cool' : 'warm';
    if (weatherToday === 'freeze')
        band = 'cold';
    if (weatherToday === 'heatwave')
        band = 'hot';
    if (heaterOn && (band === 'cold' || band === 'cool'))
        band = 'warm';
    if (fanOn && band === 'hot')
        band = 'warm';
    return band;
}
function greenhousePlantClimateMatch(plant, greenhouse, season, weatherToday) {
    const band = greenhouseTemperatureBand(greenhouse, season, weatherToday);
    const wanted = (plant === null || plant === void 0 ? void 0 : plant.minTemp) || 'cool';
    if (wanted === 'warm')
        return band === 'warm' || (band === 'hot' && plantHeatTolerance(plant) === 'high');
    if (wanted === 'cold')
        return band === 'cold' || band === 'cool';
    return band === 'cool' || band === 'warm';
}
function plantHeatTolerance(plant) {
    if (plant === null || plant === void 0 ? void 0 : plant.heatTolerance)
        return plant.heatTolerance;
    if ((plant === null || plant === void 0 ? void 0 : plant.minTemp) === 'warm')
        return 'high';
    if ((plant === null || plant === void 0 ? void 0 : plant.minTemp) === 'cold')
        return 'low';
    return 'medium';
}
function plantColdTolerance(plant) {
    if (plant === null || plant === void 0 ? void 0 : plant.coldTolerance)
        return plant.coldTolerance;
    if (plant === null || plant === void 0 ? void 0 : plant.frostTender)
        return 'low';
    if ((plant === null || plant === void 0 ? void 0 : plant.minTemp) === 'cold')
        return 'high';
    return 'medium';
}
function plantClimateSummary(plant) {
    const heat = plantHeatTolerance(plant);
    const cold = plantColdTolerance(plant);
    const tags = [];
    if (heat === 'high')
        tags.push('🔥 Heat resistant');
    else if (heat === 'low')
        tags.push('🌡️ Cool-season');
    if (cold === 'high')
        tags.push('❄️ Cold hardy');
    else if (cold === 'low')
        tags.push('☀️ Frost tender');
    if ((plant === null || plant === void 0 ? void 0 : plant.dayLength) === 'short')
        tags.push('🌅 Short-day onion');
    if ((plant === null || plant === void 0 ? void 0 : plant.dayLength) === 'neutral')
        tags.push('🌤️ Day-neutral onion');
    if ((plant === null || plant === void 0 ? void 0 : plant.dayLength) === 'long')
        tags.push('🌄 Long-day onion');
    if (plant === null || plant === void 0 ? void 0 : plant.coverCrop)
        tags.push('🌾 Cover crop');
    return tags.join(' · ');
}
function isPastLastFrost(zone, season, day) {
    if (season !== 'Spring')
        return true; // any season other than Spring is already past the spring frost window
    return day >= zone.lastFrostDay;
}
function isPastFirstFrost(zone, season, day) {
    if (zone.firstFrostDay == null)
        return false; // frost-free zone
    if (season === 'Winter')
        return true;
    if (season !== 'Fall')
        return false;
    return day >= zone.firstFrostDay;
}
// Maps a real calendar date onto the game's abstracted 20-day seasons, using standard meteorological
// season boundaries (Spring: Mar-May, Summer: Jun-Aug, Fall: Sep-Nov, Winter: Dec-Feb).
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function dateToSeasonDay(month, dayOfMonth) {
    // month is 1-12. Determine which meteorological season and how far into it (0 to ~1).
    const seasonStartMonth = { 3: 0, 4: 0, 5: 0, 6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 3, 1: 3, 2: 3 };
    const seasonIdx = seasonStartMonth[month];
    const monthsIntoSeason = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2].indexOf(month) % 3;
    let daysBeforeThisMonth = 0;
    for (let i = 0; i < monthsIntoSeason; i++) {
        const m = ((month - 1 - monthsIntoSeason + i) % 12 + 12) % 12 + 1;
        daysBeforeThisMonth += MONTH_LENGTHS[m - 1];
    }
    const totalSeasonDays = 90; // approx 3 months
    const dayIntoSeason = daysBeforeThisMonth + (dayOfMonth - 1);
    const gameDay = Math.max(1, Math.min(DAYS_PER_SEASON, Math.round((dayIntoSeason / totalSeasonDays) * DAYS_PER_SEASON) + 1));
    return { seasonIdx, day: gameDay };
}
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function calendarDayOfYear(month, dayOfMonth) {
    let total = dayOfMonth - 1;
    for (let i = 0; i < month - 1; i++)
        total += MONTH_LENGTHS[i];
    return total;
}
function calendarFromDayOfYear(dayOfYear) {
    let d = ((dayOfYear % 365) + 365) % 365;
    let month = 1;
    while (month <= 12 && d >= MONTH_LENGTHS[month - 1]) {
        d -= MONTH_LENGTHS[month - 1];
        month += 1;
    }
    return { month: Math.min(month, 12), dayOfMonth: d + 1 };
}
function gameCalendarDate(startMonth, startDay, seasonIdx, day) {
    const startPos = dateToSeasonDay(startMonth, startDay);
    const startGameIndex = startPos.seasonIdx * DAYS_PER_SEASON + (startPos.day - 1);
    let currentGameIndex = seasonIdx * DAYS_PER_SEASON + (day - 1);
    if (currentGameIndex < startGameIndex)
        currentGameIndex += SEASONS.length * DAYS_PER_SEASON;
    const elapsedGameDays = currentGameIndex - startGameIndex;
    const elapsedCalendarDays = Math.round(elapsedGameDays * (365 / (SEASONS.length * DAYS_PER_SEASON)));
    return calendarFromDayOfYear(calendarDayOfYear(startMonth, startDay) + elapsedCalendarDays);
}
function gardenSeasonPhase(seasonIdx, dayInSeason) {
    const phase = dayInSeason <= 7 ? 'Early' : dayInSeason <= 14 ? 'Mid' : 'Late';
    return `${phase} ${SEASONS[seasonIdx]}`;
}
function approxFrostWeeks(gameDayDiff) {
    const calendarDays = Math.max(1, gameDayDiff) * (90 / DAYS_PER_SEASON);
    const weeks = calendarDays / 7;
    const low = Math.max(1, Math.floor(weeks - 1));
    const high = Math.max(low + 1, Math.ceil(weeks + 0.5));
    return `~${low}–${high} weeks away`;
}
function gardenAlmanacFor(zone, month, dayOfMonth) {
    const pos = dateToSeasonDay(month, dayOfMonth);
    const season = SEASONS[pos.seasonIdx];
    const phase = gardenSeasonPhase(pos.seasonIdx, pos.day);
    let frostRisk = 'Low';
    let frostDetail = 'Typical frost window is not active.';
    if (season === 'Spring') {
        const diff = zone.lastFrostDay - pos.day;
        if (zone.lastFrostDay <= 0 || diff <= 0) {
            frostRisk = 'Low';
            frostDetail = 'Typical last frost has passed.';
        }
        else {
            frostRisk = diff >= 5 ? 'High' : 'Moderate';
            frostDetail = `Last frost: ${approxFrostWeeks(diff)}`;
        }
    }
    else if (season === 'Winter') {
        frostRisk = zoneBaseNumber(zone) >= 11 ? 'Moderate' : 'High';
        frostDetail = zoneBaseNumber(zone) >= 11 ? 'Freezes are uncommon, but cold snaps can still happen.' : 'Frost and freeze conditions are still part of the season.';
    }
    else if (season === 'Fall') {
        if (zone.firstFrostDay == null) {
            frostRisk = 'Low';
            frostDetail = 'This zone is generally frost-free.';
        }
        else {
            const diff = zone.firstFrostDay - pos.day;
            if (diff <= 0) {
                frostRisk = 'High';
                frostDetail = 'Typical first-frost window has arrived.';
            }
            else {
                frostRisk = diff <= 4 ? 'High' : diff <= 8 ? 'Moderate' : 'Low';
                frostDetail = `First frost: ${approxFrostWeeks(diff)}`;
            }
        }
    }
    else {
        frostRisk = 'Low';
        frostDetail = 'Typical spring frost window is past.';
    }
    let soil = 'Mild';
    if (season === 'Spring')
        soil = pos.day <= 7 ? 'Still cool' : pos.day <= 14 ? 'Warming' : 'Warming quickly';
    else if (season === 'Summer')
        soil = 'Warm';
    else if (season === 'Fall')
        soil = pos.day <= 7 ? 'Warm, beginning to cool' : 'Cooling';
    else
        soil = 'Cold';
    let daylight = 'Changing';
    if (month >= 1 && month <= 5)
        daylight = 'Increasing';
    else if (month === 6)
        daylight = 'Near the yearly peak';
    else if (month >= 7 && month <= 11)
        daylight = 'Decreasing';
    else
        daylight = 'Near the yearly low';
    let actions;
    let wisdom;
    if (season === 'Spring' && frostRisk === 'High') {
        actions = [
            { icon: '🏠', label: 'Start indoors', crops: 'Tomatoes, peppers, eggplant' },
            { icon: '🌿', label: 'Direct sow', crops: 'Peas, spinach, radishes' },
            { icon: '🥔', label: 'Plant soon', crops: 'Potatoes' },
            { icon: '⏳', label: 'Wait', crops: 'Beans, cucumbers, squash' },
        ];
        wisdom = 'Cool-season crops can handle chilly spring conditions that would damage warm-season vegetables.';
    }
    else if (season === 'Spring' && frostRisk === 'Moderate') {
        actions = [
            { icon: '🏠', label: 'Start indoors', crops: 'Tomatoes, peppers, basil' },
            { icon: '🌿', label: 'Direct sow', crops: 'Peas, carrots, lettuce, beets' },
            { icon: '🥔', label: 'Plant soon', crops: 'Potatoes, onions, kale' },
            { icon: '⏳', label: 'Wait', crops: 'Beans, cucumbers, squash' },
        ];
        wisdom = 'A few warm afternoons do not mean frost season is over. Soil temperature and nighttime lows matter too.';
    }
    else if (season === 'Spring') {
        actions = [
            { icon: '🏠', label: 'Start indoors', crops: 'Melons, basil, succession seedlings' },
            { icon: '🌿', label: 'Direct sow', crops: 'Carrots, lettuce, beets, herbs' },
            { icon: '🌱', label: 'Plant now', crops: 'Tomatoes, peppers, potatoes' },
            { icon: '☀️', label: 'Warm-soil crops', crops: 'Beans, cucumbers, squash once soil is warm' },
        ];
        wisdom = 'Past the typical last frost, soil warmth becomes one of the best clues for deciding when warm-season crops can move outside.';
    }
    else if (season === 'Summer') {
        actions = [
            { icon: '🌱', label: 'Plant now', crops: 'Beans, cucumbers, squash, basil' },
            { icon: '💧', label: 'Watch closely', crops: 'Moisture, mulch, heat stress' },
            { icon: '🏠', label: 'Start indoors', crops: 'Fall broccoli, kale, cabbage' },
            { icon: '🌿', label: 'Succession sow', crops: 'Carrots, herbs, quick greens where temperatures allow' },
        ];
        wisdom = 'Summer gardening is as much about keeping roots cool and evenly watered as it is about adding new plants.';
    }
    else if (season === 'Fall') {
        actions = [
            { icon: '🌿', label: 'Direct sow', crops: 'Spinach, radishes, arugula, turnips' },
            { icon: '🥬', label: 'Plant now', crops: 'Kale, collards, lettuce' },
            { icon: '🌾', label: 'Protect soil', crops: 'Cover crops and mulch' },
            { icon: '⏳', label: 'Avoid', crops: 'New frost-tender warm-season crops' },
        ];
        wisdom = 'Fall planting works backward from your first frost date. Fast crops and cold-hardy plants have the best odds as days shorten.';
    }
    else {
        actions = [
            { icon: '🏠', label: 'Plan indoors', crops: 'Seed orders, trays, lights, crop plans' },
            { icon: '🌱', label: 'Start indoors', crops: zoneBaseNumber(zone) >= 8 ? 'Early tomatoes, peppers, herbs' : 'Slow-growing onions, herbs, selected perennials' },
            { icon: '🌾', label: 'Protect soil', crops: 'Mulch, cover crops, compost' },
            { icon: '⏳', label: 'Wait outdoors', crops: 'Most frost-tender vegetables' },
        ];
        wisdom = 'Winter is part of the growing cycle. Planning, soil care, and indoor starts can make spring much easier.';
    }
    return { season, phase, frostRisk, frostDetail, soil, daylight, actions, wisdom, dayInSeason: pos.day };
}
function daysToMatureFrom(plant, sourceType) {
    const offset = sourceType === 'plant' ? -8 : sourceType === 'seedling' ? -5 : 0;
    return Math.max(1, plant.daysToMature + offset);
}
function soilMatchesPlant(soilId, plant) { return soilId === plant.soilPref; }
function nurseryDaysFor(soil, light, boosted) {
    let days = BASE_NURSERY_DAYS * soil.speedMult;
    if (boosted)
        days *= 0.85;
    if (light)
        days *= light.speedMult;
    return Math.max(1, Math.round(days));
}
function germinationSuccessFor(plant, soil, light, boosted) {
    const match = soilMatchesPlant(soil.id, plant);
    let success = match ? soil.baseSuccess : Math.max(0.15, soil.baseSuccess - 0.35);
    if (boosted)
        success = Math.min(0.98, success + 0.08);
    if (light)
        success = Math.min(0.98, success * light.successMult);
    return success;
}
const FIRST_TIME_GUIDE_KEY = 'plotandseason-first-time-guides-v1';
const FIRST_TIME_GUIDES = {
    title: {
        icon: '🌱',
        title: 'Welcome to Plot & Season',
        intro: 'This game follows a real garden from planning through harvest. Your choices about climate, timing, soil, water, and care affect how the garden performs.',
        steps: [
            'Start Gardening begins a new garden. Continue Saved Game resumes a local save when one exists.',
            'Settings controls music, day speed, saving/loading, and lets you replay these first-time guides.',
            'Your progress is stored on this device/browser, so use Save Game before closing the game.'
        ]
    },
    settings: {
        icon: '⚙️',
        title: 'Settings',
        intro: 'Use this screen for game-wide controls rather than garden actions.',
        steps: [
            'Save or load your garden here when a saved game is available.',
            'Change the music, volume, and how many real seconds pass for each in-game day.',
            'Use Replay First-Time Instructions if you want these help popups to appear again.'
        ]
    },
    setup: {
        icon: '📍',
        title: 'Set Up Your Garden',
        intro: 'These choices establish the growing conditions for the entire game.',
        steps: [
            'Choose the hardiness zone that best matches where the garden will be grown, then use the location card to see where that zone commonly appears.',
            'City is optional. Your zone describes winter cold; your location adds local context for growing conditions and native plants.',
            'Start Date determines the season, frost timing, and what can safely go outdoors. You will choose your starting budget on the How Will You Garden? screen.'
        ]
    },
    avatar: {
        icon: '🧑‍🌾',
        title: 'Build Your Gardener',
        intro: 'Create the gardener who will represent you throughout the game.',
        steps: [
            'Choose a body, then Hair Type and the available Hair Color for that style.',
            'Choose eyes, lips, optional facial hair, shirt underlay, and sun hat.',
            'You can change the gardener later from Character → Update My Gardener without restarting your garden.',
            'Greenhouses are bought at the Plant Nursery, placed from Yard → Build, and clicked to enter. Crops inside are protected from outdoor frost.',
            'Ponds, trellises, planter buckets, insect netting, and brick/stone paths are sold under Plant Nursery → Materials. Click ponds to stock fish; place wood/net trellises beside vines, or place cattle-panel arches over the growing area; click planted buckets to manage container crops.'
        ]
    },
    methods: {
        icon: '🌿',
        title: 'Choose How You Will Garden',
        intro: 'Select one or more gardening methods. Your choices determine which gardening workspaces become available.',
        steps: [
            'Set your starting budget here. Everything you buy later comes out of that cash total.',
            'Raised beds lets you construct beds and grow inside them.',
            'Indoor starting unlocks trays, germination, stratification, and transplanting.',
            'Direct sowing lets you prepare open-ground squares and plant directly in the yard.',
            'You can combine methods; you do not have to choose only one.'
        ]
    },
    'tab-nursery': {
        icon: '🏬',
        title: 'Plant Nursery',
        intro: 'This is your store and supply hub. Spend cash here before building or planting.',
        steps: [
            'Buy seeds, live plants, soil, amendments, mulch, bed materials, water equipment, tools, beneficial insects, and garden gear.',
            'Owned quantities are shown in the shop/material inventory. Purchases immediately reduce CASH.',
            'You still need to place or use purchased items from the Yard or Start Indoor screens.'
        ]
    },
    'tab-extension': {
        icon: '🏛️',
        title: 'University Cooperative Extension',
        intro: 'Use research-based help instead of guessing when the garden has a problem.',
        steps: [
            'Send a Yard or Raised Bed soil sample to the Extension lab. The test costs a small fee and takes three in-game days.',
            'The soil report checks pH, nutrients, organic matter, drainage, and water holding, then recommends amendments available in the game.',
            'Ask a Master Gardener for free help with soil, pests, watering, seasonal decisions, greenhouse growing, or a general garden diagnosis.',
            'Master Gardener replies are based on the current state of your garden and arrive the next in-game day.'
        ]
    },
    'tab-indoor': {
        icon: '🪴',
        title: 'Start Indoor',
        intro: 'Use this workspace to prepare plants before they move outside.',
        steps: [
            'Use the subtabs for soil preparation, cold stratification, germination, trays, compost, and other indoor tasks.',
            'Place a tray, fill it with soil, plant seeds, and let seedlings develop over game days.',
            'When a seedling is ready, choose Transplant and the game will take you to the Yard to choose its outdoor square.'
        ]
    },
    'tab-yard': {
        icon: '🏡',
        title: 'Yard',
        intro: 'The Yard is the main hands-on gardening screen. Choose a mode first, then interact with the grid.',
        steps: [
            'Build: construct/remove beds and place water infrastructure. PVC turns green when its network reaches both a water source and a bed connector; incomplete PVC stays red.',
            'Plant: choose the source and crop, then click an eligible bed or prepared ground square.',
            'Water/Soil/Compost and other modes let you care for the garden using items you own.',
            'Ready crops show a harvest ! button. Click the ! to harvest, then open the Harvest Basket to Sell it, Keep it as food, or Save Seeds for replanting.',
            'Saved seeds immediately replenish that crop under Seeds / Live Plants Source when Seed is selected.',
            'Most pulled weeds become compost greens. Bad weeds such as pokeweed are disposed of instead.'
        ]
    },
    'pest-game': {
        icon: '🔎',
        title: 'Pest Patrol',
        intro: 'A pest alert has become an interactive garden inspection. The attacked plants are magnified so you can diagnose the problem and remove the insects.',
        steps: [
            'Click the pest icons directly on each magnified plant until that infestation is cleared.',
            'Use the Pest Guide on the right to learn why each pest appears and what reduces repeat infestations.',
            'Beneficial insects you already own can be released from this screen for continuing protection after the immediate cleanup.',
            'When every affected plant is clear, return to the Yard and keep monitoring the garden.'
        ]
    },
    'tab-character': {
        icon: '🧑‍🌾',
        title: 'Character',
        intro: 'This screen manages how your gardener looks in the running game.',
        steps: [
            'Equip garden clothes that you own and choose whether your gardener appears in the Yard.',
            'Select Update My Gardener to return to the full character builder.',
            'Saving the updated gardener returns you to the game without resetting your garden.'
        ]
    },
    'tab-catalog': {
        icon: '📖',
        title: 'Garden Catalog',
        intro: 'Use the catalog as your growing reference as you discover plants.',
        steps: [
            'Review plant information and the growing details that have been revealed during play.',
            'Use it when deciding what to buy, plant, or pair with the conditions in your garden.',
            'The catalog becomes more useful as you encounter and grow more plants.'
        ]
    },
    'tab-sunmap': {
        icon: '☀️',
        title: 'Chasing the Sun',
        intro: 'This mini-game teaches how buildings, trees, and fences change sunlight across a yard.',
        steps: [
            'Move the time slider to watch the sun and shadows change from morning through evening.',
            'Ground strips are classified as Full Sun, Part Sun/Shade, or Full Shade from their sampled daylight hours.',
            'Choose a plant from the palette, then click a ground strip to test whether that plant matches the light there.'
        ]
    }
};
function FirstTimeGuide({ guideKey, seenGuides, onDismiss }) {
    const guide = FIRST_TIME_GUIDES[guideKey];
    if (!guide || seenGuides[guideKey])
        return null;
    return (React.createElement("div", { style: { position: 'fixed', inset: 0, background: 'rgba(45,34,25,0.62)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } },
        React.createElement("div", { role: "dialog", "aria-modal": "true", "aria-label": guide.title, style: { position: 'relative', width: '100%', maxWidth: 520, maxHeight: '82vh', overflowY: 'auto', background: '#F7F2E7', border: '2px solid #4A3728', borderRadius: 8, padding: 24, boxShadow: '5px 5px 0 #4A3728', color: '#3D2B1F' } },
            React.createElement("button", { type: "button", "aria-label": "Close instructions", onClick: () => onDismiss(guideKey), style: { position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: '50%', border: '1.5px solid #4A3728', background: '#fff', color: '#4A3728', fontWeight: 900, fontSize: 17, cursor: 'pointer' } }, "\u2715"),
            React.createElement("div", { style: { fontSize: 34, marginBottom: 6 } }, guide.icon),
            React.createElement("div", { style: { fontSize: 10, fontWeight: 800, letterSpacing: 1.1, textTransform: 'uppercase', color: '#6b5844', marginBottom: 4 } }, "First-time guide"),
            React.createElement("h2", { style: { margin: '0 42px 8px 0', fontFamily: serif, fontSize: 24, color: '#4A3728' } }, guide.title),
            React.createElement("p", { style: { fontSize: 13, lineHeight: 1.55, color: '#5F4B3B', margin: '0 0 14px' } }, guide.intro),
            React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 9 } }, guide.steps.map((step, i) => (React.createElement("div", { key: i, style: { display: 'flex', gap: 10, alignItems: 'flex-start', background: '#EFE7D4', border: '1px solid #D6C5A6', borderRadius: 6, padding: '9px 10px' } },
                React.createElement("div", { style: { flex: '0 0 24px', width: 24, height: 24, borderRadius: '50%', background: '#5C7A4F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 } }, i + 1),
                React.createElement("div", { style: { fontSize: 12, lineHeight: 1.45 } }, step))))),
            React.createElement("button", { type: "button", onClick: () => onDismiss(guideKey), style: { marginTop: 16, width: '100%', padding: '11px 14px', border: '2px solid #4A3728', borderRadius: 5, background: '#5C7A4F', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: sans } }, "Got it \u2014 Start Exploring"),
            React.createElement("div", { style: { marginTop: 8, textAlign: 'center', fontSize: 10, color: '#7A6754' } }, "Close it once and it stays out of the way. You can replay all guides from Settings."))));
}
function cellsContain(cells, x, y) {
    return (cells || []).some((c) => c.x === x && c.y === y);
}
// ---------- MAIN ----------
function GardenGame() {
    const [screen, setScreen] = useState('title');
    const [activeTab, setActiveTab] = useState(null);
    const [zone, setZone] = useState(ZONES.find((z) => z.id === '8a'));
    const [budget, setBudget] = useState(STARTING_CASH_DEFAULT);
    const [playerCity, setPlayerCity] = useState('');
    const [startMonth, setStartMonth] = useState(3);
    const [startDay, setStartDay] = useState(1);
    const [enabledMethods, setEnabledMethods] = useState({ beds: false, indoor: false, sow: false });
    const [avatar, setAvatar] = useState(() => normalizeAvatarData(DEFAULT_AVATAR));
    const [equippedClothes, setEquippedClothes] = useState({ gloves: false, apron: false, hat: false });
    const [showAvatarInYard, setShowAvatarInYard] = useState(false);
    const [editingGardenerFromGame, setEditingGardenerFromGame] = useState(false);
    const [seenGuides, setSeenGuides] = useState(() => {
        try {
            const raw = window.localStorage.getItem(FIRST_TIME_GUIDE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
        }
        catch (e) {
            return {};
        }
    });
    const [cash, setCash] = useState(STARTING_CASH_DEFAULT);
    const [day, setDay] = useState(1);
    const [seasonIdx, setSeasonIdx] = useState(0);
    const [daySeconds, setDaySeconds] = useState(DEFAULT_DAY_SECONDS);
    const [musicPlaying, setMusicPlaying] = useState(false);
    const [musicVolume, setMusicVolume] = useState(0.3);
    const [selectedTrackId, setSelectedTrackId] = useState(MUSIC_TRACKS[0].id);
    const [settingsReturnScreen, setSettingsReturnScreen] = useState('title');
    const [hasSaveGame, setHasSaveGame] = useState(false);
    const audioCtxRef = useRef(null);
    const musicTimeoutRef = useRef(null);
    const musicNoteIdxRef = useRef(0);
    const musicVolumeRef = useRef(0.3);
    const audioElRef = useRef(null); // plain HTML5 Audio object for real licensed tracks (not rendered as JSX)
    const [paused, setPaused] = useState(false);
    const [isPlanning, setIsPlanning] = useState(true);
    const [beds, setBeds] = useState([]);
    const bedIdRef = useRef(0);
    const [groundPlants, setGroundPlants] = useState([]);
    const [greenhouses, setGreenhouses] = useState([]); // {id,typeId,x,y,w,h,plants:[],decor:[]}
    const greenhouseIdRef = useRef(0);
    const [greenhouseOpenId, setGreenhouseOpenId] = useState(null);
    const [ponds, setPonds] = useState([]); // {id,typeId,x,y,w,h,fish:{}}
    const pondIdRef = useRef(0);
    const [pondOpenId, setPondOpenId] = useState(null);
    const [trellises, setTrellises] = useState([]); // {id,typeId,x,y}
    const trellisIdRef = useRef(0);
    const [treeContainers, setTreeContainers] = useState([]); // {id,typeId,x,y,greenhouseId:null|id,plant:null}
    const treeContainerIdRef = useRef(0);
    const [treeContainerOpenId, setTreeContainerOpenId] = useState(null);
    const [protectiveNets, setProtectiveNets] = useState([]); // {id,x,y}
    const protectiveNetIdRef = useRef(0);
    const [paths, setPaths] = useState([]); // {id,typeId,x,y}
    const pathIdRef = useRef(0);
    const [planterBuckets, setPlanterBuckets] = useState([]); // {id,typeId,x,y,plant:null}
    const planterBucketIdRef = useRef(0);
    const [planterBucketOpenId, setPlanterBucketOpenId] = useState(null);
    const [mode, setMode] = useState('build');
    const [selectedBuildMaterial, setSelectedBuildMaterial] = useState('wood'); // wood | aluminum
    const [buildCatalogTab, setBuildCatalogTab] = useState('materials');
    const [activeBurn, setActiveBurn] = useState(null);
    const burnTimerRef = useRef(null);
    const [burnedAreas, setBurnedAreas] = useState([]);
    const burnedAreaIdRef = useRef(0);
    const [selectedWaterTool, setSelectedWaterTool] = useState(null);
    const [barrels, setBarrels] = useState([]); // physical barrel objects on grid: {id, x, y, on}
    const barrelIdRef = useRef(0);
    const [spigots, setSpigots] = useState([]); // physical spigot objects on grid: {id, x, y, on}
    const spigotIdRef = useRef(0);
    const [pipes, setPipes] = useState([]); // PVC pipe runs only: {id, type: 'pvc', x0, y0, x1, y1}
    const pipeIdRef = useRef(0);
    const [pipeWaypoints, setPipeWaypoints] = useState([]); // [{x,y}, ...] while placing a bent pipe run
    const [groundSoilTiles, setGroundSoilTiles] = useState([]); // {gx, gy, soilId, boosted} - ground squares filled with soil
    const [groundMulchTiles, setGroundMulchTiles] = useState([]); // {gx, gy, mulchId} - ground squares with mulch applied
    const [groundTilledTiles, setGroundTilledTiles] = useState([]); // {gx, gy, tool} - ground squares tilled and ready for soil
    const [groundObstacles, setGroundObstacles] = useState(() => generateGroundObstacles()); // {id, gx, gy, kind: 'rock'|'tree'}
    const [weeds, setWeeds] = useState([]); // [{id, kind:'bed'|'ground', bedId, x, y, weedType}] - safe weeds compost; pokeweed is disposed
    const weedIdRef = useRef(0);
    const [selectedFillSoil, setSelectedFillSoil] = useState(null);
    const [selectedFillBoosted, setSelectedFillBoosted] = useState(false);
    const [selectedFillMulch, setSelectedFillMulch] = useState(null);
    const [dragStart, setDragStart] = useState(null);
    const [dragCurrent, setDragCurrent] = useState(null);
    const [selectedPlantId, setSelectedPlantId] = useState(null);
    const [selectedSource, setSelectedSource] = useState('seed');
    const [pendingTransplant, setPendingTransplant] = useState(null);
    const [trays, setTrays] = useState([]);
    const trayIdRef = useRef(0);
    const [inventory, setInventory] = useState({
        seeds: {}, livePlants: {}, soils: { starting: 0, potting: 0, garden: 0, compost: 0, native: 0, clay: 0 }, emptyTrays: {},
        boostedSoils: { starting: 0, potting: 0, garden: 0, compost: 0, native: 0, clay: 0 }, // soil bags mixed with amendments
        strattedSeeds: {}, // plantId -> count of seeds that finished cold stratification, ready to germinate
        woodSqFt: 0, aluminumSqFt: 0, cementSqFt: 0, sticksSqFt: 0,
        leaves: 0, cardboard: 0, deadMatter: 0, burnDebris: 0,
        eggshells: 0, bananapeels: 0, coffeegrounds: 0, comfreyleaves: 0,
        fertilizers: { calciumtea: 0, potassiumbrew: 0, comfreytea: 0 },
        mulch: { pinebark: 0, cedarmulch: 0, pineneedles: 0, straw: 0, woodmulch: 0, rocks: 0, shadecloth: 0, weedcloth: 0 },
        waterTools: { can: 0 },
        pvcFeet: 0, spigots: 0,
        rainBarrels: 0, rainBarrelGallons: 0,
        greenhouses: { gh4x4: 0, gh6x6: 0, gh8x10: 0, gh6x12: 0 },
        greenhouseDecor: { pottingbench: 0, shelving: 0, growlight: 0, heater: 0, ventfan: 0, hangingbaskets: 0, thermometer: 0 },
        ponds: { pond1x1: 0, pond2x2: 0, pond3x3: 0, pond4x6: 0, pond6x8: 0 },
        pondFish: { goldfish: 0, mosquitofish: 0, koi: 0 },
        trellises: { woodtrellis: 0, cattlepanel: 0, tpostnet: 0 },
        protectiveNets: 0,
        paths: { brickpath: 0, stonepath: 0 },
        planterBuckets: {},
        treeContainers: { treepot25: 0, treepot35: 0 },
        additives: { vermiculite: 0, perlite: 0, coir: 0, manure: 0, sand: 0, woodash: 0, mushroomcompost: 0, acidifier: 0 },
        lights: 0, plantFood: 0,
        tools: { hoe: 0, shovel: 0, tiller: 0, handrake: 0, wheelbarrow: 0 },
        clothes: { gloves: 0, apron: 0, hat: 0 },
        storage: {}, // plantId -> count of kept (non-spoiling) harvested food
        beneficialBugs: { nematodes: 0, earthworms: 0, lacewings: 0, ladybugs: 0, mantids: 0, assassinbugs: 0, rovebeetles: 0 },
    });
    const [activeBeneficials, setActiveBeneficials] = useState([]); // [{id, bugId, daysLeft}] - released, currently working the yard
    const activeBeneficialIdRef = useRef(0);
    const [pestAlerts, setPestAlerts] = useState([]); // [{id, plantName, plantEmoji, pestId, damage, severity, recommendedBugs, location}]
    const pestAlertIdRef = useRef(0);
    const [pestEncounter, setPestEncounter] = useState(null); // { pestId, focusLocation } — opens the Pest Patrol side game
    const [weatherAlerts, setWeatherAlerts] = useState([]); // [{id, type, message}]
    const weatherAlertIdRef = useRef(0);
    const [todayWeather, setTodayWeather] = useState(null); // 'rain' | 'freeze' | 'heatwave' | null — persists for the day it happens
    const [basketSizeId, setBasketSizeId] = useState(null); // null | 'small' | 'medium' | 'large'
    const [basketItems, setBasketItems] = useState([]); // [{id, plantId, name, emoji, value, daysIn}]
    const basketItemIdRef = useRef(0);
    const [basketOpen, setBasketOpen] = useState(false);
    const [coldStratBatches, setColdStratBatches] = useState([]); // {id, plantId, daysIn, daysNeeded, ready}
    const coldStratIdRef = useRef(0);
    const [compostBatches, setCompostBatches] = useState([]); // {id, daysIn, daysNeeded, ready}
    const [fertilizerBatches, setFertilizerBatches] = useState([]); // {id, recipeId, daysIn, daysNeeded, ready}
    const fertilizerBatchIdRef = useRef(0);
    const [selectedFertilizer, setSelectedFertilizer] = useState(null);
    const compostIdRef = useRef(0);
    const [selectedLightSource, setSelectedLightSource] = useState(null);
    const [indoorSubTab, setIndoorSubTab] = useState('table'); // soil | stratify | germinate | table | compost
    const [openTrayId, setOpenTrayId] = useState(null);
    const [discovered, setDiscovered] = useState({});
    const [score, setScore] = useState(0);
    const [gardenGoals, setGardenGoals] = useState({ harvests: 0, compostStarted: 0, plantsWatered: 0 });
    const [log, setLog] = useState(['Welcome to the garden.']);
    const [quizOpen, setQuizOpen] = useState(false);
    const [soilHealthOpen, setSoilHealthOpen] = useState(false);
    const [soilTestRequests, setSoilTestRequests] = useState([]); // university Extension soil-test submissions
    const [masterGardenerRequests, setMasterGardenerRequests] = useState([]); // questions waiting on / answered by a Master Gardener
    const [logCollapsed, setLogCollapsed] = useState(false);
    const [logWidth, setLogWidth] = useState(260);
    const [logPos, setLogPos] = useState({ top: 130, right: 12 });
    const logMoveRef = useRef(null); // { startX, startY, startTop, startRight, moved } while dragging the panel itself
    const logDragRef = useRef(null); // { startX, startWidth } while dragging the resize handle
    const [quizIdx, setQuizIdx] = useState(0);
    const tickRef = useRef(null);
    useEffect(() => () => {
        if (burnTimerRef.current)
            clearInterval(burnTimerRef.current);
    }, []);
    useEffect(() => {
        if (mode !== 'burn' && activeBurn && !activeBurn.ignited)
            setActiveBurn(null);
    }, [mode, activeBurn]);
    const addLog = useCallback((msg) => setLog((l) => [msg, ...l].slice(0, 6)), []);
    const markDiscovered = useCallback((key) => setDiscovered((d) => (d[key] ? d : { ...d, [key]: true })), []);
    const invNumber = (value) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
    function openSettings() { setSettingsReturnScreen(screen); setScreen('settings'); }
    function dismissFirstTimeGuide(guideKey) {
        setSeenGuides((prev) => {
            const next = { ...prev, [guideKey]: true };
            try {
                window.localStorage.setItem(FIRST_TIME_GUIDE_KEY, JSON.stringify(next));
            }
            catch (e) { }
            return next;
        });
    }
    function replayFirstTimeGuides() {
        // Keep Settings itself dismissed so resetting the guides does not immediately cover this button.
        const next = { settings: true };
        setSeenGuides(next);
        try {
            window.localStorage.setItem(FIRST_TIME_GUIDE_KEY, JSON.stringify(next));
        }
        catch (e) { }
    }
    const SAVE_KEY = 'plotandseason-save';
    async function persistSave(key, dataObj) {
        const json = JSON.stringify(dataObj);
        if (typeof window !== 'undefined' && window.storage) {
            try {
                await window.storage.set(key, json, false);
                return true;
            }
            catch (e) {
                console.error('Save failed', e);
                return false;
            }
        }
        try {
            window.localStorage.setItem(key, json);
            return true;
        }
        catch (e) {
            console.error('Save failed', e);
            return false;
        }
    }
    async function loadSave(key) {
        if (typeof window !== 'undefined' && window.storage) {
            try {
                const res = await window.storage.get(key, false);
                return res ? JSON.parse(res.value) : null;
            }
            catch (e) {
                return null;
            } // storage throws on a missing key rather than returning null
        }
        try {
            const raw = window.localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        }
        catch (e) {
            return null;
        }
    }
    async function saveGame() {
        const data = {
            version: 1,
            zone, budget, playerCity, startMonth, startDay, enabledMethods,
            avatar, equippedClothes, showAvatarInYard,
            cash, day, seasonIdx, score, isPlanning, paused,
            beds, groundPlants, greenhouses, ponds, trellises, protectiveNets, paths, planterBuckets, treeContainers, trays,
            barrels, spigots, pipes,
            groundSoilTiles, groundMulchTiles, groundTilledTiles, weeds, burnedAreas,
            inventory, activeBeneficials,
            basketSizeId, basketItems,
            coldStratBatches, compostBatches,
            soilTestRequests, masterGardenerRequests,
            discovered, gardenGoals, log,
            daySeconds, musicVolume, selectedTrackId,
        };
        const ok = await persistSave(SAVE_KEY, data);
        addLog(ok ? '💾 Game saved.' : '⚠️ Save failed — please try again.');
        setHasSaveGame(ok || hasSaveGame);
    }
    async function loadGame() {
        const data = await loadSave(SAVE_KEY);
        if (!data) {
            addLog('No saved game found.');
            return;
        }
        setZone(normalizeZone(data.zone));
        setBudget(data.budget);
        setPlayerCity(data.playerCity || '');
        setStartMonth(data.startMonth || 3);
        setStartDay(data.startDay || 1);
        setEnabledMethods(data.enabledMethods);
        setAvatar(normalizeAvatarData(data.avatar));
        setEquippedClothes(data.equippedClothes);
        setShowAvatarInYard(!!data.showAvatarInYard);
        setCash(data.cash);
        setDay(data.day);
        setSeasonIdx(data.seasonIdx);
        setScore(data.score);
        setIsPlanning(data.isPlanning);
        setPaused(!!data.paused);
        setBeds(data.beds || []);
        setGroundPlants(data.groundPlants || []);
        setGreenhouses((data.greenhouses || []).map((g) => ({ ...g, controls: { heaterOn: false, fanOn: false, lightsOn: false, ...(g.controls || {}) } })));
        setPonds(data.ponds || []);
        setTrellises(data.trellises || []);
        setProtectiveNets(data.protectiveNets || []);
        setPaths(data.paths || []);
        setPlanterBuckets(data.planterBuckets || []);
        setTreeContainers(data.treeContainers || []);
        setTrays(data.trays || []);
        setBarrels(data.barrels || []);
        setSpigots(data.spigots || []);
        setPipes(data.pipes || []);
        setGroundSoilTiles(data.groundSoilTiles || []);
        setGroundMulchTiles(data.groundMulchTiles || []);
        setGroundTilledTiles(data.groundTilledTiles || []);
        setWeeds(data.weeds || []);
        setBurnedAreas(data.burnedAreas || []);
        burnedAreaIdRef.current = Math.max(0, ...(data.burnedAreas || []).map((a) => Number(a.id) || 0));
        setInventory((prev) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
            return ({
                ...prev,
                ...(data.inventory || {}),
                woodSqFt: invNumber((_a = data.inventory) === null || _a === void 0 ? void 0 : _a.woodSqFt),
                aluminumSqFt: invNumber((_b = data.inventory) === null || _b === void 0 ? void 0 : _b.aluminumSqFt),
                cementSqFt: invNumber((_c = data.inventory) === null || _c === void 0 ? void 0 : _c.cementSqFt),
                sticksSqFt: invNumber((_d = data.inventory) === null || _d === void 0 ? void 0 : _d.sticksSqFt),
                pvcFeet: invNumber((_e = data.inventory) === null || _e === void 0 ? void 0 : _e.pvcFeet),
                spigots: invNumber((_f = data.inventory) === null || _f === void 0 ? void 0 : _f.spigots),
                rainBarrels: invNumber((_g = data.inventory) === null || _g === void 0 ? void 0 : _g.rainBarrels),
                rainBarrelGallons: invNumber((_h = data.inventory) === null || _h === void 0 ? void 0 : _h.rainBarrelGallons),
                greenhouses: { ...prev.greenhouses, ...((data.inventory && data.inventory.greenhouses) || {}) },
                greenhouseDecor: { ...prev.greenhouseDecor, ...((data.inventory && data.inventory.greenhouseDecor) || {}) },
                ponds: { ...prev.ponds, ...((data.inventory && data.inventory.ponds) || {}) },
                pondFish: { ...prev.pondFish, ...((data.inventory && data.inventory.pondFish) || {}) },
                trellises: { ...prev.trellises, ...((data.inventory && data.inventory.trellises) || {}) },
                protectiveNets: invNumber((_j = data.inventory) === null || _j === void 0 ? void 0 : _j.protectiveNets),
                paths: { ...prev.paths, ...((data.inventory && data.inventory.paths) || {}) },
                planterBuckets: { ...prev.planterBuckets, ...((data.inventory && data.inventory.planterBuckets) || {}) },
                treeContainers: { ...prev.treeContainers, ...((data.inventory && data.inventory.treeContainers) || {}) },
                tools: { ...prev.tools, ...((data.inventory && data.inventory.tools) || {}) },
                beneficialBugs: { ...prev.beneficialBugs, ...((data.inventory && data.inventory.beneficialBugs) || {}) },
                mulch: {
                    ...prev.mulch,
                    ...((data.inventory && data.inventory.mulch) || {}),
                    shadecloth: Number.isFinite(Number((_l = (_k = data.inventory) === null || _k === void 0 ? void 0 : _k.mulch) === null || _l === void 0 ? void 0 : _l.shadecloth)) ? Number(data.inventory.mulch.shadecloth) : 0,
                    weedcloth: Number.isFinite(Number((_o = (_m = data.inventory) === null || _m === void 0 ? void 0 : _m.mulch) === null || _o === void 0 ? void 0 : _o.weedcloth)) ? Number(data.inventory.mulch.weedcloth) : 0,
                },
            });
        });
        setActiveBeneficials(data.activeBeneficials || []);
        setBasketSizeId(data.basketSizeId || null);
        setBasketItems(data.basketItems || []);
        setColdStratBatches(data.coldStratBatches || []);
        setCompostBatches(data.compostBatches || []);
        setSoilTestRequests(data.soilTestRequests || []);
        setMasterGardenerRequests(data.masterGardenerRequests || []);
        setDiscovered(data.discovered || {});
        setGardenGoals(data.gardenGoals || { harvests: 0, compostStarted: 0, plantsWatered: 0 });
        setLog(data.log || []);
        if (data.daySeconds)
            setDaySeconds(data.daySeconds);
        if (data.musicVolume != null)
            setMusicVolume(data.musicVolume);
        if (data.selectedTrackId)
            setSelectedTrackId(data.selectedTrackId);
        setActiveTab('nursery');
        setScreen('game');
    }
    useEffect(() => {
        if (paused || isPlanning) {
            if (tickRef.current)
                clearInterval(tickRef.current);
            return;
        }
        tickRef.current = setInterval(advanceDay, daySeconds * 1000);
        return () => clearInterval(tickRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [daySeconds, paused, isPlanning, beds, trays, groundPlants, greenhouses, ponds, trellises, soilTestRequests, masterGardenerRequests]);
    useEffect(() => { musicVolumeRef.current = musicVolume; }, [musicVolume]);
    useEffect(() => {
        let cancelled = false;
        loadSave(SAVE_KEY).then((data) => { if (!cancelled)
            setHasSaveGame(!!data); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        const track = MUSIC_TRACKS.find((t) => t.id === selectedTrackId) || MUSIC_TRACKS[0];
        // Real licensed track: use a plain HTML5 Audio object (not rendered as JSX, just controlled imperatively).
        if (track.audioSrc) {
            if (musicTimeoutRef.current) {
                clearTimeout(musicTimeoutRef.current);
                musicTimeoutRef.current = null;
            }
            if (!audioElRef.current)
                audioElRef.current = new Audio();
            const audioEl = audioElRef.current;
            if (audioEl.src !== new URL(track.audioSrc, window.location.href).href) {
                audioEl.src = track.audioSrc;
                audioEl.loop = true;
            }
            audioEl.volume = musicVolume;
            if (musicPlaying) {
                audioEl.play().catch((err) => addLog(`⚠️ Couldn't play "${track.name}" — your browser blocked playback. Try clicking Play again. (${err.message})`));
            }
            else {
                audioEl.pause();
            }
            return () => { audioEl.pause(); };
        }
        // Procedural fallback track: stop any real audio, then run the Web Audio API note scheduler.
        if (audioElRef.current)
            audioElRef.current.pause();
        if (!musicPlaying) {
            if (musicTimeoutRef.current) {
                clearTimeout(musicTimeoutRef.current);
                musicTimeoutRef.current = null;
            }
            return;
        }
        if (!audioCtxRef.current) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC)
                return; // Web Audio not available in this environment
            audioCtxRef.current = new AC();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended')
            ctx.resume();
        musicNoteIdxRef.current = 0;
        const beatSeconds = 60 / track.bpm;
        function playNote() {
            const freq = track.notes[musicNoteIdxRef.current % track.notes.length];
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            const vol = musicVolumeRef.current;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(vol * 0.22, now + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + beatSeconds * 0.9);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + beatSeconds);
            musicNoteIdxRef.current += 1;
            musicTimeoutRef.current = setTimeout(playNote, beatSeconds * 1000);
        }
        playNote();
        return () => {
            if (musicTimeoutRef.current) {
                clearTimeout(musicTimeoutRef.current);
                musicTimeoutRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [musicPlaying, selectedTrackId]);
    useEffect(() => {
        if (audioElRef.current)
            audioElRef.current.volume = musicVolume;
    }, [musicVolume]);
    const LOG_MIN_WIDTH = 160;
    const LOG_MAX_WIDTH = 480;
    function eventXY(e) {
        if (e.touches && e.touches.length > 0)
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (e.changedTouches && e.changedTouches.length > 0)
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    }
    const handleLogResizeMove = useCallback((e) => {
        if (!logDragRef.current)
            return;
        if (e.touches)
            e.preventDefault(); // stop the page from scrolling while resizing on a touchscreen
        const { x } = eventXY(e);
        const delta = logDragRef.current.startX - x; // panel is right-anchored, so dragging left grows it
        const next = Math.min(LOG_MAX_WIDTH, Math.max(LOG_MIN_WIDTH, logDragRef.current.startWidth + delta));
        setLogWidth(next);
    }, []);
    const stopLogResize = useCallback(() => {
        logDragRef.current = null;
        window.removeEventListener('mousemove', handleLogResizeMove);
        window.removeEventListener('mouseup', stopLogResize);
        window.removeEventListener('touchmove', handleLogResizeMove);
        window.removeEventListener('touchend', stopLogResize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleLogResizeMove]);
    function startLogResize(e) {
        const { x } = eventXY(e);
        logDragRef.current = { startX: x, startWidth: logWidth };
        window.addEventListener('mousemove', handleLogResizeMove);
        window.addEventListener('mouseup', stopLogResize);
        window.addEventListener('touchmove', handleLogResizeMove, { passive: false });
        window.addEventListener('touchend', stopLogResize);
    }
    const MOVE_CLICK_THRESHOLD = 4; // pixels of movement before a header drag counts as "moving", not "clicking to collapse"
    const handleLogMoveMove = useCallback((e) => {
        if (!logMoveRef.current)
            return;
        if (e.touches)
            e.preventDefault(); // stop the page from scrolling while moving the panel on a touchscreen
        const { x, y } = eventXY(e);
        const dx = x - logMoveRef.current.startX;
        const dy = y - logMoveRef.current.startY;
        if (Math.abs(dx) > MOVE_CLICK_THRESHOLD || Math.abs(dy) > MOVE_CLICK_THRESHOLD)
            logMoveRef.current.moved = true;
        const newTop = Math.min(window.innerHeight - 40, Math.max(0, logMoveRef.current.startTop + dy));
        const newRight = Math.min(window.innerWidth - 40, Math.max(0, logMoveRef.current.startRight - dx));
        setLogPos({ top: newTop, right: newRight });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const stopLogMove = useCallback(() => {
        var _a;
        const wasMoved = (_a = logMoveRef.current) === null || _a === void 0 ? void 0 : _a.moved;
        logMoveRef.current = null;
        window.removeEventListener('mousemove', handleLogMoveMove);
        window.removeEventListener('mouseup', stopLogMove);
        window.removeEventListener('touchmove', handleLogMoveMove);
        window.removeEventListener('touchend', stopLogMove);
        if (!wasMoved)
            setLogCollapsed((c) => !c);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleLogMoveMove]);
    function startLogMove(e) {
        const { x, y } = eventXY(e);
        logMoveRef.current = { startX: x, startY: y, startTop: logPos.top, startRight: logPos.right, moved: false };
        window.addEventListener('mousemove', handleLogMoveMove);
        window.addEventListener('mouseup', stopLogMove);
        window.addEventListener('touchmove', handleLogMoveMove, { passive: false });
        window.addEventListener('touchend', stopLogMove);
    }
    function extensionSoilEntries(sourceId) {
        if (sourceId === 'beds') {
            return beds.filter((b) => b.soilId).map((b) => ({
                soilId: b.soilId,
                ph: Number.isFinite(Number(b.ph)) ? Number(b.ph) : 6.5,
                boosted: !!b.boosted,
                nutrientBonus: Number(b.nutrientBonus || 0), organicBonus: Number(b.organicBonus || 0), aerationBonus: Number(b.aerationBonus || 0), biologyBonus: Number(b.biologyBonus || 0),
            }));
        }
        if (groundSoilTiles.length > 0) {
            return groundSoilTiles.map((t) => ({
                soilId: t.soilId || 'native',
                ph: Number.isFinite(Number(t.ph)) ? Number(t.ph) : 6.5,
                boosted: !!t.boosted,
                nutrientBonus: Number(t.nutrientBonus || 0), organicBonus: Number(t.organicBonus || 0), aerationBonus: Number(t.aerationBonus || 0), biologyBonus: Number(t.biologyBonus || 0),
            }));
        }
        // A yard exists even before the player has amended a tile; treat that initial sample as native soil.
        return [{ soilId: 'native', ph: 6.5, boosted: false, nutrientBonus: 0, organicBonus: 0, aerationBonus: 0, biologyBonus: 0 }];
    }
    function buildExtensionSoilSnapshot(sourceId) {
        const entries = extensionSoilEntries(sourceId);
        if (entries.length === 0)
            return null;
        const organicBase = { starting: 25, potting: 50, garden: 35, compost: 85, native: 30, clay: 22 };
        const totals = entries.reduce((acc, e) => {
            const soil = SOILS.find((x) => x.id === e.soilId) || SOILS.find((x) => x.id === 'native');
            const boost = e.boosted ? 12 : 0;
            acc.ph += e.ph;
            const nutrientBonus = Number(e.nutrientBonus || 0);
            const biologyBonus = Number(e.biologyBonus || 0);
            acc.n += Math.min(100, soil.nitrogen + boost + nutrientBonus);
            acc.p += Math.min(100, soil.phosphorus + boost + nutrientBonus * 0.25);
            acc.k += Math.min(100, soil.potassium + boost + nutrientBonus * 0.2);
            acc.aeration += Math.min(100, soil.aeration + Number(e.aerationBonus || 0) + biologyBonus * 0.35);
            acc.moisture += soil.moistureRetention;
            acc.organic += Math.min(100, (organicBase[soil.id] || 30) + (e.boosted ? 15 : 0) + Number(e.organicBonus || 0) + biologyBonus * 0.25);
            return acc;
        }, { ph: 0, n: 0, p: 0, k: 0, aeration: 0, moisture: 0, organic: 0 });
        const n = entries.length;
        return {
            sourceId,
            sampleCount: n,
            ph: totals.ph / n,
            nitrogen: Math.round(totals.n / n),
            phosphorus: Math.round(totals.p / n),
            potassium: Math.round(totals.k / n),
            aeration: Math.round(totals.aeration / n),
            moisture: Math.round(totals.moisture / n),
            organicMatter: Math.round(totals.organic / n),
        };
    }
    function extensionLevel(value) {
        if (value < 34)
            return 'Low';
        if (value < 67)
            return 'Medium';
        return 'High';
    }
    function buildExtensionSoilReport(snapshot) {
        const recs = [];
        if (snapshot.ph < 6.0)
            recs.push('Soil is acidic. If your crop needs a higher pH, work in a small amount of Wood Ash and retest rather than changing pH all at once.');
        else if (snapshot.ph > 7.0)
            recs.push('Soil is alkaline. Use Soil Acidifier gradually for acid-loving or neutral-pH crops, then retest.');
        else
            recs.push('pH is in a useful range for many vegetables. Match individual crops to their preferred pH before making an adjustment.');
        if (snapshot.nitrogen < 40)
            recs.push('Nitrogen is on the low side. Compost or aged Manure can raise fertility and organic matter.');
        if (snapshot.phosphorus < 35)
            recs.push('Phosphorus is relatively low. Compost or Mushroom Compost can help build the soil gradually.');
        if (snapshot.potassium < 35)
            recs.push(snapshot.ph < 6.8 ? 'Potassium is relatively low. Compost can help; Wood Ash also adds potassium but raises pH.' : 'Potassium is relatively low. Prefer Compost here because Wood Ash would push an already-high pH upward.');
        if (snapshot.aeration < 40)
            recs.push('Drainage/aeration is limited. Add organic matter; Sand or Perlite can also improve structure depending on where the soil is being used.');
        if (snapshot.moisture < 40)
            recs.push('Water-holding capacity is low. Compost or Coconut Coir can improve moisture retention.');
        if (snapshot.organicMatter < 40)
            recs.push('Organic matter is low. Regular compost additions will improve structure, nutrient cycling, and water management over time.');
        if (recs.length < 2)
            recs.push('No major correction jumps out. Keep building organic matter and make small changes based on the crops you plan to grow.');
        return {
            ph: Number(snapshot.ph.toFixed(1)),
            nitrogen: snapshot.nitrogen,
            phosphorus: snapshot.phosphorus,
            potassium: snapshot.potassium,
            aeration: snapshot.aeration,
            moisture: snapshot.moisture,
            organicMatter: snapshot.organicMatter,
            recommendations: recs,
        };
    }
    function submitExtensionSoilTest(sourceId) {
        const source = EXTENSION_SAMPLE_SOURCES.find((x) => x.id === sourceId) || EXTENSION_SAMPLE_SOURCES[0];
        if (cash < EXTENSION_SOIL_TEST_COST) {
            addLog(`Need $${EXTENSION_SOIL_TEST_COST} for the Extension soil test.`);
            return;
        }
        if (soilTestRequests.some((r) => r.status === 'pending' && r.sourceId === source.id)) {
            addLog(`A ${source.label} sample is already at the Extension lab.`);
            return;
        }
        const snapshot = buildExtensionSoilSnapshot(source.id);
        if (!snapshot) {
            addLog('There is not enough soil in that area to collect a representative sample yet.');
            return;
        }
        const request = {
            id: `soiltest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            sourceId: source.id,
            sourceLabel: source.label,
            status: 'pending',
            daysRemaining: EXTENSION_SOIL_TEST_DAYS,
            report: buildExtensionSoilReport(snapshot),
        };
        setCash((c) => c - EXTENSION_SOIL_TEST_COST);
        setSoilTestRequests((prev) => [request, ...prev].slice(0, 8));
        addLog(`📦 Soil sample sent to University Cooperative Extension — results in ${EXTENSION_SOIL_TEST_DAYS} days.`);
    }
    function currentGardenPlants() {
        return [
            ...beds.flatMap((b) => b.plants || []),
            ...groundPlants,
            ...greenhouses.flatMap((g) => g.plants || []),
            ...treeContainers.map((c) => c.plant),
        ].filter((p) => p && !p.harvested && !p.dead);
    }
    function buildMasterGardenerResponse(topicId) {
        const plants = currentGardenPlants();
        const struggling = plants.filter((p) => p.health < 65);
        const veryDry = plants.filter((p) => (p.daysUnwatered || 0) >= 2);
        const activePests = [...new Set(pestAlerts.map((a) => a.pestId))].filter(Boolean);
        const yardSoil = buildExtensionSoilSnapshot('yard');
        const bedSoil = buildExtensionSoilSnapshot('beds');
        const bullets = [];
        let headline = 'Here is what I would check first.';
        if (topicId === 'soil') {
            headline = 'Start with observation, then test before making large soil corrections.';
            const snap = bedSoil || yardSoil;
            if (snap)
                bullets.push(`Your current sampled soil is averaging about pH ${snap.ph.toFixed(1)}. A laboratory soil test will give you the clearest amendment plan.`);
            if (snap && snap.organicMatter < 40)
                bullets.push('Organic matter appears limited. Finished compost is the safest broad improvement for structure and nutrient cycling.');
            bullets.push('Match amendments to the crop and the test result; more fertilizer is not automatically better.');
        }
        else if (topicId === 'pests') {
            headline = activePests.length ? 'You have an active pest problem, so identify the pest before treating.' : 'I do not see an active pest alert right now; focus on prevention and scouting.';
            if (activePests.includes('aphids'))
                bullets.push('Aphids are active. Inspect new growth and leaf undersides; ladybugs and lacewings are useful biological controls in this game.');
            if (activePests.includes('junebugs'))
                bullets.push('June Bug pressure is active. Beneficial nematodes target soil-dwelling grubs, while regular scouting catches adult damage early.');
            if (activePests.includes('rootmaggots'))
                bullets.push('Root maggots are active. Check susceptible brassicas, onions, and root crops below the soil line; beneficial nematodes and rove beetles are the strongest biological controls here.');
            if (activePests.includes('rootaphids'))
                bullets.push('Root aphids are active. Unexplained wilt or nutrient-like stress can come from feeding below ground; inspect roots and use soil predators rather than treating only the foliage.');
            bullets.push('Good airflow, crop rotation, healthy soil, and regular inspection reduce the chance that a small pest problem becomes a major one.');
        }
        else if (topicId === 'water') {
            headline = struggling.length ? `${struggling.length} plant${struggling.length === 1 ? '' : 's'} currently show enough stress to deserve attention.` : 'Plant health looks reasonably stable right now.';
            if (veryDry.length)
                bullets.push(`${veryDry.length} plant${veryDry.length === 1 ? ' has' : 's have'} gone at least two days without effective watering. Check those first.`);
            if (todayWeather === 'heatwave')
                bullets.push('A heat wave is active. Water deeply and prioritize stressed plants; mulch and shade cloth reduce moisture loss outdoors.');
            if (todayWeather === 'rain')
                bullets.push('Outdoor crops received rain today, but greenhouse plants still need their own watering check.');
            bullets.push('Check the soil rather than watering only by the calendar; different crops and containers dry at different rates.');
        }
        else if (topicId === 'season') {
            headline = `You are gardening in ${zone.name} during ${season}.`;
            if (season === 'Spring')
                bullets.push('Prioritize cool-season crops early, then transition toward frost-tender crops as freeze risk passes.');
            if (season === 'Summer')
                bullets.push('Watch heat and water demand closely. Heat-tolerant crops, mulch, shade cloth, and consistent irrigation matter most now.');
            if (season === 'Fall')
                bullets.push('Shift toward cold-hardy vegetables and cover crops while protecting tender crops as frost approaches.');
            if (season === 'Winter')
                bullets.push('Use the greenhouse for frost-tender crops and use outdoor space for the hardiest crops or soil-building cover crops.');
            bullets.push('Use crop temperature tolerance and your first/last frost timing together rather than relying on the season name alone.');
        }
        else if (topicId === 'greenhouse') {
            headline = greenhouses.length ? `You currently have ${greenhouses.length} greenhouse${greenhouses.length === 1 ? '' : 's'} to manage.` : 'A greenhouse is most useful when it solves a specific temperature or season problem.';
            const ghPlants = greenhouses.flatMap((g) => g.plants || []).filter((p) => p && !p.dead && !p.harvested);
            if (ghPlants.length)
                bullets.push(`${ghPlants.length} crop${ghPlants.length === 1 ? ' is' : 's are'} growing under cover. Remember: outdoor rain does not water greenhouse crops.`);
            bullets.push('Use ventilation during heat, supplemental light when light is limiting, and heat protection when cold-sensitive crops would otherwise be damaged.');
            bullets.push('A greenhouse extends the season, but it does not remove the need to monitor water, pests, airflow, and plant spacing.');
        }
        else {
            if (activePests.length) {
                headline = 'Pest pressure is the most urgent issue I see right now.';
                bullets.push('Open Pest Patrol, identify the affected plants, and use the appropriate beneficial insect before the infestation spreads.');
            }
            else if (veryDry.length) {
                headline = 'Water stress is the most urgent issue I see right now.';
                bullets.push(`${veryDry.length} plant${veryDry.length === 1 ? ' needs' : 's need'} a watering check before you make other changes.`);
            }
            else if (struggling.length) {
                headline = 'Several plants are stressed, but there is not one obvious pest or watering emergency.';
                bullets.push('Check soil pH, watering consistency, current weather, and crop temperature preference before adding fertilizer.');
            }
            else {
                headline = 'Your garden does not have an obvious emergency right now.';
                bullets.push('Keep scouting, water according to crop need, and use a soil test before making major fertility or pH changes.');
            }
            if (todayWeather === 'freeze')
                bullets.push('A freeze just occurred. Inspect outdoor frost-tender crops first; greenhouse crops are protected from the outdoor freeze event.');
            if (todayWeather === 'heatwave')
                bullets.push('A heat wave is active. Prioritize moisture, shade, and airflow.');
        }
        return { headline, bullets: bullets.slice(0, 4) };
    }
    function askMasterGardener(topicId) {
        const topic = MASTER_GARDENER_TOPICS.find((x) => x.id === topicId) || MASTER_GARDENER_TOPICS[0];
        if (masterGardenerRequests.some((r) => r.status === 'pending')) {
            addLog('You already have a question waiting for the Master Gardener desk.');
            return;
        }
        const request = {
            id: `mg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            topicId: topic.id,
            topicLabel: topic.label,
            status: 'pending',
            daysRemaining: MASTER_GARDENER_REPLY_DAYS,
            response: buildMasterGardenerResponse(topic.id),
        };
        setMasterGardenerRequests((prev) => [request, ...prev].slice(0, 8));
        addLog(`📨 Question sent to the Master Gardener help desk — expect a reply in ${MASTER_GARDENER_REPLY_DAYS} day.`);
    }
    function advanceDay() {
        var _a;
        const nextDayVal = day + 1;
        setDay(() => {
            if (nextDayVal > DAYS_PER_SEASON) {
                setSeasonIdx((s) => (s + 1) % SEASONS.length);
                return 1;
            }
            return nextDayVal;
        });
        const needsLog = [];
        const finishedBurnRecovery = burnedAreas.filter((a) => (a.daysRemaining || 0) <= 1);
        setBurnedAreas((prev) => prev.map((a) => ({ ...a, daysRemaining: Math.max(0, (a.daysRemaining || 0) - 1) })).filter((a) => a.daysRemaining > 1));
        if (finishedBurnRecovery.length)
            needsLog.push(`🌱 ${finishedBurnRecovery.length} burned patch${finishedBurnRecovery.length === 1 ? '' : 'es'} finished its two-month recovery period — weeds and pests can return there again.`);
        const finishingSoilTests = soilTestRequests.filter((r) => r.status === 'pending' && r.daysRemaining <= 1);
        const finishingGardenerReplies = masterGardenerRequests.filter((r) => r.status === 'pending' && r.daysRemaining <= 1);
        setSoilTestRequests((prev) => prev.map((r) => r.status === 'pending'
            ? { ...r, daysRemaining: Math.max(0, r.daysRemaining - 1), status: r.daysRemaining <= 1 ? 'ready' : 'pending' }
            : r));
        setMasterGardenerRequests((prev) => prev.map((r) => r.status === 'pending'
            ? { ...r, daysRemaining: Math.max(0, r.daysRemaining - 1), status: r.daysRemaining <= 1 ? 'ready' : 'pending' }
            : r));
        if (finishingSoilTests.length)
            needsLog.push('📬 Your University Extension soil-test report is ready — open the Extension tab.');
        if (finishingGardenerReplies.length)
            needsLog.push('🧑🏽‍🌾 A Master Gardener replied to your question — open the Extension tab.');
        const newPestAlerts = [];
        const glovesOwned = inventory.clothes.gloves > 0;
        // Protection this tick = the single most effective active beneficial bug against each pest type.
        const protectionVs = { aphids: 0, junebugs: 0, rootmaggots: 0, rootaphids: 0 };
        activeBeneficials.forEach((ab) => {
            const bug = BENEFICIAL_BUGS.find((b) => b.id === ab.bugId);
            if (!bug)
                return;
            Object.keys(protectionVs).forEach((pestId) => { protectionVs[pestId] = Math.max(protectionVs[pestId], beneficialEffectForPest(bug, pestId)); });
        });
        const hasAnyBeneficials = activeBeneficials.some((ab) => { var _a; return !((_a = BENEFICIAL_BUGS.find((b) => b.id === ab.bugId)) === null || _a === void 0 ? void 0 : _a.soilBuilder); });
        const earthwormsActive = activeBeneficials.some((ab) => ab.bugId === 'earthworms');
        const pastFirstFrost = isPastFirstFrost(zone, season, day);
        if (pastFirstFrost) {
            const exposedTrees = treeContainers.filter((c) => !c.greenhouseId && c.plant && !c.plant.dead && c.plant.frostTender);
            if (exposedTrees.length)
                needsLog.push(`❄️ ${exposedTrees.length} cold-sensitive container tree${exposedTrees.length === 1 ? ' is' : 's are'} still outside after frost risk began. Move ${exposedTrees.length === 1 ? 'it' : 'them'} into a greenhouse.`);
        }
        // Roll for a weather event today. Rain is handled as a bulk effect below (auto-waters everything);
        // freeze and heat wave feed into the per-plant aging function.
        const newWeatherAlerts = [];
        let weatherToday = null;
        if (Math.random() < WEATHER_CHANCE) {
            const roll = Math.random();
            weatherToday = roll < WEATHER_WEIGHTS.rain ? 'rain'
                : roll < WEATHER_WEIGHTS.rain + WEATHER_WEIGHTS.freeze ? 'freeze'
                    : 'heatwave';
            if (weatherToday === 'rain') {
                needsLog.push('🌧️ Rain today — every outdoor plant got watered for free, and rain barrels topped off.');
            }
            else if (weatherToday === 'freeze') {
                needsLog.push('❄️ An unseasonal freeze hit overnight — frost-tender plants took damage.');
                newWeatherAlerts.push({ type: 'freeze', message: 'An unseasonal freeze hit last night. Frost-tender plants took real damage — check the Yard.' });
            }
            else {
                needsLog.push('🔥 A heat wave today — plants are losing water much faster unless shaded or watered.');
                newWeatherAlerts.push({ type: 'heatwave', message: 'Heat wave! Water-related health loss is much worse today. Water more often, or use Shade Cloth to protect beds and ground squares.' });
            }
        }
        setTodayWeather(weatherToday);
        ponds.forEach((pond) => {
            const control = pondMosquitoControl(pond);
            const chance = 0.16 * (1 - control);
            if (Math.random() < chance)
                needsLog.push(control > 0.45 ? '💧 A few mosquito larvae appeared, but pond fish are keeping them mostly under control.' : '🦟 Mosquito larvae are building up in a pond — mosquitofish are especially effective biological control.');
        });
        const ageFn = (p, mulchId, soilPh, location = null) => {
            var _a, _b, _c, _d;
            if (!p || p.harvested)
                return p;
            let drop = healthDropFor(p.waterNeed);
            if (glovesOwned)
                drop = Math.round(drop * (1 - CLOTHES.find((c) => c.id === 'gloves').amount));
            const mulch = mulchId ? MULCH_TYPES.find((m) => m.id === mulchId) : null;
            if (mulch)
                drop = Math.round(drop * (1 - mulch.moistureBonus));
            if (weatherToday === 'heatwave') {
                const heatShield = mulch ? mulch.heatProtection : 0;
                const heatTolerance = plantHeatTolerance(p);
                const heatStressFactor = heatTolerance === 'high' ? 0.35 : heatTolerance === 'medium' ? 0.7 : 1;
                drop = Math.round(drop * (1 + HEATWAVE_EXTRA_DECAY_MULT * (1 - heatShield) * heatStressFactor));
            }
            const insideGreenhouse = (location === null || location === void 0 ? void 0 : location.kind) === 'greenhouse';
            const greenhouseForPlant = insideGreenhouse ? greenhouses.find((g) => g.id === location.greenhouseId) : null;
            const greenhouseControls = { heaterOn: false, fanOn: false, lightsOn: false, ...((greenhouseForPlant === null || greenhouseForPlant === void 0 ? void 0 : greenhouseForPlant.controls) || {}) };
            const greenhouseHasFan = !!((_a = greenhouseForPlant === null || greenhouseForPlant === void 0 ? void 0 : greenhouseForPlant.decor) === null || _a === void 0 ? void 0 : _a.includes('ventfan')) && greenhouseControls.fanOn;
            const greenhouseHasGrowLight = !!((_b = greenhouseForPlant === null || greenhouseForPlant === void 0 ? void 0 : greenhouseForPlant.decor) === null || _b === void 0 ? void 0 : _b.includes('growlight')) && greenhouseControls.lightsOn;
            const greenhouseHasHeater = !!((_c = greenhouseForPlant === null || greenhouseForPlant === void 0 ? void 0 : greenhouseForPlant.decor) === null || _c === void 0 ? void 0 : _c.includes('heater')) && greenhouseControls.heaterOn;
            if (insideGreenhouse && weatherToday === 'heatwave' && greenhouseHasFan)
                drop = Math.round(drop * 0.45);
            const wateredEffectively = p.wateredToday || (weatherToday === 'rain' && !insideGreenhouse);
            const nextDaysUnwatered = wateredEffectively ? 0 : (p.daysUnwatered || 0) + 1;
            const melonDeepWaterGrace = isMelonPlant(p) && nextDaysUnwatered <= MELON_DRY_DAY_GRACE;
            // Melons still want deep, regular watering, but their long 18-22 day crop cycle should not
            // collapse after one missed watering window. After the two-day grace period, cap drought
            // damage so a healthy vine has time to reach harvest; heat waves remain more punishing.
            const melonWaterDrop = isMelonPlant(p)
                ? Math.min(drop, weatherToday === 'heatwave' ? 14 : 9)
                : drop;
            let health = Math.max(0, p.health - (wateredEffectively || melonDeepWaterGrace ? 0 : melonWaterDrop));
            let pest = p.pest || null;
            const activeFireHere = (location === null || location === void 0 ? void 0 : location.kind) === 'ground' && activeBurn && activeBurn.ignited && cellsContain(activeBurn.fireCells || activeBurn.cells, location.x, location.y);
            const burnRecoveryHere = (location === null || location === void 0 ? void 0 : location.kind) === 'ground' && burnedAreas.some((a) => (a.daysRemaining || 0) > 0 && cellsContain(a.cells, location.x, location.y));
            const burnPestSuppressed = activeFireHere || burnRecoveryHere;
            if (activeFireHere)
                return { ...p, health: 0, pest: null, dead: true };
            if (burnPestSuppressed)
                pest = null;
            const nearbyTrellis = trellisForPlantLocation(p, location);
            const protectiveNet = netForPlantLocation(p, location);
            // Mulch soil-health tradeoff: weed cloth blocks organic matter and soil life from cycling nutrients,
            // so it costs a small amount of health over time even though it's the best weed barrier available.
            if (mulch && mulch.soilHealthPenalty > 0) {
                health = Math.max(0, health - Math.round(mulch.soilHealthPenalty * 8));
            }
            // Soil pH: real, gradual stress when the square's pH sits outside a plant's actual preferred range —
            // wrong pH locks up nutrients even when they're present, which is why it matters independent of watering.
            if (soilPh != null && p.phMin != null && (soilPh < p.phMin || soilPh > p.phMax)) {
                const off = soilPh < p.phMin ? p.phMin - soilPh : soilPh - p.phMax;
                health = Math.max(0, health - Math.min(10, Math.round(off * 6)));
            }
            // Out-of-zone greenhouse crops are purchasable, but the greenhouse must actually be managed.
            if (insideGreenhouse && greenhouseForPlant) {
                const climateOk = greenhousePlantClimateMatch(p, greenhouseForPlant, season, weatherToday);
                const outsideZone = !plantWithinZone(p, zone);
                if (!climateOk) {
                    const climatePenalty = outsideZone ? 14 : 7;
                    health = Math.max(0, health - climatePenalty);
                    if (outsideZone && health > 0 && Math.random() < 0.22)
                        needsLog.push(`🌡️ ${p.name} is outside its normal zone and the greenhouse climate is wrong — adjust the heater/vent controls.`);
                }
                if (outsideZone && season === 'Winter' && !greenhouseHasGrowLight) {
                    health = Math.max(0, health - 3);
                }
            }
            // Unseasonal freeze — a smaller, random echo of the real seasonal frost kill.
            if (weatherToday === 'freeze' && !p.dead && !insideGreenhouse) {
                const coldTolerance = plantColdTolerance(p);
                if (p.frostTender || coldTolerance === 'low') {
                    health = Math.max(0, health - FREEZE_DAMAGE);
                }
                else if (coldTolerance === 'medium') {
                    health = Math.max(0, health - Math.round(FREEZE_DAMAGE * 0.25));
                }
                // High cold tolerance takes no unseasonal-freeze damage.
            }
            // Frost kill for tender plants once the first frost has hit — real and immediate, not gradual.
            if (p.frostTender && pastFirstFrost && !p.dead && !insideGreenhouse) {
                const wasAlive = health > 0;
                health = Math.max(0, health - 60);
                if (wasAlive && health <= 0)
                    needsLog.push(`❄️ ${p.emoji} ${p.name} was killed by the first frost.`);
                else if (wasAlive)
                    needsLog.push(`❄️ ${p.emoji} ${p.name} is being damaged by frost!`);
            }
            // Pest infestation and damage/clearing, only once a plant already exists and is alive.
            // Active beneficial predators now reduce the chance of a NEW outbreak as well as helping clear an existing one.
            // Cedar mulch gets a modest prevention bonus because its aromatic oils can deter some garden pests.
            if (!pest && !burnPestSuppressed) {
                const candidatePest = pestCandidatesForPlant(p);
                const predatorPrevention = Math.min(0.75, (protectionVs[candidatePest] || 0) * 0.7);
                const cedarPrevention = (mulch === null || mulch === void 0 ? void 0 : mulch.id) === 'cedarmulch' ? 0.2 : 0;
                const trellisAirflowProtection = nearbyTrellis ? 0.18 : 0;
                const netProtection = protectiveNet ? TREE_BUSH_NET.protection : 0;
                const adjustedInfestChance = PEST_INFEST_CHANCE * (1 - predatorPrevention) * (1 - cedarPrevention) * (1 - trellisAirflowProtection) * (1 - netProtection);
                if (Math.random() < adjustedInfestChance) {
                    pest = candidatePest;
                    needsLog.push(`${PESTS[pest].icon} ${p.name} has been infested with ${PESTS[pest].name}!`);
                    const bestBugs = [...BENEFICIAL_BUGS].filter((b) => beneficialEffectForPest(b, pest) > 0).sort((a, b) => beneficialEffectForPest(b, pest) - beneficialEffectForPest(a, pest)).slice(0, 2);
                    newPestAlerts.push({
                        plantName: p.name, plantEmoji: p.emoji, pestId: pest,
                        damage: PESTS[pest].dailyDamage,
                        severity: PESTS[pest].dailyDamage >= 10 ? 'Severe' : 'Moderate',
                        recommendedBugs: bestBugs,
                        location,
                    });
                }
            }
            if (pest) {
                const protection = protectionVs[pest] || 0;
                const pestDamage = Math.round(PESTS[pest].dailyDamage * (1 - protection));
                health = Math.max(0, health - pestDamage);
                if (hasAnyBeneficials && Math.random() < protection) {
                    pest = null;
                    needsLog.push(`✅ Beneficial bugs cleared the ${((_d = PESTS[p.pest]) === null || _d === void 0 ? void 0 : _d.name) || 'pest'} infestation on ${p.name}.`);
                }
            }
            const daysUnwatered = nextDaysUnwatered;
            if (daysUnwatered === 7)
                needsLog.push(`💧 ${p.emoji} ${p.name} hasn't been watered in a week — it needs water now!`);
            if (!wateredEffectively && health < 60 && health > 0)
                needsLog.push(`${p.emoji} ${p.name} needs water (health ${health}%).`);
            if (health <= 0 && p.health > 0 && !(p.frostTender && pastFirstFrost))
                needsLog.push(`${p.emoji} ${p.name} died.`);
            // Blossom end rot: real risk for fruiting veg when watering has been inconsistent and the plant
            // hasn't been treated with Calcium Tea. Once it hits, the fruit is visibly spoiled (lower sell value).
            let sellValue = p.sellValue;
            let hadBER = p.hadBER || false;
            if (!hadBER && !p.calciumProtected && health > 0 && BER_SUSCEPTIBLE.includes(p.id) && daysUnwatered >= 2) {
                if (Math.random() < BER_DAILY_CHANCE) {
                    hadBER = true;
                    sellValue = Math.max(1, Math.round(sellValue * BER_SELLVALUE_PENALTY));
                    needsLog.push(`🍅 ${p.emoji} ${p.name} developed blossom end rot — uneven watering plus a calcium shortage. Sell value dropped; Calcium Tea prevents this.`);
                }
            }
            const trellisType = nearbyTrellis ? TRELLIS_TYPES.find((t) => t.id === nearbyTrellis.typeId) : null;
            const trellisGrowth = trellisType ? (p.id === 'tomatoindeterminate' ? Math.max(1.22, trellisType.growthMult) : trellisType.growthMult) : 1;
            const climateMatched = !insideGreenhouse || !greenhouseForPlant || greenhousePlantClimateMatch(p, greenhouseForPlant, season, weatherToday);
            const growthStep = insideGreenhouse ? (climateMatched ? (greenhouseHasGrowLight ? 1.2 : 1) : 0.25) : trellisGrowth;
            const nextAge = p.age + growthStep;
            const vineSprawl = isViningPlant(p)
                ? (nearbyTrellis ? Math.max(0, Number(p.vineSprawl || 0) - 2) : (!insideGreenhouse ? Math.min(6, Number(p.vineSprawl || 0) + 1) : Number(p.vineSprawl || 0)))
                : 0;
            let ripeAlerted = !!p.ripeAlerted;
            if (isMelonPlant(p) && !ripeAlerted && health > 0 && nextAge >= p.daysToMature) {
                ripeAlerted = true;
                needsLog.push(`🧺 ${p.emoji} ${p.name} is ripe and ready to harvest now!`);
            }
            const newlyDead = health <= 0 && !p.dead;
            let salvageDaysLeft = Number(p.salvageDaysLeft || 0);
            let salvageExpired = !!p.salvageExpired;
            let salvageExpiryLogged = !!p.salvageExpiryLogged;
            if (isMelonPlant(p) && nextAge >= p.daysToMature && health <= 0) {
                if (newlyDead) {
                    salvageDaysLeft = MELON_SALVAGE_DAYS;
                    salvageExpired = false;
                    salvageExpiryLogged = false;
                    needsLog.push(`🧺 ${p.emoji} ${p.name}'s vine died, but the mature fruit can still be salvaged for ${MELON_SALVAGE_DAYS} days at reduced value.`);
                }
                else if (!salvageExpired && salvageDaysLeft > 0) {
                    salvageDaysLeft = Math.max(0, salvageDaysLeft - 1);
                    if (salvageDaysLeft <= 0) {
                        salvageExpired = true;
                        if (!salvageExpiryLogged) {
                            salvageExpiryLogged = true;
                            needsLog.push(`⌛ ${p.emoji} ${p.name}'s salvage window expired — the fruit is now lost and the vine can only be composted.`);
                        }
                    }
                }
            }
            return { ...p, health, pest, daysUnwatered, sellValue, hadBER, vineSprawl, age: nextAge, wateredToday: false, dead: health <= 0, ripeAlerted, salvageDaysLeft, salvageExpired, salvageExpiryLogged };
        };
        setBeds((prev) => prev.map((bed) => ({ ...bed, plants: bed.plants.map((p) => ageFn(p, bed.mulchId, bed.ph, { kind: 'bed', bedId: bed.id, x: p.sx, y: p.sy })) })));
        setGroundPlants((prev) => prev.map((p) => {
            const mulchTile = groundMulchTiles.find((t) => t.gx === p.gx && t.gy === p.gy);
            const soilTile = groundSoilTiles.find((t) => t.gx === p.gx && t.gy === p.gy);
            return ageFn(p, mulchTile ? mulchTile.mulchId : null, soilTile ? soilTile.ph : null, { kind: 'ground', x: p.gx, y: p.gy });
        }));
        // Companion planting: real, small daily effects from orthogonally adjacent plants (good and bad
        // pairings), checked against the layout as it stood before today's other changes.
        setBeds((prev) => prev.map((bed) => ({
            ...bed,
            plants: bed.plants.map((p) => {
                if (!p || p.dead || p.harvested)
                    return p;
                let delta = 0;
                const neighborOffsets = [[0, -1], [0, 1], [-1, 0], [1, 0]];
                neighborOffsets.forEach(([dx, dy]) => {
                    const neighbor = bed.plants.find((n) => n && !n.dead && !n.harvested && n.sx === p.sx + dx && n.sy === p.sy + dy);
                    if (!neighbor)
                        return;
                    const rel = companionRelation(p.id, neighbor.id);
                    if (rel === 'good')
                        delta += 2;
                    else if (rel === 'bad')
                        delta -= 3;
                });
                if (delta === 0)
                    return p;
                return { ...p, health: Math.max(0, Math.min(100, p.health + delta)) };
            }),
        })));
        setGroundPlants((prevGP) => prevGP.map((p) => {
            if (!p || p.dead || p.harvested)
                return p;
            let delta = 0;
            const neighborOffsets = [[0, -1], [0, 1], [-1, 0], [1, 0]];
            neighborOffsets.forEach(([dx, dy]) => {
                const neighbor = prevGP.find((n) => n && !n.dead && !n.harvested && n.gx === p.gx + dx && n.gy === p.gy + dy);
                if (!neighbor)
                    return;
                const rel = companionRelation(p.id, neighbor.id);
                if (rel === 'good')
                    delta += 2;
                else if (rel === 'bad')
                    delta -= 3;
            });
            if (delta === 0)
                return p;
            return { ...p, health: Math.max(0, Math.min(100, p.health + delta)) };
        }));
        // Living soil-building crops add fertility gradually; earthworms improve structure and nutrient cycling.
        setBeds((prev) => prev.map((bed) => {
            const builders = (bed.plants || []).filter((p) => p && !p.dead && !p.harvested && soilBuilderProfile(p));
            const nGain = builders.reduce((sum, p) => { var _a; return sum + (((_a = soilBuilderProfile(p)) === null || _a === void 0 ? void 0 : _a.n) || 0); }, 0) + (earthwormsActive && bed.mulchId !== 'weedcloth' ? 0.35 : 0);
            const oGain = builders.reduce((sum, p) => { var _a; return sum + (((_a = soilBuilderProfile(p)) === null || _a === void 0 ? void 0 : _a.organic) || 0); }, 0) + (earthwormsActive && bed.mulchId !== 'weedcloth' ? 0.25 : 0);
            const aGain = builders.reduce((sum, p) => { var _a; return sum + (((_a = soilBuilderProfile(p)) === null || _a === void 0 ? void 0 : _a.aeration) || 0); }, 0) + (earthwormsActive && bed.mulchId !== 'weedcloth' ? 0.25 : 0);
            if (!bed.soilId || (nGain + oGain + aGain) <= 0)
                return bed;
            return { ...bed, nutrientBonus: Math.min(35, (bed.nutrientBonus || 0) + nGain), organicBonus: Math.min(30, (bed.organicBonus || 0) + oGain), aerationBonus: Math.min(25, (bed.aerationBonus || 0) + aGain), biologyBonus: Math.min(25, (bed.biologyBonus || 0) + (earthwormsActive ? 0.4 : 0)) };
        }));
        setGroundSoilTiles((prev) => prev.map((tile) => {
            const plant = groundPlants.find((p) => p && !p.dead && !p.harvested && p.gx === tile.gx && p.gy === tile.gy);
            const builder = soilBuilderProfile(plant);
            const blocked = groundMulchTiles.some((m) => m.gx === tile.gx && m.gy === tile.gy && m.mulchId === 'weedcloth');
            const nGain = ((builder === null || builder === void 0 ? void 0 : builder.n) || 0) + (earthwormsActive && !blocked ? 0.35 : 0);
            const oGain = ((builder === null || builder === void 0 ? void 0 : builder.organic) || 0) + (earthwormsActive && !blocked ? 0.25 : 0);
            const aGain = ((builder === null || builder === void 0 ? void 0 : builder.aeration) || 0) + (earthwormsActive && !blocked ? 0.25 : 0);
            if ((nGain + oGain + aGain) <= 0)
                return tile;
            return { ...tile, nutrientBonus: Math.min(35, (tile.nutrientBonus || 0) + nGain), organicBonus: Math.min(30, (tile.organicBonus || 0) + oGain), aerationBonus: Math.min(25, (tile.aerationBonus || 0) + aGain), biologyBonus: Math.min(25, (tile.biologyBonus || 0) + (earthwormsActive && !blocked ? 0.4 : 0)) };
        }));
        setActiveBeneficials((prev) => prev.map((ab) => ({ ...ab, daysLeft: ab.daysLeft - 1 })).filter((ab) => ab.daysLeft > 0));
        setGreenhouses((prev) => prev.map((g) => ({
            ...g,
            plants: (g.plants || []).map((p) => ageFn(p, null, 6.5, { kind: 'greenhouse', greenhouseId: g.id })),
            hydroponics: (g.hydroponics || []).map((h) => {
                if (h.type !== 'kratky')
                    return h;
                const activeCount = (h.plants || []).filter((p) => p && !p.dead && !p.harvested).length;
                const nextReservoir = Math.max(0, (h.reservoir ?? 100) - activeCount * 3);
                const nextNutrients = Math.max(0, (h.nutrients ?? 100) - activeCount * 1.5);
                const airGap = 100 - nextReservoir;
                return { ...h, reservoir: nextReservoir, nutrients: nextNutrients, plants: (h.plants || []).map((p) => {
                    if (!p || p.dead || p.harvested)
                        return p;
                    let health = p.health ?? 100;
                    if (nextReservoir <= 4)
                        health = Math.max(0, health - 18);
                    else if (airGap < 12 && p.age > 3)
                        health = Math.max(0, health - 8);
                    if (nextNutrients < 15)
                        health = Math.max(0, health - 6);
                    const growth = nextReservoir > 4 && nextNutrients > 10 ? 1.08 : .45;
                    return { ...p, age: p.age + growth, health, dead: health <= 0 };
                }) };
            })
        })));
        setTreeContainers((prev) => prev.map((c) => c.plant ? { ...c, plant: ageFn(c.plant, null, 6.5, c.greenhouseId ? { kind: 'greenhouse', greenhouseId: c.greenhouseId } : { kind: 'treecontainer', x: c.x, y: c.y }) } : c));
        setPlanterBuckets((prev) => prev.map((c) => c.plant ? { ...c, plant: ageFn(c.plant, null, 6.5, { kind: 'bucket', bucketId: c.id }) } : c));
        setTrays((prev) => prev.map((t) => ({ ...t, cells: t.cells.map((c) => (c && !c.ready && !c.failed ? { ...c, daysIn: c.daysIn + 1, ready: c.daysIn + 1 >= c.daysNeeded } : c)) })));
        setColdStratBatches((prev) => prev.map((b) => (b.ready ? b : { ...b, daysIn: b.daysIn + 1, ready: b.daysIn + 1 >= b.daysNeeded })));
        setCompostBatches((prev) => prev.map((b) => { if (b.ready) return b; const heatBoost = (b.nutrientScore || 0) >= 8 ? .35 : (b.nutrientScore || 0) >= 5 ? .2 : 0; const next = b.daysIn + 1 + heatBoost; return { ...b, daysIn: next, ready: next >= b.daysNeeded }; }));
        setFertilizerBatches((prev) => prev.map((b) => (b.ready ? b : { ...b, daysIn: b.daysIn + 1, ready: b.daysIn + 1 >= b.daysNeeded })));
        setBasketItems((prev) => {
            const aged = prev.map((i) => ({ ...i, daysIn: i.daysIn + 1 }));
            aged.forEach((i) => {
                const spoilThreshold = effectiveSpoilDays();
                if (i.daysIn === spoilThreshold - 1)
                    needsLog.push(`🧺 ${i.name} in your basket is almost spoiled — sell or store it soon!`);
                if (i.daysIn >= spoilThreshold)
                    needsLog.push(`🧺 ${i.name} in your basket has spoiled.`);
            });
            return aged;
        });
        setInventory((inv) => {
            if (inv.rainBarrels < 1)
                return inv;
            const maxGallons = inv.rainBarrels * RAIN_BARREL.capacity;
            const refilled = weatherToday === 'rain' ? maxGallons : Math.min(maxGallons, inv.rainBarrelGallons + inv.rainBarrels * RAIN_BARREL.refillPerDay);
            return { ...inv, rainBarrelGallons: refilled };
        });
        // Weeds become a normal challenge starting week 2 (day 8+) of a season, popping up sporadically
        // on any soiled square — bed or open ground — whether or not a crop is growing there. Mulch cuts
        // the chance significantly, matching how mulch actually works in a real garden.
        if (seasonIdx * DAYS_PER_SEASON + day + 1 >= 8) {
            const WEED_BASE_CHANCE = 0.035;
            const handRakeReduction = ((_a = inventory.tools) === null || _a === void 0 ? void 0 : _a.handrake) > 0 ? TOOLS.find((t) => t.id === 'handrake').amount : 0;
            const newWeeds = [];
            beds.forEach((bed) => {
                if (!bed.soilId)
                    return;
                const mulch = bed.mulchId ? MULCH_TYPES.find((m) => m.id === bed.mulchId) : null;
                const chance = WEED_BASE_CHANCE * (mulch ? 1 - mulch.weedReduction : 1) * (1 - handRakeReduction);
                for (let sy = 0; sy < bed.h; sy++) {
                    for (let sx = 0; sx < bed.w; sx++) {
                        if (weeds.some((w) => w.kind === 'bed' && w.bedId === bed.id && w.x === sx && w.y === sy))
                            continue;
                        if (Math.random() < chance)
                            newWeeds.push({ kind: 'bed', bedId: bed.id, x: sx, y: sy, weedType: randomWeedTypeId() });
                    }
                }
            });
            groundSoilTiles.forEach((tile) => {
                const burnProtectedTile = (activeBurn && activeBurn.ignited && cellsContain(activeBurn.fireCells || activeBurn.cells, tile.gx, tile.gy)) || burnedAreas.some((a) => (a.daysRemaining || 0) > 0 && cellsContain(a.cells, tile.gx, tile.gy));
                if (burnProtectedTile)
                    return;
                const mulchTile = groundMulchTiles.find((t) => t.gx === tile.gx && t.gy === tile.gy);
                const mulch = mulchTile ? MULCH_TYPES.find((m) => m.id === mulchTile.mulchId) : null;
                const tilledTile = groundTilledTiles.find((t) => t.gx === tile.gx && t.gy === tile.gy);
                const tillerBonus = (tilledTile === null || tilledTile === void 0 ? void 0 : tilledTile.tool) === 'tiller' ? TOOLS.find((t) => t.id === 'tiller').amount : 0;
                const chance = WEED_BASE_CHANCE * (mulch ? 1 - mulch.weedReduction : 1) * (1 - tillerBonus) * (1 - handRakeReduction);
                if (weeds.some((w) => w.kind === 'ground' && w.x === tile.gx && w.y === tile.gy))
                    return;
                if (Math.random() < chance)
                    newWeeds.push({ kind: 'ground', bedId: null, x: tile.gx, y: tile.gy, weedType: randomWeedTypeId() });
            });
            if (newWeeds.length > 0) {
                setWeeds((prev) => [...prev, ...newWeeds.map((w) => ({ ...w, id: (weedIdRef.current += 1) }))]);
                needsLog.push(`🌿 Weeds have sprouted in the garden — clear them before they spread!`);
            }
        }
        if (needsLog.length > 0)
            setLog((l) => [...needsLog.slice(0, 3), ...l].slice(0, 6));
        if (newPestAlerts.length > 0) {
            setPestAlerts((prev) => [
                ...newPestAlerts.map((a) => ({ ...a, id: (pestAlertIdRef.current += 1) })),
                ...prev,
            ].slice(0, 4));
        }
        if (newWeatherAlerts.length > 0) {
            setWeatherAlerts((prev) => [
                ...newWeatherAlerts.map((a) => ({ ...a, id: (weatherAlertIdRef.current += 1) })),
                ...prev,
            ].slice(0, 3));
        }
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
        if (cash < plant.seedCost) {
            addLog(`Not enough cash for ${plant.name} seeds ($${plant.seedCost}).`);
            return;
        }
        const yieldCount = Math.floor(Math.random() * (SEEDS_PER_PACKET_MAX - SEEDS_PER_PACKET_MIN + 1)) + SEEDS_PER_PACKET_MIN;
        setCash((c) => c - plant.seedCost);
        addSeed(plant.id, yieldCount);
        const zoneNote = !canGrowInZone(plant, zone) ? ` This plant is outside ${zone.name}'s outdoor range, so grow it inside a greenhouse and maintain its climate.` : '';
        addLog(`Bought a ${plant.name} seed packet for $${plant.seedCost} — ${yieldCount} seeds inside.${zoneNote}`);
    }
    function sellSeedPacket(plant) {
        const owned = inventory.seeds[plant.id] || 0;
        if (owned < 1)
            return;
        const removeCount = Math.min(owned, SEEDS_PER_PACKET_MIN);
        const refund = Math.round(plant.seedCost * (removeCount / SEEDS_PER_PACKET_MIN));
        removeSeed(plant.id, removeCount);
        setCash((c) => c + refund);
        addLog(`Returned ${removeCount} ${plant.name} seeds for $${refund}.`);
    }
    function buyLivePlant(plant) {
        if (cash < plant.plantCost) {
            addLog(`Not enough cash for a live ${plant.name} ($${plant.plantCost}).`);
            return;
        }
        setCash((c) => c - plant.plantCost);
        addLivePlant(plant.id, 1);
        const zoneNote = !canGrowInZone(plant, zone) ? ` It is greenhouse-only in ${zone.name}; maintain the greenhouse temperature and light.` : '';
        addLog(`Bought a live ${plant.name} for $${plant.plantCost}.${zoneNote}`);
    }
    function sellLivePlant(plant) {
        if ((inventory.livePlants[plant.id] || 0) < 1)
            return;
        removeLivePlant(plant.id, 1);
        setCash((c) => c + plant.plantCost);
        addLog(`Returned a live ${plant.name} for $${plant.plantCost}.`);
    }
    function buySoilBagShop(soilId) {
        const soil = SOILS.find((s) => s.id === soilId);
        if (cash < soil.cost) {
            addLog(`Not enough cash for ${soil.name} ($${soil.cost}).`);
            return;
        }
        setCash((c) => c - soil.cost);
        addSoil(soilId, 1);
        addLog(`Bought a bag of ${soil.name} for $${soil.cost}.`);
    }
    function sellSoilBagShop(soilId) {
        const soil = SOILS.find((s) => s.id === soilId);
        if (inventory.soils[soilId] < 1)
            return;
        removeSoilInv(soilId, 1);
        setCash((c) => c + soil.cost);
        addLog(`Returned a bag of ${soil.name} for $${soil.cost}.`);
    }
    function buyWoodBundle(bundleId) {
        const bundle = WOOD_BUNDLES.find((w) => w.id === bundleId);
        if (cash < bundle.cost) {
            addLog(`Not enough cash for ${bundle.sqFt} sq ft of wood ($${bundle.cost}).`);
            return;
        }
        setCash((c) => c - bundle.cost);
        setInventory((inv) => ({ ...inv, woodSqFt: (Number.isFinite(Number(inv.woodSqFt)) ? Number(inv.woodSqFt) : 0) + bundle.sqFt }));
        markDiscovered('material-wood');
        addLog(`Bought ${bundle.sqFt} sq ft of wood for $${bundle.cost}.`);
    }
    function sellWoodBundle(bundleId) {
        const bundle = WOOD_BUNDLES.find((w) => w.id === bundleId);
        if (invNumber(inventory.woodSqFt) < bundle.sqFt)
            return;
        setInventory((inv) => ({ ...inv, woodSqFt: Math.max(0, (Number.isFinite(Number(inv.woodSqFt)) ? Number(inv.woodSqFt) : 0) - bundle.sqFt) }));
        setCash((c) => c + bundle.cost);
        addLog(`Returned ${bundle.sqFt} sq ft of wood for $${bundle.cost}.`);
    }
    function buyAluminumBundle(bundleId) {
        const bundle = ALUMINUM_BUNDLES.find((w) => w.id === bundleId);
        if (cash < bundle.cost) {
            addLog(`Not enough cash for ${bundle.sqFt} sq ft of aluminum ($${bundle.cost}).`);
            return;
        }
        setCash((c) => c - bundle.cost);
        setInventory((inv) => ({ ...inv, aluminumSqFt: inv.aluminumSqFt + bundle.sqFt }));
        markDiscovered('material-aluminum');
        addLog(`Bought ${bundle.sqFt} sq ft of aluminum for $${bundle.cost}.`);
    }
    function sellAluminumBundle(bundleId) {
        const bundle = ALUMINUM_BUNDLES.find((w) => w.id === bundleId);
        if (inventory.aluminumSqFt < bundle.sqFt)
            return;
        setInventory((inv) => ({ ...inv, aluminumSqFt: inv.aluminumSqFt - bundle.sqFt }));
        setCash((c) => c + bundle.cost);
        addLog(`Returned ${bundle.sqFt} sq ft of aluminum for $${bundle.cost}.`);
    }
    function buyCementBundle(bundleId) {
        const bundle = CEMENT_BUNDLES.find((w) => w.id === bundleId);
        if (cash < bundle.cost) {
            addLog(`Not enough cash for ${bundle.sqFt} sq ft of cement block ($${bundle.cost}).`);
            return;
        }
        setCash((c) => c - bundle.cost);
        setInventory((inv) => ({ ...inv, cementSqFt: inv.cementSqFt + bundle.sqFt }));
        markDiscovered('material-cement');
        addLog(`Bought ${bundle.sqFt} sq ft of cement block for $${bundle.cost}.`);
    }
    function sellCementBundle(bundleId) {
        const bundle = CEMENT_BUNDLES.find((w) => w.id === bundleId);
        if (inventory.cementSqFt < bundle.sqFt)
            return;
        setInventory((inv) => ({ ...inv, cementSqFt: inv.cementSqFt - bundle.sqFt }));
        setCash((c) => c + bundle.cost);
        addLog(`Returned ${bundle.sqFt} sq ft of cement block for $${bundle.cost}.`);
    }
    function buyStickBundle(bundleId) {
        const bundle = STICK_BUNDLES.find((w) => w.id === bundleId);
        if (cash < bundle.cost) {
            addLog(`Not enough cash for ${bundle.sqFt} sq ft of sticks ($${bundle.cost}).`);
            return;
        }
        setCash((c) => c - bundle.cost);
        setInventory((inv) => ({ ...inv, sticksSqFt: inv.sticksSqFt + bundle.sqFt }));
        markDiscovered('material-sticks');
        addLog(`Gathered ${bundle.sqFt} sq ft of large sticks for $${bundle.cost}.`);
    }
    function sellStickBundle(bundleId) {
        const bundle = STICK_BUNDLES.find((w) => w.id === bundleId);
        if (inventory.sticksSqFt < bundle.sqFt)
            return;
        setInventory((inv) => ({ ...inv, sticksSqFt: inv.sticksSqFt - bundle.sqFt }));
        setCash((c) => c + bundle.cost);
        addLog(`Returned ${bundle.sqFt} sq ft of sticks for $${bundle.cost}.`);
    }
    function buyLeaves() {
        if (cash < LEAVES_ITEM.cost) {
            addLog(`Not enough cash for leaves ($${LEAVES_ITEM.cost}).`);
            return;
        }
        setCash((c) => c - LEAVES_ITEM.cost);
        setInventory((inv) => ({ ...inv, leaves: inv.leaves + 1 }));
        markDiscovered('material-leaves');
        addLog(`Bought a bag of leaves for $${LEAVES_ITEM.cost}.`);
    }
    function sellLeaves() {
        if (inventory.leaves < 1)
            return;
        setInventory((inv) => ({ ...inv, leaves: inv.leaves - 1 }));
        setCash((c) => c + LEAVES_ITEM.cost);
        addLog(`Returned a bag of leaves for $${LEAVES_ITEM.cost}.`);
    }
    function buyCardboard() {
        if (cash < CARDBOARD_ITEM.cost) {
            addLog(`Not enough cash for cardboard ($${CARDBOARD_ITEM.cost}).`);
            return;
        }
        setCash((c) => c - CARDBOARD_ITEM.cost);
        setInventory((inv) => ({ ...inv, cardboard: inv.cardboard + 1 }));
        markDiscovered('material-cardboard');
        addLog(`Bought cardboard for $${CARDBOARD_ITEM.cost}.`);
    }
    function sellCardboard() {
        if (inventory.cardboard < 1)
            return;
        setInventory((inv) => ({ ...inv, cardboard: inv.cardboard - 1 }));
        setCash((c) => c + CARDBOARD_ITEM.cost);
        addLog(`Returned cardboard for $${CARDBOARD_ITEM.cost}.`);
    }
    function buyEggshells() {
        if (cash < EGGSHELL_ITEM.cost) {
            addLog(`Not enough cash for eggshells ($${EGGSHELL_ITEM.cost}).`);
            return;
        }
        setCash((c) => c - EGGSHELL_ITEM.cost);
        setInventory((inv) => ({ ...inv, eggshells: inv.eggshells + 1 }));
        markDiscovered('material-eggshells');
        addLog(`Bought crushed eggshells for $${EGGSHELL_ITEM.cost}.`);
    }
    function sellEggshells() {
        if (inventory.eggshells < 1)
            return;
        setInventory((inv) => ({ ...inv, eggshells: inv.eggshells - 1 }));
        setCash((c) => c + EGGSHELL_ITEM.cost);
        addLog(`Returned eggshells for $${EGGSHELL_ITEM.cost}.`);
    }
    function buyBananaPeels() {
        if (cash < BANANAPEEL_ITEM.cost) {
            addLog(`Not enough cash for banana peels ($${BANANAPEEL_ITEM.cost}).`);
            return;
        }
        setCash((c) => c - BANANAPEEL_ITEM.cost);
        setInventory((inv) => ({ ...inv, bananapeels: inv.bananapeels + 1 }));
        markDiscovered('material-bananapeels');
        addLog(`Bought banana peels for $${BANANAPEEL_ITEM.cost}.`);
    }
    function sellBananaPeels() {
        if (inventory.bananapeels < 1)
            return;
        setInventory((inv) => ({ ...inv, bananapeels: inv.bananapeels - 1 }));
        setCash((c) => c + BANANAPEEL_ITEM.cost);
        addLog(`Returned banana peels for $${BANANAPEEL_ITEM.cost}.`);
    }
    function buyCoffeeGrounds() {
        if (cash < COFFEEGROUNDS_ITEM.cost) {
            addLog(`Not enough cash for coffee grounds ($${COFFEEGROUNDS_ITEM.cost}).`);
            return;
        }
        setCash((c) => c - COFFEEGROUNDS_ITEM.cost);
        setInventory((inv) => ({ ...inv, coffeegrounds: inv.coffeegrounds + 1 }));
        markDiscovered('material-coffeegrounds');
        addLog(`Bought coffee grounds for $${COFFEEGROUNDS_ITEM.cost}.`);
    }
    function sellCoffeeGrounds() {
        if (inventory.coffeegrounds < 1)
            return;
        setInventory((inv) => ({ ...inv, coffeegrounds: inv.coffeegrounds - 1 }));
        setCash((c) => c + COFFEEGROUNDS_ITEM.cost);
        addLog(`Returned coffee grounds for $${COFFEEGROUNDS_ITEM.cost}.`);
    }
    function buyMulch(mulchId) {
        const mulch = MULCH_TYPES.find((m) => m.id === mulchId);
        if (cash < mulch.cost) {
            addLog(`Not enough cash for ${mulch.name} ($${mulch.cost}).`);
            return;
        }
        setCash((c) => c - mulch.cost);
        setInventory((inv) => { var _a; return ({ ...inv, mulch: { ...inv.mulch, [mulchId]: (((_a = inv.mulch) === null || _a === void 0 ? void 0 : _a[mulchId]) || 0) + 1 } }); });
        markDiscovered(`mulch-${mulchId}`);
        addLog(`Bought ${mulch.name} for $${mulch.cost}.`);
    }
    function sellMulch(mulchId) {
        var _a;
        const mulch = MULCH_TYPES.find((m) => m.id === mulchId);
        if ((((_a = inventory.mulch) === null || _a === void 0 ? void 0 : _a[mulchId]) || 0) < 1)
            return;
        setInventory((inv) => { var _a; return ({ ...inv, mulch: { ...inv.mulch, [mulchId]: Math.max(0, (((_a = inv.mulch) === null || _a === void 0 ? void 0 : _a[mulchId]) || 0) - 1) } }); });
        setCash((c) => c + mulch.cost);
        addLog(`Returned ${mulch.name} for $${mulch.cost}.`);
    }
    function buyWaterTool(toolId) {
        const tool = WATER_TOOLS.find((t) => t.id === toolId);
        if (cash < tool.cost) {
            addLog(`Not enough cash for a ${tool.name} ($${tool.cost}).`);
            return;
        }
        setCash((c) => c - tool.cost);
        setInventory((inv) => ({ ...inv, waterTools: { ...inv.waterTools, [toolId]: inv.waterTools[toolId] + 1 } }));
        markDiscovered(`tool-${toolId}`);
        addLog(`Bought a ${tool.name} for $${tool.cost}.`);
    }
    function sellWaterTool(toolId) {
        const tool = WATER_TOOLS.find((t) => t.id === toolId);
        if (inventory.waterTools[toolId] < 1)
            return;
        setInventory((inv) => ({ ...inv, waterTools: { ...inv.waterTools, [toolId]: inv.waterTools[toolId] - 1 } }));
        setCash((c) => c + tool.cost);
        addLog(`Returned a ${tool.name} for $${tool.cost}.`);
    }
    function buySpigot() {
        if (cash < SPIGOT.cost) {
            addLog(`Not enough cash for a spigot ($${SPIGOT.cost}).`);
            return;
        }
        setCash((c) => c - SPIGOT.cost);
        setInventory((inv) => ({ ...inv, spigots: inv.spigots + 1 }));
        markDiscovered('tool-spigot');
        addLog(`Bought a water spigot for $${SPIGOT.cost}.`);
    }
    function sellSpigot() {
        if (inventory.spigots < 1)
            return;
        setInventory((inv) => ({ ...inv, spigots: inv.spigots - 1 }));
        setCash((c) => c + SPIGOT.cost);
        addLog(`Returned a water spigot for $${SPIGOT.cost}.`);
    }
    function buyPvcBundle(bundleId) {
        const bundle = PVC_BUNDLES.find((p) => p.id === bundleId);
        if (cash < bundle.cost) {
            addLog(`Not enough cash for ${bundle.feet}ft of PVC ($${bundle.cost}).`);
            return;
        }
        setCash((c) => c - bundle.cost);
        setInventory((inv) => ({ ...inv, pvcFeet: inv.pvcFeet + bundle.feet }));
        markDiscovered('tool-pvc');
        addLog(`Bought ${bundle.feet}ft of PVC pipe for $${bundle.cost}.`);
    }
    function sellPvcBundle(bundleId) {
        const bundle = PVC_BUNDLES.find((p) => p.id === bundleId);
        if (inventory.pvcFeet < bundle.feet)
            return;
        setInventory((inv) => ({ ...inv, pvcFeet: inv.pvcFeet - bundle.feet }));
        setCash((c) => c + bundle.cost);
        addLog(`Returned ${bundle.feet}ft of PVC pipe for $${bundle.cost}.`);
    }
    function buyRainBarrel() {
        if (cash < RAIN_BARREL.cost) {
            addLog(`Not enough cash for a rain barrel ($${RAIN_BARREL.cost}).`);
            return;
        }
        setCash((c) => c - RAIN_BARREL.cost);
        setInventory((inv) => ({ ...inv, rainBarrels: inv.rainBarrels + 1, rainBarrelGallons: inv.rainBarrelGallons + RAIN_BARREL.capacity }));
        markDiscovered('material-barrel');
        addLog(`Bought a rain barrel for $${RAIN_BARREL.cost}, filled with ${RAIN_BARREL.capacity} gallons.`);
    }
    function sellRainBarrel() {
        if (inventory.rainBarrels < 1)
            return;
        setInventory((inv) => ({ ...inv, rainBarrels: inv.rainBarrels - 1, rainBarrelGallons: Math.max(0, inv.rainBarrelGallons - RAIN_BARREL.capacity) }));
        setCash((c) => c + RAIN_BARREL.cost);
        addLog(`Returned a rain barrel for $${RAIN_BARREL.cost}.`);
    }
    function buyGreenhouse(typeId) {
        const gh = GREENHOUSE_TYPES.find((g) => g.id === typeId);
        if (!gh || cash < gh.cost)
            return;
        setCash((c) => c - gh.cost);
        setInventory((inv) => { var _a; return ({ ...inv, greenhouses: { ...inv.greenhouses, [typeId]: (((_a = inv.greenhouses) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) + 1 } }); });
        addLog(`Bought a ${gh.name}. Place it from Yard → Build.`);
    }
    function sellGreenhouse(typeId) {
        var _a;
        const gh = GREENHOUSE_TYPES.find((g) => g.id === typeId);
        if (!gh || (((_a = inventory.greenhouses) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) < 1)
            return;
        setInventory((inv) => { var _a; return ({ ...inv, greenhouses: { ...inv.greenhouses, [typeId]: (((_a = inv.greenhouses) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) - 1 } }); });
        setCash((c) => c + gh.cost);
        addLog(`Returned an unplaced ${gh.name} for $${gh.cost}.`);
    }
    function buyGreenhouseDecor(decorId) {
        const item = GREENHOUSE_DECOR.find((d) => d.id === decorId);
        if (!item || cash < item.cost)
            return;
        setCash((c) => c - item.cost);
        setInventory((inv) => { var _a; return ({ ...inv, greenhouseDecor: { ...inv.greenhouseDecor, [decorId]: (((_a = inv.greenhouseDecor) === null || _a === void 0 ? void 0 : _a[decorId]) || 0) + 1 } }); });
        addLog(`Bought ${item.name}. Add it by clicking a placed greenhouse.`);
    }
    function sellGreenhouseDecor(decorId) {
        var _a;
        const item = GREENHOUSE_DECOR.find((d) => d.id === decorId);
        if (!item || (((_a = inventory.greenhouseDecor) === null || _a === void 0 ? void 0 : _a[decorId]) || 0) < 1)
            return;
        setInventory((inv) => { var _a; return ({ ...inv, greenhouseDecor: { ...inv.greenhouseDecor, [decorId]: (((_a = inv.greenhouseDecor) === null || _a === void 0 ? void 0 : _a[decorId]) || 0) - 1 } }); });
        setCash((c) => c + item.cost);
        addLog(`Returned ${item.name} for $${item.cost}.`);
    }
    function buyPond(typeId) {
        const item = POND_TYPES.find((p) => p.id === typeId);
        if (!item || cash < item.cost)
            return;
        setCash((c) => c - item.cost);
        setInventory((inv) => { var _a; return ({ ...inv, ponds: { ...inv.ponds, [typeId]: (((_a = inv.ponds) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) + 1 } }); });
        addLog(`Bought a ${item.name}. Place it from Yard → Build.`);
    }
    function sellPond(typeId) {
        var _a;
        const item = POND_TYPES.find((p) => p.id === typeId);
        if (!item || (((_a = inventory.ponds) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) < 1)
            return;
        setInventory((inv) => { var _a; return ({ ...inv, ponds: { ...inv.ponds, [typeId]: (((_a = inv.ponds) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) - 1 } }); });
        setCash((c) => c + item.cost);
        addLog(`Returned an unplaced ${item.name} for $${item.cost}.`);
    }
    function buyPondFish(fishId) {
        const fish = POND_FISH.find((f) => f.id === fishId);
        if (!fish || cash < fish.cost)
            return;
        setCash((c) => c - fish.cost);
        setInventory((inv) => { var _a; return ({ ...inv, pondFish: { ...inv.pondFish, [fishId]: (((_a = inv.pondFish) === null || _a === void 0 ? void 0 : _a[fishId]) || 0) + 1 } }); });
        addLog(`Bought ${fish.name}. Stock it by clicking a placed pond.`);
    }
    function sellPondFish(fishId) {
        var _a;
        const fish = POND_FISH.find((f) => f.id === fishId);
        if (!fish || (((_a = inventory.pondFish) === null || _a === void 0 ? void 0 : _a[fishId]) || 0) < 1)
            return;
        setInventory((inv) => { var _a; return ({ ...inv, pondFish: { ...inv.pondFish, [fishId]: (((_a = inv.pondFish) === null || _a === void 0 ? void 0 : _a[fishId]) || 0) - 1 } }); });
        setCash((c) => c + fish.cost);
        addLog(`Returned one ${fish.name} for $${fish.cost}.`);
    }
    function buyTrellis(typeId) {
        const item = TRELLIS_TYPES.find((t) => t.id === typeId);
        if (!item || cash < item.cost)
            return;
        setCash((c) => c - item.cost);
        setInventory((inv) => { var _a; return ({ ...inv, trellises: { ...inv.trellises, [typeId]: (((_a = inv.trellises) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) + 1 } }); });
        addLog(`Bought a ${item.name}. Place it beside a vining crop from Yard → Build.`);
    }
    function sellTrellis(typeId) {
        var _a;
        const item = TRELLIS_TYPES.find((t) => t.id === typeId);
        if (!item || (((_a = inventory.trellises) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) < 1)
            return;
        setInventory((inv) => { var _a; return ({ ...inv, trellises: { ...inv.trellises, [typeId]: (((_a = inv.trellises) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) - 1 } }); });
        setCash((c) => c + item.cost);
        addLog(`Returned an unplaced ${item.name} for $${item.cost}.`);
    }
    function buyAdditive(id) {
        const a = ADDITIVES.find((x) => x.id === id);
        if (cash < a.cost) {
            addLog(`Not enough cash for ${a.name} ($${a.cost}).`);
            return;
        }
        setCash((c) => c - a.cost);
        setInventory((inv) => ({ ...inv, additives: { ...inv.additives, [id]: inv.additives[id] + 1 } }));
        markDiscovered(`additive-${id}`);
        addLog(`Bought a bag of ${a.name} for $${a.cost}.`);
    }
    function sellAdditive(id) {
        const a = ADDITIVES.find((x) => x.id === id);
        if (inventory.additives[id] < 1)
            return;
        setInventory((inv) => ({ ...inv, additives: { ...inv.additives, [id]: inv.additives[id] - 1 } }));
        setCash((c) => c + a.cost);
        addLog(`Returned a bag of ${a.name} for $${a.cost}.`);
    }
    function buyLight() {
        if (cash < PLANT_LIGHT.cost) {
            addLog(`Not enough cash for a grow light ($${PLANT_LIGHT.cost}).`);
            return;
        }
        setCash((c) => c - PLANT_LIGHT.cost);
        setInventory((inv) => ({ ...inv, lights: inv.lights + 1 }));
        markDiscovered('material-light');
        addLog(`Bought a grow light for $${PLANT_LIGHT.cost}.`);
    }
    function sellLight() {
        if (inventory.lights < 1)
            return;
        setInventory((inv) => ({ ...inv, lights: inv.lights - 1 }));
        setCash((c) => c + PLANT_LIGHT.cost);
        addLog(`Returned a grow light for $${PLANT_LIGHT.cost}.`);
    }
    function buyPlantFood() {
        if (cash < PLANT_FOOD.cost) {
            addLog(`Not enough cash for plant food ($${PLANT_FOOD.cost}).`);
            return;
        }
        setCash((c) => c - PLANT_FOOD.cost);
        setInventory((inv) => ({ ...inv, plantFood: inv.plantFood + 1 }));
        markDiscovered('material-food');
        addLog(`Bought a bottle of plant food for $${PLANT_FOOD.cost}.`);
    }
    function sellPlantFood() {
        if (inventory.plantFood < 1)
            return;
        setInventory((inv) => ({ ...inv, plantFood: inv.plantFood - 1 }));
        setCash((c) => c + PLANT_FOOD.cost);
        addLog(`Returned a bottle of plant food for $${PLANT_FOOD.cost}.`);
    }
    function buyBeneficialBug(bugId) {
        const bug = BENEFICIAL_BUGS.find((b) => b.id === bugId);
        if (cash < bug.cost) {
            addLog(`Not enough cash for ${bug.name} ($${bug.cost}).`);
            return;
        }
        setCash((c) => c - bug.cost);
        setInventory((inv) => ({ ...inv, beneficialBugs: { ...inv.beneficialBugs, [bugId]: inv.beneficialBugs[bugId] + 1 } }));
        markDiscovered(`bug-${bugId}`);
        addLog(`Bought ${bug.name} for $${bug.cost}.`);
    }
    function sellBeneficialBug(bugId) {
        const bug = BENEFICIAL_BUGS.find((b) => b.id === bugId);
        if (inventory.beneficialBugs[bugId] < 1)
            return;
        setInventory((inv) => ({ ...inv, beneficialBugs: { ...inv.beneficialBugs, [bugId]: inv.beneficialBugs[bugId] - 1 } }));
        setCash((c) => c + bug.cost);
        addLog(`Returned ${bug.name} for $${bug.cost}.`);
    }
    function releaseBeneficialBug(bugId) {
        const bug = BENEFICIAL_BUGS.find((b) => b.id === bugId);
        if (inventory.beneficialBugs[bugId] < 1) {
            addLog(`No ${bug.name} in inventory — buy some at the Plant Nursery.`);
            return;
        }
        setInventory((inv) => ({ ...inv, beneficialBugs: { ...inv.beneficialBugs, [bugId]: inv.beneficialBugs[bugId] - 1 } }));
        activeBeneficialIdRef.current += 1;
        setActiveBeneficials((prev) => [...prev, { id: activeBeneficialIdRef.current, bugId, daysLeft: bug.duration }]);
        addLog(`Released ${bug.name} into the yard — active for ${bug.duration} days.`);
    }
    function buyTool(toolId) {
        const tool = TOOLS.find((t) => t.id === toolId);
        if (inventory.tools[toolId] > 0) {
            addLog(`You already own a ${tool.name}.`);
            return;
        }
        if (cash < tool.cost) {
            addLog(`Not enough cash for a ${tool.name} ($${tool.cost}).`);
            return;
        }
        setCash((c) => c - tool.cost);
        setInventory((inv) => ({ ...inv, tools: { ...inv.tools, [toolId]: 1 } }));
        markDiscovered(`tool-${toolId}`);
        addLog(`Bought a ${tool.name} for $${tool.cost}.`);
    }
    function sellTool(toolId) {
        const tool = TOOLS.find((t) => t.id === toolId);
        if (inventory.tools[toolId] < 1)
            return;
        setInventory((inv) => ({ ...inv, tools: { ...inv.tools, [toolId]: 0 } }));
        setCash((c) => c + tool.cost);
        addLog(`Returned the ${tool.name} for $${tool.cost}.`);
    }
    function buyClothing(itemId) {
        const item = CLOTHES.find((c) => c.id === itemId);
        if (inventory.clothes[itemId] > 0) {
            addLog(`You already own ${item.name}.`);
            return;
        }
        if (cash < item.cost) {
            addLog(`Not enough cash for ${item.name} ($${item.cost}).`);
            return;
        }
        setCash((c) => c - item.cost);
        setInventory((inv) => ({ ...inv, clothes: { ...inv.clothes, [itemId]: 1 } }));
        markDiscovered(`clothing-${itemId}`);
        addLog(`Bought ${item.name} for $${item.cost}.`);
    }
    function sellClothing(itemId) {
        const item = CLOTHES.find((c) => c.id === itemId);
        if (inventory.clothes[itemId] < 1)
            return;
        setInventory((inv) => ({ ...inv, clothes: { ...inv.clothes, [itemId]: 0 } }));
        setCash((c) => c + item.cost);
        addLog(`Returned ${item.name} for $${item.cost}.`);
    }
    function buyBasket(sizeId) {
        const size = BASKET_SIZES.find((b) => b.id === sizeId);
        if (cash < size.cost) {
            addLog(`Not enough cash for a ${size.name} ($${size.cost}).`);
            return;
        }
        if (basketSizeId && basketItems.length > 0) {
            addLog('Empty your current basket before upgrading.');
            return;
        }
        setCash((c) => c - size.cost);
        setBasketSizeId(sizeId);
        markDiscovered(`basket-${sizeId}`);
        addLog(`Bought a ${size.name} (${size.slots} slots) for $${size.cost}.`);
    }
    function buyTrayShop(sizeId) {
        const size = TRAY_SIZES.find((t) => t.id === sizeId);
        if (cash < size.cost) {
            addLog(`Not enough cash for that tray ($${size.cost}).`);
            return;
        }
        setCash((c) => c - size.cost);
        addEmptyTray(sizeId, 1);
        addLog(`Bought a ${size.slots}-cell tray for $${size.cost}.`);
    }
    function sellTrayShop(sizeId) {
        const size = TRAY_SIZES.find((t) => t.id === sizeId);
        if ((inventory.emptyTrays[sizeId] || 0) < 1)
            return;
        removeEmptyTray(sizeId, 1);
        setCash((c) => c + size.cost);
        addLog(`Returned a ${size.slots}-cell tray for $${size.cost}.`);
    }
    function buyProtectiveNet() {
        if (cash < TREE_BUSH_NET.cost) {
            addLog(`Not enough cash for ${TREE_BUSH_NET.name}.`);
            return;
        }
        setCash((c) => c - TREE_BUSH_NET.cost);
        setInventory((inv) => ({ ...inv, protectiveNets: (inv.protectiveNets || 0) + 1 }));
        addLog(`Bought ${TREE_BUSH_NET.name}. Place it from Yard → Build directly over a living plant, bush, or tree.`);
    }
    function sellProtectiveNet() { if ((inventory.protectiveNets || 0) < 1)
        return; setInventory((inv) => ({ ...inv, protectiveNets: inv.protectiveNets - 1 })); setCash((c) => c + TREE_BUSH_NET.cost); }
    function buyPath(typeId) { const item = PATH_TYPES.find((x) => x.id === typeId); if (!item || cash < item.cost)
        return; setCash((c) => c - item.cost); setInventory((inv) => { var _a; return ({ ...inv, paths: { ...inv.paths, [typeId]: (((_a = inv.paths) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) + 1 } }); }); }
    function sellPath(typeId) { var _a; const item = PATH_TYPES.find((x) => x.id === typeId); if (!item || (((_a = inventory.paths) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) < 1)
        return; setCash((c) => c + item.cost); setInventory((inv) => ({ ...inv, paths: { ...inv.paths, [typeId]: inv.paths[typeId] - 1 } })); }
    function buyPlanterBucket(typeId) { const item = PLANTER_BUCKET_TYPES.find((x) => x.id === typeId); if (!item || cash < item.cost)
        return; setCash((c) => c - item.cost); setInventory((inv) => { var _a; return ({ ...inv, planterBuckets: { ...inv.planterBuckets, [typeId]: (((_a = inv.planterBuckets) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) + 1 } }); }); }
    function sellPlanterBucket(typeId) { var _a; const item = PLANTER_BUCKET_TYPES.find((x) => x.id === typeId); if (!item || (((_a = inventory.planterBuckets) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) < 1)
        return; setCash((c) => c + item.cost); setInventory((inv) => ({ ...inv, planterBuckets: { ...inv.planterBuckets, [typeId]: inv.planterBuckets[typeId] - 1 } })); }
    function placeProtectiveNet(x, y) {
        var _a, _b;
        if ((inventory.protectiveNets || 0) < 1)
            return;
        const ground = getGroundSquare(x, y);
        let plant = ground;
        if (!plant) {
            const bed = findBedAtCell(x, y);
            if (bed)
                plant = getBedSquare(bed.id, x - bed.x, y - bed.y);
        }
        if (!plant)
            plant = ((_a = treeContainers.find((c) => c.x === x && c.y === y)) === null || _a === void 0 ? void 0 : _a.plant) || ((_b = planterBuckets.find((c) => c.x === x && c.y === y)) === null || _b === void 0 ? void 0 : _b.plant) || null;
        if (!plant || plant.dead || plant.harvested) {
            addLog('Plant Insect Net must be placed directly over a living plant, bush, or tree.');
            return;
        }
        if (protectiveNets.some((n) => n.x === x && n.y === y)) {
            addLog('That plant is already netted.');
            return;
        }
        protectiveNetIdRef.current += 1;
        setProtectiveNets((prev) => [...prev, { id: protectiveNetIdRef.current, x, y }]);
        setInventory((inv) => ({ ...inv, protectiveNets: inv.protectiveNets - 1 }));
        setSelectedBuildMaterial(null);
        addLog(`Protected ${plant.name} with insect netting.`);
    }
    function deleteProtectiveNet(id) { const n = protectiveNets.find((x) => x.id === id); if (!n)
        return; setProtectiveNets((prev) => prev.filter((x) => x.id !== id)); setInventory((inv) => ({ ...inv, protectiveNets: (inv.protectiveNets || 0) + 1 })); }
    function placePath(typeId, x, y) { var _a; const item = PATH_TYPES.find((p) => p.id === typeId); if (!item || (((_a = inventory.paths) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) < 1)
        return; if (cellOccupied(x, y)) {
        addLog('Path squares need open ground.');
        return;
    } if (paths.some((p) => p.x === x && p.y === y))
        return; pathIdRef.current += 1; setPaths((prev) => [...prev, { id: pathIdRef.current, typeId, x, y }]); setInventory((inv) => ({ ...inv, paths: { ...inv.paths, [typeId]: inv.paths[typeId] - 1 } })); }
    function deletePath(id) { const p = paths.find((x) => x.id === id); if (!p)
        return; setPaths((prev) => prev.filter((x) => x.id !== id)); setInventory((inv) => { var _a; return ({ ...inv, paths: { ...inv.paths, [p.typeId]: (((_a = inv.paths) === null || _a === void 0 ? void 0 : _a[p.typeId]) || 0) + 1 } }); }); }
    function placePlanterBucket(typeId, x, y) { var _a; const item = PLANTER_BUCKET_TYPES.find((p) => p.id === typeId); if (!item || (((_a = inventory.planterBuckets) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) < 1)
        return; if (cellOccupied(x, y)) {
        addLog('Something is already there.');
        return;
    } planterBucketIdRef.current += 1; setPlanterBuckets((prev) => [...prev, { id: planterBucketIdRef.current, typeId, x, y, plant: null }]); setInventory((inv) => ({ ...inv, planterBuckets: { ...inv.planterBuckets, [typeId]: inv.planterBuckets[typeId] - 1 } })); setSelectedBuildMaterial(null); }
    function deletePlanterBucket(id) { const c = planterBuckets.find((x) => x.id === id); if (!c)
        return; if (c.plant) {
        addLog('Clear the planter first.');
        return;
    } setPlanterBuckets((prev) => prev.filter((x) => x.id !== id)); setInventory((inv) => { var _a; return ({ ...inv, planterBuckets: { ...inv.planterBuckets, [c.typeId]: (((_a = inv.planterBuckets) === null || _a === void 0 ? void 0 : _a[c.typeId]) || 0) + 1 } }); }); }
    function plantPlanterBucket(id, plantId, source) { var _a, _b; const c = planterBuckets.find((x) => x.id === id), p = PLANTS.find((x) => x.id === plantId); if (!c || !p || c.plant)
        return; if (!canGrowInZone(p, zone)) {
        addLog(`${p.name} is outside ${zone.name}'s outdoor growing range. Use a greenhouse bench instead.`);
        return;
    } const cap = ((_a = PLANTER_BUCKET_TYPES.find((x) => x.id === c.typeId)) === null || _a === void 0 ? void 0 : _a.gallons) || 1; const need = planterGallonsNeeded(p); if (cap < need) {
        addLog(`${p.name} needs about ${need}+ gallons; this planter holds ${cap}.`);
        return;
    } const key = source === 'seed' ? 'seeds' : 'livePlants'; if ((((_b = inventory[key]) === null || _b === void 0 ? void 0 : _b[p.id]) || 0) < 1)
        return; if (source === 'seed')
        removeSeed(p.id, 1);
    else
        removeLivePlant(p.id, 1); setPlanterBuckets((prev) => prev.map((x) => x.id === id ? { ...x, plant: { ...p, health: 100, age: 0, wateredToday: true, dead: false, harvested: false, containerGrown: true } } : x)); }
    function waterPlanterBucket(id) { setPlanterBuckets((prev) => prev.map((x) => x.id === id && x.plant ? { ...x, plant: { ...x.plant, wateredToday: true, daysUnwatered: 0 } } : x)); }
    function clearPlanterBucket(id) {
        const bucket = planterBuckets.find((x) => x.id === id);
        const plant = bucket?.plant;
        if (plant?.dead) {
            setInventory((inv) => ({ ...inv, deadMatter: (inv.deadMatter || 0) + 1 }));
            addLog(`Cleared dead ${plant.name} from the planter — added to dead plant matter for compost.`);
        }
        setPlanterBuckets((prev) => prev.map((x) => x.id === id ? { ...x, plant: null } : x));
    }
    function harvestPlanterBucket(id) { const c = planterBuckets.find((x) => x.id === id), p = c === null || c === void 0 ? void 0 : c.plant; if (!p || p.dead)
        return; const cal = gameCalendarDate(startMonth, startDay, seasonIdx, day); if (p.harvestMonths && !monthInWindow(cal.month, p.harvestMonths)) {
        addLog(`${p.name} is mature, but its normal harvest window is ${seasonalFruitSummary(p).replace('🌸 Bloom: ', '').replace(' · 🧺 Harvest: ', ' / harvest ')}.`);
        return;
    } const tier = harvestQualityTier(p.age, p.daysToMature); if (!tier)
        return; if (!basketSizeId || basketItems.length >= basketCapacity()) {
        addLog('You need basket space.');
        return;
    } basketItemIdRef.current += 1; setBasketItems((prev) => [...prev, { id: basketItemIdRef.current, plantId: p.id, name: p.name, emoji: p.emoji, value: Math.round((p.sellValue || 0) * (tier === 'full' ? 1 : .5)), daysIn: 0, sellable: true, health: p.health || 100, qualityTier: tier }]); setPlanterBuckets((prev) => prev.map((x) => x.id === id ? { ...x, plant: p.repeatHarvest ? nextStateAfterHarvest(p) : null } : x)); }
    function buyTreeContainer(typeId) {
        const item = TREE_CONTAINER_TYPES.find((x) => x.id === typeId);
        if (!item)
            return;
        if (cash < item.cost) {
            addLog(`Not enough cash for ${item.name} ($${item.cost}).`);
            return;
        }
        setCash((c) => c - item.cost);
        setInventory((inv) => { var _a; return ({ ...inv, treeContainers: { ...inv.treeContainers, [typeId]: (((_a = inv.treeContainers) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) + 1 } }); });
        addLog(`Bought ${item.name}. Place it from Yard → Build → Tree Containers.`);
    }
    function sellTreeContainer(typeId) {
        var _a;
        const item = TREE_CONTAINER_TYPES.find((x) => x.id === typeId);
        if (!item || (((_a = inventory.treeContainers) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) < 1)
            return;
        setInventory((inv) => { var _a; return ({ ...inv, treeContainers: { ...inv.treeContainers, [typeId]: (((_a = inv.treeContainers) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) - 1 } }); });
        setCash((c) => c + item.cost);
        addLog(`Returned an unplaced ${item.name} for $${item.cost}.`);
    }
    function placeTreeContainer(typeId, x, y) {
        var _a;
        const item = TREE_CONTAINER_TYPES.find((z) => z.id === typeId);
        if (!item)
            return;
        if ((((_a = inventory.treeContainers) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) < 1) {
            addLog(`No ${item.name} in inventory.`);
            return;
        }
        if (cellOccupied(x, y)) {
            addLog('Something is already there.');
            return;
        }
        treeContainerIdRef.current += 1;
        setInventory((inv) => { var _a; return ({ ...inv, treeContainers: { ...inv.treeContainers, [typeId]: (((_a = inv.treeContainers) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) - 1 } }); });
        setTreeContainers((prev) => [...prev, { id: treeContainerIdRef.current, typeId, x, y, greenhouseId: null, plant: null }]);
        setSelectedBuildMaterial(null);
        addLog(`Placed ${item.name}. Click the pot to plant a heat-loving tree or move it into a greenhouse.`);
    }
    function deleteTreeContainer(id) {
        const c = treeContainers.find((x) => x.id === id);
        if (!c)
            return;
        if (c.plant) {
            addLog('Clear the tree from the container before picking up the pot.');
            return;
        }
        setTreeContainers((prev) => prev.filter((x) => x.id !== id));
        setInventory((inv) => { var _a; return ({ ...inv, treeContainers: { ...inv.treeContainers, [c.typeId]: (((_a = inv.treeContainers) === null || _a === void 0 ? void 0 : _a[c.typeId]) || 0) + 1 } }); });
        setTreeContainerOpenId((open) => open === id ? null : open);
    }
    function plantTreeContainer(containerId, plantId, source) {
        var _a;
        const plant = PLANTS.find((p) => p.id === plantId);
        const c = treeContainers.find((x) => x.id === containerId);
        if (!c || !plant || !isMovableTreePlant(plant))
            return;
        if (c.plant) {
            addLog('That tree container is already planted.');
            return;
        }
        const sourceKey = source === 'seed' ? 'seeds' : 'livePlants';
        if ((((_a = inventory[sourceKey]) === null || _a === void 0 ? void 0 : _a[plant.id]) || 0) < 1) {
            addLog(`You don't have a ${source === 'seed' ? 'seed' : 'live plant'} for ${plant.name}.`);
            return;
        }
        if (source === 'seed')
            removeSeed(plant.id, 1);
        else
            removeLivePlant(plant.id, 1);
        const newPlant = { ...plant, containerGrown: true, health: 100, age: 0, wateredToday: true, daysUnwatered: 0, dead: false, harvested: false };
        setTreeContainers((prev) => prev.map((x) => x.id === containerId ? { ...x, plant: newPlant } : x));
        addLog(`Planted ${plant.name} in the movable tree container.`);
    }
    function waterTreeContainer(containerId) {
        setTreeContainers((prev) => prev.map((x) => x.id === containerId && x.plant ? { ...x, plant: { ...x.plant, wateredToday: true, daysUnwatered: 0 } } : x));
        addLog('Watered the container tree.');
    }
    function clearTreeContainerPlant(containerId) {
        const container = treeContainers.find((x) => x.id === containerId);
        const plant = container?.plant;
        if (plant?.dead) {
            setInventory((inv) => ({ ...inv, deadMatter: (inv.deadMatter || 0) + 1 }));
            addLog(`Cleared dead ${plant.name} from the tree container — added to dead plant matter for compost.`);
        }
        setTreeContainers((prev) => prev.map((x) => x.id === containerId ? { ...x, plant: null } : x));
    }
    function moveTreeContainerIntoGreenhouse(containerId, greenhouseId) {
        var _a;
        const c = treeContainers.find((x) => x.id === containerId);
        const g = greenhouses.find((x) => x.id === greenhouseId);
        if (!c || !g)
            return;
        const used = treeContainers.filter((x) => x.greenhouseId === greenhouseId).length;
        const cap = greenhouseTreeCapacity(g.typeId);
        if (used >= cap) {
            addLog(`That greenhouse is full for large tree containers (${cap} max).`);
            return;
        }
        setTreeContainers((prev) => prev.map((x) => x.id === containerId ? { ...x, greenhouseId } : x));
        addLog(`${((_a = c.plant) === null || _a === void 0 ? void 0 : _a.name) || 'Tree container'} moved inside the greenhouse for cold protection.`);
    }
    function moveTreeContainerOutside(containerId) {
        setTreeContainers((prev) => prev.map((x) => x.id === containerId ? { ...x, greenhouseId: null } : x));
        addLog('Moved the tree container back outside to its yard position.');
    }
    function harvestTreeContainer(containerId) {
        const c = treeContainers.find((x) => x.id === containerId);
        const p = c === null || c === void 0 ? void 0 : c.plant;
        if (!p || p.dead)
            return;
        const cal = gameCalendarDate(startMonth, startDay, seasonIdx, day);
        if (p.harvestMonths && !monthInWindow(cal.month, p.harvestMonths)) {
            addLog(`${p.name} is between harvest seasons. ${seasonalFruitSummary(p)}`);
            return;
        }
        const tier = harvestQualityTier(p.age, p.daysToMature);
        if (!tier) {
            addLog(`${p.name} is not ready yet.`);
            return;
        }
        if (!basketSizeId || basketItems.length >= basketCapacity()) {
            addLog(!basketSizeId ? 'Buy a harvest basket first.' : 'Your harvest basket is full.');
            return;
        }
        const qualityMult = tier === 'full' ? 1 : tier === 'half' ? 0.5 : 0.35;
        const value = Math.round((p.sellValue || 0) * qualityMult);
        basketItemIdRef.current += 1;
        setBasketItems((prev) => { var _a; return [...prev, { id: basketItemIdRef.current, plantId: p.id, name: p.name, emoji: p.emoji, value, daysIn: 0, sellable: tier !== 'weak', health: (_a = p.health) !== null && _a !== void 0 ? _a : 100, qualityTier: tier }]; });
        setTreeContainers((prev) => prev.map((x) => x.id === containerId ? { ...x, plant: { ...p, age: Math.max(0, p.daysToMature - 5), harvested: false } } : x));
        addLog(`Harvested ${p.name} from its container; the perennial tree remains planted.`);
    }
    function greenhouseAtCell(x, y) {
        return greenhouses.find((g) => x >= g.x && x < g.x + g.w && y >= g.y && y < g.y + g.h) || null;
    }
    function placeGreenhouse(typeId, x, y) {
        var _a;
        const type = GREENHOUSE_TYPES.find((g) => g.id === typeId);
        if (!type)
            return;
        if ((((_a = inventory.greenhouses) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) < 1) {
            addLog(`No ${type.name} in inventory — buy one at the Plant Nursery.`);
            return;
        }
        if (x + type.w > GRID_COLS || y + type.h > GRID_ROWS) {
            addLog(`${type.name} won't fit there — keep the full ${type.w}'×${type.h}' footprint inside the yard.`);
            return;
        }
        if (!rectFree(x, y, x + type.w - 1, y + type.h - 1)) {
            addLog('That greenhouse footprint overlaps something already there.');
            return;
        }
        greenhouseIdRef.current += 1;
        setInventory((inv) => { var _a; return ({ ...inv, greenhouses: { ...inv.greenhouses, [typeId]: (((_a = inv.greenhouses) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) - 1 } }); });
        setGreenhouses((prev) => [...prev, { id: greenhouseIdRef.current, typeId, x, y, w: type.w, h: type.h, plants: Array(type.plantSlots).fill(null), decor: [], controls: { heaterOn: false, fanOn: false, lightsOn: false }, hydroponics: [] }]);
        setSelectedBuildMaterial(null);
        addLog(`Placed ${type.name}. Click the greenhouse to enter, plant, water, and decorate it.`);
    }
    function deleteGreenhouse(id) {
        const g = greenhouses.find((x) => x.id === id);
        if (!g)
            return;
        if ((g.plants || []).some(Boolean)) {
            addLog('Clear the greenhouse plants before picking the structure back up.');
            return;
        }
        if (treeContainers.some((c) => c.greenhouseId === id)) {
            addLog('Move the overwintering tree containers back outside before picking up this greenhouse.');
            return;
        }
        if ((g.hydroponics || []).some((h) => (h.plants || []).some(Boolean))) {
            addLog('Clear the greenhouse hydroponic plants before picking up the structure.');
            return;
        }
        setGreenhouses((prev) => prev.filter((x) => x.id !== id));
        setInventory((inv) => {
            var _a;
            const nextDecor = { ...inv.greenhouseDecor };
            (g.decor || []).forEach((d) => { nextDecor[d] = (nextDecor[d] || 0) + 1; });
            return { ...inv, greenhouses: { ...inv.greenhouses, [g.typeId]: (((_a = inv.greenhouses) === null || _a === void 0 ? void 0 : _a[g.typeId]) || 0) + 1 }, greenhouseDecor: nextDecor };
        });
        setGreenhouseOpenId((open) => open === id ? null : open);
        addLog('Picked up the empty greenhouse; the structure and its decorations returned to inventory.');
    }
    function plantGreenhouseSlot(greenhouseId, slotIdx) {
        var _a;
        const g = greenhouses.find((x) => x.id === greenhouseId);
        if (!g || !selectedPlant) {
            addLog('Choose a crop first.');
            return;
        }
        if ((_a = g.plants) === null || _a === void 0 ? void 0 : _a[slotIdx]) {
            addLog('That greenhouse planting spot is already occupied.');
            return;
        }
        if (!canUseSource(selectedPlant, selectedSource)) {
            addLog(`You don't have any ${selectedSource === 'seed' ? 'seeds' : 'live plants'} for ${selectedPlant.name}.`);
            return;
        }
        const newPlant = { ...selectedPlant, sx: slotIdx, sy: 0, greenhouse: true, greenhouseOnly: !canGrowInZone(selectedPlant, zone), daysToMature: daysToMatureFrom(selectedPlant, selectedSource), health: 100, age: 0, wateredToday: true, dead: false, harvested: false };
        if (selectedSource === 'seed')
            removeSeed(selectedPlant.id, 1);
        else
            removeLivePlant(selectedPlant.id, 1);
        setGreenhouses((prev) => prev.map((x) => x.id === greenhouseId ? { ...x, plants: x.plants.map((p, i) => i === slotIdx ? newPlant : p) } : x));
        addLog(`Planted ${selectedPlant.name} inside the greenhouse${!canGrowInZone(selectedPlant, zone) ? ' — this crop depends on maintained greenhouse conditions in your zone' : ' — protected from outdoor frost'}.`);
    }
    function waterGreenhouse(greenhouseId) {
        setGreenhouses((prev) => prev.map((g) => g.id === greenhouseId ? { ...g, plants: (g.plants || []).map((p) => p && !p.dead && !p.harvested ? { ...p, wateredToday: true, daysUnwatered: 0 } : p) } : g));
        addLog('Watered all active greenhouse plants.');
    }
    function toggleGreenhouseControl(greenhouseId, controlKey) {
        setGreenhouses((prev) => prev.map((g) => {
            var _a, _b;
            if (g.id !== greenhouseId)
                return g;
            const neededDecor = controlKey === 'heaterOn' ? 'heater' : controlKey === 'fanOn' ? 'ventfan' : 'growlight';
            if (!(g.decor || []).includes(neededDecor)) {
                addLog(`Install the ${((_a = GREENHOUSE_DECOR.find((d) => d.id === neededDecor)) === null || _a === void 0 ? void 0 : _a.name) || 'equipment'} before turning it on.`);
                return g;
            }
            const nextControls = { heaterOn: false, fanOn: false, lightsOn: false, ...(g.controls || {}), [controlKey]: !((_b = g.controls) === null || _b === void 0 ? void 0 : _b[controlKey]) };
            addLog(`${controlKey === 'heaterOn' ? 'Greenhouse heater' : controlKey === 'fanOn' ? 'Vent fan' : 'Grow lights'} turned ${nextControls[controlKey] ? 'ON' : 'OFF'}.`);
            return { ...g, controls: nextControls };
        }));
    }
    function clearGreenhousePlant(greenhouseId, slotIdx) {
        const greenhouse = greenhouses.find((g) => g.id === greenhouseId);
        const plant = greenhouse?.plants?.[slotIdx];
        if (plant?.dead) {
            setInventory((inv) => ({ ...inv, deadMatter: (inv.deadMatter || 0) + 1 }));
            addLog(`Cleared dead ${plant.name} from the greenhouse — added to dead plant matter for compost.`);
        }
        setGreenhouses((prev) => prev.map((g) => g.id === greenhouseId ? { ...g, plants: g.plants.map((p, i) => i === slotIdx ? null : p) } : g));
    }
    function harvestGreenhouseSlot(greenhouseId, slotIdx) {
        var _a;
        const g = greenhouses.find((x) => x.id === greenhouseId);
        const p = (_a = g === null || g === void 0 ? void 0 : g.plants) === null || _a === void 0 ? void 0 : _a[slotIdx];
        if (!p || p.dead || p.harvested)
            return;
        const cal = gameCalendarDate(startMonth, startDay, seasonIdx, day);
        if (p.harvestMonths && !monthInWindow(cal.month, p.harvestMonths)) {
            addLog(`${p.name} is between harvest seasons. ${seasonalFruitSummary(p)}`);
            return;
        }
        const tier = harvestQualityTier(p.age, p.daysToMature);
        if (!tier) {
            addLog(`${p.name} isn't ready to harvest yet.`);
            return;
        }
        const capacity = basketCapacity();
        if (!basketSizeId || basketItems.length >= capacity) {
            addLog(!basketSizeId ? 'Buy a harvest basket first.' : 'Your harvest basket is full.');
            return;
        }
        const sellable = tier !== 'weak';
        const mult = tier === 'full' ? 1 : tier === 'half' ? 0.5 : 0;
        const value = Math.max(0, Math.round((p.sellValue || 0) * mult));
        basketItemIdRef.current += 1;
        setBasketItems((prev) => { var _a; return [...prev, { id: basketItemIdRef.current, plantId: p.id, name: p.name, emoji: p.emoji, value, daysIn: 0, sellable, health: Math.max(0, Math.min(100, (_a = p.health) !== null && _a !== void 0 ? _a : 100)), qualityTier: tier, seedsAlreadyCollected: !!p.seedsCollected }]; });
        if (p.repeatHarvest) {
            const next = nextStateAfterHarvest(p);
            if (next.exhausted) {
                clearGreenhousePlant(greenhouseId, slotIdx);
                setInventory((inv) => ({ ...inv, deadMatter: (inv.deadMatter || 0) + 1 }));
                addLog(`Harvested ${p.name} for the ${next.harvestCount}th time. Its production cycle is finished; the spent plant became compost greens and must be replanted.`);
            }
            else {
                setGreenhouses((prev) => prev.map((x) => x.id === greenhouseId ? { ...x, plants: x.plants.map((plant, i) => i === slotIdx ? next : plant) } : x));
                addLog(`Harvested ${p.name} from the greenhouse (${next.harvestCount}/4 minimum harvests). It will produce again.`);
            }
        }
        else {
            clearGreenhousePlant(greenhouseId, slotIdx);
            addLog(`Harvested ${p.name} from the greenhouse into your basket.`);
        }
    }
    function addKratkySystem(greenhouseId) {
        const g = greenhouses.find((x) => x.id === greenhouseId);
        if (!g)
            return;
        if (cash < KRATKY_SYSTEM.cost) {
            addLog(`Not enough cash for ${KRATKY_SYSTEM.name}.`);
            return;
        }
        const type = GREENHOUSE_TYPES.find((t) => t.id === g.typeId) || GREENHOUSE_TYPES[0];
        const maxSystems = Math.max(1, Math.floor(type.plantSlots / 6));
        if ((g.hydroponics || []).length >= maxSystems) {
            addLog(`${type.name} has room for ${maxSystems} Kratky setup${maxSystems === 1 ? '' : 's'}.`);
            return;
        }
        setCash((v) => v - KRATKY_SYSTEM.cost);
        setGreenhouses((prev) => prev.map((x) => x.id === greenhouseId ? { ...x, hydroponics: [...(x.hydroponics || []), { id: `kratky-${Date.now()}-${(x.hydroponics || []).length}`, type: 'kratky', reservoir: 100, nutrients: 100, ph: 6.0, plants: Array(KRATKY_SYSTEM.slots).fill(null) }] } : x));
        addLog('🫙 Added a Kratky reservoir. No pump is needed — let the water level fall naturally so an air gap forms above the nutrient solution.');
    }
    function plantKratkySlot(greenhouseId, systemId, slotIdx) {
        const g = greenhouses.find((x) => x.id === greenhouseId);
        const h = (g?.hydroponics || []).find((x) => x.id === systemId);
        if (!g || !h || !selectedPlant) {
            addLog('Choose a crop first.');
            return;
        }
        if (h.plants?.[slotIdx])
            return;
        if (!kratkyCropSuitable(selectedPlant)) {
            addLog(`${selectedPlant.name} is not a beginner-friendly Kratky crop. Try leafy greens, herbs, bok choy, or strawberries.`);
            return;
        }
        if (!canUseSource(selectedPlant, selectedSource)) {
            addLog(`You don't have any ${selectedSource === 'seed' ? 'seeds' : 'live plants'} for ${selectedPlant.name}.`);
            return;
        }
        const plant = { ...selectedPlant, hydroponic: 'kratky', greenhouse: true, daysToMature: Math.max(1, Math.round(daysToMatureFrom(selectedPlant, selectedSource) * .9)), health: 100, age: 0, dead: false, harvested: false };
        if (selectedSource === 'seed')
            removeSeed(selectedPlant.id, 1);
        else
            removeLivePlant(selectedPlant.id, 1);
        setGreenhouses((prev) => prev.map((x) => x.id !== greenhouseId ? x : { ...x, hydroponics: (x.hydroponics || []).map((sys) => sys.id !== systemId ? sys : { ...sys, plants: sys.plants.map((p, i) => i === slotIdx ? plant : p) }) }));
        addLog(`🌱 Started ${selectedPlant.name} in the Kratky system. Watch the reservoir fall — do not keep topping it back to 100%.`);
    }
    function refillKratky(greenhouseId, systemId) {
        setGreenhouses((prev) => prev.map((x) => x.id !== greenhouseId ? x : { ...x, hydroponics: (x.hydroponics || []).map((h) => h.id !== systemId ? h : { ...h, reservoir: Math.max(h.reservoir || 0, 70), nutrients: 100 }) }));
        addLog('💧 Kratky nutrients refreshed to about 70%. The remaining air gap protects established air roots from being submerged.');
    }
    function clearKratkyPlant(greenhouseId, systemId, slotIdx) {
        const greenhouse = greenhouses.find((x) => x.id === greenhouseId);
        const system = (greenhouse?.hydroponics || []).find((h) => h.id === systemId);
        const plant = system?.plants?.[slotIdx];
        if (plant?.dead) {
            setInventory((inv) => ({ ...inv, deadMatter: (inv.deadMatter || 0) + 1 }));
            addLog(`Cleared dead ${plant.name} from the Kratky system — added to dead plant matter for compost.`);
        }
        setGreenhouses((prev) => prev.map((x) => x.id !== greenhouseId ? x : { ...x, hydroponics: (x.hydroponics || []).map((h) => h.id !== systemId ? h : { ...h, plants: h.plants.map((p, i) => i === slotIdx ? null : p) }) }));
    }
    function harvestKratkyPlant(greenhouseId, systemId, slotIdx) {
        const g = greenhouses.find((x) => x.id === greenhouseId);
        const h = (g?.hydroponics || []).find((x) => x.id === systemId);
        const p = h?.plants?.[slotIdx];
        if (!p || p.dead)
            return;
        const tier = harvestQualityTier(p.age, p.daysToMature);
        if (!tier) {
            addLog(`${p.name} isn't ready to harvest yet.`);
            return;
        }
        if (!basketSizeId || basketItems.length >= basketCapacity()) {
            addLog(!basketSizeId ? 'Buy a harvest basket first.' : 'Your harvest basket is full.');
            return;
        }
        const mult = tier === 'full' ? 1 : tier === 'half' ? .5 : 0;
        basketItemIdRef.current += 1;
        setBasketItems((prev) => [...prev, { id: basketItemIdRef.current, plantId: p.id, name: p.name, emoji: p.emoji, value: Math.max(0, Math.round((p.sellValue || 0) * mult)), daysIn: 0, sellable: tier !== 'weak', health: p.health ?? 100, qualityTier: tier }]);
        clearKratkyPlant(greenhouseId, systemId, slotIdx);
        addLog(`🧺 Harvested hydroponic ${p.name} from the Kratky reservoir.`);
    }
    function addGreenhouseDecor(greenhouseId, decorId) {
        var _a;
        const item = GREENHOUSE_DECOR.find((d) => d.id === decorId);
        const g = greenhouses.find((x) => x.id === greenhouseId);
        const type = GREENHOUSE_TYPES.find((t) => t.id === (g === null || g === void 0 ? void 0 : g.typeId));
        if (!item || !g || !type)
            return;
        if ((((_a = inventory.greenhouseDecor) === null || _a === void 0 ? void 0 : _a[decorId]) || 0) < 1) {
            addLog(`You don't own ${item.name}. Buy it at the Plant Nursery.`);
            return;
        }
        if ((g.decor || []).length >= type.decorSlots) {
            addLog(`${type.name} has no open decoration space.`);
            return;
        }
        setInventory((inv) => { var _a; return ({ ...inv, greenhouseDecor: { ...inv.greenhouseDecor, [decorId]: (((_a = inv.greenhouseDecor) === null || _a === void 0 ? void 0 : _a[decorId]) || 0) - 1 } }); });
        setGreenhouses((prev) => prev.map((x) => x.id === greenhouseId ? { ...x, decor: [...(x.decor || []), decorId] } : x));
        addLog(`Added ${item.name} to the greenhouse.`);
    }
    function removeGreenhouseDecor(greenhouseId, decorIdx) {
        var _a;
        const g = greenhouses.find((x) => x.id === greenhouseId);
        const decorId = (_a = g === null || g === void 0 ? void 0 : g.decor) === null || _a === void 0 ? void 0 : _a[decorIdx];
        if (!decorId)
            return;
        setGreenhouses((prev) => prev.map((x) => x.id === greenhouseId ? { ...x, decor: x.decor.filter((_, i) => i !== decorIdx) } : x));
        setInventory((inv) => { var _a; return ({ ...inv, greenhouseDecor: { ...inv.greenhouseDecor, [decorId]: (((_a = inv.greenhouseDecor) === null || _a === void 0 ? void 0 : _a[decorId]) || 0) + 1 } }); });
    }
    function pondAtCell(x, y) {
        return ponds.find((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) || null;
    }
    function placePond(typeId, x, y) {
        var _a;
        const type = POND_TYPES.find((p) => p.id === typeId);
        if (!type)
            return;
        if ((((_a = inventory.ponds) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) < 1) {
            addLog(`No ${type.name} in inventory — buy one at the Plant Nursery.`);
            return;
        }
        if (x + type.w > GRID_COLS || y + type.h > GRID_ROWS) {
            addLog(`${type.name} won't fit there.`);
            return;
        }
        if (!rectFree(x, y, x + type.w - 1, y + type.h - 1)) {
            addLog('That pond footprint overlaps something already there.');
            return;
        }
        pondIdRef.current += 1;
        setInventory((inv) => { var _a; return ({ ...inv, ponds: { ...inv.ponds, [typeId]: (((_a = inv.ponds) === null || _a === void 0 ? void 0 : _a[typeId]) || 0) - 1 } }); });
        setPonds((prev) => [...prev, { id: pondIdRef.current, typeId, x, y, w: type.w, h: type.h, fish: {} }]);
        setSelectedBuildMaterial(null);
        addLog(`Placed ${type.name}. Click it to stock fish and inspect mosquito control.`);
    }
    function deletePond(id) {
        const pond = ponds.find((p) => p.id === id);
        if (!pond)
            return;
        if (pondFishCount(pond) > 0) {
            addLog('Remove the fish from this pond before picking the pond back up.');
            return;
        }
        setPonds((prev) => prev.filter((p) => p.id !== id));
        setInventory((inv) => { var _a; return ({ ...inv, ponds: { ...inv.ponds, [pond.typeId]: (((_a = inv.ponds) === null || _a === void 0 ? void 0 : _a[pond.typeId]) || 0) + 1 } }); });
        addLog('Picked up the empty pond kit and returned it to inventory.');
    }
    function stockPondFish(pondId, fishId) {
        var _a;
        const pond = ponds.find((p) => p.id === pondId);
        const type = POND_TYPES.find((p) => p.id === (pond === null || pond === void 0 ? void 0 : pond.typeId));
        const fish = POND_FISH.find((f) => f.id === fishId);
        if (!pond || !type || !fish)
            return;
        if ((((_a = inventory.pondFish) === null || _a === void 0 ? void 0 : _a[fishId]) || 0) < 1) {
            addLog(`You don't own any ${fish.name}. Buy fish under Plant Nursery → Materials.`);
            return;
        }
        if ((type.w * type.h) < (fish.minPondArea || 1)) {
            addLog(`${fish.name} need a larger pond. ${type.name} is too small for that species.`);
            return;
        }
        if (pondFishCount(pond) >= type.fishSlots) {
            addLog(`${type.name} is at its fish capacity.`);
            return;
        }
        setInventory((inv) => { var _a; return ({ ...inv, pondFish: { ...inv.pondFish, [fishId]: (((_a = inv.pondFish) === null || _a === void 0 ? void 0 : _a[fishId]) || 0) - 1 } }); });
        setPonds((prev) => prev.map((p) => { var _a; return p.id === pondId ? { ...p, fish: { ...(p.fish || {}), [fishId]: (((_a = p.fish) === null || _a === void 0 ? void 0 : _a[fishId]) || 0) + 1 } } : p; }));
        addLog(`Added ${fish.name} to the pond.`);
    }
    function removePondFish(pondId, fishId) {
        var _a;
        const pond = ponds.find((p) => p.id === pondId);
        const fish = POND_FISH.find((f) => f.id === fishId);
        if (!pond || !fish || (((_a = pond.fish) === null || _a === void 0 ? void 0 : _a[fishId]) || 0) < 1)
            return;
        setPonds((prev) => prev.map((p) => { var _a; return p.id === pondId ? { ...p, fish: { ...(p.fish || {}), [fishId]: Math.max(0, (((_a = p.fish) === null || _a === void 0 ? void 0 : _a[fishId]) || 0) - 1) } } : p; }));
        setInventory((inv) => { var _a; return ({ ...inv, pondFish: { ...inv.pondFish, [fishId]: (((_a = inv.pondFish) === null || _a === void 0 ? void 0 : _a[fishId]) || 0) + 1 } }); });
        addLog(`Returned one ${fish.name} from the pond to inventory.`);
    }
    function placeTrellis(typeId, x, y) {
        var _a;
        const type = TRELLIS_TYPES.find((t) => t.id === typeId);
        if (!type)
            return;
        const owned = (((_a = inventory.trellises) === null || _a === void 0 ? void 0 : _a[typeId]) || 0);
        if (owned < 1) {
            addLog(`No ${type.name} in inventory — buy one at the Plant Nursery.`);
            return;
        }
        if (typeId === 'cattlepanel') {
            const w = type.footprintW || 3;
            const h = type.footprintH || 2;
            const px = Math.max(0, Math.min(GRID_COLS - w, x - Math.floor(w / 2)));
            const py = Math.max(0, Math.min(GRID_ROWS - h, y - Math.floor(h / 2)));
            let blocked = false;
            for (let gx = px; gx < px + w && !blocked; gx++) {
                for (let gy = py; gy < py + h; gy++) {
                    const occupiedByStructure =
                        greenhouses.some((g) => gx >= g.x && gx < g.x + g.w && gy >= g.y && gy < g.y + g.h) ||
                        ponds.some((p) => gx >= p.x && gx < p.x + p.w && gy >= p.y && gy < p.y + p.h) ||
                        planterBuckets.some((p) => p.x === gx && p.y === gy) ||
                        treeContainers.some((p) => p.x === gx && p.y === gy) ||
                        barrels.some((p) => p.x === gx && p.y === gy) ||
                        spigots.some((p) => p.x === gx && p.y === gy) ||
                        groundObstacles.some((o) => o.gx === gx && o.gy === gy) ||
                        trellises.some((t) => {
                            const tw = t.typeId === 'cattlepanel' ? (t.w || 3) : 1;
                            const th = t.typeId === 'cattlepanel' ? (t.h || 2) : 1;
                            return gx >= t.x && gx < t.x + tw && gy >= t.y && gy < t.y + th;
                        });
                    if (occupiedByStructure) {
                        blocked = true;
                        break;
                    }
                }
            }
            if (blocked) {
                addLog('The Cattle Panel Arch can cover beds and crops, but not buildings, ponds, containers, obstacles, or another trellis. Click near the center of the area you want to cover.');
                return;
            }
            trellisIdRef.current += 1;
            setInventory((inv) => ({ ...inv, trellises: { ...inv.trellises, [typeId]: Math.max(0, ((inv.trellises && inv.trellises[typeId]) || 0) - 1) } }));
            setTrellises((prev) => [...prev, { id: trellisIdRef.current, typeId, x: px, y: py, w, h }]);
            if (owned <= 1)
                setSelectedBuildMaterial(null);
            addLog('Placed Cattle Panel Arch. Plant vining crops underneath it; they will climb the sides and over the top.');
            return;
        }
        if (cellOccupied(x, y)) {
            addLog('Something is already there. Place this trellis beside the crop, not on top of it.');
            return;
        }
        trellisIdRef.current += 1;
        setInventory((inv) => ({ ...inv, trellises: { ...inv.trellises, [typeId]: Math.max(0, ((inv.trellises && inv.trellises[typeId]) || 0) - 1) } }));
        setTrellises((prev) => [...prev, { id: trellisIdRef.current, typeId, x, y }]);
        if (owned <= 1)
            setSelectedBuildMaterial(null);
        addLog(`Placed ${type.name}. Vining crops in an adjacent square will climb it and grow more efficiently.`);
    }
    function deleteTrellis(id) {
        const item = trellises.find((t) => t.id === id);
        if (!item)
            return;
        setTrellises((prev) => prev.filter((t) => t.id !== id));
        setInventory((inv) => ({ ...inv, trellises: { ...inv.trellises, [item.typeId]: (((inv.trellises && inv.trellises[item.typeId]) || 0) + 1) } }));
        addLog('Trellis returned to inventory.');
    }
    function trellisNearCell(gx, gy) {
        return trellises.find((t) => {
            if (t.typeId === 'cattlepanel') {
                const w = t.w || 3, h = t.h || 2;
                return gx >= t.x && gx < t.x + w && gy >= t.y && gy < t.y + h;
            }
            return Math.abs(t.x - gx) + Math.abs(t.y - gy) === 1;
        }) || null;
    }
    function netForPlantLocation(plant, location) {
        if (!plant || !location)
            return null;
        let gx = null, gy = null;
        if (location.kind === 'ground') {
            gx = location.x;
            gy = location.y;
        }
        if (location.kind === 'bed') {
            const b = beds.find((x) => x.id === location.bedId);
            if (b) {
                gx = b.x + (plant.sx || 0);
                gy = b.y + (plant.sy || 0);
            }
        }
        if (location.kind === 'treecontainer') {
            gx = location.x;
            gy = location.y;
        }
        if (location.kind === 'bucket') {
            const c = planterBuckets.find((x) => x.id === location.bucketId);
            if (c) {
                gx = c.x;
                gy = c.y;
            }
        }
        if (gx == null)
            return null;
        return protectiveNets.find((n) => n.x === gx && n.y === gy) || null;
    }
    function trellisForPlantLocation(plant, location) {
        if (!isViningPlant(plant) || !location)
            return null;
        if (location.kind === 'ground')
            return trellisNearCell(location.x, location.y);
        if (location.kind === 'bed') {
            const bed = beds.find((b) => b.id === location.bedId);
            if (!bed)
                return null;
            return trellisNearCell(bed.x + (plant.sx || 0), bed.y + (plant.sy || 0));
        }
        return null;
    }
    function cellOccupied(x, y) {
        return beds.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) || greenhouses.some((g) => x >= g.x && x < g.x + g.w && y >= g.y && y < g.y + g.h) || ponds.some((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) || trellises.some((t) => t.typeId !== 'cattlepanel' && t.x === x && t.y === y) || planterBuckets.some((c) => c.x === x && c.y === y) || treeContainers.some((c) => c.x === x && c.y === y) || barrels.some((br) => br.x === x && br.y === y) || spigots.some((sp) => sp.x === x && sp.y === y) || groundObstacles.some((o) => o.gx === x && o.gy === y);
    }
    function rectFree(x0, y0, x1, y1) {
        for (let x = x0; x <= x1; x++)
            for (let y = y0; y <= y1; y++)
                if (cellOccupied(x, y))
                    return false;
        return true;
    }
    function pipeSegmentLength(p0, p1) {
        // Grid cells are 10ft. Bed-edge connectors can land on a half-cell boundary,
        // so the final snap to a bed can use a 5ft increment.
        const cells = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        return Math.max(0.5, Math.round(cells * 2) / 2);
    }
    function pipeRunFeet(points) {
        let total = 0;
        for (let i = 1; i < points.length; i++)
            total += pipeSegmentLength(points[i - 1], points[i]) * 10;
        return Math.round(total);
    }
    function findBedAtCell(x, y) {
        return beds.find((bed) => x >= bed.x && x < bed.x + bed.w && y >= bed.y && y < bed.y + bed.h) || null;
    }
    function findWaterSourceAtCell(x, y) {
        const barrel = barrels.find((b) => b.x === x && b.y === y);
        if (barrel)
            return { kind: 'barrel', id: barrel.id };
        const spigot = spigots.find((s) => s.x === x && s.y === y);
        if (spigot)
            return { kind: 'spigot', id: spigot.id };
        return null;
    }
    function makeBedEdgeConnector(bed, fromPoint, clickedCell) {
        var _a, _b;
        // Pipe points normally sit in cell centers. A half-cell x/y renders on the bed border.
        const ref = fromPoint || clickedCell || { x: bed.x, y: bed.y };
        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        const row = clamp(Math.round((_a = clickedCell === null || clickedCell === void 0 ? void 0 : clickedCell.y) !== null && _a !== void 0 ? _a : ref.y), bed.y, bed.y + bed.h - 1);
        const col = clamp(Math.round((_b = clickedCell === null || clickedCell === void 0 ? void 0 : clickedCell.x) !== null && _b !== void 0 ? _b : ref.x), bed.x, bed.x + bed.w - 1);
        const candidates = [
            { side: 'left', x: bed.x - 0.5, y: row },
            { side: 'right', x: bed.x + bed.w - 0.5, y: row },
            { side: 'top', x: col, y: bed.y - 0.5 },
            { side: 'bottom', x: col, y: bed.y + bed.h - 0.5 },
        ];
        candidates.sort((a, b) => Math.hypot(a.x - ref.x, a.y - ref.y) - Math.hypot(b.x - ref.x, b.y - ref.y));
        const best = candidates[0];
        return { x: best.x, y: best.y, connector: { kind: 'bed', bedId: bed.id, side: best.side } };
    }
    function handleGridMouseDown(x, y) {
        if (mode !== 'build')
            return;
        if (selectedBuildMaterial === 'barrel') {
            if (cellOccupied(x, y)) {
                addLog('Something is already there.');
                return;
            }
            if (inventory.rainBarrels < 1) {
                addLog('No rain barrels in inventory — buy one at the Plant Nursery.');
                return;
            }
            setInventory((inv) => ({ ...inv, rainBarrels: inv.rainBarrels - 1 }));
            barrelIdRef.current += 1;
            setBarrels((prev) => [...prev, { id: barrelIdRef.current, x, y, on: false }]);
            addLog('Placed a rain barrel. Touch it to turn the water on or off.');
            return;
        }
        if (selectedBuildMaterial === 'spigot') {
            if (cellOccupied(x, y)) {
                addLog('Something is already there.');
                return;
            }
            if (inventory.spigots < 1) {
                addLog('No spigots in inventory — buy one at the Plant Nursery.');
                return;
            }
            setInventory((inv) => ({ ...inv, spigots: inv.spigots - 1 }));
            spigotIdRef.current += 1;
            setSpigots((prev) => [...prev, { id: spigotIdRef.current, x, y, on: false }]);
            addLog('Placed a water spigot. Touch it to turn the water on or off.');
            return;
        }
        if (selectedBuildMaterial === 'pvc') {
            const clickedBed = findBedAtCell(x, y);
            const clickedSource = findWaterSourceAtCell(x, y);
            setPipeWaypoints((prev) => {
                const from = prev.length > 0 ? prev[prev.length - 1] : { x, y };
                if (clickedBed)
                    return [...prev, makeBedEdgeConnector(clickedBed, from, { x, y })];
                if (clickedSource)
                    return [...prev, { x, y, connector: { kind: 'source', sourceType: clickedSource.kind, sourceId: clickedSource.id } }];
                return [...prev, { x, y }];
            });
            if (clickedBed)
                addLog('PVC snapped to the outside edge of the plant bed. Click Finish Run to lock in the bed connector.');
            else if (clickedSource)
                addLog(`PVC connected to the ${clickedSource.kind === 'barrel' ? 'rain barrel' : 'spigot'}. Continue the run or click Finish Run.`);
            else
                addLog(pipeWaypoints.length === 0 ? 'Pipe start set — click to add turns. Touch an existing PVC run to join its watering network, or click a bed to snap to its edge.' : 'Turn added — touch existing PVC to join that network, click a bed to snap a connector, or Finish Run.');
            return;
        }
        if (typeof selectedBuildMaterial === 'string' && selectedBuildMaterial.startsWith('greenhouse:')) {
            placeGreenhouse(selectedBuildMaterial.split(':')[1], x, y);
            return;
        }
        if (typeof selectedBuildMaterial === 'string' && selectedBuildMaterial.startsWith('pond:')) {
            placePond(selectedBuildMaterial.split(':')[1], x, y);
            return;
        }
        if (typeof selectedBuildMaterial === 'string' && selectedBuildMaterial.startsWith('trellis:')) {
            placeTrellis(selectedBuildMaterial.split(':')[1], x, y);
            return;
        }
        if (typeof selectedBuildMaterial === 'string' && selectedBuildMaterial.startsWith('treecontainer:')) {
            placeTreeContainer(selectedBuildMaterial.split(':')[1], x, y);
            return;
        }
        if (selectedBuildMaterial === 'protective-net') {
            placeProtectiveNet(x, y);
            return;
        }
        if (typeof selectedBuildMaterial === 'string' && selectedBuildMaterial.startsWith('path:')) {
            placePath(selectedBuildMaterial.split(':')[1], x, y);
            return;
        }
        if (typeof selectedBuildMaterial === 'string' && selectedBuildMaterial.startsWith('bucket:')) {
            placePlanterBucket(selectedBuildMaterial.split(':')[1], x, y);
            return;
        }
        if (!['wood', 'aluminum', 'cement', 'sticks'].includes(selectedBuildMaterial)) {
            addLog('Select a building material before placing anything in the yard.');
            return;
        }
        setDragStart({ x, y });
        setDragCurrent({ x, y });
    }
    function finishPipeRun() {
        if (pipeWaypoints.length < 2) {
            addLog('Need at least a start and end point.');
            return;
        }
        const candidatePipe = { id: -1, type: 'pvc', points: pipeWaypoints, feet: pipeRunFeet(pipeWaypoints) };
        const joinsExisting = pipes.some((p) => pipeRunsTouch(candidatePipe, p));
        const touchesOwnSource = pipeWaypoints.some((pt) => pointTouchesSource(pt));
        const touchesOwnBed = pipeWaypoints.some((pt) => validBedConnector(pt) || pointTouchesBed(pt));
        const feetNeeded = candidatePipe.feet;
        const elbows = Math.max(0, pipeWaypoints.length - 2);
        const elbowCost = elbows * ELBOW_COST;
        if ((inventory.pvcFeet || 0) < feetNeeded) {
            addLog(`Not enough PVC pipe — need ${feetNeeded}ft, have ${inventory.pvcFeet || 0}ft. Buy more at the Plant Nursery.`);
            return;
        }
        if (cash < elbowCost) {
            addLog(`Not enough cash for ${elbows} elbow fitting${elbows === 1 ? '' : 's'} ($${elbowCost}).`);
            return;
        }
        setInventory((inv) => ({ ...inv, pvcFeet: inv.pvcFeet - feetNeeded }));
        if (elbowCost > 0)
            setCash((c) => c - elbowCost);
        pipeIdRef.current += 1;
        setPipes((prev) => [...prev, { id: pipeIdRef.current, type: 'pvc', points: pipeWaypoints, feet: feetNeeded }]);
        setPipeWaypoints([]);
        // Keep PVC selected while the player is building an irrigation network so branches
        // can be added without returning to the catalog after every completed run.
        setSelectedBuildMaterial('pvc');
        addLog(`Laid ${feetNeeded}ft of PVC${elbows > 0 ? ` with ${elbows} elbow${elbows === 1 ? '' : 's'} (${elbowCost})` : ''}.${joinsExisting ? ' Connected to an existing watering system.' : touchesOwnSource || touchesOwnBed ? ' New run started.' : ' Independent PVC run placed.'} PVC remains selected so you can keep laying additional runs.`);
    }
    function cancelPipeRun() {
        setPipeWaypoints([]);
        setSelectedBuildMaterial(null);
        addLog('PVC placement cancelled. Select PVC again when you are ready to lay a run.');
    }
    function handleGridMouseEnter(x, y) { if (mode === 'build' && dragStart && selectedBuildMaterial !== 'barrel' && selectedBuildMaterial !== 'spigot' && selectedBuildMaterial !== 'pvc')
        setDragCurrent({ x, y }); }
    function handleGridMouseUp() {
        if (mode !== 'build' || !['wood', 'aluminum', 'cement', 'sticks'].includes(selectedBuildMaterial) || !dragStart || !dragCurrent) {
            setDragStart(null);
            setDragCurrent(null);
            return;
        }
        const x0 = Math.min(dragStart.x, dragCurrent.x), x1 = Math.max(dragStart.x, dragCurrent.x);
        const y0 = Math.min(dragStart.y, dragCurrent.y), y1 = Math.max(dragStart.y, dragCurrent.y);
        const w = x1 - x0 + 1, h = y1 - y0 + 1;
        setDragStart(null);
        setDragCurrent(null);
        if (!rectFree(x0, y0, x1, y1)) {
            addLog('That footprint overlaps something already there.');
            return;
        }
        const rawSqFt = w * h;
        const hasHoe = inventory.tools.hoe > 0;
        const sqFtNeeded = hasHoe ? Math.max(1, Math.ceil(rawSqFt * (1 - TOOLS.find((t) => t.id === 'hoe').amount))) : rawSqFt;
        const MATERIAL_STOCK_KEYS = { wood: 'woodSqFt', aluminum: 'aluminumSqFt', cement: 'cementSqFt', sticks: 'sticksSqFt' };
        const MATERIAL_LABELS = { wood: 'wood', aluminum: 'aluminum', cement: 'cement block', sticks: 'sticks' };
        const stockKey = MATERIAL_STOCK_KEYS[selectedBuildMaterial] || 'woodSqFt';
        const stockLabel = MATERIAL_LABELS[selectedBuildMaterial] || 'wood';
        if (inventory[stockKey] < sqFtNeeded) {
            addLog(`Not enough ${stockLabel} — need ${sqFtNeeded} sq ft, have ${inventory[stockKey]}. Buy more at the Plant Nursery.`);
            return;
        }
        setInventory((inv) => ({ ...inv, [stockKey]: inv[stockKey] - sqFtNeeded }));
        bedIdRef.current += 1;
        setBeds((prev) => [...prev, { id: bedIdRef.current, x: x0, y: y0, w, h, material: selectedBuildMaterial, soilId: null, boosted: false, mulchId: null, plants: [] }]);
        addLog(`Built a ${w}'×${h}' ${stockLabel} bed using ${sqFtNeeded} sq ft of ${stockLabel}${hasHoe ? ' (hoe discount applied)' : ''}.`);
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
            if (b.id !== barrelId)
                return b;
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
            if (s.id !== spigotId)
                return s;
            const nowOn = !s.on;
            addLog(nowOn ? 'Spigot turned on.' : 'Spigot turned off.');
            return { ...s, on: nowOn };
        }));
    }
    function deletePipe(pipeId) {
        const pipe = pipes.find((p) => p.id === pipeId);
        if (!pipe)
            return;
        setPipes((prev) => prev.filter((p) => p.id !== pipeId));
        setInventory((inv) => ({ ...inv, pvcFeet: inv.pvcFeet + pipe.feet }));
        addLog(`Picked up ${pipe.feet}ft of PVC pipe — back in inventory to reuse. (Elbow fittings used are not refunded.)`);
    }
    function pointsTouch(a, b) {
        return a.x === b.x && a.y === b.y;
    }
    function pipeEndpoints(pipe) {
        return [pipe.points[0], pipe.points[pipe.points.length - 1]];
    }
    function pointOnPipeSegment(pt, a, b) {
        const eps = 0.001;
        const cross = (pt.x - a.x) * (b.y - a.y) - (pt.y - a.y) * (b.x - a.x);
        if (Math.abs(cross) > eps)
            return false;
        return pt.x >= Math.min(a.x, b.x) - eps && pt.x <= Math.max(a.x, b.x) + eps &&
            pt.y >= Math.min(a.y, b.y) - eps && pt.y <= Math.max(a.y, b.y) + eps;
    }
    function pipeSegments(pipe) {
        const pts = pipe.points || [];
        if (pts.length < 2)
            return [];
        const out = [];
        for (let i = 1; i < pts.length; i++)
            out.push([pts[i - 1], pts[i]]);
        return out;
    }
    function pipeRunsTouch(aPipe, bPipe) {
        const aSegs = pipeSegments(aPipe);
        const bSegs = pipeSegments(bPipe);
        // Any endpoint landing anywhere on another run joins the systems.
        for (const [a0, a1] of aSegs) {
            for (const [b0, b1] of bSegs) {
                if (pointOnPipeSegment(a0, b0, b1) || pointOnPipeSegment(a1, b0, b1) ||
                    pointOnPipeSegment(b0, a0, a1) || pointOnPipeSegment(b1, a0, a1))
                    return true;
                // Also count a true segment crossing as a plumbing junction.
                const orient = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
                const o1 = orient(a0, a1, b0), o2 = orient(a0, a1, b1);
                const o3 = orient(b0, b1, a0), o4 = orient(b0, b1, a1);
                if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
                    ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0)))
                    return true;
            }
        }
        return false;
    }
    // Touching PVC belongs to one watering network. A new run may join the end,
    // side, or crossing of an existing run and inherits that network's source/bed connections.
    function pipeNetwork(pipe) {
        const visited = new Set([pipe.id]);
        const queue = [pipe];
        while (queue.length > 0) {
            const current = queue.pop();
            for (const other of pipes) {
                if (visited.has(other.id))
                    continue;
                if (pipeRunsTouch(current, other)) {
                    visited.add(other.id);
                    queue.push(other);
                }
            }
        }
        return pipes.filter((p) => visited.has(p.id));
    }
    function pointTouchesBed(point) {
        return beds.some((bed) => point.x >= bed.x && point.x < bed.x + bed.w && point.y >= bed.y && point.y < bed.y + bed.h);
    }
    function validBedConnector(point) {
        var _a;
        if (((_a = point === null || point === void 0 ? void 0 : point.connector) === null || _a === void 0 ? void 0 : _a.kind) !== 'bed')
            return false;
        return beds.some((bed) => bed.id === point.connector.bedId);
    }
    function pointTouchesSource(point) {
        var _a;
        if (((_a = point === null || point === void 0 ? void 0 : point.connector) === null || _a === void 0 ? void 0 : _a.kind) === 'source') {
            if (point.connector.sourceType === 'barrel')
                return barrels.some((b) => b.id === point.connector.sourceId);
            if (point.connector.sourceType === 'spigot')
                return spigots.some((s) => s.id === point.connector.sourceId);
        }
        return barrels.some((b) => pointsTouch(point, b)) || spigots.some((s) => pointsTouch(point, s));
    }
    function pointTouchesOnSource(point) {
        var _a;
        if (((_a = point === null || point === void 0 ? void 0 : point.connector) === null || _a === void 0 ? void 0 : _a.kind) === 'source') {
            if (point.connector.sourceType === 'barrel')
                return barrels.some((b) => b.id === point.connector.sourceId && b.on);
            if (point.connector.sourceType === 'spigot')
                return spigots.some((s) => s.id === point.connector.sourceId && s.on);
        }
        return barrels.some((b) => b.on && pointsTouch(point, b)) || spigots.some((s) => s.on && pointsTouch(point, s));
    }
    function pvcConnectionStatus(pipe) {
        const network = pipeNetwork(pipe);
        const networkPoints = network.flatMap((p) => p.points || []);
        const touchesSource = networkPoints.some((pt) => pointTouchesSource(pt));
        const explicitBedConnection = networkPoints.some((pt) => validBedConnector(pt));
        // Preserve old tester saves that ended a PVC run inside a bed square.
        const legacyBedConnection = network.some((p) => pipeEndpoints(p).some((pt) => pointTouchesBed(pt)));
        const touchesBed = explicitBedConnection || legacyBedConnection;
        const sourceOn = networkPoints.some((pt) => pointTouchesOnSource(pt));
        return { touchesSource, touchesBed, sourceOn, complete: touchesSource && touchesBed, explicitBedConnection };
    }
    function pvcIsConnected(pipe) {
        return pvcConnectionStatus(pipe).complete;
    }
    function pvcNetworkHasOnSource(pipe) {
        const status = pvcConnectionStatus(pipe);
        return status.complete && status.sourceOn;
    }
    const selectedPlant = PLANTS.find((p) => p.id === selectedPlantId) || null;
    function canUseSource(plant, source) {
        if (!plant)
            return false;
        if (source === 'seed')
            return (inventory.seeds[plant.id] || 0) > 0;
        if (source === 'plant')
            return (inventory.livePlants[plant.id] || 0) > 0;
        return false;
    }
    function plantAt(kind, targetId, sx, sy) {
        if (!selectedPlant) {
            addLog('Pick a seed or plant first, then click squares.');
            return;
        }
        if ((selectedPlant === null || selectedPlant === void 0 ? void 0 : selectedPlant.movableTree) && (zoneBaseNumber(zone) < (selectedPlant.minZone || 1) || zoneBaseNumber(zone) > (selectedPlant.maxZone || 13))) {
            addLog(`${selectedPlant.name} is too cold-sensitive for permanent outdoor planting in ${zone.name}. Grow it in a movable tree container and bring it into a greenhouse before cold weather.`);
            return;
        }
        if (!canGrowInZone(selectedPlant, zone)) {
            addLog(`${selectedPlant.name} won't survive in ${zone.name}.`);
            return;
        }
        if (selectedPlant.frostTender && !isPastLastFrost(zone, season, day)) {
            addLog(`${selectedPlant.name} is frost-tender — wait until after the last frost (day ${zone.lastFrostDay} of Spring in ${zone.name}) to plant it outdoors.`);
            return;
        }
        if (kind === 'bed') {
            const bed = beds.find((b) => b.id === targetId);
            if (!bed || !bed.soilId) {
                addLog('Add soil to this bed first — pick a soil in the sidebar, then click the bed.');
                return;
            }
        }
        else {
            // Open-ground planting uses the yard's existing native soil. Raised beds still
            // require purchased soil, but direct sowing/live planting in the yard should
            // not require the player to buy and add a separate bag of dirt first.
            const obstacle = groundObstacles.find((o) => o.gx === sx && o.gy === sy);
            if (obstacle) {
                addLog(obstacle.kind === 'tree' ? 'There is already a permanent tree here — choose another open square.' : 'Clear this rock before planting here.');
                return;
            }
            const hasPreparedGround = groundTilledTiles.some((t) => t.gx === sx && t.gy === sy);
            const hasNativeSoilTile = groundSoilTiles.some((t) => t.gx === sx && t.gy === sy);
            const treeOrBush = isTreeOrBush(selectedPlant);
            const hasHoe = (inventory.tools.hoe || 0) > 0;
            const hasShovel = (inventory.tools.shovel || 0) > 0;
            const hasTiller = (inventory.tools.tiller || 0) > 0;
            const liveTreeOrBush = treeOrBush && selectedSource === 'plant';
            const canPrepare = liveTreeOrBush ? true : treeOrBush ? (hasShovel || hasTiller) : (hasHoe || hasShovel || hasTiller);
            if (!hasPreparedGround && !canPrepare) {
                addLog(treeOrBush
                    ? `You need a Shovel or Tiller to start ${selectedPlant.name} from seed in open ground.`
                    : `You need a Hoe, Shovel, or Tiller to prepare open ground before direct-sowing ${selectedPlant.name}.`);
                return;
            }
            if (!hasPreparedGround) {
                const tool = liveTreeOrBush
                    ? (hasTiller ? 'tiller' : hasShovel ? 'shovel' : 'nursery-planting')
                    : treeOrBush
                        ? (hasTiller ? 'tiller' : 'shovel')
                        : (hasTiller ? 'tiller' : hasShovel ? 'shovel' : 'hoe');
                setGroundTilledTiles((prev) => prev.some((t) => t.gx === sx && t.gy === sy) ? prev : [...prev, { gx: sx, gy: sy, tool }]);
                addLog(liveTreeOrBush && tool === 'nursery-planting'
                    ? `Prepared a planting hole for ${selectedPlant.name}.`
                    : treeOrBush
                        ? `Dug a planting hole with your ${tool}.`
                        : `Prepared the native ground with your ${tool}.`);
            }
            if (!hasNativeSoilTile) {
                setGroundSoilTiles((prev) => prev.some((t) => t.gx === sx && t.gy === sy) ? prev : [...prev, {
                    gx: sx, gy: sy, soilId: 'native', boosted: false, ph: 6.5,
                    nutrientBonus: 0, organicBonus: 0, aerationBonus: 0, biologyBonus: 0,
                }]);
            }
        }
        if (!canUseSource(selectedPlant, selectedSource)) {
            addLog(`You don't have any ${selectedSource === 'seed' ? 'seed packets' : 'live plants'} for ${selectedPlant.name}. Buy some from the Plant Nursery.`);
            return;
        }
        const newPlant = {
            sx, sy, ...selectedPlant,
            daysToMature: daysToMatureFrom(selectedPlant, selectedSource),
            health: 100, age: 0, wateredToday: true, dead: false, harvested: false,
        };
        if (selectedSource === 'seed')
            removeSeed(selectedPlant.id, 1);
        else
            removeLivePlant(selectedPlant.id, 1);
        if (kind === 'bed') {
            setBeds((prev) => prev.map((b) => (b.id === targetId ? { ...b, plants: [...b.plants, newPlant] } : b)));
        }
        else {
            setGroundPlants((prev) => [...prev, { ...newPlant, gx: sx, gy: sy }]);
        }
        addLog(`Planted ${selectedPlant.name} (${selectedSource === 'seed' ? 'seed' : 'live plant'}).`);
    }
    function fillBedSoil(bedId, soilId, useBoosted) {
        const soil = SOILS.find((s) => s.id === soilId);
        const stock = useBoosted ? inventory.boostedSoils[soilId] : inventory.soils[soilId];
        if (stock < 1) {
            addLog(`No ${useBoosted ? 'boosted ' : ''}${soil.name} in inventory.`);
            return;
        }
        if (useBoosted)
            setInventory((inv) => ({ ...inv, boostedSoils: { ...inv.boostedSoils, [soilId]: inv.boostedSoils[soilId] - 1 } }));
        else
            setInventory((inv) => ({ ...inv, soils: { ...inv.soils, [soilId]: inv.soils[soilId] - 1 } }));
        setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, soilId, boosted: !!useBoosted, ph: 6.5, nutrientBonus: 0, organicBonus: 0, aerationBonus: 0, biologyBonus: 0 } : b)));
        addLog(`Added ${useBoosted ? 'boosted ' : ''}${soil.name} to the bed.`);
    }
    function tillGroundSquare(gx, gy) {
        const obstacle = groundObstacles.find((o) => o.gx === gx && o.gy === gy);
        if (obstacle) {
            addLog(obstacle.kind === 'tree' ? "There's a tree here — build around it instead." : "There's a rock here — clear it first (needs a Shovel or Tiller).");
            return;
        }
        if (groundTilledTiles.some((t) => t.gx === gx && t.gy === gy)) {
            addLog('This square is already tilled.');
            return;
        }
        const hasHoe = inventory.tools.hoe > 0, hasShovel = inventory.tools.shovel > 0, hasTiller = inventory.tools.tiller > 0;
        if (!hasHoe && !hasShovel && !hasTiller) {
            addLog('You need a Tiller, Shovel, or Hoe to till open ground before planting. Buy one at the Plant Nursery.');
            return;
        }
        const tool = hasTiller ? 'tiller' : hasShovel ? 'shovel' : 'hoe';
        setGroundTilledTiles((prev) => [...prev, { gx, gy, tool }]);
        addLog(`Tilled the ground with your ${tool} — ready for soil.`);
    }
    function clearRock(obstacleId) {
        const obstacle = groundObstacles.find((o) => o.id === obstacleId);
        if (!obstacle || obstacle.kind !== 'rock')
            return;
        const hasShovel = inventory.tools.shovel > 0, hasTiller = inventory.tools.tiller > 0;
        if (!hasShovel && !hasTiller) {
            addLog('Need a Shovel or Tiller to clear this rock. Buy one at the Plant Nursery.');
            return;
        }
        setGroundObstacles((prev) => prev.filter((o) => o.id !== obstacleId));
        addLog('Cleared the rock — that square is ready to work now.');
    }
    function fillGroundSoil(gx, gy, soilId, useBoosted) {
        if (!groundTilledTiles.some((t) => t.gx === gx && t.gy === gy)) {
            addLog('Till this ground square first before adding soil.');
            return;
        }
        if (groundSoilTiles.some((t) => t.gx === gx && t.gy === gy)) {
            addLog('This ground square already has soil.');
            return;
        }
        const soil = SOILS.find((s) => s.id === soilId);
        if (!soil.groundOk) {
            addLog(`${soil.name} isn't suited for open ground — use Compost or Native Soil.`);
            return;
        }
        const stock = useBoosted ? inventory.boostedSoils[soilId] : inventory.soils[soilId];
        if (stock < 1) {
            addLog(`No ${useBoosted ? 'boosted ' : ''}${soil.name} in inventory.`);
            return;
        }
        const hasShovel = inventory.tools.shovel > 0;
        const freeFill = hasShovel && Math.random() < TOOLS.find((t) => t.id === 'shovel').amount;
        if (!freeFill) {
            if (useBoosted)
                setInventory((inv) => ({ ...inv, boostedSoils: { ...inv.boostedSoils, [soilId]: inv.boostedSoils[soilId] - 1 } }));
            else
                setInventory((inv) => ({ ...inv, soils: { ...inv.soils, [soilId]: inv.soils[soilId] - 1 } }));
        }
        setGroundSoilTiles((prev) => [...prev, { gx, gy, soilId, boosted: !!useBoosted, ph: 6.5, nutrientBonus: 0, organicBonus: 0, aerationBonus: 0, biologyBonus: 0 }]);
        addLog(`Added ${useBoosted ? 'boosted ' : ''}${soil.name} to the ground${freeFill ? ' (shovel saved you a bag!)' : ''}.`);
    }
    function applyPHAmendment(kind, bedId, gx, gy, additiveId) {
        var _a;
        if ((inventory.additives[additiveId] || 0) < 1) {
            addLog(`No ${(_a = ADDITIVES.find((a) => a.id === additiveId)) === null || _a === void 0 ? void 0 : _a.name} in inventory.`);
            return;
        }
        const shift = additiveId === 'woodash' ? 0.4 : additiveId === 'acidifier' ? -0.4 : 0;
        if (shift === 0)
            return;
        setInventory((inv) => ({ ...inv, additives: { ...inv.additives, [additiveId]: inv.additives[additiveId] - 1 } }));
        if (kind === 'bed') {
            const bed = beds.find((b) => b.id === bedId);
            if (!bed || !bed.soilId) {
                addLog('Add soil to this bed first.');
                return;
            }
            const newPh = Math.max(4.0, Math.min(8.5, (bed.ph || 6.5) + shift));
            setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, ph: newPh } : b)));
            addLog(`Worked ${additiveId === 'woodash' ? 'Wood Ash' : 'Soil Acidifier'} into the bed — pH now ${newPh.toFixed(1)}.`);
        }
        else {
            const tile = groundSoilTiles.find((t) => t.gx === gx && t.gy === gy);
            if (!tile) {
                addLog('Add soil to this ground square first.');
                return;
            }
            const newPh = Math.max(4.0, Math.min(8.5, (tile.ph || 6.5) + shift));
            setGroundSoilTiles((prev) => prev.map((t) => (t.gx === gx && t.gy === gy ? { ...t, ph: newPh } : t)));
            addLog(`Worked ${additiveId === 'woodash' ? 'Wood Ash' : 'Soil Acidifier'} into the ground — pH now ${newPh.toFixed(1)}.`);
        }
    }
    function fillBedMulch(bedId, mulchId) {
        const bed = beds.find((b) => b.id === bedId);
        if (!bed || !bed.soilId) {
            addLog('Add soil to this bed before mulching it.');
            return;
        }
        const mulch = MULCH_TYPES.find((m) => m.id === mulchId);
        if ((inventory.mulch[mulchId] || 0) < 1) {
            addLog(`No ${mulch.name} in inventory.`);
            return;
        }
        setInventory((inv) => { var _a; return ({ ...inv, mulch: { ...inv.mulch, [mulchId]: Math.max(0, (((_a = inv.mulch) === null || _a === void 0 ? void 0 : _a[mulchId]) || 0) - 1) } }); });
        setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, mulchId } : b)));
        addLog(`Spread ${mulch.name} over the bed — cuts down weeds and helps hold moisture.`);
    }
    function removeBedMulch(bedId) {
        setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, mulchId: null } : b)));
        addLog('Removed the mulch from the bed.');
    }
    function fillGroundMulch(gx, gy, mulchId) {
        const tile = groundSoilTiles.find((t) => t.gx === gx && t.gy === gy);
        if (!tile) {
            addLog('Add soil to this ground square before mulching it.');
            return;
        }
        if (groundMulchTiles.some((t) => t.gx === gx && t.gy === gy)) {
            addLog('This square already has mulch.');
            return;
        }
        const mulch = MULCH_TYPES.find((m) => m.id === mulchId);
        if ((inventory.mulch[mulchId] || 0) < 1) {
            addLog(`No ${mulch.name} in inventory.`);
            return;
        }
        setInventory((inv) => { var _a; return ({ ...inv, mulch: { ...inv.mulch, [mulchId]: Math.max(0, (((_a = inv.mulch) === null || _a === void 0 ? void 0 : _a[mulchId]) || 0) - 1) } }); });
        setGroundMulchTiles((prev) => [...prev, { gx, gy, mulchId }]);
        addLog(`Spread ${mulch.name} on that square — cuts down weeds and helps hold moisture.`);
    }
    function removeGroundMulch(gx, gy) {
        setGroundMulchTiles((prev) => prev.filter((t) => !(t.gx === gx && t.gy === gy)));
        addLog('Removed the mulch from that square.');
    }
    function removeWeed(weedId) {
        var _a;
        const weed = weeds.find((w) => w.id === weedId);
        if (!weed)
            return;
        const handRake = ((_a = inventory.tools) === null || _a === void 0 ? void 0 : _a.handrake) > 0;
        const targets = handRake ? weeds.filter((w) => {
            if (w.id === weedId)
                return true;
            if (w.kind !== weed.kind || w.bedId !== weed.bedId)
                return false;
            return Math.abs(w.x - weed.x) + Math.abs(w.y - weed.y) === 1;
        }).slice(0, 3) : [weed];
        const ids = new Set(targets.map((w) => w.id));
        let compostable = 0, separate = 0;
        targets.forEach((w) => { if (getWeedInfo(w).compostable)
            compostable += 1;
        else
            separate += 1; });
        setWeeds((prev) => prev.filter((w) => !ids.has(w.id)));
        if (compostable)
            setInventory((inv) => ({ ...inv, deadMatter: (inv.deadMatter || 0) + compostable }));
        addLog(handRake && targets.length > 1 ? `🪮 Hand rake cleared ${targets.length} nearby weeds${compostable ? `; ${compostable} went to compost greens` : ''}${separate ? `; ${separate} must be disposed separately` : ''}.` : (getWeedInfo(weed).compostable ? `Pulled ${getWeedInfo(weed).name} — added to the compost greens.` : `Pulled ${getWeedInfo(weed).name} — dispose of it separately; do not add it to the compost pile.`));
    }


    function buildControlledBurnPreview(gx, gy) {
        const cells = [];
        for (let y = Math.max(0, gy - 1); y <= Math.min(GRID_ROWS - 1, gy + 1); y++)
            for (let x = Math.max(0, gx - 1); x <= Math.min(GRID_COLS - 1, gx + 1); x++)
                cells.push({ x, y });
        const ring = [];
        for (let y = Math.max(0, gy - 2); y <= Math.min(GRID_ROWS - 1, gy + 2); y++)
            for (let x = Math.max(0, gx - 2); x <= Math.min(GRID_COLS - 1, gx + 2); x++)
                if (!cells.some((c) => c.x === x && c.y === y))
                    ring.push({ x, y });
        const inPatch = (x, y) => cells.some((c) => c.x === x && c.y === y);
        const tooClose = greenhouses.some((g) => cells.some((c) => c.x >= g.x - 1 && c.x <= g.x + g.w && c.y >= g.y - 1 && c.y <= g.y + g.h))
            || ponds.some((p) => cells.some((c) => c.x >= p.x - 1 && c.x <= p.x + p.w && c.y >= p.y - 1 && c.y <= p.y + p.h))
            || beds.some((b) => cells.some((c) => c.x >= b.x - 1 && c.x <= b.x + b.w && c.y >= b.y - 1 && c.y <= b.y + b.h))
            || treeContainers.some((c) => c.plant && cells.some((z) => Math.abs(z.x - c.x) <= 1 && Math.abs(z.y - c.y) <= 1))
            || groundPlants.some((p) => isTreeOrBush(p) && cells.some((z) => Math.abs(z.x - p.gx) <= 1 && Math.abs(z.y - p.gy) <= 1));
        const liveFood = groundPlants.find((p) => inPatch(p.gx, p.gy) && !p.dead && !p.harvested && !p.coverCrop);
        const burnPlants = groundPlants.filter((p) => inPatch(p.gx, p.gy) && (p.dead || p.harvested || p.coverCrop));
        const burnWeeds = weeds.filter((w) => w.kind === 'ground' && inPatch(w.x, w.y));
        const residueCount = burnPlants.filter((p) => p.dead || p.harvested).length;
        const coverCount = burnPlants.filter((p) => p.coverCrop).length;
        const weedCount = burnWeeds.length;
        let pileMoisture = 24 + coverCount * 8 + weedCount * 2 - residueCount * 2;
        if (todayWeather === 'rain')
            pileMoisture += 22;
        if (todayWeather === 'freeze')
            pileMoisture += 6;
        pileMoisture = Math.max(8, Math.min(80, Math.round(pileMoisture)));
        return { gx, gy, cells, ring, tooClose, liveFood, burnPlants, burnWeeds, pileMoisture };
    }
    function burnSpreadChance(pileMoisture, perimeterWetPct) {
        const dryness = 100 - pileMoisture;
        const dryLine = 100 - perimeterWetPct;
        return Math.round(Math.max(3, Math.min(90, dryness * 0.45 + dryLine * 0.35 - 12)));
    }
    function burnSpreadLabel(chance) {
        if (chance >= 55)
            return 'High';
        if (chance >= 26)
            return 'Moderate';
        return 'Low';
    }
    function wetControlledBurnRing() {
        var _a;
        if (!activeBurn || activeBurn.ignited)
            return;
        if (!((((_a = inventory.waterTools) === null || _a === void 0 ? void 0 : _a.can) || 0) > 0 || spigots.length > 0 || barrels.length > 0)) {
            addLog('You need a watering can, spigot, or rain barrel available to wet the control line.');
            return;
        }
        const nextWetPct = Math.min(100, (activeBurn.perimeterWetPct || 0) + 25);
        const nextChance = burnSpreadChance(activeBurn.pileMoisture, nextWetPct);
        setActiveBurn((prev) => prev ? { ...prev, perimeterWetPct: nextWetPct, spreadChance: nextChance, spreadLabel: burnSpreadLabel(nextChance) } : prev);
        addLog(`💧 Wetted the safety ring around the burn patch (${nextWetPct}% prepared). Spread risk now ${burnSpreadLabel(nextChance).toLowerCase()} (${nextChance}%).`);
    }
    function cancelControlledBurnPreview() {
        if (!activeBurn || activeBurn.ignited)
            return;
        if (burnTimerRef.current)
            clearInterval(burnTimerRef.current);
        burnTimerRef.current = null;
        setActiveBurn(null);
    }
    function igniteControlledBurn() {
        if (!activeBurn || activeBurn.ignited)
            return;
        const spreadChance = burnSpreadChance(activeBurn.pileMoisture, activeBurn.perimeterWetPct || 0);
        const spreadTriggered = Math.random() * 100 < spreadChance;
        const spreadCells = spreadTriggered
            ? activeBurn.ring.filter((_, idx) => idx % 2 === 0).slice(0, Math.max(1, Math.min(4, Math.round(spreadChance / 22))))
            : [];
        const fireCells = [...activeBurn.cells];
        spreadCells.forEach((c) => {
            if (!cellsContain(fireCells, c.x, c.y))
                fireCells.push(c);
        });
        const killedPlants = groundPlants.filter((p) => cellsContain(fireCells, p.gx, p.gy));
        const livePlantsLost = killedPlants.filter((p) => !p.dead && !p.harvested && !p.coverCrop).length;
        const killedWeeds = weeds.filter((w) => w.kind === 'ground' && cellsContain(fireCells, w.x, w.y));
        setGroundPlants((prev) => prev.filter((p) => !cellsContain(fireCells, p.gx, p.gy)));
        setWeeds((prev) => prev.filter((w) => !(w.kind === 'ground' && cellsContain(fireCells, w.x, w.y))));
        setGroundMulchTiles((prev) => prev.filter((m) => !cellsContain(fireCells, m.gx, m.gy) || m.mulchId === 'rocks'));
        setPestAlerts((prev) => prev.filter((a) => !((a.location === null || a.location === void 0 ? void 0 : a.location.kind) === 'ground' && cellsContain(fireCells, a.location.x, a.location.y))));
        const burnState = {
            ...activeBurn,
            ignited: true,
            awaitingExtinguish: false,
            progressPct: 0,
            spreadChance,
            spreadLabel: burnSpreadLabel(spreadChance),
            spreadTriggered,
            spreadCells,
            fireCells,
            killedPlantCount: killedPlants.length,
            killedWeedCount: killedWeeds.length,
        };
        setActiveBurn(burnState);
        addLog(`🔥 Controlled burn started. Pile moisture ${burnState.pileMoisture}%. Safety ring watered ${burnState.perimeterWetPct || 0}%. Spread risk ${burnState.spreadLabel.toLowerCase()} (${spreadChance}%).`);
        if (livePlantsLost > 0)
            addLog(`⚠️ The spreading fire killed ${livePlantsLost} live plant${livePlantsLost === 1 ? '' : 's'} outside the planned patch.`);
        if (burnTimerRef.current)
            clearInterval(burnTimerRef.current);
        burnTimerRef.current = setInterval(() => {
            setActiveBurn((prev) => {
                if (!prev || !prev.ignited)
                    return prev;
                const nextPct = Math.min(100, (prev.progressPct || 0) + 20);
                if (nextPct >= 100) {
                    if (burnTimerRef.current)
                        clearInterval(burnTimerRef.current);
                    burnTimerRef.current = null;
                    return { ...prev, progressPct: 100, awaitingExtinguish: true };
                }
                return { ...prev, progressPct: nextPct };
            });
        }, 450);
    }
    function extinguishControlledBurn() {
        var _a;
        if (!activeBurn || !activeBurn.ignited || (activeBurn.progressPct || 0) < 100)
            return;
        const hasWater = ((((_a = inventory.waterTools) === null || _a === void 0 ? void 0 : _a.can) || 0) > 0 || spigots.length > 0 || barrels.length > 0);
        if (!hasWater) {
            addLog('The fire is fully burned but still active — you need water to extinguish it.');
            return;
        }
        const fireCells = activeBurn.fireCells || [...activeBurn.cells, ...(activeBurn.spreadCells || [])];
        setGroundPlants((prev) => prev.filter((p) => !cellsContain(fireCells, p.gx, p.gy)));
        setWeeds((prev) => prev.filter((w) => !(w.kind === 'ground' && cellsContain(fireCells, w.x, w.y))));
        setPestAlerts((prev) => prev.filter((a) => !((a.location === null || a.location === void 0 ? void 0 : a.location.kind) === 'ground' && cellsContain(fireCells, a.location.x, a.location.y))));
        setGroundSoilTiles((prev) => prev.map((t) => cellsContain(fireCells, t.gx, t.gy)
            ? { ...t, nutrientBonus: Math.min(35, (t.nutrientBonus || 0) + 4), organicBonus: Math.max(0, (t.organicBonus || 0) - 1), biologyBonus: Math.max(0, (t.biologyBonus || 0) - 3) }
            : t));
        burnedAreaIdRef.current += 1;
        const debrisUnits = Math.max(1, Math.min(4, Math.ceil(((activeBurn.killedPlantCount || activeBurn.burnPlants.length) + (activeBurn.killedWeedCount || activeBurn.burnWeeds.length) + (activeBurn.spreadCells || []).length) / 3)));
        const newArea = {
            id: burnedAreaIdRef.current,
            cells: fireCells.map((c) => ({ x: c.x, y: c.y })),
            daysRemaining: BURN_RECOVERY_DAYS,
            debrisUnits,
            debrisCollected: false,
        };
        setBurnedAreas((prev) => [...prev, newArea]);
        setActiveBeneficials((prev) => prev.map((ab) => ab.bugId === 'earthworms' ? { ...ab, daysLeft: Math.max(0, ab.daysLeft - 1) } : ab).filter((ab) => ab.daysLeft > 0));
        setActiveBurn(null);
        addLog(`💧 Fire extinguished. The charred footprint will resist weeds and pest outbreaks for about two in-game months (${BURN_RECOVERY_DAYS} game days).`);
        addLog(`🪵 ${debrisUnits} charred-debris unit${debrisUnits === 1 ? ' is' : 's are'} available to collect for a mineral-rich compost boost.`);
    }
    function collectBurnDebris(areaId) {
        const area = burnedAreas.find((a) => a.id === areaId);
        if (!area || area.debrisCollected || (area.debrisUnits || 0) < 1)
            return;
        const units = area.debrisUnits || 0;
        setInventory((inv) => ({ ...inv, burnDebris: (inv.burnDebris || 0) + units }));
        setBurnedAreas((prev) => prev.map((a) => a.id === areaId ? { ...a, debrisCollected: true } : a));
        addLog(`🪵 Collected ${units} charred-debris unit${units === 1 ? '' : 's'}. A small amount can be mixed into a compost batch for extra mineral value.`);
    }
    function controlledBurnAt(gx, gy) {
        var _a, _b;
        if (activeBurn && activeBurn.ignited) {
            addLog(activeBurn.awaitingExtinguish ? 'That fire has reached 100% — extinguish it with water before starting another burn.' : 'A controlled burn is already in progress — wait for it to reach 100%.');
            return;
        }
        if ((((_a = inventory.tools) === null || _a === void 0 ? void 0 : _a.handrake) || 0) < 1) {
            addLog('Controlled burn prep requires a Hand Rake in your tool inventory.');
            return;
        }
        const hasWaterBackup = (((_b = inventory.waterTools) === null || _b === void 0 ? void 0 : _b.can) || 0) > 0 || spigots.length > 0 || barrels.length > 0;
        if (!hasWaterBackup) {
            addLog('Controlled burn action is locked until you own/place a water source for safety backup.');
            return;
        }
        if (todayWeather === 'heatwave') {
            addLog('Controlled burning is unavailable during a heat wave.');
            return;
        }
        const preview = buildControlledBurnPreview(gx, gy);
        if (preview.tooClose) {
            addLog('That patch is too close to a greenhouse, pond, or container tree for the controlled-burn action.');
            return;
        }
        if (preview.liveFood) {
            addLog(`Move or harvest ${preview.liveFood.name} first. Controlled burns only target weeds, dead residue, and cover crops in the planned patch.`);
            return;
        }
        if (!preview.burnPlants.length && !preview.burnWeeds.length) {
            addLog('There is not enough managed vegetation/residue in this patch to use the controlled-burn action.');
            return;
        }
        const spreadChance = burnSpreadChance(preview.pileMoisture, 0);
        setActiveBurn({ ...preview, perimeterWetPct: 0, progressPct: 0, ignited: false, awaitingExtinguish: false, spreadChance, spreadLabel: burnSpreadLabel(spreadChance), spreadCells: [], fireCells: preview.cells });
        addLog(`🔥 Controlled burn patch selected. Fuel moisture ${preview.pileMoisture}%. Wet the safety ring, then ignite when the spread risk looks acceptable.`);
    }
    function getBedSquare(bed, sx, sy) { return bed.plants.find((p) => p.sx === sx && p.sy === sy) || null; }
    function getGroundSquare(gx, gy) { return groundPlants.find((p) => p.gx === gx && p.gy === gy) || null; }
    function maintainBedVine(bedId, sx, sy) {
        const bed = beds.find((b) => b.id === bedId);
        const plant = bed ? getBedSquare(bed, sx, sy) : null;
        if (!plant || !isViningPlant(plant) || plant.dead || plant.harvested)
            return;
        setBeds((prev) => prev.map((b) => b.id !== bedId ? b : { ...b, plants: b.plants.map((p) => (p.sx === sx && p.sy === sy) ? { ...p, vineSprawl: 0 } : p) }));
        addLog(`✂️ Trained and tidied ${plant.name}. The vine is back under control.`);
    }
    function maintainGroundVine(gx, gy) {
        const plant = getGroundSquare(gx, gy);
        if (!plant || !isViningPlant(plant) || plant.dead || plant.harvested)
            return;
        setGroundPlants((prev) => prev.map((p) => (p.gx === gx && p.gy === gy) ? { ...p, vineSprawl: 0 } : p));
        addLog(`✂️ Trained and tidied ${plant.name}. The vine is back under control.`);
    }
    function clickBedSquare(bedId, sx, sy) {
        const bed = beds.find((b) => b.id === bedId);
        const sq = getBedSquare(bed, sx, sy);
        if (pendingTransplant) {
            if (sq) {
                addLog('Square occupied.');
                return;
            }
            completeTransplant('bed', bedId, sx, sy);
            return;
        }
        if (mode === 'burn') {
            addLog('Controlled burning is limited to open-ground patches, not raised beds.');
            return;
        }
        if (mode === 'soil') {
            if (bed.soilId && bed.mulchId) {
                removeBedMulch(bedId);
                return;
            }
            if (bed.soilId && selectedFillMulch) {
                fillBedMulch(bedId, selectedFillMulch);
                return;
            }
            if (bed.soilId) {
                const inUse = bed.plants.some((p) => !p.dead && !p.harvested);
                if (inUse) {
                    addLog('This bed has plants growing in it — clear them before removing the soil.');
                    return;
                }
                setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, soilId: null, boosted: false } : b)));
                addLog('Removed the soil from the bed.');
                return;
            }
            if (!selectedFillSoil) {
                addLog('Pick a soil type in the sidebar first.');
                return;
            }
            fillBedSoil(bedId, selectedFillSoil, selectedFillBoosted);
            return;
        }
        if (sq && (sq.dead || sq.harvested)) {
            if (isMelonSalvageable(sq)) {
                harvestBedSquare(bedId, sx, sy);
                return;
            }
            if (sq.dead || sq.exhausted)
                setInventory((inv) => ({ ...inv, deadMatter: (inv.deadMatter || 0) + 1 }));
            setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, plants: b.plants.filter((p) => !(p.sx === sx && p.sy === sy)) } : b)));
            if (sq.dead)
                addLog(`Cleared the dead ${sq.name} — added to your compost matter.`);
            else if (sq.exhausted)
                addLog(`Removed spent ${sq.name} after ${sq.harvestCount || 4} harvests — the residue became compost greens. Replant for a new crop cycle.`);
            return;
        }
        if (sq && !sq.dead && !sq.harvested && sq.age >= sq.daysToMature) {
            harvestBedSquare(bedId, sx, sy);
            return;
        }
        if (!sq && mode === 'plant')
            plantAt('bed', bedId, sx, sy);
    }
    function clickGroundSquare(gx, gy) {
        const sq = getGroundSquare(gx, gy);
        if (activeBurn && activeBurn.ignited && cellsContain(activeBurn.fireCells || activeBurn.cells, gx, gy)) {
            addLog(activeBurn.awaitingExtinguish ? 'That square is still burning — extinguish the controlled burn with water first.' : 'That square is actively burning. Nothing can be planted or managed there until the fire is out.');
            return;
        }
        if (pendingTransplant) {
            if (sq) {
                addLog('Square occupied.');
                return;
            }
            completeTransplant('ground', null, gx, gy);
            return;
        }
        if (mode === 'burn') {
            controlledBurnAt(gx, gy);
            return;
        }
        if (mode === 'soil') {
            const tilled = groundTilledTiles.find((t) => t.gx === gx && t.gy === gy);
            const tile = groundSoilTiles.find((t) => t.gx === gx && t.gy === gy);
            const mulchTile = groundMulchTiles.find((t) => t.gx === gx && t.gy === gy);
            if (tile && mulchTile) {
                removeGroundMulch(gx, gy);
                return;
            }
            if (tile && selectedFillMulch) {
                fillGroundMulch(gx, gy, selectedFillMulch);
                return;
            }
            if (tile) {
                if (sq) {
                    addLog('This square has a plant growing in it — clear it before removing the soil.');
                    return;
                }
                setGroundSoilTiles((prev) => prev.filter((t) => !(t.gx === gx && t.gy === gy)));
                addLog('Removed the soil from that ground square.');
                return;
            }
            if (!tilled) {
                tillGroundSquare(gx, gy);
                return;
            }
            if (!selectedFillSoil) {
                addLog('Pick a soil type in the sidebar first.');
                return;
            }
            fillGroundSoil(gx, gy, selectedFillSoil, selectedFillBoosted);
            return;
        }
        if (sq && (sq.dead || sq.harvested)) {
            if (isMelonSalvageable(sq)) {
                harvestGroundSquare(gx, gy);
                return;
            }
            if (sq.dead || sq.exhausted)
                setInventory((inv) => ({ ...inv, deadMatter: (inv.deadMatter || 0) + 1 }));
            setGroundPlants((prev) => prev.filter((p) => !(p.gx === gx && p.gy === gy)));
            if (sq.dead)
                addLog(`Cleared the dead ${sq.name} — added to your compost matter.`);
            else if (sq.exhausted)
                addLog(`Removed spent ${sq.name} after ${sq.harvestCount || 4} harvests — the residue became compost greens. Replant for a new crop cycle.`);
            return;
        }
        if (sq && !sq.dead && !sq.harvested && sq.age >= sq.daysToMature) {
            harvestGroundSquare(gx, gy);
            return;
        }
        if (!sq && mode === 'plant')
            plantAt('ground', null, gx, gy);
    }
    function basketCapacity() {
        var _a;
        const size = BASKET_SIZES.find((b) => b.id === basketSizeId);
        const base = size ? size.slots : 0;
        const apronBonus = inventory.clothes.apron > 0 ? CLOTHES.find((c) => c.id === 'apron').amount : 0;
        const wheelbarrowBonus = ((_a = inventory.tools) === null || _a === void 0 ? void 0 : _a.wheelbarrow) > 0 ? TOOLS.find((t) => t.id === 'wheelbarrow').amount : 0;
        return base + apronBonus + wheelbarrowBonus;
    }
    function nextStateAfterHarvest(p) {
        if (p && p.repeatHarvest) {
            const nextCount = (p.harvestCount || 0) + 1;
            const perennial = p.growthForm === 'tree' || p.growthForm === 'shrub' || p.perennial;
            if (!perennial && nextCount >= 4)
                return { ...p, harvestCount: nextCount, harvested: true, exhausted: true, seedsCollected: false };
            return { ...p, age: Math.max(0, p.daysToMature - (p.regrowDays || 4)), harvested: false, seedsCollected: false, harvestCount: nextCount };
        }
        // A salvaged melon is a one-time harvest. Mark it consumed immediately so the
        // salvage badge disappears and repeated clicks cannot duplicate basket items.
        if (isMelonSalvageable(p))
            return { ...p, harvested: true, salvageDaysLeft: 0, salvageExpired: true };
        return { ...p, harvested: true };
    }
    function harvestBedSquare(bedId, sx, sy) {
        const bed = beds.find((b) => b.id === bedId);
        const sq = getBedSquare(bed, sx, sy);
        if (!sq)
            return;
        if (sq.id === 'comfrey') {
            setInventory((inv) => ({ ...inv, comfreyleaves: (inv.comfreyleaves || 0) + 3 }));
            setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, plants: b.plants.map((p) => (p.sx === sx && p.sy === sy ? nextStateAfterHarvest(p) : p)) } : b)));
            addLog('Cut Comfrey leaves — collected 3 Comfrey Leaves for brewing.');
            markDiscovered('material-comfreyleaves');
            return;
        }
        if (!basketSizeId) {
            addLog('You need a basket before you can harvest. Buy one at the Plant Nursery.');
            return;
        }
        if (basketItems.length >= basketCapacity()) {
            addLog('Basket is full — empty it first (sell or store).');
            return;
        }
        const cal = gameCalendarDate(startMonth, startDay, seasonIdx, day);
        if (sq.harvestMonths && !monthInWindow(cal.month, sq.harvestMonths)) {
            addLog(`${sq.name} is between harvest seasons. ${seasonalFruitSummary(sq)}`);
            return;
        }
        const salvage = isMelonSalvageable(sq);
        if (sq.dead && !salvage)
            return;
        const tier = salvage ? 'half' : (harvestQualityTier(sq.age, sq.daysToMature) || 'full');
        const qualityMult = salvage ? 0.6 : (tier === 'full' ? 1 : tier === 'half' ? 0.5 : 0.35);
        const sellable = salvage ? true : tier !== 'weak';
        const value = Math.round(sq.sellValue * (sq.perSqFt || 1) * qualityMult);
        basketItemIdRef.current += 1;
        setBasketItems((prev) => { var _a; return [...prev, { id: basketItemIdRef.current, plantId: sq.id, name: sq.name, emoji: sq.emoji, value, daysIn: 0, sellable, health: salvage ? 45 : Math.max(0, Math.min(100, (_a = sq.health) !== null && _a !== void 0 ? _a : 100)), qualityTier: tier, salvaged: salvage, seedsAlreadyCollected: !!sq.seedsCollected }]; });
        setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, plants: b.plants.map((p) => (p.sx === sx && p.sy === sy ? nextStateAfterHarvest(p) : p)) } : b)));
        setGardenGoals((g) => ({ ...g, harvests: (g.harvests || 0) + 1 }));
        markDiscovered(`harvest-${sq.id}`);
        addLog(salvage ? `🧺 Salvaged ${sq.name} after the vine died. It went into the basket at reduced value ($${value}).`
            : tier === 'full' ? `Harvested ${sq.name} at full quality into your basket (worth $${value} fresh).`
                : tier === 'half' ? `Harvested ${sq.name} past its peak — only half value ($${value}).`
                    : `Harvested ${sq.name} weak and overdue — worth storing, but too far gone to sell.`);
    }
    function harvestGroundSquare(gx, gy) {
        const sq = getGroundSquare(gx, gy);
        if (!sq)
            return;
        if (sq.id === 'comfrey') {
            setInventory((inv) => ({ ...inv, comfreyleaves: (inv.comfreyleaves || 0) + 3 }));
            setGroundPlants((prev) => prev.map((p) => (p.gx === gx && p.gy === gy ? { ...p, harvested: true } : p)));
            addLog('Cut Comfrey leaves — collected 3 Comfrey Leaves for brewing.');
            markDiscovered('material-comfreyleaves');
            return;
        }
        if (!basketSizeId) {
            addLog('You need a basket before you can harvest. Buy one at the Plant Nursery.');
            return;
        }
        if (basketItems.length >= basketCapacity()) {
            addLog('Basket is full — empty it first (sell or store).');
            return;
        }
        const cal = gameCalendarDate(startMonth, startDay, seasonIdx, day);
        if (sq.harvestMonths && !monthInWindow(cal.month, sq.harvestMonths)) {
            addLog(`${sq.name} is between harvest seasons. ${seasonalFruitSummary(sq)}`);
            return;
        }
        const salvage = isMelonSalvageable(sq);
        if (sq.dead && !salvage)
            return;
        const tier = salvage ? 'half' : (harvestQualityTier(sq.age, sq.daysToMature) || 'full');
        const qualityMult = salvage ? 0.6 : (tier === 'full' ? 1 : tier === 'half' ? 0.5 : 0.35);
        const sellable = salvage ? true : tier !== 'weak';
        const value = Math.round(sq.sellValue * (sq.perSqFt || 1) * qualityMult);
        basketItemIdRef.current += 1;
        setBasketItems((prev) => { var _a; return [...prev, { id: basketItemIdRef.current, plantId: sq.id, name: sq.name, emoji: sq.emoji, value, daysIn: 0, sellable, health: salvage ? 45 : Math.max(0, Math.min(100, (_a = sq.health) !== null && _a !== void 0 ? _a : 100)), qualityTier: tier, salvaged: salvage, seedsAlreadyCollected: !!sq.seedsCollected }]; });
        setGroundPlants((prev) => prev.map((p) => (p.gx === gx && p.gy === gy ? nextStateAfterHarvest(p) : p)));
        setGardenGoals((g) => ({ ...g, harvests: (g.harvests || 0) + 1 }));
        markDiscovered(`harvest-${sq.id}`);
        addLog(salvage ? `🧺 Salvaged ${sq.name} after the vine died. It went into the basket at reduced value ($${value}).`
            : tier === 'full' ? `Harvested ${sq.name} at full quality into your basket (worth $${value} fresh).`
                : tier === 'half' ? `Harvested ${sq.name} past its peak — only half value ($${value}).`
                    : `Harvested ${sq.name} weak and overdue — worth storing, but too far gone to sell.`);
    }
    function collectSeedsFromBedSquare(bedId, sx, sy) {
        const bed = beds.find((b) => b.id === bedId);
        const sq = getBedSquare(bed, sx, sy);
        if (!sq || sq.dead || sq.seedsCollected || sq.age < sq.daysToMature)
            return;
        const yieldCount = Math.floor(Math.random() * 3) + 2; // 2-4 seeds
        addSeed(sq.id, yieldCount);
        setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, plants: b.plants.map((p) => (p.sx === sx && p.sy === sy ? { ...p, seedsCollected: true } : p)) } : b)));
        addLog(`Collected ${yieldCount} ${sq.name} seeds.`);
    }
    function collectSeedsFromGroundSquare(gx, gy) {
        const sq = getGroundSquare(gx, gy);
        if (!sq || sq.dead || sq.seedsCollected || sq.age < sq.daysToMature)
            return;
        const yieldCount = Math.floor(Math.random() * 3) + 2; // 2-4 seeds
        addSeed(sq.id, yieldCount);
        setGroundPlants((prev) => prev.map((p) => (p.gx === gx && p.gy === gy ? { ...p, seedsCollected: true } : p)));
        addLog(`Collected ${yieldCount} ${sq.name} seeds.`);
    }
    function effectiveSpoilDays() {
        const hasHat = inventory.clothes.hat > 0;
        return hasHat ? Math.round(SPOIL_DAYS * (1 + CLOTHES.find((c) => c.id === 'hat').amount)) : SPOIL_DAYS;
    }
    function basketItemCurrentValue(item) {
        const freshFraction = Math.max(0, 1 - item.daysIn / effectiveSpoilDays());
        return Math.round(item.value * freshFraction);
    }
    function basketItemHealth(item) {
        return Math.max(0, Math.min(100, Number.isFinite(item.health) ? item.health : 100));
    }
    function basketItemFreshness(item) {
        const spoilDays = effectiveSpoilDays();
        return Math.max(0, Math.min(100, Math.round((1 - item.daysIn / spoilDays) * 100)));
    }
    function basketItemConditionLabel(item) {
        const health = basketItemHealth(item);
        const freshness = basketItemFreshness(item);
        if (freshness <= 0)
            return 'Spoiled';
        if (item.qualityTier === 'weak' || item.sellable === false)
            return 'Weak harvest';
        if (health < 35)
            return 'Poor health';
        if (health < 65)
            return 'Fair health';
        if (item.qualityTier === 'half')
            return 'Past peak';
        return 'Healthy harvest';
    }
    function sellBasketItem(itemId) {
        const item = basketItems.find((i) => i.id === itemId);
        if (!item)
            return;
        if (item.sellable === false) {
            addLog(`${item.name} is too weak to sell — store it instead.`);
            return;
        }
        const value = basketItemCurrentValue(item);
        setCash((c) => c + value);
        setScore((s) => s + value);
        setBasketItems((prev) => prev.filter((i) => i.id !== itemId));
        addLog(value > 0 ? `Sold ${item.name} for $${value} (100% ROI).` : `${item.name} had spoiled — nothing to sell.`);
    }
    function keepBasketItem(itemId) {
        const item = basketItems.find((i) => i.id === itemId);
        if (!item)
            return;
        const value = Math.round(basketItemCurrentValue(item) * 0.5);
        setCash((c) => c + value);
        setInventory((inv) => ({ ...inv, storage: { ...inv.storage, [item.plantId]: (inv.storage[item.plantId] || 0) + 1 } }));
        setBasketItems((prev) => prev.filter((i) => i.id !== itemId));
        addLog(value > 0 ? `Kept ${item.name} — stored, plus $${value} saved (50% ROI).` : `${item.name} had spoiled — stored anyway, no savings.`);
    }
    function basketSeedYield(item) {
        if (!item || item.seedsAlreadyCollected)
            return 0;
        const health = basketItemHealth(item);
        const freshness = basketItemFreshness(item);
        let count = item.qualityTier === 'full' ? 4 : item.qualityTier === 'half' ? 3 : 2;
        if (health >= 85 && freshness >= 60)
            count += 1;
        if (health < 40 || freshness < 20)
            count -= 1;
        return Math.max(1, Math.min(5, count));
    }
    function saveBasketSeeds(itemId) {
        const item = basketItems.find((i) => i.id === itemId);
        if (!item)
            return;
        const count = basketSeedYield(item);
        if (count < 1) {
            addLog(`${item.name} seeds were already collected from the plant before harvest.`);
            return;
        }
        setInventory((inv) => ({
            ...inv,
            seeds: { ...inv.seeds, [item.plantId]: (inv.seeds[item.plantId] || 0) + count },
        }));
        markDiscovered(`seed-${item.plantId}`);
        setBasketItems((prev) => prev.filter((i) => i.id !== itemId));
        addLog(`Saved ${count} ${item.name} seed${count === 1 ? '' : 's'} — Seed inventory replenished.`);
    }
    function sellAllBasket() {
        const sellableItems = basketItems.filter((i) => i.sellable !== false);
        const unsellableCount = basketItems.length - sellableItems.length;
        let total = 0;
        sellableItems.forEach((i) => { total += basketItemCurrentValue(i); });
        setCash((c) => c + total);
        setScore((s) => s + total);
        setBasketItems((prev) => prev.filter((i) => i.sellable === false));
        addLog(unsellableCount > 0 ? `Sold what could be sold for $${total} — ${unsellableCount} weak item${unsellableCount === 1 ? '' : 's'} left in the basket to store instead.` : `Sold the whole basket for $${total}.`);
    }
    function keepAllBasket() {
        let total = 0;
        setInventory((inv) => {
            const storage = { ...inv.storage };
            basketItems.forEach((i) => {
                total += Math.round(basketItemCurrentValue(i) * 0.5);
                storage[i.plantId] = (storage[i.plantId] || 0) + 1;
            });
            return { ...inv, storage };
        });
        setCash((c) => c + total);
        setBasketItems([]);
        addLog(`Stored the whole basket, plus $${total} saved.`);
    }
    function saveAllBasketSeeds() {
        const eligible = basketItems.filter((i) => basketSeedYield(i) > 0);
        if (eligible.length === 0) {
            addLog('No additional seeds can be saved from the current basket.');
            return;
        }
        const replenished = {};
        eligible.forEach((item) => {
            const count = basketSeedYield(item);
            replenished[item.plantId] = (replenished[item.plantId] || 0) + count;
            markDiscovered(`seed-${item.plantId}`);
        });
        setInventory((inv) => {
            const seeds = { ...inv.seeds };
            Object.entries(replenished).forEach(([plantId, count]) => {
                seeds[plantId] = (seeds[plantId] || 0) + count;
            });
            return { ...inv, seeds };
        });
        const eligibleIds = new Set(eligible.map((i) => i.id));
        setBasketItems((prev) => prev.filter((i) => !eligibleIds.has(i.id)));
        const totalSeeds = Object.values(replenished).reduce((sum, n) => sum + n, 0);
        addLog(`Saved ${totalSeeds} seeds from ${eligible.length} harvest${eligible.length === 1 ? '' : 's'} — Seed inventory replenished.`);
    }
    function waterSquare(kind, targetId, sx, sy) {
        let target = null;
        if (kind === 'bed') {
            const bed = beds.find((b) => b.id === targetId);
            target = bed ? bed.plants.find((p) => p.sx === sx && p.sy === sy && !p.dead && !p.harvested) : null;
            if (!target)
                return;
            setBeds((prev) => prev.map((b) => (b.id === targetId ? { ...b, plants: b.plants.map((p) => (p.sx === sx && p.sy === sy && !p.dead && !p.harvested ? { ...p, wateredToday: true, daysUnwatered: 0, health: Math.min(100, p.health + 5) } : p)) } : b)));
        }
        else {
            target = groundPlants.find((p) => p.gx === sx && p.gy === sy && !p.dead && !p.harvested);
            if (!target)
                return;
            setGroundPlants((prev) => prev.map((p) => (p.gx === sx && p.gy === sy && !p.dead && !p.harvested ? { ...p, wateredToday: true, daysUnwatered: 0, health: Math.min(100, p.health + 5) } : p)));
        }
        setGardenGoals((g) => ({ ...g, plantsWatered: (g.plantsWatered || 0) + 1 }));
        markDiscovered(`water-${target.id}`);
        addLog(`💧 Watered ${target.emoji || '🌱'} ${target.name} with the watering can.`);
    }
    function waterBed(bedId) {
        setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, plants: b.plants.map((p) => (p.dead || p.harvested ? p : { ...p, wateredToday: true, daysUnwatered: 0, health: Math.min(100, p.health + 5) })) } : b)));
    }
    function waterAllGround() {
        setGroundPlants((prev) => prev.map((p) => (p.dead || p.harvested ? p : { ...p, wateredToday: true, daysUnwatered: 0, health: Math.min(100, p.health + 5) })));
    }
    function gallonsUsedFor(toolId) {
        return toolId === 'can' ? 0 : 5; // pvc draws from barrel gallons per click when barrel-sourced
    }
    function tryUseBarrelWater(toolId) {
        if (toolId === 'can')
            return true;
        const usingPlacedBarrel = barrels.some((b) => b.on);
        const usingTap = spigots.some((s) => s.on);
        if (!usingPlacedBarrel || usingTap)
            return true;
        const needed = gallonsUsedFor(toolId);
        if (inventory.rainBarrelGallons < needed) {
            addLog(`Rain barrel is low (${Math.round(inventory.rainBarrelGallons)} gal left) — refills ${RAIN_BARREL.refillPerDay}gal/day.`);
            return inventory.rainBarrelGallons > 0;
        }
        setInventory((inv) => ({ ...inv, rainBarrelGallons: Math.max(0, inv.rainBarrelGallons - needed) }));
        return true;
    }
    function placeTray(sizeId, soilId, useBoosted) {
        const size = TRAY_SIZES.find((t) => t.id === sizeId);
        if ((inventory.emptyTrays[sizeId] || 0) < 1) {
            addLog(`No ${size.slots}-cell trays in inventory — buy one from the Plant Nursery.`);
            return;
        }
        const soilStock = useBoosted ? inventory.boostedSoils[soilId] : inventory.soils[soilId];
        if (soilStock < 1) {
            addLog(`You need a bag of ${useBoosted ? 'boosted ' : ''}${SOILS.find((s) => s.id === soilId).name} — make or buy some first.`);
            return;
        }
        removeEmptyTray(sizeId, 1);
        if (useBoosted)
            setInventory((inv) => ({ ...inv, boostedSoils: { ...inv.boostedSoils, [soilId]: inv.boostedSoils[soilId] - 1 } }));
        else
            removeSoilInv(soilId, 1);
        trayIdRef.current += 1;
        setTrays((prev) => [...prev, { tid: trayIdRef.current, size: size.slots, soilId, boosted: !!useBoosted, cells: Array(size.slots).fill(null) }]);
        addLog(`Filled a ${size.slots}-cell tray with ${useBoosted ? 'boosted ' : ''}${SOILS.find((s) => s.id === soilId).name}.`);
    }
    function placeEmptyTrayOnTable(sizeId) {
        const size = TRAY_SIZES.find((t) => t.id === sizeId);
        if ((inventory.emptyTrays[sizeId] || 0) < 1) {
            addLog(`No ${size.slots}-cell trays in inventory — buy one from the Plant Nursery.`);
            return;
        }
        removeEmptyTray(sizeId, 1);
        trayIdRef.current += 1;
        setTrays((prev) => [...prev, { tid: trayIdRef.current, size: size.slots, soilId: null, boosted: false, cells: Array(size.slots).fill(null) }]);
        addLog(`Placed an empty ${size.slots}-cell tray on the table. Click it to add soil.`);
    }
    function fillPlacedTray(trayId, soilId, useBoosted) {
        const soilStock = useBoosted ? inventory.boostedSoils[soilId] : inventory.soils[soilId];
        if (soilStock < 1) {
            addLog(`You need a bag of ${useBoosted ? 'boosted ' : ''}${SOILS.find((s) => s.id === soilId).name}.`);
            return;
        }
        if (useBoosted)
            setInventory((inv) => ({ ...inv, boostedSoils: { ...inv.boostedSoils, [soilId]: inv.boostedSoils[soilId] - 1 } }));
        else
            removeSoilInv(soilId, 1);
        setTrays((prev) => prev.map((t) => (t.tid === trayId ? { ...t, soilId, boosted: !!useBoosted } : t)));
        addLog(`Added ${useBoosted ? 'boosted ' : ''}${SOILS.find((s) => s.id === soilId).name} to the tray.`);
    }
    function plantTrayCell(tray, cellIdx) {
        if (!tray.soilId) {
            addLog('Add soil to this tray first.');
            return;
        }
        if (!selectedPlant) {
            addLog('Pick a seed first, then tap tray cells.');
            return;
        }
        if (!selectedLightSource) {
            addLog('Select a light source (Grow Light, Sunlight, or Window Light) before starting seeds.');
            return;
        }
        const cell = tray.cells[cellIdx];
        if (cell)
            return; // occupied cells are handled by their own delete button now
        const needsStrat = selectedPlant.stratDays > 0;
        if (needsStrat) {
            if ((inventory.strattedSeeds[selectedPlant.id] || 0) < 1) {
                addLog(`${selectedPlant.name} needs ${selectedPlant.stratDays} days of Cold Stratification first — start it in that tab.`);
                return;
            }
        }
        else if ((inventory.seeds[selectedPlant.id] || 0) < 1) {
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
        }
        else {
            removeSeed(selectedPlant.id, 1);
        }
        setTrays((prev) => prev.map((t) => (t.tid === tray.tid ? { ...t, cells: t.cells.map((c, i) => (i === cellIdx ? { plant: selectedPlant, daysIn: 0, daysNeeded, ready: false, failed: willFail } : c)) } : t)));
        if (willFail) {
            addLog(`⚠️ ${selectedPlant.emoji} ${selectedPlant.name} failed to germinate — tap the red cell to clear it and try again.`);
        }
        else {
            addLog(`${selectedPlant.emoji} ${selectedPlant.name} planted — ready to transplant in ${daysNeeded} days.`);
        }
    }
    function clearTrayCell(tray, cellIdx) {
        setTrays((prev) => prev.map((t) => (t.tid === tray.tid ? { ...t, cells: t.cells.map((c, i) => (i === cellIdx ? null : c)) } : t)));
        addLog('Removed the seed from that cell.');
    }
    function deleteTray(trayId) {
        setTrays((prev) => prev.filter((t) => t.tid !== trayId));
        addLog('Removed the tray from the table.');
    }
    function mixBoostedSoil(soilId, additiveIds) {
        var _a;
        const soil = SOILS.find((s) => s.id === soilId);
        if (inventory.soils[soilId] < 1) {
            addLog(`Need a bag of ${soil.name} first.`);
            return;
        }
        const list = additiveIds && additiveIds.length > 0 ? additiveIds : (soil.groundOk ? ['manure', 'coir'] : ['vermiculite', 'perlite']);
        const missing = list.find((aid) => (inventory.additives[aid] || 0) < 1);
        if (missing) {
            addLog(`Need 1 ${((_a = ADDITIVES.find((a) => a.id === missing)) === null || _a === void 0 ? void 0 : _a.name) || missing} to mix this batch of ${soil.name}.`);
            return;
        }
        setInventory((inv) => {
            const nextAdditives = { ...inv.additives };
            list.forEach((aid) => { nextAdditives[aid] = nextAdditives[aid] - 1; });
            return {
                ...inv,
                soils: { ...inv.soils, [soilId]: inv.soils[soilId] - 1 },
                additives: nextAdditives,
                boostedSoils: { ...inv.boostedSoils, [soilId]: inv.boostedSoils[soilId] + 1 },
            };
        });
        const names = list.map((aid) => { var _a; return ((_a = ADDITIVES.find((a) => a.id === aid)) === null || _a === void 0 ? void 0 : _a.name) || aid; }).join(', ');
        addLog(`Mixed a boosted bag of ${soil.name} with ${names} — better results.`);
    }
    function startStratification(plant) {
        if ((inventory.seeds[plant.id] || 0) < 1) {
            addLog(`No ${plant.name} seed packets in inventory.`);
            return;
        }
        removeSeed(plant.id, 1);
        coldStratIdRef.current += 1;
        setColdStratBatches((prev) => [...prev, { id: coldStratIdRef.current, plantId: plant.id, daysIn: 0, daysNeeded: plant.stratDays, ready: false }]);
        addLog(`Started cold-stratifying ${plant.name} — ${plant.stratDays} days in the fridge.`);
    }
    function collectStratifiedSeed(batchId) {
        const batch = coldStratBatches.find((b) => b.id === batchId);
        if (!batch || !batch.ready)
            return;
        setInventory((inv) => ({ ...inv, strattedSeeds: { ...inv.strattedSeeds, [batch.plantId]: (inv.strattedSeeds[batch.plantId] || 0) + 1 } }));
        setColdStratBatches((prev) => prev.filter((b) => b.id !== batchId));
        addLog(`Collected 1 stratified seed — ready for Heat/Light Germination.`);
    }
    function takeCompostables(inv) {
        const ingredients = {};
        COMPOSTABLE_KEYS.forEach((k) => { ingredients[k] = Math.max(0, Number(inv[k] || 0)); });
        return ingredients;
    }
    function startCompostBatch() {
        const ingredients = takeCompostables(inventory);
        const stats = compostStats(ingredients);
        if (stats.total < 1) {
            addLog('You can start compost as soon as you have weeds/dead matter, leaves, cardboard, coffee grounds, banana peels, or eggshells.');
            return;
        }
        const burnDebrisUsed = (inventory.burnDebris || 0) > 0 ? 1 : 0;
        setInventory((inv) => {
            const next = { ...inv };
            COMPOSTABLE_KEYS.forEach((k) => { next[k] = Math.max(0, (next[k] || 0) - (ingredients[k] || 0)); });
            next.burnDebris = Math.max(0, (next.burnDebris || 0) - burnDebrisUsed);
            return next;
        });
        compostIdRef.current += 1;
        setCompostBatches((prev) => [...prev, { id: compostIdRef.current, daysIn: 0, daysNeeded: stats.daysNeeded, ready: false, ingredients, nutrientScore: stats.nutrientScore, yieldCount: stats.yieldCount, burnDebrisUsed }]);
        setGardenGoals((g) => ({ ...g, compostStarted: (g.compostStarted || 0) + 1 }));
        markDiscovered('skill-compost');
        addLog(`Started compost with ${stats.total} item${stats.total === 1 ? '' : 's'}. ${stats.balanced ? 'Balanced greens and browns are heating efficiently.' : 'It will decompose, but adding both greens and browns will speed it up.'} Estimated ${stats.daysNeeded} days.`);
    }
    function addToCompostBatch(batchId) {
        const additions = takeCompostables(inventory);
        const addStats = compostStats(additions);
        if (addStats.total < 1) {
            addLog('No loose compostable materials are available to add right now.');
            return;
        }
        setInventory((inv) => {
            const next = { ...inv };
            COMPOSTABLE_KEYS.forEach((k) => { next[k] = Math.max(0, (next[k] || 0) - (additions[k] || 0)); });
            return next;
        });
        setCompostBatches((prev) => prev.map((b) => {
            if (b.id !== batchId || b.ready) return b;
            const ingredients = { ...(b.ingredients || {}) };
            COMPOSTABLE_KEYS.forEach((k) => { ingredients[k] = (ingredients[k] || 0) + (additions[k] || 0); });
            const stats = compostStats(ingredients);
            return { ...b, ingredients, daysNeeded: Math.max(b.daysIn + 1, stats.daysNeeded), nutrientScore: stats.nutrientScore, yieldCount: stats.yieldCount };
        }));
        addLog(`Added ${addStats.total} item${addStats.total === 1 ? '' : 's'} to the compost. Bigger, balanced piles finish faster and make richer compost.`);
    }
    function collectCompost(batchId) {
        const batch = compostBatches.find((b) => b.id === batchId);
        if (!batch || !batch.ready)
            return;
        const yieldCount = (batch.yieldCount || COMPOST_YIELD) + (batch.burnDebrisUsed ? 1 : 0);
        setInventory((inv) => ({ ...inv, boostedSoils: { ...inv.boostedSoils, compost: inv.boostedSoils.compost + yieldCount } }));
        setCompostBatches((prev) => prev.filter((b) => b.id !== batchId));
        markDiscovered('material-homemadecompost');
        addLog(`Collected ${yieldCount} bags of homemade compost · nutrient score ${batch.nutrientScore || 1}.`);
    }
    function startFertilizerBatch(recipeId) {
        const recipe = FERTILIZER_RECIPES.find((r) => r.id === recipeId);
        if (!recipe)
            return;
        const have = inventory[recipe.ingredient] || 0;
        if (have < recipe.ingredientCost) {
            addLog(`Need ${recipe.ingredientCost} ${recipe.ingredient === 'comfreyleaves' ? 'Comfrey Leaves' : recipe.ingredient} to start ${recipe.name}.`);
            return;
        }
        setInventory((inv) => ({ ...inv, [recipe.ingredient]: inv[recipe.ingredient] - recipe.ingredientCost }));
        fertilizerBatchIdRef.current += 1;
        setFertilizerBatches((prev) => [...prev, { id: fertilizerBatchIdRef.current, recipeId, daysIn: 0, daysNeeded: recipe.days, ready: false }]);
        addLog(`Started steeping ${recipe.name} — ready in ${recipe.days} days.`);
    }
    function collectFertilizerBatch(batchId) {
        const batch = fertilizerBatches.find((b) => b.id === batchId);
        if (!batch || !batch.ready)
            return;
        const recipe = FERTILIZER_RECIPES.find((r) => r.id === batch.recipeId);
        setInventory((inv) => ({ ...inv, fertilizers: { ...inv.fertilizers, [recipe.id]: inv.fertilizers[recipe.id] + recipe.yieldAmt } }));
        setFertilizerBatches((prev) => prev.filter((b) => b.id !== batchId));
        markDiscovered(`fertilizer-${recipe.id}`);
        addLog(`Collected ${recipe.yieldAmt} bottles of ${recipe.name}!`);
    }
    function applyFertilizer(fertilizerId, kind, bedId, sx, sy) {
        const recipe = FERTILIZER_RECIPES.find((r) => r.id === fertilizerId);
        if (!recipe)
            return;
        if ((inventory.fertilizers[fertilizerId] || 0) < 1) {
            addLog(`No ${recipe.name} in inventory.`);
            return;
        }
        const sq = kind === 'bed' ? getBedSquare(beds.find((b) => b.id === bedId), sx, sy) : groundPlants.find((p) => p.gx === sx && p.gy === sy);
        if (!sq || sq.dead || sq.harvested) {
            addLog('Nothing here to fertilize.');
            return;
        }
        setInventory((inv) => ({ ...inv, fertilizers: { ...inv.fertilizers, [fertilizerId]: inv.fertilizers[fertilizerId] - 1 } }));
        const matches = (p) => (kind === 'bed' ? p.sx === sx && p.sy === sy : p.gx === sx && p.gy === sy);
        const updateFn = (p) => {
            if (!p || !matches(p))
                return p;
            if (fertilizerId === 'calciumtea') {
                addLog(`${p.emoji} ${p.name} treated with Calcium Tea — protected from blossom end rot.`);
                return { ...p, calciumProtected: true, berRisk: false };
            }
            if (fertilizerId === 'potassiumbrew') {
                addLog(`${p.emoji} ${p.name} treated with Potassium Brew — expect better fruit.`);
                return { ...p, sellValue: Math.round(p.sellValue * 1.2) };
            }
            if (fertilizerId === 'comfreytea') {
                addLog(`${p.emoji} ${p.name} treated with Comfrey Tea — a healthy boost.`);
                return { ...p, health: Math.min(100, p.health + 25) };
            }
            return p;
        };
        if (kind === 'bed') {
            setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, plants: b.plants.map(updateFn) } : b)));
        }
        else {
            setGroundPlants((prev) => prev.map(updateFn));
        }
    }
    function beginTransplant(tray, cellIdx) {
        const cell = tray.cells[cellIdx];
        if (!cell || !cell.ready)
            return;
        setPendingTransplant({ trayId: tray.tid, cellIdx, plant: cell.plant });
        setActiveTab('yard');
        setMode('plant');
        addLog(`Pick an empty square to transplant ${cell.plant.name}.`);
    }
    function completeTransplant(kind, bedId, sx, sy) {
        if (!pendingTransplant)
            return;
        const plant = pendingTransplant.plant;
        if (plant.frostTender && !isPastLastFrost(zone, season, day)) {
            addLog(`${plant.name} is frost-tender — wait until after the last frost (day ${zone.lastFrostDay} of Spring in ${zone.name}) to transplant it outdoors.`);
            return;
        }
        const newPlant = { sx, sy, ...plant, daysToMature: daysToMatureFrom(plant, 'seedling'), health: 100, age: 0, wateredToday: true, dead: false, harvested: false };
        if (kind === 'bed')
            setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, plants: [...b.plants, newPlant] } : b)));
        else
            setGroundPlants((prev) => [...prev, { ...newPlant, gx: sx, gy: sy }]);
        setTrays((prev) => prev.map((t) => (t.tid === pendingTransplant.trayId ? { ...t, cells: t.cells.map((c, i) => (i === pendingTransplant.cellIdx ? null : c)) } : t)));
        addLog(`Transplanted ${plant.name}.`);
        setPendingTransplant(null);
    }
    const QUIZ = [
        { q: 'Which nutrient deficiency causes yellowing between leaf veins?', options: ['Nitrogen', 'Magnesium', 'Potassium'], answer: 1 },
        { q: 'What soil pH range do most vegetables prefer?', options: ['4.0–4.5', '6.0–7.0', '8.5–9.0'], answer: 1 },
        { q: 'Which practice most improves soil water retention?', options: ['Tilling deeply every week', 'Adding organic compost', 'Removing all mulch'], answer: 1 },
        { q: "Which pest are ladybugs most effective against?", options: ['Aphids', 'June Bug grubs', 'Earthworms'], answer: 0 },
        { q: 'June Bugs spend part of their life cycle as what, living in the soil?', options: ['Grubs (larvae)', 'Cocoons', 'Eggs on leaves'], answer: 0 },
        { q: 'Beneficial nematodes are especially effective against which pest?', options: ['Aphids', 'Soil-dwelling grubs like June Bugs', 'Butterflies'], answer: 1 },
        { q: "Which beneficial insect's larvae are voracious aphid predators?", options: ['Green Lacewings', 'Praying Mantids', 'Rove Beetles'], answer: 0 },
        { q: 'What plant family do tomatoes and peppers both belong to?', options: ['Nightshade', 'Legume', 'Allium'], answer: 0 },
        { q: 'Chives are in the same plant family as which of these?', options: ['Basil', 'Garlic', 'Thyme'], answer: 1 },
        { q: 'Which of these is botanically a fruit, not a vegetable?', options: ['Tomato', 'Carrot', 'Potato'], answer: 0 },
        { q: 'Which plant is famous for attracting monarch butterflies?', options: ['Milkweed', 'Basil', 'Corn'], answer: 0 },
        { q: 'Broccoli, cabbage, and kale all belong to which plant family?', options: ['Brassica', 'Nightshade', 'Cucurbit'], answer: 0 },
        { q: 'What is a watershed?', options: ['A type of irrigation pipe', 'An area of land that drains into a common body of water', 'A greenhouse water tank'], answer: 1 },
        { q: 'Why is excess fertilizer runoff harmful to watersheds?', options: ['It causes algae blooms downstream', 'It makes soil too dry', 'It attracts more pests'], answer: 0 },
        { q: 'Which gardening practice helps reduce water runoff?', options: ['Leaving soil bare', 'Mulching', 'Tilling right before rain'], answer: 1 },
        { q: 'What do we call water that flows over land instead of soaking into the soil?', options: ['Runoff', 'Percolation', 'Transpiration'], answer: 0 },
        { q: 'In composting, what are "greens"?', options: ['Nitrogen-rich materials like food scraps', 'Carbon-rich materials like dry leaves', 'Any plant with green leaves'], answer: 0 },
        { q: 'In composting, what are "browns"?', options: ['Rotten produce', 'Carbon-rich materials like dry leaves and cardboard', 'Only wood chips'], answer: 1 },
        { q: 'Which of these should NOT go in a home compost pile?', options: ['Vegetable peels', 'Coffee grounds', 'Meat scraps'], answer: 2 },
        { q: 'What does turning a compost pile regularly help provide?', options: ['Oxygen for the microbes breaking it down', 'Extra nitrogen', 'Protection from frost'], answer: 0 },
    ];
    function answerQuiz(idx) {
        if (idx === QUIZ[quizIdx].answer) {
            setCash((c) => c + 15);
            addLog('Correct! +$15.');
        }
        else
            addLog('Not quite.');
        if (quizIdx < QUIZ.length - 1)
            setQuizIdx((i) => i + 1);
        else {
            setQuizOpen(false);
            setQuizIdx(0);
        }
    }
    if (screen === 'title') {
        return (React.createElement("div", { style: styles.setupWrap },
            React.createElement("button", { style: styles.settingsCornerBtn, onClick: openSettings, title: "Settings" }, "\u2699\uFE0F"),
            React.createElement("div", { style: styles.setupCard },
                React.createElement("div", { style: styles.setupHero },
                    React.createElement("img", { src: PLANTING_SEASON_HERO, alt: "Planting Season", style: { width: '100%', display: 'block' } })),
                React.createElement("p", { style: { ...styles.subtitle, textAlign: 'center' } }, "A garden-planning game grounded in real growing conditions."),
                React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 } },
                    hasSaveGame && (React.createElement("button", { style: { ...styles.startBtn, background: '#5C7A4F' }, onClick: loadGame }, "\u25B6 Continue Saved Game")),
                    React.createElement("button", { style: styles.startBtn, onClick: () => setScreen('setup') }, hasSaveGame ? 'New Game →' : 'Start Gardening →'),
                    React.createElement("button", { style: styles.backBtn, onClick: openSettings }, "Settings")),
                React.createElement(FirstTimeGuide, { guideKey: "title", seenGuides: seenGuides, onDismiss: dismissFirstTimeGuide }))));
    }
    if (screen === 'settings') {
        const currentTrack = MUSIC_TRACKS.find((t) => t.id === selectedTrackId) || MUSIC_TRACKS[0];
        return (React.createElement("div", { style: styles.setupWrap },
            React.createElement("div", { style: { ...styles.setupCard, maxWidth: 440 } },
                React.createElement("h1", { style: { ...styles.title, fontSize: 24 } }, "Settings"),
                React.createElement("div", { style: styles.setupSection },
                    React.createElement("div", { style: styles.setupLabel }, "Save & Load"),
                    React.createElement("div", { style: { display: 'flex', gap: 8 } },
                        settingsReturnScreen === 'game' && (React.createElement("button", { style: { ...styles.buyBtn, flex: 1 }, onClick: saveGame }, "\uD83D\uDCBE Save Game")),
                        hasSaveGame && (React.createElement("button", { style: { ...styles.sellBtn, flex: 1 }, onClick: loadGame }, "\u25B6 Load Saved Game")),
                        !hasSaveGame && settingsReturnScreen !== 'game' && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "No saved game yet.")))),
                React.createElement("div", { style: styles.setupSection },
                    React.createElement("div", { style: styles.setupLabel }, "Music"),
                    React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginBottom: 8 } }, "\uD83C\uDFA7 marks real tracks; \uD83C\uDFB9 marks a small in-browser generated loop (no file needed). Pick a track and hit play."),
                    React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 } }, MUSIC_TRACKS.map((t) => (React.createElement("button", { key: t.id, onClick: () => setSelectedTrackId(t.id), style: { ...styles.seedRow, ...(selectedTrackId === t.id ? styles.seedRowActive : {}) } },
                        React.createElement("span", { style: { fontSize: 16 } }, t.audioSrc ? '🎧' : '🎹'),
                        React.createElement("span", { style: { flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 700, marginLeft: 8 } }, t.name))))),
                    React.createElement("div", { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                        React.createElement("button", { style: styles.backBtn, onClick: () => {
                                const idx = MUSIC_TRACKS.findIndex((t) => t.id === selectedTrackId);
                                setSelectedTrackId(MUSIC_TRACKS[(idx - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length].id);
                            }, title: "Previous track" }, "\u23EE"),
                        React.createElement("button", { style: { ...styles.startBtn, flex: 1 }, onClick: () => setMusicPlaying((p) => !p) }, musicPlaying ? `⏸ Pause "${currentTrack.name}"` : `▶ Play "${currentTrack.name}"`),
                        React.createElement("button", { style: styles.backBtn, onClick: () => {
                                const idx = MUSIC_TRACKS.findIndex((t) => t.id === selectedTrackId);
                                setSelectedTrackId(MUSIC_TRACKS[(idx + 1) % MUSIC_TRACKS.length].id);
                            }, title: "Next track" }, "\u23ED")),
                    React.createElement("div", { style: { marginTop: 10 } },
                        React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginBottom: 4 } }, "Volume"),
                        React.createElement("input", { type: "range", min: "0", max: "1", step: "0.05", value: musicVolume, onChange: (e) => setMusicVolume(Number(e.target.value)), style: { width: '100%' } }))),
                React.createElement("div", { style: styles.setupSection },
                    React.createElement("div", { style: styles.setupLabel }, "Day Length"),
                    React.createElement("input", { type: "range", min: MIN_DAY_SECONDS, max: MAX_DAY_SECONDS, step: "1", value: daySeconds, onChange: (e) => setDaySeconds(Number(e.target.value)), style: { width: '100%' } }),
                    React.createElement("div", { style: { fontSize: 12, color: '#6b5844', marginTop: 4 } },
                        daySeconds,
                        " real seconds per in-game day")),
                React.createElement("div", { style: styles.setupSection },
                    React.createElement("div", { style: styles.setupLabel }, "Account"),
                    React.createElement("div", { style: { fontSize: 12, color: '#6b5844', lineHeight: 1.5 } },
                        "Plot & Season doesn't have user accounts or logins \u2014 everything you've set stays local to this session.",
                        playerCity ? ` Your city is set to "${playerCity}".` : ' You haven\'t set a city yet — do that on the Plot & Season screen.')),
                React.createElement("div", { style: styles.setupSection },
                    React.createElement("div", { style: styles.setupLabel }, "First-Time Instructions"),
                    React.createElement("div", { style: { fontSize: 12, color: '#6b5844', lineHeight: 1.5, marginBottom: 8 } }, "Each major screen shows a short guide the first time you visit it. Reset them here whenever you want another walkthrough."),
                    React.createElement("button", { style: { ...styles.buyBtn, width: '100%' }, onClick: replayFirstTimeGuides }, "\u21BB Replay First-Time Instructions")),
                React.createElement("div", { style: styles.setupSection },
                    React.createElement("div", { style: styles.setupLabel }, "About"),
                    React.createElement("div", { style: { fontSize: 12, color: '#6b5844', lineHeight: 1.5 } }, "Plot & Season is a garden-planning game grounded in real horticultural data \u2014 USDA hardiness zones, frost dates, square-foot spacing, cold stratification, and more.")),
                React.createElement("button", { style: styles.backBtn, onClick: () => setScreen(settingsReturnScreen) }, "\u2190 Back")),
            React.createElement(FirstTimeGuide, { guideKey: "settings", seenGuides: seenGuides, onDismiss: dismissFirstTimeGuide })));
    }
    if (screen === 'setup') {
        const almanac = gardenAlmanacFor(zone, startMonth, startDay);
        const almanacDate = `${MONTH_NAMES[startMonth - 1]} ${startDay}`;
        return (React.createElement("div", { style: styles.setupWrap },
            React.createElement("button", { style: styles.settingsCornerBtn, onClick: openSettings, title: "Settings" }, "⚙️"),
            React.createElement("div", { style: styles.setupAlmanacLayout },
                React.createElement("div", { style: { ...styles.setupCard, flex: '0 0 480px', width: 480, maxWidth: 480, boxSizing: 'border-box' } },
                    React.createElement("h1", { style: styles.title }, "Plot & Season"),
                    React.createElement("p", { style: styles.subtitle }, "A garden-planning game grounded in real growing conditions."),
                    React.createElement("div", { style: styles.setupSection },
                        React.createElement("div", { style: styles.setupLabel }, "Choose your 2023 USDA hardiness zone"),
                        React.createElement("div", { style: styles.zoneGrid }, ZONES.map((z) => (React.createElement("button", { key: z.id, onClick: () => setZone(z), style: { ...styles.zoneBtn, ...(zone.id === z.id ? styles.zoneBtnActive : {}) } },
                            React.createElement("div", { style: { fontWeight: 700 } }, z.name),
                            React.createElement("div", { style: { fontSize: 12, opacity: 0.75 } }, z.label))))),
                        React.createElement("div", { style: { fontSize: 10.5, color: '#6b5844', marginTop: 6, lineHeight: 1.35 } }, "Based on the USDA 2023 Plant Hardiness Zone Map. Each a/b half-zone spans 5°F of average annual extreme minimum winter temperature."),
                        (() => {
                            const info = ZONE_LOCATION_INFO[zone.id] || ZONE_LOCATION_INFO[zoneBaseNumber(zone)] || {};
                            return (React.createElement("div", { style: styles.zoneInfoCard },
                                React.createElement("div", { style: styles.zoneInfoTopRow },
                                    React.createElement("div", { style: styles.zoneSelectedBadge }, zone.name.toUpperCase(), " SELECTED"),
                                    React.createElement("div", { style: styles.zoneTempBadge }, zone.label)),
                                React.createElement("div", { style: styles.zoneInfoHeading }, "📍 WHERE YOU'LL FIND ", zone.name.toUpperCase()),
                                React.createElement("div", { style: styles.zoneInfoBody }, "Parts of ", info.locations || 'the United States', "."),
                                React.createElement("div", { style: styles.zoneInfoExamples },
                                    React.createElement("span", { style: { fontWeight: 800, color: '#4A3728' } }, "🏙️ ", info.examplesLabel || 'Example cities', ": "),
                                    info.examples || 'Local examples vary.'),
                                React.createElement("div", { style: styles.zoneDidYouKnow },
                                    React.createElement("span", { style: { fontWeight: 800 } }, "💡 Did you know? "),
                                    "The 2023 USDA map uses 5°F half-zones (a/b). Hardiness zones cross state lines, so a state can contain several zones.")));
                        })()),
                    React.createElement("div", { style: styles.setupSection },
                        React.createElement("div", { style: styles.setupLabel }, "Your City (optional)"),
                        React.createElement("input", { type: "text", value: playerCity, onChange: (e) => setPlayerCity(e.target.value), placeholder: "e.g. Austin, TX", style: { width: '100%', padding: '10px 12px', borderRadius: 3, border: '1.5px solid #B8A98A', fontFamily: sans, fontSize: 13, background: '#EDE6D6', color: '#3D2B1F' } }),
                        React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginTop: 6 } }, "Your hardiness zone tells us about winter cold. Your location helps us account for local growing conditions and native plants.")),
                    React.createElement("div", { style: styles.setupSection },
                        React.createElement("div", { style: styles.setupLabel }, "Start Date"),
                        React.createElement("div", { style: { display: 'flex', gap: 8 } },
                            React.createElement("select", { value: startMonth, onChange: (e) => {
                                    const nextMonth = Number(e.target.value);
                                    setStartMonth(nextMonth);
                                    setStartDay((d) => Math.min(d, MONTH_LENGTHS[nextMonth - 1]));
                                }, style: { flex: 1, padding: '10px 8px', borderRadius: 3, border: '1.5px solid #B8A98A', fontFamily: sans, fontSize: 13, background: '#EDE6D6', color: '#3D2B1F' } }, MONTH_NAMES.map((m, i) => (React.createElement("option", { key: m, value: i + 1 }, m)))),
                            React.createElement("select", { value: startDay, onChange: (e) => setStartDay(Number(e.target.value)), style: { width: 80, padding: '10px 8px', borderRadius: 3, border: '1.5px solid #B8A98A', fontFamily: sans, fontSize: 13, background: '#EDE6D6', color: '#3D2B1F' } }, Array.from({ length: MONTH_LENGTHS[startMonth - 1] }).map((_, i) => (React.createElement("option", { key: i + 1, value: i + 1 }, i + 1))))),
                        React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginTop: 6 } }, "Changing the date updates your Garden Almanac with frost timing and season-appropriate tasks.")),
                    React.createElement("div", { style: { display: 'flex', gap: 8 } },
                        React.createElement("button", { style: styles.backBtn, onClick: () => setScreen('title') }, "← Back"),
                        React.createElement("button", { style: { ...styles.startBtn, flex: 1 }, onClick: () => setScreen('avatar') }, "Create Your Gardener →"))),
                React.createElement("div", { style: styles.almanacCard },
                    React.createElement("div", { style: styles.almanacEyebrow }, "🌱 YOUR GARDEN ALMANAC"),
                    React.createElement("div", { style: styles.almanacDate }, almanacDate),
                    React.createElement("div", { style: styles.almanacSubhead }, zone.name, "  •  ", almanac.phase),
                    React.createElement("div", { style: styles.almanacRule }),
                    React.createElement("div", { style: styles.almanacSectionTitle }, "PLANTING CONDITIONS"),
                    React.createElement("div", { style: styles.almanacConditionGrid },
                        React.createElement("div", { style: styles.almanacCondition },
                            React.createElement("div", { style: styles.almanacConditionLabel }, "🌡️ FROST RISK"),
                            React.createElement("div", { style: styles.almanacConditionValue }, almanac.frostRisk),
                            React.createElement("div", { style: styles.almanacConditionNote }, almanac.frostDetail)),
                        React.createElement("div", { style: styles.almanacCondition },
                            React.createElement("div", { style: styles.almanacConditionLabel }, "🌱 SOIL"),
                            React.createElement("div", { style: styles.almanacConditionValue }, almanac.soil),
                            React.createElement("div", { style: styles.almanacConditionNote }, "Soil temperature changes what can germinate and establish outdoors.")),
                        React.createElement("div", { style: styles.almanacCondition },
                            React.createElement("div", { style: styles.almanacConditionLabel }, "☀️ DAYLIGHT"),
                            React.createElement("div", { style: styles.almanacConditionValue }, almanac.daylight),
                            React.createElement("div", { style: styles.almanacConditionNote }, "Day length helps set the pace for seasonal growth."))),
                    React.createElement("div", { style: styles.almanacSectionTitle }, "WHAT TO DO NOW"),
                    React.createElement("div", { style: styles.almanacActionList }, almanac.actions.map((item) => (React.createElement("div", { key: item.label, style: styles.almanacActionRow },
                        React.createElement("div", { style: styles.almanacActionIcon }, item.icon),
                        React.createElement("div", null,
                            React.createElement("div", { style: styles.almanacActionLabel }, item.label),
                            React.createElement("div", { style: styles.almanacActionCrops }, item.crops)))))),
                    React.createElement("div", { style: styles.almanacWisdomBox },
                        React.createElement("div", { style: styles.almanacWisdomTitle }, "THIS WEEK'S GARDEN WISDOM"),
                        React.createElement("div", { style: styles.almanacWisdomText }, almanac.wisdom)),
                    React.createElement("div", { style: styles.almanacFooter },
                        playerCity ? `Almanac based on ${zone.name}, ${almanacDate}, and your location (${playerCity}).` : `Almanac based on ${zone.name} and ${almanacDate}. Add your city to account for local conditions over time.`))),
            React.createElement(FirstTimeGuide, { guideKey: "setup", seenGuides: seenGuides, onDismiss: dismissFirstTimeGuide })));
    }
    if (screen === 'avatar') {
        const hairTypes = ['Bald', 'Afros', 'Picked Afros', 'Locs', 'Braids', 'Straight Hair', 'Short Cuts'];
        const selectedHair = getAvatarHair(avatar);
        const selectedHairCategory = (selectedHair === null || selectedHair === void 0 ? void 0 : selectedHair.category) || 'Bald';
        const selectedHairOptions = AVATAR_HAIRS.filter((item) => item.category === selectedHairCategory);
        return (React.createElement("div", { style: styles.setupWrap },
            React.createElement("button", { style: styles.settingsCornerBtn, onClick: openSettings, title: "Settings" }, "\u2699\uFE0F"),
            React.createElement("div", { style: { ...styles.setupCard, maxWidth: 1160, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' } },
                React.createElement("div", { style: { flex: '0 0 280px', textAlign: 'center', position: 'sticky', top: 16, alignSelf: 'flex-start' } },
                    React.createElement(AvatarPortrait, { avatar: avatar, size: 220, equippedClothes: equippedClothes }),
                    React.createElement("div", { style: { marginTop: 10, fontSize: 12, color: '#6b5844' } }, "Choose an avatar body first, then choose a hair type and color.")),
                React.createElement("div", { style: { flex: '1 1 560px', minWidth: 0 } },
                    React.createElement("h1", { style: { ...styles.title, fontSize: 24 } }, editingGardenerFromGame ? 'Update Your Gardener' : 'Create Your Gardener'),
                    React.createElement("div", { style: { maxHeight: '70vh', overflowY: 'auto', paddingRight: 6 } },
                        React.createElement("div", { style: styles.setupSection },
                            React.createElement("div", { style: styles.setupLabel }, "1. Choose Avatar"),
                            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 8 } }, AVATAR_BODIES.map((item) => (React.createElement(AvatarOptionButton, { key: item.id, item: item, selected: avatar.bodyId === item.id, thumbHeight: 96, onClick: () => setAvatar((a) => ({ ...normalizeAvatarData(a), bodyId: item.id })) }))))),
                        React.createElement("div", { style: styles.setupSection },
                            React.createElement("div", { style: styles.setupLabel }, "2. Hair Type"),
                            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 8, marginBottom: 10 } }, hairTypes.map((type) => (React.createElement("button", { key: type, onClick: () => {
                                    if (type === 'Bald') {
                                        setAvatar((a) => ({ ...normalizeAvatarData(a), hairId: 'bald' }));
                                    }
                                    else {
                                        const firstForType = AVATAR_HAIRS.find((item) => item.category === type);
                                        if (firstForType)
                                            setAvatar((a) => ({ ...normalizeAvatarData(a), hairId: firstForType.id }));
                                    }
                                }, style: {
                                    background: '#fff', borderRadius: 6, padding: '10px 8px', cursor: 'pointer',
                                    border: selectedHairCategory === type ? '3px solid #5C7A4F' : '1.5px solid #B8A98A',
                                    color: '#4A3728', fontFamily: sans, fontWeight: 700, fontSize: 12,
                                } }, type)))),
                            React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: '#4A3728', marginBottom: 6 } }, "Hair Color"),
                            selectedHairCategory === 'Bald' ? (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', background: '#F7F2E7', border: '1.5px solid #D6C5A6', borderRadius: 6, padding: '10px 12px' } }, "Bald selected \u2014 no hair color needed.")) : (React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 8 } }, selectedHairOptions.map((item) => (React.createElement(AvatarOptionButton, { key: item.id, item: { ...item, label: item.color || item.label }, selected: avatar.hairId === item.id, thumbHeight: 72, onClick: () => setAvatar((a) => ({ ...normalizeAvatarData(a), hairId: item.id })) })))))),
                        React.createElement("div", { style: styles.setupSection },
                            React.createElement("div", { style: styles.setupLabel }, "3. Eyes"),
                            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: 8 } }, AVATAR_EYES.map((item) => (React.createElement(AvatarOptionButton, { key: item.id, item: item, selected: avatar.eyesId === item.id, thumbHeight: 52, onClick: () => setAvatar((a) => ({ ...normalizeAvatarData(a), eyesId: item.id })) }))))),
                        React.createElement("div", { style: styles.setupSection },
                            React.createElement("div", { style: styles.setupLabel }, "4. Lips"),
                            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 8 } }, AVATAR_LIPS.map((item) => (React.createElement(AvatarOptionButton, { key: item.id, item: item, selected: avatar.lipsId === item.id, thumbHeight: 52, onClick: () => setAvatar((a) => ({ ...normalizeAvatarData(a), lipsId: item.id })) }))))),
                        React.createElement("div", { style: styles.setupSection },
                            React.createElement("div", { style: styles.setupLabel }, "5. Facial Hair (Optional)"),
                            React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: '#4A3728', marginBottom: 6 } }, "Mustache"),
                            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 8, marginBottom: 10 } }, AVATAR_MUSTACHES.map((item) => (React.createElement(AvatarOptionButton, { key: item.id, item: item, selected: avatar.mustacheId === item.id, thumbHeight: 52, onClick: () => setAvatar((a) => ({ ...normalizeAvatarData(a), mustacheId: item.id })) })))),
                            React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: '#4A3728', marginBottom: 6 } }, "Beard"),
                            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 8 } }, AVATAR_BEARDS.map((item) => (React.createElement(AvatarOptionButton, { key: item.id, item: item, selected: avatar.beardId === item.id, thumbHeight: 52, onClick: () => setAvatar((a) => ({ ...normalizeAvatarData(a), beardId: item.id })) }))))),
                        React.createElement("div", { style: styles.setupSection },
                            React.createElement("div", { style: styles.setupLabel }, "6. Shirt Underlay"),
                            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 8 } }, AVATAR_SHIRTS.map((item) => (React.createElement(AvatarOptionButton, { key: item.id, item: item, selected: avatar.shirtId === item.id, thumbHeight: 72, onClick: () => setAvatar((a) => ({ ...normalizeAvatarData(a), shirtId: item.id })) }))))),
                        React.createElement("div", { style: styles.setupSection },
                            React.createElement("div", { style: styles.setupLabel }, "7. Overalls"),
                            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 8 } }, AVATAR_OVERALLS.map((item) => (React.createElement(AvatarOptionButton, { key: item.id, item: item, selected: avatar.overallsId === item.id, thumbHeight: 96, onClick: () => setAvatar((a) => ({ ...normalizeAvatarData(a), overallsId: item.id })) }))))),
                        React.createElement("div", { style: styles.setupSection },
                            React.createElement("div", { style: styles.setupLabel }, "8. Sun Hat"),
                            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 8 } }, AVATAR_HATS.map((item) => (React.createElement(AvatarOptionButton, { key: item.id, item: item, selected: avatar.hatId === item.id, thumbHeight: 72, onClick: () => setAvatar((a) => ({ ...normalizeAvatarData(a), hatId: item.id })) })))))),
                    React.createElement("div", { style: { display: 'flex', gap: 8, marginTop: 8 } },
                        React.createElement("button", { style: styles.backBtn, onClick: () => { if (editingGardenerFromGame) {
                                setEditingGardenerFromGame(false);
                                setScreen('game');
                            }
                            else {
                                setScreen('setup');
                            } } }, "\u2190 Back"),
                        React.createElement("button", { style: { ...styles.startBtn, flex: 1 }, onClick: () => { if (editingGardenerFromGame) {
                                setEditingGardenerFromGame(false);
                                setScreen('game');
                            }
                            else {
                                setScreen('methods');
                            } } }, editingGardenerFromGame ? 'Save Gardener & Return to Game →' : 'Choose How to Garden →')))),
            React.createElement(FirstTimeGuide, { guideKey: "avatar", seenGuides: seenGuides, onDismiss: dismissFirstTimeGuide })));
    }
    if (screen === 'methods') {
        return (React.createElement("div", { style: styles.setupWrap },
            React.createElement("button", { style: styles.settingsCornerBtn, onClick: openSettings, title: "Settings" }, "\u2699\uFE0F"),
            React.createElement("div", { style: { ...styles.setupCard, maxWidth: 520 } },
                React.createElement("h1", { style: styles.title }, "How Will You Garden?"),
                React.createElement("p", { style: styles.subtitle }, "Pick as many as you like. There's more than one way to grow a garden \u2014 the ones you select become available as tabs. Some gardeners never build a bed at all."),
                React.createElement("div", { style: styles.setupSection },
                    React.createElement("div", { style: styles.setupLabel }, "Set your starting budget"),
                    React.createElement("input", { type: "range", min: "100", max: MAX_BUDGET, step: "25", value: budget, onChange: (e) => setBudget(Number(e.target.value)), style: { width: '100%' } }),
                    React.createElement("div", { style: styles.budgetValue },
                        "$",
                        budget),
                    React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginTop: 4, textAlign: 'center' } }, "Everything you buy for your garden comes out of this starting cash total.")),
                React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, METHOD_OPTIONS.map((m) => (React.createElement("div", { key: m.id, onClick: () => setEnabledMethods((prev) => ({ ...prev, [m.id]: !prev[m.id] })), style: { ...styles.methodCard, ...(enabledMethods[m.id] ? styles.methodCardActive : {}) } },
                    React.createElement("span", { style: { fontSize: 22 } }, m.icon),
                    React.createElement("div", { style: { flex: 1, marginLeft: 12 } },
                        React.createElement("div", { style: { fontWeight: 700, fontSize: 14 } }, m.label),
                        React.createElement("div", { style: { fontSize: 12, opacity: 0.75 } }, m.desc)),
                    React.createElement("div", { style: { ...styles.checkbox, ...(enabledMethods[m.id] ? styles.checkboxActive : {}) } }, enabledMethods[m.id] ? '✓' : ''))))),
                React.createElement("div", { style: { display: 'flex', gap: 8, marginTop: 20 } },
                    React.createElement("button", { style: styles.backBtn, onClick: () => setScreen('avatar') }, "\u2190 Back"),
                    React.createElement("button", { style: { ...styles.startBtn, flex: 1 }, disabled: !Object.values(enabledMethods).some(Boolean), onClick: () => {
                            const { seasonIdx: startSeasonIdx, day: startDayInSeason } = dateToSeasonDay(startMonth, startDay);
                            setSeasonIdx(startSeasonIdx);
                            setDay(startDayInSeason);
                            setCash(budget);
                            setActiveTab('nursery');
                            setScreen('game');
                        } }, "Begin Planning \u2192"))),
            React.createElement(FirstTimeGuide, { guideKey: "methods", seenGuides: seenGuides, onDismiss: dismissFirstTimeGuide })));
    }
    function pestLocationMatches(a, b) {
        if (!a || !b || a.kind !== b.kind)
            return false;
        if (a.kind === 'bed')
            return a.bedId === b.bedId && a.x === b.x && a.y === b.y;
        return a.x === b.x && a.y === b.y;
    }
    function getActivePestTargets() {
        const bedTargets = beds.flatMap((bed) => bed.plants
            .filter((p) => p && p.pest && !p.dead && !p.harvested)
            .map((p) => ({ ...p, pestId: p.pest, location: { kind: 'bed', bedId: bed.id, x: p.sx, y: p.sy }, bedName: `Bed ${bed.id}` })));
        const groundTargets = groundPlants
            .filter((p) => p && p.pest && !p.dead && !p.harvested)
            .map((p) => ({ ...p, pestId: p.pest, location: { kind: 'ground', x: p.gx, y: p.gy }, bedName: 'Open Ground' }));
        return [...bedTargets, ...groundTargets];
    }
    function openPestEncounter(pestId = null, focusLocation = null) {
        setActiveTab('yard');
        setPestEncounter({ pestId, focusLocation });
    }
    function clearPestTarget(target) {
        var _a;
        if (!(target === null || target === void 0 ? void 0 : target.location))
            return;
        if (target.location.kind === 'bed') {
            setBeds((prev) => prev.map((bed) => bed.id !== target.location.bedId ? bed : {
                ...bed,
                plants: bed.plants.map((p) => (p.sx === target.location.x && p.sy === target.location.y) ? { ...p, pest: null } : p),
            }));
        }
        else {
            setGroundPlants((prev) => prev.map((p) => (p.gx === target.location.x && p.gy === target.location.y) ? { ...p, pest: null } : p));
        }
        setPestAlerts((prev) => prev.filter((a) => {
            if (a.pestId !== target.pestId)
                return true;
            if (a.location)
                return !pestLocationMatches(a.location, target.location);
            return a.plantName !== target.name;
        }));
        addLog(`🔎 Pest Patrol cleared ${((_a = PESTS[target.pestId]) === null || _a === void 0 ? void 0 : _a.name) || 'the pests'} from ${target.name}.`);
    }
    const activePestTargets = getActivePestTargets();
    const season = SEASONS[seasonIdx];
    const tabs = [
        { id: 'nursery', label: 'Plant Nursery', icon: '🏬' },
        { id: 'extension', label: 'Extension', icon: '🏛️' },
        enabledMethods.indoor ? { id: 'indoor', label: 'Start Indoor', icon: '🪴' } : null,
        { id: 'yard', label: 'Yard', icon: '🏡' },
        { id: 'goals', label: 'Garden Journey', icon: '🏆' },
        { id: 'character', label: 'Character', icon: '🧑‍🌾' },
        { id: 'catalog', label: 'Garden Catalog', icon: '📖' },
        { id: 'sunmap', label: 'Chasing the Sun', icon: '☀️' },
    ].filter(Boolean);
    return (React.createElement("div", { style: styles.playWrap, onMouseUp: handleGridMouseUp },
        React.createElement("div", { style: styles.nowPlayingWidget },
            React.createElement("button", { style: styles.nowPlayingArrow, onClick: () => {
                    const idx = MUSIC_TRACKS.findIndex((t) => t.id === selectedTrackId);
                    setSelectedTrackId(MUSIC_TRACKS[(idx - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length].id);
                }, title: "Previous track" }, "\u23EE"),
            React.createElement("button", { style: styles.nowPlayingToggle, onClick: () => setMusicPlaying((p) => !p), title: musicPlaying ? 'Pause' : 'Play' }, musicPlaying ? '⏸' : '▶'),
            React.createElement("div", { style: styles.nowPlayingText },
                React.createElement("div", { style: { fontSize: 8, opacity: 0.7, textTransform: 'uppercase' } }, musicPlaying ? 'Now Playing' : 'Paused'),
                React.createElement("div", { style: { fontSize: 12, fontWeight: 700 } }, (MUSIC_TRACKS.find((t) => t.id === selectedTrackId) || MUSIC_TRACKS[0]).name)),
            React.createElement("button", { style: styles.nowPlayingArrow, onClick: () => {
                    const idx = MUSIC_TRACKS.findIndex((t) => t.id === selectedTrackId);
                    setSelectedTrackId(MUSIC_TRACKS[(idx + 1) % MUSIC_TRACKS.length].id);
                }, title: "Next track" }, "\u23ED")),
        React.createElement(TopBar, { zone: zone, isPlanning: isPlanning, season: season, seasonIdx: seasonIdx, day: day, startMonth: startMonth, startDay: startDay, daySeconds: daySeconds, setDaySeconds: setDaySeconds, paused: paused, setPaused: setPaused, cash: cash, todayWeather: todayWeather, saveGame: saveGame, openSettings: openSettings }),
        React.createElement("div", { style: styles.tabBar },
            tabs.map((t) => (React.createElement("button", { key: t.id, onClick: () => { setPestEncounter(null); setActiveTab(t.id); }, style: { ...styles.tabBtn, ...(activeTab === t.id ? styles.tabBtnActive : {}) } },
                React.createElement("span", { style: { fontSize: 16 } }, t.icon),
                React.createElement("span", null, t.label)))),
            isPlanning && (React.createElement("button", { style: styles.startSeasonBtn, onClick: () => setIsPlanning(false) }, "Start Growing Season \u2192"))),
        !pestEncounter && React.createElement(FirstTimeGuide, { guideKey: `tab-${activeTab}`, seenGuides: seenGuides, onDismiss: dismissFirstTimeGuide }),
        pestEncounter && React.createElement(FirstTimeGuide, { guideKey: "pest-game", seenGuides: seenGuides, onDismiss: dismissFirstTimeGuide }),
        pendingTransplant && (React.createElement("div", { style: styles.transplantBanner },
            "Transplanting ",
            pendingTransplant.plant.emoji,
            " ",
            pendingTransplant.plant.name,
            " \u2014 click an empty square.",
            React.createElement("button", { style: styles.startSeasonBtn, onClick: () => setPendingTransplant(null) }, "Cancel"))),
        pestEncounter && (React.createElement(PestSideGame, { targets: activePestTargets, focusPestId: pestEncounter.pestId, focusLocation: pestEncounter.focusLocation, inventory: inventory, activeBeneficials: activeBeneficials, onReleaseBeneficial: releaseBeneficialBug, onClearTarget: clearPestTarget, onBack: () => setPestEncounter(null) })),
        !pestEncounter && activeTab === 'nursery' && (React.createElement(NurseryShopTab, { cash: cash, inventory: inventory, zone: zone, buySeedPacket: buySeedPacket, sellSeedPacket: sellSeedPacket, buyLivePlant: buyLivePlant, sellLivePlant: sellLivePlant, buySoilBagShop: buySoilBagShop, sellSoilBagShop: sellSoilBagShop, buyTrayShop: buyTrayShop, sellTrayShop: sellTrayShop, buyWoodBundle: buyWoodBundle, sellWoodBundle: sellWoodBundle, buyAluminumBundle: buyAluminumBundle, sellAluminumBundle: sellAluminumBundle, buyCementBundle: buyCementBundle, sellCementBundle: sellCementBundle, buyStickBundle: buyStickBundle, sellStickBundle: sellStickBundle, buyLeaves: buyLeaves, sellLeaves: sellLeaves, buyCardboard: buyCardboard, sellCardboard: sellCardboard, buyMulch: buyMulch, sellMulch: sellMulch, buyEggshells: buyEggshells, sellEggshells: sellEggshells, buyBananaPeels: buyBananaPeels, sellBananaPeels: sellBananaPeels, buyCoffeeGrounds: buyCoffeeGrounds, sellCoffeeGrounds: sellCoffeeGrounds, buyWaterTool: buyWaterTool, sellWaterTool: sellWaterTool, buySpigot: buySpigot, sellSpigot: sellSpigot, buyPvcBundle: buyPvcBundle, sellPvcBundle: sellPvcBundle, buyRainBarrel: buyRainBarrel, sellRainBarrel: sellRainBarrel, buyAdditive: buyAdditive, sellAdditive: sellAdditive, buyLight: buyLight, sellLight: sellLight, buyPlantFood: buyPlantFood, sellPlantFood: sellPlantFood, buyTool: buyTool, sellTool: sellTool, buyClothing: buyClothing, sellClothing: sellClothing, buyBasket: buyBasket, basketSizeId: basketSizeId, buyBeneficialBug: buyBeneficialBug, sellBeneficialBug: sellBeneficialBug, buyGreenhouse: buyGreenhouse, sellGreenhouse: sellGreenhouse, buyGreenhouseDecor: buyGreenhouseDecor, sellGreenhouseDecor: sellGreenhouseDecor, buyPond: buyPond, sellPond: sellPond, buyPondFish: buyPondFish, sellPondFish: sellPondFish, buyTrellis: buyTrellis, sellTrellis: sellTrellis, buyProtectiveNet: buyProtectiveNet, sellProtectiveNet: sellProtectiveNet, buyPath: buyPath, sellPath: sellPath, buyPlanterBucket: buyPlanterBucket, sellPlanterBucket: sellPlanterBucket, buyTreeContainer: buyTreeContainer, sellTreeContainer: sellTreeContainer })),
        !pestEncounter && activeTab === 'extension' && (React.createElement(ExtensionHelpTab, { cash: cash, playerCity: playerCity, soilTestRequests: soilTestRequests, masterGardenerRequests: masterGardenerRequests, submitExtensionSoilTest: submitExtensionSoilTest, askMasterGardener: askMasterGardener })),
        !pestEncounter && activeTab === 'indoor' && (React.createElement(StartIndoorTab, { trays: trays, inventory: inventory, zone: zone, selectedPlant: selectedPlant, selectedPlantId: selectedPlantId, setSelectedPlantId: setSelectedPlantId, placeEmptyTrayOnTable: placeEmptyTrayOnTable, fillPlacedTray: fillPlacedTray, plantTrayCell: plantTrayCell, clearTrayCell: clearTrayCell, deleteTray: deleteTray, beginTransplant: beginTransplant, log: log, mixBoostedSoil: mixBoostedSoil, coldStratBatches: coldStratBatches, startStratification: startStratification, collectStratifiedSeed: collectStratifiedSeed, compostBatches: compostBatches, startCompostBatch: startCompostBatch, addToCompostBatch: addToCompostBatch, collectCompost: collectCompost, fertilizerBatches: fertilizerBatches, startFertilizerBatch: startFertilizerBatch, collectFertilizerBatch: collectFertilizerBatch, setSoilHealthOpen: setSoilHealthOpen, selectedLightSource: selectedLightSource, setSelectedLightSource: setSelectedLightSource, indoorSubTab: indoorSubTab, setIndoorSubTab: setIndoorSubTab, openTrayId: openTrayId, setOpenTrayId: setOpenTrayId })),
        !pestEncounter && activeTab === 'yard' && (React.createElement(YardTab, { zone: zone, calendarMonth: gameCalendarDate(startMonth, startDay, seasonIdx, day).month, beds: beds, groundPlants: groundPlants, mode: mode, setMode: setMode, dragStart: dragStart, dragCurrent: dragCurrent, handleGridMouseDown: handleGridMouseDown, handleGridMouseEnter: handleGridMouseEnter, setDragStart: setDragStart, setDragCurrent: setDragCurrent, clickBedSquare: clickBedSquare, clickGroundSquare: clickGroundSquare, deleteBed: deleteBed, getBedSquare: getBedSquare, getGroundSquare: getGroundSquare, selectedPlant: selectedPlant, selectedPlantId: selectedPlantId, setSelectedPlantId: setSelectedPlantId, selectedSource: selectedSource, setSelectedSource: setSelectedSource, inventory: inventory, pendingTransplant: pendingTransplant, waterBed: waterBed, waterAllGround: waterAllGround, waterSquare: waterSquare, selectedWaterTool: selectedWaterTool, setSelectedWaterTool: setSelectedWaterTool, tryUseBarrelWater: tryUseBarrelWater, selectedBuildMaterial: selectedBuildMaterial, setSelectedBuildMaterial: setSelectedBuildMaterial, buildCatalogTab: buildCatalogTab, setBuildCatalogTab: setBuildCatalogTab, activeBurn: activeBurn, wetControlledBurnRing: wetControlledBurnRing, igniteControlledBurn: igniteControlledBurn, extinguishControlledBurn: extinguishControlledBurn, cancelControlledBurnPreview: cancelControlledBurnPreview, burnedAreas: burnedAreas, collectBurnDebris: collectBurnDebris, barrels: barrels, deleteBarrel: deleteBarrel, toggleBarrel: toggleBarrel, greenhouses: greenhouses, deleteGreenhouse: deleteGreenhouse, setGreenhouseOpenId: setGreenhouseOpenId, ponds: ponds, deletePond: deletePond, setPondOpenId: setPondOpenId, trellises: trellises, deleteTrellis: deleteTrellis, protectiveNets: protectiveNets, deleteProtectiveNet: deleteProtectiveNet, paths: paths, deletePath: deletePath, planterBuckets: planterBuckets, deletePlanterBucket: deletePlanterBucket, setPlanterBucketOpenId: setPlanterBucketOpenId, treeContainers: treeContainers, deleteTreeContainer: deleteTreeContainer, setTreeContainerOpenId: setTreeContainerOpenId, spigots: spigots, deleteSpigot: deleteSpigot, toggleSpigot: toggleSpigot, pipes: pipes, deletePipe: deletePipe, pipeWaypoints: pipeWaypoints, finishPipeRun: finishPipeRun, cancelPipeRun: cancelPipeRun, pvcIsConnected: pvcIsConnected, pvcConnectionStatus: pvcConnectionStatus, pvcNetworkHasOnSource: pvcNetworkHasOnSource, groundSoilTiles: groundSoilTiles, selectedFillSoil: selectedFillSoil, setSelectedFillSoil: setSelectedFillSoil, selectedFillBoosted: selectedFillBoosted, setSelectedFillBoosted: setSelectedFillBoosted, groundMulchTiles: groundMulchTiles, selectedFillMulch: selectedFillMulch, setSelectedFillMulch: setSelectedFillMulch, groundTilledTiles: groundTilledTiles, weeds: weeds, removeWeed: removeWeed, selectedFertilizer: selectedFertilizer, setSelectedFertilizer: setSelectedFertilizer, applyFertilizer: applyFertilizer, applyPHAmendment: applyPHAmendment, compostBatches: compostBatches, startCompostBatch: startCompostBatch, addToCompostBatch: addToCompostBatch, collectCompost: collectCompost, groundObstacles: groundObstacles, clearRock: clearRock, controlledBurnAt: controlledBurnAt, todayWeather: todayWeather, addLog: addLog, basketSizeId: basketSizeId, basketItems: basketItems, basketCapacity: basketCapacity, basketOpen: basketOpen, setBasketOpen: setBasketOpen, sellBasketItem: sellBasketItem, keepBasketItem: keepBasketItem, saveBasketSeeds: saveBasketSeeds, sellAllBasket: sellAllBasket, keepAllBasket: keepAllBasket, saveAllBasketSeeds: saveAllBasketSeeds, basketSeedYield: basketSeedYield, basketItemCurrentValue: basketItemCurrentValue, basketItemHealth: basketItemHealth, basketItemFreshness: basketItemFreshness, basketItemConditionLabel: basketItemConditionLabel, collectSeedsFromBedSquare: collectSeedsFromBedSquare, collectSeedsFromGroundSquare: collectSeedsFromGroundSquare, maintainBedVine: maintainBedVine, maintainGroundVine: maintainGroundVine, activeBeneficials: activeBeneficials, releaseBeneficialBug: releaseBeneficialBug, onInspectPests: openPestEncounter, avatar: avatar, equippedClothes: equippedClothes, showAvatarInYard: showAvatarInYard, enabledMethods: enabledMethods, setQuizOpen: setQuizOpen, log: log, score: score })),
        !pestEncounter && greenhouseOpenId != null && (() => {
            const openGreenhouse = greenhouses.find((g) => g.id === greenhouseOpenId);
            return openGreenhouse ? (React.createElement(GreenhouseModal, { greenhouse: openGreenhouse, inventory: inventory, treeContainers: treeContainers, selectedPlant: selectedPlant, selectedPlantId: selectedPlantId, setSelectedPlantId: setSelectedPlantId, selectedSource: selectedSource, setSelectedSource: setSelectedSource, onPlant: plantGreenhouseSlot, onWater: waterGreenhouse, onHarvest: harvestGreenhouseSlot, onClear: clearGreenhousePlant, onAddDecor: addGreenhouseDecor, onRemoveDecor: removeGreenhouseDecor, onToggleControl: toggleGreenhouseControl, onAddKratky: addKratkySystem, onPlantKratky: plantKratkySlot, onRefillKratky: refillKratky, onHarvestKratky: harvestKratkyPlant, onClearKratky: clearKratkyPlant, zone: zone, season: season, todayWeather: todayWeather, onMoveTreeOut: moveTreeContainerOutside, onOpenTree: setTreeContainerOpenId, onClose: () => setGreenhouseOpenId(null) })) : null;
        })(),
        !pestEncounter && treeContainerOpenId != null && (() => {
            const openContainer = treeContainers.find((c) => c.id === treeContainerOpenId);
            return openContainer ? React.createElement(TreeContainerModal, { container: openContainer, inventory: inventory, greenhouses: greenhouses, onPlant: plantTreeContainer, onWater: waterTreeContainer, onHarvest: harvestTreeContainer, onClear: clearTreeContainerPlant, onMoveIn: moveTreeContainerIntoGreenhouse, onMoveOut: moveTreeContainerOutside, onClose: () => setTreeContainerOpenId(null) }) : null;
        })(),
        !pestEncounter && planterBucketOpenId != null && (() => {
            const openBucket = planterBuckets.find((c) => c.id === planterBucketOpenId);
            return openBucket ? React.createElement(PlanterBucketModal, { container: openBucket, inventory: inventory, onPlant: plantPlanterBucket, onWater: waterPlanterBucket, onHarvest: harvestPlanterBucket, onClear: clearPlanterBucket, onClose: () => setPlanterBucketOpenId(null) }) : null;
        })(),
        !pestEncounter && pondOpenId != null && (() => {
            const openPond = ponds.find((p) => p.id === pondOpenId);
            return openPond ? React.createElement(PondModal, { pond: openPond, inventory: inventory, onStockFish: stockPondFish, onRemoveFish: removePondFish, onClose: () => setPondOpenId(null) }) : null;
        })(),
        !pestEncounter && activeTab === 'goals' && (() => {
            const journeyGoals = [
                { id: 'water5', title: '🌱 Learn Your Plants', desc: 'Water 5 individual plants by hand.', tip: 'Use the watering can and click each plant.', value: gardenGoals.plantsWatered || 0, target: 5 },
                { id: 'harvest3', title: '🥕 From Soil to Basket', desc: 'Bring 3 crops successfully to harvest.', tip: 'Healthy crops harvested near maturity give the best value.', value: gardenGoals.harvests || 0, target: 3 },
                { id: 'compost1', title: '♻️ Waste Nothing', desc: 'Start your first compost batch.', tip: 'Weeds and dead plants are resources, not trash.', value: gardenGoals.compostStarted || 0, target: 1 },
                { id: 'water25', title: '💧 Learn the Watering Rhythm', desc: 'Water 25 plants by hand.', tip: 'Different crops tolerate dry periods differently.', value: gardenGoals.plantsWatered || 0, target: 25 },
                { id: 'harvest10', title: '🌿 Season Grower', desc: 'Complete 10 successful harvests.', tip: 'Try more than one crop and watch their different maturity times.', value: gardenGoals.harvests || 0, target: 10 },
                { id: 'harvest25', title: '🌻 Garden Steward', desc: 'Complete 25 successful harvests.', tip: 'A productive garden comes from planning, observation, and recovery.', value: gardenGoals.harvests || 0, target: 25 },
            ];
            const incomplete = journeyGoals.filter((g) => g.value < g.target);
            const activeGoals = incomplete.slice(0, 3);
            const completedCount = journeyGoals.length - incomplete.length;
            return React.createElement("div", { style: { padding: 18, maxWidth: 1050, margin: '0 auto' } },
            React.createElement("div", { style: styles.panelTitle }, "🏆 Your Garden Journey"),
            React.createElement("div", { style: { color: '#6b5844', marginBottom: 14, fontSize: 13 } }, "Learn by doing. Finish the active goals below and new lessons will move into your journey."),
            React.createElement("div", { style: { ...styles.shopPanel, marginBottom: 14, background: '#FFF8DF' } },
                React.createElement("div", { style: { fontWeight: 900, fontSize: 15, marginBottom: 8 } }, "🎯 Active Goals"),
                activeGoals.length === 0
                    ? React.createElement("div", { style: { fontWeight: 800, color: '#5C7A4F' } }, "✓ Phase 1 goals complete — your garden is thriving!")
                    : React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 } },
                        activeGoals.map((goal, index) => {
                            const pct = Math.min(100, Math.round((goal.value / goal.target) * 100));
                            return React.createElement("div", { key: goal.id, style: { border: index === 0 ? '2px solid #78966B' : '1px solid #C9B98F', borderRadius: 8, background: '#FFFDF6', padding: 11 } },
                                React.createElement("div", { style: { fontWeight: 900, fontSize: 14 } }, index === 0 ? 'NEXT · ' : '', goal.title),
                                React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginTop: 4 } }, goal.desc),
                                React.createElement("div", { style: { height: 8, background: '#E5DDCC', borderRadius: 99, overflow: 'hidden', marginTop: 9 } },
                                    React.createElement("div", { style: { width: `${pct}%`, height: '100%', background: '#78966B' } })),
                                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 800, marginTop: 4 } },
                                    React.createElement("span", null, goal.tip),
                                    React.createElement("span", null, goal.value, "/", goal.target)));
                        })),
                React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginTop: 9 } }, completedCount, " of ", journeyGoals.length, " journey goals completed.")),
            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 } },
                journeyGoals.map((goal) => React.createElement("div", { key: goal.id, style: { ...styles.shopPanel, margin: 0, opacity: goal.value >= goal.target ? 0.72 : 1 } },
                    React.createElement("div", { style: { fontWeight: 800, fontSize: 15 } }, goal.title),
                    React.createElement("div", { style: { fontSize: 11, color: '#6b5844', margin: '5px 0 8px' } }, goal.desc),
                    React.createElement("div", { style: { fontWeight: 800, color: goal.value >= goal.target ? '#5C7A4F' : '#6b5844' } }, goal.value >= goal.target ? '✓ Complete' : `${goal.value}/${goal.target}`)))),
            React.createElement("div", { style: { ...styles.shopPanel, marginTop: 14 } },
                React.createElement("div", { style: styles.panelTitle }, "📔 Garden Journal"),
                React.createElement("div", { style: { fontSize: 12, color: '#6b5844', marginBottom: 8 } }, "Knowledge appears here because you experienced it — not because the game handed you an encyclopedia."),
                React.createElement("div", { style: { fontSize: 12, lineHeight: 1.7 } },
                    Object.keys(discovered).length ? `${Object.keys(discovered).length} discoveries recorded. Keep growing, harvesting, saving seed, composting, managing pests, and experimenting with soil and water.` : 'Your journal is blank. Plant something and begin experimenting.'))));
        })(),
        !pestEncounter && activeTab === 'character' && (React.createElement(CharacterTab, { avatar: avatar, inventory: inventory, equippedClothes: equippedClothes, setEquippedClothes: setEquippedClothes, showAvatarInYard: showAvatarInYard, setShowAvatarInYard: setShowAvatarInYard, onUpdateGardener: () => { setEditingGardenerFromGame(true); setScreen('avatar'); } })),
        !pestEncounter && activeTab === 'catalog' && React.createElement(CatalogTab, { discovered: discovered }),
        !pestEncounter && activeTab === 'sunmap' && React.createElement(SunMapTab, null),
        !pestEncounter && pestAlerts.length > 0 && (React.createElement("div", { style: styles.pestAlertStack }, pestAlerts.map((a) => (React.createElement("div", { key: a.id, style: { ...styles.pestAlertCard, ...(a.severity === 'Severe' ? styles.pestAlertCardSevere : {}) } },
            React.createElement("button", { style: styles.pestAlertClose, onClick: () => setPestAlerts((prev) => prev.filter((p) => p.id !== a.id)), title: "Dismiss" }, "\u2715"),
            React.createElement("div", { style: { fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 } },
                PESTS[a.pestId].icon,
                " ",
                PESTS[a.pestId].name,
                " infestation!"),
            React.createElement("div", { style: { fontSize: 12, margin: '4px 0' } },
                a.plantEmoji,
                " ",
                a.plantName,
                " \u2014 ",
                React.createElement("span", { style: { fontWeight: 700, color: a.severity === 'Severe' ? '#A33' : '#C16B3D' } }, a.severity),
                " damage (-",
                a.damage,
                " health/day if unchecked)"),
            React.createElement("div", { style: { fontSize: 11, color: '#4A3728' } },
                "Best defense: ",
                a.recommendedBugs.map((b) => b.name).join(' or ')),
            React.createElement("button", { type: "button", onClick: () => openPestEncounter(a.pestId, a.location || null), style: { marginTop: 7, width: '100%', border: '1.5px solid #4A3728', borderRadius: 4, padding: '6px 8px', background: '#5C7A4F', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' } }, "\uD83D\uDD0E Inspect Garden")))))),
        weatherAlerts.length > 0 && (React.createElement("div", { style: { ...styles.pestAlertStack, top: pestAlerts.length > 0 ? 70 + 90 * pestAlerts.length : 70 } }, weatherAlerts.map((a) => (React.createElement("div", { key: a.id, style: { ...styles.pestAlertCard, ...(a.type === 'heatwave' ? styles.weatherAlertHeat : styles.weatherAlertFreeze) } },
            React.createElement("button", { style: styles.pestAlertClose, onClick: () => setWeatherAlerts((prev) => prev.filter((w) => w.id !== a.id)), title: "Dismiss" }, "\u2715"),
            React.createElement("div", { style: { fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 } }, a.type === 'heatwave' ? '🔥 Heat Wave!' : '❄️ Freeze!'),
            React.createElement("div", { style: { fontSize: 12, marginTop: 4 } }, a.message)))))),
        React.createElement("div", { style: { ...styles.globalLogPanel, top: logPos.top, right: logPos.right, width: logWidth, ...(logCollapsed ? styles.globalLogPanelCollapsed : {}) } },
            !logCollapsed && (React.createElement("div", { style: styles.logResizeHandle, onMouseDown: startLogResize, onTouchStart: startLogResize, title: "Drag to resize" }, "\u22EE\u22EE")),
            React.createElement("div", { style: styles.globalLogHeader, onMouseDown: startLogMove, onTouchStart: startLogMove, title: "Drag to move, click to collapse" },
                React.createElement("span", { style: styles.panelTitle }, "Garden Log"),
                React.createElement("span", { style: { fontSize: 12, color: '#6b5844' } }, logCollapsed ? '▸' : '▾')),
            !logCollapsed && log.map((l, i) => React.createElement("div", { key: i, style: styles.logLine }, l))),
        quizOpen && (React.createElement("div", { style: styles.modalOverlay },
            React.createElement("div", { style: styles.modalCard },
                React.createElement("div", { style: styles.panelTitle },
                    "Soil Knowledge \u2014 Question ",
                    quizIdx + 1,
                    "/",
                    QUIZ.length),
                React.createElement("div", { style: { margin: '12px 0', fontWeight: 600 } }, QUIZ[quizIdx].q),
                QUIZ[quizIdx].options.map((opt, i) => (React.createElement("button", { key: i, style: styles.quizOption, onClick: () => answerQuiz(i) }, opt))),
                React.createElement("button", { style: styles.modalClose, onClick: () => { setQuizOpen(false); setQuizIdx(0); } }, "Close")))),
        soilHealthOpen && (React.createElement("div", { style: styles.modalOverlay },
            React.createElement("div", { style: { ...styles.modalCard, maxWidth: 640, maxHeight: '80vh', overflowY: 'auto' } },
                React.createElement("div", { style: styles.panelTitle }, "Soil Health Guide"),
                React.createElement("p", { style: { fontSize: 12, color: '#6b5844', margin: '8px 0 16px' } }, "Real soil science, side by side. No single soil wins at everything \u2014 the tradeoffs are the whole point."),
                SOILS.map((s) => (React.createElement("div", { key: s.id, style: { marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #E3D9BF' } },
                    React.createElement("div", { style: { fontWeight: 700, fontFamily: serif, fontSize: 15, marginBottom: 2 } }, s.name),
                    React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginBottom: 8 } }, s.desc),
                    [
                        { label: 'Aeration / Drainage', value: s.aeration },
                        { label: 'Moisture Retention', value: s.moistureRetention },
                        { label: 'Nitrogen (N)', value: s.nitrogen },
                        { label: 'Phosphorus (P)', value: s.phosphorus },
                        { label: 'Potassium (K)', value: s.potassium },
                    ].map((stat) => {
                        const color = stat.value < 34 ? '#C1443C' : stat.value < 67 ? '#D98E2B' : '#5C9B4A';
                        return (React.createElement("div", { key: stat.label, style: { marginBottom: 6 } },
                            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 } },
                                React.createElement("span", null, stat.label),
                                React.createElement("span", { style: { fontWeight: 700, color } },
                                    stat.value,
                                    "/100")),
                            React.createElement("div", { style: { background: '#E3D9BF', borderRadius: 4, height: 10, overflow: 'hidden' } },
                                React.createElement("div", { style: { width: `${stat.value}%`, height: '100%', background: color, borderRadius: 4 } }))));
                    })))),
                React.createElement("button", { style: styles.modalClose, onClick: () => setSoilHealthOpen(false) }, "Close"))))));
}
function PestSideGame({ targets, focusPestId, focusLocation, inventory, activeBeneficials, onReleaseBeneficial, onClearTarget, onBack }) {
    const [clickedBugs, setClickedBugs] = useState({});
    const visibleTargets = focusPestId ? targets.filter((t) => t.pestId === focusPestId) : targets;
    const orderedTargets = [...visibleTargets].sort((a, b) => {
        const af = focusLocation && ((a.location.kind === 'bed' && focusLocation.kind === 'bed' && a.location.bedId === focusLocation.bedId && a.location.x === focusLocation.x && a.location.y === focusLocation.y) || (a.location.kind === 'ground' && focusLocation.kind === 'ground' && a.location.x === focusLocation.x && a.location.y === focusLocation.y));
        const bf = focusLocation && ((b.location.kind === 'bed' && focusLocation.kind === 'bed' && b.location.bedId === focusLocation.bedId && b.location.x === focusLocation.x && b.location.y === focusLocation.y) || (b.location.kind === 'ground' && focusLocation.kind === 'ground' && b.location.x === focusLocation.x && b.location.y === focusLocation.y));
        return af === bf ? 0 : af ? -1 : 1;
    });
    const keyFor = (t) => t.location.kind === 'bed' ? `bed-${t.location.bedId}-${t.location.x}-${t.location.y}-${t.pestId}` : `ground-${t.location.x}-${t.location.y}-${t.pestId}`;
    const requiredFor = (t) => t.pestId === 'junebugs' ? 4 : 5;
    const bugPositions = [
        { left: '22%', top: '28%' }, { left: '67%', top: '22%' }, { left: '48%', top: '48%' },
        { left: '25%', top: '66%' }, { left: '70%', top: '65%' }, { left: '48%', top: '76%' },
    ];
    function swatBug(target, bugIndex) {
        const key = keyFor(target);
        const current = clickedBugs[key] || [];
        if (current.includes(bugIndex))
            return;
        const next = [...current, bugIndex];
        setClickedBugs((prev) => ({ ...prev, [key]: next }));
        if (next.length >= requiredFor(target)) {
            setTimeout(() => onClearTarget(target), 120);
        }
    }
    const activePestIds = [...new Set(targets.map((t) => t.pestId))];
    const allClear = visibleTargets.length === 0;
    return (React.createElement("div", { style: { padding: '20px 22px 34px', maxWidth: 1440, margin: '0 auto' } },
        React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' } },
            React.createElement("button", { type: "button", onClick: onBack, style: { border: '2px solid #4A3728', borderRadius: 5, background: '#EDE6D6', padding: '9px 14px', fontWeight: 800, cursor: 'pointer', color: '#3D2B1F' } }, "\u2190 Return to Yard"),
            React.createElement("div", null,
                React.createElement("div", { style: { fontFamily: serif, fontSize: 26, fontWeight: 800, color: '#3D2B1F' } }, "\uD83D\uDD0E Pest Patrol"),
                React.createElement("div", { style: { fontSize: 12, color: '#6b5844' } }, "Zoomed garden inspection \u2014 click the insects on the attacked plants to remove the current infestation."))),
        allClear ? (React.createElement("div", { style: { maxWidth: 720, margin: '30px auto', padding: 30, textAlign: 'center', background: '#EEF4E8', border: '2px solid #5C7A4F', borderRadius: 10 } },
            React.createElement("div", { style: { fontSize: 52 } }, "\u2705"),
            React.createElement("div", { style: { fontFamily: serif, fontSize: 28, fontWeight: 800, color: '#3D2B1F' } }, "Garden clear"),
            React.createElement("div", { style: { marginTop: 8, fontSize: 13, lineHeight: 1.55, color: '#5F4B3B' } },
                "You cleared this pest outbreak. Keep beneficial predators active and continue inspecting plants to reduce another outbreak.",
                targets.length > 0 ? ' Other pest problems are still active in the Yard.' : ''),
            React.createElement("button", { type: "button", onClick: onBack, style: { marginTop: 18, border: '2px solid #4A3728', borderRadius: 5, background: '#5C7A4F', color: '#fff', padding: '10px 18px', fontWeight: 800, cursor: 'pointer' } }, "Back to the Yard"))) : (React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 390px)', gap: 18, alignItems: 'start' } },
            React.createElement("div", { style: { minWidth: 0 } },
                React.createElement("div", { style: { marginBottom: 10, fontSize: 12, fontWeight: 800, color: '#4A3728' } },
                    orderedTargets.length,
                    " attacked plant",
                    orderedTargets.length === 1 ? '' : 's',
                    " in this inspection"),
                React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 } }, orderedTargets.map((target) => {
                    const pest = PESTS[target.pestId];
                    const key = keyFor(target);
                    const cleared = clickedBugs[key] || [];
                    const required = requiredFor(target);
                    return (React.createElement("div", { key: key, style: { border: '2px solid #A33', borderRadius: 9, background: '#FFF9EE', padding: 14, boxShadow: '2px 2px 0 rgba(74,55,40,.18)' } },
                        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' } },
                            React.createElement("div", null,
                                React.createElement("div", { style: { fontSize: 15, fontWeight: 900, color: '#3D2B1F' } },
                                    target.emoji,
                                    " ",
                                    target.name),
                                React.createElement("div", { style: { fontSize: 10, color: '#7A6754' } },
                                    target.bedName,
                                    " \u00B7 health ",
                                    Math.round(target.health || 0),
                                    "%")),
                            React.createElement("span", { style: { background: '#F7E7E3', border: '1px solid #A33', borderRadius: 999, padding: '4px 8px', fontSize: 10, fontWeight: 800, color: '#8A2E2E' } }, pest.name)),
                        React.createElement("div", { style: { position: 'relative', height: 235, margin: '12px 0', overflow: 'hidden', borderRadius: 10, border: '1px solid #C9B98F', background: 'linear-gradient(#DDE9CB 0 58%, #8D6E4C 58% 100%)' } },
                            React.createElement("div", { style: { position: 'absolute', left: '50%', top: '51%', transform: 'translate(-50%,-50%)', fontSize: 112, lineHeight: 1, filter: target.health < 60 ? 'saturate(.75)' : 'none' } }, target.emoji),
                            Array.from({ length: required }).map((_, i) => !cleared.includes(i) && (React.createElement("button", { key: i, type: "button", onClick: () => swatBug(target, i), "aria-label": `Remove ${pest.name} from ${target.name}`, title: `Click to remove ${pest.name}`, style: { position: 'absolute', ...bugPositions[i], transform: 'translate(-50%,-50%)', width: 46, height: 46, borderRadius: '50%', border: '2px solid #4A3728', background: '#FFF4D4', fontSize: 24, cursor: 'pointer', boxShadow: '2px 2px 0 rgba(0,0,0,.2)', zIndex: 4 } }, pest.icon)))),
                        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11, color: '#5F4B3B' } },
                            React.createElement("span", null,
                                "Removed ",
                                cleared.length,
                                "/",
                                required),
                            React.createElement("span", { style: { fontWeight: 800 } }, cleared.length >= required ? 'Clearing…' : 'Click every bug')),
                        React.createElement("div", { style: { height: 7, marginTop: 6, borderRadius: 99, overflow: 'hidden', background: '#E3D8C5' } },
                            React.createElement("div", { style: { height: '100%', width: `${Math.min(100, (cleared.length / required) * 100)}%`, background: '#5C7A4F', transition: 'width .15s ease' } })),
                        React.createElement("div", { style: { marginTop: 10, fontSize: 11, lineHeight: 1.45, color: '#5F4B3B' } },
                            React.createElement("strong", null, "Why this plant?"),
                            " ",
                            pestReasonForPlant(target.pestId, target))));
                }))),
            React.createElement("aside", { style: { border: '2px solid #4A3728', borderRadius: 9, background: '#F7F2E7', padding: 14, position: 'sticky', top: 12 } },
                React.createElement("div", { style: { fontFamily: serif, fontSize: 20, fontWeight: 800, color: '#3D2B1F', marginBottom: 4 } }, "Pest Guide"),
                React.createElement("div", { style: { fontSize: 11, lineHeight: 1.45, color: '#6b5844', marginBottom: 12 } }, "Every pest currently modeled in the garden is listed here. Active infestations are marked."),
                React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, Object.values(PESTS).map((pest) => {
                    const active = activePestIds.includes(pest.id);
                    const best = BENEFICIAL_BUGS.filter((b) => pest.preferredBeneficials.includes(b.id));
                    return (React.createElement("div", { key: pest.id, style: { border: `1.5px solid ${active ? '#A33' : '#C9B98F'}`, borderRadius: 6, background: active ? '#FFF1EB' : '#FFFDF7', padding: 10 } },
                        React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 7 } },
                            React.createElement("span", { style: { fontSize: 22 } }, pest.icon),
                            React.createElement("div", { style: { flex: 1 } },
                                React.createElement("div", { style: { fontWeight: 900, color: '#3D2B1F' } }, pest.name),
                                React.createElement("div", { style: { fontSize: 9, color: active ? '#A33' : '#7A6754', fontWeight: 800 } }, active ? 'ACTIVE IN YOUR GARDEN' : 'Not active right now'))),
                        React.createElement("div", { style: { marginTop: 7, fontSize: 10.5, lineHeight: 1.4, color: '#5F4B3B' } },
                            React.createElement("strong", null, "Why it appears:"),
                            " ",
                            pest.why),
                        React.createElement("div", { style: { marginTop: 6, fontSize: 10.5, lineHeight: 1.4, color: '#5F4B3B' } },
                            React.createElement("strong", null, "Immediate response:"),
                            " ",
                            pest.remove),
                        React.createElement("div", { style: { marginTop: 7, fontSize: 10.5, fontWeight: 900, color: '#4A3728' } }, "Reduce the next infestation"),
                        React.createElement("ul", { style: { margin: '4px 0 0 18px', padding: 0, fontSize: 10.5, lineHeight: 1.4, color: '#5F4B3B' } }, pest.prevention.map((tip) => React.createElement("li", { key: tip }, tip))),
                        React.createElement("div", { style: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 } }, best.map((bug) => {
                            var _a;
                            const stock = Number((_a = inventory === null || inventory === void 0 ? void 0 : inventory.beneficialBugs) === null || _a === void 0 ? void 0 : _a[bug.id]) || 0;
                            const alreadyActive = activeBeneficials.some((ab) => ab.bugId === bug.id);
                            return (React.createElement("button", { key: bug.id, type: "button", disabled: stock < 1, onClick: () => onReleaseBeneficial(bug.id), style: { border: '1px solid #4A3728', borderRadius: 4, background: stock > 0 ? '#E6F0DE' : '#E8E2D8', color: '#3D2B1F', padding: '6px 7px', fontSize: 10, fontWeight: 800, cursor: stock > 0 ? 'pointer' : 'not-allowed', opacity: stock > 0 ? 1 : .58, textAlign: 'left' } },
                                "\uD83D\uDC1E Release ",
                                bug.name,
                                " \u00B7 ",
                                stock,
                                " owned",
                                alreadyActive ? ' · already active' : ''));
                        }))));
                })),
                React.createElement("div", { style: { marginTop: 12, padding: 9, borderRadius: 5, background: '#EEF4E8', border: '1px solid #9CAF88', fontSize: 10.5, lineHeight: 1.45, color: '#4A3728' } },
                    React.createElement("strong", null, "Prevention now matters in the simulation:"),
                    " active beneficial insects lower the chance of new infestations while they remain in the Yard. Cedar mulch also gives a modest prevention bonus."))))));
}
function TopBar({ zone, isPlanning, season, seasonIdx, day, startMonth, startDay, daySeconds, setDaySeconds, paused, setPaused, cash, todayWeather, saveGame, openSettings }) {
    const calendar = gameCalendarDate(startMonth, startDay, seasonIdx, day);
    const calendarLabel = `${MONTH_NAMES[calendar.month - 1]} ${calendar.dayOfMonth}`;
    return (React.createElement("div", { style: styles.topBar },
        React.createElement("div", { style: styles.topBarMainRow },
            React.createElement("div", { style: styles.topBarLeft },
                React.createElement("span", { style: styles.gameTitle }, "Plot & Season"),
                React.createElement("span", { style: styles.zoneTag }, zone.name)),
            React.createElement("div", { style: styles.topBarRight },
                React.createElement("div", { style: styles.cashBlock },
                    React.createElement("div", { style: styles.cashLabel }, "Cash"),
                    React.createElement("div", { style: styles.cashValue },
                        "$",
                        cash)),
                React.createElement("button", { style: styles.topBarSaveBtn, onClick: saveGame, title: "Save Game" }, "\uD83D\uDCBE Save"),
                React.createElement("button", { style: styles.topBarSettingsBtn, onClick: openSettings, title: "Settings" }, "\u2699\uFE0F"))),
        React.createElement("div", { style: styles.calendarStrip },
            React.createElement("div", { style: styles.calendarDateBlock },
                React.createElement("div", { style: styles.calendarDateLabel },
                    "\uD83D\uDCC5 ",
                    calendarLabel),
                isPlanning ? (React.createElement("div", { style: styles.planningTag }, "Planning Phase")) : (React.createElement("div", { style: styles.clockSeason },
                    season,
                    " \u00B7 Day ",
                    day,
                    "/",
                    DAYS_PER_SEASON))),
            !isPlanning && todayWeather && (React.createElement("div", { style: { ...styles.weatherTag, ...(todayWeather === 'heatwave' ? styles.weatherTagHeat : todayWeather === 'freeze' ? styles.weatherTagFreeze : styles.weatherTagRain) } }, todayWeather === 'heatwave' ? '🔥 Heat Wave' : todayWeather === 'freeze' ? '❄️ Freeze' : '🌧️ Rain')),
            !isPlanning && (React.createElement("button", { onClick: () => setPaused((p) => !p), style: { ...styles.speedBtn, ...(paused ? styles.speedBtnActive : {}) } }, paused ? '▶ Resume' : '⏸ Pause')),
            React.createElement("div", { style: styles.speedSliderWrap },
                React.createElement("span", { style: styles.speedSliderTitle }, "Day speed"),
                React.createElement("input", { type: "range", min: MIN_DAY_SECONDS, max: MAX_DAY_SECONDS, step: "1", value: daySeconds, onChange: (e) => setDaySeconds(Number(e.target.value)), style: styles.speedSlider, title: `${daySeconds} real seconds per in-game day` }),
                React.createElement("span", { style: styles.speedSliderLabel },
                    daySeconds,
                    "s/day")))));
}
function renderMaybeImageIcon(icon, size = 18) {
    const isImage = typeof icon === 'string' && (icon.startsWith('data:image/') || icon.endsWith('.svg') || icon.endsWith('.png') || icon.endsWith('.jpg') || icon.endsWith('.jpeg') || icon.endsWith('.webp'));
    return isImage
        ? React.createElement("img", { src: icon, alt: "", style: { width: size, height: size, objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' } })
        : React.createElement("span", { style: { fontSize: size, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, icon);
}

function SeedPacketIcon({ size = 32, title = 'Seed packet' }) {
    return React.createElement("img", { src: SEED_PACKET_ICON, alt: title, title: title, style: { width: size, height: size, objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 } });
}

function NurseryShopTab({ cash, inventory, zone, buySeedPacket, sellSeedPacket, buyLivePlant, sellLivePlant, buySoilBagShop, sellSoilBagShop, buyTrayShop, sellTrayShop, buyWoodBundle, sellWoodBundle, buyAluminumBundle, sellAluminumBundle, buyCementBundle, sellCementBundle, buyStickBundle, sellStickBundle, buyLeaves, sellLeaves, buyCardboard, sellCardboard, buyMulch, sellMulch, buyEggshells, sellEggshells, buyBananaPeels, sellBananaPeels, buyCoffeeGrounds, sellCoffeeGrounds, buyWaterTool, sellWaterTool, buySpigot, sellSpigot, buyPvcBundle, sellPvcBundle, buyRainBarrel, sellRainBarrel, buyAdditive, sellAdditive, buyLight, sellLight, buyPlantFood, sellPlantFood, buyTool, sellTool, buyClothing, sellClothing, buyBasket, basketSizeId, buyBeneficialBug, sellBeneficialBug, buyGreenhouse, sellGreenhouse, buyGreenhouseDecor, sellGreenhouseDecor, buyPond, sellPond, buyPondFish, sellPondFish, buyTrellis, sellTrellis, buyProtectiveNet, sellProtectiveNet, buyPath, sellPath, buyPlanterBucket, sellPlanterBucket, buyTreeContainer, sellTreeContainer, }) {
    const [subTab, setSubTab] = useState('seeds');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [yardMaterialSection, setYardMaterialSection] = useState('ponds');
    const [gearSection, setGearSection] = useState('tools');
    const NURSERY_CATEGORIES = [
        { id: 'plantsCat', label: 'Plants', icon: '🪴', desc: 'Seeds, live plants, and storage for a thriving garden.', tabs: ['seeds', 'plants', 'seedstorage'], defaultTab: 'seeds' },
        { id: 'growingCat', label: 'Growing Supplies', icon: '🧺', desc: 'Soil, mulch, trays, fertilizers, additives, and greenhouse supplies for strong plants.', tabs: ['soil', 'trays', 'greenhouses', 'inputs'], defaultTab: 'trays' },
        { id: 'yardCat', label: 'Yard Materials', icon: '🪵', desc: 'Building materials, ponds, paths, irrigation, compost supplies, and outdoor projects.', tabs: ['materials'], defaultTab: 'materials' },
        { id: 'careCat', label: 'Garden Care', icon: '🪱', desc: 'Beneficial organisms that protect plants, roots, and healthy garden soil.', tabs: ['bugs'], defaultTab: 'bugs' },
        { id: 'gearCat', label: 'Tools & Gear', icon: '🧤', desc: 'Hand tools, plant care, harvest gear, and clothes to make garden work easier.', tabs: ['gear'], defaultTab: 'gear' },
    ];
    const currentCategory = NURSERY_CATEGORIES.find((cat) => cat.tabs.includes(subTab)) || NURSERY_CATEGORIES[0];
    const categoryTabs = {
        seeds: { label: 'Seeds', icon: SEED_PACKET_ICON },
        plants: { label: 'Live Plants', icon: '🪴' },
        seedstorage: { label: 'Seed Storage', icon: '🗃️' },
        soil: { label: 'Soil', icon: '🪨' },
        trays: { label: 'Trays', icon: '🧺' },
        greenhouses: { label: 'Greenhouses', icon: '🏡' },
        inputs: { label: 'Mulch & Inputs', icon: '🌿' },
        materials: { label: 'Materials', icon: '🪵' },
        bugs: { label: 'Beneficials', icon: '🪱' },
        gear: { label: 'Tools & Gear', icon: '🧤' },
        plantcare: { label: 'Plant Care', icon: '💡' },
    };
    useEffect(() => {
        if (subTab !== 'materials') return;
        const root = document.querySelector('[data-yard-materials-content="true"]');
        if (!root) return;
        const ids = ['ponds', 'trellis', 'protection', 'buckets', 'paths', 'treecontainers', 'bedbuilding', 'compost', 'watering'];
        ids.forEach((id, index) => {
            const start = root.querySelector(`#yardmat-${id}`);
            const next = index < ids.length - 1 ? root.querySelector(`#yardmat-${ids[index + 1]}`) : null;
            if (!start) return;
            let node = start;
            while (node && node !== next) {
                // Preserve each element's original display mode (especially shop grids).
                // Clearing display here used to turn display:grid containers into normal blocks,
                // which made every Yard Materials card stretch full-width.
                if (!node.dataset.psOriginalDisplay) {
                    node.dataset.psOriginalDisplay = node.style.display || '__default__';
                }
                const originalDisplay = node.dataset.psOriginalDisplay === '__default__' ? '' : node.dataset.psOriginalDisplay;
                node.style.display = id === yardMaterialSection ? originalDisplay : 'none';
                node = node.nextElementSibling;
            }
        });
    }, [subTab, yardMaterialSection]);
    useEffect(() => {
        if (subTab !== 'gear' || gearSection === 'plantcare') return;
        const root = document.querySelector('[data-gear-content="true"]');
        if (!root) return;
        const ids = ['tools', 'clothes', 'basket'];
        ids.forEach((id, index) => {
            const start = root.querySelector(`#gear-${id}`);
            const next = index < ids.length - 1 ? root.querySelector(`#gear-${ids[index + 1]}`) : null;
            if (!start) return;
            let node = start;
            while (node && node !== next) {
                // Preserve display:grid on the shop grid when switching Tools & Gear sections.
                if (!node.dataset.psOriginalDisplay) {
                    node.dataset.psOriginalDisplay = node.style.display || '__default__';
                }
                const originalDisplay = node.dataset.psOriginalDisplay === '__default__' ? '' : node.dataset.psOriginalDisplay;
                node.style.display = id === gearSection ? originalDisplay : 'none';
                node = node.nextElementSibling;
            }
        });
    }, [subTab, gearSection]);
    return (React.createElement("div", { style: styles.mainAreaSingle },
        React.createElement("div", { style: { marginBottom: 18 } },
            React.createElement("div", { style: { background: 'linear-gradient(180deg,#F4F0E2 0%,#ECF4E3 50%,#E6F0DD 100%)', border: '2px solid #C79A62', borderRadius: 24, padding: 18, boxShadow: '0 8px 18px rgba(76, 108, 67, 0.12)' } },
                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 16 } },
                    React.createElement("div", { style: { background: '#FFF8EA', border: '2px solid #C79A62', borderRadius: 18, padding: '12px 18px', boxShadow: '0 3px 0 rgba(163, 122, 71, 0.16)' } },
                        React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 12 } },
                            React.createElement("div", { style: { fontSize: 26 } }, '🌱'),
                            React.createElement("div", { style: { fontFamily: serif, fontSize: 28, fontWeight: 900, color: '#2C5B2D', lineHeight: 1.05 } }, "Plant Nursery"))),
                    React.createElement("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
                        React.createElement("div", { style: { background: '#FFF8EA', border: '2px solid #C79A62', borderRadius: 18, padding: '10px 18px', minWidth: 135, boxShadow: '0 3px 0 rgba(163, 122, 71, 0.16)' } },
                            React.createElement("div", { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: '#8A6A39', marginBottom: 2 } }, 'Cash'),
                            React.createElement("div", { style: { fontWeight: 900, fontSize: 18, color: '#2F4D28' } }, "$", cash)),
                        React.createElement("div", { style: { background: '#FFF8EA', border: '2px solid #C79A62', borderRadius: 18, padding: '10px 18px', minWidth: 185, boxShadow: '0 3px 0 rgba(163, 122, 71, 0.16)' } },
                            React.createElement("div", { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: '#8A6A39', marginBottom: 2 } }, 'Zone'),
                            React.createElement("div", { style: { fontWeight: 900, fontSize: 18, color: '#2F4D28' } }, (zone && (zone.name || zone.label || zone.id)) || '—')))),
                React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 14 } }, NURSERY_CATEGORIES.map((cat) => {
                    const active = currentCategory.id === cat.id;
                    return React.createElement("button", { key: cat.id, onClick: () => { setSelectedCategory(cat.id); setSubTab(cat.defaultTab); }, style: { background: active ? '#5D7E47' : '#DDECCF', color: active ? '#FFFFFF' : '#224322', border: '2px solid #7AA06D', borderRadius: 22, padding: '16px 14px 18px', minHeight: 168, textAlign: 'center', cursor: 'pointer', boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.28)' : '0 3px 0 rgba(104, 137, 90, 0.18)' } },
                        React.createElement("div", { style: { fontSize: 38, marginBottom: 8 } }, cat.icon),
                        React.createElement("div", { style: { fontFamily: serif, fontWeight: 900, fontSize: 18, lineHeight: 1.1, marginBottom: 10 } }, cat.label),
                        React.createElement("div", { style: { fontSize: 11, lineHeight: 1.45, maxWidth: 210, margin: '0 auto', opacity: 0.96 } }, cat.desc));
                }))),
            currentCategory.tabs.length > 1 && React.createElement("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 } }, currentCategory.tabs.map((tabId) => {
                const active = subTab === tabId;
                const meta = categoryTabs[tabId] || { label: tabId, icon: '•' };
                return React.createElement("button", { key: tabId, onClick: () => setSubTab(tabId), style: { background: active ? '#5D7E47' : '#F7FAF2', color: active ? '#FFFFFF' : '#2F4D28', border: '1.5px solid #7AA06D', borderRadius: 999, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, React.createElement("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, renderMaybeImageIcon(meta.icon, 18), React.createElement("span", null, meta.label)));
            }))),
        subTab === 'seedstorage' && (React.createElement("div", null,
            React.createElement("p", { style: { fontSize: 12, color: '#6b5844', marginBottom: 12 } }, "Every seed you own, in one place. Sell packets back for cash when you don't need them anymore."),
            React.createElement("div", { style: styles.shopGrid },
                PLANTS.filter((p) => (inventory.seeds[p.id] || 0) > 0 || (inventory.strattedSeeds[p.id] || 0) > 0).map((p) => {
                    const raw = inventory.seeds[p.id] || 0;
                    const stratified = inventory.strattedSeeds[p.id] || 0;
                    return (React.createElement("div", { key: p.id, style: styles.shopCard },
                        React.createElement(SeedPacketIcon, { size: 48, title: `${p.name} seed packet` }),
                        React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, p.name),
                        React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0' } },
                            raw,
                            " seed",
                            raw === 1 ? '' : 's',
                            p.stratDays > 0 ? ` · ${stratified} stratified` : ''),
                        React.createElement(Stepper, { count: raw, cost: p.seedCost, onAdd: () => buySeedPacket(p), onRemove: () => sellSeedPacket(p), canAdd: cash >= p.seedCost })));
                }),
                PLANTS.every((p) => (inventory.seeds[p.id] || 0) === 0 && (inventory.strattedSeeds[p.id] || 0) === 0) && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "No seeds in storage yet \u2014 buy some from the Buy Seeds tab."))))),
        subTab === 'bugs' && (React.createElement("div", null,
            React.createElement("p", { style: { fontSize: 12, color: '#6b5844', marginBottom: 12, maxWidth: 560 } }, "Beneficial organisms for the garden. Nematodes and rove beetles hunt soil pests such as grubs and root maggots; ladybugs and lacewings specialize in aphids. Earthworms are different: they are soil builders rather than pest predators, improving structure and nutrient cycling while active. Buy them here, then release them in the Yard's \uD83E\uDEB1 Beneficials mode."),
            React.createElement("div", { style: styles.shopGrid }, BENEFICIAL_BUGS.map((b) => (React.createElement("div", { key: b.id, style: styles.shopCard },
                React.createElement("div", { style: { fontSize: 26 } }, "\uD83D\uDC1E"),
                React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, b.name),
                React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '6px 0', minHeight: 44 } }, b.desc),
                React.createElement("div", { style: { fontSize: 9, color: '#4A3728', marginBottom: 6 } },
                    b.soilBuilder ? 'Soil builder · improves fertility/structure' : `Aphids ${Math.round((b.vsAphids || 0) * 100)}% · June bugs ${Math.round((b.vsJunebugs || 0) * 100)}% · Root maggots ${Math.round((b.vsRootMaggots || 0) * 100)}% · Root aphids ${Math.round((b.vsRootAphids || 0) * 100)}%`,
                    " \u00B7 lasts ",
                    b.duration,
                    "d"),
                React.createElement(Stepper, { count: inventory.beneficialBugs[b.id], cost: b.cost, onAdd: () => buyBeneficialBug(b.id), onRemove: () => sellBeneficialBug(b.id), canAdd: cash >= b.cost }))))))),
        subTab === 'gear' && React.createElement("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%', marginBottom: 14, alignItems: 'stretch' } },
            [
                ['tools', '🛠️ Tools'],
                ['clothes', '🧤 Clothes'],
                ['basket', '🧺 Harvest Basket'],
                ['plantcare', '💡 Plant Care'],
            ].map(([sectionId, label]) => {
                const active = gearSection === sectionId;
                return React.createElement("button", { key: sectionId, onClick: () => setGearSection(sectionId), style: { background: active ? '#5D7E47' : '#F7FAF2', color: active ? '#FFFFFF' : '#2F4D28', border: '1.5px solid #7AA06D', borderRadius: 999, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, label);
            })),
        subTab === 'gear' && gearSection === 'plantcare' && (React.createElement("div", null,
            React.createElement("div", { style: styles.materialGroupLabel }, "Plant Care"),
            React.createElement("div", { style: styles.shopGrid },
                React.createElement("div", { style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 24 } }, PLANT_LIGHT.icon),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, PLANT_LIGHT.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 } }, PLANT_LIGHT.desc),
                    React.createElement(Stepper, { count: inventory.lights, cost: PLANT_LIGHT.cost, onAdd: buyLight, onRemove: sellLight, canAdd: cash >= PLANT_LIGHT.cost })),
                React.createElement("div", { style: styles.shopCard },
                    React.createElement("div", { style: { display: "flex", justifyContent: "center" } },
                        React.createElement(PlantFoodIcon, { size: 26 })),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, PLANT_FOOD.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 } }, PLANT_FOOD.desc),
                    React.createElement(Stepper, { count: inventory.plantFood, cost: PLANT_FOOD.cost, onAdd: buyPlantFood, onRemove: sellPlantFood, canAdd: cash >= PLANT_FOOD.cost }))))),
        subTab === 'gear' && gearSection !== 'plantcare' && (React.createElement("div", { "data-gear-content": "true" },
            React.createElement("div", { id: "gear-tools", style: styles.materialGroupLabel }, "Tools"),
            React.createElement("div", { style: styles.shopGrid }, TOOLS.map((t) => (React.createElement("div", { key: t.id, style: styles.shopCard },
                React.createElement("div", { style: { fontSize: 24, display: 'flex', justifyContent: 'center' } }, t.id === 'shovel' ? React.createElement(ShovelIcon, { size: 26 }) : t.id === 'tiller' ? React.createElement(TillerIcon, { size: 26 }) : t.icon),
                React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, t.name),
                React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '6px 0', minHeight: 32 } }, t.desc),
                inventory.tools[t.id] > 0 ? (React.createElement("button", { style: styles.sellBtn, onClick: () => sellTool(t.id) },
                    "Owned \u2014 Sell back $",
                    t.cost)) : (React.createElement("button", { style: styles.buyBtn, onClick: () => buyTool(t.id), disabled: cash < t.cost },
                    "Buy \u2014 $",
                    t.cost)))))),
            React.createElement("div", { id: "gear-clothes", style: styles.materialGroupLabel }, "Clothes"),
            React.createElement("div", { style: styles.shopGrid }, CLOTHES.map((c) => (React.createElement("div", { key: c.id, style: styles.shopCard },
                React.createElement("div", { style: { fontSize: 24, display: 'flex', justifyContent: 'center' } }, c.id === 'apron' ? React.createElement(ApronIcon, { size: 26 }) : c.id === 'hat' ? React.createElement(HatIcon, { size: 26 }) : c.icon),
                React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, c.name),
                React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '6px 0', minHeight: 32 } }, c.desc),
                inventory.clothes[c.id] > 0 ? (React.createElement("button", { style: styles.sellBtn, onClick: () => sellClothing(c.id) },
                    "Owned \u2014 Sell back $",
                    c.cost)) : (React.createElement("button", { style: styles.buyBtn, onClick: () => buyClothing(c.id), disabled: cash < c.cost },
                    "Buy \u2014 $",
                    c.cost)))))),
            React.createElement("div", { id: "gear-basket", style: styles.materialGroupLabel }, "Harvest Basket"),
            React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginBottom: 8 } }, "You need a basket to harvest anything. Upgrading requires an empty basket."),
            React.createElement("div", { style: styles.shopGrid }, BASKET_SIZES.map((b) => (React.createElement("div", { key: b.id, style: { ...styles.shopCard, ...(basketSizeId === b.id ? { boxShadow: 'inset 0 0 0 2px #5C7A4F' } : {}) } },
                React.createElement("div", { style: { fontSize: 24 } }, b.icon),
                React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, b.name),
                React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '6px 0' } },
                    b.slots,
                    " slots"),
                React.createElement("button", { style: styles.buyBtn, onClick: () => buyBasket(b.id), disabled: cash < b.cost || basketSizeId === b.id }, basketSizeId === b.id ? 'Owned' : `Buy — $${b.cost}`))))))),
        subTab === 'greenhouses' && (React.createElement("div", null,
            React.createElement("div", { style: { background: '#EEF4E8', border: '1.5px solid #9CB18B', borderRadius: 8, padding: '12px 14px', marginBottom: 14 } },
                React.createElement("div", { style: { fontWeight: 900, fontSize: 16, color: '#3D2B1F', marginBottom: 5 } }, "\uD83C\uDFE1 Greenhouse Shop"),
                React.createElement("div", { style: { fontSize: 11, lineHeight: 1.45, color: '#5B4938' } },
                    "Buy a greenhouse structure here, then go to ",
                    React.createElement("strong", null, "Yard \u2192 Build \u2192 Greenhouses"),
                    " and place it on open ground. Click a placed greenhouse to enter it, plant crops, water, harvest, and decorate the interior. Crops under cover are protected from outdoor frost and random freezes.")),
            React.createElement("div", { style: styles.materialGroupLabel }, "Greenhouse Structures"),
            React.createElement("div", { style: styles.shopGrid }, GREENHOUSE_TYPES.map((g) => {
                var _a, _b;
                return (React.createElement("div", { key: g.id, style: { ...styles.shopCard, border: '1.5px solid #9CB18B' } },
                    React.createElement("div", { style: { fontSize: 32 } }, g.icon),
                    React.createElement("div", { style: styles.shopName }, g.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', minHeight: 42 } }, g.desc),
                    React.createElement("div", { style: { fontSize: 10, color: '#4A3728', margin: '5px 0' } },
                        React.createElement("strong", null,
                            g.w,
                            "\u00D7",
                            g.h),
                        " footprint \u00B7 ",
                        g.plantSlots,
                        " planting spots \u00B7 ",
                        g.decorSlots,
                        " decor spots"),
                    React.createElement("div", { style: { fontSize: 10, fontWeight: 800, color: '#5C7A4F', marginBottom: 5 } },
                        "Owned: ",
                        ((_a = inventory.greenhouses) === null || _a === void 0 ? void 0 : _a[g.id]) || 0),
                    React.createElement("button", { style: { ...styles.buyBtn, width: '100%' }, onClick: () => buyGreenhouse(g.id), disabled: cash < g.cost },
                        "Buy \u2014 $",
                        g.cost),
                    React.createElement("button", { style: { ...styles.sellBtn, width: '100%', marginTop: 4 }, onClick: () => sellGreenhouse(g.id), disabled: (((_b = inventory.greenhouses) === null || _b === void 0 ? void 0 : _b[g.id]) || 0) < 1 }, "Sell Unplaced")));
            })),
            React.createElement("div", { style: { ...styles.materialGroupLabel, marginTop: 16 } }, "Decorations & Greenhouse Equipment"),
            React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginBottom: 8 } }, "Buy these here, then click a placed greenhouse and add them from its interior screen. Functional equipment changes greenhouse growing conditions."),
            React.createElement("div", { style: styles.shopGrid }, GREENHOUSE_DECOR.map((d) => {
                var _a, _b;
                return (React.createElement("div", { key: d.id, style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 26 } }, d.icon),
                    React.createElement("div", { style: styles.shopName }, d.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', minHeight: 42 } }, d.desc),
                    React.createElement("div", { style: { fontSize: 10, color: '#4A3728', marginBottom: 5 } },
                        "Owned: ",
                        ((_a = inventory.greenhouseDecor) === null || _a === void 0 ? void 0 : _a[d.id]) || 0),
                    React.createElement("button", { style: styles.buyBtn, onClick: () => buyGreenhouseDecor(d.id), disabled: cash < d.cost },
                        "Buy \u2014 $",
                        d.cost),
                    React.createElement("button", { style: styles.sellBtn, onClick: () => sellGreenhouseDecor(d.id), disabled: (((_b = inventory.greenhouseDecor) === null || _b === void 0 ? void 0 : _b[d.id]) || 0) < 1 }, "Sell")));
            })))),
        subTab === 'materials' && (React.createElement("div", { "data-yard-materials-content": "true" },
            React.createElement("div", { style: { background: '#F3EBD8', border: '1.5px solid #C9B98F', borderRadius: 6, padding: '10px 12px', marginBottom: 12 } },
                React.createElement("div", { style: { fontWeight: 800, fontSize: 13, color: '#3D2B1F', marginBottom: 6 } }, "Material Inventory"),
                React.createElement("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 11, color: '#4A3728' } },
                    React.createElement("span", null,
                        "\uD83E\uDEB5 Wood: ",
                        React.createElement("strong", null,
                            Number.isFinite(Number(inventory.woodSqFt)) ? Number(inventory.woodSqFt) : 0,
                            " sq ft")),
                    React.createElement("span", null,
                        "Aluminum: ",
                        React.createElement("strong", null,
                            Number.isFinite(Number(inventory.aluminumSqFt)) ? Number(inventory.aluminumSqFt) : 0,
                            " sq ft")),
                    React.createElement("span", null,
                        "Cement: ",
                        React.createElement("strong", null,
                            Number.isFinite(Number(inventory.cementSqFt)) ? Number(inventory.cementSqFt) : 0,
                            " sq ft")),
                    React.createElement("span", null,
                        "Sticks: ",
                        React.createElement("strong", null,
                            Number.isFinite(Number(inventory.sticksSqFt)) ? Number(inventory.sticksSqFt) : 0,
                            " sq ft")),
                    React.createElement("span", null,
                        "PVC: ",
                        React.createElement("strong", null,
                            Number.isFinite(Number(inventory.pvcFeet)) ? Number(inventory.pvcFeet) : 0,
                            " ft")))),
            React.createElement("div", { style: { marginBottom: 14 } },
                React.createElement("div", { style: { fontWeight: 900, fontSize: 12, color: '#3D2B1F', marginBottom: 8 } }, "Yard Materials Categories"),
                React.createElement("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%', alignItems: 'stretch' } },
                    [
                        ['ponds', '💧 Ponds & Fish'],
                        ['trellis', '🌿 Trellising'],
                        ['protection', '🕸️ Plant Protection'],
                        ['buckets', '🪣 Planter Buckets'],
                        ['paths', '🧱 Pathways'],
                        ['treecontainers', '🪴 Tree Containers'],
                        ['bedbuilding', '🪵 Bed Building'],
                        ['compost', '🍂 Compost Ingredients'],
                        ['watering', '💧 Watering'],
                    ].map(([sectionId, label]) => {
                        const active = yardMaterialSection === sectionId;
                        return React.createElement("button", { key: sectionId, onClick: () => setYardMaterialSection(sectionId), style: { background: active ? '#5D7E47' : '#F7FAF2', color: active ? '#FFFFFF' : '#2F4D28', border: '1.5px solid #7AA06D', borderRadius: 999, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, label);
                    }))),
            React.createElement("div", { id: "yardmat-ponds", style: { ...styles.materialGroupLabel, scrollMarginTop: 18 } }, "Ponds & Fish"),
            React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginBottom: 8 } }, "Buy a pond kit, place it from Yard \u2192 Build, then click the pond to stock fish. Mosquitofish provide the strongest mosquito-larvae control."),
            React.createElement("div", { style: styles.shopGrid },
                POND_TYPES.map((p) => {
                    var _a, _b;
                    return (React.createElement("div", { key: p.id, style: styles.shopCard },
                        React.createElement("div", { style: { fontSize: 26 } }, "\uD83D\uDCA7"),
                        React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, p.name),
                        React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 40 } },
                            p.desc,
                            " \u00B7 capacity ",
                            p.fishSlots,
                            " fish"),
                        React.createElement("div", { style: { fontSize: 10, fontWeight: 800, color: '#4A3728', marginBottom: 5 } },
                            "Owned: ",
                            ((_a = inventory.ponds) === null || _a === void 0 ? void 0 : _a[p.id]) || 0),
                        React.createElement("button", { style: styles.buyBtn, onClick: () => buyPond(p.id), disabled: cash < p.cost },
                            "Buy \u2014 $",
                            p.cost),
                        React.createElement("button", { style: styles.sellBtn, onClick: () => sellPond(p.id), disabled: (((_b = inventory.ponds) === null || _b === void 0 ? void 0 : _b[p.id]) || 0) < 1 }, "Sell Unplaced")));
                }),
                POND_FISH.map((f) => {
                    var _a;
                    return (React.createElement("div", { key: f.id, style: styles.shopCard },
                        React.createElement("div", { style: { fontSize: 26 } }, f.icon),
                        React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, f.name),
                        React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 48 } }, f.desc),
                        React.createElement(Stepper, { count: ((_a = inventory.pondFish) === null || _a === void 0 ? void 0 : _a[f.id]) || 0, cost: f.cost, onAdd: () => buyPondFish(f.id), onRemove: () => sellPondFish(f.id), canAdd: cash >= f.cost })));
                })),
            React.createElement("div", { id: "yardmat-trellis", style: { ...styles.materialGroupLabel, scrollMarginTop: 18 } }, "Trellising"),
            React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginBottom: 8 } }, "Trellises are optional but preferred. Vines can grow without one; unsupported vines spread across the ground and their visible leaves get larger each day until you train/prune them. Wood and net trellises go beside crops. Cattle Panel Arches span a 3×2 growing area, can be placed over beds or open ground, and vines may be planted directly underneath them."),
            React.createElement("div", { style: styles.shopGrid }, TRELLIS_TYPES.map((t) => {
                var _a;
                return (React.createElement("div", { key: t.id, style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 26 } }, t.icon),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, t.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 48 } }, t.desc),
                    React.createElement(Stepper, { count: ((_a = inventory.trellises) === null || _a === void 0 ? void 0 : _a[t.id]) || 0, cost: t.cost, onAdd: () => buyTrellis(t.id), onRemove: () => sellTrellis(t.id), canAdd: cash >= t.cost })));
            })),
            React.createElement("div", { id: "yardmat-protection", style: { ...styles.materialGroupLabel, scrollMarginTop: 18 } }, "Plant Protection"),
            React.createElement("div", { style: styles.shopGrid },
                React.createElement("div", { style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 28 } }, TREE_BUSH_NET.icon),
                    React.createElement("div", { style: { fontWeight: 700 } }, TREE_BUSH_NET.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', minHeight: 48 } }, TREE_BUSH_NET.desc),
                    React.createElement(Stepper, { count: inventory.protectiveNets || 0, cost: TREE_BUSH_NET.cost, onAdd: buyProtectiveNet, onRemove: sellProtectiveNet, canAdd: cash >= TREE_BUSH_NET.cost }))),
            React.createElement("div", { id: "yardmat-buckets", style: { ...styles.materialGroupLabel, scrollMarginTop: 18 } }, "Planter Buckets"),
            React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginBottom: 8 } }, "Container sizes from 1 to 50 gallons. Match the container volume to the crop's root space."),
            React.createElement("div", { style: styles.shopGrid }, PLANTER_BUCKET_TYPES.map((b) => { var _a; return React.createElement("div", { key: b.id, style: styles.shopCard },
                React.createElement("div", { style: { fontSize: 26 } }, "\uD83E\uDEA3"),
                React.createElement("div", { style: { fontWeight: 700 } }, b.name),
                React.createElement("div", { style: { fontSize: 10, color: '#6b5844', minHeight: 42 } }, b.desc),
                React.createElement(Stepper, { count: ((_a = inventory.planterBuckets) === null || _a === void 0 ? void 0 : _a[b.id]) || 0, cost: b.cost, onAdd: () => buyPlanterBucket(b.id), onRemove: () => sellPlanterBucket(b.id), canAdd: cash >= b.cost })); })),
            React.createElement("div", { id: "yardmat-paths", style: { ...styles.materialGroupLabel, scrollMarginTop: 18 } }, "Pathway Materials"),
            React.createElement("div", { style: styles.shopGrid }, PATH_TYPES.map((p) => { var _a; return React.createElement("div", { key: p.id, style: styles.shopCard },
                React.createElement("div", { style: { fontSize: 26 } }, p.icon),
                React.createElement("div", { style: { fontWeight: 700 } }, p.name),
                React.createElement("div", { style: { fontSize: 10, color: '#6b5844', minHeight: 36 } }, p.desc),
                React.createElement(Stepper, { count: ((_a = inventory.paths) === null || _a === void 0 ? void 0 : _a[p.id]) || 0, cost: p.cost, onAdd: () => buyPath(p.id), onRemove: () => sellPath(p.id), canAdd: cash >= p.cost })); })),
            React.createElement("div", { id: "yardmat-treecontainers", style: { ...styles.materialGroupLabel, scrollMarginTop: 18 } }, "Movable Tree Containers"),
            React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginBottom: 8 } }, "Grow soursop, lemon, fig, or banana in a large container. Keep it outside during hot weather, then roll the whole pot into a placed greenhouse before frost."),
            React.createElement("div", { style: styles.shopGrid }, TREE_CONTAINER_TYPES.map((t) => {
                var _a;
                return (React.createElement("div", { key: t.id, style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 28 } }, t.icon),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, t.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 42 } }, t.desc),
                    React.createElement(Stepper, { count: ((_a = inventory.treeContainers) === null || _a === void 0 ? void 0 : _a[t.id]) || 0, cost: t.cost, onAdd: () => buyTreeContainer(t.id), onRemove: () => sellTreeContainer(t.id), canAdd: cash >= t.cost })));
            })),
            React.createElement("div", { id: "yardmat-bedbuilding", style: { ...styles.materialGroupLabel, scrollMarginTop: 18 } }, "Bed Building"),
            React.createElement("div", { style: styles.shopGrid },
                WOOD_BUNDLES.map((w) => (React.createElement("div", { key: w.id, style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 24 } }, "\uD83E\uDEB5"),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } },
                        w.sqFt,
                        " sq ft wood"),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0' } },
                        "$",
                        (w.cost / w.sqFt).toFixed(2),
                        "/sq ft \u00B7 have: ",
                        Number.isFinite(Number(inventory.woodSqFt)) ? Number(inventory.woodSqFt) : 0),
                    React.createElement("button", { style: styles.buyBtn, onClick: () => buyWoodBundle(w.id), disabled: cash < w.cost },
                        "Buy \u2014 $",
                        w.cost),
                    React.createElement("button", { style: styles.sellBtn, onClick: () => sellWoodBundle(w.id), disabled: (Number.isFinite(Number(inventory.woodSqFt)) ? Number(inventory.woodSqFt) : 0) < w.sqFt },
                        "Sell back ",
                        w.sqFt,
                        " sq ft")))),
                ALUMINUM_BUNDLES.map((w) => (React.createElement("div", { key: w.id, style: styles.shopCard },
                    React.createElement("div", { style: { display: "flex", justifyContent: "center" } },
                        React.createElement(AluminumIcon, { size: 26 })),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } },
                        w.sqFt,
                        " sq ft aluminum"),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0' } },
                        "$",
                        (w.cost / w.sqFt).toFixed(2),
                        "/sq ft \u00B7 have: ",
                        inventory.aluminumSqFt),
                    React.createElement("button", { style: styles.buyBtn, onClick: () => buyAluminumBundle(w.id), disabled: cash < w.cost },
                        "Buy \u2014 $",
                        w.cost),
                    React.createElement("button", { style: styles.sellBtn, onClick: () => sellAluminumBundle(w.id), disabled: inventory.aluminumSqFt < w.sqFt },
                        "Sell back ",
                        w.sqFt,
                        " sq ft")))),
                CEMENT_BUNDLES.map((w) => (React.createElement("div", { key: w.id, style: styles.shopCard },
                    React.createElement("div", { style: { display: "flex", justifyContent: "center" } },
                        React.createElement(CementBlockIcon, { size: 26 })),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } },
                        w.sqFt,
                        " sq ft cement block"),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0' } },
                        "$",
                        (w.cost / w.sqFt).toFixed(2),
                        "/sq ft \u00B7 have: ",
                        inventory.cementSqFt),
                    React.createElement("button", { style: styles.buyBtn, onClick: () => buyCementBundle(w.id), disabled: cash < w.cost },
                        "Buy \u2014 $",
                        w.cost),
                    React.createElement("button", { style: styles.sellBtn, onClick: () => sellCementBundle(w.id), disabled: inventory.cementSqFt < w.sqFt },
                        "Sell back ",
                        w.sqFt,
                        " sq ft")))),
                STICK_BUNDLES.map((w) => (React.createElement("div", { key: w.id, style: styles.shopCard },
                    React.createElement("div", { style: { display: "flex", justifyContent: "center" } },
                        React.createElement(StickIcon, { size: 26 })),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } },
                        w.sqFt,
                        " sq ft large sticks"),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0' } },
                        "$",
                        (w.cost / w.sqFt).toFixed(2),
                        "/sq ft \u00B7 have: ",
                        inventory.sticksSqFt),
                    React.createElement("button", { style: styles.buyBtn, onClick: () => buyStickBundle(w.id), disabled: cash < w.cost },
                        "Buy \u2014 $",
                        w.cost),
                    React.createElement("button", { style: styles.sellBtn, onClick: () => sellStickBundle(w.id), disabled: inventory.sticksSqFt < w.sqFt },
                        "Sell back ",
                        w.sqFt,
                        " sq ft"))))),
            React.createElement("div", { id: "yardmat-compost", style: { ...styles.materialGroupLabel, scrollMarginTop: 18 } }, "Compost Ingredients"),
            React.createElement("div", { style: styles.shopGrid },
                React.createElement("div", { style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 26 } }, LEAVES_ITEM.icon),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, LEAVES_ITEM.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 } }, LEAVES_ITEM.desc),
                    React.createElement(Stepper, { count: inventory.leaves, cost: LEAVES_ITEM.cost, onAdd: buyLeaves, onRemove: sellLeaves, canAdd: cash >= LEAVES_ITEM.cost })),
                React.createElement("div", { style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 26 } }, CARDBOARD_ITEM.icon),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, CARDBOARD_ITEM.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 } }, CARDBOARD_ITEM.desc),
                    React.createElement(Stepper, { count: inventory.cardboard, cost: CARDBOARD_ITEM.cost, onAdd: buyCardboard, onRemove: sellCardboard, canAdd: cash >= CARDBOARD_ITEM.cost })),
                React.createElement("div", { style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 26 } }, "\uD83C\uDF43"),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, "Dead Plant Matter"),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 } }, "Not sold here \u2014 clear dead plants in the Yard to collect this automatically."),
                    React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: '#4A3728' } },
                        "have: ",
                        inventory.deadMatter))),
            React.createElement("div", { id: "yardmat-watering", style: { ...styles.materialGroupLabel, scrollMarginTop: 18 } }, "Watering"),
            React.createElement("div", { style: styles.shopGrid },
                WATER_TOOLS.map((t) => (React.createElement("div", { key: t.id, style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 24 } }, t.icon),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, t.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 } }, t.desc),
                    React.createElement(Stepper, { count: inventory.waterTools[t.id], cost: t.cost, onAdd: () => buyWaterTool(t.id), onRemove: () => sellWaterTool(t.id), canAdd: cash >= t.cost })))),
                React.createElement("div", { style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 24 } }, SPIGOT.icon),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, SPIGOT.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 } }, SPIGOT.desc),
                    React.createElement(Stepper, { count: inventory.spigots, cost: SPIGOT.cost, onAdd: buySpigot, onRemove: sellSpigot, canAdd: cash >= SPIGOT.cost })),
                PVC_BUNDLES.map((p) => (React.createElement("div", { key: p.id, style: styles.shopCard },
                    React.createElement("div", { style: { display: "flex", justifyContent: "center" } },
                        React.createElement(PvcIcon, { size: 26 })),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } },
                        p.feet,
                        "ft PVC (Schedule 40)"),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 } },
                        "Must connect to a barrel or spigot to work. Click multiple points in Build mode to bend around obstacles \u2014 each turn is an elbow fitting ($",
                        ELBOW_COST,
                        ")."),
                    React.createElement("div", { style: { fontSize: 10, color: '#4A3728', marginBottom: 4 } },
                        "have: ",
                        inventory.pvcFeet,
                        "ft"),
                    React.createElement("button", { style: styles.buyBtn, onClick: () => buyPvcBundle(p.id), disabled: cash < p.cost },
                        "Buy \u2014 $",
                        p.cost),
                    React.createElement("button", { style: styles.sellBtn, onClick: () => sellPvcBundle(p.id), disabled: inventory.pvcFeet < p.feet },
                        "Sell back ",
                        p.feet,
                        "ft")))),
                React.createElement("div", { style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 24 } }, RAIN_BARREL.icon),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, RAIN_BARREL.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 } },
                        "Connects to hose/PVC or dunk a can. Refills ",
                        RAIN_BARREL.refillPerDay,
                        "gal/day from rain."),
                    React.createElement("div", { style: { fontSize: 10, color: '#4A3728', marginBottom: 4 } },
                        "owned: ",
                        inventory.rainBarrels,
                        " \u00B7 ",
                        Math.round(inventory.rainBarrelGallons),
                        " gal stored"),
                    React.createElement("button", { style: styles.buyBtn, onClick: buyRainBarrel, disabled: cash < RAIN_BARREL.cost },
                        "Buy \u2014 $",
                        RAIN_BARREL.cost),
                    React.createElement("button", { style: styles.sellBtn, onClick: sellRainBarrel, disabled: inventory.rainBarrels < 1 }, "Sell back"))),
            null)),
        subTab === 'inputs' && (React.createElement("div", null,
            React.createElement("div", { style: styles.materialGroupLabel }, "Mulch & Ground Covers"),
            React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginBottom: 8 } }, "Spread on top of soil (Soil mode in the Yard). Cuts down weeds, helps beds hold moisture, and \u2014 for Shade Cloth especially \u2014 protects against heat wave stress."),
            React.createElement("div", { style: styles.shopGrid }, MULCH_TYPES.map((m) => {
                var _a;
                return (React.createElement("div", { key: m.id, style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 26 } }, m.icon || React.createElement(MulchSwatch, { mulchId: m.id, size: 24 })),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, m.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 44 } }, m.desc),
                    React.createElement("div", { style: { fontSize: 9, color: '#4A3728', marginBottom: 6 } },
                        "\u2212",
                        Math.round(m.weedReduction * 100),
                        "% weeds \u00B7 +",
                        Math.round(m.moistureBonus * 100),
                        "% moisture \u00B7 \u2212",
                        Math.round(m.heatProtection * 100),
                        "% heat wave stress"),
                    React.createElement(Stepper, { count: ((_a = inventory.mulch) === null || _a === void 0 ? void 0 : _a[m.id]) || 0, cost: m.cost, onAdd: () => buyMulch(m.id), onRemove: () => sellMulch(m.id), canAdd: cash >= m.cost })));
            })),
            React.createElement("div", { style: styles.materialGroupLabel }, "Fertilizer Ingredients"),
            React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginBottom: 8 } }, "Raw ingredients for homemade liquid fertilizers \u2014 brew them in the Start Indoor tab."),
            React.createElement("div", { style: styles.shopGrid },
                React.createElement("div", { style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 26 } }, EGGSHELL_ITEM.icon),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, EGGSHELL_ITEM.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 44 } }, EGGSHELL_ITEM.desc),
                    React.createElement(Stepper, { count: inventory.eggshells, cost: EGGSHELL_ITEM.cost, onAdd: buyEggshells, onRemove: sellEggshells, canAdd: cash >= EGGSHELL_ITEM.cost })),
                React.createElement("div", { style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 26 } }, BANANAPEEL_ITEM.icon),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, BANANAPEEL_ITEM.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 44 } }, BANANAPEEL_ITEM.desc),
                    React.createElement(Stepper, { count: inventory.bananapeels, cost: BANANAPEEL_ITEM.cost, onAdd: buyBananaPeels, onRemove: sellBananaPeels, canAdd: cash >= BANANAPEEL_ITEM.cost })),
                React.createElement("div", { style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 26 } }, COFFEEGROUNDS_ITEM.icon),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, COFFEEGROUNDS_ITEM.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 44 } }, COFFEEGROUNDS_ITEM.desc),
                    React.createElement(Stepper, { count: inventory.coffeegrounds, cost: COFFEEGROUNDS_ITEM.cost, onAdd: buyCoffeeGrounds, onRemove: sellCoffeeGrounds, canAdd: cash >= COFFEEGROUNDS_ITEM.cost })),
                React.createElement("div", { style: styles.shopCard },
                    React.createElement("div", { style: { fontSize: 26 } }, "\uD83D\uDFE9"),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, "Comfrey Leaves"),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 44 } }, "Not sold here \u2014 grow Comfrey and harvest it in the Yard to collect leaves."),
                    React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: '#4A3728' } },
                        "have: ",
                        inventory.comfreyleaves))),
            React.createElement("div", { style: styles.materialGroupLabel }, "Soil Additives"),
            React.createElement("div", { style: styles.shopGrid }, ADDITIVES.map((a) => (React.createElement("div", { key: a.id, style: styles.shopCard },
                React.createElement("div", { style: { fontSize: 24, display: 'flex', justifyContent: 'center' } }, a.id === 'sand' ? React.createElement(SandIcon, { size: 24 }) : a.id === 'woodash' ? React.createElement(AshIcon, { size: 24 }) : a.id === 'mushroomcompost' ? React.createElement(MushroomCompostIcon, { size: 24 }) : a.id === 'acidifier' ? React.createElement(AcidifierIcon, { size: 24 }) : a.icon),
                React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, a.name),
                React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0', minHeight: 32 } }, a.desc),
                React.createElement(Stepper, { count: inventory.additives[a.id], cost: a.cost, onAdd: () => buyAdditive(a.id), onRemove: () => sellAdditive(a.id), canAdd: cash >= a.cost }))))),
            null)),
        subTab === 'soil' && (React.createElement("div", { style: styles.shopGrid }, SOILS.map((s) => (React.createElement("div", { key: s.id, style: styles.shopCard },
            React.createElement("div", { style: { display: 'flex', justifyContent: 'center', marginBottom: 4 } },
                React.createElement(SoilIcon, { size: 24 })),
            React.createElement("div", { style: { fontWeight: 700, fontFamily: serif } }, s.name),
            React.createElement("div", { style: { fontSize: 11, color: '#6b5844', margin: '6px 0', minHeight: 40 } }, s.desc),
            React.createElement("div", { style: { fontSize: 10, color: '#4A3728', marginBottom: 8 } },
                Math.round(s.baseSuccess * 100),
                "% success"),
            React.createElement(Stepper, { count: inventory.soils[s.id], cost: s.cost, onAdd: () => buySoilBagShop(s.id), onRemove: () => sellSoilBagShop(s.id), canAdd: cash >= s.cost })))))),
        subTab === 'trays' && (React.createElement("div", { style: styles.shopGrid }, TRAY_SIZES.map((t) => (React.createElement("div", { key: t.id, style: styles.shopCard },
            React.createElement("div", { style: { display: 'flex', justifyContent: 'center' } },
                React.createElement(TrayIcon, { size: 26 })),
            React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } },
                t.slots,
                "-cell tray"),
            React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0' } },
                "$",
                (t.cost / t.slots).toFixed(2),
                "/cell"),
            React.createElement(Stepper, { count: inventory.emptyTrays[t.id] || 0, cost: t.cost, onAdd: () => buyTrayShop(t.id), onRemove: () => sellTrayShop(t.id), canAdd: cash >= t.cost })))))),
        (subTab === 'seeds' || subTab === 'plants') && (React.createElement("div", null,
            React.createElement("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                React.createElement("button", { onClick: () => setSelectedCategory(null), style: { ...styles.subTabBtn, padding: '6px 12px', fontSize: 11, ...(selectedCategory === null ? styles.subTabBtnActive : {}) } },
                    "All (",
                    PLANTS.length,
                    ")"),
                PLANT_CATEGORIES.map((c) => {
                    const count = PLANTS.filter((p) => p.category === c.id).length;
                    if (count === 0)
                        return null;
                    return (React.createElement("button", { key: c.id, onClick: () => setSelectedCategory(c.id), style: { ...styles.subTabBtn, padding: '6px 12px', fontSize: 11, ...(selectedCategory === c.id ? styles.subTabBtnActive : {}) } },
                        c.icon,
                        " ",
                        c.label,
                        " (",
                        count,
                        ")"));
                })),
            React.createElement("div", { style: styles.shopGrid }, PLANTS.filter((p) => !selectedCategory || p.category === selectedCategory).map((p) => {
                const growable = canGrowInZone(p, zone);
                const cost = subTab === 'seeds' ? p.seedCost : p.plantCost;
                const owned = subTab === 'seeds' ? inventory.seeds[p.id] || 0 : inventory.livePlants[p.id] || 0;
                return (React.createElement("div", { key: p.id, style: { ...styles.shopCard, opacity: 1, borderColor: growable ? undefined : '#C58A54' } },
                    subTab === 'seeds' ? React.createElement(SeedPacketIcon, { size: 52, title: `${p.name} seed packet` }) : React.createElement("div", { style: { fontSize: 26 } }, p.emoji),
                    React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, p.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '2px 0' } }, subTab === 'seeds' ? `${owned} seeds owned` : `${owned} owned`),
                    React.createElement("div", { style: { fontSize: 9, color: '#7A633F', lineHeight: 1.25, minHeight: 22, marginBottom: 3 } }, plantClimateSummary(p)),
                    p.coverBenefit && React.createElement("div", { style: { fontSize: 9, color: '#56704A', lineHeight: 1.25, marginBottom: 3 } }, p.coverBenefit),
                    seasonalFruitSummary(p) && React.createElement("div", { style: { fontSize: 9, color: '#7B4D79', lineHeight: 1.25, marginBottom: 3 } }, seasonalFruitSummary(p)),
                    React.createElement(Stepper, { count: owned, cost: cost, canAdd: cash >= cost, onAdd: () => (subTab === 'seeds' ? buySeedPacket(p) : buyLivePlant(p)), onRemove: () => (subTab === 'seeds' ? sellSeedPacket(p) : sellLivePlant(p)) }),
                    !growable && React.createElement("div", { style: { fontSize: 9, color: '#9A5527', fontWeight: 800, marginTop: 4 } }, "\uD83C\uDFE1 Greenhouse-only in this zone")));
            }))))));
}
function Stepper({ count, cost, onAdd, onRemove, canAdd }) {
    return (React.createElement("div", { style: styles.stepperRow },
        React.createElement("button", { style: styles.stepperBtnSmall, onClick: onRemove, disabled: count < 1 }, "\u2212"),
        React.createElement("div", { style: styles.stepperCountSmall },
            React.createElement("div", { style: { fontWeight: 700, fontSize: 14 } }, count),
            React.createElement("div", { style: { fontSize: 9, opacity: 0.6 } },
                "$",
                cost)),
        React.createElement("button", { style: styles.stepperBtnSmall, onClick: onAdd, disabled: !canAdd }, "+")));
}
// Small CSS-drawn dark soil/mulch texture swatch, used in place of an emoji since no emoji closely
// resembles crumbly dark soil. Layered radial gradients in brown tones mimic the chunky texture.
function SoilSwatch({ size = 20 }) {
    return (React.createElement("span", { style: {
            display: 'inline-block',
            width: size,
            height: size,
            borderRadius: 3,
            verticalAlign: 'middle',
            backgroundColor: '#2E2620',
            backgroundImage: [
                'radial-gradient(circle at 20% 30%, #4A3B2E 0 18%, transparent 19%)',
                'radial-gradient(circle at 55% 20%, #5C4A38 0 16%, transparent 17%)',
                'radial-gradient(circle at 80% 40%, #3A2F24 0 20%, transparent 21%)',
                'radial-gradient(circle at 30% 65%, #4A3B2E 0 17%, transparent 18%)',
                'radial-gradient(circle at 65% 70%, #5C4A38 0 19%, transparent 20%)',
                'radial-gradient(circle at 85% 85%, #3A2F24 0 15%, transparent 16%)',
                'radial-gradient(circle at 10% 85%, #4A3B2E 0 14%, transparent 15%)',
            ].join(', '),
            border: '1px solid #241C16',
        } }));
}
// Simple dark rust-colored circle used as the generic "Soil" icon (tabs, mode buttons, catalog).
function SoilIcon({ size = 20 }) {
    return (React.createElement("span", { style: {
            display: 'inline-block',
            width: size,
            height: size,
            borderRadius: '50%',
            verticalAlign: 'middle',
            background: 'radial-gradient(circle at 35% 30%, #8B4A2B, #6B3820 55%, #4E2A16 100%)',
            border: '1px solid #3A1F10',
        } }));
}
function SandIcon({ size = 20 }) {
    return (React.createElement("span", { style: {
            display: 'inline-block', width: size, height: size, borderRadius: '50%', verticalAlign: 'middle',
            background: 'radial-gradient(circle at 35% 30%, #E8D3A0, #D4B87C 55%, #BFA05F 100%)',
            border: '1px solid #A9895A',
        } }));
}
function AshIcon({ size = 20 }) {
    return (React.createElement("span", { style: {
            display: 'inline-block', width: size, height: size, borderRadius: '50%', verticalAlign: 'middle',
            background: 'radial-gradient(circle at 35% 30%, #C9C7C3, #A8A5A0 55%, #86837E 100%)',
            border: '1px solid #6B6863',
        } }));
}
// Simple colored swatches distinguishing mulch types that don't have a good matching emoji.
const MULCH_COLORS = {
    pinebark: ['#8B5A34', '#6B3F1F', '#4A2A14'],
    cedarmulch: ['#B5652E', '#8B4A1F', '#5F3212'],
    pineneedles: ['#C08A3E', '#96692A', '#6B4A1C'],
    straw: ['#E8CB7A', '#D4AF50', '#B08E35'],
    woodmulch: ['#9C7A52', '#7A5C3B', '#54402A'],
};
function MulchSwatch({ mulchId, size = 20 }) {
    const c = MULCH_COLORS[mulchId] || MULCH_COLORS.woodmulch;
    return (React.createElement("span", { style: {
            display: 'inline-block', width: size, height: size, borderRadius: '50%', verticalAlign: 'middle',
            background: `radial-gradient(circle at 35% 30%, ${c[0]}, ${c[1]} 55%, ${c[2]} 100%)`,
            border: `1px solid ${c[2]}`,
        } }));
}
function MushroomCompostIcon({ size = 20 }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24" },
        React.createElement("ellipse", { cx: 12, cy: 20, rx: 10, ry: 2.5, fill: "#3A2F24" }),
        React.createElement("path", { d: "M5 15 Q12 4 19 15 Q12 12 5 15 Z", fill: "#C9A876", stroke: "#8B7350", strokeWidth: 0.8 }),
        React.createElement("rect", { x: 10.5, y: 14, width: 3, height: 6, fill: "#E8D9BE" })));
}
function AcidifierIcon({ size = 20 }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24" },
        React.createElement("path", { d: "M9 2 h6 v3 h-6 Z", fill: "#6b5844" }),
        React.createElement("path", { d: "M8 5 h8 v3 l1.5 2 v11 a1.5 1.5 0 0 1 -1.5 1.5 h-8 a1.5 1.5 0 0 1 -1.5 -1.5 v-11 l1.5 -2 Z", fill: "#C1443C", stroke: "#8E2E28", strokeWidth: 0.8 }),
        React.createElement("rect", { x: 7.5, y: 13, width: 9, height: 5.5, fill: "#EDE6D6", opacity: 0.85 }),
        React.createElement("text", { x: 12, y: 17.5, fontSize: 4.5, textAnchor: "middle", fill: "#8E2E28", fontWeight: "bold" }, "pH\u2212")));
}
// Small object icons drawn as SVG shapes, replacing generic emoji that don't resemble the actual item.
function TrayIcon({ size = 22 }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24" },
        React.createElement("rect", { x: 2, y: 5, width: 20, height: 15, rx: 2, fill: "#3D2B1F", stroke: "#241C16", strokeWidth: 1 }),
        [0, 1, 2].map((row) => [0, 1, 2, 3].map((col) => (React.createElement("rect", { key: `${row}-${col}`, x: 4 + col * 4.6, y: 7 + row * 4.3, width: 3.4, height: 3.2, rx: 0.6, fill: "#241C16" }))))));
}
function AluminumIcon({ size = 22 }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24" },
        React.createElement("rect", { x: 2, y: 4, width: 20, height: 16, rx: 2, fill: "#C7CED4", stroke: "#7C868E", strokeWidth: 1 }),
        [0, 1, 2, 3, 4, 5].map((i) => (React.createElement("line", { key: i, x1: 2 + i * 3.4, y1: 4, x2: 2 + i * 3.4, y2: 20, stroke: "#9AA3AA", strokeWidth: 1.2 })))));
}
function CementBlockIcon({ size = 22 }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24" },
        React.createElement("rect", { x: 2, y: 5, width: 20, height: 14, rx: 1, fill: "#B0AEA8", stroke: "#8A8781", strokeWidth: 1 }),
        React.createElement("rect", { x: 5, y: 8, width: 6, height: 8, rx: 0.6, fill: "#98958E", stroke: "#7A7770", strokeWidth: 0.7 }),
        React.createElement("rect", { x: 13, y: 8, width: 6, height: 8, rx: 0.6, fill: "#98958E", stroke: "#7A7770", strokeWidth: 0.7 })));
}
function StickIcon({ size = 22 }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24" },
        React.createElement("line", { x1: 3, y1: 20, x2: 19, y2: 4, stroke: "#8B6B47", strokeWidth: 3.2, strokeLinecap: "round" }),
        React.createElement("line", { x1: 6, y1: 19, x2: 21, y2: 7, stroke: "#6E5236", strokeWidth: 2.6, strokeLinecap: "round", opacity: 0.85 }),
        React.createElement("line", { x1: 7, y1: 10, x2: 9, y2: 13, stroke: "#5A4128", strokeWidth: 1, strokeLinecap: "round" }),
        React.createElement("line", { x1: 13, y1: 7, x2: 15, y2: 10, stroke: "#5A4128", strokeWidth: 1, strokeLinecap: "round" })));
}
function PvcIcon({ size = 22 }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24" },
        React.createElement("rect", { x: 2, y: 9, width: 20, height: 7, rx: 3.5, fill: "#9AA0A6" }),
        React.createElement("rect", { x: 2, y: 10, width: 20, height: 5, rx: 2.5, fill: "#F2F1EC" }),
        React.createElement("ellipse", { cx: 4, cy: 12.5, rx: 2, ry: 3.5, fill: "#D9D6CF", stroke: "#9AA0A6", strokeWidth: 0.6 })));
}
function PlantFoodIcon({ size = 22 }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24" },
        React.createElement("rect", { x: 9, y: 2, width: 6, height: 3, rx: 1, fill: "#6b5844" }),
        React.createElement("path", { d: "M8 6 h8 v4 l2 3 v9 a1.5 1.5 0 0 1 -1.5 1.5 h-9 A1.5 1.5 0 0 1 6 22 v-9 l2 -3 Z", fill: "#5C7A4F", stroke: "#3D4F30", strokeWidth: 0.8 }),
        React.createElement("rect", { x: 8, y: 14, width: 8, height: 6, fill: "#EDE6D6", opacity: 0.85 }),
        React.createElement("text", { x: 12, y: 19, fontSize: 5, textAnchor: "middle", fill: "#3D4F30", fontWeight: "bold" }, "N-P-K")));
}
function ShovelIcon({ size = 22 }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24" },
        React.createElement("line", { x1: 15, y1: 2, x2: 7, y2: 14, stroke: "#8B5A2B", strokeWidth: 2.4, strokeLinecap: "round" }),
        React.createElement("path", { d: "M4 13 L9 10 L15 16 L11 20 A5 5 0 0 1 4 13 Z", fill: "#B8C0C8", stroke: "#7C868E", strokeWidth: 1 })));
}
function TillerIcon({ size = 22 }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24" },
        React.createElement("rect", { x: 9, y: 2, width: 4, height: 10, rx: 1, fill: "#4A3728" }),
        React.createElement("circle", { cx: 11, cy: 16, r: 3.4, fill: "none", stroke: "#7C868E", strokeWidth: 1.6 }),
        [0, 60, 120, 180, 240, 300].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x2 = 11 + Math.cos(rad) * 5.2, y2 = 16 + Math.sin(rad) * 5.2;
            return React.createElement("line", { key: deg, x1: 11, y1: 16, x2: x2, y2: y2, stroke: "#5C7A4F", strokeWidth: 1.4, strokeLinecap: "round" });
        })));
}
function ApronIcon({ size = 22 }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24" },
        React.createElement("path", { d: "M9 3 h6 v4 h-6 Z", fill: "#C1443C" }),
        React.createElement("path", { d: "M6 8 h12 l-1.5 13 a1.5 1.5 0 0 1 -1.5 1.3 h-6 a1.5 1.5 0 0 1 -1.5 -1.3 Z", fill: "#D9584F", stroke: "#8E2E28", strokeWidth: 0.8 }),
        React.createElement("rect", { x: 9, y: 14, width: 6, height: 4, rx: 0.6, fill: "#8E2E28", opacity: 0.5 }),
        React.createElement("path", { d: "M9 3 Q4 4 6 8", fill: "none", stroke: "#8E2E28", strokeWidth: 1.2 }),
        React.createElement("path", { d: "M15 3 Q20 4 18 8", fill: "none", stroke: "#8E2E28", strokeWidth: 1.2 })));
}
function HatIcon({ size = 22 }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24" },
        React.createElement("ellipse", { cx: 12, cy: 17, rx: 11, ry: 3, fill: "#D4B483", stroke: "#A9824F", strokeWidth: 0.8 }),
        React.createElement("path", { d: "M6 17 Q6 8 12 8 Q18 8 18 17 Z", fill: "#E3C89A", stroke: "#A9824F", strokeWidth: 0.8 }),
        React.createElement("rect", { x: 6, y: 14.5, width: 12, height: 2.4, rx: 1.2, fill: "#5C7A4F" })));
}
// Stylized front-facing bust portrait, built from simple vector shapes rather than photorealistic art.
// Skin tone fills the head/body, hairstyle picks a shape group, body type scales shoulder width.
// Hero illustration for the opening screen: a garden bed being watered, with a ladybug and seed packets,
// built in the same flat-vector style as the rest of the game's icons rather than a painterly stock look.
function SetupHeroIllustration() {
    return (React.createElement("svg", { viewBox: "0 0 400 170", width: "100%", height: "150", style: { display: 'block' } },
        React.createElement("circle", { cx: 358, cy: 30, r: 16, fill: "#E8C84A", opacity: 0.9 }),
        [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x1 = 358 + Math.cos(rad) * 21, y1 = 30 + Math.sin(rad) * 21;
            const x2 = 358 + Math.cos(rad) * 27, y2 = 30 + Math.sin(rad) * 27;
            return React.createElement("line", { key: deg, x1: x1, y1: y1, x2: x2, y2: y2, stroke: "#E8C84A", strokeWidth: 2.5, strokeLinecap: "round", opacity: 0.7 });
        }),
        React.createElement("g", { transform: "translate(150,10) rotate(-18)" },
            React.createElement("path", { d: "M10 18 Q10 6 24 6 L52 6 Q64 6 64 18 L64 36 Q64 46 52 46 L18 46 Q10 46 10 36 Z", fill: "#5C9BD5", stroke: "#3D6E96", strokeWidth: 1.5 }),
            React.createElement("path", { d: "M64 22 L88 16 Q96 14 96 20 Q96 26 88 25 L66 30 Z", fill: "#5C9BD5", stroke: "#3D6E96", strokeWidth: 1.5 }),
            React.createElement("circle", { cx: 92, cy: 19, r: 2.6, fill: "#3D6E96" }),
            React.createElement("path", { d: "M24 6 Q30 -8 44 -6 Q52 -5 50 6", fill: "none", stroke: "#3D6E96", strokeWidth: 2.5 })),
        React.createElement("g", { stroke: "#8FB6DE", strokeWidth: 2, strokeLinecap: "round", opacity: 0.85 },
            React.createElement("line", { x1: 248, y1: 38, x2: 244, y2: 50 }),
            React.createElement("line", { x1: 256, y1: 40, x2: 253, y2: 54 }),
            React.createElement("line", { x1: 264, y1: 38, x2: 262, y2: 50 })),
        React.createElement("rect", { x: 30, y: 90, width: 220, height: 60, rx: 3, fill: "#8B5A2B", stroke: "#5A3A1B", strokeWidth: 2 }),
        React.createElement("rect", { x: 36, y: 96, width: 208, height: 48, rx: 2, fill: "#4A3320" }),
        [0, 1, 2].map((row) => [0, 1, 2, 3, 4, 5].map((col) => (React.createElement("circle", { key: `${row}-${col}`, cx: 44 + col * 34 + (row % 2) * 8, cy: 104 + row * 14, r: 1.4, fill: "#3A281A", opacity: 0.6 })))),
        React.createElement("g", null,
            [60, 68, 76].map((x, i) => (React.createElement("ellipse", { key: i, cx: x, cy: 98, rx: 6, ry: 9, fill: "#5C7A4F", transform: `rotate(${-20 + i * 20} ${x} 98)` }))),
            React.createElement("line", { x1: 120, y1: 98, x2: 120, y2: 78, stroke: "#5C7A4F", strokeWidth: 2 }),
            React.createElement("ellipse", { cx: 113, cy: 84, rx: 7, ry: 4, fill: "#5C7A4F", transform: "rotate(-25 113 84)" }),
            React.createElement("ellipse", { cx: 127, cy: 84, rx: 7, ry: 4, fill: "#5C7A4F", transform: "rotate(25 127 84)" }),
            React.createElement("circle", { cx: 120, cy: 80, r: 5, fill: "#C1443C", stroke: "#8E2E28", strokeWidth: 0.8 }),
            React.createElement("circle", { cx: 112, cy: 90, r: 4, fill: "#C1443C", stroke: "#8E2E28", strokeWidth: 0.8 }),
            [160, 170, 180].map((x, i) => (React.createElement("g", { key: i },
                React.createElement("line", { x1: x, y1: 98, x2: x - 3, y2: 82, stroke: "#5C7A4F", strokeWidth: 1.6 }),
                React.createElement("line", { x1: x, y1: 98, x2: x + 3, y2: 82, stroke: "#5C7A4F", strokeWidth: 1.6 }),
                React.createElement("line", { x1: x, y1: 98, x2: x, y2: 80, stroke: "#5C7A4F", strokeWidth: 1.6 })))),
            [210, 224].map((x, i) => (React.createElement("circle", { key: i, cx: x, cy: 96, r: 9, fill: "none", stroke: "#5C7A4F", strokeWidth: 2, opacity: 0.9 })))),
        React.createElement("g", { transform: "translate(78,86)" },
            React.createElement("ellipse", { cx: 0, cy: 0, rx: 7, ry: 5.5, fill: "#C1443C", stroke: "#3D2B1F", strokeWidth: 1 }),
            React.createElement("line", { x1: 0, y1: -5.5, x2: 0, y2: 5.5, stroke: "#3D2B1F", strokeWidth: 0.8 }),
            React.createElement("circle", { cx: -3, cy: -1.5, r: 1.1, fill: "#3D2B1F" }),
            React.createElement("circle", { cx: 3, cy: -1.5, r: 1.1, fill: "#3D2B1F" }),
            React.createElement("circle", { cx: -3, cy: 2, r: 1.1, fill: "#3D2B1F" }),
            React.createElement("circle", { cx: 3, cy: 2, r: 1.1, fill: "#3D2B1F" }),
            React.createElement("circle", { cx: 0, cy: -5.8, r: 2.6, fill: "#3D2B1F" })),
        React.createElement("g", { transform: "translate(266,108) rotate(-6)" },
            React.createElement("rect", { x: 0, y: 0, width: 26, height: 34, rx: 2, fill: "#EDE6D6", stroke: "#4A3728", strokeWidth: 1.5 }),
            React.createElement("rect", { x: 0, y: 0, width: 26, height: 11, rx: 2, fill: "#5C7A4F" }),
            React.createElement("circle", { cx: 13, cy: 24, r: 4, fill: "#C1443C", opacity: 0.85 })),
        React.createElement("g", { transform: "translate(292,116) rotate(8)" },
            React.createElement("rect", { x: 0, y: 0, width: 22, height: 29, rx: 2, fill: "#EDE6D6", stroke: "#4A3728", strokeWidth: 1.5 }),
            React.createElement("rect", { x: 0, y: 0, width: 22, height: 9, rx: 2, fill: "#C16B3D" }),
            React.createElement("circle", { cx: 11, cy: 20, r: 3.4, fill: "#E8C84A", opacity: 0.85 }))));
}
function AvatarPortrait({ avatar, size = 200, equippedClothes = {} }) {
    const body = getAvatarBody(avatar);
    const hair = getAvatarHair(avatar);
    const eyes = getAvatarEyes(avatar);
    const lips = getAvatarLips(avatar);
    const beard = getAvatarBeard(avatar);
    const mustache = getAvatarMustache(avatar);
    const shirt = getAvatarShirt(avatar);
    const overalls = getAvatarOveralls(avatar);
    const hat = getAvatarHat(avatar);
    const frameHeight = Math.round(size * 2.2);
    const layerStyle = {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        objectPosition: 'center top',
        pointerEvents: 'none',
    };
    return (React.createElement("div", { style: { width: size, height: frameHeight, margin: '0 auto', position: 'relative', overflow: 'hidden', borderRadius: 8, background: '#fffaf1', border: '1.5px solid #C9B98F' } },
        (shirt === null || shirt === void 0 ? void 0 : shirt.src) && React.createElement("img", { src: shirt.src, alt: shirt.label, style: layerStyle }),
        (body === null || body === void 0 ? void 0 : body.src) && React.createElement("img", { src: body.src, alt: body.label, style: layerStyle }),
        (overalls === null || overalls === void 0 ? void 0 : overalls.src) && React.createElement("img", { src: overalls.src, alt: overalls.label, style: layerStyle }),
        (eyes === null || eyes === void 0 ? void 0 : eyes.src) && React.createElement("img", { src: eyes.src, alt: eyes.label, style: layerStyle }),
        (lips === null || lips === void 0 ? void 0 : lips.src) && React.createElement("img", { src: lips.src, alt: lips.label, style: layerStyle }),
        (hair === null || hair === void 0 ? void 0 : hair.src) && React.createElement("img", { src: hair.src, alt: hair.label, style: layerStyle }),
        (mustache === null || mustache === void 0 ? void 0 : mustache.src) && React.createElement("img", { src: mustache.src, alt: mustache.label, style: layerStyle }),
        (beard === null || beard === void 0 ? void 0 : beard.src) && React.createElement("img", { src: beard.src, alt: beard.label, style: layerStyle }),
        (hat === null || hat === void 0 ? void 0 : hat.src) && React.createElement("img", { src: hat.src, alt: hat.label, style: layerStyle }),
        !(hat === null || hat === void 0 ? void 0 : hat.src) && equippedClothes.hat && (React.createElement("div", { style: { position: 'absolute', left: '24%', right: '24%', top: '1%', display: 'flex', justifyContent: 'center', pointerEvents: 'none' } },
            React.createElement(HatIcon, { size: Math.max(36, Math.round(size * 0.42)) }))),
        equippedClothes.apron && (React.createElement("div", { style: { position: 'absolute', left: '34%', right: '34%', top: '38%', height: '16%', background: 'rgba(217,88,79,0.88)', border: '2px solid #8E2E28', borderRadius: 8, pointerEvents: 'none' } })),
        equippedClothes.gloves && (React.createElement(React.Fragment, null,
            React.createElement("div", { style: { position: 'absolute', left: '16%', top: '43%', width: '10%', height: '4%', background: '#5C7A4F', borderRadius: 10, opacity: 0.95, pointerEvents: 'none' } }),
            React.createElement("div", { style: { position: 'absolute', right: '14%', top: '62%', width: '10%', height: '4%', background: '#5C7A4F', borderRadius: 10, opacity: 0.95, pointerEvents: 'none' } })))));
}
function GreenhouseModal({ greenhouse, inventory, treeContainers = [], selectedPlant, selectedPlantId, setSelectedPlantId, selectedSource, setSelectedSource, onPlant, onWater, onHarvest, onClear, onAddDecor, onRemoveDecor, onToggleControl, onAddKratky, onPlantKratky, onRefillKratky, onHarvestKratky, onClearKratky, zone, season, todayWeather, onMoveTreeOut, onOpenTree, onClose }) {
    var _a, _b;
    const type = GREENHOUSE_TYPES.find((g) => g.id === greenhouse.typeId) || GREENHOUSE_TYPES[0];
    const plants = greenhouse.plants || [];
    const decor = greenhouse.decor || [];
    const hydroponics = greenhouse.hydroponics || [];
    const controls = { heaterOn: false, fanOn: false, lightsOn: false, ...(greenhouse.controls || {}) };
    const climateBand = greenhouseTemperatureBand(greenhouse, season, todayWeather);
    const tenderPlants = PLANTS.filter((p) => p.frostTender || p.minTemp === 'warm');
    return (React.createElement("div", { style: { position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(35,45,39,.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }, onClick: onClose },
        React.createElement("div", { style: { width: 'min(1120px, 96vw)', maxHeight: '92vh', overflowY: 'auto', background: '#F2F0E4', border: '4px solid #4F7C68', borderRadius: 14, boxShadow: '0 18px 50px rgba(0,0,0,.35)' }, onClick: (e) => e.stopPropagation() },
            React.createElement("div", { style: { padding: '16px 18px', background: 'linear-gradient(120deg,#D7EEE4,#F7F1D9)', borderBottom: '2px solid #A8B89A', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontSize: 24, fontWeight: 900, color: '#28483B' } },
                        "\uD83C\uDFE1 ",
                        type.name),
                    React.createElement("div", { style: { fontSize: 12, color: '#5F6B5D' } }, "Protected growing space \u00B7 frost-tender crops can grow here when outdoor conditions are too cold.")),
                React.createElement("button", { style: styles.backBtn, onClick: onClose }, "\u2715 Close")),
            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(270px, .8fr)', gap: 14, padding: 16 } },
                React.createElement("div", null,
                    React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 } },
                        React.createElement("div", { style: styles.panelTitle }, "Growing Benches"),
                        React.createElement("button", { style: styles.buyBtn, onClick: () => onWater(greenhouse.id) }, "\uD83D\uDCA7 Water All")),
                    React.createElement("div", { style: { padding: 10, borderRadius: 8, background: 'rgba(255,255,255,.5)', border: '1.5px solid #A8B89A', marginBottom: 10 } },
                        React.createElement("div", { style: { fontSize: 11, fontWeight: 800, color: '#3D2B1F', marginBottom: 6 } }, "Crop to plant"),
                        React.createElement("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                            React.createElement("select", { value: selectedPlantId || '', onChange: (e) => setSelectedPlantId(e.target.value || null), style: { flex: 1, minWidth: 180, padding: 8 } },
                                React.createElement("option", { value: "" }, "Choose crop\u2026"),
                                PLANTS.map((p) => React.createElement("option", { key: p.id, value: p.id },
                                    p.emoji,
                                    " ",
                                    p.name,
                                    !canGrowInZone(p, zone) ? ' · greenhouse-only here' : p.frostTender ? ' · frost tender' : ''))),
                            React.createElement("button", { onClick: () => setSelectedSource('seed'), style: { ...styles.modeBtn, ...(selectedSource === 'seed' ? styles.modeBtnActive : {}), display: 'inline-flex', alignItems: 'center', gap: 6 } },
                                React.createElement(SeedPacketIcon, { size: 20 }),
                                "Seed (",
                                selectedPlant ? ((_a = inventory.seeds) === null || _a === void 0 ? void 0 : _a[selectedPlant.id]) || 0 : 0,
                                ")"),
                            React.createElement("button", { onClick: () => setSelectedSource('plant'), style: { ...styles.modeBtn, ...(selectedSource === 'plant' ? styles.modeBtnActive : {}) } },
                                "Live plant (",
                                selectedPlant ? ((_b = inventory.livePlants) === null || _b === void 0 ? void 0 : _b[selectedPlant.id]) || 0 : 0,
                                ")")),
                        React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginTop: 6 } },
                            "Warm-season examples: ",
                            tenderPlants.slice(0, 8).map((p) => p.name).join(', '),
                            ".")),
                    React.createElement("div", { style: { display: 'grid', gridTemplateColumns: `repeat(${type.plantSlots >= 20 ? 6 : type.plantSlots >= 10 ? 4 : 3}, minmax(0,1fr))`, gap: 8 } }, Array.from({ length: type.plantSlots }).map((_, i) => {
                        const p = plants[i];
                        const tier = p && !p.dead ? harvestQualityTier(p.age, p.daysToMature) : null;
                        return (React.createElement("div", { key: i, style: { minHeight: 104, border: '2px solid #8FAF92', borderRadius: 8, background: p ? '#E3EBD9' : '#D8C7A5', padding: 7, position: 'relative', textAlign: 'center' } }, !p ? (React.createElement("button", { style: { width: '100%', height: '88px', border: '1px dashed #7E684B', borderRadius: 6, background: 'rgba(255,255,255,.25)', cursor: 'pointer', fontWeight: 800, color: '#5B4938' }, onClick: () => onPlant(greenhouse.id, i) }, "\uFF0B Plant")) : (React.createElement(React.Fragment, null,
                            React.createElement("div", { style: { fontSize: 28 } }, p.dead ? '💀' : p.emoji),
                            React.createElement("div", { style: { fontSize: 11, fontWeight: 800 } }, p.name),
                            React.createElement("div", { style: { fontSize: 9, color: '#5F4B3B' } },
                                "Day ",
                                Math.floor(p.age),
                                "/",
                                p.daysToMature,
                                " \u00B7 health ",
                                Math.round(p.health),
                                "%"),
                            tier && !p.dead && React.createElement("button", { style: { ...styles.buyBtn, padding: '4px 6px', fontSize: 9, marginTop: 4 }, onClick: () => onHarvest(greenhouse.id, i) }, "Harvest !"),
                            p.dead && React.createElement("button", { style: { ...styles.sellBtn, padding: '4px 6px', fontSize: 9, marginTop: 4 }, onClick: () => onClear(greenhouse.id, i) }, "Clear"),
                            React.createElement("div", { style: { height: 5, background: '#D5CCB8', borderRadius: 4, overflow: 'hidden', marginTop: 5 } },
                                React.createElement("div", { style: { height: '100%', width: `${Math.max(0, p.health)}%`, background: p.health > 60 ? '#5C7A4F' : p.health > 30 ? '#C16B3D' : '#A33' } }))))));
                    }))),
                React.createElement("div", { style: { gridColumn: '1 / -1', marginTop: 4, padding: 12, background: '#E7F2F1', border: '1.5px solid #7FA7A2', borderRadius: 8 } },
                    React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' } },
                        React.createElement("div", null,
                            React.createElement("div", { style: { fontWeight: 900, fontSize: 15, color: '#28483B' } }, "🫙 Kratky Hydroponics"),
                            React.createElement("div", { style: { fontSize: 10, color: '#526B67', maxWidth: 650 } }, "Passive hydroponics: no pump or electricity. The nutrient level should fall as plants drink, creating an air gap for upper roots. Best for leafy greens, herbs, bok choy, and strawberries.")),
                        React.createElement("button", { style: styles.buyBtn, onClick: () => onAddKratky(greenhouse.id) }, "Add Kratky Kit — $", KRATKY_SYSTEM.cost)),
                    hydroponics.length === 0 ? React.createElement("div", { style: { fontSize: 11, color: '#6b5844', fontStyle: 'italic', marginTop: 9 } }, "No hydroponic systems installed yet.") :
                    React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 9, marginTop: 10 } }, hydroponics.map((h, hi) => {
                        const reservoir = Math.round(h.reservoir ?? 100);
                        const airGap = 100 - reservoir;
                        return React.createElement("div", { key: h.id, style: { background: '#fff', border: '1.5px solid #8FB4B0', borderRadius: 9, padding: 10 } },
                            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 12 } }, React.createElement("span", null, "🫙 Kratky Reservoir ", hi + 1), React.createElement("span", null, reservoir, "% solution")),
                            React.createElement("div", { style: { height: 52, border: '2px solid #708C88', borderRadius: '5px 5px 10px 10px', position: 'relative', overflow: 'hidden', background: '#F6FBFA', margin: '7px 0' } },
                                React.createElement("div", { style: { position: 'absolute', left: 0, right: 0, bottom: 0, height: reservoir + '%', background: 'rgba(91,167,173,.55)' } }),
                                React.createElement("div", { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 } }, airGap, "% air gap · nutrients ", Math.round(h.nutrients ?? 100), "%")),
                            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 } }, (h.plants || []).map((p, i) => React.createElement("div", { key: i, style: { minHeight: 72, border: '1px solid #A7BEB9', borderRadius: 6, padding: 4, textAlign: 'center', background: '#F4F8F5' } },
                                !p ? React.createElement("button", { style: { width: '100%', height: 60, border: '1px dashed #78928D', background: 'transparent', cursor: 'pointer', fontSize: 9 }, onClick: () => onPlantKratky(greenhouse.id, h.id, i) }, "+ Net cup") :
                                React.createElement(React.Fragment, null,
                                    React.createElement("div", { style: { fontSize: 21 } }, p.dead ? '💀' : p.emoji),
                                    React.createElement("div", { style: { fontSize: 8, fontWeight: 800 } }, p.name),
                                    React.createElement("div", { style: { fontSize: 7 } }, "Day ", Math.floor(p.age), "/", p.daysToMature),
                                    p.age >= p.daysToMature && !p.dead && React.createElement("button", { style: { ...styles.buyBtn, padding: '2px 3px', fontSize: 7 }, onClick: () => onHarvestKratky(greenhouse.id, h.id, i) }, "Harvest"),
                                    p.dead && React.createElement("button", { style: { ...styles.sellBtn, padding: '2px 3px', fontSize: 7 }, onClick: () => onClearKratky(greenhouse.id, h.id, i) }, "Clear"))))),
                            React.createElement("button", { style: { ...styles.modeBtn, marginTop: 7, fontSize: 9 }, onClick: () => onRefillKratky(greenhouse.id, h.id), disabled: reservoir > 45 }, reservoir > 45 ? "Air gap developing — don't top off" : "Refresh nutrients to ~70%"));
                    }))),
                React.createElement("div", { style: { gridColumn: '1 / -1', marginTop: 4, padding: 12, background: '#E9F0E4', border: '1.5px solid #9CB18B', borderRadius: 8 } },
                    React.createElement("div", { style: { fontWeight: 900, fontSize: 15, color: '#28483B' } }, "\uD83E\uDEB4 Overwintering Tree Containers"),
                    React.createElement("div", { style: { fontSize: 10, color: '#5F6B5D', margin: '3px 0 8px' } },
                        "Large tropical/subtropical pots moved into this greenhouse are protected from outdoor frost. Capacity: ",
                        greenhouseTreeCapacity(greenhouse.typeId),
                        "."),
                    treeContainers.filter((c) => c.greenhouseId === greenhouse.id).length === 0 ? React.createElement("div", { style: { fontSize: 11, color: '#6b5844', fontStyle: 'italic' } }, "No large tree containers inside.") : React.createElement("div", { style: { display: 'flex', gap: 7, flexWrap: 'wrap' } }, treeContainers.filter((c) => c.greenhouseId === greenhouse.id).map((c) => { var _a, _b; return React.createElement("div", { key: c.id, style: { background: '#fff', border: '1px solid #B8A98A', borderRadius: 7, padding: 8, minWidth: 150 } },
                        React.createElement("div", { style: { fontWeight: 800 } },
                            ((_a = c.plant) === null || _a === void 0 ? void 0 : _a.emoji) || '🪴',
                            " ",
                            ((_b = c.plant) === null || _b === void 0 ? void 0 : _b.name) || 'Empty Tree Pot'),
                        React.createElement("div", { style: { fontSize: 9, color: '#6b5844' } }, c.plant ? `health ${Math.round(c.plant.health || 0)}%` : 'empty'),
                        React.createElement("div", { style: { display: 'flex', gap: 4, marginTop: 5 } },
                            React.createElement("button", { style: { ...styles.buyBtn, padding: '4px 6px', fontSize: 9 }, onClick: () => onOpenTree(c.id) }, "Open"),
                            React.createElement("button", { style: { ...styles.sellBtn, padding: '4px 6px', fontSize: 9 }, onClick: () => onMoveTreeOut(c.id) }, "Move Outside"))); }))),
                React.createElement("div", { style: { gridColumn: '1 / -1', padding: 12, background: '#EEF6F0', border: '1.5px solid #8FAF92', borderRadius: 8 } },
                    React.createElement("div", { style: { fontWeight: 900, fontSize: 15, color: '#28483B' } }, "\uD83C\uDF21\uFE0F Greenhouse Climate Controls"),
                    React.createElement("div", { style: { fontSize: 11, color: '#5F6B5D', margin: '4px 0 9px' } },
                        "Current temperature band: ",
                        React.createElement("strong", null, climateBand.toUpperCase()),
                        ". Out-of-zone crops grow slowly or lose health when the greenhouse does not match their temperature needs. Winter out-of-zone crops also benefit from active grow lights."),
                    React.createElement("div", { style: { display: 'flex', gap: 7, flexWrap: 'wrap' } },
                        React.createElement("button", { disabled: !decor.includes('heater'), onClick: () => onToggleControl(greenhouse.id, 'heaterOn'), style: { ...styles.modeBtn, ...(controls.heaterOn ? styles.modeBtnActive : {}), opacity: decor.includes('heater') ? 1 : .45 } },
                            "\u2668\uFE0F Heater ",
                            controls.heaterOn ? 'ON' : 'OFF'),
                        React.createElement("button", { disabled: !decor.includes('ventfan'), onClick: () => onToggleControl(greenhouse.id, 'fanOn'), style: { ...styles.modeBtn, ...(controls.fanOn ? styles.modeBtnActive : {}), opacity: decor.includes('ventfan') ? 1 : .45 } },
                            "\uD83C\uDF00 Vent Fan ",
                            controls.fanOn ? 'ON' : 'OFF'),
                        React.createElement("button", { disabled: !decor.includes('growlight'), onClick: () => onToggleControl(greenhouse.id, 'lightsOn'), style: { ...styles.modeBtn, ...(controls.lightsOn ? styles.modeBtnActive : {}), opacity: decor.includes('growlight') ? 1 : .45 } },
                            "\uD83D\uDCA1 Grow Lights ",
                            controls.lightsOn ? 'ON' : 'OFF')),
                    React.createElement("div", { style: { fontSize: 9, color: '#6b5844', marginTop: 6 } }, "Install the matching equipment under Greenhouse Decor before its control can be switched on.")),
                React.createElement("div", null,
                    React.createElement("div", { style: styles.panelTitle }, "Decorate the Greenhouse"),
                    React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginBottom: 8 } },
                        decor.length,
                        "/",
                        type.decorSlots,
                        " decoration spots used. Click owned items to place them."),
                    React.createElement("div", { style: { minHeight: 160, padding: 12, border: '2px solid #8FAF92', borderRadius: 10, background: 'linear-gradient(#E8F4EC,#DCE8D7)', marginBottom: 10 } }, decor.length === 0 ? React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "Your greenhouse is functional but still bare.") : (React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 } }, decor.map((id, i) => { const d = GREENHOUSE_DECOR.find((x) => x.id === id); return d ? React.createElement("button", { key: `${id}-${i}`, onClick: () => onRemoveDecor(greenhouse.id, i), title: "Click to return to inventory", style: { border: '1.5px solid #A8B89A', borderRadius: 7, background: '#fff', padding: 8, cursor: 'pointer' } },
                        React.createElement("div", { style: { fontSize: 24 } }, d.icon),
                        React.createElement("div", { style: { fontSize: 10, fontWeight: 800 } }, d.name)) : null; })))),
                    React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, GREENHOUSE_DECOR.map((d) => {
                        var _a;
                        const count = ((_a = inventory.greenhouseDecor) === null || _a === void 0 ? void 0 : _a[d.id]) || 0;
                        return React.createElement("button", { key: d.id, disabled: count < 1 || decor.length >= type.decorSlots, onClick: () => onAddDecor(greenhouse.id, d.id), style: { ...styles.seedRow, opacity: count < 1 ? .45 : 1 } },
                            React.createElement("span", { style: { fontSize: 20 } }, d.icon),
                            React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                React.createElement("div", { style: { fontWeight: 800, fontSize: 11 } }, d.name),
                                React.createElement("div", { style: { fontSize: 9, opacity: .75 } },
                                    count,
                                    " owned \u00B7 ",
                                    d.desc)));
                    })),
                    React.createElement("div", { style: { marginTop: 12, padding: 10, background: '#FFF8E8', border: '1px solid #D6C5A6', borderRadius: 7, fontSize: 10, color: '#5F4B3B', lineHeight: 1.45 } },
                        React.createElement("strong", null, "Greenhouse climate:"),
                        " outdoor rain does not water plants under cover. Installed equipment only affects climate while its control is switched on. Out-of-zone crops depend on matching their temperature needs; winter out-of-zone crops are also stressed without active grow lights."))))));
}
function PlanterBucketModal({ container, inventory, onPlant, onWater, onHarvest, onClear, onClose }) {
    var _a, _b, _c;
    const type = PLANTER_BUCKET_TYPES.find((x) => x.id === container.typeId) || PLANTER_BUCKET_TYPES[0];
    const p = container.plant;
    const eligible = PLANTS.filter((x) => planterGallonsNeeded(x) <= type.gallons);
    const [plantId, setPlantId] = useState(((_a = eligible[0]) === null || _a === void 0 ? void 0 : _a.id) || '');
    const [source, setSource] = useState('plant');
    const tier = p && !p.dead ? harvestQualityTier(p.age, p.daysToMature) : null;
    return React.createElement("div", { style: { position: 'fixed', inset: 0, zIndex: 2650, background: 'rgba(35,45,39,.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }, onClick: onClose },
        React.createElement("div", { style: { width: 'min(640px,94vw)', maxHeight: '90vh', overflowY: 'auto', background: '#F7F1E4', border: '4px solid #7D7365', borderRadius: 14, padding: 16 }, onClick: (e) => e.stopPropagation() },
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between' } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontSize: 22, fontWeight: 900 } },
                        "\uD83E\uDEA3 ",
                        type.name),
                    React.createElement("div", { style: { fontSize: 11, color: '#6b5844' } },
                        type.gallons,
                        " gallons soil capacity")),
                React.createElement("button", { style: styles.backBtn, onClick: onClose }, "\u2715 Close")),
            !p ? React.createElement("div", { style: { marginTop: 14 } },
                React.createElement("select", { value: plantId, onChange: (e) => setPlantId(e.target.value), style: { width: '100%', padding: 8 } }, eligible.map((x) => React.createElement("option", { key: x.id, value: x.id },
                    x.emoji,
                    " ",
                    x.name,
                    " \u00B7 needs ~",
                    planterGallonsNeeded(x),
                    " gal"))),
                React.createElement("div", { style: { display: 'flex', gap: 6, marginTop: 8 } },
                    React.createElement("button", { style: { ...styles.modeBtn, ...(source === 'seed' ? styles.modeBtnActive : {}) }, onClick: () => setSource('seed') },
                        "Seed (",
                        ((_b = inventory.seeds) === null || _b === void 0 ? void 0 : _b[plantId]) || 0,
                        ")"),
                    React.createElement("button", { style: { ...styles.modeBtn, ...(source === 'plant' ? styles.modeBtnActive : {}) }, onClick: () => setSource('plant') },
                        "Live plant (",
                        ((_c = inventory.livePlants) === null || _c === void 0 ? void 0 : _c[plantId]) || 0,
                        ")"),
                    React.createElement("button", { style: { ...styles.buyBtn, flex: 1 }, onClick: () => onPlant(container.id, plantId, source) }, "Plant"))) : React.createElement("div", { style: { marginTop: 14, textAlign: 'center', padding: 12, background: '#EEF4E8', borderRadius: 8 } },
                React.createElement("div", { style: { fontSize: 48 } }, p.dead ? '💀' : p.emoji),
                React.createElement("div", { style: { fontWeight: 900, fontSize: 18 } }, p.name),
                React.createElement("div", { style: { fontSize: 10, color: '#6b5844' } }, seasonalFruitSummary(p)),
                React.createElement("div", { style: { fontSize: 11, color: '#6b5844' } },
                    "Day ",
                    Math.floor(p.age),
                    "/",
                    p.daysToMature,
                    " \u00B7 health ",
                    Math.round(p.health || 0),
                    "%"),
                React.createElement("div", { style: { display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 } },
                    React.createElement("button", { style: styles.buyBtn, onClick: () => onWater(container.id) }, "\uD83D\uDCA7 Water"),
                    tier && React.createElement("button", { style: styles.buyBtn, onClick: () => onHarvest(container.id) }, "\uD83E\uDDFA Harvest"),
                    React.createElement("button", { style: styles.sellBtn, onClick: () => onClear(container.id) }, "Clear")))));
}
function TreeContainerModal({ container, inventory, greenhouses, onPlant, onWater, onHarvest, onClear, onMoveIn, onMoveOut, onClose }) {
    var _a, _b, _c, _d, _e;
    const type = TREE_CONTAINER_TYPES.find((t) => t.id === container.typeId) || TREE_CONTAINER_TYPES[0];
    const p = container.plant;
    const eligible = PLANTS.filter((x) => x.movableTree);
    const [plantId, setPlantId] = useState(((_a = eligible[0]) === null || _a === void 0 ? void 0 : _a.id) || '');
    const [source, setSource] = useState('plant');
    const tier = p && !p.dead ? harvestQualityTier(p.age, p.daysToMature) : null;
    const currentGreenhouse = greenhouses.find((g) => g.id === container.greenhouseId);
    return (React.createElement("div", { style: { position: 'fixed', inset: 0, zIndex: 2600, background: 'rgba(35,45,39,.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }, onClick: onClose },
        React.createElement("div", { style: { width: 'min(680px,95vw)', maxHeight: '90vh', overflowY: 'auto', background: '#F7F1E4', border: '4px solid #8B5A2B', borderRadius: 14, padding: 16 }, onClick: (e) => e.stopPropagation() },
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontSize: 22, fontWeight: 900 } },
                        "\uD83E\uDEB4 ",
                        type.name),
                    React.createElement("div", { style: { fontSize: 11, color: '#6b5844' } }, currentGreenhouse ? `Inside ${((_b = GREENHOUSE_TYPES.find((g) => g.id === currentGreenhouse.typeId)) === null || _b === void 0 ? void 0 : _b.name) || 'greenhouse'} · protected from outdoor frost` : 'Outside in the yard · move indoors before frost if the tree is cold-sensitive')),
                React.createElement("button", { style: styles.backBtn, onClick: onClose }, "\u2715 Close")),
            !p ? React.createElement("div", { style: { marginTop: 14, padding: 12, border: '1.5px solid #C9B98F', borderRadius: 8 } },
                React.createElement("div", { style: { fontWeight: 800, marginBottom: 7 } }, "Plant a heat-loving tree"),
                React.createElement("select", { value: plantId, onChange: (e) => setPlantId(e.target.value), style: { width: '100%', padding: 8 } }, eligible.map((x) => React.createElement("option", { key: x.id, value: x.id },
                    x.emoji,
                    " ",
                    x.name))),
                React.createElement("div", { style: { display: 'flex', gap: 6, marginTop: 8 } },
                    React.createElement("button", { style: { ...styles.modeBtn, ...(source === 'seed' ? styles.modeBtnActive : {}) }, onClick: () => setSource('seed') },
                        "Seed (",
                        ((_c = inventory.seeds) === null || _c === void 0 ? void 0 : _c[plantId]) || 0,
                        ")"),
                    React.createElement("button", { style: { ...styles.modeBtn, ...(source === 'plant' ? styles.modeBtnActive : {}) }, onClick: () => setSource('plant') },
                        "Live plant (",
                        ((_d = inventory.livePlants) === null || _d === void 0 ? void 0 : _d[plantId]) || 0,
                        ")"),
                    React.createElement("button", { style: { ...styles.buyBtn, flex: 1 }, onClick: () => onPlant(container.id, plantId, source) }, "Plant"))) : React.createElement("div", { style: { marginTop: 14, padding: 14, background: '#EEF4E8', border: '1.5px solid #9CB18B', borderRadius: 8, textAlign: 'center' } },
                React.createElement("div", { style: { fontSize: 48 } }, p.dead ? '💀' : p.emoji),
                React.createElement("div", { style: { fontSize: 18, fontWeight: 900 } }, p.name),
                React.createElement("div", { style: { fontSize: 11, color: '#5F4B3B' } },
                    "Day ",
                    Math.floor(p.age),
                    "/",
                    p.daysToMature,
                    " \u00B7 health ",
                    Math.round(p.health || 0),
                    "%",
                    p.pest ? ` · ${((_e = PESTS[p.pest]) === null || _e === void 0 ? void 0 : _e.name) || 'pest'}` : ''),
                React.createElement("div", { style: { display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap', marginTop: 10 } },
                    React.createElement("button", { style: styles.buyBtn, onClick: () => onWater(container.id) }, "\uD83D\uDCA7 Water"),
                    tier && !p.dead && React.createElement("button", { style: styles.buyBtn, onClick: () => onHarvest(container.id) }, "\uD83E\uDDFA Harvest"),
                    React.createElement("button", { style: styles.sellBtn, onClick: () => onClear(container.id) }, "Clear Tree"))),
            React.createElement("div", { style: { marginTop: 14 } },
                React.createElement("div", { style: { fontWeight: 900, marginBottom: 6 } }, "Seasonal movement"),
                container.greenhouseId ? React.createElement("button", { style: { ...styles.buyBtn, width: '100%' }, onClick: () => onMoveOut(container.id) }, "\u2600\uFE0F Move Back Outside") : greenhouses.length ? React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, greenhouses.map((g) => { const gt = GREENHOUSE_TYPES.find((x) => x.id === g.typeId); return React.createElement("button", { key: g.id, style: styles.buyBtn, onClick: () => onMoveIn(container.id, g.id) },
                    "\uD83C\uDFE1 Move into ",
                    (gt === null || gt === void 0 ? void 0 : gt.name) || 'Greenhouse',
                    " (",
                    greenhouseTreeCapacity(g.typeId),
                    " large-pot capacity)"); })) : React.createElement("div", { style: { fontSize: 11, color: '#6b5844' } }, "Place a greenhouse first if you need winter protection.")))));
}
function PondModal({ pond, inventory, onStockFish, onRemoveFish, onClose }) {
    const type = POND_TYPES.find((p) => p.id === pond.typeId) || POND_TYPES[0];
    const total = pondFishCount(pond);
    const control = pondMosquitoControl(pond);
    const riskLabel = control >= .65 ? 'Low' : control >= .3 ? 'Moderate' : 'High';
    return (React.createElement("div", { style: { position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(24,47,52,.66)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }, onClick: onClose },
        React.createElement("div", { style: { width: 'min(760px,94vw)', maxHeight: '90vh', overflowY: 'auto', background: '#EFF5F2', border: '4px solid #477985', borderRadius: 16, boxShadow: '0 18px 50px rgba(0,0,0,.35)' }, onClick: (e) => e.stopPropagation() },
            React.createElement("div", { style: { padding: '16px 18px', background: 'linear-gradient(120deg,#CDECF0,#E9F2D5)', borderBottom: '2px solid #8FB4B8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontSize: 24, fontWeight: 900, color: '#244F59' } },
                        "\uD83D\uDCA7 ",
                        type.name),
                    React.createElement("div", { style: { fontSize: 12, color: '#527078' } },
                        total,
                        "/",
                        type.fishSlots,
                        " fish \u00B7 mosquito-larvae risk: ",
                        React.createElement("strong", null, riskLabel))),
                React.createElement("button", { style: styles.backBtn, onClick: onClose }, "\u2715 Close")),
            React.createElement("div", { style: { padding: 16 } },
                React.createElement("div", { style: { padding: 14, border: '2px solid #8FB4B8', borderRadius: 12, background: 'radial-gradient(ellipse,#91D1DB,#5BA6B4)', color: '#fff', textAlign: 'center', marginBottom: 14 } },
                    React.createElement("div", { style: { fontSize: 44 } }, "\uD83D\uDCA7 \uD83D\uDC1F \uD83C\uDF3F"),
                    React.createElement("div", { style: { fontWeight: 900 } },
                        "Mosquito control: ",
                        Math.round(control * 100),
                        "%"),
                    React.createElement("div", { style: { fontSize: 11, marginTop: 4 } }, "Mosquitofish are the strongest larvae-eaters here. Goldfish may eat larvae; koi are primarily ornamental.")),
                React.createElement("div", { style: styles.panelTitle }, "Stock the Pond"),
                React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 9 } }, POND_FISH.map((f) => { var _a, _b; const inPond = ((_a = pond.fish) === null || _a === void 0 ? void 0 : _a[f.id]) || 0; const owned = ((_b = inventory.pondFish) === null || _b === void 0 ? void 0 : _b[f.id]) || 0; return React.createElement("div", { key: f.id, style: { border: '1.5px solid #9CB8B3', borderRadius: 8, background: '#fff', padding: 10 } },
                    React.createElement("div", { style: { fontSize: 26 } }, f.icon),
                    React.createElement("div", { style: { fontWeight: 900, fontSize: 13 } }, f.name),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', minHeight: 44, margin: '4px 0' } }, f.desc),
                    React.createElement("div", { style: { fontSize: 10, fontWeight: 800 } },
                        "In pond: ",
                        inPond,
                        " \u00B7 inventory: ",
                        owned),
                    React.createElement("div", { style: { display: 'flex', gap: 6, marginTop: 7 } },
                        React.createElement("button", { style: { ...styles.buyBtn, flex: 1, padding: '5px 6px' }, disabled: owned < 1 || total >= type.fishSlots || (type.w * type.h) < (f.minPondArea || 1), title: (type.w * type.h) < (f.minPondArea || 1) ? `${f.name} need a larger pond` : '', onClick: () => onStockFish(pond.id, f.id) }, "Add"),
                        React.createElement("button", { style: { ...styles.sellBtn, flex: 1, padding: '5px 6px' }, disabled: inPond < 1, onClick: () => onRemoveFish(pond.id, f.id) }, "Remove"))); })),
                React.createElement("div", { style: { marginTop: 12, padding: 10, background: '#FFF8E8', border: '1px solid #D6C5A6', borderRadius: 7, fontSize: 10, color: '#5F4B3B', lineHeight: 1.45 } },
                    React.createElement("strong", null, "Ecology note:"),
                    " fish can help with mosquito larvae, but ponds also benefit from moving water, predators such as dragonflies, and avoiding stagnant nutrient-heavy conditions. Mosquitofish can be invasive outside their native range.")))));
}
function CharacterTab({ avatar, inventory, equippedClothes, setEquippedClothes, showAvatarInYard, setShowAvatarInYard, onUpdateGardener }) {
    return (React.createElement("div", { style: styles.mainAreaSingle },
        React.createElement("div", { style: { display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' } },
            React.createElement("div", { style: { textAlign: 'center' } },
                React.createElement(AvatarPortrait, { avatar: avatar, size: 220, equippedClothes: equippedClothes }),
                React.createElement("button", { onClick: () => setShowAvatarInYard((v) => !v), style: { ...styles.zoneBtn, marginTop: 10, padding: '8px 14px', fontSize: 12, ...(showAvatarInYard ? styles.zoneBtnActive : {}) } }, showAvatarInYard ? '✓ Showing in Yard' : 'Show Me in the Yard'),
                React.createElement("button", { onClick: onUpdateGardener, style: { ...styles.startBtn, marginTop: 10, padding: '10px 14px', fontSize: 12 } }, "Update My Gardener")),
            React.createElement("div", { style: { flex: '1 1 260px', minWidth: 240 } },
                React.createElement("div", { style: styles.panelTitle }, "Garden Clothes"),
                React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginBottom: 10 } }, "Equip anything you own to see it on your gardener. Effects (like the Apron's extra basket slots) apply whether equipped or not \u2014 this is just how they look."),
                React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, CLOTHES.map((c) => {
                    const owned = inventory.clothes[c.id] > 0;
                    const worn = !!equippedClothes[c.id];
                    return (React.createElement("div", { key: c.id, style: { ...styles.shopCard, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 } },
                        React.createElement("div", { style: { flexShrink: 0 } }, c.id === 'apron' ? React.createElement(ApronIcon, { size: 28 }) : c.id === 'hat' ? React.createElement(HatIcon, { size: 28 }) : React.createElement("span", { style: { fontSize: 26 } }, c.icon)),
                        React.createElement("div", { style: { flex: 1 } },
                            React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, c.name),
                            React.createElement("div", { style: { fontSize: 10, color: '#6b5844' } }, owned ? (worn ? 'Worn' : 'Owned — not worn') : 'Not owned yet')),
                        React.createElement("button", { style: worn ? styles.sellBtn : styles.buyBtn, disabled: !owned, onClick: () => setEquippedClothes((prev) => ({ ...prev, [c.id]: !prev[c.id] })) }, worn ? 'Take Off' : 'Wear')));
                })),
                CLOTHES.every((c) => inventory.clothes[c.id] < 1) && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic', marginTop: 10 } }, "You don't own any garden clothes yet \u2014 buy some at the Plant Nursery (Gear tab)."))))));
}
function ExtensionHelpTab({ cash, playerCity, soilTestRequests, masterGardenerRequests, submitExtensionSoilTest, askMasterGardener, }) {
    const [extensionSampleSource, setExtensionSampleSource] = useState('yard');
    const [masterGardenerTopic, setMasterGardenerTopic] = useState('diagnose');
    return (React.createElement("div", { style: styles.mainAreaSingle },
        React.createElement("div", { style: { maxWidth: 960, margin: '0 auto' } },
            React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 } },
                React.createElement("div", { style: { fontSize: 32 } }, "\uD83C\uDFDB\uFE0F"),
                React.createElement("div", null,
                    React.createElement("div", { style: styles.panelTitle }, "University Cooperative Extension"),
                    React.createElement("div", { style: { fontSize: 12, color: '#6b5844', lineHeight: 1.5 } },
                        "Use the same two kinds of help real gardeners rely on: send a representative soil sample to the Extension lab, or ask a trained Master Gardener volunteer for research-based troubleshooting help.",
                        playerCity ? ` Your garden profile is set to ${playerCity}.` : ''))),
            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' } },
                React.createElement("div", { style: { background: '#F7F2E7', border: '1.5px solid #C9B98F', borderRadius: 8, padding: 16 } },
                    React.createElement("div", { style: { fontSize: 17, fontWeight: 800, color: '#4A3728', marginBottom: 4 } }, "\uD83E\uDDEA Send a Soil Sample"),
                    React.createElement("div", { style: { fontSize: 11, color: '#6b5844', lineHeight: 1.5, marginBottom: 12 } },
                        "Cost: $",
                        EXTENSION_SOIL_TEST_COST,
                        ". Turnaround: ",
                        EXTENSION_SOIL_TEST_DAYS,
                        " in-game days. The simulated report checks pH, fertility, organic matter, drainage and water-holding capacity, then recommends amendments available in Plot & Season."),
                    React.createElement("div", { style: { fontSize: 11, fontWeight: 800, color: '#4A3728', marginBottom: 6 } }, "Sample area"),
                    React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 7 } }, EXTENSION_SAMPLE_SOURCES.map((source) => (React.createElement("button", { key: source.id, onClick: () => setExtensionSampleSource(source.id), style: {
                            ...styles.seedRow,
                            ...(extensionSampleSource === source.id ? styles.seedRowActive : {}),
                            textAlign: 'left', padding: 10,
                        } },
                        React.createElement("div", { style: { fontWeight: 800, fontSize: 12 } }, source.label),
                        React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginTop: 2 } }, source.desc))))),
                    React.createElement("button", { style: { ...styles.buyBtn, width: '100%', marginTop: 12, opacity: cash >= EXTENSION_SOIL_TEST_COST ? 1 : 0.5 }, disabled: cash < EXTENSION_SOIL_TEST_COST, onClick: () => submitExtensionSoilTest(extensionSampleSource) },
                        "\uD83D\uDCE6 Collect & Send Sample \u2014 $",
                        EXTENSION_SOIL_TEST_COST)),
                React.createElement("div", { style: { background: '#F7F2E7', border: '1.5px solid #C9B98F', borderRadius: 8, padding: 16 } },
                    React.createElement("div", { style: { fontSize: 17, fontWeight: 800, color: '#4A3728', marginBottom: 4 } }, "\uD83E\uDDD1\uD83C\uDFFD\u200D\uD83C\uDF3E Ask a Master Gardener"),
                    React.createElement("div", { style: { fontSize: 11, color: '#6b5844', lineHeight: 1.5, marginBottom: 12 } }, "Free. A volunteer reviews a snapshot of what is actually happening in your garden and replies the next in-game day."),
                    React.createElement("select", { value: masterGardenerTopic, onChange: (e) => setMasterGardenerTopic(e.target.value), style: {
                            width: '100%', padding: '10px 9px', borderRadius: 5, border: '1.5px solid #B8A98A',
                            fontFamily: sans, fontSize: 12, background: '#fff', color: '#3D2B1F',
                        } }, MASTER_GARDENER_TOPICS.map((topic) => React.createElement("option", { key: topic.id, value: topic.id }, topic.label))),
                    React.createElement("button", { style: { ...styles.startBtn, width: '100%', marginTop: 12 }, onClick: () => askMasterGardener(masterGardenerTopic) }, "\uD83D\uDCE8 Send Question"),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginTop: 8 } }, "The Master Gardener does not magically cure a plant. The response points you toward the likely cause and the next action to try."))),
            React.createElement("div", { style: { marginTop: 18 } },
                React.createElement("div", { style: { ...styles.panelTitle, marginBottom: 8 } }, "\uD83D\uDCEC Extension Mailbox"),
                soilTestRequests.length === 0 && masterGardenerRequests.length === 0 && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic', padding: 14, background: '#F7F2E7', border: '1px solid #D6C5A6', borderRadius: 6 } }, "No submissions yet. Soil-test reports and Master Gardener replies will appear here.")),
                React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                    soilTestRequests.map((r) => (React.createElement("div", { key: r.id, style: { background: '#fffaf1', border: '1.5px solid #C9B98F', borderRadius: 7, padding: 13 } },
                        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' } },
                            React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: '#4A3728' } },
                                "\uD83E\uDDEA Soil Test \u2014 ",
                                r.sourceLabel),
                            React.createElement("div", { style: { fontSize: 11, fontWeight: 800, color: r.status === 'ready' ? '#4F7A3C' : '#9A6A27' } }, r.status === 'ready' ? '✓ REPORT READY' : `LAB: ${r.daysRemaining} day${r.daysRemaining === 1 ? '' : 's'} remaining`)),
                        r.status === 'ready' && r.report && (React.createElement("div", { style: { marginTop: 10 } },
                            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(108px, 1fr))', gap: 7, marginBottom: 10 } }, [
                                ['pH', r.report.ph], ['Nitrogen', extensionLevelLabel(r.report.nitrogen)], ['Phosphorus', extensionLevelLabel(r.report.phosphorus)],
                                ['Potassium', extensionLevelLabel(r.report.potassium)], ['Organic Matter', extensionLevelLabel(r.report.organicMatter)],
                                ['Drainage', extensionLevelLabel(r.report.aeration)],
                            ].map(([label, value]) => (React.createElement("div", { key: label, style: { background: '#F7F2E7', borderRadius: 5, padding: '8px 7px', textAlign: 'center' } },
                                React.createElement("div", { style: { fontSize: 9, color: '#6b5844' } }, label),
                                React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: '#4A3728', marginTop: 2 } }, value))))),
                            React.createElement("div", { style: { fontSize: 11, fontWeight: 800, color: '#4A3728', marginBottom: 5 } }, "Extension recommendations"),
                            React.createElement("ul", { style: { margin: 0, paddingLeft: 18, color: '#5A4637', fontSize: 11, lineHeight: 1.55 } }, r.report.recommendations.map((rec, idx) => React.createElement("li", { key: idx }, rec)))))))),
                    masterGardenerRequests.map((r) => (React.createElement("div", { key: r.id, style: { background: '#fffaf1', border: '1.5px solid #9DB48A', borderRadius: 7, padding: 13 } },
                        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' } },
                            React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: '#4A3728' } },
                                "\uD83E\uDDD1\uD83C\uDFFD\u200D\uD83C\uDF3E Master Gardener \u2014 ",
                                r.topicLabel),
                            React.createElement("div", { style: { fontSize: 11, fontWeight: 800, color: r.status === 'ready' ? '#4F7A3C' : '#9A6A27' } }, r.status === 'ready' ? '✓ REPLY RECEIVED' : `WAITING: ${r.daysRemaining} day${r.daysRemaining === 1 ? '' : 's'}`)),
                        r.status === 'ready' && r.response && (React.createElement("div", { style: { marginTop: 9 } },
                            React.createElement("div", { style: { fontSize: 12, fontWeight: 800, color: '#3F6734', marginBottom: 5 } }, r.response.headline),
                            React.createElement("ul", { style: { margin: 0, paddingLeft: 18, color: '#5A4637', fontSize: 11, lineHeight: 1.55 } }, r.response.bullets.map((tip, idx) => React.createElement("li", { key: idx }, tip)))))))))))));
}
function StartIndoorTab({ trays, inventory, zone, selectedPlant, selectedPlantId, setSelectedPlantId, placeEmptyTrayOnTable, fillPlacedTray, plantTrayCell, clearTrayCell, deleteTray, beginTransplant, log, mixBoostedSoil, coldStratBatches, startStratification, collectStratifiedSeed, compostBatches, startCompostBatch, addToCompostBatch, collectCompost, fertilizerBatches, startFertilizerBatch, collectFertilizerBatch, selectedLightSource, setSelectedLightSource, indoorSubTab, setIndoorSubTab, openTrayId, setOpenTrayId, setSoilHealthOpen, }) {
    var _a;
    const subTabs = [
        { id: 'table', label: 'View Table', icon: '🗂️' },
        { id: 'soil', label: 'Make Soil', icon: null },
        { id: 'stratify', label: 'Cold Stratification', icon: '❄️' },
        { id: 'compost', label: 'Compost', icon: '🪱' },
        { id: 'fertilizer', label: 'Fertilizer Brewing', icon: '🧪' },
        { id: 'germinate', label: 'Heat/Light Germination', icon: '💡' },
    ];
    const openTray = trays.find((t) => t.tid === openTrayId) || null;
    // ---------- Drag-and-drop soil mixing station ----------
    const [dragItem, setDragItem] = useState(null); // { kind: 'soil'|'additive', id, x, y }
    const [mixStation, setMixStation] = useState({ soilId: null, additives: [] });
    const [mixFeedback, setMixFeedback] = useState(null);
    const dropZoneRef = useRef(null);
    function dragXY(e) {
        if (e.touches && e.touches.length > 0)
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (e.changedTouches && e.changedTouches.length > 0)
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    }
    const handleDragMove = useCallback((e) => {
        if (e.cancelable)
            e.preventDefault();
        const { x, y } = dragXY(e);
        setDragItem((prev) => (prev ? { ...prev, x, y } : prev));
    }, []);
    const handleDragEnd = useCallback((e) => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
        const { x, y } = dragXY(e);
        setDragItem((current) => {
            if (current && dropZoneRef.current) {
                const rect = dropZoneRef.current.getBoundingClientRect();
                if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                    if (current.kind === 'soil') {
                        setMixStation((m) => ({ ...m, soilId: current.id }));
                    }
                    else {
                        setMixStation((m) => {
                            if (m.additives.includes(current.id))
                                return m;
                            return { ...m, additives: [...m.additives, current.id] };
                        });
                    }
                }
            }
            return null;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleDragMove]);
    function startDragItem(kind, id, e) {
        if (e.cancelable)
            e.preventDefault();
        const { x, y } = dragXY(e);
        setDragItem({ kind, id, x, y });
        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('touchmove', handleDragMove, { passive: false });
        window.addEventListener('touchend', handleDragEnd);
    }
    function removeFromStation(kind, id) {
        if (kind === 'soil')
            setMixStation((m) => ({ ...m, soilId: null }));
        else
            setMixStation((m) => ({ ...m, additives: m.additives.filter((a) => a !== id) }));
    }
    // Live blend preview: starts from the base soil's real stats, then applies every additive currently
    // in the station cumulatively, clamped 0-100. Recomputes on every add/remove.
    function computeStationBlend() {
        if (!mixStation.soilId)
            return null;
        const base = SOILS.find((s) => s.id === mixStation.soilId);
        const clamp = (v) => Math.max(0, Math.min(100, v));
        const blend = {
            aeration: base.aeration, moistureRetention: base.moistureRetention,
            nitrogen: base.nitrogen, phosphorus: base.phosphorus, potassium: base.potassium,
        };
        mixStation.additives.forEach((aid) => {
            const a = ADDITIVES.find((x) => x.id === aid);
            if (!a)
                return;
            blend.aeration = clamp(blend.aeration + a.aerationEffect);
            blend.moistureRetention = clamp(blend.moistureRetention + a.moistureEffect);
            blend.nitrogen = clamp(blend.nitrogen + a.nitrogenEffect);
            blend.phosphorus = clamp(blend.phosphorus + a.phosphorusEffect);
            blend.potassium = clamp(blend.potassium + a.potassiumEffect);
        });
        return blend;
    }
    function tryMixStation() {
        if (!mixStation.soilId) {
            setMixFeedback('Drag a soil bag into the station first.');
            return;
        }
        if (mixStation.additives.length === 0) {
            setMixFeedback('Drag at least 1 amendment in too — an unmixed bag has nothing to boost.');
            return;
        }
        const s = SOILS.find((x) => x.id === mixStation.soilId);
        const names = mixStation.additives.map((aid) => { var _a; return (_a = ADDITIVES.find((a) => a.id === aid)) === null || _a === void 0 ? void 0 : _a.name; }).join(' + ');
        mixBoostedSoil(s.id, mixStation.additives);
        setMixStation({ soilId: null, additives: [] });
        setMixFeedback(`✅ Mixed a boosted bag of ${s.name} with ${names}!`);
    }
    return (React.createElement("div", { style: styles.mainAreaSingle },
        React.createElement("div", { style: styles.subTabRow }, subTabs.map((s) => (React.createElement("button", { key: s.id, onClick: () => setIndoorSubTab(s.id), style: { ...styles.subTabBtn, ...(indoorSubTab === s.id ? styles.subTabBtnActive : {}) } },
            s.icon ? s.icon : React.createElement(SoilSwatch, { size: 14 }),
            " ",
            s.label)))),
        indoorSubTab === 'table' && !openTray && (React.createElement("div", { style: styles.mainArea },
            React.createElement("div", { style: styles.yardPanel },
                React.createElement("div", { style: styles.panelTitle }, "The Table"),
                React.createElement("div", { style: styles.tableSurface },
                    trays.length === 0 && React.createElement("div", { style: { padding: 20, color: '#EDE6D6', fontStyle: 'italic', fontSize: 13 } }, "No trays on the table yet. Place one from the sidebar."),
                    React.createElement("div", { style: styles.tableGrid }, trays.map((tray) => {
                        const filled = tray.cells.filter((c) => c).length;
                        return (React.createElement("div", { key: tray.tid, style: styles.trayThumb, onClick: () => setOpenTrayId(tray.tid) },
                            React.createElement("div", { style: { display: 'flex', justifyContent: 'center' } },
                                React.createElement(TrayIcon, { size: 22 })),
                            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: '#EDE6D6' } },
                                tray.size,
                                "-cell"),
                            React.createElement("div", { style: { fontSize: 9, color: tray.soilId ? '#B8D8B8' : '#E8968A' } }, tray.soilId ? `${filled}/${tray.size} planted` : 'needs soil')));
                    }))),
                React.createElement("div", { style: styles.hint }, "Click a tray to open it and add seeds. Place new trays from the sidebar.")),
            React.createElement("div", { style: styles.sidebar },
                React.createElement("div", { style: styles.shopPanel },
                    React.createElement("div", { style: styles.panelTitle }, "Place a Tray"),
                    React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                        TRAY_SIZES.filter((t) => (inventory.emptyTrays[t.id] || 0) > 0).map((t) => (React.createElement("button", { key: t.id, style: styles.seedRow, onClick: () => placeEmptyTrayOnTable(t.id) },
                            React.createElement("span", { style: { flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 700 } },
                                t.slots,
                                "-cell tray"),
                            React.createElement("span", { style: { fontSize: 11, opacity: 0.7 } },
                                inventory.emptyTrays[t.id],
                                " owned")))),
                        TRAY_SIZES.every((t) => (inventory.emptyTrays[t.id] || 0) === 0) && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "No trays owned yet \u2014 buy some at the Plant Nursery.")))),
                React.createElement("div", { style: styles.shopPanel },
                    React.createElement("div", { style: styles.panelTitle }, "Your Seeds"),
                    React.createElement("div", { style: styles.seedList },
                        PLANTS.filter((p) => (inventory.seeds[p.id] || 0) > 0 || (inventory.strattedSeeds[p.id] || 0) > 0).map((p) => (React.createElement("div", { key: p.id, style: styles.seedRow },
                            React.createElement(SeedPacketIcon, { size: 30, title: `${p.name} seed packet` }),
                            React.createElement("span", { style: { flex: 1, marginLeft: 8, fontSize: 12 } },
                                React.createElement("div", { style: { fontWeight: 700 } },
                                    p.name,
                                    p.stratDays > 0 ? ' 🧊' : ''),
                                React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } }, p.stratDays > 0
                                    ? `${inventory.strattedSeeds[p.id] || 0} ready to germinate · ${inventory.seeds[p.id] || 0} raw seed${(inventory.seeds[p.id] || 0) === 1 ? '' : 's'} not yet stratified`
                                    : `${inventory.seeds[p.id]} seed${inventory.seeds[p.id] === 1 ? '' : 's'}`))))),
                        PLANTS.every((p) => (inventory.seeds[p.id] || 0) === 0 && (inventory.strattedSeeds[p.id] || 0) === 0) && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "No seeds owned yet \u2014 buy some at the Plant Nursery."))),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginTop: 8 } }, "Open a tray (place one, then click it) to actually plant these seeds. \uD83E\uDDCA = needs Cold Stratification first."))))),
        indoorSubTab === 'table' && openTray && (React.createElement("div", { style: styles.mainArea },
            React.createElement("div", { style: styles.yardPanel },
                React.createElement("button", { style: styles.backLink, onClick: () => setOpenTrayId(null) }, "\u2190 Back to Table"),
                React.createElement("div", { style: styles.trayBlock },
                    React.createElement("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
                        React.createElement("div", { style: styles.trayLabel },
                            openTray.size,
                            "-Cell Tray ",
                            openTray.soilId ? `· ${SOILS.find((s) => s.id === openTray.soilId).name}${openTray.boosted ? ' (boosted)' : ''}` : '· no soil yet'),
                        React.createElement("button", { style: styles.deleteTrayBtn, onClick: () => { deleteTray(openTray.tid); setOpenTrayId(null); }, title: "Remove this tray" }, "\u2715 Remove Tray")),
                    !openTray.soilId ? (React.createElement("div", { style: { padding: 12 } },
                        React.createElement("div", { style: { fontSize: 12, color: '#EDE6D6', marginBottom: 8 } }, "Pick a soil to fill this tray:"),
                        React.createElement("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, SOILS.map((s) => (React.createElement(React.Fragment, { key: s.id },
                            React.createElement("button", { style: styles.fillSoilBtn, disabled: inventory.soils[s.id] < 1, onClick: () => fillPlacedTray(openTray.tid, s.id, false) },
                                s.name,
                                " (",
                                inventory.soils[s.id],
                                ")"),
                            React.createElement("button", { style: styles.fillSoilBtn, disabled: inventory.boostedSoils[s.id] < 1, onClick: () => fillPlacedTray(openTray.tid, s.id, true) },
                                "Boosted ",
                                s.name,
                                " (",
                                inventory.boostedSoils[s.id],
                                ")"))))))) : (React.createElement(React.Fragment, null,
                        (() => {
                            const cols = openTray.size <= 4 ? 2 : openTray.size <= 12 ? 4 : openTray.size <= 32 ? 8 : 12;
                            return (React.createElement("div", { style: { ...styles.trayGrid, gridTemplateColumns: `repeat(${cols}, 1fr)` } }, openTray.cells.map((cell, i) => (React.createElement("div", { key: i, onClick: () => ((cell === null || cell === void 0 ? void 0 : cell.ready) ? beginTransplant(openTray, i) : (cell === null || cell === void 0 ? void 0 : cell.failed) ? clearTrayCell(openTray, i) : cell ? undefined : plantTrayCell(openTray, i)), style: { ...styles.trayCell, ...((cell === null || cell === void 0 ? void 0 : cell.failed) ? styles.trayCellFailed : {}), ...((cell === null || cell === void 0 ? void 0 : cell.ready) ? styles.trayCellReady : {}) }, title: (cell === null || cell === void 0 ? void 0 : cell.failed) ? 'This seed failed to germinate — tap to clear and try again' : undefined },
                                cell ? (cell.failed ? '✕' : cell.ready ? '🪴' : cell.plant.emoji) : React.createElement("span", { style: { opacity: 0.2, fontSize: 10 } }, "+"),
                                cell && !cell.ready && (React.createElement("button", { style: styles.trayCellDeleteBtn, onClick: (e) => { e.stopPropagation(); clearTrayCell(openTray, i); }, title: "Remove this cell" }, "\u2715")))))));
                        })(),
                        React.createElement("div", { style: styles.hint }, selectedPlant ? `Selected: ${selectedPlant.emoji} ${selectedPlant.name} — tap empty cells to plant it.` : 'Pick a seed on the right, then tap tray cells.'))))),
            React.createElement("div", { style: styles.sidebar },
                !selectedLightSource && (React.createElement("div", { style: styles.warnBanner }, "Pick a light source below \u2014 required before starting any seeds.")),
                React.createElement("div", { style: styles.shopPanel },
                    React.createElement("div", { style: styles.panelTitle }, "Light Source"),
                    React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, LIGHT_SOURCES.map((l) => (React.createElement("button", { key: l.id, onClick: () => setSelectedLightSource(l.id), style: { ...styles.seedRow, ...(selectedLightSource === l.id ? styles.seedRowActive : {}) } },
                        React.createElement("span", { style: { fontSize: 18 } }, l.icon),
                        React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                            React.createElement("div", { style: { fontWeight: 700, fontSize: 12 } }, l.name),
                            React.createElement("div", { style: { fontSize: 9, opacity: 0.7 } }, l.desc))))))),
                React.createElement("div", { style: styles.shopPanel },
                    React.createElement("div", { style: styles.panelTitle }, "Seed to Plant"),
                    React.createElement("div", { style: styles.seedList },
                        PLANTS.filter((p) => (inventory.seeds[p.id] || 0) > 0 || (inventory.strattedSeeds[p.id] || 0) > 0).map((p) => {
                            const growable = canGrowInZone(p, zone);
                            const needsStrat = p.stratDays > 0;
                            const stratReady = inventory.strattedSeeds[p.id] || 0;
                            const rawSeeds = inventory.seeds[p.id] || 0;
                            const usable = needsStrat ? stratReady > 0 : rawSeeds > 0;
                            const canSelect = usable;
                            let subtext;
                            if (needsStrat) {
                                subtext = stratReady > 0 ? `${stratReady} ready to plant` : `${rawSeeds} seed${rawSeeds === 1 ? '' : 's'} — needs Cold Stratification first`;
                            }
                            else {
                                subtext = `${rawSeeds} ready to plant`;
                            }
                            return (React.createElement("button", { key: p.id, onClick: () => canSelect && setSelectedPlantId(p.id), disabled: !canSelect, style: { ...styles.seedRow, ...(selectedPlantId === p.id ? styles.seedRowActive : {}), opacity: canSelect ? 1 : 0.45 }, title: !usable ? 'Not ready to plant yet' : !growable ? `${p.name} is greenhouse-only in ${zone.name}; you can still start the seed indoors` : undefined },
                                React.createElement(SeedPacketIcon, { size: 32, title: `${p.name} seed packet` }),
                                React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                    React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } },
                                        p.name,
                                        needsStrat ? ' 🧊' : ''),
                                    React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } }, subtext))));
                        }),
                        PLANTS.every((p) => (inventory.seeds[p.id] || 0) === 0 && (inventory.strattedSeeds[p.id] || 0) === 0) && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "No seeds owned yet \u2014 buy some at the Plant Nursery."))))))),
        indoorSubTab === 'soil' && (React.createElement("div", { style: styles.mainAreaSingle },
            React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                React.createElement(SoilSwatch, { size: 28 }),
                React.createElement("p", { style: { fontSize: 12, color: '#6b5844', margin: 0 } }, "Drag a base soil and any amendments you want into the Mixing Station \u2014 any combination works, and the health bars update live so you can see exactly what each one changes. Vermiculite + Perlite are the classic pick for germination soils; Manure + Coconut Coir for ground soils \u2014 but nothing stops you from experimenting.")),
            React.createElement("button", { style: { ...styles.backBtn, marginBottom: 14 }, onClick: () => setSoilHealthOpen(true) }, "\uD83D\uDCCA Soil Health Guide"),
            React.createElement("div", { style: { display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' } },
                React.createElement("div", { ref: dropZoneRef, "data-testid": "mixing-station", style: {
                        width: 220, minHeight: 220, border: '3px dashed #8B5A2B', borderRadius: '50%',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: mixStation.soilId || mixStation.additives.length ? '#EDE6D6' : '#F7F2E7',
                        flexShrink: 0, padding: 16, textAlign: 'center',
                    } },
                    React.createElement("div", { style: { fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#4A3728' } }, "Mixing Station"),
                    !mixStation.soilId && mixStation.additives.length === 0 && (React.createElement("div", { style: { fontSize: 11, color: '#6b5844' } }, "Drag a soil bag and any amendments here")),
                    mixStation.soilId && (React.createElement("div", { onClick: () => removeFromStation('soil', mixStation.soilId), style: { cursor: 'pointer', marginBottom: 6 }, title: "Tap to remove" },
                        React.createElement(SoilSwatch, { size: 28 }),
                        React.createElement("div", { style: { fontSize: 10 } },
                            SOILS.find((s) => s.id === mixStation.soilId).name,
                            " \u2715"))),
                    React.createElement("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 190 } }, mixStation.additives.map((aid) => {
                        const a = ADDITIVES.find((x) => x.id === aid);
                        return (React.createElement("div", { key: aid, onClick: () => removeFromStation('additive', aid), style: { cursor: 'pointer' }, title: "Tap to remove" },
                            React.createElement("div", { style: { fontSize: 20 } }, a.icon),
                            React.createElement("div", { style: { fontSize: 9 } },
                                a.name,
                                " \u2715")));
                    })),
                    React.createElement("button", { style: { ...styles.buyBtn, marginTop: 10, opacity: mixStation.soilId && mixStation.additives.length > 0 ? 1 : 0.5 }, onClick: tryMixStation, disabled: !mixStation.soilId || mixStation.additives.length === 0 }, "Mix Now"),
                    mixFeedback && React.createElement("div", { style: { fontSize: 10, color: '#4A3728', marginTop: 6, maxWidth: 180 } }, mixFeedback)),
                mixStation.soilId && (() => {
                    const blend = computeStationBlend();
                    return (React.createElement("div", { style: { flex: '0 1 260px', background: '#F7F2E7', border: '1px solid #C9B98F', borderRadius: 4, padding: 12 } },
                        React.createElement("div", { style: { fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#4A3728' } }, "Live Blend Preview"),
                        [
                            { label: 'Aeration / Drainage', value: blend.aeration },
                            { label: 'Moisture Retention', value: blend.moistureRetention },
                            { label: 'Nitrogen (N)', value: blend.nitrogen },
                            { label: 'Phosphorus (P)', value: blend.phosphorus },
                            { label: 'Potassium (K)', value: blend.potassium },
                        ].map((stat) => {
                            const color = stat.value < 34 ? '#C1443C' : stat.value < 67 ? '#D98E2B' : '#5C9B4A';
                            return (React.createElement("div", { key: stat.label, style: { marginBottom: 6 } },
                                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 } },
                                    React.createElement("span", null, stat.label),
                                    React.createElement("span", { style: { fontWeight: 700, color } },
                                        Math.round(stat.value),
                                        "/100")),
                                React.createElement("div", { style: { background: '#E3D9BF', borderRadius: 4, height: 8, overflow: 'hidden' } },
                                    React.createElement("div", { style: { width: `${stat.value}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.2s' } }))));
                        })));
                })(),
                React.createElement("div", { style: { flex: 1, minWidth: 300 } },
                    React.createElement("div", { style: { fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#4A3728' } }, "Base Soils \u2014 drag one to the station"),
                    React.createElement("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 } }, SOILS.map((s) => {
                        const owned = inventory.soils[s.id] > 0;
                        return (React.createElement("div", { key: s.id, onMouseDown: (e) => owned && startDragItem('soil', s.id, e), onTouchStart: (e) => owned && startDragItem('soil', s.id, e), style: {
                                textAlign: 'center', padding: 8, border: '1px solid #C9B98F', borderRadius: 4, width: 88,
                                cursor: owned ? 'grab' : 'not-allowed', opacity: owned ? 1 : 0.4,
                                background: '#F7F2E7', userSelect: 'none', touchAction: 'none',
                            } },
                            React.createElement(SoilSwatch, { size: 26 }),
                            React.createElement("div", { style: { fontSize: 10, fontWeight: 700, marginTop: 4 } },
                                s.name,
                                s.groundOk ? ' 🌍' : ''),
                            React.createElement("div", { style: { fontSize: 9, color: '#6b5844' } },
                                "have: ",
                                inventory.soils[s.id],
                                " \u00B7 boosted: ",
                                inventory.boostedSoils[s.id])));
                    })),
                    React.createElement("div", { style: { fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#4A3728' } }, "Amendments \u2014 drag as many as you want to try"),
                    React.createElement("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } }, ADDITIVES.map((a) => {
                        const aid = a.id;
                        const owned = inventory.additives[aid] > 0;
                        const icon = aid === 'sand' ? React.createElement(SandIcon, { size: 24 }) : aid === 'woodash' ? React.createElement(AshIcon, { size: 24 }) : aid === 'mushroomcompost' ? React.createElement(MushroomCompostIcon, { size: 24 }) : aid === 'acidifier' ? React.createElement(AcidifierIcon, { size: 24 }) : a.icon;
                        return (React.createElement("div", { key: aid, onMouseDown: (e) => owned && startDragItem('additive', aid, e), onTouchStart: (e) => owned && startDragItem('additive', aid, e), style: {
                                textAlign: 'center', padding: 8, border: '1px solid #C9B98F', borderRadius: 4, width: 88,
                                cursor: owned ? 'grab' : 'not-allowed', opacity: owned ? 1 : 0.4,
                                background: '#F7F2E7', userSelect: 'none', touchAction: 'none',
                            }, title: a.desc },
                            React.createElement("div", { style: { fontSize: 24, display: 'flex', justifyContent: 'center' } }, icon),
                            React.createElement("div", { style: { fontSize: 10, fontWeight: 700, marginTop: 4 } }, a.name),
                            React.createElement("div", { style: { fontSize: 9, color: '#6b5844' } },
                                "have: ",
                                inventory.additives[aid])));
                    })))),
            dragItem && (React.createElement("div", { style: { position: 'fixed', left: dragItem.x - 22, top: dragItem.y - 22, pointerEvents: 'none', zIndex: 100, fontSize: 30, opacity: 0.9 } }, dragItem.kind === 'soil' ? React.createElement(SoilSwatch, { size: 44 }) : React.createElement("span", null, (_a = ADDITIVES.find((a) => a.id === dragItem.id)) === null || _a === void 0 ? void 0 : _a.icon))))),
        indoorSubTab === 'stratify' && (React.createElement("div", { style: styles.mainArea },
            React.createElement("div", { style: styles.yardPanel },
                React.createElement("div", { style: styles.panelTitle }, "Cold Stratification (the fridge)"),
                React.createElement("div", { style: styles.tableSurface },
                    coldStratBatches.length === 0 && React.createElement("div", { style: { padding: 20, color: '#EDE6D6', fontStyle: 'italic', fontSize: 13 } }, "Nothing stratifying right now."),
                    React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, coldStratBatches.map((b) => {
                        const plant = PLANTS.find((p) => p.id === b.plantId);
                        return (React.createElement("div", { key: b.id, style: styles.stratRow },
                            React.createElement(SeedPacketIcon, { size: 30, title: `${plant.name} seed packet` }),
                            React.createElement("span", { style: { flex: 1, marginLeft: 8, fontSize: 12, color: '#EDE6D6' } },
                                plant.name,
                                " \u2014 ",
                                b.ready ? 'ready!' : `${b.daysIn}/${b.daysNeeded} days cold`),
                            b.ready && React.createElement("button", { style: styles.transplantBtnSmall, onClick: () => collectStratifiedSeed(b.id) }, "Collect")));
                    }))),
                React.createElement("div", { style: styles.hint }, "Seeds marked \uD83E\uDDCA need this before they can germinate. Takes weeks \u2014 plan ahead.")),
            React.createElement("div", { style: styles.sidebar },
                React.createElement("div", { style: styles.shopPanel },
                    React.createElement("div", { style: styles.panelTitle }, "Start Stratifying"),
                    React.createElement("div", { style: styles.seedList },
                        PLANTS.filter((p) => p.stratDays > 0 && (inventory.seeds[p.id] || 0) > 0).map((p) => (React.createElement("button", { key: p.id, style: styles.seedRow, onClick: () => startStratification(p) },
                            React.createElement(SeedPacketIcon, { size: 32, title: `${p.name} seed packet` }),
                            React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, p.name),
                                React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } },
                                    p.stratDays,
                                    " days \u00B7 ",
                                    inventory.seeds[p.id],
                                    " seeds in stock"))))),
                        PLANTS.filter((p) => p.stratDays > 0).every((p) => (inventory.seeds[p.id] || 0) === 0) && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "No stratification-needing seeds in stock. Buy Lavender, Milkweed, Oregano, or Sage seeds at the Plant Nursery."))))))),
        indoorSubTab === 'compost' && (React.createElement("div", { style: styles.mainArea },
            React.createElement("div", { style: styles.yardPanel },
                React.createElement("div", { style: styles.panelTitle }, "Compost Bin"),
                React.createElement("div", { style: styles.tableSurface },
                    compostBatches.length === 0 && React.createElement("div", { style: { padding: 20, color: '#EDE6D6', fontStyle: 'italic', fontSize: 13 } }, "Nothing composting right now."),
                    React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, compostBatches.map((b) => (React.createElement("div", { key: b.id, style: styles.stratRow },
                        React.createElement("span", { style: { fontSize: 18 } }, "\uD83E\uDEB1"),
                        React.createElement("span", { style: { flex: 1, marginLeft: 8, fontSize: 12, color: '#EDE6D6' } },
                            "Compost pile \u2014 ",
                            b.ready ? 'ready!' : `${Math.floor(b.daysIn)}/${b.daysNeeded} days · nutrients ${b.nutrientScore || 1}`),
                        !b.ready && React.createElement("button", { style: { ...styles.transplantBtnSmall, marginRight: 6 }, onClick: () => addToCompostBatch(b.id) }, "Add Materials"),
                        b.ready && React.createElement("button", { style: styles.transplantBtnSmall, onClick: () => collectCompost(b.id) },
                            "Collect ",
                            (b.yieldCount || COMPOST_YIELD) + (b.burnDebrisUsed ? 1 : 0),
                            " bags")))))),
                React.createElement("div", { style: styles.hint },
                    "Real compost science: a pile can start with any compostable material. More mass builds heat; mixing nitrogen-rich greens with carbon-rich browns speeds decomposition. As you add useful organic matter, the nutrient score and finished-compost yield rise.")),
            React.createElement("div", { style: styles.sidebar },
                React.createElement("div", { style: styles.shopPanel },
                    React.createElement("div", { style: styles.panelTitle }, "Start / Feed Compost"),
                    React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 } },
                        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between' } },
                            React.createElement("span", null, "🌿 Dead plant matter + weeds"),
                            React.createElement("span", { style: { fontWeight: 700, color: inventory.deadMatter >= COMPOST_RECIPE.deadMatter ? '#5C7A4F' : '#A33' } },
                                inventory.deadMatter,
                                " available")),
                        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between' } },
                            React.createElement("span", null, "🪵 Charred debris (optional)"),
                            React.createElement("span", { style: { fontWeight: 700, color: (inventory.burnDebris || 0) > 0 ? '#5C7A4F' : '#6b5844' } }, inventory.burnDebris || 0)),
                        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between' } },
                            React.createElement("span", null,
                                LEAVES_ITEM.icon,
                                " Leaves"),
                            React.createElement("span", { style: { fontWeight: 700, color: inventory.leaves >= COMPOST_RECIPE.leaves ? '#5C7A4F' : '#A33' } },
                                inventory.leaves,
                                " available")),
                        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between' } },
                            React.createElement("span", null,
                                CARDBOARD_ITEM.icon,
                                " Cardboard"),
                            React.createElement("span", { style: { fontWeight: 700, color: inventory.cardboard >= COMPOST_RECIPE.cardboard ? '#5C7A4F' : '#A33' } },
                                inventory.cardboard,
                                " available")),
                        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between' } },
                            React.createElement("span", null, "☕ Coffee grounds"),
                            React.createElement("span", { style: { fontWeight: 700, color: (inventory.coffeegrounds || 0) > 0 ? '#5C7A4F' : '#6b5844' } },
                                inventory.coffeegrounds || 0,
                                " available"))),
                    React.createElement("button", { style: { ...styles.buyBtn, marginTop: 10 }, onClick: startCompostBatch }, "Compost Everything Available"),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginTop: 8 } }, "Start as soon as you have even one compostable item. This uses all loose compostables you currently have. Afterward, collect more and press Add Materials to make the pile richer and faster. Pokeweed must be disposed of separately."))))),
        indoorSubTab === 'fertilizer' && (React.createElement("div", { style: styles.mainArea },
            React.createElement("div", { style: styles.yardPanel },
                React.createElement("div", { style: styles.panelTitle }, "Brewing Station"),
                React.createElement("div", { style: styles.tableSurface },
                    fertilizerBatches.length === 0 && React.createElement("div", { style: { padding: 20, color: '#EDE6D6', fontStyle: 'italic', fontSize: 13 } }, "Nothing steeping right now."),
                    React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, fertilizerBatches.map((b) => {
                        const recipe = FERTILIZER_RECIPES.find((r) => r.id === b.recipeId);
                        return (React.createElement("div", { key: b.id, style: styles.stratRow },
                            React.createElement("span", { style: { fontSize: 18 } }, recipe.icon),
                            React.createElement("span", { style: { flex: 1, marginLeft: 8, fontSize: 12, color: '#EDE6D6' } },
                                recipe.name,
                                " \u2014 ",
                                b.ready ? 'ready!' : `${b.daysIn}/${b.daysNeeded} days steeping`),
                            b.ready && React.createElement("button", { style: styles.transplantBtnSmall, onClick: () => collectFertilizerBatch(b.id) },
                                "Collect ",
                                recipe.yieldAmt)));
                    }))),
                React.createElement("div", { style: styles.hint }, "Real natural fertilizer techniques \u2014 steep raw kitchen and garden scraps into liquid feeds instead of buying synthetic fertilizer. Each one solves a specific, real nutrient problem.")),
            React.createElement("div", { style: styles.sidebar },
                React.createElement("div", { style: styles.shopPanel },
                    React.createElement("div", { style: styles.panelTitle }, "Start a Batch"),
                    React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, FERTILIZER_RECIPES.map((r) => {
                        const have = inventory[r.ingredient] || 0;
                        const ingredientLabel = r.ingredient === 'comfreyleaves' ? 'Comfrey Leaves'
                            : r.ingredient === 'eggshells' ? 'Eggshells'
                                : r.ingredient === 'bananapeels' ? 'Banana Peels' : r.ingredient;
                        return (React.createElement("div", { key: r.id, style: { border: '1px solid #C9B98F', borderRadius: 3, padding: 8, background: '#EDE6D6' } },
                            React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                                React.createElement("span", { style: { fontSize: 16 } }, r.icon),
                                React.createElement("span", { style: { fontWeight: 700, fontSize: 13 } }, r.name)),
                            React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '4px 0' } }, r.desc),
                            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 } },
                                React.createElement("span", null, ingredientLabel),
                                React.createElement("span", { style: { fontWeight: 700, color: have >= r.ingredientCost ? '#5C7A4F' : '#A33' } },
                                    have,
                                    " / ",
                                    r.ingredientCost)),
                            React.createElement("button", { style: styles.buyBtn, onClick: () => startFertilizerBatch(r.id), disabled: have < r.ingredientCost },
                                "Steep (",
                                r.days,
                                "d)")));
                    })),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginTop: 8 } }, "Buy Eggshells, Banana Peels, and Coffee Grounds at the Plant Nursery. Grow Comfrey and harvest it in the Yard for leaves."))))),
        indoorSubTab === 'germinate' && (React.createElement("div", { style: styles.mainAreaSingle },
            React.createElement("p", { style: { fontSize: 12, color: '#6b5844', marginBottom: 10, maxWidth: 560 } }, "Every seed germinates here \u2014 pick a light source, then open a tray from the View Table tab to plant. Seeds needing Cold Stratification must finish that step first."),
            React.createElement("div", { style: styles.shopGrid }, LIGHT_SOURCES.map((l) => (React.createElement("div", { key: l.id, style: { ...styles.shopCard, ...(selectedLightSource === l.id ? { boxShadow: 'inset 0 0 0 2px #5C7A4F' } : {}) } },
                React.createElement("div", { style: { fontSize: 26 } }, l.icon),
                React.createElement("div", { style: { fontWeight: 700, marginTop: 4 } }, l.name),
                React.createElement("div", { style: { fontSize: 10, color: '#6b5844', margin: '6px 0', minHeight: 44 } }, l.desc),
                React.createElement("button", { style: styles.buyBtn, onClick: () => setSelectedLightSource(l.id) }, selectedLightSource === l.id ? 'Selected' : 'Select'))))),
            React.createElement("button", { style: { ...styles.startBtn, marginTop: 16, maxWidth: 240, padding: '10px 0', fontSize: 13 }, onClick: () => setIndoorSubTab('table') }, "Go to View Table \u2192")))));
}
function YardTab({ zone, calendarMonth, beds, groundPlants, mode, setMode, dragStart, dragCurrent, handleGridMouseDown, handleGridMouseEnter, setDragStart, setDragCurrent, clickBedSquare, clickGroundSquare, deleteBed, getBedSquare, getGroundSquare, selectedPlant, selectedPlantId, setSelectedPlantId, selectedSource, setSelectedSource, inventory, pendingTransplant, waterBed, waterAllGround, waterSquare, selectedWaterTool, setSelectedWaterTool, tryUseBarrelWater, selectedBuildMaterial, setSelectedBuildMaterial, buildCatalogTab, setBuildCatalogTab, activeBurn, wetControlledBurnRing, igniteControlledBurn, extinguishControlledBurn, cancelControlledBurnPreview, burnedAreas, collectBurnDebris, barrels, deleteBarrel, toggleBarrel, greenhouses, deleteGreenhouse, setGreenhouseOpenId, ponds, deletePond, setPondOpenId, trellises, deleteTrellis, protectiveNets, deleteProtectiveNet, paths, deletePath, planterBuckets, deletePlanterBucket, setPlanterBucketOpenId, treeContainers, deleteTreeContainer, setTreeContainerOpenId, spigots, deleteSpigot, toggleSpigot, pipes, deletePipe, pipeWaypoints, finishPipeRun, cancelPipeRun, pvcIsConnected, pvcConnectionStatus, pvcNetworkHasOnSource, groundSoilTiles, selectedFillSoil, setSelectedFillSoil, selectedFillBoosted, setSelectedFillBoosted, groundMulchTiles, selectedFillMulch, setSelectedFillMulch, weeds, removeWeed, groundTilledTiles, selectedFertilizer, setSelectedFertilizer, applyFertilizer, applyPHAmendment, compostBatches, startCompostBatch, addToCompostBatch, collectCompost, groundObstacles, clearRock, controlledBurnAt, todayWeather, addLog, basketSizeId, basketItems, basketCapacity, basketOpen, setBasketOpen, sellBasketItem, keepBasketItem, saveBasketSeeds, sellAllBasket, keepAllBasket, saveAllBasketSeeds, basketSeedYield, basketItemCurrentValue, basketItemHealth, basketItemFreshness, basketItemConditionLabel, collectSeedsFromBedSquare, collectSeedsFromGroundSquare, maintainBedVine, maintainGroundVine, activeBeneficials, releaseBeneficialBug, onInspectPests, avatar, equippedClothes, showAvatarInYard, enabledMethods, setQuizOpen, log, score, }) {
    var _a, _b, _c, _d, _e;
    const dragRect = (() => {
        if (!dragStart || !dragCurrent)
            return null;
        const x0 = Math.min(dragStart.x, dragCurrent.x), x1 = Math.max(dragStart.x, dragCurrent.x);
        const y0 = Math.min(dragStart.y, dragCurrent.y), y1 = Math.max(dragStart.y, dragCurrent.y);
        return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    })();
    const hasOnSpigot = spigots.some((s) => s.on);
    const hasPlacedPvc = pipes.length > 0;
    const hasConnectedPvc = pipes.some((p) => pvcIsConnected(p));
    const pvcHasOnSource = pipes.some((p) => pvcNetworkHasOnSource(p));
    function renderSquareContent(sq, onCollectSeeds, onHarvest, onMaintainVine, onWater) {
        if (!sq)
            return React.createElement("span", { style: { opacity: 0.15, fontSize: 12 } }, "+");
        const subCols = Math.ceil(Math.sqrt(sq.perSqFt || 1));
        const canCollectSeeds = !sq.dead && !sq.seedsCollected && sq.age >= sq.daysToMature;
        return (React.createElement(React.Fragment, null,
            React.createElement("div", { style: { ...styles.miniGrid, gridTemplateColumns: `repeat(${subCols}, 1fr)`, position: 'relative', zIndex: 3 } }, Array.from({ length: sq.perSqFt || 1 }).map((_, i) => (React.createElement("span", { key: i, style: { fontSize: subCols >= 4 ? 9 : subCols >= 3 ? 12 : 17, opacity: sq.dead ? 0.35 : sq.harvested ? 0.3 : 1, lineHeight: 1 } }, sq.dead ? '💀' : sq.harvested ? '✅' : sq.emoji)))),
            mode === 'water' && selectedWaterTool === 'can' && !sq.dead && !sq.harvested && onWater && (React.createElement("button", {
                type: "button",
                onClick: (e) => { e.stopPropagation(); onWater(); },
                title: `Water ${sq.name} with watering can`,
                "aria-label": `Water ${sq.name} with watering can`,
                style: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', background: 'transparent', cursor: 'pointer', zIndex: 40, padding: 0 }
            })),
            isViningPlant(sq) && !sq.dead && !sq.harvested && Number(sq.vineSprawl || 0) > 0 && (() => {
                const sprawl = Math.min(6, Number(sq.vineSprawl || 0));
                const leafCount = Math.min(10, 2 + sprawl);
                const spots = [[-12,-8],[14,-10],[-15,12],[16,13],[0,-16],[-4,17],[20,0],[-20,2],[9,18],[-10,-18]];
                return React.createElement("div", { style: { position: 'absolute', inset: 0, zIndex: 2, overflow: 'visible', pointerEvents: 'none' }, title: `Untrellised vine growth · sprawl level ${sprawl}` },
                    Array.from({ length: leafCount }).map((_, i) => React.createElement("span", { key: `vineleaf-${i}`, style: { position: 'absolute', left: `calc(50% + ${spots[i][0]}px)`, top: `calc(50% + ${spots[i][1]}px)`, transform: 'translate(-50%,-50%)', fontSize: 10 + sprawl * 3, opacity: .72 + sprawl * .04, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.25))' } }, "🌿")));
            })(),
            isViningPlant(sq) && !sq.dead && !sq.harvested && Number(sq.vineSprawl || 0) >= 2 && onMaintainVine && React.createElement("button", { type: "button", onClick: (e) => { e.stopPropagation(); onMaintainVine(); }, style: { position: 'absolute', right: 1, bottom: 4, zIndex: 18, width: 19, height: 19, borderRadius: '50%', border: '1px solid #4A3728', background: '#F7F1E4', cursor: 'pointer', fontSize: 11, lineHeight: '16px', padding: 0 }, title: "Train / prune vine — keeps sprawling leaves under control" }, "✂️"),
            sq.repeatHarvest && !sq.exhausted && React.createElement("div", { style: { position: 'absolute', left: 2, bottom: 2, zIndex: 14, fontSize: 8, fontWeight: 800, background: 'rgba(247,242,231,.9)', padding: '1px 3px', borderRadius: 3 }, title: "Repeat-harvest crop" }, "Harvest ", Math.min(4, (sq.harvestCount || 0) + 1), "/4"),
            sq.exhausted && React.createElement("div", { style: { position: 'absolute', left: 2, bottom: 2, zIndex: 14, fontSize: 8, fontWeight: 900, background: '#F2D4CF', color: '#7A2F28', padding: '1px 3px', borderRadius: 3 } }, "Replace plant"),
            isTreeOrBush(sq) && monthInWindow(calendarMonth, sq.bloomMonths) && sq.bloomMonths && (React.createElement("div", { style: { position: 'absolute', left: 2, top: 2, zIndex: 16, fontSize: 14 }, title: `Blooming now · ${seasonalFruitSummary(sq)}` }, "\uD83C\uDF38")),
            (() => {
                const tier = !sq.dead && !sq.harvested ? harvestQualityTier(sq.age, sq.daysToMature) : null;
                if (tier === 'full')
                    return React.createElement("button", { type: "button", style: styles.stageBadgeReady, onClick: (e) => { e.stopPropagation(); if (onHarvest)
                            onHarvest(); }, title: "Ready to harvest \u2014 click here to harvest at full value!" }, "!");
                if (tier === 'half')
                    return React.createElement("button", { type: "button", style: styles.stageBadgeWarn, onClick: (e) => { e.stopPropagation(); if (onHarvest)
                            onHarvest(); }, title: "Past its peak \u2014 click here to harvest now for half value." }, "!");
                if (tier === 'weak')
                    return React.createElement("button", { type: "button", style: styles.stageBadgeCritical, onClick: (e) => { e.stopPropagation(); if (onHarvest)
                            onHarvest(); }, title: "Weak harvest \u2014 click here to harvest for storage." }, "!");
                if (isMelonSalvageable(sq))
                    return React.createElement("button", { type: "button", style: { ...styles.stageBadgeWarn, cursor: 'pointer' }, onClick: (e) => { e.stopPropagation(); if (onHarvest) onHarvest(); }, title: `Vine died, but ripe fruit can still be salvaged for ${sq.salvageDaysLeft} more day${sq.salvageDaysLeft === 1 ? '' : 's'} at reduced value.` }, "🧺");
                if (sq.dead)
                    return React.createElement("div", { style: styles.stageBadgeDanger, title: isMelonPlant(sq) && sq.salvageExpired ? "Salvage window expired — fruit lost; clear for compost." : "Dead \u2014 can only be cleared for compost." }, "\uD83D\uDC80");
                return null;
            })(),
            !sq.dead && !sq.harvested && sq.daysUnwatered >= 7 && (React.createElement("div", { style: styles.unwateredBadge, title: "Unwatered for a week or more \u2014 water this plant!" }, "!")),
            sq.pest && !sq.dead && !sq.harvested && (React.createElement("button", { type: "button", style: { ...styles.pestBadge, border: 'none', cursor: 'pointer' }, onClick: (e) => { e.stopPropagation(); if (onInspectPests)
                    onInspectPests(sq.pest, null); }, title: `Infested with ${PESTS[sq.pest].name}! Click to open Pest Patrol.` }, PESTS[sq.pest].icon)),
            canCollectSeeds && onCollectSeeds && (React.createElement("button", { style: styles.seedCollectBtn, onClick: (e) => { e.stopPropagation(); onCollectSeeds(); }, title: "Collect seeds from this plant" }, React.createElement(SeedPacketIcon, { size: 16, title: 'Collect seeds' }))),
            !sq.dead && !sq.harvested && (React.createElement("div", { style: styles.healthBarWrap },
                React.createElement("div", { style: { ...styles.healthBarFill, width: `${sq.health}%`, background: sq.health > 60 ? '#5C7A4F' : sq.health > 30 ? '#C16B3D' : '#A33' } })))));
    }
    return (React.createElement(React.Fragment, null,
        React.createElement("div", { style: styles.mainArea },
            React.createElement("div", { style: styles.yardPanel },
                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 } },
                    React.createElement("div", { style: styles.modeRow },
                        React.createElement("button", { onClick: () => setMode('build'), style: { ...styles.modeBtn, ...(mode === 'build' ? styles.modeBtnActive : {}) } }, "\uD83D\uDEE0\uFE0F Build"),
                        React.createElement("button", { onClick: () => setMode('plant'), style: { ...styles.modeBtn, ...(mode === 'plant' ? styles.modeBtnActive : {}) } }, "\uD83C\uDF31 Plant"),
                        React.createElement("button", { onClick: () => setMode('soil'), style: { ...styles.modeBtn, ...(mode === 'soil' ? styles.modeBtnActive : {}) } },
                            React.createElement("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } },
                                React.createElement(SoilIcon, { size: 13 }),
                                " Soil")),
                        React.createElement("button", { onClick: () => setMode('compost'), style: { ...styles.modeBtn, ...(mode === 'compost' ? styles.modeBtnActive : {}) } }, "\uD83E\uDEB1 Compost"),
                        React.createElement("button", { onClick: () => {
                                var _a;
                                setMode('water');
                                // If the player owns a watering can, Water mode should immediately become
                                // plant-by-plant watering. Do not leave a stale PVC selection active.
                                if ((((_a = inventory.waterTools) === null || _a === void 0 ? void 0 : _a.can) || 0) > 0)
                                    setSelectedWaterTool('can');
                                else if (hasConnectedPvc)
                                    setSelectedWaterTool('pvc');
                                else
                                    setSelectedWaterTool(null);
                            }, style: { ...styles.modeBtn, ...(mode === 'water' ? styles.modeBtnActive : {}) } }, "\uD83D\uDCA7 Water"),
                        React.createElement("button", { onClick: () => setMode('fertilize'), style: { ...styles.modeBtn, ...(mode === 'fertilize' ? styles.modeBtnActive : {}) } }, "\uD83E\uDDEA Fertilize"),
                        React.createElement("button", { onClick: () => setMode('bugs'), style: { ...styles.modeBtn, ...(mode === 'bugs' ? styles.modeBtnActive : {}) } }, "\uD83E\uDEB1 Beneficials"),
                        React.createElement("button", { onClick: () => setMode('burn'), style: { ...styles.modeBtn, ...(mode === 'burn' ? styles.modeBtnActive : {}) } }, "\uD83D\uDD25 Controlled Burn"),
                        React.createElement("button", { style: styles.quizBtn, onClick: () => setQuizOpen(true) }, "\uD83D\uDCB0 Earn Money"),
                        React.createElement("button", { style: styles.quizBtn, onClick: () => setBasketOpen(true) },
                            "\uD83E\uDDFA ",
                            basketSizeId ? `${basketItems.length}/${basketCapacity()}` : 'No basket')),
                    React.createElement("div", { style: { flexShrink: 0, textAlign: 'center' } },
                        React.createElement(CompassRose, { size: 56 }),
                        React.createElement("div", { style: { fontSize: 9, color: '#6b5844', maxWidth: 80 } }, "South-facing spots get the most sun"))),
                mode === 'compost' && (React.createElement("div", { style: { display: 'flex', gap: 16, flexWrap: 'wrap' } },
                    React.createElement("div", { style: { ...styles.yardPanel, padding: 0, flex: '1 1 400px' } },
                        React.createElement("div", { style: styles.panelTitle }, "Compost Bin"),
                        React.createElement("div", { style: styles.tableSurface },
                            compostBatches.length === 0 && React.createElement("div", { style: { padding: 20, color: '#EDE6D6', fontStyle: 'italic', fontSize: 13 } }, "Nothing composting right now."),
                            React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, compostBatches.map((b) => (React.createElement("div", { key: b.id, style: styles.stratRow },
                                React.createElement("span", { style: { fontSize: 18 } }, "\uD83E\uDEB1"),
                                React.createElement("span", { style: { flex: 1, marginLeft: 8, fontSize: 12, color: '#EDE6D6' } },
                                    "Compost pile \u2014 ",
                                    b.ready ? 'ready!' : `${Math.floor(b.daysIn)}/${b.daysNeeded} days · nutrients ${b.nutrientScore || 1}`),
                                !b.ready && React.createElement("button", { style: { ...styles.transplantBtnSmall, marginRight: 6 }, onClick: () => addToCompostBatch(b.id) }, "Add Materials"),
                        b.ready && React.createElement("button", { style: styles.transplantBtnSmall, onClick: () => collectCompost(b.id) },
                                    "Collect ",
                                    (b.yieldCount || COMPOST_YIELD) + (b.burnDebrisUsed ? 1 : 0),
                                    " bags")))))),
                        React.createElement("div", { style: styles.hint },
                            "Real compost science: a pile can start with any compostable material. More mass builds heat; mixing nitrogen-rich greens with carbon-rich browns speeds decomposition. As you add useful organic matter, the nutrient score and finished-compost yield rise.")),
                    React.createElement("div", { style: { ...styles.sidebar, flex: '0 1 280px' } },
                        React.createElement("div", { style: styles.shopPanel },
                            React.createElement("div", { style: styles.panelTitle }, "Start / Feed Compost"),
                            React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 } },
                                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between' } },
                                    React.createElement("span", null, "🌿 Dead plant matter + weeds"),
                                    React.createElement("span", { style: { fontWeight: 700, color: inventory.deadMatter >= COMPOST_RECIPE.deadMatter ? '#5C7A4F' : '#A33' } },
                                        inventory.deadMatter,
                                        " available")),
                                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between' } },
                                    React.createElement("span", null, "🪵 Charred debris (optional)"),
                                    React.createElement("span", { style: { fontWeight: 700, color: (inventory.burnDebris || 0) > 0 ? '#5C7A4F' : '#6b5844' } }, inventory.burnDebris || 0)),
                                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between' } },
                                    React.createElement("span", null,
                                        LEAVES_ITEM.icon,
                                        " Leaves"),
                                    React.createElement("span", { style: { fontWeight: 700, color: inventory.leaves >= COMPOST_RECIPE.leaves ? '#5C7A4F' : '#A33' } },
                                        inventory.leaves,
                                        " available")),
                                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between' } },
                                    React.createElement("span", null,
                                        CARDBOARD_ITEM.icon,
                                        " Cardboard"),
                                    React.createElement("span", { style: { fontWeight: 700, color: inventory.cardboard >= COMPOST_RECIPE.cardboard ? '#5C7A4F' : '#A33' } },
                                        inventory.cardboard,
                                        " available")),
                                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between' } },
                                    React.createElement("span", null, "☕ Coffee grounds"),
                                    React.createElement("span", { style: { fontWeight: 700, color: (inventory.coffeegrounds || 0) > 0 ? '#5C7A4F' : '#6b5844' } },
                                        inventory.coffeegrounds || 0,
                                        " available"))),
                            React.createElement("button", { style: { ...styles.buyBtn, marginTop: 10 }, onClick: startCompostBatch }, "Compost Everything Available"),
                            React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginTop: 8 } }, "Start as soon as you have even one compostable item. This uses all loose compostables you currently have. Afterward, collect more and press Add Materials to make the pile richer and faster. Pokeweed must be disposed of separately."))))),
                (mode === 'build' || mode === 'water') && pipes.length > 0 && (React.createElement("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', margin: '8px 0', padding: '7px 9px', background: '#F7F2E7', border: '1px solid #C9B98F', borderRadius: 5, fontSize: 10, color: '#4A3728' } },
                    React.createElement("strong", null, "PVC Connection:"),
                    React.createElement("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
                        React.createElement("span", { style: { width: 24, height: 4, background: '#3F8C46', borderRadius: 4 } }),
                        " Green = source \u2192 PVC \u2192 bed-edge connector complete"),
                    React.createElement("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
                        React.createElement("span", { style: { width: 24, height: 4, background: '#B33A32', borderRadius: 4 } }),
                        " Red = source or bed-edge connector is still missing"),
                    mode === 'build' && React.createElement("span", { style: { fontWeight: 700 } }, "Use the red \u2715 at the end of a PVC run to remove it."))),
                React.createElement("div", { style: { display: mode === 'compost' ? 'none' : 'flex', gap: 10, alignItems: 'flex-end' } },
                    showAvatarInYard && (React.createElement("div", { style: { flexShrink: 0, paddingBottom: 4 } },
                        React.createElement(AvatarPortrait, { avatar: avatar, size: 90, equippedClothes: equippedClothes }))),
                    React.createElement("div", { style: { ...styles.grid, gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_PX}px)`, gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL_PX}px)` }, onMouseLeave: () => { if (dragStart) {
                            setDragStart(null);
                            setDragCurrent(null);
                        } } },
                        Array.from({ length: GRID_ROWS }).map((_, y) => Array.from({ length: GRID_COLS }).map((_, x) => {
                            var _a, _b;
                            const inDrag = dragRect && x >= dragRect.x0 && x < dragRect.x0 + dragRect.w && y >= dragRect.y0 && y < dragRect.y0 + dragRect.h;
                            const onBed = beds.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
                            const onBarrel = barrels.some((br) => br.x === x && br.y === y);
                            const onGreenhouse = greenhouses.some((g) => x >= g.x && x < g.x + g.w && y >= g.y && y < g.y + g.h);
                            const onPond = ponds.some((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
                            const onTrellis = trellises.some((t) => t.typeId !== 'cattlepanel' && t.x === x && t.y === y);
                            const groundSq = !onBed && !onBarrel && !onGreenhouse && !onPond && !onTrellis ? getGroundSquare(x, y) : null;
                            const groundTile = !onBed && !onBarrel && !onGreenhouse && !onPond && !onTrellis ? groundSoilTiles.find((t) => t.gx === x && t.gy === y) : null;
                            const groundTilled = !onBed && !onBarrel && !onGreenhouse && !onPond && !onTrellis ? groundTilledTiles.find((t) => t.gx === x && t.gy === y) : null;
                            const groundMulch = !onBed && !onBarrel && !onGreenhouse && !onPond && !onTrellis ? groundMulchTiles.find((t) => t.gx === x && t.gy === y) : null;
                            const groundWeed = !onBed && !onBarrel && !onGreenhouse && !onPond && !onTrellis ? weeds.find((w) => w.kind === 'ground' && w.x === x && w.y === y) : null;
                            const obstacle = !onBed && !onBarrel && !onGreenhouse && !onPond && !onTrellis ? groundObstacles.find((o) => o.gx === x && o.gy === y) : null;
                            const isPipeWaypoint = pipeWaypoints.some((w) => w.x === x && w.y === y);
                            const burnPatchCell = !!(activeBurn && activeBurn.cells.some((c) => c.x === x && c.y === y));
                            const burnRingCell = !!(activeBurn && activeBurn.ring.some((c) => c.x === x && c.y === y));
                            const burnSpreadCell = !!(activeBurn && (activeBurn.spreadCells || []).some((c) => c.x === x && c.y === y));
                            const burnRecoveryArea = burnedAreas.find((a) => (a.daysRemaining || 0) > 0 && cellsContain(a.cells, x, y));
                            return (React.createElement("div", { key: `${x}-${y}`, onMouseDown: () => { if (!obstacle)
                                    handleGridMouseDown(x, y); }, onMouseEnter: () => handleGridMouseEnter(x, y), onClick: () => {
                                    if (onBed || onBarrel || onGreenhouse || onPond || onTrellis)
                                        return;
                                    if (obstacle) {
                                        if (obstacle.kind === 'rock')
                                            clearRock(obstacle.id);
                                        else
                                            addLog("That tree is a permanent part of the yard — build your garden around it.");
                                        return;
                                    }
                                    if (mode === 'fertilize') {
                                        if (selectedFertilizer)
                                            applyFertilizer(selectedFertilizer, 'ground', null, x, y);
                                        return;
                                    }
                                    if (mode === 'water') {
                                        if (!selectedWaterTool) {
                                            return;
                                        }
                                        if (selectedWaterTool === 'pvc' && !pvcHasOnSource) {
                                            return;
                                        }
                                        if (!tryUseBarrelWater(selectedWaterTool))
                                            return;
                                        if (selectedWaterTool === 'can')
                                            waterSquare('ground', null, x, y);
                                        else
                                            waterAllGround();
                                    }
                                    else if (enabledMethods.sow || (mode === 'plant' && selectedSource === 'plant' && isTreeOrBush(selectedPlant)))
                                        clickGroundSquare(x, y);
                                }, style: {
                                    ...styles.cell, ...(inDrag ? styles.cellDragPreview : {}), ...(isPipeWaypoint ? styles.cellPipeStart : {}),
                                    ...(groundTilled && !groundTile ? styles.cellTilled : {}),
                                    ...(groundTile ? styles.cellSoiled : {}), ...(groundMulch ? styles.cellMulched : {}),
                                    ...(burnPatchCell ? { boxShadow: activeBurn && activeBurn.ignited ? 'inset 0 0 0 2px #C1443C' : 'inset 0 0 0 2px #D88E42' } : {}),
                                    ...(burnRingCell ? { outline: `2px ${activeBurn && (activeBurn.perimeterWetPct || 0) >= 75 ? 'solid' : 'dashed'} ${activeBurn && (activeBurn.perimeterWetPct || 0) >= 75 ? '#5C9BD5' : '#C9B98F'}`, outlineOffset: '-2px' } : {}),
                                    ...(burnRecoveryArea ? { background: 'repeating-linear-gradient(135deg, rgba(64,48,39,.42) 0 7px, rgba(88,68,52,.34) 7px 14px), #8A7A62' } : {}),
                                    ...(!onBed && !onBarrel && !onGreenhouse && !onPond && !onTrellis && (enabledMethods.sow || (selectedSource === 'plant' && isTreeOrBush(selectedPlant))) && mode === 'plant' && !groundSq ? styles.sqftCellEmpty : {}),
                                }, title: obstacle ? (obstacle.kind === 'rock' ? 'A rock — clear it with a Shovel or Tiller' : 'A tree — permanent, build around it')
                                    : mode === 'plant' && !onBed && !onBarrel && !onGreenhouse && !onPond && !onTrellis && !groundSq ? 'Open native ground — click to prepare and plant'
                                    : !onBed && !onBarrel && !groundTilled && mode !== 'water' ? 'Needs preparation — use a Tiller, Shovel, or Hoe'
                                        : !onBed && !onBarrel && !groundTile && mode !== 'water' ? 'Prepared native ground — ready to plant'
                                            : groundTile ? `pH ${((_a = groundTile.ph) !== null && _a !== void 0 ? _a : 6.5).toFixed(1)}${groundMulch ? ` · Mulched: ${(_b = MULCH_TYPES.find((m) => m.id === groundMulch.mulchId)) === null || _b === void 0 ? void 0 : _b.name}` : ''}` : undefined },

                                burnRecoveryArea && !burnPatchCell && !burnSpreadCell && (React.createElement("div", { style: { position: 'absolute', right: 2, bottom: 1, fontSize: 7, fontWeight: 900, color: '#F1E3C8', background: 'rgba(61,43,31,.72)', padding: '1px 3px', borderRadius: 3, pointerEvents: 'none', zIndex: 2 }, title: `Burn recovery: ${burnRecoveryArea.daysRemaining} days left` }, "ASH")),
                                burnRingCell && !burnPatchCell && (React.createElement("div", { style: { position: 'absolute', inset: 3, borderRadius: 4, background: activeBurn && (activeBurn.perimeterWetPct || 0) >= 75 ? 'rgba(92,155,213,0.18)' : 'rgba(210,180,120,0.14)', pointerEvents: 'none', zIndex: 1 } })),
                                burnPatchCell && (React.createElement("div", { style: { position: 'absolute', inset: 1, borderRadius: 4, background: activeBurn && activeBurn.ignited ? 'rgba(193,68,60,0.16)' : 'rgba(216,142,66,0.12)', pointerEvents: 'none', zIndex: 2 } },
                                    React.createElement("div", { style: { position: 'absolute', left: 2, top: 1, fontSize: 10, fontWeight: 900, color: '#7A2F28' } }, `${activeBurn && activeBurn.progressPct ? activeBurn.progressPct : 0}%`),
                                    activeBurn && activeBurn.ignited && React.createElement("div", { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: burnSpreadCell ? 24 : 22, animation: 'pulse 0.8s ease-in-out infinite', pointerEvents: 'none' } }, '🔥'))),
                                burnSpreadCell && activeBurn && activeBurn.ignited && !burnPatchCell && (React.createElement("div", { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: 'rgba(193,68,60,0.08)', pointerEvents: 'none', zIndex: 2 } }, '🔥')),
                                obstacle && (React.createElement("div", { "data-testid": `obstacle-${obstacle.kind}`, style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: obstacle.kind === 'tree' ? 30 : 22, cursor: obstacle.kind === 'rock' ? 'pointer' : 'default' } }, obstacle.kind === 'tree' ? '🌳' : '🪨')),
                                mode === 'soil' && groundTile && (React.createElement("div", { style: { position: 'absolute', display: 'flex', gap: 2, zIndex: 4, top: -2, left: -2 } },
                                    React.createElement("button", { style: { ...styles.phAmendBtn, fontSize: 7, padding: '1px 3px' }, onClick: (e) => { e.stopPropagation(); applyPHAmendment('ground', null, x, y, 'woodash'); }, title: "Apply Wood Ash (raises pH)" }, "+"),
                                    React.createElement("button", { style: { ...styles.phAmendBtn, fontSize: 7, padding: '1px 3px' }, onClick: (e) => { e.stopPropagation(); applyPHAmendment('ground', null, x, y, 'acidifier'); }, title: "Apply Soil Acidifier (lowers pH)" }, "\u2212"))),
                                !onBed && !onBarrel && groundSq && (React.createElement("div", { style: styles.groundSquareInner }, renderSquareContent(groundSq, () => collectSeedsFromGroundSquare(x, y), () => harvestGroundSquare(x, y), () => maintainGroundVine(x, y), () => waterSquare('ground', null, x, y)))),
                                !onBed && !onBarrel && groundSq && !groundSq.dead && !groundSq.harvested && (() => {
                                    const rels = [[0, -1], [0, 1], [-1, 0], [1, 0]]
                                        .map(([dx, dy]) => groundPlants.find((n) => n && !n.dead && !n.harvested && n.gx === x + dx && n.gy === y + dy))
                                        .filter(Boolean)
                                        .map((n) => companionRelation(groundSq.id, n.id))
                                        .filter(Boolean);
                                    if (rels.length === 0)
                                        return null;
                                    const hasBad = rels.includes('bad');
                                    return (React.createElement("span", { style: { ...styles.companionBadge, ...(hasBad ? styles.companionBadgeBad : styles.companionBadgeGood) }, title: hasBad ? 'A bad companion neighbor is stressing this plant' : 'A good companion neighbor is helping this plant thrive' }, hasBad ? '⚠️' : '🤝'));
                                })(),
                                groundWeed && (() => {
                                    const weedInfo = getWeedInfo(groundWeed);
                                    return (React.createElement("button", { style: { ...styles.weedBadge, ...(weedInfo.compostable ? {} : styles.badWeedBadge) }, onClick: (e) => { e.stopPropagation(); removeWeed(groundWeed.id); }, title: `${weedInfo.name} — click to pull. ${weedInfo.compostable ? 'Safe to add to compost.' : 'Do NOT compost this weed.'}` }, weedInfo.icon));
                                })()));
                        })),
                        React.createElement("svg", { style: styles.pipeSvgLayer, width: GRID_COLS * CELL_PX, height: GRID_ROWS * CELL_PX },
                            pipes.map((p) => {
                                const status = pvcConnectionStatus(p);
                                const pts = p.points.map((pt) => `${pt.x * CELL_PX + CELL_PX / 2},${pt.y * CELL_PX + CELL_PX / 2}`).join(' ');
                                const statusColor = status.complete ? '#3F8C46' : '#B33A32';
                                return (React.createElement("g", { key: p.id },
                                    React.createElement("polyline", { points: pts, fill: "none", stroke: "#F2F1EC", strokeWidth: 8, strokeLinecap: "round", strokeLinejoin: "round", opacity: 0.95, style: { pointerEvents: 'none' } }),
                                    React.createElement("polyline", { points: pts, fill: "none", stroke: statusColor, strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round", opacity: 0.95, strokeDasharray: status.complete ? undefined : '7,4', style: { pointerEvents: 'none' } }),
                                    p.points.slice(1, -1).filter((pt) => !pt.connector).map((pt, i) => (React.createElement("circle", { key: `turn-${i}`, cx: pt.x * CELL_PX + CELL_PX / 2, cy: pt.y * CELL_PX + CELL_PX / 2, r: 4, fill: statusColor, style: { pointerEvents: 'none' } }))),
                                    p.points.filter((pt) => { var _a; return ((_a = pt.connector) === null || _a === void 0 ? void 0 : _a.kind) === 'bed'; }).map((pt, i) => (React.createElement("g", { key: `bed-connector-${i}`, style: { pointerEvents: 'none' } },
                                        React.createElement("circle", { cx: pt.x * CELL_PX + CELL_PX / 2, cy: pt.y * CELL_PX + CELL_PX / 2, r: 9, fill: "#FFF8E8", stroke: statusColor, strokeWidth: 4 }),
                                        React.createElement("circle", { cx: pt.x * CELL_PX + CELL_PX / 2, cy: pt.y * CELL_PX + CELL_PX / 2, r: 3, fill: statusColor }),
                                        React.createElement("title", null, status.complete ? 'Plant bed connected to water network' : 'Plant bed connector — water source connection still incomplete')))),
                                    p.points.filter((pt) => { var _a; return ((_a = pt.connector) === null || _a === void 0 ? void 0 : _a.kind) === 'source'; }).map((pt, i) => (React.createElement("g", { key: `source-connector-${i}`, style: { pointerEvents: 'none' } },
                                        React.createElement("circle", { cx: pt.x * CELL_PX + CELL_PX / 2, cy: pt.y * CELL_PX + CELL_PX / 2, r: 11, fill: "none", stroke: statusColor, strokeWidth: 4 }),
                                        React.createElement("title", null, status.complete ? 'Water source connected to plant bed' : 'Water source connected — plant bed connection still incomplete'))))));
                            }),
                            pipeWaypoints.length > 0 && (React.createElement("polyline", { points: pipeWaypoints.map((pt) => `${pt.x * CELL_PX + CELL_PX / 2},${pt.y * CELL_PX + CELL_PX / 2}`).join(' '), fill: "none", stroke: "#5C7A4F", strokeWidth: 3, strokeDasharray: "5,4", strokeLinecap: "round" }))),
                        mode === 'build' && pipes.map((p) => {
                            const endPt = p.points[p.points.length - 1];
                            return (React.createElement("button", { key: `del-${p.id}`, style: { ...styles.pipeDeleteBtn, left: endPt.x * CELL_PX + CELL_PX / 2 - 13, top: endPt.y * CELL_PX + CELL_PX / 2 - 13 }, onClick: (e) => { e.stopPropagation(); deletePipe(p.id); }, title: "Remove this PVC run and return its footage to inventory", "aria-label": "Remove PVC run" }, "\u2715"));
                        }),
                        greenhouses.map((g) => {
                            const type = GREENHOUSE_TYPES.find((t) => t.id === g.typeId) || GREENHOUSE_TYPES[0];
                            const activePlants = (g.plants || []).filter(Boolean).length;
                            return (React.createElement("div", { key: `greenhouse-${g.id}`, onClick: (e) => { e.stopPropagation(); setGreenhouseOpenId(g.id); }, style: {
                                    position: 'absolute', left: g.x * CELL_PX, top: g.y * CELL_PX,
                                    width: g.w * CELL_PX, height: g.h * CELL_PX, zIndex: 5,
                                    border: '4px solid #4F7C68', borderRadius: 10,
                                    background: 'linear-gradient(135deg, rgba(220,245,235,0.82), rgba(185,224,210,0.58))',
                                    boxShadow: 'inset 0 0 0 3px rgba(255,255,255,.65), 0 3px 8px rgba(61,43,31,.2)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#28483B', overflow: 'hidden'
                                }, title: `Enter ${type.name}` },
                                React.createElement("div", { style: { position: 'absolute', inset: 8, border: '2px solid rgba(79,124,104,.45)', borderRadius: 6, pointerEvents: 'none' } }),
                                React.createElement("div", { style: { fontWeight: 900, textShadow: '0 1px #fff', pointerEvents: 'none' } },
                                    React.createElement("div", { style: { fontSize: Math.min(48, Math.max(28, g.w * 7)) } }, "\uD83C\uDFE1"),
                                    React.createElement("div", { style: { fontSize: 13 } }, type.name),
                                    React.createElement("div", { style: { fontSize: 10 } },
                                        activePlants,
                                        "/",
                                        type.plantSlots,
                                        " plants \u00B7 ",
                                        (g.decor || []).length,
                                        "/",
                                        type.decorSlots,
                                        " decor"),
                                    React.createElement("div", { style: { fontSize: 10, marginTop: 3 } }, "Click to enter")),
                                mode === 'build' && (React.createElement("button", { style: { ...styles.deleteFixtureBtn, right: 5, top: 5 }, onClick: (e) => { e.stopPropagation(); deleteGreenhouse(g.id); }, title: "Pick up empty greenhouse" }, "\u2715"))));
                        }),
                        ponds.map((p) => {
                            const type = POND_TYPES.find((t) => t.id === p.typeId) || POND_TYPES[0];
                            const control = pondMosquitoControl(p);
                            return (React.createElement("div", { key: `pond-${p.id}`, onClick: (e) => { e.stopPropagation(); setPondOpenId(p.id); }, style: { position: 'absolute', left: p.x * CELL_PX, top: p.y * CELL_PX, width: p.w * CELL_PX, height: p.h * CELL_PX, zIndex: 5, border: '4px solid #476F77', borderRadius: '48%', background: 'radial-gradient(ellipse at 45% 40%, #7BC7D3 0%, #4E9EAE 55%, #347583 100%)', boxShadow: 'inset 0 0 0 4px rgba(255,255,255,.25), 0 3px 8px rgba(61,43,31,.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#F7FCFD', overflow: 'hidden' }, title: `Inspect ${type.name}` },
                                React.createElement("div", { style: { fontWeight: 900, textShadow: '0 1px 2px #244', pointerEvents: 'none' } },
                                    React.createElement("div", { style: { fontSize: Math.min(44, Math.max(24, p.w * 6)) } }, "\uD83D\uDCA7\uD83D\uDC1F"),
                                    React.createElement("div", { style: { fontSize: 12 } }, type.name),
                                    React.createElement("div", { style: { fontSize: 9 } },
                                        pondFishCount(p),
                                        "/",
                                        type.fishSlots,
                                        " fish \u00B7 mosquito control ",
                                        Math.round(control * 100),
                                        "%"),
                                    React.createElement("div", { style: { fontSize: 9 } }, "Click to inspect")),
                                mode === 'build' && React.createElement("button", { style: { ...styles.deleteFixtureBtn, right: 5, top: 5 }, onClick: (e) => { e.stopPropagation(); deletePond(p.id); }, title: "Pick up empty pond" }, "\u2715")));
                        }),
                        paths.map((p) => { const type = PATH_TYPES.find((x) => x.id === p.typeId) || PATH_TYPES[0]; return React.createElement("div", { key: `path-${p.id}`, style: { position: 'absolute', left: p.x * CELL_PX + 2, top: p.y * CELL_PX + 2, width: CELL_PX - 4, height: CELL_PX - 4, zIndex: 1, background: type.id === 'brickpath' ? 'repeating-linear-gradient(0deg,#B96D4A 0 10px,#9B5137 10px 12px),repeating-linear-gradient(90deg,transparent 0 18px,rgba(255,255,255,.22) 18px 20px)' : 'radial-gradient(circle at 25% 35%,#AAA18F 0 24%,transparent 25%),radial-gradient(circle at 70% 65%,#8F887A 0 28%,transparent 29%),#D4C8AE', border: '1px solid #806C59', borderRadius: 4, pointerEvents: 'auto' }, title: type.name }, mode === 'build' && React.createElement("button", { style: { ...styles.deleteFixtureBtn, right: -5, top: -5, transform: 'scale(.75)' }, onClick: (e) => { e.stopPropagation(); deletePath(p.id); } }, "\u2715")); }),
                        planterBuckets.map((c) => { var _a; const type = PLANTER_BUCKET_TYPES.find((x) => x.id === c.typeId) || PLANTER_BUCKET_TYPES[0]; return React.createElement("div", { key: `bucket-${c.id}`, onClick: (e) => { e.stopPropagation(); if (mode === 'build' && selectedBuildMaterial === 'protective-net') { handleGridMouseDown(c.x, c.y); return; } setPlanterBucketOpenId(c.id); }, style: { position: 'absolute', left: c.x * CELL_PX + 8, top: c.y * CELL_PX + 5, width: CELL_PX - 16, height: CELL_PX - 10, zIndex: 7, border: '3px solid #6D665C', borderRadius: '5px 5px 12px 12px', background: '#B7A58C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 24 }, title: `${type.name} · click to manage` },
                            ((_a = c.plant) === null || _a === void 0 ? void 0 : _a.emoji) || '🪣',
                            mode === 'build' && !c.plant && React.createElement("button", { style: { ...styles.deleteFixtureBtn, right: -9, top: -9, transform: 'scale(.75)' }, onClick: (e) => { e.stopPropagation(); deletePlanterBucket(c.id); } }, "\u2715")); }),
                        protectiveNets.map((n) => React.createElement("div", { key: `net-${n.id}`, style: { position: 'absolute', left: n.x * CELL_PX + 2, top: n.y * CELL_PX + 2, width: CELL_PX - 4, height: CELL_PX - 4, zIndex: 12, border: '2px dashed #E8F1E8', background: 'repeating-linear-gradient(45deg,rgba(255,255,255,.10) 0 5px,rgba(255,255,255,.35) 5px 6px)', pointerEvents: 'auto' }, title: "Plant Insect Net" }, mode === 'build' && React.createElement("button", { style: { ...styles.deleteFixtureBtn, right: -6, top: -6, transform: 'scale(.72)' }, onClick: (e) => { e.stopPropagation(); deleteProtectiveNet(n.id); } }, "\u2715"))),
                        trellises.map((t) => {
                            const type = TRELLIS_TYPES.find((x) => x.id === t.typeId) || TRELLIS_TYPES[0];
                            const fp = type.id === 'cattlepanel' ? { w: t.w || type.footprintW || 3, h: t.h || type.footprintH || 2 } : { w: 1, h: 1 };
                            const hasVine = groundPlants.some((p) => p && !p.dead && !p.harvested && isViningPlant(p) && (type.id === 'cattlepanel' ? (p.gx >= t.x && p.gx < t.x + fp.w && p.gy >= t.y && p.gy < t.y + fp.h) : Math.abs(p.gx - t.x) + Math.abs(p.gy - t.y) === 1)) ||
                                beds.some((b) => (b.plants || []).some((p) => p && !p.dead && !p.harvested && isViningPlant(p) && (type.id === 'cattlepanel' ? ((b.x + (p.sx || 0)) >= t.x && (b.x + (p.sx || 0)) < t.x + fp.w && (b.y + (p.sy || 0)) >= t.y && (b.y + (p.sy || 0)) < t.y + fp.h) : Math.abs((b.x + (p.sx || 0)) - t.x) + Math.abs((b.y + (p.sy || 0)) - t.y) === 1)));
                            if (type.id === 'cattlepanel') {
                                return React.createElement("div", { key: `trellis-${t.id}`, style: { position: 'absolute', left: t.x * CELL_PX + 2, top: t.y * CELL_PX + 1, width: fp.w * CELL_PX - 4, height: fp.h * CELL_PX - 2, zIndex: 11, pointerEvents: 'none' }, title: `${type.name}${hasVine ? ' · vines are climbing the arch' : ' · plant vines underneath'}` },
                                    React.createElement("div", { style: { position: 'absolute', left: 3, right: 3, top: 3, height: '58%', border: '3px solid #6F777A', borderBottom: 'none', borderRadius: '48% 48% 10px 10px / 80% 80% 10px 10px', background: 'repeating-linear-gradient(90deg,transparent 0 12px,rgba(105,115,118,.62) 12px 14px),repeating-linear-gradient(0deg,transparent 0 12px,rgba(105,115,118,.55) 12px 14px)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.35)', pointerEvents: 'none' } }),
                                    React.createElement("div", { style: { position: 'absolute', left: 5, top: '43%', width: 4, height: '54%', background: '#4F5659', borderRadius: 2 } }),
                                    React.createElement("div", { style: { position: 'absolute', right: 5, top: '43%', width: 4, height: '54%', background: '#4F5659', borderRadius: 2 } }),
                                    hasVine && React.createElement("div", { style: { position: 'absolute', inset: '5% 6% 15%', display: 'flex', alignItems: 'center', justifyContent: 'space-around', fontSize: 24, opacity: .9, pointerEvents: 'none' } }, "🌿", "🌿", "🌿"),
                                    mode === 'build' && React.createElement("button", { style: { ...styles.deleteFixtureBtn, right: -7, top: -7, transform: 'scale(.8)', pointerEvents: 'auto' }, onClick: (e) => { e.stopPropagation(); deleteTrellis(t.id); }, title: "Remove cattle panel arch" }, "\u2715"));
                            }
                            return React.createElement("div", { key: `trellis-${t.id}`, style: { position: 'absolute', left: t.x * CELL_PX + 4, top: t.y * CELL_PX + 2, width: CELL_PX - 8, height: CELL_PX - 4, zIndex: 6, border: type.id === 'tpostnet' ? '3px solid #52595C' : '3px solid #8B5A2B', background: type.id === 'tpostnet' ? 'repeating-linear-gradient(0deg,transparent 0 6px,rgba(235,245,235,.8) 6px 7px),repeating-linear-gradient(90deg,transparent 0 6px,rgba(235,245,235,.8) 6px 7px),linear-gradient(90deg,#4E5457 0 5px,transparent 5px calc(100% - 5px),#4E5457 calc(100% - 5px))' : 'repeating-linear-gradient(45deg,transparent 0 8px,rgba(139,90,43,.65) 8px 11px),repeating-linear-gradient(-45deg,transparent 0 8px,rgba(139,90,43,.65) 8px 11px)', borderRadius: 4, pointerEvents: 'auto' }, title: `${type.name}${hasVine ? ' · a vine is climbing this support' : ''}` },
                                hasVine && React.createElement("span", { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, pointerEvents: 'none' } }, "\uD83C\uDF3F"),
                                mode === 'build' && React.createElement("button", { style: { ...styles.deleteFixtureBtn, right: -7, top: -7, transform: 'scale(.8)' }, onClick: (e) => { e.stopPropagation(); deleteTrellis(t.id); }, title: "Remove trellis" }, "\u2715"));
                        }),
                        treeContainers.filter((c) => !c.greenhouseId).map((c) => {
                            const type = TREE_CONTAINER_TYPES.find((t) => t.id === c.typeId) || TREE_CONTAINER_TYPES[0];
                            const p = c.plant;
                            return (React.createElement("div", { key: `treepot-${c.id}`, onClick: (e) => { e.stopPropagation(); if (mode === 'build' && selectedBuildMaterial === 'protective-net') { handleGridMouseDown(c.x, c.y); return; } setTreeContainerOpenId(c.id); }, style: { position: 'absolute', left: c.x * CELL_PX + 4, top: c.y * CELL_PX + 3, width: CELL_PX - 8, height: CELL_PX - 6, zIndex: 7, border: '3px solid #8B5A2B', borderRadius: '8px 8px 14px 14px', background: 'linear-gradient(#B96F3E,#7E4428)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,.25)' }, title: `Open ${type.name}` },
                                React.createElement("div", { style: { pointerEvents: 'none' } },
                                    React.createElement("div", { style: { fontSize: 24 } }, p ? p.emoji : '🪴'),
                                    React.createElement("div", { style: { fontSize: 8, fontWeight: 800 } }, p ? p.name : 'Tree Pot')),
                                mode === 'build' && !p && React.createElement("button", { style: { ...styles.deleteFixtureBtn, right: -5, top: -5, transform: 'scale(.8)' }, onClick: (e) => { e.stopPropagation(); deleteTreeContainer(c.id); }, title: "Pick up empty tree container" }, "\u2715")));
                        }),
                        barrels.map((br) => (React.createElement("div", { key: br.id, style: { ...styles.barrelOverlay, ...(br.on ? styles.sourceOn : {}), left: br.x * CELL_PX, top: br.y * CELL_PX, width: CELL_PX, height: CELL_PX }, onClick: () => {
                                if (mode === 'build' && selectedBuildMaterial === 'pvc')
                                    handleGridMouseDown(br.x, br.y);
                                else
                                    toggleBarrel(br.id);
                            }, title: mode === 'build' && selectedBuildMaterial === 'pvc' ? 'Click to connect PVC to this rain barrel' : (br.on ? 'Water is ON — touch to turn off' : 'Water is OFF — touch to turn on') },
                            "\uD83D\uDEE2\uFE0F",
                            br.on && React.createElement("span", { style: styles.onIndicator }, "\uD83D\uDCA7"),
                            mode === 'build' && (React.createElement("button", { style: styles.deleteFixtureBtn, onClick: (e) => { e.stopPropagation(); deleteBarrel(br.id); }, title: "Remove" }, "\u2715"))))),
                        spigots.map((sp) => (React.createElement("div", { key: sp.id, style: { ...styles.spigotOverlay, ...(sp.on ? styles.sourceOn : {}), left: sp.x * CELL_PX, top: sp.y * CELL_PX, width: CELL_PX, height: CELL_PX }, onClick: () => {
                                if (mode === 'build' && selectedBuildMaterial === 'pvc')
                                    handleGridMouseDown(sp.x, sp.y);
                                else
                                    toggleSpigot(sp.id);
                            }, title: mode === 'build' && selectedBuildMaterial === 'pvc' ? 'Click to connect PVC to this spigot' : (sp.on ? 'Water is ON — touch to turn off' : 'Water is OFF — touch to turn on') },
                            "\uD83D\uDEB0",
                            sp.on && React.createElement("span", { style: styles.onIndicator }, "\uD83D\uDCA7"),
                            mode === 'build' && (React.createElement("button", { style: styles.deleteFixtureBtn, onClick: (e) => { e.stopPropagation(); deleteSpigot(sp.id); }, title: "Remove" }, "\u2715"))))),
                        beds.map((bed) => {
                            var _a, _b, _c;
                            return (React.createElement("div", { key: bed.id, style: {
                                    ...styles.bedOverlay,
                                    ...(bed.material === 'aluminum' ? styles.bedOverlayAluminum : {}),
                                    ...(bed.material === 'cement' ? styles.bedOverlayCement : {}),
                                    ...(bed.material === 'sticks' ? styles.bedOverlaySticks : {}),
                                    left: bed.x * CELL_PX, top: bed.y * CELL_PX, width: bed.w * CELL_PX, height: bed.h * CELL_PX,
                                } },
                                mode === 'build' && React.createElement("button", { style: styles.deleteBedBtn, onClick: (e) => { e.stopPropagation(); deleteBed(bed.id); } }, "\u2715"),
                                React.createElement("div", { style: styles.bedDims },
                                    bed.w,
                                    "'\u00D7",
                                    bed.h,
                                    "' ",
                                    bed.soilId ? `· ${(_a = SOILS.find((s) => s.id === bed.soilId)) === null || _a === void 0 ? void 0 : _a.name}${bed.boosted ? ' (boosted)' : ''}` : React.createElement("span", { style: { color: '#A33' } }, "\u00B7 needs soil"),
                                    bed.soilId && (bed.mulchId ? ` · 🌾 ${(_b = MULCH_TYPES.find((m) => m.id === bed.mulchId)) === null || _b === void 0 ? void 0 : _b.name}` : ''),
                                    bed.soilId && ` · pH ${((_c = bed.ph) !== null && _c !== void 0 ? _c : 6.5).toFixed(1)}`),
                                mode === 'soil' && bed.soilId && (React.createElement("div", { style: { position: 'absolute', top: -22, right: 2, display: 'flex', gap: 3, zIndex: 4 } },
                                    React.createElement("button", { style: styles.phAmendBtn, onClick: (e) => { e.stopPropagation(); applyPHAmendment('bed', bed.id, null, null, 'woodash'); }, title: "Apply Wood Ash (raises pH)" }, "+pH"),
                                    React.createElement("button", { style: styles.phAmendBtn, onClick: (e) => { e.stopPropagation(); applyPHAmendment('bed', bed.id, null, null, 'acidifier'); }, title: "Apply Soil Acidifier (lowers pH)" }, "\u2212pH"))),
                                React.createElement("div", { style: { ...styles.sqftGrid, gridTemplateColumns: `repeat(${bed.w}, 1fr)`, gridTemplateRows: `repeat(${bed.h}, 1fr)` }, onClick: () => { if (mode === 'water' && selectedWaterTool && selectedWaterTool !== 'can') {
                                        if (selectedWaterTool === 'pvc' && !pvcHasOnSource)
                                            return;
                                        if (tryUseBarrelWater(selectedWaterTool))
                                            waterBed(bed.id);
                                    } } }, Array.from({ length: bed.h }).map((_, sy) => Array.from({ length: bed.w }).map((_, sx) => {
                                    const sq = getBedSquare(bed, sx, sy);
                                    const bedWeed = weeds.find((w) => w.kind === 'bed' && w.bedId === bed.id && w.x === sx && w.y === sy);
                                    return (React.createElement("div", { key: `${sx}-${sy}`, onClick: (e) => {
                                            e.stopPropagation();
                                            if (mode === 'build' && (selectedBuildMaterial === 'pvc' || selectedBuildMaterial === 'protective-net' || selectedBuildMaterial === 'trellis:cattlepanel')) {
                                                handleGridMouseDown(bed.x + sx, bed.y + sy);
                                                return;
                                            }
                                            if (mode === 'fertilize') {
                                                if (selectedFertilizer)
                                                    applyFertilizer(selectedFertilizer, 'bed', bed.id, sx, sy);
                                                return;
                                            }
                                            if (mode !== 'water') {
                                                clickBedSquare(bed.id, sx, sy);
                                                return;
                                            }
                                            if (!selectedWaterTool)
                                                return;
                                            if (selectedWaterTool === 'pvc' && !pvcHasOnSource)
                                                return;
                                            if (!tryUseBarrelWater(selectedWaterTool))
                                                return;
                                            if (selectedWaterTool === 'can')
                                                waterSquare('bed', bed.id, sx, sy);
                                            else
                                                waterBed(bed.id);
                                        }, style: { ...styles.sqftCell, ...(bed.soilId ? styles.sqftCellSoiled : {}), ...(!sq && mode === 'plant' ? styles.sqftCellEmpty : {}), ...(!sq && pendingTransplant ? styles.sqftCellTransplantTarget : {}) } },
                                        renderSquareContent(sq, () => collectSeedsFromBedSquare(bed.id, sx, sy), () => harvestBedSquare(bed.id, sx, sy), () => maintainBedVine(bed.id, sx, sy), () => waterSquare('bed', bed.id, sx, sy)),
                                        sq && !sq.dead && !sq.harvested && (() => {
                                            const rels = [[0, -1], [0, 1], [-1, 0], [1, 0]]
                                                .map(([dx, dy]) => bed.plants.find((n) => n && !n.dead && !n.harvested && n.sx === sx + dx && n.sy === sy + dy))
                                                .filter(Boolean)
                                                .map((n) => companionRelation(sq.id, n.id))
                                                .filter(Boolean);
                                            if (rels.length === 0)
                                                return null;
                                            const hasBad = rels.includes('bad');
                                            return (React.createElement("span", { style: { ...styles.companionBadge, ...(hasBad ? styles.companionBadgeBad : styles.companionBadgeGood) }, title: hasBad ? 'A bad companion neighbor is stressing this plant (see Garden Catalog for pairings)' : 'A good companion neighbor is helping this plant thrive' }, hasBad ? '⚠️' : '🤝'));
                                        })(),
                                        bedWeed && (() => {
                                            const weedInfo = getWeedInfo(bedWeed);
                                            return (React.createElement("button", { style: { ...styles.weedBadge, ...(weedInfo.compostable ? {} : styles.badWeedBadge) }, onClick: (e) => { e.stopPropagation(); removeWeed(bedWeed.id); }, title: `${weedInfo.name} — click to pull. ${weedInfo.compostable ? 'Safe to add to compost.' : 'Do NOT compost this weed.'}` }, weedInfo.icon));
                                        })()));
                                })))));
                        }))),
                mode === 'build' && (React.createElement("div", { style: styles.hint },
                    !selectedBuildMaterial && 'Nothing selected — choose Wood, a water fixture, or PVC from Building Material before clicking the yard.',
                    selectedBuildMaterial === 'barrel' && 'Click any empty square to place a rain barrel. Click a placed barrel to pick it back up.',
                    selectedBuildMaterial === 'spigot' && 'Click any empty square to place a spigot. Click a placed spigot to pick it back up.',
                    typeof selectedBuildMaterial === 'string' && selectedBuildMaterial.startsWith('pond:') && 'Click open yard space to place the pond footprint. After placement, click the pond to stock fish.',
                    typeof selectedBuildMaterial === 'string' && selectedBuildMaterial.startsWith('trellis:') && (selectedBuildMaterial === 'trellis:cattlepanel' ? 'Click near the CENTER of the bed or prepared-ground area you want covered. The 3×2 cattle-panel arch can sit over crops, and vines can be planted directly underneath it. Buy multiple arches to extend a tunnel.' : 'Click an empty square beside a vining crop. Supported vines will climb the trellis and receive a growth/airflow benefit.'),
                    typeof selectedBuildMaterial === 'string' && selectedBuildMaterial.startsWith('treecontainer:') && 'Click an empty square to place a movable tree container. Click the pot afterward to plant a tropical tree and move it into a greenhouse for cold weather.',
                    selectedBuildMaterial === 'protective-net' && 'Click directly on any living plant, bush, or tree to cover it with insect netting. Remove or open netting during bloom for pollinators.',
                    typeof selectedBuildMaterial === 'string' && selectedBuildMaterial.startsWith('bucket:') && 'Click open ground to place the planter bucket, then click the bucket to plant it.',
                    typeof selectedBuildMaterial === 'string' && selectedBuildMaterial.startsWith('path:') && 'Click open ground squares to lay your pathway.',
                    selectedBuildMaterial === 'pvc' && (pipeWaypoints.length === 0
                        ? 'Click a starting square, then click again for each turn. You can create as many separate PVC runs as you want. Any runs that touch automatically become one watering network; separate runs stay independent until connected. Click Finish Run after each run.'
                        : `${pipeWaypoints.length} point${pipeWaypoints.length === 1 ? '' : 's'} placed — click to add more turns, or Finish Run below.`),
                    ['wood', 'aluminum', 'cement', 'sticks'].includes(selectedBuildMaterial) &&
                        `Drag across the grid to paint a ${selectedBuildMaterial === 'sticks' ? 'sticks' : selectedBuildMaterial} bed, square by square. Uses 1 sq ft of material per square. Tap ✕ to remove (no refund).`)),
                mode === 'build' && selectedBuildMaterial === 'pvc' && pipeWaypoints.length > 0 && (React.createElement("div", { style: { display: 'flex', gap: 8, marginTop: 6 } },
                    React.createElement("button", { style: styles.finishPipeBtn, onClick: finishPipeRun, disabled: pipeWaypoints.length < 2 },
                        "\u2713 Finish Run (",
                        pipeWaypoints.length > 1 ? `${Math.max(0, pipeWaypoints.length - 2)} elbow${pipeWaypoints.length - 2 === 1 ? '' : 's'}` : 'need 1 more point',
                        ")"),
                    React.createElement("button", { style: styles.sellBtn, onClick: cancelPipeRun }, "Cancel"))),
                mode === 'plant' && (React.createElement("div", { style: styles.hint }, pendingTransplant ? `Click an empty square to transplant ${pendingTransplant.plant.name}.` :
                    selectedPlant ? `Selected: ${selectedPlant.emoji} ${selectedPlant.name} (${selectedSource === 'seed' ? 'seed' : 'live plant'}) — click squares to plant, click several in a row.` :
                        'Pick a seed/plant and source in the sidebar, then click squares. Raised beds need added soil. Live trees and bushes can be placed directly into open native ground; ordinary direct-sown seeds still use your ground-prep tools.')),
                mode === 'soil' && (React.createElement("div", { style: styles.hint },
                    "Ground squares need tilling first (click an untilled square \u2014 requires owning a Tiller, Shovel, or Hoe).",
                    ' ',
                    !selectedFillSoil ? 'Pick a soil type in the sidebar first.' : ` Then click a bed (whole bed fills at once) or a tilled ground square to add ${(_a = SOILS.find((s) => s.id === selectedFillSoil)) === null || _a === void 0 ? void 0 : _a.name}.`,
                    ' ',
                    "Click a bed or square that already has soil (and no growing plants) to remove it.")),
                mode === 'water' && (React.createElement("div", { style: styles.hint }, !selectedWaterTool ? 'Pick a watering tool in the sidebar first.' :
                    selectedWaterTool === 'can' ? 'Watering Can selected — click one planted square at a time.' :
                        !pvcHasOnSource ? 'PVC selected — turn on a connected spigot or rain barrel in the Water Sources panel.' :
                            'PVC network is active — click a planted square or bed to water.')),
                mode === 'fertilize' && (React.createElement("div", { style: styles.hint }, !selectedFertilizer ? 'Pick a brewed fertilizer in the sidebar first.' : 'Click a growing plant to treat it — one bottle per plant.')),
                mode === 'bugs' && (React.createElement("div", { style: styles.hint }, "Release beneficial organisms from the sidebar. Predators fight aphids, June bugs, root maggots, and root aphids; earthworms build soil fertility and structure. Pest badges may represent above- or below-ground damage.")),
                mode === 'burn' && (React.createElement("div", { style: styles.hint }, "\uD83D\uDD25 Controlled Burn now runs through preparation, ignition, a visible burn, and manual extinguishing. At 100% the flames stay active until you use water. Afterward, the charred footprint suppresses weeds and pest outbreaks for about two in-game months. Real prescribed fire requires trained professionals and local authorization."))),
            React.createElement("div", { style: styles.sidebar },
                mode === 'soil' && (React.createElement("div", { style: styles.shopPanel },
                    React.createElement("div", { style: styles.panelTitle }, "Soil to Add"),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginBottom: 8 } }, "Any soil works in beds. Only Compost and Native Soil work on open ground."),
                    React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                        SOILS.map((s) => {
                            const baseStock = inventory.soils[s.id] || 0;
                            const boostedStock = inventory.boostedSoils[s.id] || 0;
                            if (baseStock < 1 && boostedStock < 1)
                                return null;
                            return (React.createElement(React.Fragment, { key: s.id },
                                baseStock > 0 && (React.createElement("button", { onClick: () => { setSelectedFillSoil(s.id); setSelectedFillBoosted(false); }, style: { ...styles.seedRow, ...(selectedFillSoil === s.id && !selectedFillBoosted ? styles.seedRowActive : {}) } },
                                    React.createElement("span", { style: { flex: 1, textAlign: 'left', fontSize: 12, fontWeight: 700 } },
                                        s.name,
                                        s.groundOk ? ' 🌍' : ''),
                                    React.createElement("span", { style: { fontSize: 10, opacity: 0.7 } },
                                        baseStock,
                                        " owned"))),
                                boostedStock > 0 && (React.createElement("button", { onClick: () => { setSelectedFillSoil(s.id); setSelectedFillBoosted(true); }, style: { ...styles.seedRow, ...(selectedFillSoil === s.id && selectedFillBoosted ? styles.seedRowActive : {}) } },
                                    React.createElement("span", { style: { flex: 1, textAlign: 'left', fontSize: 12, fontWeight: 700 } },
                                        "Boosted ",
                                        s.name,
                                        s.groundOk ? ' 🌍' : ''),
                                    React.createElement("span", { style: { fontSize: 10, opacity: 0.7 } },
                                        boostedStock,
                                        " owned")))));
                        }),
                        SOILS.every((s) => (inventory.soils[s.id] || 0) < 1 && (inventory.boostedSoils[s.id] || 0) < 1) && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "No soil in inventory \u2014 buy or make some in the Start Indoor tab / Plant Nursery."))))),
                mode === 'soil' && (React.createElement("div", { style: styles.shopPanel },
                    React.createElement("div", { style: styles.panelTitle }, "Mulch to Spread"),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginBottom: 8 } }, "Must already have soil. Click a mulched square again to remove the mulch first."),
                    React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                        MULCH_TYPES.filter((m) => inventory.mulch[m.id] > 0).map((m) => (React.createElement("button", { key: m.id, onClick: () => setSelectedFillMulch(m.id), style: { ...styles.seedRow, ...(selectedFillMulch === m.id ? styles.seedRowActive : {}) } },
                            React.createElement("span", null, m.icon || React.createElement(MulchSwatch, { mulchId: m.id, size: 16 })),
                            React.createElement("span", { style: { flex: 1, textAlign: 'left', fontSize: 12, fontWeight: 700, marginLeft: 8 } }, m.name),
                            React.createElement("span", { style: { fontSize: 10, opacity: 0.7 } },
                                inventory.mulch[m.id],
                                " owned")))),
                        selectedFillMulch && (React.createElement("button", { style: styles.sellBtn, onClick: () => setSelectedFillMulch(null) }, "Clear Mulch Selection")),
                        MULCH_TYPES.every((m) => (inventory.mulch[m.id] || 0) < 1) && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "No mulch in inventory \u2014 buy some at the Plant Nursery."))))),
                mode === 'bugs' && (React.createElement(React.Fragment, null,
                    React.createElement("div", { style: styles.shopPanel },
                        React.createElement("div", { style: styles.panelTitle }, "Release Beneficial Bugs"),
                        React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginBottom: 8 } }, "Releasing puts a bug to work across the whole yard for its active duration."),
                        React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                            BENEFICIAL_BUGS.filter((b) => inventory.beneficialBugs[b.id] > 0).map((b) => (React.createElement("button", { key: b.id, style: styles.seedRow, onClick: () => releaseBeneficialBug(b.id) },
                                React.createElement("span", { style: { fontSize: 16 } }, "\uD83D\uDC1E"),
                                React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                    React.createElement("div", { style: { fontWeight: 700, fontSize: 12 } }, b.name),
                                    React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } },
                                        inventory.beneficialBugs[b.id],
                                        " in stock"))))),
                            BENEFICIAL_BUGS.every((b) => inventory.beneficialBugs[b.id] < 1) && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "No beneficial bugs in inventory \u2014 buy some at the Plant Nursery.")))),
                    React.createElement("div", { style: styles.shopPanel },
                        React.createElement("div", { style: styles.panelTitle }, "Active in the Yard"),
                        activeBeneficials.length === 0 && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "Nothing released yet.")),
                        React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, activeBeneficials.map((ab) => {
                            const bug = BENEFICIAL_BUGS.find((b) => b.id === ab.bugId);
                            return (React.createElement("div", { key: ab.id, style: { display: 'flex', alignItems: 'center', background: '#EDE6D6', border: '1px solid #C9B98F', borderRadius: 3, padding: '6px 8px' } },
                                React.createElement("span", { style: { fontSize: 16 } }, "\uD83D\uDC1E"),
                                React.createElement("span", { style: { flex: 1, marginLeft: 8, fontSize: 12, color: '#3D2B1F' } },
                                    bug.name,
                                    " \u2014 ",
                                    ab.daysLeft,
                                    "d left")));
                        }))),
                    React.createElement("div", { style: styles.shopPanel },
                        React.createElement("div", { style: styles.panelTitle }, "Active Pests in the Yard"),
                        (() => {
                            const allPlants = [...beds.flatMap((b) => b.plants), ...groundPlants, ...greenhouses.flatMap((g) => g.plants || []), ...treeContainers.map((c) => c.plant).filter(Boolean)];
                            const infested = allPlants.filter((p) => p.pest && !p.dead && !p.harvested);
                            const counts = {};
                            infested.forEach((p) => { counts[p.pest] = (counts[p.pest] || 0) + 1; });
                            const pestIds = Object.keys(counts);
                            if (pestIds.length === 0) {
                                return React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "No active pests right now.");
                            }
                            return (React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, pestIds.map((pestId) => {
                                const pest = PESTS[pestId];
                                const best = [...BENEFICIAL_BUGS].filter((b) => beneficialEffectForPest(b, pestId) > 0).sort((a, b) => beneficialEffectForPest(b, pestId) - beneficialEffectForPest(a, pestId))[0];
                                return (React.createElement("div", { key: pestId, style: { display: 'flex', alignItems: 'center', background: '#F7E7E3', border: '1px solid #C16B3D', borderRadius: 3, padding: '6px 8px' } },
                                    React.createElement("span", { style: { fontSize: 16 } }, pest.icon),
                                    React.createElement("span", { style: { flex: 1, marginLeft: 8 } },
                                        React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: '#3D2B1F' } },
                                            pest.name,
                                            " \u00D7 ",
                                            counts[pestId]),
                                        React.createElement("div", { style: { fontSize: 9, color: '#6b5844' } },
                                            "Best: ",
                                            (best === null || best === void 0 ? void 0 : best.name) || 'Scout and remove affected roots'))));
                            })));
                        })()))),


mode === 'burn' && (React.createElement("div", { style: styles.shopPanel },
    React.createElement("div", { style: styles.panelTitle }, "🔥 Controlled Burn"),
    React.createElement("div", { style: { fontSize: 11, color: '#6b5844', lineHeight: 1.5, marginBottom: 8 } }, "Select a patch, check fuel moisture, wet the surrounding safety ring, ignite, and then extinguish the fire with water once the burn reaches 100%."),
    React.createElement("div", { style: { fontSize: 11, fontWeight: 800, color: (((_b = inventory.tools) === null || _b === void 0 ? void 0 : _b.handrake) || 0) > 0 ? '#5C7A4F' : '#A33' } },
        "🪮 Hand Rake: ",
        (((_c = inventory.tools) === null || _c === void 0 ? void 0 : _c.handrake) || 0) > 0 ? 'Ready' : 'Required'),
    React.createElement("div", { style: { fontSize: 11, fontWeight: 800, color: ((((_d = inventory.waterTools) === null || _d === void 0 ? void 0 : _d.can) || 0) > 0 || spigots.length || barrels.length) ? '#5C7A4F' : '#A33' } },
        "💧 Water backup: ",
        ((((_e = inventory.waterTools) === null || _e === void 0 ? void 0 : _e.can) || 0) > 0 || spigots.length || barrels.length) ? 'Ready' : 'Required'),
    todayWeather === 'heatwave' && React.createElement("div", { style: { marginTop: 7, fontSize: 11, fontWeight: 800, color: '#A33' } }, "🔥 Heat wave active — burn action locked."),
    activeBurn && (React.createElement("div", { style: { marginTop: 10, padding: 10, background: '#FFF9EE', border: '1.5px solid #D3B27C', borderRadius: 6 } },
        React.createElement("div", { style: { fontWeight: 900, fontSize: 12, color: '#4A3728', marginBottom: 6 } }, activeBurn.awaitingExtinguish ? "🔥 100% Burned — Extinguish Now" : activeBurn.ignited ? "Burn in Progress" : "Burn Preview"),
        activeBurn.awaitingExtinguish && React.createElement("div", { style: { background: '#F7E7E3', border: '1px solid #C16B3D', color: '#7A2F28', borderRadius: 5, padding: 7, marginBottom: 8, fontSize: 10, fontWeight: 800 } }, "The fuel is consumed, but the fire is still active. It will remain burning until you use water to put it out."),
        React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 6, marginBottom: 8 } },
            React.createElement("div", { style: { background: '#F7F2E7', border: '1px solid #D6C5A6', borderRadius: 5, padding: 7 } },
                React.createElement("div", { style: { fontSize: 10, fontWeight: 800, color: '#7A2F28', textTransform: 'uppercase' } }, "Fuel Moisture"),
                React.createElement("div", { style: { fontSize: 20, fontWeight: 900, color: '#4A3728' } }, activeBurn.pileMoisture, "%")),
            React.createElement("div", { style: { background: '#F7F2E7', border: '1px solid #D6C5A6', borderRadius: 5, padding: 7 } },
                React.createElement("div", { style: { fontSize: 10, fontWeight: 800, color: '#2D5870', textTransform: 'uppercase' } }, "Safety Ring Wet"),
                React.createElement("div", { style: { fontSize: 20, fontWeight: 900, color: '#4A3728' } }, activeBurn.perimeterWetPct || 0, "%")),
            React.createElement("div", { style: { background: '#F7F2E7', border: '1px solid #D6C5A6', borderRadius: 5, padding: 7 } },
                React.createElement("div", { style: { fontSize: 10, fontWeight: 800, color: '#5C7A4F', textTransform: 'uppercase' } }, "Burned"),
                React.createElement("div", { style: { fontSize: 20, fontWeight: 900, color: '#4A3728' } }, activeBurn.progressPct || 0, "%")),
            React.createElement("div", { style: { background: '#F7F2E7', border: '1px solid #D6C5A6', borderRadius: 5, padding: 7 } },
                React.createElement("div", { style: { fontSize: 10, fontWeight: 800, color: '#A33', textTransform: 'uppercase' } }, "Spread Risk"),
                React.createElement("div", { style: { fontSize: 18, fontWeight: 900, color: '#4A3728' } }, activeBurn.spreadLabel, " · ", activeBurn.spreadChance, "%"))),
        React.createElement("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
            !activeBurn.ignited && React.createElement("button", { onClick: wetControlledBurnRing, style: { ...styles.methodBtn, flex: '0 0 auto' } }, "💧 Water Safety Ring (+25%)"),
            !activeBurn.ignited && React.createElement("button", { onClick: igniteControlledBurn, style: { ...styles.buyBtn, flex: '1 1 140px' } }, "🔥 Ignite Controlled Burn"),
            !activeBurn.ignited && React.createElement("button", { onClick: cancelControlledBurnPreview, style: { ...styles.sellBtn, flex: '0 0 auto' } }, "Cancel"),
            activeBurn.awaitingExtinguish && React.createElement("button", { onClick: extinguishControlledBurn, style: { ...styles.buyBtn, flex: '1 1 180px', background: '#416F8C' } }, "💧 Extinguish Fire with Water")))),
    burnedAreas.length > 0 && React.createElement("div", { style: { marginTop: 10, paddingTop: 8, borderTop: '1px solid #C9B98F' } },
        React.createElement("div", { style: { fontWeight: 900, fontSize: 11, color: '#3D2B1F', marginBottom: 6 } }, "Charred Recovery Areas"),
        React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, burnedAreas.map((area) => React.createElement("div", { key: `burn-area-${area.id}`, style: { background: '#EEE5D8', border: '1px solid #B8A98A', borderRadius: 5, padding: 7 } },
            React.createElement("div", { style: { fontSize: 10, fontWeight: 800, color: '#4A3728' } }, `🔥 Burned patch · ${area.daysRemaining} game days of weed/pest suppression left`),
            React.createElement("div", { style: { fontSize: 9, color: '#6b5844', marginTop: 2 } }, "About two in-game months total. Plants may regrow here, but weeds and pest outbreaks are suppressed during recovery."),
            !area.debrisCollected && (area.debrisUnits || 0) > 0 && React.createElement("button", { onClick: () => collectBurnDebris(area.id), style: { ...styles.sellBtn, marginTop: 6, width: '100%' } }, `🪵 Collect ${area.debrisUnits} charred debris for compost`))))),
    (inventory.burnDebris || 0) > 0 && React.createElement("div", { style: { marginTop: 8, fontSize: 10, color: '#5C7A4F', fontWeight: 800 } }, `🪵 Charred debris in compost inventory: ${inventory.burnDebris}`))),
                mode === 'build' && (React.createElement("div", { style: styles.shopPanel },
                    React.createElement("div", { style: styles.panelTitle }, "Build & Place"),
                    React.createElement("div", { style: { fontSize: 10, color: '#6b5844', lineHeight: 1.4, marginBottom: 8 } }, "Choose a category to show the materials or placeable items you want to use in the yard."),
                    React.createElement("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
                        [
                            ['materials', '\uD83E\uDEB5 Materials'],
                            ['greenhouses', '\uD83C\uDFE1 Greenhouses'],
                            ['ponds', '\uD83D\uDCA7 Ponds'],
                            ['structures', '\uD83C\uDF3F Structures'],
                            ['containers', '\uD83E\uDEA3 Containers'],
                            ['water', '\uD83D\uDEB0 Water & PVC'],
                        ].map(([id, label]) => (React.createElement("button", { key: `build-tab-${id}`, onClick: () => { setBuildCatalogTab(id); setSelectedBuildMaterial(null); }, style: { ...styles.methodBtn, ...(buildCatalogTab === id ? styles.methodBtnActive : {}), flex: '0 0 auto', fontSize: 10, padding: '6px 8px' } }, label)))),
                    buildCatalogTab === 'materials' && (() => {
                        const hasBuildMaterials = enabledMethods.beds || (Number(inventory.woodSqFt) || 0) > 0 || (Number(inventory.aluminumSqFt) || 0) > 0 || (Number(inventory.cementSqFt) || 0) > 0 || (Number(inventory.sticksSqFt) || 0) > 0;
                        if (!hasBuildMaterials) {
                            return React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "No building materials yet — buy some at the Plant Nursery.");
                        }
                        return React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                            React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginBottom: 2 } }, "Select the material you want to use for bed building."),
                            React.createElement("button", { onClick: () => setSelectedBuildMaterial('wood'), disabled: (Number.isFinite(Number(inventory.woodSqFt)) ? Number(inventory.woodSqFt) : 0) < 1, style: { ...styles.seedRow, ...(selectedBuildMaterial === 'wood' ? styles.seedRowActive : {}), opacity: (Number.isFinite(Number(inventory.woodSqFt)) ? Number(inventory.woodSqFt) : 0) < 1 ? 0.4 : 1 } },
                                React.createElement("span", { style: { fontSize: 18 } }, "\uD83E\uDEB5"),
                                React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                    React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, "Wood"),
                                    React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } }, (Number.isFinite(Number(inventory.woodSqFt)) ? Number(inventory.woodSqFt) : 0), " sq ft owned"))),
                            React.createElement("button", { onClick: () => setSelectedBuildMaterial('aluminum'), disabled: inventory.aluminumSqFt < 1, style: { ...styles.seedRow, ...(selectedBuildMaterial === 'aluminum' ? styles.seedRowActive : {}), opacity: inventory.aluminumSqFt < 1 ? 0.4 : 1 } },
                                React.createElement(AluminumIcon, { size: 20 }),
                                React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                    React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, "Aluminum"),
                                    React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } }, inventory.aluminumSqFt, " sq ft owned"))),
                            React.createElement("button", { onClick: () => setSelectedBuildMaterial('cement'), disabled: inventory.cementSqFt < 1, style: { ...styles.seedRow, ...(selectedBuildMaterial === 'cement' ? styles.seedRowActive : {}), opacity: inventory.cementSqFt < 1 ? 0.4 : 1 } },
                                React.createElement(CementBlockIcon, { size: 20 }),
                                React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                    React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, "Cement Block"),
                                    React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } }, inventory.cementSqFt, " sq ft owned"))),
                            React.createElement("button", { onClick: () => setSelectedBuildMaterial('sticks'), disabled: inventory.sticksSqFt < 1, style: { ...styles.seedRow, ...(selectedBuildMaterial === 'sticks' ? styles.seedRowActive : {}), opacity: inventory.sticksSqFt < 1 ? 0.4 : 1 } },
                                React.createElement(StickIcon, { size: 20 }),
                                React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                    React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, "Large Sticks"),
                                    React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } }, inventory.sticksSqFt, " sq ft owned"))));
                    })(),
                    buildCatalogTab === 'greenhouses' && React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                        React.createElement("div", { style: { fontWeight: 900, fontSize: 12, color: '#3D2B1F' } }, "\uD83C\uDFE1 Greenhouses"),
                        React.createElement("div", { style: { fontSize: 9, color: '#6b5844', marginTop: 2, marginBottom: 6 } }, "Buy one first at Plant Nursery → Greenhouses. Then select it here and click open yard space to place it."),
                        GREENHOUSE_TYPES.map((g) => {
                            var _a, _b, _c;
                            return (React.createElement("button", { key: `build-${g.id}`, onClick: () => setSelectedBuildMaterial(`greenhouse:${g.id}`), disabled: (((_a = inventory.greenhouses) === null || _a === void 0 ? void 0 : _a[g.id]) || 0) < 1, style: { ...styles.seedRow, ...(selectedBuildMaterial === `greenhouse:${g.id}` ? styles.seedRowActive : {}), opacity: (((_b = inventory.greenhouses) === null || _b === void 0 ? void 0 : _b[g.id]) || 0) < 1 ? 0.4 : 1 } },
                                React.createElement("span", { style: { fontSize: 18 } }, "\uD83C\uDFE1"),
                                React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                    React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, g.name),
                                    React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } }, (((_c = inventory.greenhouses) === null || _c === void 0 ? void 0 : _c[g.id]) || 0), " owned · click yard for top-left corner"))));
                        })),
                    buildCatalogTab === 'ponds' && React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                        React.createElement("div", { style: { fontWeight: 900, fontSize: 12, color: '#3D2B1F' } }, "\uD83D\uDCA7 Ponds"),
                        React.createElement("div", { style: { fontSize: 9, color: '#6b5844', marginTop: 2, marginBottom: 6 } }, "Buy pond kits under Plant Nursery → Materials. Place them here, then click a pond to add fish."),
                        POND_TYPES.map((p) => { var _a, _b, _c; return React.createElement("button", { key: `build-${p.id}`, onClick: () => setSelectedBuildMaterial(`pond:${p.id}`), disabled: (((_a = inventory.ponds) === null || _a === void 0 ? void 0 : _a[p.id]) || 0) < 1, style: { ...styles.seedRow, ...(selectedBuildMaterial === `pond:${p.id}` ? styles.seedRowActive : {}), opacity: (((_b = inventory.ponds) === null || _b === void 0 ? void 0 : _b[p.id]) || 0) < 1 ? .4 : 1 } },
                            React.createElement("span", { style: { fontSize: 18 } }, "\uD83D\uDCA7"),
                            React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, p.name),
                                React.createElement("div", { style: { fontSize: 10, opacity: .7 } }, (((_c = inventory.ponds) === null || _c === void 0 ? void 0 : _c[p.id]) || 0), " owned · ", p.w, "'×", p.h, "' footprint"))); })),
                    buildCatalogTab === 'structures' && React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                        React.createElement("div", { style: { ...styles.materialGroupLabel } }, "\uD83C\uDF3F Trellises"),
                        React.createElement("div", { style: { fontSize: 9, color: '#6b5844', marginTop: -2, marginBottom: 4 } }, "Wood and T-post trellises go beside vines. Cattle Panel Arches go OVER beds or prepared ground so vines can grow underneath and climb the arch."),
                        TRELLIS_TYPES.map((t) => { var _a, _b, _c; return React.createElement("button", { key: `build-${t.id}`, onClick: () => setSelectedBuildMaterial(`trellis:${t.id}`), disabled: (((_a = inventory.trellises) === null || _a === void 0 ? void 0 : _a[t.id]) || 0) < 1, style: { ...styles.seedRow, ...(selectedBuildMaterial === `trellis:${t.id}` ? styles.seedRowActive : {}), opacity: (((_b = inventory.trellises) === null || _b === void 0 ? void 0 : _b[t.id]) || 0) < 1 ? .4 : 1 } },
                            React.createElement("span", { style: { fontSize: 18 } }, t.icon),
                            React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, t.name),
                                React.createElement("div", { style: { fontSize: 10, opacity: .7 } }, (((_c = inventory.trellises) === null || _c === void 0 ? void 0 : _c[t.id]) || 0), " owned"))); }),
                        React.createElement("div", { style: { ...styles.materialGroupLabel, marginTop: 10 } }, "\uD83D\uDD78\uFE0F Plant Protection"),
                        React.createElement("button", { onClick: () => setSelectedBuildMaterial('protective-net'), disabled: (inventory.protectiveNets || 0) < 1, style: { ...styles.seedRow, ...(selectedBuildMaterial === 'protective-net' ? styles.seedRowActive : {}), opacity: (inventory.protectiveNets || 0) < 1 ? .4 : 1 } },
                            React.createElement("span", { style: { fontSize: 18 } }, "\uD83D\uDD78\uFE0F"),
                            React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, "Plant Insect Net"),
                                React.createElement("div", { style: { fontSize: 10, opacity: .7 } }, inventory.protectiveNets || 0, " owned · click directly on a living plant"))),
                        React.createElement("div", { style: { ...styles.materialGroupLabel, marginTop: 10 } }, "\uD83E\uDDF1 Pathways"),
                        PATH_TYPES.map((p) => { var _a, _b, _c; return React.createElement("button", { key: `build-${p.id}`, onClick: () => setSelectedBuildMaterial(`path:${p.id}`), disabled: (((_a = inventory.paths) === null || _a === void 0 ? void 0 : _a[p.id]) || 0) < 1, style: { ...styles.seedRow, ...(selectedBuildMaterial === `path:${p.id}` ? styles.seedRowActive : {}), opacity: (((_b = inventory.paths) === null || _b === void 0 ? void 0 : _b[p.id]) || 0) < 1 ? .4 : 1 } },
                            React.createElement("span", { style: { fontSize: 18 } }, p.icon),
                            React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, p.name),
                                React.createElement("div", { style: { fontSize: 10, opacity: .7 } }, (((_c = inventory.paths) === null || _c === void 0 ? void 0 : _c[p.id]) || 0), " squares owned"))); })),
                    buildCatalogTab === 'containers' && React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                        React.createElement("div", { style: { ...styles.materialGroupLabel } }, "\uD83E\uDEA3 Planter Buckets"),
                        PLANTER_BUCKET_TYPES.map((b) => { var _a, _b, _c; return React.createElement("button", { key: `build-${b.id}`, onClick: () => setSelectedBuildMaterial(`bucket:${b.id}`), disabled: (((_a = inventory.planterBuckets) === null || _a === void 0 ? void 0 : _a[b.id]) || 0) < 1, style: { ...styles.seedRow, ...(selectedBuildMaterial === `bucket:${b.id}` ? styles.seedRowActive : {}), opacity: (((_b = inventory.planterBuckets) === null || _b === void 0 ? void 0 : _b[b.id]) || 0) < 1 ? .4 : 1 } },
                            React.createElement("span", { style: { fontSize: 18 } }, "\uD83E\uDEA3"),
                            React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, b.name),
                                React.createElement("div", { style: { fontSize: 10, opacity: .7 } }, (((_c = inventory.planterBuckets) === null || _c === void 0 ? void 0 : _c[b.id]) || 0), " owned"))); }),
                        React.createElement("div", { style: { ...styles.materialGroupLabel, marginTop: 10 } }, "\uD83E\uDEB4 Tree Containers"),
                        TREE_CONTAINER_TYPES.map((t) => { var _a, _b, _c; return React.createElement("button", { key: `build-${t.id}`, onClick: () => setSelectedBuildMaterial(`treecontainer:${t.id}`), disabled: (((_a = inventory.treeContainers) === null || _a === void 0 ? void 0 : _a[t.id]) || 0) < 1, style: { ...styles.seedRow, ...(selectedBuildMaterial === `treecontainer:${t.id}` ? styles.seedRowActive : {}), opacity: (((_b = inventory.treeContainers) === null || _b === void 0 ? void 0 : _b[t.id]) || 0) < 1 ? .4 : 1 } },
                            React.createElement("span", { style: { fontSize: 18 } }, "\uD83E\uDEB4"),
                            React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, t.name),
                                React.createElement("div", { style: { fontSize: 10, opacity: .7 } }, (((_c = inventory.treeContainers) === null || _c === void 0 ? void 0 : _c[t.id]) || 0), " owned · movable tropical tree pot"))); })),
                    buildCatalogTab === 'water' && (() => {
                        const hasAnyWaterOrPvc = inventory.rainBarrels > 0 || inventory.spigots > 0 || inventory.pvcFeet > 0 || pipes.length > 0;
                        return React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                            React.createElement("div", { style: { ...styles.materialGroupLabel } }, "\uD83D\uDEB0 Water Setup"),
                            React.createElement("div", { style: { fontSize: 9, color: '#6b5844', marginTop: -2, marginBottom: 4 } }, "Place water sources and PVC lines from this category."),
                            React.createElement("button", { onClick: () => setSelectedBuildMaterial('barrel'), disabled: inventory.rainBarrels < 1, style: { ...styles.seedRow, ...(selectedBuildMaterial === 'barrel' ? styles.seedRowActive : {}), opacity: inventory.rainBarrels < 1 ? 0.4 : 1 } },
                                React.createElement("span", { style: { fontSize: 18 } }, "\uD83D\uDEE2\uFE0F"),
                                React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                    React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, "Rain Barrel"),
                                    React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } }, inventory.rainBarrels, " owned"))),
                            React.createElement("button", { onClick: () => setSelectedBuildMaterial('spigot'), disabled: inventory.spigots < 1, style: { ...styles.seedRow, ...(selectedBuildMaterial === 'spigot' ? styles.seedRowActive : {}), opacity: inventory.spigots < 1 ? 0.4 : 1 } },
                                React.createElement("span", { style: { fontSize: 18 } }, "\uD83D\uDEB0"),
                                React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                    React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, "Water Spigot"),
                                    React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } }, inventory.spigots, " owned"))),
                            React.createElement("button", { onClick: () => setSelectedBuildMaterial('pvc'), disabled: inventory.pvcFeet < 1, style: { ...styles.seedRow, ...(selectedBuildMaterial === 'pvc' ? styles.seedRowActive : {}), opacity: inventory.pvcFeet < 1 ? 0.4 : 1 } },
                                React.createElement(PvcIcon, { size: 20 }),
                                React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                    React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, "PVC Pipe (Schedule 40)"),
                                    React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } }, inventory.pvcFeet, "ft owned"))),
                            pipes.length > 0 && (React.createElement("div", { style: { marginTop: 6, padding: '8px', background: '#EEF3E8', border: '1.5px solid #A8B89A', borderRadius: 5 } },
                                React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: '#3D2B1F', marginBottom: 6 } }, "Placed PVC Runs"),
                                React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 5 } }, pipes.map((p, idx) => (React.createElement("div", { key: `placed-pvc-${p.id}`, style: { display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #C9B98F', borderRadius: 4, padding: '6px 7px' } },
                                    React.createElement(PvcIcon, { size: 17 }),
                                    React.createElement("span", { style: { flex: 1, fontSize: 11, color: '#4A3728' } }, "Run ", idx + 1, " · ", p.feet, "ft · ", pvcConnectionStatus(p).touchesSource ? 'source ✓' : 'source ✕', " · ", pvcConnectionStatus(p).touchesBed ? 'bed ✓' : 'bed ✕'),
                                    React.createElement("button", { style: { ...styles.sellBtn, padding: '4px 7px', fontSize: 10 }, onClick: () => deletePipe(p.id) }, "Remove PVC"))))),
                                React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginTop: 5 } }, "Removing PVC returns the pipe footage to your inventory so you can lay it again."))),
                            !hasAnyWaterOrPvc && React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "No water-layout materials yet — buy some at the Plant Nursery."));
                    })())),
                mode === 'water' && (React.createElement("div", { style: styles.shopPanel },
                    React.createElement("div", { style: styles.panelTitle }, "Watering Tool"),
                    React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                        inventory.waterTools.can > 0 && (React.createElement("button", { onClick: () => setSelectedWaterTool('can'), style: { ...styles.seedRow, ...(selectedWaterTool === 'can' ? styles.seedRowActive : {}) } },
                            React.createElement("span", { style: { fontSize: 18 } }, "\uD83E\uDEA3"),
                            React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, "Watering Can"),
                                React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } },
                                    inventory.waterTools.can,
                                    " owned")))),
                        hasConnectedPvc && (React.createElement("button", { onClick: () => setSelectedWaterTool('pvc'), style: { ...styles.seedRow, ...(selectedWaterTool === 'pvc' ? styles.seedRowActive : {}) } },
                            React.createElement(PvcIcon, { size: 20 }),
                            React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, "PVC Pipe"),
                                React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } }, "connected \u2014 touch the spigot/barrel to turn water on")))),
                        hasPlacedPvc && !hasConnectedPvc && (React.createElement("div", { style: { fontSize: 11, color: '#A33', fontStyle: 'italic' } }, "PVC is placed but not connected to a barrel or spigot \u2014 it won't water yet.")),
                        pipes.length > 0 && (React.createElement("div", { style: { marginTop: 6, padding: '8px', background: '#F7E7E3', border: '1.5px solid #C16B3D', borderRadius: 5 } },
                            React.createElement("div", { style: { fontSize: 11, fontWeight: 800, color: '#7A2F28', marginBottom: 6 } }, "Manage Placed PVC"),
                            React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, pipes.map((p, idx) => (React.createElement("div", { key: `water-remove-pvc-${p.id}`, style: { display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid #D8B5AA', borderRadius: 4, padding: '7px 8px' } },
                                React.createElement(PvcIcon, { size: 18 }),
                                React.createElement("span", { style: { flex: 1, fontSize: 11, color: '#4A3728' } },
                                    "PVC Run ",
                                    idx + 1,
                                    " \u00B7 ",
                                    p.feet,
                                    "ft \u00B7 ",
                                    pvcConnectionStatus(p).touchesSource ? 'source ✓' : 'source ✕',
                                    " \u00B7 ",
                                    pvcConnectionStatus(p).touchesBed ? 'bed ✓' : 'bed ✕'),
                                React.createElement("button", { onClick: () => deletePipe(p.id), style: { background: '#A33', color: '#fff', border: '1px solid #6E211D', borderRadius: 4, padding: '6px 9px', fontSize: 10, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' } }, "Remove PVC"))))),
                            React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginTop: 6 } }, "Removed pipe footage returns to your PVC inventory so you can lay it again."))),
                        (spigots.length > 0 || barrels.length > 0) && (React.createElement("div", { style: { marginTop: 6, padding: '8px', background: '#EEF3E8', border: '1.5px solid #A8B89A', borderRadius: 5 } },
                            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: '#3D2B1F', marginBottom: 6 } }, "Water Sources"),
                            React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 5 } },
                                spigots.map((sp, idx) => (React.createElement("button", { key: `water-spigot-${sp.id}`, onClick: () => toggleSpigot(sp.id), style: { ...styles.seedRow, padding: '7px 8px', ...(sp.on ? styles.seedRowActive : {}) } },
                                    React.createElement("span", { style: { fontSize: 17 } }, "\uD83D\uDEB0"),
                                    React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                        React.createElement("div", { style: { fontWeight: 700, fontSize: 12 } },
                                            "Spigot ",
                                            idx + 1),
                                        React.createElement("div", { style: { fontSize: 10, opacity: 0.75 } }, sp.on ? 'Water ON — click to turn off' : 'Water OFF — click to turn on'))))),
                                barrels.map((br, idx) => (React.createElement("button", { key: `water-barrel-${br.id}`, onClick: () => toggleBarrel(br.id), style: { ...styles.seedRow, padding: '7px 8px', ...(br.on ? styles.seedRowActive : {}) } },
                                    React.createElement("span", { style: { fontSize: 17 } }, "\uD83D\uDEE2\uFE0F"),
                                    React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                        React.createElement("div", { style: { fontWeight: 700, fontSize: 12 } },
                                            "Rain Barrel ",
                                            idx + 1),
                                        React.createElement("div", { style: { fontSize: 10, opacity: 0.75 } }, br.on ? 'Water ON — click to turn off' : 'Water OFF — click to turn on')))))),
                            hasConnectedPvc && !pvcHasOnSource && (React.createElement("div", { style: { fontSize: 10, color: '#8A4F20', marginTop: 6 } }, "Turn on a connected spigot or rain barrel, then select PVC Pipe above.")))),
                        (inventory.spigots > 0 || inventory.rainBarrels > 0 || inventory.pvcFeet > 0) && (React.createElement("div", { style: { marginTop: 6, padding: '8px', background: '#F3ECDD', border: '1.5px solid #C9B98F', borderRadius: 5 } },
                            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: '#4A3728', marginBottom: 6 } }, "Water setup waiting to be placed"),
                            React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 5 } },
                                inventory.spigots > 0 && (React.createElement("button", { onClick: () => { setMode('build'); setSelectedBuildMaterial('spigot'); }, style: { ...styles.seedRow, padding: '7px 8px' } },
                                    React.createElement("span", { style: { fontSize: 17 } }, "\uD83D\uDEB0"),
                                    React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                        React.createElement("div", { style: { fontWeight: 700, fontSize: 12 } }, "Water Spigot"),
                                        React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } },
                                            inventory.spigots,
                                            " unplaced \u2014 click to place")))),
                                inventory.rainBarrels > 0 && (React.createElement("button", { onClick: () => { setMode('build'); setSelectedBuildMaterial('barrel'); }, style: { ...styles.seedRow, padding: '7px 8px' } },
                                    React.createElement("span", { style: { fontSize: 17 } }, "\uD83D\uDEE2\uFE0F"),
                                    React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                        React.createElement("div", { style: { fontWeight: 700, fontSize: 12 } }, "Rain Barrel"),
                                        React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } },
                                            inventory.rainBarrels,
                                            " unplaced \u2014 click to place")))),
                                inventory.pvcFeet > 0 && (React.createElement("button", { onClick: () => { setMode('build'); setSelectedBuildMaterial('pvc'); }, style: { ...styles.seedRow, padding: '7px 8px' } },
                                    React.createElement(PvcIcon, { size: 18 }),
                                    React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                        React.createElement("div", { style: { fontWeight: 700, fontSize: 12 } }, "PVC Pipe"),
                                        React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } },
                                            inventory.pvcFeet,
                                            "ft unplaced \u2014 click to lay pipe"))))),
                            React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginTop: 6 } }, "Spigots, barrels, and PVC must be placed in Build mode before they can water plants."))),
                        spigots.length === 0 && barrels.length === 0 && inventory.waterTools.can === 0 && !hasPlacedPvc && inventory.spigots === 0 && inventory.rainBarrels === 0 && inventory.pvcFeet === 0 && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "No watering equipment yet \u2014 buy a can, spigot, rain barrel, or PVC at the Plant Nursery.")),
                        (spigots.length > 0 || barrels.length > 0) && (React.createElement("div", { style: { fontSize: 11, color: '#4A3728', marginTop: 6 } }, "Touch a placed spigot or barrel on the grid to turn its water on or off."))),
                    (inventory.rainBarrels + barrels.length) > 0 && (React.createElement("div", { style: { fontSize: 11, color: '#4A3728', marginTop: 10, background: '#EDE6D6', padding: '6px 8px', borderRadius: 3 } },
                        "\uD83D\uDEE2\uFE0F Rain barrel water: ",
                        Math.round(inventory.rainBarrelGallons),
                        "/",
                        (inventory.rainBarrels + barrels.length) * RAIN_BARREL.capacity,
                        " gal")))),
                mode === 'fertilize' && (React.createElement("div", { style: styles.shopPanel },
                    React.createElement("div", { style: styles.panelTitle }, "Brewed Fertilizer"),
                    React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                        FERTILIZER_RECIPES.filter((r) => (inventory.fertilizers[r.id] || 0) > 0).map((r) => (React.createElement("button", { key: r.id, onClick: () => setSelectedFertilizer(r.id), style: { ...styles.seedRow, ...(selectedFertilizer === r.id ? styles.seedRowActive : {}) } },
                            React.createElement("span", { style: { fontSize: 18 } }, r.icon),
                            React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, r.name),
                                React.createElement("div", { style: { fontSize: 10, opacity: 0.7 } },
                                    inventory.fertilizers[r.id],
                                    " bottles"))))),
                        FERTILIZER_RECIPES.every((r) => (inventory.fertilizers[r.id] || 0) === 0) && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } }, "No brewed fertilizer yet \u2014 steep a batch in the Start Indoor tab."))))),
                mode === 'plant' && !pendingTransplant && (React.createElement("div", { style: styles.shopPanel },
                    React.createElement("div", { style: styles.panelTitle }, "Seeds / Live Plants Source"),
                    React.createElement("div", { style: styles.methodRow },
                        React.createElement("button", { onClick: () => setSelectedSource('seed'), style: { ...styles.methodBtn, ...(selectedSource === 'seed' ? styles.methodBtnActive : {}), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 } }, React.createElement(SeedPacketIcon, { size: 22 }), "Seed"),
                        React.createElement("button", { onClick: () => setSelectedSource('plant'), style: { ...styles.methodBtn, ...(selectedSource === 'plant' ? styles.methodBtnActive : {}) } }, "\uD83E\uDEB4 Live Plant")),
                    React.createElement("div", { style: { marginTop: 7, padding: '7px 8px', borderRadius: 6, background: '#EEF5E8', color: '#47623E', fontSize: 10, lineHeight: 1.4, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 } }, React.createElement(SeedPacketIcon, { size: 22 }), React.createElement("span", null, "Seeds saved from your harvest automatically replenish the Seed list below.")),
                    React.createElement("button", { onClick: () => setBasketOpen(true), style: {
                            width: '100%', marginTop: 12, padding: '10px 11px', cursor: 'pointer', textAlign: 'left',
                            border: '1.5px solid #9B875F', borderRadius: 6, background: '#F4E9CF', color: '#4A3728',
                            boxShadow: '0 1px 0 rgba(74,55,40,0.08)'
                        }, title: "Open your harvest basket" },
                        React.createElement("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 } },
                            React.createElement("span", { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                                React.createElement("span", { style: { fontSize: 24 } }, "\uD83E\uDDFA"),
                                React.createElement("span", null,
                                    React.createElement("div", { style: { fontWeight: 800, fontSize: 13 } }, "Harvest Basket"),
                                    React.createElement("div", { style: { fontSize: 10, opacity: 0.75 } }, basketSizeId ? `${basketItems.length} of ${basketCapacity()} slots used` : 'No basket owned yet'))),
                            React.createElement("span", { style: { fontSize: 12, fontWeight: 800 } }, "Open \u2192")),
                        basketSizeId && basketItems.length > 0 && (React.createElement("div", { style: { display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' } },
                            basketItems.slice(0, 8).map((item) => (React.createElement("span", { key: item.id, title: item.name, style: { fontSize: 18, lineHeight: 1 } }, item.emoji))),
                            basketItems.length > 8 && React.createElement("span", { style: { fontSize: 10, alignSelf: 'center', fontWeight: 700 } },
                                "+",
                                basketItems.length - 8)))),
                    React.createElement("div", { style: { ...styles.panelTitle, marginTop: 14 } }, "From Inventory \u2014 click once, plant many"),
                    React.createElement("div", { style: styles.seedList },
                        PLANTS.filter((p) => (selectedSource === 'seed' ? inventory.seeds[p.id] : inventory.livePlants[p.id]) > 0).map((p) => {
                            const growable = canGrowInZone(p, zone);
                            const owned = selectedSource === 'seed' ? inventory.seeds[p.id] : inventory.livePlants[p.id];
                            return (React.createElement("button", { key: p.id, onClick: () => setSelectedPlantId(p.id), disabled: !growable, style: { ...styles.seedRow, ...(selectedPlantId === p.id ? styles.seedRowActive : {}), opacity: growable ? 1 : 0.35 } },
                                selectedSource === 'seed' ? React.createElement(SeedPacketIcon, { size: 32, title: `${p.name} seed packet` }) : React.createElement("span", { style: { fontSize: 18 } }, p.emoji),
                                React.createElement("span", { style: { flex: 1, textAlign: 'left', marginLeft: 8 } },
                                    React.createElement("div", { style: { fontWeight: 700, fontSize: 13 } }, p.name),
                                    React.createElement("div", { style: { fontSize: 11, opacity: 0.7 } },
                                        p.perSqFt,
                                        "/sq ft \u00B7 ",
                                        owned,
                                        " in stock"))));
                        }),
                        PLANTS.every((p) => (selectedSource === 'seed' ? inventory.seeds[p.id] : inventory.livePlants[p.id]) === 0) && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', fontStyle: 'italic' } },
                            "No ",
                            selectedSource === 'seed' ? 'seed packets' : 'live plants',
                            " in inventory \u2014 buy some at the Plant Nursery."))))),
                React.createElement("div", { style: styles.scorePanel },
                    React.createElement("div", { style: styles.panelTitle }, "Season Score"),
                    React.createElement("div", { style: styles.scoreValue },
                        "$",
                        score)))),
        basketOpen && (React.createElement("div", { style: styles.modalOverlay },
            React.createElement("div", { style: { ...styles.modalCard, maxWidth: 620 } },
                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 } },
                    React.createElement("div", null,
                        React.createElement("div", { style: styles.panelTitle },
                            "\uD83E\uDDFA Harvest Basket ",
                            basketSizeId ? `(${basketItems.length}/${basketCapacity()})` : ''),
                        React.createElement("div", { style: { fontSize: 10, color: '#6b5844', marginTop: 2 } }, "Review each harvest, then Sell it, Keep it as food, or Save Seeds to replenish your planting stock.")),
                    React.createElement("button", { style: styles.modalClose, onClick: () => setBasketOpen(false) }, "Close")),
                !basketSizeId && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', marginTop: 12, padding: 12, background: '#F4E9CF', borderRadius: 6 } }, "You don't own a basket yet \u2014 buy one at the Plant Nursery (Gear tab) before you can harvest.")),
                basketSizeId && basketItems.length === 0 && (React.createElement("div", { style: { fontSize: 12, color: '#6b5844', marginTop: 12, padding: 12, background: '#F4E9CF', borderRadius: 6 } }, "Basket is empty. Harvest ready crops in the Yard to fill it.")),
                basketItems.length > 0 && (React.createElement(React.Fragment, null,
                    React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(245px, 1fr))', gap: 9, marginTop: 12, maxHeight: 390, overflowY: 'auto', paddingRight: 3 } }, basketItems.map((item) => {
                        const val = basketItemCurrentValue(item);
                        const health = basketItemHealth(item);
                        const freshness = basketItemFreshness(item);
                        const condition = basketItemConditionLabel(item);
                        const spoilThreshold = inventory.clothes.hat > 0 ? Math.round(SPOIL_DAYS * (1 + CLOTHES.find((c) => c.id === 'hat').amount)) : SPOIL_DAYS;
                        const spoiled = item.daysIn >= spoilThreshold;
                        const seedYield = basketSeedYield(item);
                        return (React.createElement("div", { key: item.id, style: { border: '1.5px solid #C9B98F', borderRadius: 7, background: '#FFFDF6', padding: 10 } },
                            React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 9 } },
                                React.createElement("span", { style: { fontSize: 28 } }, item.emoji),
                                React.createElement("div", { style: { flex: 1 } },
                                    React.createElement("div", { style: { fontWeight: 800, fontSize: 13 } }, item.name),
                                    React.createElement("div", { style: { fontSize: 10, color: spoiled ? '#A33' : item.sellable === false ? '#C1443C' : '#6b5844', fontWeight: 700 } }, condition)),
                                React.createElement("div", { style: { textAlign: 'right' } },
                                    React.createElement("div", { style: { fontWeight: 800, fontSize: 13 } },
                                        "$",
                                        val),
                                    React.createElement("div", { style: { fontSize: 9, color: '#6b5844' } }, "current value"))),
                            React.createElement("div", { style: { marginTop: 9 } },
                                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, marginBottom: 3 } },
                                    React.createElement("span", null, "Health at harvest"),
                                    React.createElement("span", null,
                                        health,
                                        "%")),
                                React.createElement("div", { style: { height: 7, background: '#E5DDCC', borderRadius: 99, overflow: 'hidden' } },
                                    React.createElement("div", { style: { width: `${health}%`, height: '100%', background: health > 60 ? '#5C7A4F' : health > 30 ? '#C16B3D' : '#A33' } }))),
                            React.createElement("div", { style: { marginTop: 7 } },
                                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, marginBottom: 3 } },
                                    React.createElement("span", null, "Freshness"),
                                    React.createElement("span", null,
                                        freshness,
                                        "%")),
                                React.createElement("div", { style: { height: 7, background: '#E5DDCC', borderRadius: 99, overflow: 'hidden' } },
                                    React.createElement("div", { style: { width: `${freshness}%`, height: '100%', background: freshness > 60 ? '#5C7A4F' : freshness > 30 ? '#C16B3D' : '#A33' } }))),
                            React.createElement("div", { style: { fontSize: 9, color: '#6b5844', marginTop: 6 } }, spoiled ? 'Spoiled — no sale value.' : item.sellable === false ? 'Weak harvest — can be kept, but not sold.' : `Basket day ${item.daysIn} of ${spoilThreshold}.`),
                            React.createElement("div", { style: { display: 'flex', gap: 7, marginTop: 9 } },
                                React.createElement("button", { style: { ...styles.basketActionBtn, flex: 1, ...(item.sellable === false ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }, onClick: () => sellBasketItem(item.id), disabled: item.sellable === false }, "Sell"),
                                React.createElement("button", { style: { ...styles.basketActionBtn, flex: 1 }, onClick: () => keepBasketItem(item.id) }, "Keep Food")),
                            React.createElement("button", { style: { ...styles.basketActionBtn, width: '100%', marginTop: 7, ...(seedYield < 1 ? { opacity: 0.45, cursor: 'not-allowed' } : { background: '#EEF5E8', borderColor: '#78966B', color: '#3F5D37' }), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }, onClick: () => saveBasketSeeds(item.id), disabled: seedYield < 1, title: seedYield < 1 ? 'Seeds were already collected from this plant before harvest.' : `Save ${seedYield} viable seeds for replanting.` },
                                React.createElement(SeedPacketIcon, { size: 20 }),
                                seedYield > 0 ? `Save Seeds (+${seedYield})` : 'Seeds Already Collected')));
                    })),
                    React.createElement("div", { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
                        React.createElement("button", { style: styles.finishPipeBtn, onClick: sellAllBasket }, "Sell All"),
                        React.createElement("button", { style: styles.finishPipeBtn, onClick: keepAllBasket }, "Keep All Food"),
                        React.createElement("button", { style: { ...styles.finishPipeBtn, background: '#5C7A4F', display: 'inline-flex', alignItems: 'center', gap: 7 }, onClick: saveAllBasketSeeds }, React.createElement(SeedPacketIcon, { size: 20 }), "Save All Seeds")))))))));
}
// ---------- CHASING THE SUN (sun-mapping mini-game) ----------
// Curated example plants spanning the three real sun-need categories, kept separate from the main
// PLANTS list since this is a standalone teaching tool, not tied to the farm economy.
const SUNMAP_PLANTS = [
    { id: 'tomato2', name: 'Tomato', emoji: '🍅', need: 'full', tip: 'Needs 6-8+ hours of direct sun for good fruit production.' },
    { id: 'sunflower2', name: 'Sunflower', emoji: '🌻', need: 'full', tip: 'A full-sun lover — young flowers even track the sun across the sky.' },
    { id: 'zucchini2', name: 'Zucchini', emoji: '🎃', need: 'full', tip: 'Needs full sun for healthy, productive squash.' },
    { id: 'lavender2', name: 'Lavender', emoji: '🪻', need: 'full', tip: 'Wants full sun and good drainage — struggles and gets leggy in shade.' },
    { id: 'lettuce2', name: 'Lettuce', emoji: '🥬', need: 'part', tip: 'Prefers some afternoon shade in hot climates — too much sun makes it bolt.' },
    { id: 'blueberry2', name: 'Blueberry', emoji: '🫐', need: 'part', tip: 'Does best with morning sun and afternoon shade.' },
    { id: 'pansy2', name: 'Pansy', emoji: '🌸', need: 'part', tip: 'A cool-season flower that thrives with partial shade.' },
    { id: 'hydrangea2', name: 'Hydrangea', emoji: '💐', need: 'part', tip: 'Morning sun, afternoon shade is the classic recommendation.' },
    { id: 'hosta2', name: 'Hosta', emoji: '🍃', need: 'shade', tip: 'A classic shade-garden staple — leaves scorch in direct sun.' },
    { id: 'fern2', name: 'Fern', emoji: '🌿', need: 'shade', tip: 'A woodland plant that needs deep shade and consistent moisture.' },
    { id: 'astilbe2', name: 'Astilbe', emoji: '🌺', need: 'shade', tip: 'A shade-loving perennial with plume-like flowers.' },
    { id: 'lily2', name: 'Lily of the Valley', emoji: '🔔', need: 'shade', tip: 'Thrives in full shade, often planted right under trees.' },
];
const SUNMAP_OBJECTS = [
    { id: 'house', label: 'House', x: 110, width: 110, height: 130 },
    { id: 'tree', label: 'Tree', x: 400, width: 70, height: 95 },
    { id: 'fence', label: 'Fence', x: 660, width: 150, height: 32 },
];
const SUNMAP_COLS = 12;
const SUNMAP_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const SUNMAP_GROUND_Y = 280;
const SUNMAP_SUN_CENTER_X = 400;
const SUNMAP_SUN_RADIUS = 350;
const SUNMAP_SUN_TOP_Y = 20;
function sunmapSunPos(hour) {
    const progress = (hour - 6) / 12;
    const angle = progress * Math.PI;
    const x = SUNMAP_SUN_CENTER_X - SUNMAP_SUN_RADIUS * Math.cos(angle);
    const elevation = Math.sin(angle); // 0 at horizon, 1 at solar noon
    const y = SUNMAP_GROUND_Y - (SUNMAP_GROUND_Y - SUNMAP_SUN_TOP_Y) * elevation;
    return { x, y, elevation };
}
function sunmapShadowInterval(obj, hour) {
    const { x: sunX, elevation } = sunmapSunPos(hour);
    const shadowLength = obj.height * (0.25 + (1 - elevation) * 1.6);
    const dir = sunX < obj.x ? 1 : -1;
    const near = obj.x;
    const far = obj.x + dir * shadowLength;
    return [Math.min(near, far) - obj.width / 2, Math.max(near, far) + obj.width / 2];
}
function sunmapColumnLit(colCenterX, hour) {
    return !SUNMAP_OBJECTS.some((obj) => {
        const [lo, hi] = sunmapShadowInterval(obj, hour);
        return colCenterX >= lo && colCenterX <= hi;
    });
}
function sunmapClassify(litCount) {
    if (litCount >= 8)
        return { id: 'full', label: 'Full Sun', color: '#E8C84A' };
    if (litCount >= 3)
        return { id: 'part', label: 'Part Sun/Shade', color: '#D98E2B' };
    return { id: 'shade', label: 'Full Shade', color: '#5C7A93' };
}
// Real orientation reference: in the Northern Hemisphere the sun rises in the east, arcs through the
// south at solar noon, and sets in the west — which is why south-facing garden spots get the most
// consistent sun. This compass is used both in the Sun Map mini-game and in the Yard.
function CompassRose({ size = 90 }) {
    return (React.createElement("svg", { viewBox: "0 0 100 100", width: size, height: size },
        React.createElement("circle", { cx: 50, cy: 50, r: 46, fill: "#F7F2E7", stroke: "#4A3728", strokeWidth: 2 }),
        React.createElement("circle", { cx: 50, cy: 50, r: 38, fill: "none", stroke: "#B8A98A", strokeWidth: 1 }),
        React.createElement("line", { x1: 50, y1: 8, x2: 50, y2: 92, stroke: "#B8A98A", strokeWidth: 1 }),
        React.createElement("line", { x1: 8, y1: 50, x2: 92, y2: 50, stroke: "#B8A98A", strokeWidth: 1 }),
        React.createElement("path", { d: "M50,10 L57,50 L50,90 L43,50 Z", fill: "#C1443C", opacity: 0.85 }),
        React.createElement("path", { d: "M10,50 L50,43 L90,50 L50,57 Z", fill: "#8A6244", opacity: 0.7 }),
        React.createElement("text", { x: 50, y: 20, textAnchor: "middle", fontSize: 13, fontWeight: "700", fill: "#4A3728" }, "N"),
        React.createElement("text", { x: 50, y: 86, textAnchor: "middle", fontSize: 13, fontWeight: "700", fill: "#4A3728" }, "S"),
        React.createElement("text", { x: 17, y: 54, textAnchor: "middle", fontSize: 13, fontWeight: "700", fill: "#4A3728" }, "W"),
        React.createElement("text", { x: 83, y: 54, textAnchor: "middle", fontSize: 13, fontWeight: "700", fill: "#4A3728" }, "E")));
}
function SunMapTab() {
    const [hour, setHour] = useState(12);
    const [selectedPlantId, setSelectedPlantId] = useState(null);
    const [placements, setPlacements] = useState({}); // { colIndex: plantId }
    const [feedback, setFeedback] = useState(null);
    const sceneWidth = 800;
    const colWidth = sceneWidth / SUNMAP_COLS;
    const columns = Array.from({ length: SUNMAP_COLS }).map((_, i) => i * colWidth + colWidth / 2);
    const classifications = columns.map((colX) => {
        const litCount = SUNMAP_HOURS.filter((h) => sunmapColumnLit(colX, h)).length;
        return { litCount, ...sunmapClassify(litCount) };
    });
    const sun = sunmapSunPos(hour);
    const shadowsNow = SUNMAP_OBJECTS.map((obj) => ({ obj, interval: sunmapShadowInterval(obj, hour) }));
    function placePlant(colIndex) {
        if (!selectedPlantId) {
            setFeedback({ ok: null, msg: 'Pick a plant from the palette first.' });
            return;
        }
        const plant = SUNMAP_PLANTS.find((p) => p.id === selectedPlantId);
        const cls = classifications[colIndex];
        const ok = plant.need === cls.id;
        setPlacements((prev) => ({ ...prev, [colIndex]: selectedPlantId }));
        setFeedback({
            ok,
            msg: ok
                ? `✅ Great match! ${plant.name} needs ${plant.need === 'full' ? 'full sun' : plant.need === 'part' ? 'part sun/part shade' : 'full shade'}, and this spot gets ${cls.label.toLowerCase()} (~${cls.litCount} of ${SUNMAP_HOURS.length} sampled daylight hours lit). ${plant.tip}`
                : `⚠️ Not quite — ${plant.name} needs ${plant.need === 'full' ? 'full sun' : plant.need === 'part' ? 'part sun/part shade' : 'full shade'}, but this spot is ${cls.label.toLowerCase()} (~${cls.litCount} of ${SUNMAP_HOURS.length} lit). ${plant.tip}`,
        });
    }
    const correctCount = Object.entries(placements).filter(([colIndex, plantId]) => {
        const plant = SUNMAP_PLANTS.find((p) => p.id === plantId);
        return plant && plant.need === classifications[colIndex].id;
    }).length;
    return (React.createElement("div", { style: styles.mainAreaSingle },
        React.createElement("h2", { style: { fontFamily: serif, color: '#4A3728', marginTop: 0 } }, "\u2600\uFE0F Chasing the Sun"),
        React.createElement("p", { style: { fontSize: 13, color: '#6b5844', maxWidth: 700 } }, "Drag the time slider to watch shadows move across the yard through the day. Each strip of ground is automatically scored for how many daylight hours it actually gets direct sun \u2014 then match real plants to the spot that fits their real sun needs."),
        React.createElement("div", { style: { display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' } },
            React.createElement("div", { style: { flex: '0 0 auto', textAlign: 'center' } },
                React.createElement(CompassRose, { size: 90 }),
                React.createElement("div", { style: { fontSize: 10, color: '#6b5844', maxWidth: 100, marginTop: 4 } }, "Sun rises East, peaks South, sets West \u2014 this scene's left-to-right sweep matches that real path.")),
            React.createElement("div", { style: { flex: 1, minWidth: 300 } },
                React.createElement("svg", { viewBox: "0 0 800 400", style: { width: '100%', maxWidth: 800, background: 'linear-gradient(to bottom, #BFE0F0 0%, #E8F4FA 70%, #DDD3B8 70%, #DDD3B8 100%)', borderRadius: 6, border: '2px solid #4A3728' } },
                    React.createElement("circle", { cx: sun.x, cy: sun.y, r: 22, fill: "#F4D35E", opacity: 0.95 }),
                    React.createElement("circle", { cx: sun.x, cy: sun.y, r: 32, fill: "#F4D35E", opacity: 0.25 }),
                    columns.map((colX, i) => (React.createElement("rect", { key: i, x: colX - colWidth / 2, y: SUNMAP_GROUND_Y, width: colWidth, height: 70, fill: classifications[i].color, opacity: 0.55, stroke: "#4A3728", strokeWidth: 0.5 }))),
                    shadowsNow.map(({ obj, interval }) => (React.createElement("rect", { key: obj.id, x: interval[0], y: SUNMAP_GROUND_Y, width: interval[1] - interval[0], height: 70, fill: "#2E2117", opacity: 0.35 }))),
                    SUNMAP_OBJECTS.map((obj) => (React.createElement("g", { key: obj.id },
                        obj.id === 'tree' ? (React.createElement(React.Fragment, null,
                            React.createElement("rect", { x: obj.x - 6, y: SUNMAP_GROUND_Y - 30, width: 12, height: 30, fill: "#6B4A2E" }),
                            React.createElement("circle", { cx: obj.x, cy: SUNMAP_GROUND_Y - obj.height + 20, r: obj.width / 2, fill: "#4F7A3D" }))) : obj.id === 'fence' ? (React.createElement("rect", { x: obj.x - obj.width / 2, y: SUNMAP_GROUND_Y - obj.height, width: obj.width, height: obj.height, fill: "#8B5A2B", opacity: 0.9 })) : (React.createElement(React.Fragment, null,
                            React.createElement("rect", { x: obj.x - obj.width / 2, y: SUNMAP_GROUND_Y - obj.height, width: obj.width, height: obj.height, fill: "#B8956A" }),
                            React.createElement("path", { d: `M ${obj.x - obj.width / 2 - 10} ${SUNMAP_GROUND_Y - obj.height} L ${obj.x} ${SUNMAP_GROUND_Y - obj.height - 40} L ${obj.x + obj.width / 2 + 10} ${SUNMAP_GROUND_Y - obj.height} Z`, fill: "#7A4B33" }))),
                        React.createElement("text", { x: obj.x, y: SUNMAP_GROUND_Y - obj.height - 8, textAnchor: "middle", fontSize: 11, fill: "#4A3728" }, obj.label)))),
                    Object.entries(placements).map(([colIndex, plantId]) => {
                        const plant = SUNMAP_PLANTS.find((p) => p.id === plantId);
                        const colX = columns[colIndex];
                        return React.createElement("text", { key: colIndex, x: colX, y: SUNMAP_GROUND_Y + 45, textAnchor: "middle", fontSize: 26 }, plant.emoji);
                    }),
                    columns.map((colX, i) => (React.createElement("rect", { key: `click-${i}`, x: colX - colWidth / 2, y: SUNMAP_GROUND_Y, width: colWidth, height: 70, fill: "transparent", style: { cursor: 'pointer' }, onClick: () => placePlant(i) })))))),
        React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, maxWidth: 800 } },
            React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: '#4A3728', minWidth: 90 } },
                "Time of day: ",
                hour,
                ":00"),
            React.createElement("input", { type: "range", min: 6, max: 18, step: 1, value: hour, onChange: (e) => setHour(Number(e.target.value)), style: { flex: 1 } })),
        React.createElement("div", { style: { display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#6b5844' } },
            React.createElement("span", null,
                React.createElement("span", { style: { display: 'inline-block', width: 10, height: 10, background: '#E8C84A', marginRight: 4 } }),
                "Full Sun (6+ hrs)"),
            React.createElement("span", null,
                React.createElement("span", { style: { display: 'inline-block', width: 10, height: 10, background: '#D98E2B', marginRight: 4 } }),
                "Part Sun/Shade (3-6 hrs)"),
            React.createElement("span", null,
                React.createElement("span", { style: { display: 'inline-block', width: 10, height: 10, background: '#5C7A93', marginRight: 4 } }),
                "Full Shade (under 3 hrs)")),
        React.createElement("div", { style: { marginTop: 20 } },
            React.createElement("div", { style: { fontWeight: 700, color: '#4A3728', marginBottom: 8 } }, "Plant Palette \u2014 pick one, then click a spot in the yard"),
            React.createElement("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 800 } }, SUNMAP_PLANTS.map((p) => (React.createElement("button", { key: p.id, onClick: () => setSelectedPlantId(p.id), style: {
                    ...styles.seedRow, width: 130, ...(selectedPlantId === p.id ? styles.seedRowActive : {}),
                }, title: p.tip },
                React.createElement("span", { style: { fontSize: 18 } }, p.emoji),
                React.createElement("span", { style: { marginLeft: 6, fontSize: 12, fontWeight: 700 } }, p.name)))))),
        feedback && (React.createElement("div", { style: { marginTop: 14, padding: 10, borderRadius: 4, maxWidth: 800, fontSize: 13, background: feedback.ok ? '#E8F0E3' : '#F7E7E3', border: `1px solid ${feedback.ok ? '#5C7A4F' : '#C1443C'}` } }, feedback.msg)),
        React.createElement("div", { style: { marginTop: 10, fontSize: 12, color: '#6b5844' } },
            "Correct placements: ",
            correctCount,
            " / ",
            Object.keys(placements).length || 0,
            Object.keys(placements).length > 0 && (React.createElement("button", { style: { ...styles.backBtn, marginLeft: 12, padding: '4px 10px', fontSize: 11 }, onClick: () => { setPlacements({}); setFeedback(null); } }, "Reset")))));
}
function CatalogTab({ discovered }) {
    const entries = [
        ...PLANTS.map((p) => ({ key: `seed-${p.id}`, icon: React.createElement(SeedPacketIcon, { size: 22, title: `${p.name} seed packet` }), label: `${p.name} (seed)` })),
        ...PLANTS.map((p) => ({ key: `plant-${p.id}`, icon: p.emoji, label: `${p.name} (live plant)` })),
        ...SOILS.map((s) => ({ key: `soil-${s.id}`, icon: React.createElement(SoilIcon, { size: 20 }), label: s.name })),
        ...TRAY_SIZES.map((t) => ({ key: `tray-${t.id}`, icon: React.createElement(TrayIcon, { size: 20 }), label: `${t.slots}-cell tray` })),
        { key: 'material-wood', icon: '🪵', label: 'Wood (bed material)' },
        { key: 'material-aluminum', icon: React.createElement(AluminumIcon, { size: 20 }), label: 'Aluminum (bed material)' },
        { key: 'material-cement', icon: React.createElement(CementBlockIcon, { size: 20 }), label: 'Cement Block (bed material)' },
        { key: 'material-sticks', icon: React.createElement(StickIcon, { size: 20 }), label: 'Large Sticks (bed material)' },
        ...WATER_TOOLS.map((t) => ({ key: `tool-${t.id}`, icon: t.icon, label: t.name })),
        { key: 'tool-hose', icon: '🚿', label: 'Water Hose' },
        { key: 'tool-pvc', icon: React.createElement(PvcIcon, { size: 20 }), label: 'PVC Pipe' },
        { key: 'material-barrel', icon: RAIN_BARREL.icon, label: RAIN_BARREL.name },
        ...ADDITIVES.map((a) => ({
            key: `additive-${a.id}`,
            icon: a.id === 'sand' ? React.createElement(SandIcon, { size: 20 }) : a.id === 'woodash' ? React.createElement(AshIcon, { size: 20 }) : a.id === 'mushroomcompost' ? React.createElement(MushroomCompostIcon, { size: 20 }) : a.id === 'acidifier' ? React.createElement(AcidifierIcon, { size: 20 }) : a.icon,
            label: a.name,
        })),
        { key: 'material-light', icon: PLANT_LIGHT.icon, label: PLANT_LIGHT.name },
        { key: 'material-food', icon: React.createElement(PlantFoodIcon, { size: 20 }), label: PLANT_FOOD.name },
        { key: 'tool-hoe', icon: TOOLS.find((t) => t.id === 'hoe').icon, label: 'Hoe' },
        { key: 'tool-shovel', icon: React.createElement(ShovelIcon, { size: 20 }), label: 'Shovel' },
        { key: 'tool-tiller', icon: React.createElement(TillerIcon, { size: 20 }), label: 'Tiller' },
        { key: 'clothing-gloves', icon: CLOTHES.find((c) => c.id === 'gloves').icon, label: 'Garden Gloves' },
        { key: 'clothing-apron', icon: React.createElement(ApronIcon, { size: 20 }), label: 'Garden Apron' },
        { key: 'clothing-hat', icon: React.createElement(HatIcon, { size: 20 }), label: 'Garden Hat' },
        ...BENEFICIAL_BUGS.map((b) => ({ key: `bug-${b.id}`, icon: '🐞', label: b.name })),
        { key: 'material-leaves', icon: LEAVES_ITEM.icon, label: LEAVES_ITEM.name },
        { key: 'material-cardboard', icon: CARDBOARD_ITEM.icon, label: CARDBOARD_ITEM.name },
        { key: 'material-homemadecompost', icon: '🪱', label: 'Homemade Compost' },
        { key: 'material-eggshells', icon: EGGSHELL_ITEM.icon, label: EGGSHELL_ITEM.name },
        { key: 'material-bananapeels', icon: BANANAPEEL_ITEM.icon, label: BANANAPEEL_ITEM.name },
        { key: 'material-coffeegrounds', icon: COFFEEGROUNDS_ITEM.icon, label: COFFEEGROUNDS_ITEM.name },
        { key: 'material-comfreyleaves', icon: '🟩', label: 'Comfrey Leaves' },
        ...FERTILIZER_RECIPES.map((r) => ({ key: `fertilizer-${r.id}`, icon: r.icon, label: r.name })),
        ...MULCH_TYPES.map((m) => ({ key: `mulch-${m.id}`, icon: m.icon || React.createElement(MulchSwatch, { mulchId: m.id, size: 20 }), label: m.name })),
    ];
    const ownedCount = entries.filter((e) => discovered[e.key]).length;
    return (React.createElement("div", { style: styles.mainAreaSingle },
        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 } },
            React.createElement("div", { style: styles.panelTitle }, "Collection \u2014 All"),
            React.createElement("div", { style: { fontSize: 12, color: '#6b5844' } },
                ownedCount,
                "/",
                entries.length)),
        React.createElement("div", { style: styles.catalogGrid }, entries.map((e) => {
            const owned = !!discovered[e.key];
            return (React.createElement("div", { key: e.key, style: { ...styles.catalogCell, ...(owned ? styles.catalogCellOwned : {}) }, title: owned ? e.label : '???' },
                React.createElement("div", { style: { fontSize: 22, opacity: owned ? 1 : 0.15, filter: owned ? 'none' : 'grayscale(1)' } }, e.icon),
                owned && React.createElement("div", { style: styles.catalogCheck }, "\u2713")));
        })),
        React.createElement("div", { style: { fontSize: 11, color: '#6b5844', marginTop: 12, fontStyle: 'italic' } }, "Icons unlock as you buy seeds, live plants, soil, trays, and build beds.")));
}
const serif = 'Georgia, "Times New Roman", serif';
const sans = 'system-ui, -apple-system, sans-serif';
const styles = {
    setupWrap: { minHeight: '100vh', background: '#EDE6D6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, padding: 20 },
    setupCard: { background: '#F7F2E7', border: '2px solid #4A3728', borderRadius: 4, padding: 32, maxWidth: 480, width: '100%', boxShadow: '4px 4px 0 #4A3728' },
    setupAlmanacLayout: { width: '100%', maxWidth: 760, display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'nowrap' },
    almanacCard: { flex: '0 0 240px', width: 240, maxWidth: 240, minWidth: 240, boxSizing: 'border-box', background: '#F4EBD7', border: '2px solid #A88A55', borderRadius: 5, padding: '14px 14px', boxShadow: '3px 3px 0 #7A603D', color: '#3D2B1F', alignSelf: 'flex-start' },
    almanacEyebrow: { textAlign: 'center', fontFamily: serif, fontSize: 12, fontWeight: 800, color: '#3F5F35', letterSpacing: 0.7 },
    almanacDate: { textAlign: 'center', fontFamily: serif, fontSize: 24, fontWeight: 800, color: '#2F241B', marginTop: 8 },
    almanacSubhead: { textAlign: 'center', fontFamily: serif, fontSize: 13, color: '#4A3728', marginTop: 1 },
    almanacRule: { height: 1, background: '#C9B58E', margin: '10px 0 9px' },
    almanacSectionTitle: { fontFamily: serif, fontSize: 11, fontWeight: 900, color: '#3F5F35', letterSpacing: 0.5, borderBottom: '1px solid #C9B58E', paddingBottom: 4, marginTop: 9, marginBottom: 6 },
    almanacConditionGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 5 },
    almanacCondition: { background: 'rgba(255,255,255,0.34)', border: '1px solid #D6C5A6', borderRadius: 4, padding: '7px 7px', minHeight: 76 },
    almanacConditionLabel: { fontSize: 8.5, fontWeight: 900, color: '#4A3728', letterSpacing: 0.2 },
    almanacConditionValue: { fontFamily: serif, fontSize: 14, fontWeight: 800, color: '#355B43', marginTop: 3 },
    almanacConditionNote: { fontSize: 8.5, lineHeight: 1.3, color: '#6b5844', marginTop: 3 },
    almanacActionList: { border: '1px solid #D6C5A6', borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.24)' },
    almanacActionRow: { display: 'flex', gap: 6, alignItems: 'flex-start', padding: '7px 7px', borderBottom: '1px solid #D6C5A6' },
    almanacActionIcon: { width: 20, textAlign: 'center', fontSize: 16, lineHeight: 1.2, flexShrink: 0 },
    almanacActionLabel: { fontSize: 8.5, fontWeight: 900, color: '#3F5F35', textTransform: 'uppercase', letterSpacing: 0.25 },
    almanacActionCrops: { fontFamily: serif, fontSize: 10.5, color: '#3D2B1F', marginTop: 1, lineHeight: 1.25 },
    almanacWisdomBox: { marginTop: 9, background: '#E8E9CD', border: '1px solid #AEB58A', borderRadius: 4, padding: '8px 9px' },
    almanacWisdomTitle: { fontSize: 8.5, fontWeight: 900, color: '#3F5F35', letterSpacing: 0.3, marginBottom: 3 },
    almanacWisdomText: { fontFamily: serif, fontSize: 10.5, lineHeight: 1.3, color: '#3D2B1F' },
    almanacFooter: { marginTop: 8, fontSize: 8.5, color: '#6b5844', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.3 },
    setupHero: { margin: '-32px -32px 16px -32px', background: '#E3D9BF', borderBottom: '2px solid #4A3728', borderRadius: '4px 4px 0 0', overflow: 'hidden' },
    title: { fontFamily: serif, fontSize: 30, color: '#4A3728', margin: 0, letterSpacing: 0.5 },
    subtitle: { color: '#6b5844', fontSize: 13, marginTop: 6, marginBottom: 20, lineHeight: 1.5 },
    setupSection: { marginBottom: 22 },
    setupLabel: { fontWeight: 700, fontSize: 13, color: '#4A3728', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
    zoneGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, maxHeight: 300, overflowY: 'auto', paddingRight: 2 },
    zoneBtn: { textAlign: 'left', background: '#EDE6D6', border: '1.5px solid #B8A98A', borderRadius: 3, padding: '8px 9px', cursor: 'pointer', color: '#4A3728', fontFamily: sans, minWidth: 0 },
    zoneBtnActive: { background: '#5C7A4F', borderColor: '#4A3728', color: '#fff' },
    zoneInfoCard: { marginTop: 10, background: '#E7EFE1', border: '1.5px solid #93AA86', borderRadius: 4, padding: '11px 12px', boxShadow: 'inset 3px 0 0 #5C7A4F' },
    zoneInfoTopRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
    zoneSelectedBadge: { background: '#5C7A4F', color: '#fff', borderRadius: 10, padding: '3px 8px', fontSize: 10, fontWeight: 800, letterSpacing: 0.45 },
    zoneTempBadge: { color: '#4A3728', fontSize: 11, fontWeight: 800, background: 'rgba(255,255,255,0.45)', border: '1px solid #B8C7AE', borderRadius: 10, padding: '3px 8px' },
    zoneInfoHeading: { fontSize: 12, fontWeight: 900, color: '#3F5F35', letterSpacing: 0.3, marginBottom: 5 },
    zoneInfoBody: { fontSize: 11, lineHeight: 1.45, color: '#4A3728', marginBottom: 6 },
    zoneInfoExamples: { fontSize: 11, lineHeight: 1.45, color: '#6b5844', marginBottom: 8 },
    zoneDidYouKnow: { fontSize: 10.5, lineHeight: 1.4, color: '#4A3728', background: 'rgba(92,122,79,0.10)', borderRadius: 3, padding: '6px 8px' },
    budgetValue: { fontFamily: serif, fontSize: 26, color: '#4A3728', textAlign: 'center', marginTop: 6 },
    startBtn: { width: '100%', background: '#4A3728', color: '#EDE6D6', border: 'none', borderRadius: 3, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.4 },
    backBtn: { background: 'transparent', color: '#4A3728', border: '1.5px solid #B8A98A', borderRadius: 3, padding: '14px 16px', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.4 },
    nowPlayingWidget: {
        position: 'fixed', top: 14, left: 14, zIndex: 50, display: 'flex', alignItems: 'center', gap: 6,
        background: '#4A3728', border: '1.5px solid #2E2117', borderRadius: 22, padding: '5px 10px',
        color: '#EDE6D6', boxShadow: '2px 2px 0 rgba(0,0,0,0.2)', maxWidth: 220,
    },
    nowPlayingArrow: { background: 'transparent', border: 'none', color: '#EDE6D6', fontSize: 12, cursor: 'pointer', padding: 2 },
    nowPlayingToggle: {
        background: '#5C7A4F', border: 'none', borderRadius: '50%', width: 22, height: 22, color: '#fff',
        fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    nowPlayingText: { overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 },
    settingsCornerBtn: {
        position: 'fixed', top: 14, right: 14, width: 40, height: 40, borderRadius: '50%',
        background: '#4A3728', color: '#EDE6D6', border: '1.5px solid #2E2117', fontSize: 18,
        cursor: 'pointer', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '2px 2px 0 rgba(0,0,0,0.2)',
    },
    methodCard: { display: 'flex', alignItems: 'center', background: '#EDE6D6', border: '1.5px solid #B8A98A', borderRadius: 4, padding: 12, cursor: 'pointer' },
    methodCardActive: { borderColor: '#5C7A4F', background: '#E3EADD' },
    checkbox: { width: 22, height: 22, border: '2px solid #B8A98A', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' },
    checkboxActive: { background: '#5C7A4F', borderColor: '#4A3728' },
    playWrap: { minHeight: '100vh', background: '#EDE6D6', fontFamily: sans, color: '#3D2B1F', userSelect: 'none' },
    topBar: { display: 'flex', flexDirection: 'column', background: '#4A3728', color: '#EDE6D6', padding: '10px 18px 10px 250px', gap: 8 },
    topBarMainRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%' },
    topBarLeft: { display: 'flex', alignItems: 'baseline', gap: 10 },
    gameTitle: { fontFamily: serif, fontSize: 18, fontWeight: 700 },
    zoneTag: { fontSize: 11, background: '#5C7A4F', padding: '2px 8px', borderRadius: 10 },
    clockBlock: { display: 'flex', alignItems: 'center', gap: 10 },
    calendarStrip: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(237,230,214,0.24)' },
    calendarDateBlock: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 190 },
    calendarDateLabel: { fontFamily: serif, fontSize: 16, fontWeight: 800, color: '#FFF4D8', whiteSpace: 'nowrap' },
    planningTag: { fontSize: 13, fontWeight: 700, color: '#D4B483' },
    weatherTag: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12 },
    weatherTagHeat: { background: '#C1443C', color: '#fff' },
    weatherTagFreeze: { background: '#5C9BD5', color: '#fff' },
    weatherTagRain: { background: '#3D6E96', color: '#fff' },
    clockSeason: { fontSize: 13, fontWeight: 600 },
    speedControls: { display: 'flex', gap: 4 },
    speedSliderWrap: { display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: '5px 10px' },
    speedSliderTitle: { fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#EDE6D6', whiteSpace: 'nowrap' },
    speedSlider: { width: 90 },
    speedSliderLabel: { fontSize: 11, minWidth: 50 },
    speedBtn: { background: 'transparent', border: '1px solid #8FA6B8', color: '#EDE6D6', borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: 'pointer' },
    speedBtnActive: { background: '#8FA6B8', color: '#3D2B1F', fontWeight: 700 },
    topBarRight: { display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' },
    cashBlock: { textAlign: 'right', minWidth: 62 },
    cashLabel: { fontSize: 10, opacity: 0.7, textTransform: 'uppercase' },
    cashValue: { fontFamily: serif, fontSize: 20, fontWeight: 700 },
    topBarSaveBtn: { height: 38, borderRadius: 20, background: '#5C7A4F', color: '#fff', border: '1.5px solid #2E2117', padding: '0 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
    topBarSettingsBtn: { width: 38, height: 38, borderRadius: '50%', background: '#EDE6D6', color: '#4A3728', border: '1.5px solid #2E2117', fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    tabBar: { display: 'flex', gap: 4, background: '#3D2B1F', padding: '6px 14px', flexWrap: 'wrap', alignItems: 'center' },
    tabBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#D4B483', padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRadius: '4px 4px 0 0' },
    tabBtnActive: { background: '#EDE6D6', color: '#4A3728' },
    startSeasonBtn: { background: '#5C7A4F', color: '#fff', border: 'none', borderRadius: 3, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginLeft: 'auto' },
    finishPipeBtn: { background: '#5C7A4F', color: '#fff', border: 'none', borderRadius: 3, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' },
    transplantBanner: { background: '#5C7A4F', color: '#fff', padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    mainArea: { display: 'flex', gap: 16, padding: 16, flexWrap: 'wrap' },
    mainAreaSingle: { padding: 16 },
    yardPanel: { flex: '2 1 560px' },
    modeRow: { display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
    modeBtn: { background: '#F7F2E7', border: '1.5px solid #B8A98A', borderRadius: 3, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#4A3728' },
    modeBtnActive: { background: '#5C7A4F', color: '#fff', borderColor: '#4A3728' },
    quizBtn: { background: '#8FA6B8', border: 'none', borderRadius: 3, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#22303A' },
    woodStockBadge: { fontSize: 11, color: '#4A3728', alignSelf: 'center', fontWeight: 600, background: '#D4B483', padding: '4px 10px', borderRadius: 12 },
    grid: { position: 'relative', display: 'grid', gap: 0, background: '#7A9B5E', backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 2px, transparent 2px, transparent 8px)', border: '2px solid #4A3728', borderRadius: 4, padding: 0, width: 'fit-content', maxWidth: '100%', overflow: 'auto' },
    cell: { background: 'repeating-linear-gradient(135deg, #7FA363, #7FA363 6px, #77995B 6px, #77995B 12px)', border: '1px solid #6B8A52', cursor: 'pointer', position: 'relative' },
    cellDragPreview: { background: 'rgba(92,122,79,0.45)' },
    groundSquareInner: { width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    sqftCellEmpty: { background: 'rgba(92,122,79,0.35)' },
    cellSoiled: { background: 'repeating-linear-gradient(135deg, #5C4A38, #5C4A38 6px, #4A3A2A 6px, #4A3A2A 12px)' },
    cellMulched: { boxShadow: 'inset 0 0 0 2px #9C7B54' },
    cellTilled: { background: 'repeating-linear-gradient(45deg, #6B5A48, #6B5A48 4px, #5A4A38 4px, #5A4A38 8px)' },
    sqftCellSoiled: { background: 'rgba(74,58,42,0.5)' },
    bedOverlay: { position: 'absolute', boxSizing: 'border-box', background: '#B98452', backgroundImage: 'repeating-linear-gradient(90deg, #B98452, #B98452 5px, #A9764A 5px, #A9764A 10px)', border: 'none', outline: '2px solid #6b4a2c', outlineOffset: -2, borderRadius: 2, padding: 0 },
    bedOverlayAluminum: {
        background: '#CDD3D8',
        backgroundImage: 'repeating-linear-gradient(90deg, #E8ECEF 0px, #E8ECEF 2px, #B4BCC2 2px, #B4BCC2 4px, #9AA3AA 4px, #9AA3AA 5px)',
        border: 'none',
        outline: '2px solid #7C868E', outlineOffset: -2,
        boxShadow: 'inset 0 0 4px rgba(255,255,255,0.6)',
    },
    bedOverlayCement: {
        background: '#ACA9A2',
        backgroundImage: 'repeating-linear-gradient(90deg, #B8B5AE 0px, #B8B5AE 18px, #9A968E 18px, #9A968E 20px), repeating-linear-gradient(0deg, transparent 0px, transparent 9px, #8A867E 9px, #8A867E 10px)',
        border: 'none',
        outline: '2px solid #7A766E', outlineOffset: -2,
    },
    bedOverlaySticks: {
        background: '#8B6B47',
        backgroundImage: 'repeating-linear-gradient(35deg, #9C7B54 0px, #9C7B54 6px, #7A5C3B 6px, #7A5C3B 8px)',
        border: 'none',
        outline: '2px solid #5A4128', outlineOffset: -2,
    },
    barrelOverlay: { position: 'absolute', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', background: 'rgba(61,43,31,0.12)', borderRadius: '50%' },
    spigotOverlay: { position: 'absolute', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', background: 'rgba(143,166,184,0.18)', borderRadius: '50%' },
    sourceOn: { boxShadow: '0 0 0 3px #5C9BD5, 0 0 10px 2px rgba(92,155,213,0.7)', background: 'rgba(92,155,213,0.25)' },
    onIndicator: { position: 'absolute', top: -6, right: -4, fontSize: 11 },
    deleteFixtureBtn: { position: 'absolute', bottom: -6, right: -6, width: 16, height: 16, borderRadius: '50%', background: '#A33', color: '#fff', border: '1px solid #4A3728', fontSize: 9, lineHeight: '14px', cursor: 'pointer', padding: 0, zIndex: 2 },
    pipeSvgLayer: { position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 2 },
    cellPipeStart: { outline: '2px dashed #4A5D6E', outlineOffset: -2 },
    deleteBedBtn: { position: 'absolute', top: -8, right: -8, width: 18, height: 18, borderRadius: '50%', background: '#A33', color: '#fff', border: '1px solid #4A3728', fontSize: 10, lineHeight: '16px', cursor: 'pointer', padding: 0, zIndex: 2 },
    phAmendBtn: { background: '#4A3728', color: '#EDE6D6', border: '1px solid #2E2117', borderRadius: 3, fontSize: 9, fontWeight: 700, padding: '2px 5px', cursor: 'pointer' },
    companionBadge: { position: 'absolute', bottom: -3, right: -3, fontSize: 11, borderRadius: '50%', width: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 1px #fff', zIndex: 3 },
    companionBadgeGood: { background: '#DCEEDC' },
    companionBadgeBad: { background: '#F7DADA' },
    pipeDeleteBtn: { position: 'absolute', width: 26, height: 26, borderRadius: '50%', background: '#A33', color: '#fff', border: '2px solid #4A3728', fontSize: 14, fontWeight: 900, lineHeight: '22px', cursor: 'pointer', padding: 0, zIndex: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.45)' },
    bedDims: { position: 'absolute', top: -16, left: 2, fontSize: 9, fontWeight: 700, color: '#4A3728' },
    sqftGrid: { display: 'grid', gap: 0, width: '100%', height: '100%' },
    sqftCell: { boxSizing: 'border-box', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', flexDirection: 'column' },
    sqftCellTransplantTarget: { background: 'rgba(143,166,184,0.5)' },
    miniGrid: { display: 'grid', gap: 0, width: '90%', height: '90%', alignItems: 'center', justifyItems: 'center' },
    healthBarWrap: { position: 'absolute', bottom: 1, left: '10%', width: '80%', height: 2, background: 'rgba(0,0,0,0.3)', borderRadius: 2 },
    stageBadge: { position: 'absolute', top: -3, right: -3, fontSize: 10, background: '#5C7A4F', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 1px #fff' },
    pestBadge: { position: 'absolute', top: -4, left: -4, fontSize: 15, background: '#A33', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px #fff', zIndex: 5 },
    weedBadge: {
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        fontSize: 16, background: 'rgba(92,122,79,0.25)', border: '1px solid #3D4F30', borderRadius: 3,
        cursor: 'pointer', padding: 1, lineHeight: 1, zIndex: 3,
    },
    badWeedBadge: { background: 'rgba(161,51,51,0.38)', border: '2px solid #A33', boxShadow: '0 0 0 1px #fff', zIndex: 8 },
    stageBadgeReady: { position: 'absolute', top: 2, right: 2, fontSize: 18, fontWeight: 900, color: '#fff', background: '#5C7A4F', border: 'none', padding: 0, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px #fff, 0 2px 5px rgba(0,0,0,0.35)', cursor: 'pointer', zIndex: 20 },
    stageBadgeWarn: { position: 'absolute', top: 2, right: 2, fontSize: 18, fontWeight: 900, color: '#3D2B1F', background: '#E8C84A', border: 'none', padding: 0, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px #fff, 0 2px 5px rgba(0,0,0,0.35)', cursor: 'pointer', zIndex: 20 },
    stageBadgeCritical: { position: 'absolute', top: 2, right: 2, fontSize: 18, fontWeight: 900, color: '#fff', background: '#C1443C', border: 'none', padding: 0, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px #fff, 0 2px 5px rgba(0,0,0,0.35)', cursor: 'pointer', zIndex: 20 },
    stageBadgeDanger: { position: 'absolute', top: 2, right: 2, fontSize: 15, background: '#3D2B1F', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px #fff', cursor: 'pointer', zIndex: 20 },
    unwateredBadge: { position: 'absolute', bottom: -4, right: -4, fontSize: 15, fontWeight: 900, color: '#3D2B1F', background: '#E8C84A', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px #fff', zIndex: 4 },
    seedCollectBtn: {
        position: 'absolute', bottom: -3, left: -3, width: 15, height: 15, borderRadius: '50%',
        background: '#D4B483', border: '1px solid #4A3728', fontSize: 9, lineHeight: '13px',
        cursor: 'pointer', padding: 0, zIndex: 2, boxShadow: '0 0 0 1px #fff',
    },
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
    pestAlertStack: {
        position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 60,
        display: 'flex', flexDirection: 'column', gap: 8, width: 320, maxWidth: '90vw',
    },
    pestAlertCard: {
        background: '#F7F2E7', border: '2px solid #C16B3D', borderRadius: 4, padding: '10px 28px 10px 12px',
        boxShadow: '2px 3px 10px rgba(0,0,0,0.3)', position: 'relative', color: '#3D2B1F',
    },
    pestAlertCardSevere: { border: '2px solid #A33', background: '#F7E7E3' },
    weatherAlertHeat: { border: '2px solid #C1443C', background: '#FCEBE3' },
    weatherAlertFreeze: { border: '2px solid #5C9BD5', background: '#E8F1FA' },
    pestAlertClose: {
        position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%',
        background: 'transparent', border: '1px solid #B8A98A', color: '#6b5844', fontSize: 10,
        cursor: 'pointer', padding: 0, lineHeight: '16px',
    },
    globalLogPanel: {
        position: 'fixed', maxHeight: '55vh', overflowY: 'auto',
        background: '#F7F2E7', border: '1.5px solid #B8A98A', borderRadius: 4, padding: '12px 12px 12px 20px',
        boxShadow: '2px 3px 10px rgba(0,0,0,0.25)', zIndex: 40, minWidth: 160, maxWidth: 480,
    },
    globalLogPanelCollapsed: { maxHeight: 'none', overflowY: 'visible', padding: '8px 12px 8px 20px' },
    globalLogHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'move', userSelect: 'none' },
    logResizeHandle: {
        position: 'absolute', left: 2, top: '50%', transform: 'translateY(-50%) rotate(90deg)',
        fontSize: 12, color: '#B8A98A', cursor: 'ew-resize', letterSpacing: -2, userSelect: 'none',
    },
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
    basketRow: { display: 'flex', alignItems: 'center', background: '#EDE6D6', border: '1px solid #C9B98F', borderRadius: 4, padding: '6px 8px' },
    basketActionBtn: { background: '#4A3728', color: '#EDE6D6', border: 'none', borderRadius: 3, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginLeft: 6 },
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
class PlotSeasonErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null, info: null };
    }
    static getDerivedStateFromError(error) {
        return { error };
    }
    componentDidCatch(error, info) {
        this.setState({ info });
        console.error('Plot & Season render error:', error, info);
    }
    render() {
        if (this.state.error) {
            const message = this.state.error && (this.state.error.stack || this.state.error.message || String(this.state.error));
            return React.createElement("div", { style: { margin: 28, padding: 22, border: '3px solid #B55252', background: '#FFF4F2', color: '#6F1D1D', fontFamily: 'Arial, sans-serif', whiteSpace: 'pre-wrap' } },
                React.createElement("div", { style: { fontWeight: 900, fontSize: 22, marginBottom: 10 } }, "Plot & Season hit a render error"),
                React.createElement("div", { style: { fontSize: 13 } }, message),
                this.state.info && this.state.info.componentStack ? React.createElement("div", { style: { marginTop: 10, fontSize: 11, opacity: .75 } }, this.state.info.componentStack) : null);
        }
        return this.props.children;
    }
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(PlotSeasonErrorBoundary, null, React.createElement(GardenGame)));
