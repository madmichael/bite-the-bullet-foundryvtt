/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class BiteBulletItemSheet extends foundry.appv1.sheets.ItemSheet {

    /** @override */
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        classes: ["bite-bullet", "sheet", "item"],
        width: 520,
        height: 480,
        tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
      });
    }
  
    /** @override */
    get template() {
      const path = "systems/bite-the-bullet/templates/item";
      // Return a single sheet for all item types.
      // return `${path}/item-sheet.html`;
  
      // Alternatively, you could use the following return statement to do a
      // unique item sheet by type, like `weapon-sheet.html`.
      return `${path}/item-${this.item.type}-sheet.html`;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    getData() {
      // Retrieve base data structure.
      const context = super.getData();
  
      // Use a safe clone of the item data for further operations.
      const itemData = context.item;
  
      // Retrieve the roll data for TinyMCE editors.
      context.rollData = {};
      let actor = this.object?.parent ?? null;
      if (actor) {
        context.rollData = actor.getRollData();
      }
  
      // Add the actor's data to context.data for easier access, as well as flags.
      context.system = itemData.system;
      context.flags = itemData.flags;
  
      // Add config data
      context.config = CONFIG.BITE_BULLET;
  
      return context;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    activateListeners(html) {
      super.activateListeners(html);
  
      // Everything below here is only needed if the sheet is editable
      if (!this.isEditable) return;
  
      // Roll handlers, click handlers, etc. would go here.
      
      // Roll damage for weapons
      html.find('.roll-damage').click(this._onRollDamage.bind(this));
  
      // Use gear
      html.find('.use-gear').click(this._onUseGear.bind(this));
  
      // Apply burden
      html.find('.apply-burden').click(this._onApplyBurden.bind(this));
    }
  
    /**
     * Handle rolling damage for weapons
     * @param {Event} event   The originating click event
     * @private
     */
    async _onRollDamage(event) {
      event.preventDefault();
      if (this.item.type === 'weapon') {
        await this.item.rollDamage();
      }
    }
  
    /**
     * Handle using gear items
     * @param {Event} event   The originating click event
     * @private
     */
    async _onUseGear(event) {
      event.preventDefault();
      if (this.item.type === 'gear') {
        await this.item.useGear();
      }
    }
  
    /**
     * Handle applying burden effects
     * @param {Event} event   The originating click event
     * @private
     */
    async _onApplyBurden(event) {
      event.preventDefault();
      if (this.item.type === 'burden') {
        await this.item.applyBurden();
      }
    }
  }