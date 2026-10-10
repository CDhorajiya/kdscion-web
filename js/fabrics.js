/**
 * ============================================================
 *  fabrics.js  —  Fabric Catalogue & Visibility System
 * ============================================================
 *
 *  WHAT THIS FILE DOES
 *  --------------------
 *  This is the single source of truth for ALL available fabrics
 *  on the KD Scion website. It does three things:
 *
 *    1. STORES the fabric catalogue — every fabric type (Cotton,
 *       Linen, Wool, Silk…), its sub-collections (Plain, Dobies…),
 *       and individual swatches (swatch images + IDs).
 *
 *    2. MANAGES VISIBILITY — the admin dashboard can toggle which
 *       fabric types, collections, or individual swatches are shown
 *       per-product (or globally). These preferences are saved to
 *       the browser's localStorage.
 *
 *    3. RENDERS the fabric selector UI — the `renderFabricList`
 *       function at the bottom builds the HTML accordion (wreath
 *       cards → collection headers → swatch cards) that appears in
 *       the product page's right panel.
 *
 *  DATA STRUCTURE OVERVIEW
 *  ------------------------
 *  FABRIC_CATALOG  =  Array of FabricType
 *
 *  FabricType {
 *    id:          unique key, e.g. 'cotton'
 *    label:       display name, e.g. '100% Cotton'
 *    wreaths:     array of wreath image paths shown in the accordion header
 *    collections: array of FabricCollection
 *  }
 *
 *  FabricCollection {
 *    id:       e.g. 'plain'
 *    label:    e.g. 'Plain Collection'
 *    swatches: array of Swatch
 *  }
 *
 *  Swatch {
 *    id:    unique key used everywhere, e.g. 'cotton-1'
 *    label: display name
 *    image: path to the swatch square image
 *    thumb: optional small copy for the swatch card (when `image` is a large texture)
 *  }
 *
 *  HOW ADMIN OVERRIDES WORK
 *  -------------------------
 *  The admin dashboard can:
 *    - Toggle a fabric TYPE on/off per product   (key: "p:SKU:t:typeId")
 *    - Toggle a COLLECTION on/off per product    (key: "p:SKU:c:typeId:collId")
 *    - Toggle a SWATCH on/off globally           (key: "s:swatchId")
 *    - Add EXTRA swatches to a collection        (stored in extras / ttExtras)
 *  All overrides are stored in Firebase (fabricSettings/live) and cached as JSON
 *  in localStorage under the key 'kd_fabrics' — see "Live sync with Firebase" below.
 */

import { FIREBASE_CONFIG } from './firebase-config.js';

// ── localStorage key where the overrides are cached (source of truth: Firebase) ──
const LS_KEY = 'kd_fabrics';

// ── Material defaults by fabric type ──────────────────────────────────────────
// Real-time PBR values applied to the 3D model when a swatch of this type is
// selected — separate from `opacity`, which already existed per-swatch.
//   roughness: 0 = mirror-like, 1 = fully matte. Cloth is never 0.
//   sheen:     0 = none, up to 1 = strong grazing-angle highlight (napped
//              fabrics like wool catch light at edges; silk's sheen comes
//              from its low roughness instead, so its sheen factor stays low).
// A swatch can override either value individually (see Swatch.roughness /
// Swatch.sheen below); the admin dashboard can override per-swatch too (see
// overrides.swatchRoughness), same pattern as overrides.swatchOpacity.
export const TYPE_MATERIAL_DEFAULTS = {
  'cotton':        { roughness: 0.75, sheen: 0    },
  'linen':         { roughness: 0.85, sheen: 0    },
  'wool':          { roughness: 0.90, sheen: 0.35 },
  'silk':          { roughness: 0.25, sheen: 0.10 },
  'cotton-linen':  { roughness: 0.80, sheen: 0    },
  'cotton-wool':   { roughness: 0.85, sheen: 0.15 },
  'cotton-spandex':{ roughness: 0.80, sheen: 0.10 },
  'leather':       { roughness: 0.45, sheen: 0    },
};
const FALLBACK_MATERIAL_DEFAULTS = { roughness: 0.75, sheen: 0 };

// ── Drape types ───────────────────────────────────────────────────────────────
// Which sphere-drop simulation a swatch uses in the product page's Fabric Drape
// window. Set per swatch via Swatch.drape (built-in or admin-added swatches), or
// overridden from the admin dashboard in overrides.swatchDrape.
export const DRAPE_TYPES = ['crisp', 'medium', 'flowing', 'heavy'];

// ── Main Design catalog ───────────────────────────────────────────────────────
// Used for the "Main Design" zone on both single-tone and two-tone product pages.
// Each fabric type has one or more collections; each collection has swatches.
// Empty swatch arrays [] mean the collection exists but no swatches have been
// uploaded yet — the admin can add them from the dashboard.

