/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Bite the Bullet system.
 * @extends {Actor}
 */
export class BiteBulletActor extends Actor {

    /** @override */
    prepareData() {
      // Prepare data for the actor. Calling the super version of this executes
      // the following, in order: data reset (to clear active effects),
      // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
      // prepareDerivedData().
      super.prepareData();
    }
  
    /** @override */
    prepareBaseData() {
      // Data modifications in this step occur before processing embedded
      // documents or active effects.
    }
  
    /**
     * @override
     * Augment the basic actor data with additional dynamic data. Typically,
     * you'll want to handle most of your calculated/derived data in this step.
     * Data calculated in this step should generally not exist in template.json
     * (such as ability modifiers rather than ability scores) and should be
     * available both inside and outside of character sheets (such as if an actor
     * is queried and has a roll executed directly from a script).
     */
    prepareDerivedData() {
      const actorData = this;
      const systemData = actorData.system;
      const flags = actorData.flags.bitebullet || {};
  
      // Make separate methods for each Actor type (character, npc, etc.) to keep
      // things organized.
      this._prepareCharacterData(actorData);
      this._prepareNpcData(actorData);
    }
  
    /**
     * Prepare Character type specific data
     */
    _prepareCharacterData(actorData) {
      if (actorData.type !== 'character') return;

      // Make modifications to data here. For example:
      const systemData = actorData.system;
      const vigor = Number(systemData?.attributes?.vigor?.value ?? 10);

      // Inventory equals max(Vigor, 10) per rules; treat as derived each prepare
      const derivedInventory = Math.max(10, vigor);
      systemData.resources.inventory.value = derivedInventory;

      // Calculate Reserve (Inventory - Load)
      systemData.resources.reserve.value = systemData.resources.inventory.value - systemData.resources.load.value;
      systemData.resources.reserve.max = systemData.resources.inventory.value;

      // Ensure Sand doesn't exceed maximum
      if (systemData.resources.sand.value > systemData.resources.sand.max) {
        systemData.resources.sand.value = systemData.resources.sand.max;
      }

      // Aggregate item-based Social Armor into details.socialArmor.value
      try {
        const items = this.items ?? [];
        let socialArmorTotal = 0;
        for (const it of items) {
          const sys = it.system || {};
          // Armor item with social type contributes its armor.value
          if (it.type === 'armor' && sys.armor && sys.armor.type === 'social') {
            const val = Number(sys.armor.value ?? 0);
            if (!isNaN(val)) socialArmorTotal += val;
          }
          // Any item may explicitly provide socialArmor.value
          const explicit = Number(sys?.socialArmor?.value ?? 0);
          if (!isNaN(explicit) && explicit > 0) socialArmorTotal += explicit;
        }
        if (!systemData.details) systemData.details = {};
        if (!systemData.details.socialArmor) systemData.details.socialArmor = { value: 0 };
        // Bone-ward fetish toggle adds +1 social armor if item is owned
        try {
          const boneToggle = game.settings.get('bite-the-bullet', 'boneWardMitigation');
          if (boneToggle) {
            const uuid = game.settings.get('bite-the-bullet', 'boneWardItemUuid');
            const hasBone = items.some(i => {
              const src = i?.flags?.core?.sourceId || '';
              if (uuid && src === uuid) return true;
              return (i.name || '').toLowerCase().includes('bone-ward fetish');
            });
            if (hasBone) socialArmorTotal += 1;
          }
        } catch (e) { /* ignore */ }
        systemData.details.socialArmor.value = socialArmorTotal;
      } catch (e) {
        // No-op on errors; ensure field exists
        if (!systemData.details) systemData.details = {};
        if (!systemData.details.socialArmor) systemData.details.socialArmor = { value: 0 };
      }

      // Calculate characteristic usage tracking
      for (let [key, characteristic] of Object.entries(systemData.characteristics)) {
        if (characteristic.uses >= characteristic.rank * 10) {
          characteristic.canAdvance = true;
        }
      }

      // Handle attributes
      for (let [k, v] of Object.entries(systemData.attributes)) {
        v.label = game.i18n.localize(CONFIG.BITE_BULLET.attributes[k]) ?? k;
      }
    }
  
    /**
     * Prepare NPC type specific data.
     */
    _prepareNpcData(actorData) {
      if (actorData.type !== 'npc') return;
  
      // Make modifications to data here. For example:
      const systemData = actorData.system;
    }
  
    /**
     * Override getRollData() that's supplied to rolls.
     */
    getRollData() {
      const data = super.getRollData();
  
      // Prepare character roll data.
      this._getCharacterRollData(data);
      this._getNpcRollData(data);
  
      return data;
    }
  
    /**
     * Prepare character roll data.
     */
    _getCharacterRollData(data) {
      if (this.type !== 'character') return;
  
      // Add level for easier access, or fall back to 0.
      if (data.attributes.vigor) {
        data.vig = data.attributes.vigor.value ?? 0;
      }
  
      if (data.attributes.presence) {
        data.pre = data.attributes.presence.value ?? 0;
      }
  
      if (data.attributes.faith) {
        data.fth = data.attributes.faith.value ?? 0;
      }
    }
  
    /**
     * Prepare NPC roll data.
     */
    _getNpcRollData(data) {
      if (this.type !== 'npc') return;
  
      // Process additional NPC data here.
    }
  
