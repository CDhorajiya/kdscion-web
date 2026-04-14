/**
 * KD Global Fabric Catalog
 * Single source of truth for all fabric types, collections, and swatches.
 * Controls visibility per type, per collection, and per swatch.
 * Manage from admin dashboard → Fabrics tab.
 */

const LS_KEY = 'kd_fabrics';

// ── Main Design catalog ───────────────────────────────────────────────────────
export const FABRIC_CATALOG = [
  {
    id: 'cotton',
    label: '100% Cotton',
    wreaths: ['images/Cotton Wreath.webp'],
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
    wreaths: ['images/Linen Wreath.webp'],
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
    wreaths: ['images/Wool Wreath.webp'],
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
    id: 'silk',
    label: '100% Silk',
    wreaths: ['images/Silk Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [],
      },
      { id: 'lining', label: 'Lining Collection', swatches: [] },
      { id: 'print',  label: 'Print Collection',  swatches: [] },
      { id: 'satin',  label: 'Satin Collection',  swatches: [] },
    ],
  },
  {
    id: 'cotton-linen',
    label: 'Cotton Linen Blend',
    wreaths: ['images/Cotton Wreath.webp', 'images/Linen Wreath.webp'],
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
    wreaths: ['images/Cotton Wreath.webp', 'images/Wool Wreath.webp'],
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
  {
    id: 'leather',
    label: 'Premium Leather',
    wreaths: ['images/Leather Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [],
      },
      { id: 'suede',  label: 'Suede Collection',  swatches: [] },
      { id: 'patent', label: 'Patent Collection', swatches: [] },
    ],
  },
];

// ── Two Tone catalog ─────────────────────────────────────────────────────────
// 100% fabric types only (no blends). Each type has a single Plain collection.
// Swatch id, label, and image filename are kept identical for clarity.
export const TWOTONE_CATALOG = [
  {
    id: 'cotton',
    label: '100% Cotton',
    wreaths: ['images/Cotton Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'tt-cotton-1', label: 'tt-cotton-1', image: 'images/tt-cotton-1.jpg' },
        ],
      },
    ],
  },
  {
    id: 'linen',
    label: '100% Linen',
    wreaths: ['images/Linen Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'tt-linen-1', label: 'tt-linen-1', image: 'images/tt-linen-1.webp' },
        ],
      },
    ],
  },
  {
    id: 'wool',
    label: '100% Wool',
    wreaths: ['images/Wool Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'tt-wool-1', label: 'tt-wool-1', image: 'images/tt-wool-1.webp' },
        ],
      },
    ],
  },
  {
    id: 'silk',
    label: '100% Silk',
    wreaths: ['images/Silk Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'tt-silk-1', label: 'tt-silk-1', image: 'images/tt-silk-1.jpg' },
        ],
      },
    ],
  },
  {
    id: 'leather',
    label: 'Premium Leather',
    wreaths: ['images/Leather Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'tt-leather-1', label: 'tt-leather-1', image: 'images/tt-leather-1.jpg' },
        ],
      },
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

// ── Visibility key helpers ────────────────────────────────────────────────────
// Per-product keys:  p:SKU:t:typeId   /  p:SKU:c:typeId:collId
// Zone-specific:     p:SKU:z:ZONE:t:typeId  /  p:SKU:z:ZONE:c:typeId:collId
// Global swatch key: s:swatchId

function productTypeKey(sku, typeId, zone)         { return zone ? `p:${sku}:z:${zone}:t:${typeId}` : `p:${sku}:t:${typeId}`; }
function productCollKey(sku, typeId, collId, zone) { return zone ? `p:${sku}:z:${zone}:c:${typeId}:${collId}` : `p:${sku}:c:${typeId}:${collId}`; }
function swatchKey(swatchId)                       { return `s:${swatchId}`; }

export function zoneTypeKey(sku, zone, typeId)           { return productTypeKey(sku, typeId, zone); }
export function zoneCollKey(sku, zone, typeId, collId)   { return productCollKey(sku, typeId, collId, zone); }

/**
 * Is this fabric type visible for the given product SKU?
 * Default: true (visible).
 */
export function isTypeVisible(sku, typeId, overrides) {
  const vis = overrides.visibility || {};
  return vis[productTypeKey(sku, typeId)] ?? true;
}

/**
 * Is this collection visible for the given product SKU + type?
 * Default: true — but only relevant when the parent type is already visible.
 */
export function isCollectionVisible(sku, typeId, collId, overrides) {
  const vis = overrides.visibility || {};
  return vis[productCollKey(sku, typeId, collId)] ?? true;
}

// ── Build merged catalog (default + localStorage extras) ─────────────────────
export function getMergedCatalog() {
  const overrides = loadOverrides();
  const extras    = overrides.extras || {};   // { 'cotton:plain': [{id,label,image}] }

  return FABRIC_CATALOG.map(type => ({
    ...type,
    collections: type.collections.map(coll => {
      const extraKey      = `${type.id}:${coll.id}`;
      const extraSwatches = extras[extraKey] || [];
      return {
        ...coll,
        swatches: [...coll.swatches, ...extraSwatches],
      };
    }),
  }));
}

// ── Build merged two-tone catalog (base + localStorage ttExtras) ─────────────
// ttExtras stored as: { 'cotton': [{id,label,image}], 'linen': [...], ... }
export function getMergedTwotoneCatalog() {
  const overrides = loadOverrides();
  const ttExtras  = overrides.ttExtras || {};

  return TWOTONE_CATALOG.map(type => ({
    ...type,
    collections: type.collections.map(coll => ({
      ...coll,
      swatches: [...coll.swatches, ...(ttExtras[type.id] || [])],
    })),
  }));
}

// ── Renderer (per-product) ────────────────────────────────────────────────────
// sku:           product SKU string, e.g. 'KD-P1-FSS'
// zone:          optional zone string, e.g. 'two-tone' — uses zone-specific visibility keys
// catalogSource: optional catalog array override; defaults to the merged main catalog
export function renderFabricList(containerEl, sku, zone = null, catalogSource = null) {
  const overrides    = loadOverrides();
  const vis          = overrides.visibility || {};
  const catalog      = catalogSource ?? getMergedCatalog();

  function typeOn(typeId)           { return vis[productTypeKey(sku, typeId, zone)]         ?? true; }
  function collOn(typeId, collId)   { return vis[productCollKey(sku, typeId, collId, zone)] ?? true; }
  function swatchOn(swatchId)       { return vis[swatchKey(swatchId)]                       ?? true; }

  let html = '';
  catalog.forEach(type => {
    if (!typeOn(type.id)) return;

    const wreathImgs = type.wreaths.map(w => `<img src="${w}" alt="${type.label}">`).join('');

    let collectionsHtml = '';
    type.collections.forEach(coll => {
      if (!collOn(type.id, coll.id)) return;

      const visibleSwatches = coll.swatches.filter(s => swatchOn(s.id));
      if (coll.swatches.length > 0 && visibleSwatches.length === 0) return;

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
  const allCatalogs = [getMergedCatalog(), TWOTONE_CATALOG];
  for (const catalog of allCatalogs) {
    for (const type of catalog) {
      for (const coll of type.collections) {
        const s = coll.swatches.find(sw => sw.id === id);
        if (s) return { ...s, typeId: type.id, typeLabel: type.label, collId: coll.id, collLabel: coll.label };
      }
    }
  }
  return null;
}
