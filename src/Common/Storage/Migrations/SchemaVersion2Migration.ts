import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';
import { OwnEntry } from '../../Objects/OwnEntry';
import { RawRecords } from '../../Objects/RawRecords';
import { RegexText } from '../../Urls/RegexText';
import { WildcardPattern } from '../../Urls/WildcardPattern';
import { OPERATION_KINDS } from '../../Rules/Types/OperationKinds';
import { LegacyBaseUrl } from './LegacyBaseUrl';
import { StoredRuleRecords } from './StoredRuleRecords';

type RawRecord = Record<string, unknown>;

interface StoredRule {
    rule: RawRecord;
    isActiveProfile: boolean;
}

const LEGACY_TYPE_IDS = Object.freeze({
    AuthToken: 'authToken',
    RegexRedirect: 'regexRedirect',
    RedirectWithStatus: 'redirectWithStatus',
    AddQueryParams: 'addQueryParams',
    RemoveQueryParams: 'removeQueryParams',
    StatusOverride: 'statusOverride',
} as const);

const LEGACY_OPERATOR_IDS = Object.freeze({
    Equals: 'equals',
    Contains: 'contains',
    BaseUrl: 'baseUrl',
} as const);

const SIMULATED_FIELD_IDS = [
    'device',
    'clientIp',
    'country',
];

const HEADER_OPERATION_NAMES: Record<string, string> = Object.freeze({
    set: OPERATION_KINDS.AddOrUpdate,
    append: OPERATION_KINDS.Add,
    remove: OPERATION_KINDS.Remove,
});

const COOKIE_OPERATION_NAMES: Record<string, string> = Object.freeze({
    set: OPERATION_KINDS.AddOrUpdate,
    add: OPERATION_KINDS.Add,
    modify: OPERATION_KINDS.AddOrUpdate,
    remove: OPERATION_KINDS.Remove,
});

const DELAY_KEY = 'delayMs';
const LATENCY_SUFFIX = ' latency';

