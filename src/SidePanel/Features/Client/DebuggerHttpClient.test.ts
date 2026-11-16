import { describe, expect, test, vi } from 'vitest';
import { Base64Text } from '../../../Common/Encoding/Base64Text';
import { Result } from '../../../Common/Results/Result';
import type { SendClientRequestCommand } from '../../../Contracts/Messaging/Commands/SendClientRequestCommand';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import type { WorkerConnection } from '../../Core/WorkerConnection';
import { ClientBodies } from './ClientBodies';
import { CLIENT_BODY_TYPE } from './ClientBodyType';
import type { ClientRequest } from './ClientRequest';
import { DebuggerHttpClient } from './DebuggerHttpClient';

const ANSWER = {
    status: 200,
    statusText: 'OK',
    headers: [],
    body: '{"token":"x"}',
    durationInMilliseconds: 9,
};

function aConnection(): WorkerConnection {
    return {
        sendAsync: vi.fn().mockResolvedValue(Result.ok(ANSWER)) as WorkerConnection['sendAsync'],
        onEvent: vi.fn(),
        onReconnect: vi.fn(),
    };
}

function aRequest(changes: Partial<ClientRequest> = {}): ClientRequest {
    return {
        method: 'get',
        url: 'https://login.example.com/token',
        headers: [],
        body: ClientBodies.empty(),
        ...changes,
    };
}

function sentCommandOf(connection: WorkerConnection): SendClientRequestCommand {
    return vi.mocked(connection.sendAsync).mock.calls[0]![0] as SendClientRequestCommand;
}

describe('DebuggerHttpClient', () => {
    test('sendAsync_WhenAGetHasAForm_ShouldSendItsBytesWithTheFormType', async () => {
        // Arrange
        const connection = aConnection();
        const request = aRequest({
            headers: [
                {
                    name: 'Cookie',
                    value: 'session=abc',
                },
            ],
            body: {
                ...ClientBodies.empty(),
                type: CLIENT_BODY_TYPE.FormUrlEncoded,
                formRows: [
                    {
                        name: 'client_id',
                        value: 'app',
                    },
                    {
                        name: 'scope',
                        value: 'api://x/.default',
                    },
                ],
            },
        });

        // Act
        const result = await new DebuggerHttpClient(connection).sendAsync(request);

        // Assert
        expect(result).toEqual(Result.ok(ANSWER));
        expect(sentCommandOf(connection)).toEqual({
            type: PANEL_COMMAND_TYPE.SendClientRequest,
            request: {
                method: 'GET',
                url: 'https://login.example.com/token',
                headers: [
                    {
                        name: 'Cookie',
                        value: 'session=abc',
                    },
                    {
                        name: 'Content-Type',
                        value: 'application/x-www-form-urlencoded',
                    },
                ],
                bodyBase64: Base64Text.fromUtf8('client_id=app&scope=api%3A%2F%2Fx%2F.default'),
            },
        });
    });

    test('sendAsync_WhenTheBodyIsMultipart_ShouldSendTheBoundaryTheBrowserPicked', async () => {
        // Arrange
        const connection = aConnection();
        const request = aRequest({
            body: {
                ...ClientBodies.empty(),
                type: CLIENT_BODY_TYPE.Multipart,
                multipartRows: [
                    {
                        name: 'note',
                        value: 'hello',
                        isFile: false,
                        file: null,
                        fileName: '',
                    },
                ],
            },
        });

        // Act
        await new DebuggerHttpClient(connection).sendAsync(request);

        // Assert
        const sent = sentCommandOf(connection).request;
        const contentType = sent.headers.find(header => header.name === 'Content-Type')?.value ?? '';
        const boundary = contentType.split('boundary=')[1] ?? '';
        expect(contentType.startsWith('multipart/form-data; boundary=')).toBe(true);
        expect(Base64Text.toUtf8(sent.bodyBase64!)).toContain(`--${boundary}`);
        expect(Base64Text.toUtf8(sent.bodyBase64!)).toContain('hello');
    });

    test('sendAsync_WhenThereIsNoBody_ShouldSendNoBytes', async () => {
        // Arrange
        const connection = aConnection();

        // Act
        await new DebuggerHttpClient(connection).sendAsync(aRequest());

        // Assert
        expect(sentCommandOf(connection).request.bodyBase64).toBeNull();
    });

    test('sendAsync_WhenHeaderNamesHaveSpaces_ShouldTrimThemLikeTheFetchRoute', async () => {
        // Arrange
        const connection = aConnection();
        const request = aRequest({
            headers: [
                {
                    name: '  X-Trace ',
                    value: '1',
                },
            ],
        });

        // Act
        await new DebuggerHttpClient(connection).sendAsync(request);

        // Assert
        expect(sentCommandOf(connection).request.headers).toEqual([
            {
                name: 'X-Trace',
                value: '1',
            },
        ]);
    });

    test('sendAsync_WhenTheUrlIsInvalid_ShouldNotSend', async () => {
        // Arrange
        const connection = aConnection();

        // Act
        const result = await new DebuggerHttpClient(connection).sendAsync(aRequest({
            url: 'not a url',
        }));

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'URL is not valid.',
        });
        expect(connection.sendAsync).not.toHaveBeenCalled();
    });
});
