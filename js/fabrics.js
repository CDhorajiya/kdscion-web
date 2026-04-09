/**
 * KD Global Fabric Catalog
 * Single source of truth for all fabric types, collections, and swatches.
 * Controls visibility per type, per collection, and per swatch.
 * Manage from admin dashboard → Fabrics tab.
 */

const LS_KEY = 'kd_fabrics';

// ── Default catalog ───────────────────────────────────────────────────────────
export const FABRIC_CATALOG = [
  {
    id: 'cotton',
    label: '100% Cotton',
    wreaths: ['images/cotton-wreath-final.png'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'cotton-1', label: 'Cotton 1', image: 'images/cotton-1.jpg' },
          { id: 'cotton-2', label: 'Cotton 2', image: 'images/cotton-2.jpg' },
        ],
      },
      { id: 'dobies', label: 'Dobies Collection',  swatches: [] },
      { id: 'lining', label: 'Lining Collection',  swatches: [] },
      { id: 'chex',   label: 'Chex Collection',    swatches: [] },
      { id: 'print',  label: 'Print Collection',   swatches: [] },
    ],
  },
  {
    id: 'linen',
    label: '100% Linen',
    wreaths: ['images/linen-wreath-final.png'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'linen-1', label: 'Linen 1', image: 'images/linen-1.jpg' },
          { id: 'linen-2', label: 'Linen 2', image: 'images/linen-2.webp' },
        ],
      },
      { id: 'dobies', label: 'Dobies Collection',  swatches: [] },
      { id: 'lining', label: 'Lining Collection',  swatches: [] },
      { id: 'chex',   label: 'Chex Collection',    swatches: [] },
      { id: 'print',  label: 'Print Collection',   swatches: [] },
    ],
  },
  {
    id: 'wool',
    label: '100% Wool',
    wreaths: ['images/wool-wreath-1-final.png'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'wool-1', label: 'Wool 1',  image: 'images/wool-1.jpg' },
          { id: 'wool-2', label: 'Wool 2',  image: 'images/woolen fabric.jpg' },
        ],
      },
      { id: 'dobies', label: 'Dobies Collection',  swatches: [] },
      { id: 'lining', label: 'Lining Collection',  swatches: [] },
      { id: 'chex',   label: 'Chex Collection',    swatches: [] },
      { id: 'print',  label: 'Print Collection',   swatches: [] },
      { id: 'tweed',  label: 'Tweed Collection',   swatches: [] },
    ],
  },
  {
    id: 'cotton-linen',
    label: 'Cotton Linen Blend',
    wreaths: ['images/cotton-wreath-final.png', 'images/linen-wreath-final.png'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'cotton-linen-1', label: 'Blend 1', image: 'images/cotton-linen blend-1.webp' },
          { id: 'cotton-linen-2', label: 'Blend 2', image: 'images/cotton-linen blend-2.jpg' },
        ],
      },
      { id: 'dobies', label: 'Dobies Collection',  swatches: [] },
      { id: 'lining', label: 'Lining Collection',  swatches: [] },
      { id: 'chex',   label: 'Chex Collection',    swatches: [] },
      { id: 'print',  label: 'Print Collection',   swatches: [] },
    ],
  },
  {
    id: 'cotton-wool',
    label: 'Cotton Wool Blend',
    wreaths: ['images/cotton-wreath-final.png', 'images/wool-wreath-1-final.png'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'cotton-wool-1', label: 'Blend 1', image: 'images/wool-blend-2.avif' },
        ],
      },
      { id: 'dobies', label: 'Dobies Collection',  swatches: [] },
      { id: 'lining', label: 'Lining Collection',  swatches: [] },
      { id: 'chex',   label: 'Chex Collection',    swatches: [] },
      { id: 'print',  label: 'Print Collection',   swatches: [] },
    ],
  },
];

// ── localStorage helpers ──────────────────────────────────────────────────────
function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (_) { return {}; }
}

export function saveFabricOverrides(overrides) {
  localStorage.setItem(LS_KEY, JSON.stringify(overrides));
}

export function loadFabricOverrides() {
  return loadOverrides();
}

// visibility key helpers
function typeKey(typeId)               { return `t:${typeId}`; }
function collKey(typeId, collId)       { return `c:${typeId}:${collId}`; }
function swatchKey(swatchId)           { return `s:${swatchId}`; }

function isVisible(key, overrides, defaultVal = true) {
  return overrides.visibility?.[key] ?? defaultVal;
}

// ── Build merged catalog (default + localStorage extras) ─────────────────────
export function getMergedCatalog() {
  const overrides = loadOverrides();
  const extras    = overrides.extras || {};   // { 'cotton:plain': [{id,label,image}] }

  return FABRIC_CATALOG.map(type => ({
    ...type,
    collections: type.collections.map(coll => {
      const extraKey    = `${type.id}:${coll.id}`;
      const extraSwatches = extras[extraKey] || [];
      return {
        ...coll,
        swatches: [...coll.swatches, ...extraSwatches],
      };
    }),
  }));
}

// ── Renderer ──────────────────────────────────────────────────────────────────
export function renderFabricList(containerEl) {
  const overrides = loadOverrides();
  const catalog   = getMergedCatalog();

  let html = '';
  catalog.forEach(type => {
    if (!isVisible(typeKey(type.id), overrides)) return;

    const wreathImgs = type.wreaths.map(w => `<img src="${w}" alt="${type.label}">`).join('');

    let collectionsHtml = '';
    type.collections.forEach(coll => {
      if (!isVisible(collKey(type.id, coll.id), overrides)) return;

      const visibleSwatches = coll.swatches.filter(s => isVisible(swatchKey(s.id), overrides));
      if (coll.swatches.length > 0 && visibleSwatches.length === 0) return; // hide if all swatches hidden

      const swatchCards = visibleSwatches.map(s => `
        <div class="swatch-card" data-texture="${s.image}" data-fabric-id="${s.id}">
          <img src="${s.image}" alt="${s.label}">
          <span>${s.label}</span>
        </div>`).join('');

      collectionsHtml += `
        <div class="fabric-subcategory">
          <div class="subcategory-header"><span>${coll.label}</span><span class="sub-arrow">&#9654;</span></div>
          <div class="sub-swatch-grid">${swatchCards}</div>
        </div>`;
    });

    html += `
      <div class="fabric-category">
        <div class="category-card">
          <div class="wreath-preview">${wreathImgs}</div>
          <p>${type.label}</p>
        </div>
        <div class="swatch-grid">${collectionsHtml}</div>
      </div>`;
  });

  containerEl.innerHTML = html;
}

// ── Lookup helpers ────────────────────────────────────────────────────────────
export function getFabricById(id) {
  const catalog = getMergedCatalog();
  for (const type of catalog) {
    for (const coll of type.collections) {
      const s = coll.swatches.find(sw => sw.id === id);
      if (s) return { ...s, typeId: type.id, typeLabel: type.label, collId: coll.id, collLabel: coll.label };
    }
  }
  return null;
}
