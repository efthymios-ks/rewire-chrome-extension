import type { Protocol } from 'devtools-protocol';
import { describe, expect, test } from 'vitest';
import { DefaultTimelineRecordClassifier } from './DefaultTimelineRecordClassifier';
import { DefaultTimelineRecordFactory } from './DefaultTimelineRecordFactory';
import { DefaultFrameRegistry } from '../Frames/DefaultFrameRegistry';
import { DefaultContentKindClassifier } from '../../../Common/Content/DefaultContentKindClassifier';
import { Base64Text } from '../../../Common/Encoding/Base64Text';
import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { RULE_ENGINE } from '../../../Contracts/Rules/RuleEngine';
import { CONTENT_KIND } from '../../../Contracts/Timeline/ContentKind';
import { TIMELINE_ENTRY_STATE } from '../../../Contracts/Timeline/TimelineEntryState';
import { TEST_URLS } from '../../../TestData';
import { aRequestWillBeSentEvent } from '../../BackgroundTestData';

const frameRegistry = new DefaultFrameRegistry();
const factory = new DefaultTimelineRecordFactory(
    /* recordClassifier: */ new DefaultTimelineRecordClassifier(new DefaultContentKindClassifier()),
    /* frameRegistry: */ frameRegistry,
);

describe('DefaultTimelineRecordFactory', () => {
    test('create_WhenARequestStarts_ShouldBuildAPendingSummary', () => {
        // Arrange
        const event = aRequestWillBeSentEvent();

        // Act
        const record = factory.create(7, event);

        // Assert
        expect(record.summary).toMatchObject({
            id: 'request-1',
            tabId: 7,
            method: 'GET',
            host: 'api.example.com',
            path: '/api/v1/users/42/profile',
            endpointKey: 'GET https://api.example.com/api/v1/users/42/profile',
            resourceType: 'Fetch',
            state: TIMELINE_ENTRY_STATE.Pending,
            startedAt: '2026-11-05T10:00:00.000Z',
        });
        expect(record.requestHeaders).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
        ]);
        expect(record.startedTimestamp).toBe(100);
    });

    test('create_WhenAnIframeSendsTheRequest_ShouldRecordItsFrame', () => {
        // Arrange
        frameRegistry.setTop(8, 'top-frame');
        const event = aRequestWillBeSentEvent({
            frameId: 'iframe-1',
            documentURL: 'https://widget.example.com/embed',
        });

        // Act
        const record = factory.create(8, event);

        // Assert
        expect(record.summary.frame).toEqual({
            id: 'iframe-1',
            url: 'https://widget.example.com/embed',
            isTop: false,
        });
    });

    test('create_WhenTheBodyCarriesAQuery_ShouldClassifyGraphQl', () => {
        // Arrange
        const event = aRequestWillBeSentEvent({
            request: {
                url: 'https://api.example.com/api',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                postData: '{"query":"{ me { id } }"}',
                initialPriority: 'High',
                referrerPolicy: 'no-referrer',
            },
        });

        // Act
        const record = factory.create(7, event);

        // Assert
        expect(record.summary.contentKind).toBe(CONTENT_KIND.GraphQl);
        expect(record.requestContentType).toBe('application/json');
        expect(record.requestBodyByteSize).toBeNull();
    });

    test('create_WhenPostDataEntriesHoldText_ShouldDecodeTheExactBytes', () => {
        // Arrange
        const event = aRequestWillBeSentEvent({
            request: {
                url: 'https://api.example.com/api',
                method: 'POST',
                headers: {},
                postData: 'stale',
                postDataEntries: [
                    {
                        bytes: Base64Text.fromUtf8('{"city":"Αθήνα"}'),
                    },
                ],
                initialPriority: 'High',
                referrerPolicy: 'no-referrer',
            },
        });

        // Act
        const record = factory.create(7, event);

        // Assert
        expect(record.requestBody).toBe('{"city":"Αθήνα"}');
        expect(record.requestBodyNote).toBeNull();
        expect(record.requestBodyBase64).toBeNull();
        expect(record.requestBodyByteSize).toBe(21);
    });

    test('create_WhenTheBodyIsCompressed_ShouldHoldItAsBinaryUntilItIsDecompressed', () => {
        // Arrange
        const gzipHeader = Base64Text.fromBytes(new Uint8Array([
            0x1f,
            0x8b,
            0x08,
            0x00,
        ]));
        const event = aRequestWillBeSentEvent({
            request: {
                url: 'https://n.clarity.ms/collect',
                method: 'POST',
                headers: {},
                postData: '\u001f�\b\u0000',
                postDataEntries: [
                    {
                        bytes: gzipHeader,
                    },
                ],
                initialPriority: 'High',
                referrerPolicy: 'no-referrer',
            },
        });

        // Act
        const record = factory.create(7, event);

        // Assert
        expect(record.requestBody).toBeNull();
        expect(record.requestBodyNote).toBe('Binary body · 4 bytes.');
        expect(record.requestBodyBase64).toBe(gzipHeader);
        expect(record.requestBodyByteSize).toBe(4);
    });

    test('redirect_WhenTheRequestIsRedirected_ShouldKeepTheOriginalUrl', () => {
        // Arrange
        const original = factory.create(
            /* tabId: */ 7,
            /* event: */ aRequestWillBeSentEvent(),
        );
        const redirectEvent = aRequestWillBeSentEvent({
            request: {
                url: 'http://localhost:5000/users/42/profile',
                method: 'GET',
                headers: {},
                initialPriority: 'High',
                referrerPolicy: 'no-referrer',
            },
        });

        // Act
        const redirected = factory.redirect(original, redirectEvent);

        // Assert
        expect(redirected.summary.url).toBe('http://localhost:5000/users/42/profile');
        expect(redirected.summary.host).toBe('localhost');
        expect(redirected.summary.redirectedFromUrl).toBe(TEST_URLS.UsersProfile);
    });

    test('redirect_WhenTheOriginalWasRuleAnswered_ShouldResetAppliedRulesAndTimestamp', () => {
        // Arrange
        const original = factory.create(
            /* tabId: */ 7,
            /* event: */ aRequestWillBeSentEvent(),
        );
        const touched = {
            ...original,
            summary: {
                ...original.summary,
                appliedRules: [
                    {
                        ruleId: 'rule-1',
                        ruleName: 'Rule',
                        engine: RULE_ENGINE.Debugger,
                        note: 'note',
                    },
                ],
                isAnsweredByRule: true,
                statusCode: 308,
                statusText: 'Permanent Redirect',
            },
            changes: [
                {
                    area: CHANGE_AREA.Status,
                    name: 'status',
                    before: null,
                    after: '308',
                },
            ],
        };
        const redirectEvent = aRequestWillBeSentEvent({
            timestamp: 250,
            request: {
                url: 'http://localhost:5000/users',
                method: 'GET',
                headers: {},
                initialPriority: 'High',
                referrerPolicy: 'no-referrer',
            },
        });

        // Act
        const redirected = factory.redirect(touched, redirectEvent);

        // Assert
        expect(redirected.summary.appliedRules).toEqual([]);
        expect(redirected.summary.isAnsweredByRule).toBe(false);
        expect(redirected.summary.state).toBe(TIMELINE_ENTRY_STATE.Pending);
        expect(redirected.summary.statusCode).toBeNull();
        expect(redirected.summary.statusText).toBe('');
        expect(redirected.changes).toEqual([]);
        expect(redirected.startedTimestamp).toBe(250);
    });

    test.each([
        [
            'GET',
            null,
            CONTENT_KIND.Other,
        ],
        [
            'POST',
            'origin=ATH&destination=SKG',
            CONTENT_KIND.FormData,
        ],
    ])('redirect_WhenAFormPostIsRedirectedAs(%s)_ShouldKeepTheBody(%s)', (
        method,
        expectedBody,
        expectedKind,
    ) => {
        // Arrange
        const formHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        const original = factory.create(
            /* tabId: */ 7,
            /* event: */ aRequestWillBeSentEvent({
                type: 'Document',
                request: {
                    url: 'https://shop.example.com/flights/search',
                    method: 'POST',
                    headers: formHeaders,
                    hasPostData: true,
                    postData: 'origin=ATH&destination=SKG',
                    initialPriority: 'VeryHigh',
                    referrerPolicy: 'strict-origin-when-cross-origin',
                },
            }),
        );
        const redirectEvent = aRequestWillBeSentEvent({
            type: 'Document',
            request: {
                url: 'https://shop.example.com/flights/results',
                method,
                headers: method === 'POST' ? formHeaders : {},
                hasPostData: method === 'POST',
                initialPriority: 'VeryHigh',
                referrerPolicy: 'strict-origin-when-cross-origin',
            },
        });

        // Act
        const redirected = factory.redirect(original, redirectEvent);

        // Assert
        expect(redirected.summary.method).toBe(method);
        expect(redirected.requestBody).toBe(expectedBody);
        expect(redirected.summary.contentKind).toBe(expectedKind);
    });

    test('toCompletedLeg_WhenCalled_ShouldReturnACompletedCloneWithTheRedirectResponse', () => {
        // Arrange
        const base = factory.create(
            /* tabId: */ 7,
            /* event: */ aRequestWillBeSentEvent(),
        );
        const response: Protocol.Network.Response = {
            url: TEST_URLS.UsersProfile,
            status: 308,
            statusText: 'Permanent Redirect',
            headers: {
                location: 'http://localhost:5000/users',
            },
            mimeType: '',
            charset: '',
            connectionReused: false,
            connectionId: 1,
            encodedDataLength: 0,
            securityState: 'secure',
        };

        // Act
        const leg = factory.toCompletedLeg({ base, legId: 'request-1-leg-1', response, endedTimestamp: 260 });

        // Assert
        expect(leg.summary.id).toBe('request-1-leg-1');
        expect(leg.summary.state).toBe(TIMELINE_ENTRY_STATE.Completed);
        expect(leg.summary.statusCode).toBe(308);
        expect(leg.summary.statusText).toBe('Permanent Redirect');
        expect(leg.summary.durationInMilliseconds).toBe(160000);
        expect(leg.responseHeaders).toEqual([
            {
                name: 'location',
                value: 'http://localhost:5000/users',
            },
        ]);
        expect(leg.responseBody).toBeNull();
    });
});
