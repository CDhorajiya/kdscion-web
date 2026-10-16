/* cuff-studio.js — choose the shirt cuff on a product page (first on w1).

   Barrel · One Button, Barrel · Two Button, French Cuff, shown as rendered
   shirting images (images/cuffs/<id>.webp, made by tools/render_cuff_images.mjs)
   in the design-detail window (js/detail-studio.js).

   Use on a page:
       <script type="module" src="js/cuff-studio.js?default=barrel1"></script>
   default = the cuff the GLB is cut with. */
import { CUFFS } from './cuff-shapes.js';
import { createDetailStudio, whenReady } from './detail-studio.js';

const params = new URL(import.meta.url).searchParams;

whenReady(() => createDetailStudio({
    key: 'cuff',
    title: 'Cuff',
    items: CUFFS,
    image: (id) => `images/cuffs/${id}.webp`,
    asCut: params.get('default') || 'barrel1',
    thumbPosition: '50% 82%',
    slot: Number(params.get('slot')) || 0,
}));
