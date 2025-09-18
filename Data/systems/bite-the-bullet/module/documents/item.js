/**
 * Bite the Bullet - Item Document
 */

export class BiteBulletItem extends Item {
  /**
   * Generic item roll entrypoint used by macros or sheet buttons
   */
  async roll() {
    switch (this.type) {
      case 'weapon':
        return this.rollDamage();
      case 'gear':
        return this.useGear();
      case 'burden':
        return this.applyBurden();
      default:
        return this._postToChat(`${this.name}`, `No roll available for item type: ${this.type}`);
    }
  }

  /**
   * Roll weapon damage using system.damage (e.g., "1d6")
   */
  async rollDamage() {
    const dmg = this.system.damage || '';
    if (!dmg) return ui.notifications.warn(`${this.name}: No damage formula.`);

    const roll = await (new Roll(dmg)).evaluate({ async: true });
    const content = `
      <div class="bite-bullet damage-roll">
        <h3>${this.name} - Damage</h3>
        <div><strong>Formula:</strong> ${dmg}</div>
        <div class="damage">${roll.total}</div>
      </div>
    `;
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.parent }),
      content,
      sound: CONFIG.sounds.dice
    });
  }

  /**
   * Use a gear item: decrement uses if configured and post to chat
   */
  async useGear() {
    const uses = this.system.uses || {};
    let msg = `${this.name} used.`;
    if (Number.isFinite(uses.value) && Number.isFinite(uses.max)) {
      const newVal = Math.max(0, Number(uses.value) - 1);
      await this.update({ 'system.uses.value': newVal });
      msg = `${this.name} used. (${newVal}/${uses.max} uses left)`;
    }
    return this._postToChat(this.name, msg);
  }

  /**
   * Apply a burden (stub): post its effect to chat
   */
  async applyBurden() {
    const effect = this.system.effect || '';
    const duration = this.system.duration || '';
    const content = `
      <div class="bite-bullet faith-roll">
        <h3>Burden Applied - ${this.name}</h3>
        ${effect ? `<div><strong>Effect:</strong> ${effect}</div>` : ''}
        ${duration ? `<div><strong>Duration:</strong> ${duration}</div>` : ''}
      </div>
    `;
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.parent }),
      content
    });
  }

  /**
   * Helper to post a message to chat
   */
  _postToChat(title, body) {
    const content = `
      <div class="bite-bullet">
        <h3>${title}</h3>
        <div>${body}</div>
      </div>
    `;
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.parent }),
      content
    });
  }
}

