/**
 * Storage layer — abstracts browser.storage.local for snapshots and reports.
 *
 * Uses the compatibility layer so the same code works on Chrome and Firefox.
 */

import { browser } from './platform/browser-polyfill.js';

const SNAPSHOT_KEY = 'savedSnapshot';
const REPORT_KEY = 'comparisonReport';

/**
 * Persist a server snapshot.
 * @param {{ snapshot: object, serverUrl: string }} data
 */
export async function saveSnapshot(data) {
    return browser.storage.local.set({
        [SNAPSHOT_KEY]: {
            snapshot: data.snapshot,
            serverUrl: data.serverUrl,
            timestamp: new Date().toISOString()
        }
    });
}

/**
 * Load the previously saved snapshot.
 * @returns {Promise<{ snapshot: object, serverUrl: string, timestamp: string } | null>}
 */
export async function loadSnapshot() {
    const result = await browser.storage.local.get(SNAPSHOT_KEY);
    return result[SNAPSHOT_KEY] || null;
}

/**
 * Persist a comparison report for the report page to read.
 * @param {object} report
 */
export async function saveReport(report) {
    return browser.storage.local.set({ [REPORT_KEY]: report });
}

/**
 * Load the most recent comparison report.
 * @returns {Promise<object | null>}
 */
export async function loadReport() {
    const result = await browser.storage.local.get(REPORT_KEY);
    return result[REPORT_KEY] || null;
}

/**
 * Remove all stored data (snapshot and report).
 * @returns {Promise<void>}
 */
export async function clearAllData() {
    return browser.storage.local.remove([SNAPSHOT_KEY, REPORT_KEY]);
}
