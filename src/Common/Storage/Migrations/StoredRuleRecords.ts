import { RawRecords } from '../../Objects/RawRecords';

type RawRecord = Record<string, unknown>;

export const StoredRuleRecords = {
    actionOf(rule: RawRecord): RawRecord {
        return RawRecords.is(rule['action']) ? rule['action'] : {};
    },

    criteriaOf(rule: RawRecord): RawRecord {
        return RawRecords.is(rule['criteria']) ? rule['criteria'] : {};
    },

    withCriterion(rule: RawRecord, criterion: RawRecord): RawRecord {
        const criteria = StoredRuleRecords.criteriaOf(rule);

        return {
            ...rule,
            criteria: {
                ...criteria,
                items: [
                    ...RawRecords.records(criteria, 'items'),
                    criterion,
                ],
            },
        };
    },
};
