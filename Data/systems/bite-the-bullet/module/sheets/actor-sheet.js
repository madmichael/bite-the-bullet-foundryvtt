/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class BiteBulletActorSheet extends foundry.appv1.sheets.ActorSheet {

    /** @override */
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        classes: ["bite-bullet", "sheet", "actor"],
        width: 600,
        height: 680,
        tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }]
      });
    }
  
    /** @override */
    get template() {
      // Reuse the character sheet for all actor types initially
      return `systems/bite-the-bullet/templates/actor/actor-character-sheet.html`;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    getData() {
      // Retrieve the data structure from the base sheet. You can inspect or log
      // the context variable to see the structure, but some key properties for
      // sheets are the actor object, the data object, whether or not it's
      // editable, the items array, and the effects array.
      const context = super.getData();
  
      // Use a safe clone of the actor data for further operations.
      const actorData = this.actor.toObject(false);
  
      // Add the actor's data to context.data for easier access, as well as flags.
      context.system = actorData.system;
      context.flags = actorData.flags;
  
      // Prepare character data and items.
      if (actorData.type == 'character') {
        this._prepareItems(context);
        this._prepareCharacterData(context);
      }
  
      // Prepare NPC data and items.
      if (actorData.type == 'npc') {
        this._prepareItems(context);
      }
  
      // Add roll data for TinyMCE editors.
      context.rollData = context.actor.getRollData();
  
      // Add config data
      context.config = CONFIG.BITE_BULLET;
  
      return context;
    }
  
    /**
     * Organize and classify Items for Character sheets.
     *
     * @param {Object} actorData The actor to prepare.
     *
     * @return {undefined}
     */
    _prepareCharacterData(context) {
      // Handle characteristics
      for (let [k, v] of Object.entries(context.system.characteristics)) {
        v.label = game.i18n.localize(CONFIG.BITE_BULLET.characteristics[k]) ?? k;
        v.canAdvance = v.uses >= (v.rank * 10);
      }
  
      // Handle attributes
      for (let [k, v] of Object.entries(context.system.attributes)) {
        v.label = game.i18n.localize(CONFIG.BITE_BULLET.attributes[k]) ?? k;
      }
    }
  
    /**
     * Organize and classify Items for Character sheets.
     *
     * @param {Object} actorData The actor to prepare.
     *
     * @return {undefined}
     */
    _prepareItems(context) {
      // Initialize containers.
      const weapons = [];
      const armor = [];
      const gear = [];
      const burdens = [];
  
      // Iterate through items, allocating to containers
      for (let i of context.items) {
        i.img = i.img || DEFAULT_TOKEN;
        // Append to specific arrays based on item type.
        if (i.type === 'weapon') {
          weapons.push(i);
        }
        else if (i.type === 'armor') {
          armor.push(i);
        }
        else if (i.type === 'gear') {
          gear.push(i);
        }
        else if (i.type === 'burden') {
          burdens.push(i);
        }
      }
  
      // Assign and return
      context.weapons = weapons;
      context.armor = armor;
      context.gear = gear;
      context.burdens = burdens;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    activateListeners(html) {
      super.activateListeners(html);
  
      // Render the item sheet for viewing/editing prior to the editable check.
      html.find('.item-edit').click(ev => {
        const li = $(ev.currentTarget).parents(".item");
        const item = this.actor.items.get(li.data("itemId"));
        item.sheet.render(true);
      });
  
      // Everything below here is only needed if the sheet is editable
      if (!this.isEditable) return;
  
      // Roll handlers, click handlers, etc. would go here.

      // Physical / Social attack buttons
      html.find('.physical-attack').click(() => this._onPhysicalAttack());
      html.find('.social-attack').click(this._onSocialAttack.bind(this));

      // Click weapon name to open pre-filled Physical Attack dialog
      html.find('ol.items-list li.item .item-name').click(ev => {
        const li = $(ev.currentTarget).parents('.item');
        const item = this.actor.items.get(li.data('itemId'));
        if (item?.type === 'weapon') {
          ev.preventDefault();
          this._onPhysicalAttack(item);
        }
      });

      // Add Inventory Item
      html.find('.item-create').click(this._onItemCreate.bind(this));
  
      // Delete Inventory Item
      html.find('.item-delete').click(ev => {
        const li = $(ev.currentTarget).parents(".item");
        const item = this.actor.items.get(li.data("itemId"));
        item.delete();
        li.slideUp(200, () => this.render(false));
      });
  
      // Active Effect management
      html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));
  
      // Rollable abilities.
      html.find('.rollable').click(this._onRoll.bind(this));
  
      // Characteristic usage
      html.find('.characteristic-tap').click(this._onCharacteristicTap.bind(this));
      
      // Characteristic rank advancement
      html.find('.characteristic-advance').click(this._onCharacteristicAdvance.bind(this));
  
      // Save rolls
      html.find('.save-roll').click(this._onSaveRoll.bind(this));
  
      // Act of Faith
      html.find('.faith-act').click(this._onActOfFaith.bind(this));
  
      // Drag events for macros.
      if (this.actor.isOwner) {
        let handler = ev => this._onDragStart(ev);
        html.find('li.item').each((i, li) => {
          if (li.classList.contains("inventory-header")) return;
          li.setAttribute("draggable", true);
          li.addEventListener("dragstart", handler, false);
        });
      }
    }
  
    /**
     * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
     * @param {Event} event   The originating click event
     * @private
     */
    async _onItemCreate(event) {
      event.preventDefault();
      const header = event.currentTarget;
      // Get the type of item to create.
      const type = header.dataset.type;
      // Grab any data associated with this control.
      const data = foundry.utils.duplicate(header.dataset);
      // Initialize a default name.
      const name = `New ${type && typeof type === 'string' ? type.charAt(0).toUpperCase() + type.slice(1) : 'Item'}`;
      // Prepare the item object.
      const itemData = {
        name: name,
        type: type,
        system: data
      };
      // Remove the type from the dataset since it's in the itemData.type prop.
      delete itemData.system["type"];
  
      // Finally, create the item!
      return await Item.create(itemData, {parent: this.actor});
    }
  
    /**
     * Handle clickable rolls.
     * @param {Event} event   The originating click event
     * @private
     */
    _onRoll(event) {
      event.preventDefault();
      const element = event.currentTarget;
      const dataset = element.dataset;
  
      // Handle item rolls.
      if (dataset.rollType) {
        if (dataset.rollType == 'item') {
          const itemId = element.closest('.item').dataset.itemId;
          const item = this.actor.items.get(itemId);
          if (item) return item.roll();
        }
      }
  
      // Handle rolls that supply the formula directly.
      if (dataset.roll) {
        let label = dataset.label ? `[attribute] ${dataset.label}` : '';
        let roll = new Roll(dataset.roll, this.actor.getRollData());
        roll.toMessage({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flavor: label,
          rollMode: game.settings.get('core', 'rollMode'),
        });
        return roll;
      }
    }
  
    /**
     * Handle tapping a characteristic
     * @param {Event} event   The originating click event
     * @private
     */
    async _onCharacteristicTap(event) {
      event.preventDefault();
      const element = event.currentTarget;
      const characteristic = element.dataset.characteristic;
      
      if (characteristic) {
        await this.actor.tapCharacteristic(characteristic, 'manual');
      }
    }

    /**
     * Handle characteristic rank advancement
     * @param {Event} event   The originating click event
     * @private
     */
    async _onCharacteristicAdvance(event) {
      event.preventDefault();
      const element = event.currentTarget;
      const characteristic = element.dataset.characteristic;
      
      if (characteristic) {
        await this.actor.attemptRankAdvancement(characteristic);
      }
    }
  
    /**
     * Handle save rolls
     * @param {Event} event   The originating click event
     * @private
     */
    async _onSaveRoll(event) {
      event.preventDefault();
      const element = event.currentTarget;
      const attribute = element.dataset.attribute;
      
      if (attribute) {
        // Show dialog for tap selection
        const t = game.i18n.localize.bind(game.i18n);
        
        // Build tap options (available characteristics)
        const availableChars = Object.entries(this.actor.system.characteristics || {})
          .filter(([key, char]) => !char.isDisabled)
          .map(([key, char]) => `<option value="${key}">${key} (Rank ${char.rank}, -${char.rank} to roll)</option>`)
          .join("");
        const tapOptions = `<option value="">No Tap</option>${availableChars}`;
        
        const template = `
          <form>
            <div class="form-group">
              <p><strong>Save Roll: ${attribute}</strong></p>
              <p>Roll 1d20 + attribute value. Lower is better.</p>
            </div>
            <div class="form-group">
              <label>Tap Characteristic for Mitigation:</label>
              <select name="tapChar">${tapOptions}</select>
            </div>
          </form>
        `;
        
        new Dialog({
          title: `${attribute} Save`,
          content: template,
          buttons: {
            roll: {
              label: 'Roll Save',
              callback: async (html) => {
                const form = html[0].querySelector('form');
                const tapChar = form.tapChar.value;
                
                // Handle tap if selected
                let tapBonus = 0;
                if (tapChar) {
                  const tapResult = await this.actor.tapCharacteristic(tapChar, 'save-roll');
                  if (tapResult) {
                    tapBonus = tapResult.bonus;
                  }
                }
                
                await this.actor.rollSave(attribute, tapBonus, tapChar);
              }
            },
            cancel: {
              label: 'Cancel'
            }
          },
          default: 'roll'
        }).render(true);
      }
    }
  
    /**
     * Handle Acts of Faith
     * @param {Event} event   The originating click event
     * @private
     */
    async _onActOfFaith(event) {
      event.preventDefault();
      
      // Create dialog to get faith act details
      const t = game.i18n.localize.bind(game.i18n);
      
      // Build tap options (available characteristics)
      const availableChars = Object.entries(this.actor.system.characteristics || {})
        .filter(([key, char]) => !char.isDisabled)
        .map(([key, char]) => `<option value="${key}">${key} (Rank ${char.rank}, +${char.rank} bonus)</option>`)
        .join("");
      const tapOptions = `<option value="">${t('FAITH.None')}</option>${availableChars}`;
      
      const template = `
        <form>
          <div class="form-group">
            <label>${t('SETTINGS.ActOfFaithScale')}:</label>
            <select name="scale">
              <option value="trivial">${t('FAITH.ScaleTrivial')}</option>
              <option value="minor">${t('FAITH.ScaleMinor')}</option>
              <option value="moderate">${t('FAITH.ScaleModerate')}</option>
              <option value="major">${t('FAITH.ScaleMajor')}</option>
              <option value="legendary">${t('FAITH.ScaleLegendary')}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Tap Characteristic for Bonus:</label>
            <select name="characteristic">${tapOptions}</select>
          </div>
          <div class="form-group">
            <label>${t('SETTINGS.ActOfFaithDescription')}:</label>
            <textarea name="description" placeholder="${t('FAITH.DescribePlaceholder')}"></textarea>
          </div>
        </form>
      `;
  
      new Dialog({
        title: t('SETTINGS.ActOfFaithTitle'),
        content: template,
        buttons: {
          roll: {
            label: t('SETTINGS.PerformAct'),
            callback: async (html) => {
              const form = html[0].querySelector("form");
              const scale = form.scale.value;
              const description = form.description.value;
              const charKey = form.characteristic.value;
              let extra = 0;
              let tappedChar = null;
              
              if (charKey) {
                // Use the new tap system
                const tapResult = await this.actor.tapCharacteristic(charKey, 'act-of-faith');
                if (tapResult) {
                  extra = tapResult.bonus;
                  tappedChar = charKey;
                }
              }
              
              if (game?.bitebullet?.performActOfFaith) {
                await game.bitebullet.performActOfFaith(this.actor, scale, description, { extraModifier: extra, tappedChar });
              } else {
                await this.actor.rollActOfFaith(scale, description);
              }
            }
          },
          cancel: {
            label: t('SETTINGS.Cancel')
          }
        },
        default: "roll"
      }).render(true);
    }

    /**
     * Physical Attack dialog -> calls helper
     */
    async _onPhysicalAttack(weapon = null) {
      // If invoked from a button click, weapon will be null; if from weapon name click, a weapon Document is passed
      const t = game.i18n.localize.bind(game.i18n);
      const selectedTokens = canvas?.tokens?.controlled ?? [];
      const targets = selectedTokens.length ? selectedTokens.map(t => ({ id: t.actor?.id, name: t.name, actor: t.actor })) : [];

      // Per-weapon auto-cue: prefill from selected weapon in inventory if present
      const weapons = this.actor.items.filter(i => i.type === 'weapon');
      const selectedWeapon = weapon || weapons[0];
      const autoBase = selectedWeapon?.system?.damage || '1d6';
      const autoIsGun = !!selectedWeapon?.system?.properties?.isGun;
      const autoAoe = !!selectedWeapon?.system?.properties?.aoe;
      const options = targets.map(o => `<option value="${o.id}">${o.name}</option>`).join("");
      const weaponOptions = weapons.map(w => `<option value="${w.id}" ${selectedWeapon && w.id===selectedWeapon.id ? 'selected' : ''}>${w.name}</option>`).join("");
      
      // Build tap options (available characteristics)
      const availableChars = Object.entries(this.actor.system.characteristics || {})
        .filter(([key, char]) => !char.isDisabled)
        .map(([key, char]) => `<option value="${key}">${key} (Rank ${char.rank}, +${char.rank} bonus)</option>`)
        .join("");
      const tapOptions = `<option value="">No Tap</option>${availableChars}`;
      const template = `
        <form>
          <div class="form-group"><label>${t('ATTACK.Weapon')}:</label><select name="weapon" autofocus>${weaponOptions}</select></div>
          <div class="form-group"><label>${t('ATTACK.BaseFormula')}:</label><input type="text" name="base" value="${autoBase}"/></div>
          <div class="form-group"><label>${t('ATTACK.Target')}:</label><select name="target">${options}</select></div>
          <div class="form-group"><label>Tap Characteristic for Damage Bonus:</label><select name="tapChar">${tapOptions}</select></div>
          <div class="form-group"><label><input type="checkbox" name="adv"/> ${t('ATTACK.Advantage')}</label></div>
          <div class="form-group"><label><input type="checkbox" name="dis"/> ${t('ATTACK.Disadvantage')}</label></div>
          <div class="form-group"><label><input type="checkbox" name="isGun" ${autoIsGun ? 'checked' : ''}/> ${t('ATTACK.IsGun')}</label></div>
          <div class="form-group"><label><input type="checkbox" name="aoe" ${autoAoe ? 'checked' : ''}/> ${t('ATTACK.AoE') || 'AoE (affects all selected targets)'}</label></div>
        </form>`;
      new Dialog({
        title: t('ATTACK.PhysicalAttackTitle'),
        content: template,
        buttons: {
          atk: {
            label: t('ATTACK.Attack'),
            callback: async (html) => {
              const form = html[0].querySelector('form');
              // Re-read weapon to apply cues
              const weaponId = form.weapon?.value;
              const chosen = weapons.find(w => w.id === weaponId);
              const base = form.base.value || '1d6';
              const targetId = form.target.value;
              const tapChar = form.tapChar.value;
              const adv = form.adv.checked;
              const dis = form.dis.checked;
              const isGun = form.isGun.checked || !!chosen?.system?.properties?.isGun;
              const aoe = form.aoe.checked || !!chosen?.system?.properties?.aoe;
              const tgt = targets.find(x => x.id === targetId)?.actor ?? null;
              const tgtActors = selectedTokens.map(t => t.actor).filter(Boolean);
              
              // Handle tap if selected
              let tapBonus = 0;
              if (tapChar) {
                const tapResult = await this.actor.tapCharacteristic(tapChar, 'physical-attack');
                if (tapResult) {
                  tapBonus = tapResult.bonus;
                }
              }
              
              if (game?.bitebullet?.rollPhysicalDamage) {
                await game.bitebullet.rollPhysicalDamage({ attacker: this.actor, baseFormula: base, target: tgt, targets: tgtActors, advantage: adv, disadvantage: dis, isGun, aoe, tapBonus, tappedChar: tapChar });
              }
            }
          },
          cancel: { label: t('SETTINGS.Cancel') }
        },
        default: 'atk'
      }).render(true);
    }

    /**
     * Social Attack dialog -> calls helper
     */
    async _onSocialAttack(event) {
      event.preventDefault();
      const t = game.i18n.localize.bind(game.i18n);
      const targets = canvas?.tokens?.controlled?.length ? canvas.tokens.controlled.map(t => ({ id: t.actor?.id, name: t.name, actor: t.actor })) : [];
      const options = targets.map(o => `<option value="${o.id}">${o.name}</option>`).join("");
      
      // Build tap options (available characteristics)
      const availableChars = Object.entries(this.actor.system.characteristics || {})
        .filter(([key, char]) => !char.isDisabled)
        .map(([key, char]) => `<option value="${key}">${key} (Rank ${char.rank}, +${char.rank} bonus)</option>`)
        .join("");
      const tapOptions = `<option value="">No Tap</option>${availableChars}`;
      const template = `
        <form>
          <div class="form-group"><label>${t('ATTACK.BaseFormula')}:</label><input type="text" name="base" value="1d6" autofocus/></div>
          <div class="form-group"><label>${t('ATTACK.Target')}:</label><select name="target">${options}</select></div>
          <div class="form-group"><label>Tap Characteristic for Damage Bonus:</label><select name="tapChar">${tapOptions}</select></div>
          <div class="form-group"><label><input type="checkbox" name="adv"/> ${t('ATTACK.Advantage')}</label></div>
          <div class="form-group"><label><input type="checkbox" name="dis"/> ${t('ATTACK.Disadvantage')}</label></div>
        </form>`;
      new Dialog({
        title: t('ATTACK.SocialAttackTitle'),
        content: template,
        buttons: {
          atk: {
            label: t('ATTACK.Attack'),
            callback: async (html) => {
              const form = html[0].querySelector('form');
              const base = form.base.value || '1d6';
              const targetId = form.target.value;
              const tapChar = form.tapChar.value;
              const adv = form.adv.checked;
              const dis = form.dis.checked;
              const tgt = targets.find(x => x.id === targetId)?.actor ?? null;
              
              // Handle tap if selected
              let tapBonus = 0;
              if (tapChar) {
                const tapResult = await this.actor.tapCharacteristic(tapChar, 'social-attack');
                if (tapResult) {
                  tapBonus = tapResult.bonus;
                }
              }
              
              if (game?.bitebullet?.rollSocialDamage) {
                await game.bitebullet.rollSocialDamage({ attacker: this.actor, baseFormula: base, target: tgt, advantage: adv, disadvantage: dis, tapBonus, tappedChar: tapChar });
              }
            }
          },
          cancel: { label: t('SETTINGS.Cancel') }
        },
        default: 'atk'
      }).render(true);
    }
  }