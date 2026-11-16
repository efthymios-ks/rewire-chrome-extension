import { describe, expect, test } from 'vitest';
import { SNIPPET_BODY_KIND } from '../../../Common/CodeGen/SnippetBodyKind';
import { ClientBodies } from './ClientBodies';
import type { ClientBody } from './ClientBody';
import { CLIENT_BODY_TYPE, type ClientBodyType } from './ClientBodyType';

function aBody(type: ClientBodyType, changes: Partial<ClientBody> = {}): ClientBody {
    return {
        ...ClientBodies.empty(),
        type,
        ...changes,
    };
}

const PHOTO_FILE = new File(
    /* fileBits: */ ['png-bytes'],
    /* fileName: */ 'photo.png',
    /* options: */ {
        type: 'image/png',
    },
);
const UNTYPED_FILE = new File(['raw'], 'payload.bin');

describe('ClientBodies', () => {
    test.each([
        [
            CLIENT_BODY_TYPE.None,
            null,
        ],
        [
            CLIENT_BODY_TYPE.Text,
            'text/plain',
        ],
        [
            CLIENT_BODY_TYPE.Json,
            'application/json',
        ],
        [
            CLIENT_BODY_TYPE.Xml,
            'application/xml',
        ],
        [
            CLIENT_BODY_TYPE.FormUrlEncoded,
            'application/x-www-form-urlencoded',
        ],
        [
            CLIENT_BODY_TYPE.Multipart,
            null,
        ],
        [
            CLIENT_BODY_TYPE.GraphQl,
            'application/json',
        ],
    ])('contentTypeOf_WhenTheTypeIs(%s)_ShouldReturn(%s)', (type, expected) => {
        // Arrange
        const body = aBody(type);

        // Act
        const contentType = ClientBodies.contentTypeOf(body);

        // Assert
        expect(contentType).toBe(expected);
    });

    test.each([
        [
            PHOTO_FILE,
            'image/png',
        ],
        [
            UNTYPED_FILE,
            'application/octet-stream',
        ],
        [
            null,
            null,
        ],
    ])('contentTypeOf_WhenABinaryBodyHoldsFile(%s)_ShouldReturn(%s)', (file, expected) => {
        // Arrange
        const body = aBody(CLIENT_BODY_TYPE.Binary, {
            file,
        });

        // Act
        const contentType = ClientBodies.contentTypeOf(body);

        // Assert
        expect(contentType).toBe(expected);
    });

    test('withContentType_WhenTheUserSetOne_ShouldKeepTheirs', () => {
        // Arrange
        const headers = [
            {
                name: 'content-type',
                value: 'application/vnd.api+json',
            },
        ];

        // Act
        const sent = ClientBodies.withContentType(
            /* headers: */ headers,
            /* body: */ aBody(CLIENT_BODY_TYPE.Json),
        );

        // Assert
        expect(sent).toEqual(headers);
    });

    test('withContentType_WhenNoneIsSet_ShouldAddTheBodyTypeAndDropBlankRows', () => {
        // Arrange
        const headers = [
            {
                name: '',
                value: '',
            },
            {
                name: 'Accept',
                value: '*/*',
            },
        ];

        // Act
        const sent = ClientBodies.withContentType(
            /* headers: */ headers,
            /* body: */ aBody(CLIENT_BODY_TYPE.Xml),
        );

        // Assert
        expect(sent).toEqual([
            {
                name: 'Accept',
                value: '*/*',
            },
            {
                name: 'Content-Type',
                value: 'application/xml',
            },
        ]);
    });

    test('fetchBodyOf_WhenTheBodyIsAForm_ShouldEncodeTheNamedRows', () => {
        // Arrange
        const body = aBody(CLIENT_BODY_TYPE.FormUrlEncoded, {
            formRows: [
                {
                    name: 'q',
                    value: 'ada lovelace',
                },
                {
                    name: '',
                    value: 'ignored',
                },
            ],
        });

        // Act
        const sent = ClientBodies.fetchBodyOf(body);

        // Assert
        expect(String(sent)).toBe('q=ada+lovelace');
    });

    test('fetchBodyOf_WhenTheBodyIsMultipart_ShouldSendTextAndPickedFiles', () => {
        // Arrange
        const body = aBody(CLIENT_BODY_TYPE.Multipart, {
            multipartRows: [
                {
                    name: 'title',
                    value: 'Hello',
                    isFile: false,
                    file: null,
                    fileName: '',
                },
                {
                    name: 'avatar',
                    value: '',
                    isFile: true,
                    file: PHOTO_FILE,
                    fileName: 'photo.png',
                },
                {
                    name: 'missing',
                    value: '',
                    isFile: true,
                    file: null,
                    fileName: 'later.png',
                },
            ],
        });

        // Act
        const sent = ClientBodies.fetchBodyOf(body) as FormData;

        // Assert
        expect(sent.get('title')).toBe('Hello');
        expect((sent.get('avatar') as File).name).toBe('photo.png');
        expect(sent.has('missing')).toBe(false);
    });

    test('fetchBodyOf_WhenTheBodyIsGraphQl_ShouldWrapTheQueryInJson', () => {
        // Arrange
        const body = aBody(CLIENT_BODY_TYPE.GraphQl, {
            graphQlQuery: '{ users { id } }',
        });

        // Act
        const sent = ClientBodies.fetchBodyOf(body);

        // Assert
        expect(sent).toBe('{"query":"{ users { id } }"}');
    });

    test.each([
        [
            aBody(CLIENT_BODY_TYPE.Binary, {
                file: PHOTO_FILE,
            }),
            'photo.png (9 bytes)',
        ],
        [
            aBody(CLIENT_BODY_TYPE.Multipart, {
                multipartRows: [
                    {
                        name: 'title',
                        value: 'Hello',
                        isFile: false,
                        file: null,
                        fileName: '',
                    },
                    {
                        name: 'avatar',
                        value: '',
                        isFile: true,
                        file: PHOTO_FILE,
                        fileName: 'photo.png',
                    },
                ],
            }),
            'title: Hello\navatar: photo.png (9 bytes)',
        ],
    ])('logTextOf_WhenTheBodyHoldsFiles(%#)_ShouldLogNamesAndSizesInsteadOfContents', (body, expected) => {
        // Arrange
        const sent = body;

        // Act
        const text = ClientBodies.logTextOf(sent);

        // Assert
        expect(text).toBe(expected);
    });

    test.each([
        'GET',
        'head',
    ])('sentWith_WhenTheMethodIs(%s)_ShouldSendNoBody', method => {
        // Arrange
        const body = aBody(CLIENT_BODY_TYPE.Json, {
            text: '{}',
        });

        // Act
        const sent = ClientBodies.sentWith(method, body);

        // Assert
        expect(sent.type).toBe(CLIENT_BODY_TYPE.None);
    });

    test.each([
        [
            'GET',
            CLIENT_BODY_TYPE.FormUrlEncoded,
            true,
        ],
        [
            'head',
            CLIENT_BODY_TYPE.Text,
            true,
        ],
        [
            'GET',
            CLIENT_BODY_TYPE.None,
            false,
        ],
        [
            'POST',
            CLIENT_BODY_TYPE.Json,
            false,
        ],
    ])('dropsBody_WhenTheMethodIs(%s)AndTheBodyType(%s)_ShouldReturn(%s)', (
        method,
        type,
        expected,
    ) => {
        // Arrange
        const body = {
            ...ClientBodies.empty(),
            type,
        };

        // Act
        const isDropped = ClientBodies.dropsBody(method, body);

        // Assert
        expect(isDropped).toBe(expected);
    });

    test('snippetBodyOf_WhenTheBodyIsMultipart_ShouldKeepNamedTextAndFileParts', () => {
        // Arrange
        const body = aBody(CLIENT_BODY_TYPE.Multipart, {
            multipartRows: [
                {
                    name: 'title',
                    value: 'Cap',
                    isFile: false,
                    file: null,
                    fileName: '',
                },
                {
                    name: 'photo',
                    value: '',
                    isFile: true,
                    file: PHOTO_FILE,
                    fileName: '',
                },
                {
                    name: 'empty',
                    value: '',
                    isFile: true,
                    file: null,
                    fileName: '',
                },
                {
                    name: '',
                    value: 'unnamed',
                    isFile: false,
                    file: null,
                    fileName: '',
                },
            ],
        });

        // Act
        const snippetBody = ClientBodies.snippetBodyOf(body);

        // Assert
        expect(snippetBody).toEqual({
            kind: SNIPPET_BODY_KIND.Multipart,
            parts: [
                {
                    name: 'title',
                    value: 'Cap',
                    fileName: null,
                    contentType: '',
                },
                {
                    name: 'photo',
                    value: '',
                    fileName: 'photo.png',
                    contentType: 'image/png',
                },
            ],
        });
    });

    test.each([
        [
            UNTYPED_FILE,
            '',
            'payload.bin',
        ],
        [
            null,
            'pasted.bin',
            'pasted.bin',
        ],
    ])('snippetBodyOf_WhenTheBodyIsAFile_ShouldNameIt(%s, %s)', (
        file,
        fileName,
        expected,
    ) => {
        // Arrange
        const body = aBody(CLIENT_BODY_TYPE.Binary, {
            file,
            fileName,
        });

        // Act
        const snippetBody = ClientBodies.snippetBodyOf(body);

        // Assert
        expect(snippetBody).toEqual({
            kind: SNIPPET_BODY_KIND.File,
            fileName: expected,
        });
    });
});
