import { describe, expect, test } from 'vitest';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { SEARCH_FIELDS } from '../../../Contracts/Search/SearchField';
import { SEARCH_SCOPES } from '../../../Contracts/Search/SearchScope';
import { HarConnection } from './HarConnection';
import { aDetail, aSummary } from '../../../TestData';

const DETAILS = [
    aDetail({
        summary: aSummary({
            id: 'har-1',
        }),
        responseBody: '{"name":"Ada"}',
    }),
    aDetail({
        summary: aSummary({
            id: 'har-2',
        }),
        responseBody: '{"name":"Grace"}',
    }),
];

describe('HarConnection', () => {
    test('sendAsync_WhenADetailIsAskedFor_ShouldReturnItFromTheFile', async () => {
        // Arrange
        const connection = new HarConnection(DETAILS);

        // Act
        const result = await connection.sendAsync({
            type: PANEL_COMMAND_TYPE.GetEntryDetail,
            tabId: -1,
            entryId: 'har-2',
        });

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: DETAILS[1],
        });
    });

    test('sendAsync_WhenTheCallIsNotInTheFile_ShouldSaySo', async () => {
        // Arrange
        const connection = new HarConnection(DETAILS);

        // Act
        const result = await connection.sendAsync({
            type: PANEL_COMMAND_TYPE.GetEntryDetail,
            tabId: -1,
            entryId: 'har-9',
        });

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: "This call isn't in the file.",
        });
    });

    test('sendAsync_WhenSearching_ShouldSearchTheFileBodies', async () => {
        // Arrange
        const connection = new HarConnection(DETAILS);

        // Act
        const result = await connection.sendAsync({
            type: PANEL_COMMAND_TYPE.SearchTimeline,
            tabId: -1,
            query: {
                text: 'grace',
                isRegex: false,
                scopes: [SEARCH_SCOPES.ResponseBody],
            },
        });

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [
                {
                    entryId: 'har-2',
                    fields: [SEARCH_FIELDS.ResponseBody],
                    count: 1,
                },
            ],
        });
    });

    test('sendAsync_WhenEveryDetailIsAskedFor_ShouldReturnThemAllAndIgnoreOtherCommands', async () => {
        // Arrange
        const connection = new HarConnection(DETAILS);

        // Act
        const details = await connection.sendAsync({
            type: PANEL_COMMAND_TYPE.GetTimelineDetails,
            tabId: -1,
        });
        const cleared = await connection.sendAsync({
            type: PANEL_COMMAND_TYPE.ClearTimeline,
            tabId: -1,
        });

        // Assert
        expect(details).toEqual({
            hasErrors: false,
            value: DETAILS,
        });
        expect(cleared.hasErrors).toBe(false);
    });
});
