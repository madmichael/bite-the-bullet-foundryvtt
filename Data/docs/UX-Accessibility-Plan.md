# UX, UI, Accessibility, and Responsiveness Plan

Target devices: iPhone 15, iPhone 12 mini, Samsung Galaxy S24, Google Pixel 8, Samsung Galaxy A15 5G, Apple iPad, Samsung Galaxy Tab series.

## Goals
- Improve readability and contrast in Dark theme while preserving aesthetic.
- Ensure minimum 44px touch targets for all interactive controls on mobile.
- Provide clear keyboard focus indicators and better keyboard navigation.
- Maintain responsive layouts that gracefully adapt from 320px up to tablet sizes.
- Keep dialogs usable on small screens (avoid overflow, provide autofocus and clear labels).
- Provide settings for verbose AoE output to balance detail and noise.

## Findings
- Theme toggle keys missing in `lang/en.json`.
- Tab bar visually detached from content in some cases.
- Buttons and icon controls do not always meet 44px touch target.
- Insufficient `:focus-visible` styles for keyboard users.
- Attack dialogs lack autofocus to first field.
- AoE per-target lines helpful, but may need a toggle.
- Biography editor readable in Dark theme; ProseMirror configured.

## Fixes (Quick Batch)
- Add i18n keys for Theme setting and AoE per-target toggle.
- Add CSS focus-visible outlines and increase control touch sizes.
- Tighten tab/content spacing and improve border contrast.
- Add `autofocus` to first field in Physical and Social attack dialogs.
- Add setting `showAoePerTarget` (client scope) to enable/disable per-target lines.

## Fixes (Follow-up)
- Optional High-Contrast theme for accessibility.
- Minor per-target AoE styling and truncation when actor names are long.
- Health/faith overflow consistency audit across all helpers.

## Device Testing Matrix
- iPhone 12 mini (320–360px width): verify 1-column layouts, 44px controls, dialogs fit within viewport.
- iPhone 15 / Pixel 8 / S24: verify touch targets and focus-visible.
- Galaxy A15 5G: verify performance and touch precision on lower-end device.
- iPad / Galaxy Tab: ensure 2–3 column inventory grid scales without overflowing.

## Definition of Done
- No console warnings in v13 (editor engine, evaluate async removed).
- All interactive elements focus-visible and >=44px in height on mobile.
- Theme setting and AoE per-target setting visible with localized labels.
- Physical/Social dialogs autofocus and are fully keyboard navigable.
- Manifest and release workflows verified by a test tag.
