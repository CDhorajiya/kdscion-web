/* pleat-studio.js — choose the front of a trouser on its product page
   (first on w183 and w184).

   Flat Front, Single Pleat, Double Pleat, shown as rendered trouser images
   (images/pleats/<id>.webp, made by tools/render_pleat_images.mjs) in the
   design-detail window (js/detail-studio.js).

   Use on a page:
       <script type="module" src="js/pleat-studio.js?default=flat"></script>
   default = the front the GLB is cut with. */
import { createDetailStudio, whenReady } from './detail-studio.js';

export const PLEATS = [
    { id: 'flat',   name: 'Flat',   full: 'Flat Front',   mood: 'Clean & modern',
      note: 'No pleats at the waist: a smooth, close line from waistband to hem. Sleek under a jacket or with a tucked-in shirt.' },
    { id: 'single', name: 'Single', full: 'Single Pleat', mood: 'Classic & easy',
      note: 'One pleat each side, folded into the crease. A little more room through the hip and thigh, and a crease that falls true.' },
    { id: 'double', name: 'Double', full: 'Double Pleat', mood: 'Traditional & generous',
      note: 'Two pleats each side, for the most ease when seated or moving. The full, flowing drape of classic tailoring.' },
];

const params = new URL(import.meta.url).searchParams;

whenReady(() => createDetailStudio({
    key: 'pleat',
    title: 'Pleats',
    items: PLEATS,
    image: (id) => `images/pleats/${id}.webp`,
    asCut: params.get('default') || 'flat',
    thumbPosition: '50% 18%',
    slot: Number(params.get('slot')) || 0,
}));
