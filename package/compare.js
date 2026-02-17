/**
 * Comparison engine — entity-aware diff between two migration snapshots.
 *
 * Uses the entity registry to route each top-level collection to the
 * appropriate comparison strategy (ID-based or flat multiset).
 *
 * Output is a sectioned report: one section per entity type, each with
 * its own summary and structured diff data.
 */

import { registry } from './registry.js';
import { entityCompare } from './strategies/entityCompare.js';
import { flatCompare } from './strategies/flatCompare.js';

/**
 * Compare two snapshots and produce a structured, sectioned report.
 *
 * @param {object} saved   - Previously saved snapshot.
 * @param {object} current - Freshly fetched snapshot.
 * @returns {{ timestamp: string, totalDifferences: number, sections: Array }}
 */
export function compare(saved, current) {
    const sections = [];
    let totalDifferences = 0;

    for (const config of registry) {
        const savedArr = saved[config.key] || [];
        const currentArr = current[config.key] || [];

        const section = compareSection(config, savedArr, currentArr);
        totalDifferences += section.totalDifferences;
        sections.push(section);
    }

    return {
        timestamp: new Date().toISOString(),
        totalDifferences,
        sections
    };
}

/* ------------------------------------------------------------------ */
/*  Section-level comparison                                           */
/* ------------------------------------------------------------------ */

/**
 * Compare a single section (top-level entity collection).
 *
 * @param {import('./registry.js').EntityConfig} config
 * @param {object[]} savedArr
 * @param {object[]} currentArr
 * @returns {object} Section result
 */
function compareSection(config, savedArr, currentArr) {
    if (config.strategy === 'flat') {
        return buildFlatSection(config, savedArr, currentArr);
    }

    // --- Entity (id-based) strategy ---
    const result = entityCompare(savedArr, currentArr, config.idField, getChildKeys(config));

    // If the entity has children (e.g. namespaces), diff those too
    let childSections = null;
    if (config.children && config.children.length > 0) {
        childSections = compareChildren(config, result, savedArr, currentArr);
    }

    const sectionDiffs = result.summary.missing
        + result.summary.extra
        + result.summary.changed
        + (childSections ? childSections.totalChildDifferences : 0);

    return {
        key: config.key,
        label: config.label,
        strategy: 'entity',
        summary: result.summary,
        missing: result.missing,
        extra: result.extra,
        matched: result.matched,
        childSections: childSections ? childSections.sections : null,
        totalDifferences: sectionDiffs
    };
}

/* ------------------------------------------------------------------ */
/*  Children (nested entities within matched parents)                  */
/* ------------------------------------------------------------------ */

/**
 * For parent entities that have children (e.g. namespaces),
 * diff each child collection within every matched parent.
 *
 * @param {import('./registry.js').EntityConfig} parentConfig
 * @param {object} parentResult - entityCompare result for the parent
 * @param {object[]} savedArr
 * @param {object[]} currentArr
 * @returns {{ sections: object[], totalChildDifferences: number }}
 */
function compareChildren(parentConfig, parentResult, savedArr, currentArr) {
    const savedIndex = indexBy(savedArr, parentConfig.idField);
    const currentIndex = indexBy(currentArr, parentConfig.idField);
    const sections = [];
    let totalChildDifferences = 0;

    // Only diff children for parents that exist in both snapshots
    for (const match of parentResult.matched) {
        const parentId = match.id;
        const savedParent = savedIndex.get(parentId) || {};
        const currentParent = currentIndex.get(parentId) || {};

        for (const childConfig of parentConfig.children) {
            const savedChildArr = savedParent[childConfig.key] || [];
            const currentChildArr = currentParent[childConfig.key] || [];

            const childSection = compareSection(childConfig, savedChildArr, currentChildArr);
            childSection.parentId = parentId;
            childSection.parentLabel = parentConfig.label;

            totalChildDifferences += childSection.totalDifferences;
            sections.push(childSection);
        }
    }

    return { sections, totalChildDifferences };
}

/* ------------------------------------------------------------------ */
/*  Flat section builder                                               */
/* ------------------------------------------------------------------ */

/**
 * Build a section result for flat (non-id) comparison.
 */
function buildFlatSection(config, savedArr, currentArr) {
    const result = flatCompare(savedArr, currentArr);
    const sectionDiffs = result.summary.missing + result.summary.extra;

    return {
        key: config.key,
        label: config.label,
        strategy: 'flat',
        summary: result.summary,
        missing: result.missing,
        extra: result.extra,
        totalDifferences: sectionDiffs
    };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Index an array by a field, returning a Map<string, object>.
 */
function indexBy(arr, field) {
    const map = new Map();
    for (const item of arr) {
        const key = item[field];
        if (key !== undefined && key !== null) {
            map.set(String(key), item);
        }
    }
    return map;
}

/**
 * Collect the set of child collection keys for an entity config.
 * These keys should be excluded from property-level diffing since
 * they are compared separately via compareChildren.
 */
function getChildKeys(config) {
    if (!config.children || config.children.length === 0) {
        return new Set();
    }
    return new Set(config.children.map(c => c.key));
}
