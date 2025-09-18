// Encoded burden tables from the rules document (summarized)
const PHYSICAL_BURDENS = [
  { name: 'Bruised', slots: 0, effect: 'Roll 2d6; if greater than max Sand, set Sand to new result.' },
  { name: 'Winded', slots: 0, effect: 'Lose this or next round. Roll 3d6 (drop lowest); if > max Sand, set Sand.' },
  { name: 'Battered', slots: 1, effect: 'Gain Deprived (1 slot). Cannot regain Sand until removed. After long rest, roll 2d6; if > max Vigor, set Vigor.' },
  { name: 'Marked', slots: 0, effect: 'Take a visible scar. Replace a characteristic with Scarred (1) or increase its rank by 1 if already present.' },
  { name: 'Bloodied', slots: 1, effect: 'Gain Bloodied (1 slot). Social tests at –1 until long rest. Then remove status/penalty.' },
  { name: 'Hobbled', slots: 0, effect: 'Vigor tests at disadvantage until end of fight. Roll 3d6 (drop highest); if > max Sand, set Sand.' },
  { name: 'Concussed', slots: 1, effect: 'Lose this or next round. Gain Concussed (1 slot). Faith tests at disadvantage until long rest.' },
  { name: 'Broken', slots: 0, effect: 'Lose 1d4 Vigor. Once mended, roll 3d6 (drop lowest); if > max Vigor, set Vigor.' },
  { name: 'Clobbered', slots: 0, effect: 'Lose 1d4 Vigor. Once mended, roll 3d6 (drop lowest); if > max Vigor, set Vigor.' },
  { name: 'Bleeding', slots: 1, effect: 'Gain Bleeding (1 slot). Cannot regain Sand until healed. Lose 1d4 Vigor per day. Once healed, roll 3d6; if > Vigor, set Vigor.' },
  { name: 'Lamed', slots: 2, effect: 'Gain Lamed (2 slots). Movement halved until extended rest/doctoring. After healed, roll 3d6; if > Vigor, set Vigor.' },
  { name: 'Endangered', slots: 0, effect: 'If you fail your next Vigor Save, you die. If succeed, replace a characteristic with Unkillable (2) or increase its rank by 1.' }
];

const SOCIAL_BURDENS = [
  { name: 'Bruised ego', slots: 0, effect: 'Roll 2d6; if > max Sand, set Sand.' },
  { name: 'Tongue-tied', slots: 0, effect: 'Lose this or next round. Roll 3d6 (drop lowest); if > max Sand, set Sand.' },
  { name: 'Shamed', slots: 1, effect: 'Gain Shamed (1 slot). Next Presence test at disadvantage, then remove Shamed.' },
  { name: 'Cornered', slots: 0, effect: 'Next Presence attack at disadvantage. After conflict, roll 3d6 (drop highest); if > max Presence, set Presence.' },
  { name: 'Exposed', slots: 1, effect: 'Gain Exposed (1 slot). Subtract 1d6 from Presence until end of session. After long rest, roll 3d6 (drop highest); if > max Sand, set Sand.' },
  { name: 'Rumor-stained', slots: 0, effect: 'Lose 1d4 Presence. After long rest, roll 3d6 (drop lowest); if > max Presence, set Presence.' },
  { name: 'Embarrassed', slots: 1, effect: 'Gain Embarrassed/Disclaimed (1 slot). Presence tests at disadvantage until long rest.' },
  { name: 'Exposed (forked tongue)', slots: 0, effect: 'Lose 1d4 Presence. After long rest, roll 3d6 (drop lowest); if > max Presence, set Presence.' },
  { name: 'Branded', slots: 1, effect: 'Gain Branded (1 slot). Act last in social conflict until fixed. Then roll 3d6; if > max Presence, set Presence.' },
  { name: 'Outmaneuvered', slots: 1, effect: 'Gain Foiled (1 slot). Lose 1d4 Presence per day. Once healed, roll 3d6; if > Presence, set Presence.' },
  { name: 'Ostracized', slots: 2, effect: 'Gain Ostracized (2 slots). Social Saves at disadvantage until removed. Then roll 3d6; if > Presence, set Presence.' },
  { name: 'Shunned', slots: 0, effect: 'If you fail your next Presence Save, you are banished from play. If succeed, replace a characteristic with Return of the Mack (2) or increase its rank by 1.' }
];

