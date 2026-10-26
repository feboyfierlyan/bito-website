# Bito — Hai. Aku Bito.

A character-led website for Bito. One persistent Rive character moves from the opening greeting into an interactive desktop scene. Drag Bito, open its chat, try four conversation styles, explore small helpful actions, and find the macOS or Windows download.

Serve `dist/` with a static HTTP server. No build step or dependency installation is needed. Run `node scripts/check.cjs` for geometry, asset, anchor and source checks.

GSAP 3.15.0, ScrollTrigger, Flip and Draggable are vendored. Plus Jakarta Sans is stored locally. The original Bito poster stays visible until the Rive canvas has painted, and the same runtime remains mounted throughout the scroll story. The page respects reduced motion and has a footer motion toggle. The interactive scenes are explicitly illustrative, stay inside the webpage and do not call AI or collect messages.

All downloads point to the existing v0.5.1 desktop release. AI access in the desktop app remains limited to invited demo accounts. See THIRD_PARTY.md and dist/assets/ for third-party licenses.

The October 26 desktop-paper revision centers the hero on a white, light gray dotted canvas. Small native-style preview windows and pastel stickers surround the persistent animated Bito. Mac and Windows have direct download links; the action preview jumps into the original interactive desktop story. The existing Site identity and URL are preserved. CSS/assets/anchors/geometry checks run automatically; visual browser review is left to the owner.

Desktop objects can be freely dragged using mouse or touch. Small windows, stickers, a locally hosted rotating-flower GIF, and desktop icons retain their drop positions until reload. Pickup/sway animates a separate inner surface, so the grab point remains stable. A 6px threshold separates clicks from drags; capture-phase click suppression prevents accidental navigation after release. Arrow keys move focused objects; Shift increases the step. Bounds refresh on resize, and the GIF uses a still image when motion is reduced or the scene is hidden. The large preview window uses its title bar as its drag handle. App icons are decorative and do not claim Word/Excel/PDF automation in the app.

Hovering the reminder, hello note, or small chat window spotlights that window and gently fades the other desktop objects. Keyboard focus and holding a window produce the same treatment. The headline and download controls remain readable. Opacity and pickup effects run on inner surfaces, separate from drag coordinates and the scroll timeline. Fine-pointer hover is excluded on touch screens; reduced-motion preferences remove the lift transitions.
