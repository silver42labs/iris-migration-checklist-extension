/**
 * Entity comparison strategy — ID-based two-phase diff.
 *
 * Phase 1: Presence — index both arrays by id, find missing / extra.
 * Phase 2: Property diff — for matched IDs, compare every property.
 *
 * @module strategies/entityCompare
 */

/**
 * @typedef {object} EntityDiffResult
 * @property {{ id: string, entity: object }[]} missing  - In saved, not in current
 * @property {{ id: string, entity: object }[]} extra    - In current, not in saved
 * @property {MatchedEntity[]}                  matched  - Present in both
 * @property {{ missing: number, extra: number, changed: number, inSync: number }} summary
 */

/**
 * @typedef {object} MatchedEntity
 * @property {string}   id
 * @property {PropertyDiff[]} differences
 */

/**
 * @typedef {object} PropertyDiff
 * @property {string} property
 * @property {*}      saved
 * @property {*}      current
 */

/**
 * Compare two arrays of entities using the id field.
 *
 * @param {object[]} savedArr   - Entities from the saved snapshot
 * @param {object[]} currentArr - Entities from the current snapshot
 * @param {string}   idField    - Property name used as unique identifier
 * @param {Set<string>} [excludeKeys] - Property names to skip during diff
 * @returns {EntityDiffResult}
 */
export function entityCompare(savedArr, currentArr, idField = 'id', excludeKeys = new Set()) {
    const savedMap = indexById(savedArr, idField);
    const currentMap = indexById(currentArr, idField);

    const missing = [];
    const extra = [];
    const matched = [];

    // Phase 1a: items in saved but not in current
    for (const [id, entity] of savedMap) {
        if (!currentMap.has(id)) {
            missing.push({ id, entity });
        }
    }

    // Phase 1b: items in current but not in saved
    for (const [id, entity] of currentMap) {
        if (!savedMap.has(id)) {
            extra.push({ id, entity });
        }
    }

    // Phase 2: property diff for matched IDs
    let changedCount = 0;
    let inSyncCount = 0;

    for (const [id, savedEntity] of savedMap) {
        if (!currentMap.has(id)) continue;

        const currentEntity = currentMap.get(id);
        const differences = diffProperties(savedEntity, currentEntity, idField, excludeKeys);

        if (differences.length > 0) {
            changedCount++;
        } else {
            inSyncCount++;
        }

        matched.push({ id, differences });
    }

    return {
        missing,
        extra,
        matched,
        summary: {
            missing: missing.length,
            extra: extra.length,
            changed: changedCount,
            inSync: inSyncCount
        }
    };
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Index an array of objects by a given key field.
 * @param {object[]} arr
 * @param {string}   idField
 * @returns {Map<string, object>}
 */
function indexById(arr, idField) {
    const map = new Map();
    for (const item of arr) {
        const id = item[idField];
        if (id !== undefined && id !== null) {
            map.set(String(id), item);
        }
    }
    return map;
}

/**
 * Compare all properties of two objects (excluding the id field itself).
 * Returns an array of property-level diffs.
 *
 * For nested objects/arrays, uses canonical JSON comparison to detect
 * changes without deep-diving into structure (keeps diffs readable).
 *
 * @param {object} saved
 * @param {object} current
 * @param {string} idField - Excluded from comparison
 * @param {Set<string>} [excludeKeys] - Additional keys to skip
 * @returns {PropertyDiff[]}
 */
function diffProperties(saved, current, idField, excludeKeys = new Set()) {
    const diffs = [];

    const allKeys = [...new Set([
        ...Object.keys(saved),
        ...Object.keys(current)
    ])].sort();

    for (const key of allKeys) {
        // Skip the id field and any excluded child keys
        if (key === idField || excludeKeys.has(key)) continue;

        const inSaved = key in saved;
        const inCurrent = key in current;

        if (inSaved && !inCurrent) {
            diffs.push({ property: key, saved: saved[key], current: undefined });
        } else if (!inSaved && inCurrent) {
            diffs.push({ property: key, saved: undefined, current: current[key] });
        } else if (!valuesEqual(saved[key], current[key])) {
            diffs.push({ property: key, saved: saved[key], current: current[key] });
        }
    }

    return diffs;
}

/**
 * Deep equality check using canonical JSON serialisation.
 * Handles primitives, objects, arrays, and null.
 */
function valuesEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
        return canonicalize(a) === canonicalize(b);
    }

    return false;
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
