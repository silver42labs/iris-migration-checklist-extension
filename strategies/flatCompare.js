/**
 * Flat comparison strategy — multiset diff for arrays of objects
 * that do not have a unique identifier (e.g. lookup tables).
 *
 * Uses canonical JSON serialisation to detect equal / missing / extra items.
 *
 * @module strategies/flatCompare
 */

/**
 * @typedef {object} FlatDiffResult
 * @property {object[]} missing  - In saved, not in current
 * @property {object[]} extra    - In current, not in saved
 * @property {{ missing: number, extra: number }} summary
 */

/**
 * Compare two arrays as multisets (order-insensitive).
 *
 * @param {object[]} savedArr
 * @param {object[]} currentArr
 * @returns {FlatDiffResult}
 */
export function flatCompare(savedArr, currentArr) {
    const savedMultiset = buildMultiset(savedArr);
    const currentMultiset = buildMultiset(currentArr);

    const missing = [];
    const extra = [];

    // Items in saved but not (or less frequent) in current
    for (const [key, { count, value }] of savedMultiset) {
        const currentCount = currentMultiset.has(key)
            ? currentMultiset.get(key).count
            : 0;
        for (let i = 0; i < count - currentCount; i++) {
            missing.push(value);
        }
    }

    // Items in current but not (or less frequent) in saved
    for (const [key, { count, value }] of currentMultiset) {
        const savedCount = savedMultiset.has(key)
            ? savedMultiset.get(key).count
            : 0;
        for (let i = 0; i < count - savedCount; i++) {
            extra.push(value);
        }
    }

    return {
        missing,
        extra,
        summary: {
            missing: missing.length,
            extra: extra.length
        }
    };
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Build a multiset (Map<canonicalString, { count, value }>) from an array.
 */
function buildMultiset(arr) {
    const map = new Map();
    for (const item of arr) {
        const key = canonicalize(item);
        if (map.has(key)) {
            map.get(key).count++;
        } else {
            map.set(key, { count: 1, value: item });
        }
    }
    return map;
}

/**
 * Produce a deterministic canonical JSON string for any value.
 */
function canonicalize(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        const items = value.map(canonicalize).sort();
        return '[' + items.join(',') + ']';
    }

    const keys = Object.keys(value).sort();
    const pairs = keys.map(k => JSON.stringify(k) + ':' + canonicalize(value[k]));
    return '{' + pairs.join(',') + '}';
}
