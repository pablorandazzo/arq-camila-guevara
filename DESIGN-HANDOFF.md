# 27467c0d-2a19-4115-ba6a-4837cd9cd9a8 implementation handoff

This archive is the source of truth for turning the design into production code. Start from `index.html`, then preserve the visual system, responsive behavior, and interactions found in the exported files.

## Implementation target
- Build production UI from the exported design, not a loose reinterpretation.
- Preserve typography scale, spacing rhythm, color tokens, border radii, shadows, motion timing, and component states.
- Replace static placeholders only when the target app has real data or functional equivalents.
- Keep generated product UI free of OpenDesign chrome, preview labels, or design-process annotations.
- Treat this handoff as a visual contract: if implementation choices conflict, match the exported pixels and behavior first, then refactor internals.

## Source map
- Primary entry: `index.html`
- HTML screens detected: 8
- Stylesheets detected: 1
- Script/component files detected: 1
- Supporting assets detected: 65

## Responsive contract
Validate the implementation across this 2025–2026 viewport matrix:
- Mobile compact: 360×800
- Mobile standard: 390×844
- Mobile large: 430×932
- Foldable / small tablet: 600×960
- Tablet portrait: 820×1180
- Tablet landscape: 1024×768
- Laptop: 1366×768
- Desktop: 1440×900
- Wide desktop: 1920×1080

For responsive web exports, treat these as a modern breakpoint system for one adaptive web experience, not three fixed screenshots. Do not split responsive web into unrelated native app screens unless the project explicitly includes native targets. Use semantic layout thresholds, fluid `clamp()` type/spacing, and container queries where component width matters more than viewport width. Preserve any CSS media queries, container queries, fluid `clamp()` scales, and layout changes already present in the exported files.

## Design fidelity contract
- Extract reusable tokens before writing components: background, surface, foreground, muted text, border, accent, radius, shadow, spacing, type scale, and motion duration/easing.
- Map product screens, in-app modules/components, optional landing page, and optional OS widget surfaces before coding. Keep these surfaces separate in the target architecture.
- Match layout geometry: max-widths, gutters, grid columns, card proportions, sticky/fixed elements, and viewport-specific navigation.
- Preserve real copy, labels, and data shown in the export. Do not replace specific text with generic marketing filler.
- Preserve interactive affordances: hover, focus, pressed, disabled, loading, validation, copy/share, tab/accordion, modal/sheet, and keyboard states where present.
- Preserve accessibility semantics when converting: headings stay hierarchical, controls remain buttons/links/inputs, focus states stay visible.
- Do not keep prototype-only annotations, frame labels, or OpenDesign chrome in the production UI.

## CJX-ready UX contract
- Use `DESIGN-MANIFEST.json` as the machine-readable map for screens, app modules, OS widgets, landing pages, tokens, interactions, and viewport checks.
- Screen-file-first: when multiple user-facing surfaces exist, implement each HTML screen as its own route/file. Treat `index.html` as a launcher/overview when the manifest marks it that way, not as a combined final UI.
- If `landing.html`, app screens, platform screens, or OS widget files exist, preserve those boundaries in the target app instead of merging them into one page.
- A single self-contained `index.html` is acceptable only when the export truly contains one user-facing screen and its CSS/JS are structured enough to extract tokens, components, states, and behavior.
- If separate `css/` or `js/` files exist, treat them as source of truth for token/component/interactions before porting to React, Vue, SwiftUI, Compose, or another target stack.
- In-app modules/components are product UI blocks inside the app. OS widgets are home-screen/lock-screen/quick-access surfaces outside the app. Do not merge those concepts.

## Color and brand contract
- Use the exported design tokens and product/domain context as the color source of truth.
- Do not introduce warm beige / cream / peach / pink / orange-brown background washes unless they are already explicit brand/reference colors in the export.
- A stylesheet or design/token file was detected; inspect it for canonical color variables before choosing framework theme tokens.

## Implementation sequence for AI coding tools
1. Open `index.html` and `DESIGN-MANIFEST.json`; identify every screen file, launcher/overview file, app module, and interaction before coding.
2. If multiple HTML screens exist, map them to separate routes/surfaces first; do not merge `landing.html`, product app screens, platform screens, or OS widgets into one route.
3. Extract a token table from CSS/root styles and inline styles before building framework components.
4. Build product screens and domain-specific in-app modules from largest layout regions down to controls; avoid starting with isolated atoms that lose spatial intent.
5. Port responsive behavior across the modern viewport matrix and test each semantic breakpoint before cleanup.
6. Port interactions and states, then replace static placeholders only with real app data or functional equivalents.
7. Keep optional landing page and OS widget surfaces as separate surfaces if present.
8. Compare final screenshots against the export at 360×800, 390×844, 430×932, 820×1180, 1024×768, 1366×768, 1440×900, and 1920×1080 before declaring done.

## Entry points
- `about.html`
- `article.html`
- `contact.html`
- `index.html`
- `journal.html`
- `privacy.html`
- `project.html`
- `projects.html`

## Styles
- `assets/site.css`

## Scripts/components
- `assets/site.js`