    /**
     * Roll a Save
     * @param {string} attributeName - The attribute to save against
     * @param {Object} options - Roll options
     */
    async rollSave(attributeName, options = {}) {
      const attribute = this.system.attributes[attributeName];
      if (!attribute) return;
  
      const rollData = this.getRollData();
      const formula = `1d20`;
      const roll = new Roll(formula, rollData);
      
      await roll.evaluate();
      
      const success = roll.total <= attribute.value;
      const cap = (s) => (s && typeof s === 'string') ? s.charAt(0).toUpperCase() + s.slice(1) : '';
      
      // Create chat message
      const messageData = {
        speaker: ChatMessage.getSpeaker({actor: this}),
        content: `
          <div class="bite-bullet save-roll">
            <h3>${this.name} - ${cap(attributeName)} Save</h3>
            <div class="roll-result ${success ? 'success' : 'failure'}">
              <strong>Rolled:</strong> ${roll.total} vs Target: ${attribute.value}
              <div class="result">${success ? 'Success!' : 'Failure!'}</div>
            </div>
          </div>
        `,
        sound: CONFIG.sounds.dice
      };
  
      ChatMessage.create(messageData);
      return roll;
    }
  
    /**
     * Roll a Characteristic
     * @param {string} characteristicName - The characteristic to use
     * @param {Object} options - Roll options
     */
    async rollCharacteristic(characteristicName, options = {}) {
      const characteristic = this.system.characteristics[characteristicName];
      if (!characteristic) return;

      // Enforce tap rule: cannot tap the same characteristic again until two others have been used
      const scope = 'bite-the-bullet';
      let history = await this.getFlag(scope, 'tapsHistory');
      if (!Array.isArray(history)) history = [];
      const recent = history.slice(-2);
      if (recent.includes(characteristicName)) {
        ui.notifications.warn(`You must use at least two other characteristics before tapping ${characteristicName} again.`);
        return;
      }

      // Mark as used
      characteristic.uses += 1;
      await this.update({[`system.characteristics.${characteristicName}.uses`]: characteristic.uses});

      // Update history (keep last 10 taps)
      history.push(characteristicName);
      if (history.length > 10) history = history.slice(-10);
      await this.setFlag(scope, 'tapsHistory', history);

      // Create chat message
      const messageData = {
        speaker: ChatMessage.getSpeaker({actor: this}),
        content: `
          <div class="bite-bullet characteristic-roll">
            <h3>${this.name} tapped ${(characteristicName && typeof characteristicName === 'string') ? characteristicName.charAt(0).toUpperCase() + characteristicName.slice(1) : ''}</h3>
            <div class="characteristic-detail">
              <strong>Rank:</strong> ${characteristic.rank}<br>
              <strong>Description:</strong> ${characteristic.description}<br>
              <strong>Uses:</strong> ${characteristic.uses}/${characteristic.rank * 10}
            </div>
          </div>
        `
      };
  
      ChatMessage.create(messageData);
    }
  
    /**
     * Roll an Act of Faith
     * @param {string} scale - The scale of the act (trivial, minor, moderate, major, legendary)
     * @param {string} description - Description of the act
     */
    async rollActOfFaith(scale, description = "") {
      const faithScale = CONFIG.BITE_BULLET.faithScale[scale];
      if (!faithScale) return;
  
      const reserve = this.system.resources.reserve.value;
      if (reserve < faithScale.reserve) {
        ui.notifications.warn(`Not enough Reserve! Need ${faithScale.reserve}, have ${reserve}`);
        return;
      }
  
      const faithAttr = this.system.attributes.faith;
      const modifier = faithScale.modifier === "special" ? -4 : faithScale.modifier;
      const formula = `1d20`;
      const roll = new Roll(formula, this.getRollData());
      
      await roll.evaluate({async: true});
      
      const target = faithAttr.value + modifier;
      const success = roll.total <= target;
      const cap = (s) => (s && typeof s === 'string') ? s.charAt(0).toUpperCase() + s.slice(1) : '';
      
      // On failure, take damage
      if (!success) {
        const damageRoll = new Roll(`${faithScale.reserve}d6`);
        await damageRoll.evaluate({async: true});
        
        const currentSand = this.system.resources.sand.value;
        const newSand = Math.max(0, currentSand - damageRoll.total);
        await this.update({"system.resources.sand.value": newSand});
        
        // If sand goes negative, apply to Faith
        if (currentSand - damageRoll.total < 0) {
          const excessDamage = Math.abs(currentSand - damageRoll.total);
          const newFaith = Math.max(0, faithAttr.value - excessDamage);
          await this.update({"system.attributes.faith.value": newFaith});
        }
      }
  
      const messageData = {
        speaker: ChatMessage.getSpeaker({actor: this}),
        content: `
          <div class="bite-bullet faith-roll">
            <h3>${this.name} - Act of Faith (${cap(scale)})</h3>
            <div class="faith-description">${description}</div>
            <div class="roll-result ${success ? 'success' : 'failure'}">
              <strong>Rolled:</strong> ${roll.total} vs Target: ${target}
              <div class="result">${success ? 'Success!' : 'Failure!'}</div>
              ${!success ? `<div class="damage">Damage: ${damageRoll.total}</div>` : ''}
            </div>
          </div>
        `,
        sound: CONFIG.sounds.dice
      };
  
      ChatMessage.create(messageData);
      return roll;
    }
  }