  // Settings menu: Import Starter Items
  class ImportStartersMenu extends FormApplication {
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        title: game.i18n.localize('IMPORT.DialogTitle'),
        id: 'bite-bullet-import-starters',
        template: null,
        width: 400,
        height: 'auto'
      });
    }
    async render(force, options) {
      const content = `
        <div style="padding: 8px;">
          <p>${game.i18n.localize('IMPORT.DialogBody')}</p>
          <p>${game.i18n.localize('IMPORT.GMOnly')}</p>
        </div>`;
      new Dialog({
        title: game.i18n.localize('IMPORT.DialogTitle'),
        content,
        buttons: {
          import: {
            label: game.i18n.localize('IMPORT.ImportNow'),
            callback: async () => {
              if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize('IMPORT.GMOnly'));
              await game.bitebullet.importStarterItemsToWorld();
            }
          },
          macro: {
            label: game.i18n.localize('IMPORT.CreateMacro'),
            callback: async () => {
              if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize('IMPORT.GMOnly'));
              await game.bitebullet.createImportMacro();
            }
          }
        },
        default: 'import'
      }).render(true);
      return super.render(force, options);
    }
  }

  
/**
 * Bite the Bullet System for Foundry VTT
 */

// Import document classes
import { BiteBulletActor } from "./module/documents/actor.js";
import { BiteBulletItem } from "./module/documents/item.js";

// Import sheet classes
import { BiteBulletActorSheet } from "./module/sheets/actor-sheet.js";
import { BiteBulletItemSheet } from "./module/sheets/item-sheet.js";

