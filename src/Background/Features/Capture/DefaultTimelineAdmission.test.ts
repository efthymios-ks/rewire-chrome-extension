import { describe, expect, test, vi } from 'vitest';
import type { BrowserRuleSimulator } from './BrowserRuleSimulator';
import { DefaultTimelineAdmission } from './DefaultTimelineAdmission';
import { DefaultTimelineStore } from './DefaultTimelineStore';
import { RULE_ENGINE } from '../../../Contracts/Rules/RuleEngine';
import type { TimelineAnnotation } from '../../../Contracts/Timeline/TimelineAnnotation';
import { aTimelineRecord } from '../../BackgroundTestData';

const TAB_ID = 7;
const REQUEST_ID = 'request-1';

function simulatorReturning(annotation: TimelineAnnotation | null): BrowserRuleSimulator {
    return {
        simulateRequest: vi.fn().mockReturnValue(annotation),
        simulateResponse: vi.fn().mockReturnValue(null),
    };
}

describe('DefaultTimelineAdmission', () => {
    test('admit_WhenNoBrowserRuleMatches_ShouldStoreTheRecordAsIs', () => {
        // Arrange
        const store = new DefaultTimelineStore();
        const admission = new DefaultTimelineAdmission(store, simulatorReturning(null));
        const record = aTimelineRecord();

        // Act
        admission.admit(record);

        // Assert
        expect(store.get(TAB_ID, REQUEST_ID)).toEqual(record);
    });

    test('admit_WhenABrowserRuleMatches_ShouldAnnotateTheStoredRecord', () => {
        // Arrange
        const store = new DefaultTimelineStore();
        const appliedRule = {
            ruleId: 'rule-1',
            ruleName: 'Users mock',
            engine: RULE_ENGINE.Browser,
            note: 'Mock response',
        };
        const simulator = simulatorReturning({
            appliedRules: [appliedRule],
            changes: [],
            isAnsweredByRule: true,
        });
        const admission = new DefaultTimelineAdmission(store, simulator);

        // Act
        admission.admit(aTimelineRecord());

        // Assert
        const summary = store.get(TAB_ID, REQUEST_ID)?.summary;
        expect(summary?.appliedRules).toEqual([appliedRule]);
        expect(summary?.isAnsweredByRule).toBe(true);
    });
});
