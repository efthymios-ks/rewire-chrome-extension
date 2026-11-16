import type { Protocol } from 'devtools-protocol';
import { describe, expect, test, vi } from 'vitest';
import { RequestWillBeSentHandler } from './RequestWillBeSentHandler';
import type { DebuggerClient } from '../Debugging/DebuggerClient';
import { Base64Text } from '../../../Common/Encoding/Base64Text';
import { Result } from '../../../Common/Results/Result';
import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { CONTENT_KIND } from '../../../Contracts/Timeline/ContentKind';
import type { TimelineAnnotation } from '../../../Contracts/Timeline/TimelineAnnotation';
import { TIMELINE_ENTRY_STATE } from '../../../Contracts/Timeline/TimelineEntryState';
import { createLogger } from '../../../TestData';
import {
    aRequestWillBeSentEvent,
    binaryBytesOf,
    type CaptureParts,
    captureParts,
    compressAsync,
    createDebuggerClientMock,
} from '../../BackgroundTestData';

const TAB_ID = 7;
const POSTS_URL = 'https://jsonplaceholder.typicode.com/posts';
const USERS_URL = 'https://jsonplaceholder.typicode.com/users';
const TODOS_URL = 'https://jsonplaceholder.typicode.com/todos';
const PAGE_URL = 'https://shop.example.com/';
const SEARCH_URL = 'https://shop.example.com/flights/search';
const IFRAME_URL = 'https://pay.example.com/checkout';
const INSECURE_PAGE_URL = 'http://shop.example.com/';
const HOME_URL = 'https://shop.example.com/home';
const LOCAL_PAGE_URL = 'http://localhost:3000/';
const TOP_FRAME_ID = 'frame-top';
const IFRAME_ID = 'frame-pay';
const FORM_BODY = 'origin=ATH&destination=SKG&adults=1';
const FORM_POST_REQUEST: Partial<Protocol.Network.Request> = {
    url: SEARCH_URL,
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Sec-Fetch-Dest': 'document',
    },
    hasPostData: true,
};
const REWRITE_ANNOTATION: TimelineAnnotation = {
    appliedRules: [
        {
            ruleId: 'rewrite-1',
            ruleName: 'Rewrite',
            engine: 1,
            note: 'Rewrite',
        },
    ],
    changes: [],
    isAnsweredByRule: false,
};
const HEADER_ANNOTATION: TimelineAnnotation = {
    appliedRules: [
        {
            ruleId: 'header-1',
            ruleName: 'Debug header',
            engine: 1,
            note: 'Request header',
        },
    ],
    changes: [
        {
            area: CHANGE_AREA.RequestHeader,
            name: 'X-Debug',
            before: null,
            after: '1',
        },
    ],
    isAnsweredByRule: false,
};

function handlerOf(
    parts: CaptureParts,
    debuggerClient: DebuggerClient = createDebuggerClientMock().client,
): RequestWillBeSentHandler {
    return new RequestWillBeSentHandler({
        timelineStore: parts.timelineStore,
        admission: parts.admission,
        captureFilter: parts.captureFilter,
        recordFactory: parts.recordFactory,
        recordClassifier: parts.recordClassifier,
        browserRuleSimulator: parts.browserRuleSimulator,
        debuggerClient,
        logger: createLogger(),
    });
}

function aPostEvent(request: Partial<Protocol.Network.Request>): Protocol.Network.RequestWillBeSentEvent {
    return aRequestWillBeSentEvent({
        request: {
            url: POSTS_URL,
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
            },
            hasPostData: true,
            initialPriority: 'High',
            referrerPolicy: 'strict-origin-when-cross-origin',
            ...request,
        },
    });
}

