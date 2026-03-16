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

function isCharacterActorSheet(app) {
  const actor = app?.actor ?? app?.document;
  return actor?.documentName === 'Actor' && actor?.type === 'character';
}

// ─── Lock the character sheet UI ─────────────────────────────────────────────

function lockCurrencyInputs(rendered) {
  const root = rendered?.[0] ?? rendered;
  if (!(root instanceof HTMLElement)) return;

  const inputs = root.querySelectorAll(
    '.currency input, [name*="currency"] input, input[name*="currency"]'
  );

  for (const input of inputs) {
    input.setAttribute('readonly', true);
    input.classList.add('currency-lock--locked');
    input.setAttribute('tabindex', '-1');
  }
}

function applySheetLock(app, rendered) {
  if (!game.settings.get(MODULE_ID, 'enabled')) return;
  if (game.user.isGM) return;
  if (!isCharacterActorSheet(app)) return;

  lockCurrencyInputs(rendered);
}

Hooks.on('preUpdateActor', (actor, changes, _options, userId) => {
  if (!game.settings.get(MODULE_ID, 'enabled')) return;

  const user = game.users.get(userId);
  if (user?.isGM) return;
  if (actor.type !== 'character') return;
  if (!touchesCurrency(changes)) return;

  const hasOpenSheet = actor.sheet?.rendered === true;
  if (!hasOpenSheet) return;

  if (game.userId === userId) {
    ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.locked`));
  }

  return false;
});

Hooks.on('renderActorSheet', (app, html) => {
  applySheetLock(app, html);
});

Hooks.on('renderActorSheetV2', (app, element) => {
  applySheetLock(app, element);
});

Hooks.on('renderActorSheet5eCharacter', (app, html) => {
  applySheetLock(app, html);
});

Hooks.on('renderActorSheet5eCharacter2', (app, element) => {
  applySheetLock(app, element);
});
