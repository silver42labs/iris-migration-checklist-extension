/**
 * Entity Registry — declarative configuration of every entity type in
 * the migration export JSON.
 *
 * Each entry tells the comparison engine:
 *   - key:       property name in the export root (or within a namespace)
 *   - label:     human-readable display name
 *   - strategy:  'entity' (id-based two-phase) | 'flat' (multiset)
 *   - idField:   which property identifies unique items ('id' by default)
 *   - children:  nested entity definitions (for namespaces)
 *
 * Adding a new entity type = adding an entry here. No strategy code changes.
 */

/**
 * @typedef {object} EntityConfig
 * @property {string}  key        - Property name in the JSON payload
 * @property {string}  label      - Human-readable display name
 * @property {'entity'|'flat'} strategy - Comparison strategy
 * @property {string}  [idField]  - Field used as unique identifier (default 'id')
 * @property {EntityConfig[]} [children] - Nested entity definitions
 */

/** @type {EntityConfig[]} */
export const registry = [
    {
        key: 'namespaceConfig',
        label: 'Namespace Configuration',
        strategy: 'entity',
        idField: 'id'
    },
    {
        key: 'tasks',
        label: 'Scheduled Tasks',
        strategy: 'entity',
        idField: 'id'
    },
    {
        key: 'webApplications',
        label: 'Web Applications',
        strategy: 'entity',
        idField: 'id'
    },
    {
        key: 'sqlConnections',
        label: 'SQL Gateway Connections',
        strategy: 'entity',
        idField: 'id'
    },
    {
        key: 'users',
        label: 'Users',
        strategy: 'entity',
        idField: 'id'
    },
    {
        key: 'roles',
        label: 'Roles',
        strategy: 'entity',
        idField: 'id'
    },
    {
        key: 'resources',
        label: 'Resources',
        strategy: 'entity',
        idField: 'id'
    },
    {
        key: 'ssl',
        label: 'Ssl Configurations',
        strategy: 'entity',
        idField: 'id'
    },
    {
        key: 'namespaces',
        label: 'Namespaces',
        strategy: 'entity',
        idField: 'id',
        children: [
            {
                key: 'classes',
                label: 'Classes',
                strategy: 'entity',
                idField: 'id'
            },
            {
                key: 'globals',
                label: 'Globals',
                strategy: 'entity',
                idField: 'id'
            },
            {
                key: 'credentials',
                label: 'Credentials',
                strategy: 'entity',
                idField: 'id'
            },
            {
                key: 'productionItems',
                label: 'Production Items',
                strategy: 'entity',
                idField: 'id'
            },
            {
                key: 'lookups',
                label: 'Lookup Tables',
                strategy: 'flat'
            }
        ]
    }
];