function aHop(url: string, redirectedFrom: string | null = null): Protocol.Network.RequestWillBeSentEvent {
    return aRequestWillBeSentEvent({
        request: {
            url,
            method: 'GET',
            headers: {},
            initialPriority: 'High',
            referrerPolicy: 'strict-origin-when-cross-origin',
        },
        redirectResponse: redirectedFrom == null
            ? undefined
            : {
                url: redirectedFrom,
                status: 302,
                statusText: 'Found',
                headers: {
                    location: url,
                },
                mimeType: '',
                charset: '',
                connectionReused: false,
                connectionId: 1,
                encodedDataLength: 0,
                securityState: 'secure',
            },
    });
}

interface RedirectResponseOptions {
    from: string;
    status: number;
    statusText: string;
}

function aRedirectResponse({ from, status, statusText }: RedirectResponseOptions): Protocol.Network.Response {
    return {
        url: from,
        status,
        statusText,
        headers: {},
        mimeType: '',
        charset: '',
        connectionReused: false,
        connectionId: 1,
        encodedDataLength: 0,
        securityState: 'secure',
    };
}

function aNavigation(
    request: Partial<Protocol.Network.Request> = {},
    overrides: Partial<Protocol.Network.RequestWillBeSentEvent> = {},
): Protocol.Network.RequestWillBeSentEvent {
    return aRequestWillBeSentEvent({
        type: 'Document',
        documentURL: request.url ?? PAGE_URL,
        frameId: TOP_FRAME_ID,
        initiator: {
            type: 'other',
        },
        request: {
            url: PAGE_URL,
            method: 'GET',
            headers: {
                Accept: 'text/html,application/xhtml+xml',
                'Sec-Fetch-Dest': 'document',
            },
            initialPriority: 'VeryHigh',
            referrerPolicy: 'strict-origin-when-cross-origin',
            ...request,
        },
        ...overrides,
    });
}

function aRedirectedNavigation(
    url: string,
    redirect: RedirectResponseOptions,
): Protocol.Network.RequestWillBeSentEvent {
    return aNavigation(
        /* request: */ {
            url,
        },
        /* overrides: */ {
            redirectResponse: aRedirectResponse(redirect),
        },
    );
}

