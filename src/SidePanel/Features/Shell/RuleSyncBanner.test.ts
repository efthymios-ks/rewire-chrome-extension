import { describe, expect, test } from 'vitest';
import type { RuleSyncFailure } from '../../../Contracts/RuleSync/RuleSyncFailure';
import type { RuleSyncReport } from '../../../Contracts/RuleSync/RuleSyncReport';
import { RuleSyncBanner } from './RuleSyncBanner';
import { aPanelHarness } from '../../PanelTestData';

function aFailure(overrides: Partial<RuleSyncFailure> = {}): RuleSyncFailure {
    return {
        sourceName: 'Users mock',
        ruleId: 'rule-1',
        message: 'Invalid regex.',
        ...overrides,
    };
}

function aReport(failures: RuleSyncFailure[]): RuleSyncReport {
    return {
        syncedAt: '2026-11-05T10:00:00.000Z',
        activeRuleCount: 2,
        failures,
    };
}

describe('RuleSyncBanner', () => {
    test('constructor_WhenThereIsNoReport_ShouldStayHidden', () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const banner = new RuleSyncBanner(harness.context);

        // Assert
        expect(banner.root.hidden).toBe(true);
    });

    test('constructor_WhenTheReportHasNoFailures_ShouldStayHidden', () => {
        // Arrange
        const harness = aPanelHarness({
            ruleSyncReport: aReport([]),
        });

        // Act
        const banner = new RuleSyncBanner(harness.context);

        // Assert
        expect(banner.root.hidden).toBe(true);
    });

    test('constructor_WhenOneRuleFailed_ShouldSayItInTheSingular', () => {
        // Arrange
        const harness = aPanelHarness({
            ruleSyncReport: aReport([aFailure()]),
        });

        // Act
        const banner = new RuleSyncBanner(harness.context);

        // Assert
        expect(banner.root.hidden).toBe(false);
        expect(banner.root.querySelector('summary')?.textContent).toBe("1 rule isn't applied");
        expect(banner.root.querySelector('li')?.textContent).toBe('Users mock: Invalid regex.');
    });

    test('select_WhenTheReportGainsFailures_ShouldListEachOne', () => {
        // Arrange
        const harness = aPanelHarness();
        const banner = new RuleSyncBanner(harness.context);

        // Act
        harness.store.update(state => ({
            ...state,
            ruleSyncReport: aReport([
                aFailure(),
                aFailure({
                    sourceName: 'Orders redirect',
                    message: 'Too many rules.',
                }),
            ]),
        }));

        // Assert
        expect(banner.root.hidden).toBe(false);
        expect(banner.root.querySelector('summary')?.textContent).toBe("2 rules aren't applied");
        expect([...banner.root.querySelectorAll('li')].map(item => item.textContent)).toEqual([
            'Users mock: Invalid regex.',
            'Orders redirect: Too many rules.',
        ]);
    });
});
