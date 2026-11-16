import { describe, expect, test } from 'vitest';
import { VIEW_ID } from '../../Core/ViewId';
import { NavigationTabs } from './NavigationTabs';
import type { ViewDefinition } from './ViewDefinition';
import { aSummary } from '../../../TestData';
import { aPanelHarness, buttonNamed, click } from '../../PanelTestData';

const DEFINITIONS: ViewDefinition[] = [
    {
        id: VIEW_ID.Traffic,
        label: 'Traffic',
        badgeOf: state => state.entries.length === 0 ? '' : String(state.entries.length),
        create: () => document.createElement('div'),
    },
    {
        id: VIEW_ID.Jwt,
        label: 'JWT',
        badgeOf: () => '',
        create: () => document.createElement('div'),
    },
];

describe('NavigationTabs', () => {
    test('constructor_WhenBuilt_ShouldShowEachTabWithItsBadge', () => {
        // Arrange
        const harness = aPanelHarness({
            entries: [aSummary()],
        });

        // Act
        const tabs = new NavigationTabs(harness.context, DEFINITIONS);

        // Assert
        const badges = [...tabs.root.querySelectorAll<HTMLElement>('.tab-badge')];
        expect(badges.map(badge => `${badge.textContent}:${badge.hidden}`)).toEqual([
            '1:false',
            ':true',
        ]);
        expect(tabs.root.querySelector('.tab')?.getAttribute('aria-selected')).toBe('true');
    });

    test('click_WhenATabIsPicked_ShouldShowItsView', () => {
        // Arrange
        const harness = aPanelHarness();
        const tabs = new NavigationTabs(harness.context, DEFINITIONS);

        // Act
        click(buttonNamed(tabs.root, 'JWT'));

        // Assert
        expect(harness.store.getState().activeView).toBe(VIEW_ID.Jwt);
        expect(buttonNamed(tabs.root, 'JWT').getAttribute('aria-selected')).toBe('true');
    });

    test('wheel_WhenTheTabsOverflow_ShouldTakeOverTheWheel', () => {
        // Arrange
        const tabs = new NavigationTabs(aPanelHarness().context, DEFINITIONS);
        Object.defineProperty(
            /* o: */ tabs.root,
            /* p: */ 'scrollWidth',
            /* attributes: */ {
                value: 900,
            },
        );
        Object.defineProperty(
            /* o: */ tabs.root,
            /* p: */ 'clientWidth',
            /* attributes: */ {
                value: 300,
            },
        );
        const event = new WheelEvent('wheel', {
            deltaY: 120,
            cancelable: true,
        });

        // Act
        tabs.root.dispatchEvent(event);

        // Assert
        expect(event.defaultPrevented).toBe(true);
    });
});