export const FABRIC_CATALOG = [
  {
    id: 'cotton',
    label: '100% Cotton',
    wreaths: ['images/Cotton Wreath.webp'],  // Decorative image shown in the card header
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'cotton-plain-1', label: 'Chalk White Poplin', image: 'images/fabrics/cotton-plain-1.webp#r15.625', thumb: 'images/fabrics/thumbs/cotton-plain-1.webp', drape: 'crisp' },
          { id: 'cotton-plain-2', label: 'Ivory Pinpoint Oxford', image: 'images/fabrics/cotton-plain-2.webp#r13.281', thumb: 'images/fabrics/thumbs/cotton-plain-2.webp', drape: 'crisp' },
          { id: 'cotton-plain-3', label: 'Navy Gabardine Twill', image: 'images/fabrics/cotton-plain-3.webp#r17.255', thumb: 'images/fabrics/thumbs/cotton-plain-3.webp', drape: 'crisp' },
          { id: 'cotton-plain-4', label: 'Ecru Sateen', image: 'images/fabrics/cotton-plain-4.webp#r15.686', thumb: 'images/fabrics/thumbs/cotton-plain-4.webp', drape: 'crisp' },
          { id: 'cotton-plain-5', label: 'Bottle Green Drill', image: 'images/fabrics/cotton-plain-5.webp#r13.333', thumb: 'images/fabrics/thumbs/cotton-plain-5.webp', drape: 'crisp' },
          { id: 'cotton-plain-6', label: 'Camel Chino Twill', image: 'images/fabrics/cotton-plain-6.webp#r14.062', thumb: 'images/fabrics/thumbs/cotton-plain-6.webp', drape: 'crisp' },
          { id: 'cotton-plain-7', label: 'Midnight Voile', image: 'images/fabrics/cotton-plain-7.webp#r17.969', thumb: 'images/fabrics/thumbs/cotton-plain-7.webp', drape: 'flowing' },
          { id: 'cotton-plain-8', label: 'Oxblood Poplin', image: 'images/fabrics/cotton-plain-8.webp#r15.625', thumb: 'images/fabrics/thumbs/cotton-plain-8.webp', drape: 'crisp' },
          { id: 'cotton-plain-9', label: 'Sky Blue End-on-End', image: 'images/fabrics/cotton-plain-9.webp#r16.406', thumb: 'images/fabrics/thumbs/cotton-plain-9.webp', drape: 'crisp' },
          { id: 'cotton-plain-10', label: 'Indigo Chambray', image: 'images/fabrics/cotton-plain-10.webp#r14.844', thumb: 'images/fabrics/thumbs/cotton-plain-10.webp', drape: 'crisp' },
        ],
      },
      {
        id: 'dobies',
        label: 'Dobies Collection',
        swatches: [
          { id: 'cotton-dobies-1', label: 'White Bird\'s-Eye Dobby', image: 'images/fabrics/cotton-dobies-1.webp#r14.062', thumb: 'images/fabrics/thumbs/cotton-dobies-1.webp', drape: 'crisp' },
          { id: 'cotton-dobies-2', label: 'Sky Diamond Dobby', image: 'images/fabrics/cotton-dobies-2.webp#r14.062', thumb: 'images/fabrics/thumbs/cotton-dobies-2.webp', drape: 'crisp' },
          { id: 'cotton-dobies-3', label: 'Ivory Piqué', image: 'images/fabrics/cotton-dobies-3.webp#r13.953', thumb: 'images/fabrics/thumbs/cotton-dobies-3.webp', drape: 'crisp' },
          { id: 'cotton-dobies-4', label: 'Navy Honeycomb', image: 'images/fabrics/cotton-dobies-4.webp#r14.062', thumb: 'images/fabrics/thumbs/cotton-dobies-4.webp', drape: 'crisp' },
          { id: 'cotton-dobies-5', label: 'Powder Blue Dot Dobby', image: 'images/fabrics/cotton-dobies-5.webp#r14.062', thumb: 'images/fabrics/thumbs/cotton-dobies-5.webp', drape: 'crisp' },
          { id: 'cotton-dobies-6', label: 'Ecru Herringbone', image: 'images/fabrics/cotton-dobies-6.webp#r14.062', thumb: 'images/fabrics/thumbs/cotton-dobies-6.webp', drape: 'crisp' },
          { id: 'cotton-dobies-7', label: 'Stone Barleycorn', image: 'images/fabrics/cotton-dobies-7.webp#r13.953', thumb: 'images/fabrics/thumbs/cotton-dobies-7.webp', drape: 'crisp' },
          { id: 'cotton-dobies-8', label: 'Chalk Hopsack', image: 'images/fabrics/cotton-dobies-8.webp#r13.953', thumb: 'images/fabrics/thumbs/cotton-dobies-8.webp', drape: 'crisp' },
          { id: 'cotton-dobies-9', label: 'Blush Royal Oxford', image: 'images/fabrics/cotton-dobies-9.webp#r14.062', thumb: 'images/fabrics/thumbs/cotton-dobies-9.webp', drape: 'crisp' },
          { id: 'cotton-dobies-10', label: 'Slate Bedford Cord', image: 'images/fabrics/cotton-dobies-10.webp#r14.062', thumb: 'images/fabrics/thumbs/cotton-dobies-10.webp', drape: 'crisp' },
        ],
      },
      {
        id: 'lining',
        label: 'Lining Collection',
        swatches: [
          { id: 'cotton-lining-1', label: 'Champagne Silesia', image: 'images/fabrics/cotton-lining-1.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-lining-1.webp', drape: 'flowing', roughness: 0.5, sheen: 0.08 },
          { id: 'cotton-lining-2', label: 'Navy Silesia', image: 'images/fabrics/cotton-lining-2.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-lining-2.webp', drape: 'flowing', roughness: 0.5, sheen: 0.08 },
          { id: 'cotton-lining-3', label: 'Burgundy Sateen Lining', image: 'images/fabrics/cotton-lining-3.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-lining-3.webp', drape: 'flowing', roughness: 0.5, sheen: 0.08 },
          { id: 'cotton-lining-4', label: 'Black Twill Lining', image: 'images/fabrics/cotton-lining-4.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-lining-4.webp', drape: 'flowing', roughness: 0.5, sheen: 0.08 },
          { id: 'cotton-lining-5', label: 'Pewter Sateen Lining', image: 'images/fabrics/cotton-lining-5.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-lining-5.webp', drape: 'flowing', roughness: 0.5, sheen: 0.08 },
          { id: 'cotton-lining-6', label: 'Bottle Green Lining', image: 'images/fabrics/cotton-lining-6.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-lining-6.webp', drape: 'flowing', roughness: 0.5, sheen: 0.08 },
          { id: 'cotton-lining-7', label: 'Gold Sateen Lining', image: 'images/fabrics/cotton-lining-7.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-lining-7.webp', drape: 'flowing', roughness: 0.5, sheen: 0.08 },
          { id: 'cotton-lining-8', label: 'Ivory Batiste', image: 'images/fabrics/cotton-lining-8.webp#r20.312', thumb: 'images/fabrics/thumbs/cotton-lining-8.webp', drape: 'flowing', roughness: 0.5, sheen: 0.08 },
          { id: 'cotton-lining-9', label: 'Sky Pocketing', image: 'images/fabrics/cotton-lining-9.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-lining-9.webp', drape: 'flowing', roughness: 0.5, sheen: 0.08 },
          { id: 'cotton-lining-10', label: 'Plum Sateen Lining', image: 'images/fabrics/cotton-lining-10.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-lining-10.webp', drape: 'flowing', roughness: 0.5, sheen: 0.08 },
        ],
      },
      {
        id: 'chex',
        label: 'Chex Collection',
        swatches: [
          { id: 'cotton-chex-1', label: 'Navy Gingham', image: 'images/fabrics/cotton-chex-1.webp#r15.625', thumb: 'images/fabrics/thumbs/cotton-chex-1.webp', drape: 'crisp' },
          { id: 'cotton-chex-2', label: 'Sky Mini Gingham', image: 'images/fabrics/cotton-chex-2.webp#r15.625', thumb: 'images/fabrics/thumbs/cotton-chex-2.webp', drape: 'crisp' },
          { id: 'cotton-chex-3', label: 'Country Tattersall', image: 'images/fabrics/cotton-chex-3.webp#r16.667', thumb: 'images/fabrics/thumbs/cotton-chex-3.webp', drape: 'crisp' },
          { id: 'cotton-chex-4', label: 'Navy Windowpane', image: 'images/fabrics/cotton-chex-4.webp#r14.184', thumb: 'images/fabrics/thumbs/cotton-chex-4.webp', drape: 'crisp' },
          { id: 'cotton-chex-5', label: 'Blue Graph Check', image: 'images/fabrics/cotton-chex-5.webp#r15.152', thumb: 'images/fabrics/thumbs/cotton-chex-5.webp', drape: 'crisp' },
          { id: 'cotton-chex-6', label: 'Black Houndstooth', image: 'images/fabrics/cotton-chex-6.webp#r15.625', thumb: 'images/fabrics/thumbs/cotton-chex-6.webp', drape: 'crisp' },
          { id: 'cotton-chex-7', label: 'Prince of Wales Check', image: 'images/fabrics/cotton-chex-7.webp#r13.889', thumb: 'images/fabrics/thumbs/cotton-chex-7.webp', drape: 'crisp' },
          { id: 'cotton-chex-8', label: 'Red Buffalo Check', image: 'images/fabrics/cotton-chex-8.webp#r14.286', thumb: 'images/fabrics/thumbs/cotton-chex-8.webp', drape: 'crisp' },
          { id: 'cotton-chex-9', label: 'Black Watch Tartan', image: 'images/fabrics/cotton-chex-9.webp#r12.048', thumb: 'images/fabrics/thumbs/cotton-chex-9.webp', drape: 'crisp' },
          { id: 'cotton-chex-10', label: 'Brown Shepherd\'s Check', image: 'images/fabrics/cotton-chex-10.webp#r15.873', thumb: 'images/fabrics/thumbs/cotton-chex-10.webp', drape: 'crisp' },
        ],
      },
      {
        id: 'print',
        label: 'Print Collection',
        swatches: [
          { id: 'cotton-print-1', label: 'Indigo Paisley', image: 'images/fabrics/cotton-print-1.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-print-1.webp', drape: 'crisp' },
          { id: 'cotton-print-2', label: 'Navy Foulard', image: 'images/fabrics/cotton-print-2.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-print-2.webp', drape: 'crisp' },
          { id: 'cotton-print-3', label: 'Ivory Polka Dot', image: 'images/fabrics/cotton-print-3.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-print-3.webp', drape: 'crisp' },
          { id: 'cotton-print-4', label: 'Madder Floral Buti', image: 'images/fabrics/cotton-print-4.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-print-4.webp', drape: 'crisp' },
          { id: 'cotton-print-5', label: 'Damask Ogee', image: 'images/fabrics/cotton-print-5.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-print-5.webp', drape: 'crisp' },
          { id: 'cotton-print-6', label: 'Botanical Vine', image: 'images/fabrics/cotton-print-6.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-print-6.webp', drape: 'crisp' },
          { id: 'cotton-print-7', label: 'Art Deco Fans', image: 'images/fabrics/cotton-print-7.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-print-7.webp', drape: 'crisp' },
          { id: 'cotton-print-8', label: 'Garden Trellis', image: 'images/fabrics/cotton-print-8.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-print-8.webp', drape: 'crisp' },
          { id: 'cotton-print-9', label: 'Heritage Sprig', image: 'images/fabrics/cotton-print-9.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-print-9.webp', drape: 'crisp' },
          { id: 'cotton-print-10', label: 'Regency Stripe', image: 'images/fabrics/cotton-print-10.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-print-10.webp', drape: 'crisp' },
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
          { id: 'linen-plain-1', label: 'Natural Flax', image: 'images/fabrics/linen-plain-1.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-plain-1.webp', drape: 'crisp' },
          { id: 'linen-plain-2', label: 'Optic White Linen', image: 'images/fabrics/linen-plain-2.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-plain-2.webp', drape: 'crisp' },
          { id: 'linen-plain-3', label: 'Ecru Linen', image: 'images/fabrics/linen-plain-3.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-plain-3.webp', drape: 'crisp' },
          { id: 'linen-plain-4', label: 'Oatmeal Linen', image: 'images/fabrics/linen-plain-4.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-plain-4.webp', drape: 'crisp' },
          { id: 'linen-plain-5', label: 'Navy Linen', image: 'images/fabrics/linen-plain-5.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-plain-5.webp', drape: 'crisp' },
          { id: 'linen-plain-6', label: 'Olive Linen', image: 'images/fabrics/linen-plain-6.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-plain-6.webp', drape: 'crisp' },
          { id: 'linen-plain-7', label: 'Terracotta Linen', image: 'images/fabrics/linen-plain-7.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-plain-7.webp', drape: 'crisp' },
          { id: 'linen-plain-8', label: 'Sky Linen', image: 'images/fabrics/linen-plain-8.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-plain-8.webp', drape: 'crisp' },
          { id: 'linen-plain-9', label: 'Charcoal Linen', image: 'images/fabrics/linen-plain-9.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-plain-9.webp', drape: 'crisp' },
          { id: 'linen-plain-10', label: 'Bottle Green Linen', image: 'images/fabrics/linen-plain-10.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-plain-10.webp', drape: 'crisp' },
        ],
      },
      {
        id: 'dobies',
        label: 'Dobies Collection',
        swatches: [
          { id: 'linen-dobies-1', label: 'Flax Herringbone', image: 'images/fabrics/linen-dobies-1.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-dobies-1.webp', drape: 'crisp' },
          { id: 'linen-dobies-2', label: 'White Bird\'s-Eye Linen', image: 'images/fabrics/linen-dobies-2.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-dobies-2.webp', drape: 'crisp' },
          { id: 'linen-dobies-3', label: 'Natural Hopsack', image: 'images/fabrics/linen-dobies-3.webp#r6.202', thumb: 'images/fabrics/thumbs/linen-dobies-3.webp', drape: 'crisp' },
          { id: 'linen-dobies-4', label: 'Navy Basket Weave', image: 'images/fabrics/linen-dobies-4.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-dobies-4.webp', drape: 'crisp' },
          { id: 'linen-dobies-5', label: 'Sand Diamond Dobby', image: 'images/fabrics/linen-dobies-5.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-dobies-5.webp', drape: 'crisp' },
          { id: 'linen-dobies-6', label: 'Ivory Honeycomb', image: 'images/fabrics/linen-dobies-6.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-dobies-6.webp', drape: 'crisp' },
          { id: 'linen-dobies-7', label: 'Stone Barleycorn', image: 'images/fabrics/linen-dobies-7.webp#r6.202', thumb: 'images/fabrics/thumbs/linen-dobies-7.webp', drape: 'crisp' },
          { id: 'linen-dobies-8', label: 'Sage Twill', image: 'images/fabrics/linen-dobies-8.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-dobies-8.webp', drape: 'crisp' },
          { id: 'linen-dobies-9', label: 'Chambray Linen', image: 'images/fabrics/linen-dobies-9.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-dobies-9.webp', drape: 'crisp' },
          { id: 'linen-dobies-10', label: 'Ecru Piqué', image: 'images/fabrics/linen-dobies-10.webp#r6.202', thumb: 'images/fabrics/thumbs/linen-dobies-10.webp', drape: 'crisp' },
        ],
      },
      {
        id: 'lining',
        label: 'Lining Collection',
        swatches: [
          { id: 'linen-lining-1', label: 'Ivory Linen Voile', image: 'images/fabrics/linen-lining-1.webp#r9.375', thumb: 'images/fabrics/thumbs/linen-lining-1.webp', drape: 'flowing', roughness: 0.7 },
          { id: 'linen-lining-2', label: 'Natural Batiste', image: 'images/fabrics/linen-lining-2.webp#r9.375', thumb: 'images/fabrics/thumbs/linen-lining-2.webp', drape: 'flowing', roughness: 0.7 },
          { id: 'linen-lining-3', label: 'Champagne Linen Lining', image: 'images/fabrics/linen-lining-3.webp#r9.375', thumb: 'images/fabrics/thumbs/linen-lining-3.webp', drape: 'flowing', roughness: 0.7 },
          { id: 'linen-lining-4', label: 'Navy Linen Lining', image: 'images/fabrics/linen-lining-4.webp#r9.375', thumb: 'images/fabrics/thumbs/linen-lining-4.webp', drape: 'flowing', roughness: 0.7 },
          { id: 'linen-lining-5', label: 'Stone Lining', image: 'images/fabrics/linen-lining-5.webp#r9.375', thumb: 'images/fabrics/thumbs/linen-lining-5.webp', drape: 'flowing', roughness: 0.7 },
          { id: 'linen-lining-6', label: 'Sage Lining', image: 'images/fabrics/linen-lining-6.webp#r9.375', thumb: 'images/fabrics/thumbs/linen-lining-6.webp', drape: 'flowing', roughness: 0.7 },
          { id: 'linen-lining-7', label: 'Blush Lining', image: 'images/fabrics/linen-lining-7.webp#r9.375', thumb: 'images/fabrics/thumbs/linen-lining-7.webp', drape: 'flowing', roughness: 0.7 },
          { id: 'linen-lining-8', label: 'Tobacco Lining', image: 'images/fabrics/linen-lining-8.webp#r9.375', thumb: 'images/fabrics/thumbs/linen-lining-8.webp', drape: 'flowing', roughness: 0.7 },
          { id: 'linen-lining-9', label: 'White Handkerchief Linen', image: 'images/fabrics/linen-lining-9.webp#r9.375', thumb: 'images/fabrics/thumbs/linen-lining-9.webp', drape: 'flowing', roughness: 0.7 },
          { id: 'linen-lining-10', label: 'Sky Lining', image: 'images/fabrics/linen-lining-10.webp#r9.375', thumb: 'images/fabrics/thumbs/linen-lining-10.webp', drape: 'flowing', roughness: 0.7 },
        ],
      },
      {
        id: 'chex',
        label: 'Chex Collection',
        swatches: [
          { id: 'linen-chex-1', label: 'Navy Linen Gingham', image: 'images/fabrics/linen-chex-1.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-chex-1.webp', drape: 'crisp' },
          { id: 'linen-chex-2', label: 'Terracotta Gingham', image: 'images/fabrics/linen-chex-2.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-chex-2.webp', drape: 'crisp' },
          { id: 'linen-chex-3', label: 'Flax Windowpane', image: 'images/fabrics/linen-chex-3.webp#r5.674', thumb: 'images/fabrics/thumbs/linen-chex-3.webp', drape: 'crisp' },
          { id: 'linen-chex-4', label: 'Country Tattersall', image: 'images/fabrics/linen-chex-4.webp#r6.667', thumb: 'images/fabrics/thumbs/linen-chex-4.webp', drape: 'crisp' },
          { id: 'linen-chex-5', label: 'Indigo Graph Check', image: 'images/fabrics/linen-chex-5.webp#r6.061', thumb: 'images/fabrics/thumbs/linen-chex-5.webp', drape: 'crisp' },
          { id: 'linen-chex-6', label: 'Sage Shepherd\'s Check', image: 'images/fabrics/linen-chex-6.webp#r6.349', thumb: 'images/fabrics/thumbs/linen-chex-6.webp', drape: 'crisp' },
          { id: 'linen-chex-7', label: 'Tobacco Glen Check', image: 'images/fabrics/linen-chex-7.webp#r5.556', thumb: 'images/fabrics/thumbs/linen-chex-7.webp', drape: 'crisp' },
          { id: 'linen-chex-8', label: 'Sky Gingham', image: 'images/fabrics/linen-chex-8.webp#r6.154', thumb: 'images/fabrics/thumbs/linen-chex-8.webp', drape: 'crisp' },
          { id: 'linen-chex-9', label: 'Navy Buffalo Check', image: 'images/fabrics/linen-chex-9.webp#r5.714', thumb: 'images/fabrics/thumbs/linen-chex-9.webp', drape: 'crisp' },
          { id: 'linen-chex-10', label: 'Olive Houndstooth', image: 'images/fabrics/linen-chex-10.webp#r6.25', thumb: 'images/fabrics/thumbs/linen-chex-10.webp', drape: 'crisp' },
        ],
      },
      { id: 'print',  label: 'Print Collection',   swatches: [
          { id: 'linen-print-1', label: 'Linen Print 1', image: 'images/linen-print-1.webp', thumb: 'images/linen-print-1-thumb.webp', drape: 'crisp' },
          { id: 'linen-print-2', label: 'Indigo Ikat', image: 'images/fabrics/linen-print-2.webp#r8.0', thumb: 'images/fabrics/thumbs/linen-print-2.webp', drape: 'crisp' },
          { id: 'linen-print-3', label: 'Madder Paisley', image: 'images/fabrics/linen-print-3.webp#r8.0', thumb: 'images/fabrics/thumbs/linen-print-3.webp', drape: 'crisp' },
          { id: 'linen-print-4', label: 'Olive Leaf Trail', image: 'images/fabrics/linen-print-4.webp#r8.0', thumb: 'images/fabrics/thumbs/linen-print-4.webp', drape: 'crisp' },
          { id: 'linen-print-5', label: 'Terracotta Foulard', image: 'images/fabrics/linen-print-5.webp#r8.0', thumb: 'images/fabrics/thumbs/linen-print-5.webp', drape: 'crisp' },
          { id: 'linen-print-6', label: 'Navy Pin Dot', image: 'images/fabrics/linen-print-6.webp#r8.0', thumb: 'images/fabrics/thumbs/linen-print-6.webp', drape: 'crisp' },
          { id: 'linen-print-7', label: 'Saffron Quatrefoil', image: 'images/fabrics/linen-print-7.webp#r8.0', thumb: 'images/fabrics/thumbs/linen-print-7.webp', drape: 'crisp' },
          { id: 'linen-print-8', label: 'Botanical Sprig', image: 'images/fabrics/linen-print-8.webp#r8.0', thumb: 'images/fabrics/thumbs/linen-print-8.webp', drape: 'crisp' },
          { id: 'linen-print-9', label: 'Deco Fans', image: 'images/fabrics/linen-print-9.webp#r8.0', thumb: 'images/fabrics/thumbs/linen-print-9.webp', drape: 'crisp' },
          { id: 'linen-print-10', label: 'Riviera Stripe', image: 'images/fabrics/linen-print-10.webp#r8.0', thumb: 'images/fabrics/thumbs/linen-print-10.webp', drape: 'crisp' },
        ] },
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
          { id: 'wool-plain-1', label: 'Navy Worsted', image: 'images/fabrics/wool-plain-1.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-plain-1.webp', drape: 'heavy' },
          { id: 'wool-plain-2', label: 'Charcoal Worsted', image: 'images/fabrics/wool-plain-2.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-plain-2.webp', drape: 'heavy' },
          { id: 'wool-plain-3', label: 'Mid Grey Flannel', image: 'images/fabrics/wool-plain-3.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-plain-3.webp', drape: 'heavy' },
          { id: 'wool-plain-4', label: 'Camel Hair Twill', image: 'images/fabrics/wool-plain-4.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-plain-4.webp', drape: 'heavy' },
          { id: 'wool-plain-5', label: 'Black Barathea', image: 'images/fabrics/wool-plain-5.webp#r14.062', thumb: 'images/fabrics/thumbs/wool-plain-5.webp', drape: 'heavy' },
          { id: 'wool-plain-6', label: 'Chocolate Gabardine', image: 'images/fabrics/wool-plain-6.webp#r15.686', thumb: 'images/fabrics/thumbs/wool-plain-6.webp', drape: 'heavy' },
          { id: 'wool-plain-7', label: 'Bottle Green Serge', image: 'images/fabrics/wool-plain-7.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-plain-7.webp', drape: 'heavy' },
          { id: 'wool-plain-8', label: 'Oxblood Hopsack', image: 'images/fabrics/wool-plain-8.webp#r11.628', thumb: 'images/fabrics/thumbs/wool-plain-8.webp', drape: 'heavy' },
          { id: 'wool-plain-9', label: 'Ivory Cashmere Flannel', image: 'images/fabrics/wool-plain-9.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-plain-9.webp', drape: 'heavy' },
          { id: 'wool-plain-10', label: 'Midnight Super 120s', image: 'images/fabrics/wool-plain-10.webp#r14.062', thumb: 'images/fabrics/thumbs/wool-plain-10.webp', drape: 'heavy' },
        ],
      },
      {
        id: 'dobies',
        label: 'Dobies Collection',
        swatches: [
          { id: 'wool-dobies-1', label: 'Navy Bird\'s-Eye', image: 'images/fabrics/wool-dobies-1.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-dobies-1.webp', drape: 'heavy' },
          { id: 'wool-dobies-2', label: 'Charcoal Nailhead', image: 'images/fabrics/wool-dobies-2.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-dobies-2.webp', drape: 'heavy' },
          { id: 'wool-dobies-3', label: 'Grey Herringbone', image: 'images/fabrics/wool-dobies-3.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-dobies-3.webp', drape: 'heavy' },
          { id: 'wool-dobies-4', label: 'Navy Barleycorn', image: 'images/fabrics/wool-dobies-4.webp#r11.628', thumb: 'images/fabrics/thumbs/wool-dobies-4.webp', drape: 'heavy' },
          { id: 'wool-dobies-5', label: 'Brown Sharkskin', image: 'images/fabrics/wool-dobies-5.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-dobies-5.webp', drape: 'heavy' },
          { id: 'wool-dobies-6', label: 'Midnight Pick-and-Pick', image: 'images/fabrics/wool-dobies-6.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-dobies-6.webp', drape: 'heavy' },
          { id: 'wool-dobies-7', label: 'Charcoal Hopsack', image: 'images/fabrics/wool-dobies-7.webp#r11.628', thumb: 'images/fabrics/thumbs/wool-dobies-7.webp', drape: 'heavy' },
          { id: 'wool-dobies-8', label: 'Navy Basket Weave', image: 'images/fabrics/wool-dobies-8.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-dobies-8.webp', drape: 'heavy' },
          { id: 'wool-dobies-9', label: 'Taupe Honeycomb', image: 'images/fabrics/wool-dobies-9.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-dobies-9.webp', drape: 'heavy' },
          { id: 'wool-dobies-10', label: 'Bottle Bedford Cord', image: 'images/fabrics/wool-dobies-10.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-dobies-10.webp', drape: 'heavy' },
        ],
      },
      {
        id: 'lining',
        label: 'Lining Collection',
        swatches: [
          { id: 'wool-lining-1', label: 'Burgundy Twill Lining', image: 'images/fabrics/wool-lining-1.webp#r21.961', thumb: 'images/fabrics/thumbs/wool-lining-1.webp', drape: 'flowing', roughness: 0.45, sheen: 0.1 },
          { id: 'wool-lining-2', label: 'Gold Satin Lining', image: 'images/fabrics/wool-lining-2.webp#r21.961', thumb: 'images/fabrics/thumbs/wool-lining-2.webp', drape: 'flowing', roughness: 0.45, sheen: 0.1 },
          { id: 'wool-lining-3', label: 'Navy Twill Lining', image: 'images/fabrics/wool-lining-3.webp#r21.961', thumb: 'images/fabrics/thumbs/wool-lining-3.webp', drape: 'flowing', roughness: 0.45, sheen: 0.1 },
          { id: 'wool-lining-4', label: 'Bottle Green Lining', image: 'images/fabrics/wool-lining-4.webp#r21.961', thumb: 'images/fabrics/thumbs/wool-lining-4.webp', drape: 'flowing', roughness: 0.45, sheen: 0.1 },
          { id: 'wool-lining-5', label: 'Champagne Satin Lining', image: 'images/fabrics/wool-lining-5.webp#r21.961', thumb: 'images/fabrics/thumbs/wool-lining-5.webp', drape: 'flowing', roughness: 0.45, sheen: 0.1 },
          { id: 'wool-lining-6', label: 'Black Lining', image: 'images/fabrics/wool-lining-6.webp#r21.961', thumb: 'images/fabrics/thumbs/wool-lining-6.webp', drape: 'flowing', roughness: 0.45, sheen: 0.1 },
          { id: 'wool-lining-7', label: 'Pewter Satin Lining', image: 'images/fabrics/wool-lining-7.webp#r21.961', thumb: 'images/fabrics/thumbs/wool-lining-7.webp', drape: 'flowing', roughness: 0.45, sheen: 0.1 },
          { id: 'wool-lining-8', label: 'Plum Lining', image: 'images/fabrics/wool-lining-8.webp#r21.961', thumb: 'images/fabrics/thumbs/wool-lining-8.webp', drape: 'flowing', roughness: 0.45, sheen: 0.1 },
          { id: 'wool-lining-9', label: 'Ruby Satin Lining', image: 'images/fabrics/wool-lining-9.webp#r21.961', thumb: 'images/fabrics/thumbs/wool-lining-9.webp', drape: 'flowing', roughness: 0.45, sheen: 0.1 },
          { id: 'wool-lining-10', label: 'Tobacco Lining', image: 'images/fabrics/wool-lining-10.webp#r21.961', thumb: 'images/fabrics/thumbs/wool-lining-10.webp', drape: 'flowing', roughness: 0.45, sheen: 0.1 },
        ],
      },
      {
        id: 'chex',
        label: 'Chex Collection',
        swatches: [
          { id: 'wool-chex-1', label: 'Prince of Wales Check', image: 'images/fabrics/wool-chex-1.webp#r10.417', thumb: 'images/fabrics/thumbs/wool-chex-1.webp', drape: 'heavy' },
          { id: 'wool-chex-2', label: 'Glen Urquhart Check', image: 'images/fabrics/wool-chex-2.webp#r10.417', thumb: 'images/fabrics/thumbs/wool-chex-2.webp', drape: 'heavy' },
          { id: 'wool-chex-3', label: 'Black Houndstooth', image: 'images/fabrics/wool-chex-3.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-chex-3.webp', drape: 'heavy' },
          { id: 'wool-chex-4', label: 'Navy Windowpane', image: 'images/fabrics/wool-chex-4.webp#r15.957', thumb: 'images/fabrics/thumbs/wool-chex-4.webp', drape: 'heavy' },
          { id: 'wool-chex-5', label: 'Gun Club Check', image: 'images/fabrics/wool-chex-5.webp#r11.905', thumb: 'images/fabrics/thumbs/wool-chex-5.webp', drape: 'heavy' },
          { id: 'wool-chex-6', label: 'Black Watch Tartan', image: 'images/fabrics/wool-chex-6.webp#r9.036', thumb: 'images/fabrics/thumbs/wool-chex-6.webp', drape: 'heavy' },
          { id: 'wool-chex-7', label: 'Royal Dress Tartan', image: 'images/fabrics/wool-chex-7.webp#r14.151', thumb: 'images/fabrics/thumbs/wool-chex-7.webp', drape: 'heavy' },
          { id: 'wool-chex-8', label: 'Grey Shepherd\'s Check', image: 'images/fabrics/wool-chex-8.webp#r11.905', thumb: 'images/fabrics/thumbs/wool-chex-8.webp', drape: 'heavy' },
          { id: 'wool-chex-9', label: 'Brown Dogtooth', image: 'images/fabrics/wool-chex-9.webp#r11.719', thumb: 'images/fabrics/thumbs/wool-chex-9.webp', drape: 'heavy' },
          { id: 'wool-chex-10', label: 'Charcoal Buffalo Check', image: 'images/fabrics/wool-chex-10.webp#r10.714', thumb: 'images/fabrics/thumbs/wool-chex-10.webp', drape: 'heavy' },
        ],
      },
      {
        id: 'print',
        label: 'Print Collection',
        swatches: [
          { id: 'wool-print-1', label: 'Challis Paisley', image: 'images/fabrics/wool-print-1.webp#r9.091', thumb: 'images/fabrics/thumbs/wool-print-1.webp', drape: 'heavy' },
          { id: 'wool-print-2', label: 'Navy Challis Foulard', image: 'images/fabrics/wool-print-2.webp#r9.091', thumb: 'images/fabrics/thumbs/wool-print-2.webp', drape: 'heavy' },
          { id: 'wool-print-3', label: 'Ivory Pin Dot', image: 'images/fabrics/wool-print-3.webp#r9.091', thumb: 'images/fabrics/thumbs/wool-print-3.webp', drape: 'heavy' },
          { id: 'wool-print-4', label: 'Tobacco Ogee', image: 'images/fabrics/wool-print-4.webp#r9.091', thumb: 'images/fabrics/thumbs/wool-print-4.webp', drape: 'heavy' },
          { id: 'wool-print-5', label: 'Forest Leaf Trail', image: 'images/fabrics/wool-print-5.webp#r9.091', thumb: 'images/fabrics/thumbs/wool-print-5.webp', drape: 'heavy' },
          { id: 'wool-print-6', label: 'Deco Fans', image: 'images/fabrics/wool-print-6.webp#r9.091', thumb: 'images/fabrics/thumbs/wool-print-6.webp', drape: 'heavy' },
          { id: 'wool-print-7', label: 'Oxblood Quatrefoil', image: 'images/fabrics/wool-print-7.webp#r9.091', thumb: 'images/fabrics/thumbs/wool-print-7.webp', drape: 'heavy' },
          { id: 'wool-print-8', label: 'Heritage Trellis', image: 'images/fabrics/wool-print-8.webp#r9.091', thumb: 'images/fabrics/thumbs/wool-print-8.webp', drape: 'heavy' },
          { id: 'wool-print-9', label: 'Sprig on Camel', image: 'images/fabrics/wool-print-9.webp#r9.091', thumb: 'images/fabrics/thumbs/wool-print-9.webp', drape: 'heavy' },
          { id: 'wool-print-10', label: 'Club Stripe', image: 'images/fabrics/wool-print-10.webp#r9.091', thumb: 'images/fabrics/thumbs/wool-print-10.webp', drape: 'heavy' },
        ],
      },
      {
        id: 'tweed',
        label: 'Tweed Collection',
        swatches: [
          { id: 'wool-tweed-1', label: 'Harris Herringbone', image: 'images/fabrics/wool-tweed-1.webp#r3.125', thumb: 'images/fabrics/thumbs/wool-tweed-1.webp', drape: 'heavy', roughness: 0.95, sheen: 0.35 },
          { id: 'wool-tweed-2', label: 'Donegal Oatmeal', image: 'images/fabrics/wool-tweed-2.webp#r3.125', thumb: 'images/fabrics/thumbs/wool-tweed-2.webp', drape: 'heavy', roughness: 0.95, sheen: 0.35 },
          { id: 'wool-tweed-3', label: 'Charcoal Donegal', image: 'images/fabrics/wool-tweed-3.webp#r3.125', thumb: 'images/fabrics/thumbs/wool-tweed-3.webp', drape: 'heavy', roughness: 0.95, sheen: 0.35 },
          { id: 'wool-tweed-4', label: 'Moss Barleycorn', image: 'images/fabrics/wool-tweed-4.webp#r3.101', thumb: 'images/fabrics/thumbs/wool-tweed-4.webp', drape: 'heavy', roughness: 0.95, sheen: 0.35 },
          { id: 'wool-tweed-5', label: 'Heather Twill', image: 'images/fabrics/wool-tweed-5.webp#r3.906', thumb: 'images/fabrics/thumbs/wool-tweed-5.webp', drape: 'heavy', roughness: 0.95, sheen: 0.35 },
          { id: 'wool-tweed-6', label: 'Salt & Pepper', image: 'images/fabrics/wool-tweed-6.webp#r3.906', thumb: 'images/fabrics/thumbs/wool-tweed-6.webp', drape: 'heavy', roughness: 0.95, sheen: 0.35 },
          { id: 'wool-tweed-7', label: 'Brown Herringbone', image: 'images/fabrics/wool-tweed-7.webp#r3.125', thumb: 'images/fabrics/thumbs/wool-tweed-7.webp', drape: 'heavy', roughness: 0.95, sheen: 0.35 },
          { id: 'wool-tweed-8', label: 'Lovat Hopsack', image: 'images/fabrics/wool-tweed-8.webp#r3.101', thumb: 'images/fabrics/thumbs/wool-tweed-8.webp', drape: 'heavy', roughness: 0.95, sheen: 0.35 },
          { id: 'wool-tweed-9', label: 'Birdseye Tweed', image: 'images/fabrics/wool-tweed-9.webp#r3.125', thumb: 'images/fabrics/thumbs/wool-tweed-9.webp', drape: 'heavy', roughness: 0.95, sheen: 0.35 },
          { id: 'wool-tweed-10', label: 'Rust Houndstooth Tweed', image: 'images/fabrics/wool-tweed-10.webp#r3.516', thumb: 'images/fabrics/thumbs/wool-tweed-10.webp', drape: 'heavy', roughness: 0.95, sheen: 0.35 },
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
          { id: 'silk-plain-1', label: 'Ivory Habotai', image: 'images/fabrics/silk-plain-1.webp#r23.438', thumb: 'images/fabrics/thumbs/silk-plain-1.webp', drape: 'flowing' },
          { id: 'silk-plain-2', label: 'Champagne Shantung', image: 'images/fabrics/silk-plain-2.webp#r15.625', thumb: 'images/fabrics/thumbs/silk-plain-2.webp', drape: 'flowing' },
          { id: 'silk-plain-3', label: 'Midnight Silk Twill', image: 'images/fabrics/silk-plain-3.webp#r23.438', thumb: 'images/fabrics/thumbs/silk-plain-3.webp', drape: 'flowing' },
          { id: 'silk-plain-4', label: 'Ruby Dupioni', image: 'images/fabrics/silk-plain-4.webp#r14.062', thumb: 'images/fabrics/thumbs/silk-plain-4.webp', drape: 'flowing' },
          { id: 'silk-plain-5', label: 'Emerald Taffeta', image: 'images/fabrics/silk-plain-5.webp#r21.875', thumb: 'images/fabrics/thumbs/silk-plain-5.webp', drape: 'flowing' },
          { id: 'silk-plain-6', label: 'Sapphire Silk Twill', image: 'images/fabrics/silk-plain-6.webp#r23.438', thumb: 'images/fabrics/thumbs/silk-plain-6.webp', drape: 'flowing' },
          { id: 'silk-plain-7', label: 'Blush Crêpe de Chine', image: 'images/fabrics/silk-plain-7.webp#r23.438', thumb: 'images/fabrics/thumbs/silk-plain-7.webp', drape: 'flowing' },
          { id: 'silk-plain-8', label: 'Black Silk Faille', image: 'images/fabrics/silk-plain-8.webp#r18.75', thumb: 'images/fabrics/thumbs/silk-plain-8.webp', drape: 'flowing' },
          { id: 'silk-plain-9', label: 'Gold Shantung', image: 'images/fabrics/silk-plain-9.webp#r15.625', thumb: 'images/fabrics/thumbs/silk-plain-9.webp', drape: 'flowing' },
          { id: 'silk-plain-10', label: 'Pewter Silk Twill', image: 'images/fabrics/silk-plain-10.webp#r23.438', thumb: 'images/fabrics/thumbs/silk-plain-10.webp', drape: 'flowing' },
        ],
      },
      {
        id: 'lining',
        label: 'Lining Collection',
        swatches: [
          { id: 'silk-lining-1', label: 'Ivory Silk Lining', image: 'images/fabrics/silk-lining-1.webp#r27.344', thumb: 'images/fabrics/thumbs/silk-lining-1.webp', drape: 'flowing', roughness: 0.3, sheen: 0.1 },
          { id: 'silk-lining-2', label: 'Champagne Twill Lining', image: 'images/fabrics/silk-lining-2.webp#r27.451', thumb: 'images/fabrics/thumbs/silk-lining-2.webp', drape: 'flowing', roughness: 0.3, sheen: 0.1 },
          { id: 'silk-lining-3', label: 'Navy Silk Lining', image: 'images/fabrics/silk-lining-3.webp#r27.451', thumb: 'images/fabrics/thumbs/silk-lining-3.webp', drape: 'flowing', roughness: 0.3, sheen: 0.1 },
          { id: 'silk-lining-4', label: 'Burgundy Silk Lining', image: 'images/fabrics/silk-lining-4.webp#r27.451', thumb: 'images/fabrics/thumbs/silk-lining-4.webp', drape: 'flowing', roughness: 0.3, sheen: 0.1 },
          { id: 'silk-lining-5', label: 'Black Silk Lining', image: 'images/fabrics/silk-lining-5.webp#r27.344', thumb: 'images/fabrics/thumbs/silk-lining-5.webp', drape: 'flowing', roughness: 0.3, sheen: 0.1 },
          { id: 'silk-lining-6', label: 'Gold Silk Lining', image: 'images/fabrics/silk-lining-6.webp#r27.451', thumb: 'images/fabrics/thumbs/silk-lining-6.webp', drape: 'flowing', roughness: 0.3, sheen: 0.1 },
          { id: 'silk-lining-7', label: 'Bottle Green Silk Lining', image: 'images/fabrics/silk-lining-7.webp#r27.451', thumb: 'images/fabrics/thumbs/silk-lining-7.webp', drape: 'flowing', roughness: 0.3, sheen: 0.1 },
          { id: 'silk-lining-8', label: 'Blush Silk Lining', image: 'images/fabrics/silk-lining-8.webp#r27.344', thumb: 'images/fabrics/thumbs/silk-lining-8.webp', drape: 'flowing', roughness: 0.3, sheen: 0.1 },
          { id: 'silk-lining-9', label: 'Silver Silk Lining', image: 'images/fabrics/silk-lining-9.webp#r27.451', thumb: 'images/fabrics/thumbs/silk-lining-9.webp', drape: 'flowing', roughness: 0.3, sheen: 0.1 },
          { id: 'silk-lining-10', label: 'Plum Silk Lining', image: 'images/fabrics/silk-lining-10.webp#r27.451', thumb: 'images/fabrics/thumbs/silk-lining-10.webp', drape: 'flowing', roughness: 0.3, sheen: 0.1 },
        ],
      },
      {
        id: 'print',
        label: 'Print Collection',
        swatches: [
          { id: 'silk-print-1', label: 'Navy Foulard', image: 'images/fabrics/silk-print-1.webp#r12.5', thumb: 'images/fabrics/thumbs/silk-print-1.webp', drape: 'flowing' },
          { id: 'silk-print-2', label: 'Burgundy Paisley', image: 'images/fabrics/silk-print-2.webp#r12.5', thumb: 'images/fabrics/thumbs/silk-print-2.webp', drape: 'flowing' },
          { id: 'silk-print-3', label: 'Ivory Polka Dot', image: 'images/fabrics/silk-print-3.webp#r12.5', thumb: 'images/fabrics/thumbs/silk-print-3.webp', drape: 'flowing' },
          { id: 'silk-print-4', label: 'Emerald Ogee', image: 'images/fabrics/silk-print-4.webp#r12.5', thumb: 'images/fabrics/thumbs/silk-print-4.webp', drape: 'flowing' },
          { id: 'silk-print-5', label: 'Gold Pin Dot', image: 'images/fabrics/silk-print-5.webp#r12.5', thumb: 'images/fabrics/thumbs/silk-print-5.webp', drape: 'flowing' },
          { id: 'silk-print-6', label: 'Deco Fans', image: 'images/fabrics/silk-print-6.webp#r12.5', thumb: 'images/fabrics/thumbs/silk-print-6.webp', drape: 'flowing' },
          { id: 'silk-print-7', label: 'Sapphire Trellis', image: 'images/fabrics/silk-print-7.webp#r12.5', thumb: 'images/fabrics/thumbs/silk-print-7.webp', drape: 'flowing' },
          { id: 'silk-print-8', label: 'Blush Botanical', image: 'images/fabrics/silk-print-8.webp#r12.5', thumb: 'images/fabrics/thumbs/silk-print-8.webp', drape: 'flowing' },
          { id: 'silk-print-9', label: 'Ruby Quatrefoil', image: 'images/fabrics/silk-print-9.webp#r12.5', thumb: 'images/fabrics/thumbs/silk-print-9.webp', drape: 'flowing' },
          { id: 'silk-print-10', label: 'Champagne Sprig', image: 'images/fabrics/silk-print-10.webp#r12.5', thumb: 'images/fabrics/thumbs/silk-print-10.webp', drape: 'flowing' },
        ],
      },
      {
        id: 'satin',
        label: 'Satin Collection',
        swatches: [
          { id: 'silk-satin-1', label: 'Ivory Charmeuse', image: 'images/fabrics/silk-satin-1.webp#r13.636', thumb: 'images/fabrics/thumbs/silk-satin-1.webp', drape: 'flowing', roughness: 0.2, sheen: 0.2 },
          { id: 'silk-satin-2', label: 'Champagne Satin', image: 'images/fabrics/silk-satin-2.webp#r13.636', thumb: 'images/fabrics/thumbs/silk-satin-2.webp', drape: 'flowing', roughness: 0.2, sheen: 0.2 },
          { id: 'silk-satin-3', label: 'Black Duchess Satin', image: 'images/fabrics/silk-satin-3.webp#r13.636', thumb: 'images/fabrics/thumbs/silk-satin-3.webp', drape: 'flowing', roughness: 0.2, sheen: 0.2 },
          { id: 'silk-satin-4', label: 'Midnight Satin', image: 'images/fabrics/silk-satin-4.webp#r13.636', thumb: 'images/fabrics/thumbs/silk-satin-4.webp', drape: 'flowing', roughness: 0.2, sheen: 0.2 },
          { id: 'silk-satin-5', label: 'Ruby Satin', image: 'images/fabrics/silk-satin-5.webp#r13.636', thumb: 'images/fabrics/thumbs/silk-satin-5.webp', drape: 'flowing', roughness: 0.2, sheen: 0.2 },
          { id: 'silk-satin-6', label: 'Emerald Satin', image: 'images/fabrics/silk-satin-6.webp#r13.636', thumb: 'images/fabrics/thumbs/silk-satin-6.webp', drape: 'flowing', roughness: 0.2, sheen: 0.2 },
          { id: 'silk-satin-7', label: 'Sapphire Satin', image: 'images/fabrics/silk-satin-7.webp#r13.636', thumb: 'images/fabrics/thumbs/silk-satin-7.webp', drape: 'flowing', roughness: 0.2, sheen: 0.2 },
          { id: 'silk-satin-8', label: 'Blush Satin', image: 'images/fabrics/silk-satin-8.webp#r13.636', thumb: 'images/fabrics/thumbs/silk-satin-8.webp', drape: 'flowing', roughness: 0.2, sheen: 0.2 },
          { id: 'silk-satin-9', label: 'Gold Satin', image: 'images/fabrics/silk-satin-9.webp#r13.636', thumb: 'images/fabrics/thumbs/silk-satin-9.webp', drape: 'flowing', roughness: 0.2, sheen: 0.2 },
          { id: 'silk-satin-10', label: 'Pewter Satin', image: 'images/fabrics/silk-satin-10.webp#r13.636', thumb: 'images/fabrics/thumbs/silk-satin-10.webp', drape: 'flowing', roughness: 0.2, sheen: 0.2 },
        ],
      },
    ],
  },
  {
    id: 'cotton-linen',
    label: 'Cotton Linen Blend',
    // Blends show two wreath images side by side in the card header.
    wreaths: ['images/Cotton Wreath.webp', 'images/Linen Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'cotton-linen-plain-1', label: 'Natural Cotton-Linen', image: 'images/fabrics/cotton-linen-plain-1.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-plain-1.webp', drape: 'medium' },
          { id: 'cotton-linen-plain-2', label: 'White Cotton-Linen', image: 'images/fabrics/cotton-linen-plain-2.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-plain-2.webp', drape: 'medium' },
          { id: 'cotton-linen-plain-3', label: 'Stone Cotton-Linen', image: 'images/fabrics/cotton-linen-plain-3.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-plain-3.webp', drape: 'medium' },
          { id: 'cotton-linen-plain-4', label: 'Navy Cotton-Linen', image: 'images/fabrics/cotton-linen-plain-4.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-plain-4.webp', drape: 'medium' },
          { id: 'cotton-linen-plain-5', label: 'Sage Cotton-Linen', image: 'images/fabrics/cotton-linen-plain-5.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-plain-5.webp', drape: 'medium' },
          { id: 'cotton-linen-plain-6', label: 'Sand Cotton-Linen', image: 'images/fabrics/cotton-linen-plain-6.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-plain-6.webp', drape: 'medium' },
          { id: 'cotton-linen-plain-7', label: 'Sky Cotton-Linen', image: 'images/fabrics/cotton-linen-plain-7.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-plain-7.webp', drape: 'medium' },
          { id: 'cotton-linen-plain-8', label: 'Tobacco Cotton-Linen', image: 'images/fabrics/cotton-linen-plain-8.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-plain-8.webp', drape: 'medium' },
          { id: 'cotton-linen-plain-9', label: 'Ecru Cotton-Linen', image: 'images/fabrics/cotton-linen-plain-9.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-plain-9.webp', drape: 'medium' },
          { id: 'cotton-linen-plain-10', label: 'Olive Cotton-Linen', image: 'images/fabrics/cotton-linen-plain-10.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-plain-10.webp', drape: 'medium' },
        ],
      },
      {
        id: 'dobies',
        label: 'Dobies Collection',
        swatches: [
          { id: 'cotton-linen-dobies-1', label: 'Ecru Herringbone', image: 'images/fabrics/cotton-linen-dobies-1.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-dobies-1.webp', drape: 'medium' },
          { id: 'cotton-linen-dobies-2', label: 'Navy Hopsack', image: 'images/fabrics/cotton-linen-dobies-2.webp#r10.078', thumb: 'images/fabrics/thumbs/cotton-linen-dobies-2.webp', drape: 'medium' },
          { id: 'cotton-linen-dobies-3', label: 'White Piqué', image: 'images/fabrics/cotton-linen-dobies-3.webp#r10.078', thumb: 'images/fabrics/thumbs/cotton-linen-dobies-3.webp', drape: 'medium' },
          { id: 'cotton-linen-dobies-4', label: 'Stone Basket Weave', image: 'images/fabrics/cotton-linen-dobies-4.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-dobies-4.webp', drape: 'medium' },
          { id: 'cotton-linen-dobies-5', label: 'Sky Bird\'s-Eye', image: 'images/fabrics/cotton-linen-dobies-5.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-dobies-5.webp', drape: 'medium' },
          { id: 'cotton-linen-dobies-6', label: 'Sand Diamond Dobby', image: 'images/fabrics/cotton-linen-dobies-6.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-dobies-6.webp', drape: 'medium' },
          { id: 'cotton-linen-dobies-7', label: 'Olive Twill', image: 'images/fabrics/cotton-linen-dobies-7.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-dobies-7.webp', drape: 'medium' },
          { id: 'cotton-linen-dobies-8', label: 'Chambray', image: 'images/fabrics/cotton-linen-dobies-8.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-dobies-8.webp', drape: 'medium' },
          { id: 'cotton-linen-dobies-9', label: 'Ivory Honeycomb', image: 'images/fabrics/cotton-linen-dobies-9.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-dobies-9.webp', drape: 'medium' },
          { id: 'cotton-linen-dobies-10', label: 'Taupe Barleycorn', image: 'images/fabrics/cotton-linen-dobies-10.webp#r10.078', thumb: 'images/fabrics/thumbs/cotton-linen-dobies-10.webp', drape: 'medium' },
        ],
      },
      {
        id: 'lining',
        label: 'Lining Collection',
        swatches: [
          { id: 'cotton-linen-lining-1', label: 'Ivory Voile Lining', image: 'images/fabrics/cotton-linen-lining-1.webp#r13.281', thumb: 'images/fabrics/thumbs/cotton-linen-lining-1.webp', drape: 'flowing', roughness: 0.65 },
          { id: 'cotton-linen-lining-2', label: 'Natural Lining', image: 'images/fabrics/cotton-linen-lining-2.webp#r13.281', thumb: 'images/fabrics/thumbs/cotton-linen-lining-2.webp', drape: 'flowing', roughness: 0.65 },
          { id: 'cotton-linen-lining-3', label: 'Champagne Lining', image: 'images/fabrics/cotton-linen-lining-3.webp#r13.281', thumb: 'images/fabrics/thumbs/cotton-linen-lining-3.webp', drape: 'flowing', roughness: 0.65 },
          { id: 'cotton-linen-lining-4', label: 'Navy Lining', image: 'images/fabrics/cotton-linen-lining-4.webp#r13.281', thumb: 'images/fabrics/thumbs/cotton-linen-lining-4.webp', drape: 'flowing', roughness: 0.65 },
          { id: 'cotton-linen-lining-5', label: 'Stone Lining', image: 'images/fabrics/cotton-linen-lining-5.webp#r13.281', thumb: 'images/fabrics/thumbs/cotton-linen-lining-5.webp', drape: 'flowing', roughness: 0.65 },
          { id: 'cotton-linen-lining-6', label: 'Sage Lining', image: 'images/fabrics/cotton-linen-lining-6.webp#r13.281', thumb: 'images/fabrics/thumbs/cotton-linen-lining-6.webp', drape: 'flowing', roughness: 0.65 },
          { id: 'cotton-linen-lining-7', label: 'Blush Lining', image: 'images/fabrics/cotton-linen-lining-7.webp#r13.281', thumb: 'images/fabrics/thumbs/cotton-linen-lining-7.webp', drape: 'flowing', roughness: 0.65 },
          { id: 'cotton-linen-lining-8', label: 'Sky Lining', image: 'images/fabrics/cotton-linen-lining-8.webp#r13.281', thumb: 'images/fabrics/thumbs/cotton-linen-lining-8.webp', drape: 'flowing', roughness: 0.65 },
          { id: 'cotton-linen-lining-9', label: 'Tobacco Lining', image: 'images/fabrics/cotton-linen-lining-9.webp#r13.281', thumb: 'images/fabrics/thumbs/cotton-linen-lining-9.webp', drape: 'flowing', roughness: 0.65 },
          { id: 'cotton-linen-lining-10', label: 'White Batiste', image: 'images/fabrics/cotton-linen-lining-10.webp#r13.281', thumb: 'images/fabrics/thumbs/cotton-linen-lining-10.webp', drape: 'flowing', roughness: 0.65 },
        ],
      },
      {
        id: 'chex',
        label: 'Chex Collection',
        swatches: [
          { id: 'cotton-linen-chex-1', label: 'Navy Gingham', image: 'images/fabrics/cotton-linen-chex-1.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-chex-1.webp', drape: 'medium' },
          { id: 'cotton-linen-chex-2', label: 'Sage Gingham', image: 'images/fabrics/cotton-linen-chex-2.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-chex-2.webp', drape: 'medium' },
          { id: 'cotton-linen-chex-3', label: 'Stone Windowpane', image: 'images/fabrics/cotton-linen-chex-3.webp#r9.22', thumb: 'images/fabrics/thumbs/cotton-linen-chex-3.webp', drape: 'medium' },
          { id: 'cotton-linen-chex-4', label: 'Tattersall', image: 'images/fabrics/cotton-linen-chex-4.webp#r10.833', thumb: 'images/fabrics/thumbs/cotton-linen-chex-4.webp', drape: 'medium' },
          { id: 'cotton-linen-chex-5', label: 'Indigo Graph Check', image: 'images/fabrics/cotton-linen-chex-5.webp#r9.848', thumb: 'images/fabrics/thumbs/cotton-linen-chex-5.webp', drape: 'medium' },
          { id: 'cotton-linen-chex-6', label: 'Tobacco Shepherd\'s Check', image: 'images/fabrics/cotton-linen-chex-6.webp#r10.317', thumb: 'images/fabrics/thumbs/cotton-linen-chex-6.webp', drape: 'medium' },
          { id: 'cotton-linen-chex-7', label: 'Glen Check', image: 'images/fabrics/cotton-linen-chex-7.webp#r9.028', thumb: 'images/fabrics/thumbs/cotton-linen-chex-7.webp', drape: 'medium' },
          { id: 'cotton-linen-chex-8', label: 'Sky Gingham', image: 'images/fabrics/cotton-linen-chex-8.webp#r10.0', thumb: 'images/fabrics/thumbs/cotton-linen-chex-8.webp', drape: 'medium' },
          { id: 'cotton-linen-chex-9', label: 'Navy Buffalo Check', image: 'images/fabrics/cotton-linen-chex-9.webp#r9.286', thumb: 'images/fabrics/thumbs/cotton-linen-chex-9.webp', drape: 'medium' },
          { id: 'cotton-linen-chex-10', label: 'Olive Houndstooth', image: 'images/fabrics/cotton-linen-chex-10.webp#r10.156', thumb: 'images/fabrics/thumbs/cotton-linen-chex-10.webp', drape: 'medium' },
        ],
      },
      {
        id: 'print',
        label: 'Print Collection',
        swatches: [
          { id: 'cotton-linen-print-1', label: 'Indigo Paisley', image: 'images/fabrics/cotton-linen-print-1.webp#r8.667', thumb: 'images/fabrics/thumbs/cotton-linen-print-1.webp', drape: 'medium' },
          { id: 'cotton-linen-print-2', label: 'Terracotta Foulard', image: 'images/fabrics/cotton-linen-print-2.webp#r8.667', thumb: 'images/fabrics/thumbs/cotton-linen-print-2.webp', drape: 'medium' },
          { id: 'cotton-linen-print-3', label: 'Navy Pin Dot', image: 'images/fabrics/cotton-linen-print-3.webp#r8.667', thumb: 'images/fabrics/thumbs/cotton-linen-print-3.webp', drape: 'medium' },
          { id: 'cotton-linen-print-4', label: 'Floral Buti', image: 'images/fabrics/cotton-linen-print-4.webp#r8.667', thumb: 'images/fabrics/thumbs/cotton-linen-print-4.webp', drape: 'medium' },
          { id: 'cotton-linen-print-5', label: 'Leaf Trail', image: 'images/fabrics/cotton-linen-print-5.webp#r8.667', thumb: 'images/fabrics/thumbs/cotton-linen-print-5.webp', drape: 'medium' },
          { id: 'cotton-linen-print-6', label: 'Indigo Ikat', image: 'images/fabrics/cotton-linen-print-6.webp#r8.667', thumb: 'images/fabrics/thumbs/cotton-linen-print-6.webp', drape: 'medium' },
          { id: 'cotton-linen-print-7', label: 'Quatrefoil', image: 'images/fabrics/cotton-linen-print-7.webp#r8.667', thumb: 'images/fabrics/thumbs/cotton-linen-print-7.webp', drape: 'medium' },
          { id: 'cotton-linen-print-8', label: 'Trellis', image: 'images/fabrics/cotton-linen-print-8.webp#r8.667', thumb: 'images/fabrics/thumbs/cotton-linen-print-8.webp', drape: 'medium' },
          { id: 'cotton-linen-print-9', label: 'Sprig', image: 'images/fabrics/cotton-linen-print-9.webp#r8.667', thumb: 'images/fabrics/thumbs/cotton-linen-print-9.webp', drape: 'medium' },
          { id: 'cotton-linen-print-10', label: 'Seaside Stripe', image: 'images/fabrics/cotton-linen-print-10.webp#r8.667', thumb: 'images/fabrics/thumbs/cotton-linen-print-10.webp', drape: 'medium' },
        ],
      },
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
          { id: 'cotton-wool-plain-1', label: 'Navy Cotton-Wool Twill', image: 'images/fabrics/cotton-wool-plain-1.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-plain-1.webp', drape: 'medium' },
          { id: 'cotton-wool-plain-2', label: 'Charcoal Flannel', image: 'images/fabrics/cotton-wool-plain-2.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-plain-2.webp', drape: 'medium' },
          { id: 'cotton-wool-plain-3', label: 'Camel Twill', image: 'images/fabrics/cotton-wool-plain-3.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-plain-3.webp', drape: 'medium' },
          { id: 'cotton-wool-plain-4', label: 'Grey Melange', image: 'images/fabrics/cotton-wool-plain-4.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-plain-4.webp', drape: 'medium' },
          { id: 'cotton-wool-plain-5', label: 'Bottle Green Twill', image: 'images/fabrics/cotton-wool-plain-5.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-plain-5.webp', drape: 'medium' },
          { id: 'cotton-wool-plain-6', label: 'Chocolate Twill', image: 'images/fabrics/cotton-wool-plain-6.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-plain-6.webp', drape: 'medium' },
          { id: 'cotton-wool-plain-7', label: 'Oxblood Twill', image: 'images/fabrics/cotton-wool-plain-7.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-plain-7.webp', drape: 'medium' },
          { id: 'cotton-wool-plain-8', label: 'Stone Gabardine', image: 'images/fabrics/cotton-wool-plain-8.webp#r10.98', thumb: 'images/fabrics/thumbs/cotton-wool-plain-8.webp', drape: 'medium' },
          { id: 'cotton-wool-plain-9', label: 'Ivory Twill', image: 'images/fabrics/cotton-wool-plain-9.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-plain-9.webp', drape: 'medium' },
          { id: 'cotton-wool-plain-10', label: 'Tobacco Brushed Twill', image: 'images/fabrics/cotton-wool-plain-10.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-plain-10.webp', drape: 'medium' },
        ],
      },
      {
        id: 'dobies',
        label: 'Dobies Collection',
        swatches: [
          { id: 'cotton-wool-dobies-1', label: 'Navy Bird\'s-Eye', image: 'images/fabrics/cotton-wool-dobies-1.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-dobies-1.webp', drape: 'medium' },
          { id: 'cotton-wool-dobies-2', label: 'Charcoal Herringbone', image: 'images/fabrics/cotton-wool-dobies-2.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-dobies-2.webp', drape: 'medium' },
          { id: 'cotton-wool-dobies-3', label: 'Camel Barleycorn', image: 'images/fabrics/cotton-wool-dobies-3.webp#r10.853', thumb: 'images/fabrics/thumbs/cotton-wool-dobies-3.webp', drape: 'medium' },
          { id: 'cotton-wool-dobies-4', label: 'Brown Hopsack', image: 'images/fabrics/cotton-wool-dobies-4.webp#r10.853', thumb: 'images/fabrics/thumbs/cotton-wool-dobies-4.webp', drape: 'medium' },
          { id: 'cotton-wool-dobies-5', label: 'Grey Nailhead', image: 'images/fabrics/cotton-wool-dobies-5.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-dobies-5.webp', drape: 'medium' },
          { id: 'cotton-wool-dobies-6', label: 'Navy Basket Weave', image: 'images/fabrics/cotton-wool-dobies-6.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-dobies-6.webp', drape: 'medium' },
          { id: 'cotton-wool-dobies-7', label: 'Olive Honeycomb', image: 'images/fabrics/cotton-wool-dobies-7.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-dobies-7.webp', drape: 'medium' },
          { id: 'cotton-wool-dobies-8', label: 'Taupe Piqué', image: 'images/fabrics/cotton-wool-dobies-8.webp#r10.853', thumb: 'images/fabrics/thumbs/cotton-wool-dobies-8.webp', drape: 'medium' },
          { id: 'cotton-wool-dobies-9', label: 'Bottle Bedford Cord', image: 'images/fabrics/cotton-wool-dobies-9.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-dobies-9.webp', drape: 'medium' },
          { id: 'cotton-wool-dobies-10', label: 'Midnight Pick-and-Pick', image: 'images/fabrics/cotton-wool-dobies-10.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-dobies-10.webp', drape: 'medium' },
        ],
      },
      {
        id: 'lining',
        label: 'Lining Collection',
        swatches: [
          { id: 'cotton-wool-lining-1', label: 'Burgundy Twill Lining', image: 'images/fabrics/cotton-wool-lining-1.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-wool-lining-1.webp', drape: 'flowing', roughness: 0.5, sheen: 0.1 },
          { id: 'cotton-wool-lining-2', label: 'Gold Sateen Lining', image: 'images/fabrics/cotton-wool-lining-2.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-wool-lining-2.webp', drape: 'flowing', roughness: 0.5, sheen: 0.1 },
          { id: 'cotton-wool-lining-3', label: 'Navy Twill Lining', image: 'images/fabrics/cotton-wool-lining-3.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-wool-lining-3.webp', drape: 'flowing', roughness: 0.5, sheen: 0.1 },
          { id: 'cotton-wool-lining-4', label: 'Champagne Sateen Lining', image: 'images/fabrics/cotton-wool-lining-4.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-wool-lining-4.webp', drape: 'flowing', roughness: 0.5, sheen: 0.1 },
          { id: 'cotton-wool-lining-5', label: 'Bottle Green Lining', image: 'images/fabrics/cotton-wool-lining-5.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-wool-lining-5.webp', drape: 'flowing', roughness: 0.5, sheen: 0.1 },
          { id: 'cotton-wool-lining-6', label: 'Black Lining', image: 'images/fabrics/cotton-wool-lining-6.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-wool-lining-6.webp', drape: 'flowing', roughness: 0.5, sheen: 0.1 },
          { id: 'cotton-wool-lining-7', label: 'Pewter Sateen Lining', image: 'images/fabrics/cotton-wool-lining-7.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-wool-lining-7.webp', drape: 'flowing', roughness: 0.5, sheen: 0.1 },
          { id: 'cotton-wool-lining-8', label: 'Plum Lining', image: 'images/fabrics/cotton-wool-lining-8.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-wool-lining-8.webp', drape: 'flowing', roughness: 0.5, sheen: 0.1 },
          { id: 'cotton-wool-lining-9', label: 'Tobacco Lining', image: 'images/fabrics/cotton-wool-lining-9.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-wool-lining-9.webp', drape: 'flowing', roughness: 0.5, sheen: 0.1 },
          { id: 'cotton-wool-lining-10', label: 'Ivory Sateen Lining', image: 'images/fabrics/cotton-wool-lining-10.webp#r20.392', thumb: 'images/fabrics/thumbs/cotton-wool-lining-10.webp', drape: 'flowing', roughness: 0.5, sheen: 0.1 },
        ],
      },
      {
        id: 'chex',
        label: 'Chex Collection',
        swatches: [
          { id: 'cotton-wool-chex-1', label: 'Prince of Wales Check', image: 'images/fabrics/cotton-wool-chex-1.webp#r9.722', thumb: 'images/fabrics/thumbs/cotton-wool-chex-1.webp', drape: 'medium' },
          { id: 'cotton-wool-chex-2', label: 'Glen Check', image: 'images/fabrics/cotton-wool-chex-2.webp#r9.722', thumb: 'images/fabrics/thumbs/cotton-wool-chex-2.webp', drape: 'medium' },
          { id: 'cotton-wool-chex-3', label: 'Black Houndstooth', image: 'images/fabrics/cotton-wool-chex-3.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-chex-3.webp', drape: 'medium' },
          { id: 'cotton-wool-chex-4', label: 'Brown Windowpane', image: 'images/fabrics/cotton-wool-chex-4.webp#r14.894', thumb: 'images/fabrics/thumbs/cotton-wool-chex-4.webp', drape: 'medium' },
          { id: 'cotton-wool-chex-5', label: 'Gun Club Check', image: 'images/fabrics/cotton-wool-chex-5.webp#r11.111', thumb: 'images/fabrics/thumbs/cotton-wool-chex-5.webp', drape: 'medium' },
          { id: 'cotton-wool-chex-6', label: 'Black Watch Tartan', image: 'images/fabrics/cotton-wool-chex-6.webp#r8.434', thumb: 'images/fabrics/thumbs/cotton-wool-chex-6.webp', drape: 'medium' },
          { id: 'cotton-wool-chex-7', label: 'Dress Tartan', image: 'images/fabrics/cotton-wool-chex-7.webp#r13.208', thumb: 'images/fabrics/thumbs/cotton-wool-chex-7.webp', drape: 'medium' },
          { id: 'cotton-wool-chex-8', label: 'Shepherd\'s Check', image: 'images/fabrics/cotton-wool-chex-8.webp#r11.111', thumb: 'images/fabrics/thumbs/cotton-wool-chex-8.webp', drape: 'medium' },
          { id: 'cotton-wool-chex-9', label: 'Navy Dogtooth', image: 'images/fabrics/cotton-wool-chex-9.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-wool-chex-9.webp', drape: 'medium' },
          { id: 'cotton-wool-chex-10', label: 'Buffalo Check', image: 'images/fabrics/cotton-wool-chex-10.webp#r10.0', thumb: 'images/fabrics/thumbs/cotton-wool-chex-10.webp', drape: 'medium' },
        ],
      },
      {
        id: 'print',
        label: 'Print Collection',
        swatches: [
          { id: 'cotton-wool-print-1', label: 'Paisley', image: 'images/fabrics/cotton-wool-print-1.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-wool-print-1.webp', drape: 'medium' },
          { id: 'cotton-wool-print-2', label: 'Foulard', image: 'images/fabrics/cotton-wool-print-2.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-wool-print-2.webp', drape: 'medium' },
          { id: 'cotton-wool-print-3', label: 'Pin Dot', image: 'images/fabrics/cotton-wool-print-3.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-wool-print-3.webp', drape: 'medium' },
          { id: 'cotton-wool-print-4', label: 'Ogee', image: 'images/fabrics/cotton-wool-print-4.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-wool-print-4.webp', drape: 'medium' },
          { id: 'cotton-wool-print-5', label: 'Leaf Trail', image: 'images/fabrics/cotton-wool-print-5.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-wool-print-5.webp', drape: 'medium' },
          { id: 'cotton-wool-print-6', label: 'Deco Fans', image: 'images/fabrics/cotton-wool-print-6.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-wool-print-6.webp', drape: 'medium' },
          { id: 'cotton-wool-print-7', label: 'Quatrefoil', image: 'images/fabrics/cotton-wool-print-7.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-wool-print-7.webp', drape: 'medium' },
          { id: 'cotton-wool-print-8', label: 'Trellis', image: 'images/fabrics/cotton-wool-print-8.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-wool-print-8.webp', drape: 'medium' },
          { id: 'cotton-wool-print-9', label: 'Sprig', image: 'images/fabrics/cotton-wool-print-9.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-wool-print-9.webp', drape: 'medium' },
          { id: 'cotton-wool-print-10', label: 'Club Stripe', image: 'images/fabrics/cotton-wool-print-10.webp#r9.091', thumb: 'images/fabrics/thumbs/cotton-wool-print-10.webp', drape: 'medium' },
        ],
      },
    ],
  },
  {
    id: 'cotton-spandex',
    label: 'Cotton Spandex Blend',
    wreaths: ['images/Cotton Wreath.webp', 'images/Spandex Wreath.webp'],
    collections: [
      {
        id: 'denim',
        label: 'Denim Collection',
        swatches: [
          { id: 'cotton-spandex-denim-1', label: 'Raw Indigo Denim', image: 'images/fabrics/cotton-spandex-denim-1.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-spandex-denim-1.webp', drape: 'heavy', roughness: 0.85, sheen: 0.05 },
          { id: 'cotton-spandex-denim-2', label: 'Selvedge Indigo', image: 'images/fabrics/cotton-spandex-denim-2.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-spandex-denim-2.webp', drape: 'heavy', roughness: 0.85, sheen: 0.05 },
          { id: 'cotton-spandex-denim-3', label: 'Rinse Wash Denim', image: 'images/fabrics/cotton-spandex-denim-3.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-spandex-denim-3.webp', drape: 'heavy', roughness: 0.85, sheen: 0.05 },
          { id: 'cotton-spandex-denim-4', label: 'Mid Stone Wash', image: 'images/fabrics/cotton-spandex-denim-4.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-spandex-denim-4.webp', drape: 'heavy', roughness: 0.85, sheen: 0.05 },
          { id: 'cotton-spandex-denim-5', label: 'Light Vintage Wash', image: 'images/fabrics/cotton-spandex-denim-5.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-spandex-denim-5.webp', drape: 'heavy', roughness: 0.85, sheen: 0.05 },
          { id: 'cotton-spandex-denim-6', label: 'Black Denim', image: 'images/fabrics/cotton-spandex-denim-6.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-spandex-denim-6.webp', drape: 'heavy', roughness: 0.85, sheen: 0.05 },
          { id: 'cotton-spandex-denim-7', label: 'Grey Denim', image: 'images/fabrics/cotton-spandex-denim-7.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-spandex-denim-7.webp', drape: 'heavy', roughness: 0.85, sheen: 0.05 },
          { id: 'cotton-spandex-denim-8', label: 'Ecru Denim', image: 'images/fabrics/cotton-spandex-denim-8.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-spandex-denim-8.webp', drape: 'heavy', roughness: 0.85, sheen: 0.05 },
          { id: 'cotton-spandex-denim-9', label: 'Indigo-Black Overdye', image: 'images/fabrics/cotton-spandex-denim-9.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-spandex-denim-9.webp', drape: 'heavy', roughness: 0.85, sheen: 0.05 },
          { id: 'cotton-spandex-denim-10', label: 'White Denim', image: 'images/fabrics/cotton-spandex-denim-10.webp#r10.938', thumb: 'images/fabrics/thumbs/cotton-spandex-denim-10.webp', drape: 'heavy', roughness: 0.85, sheen: 0.05 },
        ],
      },
      {
        id: 'corduroy',
        label: 'Corduroy Collection',
        swatches: [
          { id: 'cotton-spandex-corduroy-1', label: 'Tobacco Needlecord', image: 'images/fabrics/cotton-spandex-corduroy-1.webp#r8.333', thumb: 'images/fabrics/thumbs/cotton-spandex-corduroy-1.webp', drape: 'heavy', roughness: 0.9, sheen: 0.45 },
          { id: 'cotton-spandex-corduroy-2', label: 'Camel Corduroy', image: 'images/fabrics/cotton-spandex-corduroy-2.webp#r8.269', thumb: 'images/fabrics/thumbs/cotton-spandex-corduroy-2.webp', drape: 'heavy', roughness: 0.9, sheen: 0.45 },
          { id: 'cotton-spandex-corduroy-3', label: 'Navy Corduroy', image: 'images/fabrics/cotton-spandex-corduroy-3.webp#r8.269', thumb: 'images/fabrics/thumbs/cotton-spandex-corduroy-3.webp', drape: 'heavy', roughness: 0.9, sheen: 0.45 },
          { id: 'cotton-spandex-corduroy-4', label: 'Bottle Green Corduroy', image: 'images/fabrics/cotton-spandex-corduroy-4.webp#r8.269', thumb: 'images/fabrics/thumbs/cotton-spandex-corduroy-4.webp', drape: 'heavy', roughness: 0.9, sheen: 0.45 },
          { id: 'cotton-spandex-corduroy-5', label: 'Burgundy Corduroy', image: 'images/fabrics/cotton-spandex-corduroy-5.webp#r8.269', thumb: 'images/fabrics/thumbs/cotton-spandex-corduroy-5.webp', drape: 'heavy', roughness: 0.9, sheen: 0.45 },
          { id: 'cotton-spandex-corduroy-6', label: 'Cream Jumbo Cord', image: 'images/fabrics/cotton-spandex-corduroy-6.webp#r8.333', thumb: 'images/fabrics/thumbs/cotton-spandex-corduroy-6.webp', drape: 'heavy', roughness: 0.9, sheen: 0.45 },
          { id: 'cotton-spandex-corduroy-7', label: 'Chocolate Corduroy', image: 'images/fabrics/cotton-spandex-corduroy-7.webp#r8.269', thumb: 'images/fabrics/thumbs/cotton-spandex-corduroy-7.webp', drape: 'heavy', roughness: 0.9, sheen: 0.45 },
          { id: 'cotton-spandex-corduroy-8', label: 'Olive Needlecord', image: 'images/fabrics/cotton-spandex-corduroy-8.webp#r8.333', thumb: 'images/fabrics/thumbs/cotton-spandex-corduroy-8.webp', drape: 'heavy', roughness: 0.9, sheen: 0.45 },
          { id: 'cotton-spandex-corduroy-9', label: 'Rust Jumbo Cord', image: 'images/fabrics/cotton-spandex-corduroy-9.webp#r8.333', thumb: 'images/fabrics/thumbs/cotton-spandex-corduroy-9.webp', drape: 'heavy', roughness: 0.9, sheen: 0.45 },
          { id: 'cotton-spandex-corduroy-10', label: 'Grey Corduroy', image: 'images/fabrics/cotton-spandex-corduroy-10.webp#r8.269', thumb: 'images/fabrics/thumbs/cotton-spandex-corduroy-10.webp', drape: 'heavy', roughness: 0.9, sheen: 0.45 },
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
          { id: 'leather-plain-1', label: 'Black Calf', image: 'images/fabrics/leather-plain-1.webp#r14.286', thumb: 'images/fabrics/thumbs/leather-plain-1.webp', drape: 'heavy', roughness: 0.45 },
          { id: 'leather-plain-2', label: 'Cognac Calf', image: 'images/fabrics/leather-plain-2.webp#r14.286', thumb: 'images/fabrics/thumbs/leather-plain-2.webp', drape: 'heavy', roughness: 0.45 },
          { id: 'leather-plain-3', label: 'Tan Calf', image: 'images/fabrics/leather-plain-3.webp#r14.286', thumb: 'images/fabrics/thumbs/leather-plain-3.webp', drape: 'heavy', roughness: 0.45 },
          { id: 'leather-plain-4', label: 'Chocolate Calf', image: 'images/fabrics/leather-plain-4.webp#r14.286', thumb: 'images/fabrics/thumbs/leather-plain-4.webp', drape: 'heavy', roughness: 0.45 },
          { id: 'leather-plain-5', label: 'Oxblood Calf', image: 'images/fabrics/leather-plain-5.webp#r14.286', thumb: 'images/fabrics/thumbs/leather-plain-5.webp', drape: 'heavy', roughness: 0.45 },
          { id: 'leather-plain-6', label: 'Navy Calf', image: 'images/fabrics/leather-plain-6.webp#r14.286', thumb: 'images/fabrics/thumbs/leather-plain-6.webp', drape: 'heavy', roughness: 0.45 },
          { id: 'leather-plain-7', label: 'Bone Calf', image: 'images/fabrics/leather-plain-7.webp#r14.286', thumb: 'images/fabrics/thumbs/leather-plain-7.webp', drape: 'heavy', roughness: 0.45 },
          { id: 'leather-plain-8', label: 'Forest Calf', image: 'images/fabrics/leather-plain-8.webp#r14.286', thumb: 'images/fabrics/thumbs/leather-plain-8.webp', drape: 'heavy', roughness: 0.45 },
          { id: 'leather-plain-9', label: 'Grey Pebble Grain', image: 'images/fabrics/leather-plain-9.webp#r9.091', thumb: 'images/fabrics/thumbs/leather-plain-9.webp', drape: 'heavy', roughness: 0.45 },
          { id: 'leather-plain-10', label: 'Burgundy Pebble Grain', image: 'images/fabrics/leather-plain-10.webp#r9.091', thumb: 'images/fabrics/thumbs/leather-plain-10.webp', drape: 'heavy', roughness: 0.45 },
        ],
      },
      {
        id: 'suede',
        label: 'Suede Collection',
        swatches: [
          { id: 'leather-suede-1', label: 'Sand Suede', image: 'images/fabrics/leather-suede-1.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-suede-1.webp', drape: 'heavy', roughness: 0.95, sheen: 0.4 },
          { id: 'leather-suede-2', label: 'Tobacco Suede', image: 'images/fabrics/leather-suede-2.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-suede-2.webp', drape: 'heavy', roughness: 0.95, sheen: 0.4 },
          { id: 'leather-suede-3', label: 'Chocolate Suede', image: 'images/fabrics/leather-suede-3.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-suede-3.webp', drape: 'heavy', roughness: 0.95, sheen: 0.4 },
          { id: 'leather-suede-4', label: 'Navy Suede', image: 'images/fabrics/leather-suede-4.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-suede-4.webp', drape: 'heavy', roughness: 0.95, sheen: 0.4 },
          { id: 'leather-suede-5', label: 'Taupe Suede', image: 'images/fabrics/leather-suede-5.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-suede-5.webp', drape: 'heavy', roughness: 0.95, sheen: 0.4 },
          { id: 'leather-suede-6', label: 'Olive Suede', image: 'images/fabrics/leather-suede-6.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-suede-6.webp', drape: 'heavy', roughness: 0.95, sheen: 0.4 },
          { id: 'leather-suede-7', label: 'Black Suede', image: 'images/fabrics/leather-suede-7.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-suede-7.webp', drape: 'heavy', roughness: 0.95, sheen: 0.4 },
          { id: 'leather-suede-8', label: 'Burgundy Suede', image: 'images/fabrics/leather-suede-8.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-suede-8.webp', drape: 'heavy', roughness: 0.95, sheen: 0.4 },
          { id: 'leather-suede-9', label: 'Camel Suede', image: 'images/fabrics/leather-suede-9.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-suede-9.webp', drape: 'heavy', roughness: 0.95, sheen: 0.4 },
          { id: 'leather-suede-10', label: 'Grey Suede', image: 'images/fabrics/leather-suede-10.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-suede-10.webp', drape: 'heavy', roughness: 0.95, sheen: 0.4 },
        ],
      },
      {
        id: 'patent',
        label: 'Patent Collection',
        swatches: [
          { id: 'leather-patent-1', label: 'Black Patent', image: 'images/fabrics/leather-patent-1.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-patent-1.webp', drape: 'heavy', roughness: 0.08, sheen: 0 },
          { id: 'leather-patent-2', label: 'Ivory Patent', image: 'images/fabrics/leather-patent-2.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-patent-2.webp', drape: 'heavy', roughness: 0.08, sheen: 0 },
          { id: 'leather-patent-3', label: 'Ruby Patent', image: 'images/fabrics/leather-patent-3.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-patent-3.webp', drape: 'heavy', roughness: 0.08, sheen: 0 },
          { id: 'leather-patent-4', label: 'Navy Patent', image: 'images/fabrics/leather-patent-4.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-patent-4.webp', drape: 'heavy', roughness: 0.08, sheen: 0 },
          { id: 'leather-patent-5', label: 'Nude Patent', image: 'images/fabrics/leather-patent-5.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-patent-5.webp', drape: 'heavy', roughness: 0.08, sheen: 0 },
          { id: 'leather-patent-6', label: 'Burgundy Patent', image: 'images/fabrics/leather-patent-6.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-patent-6.webp', drape: 'heavy', roughness: 0.08, sheen: 0 },
          { id: 'leather-patent-7', label: 'Emerald Patent', image: 'images/fabrics/leather-patent-7.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-patent-7.webp', drape: 'heavy', roughness: 0.08, sheen: 0 },
          { id: 'leather-patent-8', label: 'Chocolate Patent', image: 'images/fabrics/leather-patent-8.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-patent-8.webp', drape: 'heavy', roughness: 0.08, sheen: 0 },
          { id: 'leather-patent-9', label: 'Champagne Patent', image: 'images/fabrics/leather-patent-9.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-patent-9.webp', drape: 'heavy', roughness: 0.08, sheen: 0 },
          { id: 'leather-patent-10', label: 'Midnight Patent', image: 'images/fabrics/leather-patent-10.webp#r16.667', thumb: 'images/fabrics/thumbs/leather-patent-10.webp', drape: 'heavy', roughness: 0.08, sheen: 0 },
        ],
      },
    ],
  },
];