function strings(record: RawRecord, key: string): string[] {
    const value = record[key];

    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

const { actionOf, criteriaOf, withCriterion } = StoredRuleRecords;

function renamedOperations(action: RawRecord, names: Record<string, string>): RawRecord[] {
    return RawRecords.records(action, 'operations').map(operation => ({
        ...operation,
        op: OwnEntry.of(names, RawRecords.text(operation, 'op')) ?? OPERATION_KINDS.AddOrUpdate,
    }));
}

type TypeMigration = (rule: RawRecord) => RawRecord;

const TYPE_MIGRATIONS: Record<string, TypeMigration> = {
    [LEGACY_TYPE_IDS.AuthToken]: rule => {
        const action = actionOf(rule);
        const scheme = RawRecords.text(action, 'scheme');
        const token = RawRecords.text(action, 'token');
        const headerName = RawRecords.text(action, 'headerName');

        return {
            ...rule,
            type: RULE_TYPE_IDS.RequestHeader,
            action: {
                operations: [
                    {
                        op: OPERATION_KINDS.AddOrUpdate,
                        name: headerName === '' ? 'Authorization' : headerName,
                        value: scheme === '' ? token : `${scheme} ${token}`,
                    },
                ],
            },
        };
    },
    [LEGACY_TYPE_IDS.RegexRedirect]: rule => {
        const action = actionOf(rule);

        return withCriterion(
            /* rule: */ {
                ...rule,
                type: RULE_TYPE_IDS.Redirect,
                action: {
                    target: RawRecords.text(action, 'template'),
                    status: 0,
                },
            },
            /* criterion: */ {
                field: CRITERION_FIELD_IDS.Url,
                op: CRITERION_OPERATOR_IDS.Regex,
                name: '',
                value: RawRecords.text(action, 'regex'),
                negate: false,
            },
        );
    },
    [LEGACY_TYPE_IDS.RedirectWithStatus]: rule => {
        const action = actionOf(rule);

        return {
            ...rule,
            type: RULE_TYPE_IDS.Redirect,
            action: {
                target: RawRecords.text(action, 'targetUrl'),
                status: action['status'] ?? 0,
            },
        };
    },
    [LEGACY_TYPE_IDS.AddQueryParams]: rule => ({
        ...rule,
        type: RULE_TYPE_IDS.QueryParams,
        action: {
            operations: RawRecords.records(
                /* record: */ actionOf(rule),
                /* key: */ 'params',
            ).map(param => ({
                op: OPERATION_KINDS.AddOrUpdate,
                name: RawRecords.text(param, 'key'),
                value: RawRecords.text(param, 'value'),
            })),
        },
    }),
    [LEGACY_TYPE_IDS.RemoveQueryParams]: rule => ({
        ...rule,
        type: RULE_TYPE_IDS.QueryParams,
        action: {
            operations: strings(
                /* record: */ actionOf(rule),
                /* key: */ 'keys',
            ).map(key => ({
                op: OPERATION_KINDS.Remove,
                name: key,
                value: '',
            })),
        },
    }),
    [LEGACY_TYPE_IDS.StatusOverride]: rule => ({
        ...rule,
        type: RULE_TYPE_IDS.MockResponse,
        action: {
            overrideStatus: true,
            status: actionOf(rule)['status'],
            overrideBody: false,
            contentType: '',
            headers: [],
            body: '',
        },
    }),
    [RULE_TYPE_IDS.RequestHeader]: rule => ({
        ...rule,
        action: {
            ...actionOf(rule),
            operations: renamedOperations(
                /* action: */ actionOf(rule),
                /* names: */ HEADER_OPERATION_NAMES,
            ),
        },
    }),
    [RULE_TYPE_IDS.ResponseHeader]: rule => ({
        ...rule,
        action: {
            ...actionOf(rule),
            operations: renamedOperations(
                /* action: */ actionOf(rule),
                /* names: */ HEADER_OPERATION_NAMES,
            ),
        },
    }),
    [RULE_TYPE_IDS.RequestCookie]: rule => ({
        ...rule,
        action: {
            ...actionOf(rule),
            op: OwnEntry.of(
                /* table: */ COOKIE_OPERATION_NAMES,
                /* key: */ RawRecords.text(actionOf(rule), 'op'),
            ) ?? OPERATION_KINDS.AddOrUpdate,
        },
    }),
    [RULE_TYPE_IDS.ResponseCookie]: rule => ({
        ...rule,
        action: {
            ...actionOf(rule),
            op: OwnEntry.of(
                /* table: */ COOKIE_OPERATION_NAMES,
                /* key: */ RawRecords.text(actionOf(rule), 'op'),
            ) ?? OPERATION_KINDS.Add,
        },
    }),
    [RULE_TYPE_IDS.MockResponse]: rule => ({
        ...rule,
        action: {
            ...actionOf(rule),
            overrideStatus: true,
            overrideBody: true,
        },
    }),
};

const KEPT_TYPE_IDS: string[] = Object.values(RULE_TYPE_IDS);

type OperatorMigration = (value: string) => {
    op: string;
    value: string;
};

const OPERATOR_MIGRATIONS: Record<string, OperatorMigration> = {
    [LEGACY_OPERATOR_IDS.Equals]: value => ({
        op: CRITERION_OPERATOR_IDS.Wildcard,
        value: WildcardPattern.escape(value),
    }),
    [LEGACY_OPERATOR_IDS.Contains]: value => ({
        op: CRITERION_OPERATOR_IDS.Wildcard,
        value: `*${WildcardPattern.escape(value)}*`,
    }),
    [LEGACY_OPERATOR_IDS.BaseUrl]: value => ({
        op: CRITERION_OPERATOR_IDS.Regex,
        value: `^${RegexText.escape(LegacyBaseUrl.trimmed(value))}(?:[/?#].*)?$`,
    }),
};

function migratedCriterion(criterion: RawRecord): RawRecord {
    const migration = OwnEntry.of(OPERATOR_MIGRATIONS, RawRecords.text(criterion, 'op'));

    return migration == null
        ? criterion
        : {
            ...criterion,
            ...migration(RawRecords.text(criterion, 'value')),
        };
}

function migratedCriteria(rule: RawRecord): RawRecord {
    const criteria = criteriaOf(rule);
    const items = RawRecords.records(criteria, 'items');
    const kept = items.filter(item => !SIMULATED_FIELD_IDS.includes(RawRecords.text(item, 'field')));

    return {
        ...rule,
        enabled: kept.length === items.length ? rule['enabled'] : false,
        criteria: {
            ...criteria,
            items: kept.map(migratedCriterion),
        },
    };
}

function withoutDelay(rule: RawRecord): RawRecord[] {
    const action = actionOf(rule);
    const delay = action[DELAY_KEY];
    if (rule['type'] === RULE_TYPE_IDS.Delay || typeof delay !== 'number') {
        return [rule];
    }

    const { [DELAY_KEY]: _removed, ...rest } = action;
    const plain = {
        ...rule,
        action: rest,
    };
    if (delay <= 0) {
        return [plain];
    }

    return [
        {
            ...rule,
            id: `${RawRecords.text(rule, 'id')}-latency`,
            name: `${RawRecords.text(rule, 'name')}${LATENCY_SUFFIX}`,
            type: RULE_TYPE_IDS.Delay,
            action: {
                [DELAY_KEY]: delay,
            },
        },
        plain,
    ];
}

function typedRule(rule: RawRecord): RawRecord {
    const migration = OwnEntry.of(TYPE_MIGRATIONS, RawRecords.text(rule, 'type'));

    return migration == null ? rule : migration(rule);
}

function isKept(rule: RawRecord): boolean {
    return KEPT_TYPE_IDS.includes(RawRecords.text(
        /* record: */ typedRule(rule),
        /* key: */ 'type',
    ));
}

function migratedRule(stored: StoredRule): RawRecord[] {
    if (!isKept(stored.rule)) {
        return [];
    }

    return withoutDelay(stored.rule).map(piece => {
        const { profileId: _profileId, ...rule } = migratedCriteria(typedRule(piece));

        return {
            ...rule,
            enabled: stored.isActiveProfile ? rule['enabled'] : false,
        };
    });
}

export const SchemaVersion2Migration = {
    rulesOf(settings: RawRecord): RawRecord[] {
        const activeProfileId = RawRecords.text(settings, 'activeProfileId');

        return RawRecords.records(settings, 'rules').flatMap(rule => migratedRule({
            rule,
            isActiveProfile: activeProfileId === ''
                || RawRecords.text(rule, 'profileId') === ''
                || RawRecords.text(rule, 'profileId') === activeProfileId,
        }));
    },
};
