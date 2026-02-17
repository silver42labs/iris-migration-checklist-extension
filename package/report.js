/**
 * Report renderer — reads the sectioned comparison report from storage
 * and renders collapsible, entity-aware diff sections.
 */

import { loadReport } from './storage.js';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('report');

    try {
        const report = await loadReport();

        if (!report) {
            const p = document.createElement('p');
            p.className = 'error';
            p.textContent = 'No comparison data found. Run a comparison from the extension popup first.';
            container.appendChild(p);
            return;
        }

        renderReport(container, report);
    } catch (err) {
        const p = document.createElement('p');
        p.className = 'error';
        p.textContent = `Failed to load report: ${err.message}`;
        container.appendChild(p);
    }
});

/* ------------------------------------------------------------------ */
/*  Top-level report                                                   */
/* ------------------------------------------------------------------ */

function renderReport(container, report) {
    // ---- Header ----
    const header = document.createElement('header');

    const h1 = document.createElement('h1');
    h1.textContent = 'Migration Comparison Report';
    header.appendChild(h1);

    const dl = document.createElement('dl');
    dl.className = 'meta';
    const metaItems = [
        ['Saved Server', report.savedServer],
        ['Current Server', report.currentServer],
        ['Saved At', formatTimestamp(report.savedTimestamp)],
        ['Compared At', formatTimestamp(report.timestamp)]
    ];
    for (const [label, value] of metaItems) {
        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.textContent = value;
        dl.appendChild(dt);
        dl.appendChild(dd);
    }
    header.appendChild(dl);

    container.appendChild(header);

    // ---- Zero-diff shortcut ----
    if (report.totalDifferences === 0) {
        const msg = document.createElement('p');
        msg.className = 'success banner';
        msg.textContent = 'No differences found — servers are in sync.';
        container.appendChild(msg);
        return;
    }

    // ---- Global summary ----
    const summaryEl = document.createElement('section');
    summaryEl.className = 'global-summary';
    const h2 = document.createElement('h2');
    h2.textContent = `${report.totalDifferences} difference${report.totalDifferences !== 1 ? 's' : ''} found`;
    summaryEl.appendChild(h2);
    container.appendChild(summaryEl);

    // ---- Render each section ----
    for (const section of report.sections) {
        const sectionEl = renderSection(section);
        container.appendChild(sectionEl);
    }
}

/* ------------------------------------------------------------------ */
/*  Section rendering                                                  */
/* ------------------------------------------------------------------ */

function renderSection(section) {
    const wrapper = document.createElement('section');
    wrapper.className = 'entity-section';

    // Collapsible header
    const details = document.createElement('details');
    details.open = section.totalDifferences > 0;

    const summary = document.createElement('summary');
    buildSectionHeader(summary, section);
    details.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'section-body';

    if (section.totalDifferences === 0) {
        const msg = document.createElement('p');
        msg.className = 'in-sync-msg';
        msg.textContent = 'All items are in sync.';
        body.appendChild(msg);
    } else if (section.strategy === 'entity') {
        renderEntityBody(body, section);
    } else {
        renderFlatBody(body, section);
    }

    details.appendChild(body);
    wrapper.appendChild(details);
    return wrapper;
}

function buildSectionHeader(container, section) {
    const label = document.createElement('span');
    label.className = 'section-label';
    label.textContent = section.label;
    container.appendChild(label);

    container.appendChild(document.createTextNode(' '));

    const badge = document.createElement('span');
    if (section.totalDifferences > 0) {
        badge.className = 'section-badge diff';
        badge.textContent = section.totalDifferences;
    } else {
        badge.className = 'section-badge sync';
        badge.textContent = '✓';
    }
    container.appendChild(badge);
}

/* ------------------------------------------------------------------ */
/*  Entity strategy body                                               */
/* ------------------------------------------------------------------ */

function renderEntityBody(body, section) {
    // Missing entities
    if (section.missing.length > 0) {
        body.appendChild(renderEntityList(
            'Missing in Current Server',
            'missing',
            section.missing.map(m => m.entity),
            true
        ));
    }

    // Extra entities
    if (section.extra.length > 0) {
        body.appendChild(renderEntityList(
            'Extra in Current Server',
            'extra',
            section.extra.map(e => e.entity),
            true
        ));
    }

    // Matched entities with property diffs
    const changed = section.matched.filter(m => m.differences.length > 0);
    if (changed.length > 0) {
        const changedSection = document.createElement('div');
        changedSection.className = 'diff-group changed';

        const h4 = document.createElement('h4');
        h4.textContent = 'Changed Properties';
        changedSection.appendChild(h4);

        for (const entity of changed) {
            changedSection.appendChild(renderPropertyDiffTable(entity));
        }

        body.appendChild(changedSection);
    }

    // In-sync count
    const inSync = section.matched.filter(m => m.differences.length === 0);
    if (inSync.length > 0) {
        const syncEl = document.createElement('p');
        syncEl.className = 'in-sync-msg';
        syncEl.textContent = `${inSync.length} item${inSync.length !== 1 ? 's' : ''} in sync: ${inSync.map(m => m.id).join(', ')}`;
        body.appendChild(syncEl);
    }

    // Child sections (e.g. namespace children)
    if (section.childSections && section.childSections.length > 0) {
        const childWrapper = document.createElement('div');
        childWrapper.className = 'child-sections';

        // Group child sections by parentId
        const grouped = groupBy(section.childSections, 'parentId');

        for (const [parentId, childSections] of grouped) {
            const parentBlock = document.createElement('div');
            parentBlock.className = 'child-parent-block';

            const parentHeader = document.createElement('h4');
            parentHeader.className = 'child-parent-header';
            parentHeader.textContent = `Namespace: ${parentId}`;
            parentBlock.appendChild(parentHeader);

            for (const child of childSections) {
                parentBlock.appendChild(renderSection(child));
            }

            childWrapper.appendChild(parentBlock);
        }

        body.appendChild(childWrapper);
    }
}