// Import helper/utility classes and constants
import { BITE_BULLET } from "./module/helpers/config.js";
import { preloadHandlebarsTemplates } from "./module/helpers/templates.js";
import { performActOfFaith } from "./module/helpers/faith.js";
import { rollPhysicalDamage, rollSocialDamage } from "./module/helpers/conflict.js";
import { applyBurden } from "./module/helpers/burdens.js";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {

  // Register system settings
  game.settings.register('bite-the-bullet', 'faithFailureUsesStatus', {
    name: game.i18n.localize('SETTINGS.FaithFailureUsesStatusName'),
    hint: game.i18n.localize('SETTINGS.FaithFailureUsesStatusHint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  // Bone-ward fetish mitigation toggle
  game.settings.register('bite-the-bullet', 'boneWardMitigation', {
    name: game.i18n.localize('SETTINGS.BoneWardMitigationName'),
    hint: game.i18n.localize('SETTINGS.BoneWardMitigationHint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  // Bone-ward fetish compendium UUID (string)
  game.settings.register('bite-the-bullet', 'boneWardItemUuid', {
    name: 'Bone-ward Fetish UUID',
    hint: 'Compendium UUID for the Bone-ward fetish (used to detect ownership precisely). Set automatically when starter gear is populated.',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  });

  // Special Item UUIDs map (stringified JSON { name: uuid })
  game.settings.register('bite-the-bullet', 'specialItemUuids', {
    name: 'Special Item UUIDs',
    hint: 'JSON map of important items to their compendium UUIDs, set automatically on population.',
    scope: 'world',
    config: false,
    type: String,
    default: '{}'
  });

  // Theme toggle (dark or parchment)
  game.settings.register('bite-the-bullet', 'theme', {
    name: game.i18n.localize('SETTINGS.ThemeName'),
    hint: game.i18n.localize('SETTINGS.ThemeHint'),
    scope: 'client',
    config: true,
    type: String,
    choices: {
      'dark': game.i18n.localize('SETTINGS.ThemeDark'),
      'parchment': game.i18n.localize('SETTINGS.ThemeParchment')
    },
    default: 'dark',
    onChange: (val) => {
      try {
        const root = document.documentElement;
        root.classList.remove('bitebullet-theme-dark', 'bitebullet-theme-parchment');
        root.classList.add(val === 'parchment' ? 'bitebullet-theme-parchment' : 'bitebullet-theme-dark');
      } catch(e) {}
    }
  });

  // Settings menu: Import Starter Items (register within init)
  game.settings.registerMenu('bite-the-bullet', 'importStartersMenu', {
    name: game.i18n.localize('IMPORT.MenuName'),
    label: game.i18n.localize('IMPORT.MenuLabel'),
    hint: game.i18n.localize('IMPORT.MenuHint'),
    icon: 'fas fa-download',
    type: ImportStartersMenu,
    restricted: true
  });

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.bitebullet = {
    BiteBulletActor,
    BiteBulletItem,
    rollItemMacro,
    performActOfFaith,
    rollPhysicalDamage,
    rollSocialDamage,
    applyBurden,
    // Utility to import starter items from compendia into the world Item directory
    importStarterItemsToWorld: async () => {
      if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize('IMPORT.GMOnly'));
      const packs = [
        game.packs.get('bite-the-bullet.starter-weapons'),
        game.packs.get('bite-the-bullet.starter-armor'),
        game.packs.get('bite-the-bullet.starter-gear')
      ].filter(Boolean);
      for (const pack of packs) {
        const docs = await pack.getDocuments();
        const toCreate = docs.map(d => {
          const obj = d.toObject();
          delete obj._id; // ensure new world document
          // Tag source for robust detection
          obj.flags = obj.flags || {};
          obj.flags.bitebullet = Object.assign({}, obj.flags.bitebullet || {}, {
            sourceName: d.name,
            sourceUuid: d.uuid
          });
          return obj;
        });
        if (toCreate.length) await Item.createDocuments(toCreate);
      }
      ui.notifications.info(game.i18n.localize('IMPORT.ImportedToast'));
    },
    createImportMacro: async () => {
      if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize('IMPORT.GMOnly'));
      const name = 'Import Starter Items';
      const command = "game.bitebullet.importStarterItemsToWorld();";
      let macro = game.macros?.getName?.(name);
      if (!macro) {
        macro = await Macro.create({
          name,
          type: 'script',
          scope: 'global',
          img: 'systems/bite-the-bullet/assets/icons/download.svg',
          command
        }, { displaySheet: false });
      }
      // Find first empty hotbar slot
      let slot = null;
      const hb = game.user?.hotbar || {};
      for (let i = 1; i <= 50; i++) {
        if (!hb[i]) { slot = i; break; }
      }
      if (slot) {
        await game.user.assignHotbarMacro(macro, slot);
        const msg = game.i18n.localize('IMPORT.MacroPlaced').replace('{slot}', String(slot));
        ui.notifications.info(msg);
      } else {
        ui.notifications.info(game.i18n.localize('IMPORT.MacroCreated'));
      }
      return macro;
    },
    getSpecialItemUuids: () => {
      try {
        const raw = game.settings.get('bite-the-bullet', 'specialItemUuids');
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    }
  };

  // Add custom constants for configuration.
  CONFIG.BITE_BULLET = BITE_BULLET;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d20 + @attributes.presence.value",
    decimals: 2
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = BiteBulletActor;
  CONFIG.Item.documentClass = BiteBulletItem;

  // Register sheet application classes (v13+ namespaced APIs)
  const { ActorSheet, ItemSheet } = foundry.appv1.sheets;
  const { Actors, Items } = foundry.documents.collections;
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("bite-the-bullet", BiteBulletActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("bite-the-bullet", BiteBulletItemSheet, { makeDefault: true });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Ready Hook: populate compendia               */
/* -------------------------------------------- */

Hooks.once('ready', async function() {
  try {
    // Apply theme class on ready
    try {
      const theme = game.settings.get('bite-the-bullet', 'theme') || 'dark';
      const root = document.documentElement;
      root.classList.remove('bitebullet-theme-dark', 'bitebullet-theme-parchment');
      root.classList.add(theme === 'parchment' ? 'bitebullet-theme-parchment' : 'bitebullet-theme-dark');
    } catch (e) {}

    // Only GMs should attempt to populate packs
    if (!game.user.isGM) return;
    const t = game.i18n.localize.bind(game.i18n);

    // Build a UUID map across packs we populate
    const uuidsMap = {};

    // Populate statuses pack
    const packStatuses = game.packs.get('bite-the-bullet.statuses');
    if (packStatuses && !packStatuses.locked) {
      const docs = await packStatuses.getDocuments();
      const existing = new Set(docs.map(d => d.name));
      const defaults = [
        // Faith consequence statuses
        { name: t('SETTINGS.StatusDoubt'), slots: 0, effect: t('SETTINGS.StatusDoubt'), img: 'icons/svg/eye.svg' },
        { name: t('SETTINGS.StatusNightTerrors'), slots: 0, effect: t('SETTINGS.StatusNightTerrors'), img: 'icons/svg/sleep.svg' },
        { name: t('SETTINGS.StatusSpiritualWeight'), slots: 1, effect: t('SETTINGS.StatusSpiritualWeight'), img: 'icons/svg/anchor.svg' },
        { name: t('SETTINGS.StatusHaunted'), slots: 0, effect: t('SETTINGS.StatusHaunted'), img: 'icons/svg/ghost.svg' },
        // Physical/Social common statuses
        { name: 'Deprived', slots: 1, effect: 'Cannot recover Sand or attribute damage while Deprived.', img: 'icons/svg/stoned.svg' },
        { name: 'Bleeding', slots: 1, effect: 'Cannot regain Sand; lose 1d4 Vigor per day until healed.', img: 'icons/svg/blood.svg' },
        { name: 'Concussed', slots: 1, effect: 'Faith tests at disadvantage until healed by long rest.', img: 'icons/svg/daze.svg' },
        { name: 'Lamed', slots: 2, effect: 'Movement halved until extended rest/doctoring.', img: 'icons/svg/anchor.svg' },
        { name: 'Shamed', slots: 1, effect: 'Next Presence test at disadvantage; then remove.', img: 'icons/svg/stoned.svg' },
        { name: 'Exposed', slots: 1, effect: 'Presence reduced temporarily; see burden effect for details.', img: 'icons/svg/explosion.svg' },
        { name: 'Branded', slots: 1, effect: 'Act last in social conflict until fixed.', img: 'icons/svg/branding.svg' },
        { name: 'Foiled', slots: 1, effect: 'Lose 1d4 Presence per day until healed.', img: 'icons/svg/cross.svg' },
        { name: 'Ostracized', slots: 2, effect: 'Social Saves at disadvantage until removed.', img: 'icons/svg/ruins.svg' },
        { name: 'Profaned', slots: 1, effect: 'Cannot regain Sand while present.', img: 'icons/svg/unconscious.svg' },
        { name: 'Blasphemed', slots: 2, effect: 'All Faith tests at disadvantage until removed.', img: 'icons/svg/holy-symbol.svg' },
        { name: 'Shaken', slots: 1, effect: 'Next Faith test at disadvantage; then remove.', img: 'icons/svg/wind.svg' },
        { name: 'Oathless', slots: 1, effect: 'Cannot perform Acts of Faith; lose 1d4 Faith per day.', img: 'icons/svg/bones.svg' },
        { name: 'Excommunicated', slots: 2, effect: 'All Presence Saves at disadvantage until major restitution.', img: 'icons/svg/maze.svg' }
      ];
      for (const def of defaults) {
        if (existing.has(def.name)) continue;
        const data = {
          name: def.name,
          type: 'burden',
          system: {
            burdenType: 'faith',
            effect: def.effect,
            duration: '',
            remedy: '',
            slots: def.slots,
            description: def.effect
          },
          img: def.img || 'systems/bite-the-bullet/assets/icons/burden-default.svg'
        };
        const doc = new Item(data);
        const imported = await packStatuses.importDocument(doc);
        if (imported) uuidsMap[imported.name] = imported.uuid;
      }
    }

    // Populate starter weapons
    const packWeapons = game.packs.get('bite-the-bullet.starter-weapons');
    if (packWeapons && !packWeapons.locked) {
      const docs = await packWeapons.getDocuments();
      const existing = new Set(docs.map(d => d.name));
      const items = [
        { name: 'Revolver', damage: '1d6', shots: 6, range: 'close', props: { isGun: true }, img: 'icons/weapons/pistols/pistol-revolver.webp', description: 'Six-shooter sidearm. Reliable and quick to draw.' },
        { name: 'Lever-action rifle', damage: '1d6', shots: 5, range: 'medium', props: { isGun: true }, img: 'icons/weapons/crossbows/rifle-brown.webp', description: 'Trusty longarm for the trail. Better at range.' },
        { name: 'Coach gun', damage: '1d6', shots: 2, range: 'close', props: { isGun: true, aoe: true }, img: 'icons/weapons/guns/gun-double-barrel.webp', description: 'Double-barrel scattergun. AoE; beware friendly fire.' },
        { name: 'Knife', damage: '1d4', shots: 0, range: 'personal', props: { melee: true, concealed: true }, img: 'icons/weapons/daggers/dagger-straight.webp', description: 'A small blade, easily concealed.' },
        { name: 'Long knife', damage: '1d6', shots: 0, range: 'personal', props: { melee: true }, img: 'icons/weapons/daggers/dagger-wavy.webp', description: 'Heavier blade for close-in work.' },
        { name: 'Saber', damage: '1d6', shots: 0, range: 'personal', props: { melee: true }, img: 'icons/weapons/swords/sword-guard.webp', description: 'A gentleman’s sword; may find use in social conflict.' },
        { name: 'Tomahawk', damage: '1d6', shots: 0, range: 'personal', props: { melee: true, throwable: true }, img: 'icons/weapons/axes/axe-broad.webp', description: 'Light axe, can be thrown (Close).' },
        { name: 'Bullwhip', damage: '1d4', shots: 0, range: 'close', props: { }, img: 'icons/tools/hand/whip-braided-brown.webp', description: 'Entangle or disarm. Narratively impair on a hit.' },
        { name: 'Bow & arrows', damage: '1d6', shots: 6, range: 'close', props: { silent: true }, img: 'icons/weapons/bows/shortbow-leather.webp', description: 'Silent and deadly with steady hands.' }
      ];
      for (const w of items) {
        if (existing.has(w.name)) continue;
        const data = {
          name: w.name,
          type: 'weapon',
          system: {
            damage: w.damage,
            range: w.range,
            shots: w.shots,
            properties: Object.assign({ aoe: false, melee: false, silent: false, concealed: false, throwable: false, isGun: false }, w.props)
          },
          img: w.img || 'icons/svg/sword.svg',
          system: {
            damage: w.damage,
            range: w.range,
            shots: w.shots,
            properties: Object.assign({ aoe: false, melee: false, silent: false, concealed: false, throwable: false, isGun: false }, w.props),
            description: w.description || ''
          }
        };
        const doc = new Item(data);
        const imported = await packWeapons.importDocument(doc);
        if (imported) uuidsMap[imported.name] = imported.uuid;
      }
    }

    // Populate starter armor
    const packArmor = game.packs.get('bite-the-bullet.starter-armor');
    if (packArmor && !packArmor.locked) {
      const docs = await packArmor.getDocuments();
      const existing = new Set(docs.map(d => d.name));
      const items = [
        { name: 'Duster coat', value: 1, img: 'icons/equipment/chest/coat-leather-brown.webp', description: 'Long coat that turns the wind and a little lead.' },
        { name: 'Rancher\'s vest', value: 2, img: 'icons/equipment/chest/vest-leather-brown.webp', description: 'Sturdy vest; better than nothing in a shootout.' },
        { name: 'Railhand plate', value: 2, img: 'icons/equipment/chest/breastplate-scale-steel.webp', description: 'Scrap metal armor, heavy but protective.' },
        { name: 'Scavver leathers', value: 1, img: 'icons/equipment/chest/breastplate-leather-studded-brown.webp', description: 'Pieced leathers for the wastelands.' }
      ];
      for (const a of items) {
        if (existing.has(a.name)) continue;
        const data = {
          name: a.name,
          type: 'armor',
          system: {
            armorType: 'light',
            armor: { value: a.value, type: 'physical' }
          },
          img: a.img || 'icons/svg/shield.svg',
          system: {
            armorType: 'light',
            armor: { value: a.value, type: 'physical' },
            description: a.description || ''
          }
        };
        const doc = new Item(data);
        const imported = await packArmor.importDocument(doc);
        if (imported) uuidsMap[imported.name] = imported.uuid;
      }
    }

    // Populate starter gear (including Bone-ward fetish) and set UUID setting if empty
    const packGear = game.packs.get('bite-the-bullet.starter-gear');
    if (packGear && !packGear.locked) {
      const docs = await packGear.getDocuments();
      const existing = new Map(docs.map(d => [d.name, d]));
      const items = [
        { name: 'Bone-ward fetish', description: 'A charm against the uncanny. When enabled by GM setting, provides +1 Social mitigation and reduces Act of Faith failure damage by 1 if carried.', slots: 0, icon: 'icons/svg/mystery-man.svg' },
        { name: 'Tinderbox', description: 'Useful for starting fires; may grant advantage situationally.', slots: 0 },
        { name: 'Canteen', description: 'Water on the trail; refreshes between scenes.', slots: 0 },
        { name: 'Rope (50 ft)', description: 'Climb, tie, haul.', slots: 1 },
        { name: 'Bear trap', description: 'Immobolize on trigger; GM adjudication.', slots: 1 }
      ];
      for (const g of items) {
        if (existing.has(g.name)) continue;
        const data = {
          name: g.name,
          type: 'gear',
          system: {
            gearType: 'mundane',
            uses: { value: 1, max: 1, per: null },
            formula: '',
            slots: g.slots ?? 0,
            description: g.description || ''
          },
          img: g.icon || 'icons/svg/item-bag.svg'
        };
        const doc = new Item(data);
        const imported = await packGear.importDocument(doc);
        // Capture Bone-ward UUID if not set
        if (g.name === 'Bone-ward fetish') {
          const current = game.settings.get('bite-the-bullet', 'boneWardItemUuid');
          if (!current && imported) {
            await game.settings.set('bite-the-bullet', 'boneWardItemUuid', imported.uuid);
          }
        }
        if (imported) uuidsMap[imported.name] = imported.uuid;
      }
    }

    // Persist UUID map setting
    try {
      const prev = game.settings.get('bite-the-bullet', 'specialItemUuids');
      const merged = Object.assign({}, (prev ? JSON.parse(prev) : {}), uuidsMap);
      await game.settings.set('bite-the-bullet', 'specialItemUuids', JSON.stringify(merged));
    } catch (e) { /* ignore */ }
  } catch (err) {
    console.error('Bite the Bullet: failed to populate statuses compendium', err);
  }
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function() {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

// Additional helpers used by templates
Handlebars.registerHelper('multiply', function(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isNaN(na) || Number.isNaN(nb)) return '';
  return na * nb;
});

Handlebars.registerHelper('capitalize', function(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn("You can only create macro buttons for owned Items");
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command
  const command = `game.bitebullet.rollItemMacro("${item.name}");`;
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "bite-the-bullet.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  // Trigger the item roll
  return item.roll();
}