import { describe, expect, test, vi } from 'vitest';
import { DefaultTimelineStore } from '../Capture/DefaultTimelineStore';
import type { TimelineRecord } from '../Capture/TimelineRecord';
import { RequestPausedHandler } from './RequestPausedHandler';
import { Base64Text } from '../../../Common/Encoding/Base64Text';
import { Result } from '../../../Common/Results/Result';
import { VARIABLE_SOURCES } from '../../../Common/Rules/Types/Logic/VariableSources';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import type { Rule } from '../../../Contracts/Rules/Rule';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';
import { CONTENT_KIND } from '../../../Contracts/Timeline/ContentKind';
import { TIMELINE_ENTRY_STATE } from '../../../Contracts/Timeline/TimelineEntryState';
import { aCriterion, aRule, aSummary, createLogger, TEST_URLS } from '../../../TestData';
import {
    activeRulesOf,
    aPausedEvent,
    aTimelineRecord,
    createDebuggerClientMock,
    createHitCounterMock,
} from '../../BackgroundTestData';

const TAB_ID = 7;
const BODY_READ_ERROR = 'Fetch.getResponseBody failed: No data found for resource with given identifier';
const SKIPPED_RULES_TEXT = `Response rules skipped for ${TEST_URLS.UsersProfile}, its body is unreadable.`;

function aDocumentRecord(): TimelineRecord {
    return aTimelineRecord({
        summary: aSummary({
            resourceType: 'Document',
            contentKind: CONTENT_KIND.Other,
            state: TIMELINE_ENTRY_STATE.Pending,
            statusCode: null,
            mimeType: '',
        }),
        responseBody: null,
    });
}

function onAcceptHeader(rule: Rule): Rule {
    return {
        ...rule,
        criteria: {
            match: 'all',
            items: [
                aCriterion({
                    field: CRITERION_FIELD_IDS.RequestHeader,
                    op: CRITERION_OPERATOR_IDS.Exists,
                    name: 'Accept',
                    value: '',
                }),
            ],
        },
    };
}

function setUp(rules: Rule[]) {
    const debuggerClient = createDebuggerClientMock();
    const hitCounter = createHitCounterMock();
    const timelineStore = new DefaultTimelineStore();
    timelineStore.add(aTimelineRecord());
    const logger = createLogger();
    const handler = new RequestPausedHandler({
        activeRules: activeRulesOf(rules),
        debuggerClient: debuggerClient.client,
        timelineStore,
        hitCounter: hitCounter.counter,
        logger,
    });

    return {
        handler,
        send: debuggerClient.send,
        count: hitCounter.count,
        timelineStore,
        logger,
    };
}

function failBodyReads(send: ReturnType<typeof createDebuggerClientMock>['send']): void {
    send.mockImplementation(async (_tabId, command) => command === 'Fetch.getResponseBody'
        ? Result.fail(BODY_READ_ERROR)
        : Result.ok({}));
}

function commandsOf(send: ReturnType<typeof createDebuggerClientMock>['send']): string[] {
    return send.mock.calls.map(call => call[1]);
}

function aResponseHeaderRule(): Rule {
    return onAcceptHeader(aRule({
        id: 'response-header',
        type: RULE_TYPE_IDS.ResponseHeader,
        action: {
            operations: [
                {
                    op: 'addOrUpdate',
                    name: 'X-Test',
                    value: '123',
                },
            ],
        },
    }));
}

function paramsOf(
    send: ReturnType<typeof createDebuggerClientMock>['send'],
    command: string,
): Record<string, unknown> {
    const call = send.mock.calls.find(candidate => candidate[1] === command);

    return (call?.[2] ?? {}) as Record<string, unknown>;
}