/* ------------------------------------------------------------------ */
/*  Flat strategy body                                                 */
/* ------------------------------------------------------------------ */

function renderFlatBody(body, section) {
    if (section.missing.length > 0) {
        body.appendChild(renderEntityList(
            'Missing in Current Server',
            'missing',
            section.missing
        ));
    }

    if (section.extra.length > 0) {
        body.appendChild(renderEntityList(
            'Extra in Current Server',
            'extra',
            section.extra
        ));
    }
}

/* ------------------------------------------------------------------ */
/*  Reusable rendering components                                      */
/* ------------------------------------------------------------------ */

/**
 * Render a list of entity objects as a styled block.
 * If idOnly is true, only shows the entity ID (no property details).
 */
function renderEntityList(title, type, entities, idOnly = false) {
    const block = document.createElement('div');
    block.className = `diff-group ${type}`;

    const h4 = document.createElement('h4');
    h4.textContent = `${title} (${entities.length})`;
    block.appendChild(h4);

    const list = document.createElement('div');
    list.className = 'entity-card-list';

    for (const entity of entities) {
        const card = document.createElement('div');
        card.className = `entity-card ${type}`;

        const id = entity.id || entity.name || '';
        if (id) {
            const idEl = document.createElement('div');
            idEl.className = 'entity-card-id';
            idEl.textContent = id;
            card.appendChild(idEl);
        }

        if (!idOnly) {
            const propsEl = document.createElement('dl');
            propsEl.className = 'entity-card-props';

            for (const [key, value] of Object.entries(entity)) {
                if (key === 'id') continue;
                const dt = document.createElement('dt');
                dt.textContent = key;
                const dd = document.createElement('dd');
                dd.textContent = formatPropValue(value);
                propsEl.appendChild(dt);
                propsEl.appendChild(dd);
            }

            card.appendChild(propsEl);
        }
        list.appendChild(card);
    }

    block.appendChild(list);
    return block;
}

/**
 * Render a per-entity property diff table.
 */
function renderPropertyDiffTable(entity) {
    const wrapper = document.createElement('div');
    wrapper.className = 'prop-diff-block';

    const header = document.createElement('div');
    header.className = 'prop-diff-header';
    header.textContent = entity.id;
    wrapper.appendChild(header);

    const table = document.createElement('table');
    table.className = 'prop-diff-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const text of ['Property', 'Saved Value', 'Current Value']) {
        const th = document.createElement('th');
        th.textContent = text;
        headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    for (const diff of entity.differences) {
        const tr = document.createElement('tr');

        const tdProp = document.createElement('td');
        tdProp.className = 'prop-name';
        tdProp.textContent = diff.property;
        tr.appendChild(tdProp);

        const tdSaved = document.createElement('td');
        tdSaved.className = 'prop-value saved';
        appendValueCell(tdSaved, diff.saved);
        tr.appendChild(tdSaved);

        const tdCurrent = document.createElement('td');
        tdCurrent.className = 'prop-value current';
        appendValueCell(tdCurrent, diff.current);
        tr.appendChild(tdCurrent);

        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function appendValueCell(container, value) {
    if (value === undefined) {
        const span = document.createElement('span');
        span.className = 'empty';
        span.textContent = '—';
        container.appendChild(span);
    } else if (value === null) {
        const span = document.createElement('span');
        span.className = 'null';
        span.textContent = 'null';
        container.appendChild(span);
    } else if (typeof value === 'object') {
        const pre = document.createElement('pre');
        pre.textContent = JSON.stringify(value, null, 2);
        container.appendChild(pre);
    } else {
        container.textContent = String(value);
    }
}

function formatPropValue(value) {
    if (value === undefined || value === null) return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function formatTimestamp(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

function groupBy(arr, key) {
    const map = new Map();
    for (const item of arr) {
        const k = item[key];
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(item);
    }
    return map;
}