// ── Two Tone catalog ──────────────────────────────────────────────────────────
// A SEPARATE, SIMPLER catalogue used only for the "Two Tone" zone on two-tone
// product pages. It has fewer fabric types (no blends) and just one Plain
// collection per type, because contrast accents look best in solid fabrics.
//
// Why separate? The main design zone allows complex collections (prints, checks,
// etc.) and per-product visibility rules. The two-tone zone keeps it simple:
// one swatch per type, toggled globally not per-product.

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
          // tt- prefix distinguishes two-tone swatch IDs from main design swatch IDs.
          { id: 'tt-cotton-1', label: 'tt-cotton-1', image: 'images/tt-cotton-1.webp' },
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
          { id: 'tt-silk-1', label: 'tt-silk-1', image: 'images/tt-silk-1.webp' },
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
          { id: 'tt-leather-1', label: 'tt-leather-1', image: 'images/tt-leather-1.webp' },
        ],
      },
    ],
  },
];

// ── localStorage helpers ──────────────────────────────────────────────────────
// The admin dashboard saves visibility toggles and extra swatches to localStorage.
// These helpers read and write that data.

/**
 * loadOverrides()  [private]
 * --------------------------
 * Reads the raw overrides object from localStorage.
 * Returns an empty object {} if nothing has been saved yet, or if the
 * stored JSON is corrupted.
 *
 * Shape of the returned object:
 * {
 *   visibility: {
 *     'p:KD-P60-FSSD:t:cotton': false,   // hide cotton for product p60
 *     's:linen-1': false,                  // hide linen-1 globally
 *   },
 *   extras: {
 *     'cotton:plain': [{ id, label, image }],   // admin-added main swatches
 *   },
 *   ttExtras: {
 *     'cotton': [{ id, label, image }],          // admin-added two-tone swatches
 *   }
 * }
 */
