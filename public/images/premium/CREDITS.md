# GELIN HOUSE — illustrative photography

Downloaded and verified on 12 November 2026. These photographs are illustrative stock, not GELIN HOUSE premises, employees, customer results or rental inventory. No endorsement by the people or photographers is implied. They are excluded from the genuine salon portfolio.

All six new photographs are available under the [Pexels licence](https://www.pexels.com/license/), which permits commercial website use and modification. No attribution is required, but original creators and sources are recorded here. No watermark was observed during visual inspection. Third-party privacy, trademark and publicity rights remain subject to the licence's restrictions; images must not be used as testimonials or endorsements.

| Subject | Photographer | Original source |
| --- | --- | --- |
| Hairstyling | TONI&GUY PONDICHERRY | [Woman in a hair salon](https://www.pexels.com/photo/woman-posing-at-in-a-hair-salon-20046793/) |
| Manicure | Gabriel Puyén | [Applying nail polish](https://www.pexels.com/photo/a-person-applying-nail-polish-on-a-fingernail-6135696/) |
| Facial treatment | Gustavo Fring | [Facial treatment](https://www.pexels.com/photo/woman-getting-a-facial-treatment-7446659/) |
| Moroccan caftan | MAG Photography | [Traditional Moroccan caftan](https://www.pexels.com/fr-fr/photo/mode-elegante-du-caftan-marocain-traditionnel-30457749/) |
| Bridal makeup | Thanh Nhan | [Bride getting makeup done](https://www.pexels.com/photo/bride-getting-her-makeup-done-before-the-wedding-17259708/) |
| Salon interior | Max Vakhtbovych | [Beauty salon interior](https://www.pexels.com/photo/cozy-beauty-salon-7750125/) |

The existing editorial makeup hero is reused: **kajanja brand**, [Pexels 5681894](https://www.pexels.com/photo/pretty-woman-beside-make-up-brushes-5681894/), under the same Pexels licence. Its variants and original source are recorded in `../manifest.json`.

`credits.json` records source URLs, licence links, download date, downloaded-file SHA-256, dimensions and output sizes. `scripts/prepare-premium-photos.mjs` reproduces the six new sets of WebP variants using the already installed Sharp dependency. Original downloads are not retained. Each set has 320, 720 and 1400 pixel width variants; images are not enlarged. Stock images are shown with an inspiration caption; saved salon photos take precedence where available.

## Redesign assets — 13 November 2026

- `makeup-artistry-{320,720,1400}.webp`: **ishola S.Oladimeji**, [Makeup Artist Doing Makeup of a Woman](https://www.pexels.com/photo/makeup-artist-doing-makeup-of-a-woman-11041338/). Downloaded from `https://images.pexels.com/photos/11041338/pexels-photo-11041338.jpeg?auto=compress&cs=tinysrgb&w=1600`. [Pexels licence](https://www.pexels.com/license/), checked 13 November 2026, permits commercial website use. Illustrative category photography, never a salon result or testimonial.
- `makeup-session-{320,720,1400}.webp`: original illustration created with the built-in OpenAI Imagegen tool. No external stock licence. Explicitly captioned as AI generated, never used in the authentic portfolio. An admin-managed hero image takes precedence. The original stays in the generation library; only optimized project assets are integrated here.

Recreate the variants with `node scripts/prepare-redesign-assets.mjs <original-generated-png>` after downloading the Pexels source to `public/images/premium/makeup-session-source.jpg`. Dimensions, source-file hashes and output sizes are recorded in `credits.json`.

Final generation prompt:

> Create one original photorealistic beauty salon editorial photograph, landscape 3:2 composition, no text no logo no borders. A beautiful adult Moroccan woman in a blush pink silk robe, soft sophisticated bridal makeup and elegant loosely pinned dark brown hair, small gold earrings, eyes gently closed as an artist's hand from the right applies blush with a makeup brush. Main woman centered slightly right, visible face and shoulders. Background an elegant softly out-of-focus salon, warm ivory walls, blush pink curtains, gold framed oval illuminated mirror on left and small bouquet of pink hydrangeas. Premium beauty campaign, natural realistic skin, warm luminous light, subtle feminine luxury, inviting relaxed mood, tasteful composition. This is an illustrative concept for a salon website and must have no branding or letters.

## Individual homepage references

Four original illustrative category photographs were created with the built-in OpenAI Imagegen tool for the individual section references:

- `ritual-care-{320,720,1400}.webp`: facial treatment, pink towels, candlelight and hydrangeas.
- `bridal-hair-{320,720,1400}.webp`: pearl-adorned bridal chignon in an ivory and pink setting.
- `rose-makeup-{320,720,1400}.webp`: professional makeup in a blush and gold setting.
- `occasion-caftan-{320,720,1400}.webp`: raspberry caftan with gold embroidery; illustrative outfit, not GELIN HOUSE rental inventory.

All four are explicitly captioned as AI-generated inspiration. They are excluded from authentic portfolio claims and do not replace administrator-selected category images. Exact final prompts, source hashes, dimensions and optimized output sizes are recorded in `credits.json`. The original images stay in the generation library. `scripts/prepare-reference-photos.mjs` accepts a JSON array of `{id,path,prompt,alt}` and prepares the WebP variants without enlarging source files. The authentic homepage gallery and salon photographs continue to come from the published Supabase catalogue; no generated image is inserted into that catalogue.

## Salon interior replacement — 14 November 2026

`salon-interior-{320,720,1400}.webp` is an original illustration created with the built-in OpenAI Imagegen tool: blush velvet chairs, ivory marble vanities, arched gold mirrors and warm lighting. No third-party stock photograph or external stock licence is involved. It depicts a fictional inspirational interior, **not the actual GELIN HOUSE premises**. Its exact final prompt, source hash and dimensions are recorded under `salon-interior` in `credits.json`.

At the owner's request, the public presentation replaces the low-resolution treatment-room upload `gallery/2bf17273-38f6-485b-a6e3-9dc5109f9dbd.webp`. The uploaded original, its Supabase record and administrator access remain unchanged. Public alt text, gallery title and lightbox description identify the replacement as inspiration; the original Instagram source/video is not attributed to the generated replacement. The footer source disclosure links here. Other gallery photographs are unchanged. The homepage About composition uses the published nails photograph alone.

This exception is scoped to the exact retired storage path in `src/lib/public-gallery.ts`. To use a future genuine salon photograph, upload it through the existing admin workflow and select/publish that new path; it will display normally without this exception. Do not delete or overwrite the original storage object to perform this replacement.
