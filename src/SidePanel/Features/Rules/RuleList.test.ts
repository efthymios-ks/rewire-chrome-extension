import { afterEach, describe, expect, test } from 'vitest';
import { ActiveProfile } from '../../../Common/Profiles/ActiveProfile';
import type { Rule } from '../../../Contracts/Rules/Rule';
import { RuleList } from './RuleList';
import { aRule, aSettingsWithRules } from '../../../TestData';
import { aPanelHarness, buttonNamed, click, nextRenderAsync, type PanelHarness } from '../../PanelTestData';

const DRAG_DATA_TYPE = 'text/plain';

function threeRuleHarness(): PanelHarness {
    return aPanelHarness({
        settings: aSettingsWithRules([
            aRule({
                id: 'users',
                name: 'Users mock',
            }),
            aRule({
                id: 'orders',
                name: 'Orders mock',
            }),
            aRule({
                id: 'health',
                name: 'Health mock',
            }),
        ]),
        ruleHits: {
            orders: 4,
        },
    });
}

async function aRenderedListAsync(harness: PanelHarness, text = ''): Promise<RuleList> {
    const list = new RuleList(harness.context, {
        text,
    });
    await nextRenderAsync();

    return list;
}

function rowsOf(list: RuleList): HTMLElement[] {
    return [...list.root.querySelectorAll<HTMLElement>('.rule-row')];
}

function rowOf(list: RuleList, ruleId: string): HTMLElement {
    return list.root.querySelector<HTMLElement>(`[data-rule-id="${ruleId}"]`)!;
}

function idsOf(list: RuleList): string[] {
    return rowsOf(list).map(row => row.dataset['ruleId'] ?? '');
}

function savedRulesOf(harness: PanelHarness): Rule[] {
    return ActiveProfile.rules(harness.store.getState().settings);
}

function emptyStateOf(list: RuleList): HTMLElement {
    return list.root.querySelector<HTMLElement>('.empty-state')!;
}

function aDropEvent(draggedRuleId: string): Event {
    const event = new Event('drop', {
        bubbles: true,
        cancelable: true,
    });
    Object.defineProperty(event, 'dataTransfer', {
        value: {
            getData: (format: string) => format === DRAG_DATA_TYPE ? draggedRuleId : '',
        },
    });

    return event;
}

function confirmDialog(): HTMLElement {
    return document.querySelector<HTMLElement>('.confirm-dialog')!;
}