function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (_) { return {}; }
}

/**
 * saveFabricOverrides(overrides)
 * -------------------------------
 * Saves the full overrides object back to localStorage.
 * Called by the admin dashboard whenever a toggle is changed or a
 * new swatch is added.
 * @param {object} overrides - The complete overrides object to persist.
 */
export function saveFabricOverrides(overrides) {
  const clean = toStorable(overrides);
  localStorage.setItem(LS_KEY, JSON.stringify(clean));
  appliedJson = stableStringify(normalizeOverrides(clean));
  queueRemoteWrite(clean);
}

// ── Live sync with Firebase ───────────────────────────────────────────────────
// Admin settings (visibility, added swatches, opacity, drape) live in the Realtime
// Database at fabricSettings/live, so the dashboard and every customer's product
// page see the same settings, updated live. localStorage is only a cache: pages
// render from it instantly, then refresh when Firebase answers. If Firebase is
// unreachable, pages keep working from the cache and the built-in defaults.
const SETTINGS_PATH = `fabricSettings/${globalThis.KD_FABRIC_SETTINGS_KEY || 'live'}`;
const renderedLists = new Map();   // container element → its renderFabricList() arguments
let dbPromise = null;
let writeTimer = null;
let writesInFlight = 0;
let syncStarted = false;
let seedFromLocalRequested = false;
// Settings this page last displayed. Tabs share the localStorage cache, so another
// tab may already have cached an update this page hasn't shown yet — compare per page.
let appliedJson = null;

