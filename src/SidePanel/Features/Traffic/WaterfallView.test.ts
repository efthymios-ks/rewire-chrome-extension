import { describe, expect, test } from 'vitest';
import { CONTENT_KIND } from '../../../Contracts/Timeline/ContentKind';
import { CONTENT_FILTER_ID } from '../../Core/ContentFilterId';
import { WaterfallView } from './WaterfallView';
import { aSummary } from '../../../TestData';
import { aPanelHarness, aSearchMatching, nextRenderAsync } from '../../PanelTestData';

describe('WaterfallView', () => {
    test('render_WhenAContentFilterIsActive_ShouldChartOnlyTheCallsItKeeps', async () => {
        // Arrange
        const harness = aPanelHarness({
            entries: [
                aSummary({
                    id: 'json',
                    path: '/api/users',
                    contentKind: CONTENT_KIND.Json,
                }),
                aSummary({
                    id: 'other',
                    path: '/api/other',
                    contentKind: CONTENT_KIND.Other,
                    host: 'cdn.example.net',
                }),
            ],
            contentFilter: CONTENT_FILTER_ID.Json,
        });

        // Act
        const view = new WaterfallView(harness.context);
        await nextRenderAsync();

        // Assert
        const labels = [...view.root.querySelectorAll('.waterfall-label')].map(label => label.textContent);
        expect(labels).toEqual(['GET /api/users']);
    });

    test('render_WhenThereAreNoCalls_ShouldSayThereIsNothingToChart', async () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const view = new WaterfallView(harness.context);
        await nextRenderAsync();

        // Assert
        expect(view.root.textContent).toContain('No requests to chart yet.');
    });

    test('render_WhenASearchHasAnswered_ShouldChartOnlyTheMatchingCalls', async () => {
        // Arrange
        const harness = aPanelHarness({
            entries: [
                aSummary({
                    id: 'users',
                    path: '/api/users',
                }),
                aSummary({
                    id: 'orders',
                    path: '/api/orders',
                }),
            ],
            search: aSearchMatching(['orders']),
        });

        // Act
        const view = new WaterfallView(harness.context);
        await nextRenderAsync();

        // Assert
        const labels = [...view.root.querySelectorAll('.waterfall-label')].map(label => label.textContent);
        expect(labels).toEqual(['GET /api/orders']);
    });

    test('render_WhenTheSearchMatchesNothing_ShouldSayNoCallsMatch', async () => {
        // Arrange
        const harness = aPanelHarness({
            entries: [aSummary()],
            search: aSearchMatching([]),
        });

        // Act
        const view = new WaterfallView(harness.context);
        await nextRenderAsync();

        // Assert
        expect(view.root.textContent).toContain('No calls match the filters and the search.');
    });
});
