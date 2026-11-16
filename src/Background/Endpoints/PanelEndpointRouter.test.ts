import { describe, expect, test } from 'vitest';
import { KeepAliveEndpoint } from './KeepAlive/KeepAliveEndpoint';
import { PanelEndpointRouter } from './PanelEndpointRouter';
import type { PanelConnection } from '../Features/PanelConnections/PanelConnection';
import { Result } from '../../Common/Results/Result';
import { PANEL_COMMAND_TYPE } from '../../Contracts/Messaging/PanelCommandType';

const CONTEXT = {
    connection: {
        id: 'connection-1',
        tabId: null,
    } as unknown as PanelConnection,
};

describe('PanelEndpointRouter', () => {
    test.each([
        [
            {
                correlationId: 'abc',
                command: {
                    type: PANEL_COMMAND_TYPE.KeepAlive,
                },
            },
            true,
        ],
        [
            {
                correlationId: 'abc',
            },
            false,
        ],
        [
            {
                correlationId: 1,
                command: {
                    type: 1,
                },
            },
            false,
        ],
        [
            null,
            false,
        ],
    ])('isPanelRequest_WhenMessageIs(%j)_ShouldValidateTheShape', (message, expected) => {
        // Arrange
        const router = new PanelEndpointRouter();

        // Act
        const isRequest = router.isPanelRequest(message);

        // Assert
        expect(isRequest).toBe(expected);
    });

    test('routeAsync_WhenItHandlesTheCommand_ShouldCallTheRegisteredEndpoint', async () => {
        // Arrange
        const router = new PanelEndpointRouter().register(new KeepAliveEndpoint());

        // Act
        const result = await router.routeAsync(
            /* request: */ {
                correlationId: 'abc',
                command: {
                    type: PANEL_COMMAND_TYPE.KeepAlive,
                },
            },
            /* context: */ CONTEXT,
        );

        // Assert
        expect(result).toEqual(Result.done());
    });

    test('routeAsync_WhenNoEndpointHandlesTheCommand_ShouldFail', async () => {
        // Arrange
        const router = new PanelEndpointRouter();

        // Act
        const result = await router.routeAsync(
            /* request: */ {
                correlationId: 'abc',
                command: {
                    type: PANEL_COMMAND_TYPE.ClearTimeline,
                    tabId: 7,
                },
            },
            /* context: */ CONTEXT,
        );

        // Assert
        expect(result).toEqual(Result.fail('No endpoint handles command 3.'));
    });

    test('routeAsync_WhenTheEndpointThrows_ShouldFailWithTheError', async () => {
        // Arrange
        const router = new PanelEndpointRouter().register({
            commandType: PANEL_COMMAND_TYPE.KeepAlive,
            handleAsync: async () => {
                throw new Error('Storage is unavailable.');
            },
        });

        // Act
        const result = await router.routeAsync(
            /* request: */ {
                correlationId: 'abc',
                command: {
                    type: PANEL_COMMAND_TYPE.KeepAlive,
                },
            },
            /* context: */ CONTEXT,
        );

        // Assert
        expect(result).toEqual(Result.fail('Storage is unavailable.'));
    });
});