function getDb() {
  dbPromise ??= Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js'),
  ]).then(([{ initializeApp, getApps, getApp }, fb]) => {
    const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    return { db: fb.getDatabase(app), fb };
  });
  return dbPromise;
}

// Firebase can't store null, so a switched-off opacity (legacy null) becomes false.
function toStorable(overrides) {
  const clean = JSON.parse(JSON.stringify(overrides ?? {}));
  for (const [id, v] of Object.entries(clean.swatchOpacity ?? {})) {
    if (v === null) clean.swatchOpacity[id] = false;
  }
  return clean;
}

// Firebase may hand stored lists back as keyed objects; always return arrays.
function normalizeOverrides(raw) {
  const o = raw && typeof raw === 'object' ? { ...raw } : {};
  for (const key of ['extras', 'ttExtras']) {
    if (!o[key]) continue;
    o[key] = Object.fromEntries(Object.entries(o[key]).map(([k, list]) =>
      [k, (Array.isArray(list) ? list : Object.values(list || {})).filter(Boolean)]));
  }
  return o;
}

function stableStringify(v) {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

function queueRemoteWrite(overrides, delay = 150) {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    writesInFlight++;
    getDb()
      .then(({ db, fb }) => fb.set(fb.ref(db, SETTINGS_PATH), overrides))
      .catch(err => console.warn('[fabrics] could not save settings to Firebase:', err?.message ?? err))
      .finally(() => { writesInFlight--; });
  }, delay);
}

