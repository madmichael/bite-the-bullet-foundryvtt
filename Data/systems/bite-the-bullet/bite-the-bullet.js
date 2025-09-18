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

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.bitebullet = {
    BiteBulletActor,
    BiteBulletItem,
    rollItemMacro,
    performActOfFaith,
    rollPhysicalDamage,
    rollSocialDamage,
    applyBurden
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
    const pack = game.packs.get('bite-the-bullet.statuses');
    if (!pack) return;

    // Load current documents
    const docs = await pack.getDocuments();
    const existing = new Set(docs.map(d => d.name));

    // Localized default statuses
    const t = game.i18n.localize.bind(game.i18n);
    const defaults = [
      { name: t('SETTINGS.StatusDoubt'), slots: 0, effect: t('SETTINGS.StatusDoubt') },
      { name: t('SETTINGS.StatusNightTerrors'), slots: 0, effect: t('SETTINGS.StatusNightTerrors') },
      { name: t('SETTINGS.StatusSpiritualWeight'), slots: 1, effect: t('SETTINGS.StatusSpiritualWeight') },
      { name: t('SETTINGS.StatusHaunted'), slots: 0, effect: t('SETTINGS.StatusHaunted') }
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
        }
      };
      const tmp = await Item.create(data, { temporary: true });
      await pack.importDocument(tmp);
    }
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