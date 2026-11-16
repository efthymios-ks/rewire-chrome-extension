import { describe, expect, test } from 'vitest';
import { VIEW_ID } from '../../Core/ViewId';
import { EntryContextMenu } from './EntryContextMenu';
import { aDetail, aSummary } from '../../../TestData';
import { aPanelHarness, nextRenderAsync } from '../../PanelTestData';

describe('EntryContextMenu', () => {
    test('openInClientAsync_WhenTheCallIsSelected_ShouldOpenTheClientWithTheRequestAfterRules', async () => {
        // Arrange
        const detail = aDetail({
            summary: aSummary({
                id: 'request-1',
                method: 'POST',
                url: 'https://api.example.com/users',
            }),
            requestBody: '{"name":"Ada"}',
        });
        const harness = aPanelHarness({
            selectedEntryId: 'request-1',
            selectedEntryDetail: detail,
        });
        const menu = new EntryContextMenu(harness.context);

        // Act
        menu.itemsFor(detail.summary)[0]!.run();
        await nextRenderAsync();

        // Assert
        const state = harness.store.getState();
        expect(state.activeView).toBe(VIEW_ID.Client);
        expect(state.clientLaunch?.snapshot).toEqual({
            method: 'POST',
            url: 'https://api.example.com/users',
            headers: detail.requestHeaders,
            body: '{"name":"Ada"}',
        });
        expect(harness.sent).toEqual([]);
    });

    test('copyAsync_WhenTheCallIsNotSelected_ShouldLoadItAndCopyTheSnippet', async () => {
        // Arrange
        const detail = aDetail({
            summary: aSummary({
                id: 'request-2',
                url: 'https://api.example.com/orders',
            }),
        });
        const harness = aPanelHarness({}, detail);
        const menu = new EntryContextMenu(harness.context);

        // Act
        menu.itemsFor(detail.summary)[1]!.run();
        await nextRenderAsync();

        // Assert
        expect(harness.sent).toHaveLength(1);
        expect(harness.copied[0]).toContain("curl 'https://api.example.com/orders'");
        expect(harness.noticeText()).toBe('cURL (bash) snippet copied.');
    });
});
