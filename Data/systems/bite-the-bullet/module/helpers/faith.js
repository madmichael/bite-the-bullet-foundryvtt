/**
 * Faith conflict helper for Bite the Bullet
 */

/**
 * Perform an Act of Faith per rules.
 * - Validates Reserve by scale
 * - Applies scale modifier to Faith target number
 * - On failure, applies d6 per Reserve level to Sand, overflow to Faith
 * - Emits a chat card with outcome and any damage
 *
 * @param {Actor} actor - the acting character
 * @param {string} scale - one of: trivial, minor, moderate, major, legendary
 * @param {string} description - narrative description for the chat card
 * @param {object} [opts]
 * @param {number} [opts.extraModifier=0] - additional modifier to target (e.g., from characteristic)
 * @returns {Promise<Roll>} the save roll
 */
export async function performActOfFaith(actor, scale, description = "", opts = {}) {
  const faithScale = CONFIG.BITE_BULLET.faithScale?.[scale];
  if (!faithScale) return;

  const reserve = Number(actor.system?.resources?.reserve?.value ?? 0);
  const required = Number(faithScale.reserve ?? 0);
  if (reserve < required) {
    ui.notifications.warn(`Not enough Reserve! Need ${required}, have ${reserve}`);
    return;
  }

  const faithAttr = actor.system?.attributes?.faith;
  const scaleMod = faithScale.modifier === "special" ? -4 : Number(faithScale.modifier ?? 0);
  const extraMod = Number(opts.extraModifier ?? 0);

  const roll = await (new Roll("1d20")).evaluate({ async: true });
  const target = Number(faithAttr?.value ?? 0) + scaleMod + extraMod;
  const success = roll.total <= target;

  let damageRoll = null;
  let usedStatus = false;
  if (!success) {
    const useStatus = game.settings.get('bite-the-bullet', 'faithFailureUsesStatus');
    if (useStatus) {
      usedStatus = true;
      // Offer a picker to create a status/burden item automatically
      const t = game.i18n.localize.bind(game.i18n);
      const choices = [
        { key: 'doubt', label: t('SETTINGS.StatusDoubt'), slots: 0, effect: t('SETTINGS.StatusDoubt') },
        { key: 'night_terrors', label: t('SETTINGS.StatusNightTerrors'), slots: 0, effect: t('SETTINGS.StatusNightTerrors') },
        { key: 'spiritual_weight', label: t('SETTINGS.StatusSpiritualWeight'), slots: 1, effect: t('SETTINGS.StatusSpiritualWeight') },
        { key: 'haunted', label: t('SETTINGS.StatusHaunted'), slots: 0, effect: t('SETTINGS.StatusHaunted') }
      ];

      const content = `
        <form>
          <div class="form-group">
            <label>${t('SETTINGS.StatusPickerPrompt')}</label>
            <select name="statusKey">
              ${choices.map(c => `<option value="${c.key}">${c.label}</option>`).join('')}
            </select>
          </div>
        </form>`;

      await new Promise((resolve) => {
        new Dialog({
          title: t('SETTINGS.StatusPickerTitle'),
          content,
          buttons: {
            ok: {
              label: t('SETTINGS.PerformAct'),
              callback: async (html) => {
                const key = html[0].querySelector('select[name="statusKey"]').value;
                const def = choices.find(c => c.key === key) || choices[0];
                // Prefer compendium item if available
                const pack = game.packs.get('bite-the-bullet.statuses');
                let sourceItem = null;
                if (pack) {
                  try {
                    const docs = await pack.getDocuments();
                    sourceItem = docs.find(d => d.name === def.label) || null;
                  } catch (e) { /* ignore */ }
                }
                if (sourceItem) {
                  const data = sourceItem.toObject();
                  delete data._id;
                  await actor.createEmbeddedDocuments('Item', [data]);
                } else {
                  // Create a burden-style item to represent the status occupying slots
                  const itemData = {
                    name: def.label,
                    type: 'burden',
                    system: {
                      burdenType: 'faith',
                      effect: def.effect,
                      duration: '',
                      remedy: '',
                      slots: def.slots,
                      description: def.effect
                    }
                  };
                  await actor.createEmbeddedDocuments('Item', [itemData]);
                }
                resolve();
              }
            },
            cancel: { label: t('SETTINGS.Cancel'), callback: () => resolve() }
          },
          default: 'ok'
        }).render(true);
      });
    } else {
      damageRoll = await (new Roll(`${required}d6`)).evaluate({ async: true });

      // Apply to Sand first
      const currentSand = Number(actor.system?.resources?.sand?.value ?? 0);
      const newSand = Math.max(0, currentSand - damageRoll.total);
      await actor.update({ "system.resources.sand.value": newSand });

      // Overflow to Faith
      if (currentSand - damageRoll.total < 0) {
        const excess = Math.abs(currentSand - damageRoll.total);
        const newFaith = Math.max(0, Number(faithAttr?.value ?? 0) - excess);
        await actor.update({ "system.attributes.faith.value": newFaith });
      }
    }
  }

  const content = `
    <div class="bite-bullet faith-roll">
      <h3>${actor.name} - Act of Faith (${(scale || "").charAt(0).toUpperCase() + (scale || "").slice(1)})</h3>
      <div class="faith-description">${description}</div>
      <div class="roll-result ${success ? 'success' : 'failure'}">
        <strong>Rolled:</strong> ${roll.total} vs Target: ${target}
        <div class="result">${success ? 'Success!' : 'Failure!'}</div>
        ${!success && damageRoll ? `<div class="damage">Damage: ${damageRoll.total}</div>` : ''}
        ${!success && usedStatus ? `<div class="status-note"><em>${game.i18n.localize('SETTINGS.StatusPickerTitle')}</em></div>` : ''}
      </div>
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    sound: CONFIG.sounds.dice
  });

  return roll;
}
