import { describe, expect, test, vi } from 'vitest';
import { Result } from '../../../Common/Results/Result';
import { CONTENT_KIND } from '../../../Contracts/Timeline/ContentKind';
import { FRAME_FILTERS } from '../../Core/FrameFilters';
import { TRAFFIC_FEATURE_SETS } from '../../Core/TrafficFeatureSets';
import { TRAFFIC_LAYOUT } from '../../Core/TrafficLayout';
import { TrafficToolbar } from './TrafficToolbar';
import { aSummary } from '../../../TestData';
import { aFileClient, aPanelHarness, aSearchMatching, buttonNamed, click } from '../../PanelTestData';

const FRAMED_ENTRIES = [
    aSummary({
        id: 'top',
        frame: {
            id: 'top-frame',
            url: 'https://app.example.com/',
            isTop: true,
        },
    }),
    aSummary({
        id: 'payment',
        frame: {
            id: 'iframe-1',
            url: 'https://pay.example.com/checkout',
            isTop: false,
        },
    }),
];

describe('TrafficToolbar', () => {
    test('constructor_WhenBuilt_ShouldPutFiltersAndCountOnTopAndLayoutAndClearBelow', () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const toolbar = new TrafficToolbar({ context: harness.context });

        // Assert
        const rows = toolbar.root.querySelectorAll('.traffic-toolbar-row');
        expect(rows).toHaveLength(2);
        expect(rows[0]?.querySelector('.chip-group')).not.toBeNull();
        expect(rows[0]?.querySelector('.entry-count')).not.toBeNull();
        expect(rows[1]?.querySelector('.traffic-layout')).not.toBeNull();
        expect(rows[1]?.querySelector('.switch')).toBeNull();
        expect(rows[1]?.textContent).toContain('HAR');
        expect(rows[1]?.textContent).toContain('Clear');
        expect(toolbar.root.querySelector('.domain-filter')).toBeNull();
    });

    test('layout_WhenWaterfallIsPicked_ShouldShowTheWaterfall', () => {
        // Arrange
        const harness = aPanelHarness();
        const toolbar = new TrafficToolbar({ context: harness.context });
        const layout = toolbar.root.querySelector<HTMLSelectElement>('.traffic-layout')!;

        // Act
        layout.value = String(TRAFFIC_LAYOUT.Waterfall);
        layout.dispatchEvent(new Event('change'));

        // Assert
        expect(harness.store.getState().trafficLayout).toBe(TRAFFIC_LAYOUT.Waterfall);
        expect([...layout.options].map(option => option.textContent)).toEqual([
            'List',
            'Waterfall',
        ]);
    });

    test('layout_WhenTheLayoutChangesElsewhere_ShouldFollowIt', () => {
        // Arrange
        const harness = aPanelHarness({
            trafficLayout: TRAFFIC_LAYOUT.Waterfall,
        });
        const toolbar = new TrafficToolbar({ context: harness.context });

        // Act
        harness.store.update(state => ({
            ...state,
            trafficLayout: TRAFFIC_LAYOUT.List,
        }));

        // Assert
        const layoutSelect = toolbar.root.querySelector<HTMLSelectElement>('.traffic-layout')!;
        expect(layoutSelect.selectedOptions[0]?.textContent).toBe('List');
    });

    test('count_WhenAContentFilterIsPicked_ShouldCountTheCallsItKeeps', () => {
        // Arrange
        const harness = aPanelHarness({
            entries: [
                aSummary({
                    id: 'json',
                    contentKind: CONTENT_KIND.Json,
                }),
                aSummary({
                    id: 'other',
                    contentKind: CONTENT_KIND.Other,
                }),
            ],
        });
        const toolbar = new TrafficToolbar({ context: harness.context });

        // Act
        click(buttonNamed(toolbar.root, 'JSON'));

        // Assert
        expect(toolbar.root.querySelector('.entry-count')?.textContent).toBe('1 / 2');
    });

    test('count_WhenASearchHasAnswered_ShouldCountTheMatchingCallsOfAllCaptured', () => {
        // Arrange
        const harness = aPanelHarness({
            entries: [
                aSummary({
                    id: 'users',
                }),
                aSummary({
                    id: 'orders',
                }),
                aSummary({
                    id: 'products',
                }),
            ],
        });
        const toolbar = new TrafficToolbar({ context: harness.context });

        // Act
        harness.store.update(state => ({
            ...state,
            search: aSearchMatching(['orders']),
        }));

        // Assert
        expect(toolbar.root.querySelector('.entry-count')?.textContent).toBe('1 / 3');
    });

    test('count_WhenASearchAndAContentFilterAreSet_ShouldCountTheCallsBothKeep', () => {
        // Arrange
        const harness = aPanelHarness({
            entries: [
                aSummary({
                    id: 'json',
                    contentKind: CONTENT_KIND.Json,
                }),
                aSummary({
                    id: 'other',
                    contentKind: CONTENT_KIND.Other,
                }),
            ],
            search: aSearchMatching(['json', 'other']),
        });
        const toolbar = new TrafficToolbar({ context: harness.context });

        // Act
        click(buttonNamed(toolbar.root, 'JSON'));

        // Assert
        expect(toolbar.root.querySelector('.entry-count')?.textContent).toBe('1 / 2');
    });

    test('harButton_WhenClicked_ShouldOfferDownloadAndCopyWithAndWithoutSecrets', () => {
        // Arrange
        const harness = aPanelHarness();
        const toolbar = new TrafficToolbar({ context: harness.context });
        document.body.append(toolbar.root);

        // Act
        click(buttonNamed(toolbar.root, 'HAR'));

        // Assert
        expect([...document.querySelectorAll('.context-menu-item')].map(item => item.textContent)).toEqual([
            'Download HAR',
            'Copy HAR',
            'Download HAR with cookies and auth headers',
            'Copy HAR with cookies and auth headers',
        ]);
        document.body.replaceChildren();
    });

    test('frameSelect_WhenCallsComeFromAnIframe_ShouldOfferEveryFrame', () => {
        // Arrange
        const harness = aPanelHarness({
            entries: FRAMED_ENTRIES,
        });

        // Act
        const toolbar = new TrafficToolbar({ context: harness.context });

        // Assert
        const select = toolbar.root.querySelector<HTMLSelectElement>('.frame-select')!;
        expect([...select.options].map(option => option.textContent)).toEqual([
            'All frames',
            'top',
            'pay.example.com · /checkout',
        ]);
        expect(buttonNamed(toolbar.root, 'Open frame').hidden).toBe(true);
    });

    test('frameSelect_WhenAnIframeIsPicked_ShouldKeepItsCallsAndOfferToOpenIt', async () => {
        // Arrange
        const harness = aPanelHarness({
            entries: FRAMED_ENTRIES,
        });
        const tabOpener = {
            openAsync: vi.fn().mockResolvedValue(Result.done()),
        };
        const toolbar = new TrafficToolbar({
            context: harness.context,
            fileClient: aFileClient(),
            tabOpener,
        });
        const select = toolbar.root.querySelector<HTMLSelectElement>('.frame-select')!;

        // Act
        select.value = 'iframe-1';
        select.dispatchEvent(new Event('change'));
        click(buttonNamed(toolbar.root, 'Open frame'));

        // Assert
        expect(toolbar.root.querySelector('.entry-count')?.textContent).toBe('1 / 2');
        expect(tabOpener.openAsync).toHaveBeenCalledWith('https://pay.example.com/checkout');
    });

    test('frameSelect_WhenThePickedIframeIsCleared_ShouldGoBackToAllFrames', () => {
        // Arrange
        const harness = aPanelHarness({
            entries: FRAMED_ENTRIES,
            frameFilter: 'iframe-1',
        });
        new TrafficToolbar({ context: harness.context });

        // Act
        harness.store.update(state => ({
            ...state,
            entries: [],
        }));

        // Assert
        expect(harness.store.getState().frameFilter).toBe(FRAME_FILTERS.All);
    });

    test('frameSelect_WhenFramesCannotBeFiltered_ShouldNotShow', () => {
        // Arrange
        const harness = aPanelHarness({
            entries: FRAMED_ENTRIES,
        });

        // Act
        const toolbar = new TrafficToolbar({
            context: {
                ...harness.context,
                trafficFeatures: TRAFFIC_FEATURE_SETS.HarFile,
            },
        });

        // Assert
        expect(toolbar.root.querySelector('.frame-select')).toBeNull();
    });
});
