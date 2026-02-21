/**
 * Browser API compatibility layer.
 *
 * Chrome exposes extension APIs on the `chrome` global.
 * Firefox exposes them on the `browser` global (Promise-based).
 *
 * This module exports a unified `browser` object so the rest of the
 * codebase can use a single API surface regardless of the runtime.
 *
 * In Chrome, `chrome` APIs in Manifest V3 already return Promises for
 * the subset we use (storage, tabs, runtime, permissions), so a simple
 * alias is sufficient — no callback wrapping needed.
 */

const _browser = (typeof browser !== 'undefined' && browser?.runtime)
    ? browser
    : (typeof chrome !== 'undefined' && chrome?.runtime)
        ? chrome
        : null;

if (!_browser) {
    throw new Error(
        'Neither `browser` nor `chrome` global found. ' +
        'This script must run inside a WebExtension context.'
    );
}

export { _browser as browser };
