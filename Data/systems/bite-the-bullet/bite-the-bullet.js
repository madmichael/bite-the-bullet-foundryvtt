  // Settings menu: Character Generator
  class CharacterGeneratorMenu extends FormApplication {
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        title: 'Character Generator',
        id: 'bite-bullet-character-generator',
        width: 500,
        height: 'auto'
      });
    }
    async render(force, options) {
      const content = `
        <div style="padding: 8px;">
          <p><strong>Bite the Bullet Character Generator</strong></p>
          <p>Generate a complete character using the official rules:</p>
          <ul>
            <li>Roll attributes (3d6 each, 2d6 for Sand)</li>
            <li>Roll characteristics from tables</li>
            <li>Generate starting equipment</li>
            <li>Calculate inventory and resources</li>
            <li>Generate authentic Wild West name</li>
          </ul>
          <p><em>Note: This will create a new actor or overwrite an existing one.</em></p>
        </div>`;
      new Dialog({
        title: 'Character Generator',
        content,
        buttons: {
          newActor: {
            label: 'Generate New Actor',
            callback: async () => {
              if (game?.bitebullet?.generateNewCharacter) {
                await game.bitebullet.generateNewCharacter();
              }
            }
          },
          existing: {
            label: 'Regenerate Existing Actor',
            callback: async () => {
              if (game?.bitebullet?.regenerateExistingCharacter) {
                await game.bitebullet.regenerateExistingCharacter();
              }
            }
          },
          nameOnly: {
            label: 'Generate Name Only',
            callback: async () => {
              if (game?.bitebullet?.generateNameDialog) {
                await game.bitebullet.generateNameDialog();
              }
            }
          }
        },
        default: 'newActor'
      }).render(true);
      return this;
    }
  }

  // Settings menu: Import Starter Items
  class ImportStartersMenu extends FormApplication {
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        title: game.i18n.localize('IMPORT.DialogTitle'),
        id: 'bite-bullet-import-starters',
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
      // Do not call super.render to avoid template resolution; this menu only shows a Dialog
      return this;
    }
  }

  
/**
 * Bite the Bullet System for Foundry VTT
 */

