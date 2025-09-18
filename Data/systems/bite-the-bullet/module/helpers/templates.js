/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function() {
    // Currently no partials to preload; add here as they are created.
    const { loadTemplates } = foundry.applications.handlebars;
    return loadTemplates([]);
  };