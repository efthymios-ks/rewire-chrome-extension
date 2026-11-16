import { describe, expect, test } from 'vitest';
import { CurlOptionParser } from './CurlOptionParser';
import { SnippetBodies } from '../SnippetBodies';

const USERS_URL = 'https://api.example.com/users';

describe('CurlOptionParser', () => {
    test('parse_WhenOnlyAUrlIsGiven_ShouldSendAGet', () => {
        // Arrange
        const args = [USERS_URL];

        // Act
        const request = CurlOptionParser.parse(args, null);

        // Assert
        expect(request).toEqual({
            method: 'GET',
            url: USERS_URL,
            headers: [],
            cookies: [],
            body: SnippetBodies.none(),
        });
    });

    test('parse_WhenNoUrlIsGiven_ShouldReturnNull', () => {
        // Arrange
        const args = [
            '-X',
            'POST',
        ];

        // Act
        const request = CurlOptionParser.parse(args, null);

        // Assert
        expect(request).toBeNull();
    });

    test('parse_WhenHeadersAndCookiesAreGiven_ShouldSplitThem', () => {
        // Arrange
        const args = [
            USERS_URL,
            '-H',
            'Accept: application/json',
            '--header',
            'Cookie: a=1; b=2',
            '-b',
            'c=3',
            '-H',
            'X-Empty;',
        ];

        // Act
        const request = CurlOptionParser.parse(args, null);

        // Assert
        expect(request?.headers).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
            {
                name: 'X-Empty',
                value: '',
            },
        ]);
        expect(request?.cookies).toEqual([
            {
                name: 'a',
                value: '1',
            },
            {
                name: 'b',
                value: '2',
            },
            {
                name: 'c',
                value: '3',
            },
        ]);
    });

    test('parse_WhenDataIsGivenTwice_ShouldJoinItAsAFormPost', () => {
        // Arrange
        const args = [
            USERS_URL,
            '-d',
            'a=1',
            '--data-urlencode',
            'b=hello world',
        ];

        // Act
        const request = CurlOptionParser.parse(args, null);

        // Assert
        expect(request?.method).toBe('POST');
        expect(request?.body).toEqual(SnippetBodies.text('a=1&b=hello%20world'));
        expect(request?.headers).toEqual([
            {
                name: 'Content-Type',
                value: 'application/x-www-form-urlencoded',
            },
        ]);
    });

    test('parse_WhenJsonIsGiven_ShouldSetTheJsonHeaders', () => {
        // Arrange
        const args = [
            '--json',
            '{"a":1}',
            USERS_URL,
        ];

        // Act
        const request = CurlOptionParser.parse(args, null);

        // Assert
        expect(request?.method).toBe('POST');
        expect(request?.body).toEqual(SnippetBodies.text('{"a":1}'));
        expect(request?.headers.map(header => `${header.name}: ${header.value}`)).toEqual([
            'Content-Type: application/json',
            'Accept: application/json',
        ]);
    });

    test('parse_WhenFormFieldsAndFilesAreGiven_ShouldBuildAMultipartBody', () => {
        // Arrange
        const args = [
            USERS_URL,
            '-F',
            'title=Hello',
            '-F',
            'avatar=@photo.png;type=image/png',
            '--form-string',
            'note=@not-a-file',
        ];

        // Act
        const request = CurlOptionParser.parse(args, null);

        // Assert
        expect(request?.method).toBe('POST');
        expect(request?.body).toEqual(SnippetBodies.multipart([
            SnippetBodies.textPart('title', 'Hello'),
            SnippetBodies.filePart({ name: 'avatar', fileName: 'photo.png', contentType: 'image/png' }),
            SnippetBodies.textPart('note', '@not-a-file'),
        ]));
    });

    test.each([
        [
            '--data-binary',
            '@payload.bin',
            'POST',
        ],
        [
            '-T',
            'payload.bin',
            'PUT',
        ],
    ])('parse_WhenTheBodyComesFrom(%s %s)_ShouldAskForTheFileAndUse(%s)', (
        option,
        value,
        expected,
    ) => {
        // Arrange
        const args = [
            USERS_URL,
            option,
            value,
        ];

        // Act
        const request = CurlOptionParser.parse(args, null);

        // Assert
        expect(request?.method).toBe(expected);
        expect(request?.body).toEqual(SnippetBodies.file('payload.bin'));
    });

    test('parse_WhenTheBodyIsReadFromStandardInput_ShouldUseThePipedText', () => {
        // Arrange
        const args = [
            USERS_URL,
            '--data-binary',
            '@-',
        ];

        // Act
        const request = CurlOptionParser.parse(args, '{"name":"ü"}');

        // Assert
        expect(request?.body).toEqual(SnippetBodies.text('{"name":"ü"}'));
    });

    test.each([
        [
            [
                '-XPUT',
                USERS_URL,
            ],
            'PUT',
        ],
        [
            [
                '-I',
                USERS_URL,
            ],
            'HEAD',
        ],
        [
            [
                '--request',
                'delete',
                USERS_URL,
            ],
            'DELETE',
        ],
        [
            [
                '-sSLX',
                'PATCH',
                USERS_URL,
            ],
            'PATCH',
        ],
    ])('parse_WhenTheArgumentsAre(%j)_ShouldUse(%s)', (args, expected) => {
        // Arrange
        const words = args;

        // Act
        const request = CurlOptionParser.parse(words, null);

        // Assert
        expect(request?.method).toBe(expected);
        expect(request?.url).toBe(USERS_URL);
    });

    test('parse_WhenGetIsForced_ShouldMoveTheDataIntoTheQuery', () => {
        // Arrange
        const args = [
            '-G',
            `${USERS_URL}?page=1`,
            '-d',
            'q=ada',
        ];

        // Act
        const request = CurlOptionParser.parse(args, null);

        // Assert
        expect(request?.method).toBe('GET');
        expect(request?.url).toBe(`${USERS_URL}?page=1&q=ada`);
        expect(request?.body).toEqual(SnippetBodies.none());
    });

    test.each([
        [
            '-u',
            'ada:secret',
            'Basic YWRhOnNlY3JldA==',
        ],
        [
            '--oauth2-bearer',
            'token-1',
            'Bearer token-1',
        ],
    ])('parse_WhenCredentialsComeFrom(%s)_ShouldSendAnAuthorizationHeader', (
        option,
        value,
        expected,
    ) => {
        // Arrange
        const args = [
            USERS_URL,
            option,
            value,
        ];

        // Act
        const request = CurlOptionParser.parse(args, null);

        // Assert
        expect(request?.headers).toEqual([
            {
                name: 'Authorization',
                value: expected,
            },
        ]);
    });

    test('parse_WhenOptionsCarryValuesItIgnores_ShouldNotMistakeThemForTheUrl', () => {
        // Arrange
        const args = [
            '-o',
            'out.json',
            '--max-time',
            '5',
            '--compressed',
            '-A',
            'Rewire',
            'api.example.com/users',
        ];

        // Act
        const request = CurlOptionParser.parse(args, null);

        // Assert
        expect(request?.url).toBe('http://api.example.com/users');
        expect(request?.headers).toEqual([
            {
                name: 'User-Agent',
                value: 'Rewire',
            },
        ]);
    });

    test.each([
        '--constructor',
        '--__proto__',
        '--__defineGetter__',
    ])('parse_WhenTheOptionIs(%s)FromTheObjectPrototype_ShouldIgnoreItAsAnUnknownFlag', option => {
        // Arrange
        const args = [
            option,
            USERS_URL,
        ];

        // Act
        const request = CurlOptionParser.parse(args, null);

        // Assert
        expect(request?.url).toBe(USERS_URL);
        expect(request?.method).toBe('GET');
    });
});