## Assets and supporting files
- `assets/fonts/Reckless-Light.c765955.woff2`
- `assets/fonts/Reckless-RegularItalic.65b7f41.woff2`
- `assets/fonts/SuisseIntl-Regular-WebM.128e425.woff2`
- `assets/fonts/SuisseIntl-SemiBold-WebM.edb2568.woff2`
- `assets/images/1657797466-rhe_alphabeta-building_2nd-visit_001.jpg`
- `assets/images/1657797662-dl-rhe-ts-1388-print.jpg`
- `assets/images/1657797867-aerial-3-copy.jpg`
- `assets/images/1659430118-hero.jpg`
- `assets/images/1659430558-masterplan2-1.jpg`
- `assets/images/1659438972-dl-rhe-ubs-0255-print-cropped.jpg`
- `assets/images/1659449884-dl-rhe-nhouse-ext-6018-pano-2_r4-online-1.jpg`
- `assets/images/1659450440-dl-rhe-nhouse-ext-6018-pano-2_r4-online-1.jpg`
- `assets/images/1659948013-lawn-homes-1.jpg`
- `assets/images/1659948214-jed_view_01-f08-1-1.jpg`
- `assets/images/1659948645-rhe_pa_05-1.jpg`
- `assets/images/1659949269-zil-pasyon-resort-villa_5-2.jpg`
- `assets/images/1659949646-studio-rhe_zil-pasyon-island-1-1-1.jpg`
- `assets/images/1659950206-dl-rhe-pr-3720-online-1-1.jpg`
- `assets/images/1659952417-dl-rhe-nhouse-ext-6018-pano-2_r4-online-1.jpg`
- `assets/images/1660570636-image-2-copy.jpg`
- `assets/images/1660748652-dl-rhe-pr-4621-print-copy.jpg`
- `assets/images/1660813077-about-hero.jpg`
- `assets/images/1660813539-about-image.jpg`
- `assets/images/1660813591-home-image.jpg`
- `assets/images/1663676587-studio-rhe-istanbul-06-1.jpg`
- `assets/images/1663677706-01_dl-rhe-nhouse-ext-6191_r4_option_1-online_flipped.jpg`
- `assets/images/1663678507-gramophone_2022-02-27_67_draft.jpg`
- `assets/images/1663679919-01_huckltreewest-studiorhe-01.jpg`
- `assets/images/1663877324-dl-rhe-ts-1388-print.jpg`
- `assets/images/1665131669-journal-sustain-1.jpg`
- `assets/images/1665137010-journal-awards-5.jpg`
- `assets/images/1665137202-six-senses-journal-6.jpg`
- `assets/images/1665150856-journal-richard-1.jpg`
- `assets/images/1665155324-journal-alpha-2.jpg`
- `assets/images/1665158307-studio-rhe-hero.jpg`
- `assets/images/1665495268-studio-rhe-lido-01-manuel.jpg`
- `assets/images/1665559885-zil-pasyon-r1_1-2.jpg`
- `assets/images/1665999669-lansdowne-459.jpg`
- `assets/images/1665999727-dl-rhe-gb-0977-online.jpg`
- `assets/images/1665999986-aerial-3.jpg`
- `assets/images/1667210128-studio-rhe-roots-barn-aerial-1.jpg`
- `assets/images/1667210348-villa-kong.jpg`
- `assets/images/1673863483-small-pool-1-copy.jpeg`
- `assets/images/1674043319-beach-residence-2-copy.jpg`
- `assets/images/1674045545-1-bermondsey-1-copy.jpg`
- `assets/images/1674050240-dl-rhe-wl-4358-1.jpg`
- `assets/images/1677673375-dl-rhe-berrypl-1228-record-only-copy.jpg`
- `assets/images/1678884149-studio-rhe-architecture-lansdowne-459.jpg`
- `assets/images/1686739600-72f544af-bf04-4de3-9c99-3c3f747e9737.jpg`
- `assets/images/1715088908-dsc07288.jpeg`
- `assets/images/1716381028-lasvit.jpg`
- `assets/images/1719843410-republic-jw_62.jpg`
- `assets/images/1720629688-5138_main-house-external-view_240410.jpg`
- `assets/images/1733832498-copy-of-dsc00909.jpg`
- `assets/images/rhe-contact-hero.jpg`
- `assets/logo.svg`
- `brand-spec.md`
- `CLONE_AUDIT.md`
- `CLONE_REPORT.md`
- `favicon.ico`
- `NOTES.md`
- `RECON/screenshots/clone-1440.png`
- `RECON/screenshots/clone-390.png`
- `RECON/screenshots/original-1440.png`
- `RECON/screenshots/original-390.png`

## Coding checklist for AI tools
1. Inspect `index.html` and `DESIGN-MANIFEST.json` first and identify reusable components before coding.
2. Implement each user-facing screen file as its own route/surface; keep launcher, landing, app, platform, and OS widget files separate.
3. Extract design tokens into the target stack: colors, type scale, spacing, radius, shadows, and motion.
4. Implement layout with real 2025–2026 responsive breakpoints, fluid type/spacing, and container-query-aware component behavior; test with no horizontal overflow.
5. Preserve interactive controls, hover/focus/pressed states, form behavior, validation, and copy actions where present.
6. Implement domain-specific in-app modules with real states; do not flatten them into generic cards.
7. Keep landing page, product screens, and OS widget/quick-access surfaces separate when present.
8. Confirm the production result visually matches the exported design before refactoring internals.
9. Reject implementation shortcuts that flatten the design into generic cards, generic gradients, placeholder stats, or framework-default typography.
10. If a detail is ambiguous, keep the exported HTML/CSS/JS behavior rather than inventing a new pattern.
