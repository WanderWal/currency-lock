const MODULE_ID = 'currency-lock';

// ─── Settings ───────────────────────────────────────────────────────────────

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'enabled', {
    name: `${MODULE_ID}.settings.enabled.name`,
    hint: `${MODULE_ID}.settings.enabled.hint`,
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Checks whether an update object touches currency data.
 * Works for the common `system.currency.*` path used by dnd5e, pf2e, etc.
 * Also handles update objects that arrive pre-flattened (dot-notation keys).
 */
function touchesCurrency(changes) {
  // Nested object: { system: { currency: { gp: 5 } } }
  if (changes.system?.currency !== undefined) return true;

  // Dot-notation keys, e.g. "system.currency.gp"
  return Object.keys(changes).some((k) => k.startsWith('system.currency.'));
}

/**
 * Heuristically detect actor updates submitted from a character sheet form.
 * Foundry and system sheets commonly submit with this option combination.
 */
function isActorSheetUpdate(options = {}) {
  if (options.fromSheet === true) return true;
  if (options.actorSheet === true) return true;
  if (options.renderSheet === true) return true;

  return (
    options.diff === true &&
    options.recursive === false &&
    options.render === false &&
    options.noHook !== true
  );
}

// ─── Client-side block for sheet-originated edits ───────────────────────────
// Fires before the socket message is sent, so the server never sees the change.

Hooks.on('preUpdateActor', (actor, changes, options, userId) => {
  if (!game.settings.get(MODULE_ID, 'enabled')) return;

  const user = game.users.get(userId);

  if (!user?.isGM && touchesCurrency(changes) && isActorSheetUpdate(options)) {
    // Warn only on the acting player's client to avoid duplicate toasts.
    if (game.userId === userId) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.locked`));
    }
    return false; // Cancel before the socket message is sent.
  }
});