describe('RuleList', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    test('constructor_WhenThereAreRules_ShouldListThemInRunOrderWithTheirHits', async () => {
        // Arrange
        const harness = threeRuleHarness();

        // Act
        const list = await aRenderedListAsync(harness);

        // Assert
        expect(list.root.querySelector('ol')?.getAttribute('aria-label'))
            .toBe('Rules, in the order they run');
        expect(idsOf(list)).toEqual([
            'users',
            'orders',
            'health',
        ]);
        expect(rowsOf(list).map(row => row.querySelector('.hit-count')?.textContent)).toEqual([
            '0',
            '4',
            '0',
        ]);
        expect(emptyStateOf(list).hidden).toBe(true);
    });

    test('constructor_WhenThereAreNoRules_ShouldShowTheEmptyState', async () => {
        // Arrange
        const harness = aPanelHarness({
            settings: aSettingsWithRules([]),
        });

        // Act
        const list = await aRenderedListAsync(harness);

        // Assert
        expect(rowsOf(list)).toHaveLength(0);
        expect(emptyStateOf(list).hidden).toBe(false);
        expect(emptyStateOf(list).textContent).toContain('No rules here yet.');
    });

    test('setFilter_WhenTextMatchesSomeNames_ShouldListOnlyThose', async () => {
        // Arrange
        const list = await aRenderedListAsync(threeRuleHarness());

        // Act
        list.setFilter({
            text: ' ORDERS ',
        });
        await nextRenderAsync();

        // Assert
        expect(idsOf(list)).toEqual(['orders']);
    });

    test('setFilter_WhenNothingMatches_ShouldShowTheEmptyState', async () => {
        // Arrange
        const list = await aRenderedListAsync(threeRuleHarness());

        // Act
        list.setFilter({
            text: 'payments',
        });
        await nextRenderAsync();

        // Assert
        expect(rowsOf(list)).toHaveLength(0);
        expect(emptyStateOf(list).hidden).toBe(false);
    });

    test('constructor_WhenARuleIdIsAnObjectPrototypeName_ShouldShowZeroHits', async () => {
        // Arrange
        const harness = aPanelHarness({
            settings: aSettingsWithRules([
                aRule({
                    id: 'constructor',
                    name: 'Odd id',
                }),
            ]),
        });

        // Act
        const list = await aRenderedListAsync(harness);

        // Assert
        expect(rowOf(list, 'constructor').querySelector('.hit-count')?.textContent).toBe('0');
    });

    test('store_WhenTheHitsChange_ShouldRerender', async () => {
        // Arrange
        const harness = threeRuleHarness();
        const list = await aRenderedListAsync(harness);

        // Act
        harness.store.update(state => ({
            ...state,
            ruleHits: {
                users: 12,
            },
        }));
        await nextRenderAsync();

        // Assert
        expect(rowOf(list, 'users').querySelector('.hit-count')?.textContent).toBe('12');
    });

    test('switch_WhenToggledOff_ShouldDisableTheRule', async () => {
        // Arrange
        const harness = threeRuleHarness();
        const list = await aRenderedListAsync(harness);
        const toggle = rowOf(list, 'orders').querySelector<HTMLInputElement>('.switch input')!;

        // Act
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));
        await nextRenderAsync();

        // Assert
        expect(savedRulesOf(harness).map(rule => rule.enabled)).toEqual([
            true,
            false,
            true,
        ]);
        expect(rowOf(list, 'orders').hasAttribute('data-disabled')).toBe(true);
    });

    test('edit_WhenClicked_ShouldOpenTheEditorOnThatRule', async () => {
        // Arrange
        const harness = threeRuleHarness();
        const list = await aRenderedListAsync(harness);

        // Act
        click(buttonNamed(rowOf(list, 'orders'), 'Edit'));

        // Assert
        const request = harness.store.getState().ruleEditRequest;
        expect(request?.rule.id).toBe('orders');
        expect(request?.isNew).toBe(false);
    });

    test('duplicate_WhenClicked_ShouldAddACopy', async () => {
        // Arrange
        const harness = threeRuleHarness();
        const list = await aRenderedListAsync(harness);

        // Act
        click(buttonNamed(rowOf(list, 'users'), 'Duplicate'));
        await nextRenderAsync();

        // Assert
        expect(rowsOf(list)).toHaveLength(4);
        expect(savedRulesOf(harness)).toHaveLength(4);
    });

    test('remove_WhenConfirmed_ShouldRemoveTheRule', async () => {
        // Arrange
        const harness = threeRuleHarness();
        const list = await aRenderedListAsync(harness);
        click(buttonNamed(rowOf(list, 'orders'), 'Remove'));

        // Act
        click(buttonNamed(confirmDialog(), 'Remove'));
        await nextRenderAsync();

        // Assert
        expect(idsOf(list)).toEqual([
            'users',
            'health',
        ]);
    });

    test('remove_WhenCancelled_ShouldKeepTheRule', async () => {
        // Arrange
        const harness = threeRuleHarness();
        const list = await aRenderedListAsync(harness);
        click(buttonNamed(rowOf(list, 'orders'), 'Remove'));

        // Act
        click(buttonNamed(confirmDialog(), 'Cancel'));
        await nextRenderAsync();

        // Assert
        expect(idsOf(list)).toEqual([
            'users',
            'orders',
            'health',
        ]);
    });

    test.each([
        [
            'Users mock',
            'Remove the rule "Users mock"?',
        ],
        [
            '',
            'Remove the rule "mockResponse"?',
        ],
    ])('removeAsync_WhenTheNameIs(%s)_ShouldAsk(%s)', async (name, message) => {
        // Arrange
        const harness = aPanelHarness({
            settings: aSettingsWithRules([
                aRule({
                    name,
                }),
            ]),
        });
        const list = await aRenderedListAsync(harness);

        // Act
        click(buttonNamed(rowsOf(list)[0]!, 'Remove'));

        // Assert
        expect(confirmDialog().querySelector('.confirm-title')?.textContent).toBe('Remove rule');
        expect(confirmDialog().querySelector('p')?.textContent).toBe(message);
    });

    test('keydown_WhenArrowDownIsPressed_ShouldMoveTheRuleAndKeepFocusOnIt', async () => {
        // Arrange
        const harness = threeRuleHarness();
        const list = await aRenderedListAsync(harness);
        document.body.append(list.root);

        // Act
        rowOf(list, 'users').querySelector('.drag-handle')!.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ArrowDown',
        }));
        await nextRenderAsync();

        // Assert
        expect(idsOf(list)).toEqual([
            'orders',
            'users',
            'health',
        ]);
        expect(document.activeElement).toBe(rowOf(list, 'users').querySelector('.drag-handle'));
    });

    test('drop_WhenARuleIsDroppedOnAnother_ShouldMoveItToThatPosition', async () => {
        // Arrange
        const harness = threeRuleHarness();
        const list = await aRenderedListAsync(harness);

        // Act
        rowOf(list, 'users').dispatchEvent(aDropEvent('health'));
        await nextRenderAsync();

        // Assert
        expect(savedRulesOf(harness).map(rule => rule.id)).toEqual([
            'health',
            'users',
            'orders',
        ]);
        expect(idsOf(list)).toEqual([
            'health',
            'users',
            'orders',
        ]);
    });
});
