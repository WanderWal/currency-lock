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

// ─── Block updates on the data layer ────────────────────────────────────────

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

Hooks.on('preUpdateActor', (actor, changes, _options, userId) => {
  if (!game.settings.get(MODULE_ID, 'enabled')) return;

  // Let GMs through unconditionally
  const user = game.users.get(userId);
  if (user?.isGM) return;

  if (touchesCurrency(changes)) {
    // Only warn for the local client — avoids duplicate toasts when the GM
    // triggers an update that is also evaluated on connected player clients.
    if (game.userId === userId) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.locked`));
    }
    return false; // Cancel the update
  }
});

// ─── Lock the sheet UI ───────────────────────────────────────────────────────

/**
 * Applies read-only styling to currency inputs so players receive immediate
 * visual feedback that the fields are locked.
 */
function lockCurrencyInputs(html) {
  // Works for dnd5e v3/v4 and most other systems that follow the same markup.
  // Selector targets:
  //   .currency input          — sheet containers with class "currency"
  //   [name*="currency"] input — inputs nested under a labelled currency element
  //   input[name*="currency"]  — inputs whose own name contains "currency"
  const inputs = html[0].querySelectorAll(
    '.currency input, [name*="currency"] input, input[name*="currency"]'
  );

  for (const input of inputs) {
    input.setAttribute('readonly', true);
    input.classList.add('currency-lock--locked');
    // Prevent spinner arrows on number inputs
    input.setAttribute('tabindex', '-1');
  }
}

Hooks.on('renderActorSheet', (app, html, _data) => {
  if (!game.settings.get(MODULE_ID, 'enabled')) return;
  if (game.user.isGM) return;

  lockCurrencyInputs(html);
});

// ApplicationV2-style sheets emit 'renderApplication' or use a different
// lifecycle. Catch both the legacy and the v13 app rendering hooks.
Hooks.on('renderApplication', (app, html, _data) => {
  if (!game.settings.get(MODULE_ID, 'enabled')) return;
  if (game.user.isGM) return;
  if (!(app instanceof ActorSheet)) return;

  lockCurrencyInputs(html);
});