// Re-render every fabric list on the page, keeping open sections and the selected swatch.
function refreshRenderedLists() {
  for (const [el, args] of renderedLists) {
    if (!el.isConnected) { renderedLists.delete(el); continue; }
    const active    = el.querySelector('.swatch-card.active')?.dataset.fabricId;
    const openTypes = [...el.querySelectorAll('.fabric-category.open')].map(n => n.dataset.typeId);
    const openColls = [...el.querySelectorAll('.fabric-subcategory.open')].map(n => n.dataset.collKey);
    const catalog   = args.zone === 'two-tone' ? getMergedTwotoneCatalog() : args.catalogSource;
    renderFabricList(el, args.sku, args.zone, catalog);
    el.querySelectorAll('.fabric-category').forEach(n => n.classList.toggle('open', openTypes.includes(n.dataset.typeId)));
    el.querySelectorAll('.fabric-subcategory').forEach(n => n.classList.toggle('open', openColls.includes(n.dataset.collKey)));
    if (active) el.querySelector(`.swatch-card[data-fabric-id="${CSS.escape(active)}"]`)?.classList.add('active');
  }
}

/**
 * startFabricSettingsSync({ seedFromLocal })
 * Subscribes to the shared settings once per page (started automatically).
 * On every change it refreshes the cache, re-renders fabric lists and fires a
 * 'kd:fabric-settings' window event. The admin dashboard passes seedFromLocal
 * so that, the first time, this browser's saved settings are published.
 */
