# Bito — Hai. Aku Bito.

A character-led website for Bito. One persistent Rive character moves from the opening greeting into an interactive desktop scene. Drag Bito, open its chat, try four conversation styles, explore small helpful actions, and find the macOS or Windows download.

Serve `dist/` with a static HTTP server. No build step or dependency installation is needed. Run `node scripts/check.cjs` for geometry, asset, anchor and source checks.

GSAP 3.15.0, ScrollTrigger, Flip and Draggable are vendored. Plus Jakarta Sans is stored locally. The original Bito poster stays visible until the Rive canvas has painted, and the same runtime remains mounted throughout the scroll story. The page respects reduced motion and has a footer motion toggle. The interactive scenes are explicitly illustrative, stay inside the webpage and do not call AI or collect messages.

All downloads point to the existing v0.5.1 desktop release. AI access in the desktop app remains limited to invited demo accounts. See THIRD_PARTY.md and dist/assets/ for third-party licenses.
