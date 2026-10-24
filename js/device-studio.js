/* device-studio.js — choose the device a leather cover is cut for (first on l1).

   iPad, MacBook Air, MacBook Pro, shown as rendered images of the envelope with
   its device (images/devices/<id>.webp, made by tools/render_device_images.mjs)
   in the design-detail window (js/detail-studio.js).

   Use on a page:
       <script type="module" src="js/device-studio.js?default=pro"></script>
   default = the device the GLB is cut for. */
import { DEVICES } from './device-fits.js';
import { createDetailStudio, whenReady } from './detail-studio.js';

const params = new URL(import.meta.url).searchParams;

// the device notes read a little larger than the shared detail window's
document.head.appendChild(Object.assign(document.createElement('style'), {
    textContent: '#detail-fit .cg-note { font-size: 1.42rem; line-height: 1.5; }',
}));

whenReady(() => createDetailStudio({
    key: 'fit',
    title: 'Made For',
    items: DEVICES,
    image: (id) => `images/devices/${id}.webp`,
    asCut: params.get('default') || 'pro',
    thumbPosition: '50% 46%',
    slot: Number(params.get('slot')) || 0,
}));