export function startFabricSettingsSync({ seedFromLocal = false } = {}) {
  if (seedFromLocal) seedFromLocalRequested = true;
  if (syncStarted || typeof window === 'undefined') return;
  syncStarted = true;
  getDb().then(({ db, fb }) => {
    let first = true;
    fb.onValue(fb.ref(db, SETTINGS_PATH), (snap) => {
      const remote = snap.val();
      const isFirst = first;
      first = false;
      if (isFirst && seedFromLocalRequested && remote === null && Object.keys(loadOverrides()).length) {
        queueRemoteWrite(toStorable(loadOverrides()), 0);
        return;
      }
      if (writeTimer || writesInFlight) return; // our own save is on its way; ignore its echo
      const next = normalizeOverrides(remote);
      const nextJson = stableStringify(next);
      appliedJson ??= stableStringify(normalizeOverrides(loadOverrides()));
      if (nextJson === appliedJson) return;
      appliedJson = nextJson;
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      refreshRenderedLists();
      window.dispatchEvent(new CustomEvent('kd:fabric-settings'));
    }, (err) => console.warn('[fabrics] live settings unavailable, using cached settings:', err?.message ?? err));
  }).catch(err => console.warn('[fabrics] live settings unavailable, using cached settings:', err));
}

if (typeof window !== 'undefined') setTimeout(() => startFabricSettingsSync(), 0);