// Import document classes
import { BiteBulletActor } from "./module/documents/actor.js";
import { BiteBulletItem } from "./module/documents/item.js";
import { BiteBulletItemSheet } from "./module/sheets/item-sheet.js";
import { BiteBulletActorSheet } from "./module/sheets/actor-sheet.js";
import { rollItemMacro } from "./module/helpers/macros.js";
import { performActOfFaith } from "./module/helpers/faith.js";
import { rollPhysicalDamage, rollSocialDamage } from "./module/helpers/conflict.js";
import { applyBurden } from "./module/helpers/burdens.js";
import { generateCharacter, applyCharacterToActor } from "./module/helpers/character-generator.js";
import { generateWildWestName } from "./module/helpers/name-generator.js";
import { BITE_BULLET } from "./module/helpers/config.js";
import { preloadHandlebarsTemplates } from "./module/helpers/templates.js";

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

  // Client setting: show AoE per-target lines (when targets <= 5)
  game.settings.register('bite-the-bullet', 'showAoePerTarget', {
    name: game.i18n.localize('SETTINGS.ShowAoePerTargetName'),
    hint: game.i18n.localize('SETTINGS.ShowAoePerTargetHint'),
    scope: 'client',
    config: true,
    type: Boolean,
    default: true
  });

  // Settings menu: Character Generator (register within init)
  game.settings.registerMenu('bite-the-bullet', 'characterGeneratorMenu', {
    name: 'Character Generator',
    label: 'Generate Character',
    hint: 'Generate a new character using the official Bite the Bullet rules',
    icon: 'fas fa-dice',
    type: CharacterGeneratorMenu,
    restricted: false
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
    generateWildWestName,
    // Utility to import starter items from compendia into the world Item directory
    importStarterItemsToWorld: async () => {
      if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize('IMPORT.GMOnly'));
      let created = 0;
      let usedFallback = false;
      const packs = {
        weapons: game.packs.get('bite-the-bullet.starter-weapons'),
        armor: game.packs.get('bite-the-bullet.starter-armor'),
        gear: game.packs.get('bite-the-bullet.starter-gear')
      };
      // Helper to import from a pack when available
      const importFromPack = async (pack) => {
        if (!pack) return 0;
        const docs = await pack.getDocuments();
        const toCreate = docs.map(d => {
          const obj = d.toObject();
          delete obj._id;
          obj.flags = obj.flags || {};
          obj.flags.bitebullet = Object.assign({}, obj.flags.bitebullet || {}, {
            sourceName: d.name,
            sourceUuid: d.uuid
          });
          return obj;
        });
        if (toCreate.length) {
          await Item.createDocuments(toCreate);
        }
        return toCreate.length;
      };

      // Try packs first
      created += await importFromPack(packs.weapons);
      created += await importFromPack(packs.armor);
      created += await importFromPack(packs.gear);

      // Fallback: seed defaults directly if packs missing/empty
      if (created === 0) {
        usedFallback = true;
        const toCreate = [];
        const weapons = [
          { name: 'Revolver', damage: '1d6', shots: 6, range: 'close', props: { isGun: true }, img: 'icons/weapons/pistols/pistol-revolver.webp', description: 'Six-shooter sidearm. Reliable and quick to draw.' },
          { name: 'Lever-action rifle', damage: '1d6', shots: 5, range: 'medium', props: { isGun: true }, img: 'icons/weapons/crossbows/rifle-brown.webp', description: 'Trusty longarm for the trail. Better at range.' },
          { name: 'Coach gun', damage: '1d6', shots: 2, range: 'close', props: { isGun: true, aoe: true }, img: 'icons/weapons/guns/gun-double-barrel.webp', description: 'Double-barrel scattergun. AoE; beware friendly fire.' }
        ];
        for (const w of weapons) {
          toCreate.push({
            name: w.name,
            type: 'weapon',
            img: w.img || 'icons/svg/sword.svg',
            system: {
              damage: w.damage,
              range: w.range,
              shots: w.shots,
              properties: Object.assign({ aoe: false, melee: false, silent: false, concealed: false, throwable: false, isGun: false }, w.props),
              description: w.description || ''
            }
          });
        }
        const armor = [
          { name: 'Duster coat', value: 1, img: 'icons/equipment/chest/coat-leather-brown.webp', description: 'Long coat that turns the wind and a little lead.' },
          { name: "Rancher's vest", value: 2, img: 'icons/equipment/chest/vest-leather-brown.webp', description: 'Sturdy vest; better than nothing in a shootout.' }
        ];
        for (const a of armor) {
          toCreate.push({
            name: a.name,
            type: 'armor',
            img: a.img || 'icons/svg/shield.svg',
            system: { armorType: 'light', armor: { value: a.value, type: 'physical' }, description: a.description || '' }
          });
        }
        const gear = [
          { name: 'Bone-ward fetish', description: 'A charm against the uncanny. When enabled by GM setting, provides +1 Social mitigation and reduces Act of Faith failure damage by 1 if carried.', slots: 0, icon: 'icons/svg/mystery-man.svg' },
          { name: 'Canteen', description: 'Water on the trail; refreshes between scenes.', slots: 0 }
        ];
        for (const g of gear) {
          toCreate.push({
            name: g.name,
            type: 'gear',
            img: g.icon || 'icons/svg/item-bag.svg',
            system: { gearType: 'mundane', uses: { value: 1, max: 1, per: null }, formula: '', slots: g.slots ?? 0, description: g.description || '' }
          });
        }
        if (toCreate.length) {
          const createdDocs = await Item.createDocuments(toCreate);
          created += createdDocs.length;
        }
      }

      // Notify results
      if (created > 0) {
        const note = usedFallback ? ' (fallback defaults used)' : '';
        ui.notifications.info(`${created} starter items imported${note}.`);
      } else {
        ui.notifications.warn('No starter items were found to import. Check that the system compendium packs exist and are unlocked, or try again.');
      }
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
    },
    getUiPrefs: () => ({ showAoePerTarget: game.settings.get('bite-the-bullet', 'showAoePerTarget') }),
    
    // Character Generator functions
    generateNewCharacter: async () => {
      try {
        // Generate character data
        const characterData = generateCharacter();
        
        // Generate name
        const nameData = generateWildWestName();
        
        // Create new actor
        const actor = await Actor.create({
          name: nameData.fullName,
          type: 'character',
          img: 'icons/svg/mystery-man.svg'
        });
        
        // Apply character data to actor
        await applyCharacterToActor(actor, characterData);
        
        // Show success message
        ui.notifications.info(`Character "${actor.name}" generated successfully!`);
        
        // Open the character sheet
        actor.sheet.render(true);
        
        return actor;
      } catch (error) {
        console.error('Error generating character:', error);
        ui.notifications.error('Failed to generate character. Check console for details.');
      }
    },
    
    regenerateExistingCharacter: async () => {
      // Get all character actors that the user owns
      const ownedCharacters = game.actors.filter(a => a.type === 'character' && a.isOwner);
      
      if (ownedCharacters.length === 0) {
        ui.notifications.warn('No character actors found. Create a character first.');
        return;
      }
      
      // Create selection dialog
      const options = ownedCharacters.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
      const template = `
        <form>
          <div class="form-group">
            <label>Select Character to Regenerate:</label>
            <select name="actorId">${options}</select>
          </div>
          <div class="form-group">
            <p><strong>Warning:</strong> This will completely overwrite the selected character's attributes, characteristics, and equipment.</p>
          </div>
        </form>
      `;
      
      new Dialog({
        title: 'Regenerate Character',
        content: template,
        buttons: {
          regenerate: {
            label: 'Regenerate',
            callback: async (html) => {
              try {
                const form = html[0].querySelector('form');
                const actorId = form.actorId.value;
                const actor = game.actors.get(actorId);
                
                if (!actor) {
                  ui.notifications.error('Selected actor not found.');
                  return;
                }
                
                // Clear existing items
                const existingItems = actor.items.contents;
                if (existingItems.length > 0) {
                  await actor.deleteEmbeddedDocuments('Item', existingItems.map(i => i.id));
                }
                
                // Generate new character data
                const characterData = generateCharacter();
                
                // Apply to existing actor
                await applyCharacterToActor(actor, characterData);
                
                ui.notifications.info(`Character "${actor.name}" regenerated successfully!`);
                
                // Refresh the sheet if it's open
                if (actor.sheet.rendered) {
                  actor.sheet.render(false);
                }
              } catch (error) {
                console.error('Error regenerating character:', error);
                ui.notifications.error('Failed to regenerate character. Check console for details.');
              }
            }
          },
          cancel: {
            label: 'Cancel'
          }
        },
        default: 'regenerate'
      }).render(true);
    },
    
    generateNameDialog: async () => {
      // Generate multiple name options
      const maleNames = [];
      const femaleNames = [];
      
      for (let i = 0; i < 3; i++) {
        maleNames.push(generateWildWestName('male'));
        femaleNames.push(generateWildWestName('female'));
      }
      
      const template = `
        <div style="padding: 8px;">
          <p><strong>Wild West Name Generator</strong></p>
          <p>Choose a name or generate new ones:</p>
          
          <h4>Male Names:</h4>
          <div style="margin-bottom: 15px;">
            ${maleNames.map((name, i) => `
              <div style="margin: 5px 0; padding: 8px; background: rgba(139, 69, 19, 0.1); border-radius: 4px;">
                <strong>${name.fullName}</strong><br>
                <small style="color: #666;">${name.firstName} • ${name.nickname} • ${name.lastName}</small>
              </div>
            `).join('')}
          </div>
          
          <h4>Female Names:</h4>
          <div style="margin-bottom: 15px;">
            ${femaleNames.map((name, i) => `
              <div style="margin: 5px 0; padding: 8px; background: rgba(139, 69, 19, 0.1); border-radius: 4px;">
                <strong>${name.fullName}</strong><br>
                <small style="color: #666;">${name.firstName} • ${name.nickname} • ${name.lastName}</small>
              </div>
            `).join('')}
          </div>
          
          <p><em>Click "Generate More" for new names, or close this dialog.</em></p>
        </div>
      `;
      
      new Dialog({
        title: 'Wild West Name Generator',
        content: template,
        buttons: {
          generateMore: {
            label: 'Generate More Names',
            callback: async () => {
              // Recursively call to generate new names
              if (game?.bitebullet?.generateNameDialog) {
                await game.bitebullet.generateNameDialog();
              }
            }
          },
          close: {
            label: 'Close'
          }
        },
        default: 'generateMore'
      }).render(true);
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
        { name: 'Revolver', damage: '1d6', shots: 6, range: 'close', props: { isGun: true }, img: 'systems/bite-the-bullet/assets/icons/weapon-default.svg', description: 'Six-shooter sidearm. Reliable and quick to draw.' },
        { name: 'Lever-action rifle', damage: '1d6', shots: 5, range: 'medium', props: { isGun: true }, img: 'systems/bite-the-bullet/assets/icons/weapon-default.svg', description: 'Trusty longarm for the trail. Better at range.' },
        { name: 'Coach gun', damage: '1d6', shots: 2, range: 'close', props: { isGun: true, aoe: true }, img: 'systems/bite-the-bullet/assets/icons/weapon-default.svg', description: 'Double-barrel scattergun. AoE; beware friendly fire.' },
        { name: 'Knife', damage: '1d4', shots: 0, range: 'personal', props: { melee: true, concealed: true }, img: 'systems/bite-the-bullet/assets/icons/weapon-default.svg', description: 'A small blade, easily concealed.' },
        { name: 'Long knife', damage: '1d6', shots: 0, range: 'personal', props: { melee: true }, img: 'systems/bite-the-bullet/assets/icons/weapon-default.svg', description: 'Heavier blade for close-in work.' },
        { name: 'Saber', damage: '1d6', shots: 0, range: 'personal', props: { melee: true }, img: 'systems/bite-the-bullet/assets/icons/weapon-default.svg', description: 'A gentleman’s sword; may find use in social conflict.' },
        { name: 'Tomahawk', damage: '1d6', shots: 0, range: 'personal', props: { melee: true, throwable: true }, img: 'systems/bite-the-bullet/assets/icons/weapon-default.svg', description: 'Light axe, can be thrown (Close).' },
        { name: 'Bullwhip', damage: '1d4', shots: 0, range: 'close', props: { }, img: 'systems/bite-the-bullet/assets/icons/weapon-default.svg', description: 'Entangle or disarm. Narratively impair on a hit.' },
        { name: 'Bow & arrows', damage: '1d6', shots: 6, range: 'close', props: { silent: true }, img: 'systems/bite-the-bullet/assets/icons/weapon-default.svg', description: 'Silent and deadly with steady hands.' }
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
        { name: 'Rancher\'s vest', value: 2, img: 'systems/bite-the-bullet/assets/icons/armor-default.svg', description: 'Sturdy vest; better than nothing in a shootout.' },
        { name: 'Railhand plate', value: 2, img: 'systems/bite-the-bullet/assets/icons/armor-default.svg', description: 'Scrap metal armor, heavy but protective.' },
        { name: 'Scavver leathers', value: 1, img: 'systems/bite-the-bullet/assets/icons/armor-default.svg', description: 'Pieced leathers for the wastelands.' }
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

// rollItemMacro function is imported from module/helpers/macros.js