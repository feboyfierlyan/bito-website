# Bito — Hai. Aku Bito.

A character-led website for Bito. One persistent Rive character moves from the opening greeting into the bottom-right corner of a laptop screen. Drag Bito, open its chat, try four conversation styles, explore small helpful actions, and find the macOS or Windows download.

Serve `dist/` with a static HTTP server. No build step or dependency installation is needed. Run `node scripts/check.cjs` for geometry, asset, anchor and source checks.

GSAP 3.15.0, ScrollTrigger, Flip and Draggable are vendored. Plus Jakarta Sans is stored locally. The original Bito poster stays visible until the Rive canvas has painted, and the same runtime remains mounted throughout the scroll story. The page respects reduced motion and has a footer motion toggle. The interactive scenes are explicitly illustrative, stay inside the webpage and do not call AI or collect messages.

All downloads point to the existing v0.5.1 desktop release. AI access in the desktop app remains limited to invited demo accounts. See THIRD_PARTY.md and dist/assets/ for third-party licenses.

The October 26 desktop-paper revision centers the hero on a white, light gray dotted canvas. Small native-style preview windows and pastel stickers surround the persistent animated Bito. Mac and Windows have direct download links; the action preview jumps into the original interactive desktop story. The existing Site identity and URL are preserved. CSS/assets/anchors/geometry checks run automatically; visual browser review is left to the owner.

Desktop objects can be freely dragged using mouse or touch. Stickers, a locally hosted rotating-flower GIF, and desktop icons retain their drop positions until reload. Preview windows are fixed and cannot be dragged. Pickup/sway animates a separate inner surface, so the grab point remains stable. A 6px threshold separates clicks from drags; capture-phase click suppression prevents accidental navigation after release. Arrow keys move focused objects; Shift increases the step. Bounds refresh on resize, and the GIF uses a still image when motion is reduced or the scene is hidden. The large preview window stays anchored; clicking it opens the interactive example. App icons are decorative and do not claim Word/Excel/PDF automation in the app.

Hovering the reminder, hello note, or small chat window spotlights that window and gently fades the other desktop objects. Keyboard focus produces the same treatment. Hover straightens the small window around its center without moving its anchor. The headline and download controls remain readable. Opacity and pickup effects run on inner surfaces, separate from drag coordinates and the scroll timeline. Fine-pointer hover is excluded on touch screens; reduced-motion preferences remove the lift transitions.

The small windows scale to 107.5% over 480ms on hover, returning smoothly from their current size when interrupted. During scroll, the full desktop-object group shares the hero title's upward movement and fade on the same timeline. Individual sticker drag offsets remain local to that group.

The laptop story uses the supplied 1920×1440 mockup (dist/assets/laptop-workspace.png) without altering it. Scroll first reveals the laptop, then zooms into the lower-right workspace: its left and top move out of frame while the right bezel and bottom edge remain visible. The original Rive actor travels into that corner and grows with the camera. HTML chat and greeting sit over the measured screen rectangle. On narrow screens the camera moves toward the right-hand workspace, keeping Bito and chat readable. Drag/chat bounds use the intersection of the screen and viewport. Reduced motion goes directly to the interactive final composition. The former simulated onboarding panel is removed.

Run node scripts/check.cjs and node scripts/check-stickers.cjs for the layout, bounds, source and drag checks. Manual visual testing remains with the owner.