/**
 * loadFabricOverrides()
 * ----------------------
 * Public version of loadOverrides() — exported so the admin dashboard
 * can read the current state before rendering its controls.
 */
export function loadFabricOverrides() {
  return loadOverrides();
}

// ── Visibility key builders ───────────────────────────────────────────────────
// Visibility settings are stored as key → boolean in overrides.visibility.
// These functions build the correct key strings for each scenario.
//
// KEY FORMATS:
//   Fabric TYPE  per product:          "p:SKU:t:typeId"
//   Fabric TYPE  per product + zone:   "p:SKU:z:ZONE:t:typeId"
//   Collection   per product:          "p:SKU:c:typeId:collId"
//   Collection   per product + zone:   "p:SKU:z:ZONE:c:typeId:collId"
//   Swatch       globally:             "s:swatchId"
//
// WHAT IS A ZONE?
//   Two-tone product pages have two separate fabric zones:
//     "main"      → the main body of the garment
//     "two-tone"  → the contrast accent zone
//   Each zone can have different fabrics visible/hidden independently.

function productTypeKey(sku, typeId, zone) {
  // With zone:    "p:KD-P60-FSSD:z:two-tone:t:cotton"
  // Without zone: "p:KD-P60-FSSD:t:cotton"
  return zone
    ? `p:${sku}:z:${zone}:t:${typeId}`
    : `p:${sku}:t:${typeId}`;
}

function productCollKey(sku, typeId, collId, zone) {
  return zone
    ? `p:${sku}:z:${zone}:c:${typeId}:${collId}`
    : `p:${sku}:c:${typeId}:${collId}`;
}

function swatchKey(swatchId) {
  return `s:${swatchId}`;
}

// Re-exported with zone-first argument order (matches admin dashboard call sites).
export function zoneTypeKey(sku, zone, typeId)         { return productTypeKey(sku, typeId, zone); }
export function zoneCollKey(sku, zone, typeId, collId) { return productCollKey(sku, typeId, collId, zone); }

// ── Visibility query helpers ──────────────────────────────────────────────────

/**
 * isTypeVisible(sku, typeId, overrides)
 * --------------------------------------
 * Should this fabric TYPE be shown for the given product?
 * Default: true (shown) if no override has been set.
 *
 * @param {string} sku       - Product SKU, e.g. 'KD-P60-FSSD'
 * @param {string} typeId    - Fabric type ID, e.g. 'cotton'
 * @param {object} overrides - The overrides object from loadFabricOverrides()
 */
export function isTypeVisible(sku, typeId, overrides) {
  const vis = overrides.visibility || {};
  return vis[productTypeKey(sku, typeId)] ?? true;  // ?? true = default to visible
}

/**
 * isCollectionVisible(sku, typeId, collId, overrides)
 * ----------------------------------------------------
 * Should this COLLECTION be shown within the given fabric type for a product?
 * Only call this after confirming the parent type is visible.
 */
export function isCollectionVisible(sku, typeId, collId, overrides) {
  const vis = overrides.visibility || {};
  return vis[productCollKey(sku, typeId, collId)] ?? true;
}

// ── Catalog builders (base + admin extras) ───────────────────────────────────

/**
 * getMergedCatalog()
 * ------------------
 * Returns the FABRIC_CATALOG with any admin-added swatches merged in.
 * Swatches added via the dashboard are stored in overrides.extras and
 * are appended to the relevant collection when this function is called.
 *
 * Why "merged"? The base FABRIC_CATALOG is hard-coded here. Admin extras
 * live in localStorage. This function combines both so the product page
 * sees one complete list without knowing the source of each swatch.
 */
export function getMergedCatalog() {
  const overrides = loadOverrides();
  // extras shape: { 'cotton:plain': [{id, label, image}], ... }
  const extras    = overrides.extras || {};

  return FABRIC_CATALOG.map(type => ({
    ...type,  // spread copies all type properties (id, label, wreaths)
    collections: type.collections.map(coll => {
      const extraKey      = `${type.id}:${coll.id}`;   // e.g. "cotton:plain"
      const extraSwatches = extras[extraKey] || [];      // admin-added swatches for this slot
      return {
        ...coll,
        swatches: [...coll.swatches, ...extraSwatches], // base + admin extras
      };
    }),
  }));
}

/**
 * getMergedTwotoneCatalog()
 * -------------------------
 * Same concept as getMergedCatalog() but for the two-tone zone.
 * Admin extras for two-tone are stored separately under overrides.ttExtras
 * keyed by type ID (e.g. 'cotton') rather than 'typeId:collId'.
 */
export function getMergedTwotoneCatalog() {
  const overrides = loadOverrides();
  // ttExtras shape: { 'cotton': [{id, label, image}], 'linen': [...], ... }
  const ttExtras  = overrides.ttExtras || {};

  return TWOTONE_CATALOG.map(type => ({
    ...type,
    collections: type.collections.map(coll => ({
      ...coll,
      swatches: [...coll.swatches, ...(ttExtras[type.id] || [])],
    })),
  }));
}

// ── DOM Renderer ──────────────────────────────────────────────────────────────

/**
 * renderFabricList(containerEl, sku, zone, catalogSource)
 * --------------------------------------------------------
 * Builds and injects the full fabric-selection HTML into a container element.
 *
 * The resulting HTML structure (for each type) looks like:
 *
 *   <div class="fabric-category">            ← wraps one fabric type (Cotton)
 *     <div class="category-card">            ← clickable header with wreath image
 *       <div class="wreath-preview">         ← wreath image(s)
 *       <p>100% Cotton</p>
 *     </div>
 *     <div class="swatch-grid">              ← hidden until header clicked
 *       <div class="fabric-subcategory">     ← one per collection (Plain, Dobies…)
 *         <div class="subcategory-header">   ← clickable sub-header
 *         <div class="sub-swatch-grid">      ← individual swatch cards
 *           <div class="swatch-card"         ← clickable swatch
 *                data-texture="images/cotton-1.webp"
 *                data-fabric-id="cotton-1">
 *             <img src="…"> <span>Cotton 1</span>
 *           </div>
 *         </div>
 *       </div>
 *     </div>
 *   </div>
 *
 * VISIBILITY FILTERING:
 *   - If a fabric TYPE is hidden for this product → the entire <fabric-category>
 *     div is omitted.
 *   - If a COLLECTION is hidden → its subcategory div is omitted.
 *   - If all SWATCHES in a collection are globally hidden → the sub-category
 *     is omitted even if the collection itself is enabled.
 *
 * @param {HTMLElement} containerEl    - The DOM element to render into.
 * @param {string}      sku            - Product SKU used to look up visibility rules.
 * @param {string|null} zone           - 'two-tone' or null for the main zone.
 * @param {Array|null}  catalogSource  - Override the catalog (used by two-tone zone
 *                                       to pass TWOTONE_CATALOG instead of the default).
 */
export function renderFabricList(containerEl, sku, zone = null, catalogSource = null) {
  const overrides = loadOverrides();
  appliedJson = stableStringify(normalizeOverrides(overrides));
  const vis       = overrides.visibility || {};

  // Choose the right catalog: caller can pass a custom one, otherwise use main.
  const catalog = catalogSource ?? getMergedCatalog();

  // Convenience wrappers so the code below reads naturally.
  function typeOn(typeId)         { return vis[productTypeKey(sku, typeId, zone)]         ?? true; }
  function collOn(typeId, collId) { return vis[productCollKey(sku, typeId, collId, zone)] ?? true; }
  function swatchOn(swatchId)     { return vis[swatchKey(swatchId)]                       ?? true; }

  let html = '';

  catalog.forEach(type => {
    // Skip this entire fabric type if it's hidden for this product.
    if (!typeOn(type.id)) return;

    // Build the wreath images row for the category card header.
    const wreathImgs = type.wreaths
      .map(w => `<img src="${w}" alt="${type.label}" loading="lazy" decoding="async">`)
      .join('');

    // Build HTML for each collection within this type.
    let collectionsHtml = '';
    type.collections.forEach(coll => {
      // Skip hidden collections.
      if (!collOn(type.id, coll.id)) return;

      // Filter swatches to only those that are globally visible.
      const visibleSwatches = coll.swatches.filter(s => swatchOn(s.id));

      // If the collection has swatches defined but ALL are hidden, skip it entirely.
      if (coll.swatches.length > 0 && visibleSwatches.length === 0) return;

      // Build one clickable swatch card per visible swatch.
      // data-texture → the image applied to the 3D model when clicked.
      // data-fabric-id → the ID passed to selectFabric() and saved to the session.
      const swatchCards = visibleSwatches.map(s => {
        // Opacity priority: 1) admin override (a number; false/null = switched off → opaque)
        // 2) swatch definition  3) 1 (fully opaque)
        const opacityOverride = (overrides.swatchOpacity ?? {})[s.id];
        const opacity = typeof opacityOverride === 'number' ? opacityOverride
          : (opacityOverride === undefined ? (s.opacity ?? 1) : 1);

        // Roughness/sheen priority: 1) admin override  2) swatch definition
        // 3) the fabric TYPE's default (cotton vs. silk look different)  4) fallback.
        const typeDefaults = TYPE_MATERIAL_DEFAULTS[type.id] ?? FALLBACK_MATERIAL_DEFAULTS;
        const roughnessOverride = (overrides.swatchRoughness ?? {})[s.id];
        const roughness = roughnessOverride !== undefined ? roughnessOverride
          : (s.roughness !== undefined ? s.roughness : typeDefaults.roughness);
        const sheenOverride = (overrides.swatchSheen ?? {})[s.id];
        const sheen = sheenOverride !== undefined ? sheenOverride
          : (s.sheen !== undefined ? s.sheen : typeDefaults.sheen);

        // The swatch photos are full-resolution fabric shots (the largest is
        // several MB) shown here at thumbnail size, and every category starts
        // collapsed. Loading them eagerly fetched and decoded the entire
        // catalogue on page load — tens of MB of images nobody had asked to
        // see, which is the other half of why iOS Safari killed product pages.
        // loading="lazy" holds each one back until its category is opened.
        // drape: which sphere-drop simulation preset this fabric uses (see DRAPE_TYPES).
        // Priority: 1) admin override ('' = explicitly none)  2) swatch definition.
        const drape = (overrides.swatchDrape ?? {})[s.id] ?? s.drape;
        const drapeAttr = drape ? ` data-drape="${drape}"` : '';

        // The drape type is shown under the fabric name (styled inline so every page gets it).
        const drapeTag = drape
          ? `<em class="swatch-drape-tag" style="display:block;font-style:normal;color:rgba(120,90,10,0.95);">${drape} drape</em>`
          : '';

        return `<div class="swatch-card" data-texture="${s.image}" data-fabric-id="${s.id}" data-opacity="${opacity}" data-roughness="${roughness}" data-sheen="${sheen}"${drapeAttr}>
          <img src="${s.thumb || s.image}" alt="${s.label}" loading="lazy" decoding="async">
          <span>${s.label}${drapeTag}</span>
        </div>`;
      }).join('');

      // Sub-category block: collapsible header + swatch grid.
      collectionsHtml += `
        <div class="fabric-subcategory" data-coll-key="${type.id}:${coll.id}">
          <div class="subcategory-header">
            <span>${coll.label}</span>
            <span class="sub-arrow">&#9654;</span><!-- ▶ arrow, rotates when open -->
          </div>
          <div class="sub-swatch-grid">${swatchCards}</div>
        </div>`;
    });

    // Outer category block: wreath card + all collections inside.
    html += `
      <div class="fabric-category" data-type-id="${type.id}">
        <div class="category-card">
          <div class="wreath-preview">${wreathImgs}</div>
          <p>${type.label}</p>
        </div>
        <div class="swatch-grid">${collectionsHtml}</div>
      </div>`;
  });

  // Inject the fully-built HTML string into the container in one operation.
  containerEl.innerHTML = html;
  renderedLists.set(containerEl, { sku, zone, catalogSource }); // re-rendered when settings change live
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

/**
 * getFabricById(id)
 * -----------------
 * Searches both catalogs (main + two-tone) for a swatch by its ID.
 * Returns a swatch object enriched with its parent type and collection info,
 * or null if not found.
 *
 * Used by the admin dashboard and checkout page to display swatch details
 * when only the swatch ID is known (e.g. from an order record).
 *
 * @param {string} id - Swatch ID, e.g. 'cotton-1' or 'tt-linen-1'.
 */
export function getFabricById(id) {
  const allCatalogs = [getMergedCatalog(), TWOTONE_CATALOG];
  for (const catalog of allCatalogs) {
    for (const type of catalog) {
      for (const coll of type.collections) {
        const s = coll.swatches.find(sw => sw.id === id);
        if (s) return {
          ...s,
          typeId:    type.id,
          typeLabel: type.label,
          collId:    coll.id,
          collLabel: coll.label,
        };
      }
    }
  }
  return null;  // Swatch not found in either catalog.
}