const FAITH_BURDENS = [
  { name: 'Bruised faith', slots: 0, effect: 'Roll 2d6; if > max Sand, set Sand.' },
  { name: 'Rattled', slots: 0, effect: 'Lose this or next round. Roll 2d6; if > max Sand, set Sand.' },
  { name: 'Shaken creed', slots: 1, effect: 'Gain Shaken (1 slot). Next Faith test at disadvantage, then remove.' },
  { name: 'Profaned', slots: 1, effect: 'Gain Profaned (1 slot). Cannot regain Sand while present. After long rest, roll 3d6 (drop highest) and if > Faith, set Faith.' },
  { name: 'Blasphemed', slots: 2, effect: 'Gain Blasphemed (2 slots). All Faith tests at disadvantage until removed. After long rest, roll 3d6; if > Faith, set Faith and remove.' },
  { name: 'Unmoored', slots: 0, effect: 'Lose 1d4 Faith. Quest to regain Faith and roll 3d6 (drop lowest); if higher, set Faith.' },
  { name: 'Lapsed', slots: 0, effect: 'Stunned for two actions. Vigor tests at disadvantage until long rest.' },
  { name: 'Forsaken', slots: 0, effect: 'Replace a characteristic with Forsaken (1). Faith acts at disadvantage with Forsaken.' },
  { name: 'Broken vow', slots: 0, effect: 'Lose 1d6 Presence. Cannot heal until vow reaffirmed by Faith.' },
  { name: 'Oathless', slots: 1, effect: 'Gain Oathless (1 slot). Cannot do Acts of Faith and lose 1d4 Faith per day. Minor restitution removes. Once healed, roll 3d6; if > Faith, set Faith.' },
  { name: 'Excommunicated', slots: 2, effect: 'Gain Excommunicated (2 slots). All Presence Saves at disadvantage until major restitution. Once rectified, roll 3d6; if > Faith, set Faith.' },
  { name: 'Apostate', slots: 0, effect: 'If you fail your next Faith Save, you are removed from play. If succeed, replace a characteristic with Unshakeable (2) or increase its rank by 1.' }
];

function tableFor(type) {
  if (type === 'physical') return PHYSICAL_BURDENS;
  if (type === 'social') return SOCIAL_BURDENS;
  return FAITH_BURDENS;
}

export async function applyBurden(actor, type = 'physical') {
  const t = game.i18n.localize.bind(game.i18n);
  const tbl = tableFor(type);
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const roll = new Roll('1d12');
  await roll.evaluate();
  const idx = Math.clamped ? Math.clamped(roll.total - 1, 0, 11) : Math.min(Math.max(roll.total - 1, 0), 11);
  const entry = tbl[idx];

  const content = `
    <form>
      <p><strong>${actor.name}</strong> rolled <strong>${roll.total}</strong> on the ${typeLabel} burdens table.</p>
      <p><strong>${entry.name}</strong> (Slots: ${entry.slots})</p>
      <p>${entry.effect}</p>
      <p>Apply this burden to the actor?</p>
    </form>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title: `Apply ${typeLabel} Burden`,
      content,
      buttons: {
        ok: {
          label: t('SETTINGS.PerformAct') || 'Apply',
          callback: async () => {
            // Try to auto-apply a specific status item from the statuses compendium if referenced by this entry
            // Include common Physical/Social/Faith statuses we seeded in the compendium
            const statusNames = new Set([
              // Core physical/social
              'Deprived','Bleeding','Concussed','Lamed','Shamed','Exposed','Branded','Foiled','Ostracized',
              // Faith-related
              'Profaned','Blasphemed','Shaken','Oathless','Excommunicated',
              // Faith failure consequences
              'Doubt','Night terrors','Spiritual weight','Haunted'
            ]);
            let appliedStatus = false;
            // Use specialItemUuids map for a robust match first
            let uuidMap = {};
            try {
              const raw = game.settings.get('bite-the-bullet', 'specialItemUuids');
              uuidMap = raw ? JSON.parse(raw) : {};
            } catch (e) { uuidMap = {}; }
            // Build candidate names from entry name and effect text
            const candidates = new Set();
            const pushIf = (s) => { if (s && typeof s === 'string') candidates.add(s.trim()); };
            for (const n of statusNames) pushIf(n);
            pushIf(entry?.name);
            // Extract capitalized words that match statusNames substrings
            const effectText = String(entry?.effect || '');
            for (const n of statusNames) {
              if (effectText.toLowerCase().includes(n.toLowerCase())) candidates.add(n);
            }

            for (const name of candidates) {
              // Prefer UUID lookup
              const uuid = uuidMap[name];
              try {
                if (uuid) {
                  const src = await fromUuid(uuid);
                  if (src) {
                    const data = src.toObject();
                    delete data._id;
                    await actor.createEmbeddedDocuments('Item', [data]);
                    appliedStatus = true;
                    continue;
                  }
                }
              } catch (e) { /* ignore and fall back */ }
              // Fallback: search by name in statuses pack
              const pack = game.packs.get('bite-the-bullet.statuses');
              if (pack) {
                try {
                  const docs = await pack.getDocuments();
                  const found = docs.find(d => d.name.toLowerCase() === name.toLowerCase());
                  if (found) {
                    const data = found.toObject();
                    delete data._id;
                    await actor.createEmbeddedDocuments('Item', [data]);
                    appliedStatus = true;
                  }
                } catch (e) { /* ignore */ }
              }
            }
            // Also create a generic burden record to capture the rolled entry narrative
            const burdenData = {
              name: `${entry.name}`,
              type: 'burden',
              img: 'systems/bite-the-bullet/assets/icons/burden-default.svg',
              system: {
                burdenType: type,
                effect: entry.effect,
                duration: 'temporary',
                remedy: '',
                slots: entry.slots,
                description: `${entry.name}: ${entry.effect}`
              }
            };
            await actor.createEmbeddedDocuments('Item', [burdenData]);
            resolve(true);
          }
        },
        cancel: { label: t('SETTINGS.Cancel') || 'Cancel', callback: () => resolve(false) }
      },
      default: 'ok'
    }).render(true);
  });
}
