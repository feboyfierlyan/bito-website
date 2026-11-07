# Bito — Hai. Aku Bito.

A character-led website for Bito. The dotted desktop hero introduces the animated mascot, followed directly by three feature conversations, product details, downloads, and FAQs.

The former pinned laptop scroll section and its interactive chat demo have been removed. The hero preview now links to the feature examples. The hero occupies one viewport (with a minimum height for its desktop objects), including when reduced motion is enabled.

Serve `dist/` with a static HTTP server. No build or dependency installation is needed.

Validation:
- `node scripts/check.cjs` — assets, anchors, geometry, and script references.
- `node scripts/check-stickers.cjs` — draggable stickers and keyboard controls.
- `node scripts/check-rive-presentation.cjs` — guarded Rive rendering and resize handoff.
- `node scripts/check-feature-stories.cjs` — conversation animation, cancellation, and reduced motion.

The hero retains one persistent Rive instance with its original poster fallback. GSAP remains for sticker interactions and feature animations, but no laptop scroll timeline is mounted. Reduced-motion settings and the footer motion toggle remain supported. Feature conversations are illustrative and do not call AI or collect messages.

Existing Site identity, public audience, download destinations, and product copy are preserved. Third-party licenses are listed in `THIRD_PARTY.md`.
