import { describe, expect, test } from 'vitest';
import { ClientBodies } from './ClientBodies';
import { CLIENT_BODY_TYPE } from './ClientBodyType';
import type { ClientRequest } from './ClientRequest';
import { ClientRoutes } from './ClientRoutes';

function aRequest(changes: Partial<ClientRequest> = {}): ClientRequest {
    return {
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: [],
        body: ClientBodies.empty(),
        ...changes,
    };
}

const TEXT_BODY = {
    ...ClientBodies.empty(),
    type: CLIENT_BODY_TYPE.Text,
    text: 'hello',
};

describe('ClientRoutes', () => {
    test.each([
        [
            'a plain GET',
            aRequest(),
            false,
        ],
        [
            'a GET with a body',
            aRequest({
                body: TEXT_BODY,
            }),
            true,
        ],
        [
            'a POST with a body',
            aRequest({
                method: 'POST',
                body: TEXT_BODY,
            }),
            false,
        ],
        [
            'a Cookie header',
            aRequest({
                headers: [
                    {
                        name: ' cookie ',
                        value: 'session=abc',
                    },
                ],
            }),
            true,
        ],
        [
            'a User-Agent header',
            aRequest({
                headers: [
                    {
                        name: 'User-Agent',
                        value: 'Rewire',
                    },
                ],
            }),
            true,
        ],
        [
            'an empty Cookie header',
            aRequest({
                headers: [
                    {
                        name: 'Cookie',
                        value: '',
                    },
                ],
            }),
            false,
        ],
        [
            'an ordinary header',
            aRequest({
                headers: [
                    {
                        name: 'Authorization',
                        value: 'Bearer x',
                    },
                ],
            }),
            false,
        ],
    ])('needsDebugger_WhenTheRequestHas(%s)_ShouldReturn(%s)', (
        _case,
        request,
        expected,
    ) => {
        // Arrange
        const candidate = request;

        // Act
        const needsDebugger = ClientRoutes.needsDebugger(candidate);

        // Assert
        expect(needsDebugger).toBe(expected);
    });

    test('bodySent_WhenAGetGoesThroughTheDebugger_ShouldKeepTheBody', () => {
        // Arrange
        const request = aRequest({
            body: TEXT_BODY,
        });

        // Act
        const body = ClientRoutes.bodySent(request);

        // Assert
        expect(body).toBe(TEXT_BODY);
    });

    test('bodySent_WhenAHeadGoesThroughTheBrowserWithoutABody_ShouldBeEmpty', () => {
        // Arrange
        const request = aRequest({
            method: 'HEAD',
        });

        // Act
        const body = ClientRoutes.bodySent(request);

        // Assert
        expect(body.type).toBe(CLIENT_BODY_TYPE.None);
    });
});
