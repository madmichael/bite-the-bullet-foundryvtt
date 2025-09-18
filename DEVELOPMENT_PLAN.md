# Bite the Bullet — Foundry VTT System Development Plan

This document outlines the staged plan to deliver a fully functional Foundry VTT v11+ game system, aligned with the official guidelines and modeled after the Cairn system’s structure and quality bar.

References:
- Foundry guidelines: https://foundryvtt.com/article/system-development/
- Cairn example: https://github.com/yochaigal/Cairn-FoundryVTT
- Repository: https://github.com/madmichael/bite-the-bullet-foundryvtt

---

## Key Decisions (Approved)
- Actor templates: Reuse `templates/actor/actor-character-sheet.html` for both Character and NPC initially.
- Item templates: Per-type templates (`weapon`, `armor`, `gear`, `burden`).
- Assets: Create placeholder system icon and parchment background asset now.
- Distribution: Target GitHub Releases with manifest hosting on GitHub Pages.

---

## Architecture Baseline
- System root: `Data/systems/bite-the-bullet/`
- Entry points
  - Manifest: `system.json`
  - ES module: `bite-the-bullet.js`
- Source organization
  - JavaScript: `module/`
  - Templates: `templates/`
  - Styles: `css/`
  - Localization: `lang/`
  - Assets: `assets/`

---

## Milestones & Phases

### Milestone 1 — Stabilize (Phases 0–1)
- Phase 0: Skeleton & Boot
  - Fix import paths in `bite-the-bullet.js` to `./module/...`.
  - Ensure `system.json` paths and token attributes:
    - `esmodules`: `["bite-the-bullet.js"]`
    - `primaryTokenAttribute`: `system.attributes.vigor.value`
    - `secondaryTokenAttribute`: `system.resources.sand.value`
  - Register Handlebars helpers used by templates: `multiply`, `capitalize`.
  - Prune preloaded templates in `module/helpers/templates.js` to only existing files.
  - Acceptance: System boots without console errors; Actor/Item sheets register; a sheet renders.

- Phase 1: Core Documents
  - Actor (`module/documents/actor.js`): derived data (reserve, sand cap), save rolls, Acts of Faith resolution.
  - Item (`module/documents/item.js`): `rollDamage()`, `useGear()`, `applyBurden()` with minimal chat cards.
  - Acceptance: Sheet-driven actions work; no runtime errors.

### Milestone 2 — UI (Phase 2–3)
- Phase 2: Templates & Sheets
  - Actors: reuse `actor-character-sheet.html` for Character and NPC for now; ensure `actor-sheet.js` returns correct template path.
  - Items: create per-type templates:
    - `templates/item/item-weapon-sheet.html`
    - `templates/item/item-armor-sheet.html`
    - `templates/item/item-gear-sheet.html`
    - `templates/item/item-burden-sheet.html`
  - Add small reusable partials and preload them.
  - Acceptance: All sheets render; editing and actions function.

- Phase 3: Rolling, Chat, Macros
  - Attribute saves and Acts of Faith post clear chat cards with outcomes.
  - Weapon damage rolling from `system.damage`.
  - Verify hotbar macro creation and execution: `createItemMacro`, `rollItemMacro`.
  - Acceptance: Drag item to hotbar and roll via macro.

### Milestone 3 — Polish (Phases 4–5)
- Phase 4: Localization Completeness
  - Audit and move hard-coded strings into `lang/en.json`.
  - Ensure all CONFIG maps align to lang keys; use `{{localize}}` in templates.
  - Acceptance: No visible hard-coded English strings.

- Phase 5: Styling & Assets
  - Add `assets/icons/bite-the-bullet-icon.png` and `assets/parchment-bg.png` placeholders.
  - Refine `css/bite-the-bullet.css` for mobile-first and accessibility (contrast, focus states, touch targets ≥44px).
  - Acceptance: No missing asset errors; usable at 320px width.

### Milestone 4 — Content (Phase 6)
- Phase 6: Packs & Compendia
  - Create `packs/` with starter compendia (Items, Burdens; optional NPCs).
  - Register packs in `system.json`.
  - Acceptance: Packs load and can be imported in a world.

### Milestone 5 — Config (Phase 7)
- Phase 7: System Settings & Flags
  - `game.settings.register` under `bite-the-bullet` namespace.
  - Options: initiative formula override; optional rules (e.g., legendary faith modifier).
  - Acceptance: Settings visible and functional after reload.

### Milestone 6 — Ship (Phase 8–9)
- Phase 8: QA & Testing
  - Manual checklist: create world, add Character/NPC, edit attributes/resources, verify reserve; add items and test actions; macros; localization; console/network free of errors.

- Phase 9: Distribution Pipeline
  - Repository hygiene: fill `LICENSE.txt`, add `CHANGELOG.md`.
  - GitHub Actions: build/package on tag; publish release with zip; update manifest URL (GH Pages).
  - `system.json`: fill `url`, `manifest`, `download` for manifest installs.
  - Acceptance: Install via manifest works.

### Milestone 7 — Docs (Phase 10)
- Phase 10: Documentation & Examples
  - Expand README (install via manifest, features, developer guide, credits, license).
  - Optional: sample content/world and short tutorial.

---

## Open Decisions (None — all approved)
- Actor template strategy: Reuse Character template for NPC initially.
- Item template strategy: Per-type templates.
- Assets: Add placeholders now.
- Distribution: GitHub Releases + GH Pages for manifest.

---

## Immediate Next Actions
1) Stabilize skeleton (imports, manifest, helpers, preloader).
2) Implement Item document methods used by item sheets.
3) Create per-type item templates (minimal content) and wire up `item-sheet.js`.

Once these are complete, run a quick boot test and sheet render test in Foundry VTT to confirm stability before proceeding to compendia and settings.
