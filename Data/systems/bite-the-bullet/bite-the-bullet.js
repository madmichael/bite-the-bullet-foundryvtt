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

          <hr/>
          <p><strong>One-Click Table Rolls</strong></p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <button type="button" onclick="game.bitebullet.rollRulesTable('Background (d10)')">Roll Background</button>
            <button type="button" onclick="game.bitebullet.rollRulesTable('Reputation (d10)')">Roll Reputation</button>
            <button type="button" onclick="game.bitebullet.rollRulesTable('Fortitude (d10)')">Roll Fortitude</button>
            <button type="button" onclick="game.bitebullet.rollRulesTable('Foible (d10)')">Roll Foible</button>
            <button type="button" onclick="game.bitebullet.rollRulesTable('Issue (d10)')">Roll Issue</button>
            <button type="button" onclick="game.bitebullet.rollRulesTable('Armor (d5)')">Roll Armor</button>
            <button type="button" onclick="game.bitebullet.rollRulesTable('Weapons (d8)')">Roll Weapon</button>
            <button type="button" onclick="game.bitebullet.rollRulesTable('Gear (d20)')">Roll Gear</button>
          </div>
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

  // Settings menu: Clone Tables to World
  class CloneTablesMenu extends FormApplication {
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        title: 'Tables Tools',
        id: 'bite-bullet-clone-tables',
        width: 420,
        height: 'auto'
      });
    }
    async render(force, options) {
      const content = `
        <div style="padding: 8px;">
          <p><strong>Clone Tables to World</strong></p>
          <p>Clones all Rollable Tables from the system compendium <em>Bite the Bullet — Tables</em> into your World.</p>
          <ul>
            <li>Overwrites World tables with the same name.</li>
            <li>Requires GM permissions.</li>
          </ul>
        </div>`;
      new Dialog({
        title: 'Tables: Clone to World',
        content,
        buttons: {
          clone: {
            label: 'Clone Now',
            callback: async () => {
              if (!game.user.isGM) return ui.notifications.warn('GM only');
              await game.bitebullet.cloneTablesToWorld();
            }
          },
          macro: {
            label: 'Create Hotbar Macro',
            callback: async () => {
              if (!game.user.isGM) return ui.notifications.warn('GM only');
              await game.bitebullet.createCloneTablesMacro();
            }
          }
        },
        default: 'clone'
      }).render(true);
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

  // Settings menu: Tables clone (register within init)
  game.settings.registerMenu('bite-the-bullet', 'cloneTablesMenu', {
    name: 'Tables Tools',
    label: 'Tables: Clone to World',
    hint: 'Clone system Rollable Tables compendium into the World (GM only)',
    icon: 'fas fa-table',
    type: CloneTablesMenu,
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
    // Clone RollTable compendium to World (overwrites by name)
    cloneTablesToWorld: async () => {
      if (!game.user.isGM) return ui.notifications.warn('GM only');
      const pack = game.packs.get('bite-the-bullet.tables');
      if (!pack) return ui.notifications.error('System tables compendium not found.');
      const docs = await pack.getDocuments();
      let cloned = 0;
      for (const tbl of docs) {
        // Delete any world table with same name
        const existing = game.tables.getName(tbl.name);
        if (existing) {
          try { await existing.delete(); } catch (e) { /* ignore */ }
        }
        const data = tbl.toObject();
        delete data._id;
        await RollTable.create(data);
        cloned += 1;
      }
      ui.notifications.info(`Cloned ${cloned} tables into the World.`);
    },
    // Macro to run cloneTablesToWorld
    createCloneTablesMacro: async () => {
      if (!game.user.isGM) return ui.notifications.warn('GM only');
      const name = 'Clone Tables to World';
      const command = "game.bitebullet.cloneTablesToWorld();";
      let macro = game.macros?.getName?.(name);
      if (!macro) {
        macro = await Macro.create({
          name,
          type: 'script',
          scope: 'global',
          img: 'systems/bite-the-bullet/assets/icons/table.svg',
          command
        }, { displaySheet: false });
      }
      // Place on first empty hotbar slot
      let slot = null;
      const hb = game.user?.hotbar || {};
      for (let i = 1; i <= 50; i++) { if (!hb[i]) { slot = i; break; } }
      if (slot) {
        await game.user.assignHotbarMacro(macro, slot);
        ui.notifications.info(`Macro placed on hotbar slot ${slot}.`);
      } else {
        ui.notifications.info('Macro created. No empty hotbar slot found.');
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
    // Roll a named rules table from World or the system compendium and post to chat
    rollRulesTable: async (tableName) => {
      try {
        // Prefer World table
        let table = game.tables?.getName?.(tableName) || null;
        // Otherwise pull from compendium
        if (!table) {
          const pack = game.packs.get('bite-the-bullet.tables');
          if (pack) {
            const docs = await pack.getDocuments();
            table = docs.find(d => d.name === tableName) || null;
          }
        }
        if (!table) {
          return ui.notifications.warn(`Table not found: ${tableName}`);
        }
        const draw = await table.draw();
        const resultTexts = (draw.results || []).map(r => r.text).filter(Boolean);
        const result = resultTexts.join('<br>');
        const rollTotal = draw.roll?.total ?? '';
        const content = `
          <div class="bitebullet-chat-table">
            <div><strong>${table.name}</strong> ${table.formula ? `(${table.formula})` : ''} ${rollTotal !== '' ? `→ <em>${rollTotal}</em>` : ''}</div>
            <div>${result || '(no result)'}</div>
          </div>`;
        await ChatMessage.create({ content, speaker: ChatMessage.getSpeaker() });
        return { draw, resultTexts };
      } catch (e) {
        console.error('Bite the Bullet: rollRulesTable failed', e);
        ui.notifications.error('Failed to roll table. See console for details.');
      }
    },
    
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

    // Populate Rollable Tables pack with core rules tables (only once per world)
    const packTables = game.packs.get('bite-the-bullet.tables');
    if (packTables && !packTables.locked) {
      const existingDocs = await packTables.getDocuments();
      const existingMap = new Map(existingDocs.map(t => [t.name, t]));
      const makeTableData = (name, dieFaces, results, description = '') => {
        const res = results.map((text, i) => ({
          type: 0, // TEXT
          text,
          img: 'icons/svg/d20-black.svg',
          weight: 1,
          range: [i + 1, i + 1],
          drawn: false
        }));
        return {
          name,
          description,
          replacement: true,
          displayRoll: true,
          formula: `1d${dieFaces}`,
          results: res
        };
      };
      const ensureTable = async (name, dieFaces, results, description = '') => {
        // If exists, delete and recreate to keep content in sync
        const existing = existingMap.get(name);
        if (existing) {
          try { await packTables.deleteDocument(existing.id); } catch (e) { /* ignore */ }
        }
        const data = makeTableData(name, dieFaces, results, description);
        const doc = new RollTable(data);
        await packTables.importDocument(doc);
      };

      // d10 Background
      await ensureTable('Background (d10)', 10, [
        '1 Mine-born. You grew up underground. Tough as bedrock and wary of collapse.',
        '2 Drifter. Always on the move. You read people and places before they read you.',
        '3 Ex-preacher. You speak in parables, your eyes heavy with judgment.',
        '4 Scout. You know where to walk, what to track, and when to vanish.',
        '5 Homesteader. You know how to fix things yourself. Stubborn, frugal, and proud.',
        '6 Sharpshooter. Trained to breathe steadily and end things at a distance.',
        '7 Dustmarshal’s whelp. Raised among the law, but the law don’t raise saints.',
        '8 Salt flat smuggler. You’ve run contraband past bandits and a whole lot worse.',
        '9 Gun pit fighter. You know exactly what a man looks like right before he breaks.',
        '10 Rustwalker. You scavenge ruins without flinching at the bones.'
      ]);

      // d10 Reputation
      await ensureTable('Reputation (d10)', 10, [
        '1 Shot Wyatt at sundown. True or not, folks believe it.',
        '2 Hex-touched. People whisper you got bad blood or stranger gifts.',
        '3 Burned a town down. Everyone\'s got an opinion on what really happened.',
        '4 Old hand. Seen as seasoned, maybe too seasoned.',
        '5 Cold-eyed killer. Your stare alone chills most men.',
        '6 Broken man. They say you’ve lost everything, and it shows.',
        '7 Witch’s favor. Rumor has it that something inhuman watches over you.',
        '8 Last of the line. Your name still carries weight…or warning.',
        '9 Silver-tongued devil. You can talk most into deals they’ll regret.',
        '10 Died once. They say you were buried. You say nothing.'
      ]);

      // d10 Fortitude
      await ensureTable('Fortitude (d10)', 10, [
        '1 Justice above all. Fair or foul, you won’t let wrong stand.',
        '2 The old ways. You heed traditions carved in stone or bone.',
        '3 Blood oath. Loyalty to kin, clan, or cause overrides fear.',
        '4 Grace under fire. Calm ain’t a tactic—it’s your only way through.',
        '5 Work is worth. You believe effort should earn its due.',
        '6 Don’t look back. The past is dead. Forward’s all that matters.',
        '7 Protect the weak. You can’t abide cruelty, even when it’s easy.',
        '8 Owe a debt. Something big keeps your hand steady and your head low.',
        '9 Survive, always. Survival isn’t luck, it’s will sharpened by fire.',
        '10 Faith in something. Maybe God, maybe it’s just the Sun. But it keeps you walking.'
      ]);

      // d10 Foible
      await ensureTable('Foible (d10)', 10, [
        '1 Short fuse. You burn hot, fast, and loud.',
        '2 Drinks to forget. You self-medicate with every bottle, every night.',
        '3 Can’t let go. You obsess over the thing you lost...or caused.',
        '4 Bleeds for strangers. You help even when it hurts.',
        '5 Never backs down. Pride is your shield, even when it cracks.',
        '6 Haunted by dreams. You’ve seen things you wish you hadn’t.',
        '7 Reckless hope. You expect good in places it don’t belong.',
        '8 Always watching. You trust no one, not even yourself.',
        '9 Compulsive fixer. You can’t leave broken things alone.',
        '10 Vow of silence. You don’t speak unless it\'s carved in fire.'
      ]);

      // d10 Issue
      await ensureTable('Issue (d10)', 10, [
        '1 Craves meaning. You can’t stand the thought that it’s all for nothing.',
        '2 Seeks the one who left. Someone walked out. You’re still chasing.',
        '3 Faith in fire. You believe only destruction cleanses.',
        '4 Tainted by the past. Something you did or were part of won’t stay buried.',
        '5 The thing beneath. You dream of tunnels. You wake cold.',
        '6 Marked by prophecy. You’ve read your fate. You’re making it real.',
        '7 Addicted to risk. The edge calls louder than any reward.',
        '8 Owes a devil’s favor. You took help you shouldn’t have. It’s still watching.',
        '9 Seeks an end. Some part of you walks toward death, always.',
        '10 Afraid to love again. You keep everyone at the far end of your reach.'
      ]);

      // d5 Armor
      await ensureTable('Armor (d5)', 5, [
        '1 Duster coat | Armor Slots: 1 | Worn leather, oil-waxed for trail grit. Light but better than nothing.',
        '2 Rancher’s vest | Armor Slots: 2 | Thick quilted leather layered with scraps of metal or bone. Uncomfortable but sturdy.',
        '3 Railhand plate | Armor Slots: 2 | Salvaged breastplate from a collapsed ironclad engine. Heavy and clumsy, but solid.',
        '4 Scavver leathers | Armor Slots: 1 | Patchwork hides, reinforced with wire mesh and thick canvas. Worn by dust-pickers.',
        '5 Bone-ward fetish | Armor Slots: 0 | No protection to speak of, but hung with charms, bones, or glyphs. May ward off fear or stranger things. Could be armor for Faith-based conflict.'
      ]);

      // d8 Weapons
      await ensureTable('Weapons (d8)', 8, [
        '1 Revolver | Damage: d6 | Slots: 1 | Range: Close | Traits: 6 shots',
        '2 Lever-action rifle | Damage: d6 | Slots: 2 | Range: Medium | Traits: 5 shots',
        '3 Coach gun | Damage: d6 | Slots: 2 | Range: Close | Traits: AoE, 2 shots, hits all in zone (allies too)',
        '4 Knife/long knife | Damage: d4/d6 | Slots: 1 | Range: Personal | Traits: Concealable, melee only',
        '5 Saber | Damage: d6 | Slots: 1 | Range: Personal | Traits: May be used for social conflict',
        '6 Tomahawk | Damage: d6 | Slots: 1 | Range: Personal | Traits: Melee, throwable (Close)',
        '7 Bullwhip | Damage: d4 | Slots: 1 | Range: Close | Traits: No melee, may impair target on hit',
        '8 Bow & arrows | Damage: d6 | Slots: 2 | Range: Close | Traits: Silent, 6 shots'
      ]);

      // d20 Gear
      await ensureTable('Gear (d20)', 20, [
        '1 Tinderbox – Flint, steel, and dry scrap tucked in a tin. 1 slot.',
        '2 Canteen – Half-full. The water’s clean. For now. 1 slot.',
        '3 Bundle of jerky – String-tied meat: probably goat, possibly not. 1 slot.',
        '4 Whetstone – Keeps blades sharp and minds steady.',
        '5 Traveler’s Bible – Pages marked in charcoal and blood. Can be used to assist with Social or faith-based conflict. 1 slot.',
        '6 Coil of wire – Thin but strong. 10 feet, barbed in spots. 1 slot.',
        '7 Harmonica – Dented, off-tune, but it carries memory. Can be used to assist with Social or faith-based conflict.',
        '8 Wooden idol – Small and worn smooth. You don’t remember who carved it. Can be used to assist with Social or faith-based conflict.',
        '9 Notebook & charcoal stub – Half-filled with symbols, maps, names. Some aren’t yours. 1 slot.',
        '10 Spool of thread & needle – For stitching gear or yourself. It may hold more than it should. 1 slot.',
        '11 Bottle of whiskey – Three good swigs left. Used for courage or cleaning wounds. 1 slot.',
        '12 Bear trap – Folded and rusted. Still snaps like judgment. Bulky, 2 slots (d12 ambush damage; Vigor Save for d6).',
        '13 Hand mirror – Cracked across the middle. Sometimes shows things behind you. 1 slot.',
        '14 Tin cup – Dented and burned. Always warm when you wake.',
        '15 Lockbox (empty) – Heavy, padlocked, and no key in sight. Why’d you keep it? 2 slots.',
        '16 Rope (20 ft.) – Rough, stiff hemp. Smells of boats or gallows. 1 slot.',
        '17 Signal whistle – Loud, shrill, from another time. Draws dogs and worse.',
        '18 Fashionable top hat – Doesn’t fit quite right. 1 slot.',
        '19 Old coin – Face is scratched off. Warm to the touch.',
        '20 Goggles – Dust-scratched lenses and a cracked leather strap. Might keep the wind out. Might not. 1 slot.'
      ]);

      // d12 Physical burden
      await ensureTable('Physical burden (d12)', 12, [
        '1 Bruised: Roll 2d6. If greater than max Sand, take the new result.',
        '2 Winded: Lose this round, or the next if you’ve already acted. Roll 3d (drop lowest). If greater than max Sand, take the new result.',
        '3 Battered: Add Deprived to your Inventory (1 slot). You can’t regain Sand until it’s removed. After a long rest, roll 2d6. If greater than max Vigor, take the new result.',
        '4 Marked: You’ve taken a visible scar. Replace a characteristic with Scarred (1). If you already have that, raise its rank by 1.',
        '5 Bloodied: Add Bloodied to your Inventory (1 slot). Social tests are taken at –1. After a long rest, remove Bloodied and the penalty.',
        '6 Hobbled: Your footing is unsteady. Vigor tests are at disadvantage until the end of the fight. Roll 3d6 (drop highest). If greater than max Sand, take the new result.',
        '7 Concussed: A hard blow rattles your brain. Lose this round, or the next if you’ve already acted. Add Concussed to your Inventory (1 slot). Faith tests are at disadvantage until healed by a long rest.',
        '8 Broken: Take a fall and break something. Lose 1d4 Vigor. Once mended, roll 3d6 (drop lowest). If greater than max Vigor, take the new result.',
        '9 Clobbered: A hard blow causes you to lose 1d4 Vigor. Once mended, roll 3d6 (drop lowest). If greater than max Vigor, take the new result.',
        '10 Bleeding: Add Bleeding to your Inventory (1 slot). You can’t regain Sand until healed. Lose 1d4 Vigor per day. Once healed, roll 3d6. If greater than Vigor, it is your new score.',
        '11 Lamed: Add Lamed to your Inventory (2 slots). Movement is halved and this can’t be removed without doctoring and extended rest. Once healed, roll 3d6. If greater than Vigor, it is your new score.',
        '12 Endangered: This could be the end. If you fail your next Vigor Save, you die. If you succeed, replace a characteristic with Unkillable (2). If you already have that, raise its rank by 1.'
      ]);

      // d12 Social burden
      await ensureTable('Social burden (d12)', 12, [
        '1 Bruised ego: Roll 2d6. If greater than max Sand, take the new result.',
        '2 Tongue-tied: Lose this round, or the next if you’ve already acted. Roll 3d6 (drop lowest). If greater than max Sand, take the new result.',
        '3 Shamed: Add Shamed to your Inventory (1 slot). Your next Presence test is at disadvantage. After that test, remove Shamed.',
        '4 Cornered: Your rhetoric has been shifted into a corner. Your next Presence attack is at disadvantage. After this conflict, roll 3d6 (drop highest). If higher than max Presence, it is your new score.',
        '5 Exposed: Add Exposed to your Inventory (1 slot). Subtract 1d6 from your Presence until the end of the session. After a long rest, roll 3d (drop highest). If greater than max Sand, take the new result.',
        '6 Rumor-stained: Lose 1d4 Presence. After a long rest, roll 3d6 (drop lowest). If greater than max Presence, take the new result.',
        '7 Embarrassed: You’ve been disclaimed! Add that to your Inventory (slot). Presence tests are at disadvantage until rectified by a long rest.',
        '8 Exposed: You’ve been exposed as speaking with a forked tongue. Lose 1d4 Presence. After a long rest, roll 3d6 (drop lowest). If greater than max Presence, take the new result.',
        '9 Branded: Named as a coward. Add Branded to your Inventory (1 slot). You act last in any social conflict until fixed. After that, roll 3d6. If greater than max Presence, take the new result.',
        '10 Outmaneuvered: You’ve lost this argument. Add Foiled to your Inventory (1 slot). Lose 1d4 Presence per day. Once healed, roll 3d6. If the result is higher than your Presence, it is your new score.',
        '11 Ostracized: Add Ostracized to you Inventory (2 slots). Social Saves are at disadvantage. Once removed, roll 3d6. If the result is higher than your Presence, it is your new score.',
        '12 Shunned: If you fail your next Presence Save, your status has banished you from play. If you succeed, replace a characteristic with Return of the Mack (2). If you already have that, increase its rank by 1.'
      ]);

      // d12 Faith burden
      await ensureTable('Faith burden (d12)', 12, [
        '1 Bruised faith: Roll 2d6. If greater than max Sand, take the new result.',
        '2 Rattled: Lose this round, or the next if you’ve already acted. Roll 2d6. If greater than max Sand, take the new result.',
        '3 Shaken creed: Add Shaken to your Inventory (1 slot).Your next Faith test is at disadvantage. After that test, remove Shaken.',
        '4 Profaned: Add Profaned to your Inventory (1 slot). You cannot regain Sand while it is there. After a long rest, roll 3d6 (drop highest) and replace your Faith with this number if it is higher.',
        '5 Blasphemed: Add Blasphemed to your Inventory (2 slots). All Faith tests at disadvantage until removed. After a long rest, roll 3d6. If greater than Faith, take the new result and remove Blasphemed.',
        '6 Unmoored: Lose 1d4 Faith. Quest to regain your Faith and roll 3d (drop lowest). If it is higher than your current Faith, replace it.',
        '7 Lapsed: You are stunned for two actions as you question yourself. Vigor tests are at disadvantage until you take a long rest.',
        '8 Forsaken: Replace one of your characteristics with Forsaken (1). All Faith-based acts are at disadvantage with Forsaken.',
        '9 Broken vow: You have broken a vow. Lose 1d6 Presence. This cannot be healed until the vow has been reaffirmed by Faith.',
        '10 Oathless: Add Oathless to your Inventory (1 slot). Until rectified, you cannot do Acts of Faith and lose 1d4 Faith per day. Once healed, roll 3d6. If the result is higher than your Faith, it is your new score.',
        '11 Excommunicated: Add Excommunicated to your Inventory (2 slots). All Presence Saves are at disadvantage. This can only be removed with a major restitution. Once rectified, roll 3d6. If the result is higher than your Faith, it is your new score.',
        '12 Apostate: If you fail your next Faith Save, you are self-banished and removed from play. If you succeed, replace one characteristic with Unshakeable (2). If you already have it, raise its rank by 1.'
      ]);

      // d4 Bond type
      await ensureTable('Bond type (d4)', 4, [
        '1 The Pact. The band is bound by oath, vengeance, or common survival.',
        '2 The Ledger. Debts and favors bind you together.',
        '3 The Iron Brand. A shared mark, name, faith, or identity.',
        '4 The Shared Burden. A common weight you all carry is lighter than one carried alone.'
      ]);

      // d6 Pact bond
      await ensureTable('Pact bond (d6)', 6, [
        '1 Sworn to avenge a town that was burned to ashes.',
        '2 Bound to track down the same outlaw.',
        '3 Promised to guard a bloodline or heirloom.',
        '4 Agreed to ride until all debts are paid.',
        '5 Survive together or not at all.',
        '6 Keep moving West, no matter the cost.'
      ]);

      // d6 Ledger bond
      await ensureTable('Ledger bond (d6)', 6, [
        '1 One of you saved another’s life in a dust storm.',
        '2 Owes coin from a gamble gone bad.',
        '3 Helped bury each other’s dead.',
        '4 Covered for each other after a killing.',
        '5 Pulled each other out of the same collapse.',
        '6 Kept one another’s secrets when it mattered.'
      ]);

      // d6 Iron brand bond
      await ensureTable('Iron brand bond (d6)', 6, [
        '1 One of you saved another’s life in a dust storm.',
        '2 Owes coin from a gamble gone bad.',
        '3 Helped bury each other’s dead.',
        '4 Covered for each other after a killing.',
        '5 Pulled each other out of the same collapse.',
        '6 Kept one another’s secrets when it mattered.'
      ]);

      // d6 Shared burden bond
      await ensureTable('Shared burden bond (d6)', 6, [
        '1 Hunted by the same bounty-poster.',
        '2 Blamed for the same blood feud.',
        '3 Carrying the same cursed item or debt.',
        '4 Escaped together from the same camp or from the gallows.',
        '5 Lost kin in the same raid.',
        '6 Witnessed the same horror and can’t speak of it.'
      ]);
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