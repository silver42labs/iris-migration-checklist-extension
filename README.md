# IRIS Migration Checklist

Deploy a migration export API to any InterSystems IRIS/Cache server that exposes `/api/atelier`, capture its configuration snapshot, and compare it against another server in minutes. This extension turns a manual, error-prone migration checklist into a repeatable diff report you can trust.

[![en](https://img.shields.io/badge/lang-en-red.svg)](https://github.com/silveira42/iris-migration-checklist-extension/blob/main/README.md)
[![pt-br](https://img.shields.io/badge/lang-pt--br-green.svg)](https://github.com/silveira42/iris-migration-checklist-extension/blob/main/LEIAME.md)

## How to use

- Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/iris-migration-checklist/anamganabilobholichagldbejkpclag) or [Firefox Add-ons (AMO)](https://addons.mozilla.org/en-US/firefox/addon/iris-migration-checklist/).
- Open the IRIS/Cache Web Portal (or any page) on the target server.
- Click the extension icon and choose "Save Server Data" to capture the baseline.
- Go to another server and choose "Compare to Saved Server".
- A report opens in a new tab with all differences grouped by entity type.

## How to run this extension locally

1. Clone the repository:

    ```bash
    git clone https://github.com/silveira42/iris-migration-checklist-extension.git
    cd iris-migration-checklist-extension
    ```

2. **Chrome/Edge:** Open `chrome://extensions` (or `edge://extensions`), enable "Developer mode", click "Load unpacked" and select this project folder.
3. **Firefox:** Open `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on" and select `manifest.json` from this project folder.

## Technical aspects

### How the extension creates an API inside IRIS

If `/api/v1/migration/framework/export` is not available, the extension uses the Atelier REST API to bootstrap it:

1. A consent dialog asks you to confirm the installation before any changes are made.
2. Uploads [Migration.Framework.cls](Migration.Framework.cls).
3. Compiles the class.
4. Executes a setup procedure that registers `/api/v1/migration/framework`.

If the endpoint is still unavailable, the UI provides a link to the Web Application configuration page and asks you to click Save.

### How the snapshot is stored

The saved snapshot and comparison report live in `browser.storage.local` (or `chrome.storage.local` on Chrome) for this extension only. Data is never sent anywhere other than the IRIS/Cache server you are connected to. You can clear all stored data at any time using the "Clear Saved Data" button in the popup.

### Privacy

This extension includes a [privacy policy](privacy.html) that covers data collection, storage, usage, and the Limited Use disclosure required by the Chrome Web Store and Firefox Add-ons. No data is shared with third parties.

### How one snapshot is compared to the other

The comparison engine routes each section through an appropriate strategy:

- Entity-aware, ID-based diffs for things like users, roles, and web apps.
- Flat multiset diffs for unordered collections like lookup tables.

The report groups differences by entity type and highlights missing, extra, and changed items.

### Project structure

- `popup.html` / `popup.js`: extension UI and workflow.
- `api.js`: export fetching and Atelier API helpers.
- `bootstrap.js`: backend installation orchestration.
- `compare.js`: comparison engine.
- `strategies/`: comparison strategies (`entityCompare`, `flatCompare`).
- `report.html` / `report.js`: report renderer.
- `privacy.html`: privacy policy page.
- `styles.css`: shared styles.

## Contribute

Issues and pull requests are welcome. Please include reproduction steps and sample export data when relevant.
