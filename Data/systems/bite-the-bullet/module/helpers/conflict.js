/**
 * Conflict helpers for Bite the Bullet
 * Minimal utilities to roll damage with advantage/disadvantage
 * and apply basic mitigation to a target Actor.
 */

/**
 * Choose a damage die per rules:
 * - advantage => d12
 * - disadvantage or unarmed => d4
 * - otherwise use baseFormula (e.g., "1d6")
 */
export function chooseDamageFormula(baseFormula, { advantage = false, disadvantage = false, unarmed = false } = {}) {
  if (advantage) return "1d12";
  if (disadvantage || unarmed) return "1d4";
  return baseFormula || "1d4";
}

/**
 * Roll physical damage. If a target is provided, subtract physical armor unless isGun=true.
 * Returns the created ChatMessage.
 */
export async function rollPhysicalDamage({
  attacker,
  baseFormula = "1d6",
  target = null,
  targets = [],
  advantage = false,
  disadvantage = false,
  isGun = false,
  aoe = false
} = {}) {
  const formula = chooseDamageFormula(baseFormula, { advantage, disadvantage });
  const roll = new Roll(formula);
  await roll.evaluate();

  // Basic armor mitigation if present on target
  let mitigated = roll.total;
  let armorReduced = 0;
  if (target && !isGun) {
    const armorVal = Number(target?.system?.armor?.value ?? 0);
    if (armorVal > 0) {
      armorReduced = Math.min(armorVal, mitigated);
      mitigated = Math.max(0, mitigated - armorVal);
    }
  }

  // Determine target list based on aoe flag
  const affected = aoe ? (Array.isArray(targets) && targets.length ? targets : (target ? [target] : [])) : (target ? [target] : []);

  let applied = 0;
  let overflow = 0;
  let triggeredBurden = false;
  for (const tgt of affected) {
    if (!tgt) continue;
    const currentSand = Number(tgt.system?.resources?.sand?.value ?? 0);
    const newSand = Math.max(0, currentSand - mitigated);
    const appliedThis = currentSand - newSand;
    const overflowThis = Math.max(0, mitigated - appliedThis);
    await tgt.update({ "system.resources.sand.value": newSand });
    if (overflowThis > 0) {
      const newVigor = Math.max(0, Number(tgt.system?.attributes?.vigor?.value ?? 0) - overflowThis);
      await tgt.update({ "system.attributes.vigor.value": newVigor });
    }
    if (currentSand > 0 && newSand === 0) {
      triggeredBurden = true;
      if (game?.bitebullet?.applyBurden) await game.bitebullet.applyBurden(tgt, 'physical');
    }
    applied += appliedThis;
    overflow += overflowThis;
  }

  const content = `
    <div class="bite-bullet damage-roll">
      <h3>${attacker?.name ?? "Attack"} - Physical Damage</h3>
      <div><strong>Formula:</strong> ${formula}${advantage ? " (advantage)" : ""}${disadvantage ? " (disadvantage)" : ""}</div>
      ${affected.length ? `<div><strong>Targets:</strong> ${affected.map(t=>t.name).join(', ')}</div>` : ""}
      ${armorReduced ? `<div><strong>Armor Reduced:</strong> ${armorReduced}</div>` : ""}
      <div class="damage">${mitigated}</div>
      ${affected.length ? `<div><strong>Applied to Sand (total):</strong> ${applied}${overflow ? `, <strong>Overflow to Vigor (total):</strong> ${overflow}` : ''}</div>` : ''}
      ${aoe && affected.length > 1 ? `<div class="aoe-note"><em>AoE applied to all selected targets (friendly fire).</em></div>` : ''}
      ${triggeredBurden ? `<div class="burden-note"><em>Burden triggered (Physical).</em></div>` : ''}
    </div>
  `;
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: attacker }),
    content,
    sound: CONFIG.sounds.dice
  });
}

/**
 * Roll social damage with optional social armor mitigation.
 */
export async function rollSocialDamage({
  attacker,
  baseFormula = "1d6",
  target = null,
  advantage = false,
  disadvantage = false
} = {}) {
  const formula = chooseDamageFormula(baseFormula, { advantage, disadvantage });
  const roll = new Roll(formula);
  await roll.evaluate();

  // Social armor (if modeled on target)
  let mitigated = roll.total;
  let armorReduced = 0;
  const socialArmor = Number(target?.system?.socialArmor?.value ?? 0);
  if (target && socialArmor > 0) {
    armorReduced = Math.min(socialArmor, mitigated);
    mitigated = Math.max(0, mitigated - socialArmor);
  }

  // Apply to target: Sand then overflow to Presence
  let applied = 0;
  let overflow = 0;
  let triggeredBurden = false;
  if (target) {
    const currentSand = Number(target.system?.resources?.sand?.value ?? 0);
    const newSand = Math.max(0, currentSand - mitigated);
    applied = currentSand - newSand;
    overflow = Math.max(0, mitigated - applied);
    await target.update({ "system.resources.sand.value": newSand });
    if (overflow > 0) {
      const newPresence = Math.max(0, Number(target.system?.attributes?.presence?.value ?? 0) - overflow);
      await target.update({ "system.attributes.presence.value": newPresence });
    }
    if (currentSand > 0 && newSand === 0) {
      triggeredBurden = true;
      if (game?.bitebullet?.applyBurden) await game.bitebullet.applyBurden(target, 'social');
    }
  }

  const content = `
    <div class="bite-bullet damage-roll">
      <h3>${attacker?.name ?? "Exchange"} - Social Pressure</h3>
      <div><strong>Formula:</strong> ${formula}${advantage ? " (advantage)" : ""}${disadvantage ? " (disadvantage)" : ""}</div>
      ${target ? `<div><strong>Target:</strong> ${target.name}</div>` : ""}
      ${armorReduced ? `<div><strong>Social Armor Reduced:</strong> ${armorReduced}</div>` : ""}
      <div class="damage">${mitigated}</div>
      ${target ? `<div><strong>Applied to Sand:</strong> ${applied}${overflow ? `, <strong>Overflow to Presence:</strong> ${overflow}` : ''}</div>` : ''}
      ${triggeredBurden ? `<div class="burden-note"><em>Burden triggered (Social).</em></div>` : ''}
    </div>
  `;
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: attacker }),
    content,
    sound: CONFIG.sounds.dice
  });
}
