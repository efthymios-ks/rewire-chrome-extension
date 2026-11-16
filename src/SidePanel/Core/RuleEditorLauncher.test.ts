import { afterEach, describe, expect, test, vi } from 'vitest';
import { PanelStateFactory } from './PanelStateFactory';
import { RuleEditorLauncher } from './RuleEditorLauncher';
import { Store } from './Store';
import { VIEW_ID } from './ViewId';
import { aRule } from '../../TestData';

const NOW = 1_700_000_000_000;

describe('RuleEditorLauncher', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('open_WhenARuleIsGiven_ShouldSwitchToRulesAndRequestItsEditor', () => {
        // Arrange
        vi.spyOn(Date, 'now').mockReturnValue(NOW);
        const store = new Store(PanelStateFactory.initial());
        const rule = aRule();

        // Act
        new RuleEditorLauncher(store).open(rule, true);

        // Assert
        expect(store.getState().activeView).toBe(VIEW_ID.Rules);
        expect(store.getState().ruleEditRequest).toEqual({
            rule,
            isNew: true,
            requestedAt: NOW,
        });
    });

    test('close_WhenAnEditIsRequested_ShouldClearTheRequest', () => {
        // Arrange
        const store = new Store(PanelStateFactory.initial());
        const launcher = new RuleEditorLauncher(store);
        launcher.open(aRule(), false);

        // Act
        launcher.close();

        // Assert
        expect(store.getState().ruleEditRequest).toBeNull();
        expect(store.getState().activeView).toBe(VIEW_ID.Rules);
    });

    test('close_WhenNoEditIsRequested_ShouldLeaveTheStateUntouched', () => {
        // Arrange
        const store = new Store(PanelStateFactory.initial());
        const before = store.getState();

        // Act
        new RuleEditorLauncher(store).close();

        // Assert
        expect(store.getState()).toBe(before);
    });
});
