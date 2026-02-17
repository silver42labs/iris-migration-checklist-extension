/**
 * Popup UI controller — orchestrates Save and Compare flows.
 */

import { fetchExport } from './api.js';
import { saveSnapshot, loadSnapshot, saveReport, clearAllData } from './storage.js';
import { compare } from './compare.js';
import { ensureExportApiAvailable } from './bootstrap.js';

document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-btn');
    const compareBtn = document.getElementById('compare-btn');
    const clearBtn = document.getElementById('clear-btn');
    const statusEl = document.getElementById('status');

    // Consent dialog elements
    const consentOverlay = document.getElementById('consent-overlay');
    const consentConfirmBtn = document.getElementById('consent-confirm');
    const consentCancelBtn = document.getElementById('consent-cancel');

    saveBtn.addEventListener('click', handleSave);
    compareBtn.addEventListener('click', handleCompare);
    clearBtn.addEventListener('click', handleClear);

    // On load, check if a snapshot exists to enable/update the compare button
    updateSecondaryButtons();

    /* ---- Save Flow ---- */

    async function handleSave() {
        try {
            setStatus('Checking server...', 'info');
            disableButtons(true);

            const baseUrl = await getActiveTabOrigin();

            await ensureHostPermissions(baseUrl);

            await ensureExportApiAvailable(
                baseUrl,
                (msg) => setStatus(msg, 'info'),
                showConsentDialog
            );

            setStatus('Fetching server data...', 'info');
            const snapshot = await fetchExport(baseUrl);

            await saveSnapshot({ snapshot, serverUrl: baseUrl });

            updateSecondaryButtons();
            setStatus(`Data saved from ${baseUrl}`, 'success');
        } catch (err) {
            setStatusError(err);
        } finally {
            disableButtons(false);
        }
    }

    /* ---- Compare Flow ---- */

    async function handleCompare() {
        try {
            disableButtons(true);

            setStatus('Loading saved snapshot...', 'info');
            const saved = await loadSnapshot();
            if (!saved) {
                setStatus('No saved data found. Save a server first.', 'error');
                return;
            }

            const baseUrl = await getActiveTabOrigin();

            await ensureHostPermissions(baseUrl);

            await ensureExportApiAvailable(
                baseUrl,
                (msg) => setStatus(msg, 'info'),
                showConsentDialog
            );

            setStatus('Fetching current server data...', 'info');
            const currentSnapshot = await fetchExport(baseUrl);

            setStatus('Comparing snapshots...', 'info');
            const report = compare(saved.snapshot, currentSnapshot);
            report.savedServer = saved.serverUrl;
            report.currentServer = baseUrl;
            report.savedTimestamp = saved.timestamp;

            await saveReport(report);

            browser.tabs.create({ url: browser.runtime.getURL('report.html') });

            setStatus('Report opened in a new tab.', 'success');
        } catch (err) {
            setStatusError(err);
        } finally {
            disableButtons(false);
        }
    }

    /* ---- Helpers ---- */

    function setStatus(message, type) {
        statusEl.textContent = message;
        statusEl.className = `status ${type}`;
    }

    function setStatusError(err) {
        if (err.webAppUrl) {
            statusEl.innerHTML = '';
            statusEl.className = 'status error';

            const text = document.createTextNode(`Error: ${err.message} `);
            statusEl.appendChild(text);

            const link = document.createElement('a');
            link.href = err.webAppUrl;
            link.target = '_blank';
            link.textContent = 'Open Web Application Config';
            statusEl.appendChild(link);
        } else {
            setStatus(`Error: ${err.message}`, 'error');
        }
    }

    function disableButtons(disabled) {
        saveBtn.disabled = disabled;
        compareBtn.disabled = disabled;
        clearBtn.disabled = disabled;
    }

    async function updateSecondaryButtons() {
        const saved = await loadSnapshot();
        if (saved) {
            const host = extractHost(saved.serverUrl);
            compareBtn.textContent = `Compare to Saved Server (${host})`;
            compareBtn.disabled = false;
            clearBtn.disabled = false;
        } else {
            compareBtn.textContent = 'Compare to Saved Server';
            compareBtn.disabled = true;
            clearBtn.disabled = true;
        }
    }

    /* ---- Clear Saved Data ---- */

    async function handleClear() {
        try {
            disableButtons(true);
            await clearAllData();
            updateSecondaryButtons();
            setStatus('All saved data has been cleared.', 'success');
        } catch (err) {
            setStatus(`Error: ${err.message}`, 'error');
        } finally {
            disableButtons(false);
        }
    }

    /* ---- Consent Dialog ---- */

    /**
     * Show the consent dialog and return a promise that resolves to
     * true (user accepted) or false (user cancelled).
     * @returns {Promise<boolean>}
     */
    function showConsentDialog() {
        return new Promise((resolve) => {
            document.body.classList.add('dialog-open');
            consentOverlay.classList.remove('hidden');

            function cleanup() {
                consentOverlay.classList.add('hidden');
                document.body.classList.remove('dialog-open');
                consentConfirmBtn.removeEventListener('click', onConfirm);
                consentCancelBtn.removeEventListener('click', onCancel);
            }

            function onConfirm() {
                cleanup();
                resolve(true);
            }

            function onCancel() {
                cleanup();
                resolve(false);
            }

            consentConfirmBtn.addEventListener('click', onConfirm);
            consentCancelBtn.addEventListener('click', onCancel);
        });
    }
});

/**
 * Return the origin (protocol + host + port) of the currently active tab.
 */
async function getActiveTabOrigin() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url) {
        throw new Error('Cannot access the current tab URL.');
    }

    const url = new URL(tab.url);
    const origin = url.origin;
    const pathname = url.pathname;

    // Check if '/csp' exists in the path
    const cspIndex = pathname.indexOf('/csp');
    if (cspIndex > 0) {
        // Return origin + everything before '/csp'
        return origin + pathname.substring(0, cspIndex);
    }

    return origin;
}

/**
 * Ensure the extension has host permissions for the given server origin.
 * In Firefox MV3, host_permissions are not auto-granted at install,
 * so we request them at runtime (requires user gesture context).
 */
async function ensureHostPermissions(baseUrl) {
    const origin = new URL(baseUrl).origin;
    const permissions = { origins: [`${origin}/*`] };

    const already = await browser.permissions.contains(permissions);
    if (already) return;

    const granted = await browser.permissions.request(permissions);
    if (!granted) {
        throw new Error(
            'Host permission denied. The extension needs access to the server to fetch data.'
        );
    }
}

/**
 * Extract the hostname (without protocol/port) from a URL string.
 */
function extractHost(urlString) {
    try {
        return new URL(urlString).hostname;
    } catch {
        return urlString;
    }
}
