import { describe, expect, test, vi } from 'vitest';
import { TIMELINE_LIMITS } from './TimelineLimits';
import type { TimelineRecord } from './TimelineRecord';
import { DefaultTimelineStore } from './DefaultTimelineStore';
import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { RULE_ENGINE } from '../../../Contracts/Rules/RuleEngine';
import type { TimelineAnnotation } from '../../../Contracts/Timeline/TimelineAnnotation';
import { aSummary } from '../../../TestData';
import { aTimelineRecord } from '../../BackgroundTestData';

function aRecord(id: string, tabId: number = 7): TimelineRecord {
    return {
        summary: aSummary({
            id,
            tabId,
        }),
        requestHeaders: [],
        rawRequestHeaders: null,
        requestContentType: '',
        requestBody: null,
        requestBodyNote: null,
        requestBodyBase64: null,
        requestBodyByteSize: null,
        responseHeaders: [],
        rawResponseHeaders: null,
        responseBody: null,
        responseBodyNote: null,
        changes: [],
        startedTimestamp: 100,
    };
}

function anAnnotation(ruleId: string, isAnsweredByRule: boolean = false): TimelineAnnotation {
    return {
        appliedRules: [
            {
                ruleId,
                ruleName: `Rule ${ruleId}`,
                engine: RULE_ENGINE.Debugger,
                note: 'Latency',
            },
        ],
        changes: [
            {
                area: CHANGE_AREA.RequestHeader,
                name: ruleId,
                before: null,
                after: 'on',
            },
        ],
        isAnsweredByRule,
    };
}

