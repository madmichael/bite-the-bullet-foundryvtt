/**
 * Minimal burden application helper.
 * For now, it creates a placeholder burden item with the chosen type.
 * Future: implement full d12 table logic per rules document.
 */
export async function applyBurden(actor, type = 'physical') {
  const t = game.i18n.localize.bind(game.i18n);
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  const content = `
    <form>
      <p>${actor.name} has reached 0 Sand. Apply a ${typeLabel} burden?</p>
    </form>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title: `Apply ${typeLabel} Burden`,
      content,
      buttons: {
        ok: {
          label: t('SETTINGS.PerformAct') || 'OK',
          callback: async () => {
            const itemData = {
              name: `${typeLabel} Burden`,
              type: 'burden',
              system: {
                burdenType: type,
                effect: `${typeLabel} burden effect (placeholder)`,
                duration: '',
                remedy: '',
                slots: 0,
                description: `${typeLabel} burden per rules table.`
              }
            };
            await actor.createEmbeddedDocuments('Item', [itemData]);
            resolve(true);
          }
        },
        cancel: { label: t('SETTINGS.Cancel') || 'Cancel', callback: () => resolve(false) }
      },
      default: 'ok'
    }).render(true);
  });
}
