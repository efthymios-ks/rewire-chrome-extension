import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';
import { RawRecords } from '../../Objects/RawRecords';
import { LegacyBaseUrl } from './LegacyBaseUrl';
import { StoredRuleRecords } from './StoredRuleRecords';

type RawRecord = Record<string, unknown>;

const LEGACY_REDIRECT_TYPE_ID = 'redirect';
const LEGACY_MIRROR_TYPE_ID = 'environmentMirror';
const SILENT_REDIRECT_STATUS = 0;

const { actionOf, withCriterion } = StoredRuleRecords;

function fromLegacyRedirect(rule: RawRecord): RawRecord {
    const action = actionOf(rule);
    const status = Number(action['status'] ?? SILENT_REDIRECT_STATUS);
    if (status === SILENT_REDIRECT_STATUS) {
        return {
            ...rule,
            type: RULE_TYPE_IDS.Rewrite,
            action: {
                target: RawRecords.text(action, 'target'),
            },
        };
    }

    return {
        ...rule,
        type: RULE_TYPE_IDS.Redirect,
        action: {
            target: RawRecords.text(action, 'target'),
            status,
        },
    };
}

function fromLegacyMirror(rule: RawRecord): RawRecord {
    const action = actionOf(rule);
    const sourceBase = RawRecords.text(action, 'sourceBase');
    const targetBase = RawRecords.text(action, 'targetBase');
    const rewrite: RawRecord = {
        ...rule,
        type: RULE_TYPE_IDS.Rewrite,
        action: {
            target: LegacyBaseUrl.mirrorTarget(targetBase),
        },
    };
    if (sourceBase === '') {
        return rewrite;
    }

    return withCriterion(rewrite, {
        field: CRITERION_FIELD_IDS.Url,
        op: CRITERION_OPERATOR_IDS.Regex,
        name: '',
        value: LegacyBaseUrl.mirrorRegex(sourceBase),
        negate: false,
    });
}

const LEGACY_TYPE_MIGRATIONS = new Map<string, (rule: RawRecord) => RawRecord>([
    [LEGACY_REDIRECT_TYPE_ID, fromLegacyRedirect],
    [LEGACY_MIRROR_TYPE_ID, fromLegacyMirror],
]);

function migrateRule(rule: RawRecord): RawRecord {
    const migration = LEGACY_TYPE_MIGRATIONS.get(RawRecords.text(rule, 'type'));

    return migration == null ? rule : migration(rule);
}

export const SchemaVersion3Migration = {
    migrate(rules: RawRecord[]): RawRecord[] {
        return rules.map(migrateRule);
    },
};