describe('RequestWillBeSentHandler', () => {
    test('handleAsync_WhenAFetchIsSent_ShouldAddItToTheTimeline', async () => {
        // Arrange
        const parts = captureParts();
        const handler = handlerOf(parts);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aRequestWillBeSentEvent(),
        );

        // Assert
        expect(parts.timelineStore.list(TAB_ID)).toHaveLength(1);
    });

    test('handleAsync_WhenAPageLoads_ShouldAddTheDocumentToTheTimeline', async () => {
        // Arrange
        const parts = captureParts();
        const handler = handlerOf(parts);

        // Act
        await handler.handleAsync(TAB_ID, aNavigation());

        // Assert
        const record = parts.timelineStore.get(TAB_ID, 'request-1');
        expect(parts.timelineStore.list(TAB_ID)).toHaveLength(1);
        expect(record?.summary).toMatchObject({
            url: PAGE_URL,
            method: 'GET',
            resourceType: 'Document',
            state: TIMELINE_ENTRY_STATE.Pending,
            contentKind: CONTENT_KIND.Other,
        });
        expect(record?.requestHeaders).toContainEqual({
            name: 'Sec-Fetch-Dest',
            value: 'document',
        });
    });

    test('handleAsync_WhenAFormPostNavigates_ShouldCaptureItWithItsBody', async () => {
        // Arrange
        const parts = captureParts();
        const debuggerMock = createDebuggerClientMock();
        const handler = handlerOf(parts, debuggerMock.client);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aNavigation({
                ...FORM_POST_REQUEST,
                postData: FORM_BODY,
                postDataEntries: [
                    {
                        bytes: Base64Text.fromUtf8(FORM_BODY),
                    },
                ],
            }),
        );

        // Assert
        const record = parts.timelineStore.get(TAB_ID, 'request-1');
        expect(record?.summary).toMatchObject({
            url: SEARCH_URL,
            method: 'POST',
            resourceType: 'Document',
            contentKind: CONTENT_KIND.FormData,
        });
        expect(record?.requestBody).toBe(FORM_BODY);
        expect(debuggerMock.send).not.toHaveBeenCalled();
    });

    test('handleAsync_WhenAFormPostNavigatesWithoutInlineData_ShouldFetchItsBody', async () => {
        // Arrange
        const parts = captureParts();
        const debuggerMock = createDebuggerClientMock();
        debuggerMock.send.mockResolvedValueOnce(Result.ok({
            postData: FORM_BODY,
            base64Encoded: false,
        }));
        const handler = handlerOf(parts, debuggerMock.client);

        // Act
        await handler.handleAsync(TAB_ID, aNavigation(FORM_POST_REQUEST));

        // Assert
        const record = parts.timelineStore.get(TAB_ID, 'request-1');
        expect(debuggerMock.send).toHaveBeenCalledWith(
            /* tabId: */ TAB_ID,
            /* command: */ 'Network.getRequestPostData',
            /* params: */ {
                requestId: 'request-1',
            },
        );
        expect(record?.requestBody).toBe(FORM_BODY);
        expect(record?.summary.contentKind).toBe(CONTENT_KIND.FormData);
    });

    test('handleAsync_WhenAnIframeLoadsADocument_ShouldCaptureItUnderThatIframe', async () => {
        // Arrange
        const parts = captureParts();
        parts.frameRegistry.setTop(TAB_ID, TOP_FRAME_ID);
        const handler = handlerOf(parts);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aNavigation(
                /* request: */ {
                    url: IFRAME_URL,
                    headers: {
                        'Sec-Fetch-Dest': 'iframe',
                    },
                },
                /* overrides: */ {
                    frameId: IFRAME_ID,
                },
            ),
        );

        // Assert
        const record = parts.timelineStore.get(TAB_ID, 'request-1');
        expect(record?.summary.resourceType).toBe('Document');
        expect(record?.summary.frame).toEqual({
            id: IFRAME_ID,
            url: IFRAME_URL,
            isTop: false,
        });
    });

    test('handleAsync_WhenAnImageIsRequested_ShouldSkipIt', async () => {
        // Arrange
        const parts = captureParts();
        const handler = handlerOf(parts);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aRequestWillBeSentEvent({
                type: 'Image',
            }),
        );

        // Assert
        expect(parts.timelineStore.list(TAB_ID)).toHaveLength(0);
    });

    test('handleAsync_WhenAnAdmittedRequestRedirects_ShouldSplitIntoTwoRows', async () => {
        // Arrange
        const parts = captureParts();
        const handler = handlerOf(parts);
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aRequestWillBeSentEvent({
                request: {
                    url: 'https://jsonplaceholder.typicode.com/posts',
                    method: 'GET',
                    headers: {},
                    initialPriority: 'High',
                    referrerPolicy: 'strict-origin-when-cross-origin',
                },
            }),
        );

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aRequestWillBeSentEvent({
                request: {
                    url: 'https://jsonplaceholder.typicode.com/users',
                    method: 'GET',
                    headers: {},
                    initialPriority: 'High',
                    referrerPolicy: 'strict-origin-when-cross-origin',
                },
                redirectResponse: {
                    url: 'https://jsonplaceholder.typicode.com/posts',
                    status: 308,
                    statusText: 'Permanent Redirect',
                    headers: {
                        location: 'https://jsonplaceholder.typicode.com/users',
                    },
                    mimeType: '',
                    charset: '',
                    connectionReused: false,
                    connectionId: 1,
                    encodedDataLength: 0,
                    securityState: 'secure',
                },
            }),
        );

        // Assert
        const entries = parts.timelineStore.list(TAB_ID);
        expect(entries).toHaveLength(2);
        const leg = entries.find(entry => entry.id === 'request-1-leg-1');
        const live = entries.find(entry => entry.id === 'request-1');
        expect(leg?.url).toBe('https://jsonplaceholder.typicode.com/posts');
        expect(leg?.statusCode).toBe(308);
        expect(live?.url).toBe('https://jsonplaceholder.typicode.com/users');
        expect(live?.redirectedFromUrl).toBe('https://jsonplaceholder.typicode.com/posts');
        expect(live?.statusCode).toBeNull();
    });

    test('handleAsync_WhenAPageRedirectsTwice_ShouldKeepEachHopInItsOwnRow', async () => {
        // Arrange
        const parts = captureParts();
        const handler = handlerOf(parts);
        await handler.handleAsync(TAB_ID, aNavigation({ url: INSECURE_PAGE_URL }));
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aRedirectedNavigation(PAGE_URL, {
                from: INSECURE_PAGE_URL,
                status: 301,
                statusText: 'Moved Permanently',
            }),
        );

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aRedirectedNavigation(HOME_URL, {
                from: PAGE_URL,
                status: 302,
                statusText: 'Found',
            }),
        );

        // Assert
        expect(parts.timelineStore.list(TAB_ID)).toHaveLength(3);
        expect(parts.timelineStore.get(TAB_ID, 'request-1-leg-1')?.summary).toMatchObject({
            url: INSECURE_PAGE_URL,
            statusCode: 301,
            resourceType: 'Document',
            state: TIMELINE_ENTRY_STATE.Completed,
        });
        expect(parts.timelineStore.get(TAB_ID, 'request-1-leg-2')?.summary).toMatchObject({
            url: PAGE_URL,
            statusCode: 302,
            redirectedFromUrl: INSECURE_PAGE_URL,
        });
        expect(parts.timelineStore.get(TAB_ID, 'request-1')?.summary).toMatchObject({
            url: HOME_URL,
            statusCode: null,
            redirectedFromUrl: PAGE_URL,
        });
    });

    test('handleAsync_WhenAFormPostRedirectsToAPage_ShouldKeepTheBodyOnThePostRowOnly', async () => {
        // Arrange
        const parts = captureParts();
        const handler = handlerOf(parts);
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aNavigation({
                ...FORM_POST_REQUEST,
                postData: FORM_BODY,
            }),
        );

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aRedirectedNavigation(HOME_URL, {
                from: SEARCH_URL,
                status: 302,
                statusText: 'Found',
            }),
        );

        // Assert
        const leg = parts.timelineStore.get(TAB_ID, 'request-1-leg-1');
        const live = parts.timelineStore.get(TAB_ID, 'request-1');
        expect(leg?.summary).toMatchObject({
            method: 'POST',
            statusCode: 302,
            contentKind: CONTENT_KIND.FormData,
        });
        expect(leg?.requestBody).toBe(FORM_BODY);
        expect(live?.summary.method).toBe('GET');
        expect(live?.summary.contentKind).toBe(CONTENT_KIND.Other);
        expect(live?.requestBody).toBeNull();
    });

    test('handleAsync_WhenADnrRuleRewritesAPage_ShouldKeepTheRuleOnItsInternalRedirectRow', async () => {
        // Arrange
        const parts = captureParts();
        parts.browserRuleSimulator.simulateRequest = vi.fn().mockReturnValue(REWRITE_ANNOTATION);
        const handler = handlerOf(parts);
        await handler.handleAsync(TAB_ID, aNavigation());

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aRedirectedNavigation(LOCAL_PAGE_URL, {
                from: PAGE_URL,
                status: 307,
                statusText: 'Internal Redirect',
            }),
        );

        // Assert
        const leg = parts.timelineStore.get(TAB_ID, 'request-1-leg-1');
        const live = parts.timelineStore.get(TAB_ID, 'request-1');
        expect(leg?.summary).toMatchObject({
            url: PAGE_URL,
            statusCode: 307,
            statusText: 'Internal Redirect',
            resourceType: 'Document',
        });
        expect(leg?.summary.appliedRules.map(rule => rule.ruleId)).toEqual(['rewrite-1']);
        expect(live?.summary.url).toBe(LOCAL_PAGE_URL);
        expect(live?.summary.redirectedFromUrl).toBe(PAGE_URL);
        expect(live?.summary.appliedRules).toEqual([]);
    });

    test('handleAsync_WhenRedirectFires_ShouldKeepTheBrowserRulesOnTheLegAndClearTheLiveRow', async () => {
        // Arrange
        const parts = captureParts();
        parts.browserRuleSimulator.simulateRequest = vi.fn().mockReturnValue(REWRITE_ANNOTATION);
        const handler = handlerOf(parts);
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aRequestWillBeSentEvent({
                request: {
                    url: 'https://jsonplaceholder.typicode.com/posts',
                    method: 'GET',
                    headers: {},
                    initialPriority: 'High',
                    referrerPolicy: 'strict-origin-when-cross-origin',
                },
            }),
        );

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aRequestWillBeSentEvent({
                request: {
                    url: 'https://jsonplaceholder.typicode.com/users',
                    method: 'GET',
                    headers: {},
                    initialPriority: 'High',
                    referrerPolicy: 'strict-origin-when-cross-origin',
                },
                redirectResponse: {
                    url: 'https://jsonplaceholder.typicode.com/posts',
                    status: 307,
                    statusText: 'Internal Redirect',
                    headers: {},
                    mimeType: '',
                    charset: '',
                    connectionReused: false,
                    connectionId: 1,
                    encodedDataLength: 0,
                    securityState: 'secure',
                },
            }),
        );

        // Assert
        const leg = parts.timelineStore.get(TAB_ID, 'request-1-leg-1');
        const live = parts.timelineStore.get(TAB_ID, 'request-1');
        expect(leg?.summary.appliedRules.map(rule => rule.ruleId)).toEqual(['rewrite-1']);
        expect(live?.summary.appliedRules).toEqual([]);
    });

    test('handleAsync_WhenAnAdmittedRequestRedirects_ShouldRecordTheFirstHopChangesOnce', async () => {
        // Arrange
        const parts = captureParts();
        parts.browserRuleSimulator.simulateRequest = vi.fn().mockReturnValue(HEADER_ANNOTATION);
        const handler = handlerOf(parts);
        await handler.handleAsync(TAB_ID, aHop(POSTS_URL));

        // Act
        await handler.handleAsync(TAB_ID, aHop(USERS_URL, POSTS_URL));

        // Assert
        const leg = parts.timelineStore.get(TAB_ID, 'request-1-leg-1');
        expect(leg?.summary.url).toBe(POSTS_URL);
        expect(leg?.changes).toEqual(HEADER_ANNOTATION.changes);
    });

    test('handleAsync_WhenARedirectedHopRedirectsAgain_ShouldRecordThatHopChangesOnce', async () => {
        // Arrange
        const parts = captureParts();
        parts.browserRuleSimulator.simulateRequest = vi.fn().mockReturnValue(HEADER_ANNOTATION);
        const handler = handlerOf(parts);
        await handler.handleAsync(TAB_ID, aHop(POSTS_URL));
        await handler.handleAsync(TAB_ID, aHop(USERS_URL, POSTS_URL));

        // Act
        await handler.handleAsync(TAB_ID, aHop(TODOS_URL, USERS_URL));

        // Assert
        const leg = parts.timelineStore.get(TAB_ID, 'request-1-leg-2');
        expect(leg?.summary.url).toBe(USERS_URL);
        expect(leg?.summary.appliedRules.map(rule => rule.ruleId)).toEqual(['header-1']);
        expect(leg?.changes).toEqual(HEADER_ANNOTATION.changes);
    });

    test('handleAsync_WhenAGzipBodyArrivesInPostDataEntries_ShouldStoreTheDecompressedText', async () => {
        // Arrange
        const parts = captureParts();
        const debuggerMock = createDebuggerClientMock();
        const handler = handlerOf(parts, debuggerMock.client);
        const gzip = await compressAsync('{"page":"home"}', 'gzip');

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPostEvent({
                postData: '\u001f�\b\u0000',
                postDataEntries: [
                    {
                        bytes: Base64Text.fromBytes(gzip),
                    },
                ],
            }),
        );

        // Assert
        const record = parts.timelineStore.get(TAB_ID, 'request-1');
        expect(record?.requestBody).toBe('{"page":"home"}');
        expect(record?.requestBodyNote).toBe(`Decompressed from gzip (${gzip.length} bytes → 15 bytes).`);
        expect(record?.requestBodyBase64).toBeNull();
        expect(record?.requestBodyByteSize).toBe(gzip.length);
        expect(debuggerMock.send).not.toHaveBeenCalled();
    });

    test('handleAsync_WhenTheBodyIsFetchedAsBase64Gzip_ShouldStoreTheDecompressedText', async () => {
        // Arrange
        const parts = captureParts();
        const debuggerMock = createDebuggerClientMock();
        const gzip = await compressAsync('{"page":"home"}', 'gzip');
        debuggerMock.send.mockResolvedValueOnce(Result.ok({
            postData: Base64Text.fromBytes(gzip),
            base64Encoded: true,
        }));
        const handler = handlerOf(parts, debuggerMock.client);

        // Act
        await handler.handleAsync(TAB_ID, aPostEvent({}));

        // Assert
        const record = parts.timelineStore.get(TAB_ID, 'request-1');
        expect(debuggerMock.send).toHaveBeenCalledWith(
            /* tabId: */ TAB_ID,
            /* command: */ 'Network.getRequestPostData',
            /* params: */ {
                requestId: 'request-1',
            },
        );
        expect(record?.requestBody).toBe('{"page":"home"}');
        expect(record?.requestBodyNote).toBe(`Decompressed from gzip (${gzip.length} bytes → 15 bytes).`);
        expect(record?.requestBodyByteSize).toBe(gzip.length);
    });

    test('handleAsync_WhenTheFetchedBodyIsText_ShouldStoreAndClassifyIt', async () => {
        // Arrange
        const parts = captureParts();
        const debuggerMock = createDebuggerClientMock();
        debuggerMock.send.mockResolvedValueOnce(Result.ok({
            postData: '{"query":"{ me { id } }"}',
            base64Encoded: false,
        }));
        const handler = handlerOf(parts, debuggerMock.client);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPostEvent({
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
        );

        // Assert
        const record = parts.timelineStore.get(TAB_ID, 'request-1');
        expect(record?.requestBody).toBe('{"query":"{ me { id } }"}');
        expect(record?.requestBodyNote).toBeNull();
        expect(record?.requestBodyByteSize).toBe(25);
        expect(record?.summary.contentKind).toBe(CONTENT_KIND.GraphQl);
    });

    test('handleAsync_WhenTheBodyCannotBeFetched_ShouldLeaveItEmpty', async () => {
        // Arrange
        const parts = captureParts();
        const debuggerMock = createDebuggerClientMock();
        debuggerMock.send.mockResolvedValueOnce(Result.fail('No post data available for the request'));
        const handler = handlerOf(parts, debuggerMock.client);

        // Act
        await handler.handleAsync(TAB_ID, aPostEvent({}));

        // Assert
        const record = parts.timelineStore.get(TAB_ID, 'request-1');
        expect(record?.requestBody).toBeNull();
        expect(record?.requestBodyBase64).toBeNull();
        expect(record?.requestBodyByteSize).toBeNull();
    });

    test('handleAsync_WhenABinaryBodyArrivesInPostDataEntries_ShouldStoreANoteAndItsBytes', async () => {
        // Arrange
        const parts = captureParts();
        const bytes = binaryBytesOf(16);
        const handler = handlerOf(parts);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPostEvent({
                postDataEntries: [
                    {
                        bytes: Base64Text.fromBytes(bytes),
                    },
                ],
            }),
        );

        // Assert
        const record = parts.timelineStore.get(TAB_ID, 'request-1');
        expect(record?.requestBody).toBeNull();
        expect(record?.requestBodyNote).toBe('Binary body · 16 bytes.');
        expect(record?.requestBodyBase64).toBe(Base64Text.fromBytes(bytes));
        expect(record?.requestBodyByteSize).toBe(16);
    });
});
