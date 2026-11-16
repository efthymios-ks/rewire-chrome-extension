import { afterEach, describe, expect, test, vi } from 'vitest';
import { ChromePanelTargetClient } from './ChromePanelTargetClient';
import { Result } from '../../../Common/Results/Result';

const EXTENSION_ORIGIN = 'chrome-extension://rewire-id/';
const PANEL_URL = `${EXTENSION_ORIGIN}sidepanel/`;

function stubChrome(targets: Array<Partial<chrome.debugger.TargetInfo>> = []) {
    const getTargets = vi.fn().mockResolvedValue(targets);
    const attach = vi.fn().mockResolvedValue(undefined);
    const sendCommand = vi.fn().mockResolvedValue({});
    vi.stubGlobal('chrome', {
        runtime: {
            getURL: (path: string) => `${EXTENSION_ORIGIN}${path}`,
        },
        debugger: {
            getTargets,
            attach,
            sendCommand,
        },
    });

    return {
        getTargets,
        attach,
        sendCommand,
    };
}

describe('ChromePanelTargetClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('findPanelTargetAsync_WhenThePanelIsOpen_ShouldReturnItsTargetId', async () => {
        // Arrange
        stubChrome([
            {
                id: 'tab-target',
                tabId: 7,
                url: `${PANEL_URL}index.html`,
            },
            {
                id: 'other-page',
                url: `${EXTENSION_ORIGIN}options/index.html`,
            },
            {
                id: 'panel-target',
                url: `${PANEL_URL}index.html`,
            },
        ]);
        const client = new ChromePanelTargetClient();

        // Act
        const result = await client.findPanelTargetAsync();

        // Assert
        expect(result).toEqual(Result.ok('panel-target'));
    });

    test('findPanelTargetAsync_WhenThePanelIsNotOpen_ShouldReturnNull', async () => {
        // Arrange
        stubChrome([
            {
                id: 'page-target',
                url: 'https://app.example.com/',
            },
        ]);
        const client = new ChromePanelTargetClient();

        // Act
        const result = await client.findPanelTargetAsync();

        // Assert
        expect(result).toEqual(Result.ok(null));
    });

    test('findPanelTargetAsync_WhenTheTargetsCannotBeListed_ShouldFailWithTheReason', async () => {
        // Arrange
        const { getTargets } = stubChrome();
        getTargets.mockRejectedValue(new Error('Cannot access the debugger targets.'));
        const client = new ChromePanelTargetClient();

        // Act
        const result = await client.findPanelTargetAsync();

        // Assert
        expect(result).toEqual(Result.fail('Cannot access the debugger targets.'));
    });

    test('attachAsync_WhenTheDebuggerAttaches_ShouldSucceed', async () => {
        // Arrange
        const { attach } = stubChrome();
        const client = new ChromePanelTargetClient();

        // Act
        const result = await client.attachAsync('panel-target');

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: undefined,
        });
        expect(attach).toHaveBeenCalledWith(
            /* target: */ {
                targetId: 'panel-target',
            },
            /* requiredVersion: */ '1.3',
        );
    });

    test('attachAsync_WhenTheDebuggerRefuses_ShouldFailWithTheReason', async () => {
        // Arrange
        const { attach } = stubChrome();
        attach.mockRejectedValue(new Error('Another debugger is already attached'));
        const client = new ChromePanelTargetClient();

        // Act
        const result = await client.attachAsync('panel-target');

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Another debugger is already attached',
        });
    });

    test('sendAsync_WhenTheCommandSucceeds_ShouldReturnTheResponse', async () => {
        // Arrange
        const { sendCommand } = stubChrome();
        sendCommand.mockResolvedValue({
            result: {
                type: 'number',
                value: 42,
            },
        });
        const client = new ChromePanelTargetClient();

        // Act
        const result = await client.sendAsync(
            /* targetId: */ 'panel-target',
            /* command: */ 'Runtime.evaluate',
            /* params: */ {
                expression: '40 + 2',
            },
        );

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: {
                result: {
                    type: 'number',
                    value: 42,
                },
            },
        });
        expect(sendCommand).toHaveBeenCalledWith(
            /* target: */ {
                targetId: 'panel-target',
            },
            /* method: */ 'Runtime.evaluate',
            /* commandParams: */ {
                expression: '40 + 2',
            },
        );
    });

    test('sendAsync_WhenTheCommandFails_ShouldNameTheCommand', async () => {
        // Arrange
        const { sendCommand } = stubChrome();
        sendCommand.mockRejectedValue(new Error('No target'));
        const client = new ChromePanelTargetClient();

        // Act
        const result = await client.sendAsync(
            /* targetId: */ 'panel-target',
            /* command: */ 'Runtime.evaluate',
            /* params: */ {
                expression: '40 + 2',
            },
        );

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Runtime.evaluate failed: No target',
        });
    });
});
