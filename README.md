# Bito — Hai. Aku Bito.

A character-led website for Bito. The dotted desktop hero introduces the animated mascot, followed directly by three feature conversations, product details, downloads, and FAQs.

The former pinned laptop scroll section and its interactive chat demo have been removed. The hero preview now links to the feature examples. The hero occupies one viewport (with a minimum height for its desktop objects), including when reduced motion is enabled.

Serve `dist/` with a static HTTP server. No build or dependency installation is needed.

Validation:
- `node scripts/check.cjs` — assets, anchors, geometry, and script references.
- `node scripts/check-stickers.cjs` — draggable stickers and keyboard controls.
- `node scripts/check-rive-presentation.cjs` — guarded Rive rendering and resize handoff.
- `node scripts/check-page-entry.cjs` — title/content ordering, spatial reveals, deep links, reduced motion, focus, scroll-ahead and cleanup.
- `node scripts/check-peek-motion.cjs` — cursor-following feature pill, spring reversal, containment, return, reduced motion, and cleanup.
- `node scripts/check-feature-stories.cjs` — conversation animation, cancellation, and reduced motion.

The hero retains one persistent Rive instance with its original poster fallback. GSAP remains for sticker interactions and feature animations, but no laptop scroll timeline is mounted. Reduced-motion settings and the footer motion toggle remain supported. Feature conversations are illustrative and do not call AI or collect messages.

Existing Site identity, public audience, download destinations, and product copy are preserved. Third-party licenses are listed in `THIRD_PARTY.md`.

The “Bito in action” preview keeps one feature pill. With a mouse it becomes the cursor, follows with a critically damped spring and subtle surface stretch, stays within the window, and returns to center on exit. Touch, keyboard, and reduced-motion navigation retain the static link. Animation stops when settled or hidden.

The feature pill uses a clear capsule lens with SVG displacement, a neutral reflective rim, and a moving highlight. It samples a decorative, inert copy of the static preview aligned to the pill position; only the edges distort, leaving the center clear. The copy resizes with the preview and is removed on disposal. This is a web approximation inspired by Apple's [Liquid Glass lensing principles](https://developer.apple.com/videos/play/wwdc2025/219/), not Apple's native compositor. There is no blue tint or broad backdrop blur. High contrast and reduced-transparency preferences use a solid readable control.

Page entrance leaves the navbar visible from first paint. The three headline parts make a subtle 38-degree turn with a left-to-right fade (40/115/190ms starts). The title settles at 1090ms; content starts at 620ms while the title settles, descending 10px from above as its blur clears, in distinct phases: small windows, icons, description, download buttons, then the preview window. The main phases start 100ms apart, overlapping about 91% of each slow reveal; members of each group follow their visual top-to-bottom order at 25ms intervals (capped at 75ms). Reveals last 1150ms with a gradual easing curve; headline parts turn over 900ms. The preview starts at 1020ms and the final hero reveal completes at 2250ms, keeping the sequence continuous. Lower sections reveal once as they reach the viewport, with a shared 100ms stagger so adjacent sections flow into each other without starting together. The section observer opens while the final hero reveals are still settling. The sequence owns opacity, filter and individual translate, preserving sticker transforms and the glass lens. Reduced motion, deep links, restored scroll, keyboard focus, navigation during the intro, and a failed script load all retain readable content; scrolling ahead releases the intro gate.

Refresh and history navigation use native scroll restoration. The entrance waits for returning navigation to settle before deciding whether to play at the top. Feature reading uses passive scroll events coalesced into animation frames and never writes scroll positions; ScrollTrigger is no longer loaded. Smooth scrolling is temporarily disabled during native restoration. Updated animation assets carry a version query to invalidate stale browser copies.

The download section uses the original Bito artwork around a landscape white panel: copy on the left, two full-width platform controls on the right. The primary link adapts to Windows; the second opens a native modal with Windows, Mac Apple Silicon, and Mac Intel installers. Native modal focus containment, Escape, explicit close and backdrop dismissal preserve the trigger focus and scroll position. Mobile stacks the panel; no-script fallback links remain available.

The FAQ uses a spacious two-column layout with a Bito-green title accent, six product-specific questions and native details/summary controls. The first answer starts open. Entire rows remain keyboard-operable; plus icons turn to close marks and the existing height animation respects reduced motion. Mobile stacks the heading and list with comfortable touch targets.

About is a pale-green landscape panel with short brand copy and a live Rive Bito on the right, leaves above the panel and lower body cropped at its edge. It stacks on phones. Its separate Rive instance loads when the section enters view, uses the original state machine for idle and wave, follows the cursor with the pupil rig, and pauses offscreen or under reduced motion. Activation works with keyboard/touch and never opens a chat bubble. The poster is only a loading/error fallback, handed off after validated transparent frames. Privacy details remain in the FAQ.

About gaze tracks the pointer across the entire document while the character is visible, including outside its panel. Scroll and resize refresh the eye target against the current canvas position; pointer exit, window blur, hidden pages, and reduced motion release tracking. Eye travel remains bounded inside the face.

The hero desktop shows a bimbingan reminder and a Bab 3 revision checklist. The four draggable files represent a reference journal, research data, a revision draft and the thesis folder. The clock and checkmark use CSS animations that stop offscreen, in hidden tabs and under reduced motion.