describe('DefaultTimelineStore', () => {
    test('add_WhenARecordIsAdded_ShouldPublishTheSummary', () => {
        // Arrange
        const store = new DefaultTimelineStore();
        const listener = vi.fn();
        store.subscribe(listener);

        // Act
        store.add(aRecord('request-1'));

        // Assert
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({
            id: 'request-1',
        }));
        expect(store.list(7)).toHaveLength(1);
    });

    test('add_WhenTheTabIsFull_ShouldDropTheOldestRecord', () => {
        // Arrange
        const store = new DefaultTimelineStore();
        for (let index = 0; index < TIMELINE_LIMITS.MaxEntriesPerTab; index++) {
            store.add(aRecord(`request-${index}`));
        }

        // Act
        store.add(aRecord('request-overflow'));

        // Assert
        expect(store.list(7)).toHaveLength(TIMELINE_LIMITS.MaxEntriesPerTab);
        expect(store.get(7, 'request-0')).toBeUndefined();
        expect(store.get(7, 'request-overflow')).toBeDefined();
    });

    test('annotate_WhenTheRecordArrivesAfterIt_ShouldApplyTheAnnotationLater', () => {
        // Arrange
        const store = new DefaultTimelineStore();
        store.annotate({
            tabId: 7,
            entryId: 'request-1',
            annotation: anAnnotation('rule-1', true),
        });

        // Act
        store.add(aRecord('request-1'));

        // Assert
        const record = store.get(7, 'request-1');
        expect(record?.summary.appliedRules.map(rule => rule.ruleId)).toEqual(['rule-1']);
        expect(record?.summary.isAnsweredByRule).toBe(true);
        expect(record?.changes).toHaveLength(1);
    });

    test('annotate_WhenTheRecordIsAnnotatedTwice_ShouldAppendRulesAndChanges', () => {
        // Arrange
        const store = new DefaultTimelineStore();
        store.add(aRecord('request-1'));
        store.annotate({
            tabId: 7,
            entryId: 'request-1',
            annotation: anAnnotation('rule-1'),
        });

        // Act
        store.annotate({
            tabId: 7,
            entryId: 'request-1',
            annotation: anAnnotation('rule-2'),
        });

        // Assert
        const record = store.get(7, 'request-1');
        expect(record?.summary.appliedRules.map(rule => rule.ruleId)).toEqual([
            'rule-1',
            'rule-2',
        ]);
        expect(record?.changes.map(change => change.name)).toEqual([
            'rule-1',
            'rule-2',
        ]);
        expect(record?.summary.isAnsweredByRule).toBe(false);
    });

    test('annotate_WhenTheSameRuleAnnotatesTwice_ShouldKeepItOnce', () => {
        // Arrange
        const store = new DefaultTimelineStore();
        store.add(aRecord('request-1'));
        store.annotate({
            tabId: 7,
            entryId: 'request-1',
            annotation: anAnnotation('rule-1'),
        });

        // Act
        store.annotate({
            tabId: 7,
            entryId: 'request-1',
            annotation: anAnnotation('rule-1'),
        });

        // Assert
        const record = store.get(7, 'request-1');
        expect(record?.summary.appliedRules.map(rule => rule.ruleId)).toEqual(['rule-1']);
    });

    test('addLeg_WhenLegsAreAddedRepeatedly_ShouldAssignIncrementingIds', () => {
        // Arrange
        const store = new DefaultTimelineStore();
        const base = aRecord('request-1');
        store.add(base);

        // Act
        store.addLeg({
            tabId: 7,
            baseId: 'request-1',
            make: legId => ({
                ...base,
                summary: {
                    ...base.summary,
                    id: legId,
                },
            }),
        });
        store.addLeg({
            tabId: 7,
            baseId: 'request-1',
            make: legId => ({
                ...base,
                summary: {
                    ...base.summary,
                    id: legId,
                },
            }),
        });

        // Assert
        expect(store.list(7).map(entry => entry.id)).toEqual([
            'request-1',
            'request-1-leg-1',
            'request-1-leg-2',
        ]);
    });

    test('addLeg_WhenThereIsNoBaseRecord_ShouldStillAddTheLeg', () => {
        // Arrange
        const store = new DefaultTimelineStore();
        const ghost = aRecord('request-1');

        // Act
        store.addLeg({
            tabId: 7,
            baseId: 'request-1',
            make: legId => ({
                ...ghost,
                summary: {
                    ...ghost.summary,
                    id: legId,
                },
            }),
        });

        // Assert
        expect(store.list(7).map(entry => entry.id)).toEqual(['request-1-leg-1']);
    });

    test('updateOrDefer_WhenTheRecordIsMissing_ShouldApplyTheChangeOnAdd', () => {
        // Arrange
        const store = new DefaultTimelineStore();
        store.updateOrDefer({
            tabId: 7,
            entryId: 'request-1',
            change: record => ({
                ...record,
                rawRequestHeaders: [
                    {
                        name: 'Cookie',
                        value: 'session=1',
                    },
                ],
            }),
        });

        // Act
        store.add(aRecord('request-1'));

        // Assert
        expect(store.get(7, 'request-1')?.rawRequestHeaders).toEqual([
            {
                name: 'Cookie',
                value: 'session=1',
            },
        ]);
    });

    test('records_WhenTheTabHasRecords_ShouldReturnThemInOrder', () => {
        // Arrange
        const store = new DefaultTimelineStore();
        store.add(aRecord('request-1'));
        store.add(aRecord('request-2'));

        // Act
        const records = store.records(7);

        // Assert
        expect(records.map(record => record.summary.id)).toEqual([
            'request-1',
            'request-2',
        ]);
    });

    test('update_WhenTheRecordIsUnknown_ShouldIgnoreTheChange', () => {
        // Arrange
        const store = new DefaultTimelineStore();
        const listener = vi.fn();
        store.subscribe(listener);

        // Act
        store.update({
            tabId: 7,
            entryId: 'missing',
            change: record => record,
        });

        // Assert
        expect(listener).not.toHaveBeenCalled();
    });

    test('clear_WhenSeveralTabsHaveRecords_ShouldRemoveOnlyThatTab', () => {
        // Arrange
        const store = new DefaultTimelineStore();
        store.add(aRecord('request-1', 7));
        store.add(aRecord('request-2', 8));

        // Act
        store.clear(7);

        // Assert
        expect(store.list(7)).toEqual([]);
        expect(store.list(8)).toHaveLength(1);
    });

    test('remove_WhenACallIsRemoved_ShouldKeepTheOthers', () => {
        // Arrange
        const store = new DefaultTimelineStore();
        store.add(aTimelineRecord({
            summary: aSummary({
                id: 'stream',
            }),
        }));
        store.add(aTimelineRecord({
            summary: aSummary({
                id: 'call',
            }),
        }));

        // Act
        store.remove(7, 'stream');

        // Assert
        expect(store.list(7).map(entry => entry.id)).toEqual(['call']);
    });
});