describe('RequestPausedHandler', () => {
    test('handleAsync_WhenNoRuleMatches_ShouldContinueUnchanged', async () => {
        // Arrange
        const { handler, send, count } = setUp([]);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent(),
        );

        // Assert
        expect(paramsOf(send, 'Fetch.continueRequest')).toEqual({
            requestId: 'interception-1',
            url: undefined,
            method: undefined,
            headers: undefined,
            postData: undefined,
        });
        expect(count).not.toHaveBeenCalled();
    });

    test('handleAsync_WhenARequestHeaderRuleMatches_ShouldContinueWithTheNewHeaderAndAnnotate', async () => {
        // Arrange
        const rule = onAcceptHeader(aRule({
            id: 'header-rule',
            name: 'Debug header',
            type: RULE_TYPE_IDS.RequestHeader,
            action: {
                operations: [
                    {
                        op: 'set',
                        name: 'X-Debug',
                        value: '1',
                    },
                ],
            },
        }));
        const { handler, send, count, timelineStore } = setUp([rule]);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent(),
        );

        // Assert
        expect(paramsOf(send, 'Fetch.continueRequest')['headers']).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
            {
                name: 'X-Debug',
                value: '1',
            },
        ]);
        expect(count).toHaveBeenCalledWith('header-rule');
        const ruleNames = timelineStore
            .get(TAB_ID, 'request-1')
            ?.summary.appliedRules
            .map(applied => applied.ruleName);
        expect(ruleNames).toEqual(['Debug header']);
    });

    test('handleAsync_WhenAMockMatches_ShouldFulfillWithABase64Body', async () => {
        // Arrange
        const { handler, send, timelineStore } = setUp([aRule()]);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent(),
        );

        // Assert
        expect(paramsOf(send, 'Fetch.fulfillRequest')).toMatchObject({
            requestId: 'interception-1',
            responseCode: 200,
            body: Base64Text.fromUtf8('{"id":42}'),
        });
        expect(timelineStore.get(TAB_ID, 'request-1')?.summary.isAnsweredByRule).toBe(true);
    });

    test('handleAsync_WhenAMockAnswers_ShouldApplyTheResponseRulesBeforeFulfilling', async () => {
        // Arrange
        const header = aRule({
            id: 'response-header',
            type: RULE_TYPE_IDS.ResponseHeader,
            action: {
                operations: [
                    {
                        op: 'addOrUpdate',
                        name: 'X-Test',
                        value: '123',
                    },
                ],
            },
        });
        const { handler, send, timelineStore } = setUp([
            aRule(),
            header,
        ]);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent(),
        );

        // Assert
        expect(paramsOf(send, 'Fetch.fulfillRequest')['responseHeaders']).toContainEqual({
            name: 'X-Test',
            value: '123',
        });
        const ruleIds = timelineStore
            .get(TAB_ID, 'request-1')
            ?.summary.appliedRules
            .map(applied => applied.ruleId);
        expect(ruleIds).toEqual([
            'rule-1',
            'response-header',
        ]);
    });

    test('handleAsync_WhenAResponseRuleMatches_ShouldFulfillWithoutEncodingHeaders', async () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.MockResponse,
            action: {
                overrideStatus: true,
                status: 503,
                overrideBody: false,
            },
        });
        const { handler, send } = setUp([rule]);
        send.mockImplementation(async (_tabId, command) => command === 'Fetch.getResponseBody'
            ? Result.ok({
                body: 'e30=',
                base64Encoded: true,
            })
            : Result.ok({}));
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent(),
        );

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent({
                responseStatusCode: 200,
                responseHeaders: [
                    {
                        name: 'Content-Encoding',
                        value: 'gzip',
                    },
                    {
                        name: 'Content-Type',
                        value: 'application/json',
                    },
                ],
            }),
        );

        // Assert
        expect(paramsOf(send, 'Fetch.fulfillRequest')).toEqual({
            requestId: 'interception-1',
            responseCode: 503,
            responseHeaders: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
            body: 'e30=',
        });
    });

    test('handleAsync_WhenTheResponseHasNoPendingRequest_ShouldContinueAsIs', async () => {
        // Arrange
        const { handler, send } = setUp([]);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent({
                responseStatusCode: 200,
            }),
        );

        // Assert
        expect(paramsOf(send, 'Fetch.continueRequest')).toEqual({
            requestId: 'interception-1',
        });
    });

    test('handleAsync_WhenARuleAnswersAPage_ShouldAnnotateItsDocumentRow', async () => {
        // Arrange
        const { handler, timelineStore } = setUp([aRule()]);
        timelineStore.clear(TAB_ID);
        timelineStore.add(aDocumentRecord());

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent({
                resourceType: 'Document',
            }),
        );

        // Assert
        const record = timelineStore.get(TAB_ID, 'request-1');
        expect(record?.summary.appliedRules.map(rule => rule.ruleId)).toEqual(['rule-1']);
        expect(record?.summary.isAnsweredByRule).toBe(true);
    });

    test('handleAsync_WhenAPagePausesBeforeItsRowExists_ShouldAnnotateTheRowOnceAdded', async () => {
        // Arrange
        const { handler, timelineStore } = setUp([aRule()]);
        timelineStore.clear(TAB_ID);

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent({
                resourceType: 'Document',
            }),
        );
        timelineStore.add(aDocumentRecord());

        // Assert
        const record = timelineStore.get(TAB_ID, 'request-1');
        expect(record?.summary.appliedRules.map(rule => rule.ruleId)).toEqual(['rule-1']);
        expect(record?.summary.isAnsweredByRule).toBe(true);
    });

    test('handleAsync_WhenAPreflightMatchesARuleWithLatency_ShouldAnswerItWithoutWaiting', async () => {
        // Arrange
        vi.useFakeTimers();
        const latency = aRule({
            id: 'latency',
            type: RULE_TYPE_IDS.Delay,
            action: {
                delayMs: 5000,
            },
        });
        const { handler, send } = setUp([
            latency,
            aRule(),
        ]);
        const preflight = aPausedEvent({
            resourceType: 'XHR',
            request: {
                ...aPausedEvent().request,
                method: 'OPTIONS',
                headers: {
                    'Origin': 'https://app.example.com',
                    'Access-Control-Request-Method': 'GET',
                },
            },
        });

        // Act
        const handled = handler.handleAsync(TAB_ID, preflight);
        await vi.advanceTimersByTimeAsync(0);

        // Assert
        expect(paramsOf(send, 'Fetch.fulfillRequest')['responseCode']).toBe(204);
        await handled;
        vi.useRealTimers();
    });

    test('handleAsync_WhenANeededBodyCannotBeRead_ShouldContinueTheResponseUnchanged', async () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.MockResponse,
            action: {
                overrideStatus: true,
                status: 503,
                overrideBody: false,
            },
        });
        const { handler, send, logger, timelineStore } = setUp([rule]);
        failBodyReads(send);
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent(),
        );

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent({
                responseStatusCode: 200,
                responseHeaders: [
                    {
                        name: 'Content-Type',
                        value: 'application/json',
                    },
                ],
            }),
        );

        // Assert
        expect(commandsOf(send)).not.toContain('Fetch.fulfillRequest');
        expect(send).toHaveBeenLastCalledWith(
            /* tabId: */ TAB_ID,
            /* command: */ 'Fetch.continueRequest',
            /* params: */ {
                requestId: 'interception-1',
            },
        );
        expect(logger.warn).toHaveBeenCalledWith(SKIPPED_RULES_TEXT, BODY_READ_ERROR);
        expect(timelineStore.get(TAB_ID, 'request-1')?.summary.appliedRules).toEqual([]);
    });

    test('handleAsync_WhenTheUnchangedBodyCannotBeRead_ShouldContinueTheResponseUnchanged', async () => {
        // Arrange
        const { handler, send, logger, count } = setUp([aResponseHeaderRule()]);
        failBodyReads(send);
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent(),
        );

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent({
                responseStatusCode: 200,
                responseHeaders: [
                    {
                        name: 'Content-Type',
                        value: 'application/json',
                    },
                ],
            }),
        );

        // Assert
        expect(commandsOf(send)).toEqual([
            'Fetch.continueRequest',
            'Fetch.getResponseBody',
            'Fetch.continueRequest',
        ]);
        expect(paramsOf(send, 'Fetch.continueRequest')['requestId']).toBe('interception-1');
        expect(logger.warn).toHaveBeenCalledWith(SKIPPED_RULES_TEXT, BODY_READ_ERROR);
        expect(count).not.toHaveBeenCalled();
    });

    test.each([
        [
            VARIABLE_SOURCES.ResponseHeader,
            false,
        ],
        [
            VARIABLE_SOURCES.ResponseBodyJson,
            true,
        ],
    ])('handleAsync_WhenASetVariableRuleReadsFrom(%s)_ShouldReadTheBody(%s)', async (
        source,
        isBodyRead,
    ) => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.SetVariable,
            action: {
                variable: 'token',
                source,
                key: 'X-Token',
                pattern: '',
                path: '$.token',
            },
        });
        const { handler, send } = setUp([rule]);
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent(),
        );

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent({
                responseStatusCode: 200,
                responseHeaders: [
                    {
                        name: 'Content-Type',
                        value: 'application/json',
                    },
                    {
                        name: 'X-Token',
                        value: 'abc',
                    },
                ],
            }),
        );

        // Assert
        expect(commandsOf(send).includes('Fetch.getResponseBody')).toBe(isBodyRead);
    });

    test('handleAsync_WhenARedirectBodyCannotBeRead_ShouldStillFulfillTheChangedHeaders', async () => {
        // Arrange
        const { handler, send } = setUp([aResponseHeaderRule()]);
        failBodyReads(send);
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent(),
        );

        // Act
        await handler.handleAsync(
            /* tabId: */ TAB_ID,
            /* event: */ aPausedEvent({
                responseStatusCode: 302,
                responseHeaders: [
                    {
                        name: 'Location',
                        value: 'https://api.example.com/login',
                    },
                ],
            }),
        );

        // Assert
        expect(paramsOf(send, 'Fetch.fulfillRequest')).toEqual({
            requestId: 'interception-1',
            responseCode: 302,
            responseHeaders: [
                {
                    name: 'Location',
                    value: 'https://api.example.com/login',
                },
                {
                    name: 'X-Test',
                    value: '123',
                },
            ],
            body: '',
        });
    });
});
