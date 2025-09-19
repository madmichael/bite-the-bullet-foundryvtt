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

      // Calculate characteristic usage tracking and tap states
      this._calculateCharacteristicStates(systemData);

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
     * Calculate characteristic states (advancement, disabled status)
     */
    _calculateCharacteristicStates(systemData) {
      const tapTracking = systemData.tapTracking || { globalTapCounter: 0, lastTappedChar: "", tapHistory: [] };
      const disabledChars = this._getDisabledCharacteristics(tapTracking);
      
      for (let [key, characteristic] of Object.entries(systemData.characteristics)) {
        // Calculate required uses for next rank (rank * 10)
        const requiredUses = characteristic.rank * 10;
        characteristic.canAdvance = characteristic.uses >= requiredUses;
        characteristic.requiredUses = requiredUses;
        characteristic.isDisabled = disabledChars.includes(key);
      }
    }

    /**
     * Determine which characteristics are disabled based on tap history
     */
    _getDisabledCharacteristics(tapTracking) {
      const { tapHistory } = tapTracking;
      if (tapHistory.length === 0) return [];
      
      // Find all characteristics that need to be disabled
      const disabledChars = [];
      const charLastTapIndex = {};
      
      // Find the most recent tap index for each characteristic
      for (let i = tapHistory.length - 1; i >= 0; i--) {
        const char = tapHistory[i];
        if (!(char in charLastTapIndex)) {
          charLastTapIndex[char] = i;
        }
      }
      
      // For each characteristic, check if it should be disabled
      for (const [char, lastIndex] of Object.entries(charLastTapIndex)) {
        // Count unique OTHER characteristics tapped since this char's last tap
        const uniqueOthersSince = new Set();
        for (let i = lastIndex + 1; i < tapHistory.length; i++) {
          if (tapHistory[i] !== char) {
            uniqueOthersSince.add(tapHistory[i]);
          }
        }
        
        // If fewer than 2 other characteristics have been tapped since, disable this one
        if (uniqueOthersSince.size < 2) {
          disabledChars.push(char);
        }
      }
      
      return disabledChars;
    }

    /**
     * Tap a characteristic for bonus/mitigation
     */
    async tapCharacteristic(charKey, context = 'manual') {
      if (this.type !== 'character') return null;
      
      const characteristic = this.system.characteristics[charKey];
      if (!characteristic) {
        ui.notifications.warn(`Characteristic ${charKey} not found.`);
        return null;
      }
      
      // Check if characteristic is disabled
      if (characteristic.isDisabled) {
        ui.notifications.warn(`${charKey} is disabled. You must tap 2 other characteristics first.`);
        return null;
      }
      
      // Update tap tracking
      const tapTracking = foundry.utils.deepClone(this.system.tapTracking || { globalTapCounter: 0, lastTappedChar: "", tapHistory: [] });
      tapTracking.globalTapCounter += 1;
      tapTracking.lastTappedChar = charKey;
      tapTracking.tapHistory.push(charKey);
      
      // Keep tap history reasonable (last 20 taps)
      if (tapTracking.tapHistory.length > 20) {
        tapTracking.tapHistory = tapTracking.tapHistory.slice(-20);
      }
      
      // Increment uses
      const newUses = characteristic.uses + 1;
      
      // Update actor
      await this.update({
        [`system.characteristics.${charKey}.uses`]: newUses,
        'system.tapTracking': tapTracking
      });
      
      // Create chat message
      const bonus = characteristic.rank;
      const requiredUses = characteristic.rank * 10;
      const canAdvanceAfter = newUses >= requiredUses;
      
      let content = `<div class="bite-bullet tap-result">`;
      content += `<h3>${this.name} - Characteristic Tap</h3>`;
      content += `<div><strong>Characteristic:</strong> ${charKey} (Rank ${characteristic.rank})</div>`;
      content += `<div><strong>Bonus:</strong> +${bonus}</div>`;
      content += `<div><strong>Uses:</strong> ${newUses}/${requiredUses}</div>`;
      if (canAdvanceAfter) {
        content += `<div class="advancement-ready"><strong>Ready for Advancement!</strong> Click the + icon to attempt rank advancement.</div>`;
      }
      content += `</div>`;
      
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content,
        sound: CONFIG.sounds.notification
      });
      
      return { bonus, characteristic: charKey, context };
    }

    /**
     * Attempt rank advancement for a characteristic
     */
    async attemptRankAdvancement(charKey) {
      if (this.type !== 'character') return;
      
      const characteristic = this.system.characteristics[charKey];
      if (!characteristic) return;
      
      const requiredUses = characteristic.rank * 10;
      if (characteristic.uses < requiredUses) {
        ui.notifications.warn(`${charKey} needs ${requiredUses - characteristic.uses} more uses before attempting advancement.`);
        return;
      }
      
      if (characteristic.rank >= 10) {
        ui.notifications.info(`${charKey} is already at maximum rank (10).`);
        return;
      }
      
      // Show advancement dialog
      const t = game.i18n.localize.bind(game.i18n);
      const template = `
        <form>
          <div class="form-group">
            <p><strong>Rank Advancement Attempt</strong></p>
            <p>Characteristic: <strong>${charKey}</strong> (Rank ${characteristic.rank})</p>
            <p>Uses: ${characteristic.uses}/${requiredUses}</p>
            <p>Roll 1d6. Success if result > ${characteristic.rank}</p>
          </div>
        </form>
      `;
      
      new Dialog({
        title: `${charKey} Rank Advancement`,
        content: template,
        buttons: {
          roll: {
            label: 'Roll for Advancement',
            callback: async () => {
              const roll = new Roll('1d6');
              await roll.evaluate();
              const result = roll.total;
              const success = result > characteristic.rank;
              
              let content = `<div class="bite-bullet rank-advancement">`;
              content += `<h3>${this.name} - Rank Advancement</h3>`;
              content += `<div><strong>Characteristic:</strong> ${charKey} (Rank ${characteristic.rank})</div>`;
              content += `<div><strong>Roll:</strong> ${result} (needed > ${characteristic.rank})</div>`;
              
              if (success) {
                const newRank = characteristic.rank + 1;
                content += `<div class="success"><strong>SUCCESS!</strong> Rank increased to ${newRank}</div>`;
                
                await this.update({
                  [`system.characteristics.${charKey}.rank`]: newRank,
                  [`system.characteristics.${charKey}.uses`]: 0
                });
              } else {
                content += `<div class="failure"><strong>FAILURE.</strong> Uses reset, try again after ${requiredUses} more uses.</div>`;
                
                await this.update({
                  [`system.characteristics.${charKey}.uses`]: 0
                });
              }
              
              content += `</div>`;
              
              ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: this }),
                content,
                sound: success ? CONFIG.sounds.notification : CONFIG.sounds.lock
              });
            }
          },
          cancel: {
            label: 'Cancel'
          }
        },
        default: 'roll'
      }).render(true);
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
     * @param {number} tapBonus - Tap bonus to subtract from roll (mitigation)
     * @param {string} tappedChar - Name of tapped characteristic
     */
    async rollSave(attributeName, tapBonus = 0, tappedChar = null) {
      const attribute = this.system.attributes[attributeName];
      if (!attribute) return;
  
      const rollData = this.getRollData();
      const formula = `1d20`;
      const roll = new Roll(formula, rollData);
      
      await roll.evaluate();
      
      // Apply tap bonus as mitigation (subtract from roll)
      const finalRoll = Math.max(1, roll.total - tapBonus);
      const success = finalRoll <= attribute.value;
      const cap = (s) => (s && typeof s === 'string') ? s.charAt(0).toUpperCase() + s.slice(1) : '';
      
      // Create chat message
      const messageData = {
        speaker: ChatMessage.getSpeaker({actor: this}),
        content: `
          <div class="bite-bullet save-roll">
            <h3>${this.name} - ${cap(attributeName)} Save</h3>
            <div><strong>Base Roll:</strong> ${roll.total}</div>
            ${tapBonus > 0 ? `<div><strong>Tap Mitigation:</strong> -${tapBonus} (${tappedChar})</div>` : ""}
            <div><strong>Final Roll:</strong> ${finalRoll} vs Target: ${attribute.value}</div>
            <div class="roll-result ${success ? 'success' : 'failure'}">
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