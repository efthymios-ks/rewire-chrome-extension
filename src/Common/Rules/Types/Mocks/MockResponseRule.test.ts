import { describe, expect, test } from 'vitest';
import type { DnrCondition } from '../../Criteria/DnrCondition';
import { BODY_EDIT_MESSAGES } from './BodyEditMessages';
import { MOCK_MESSAGES } from './MockMessages';
import { MockResponseRule } from './MockResponseRule';
import { aCriterion, aRequestDraft, aResponseDraft, aRuleContext, criteriaOf } from '../../../../TestData';

const ruleType = new MockResponseRule();
const CONDITION: DnrCondition = {
    urlFilter: '||api.example.com',
};
const STATUS_ONLY = {
    overrideStatus: true,
    status: 503,
    overrideBody: false,
    contentType: 'application/json',
    headers: [],
    body: '{"mocked":true}',
};
const BODY_ONLY = {
    overrideStatus: false,
    status: 503,
    overrideBody: true,
    contentType: 'text/plain',
    headers: [],
    body: 'mocked',
};
const PATCH = {
    overrideStatus: false,
    status: 200,
    overrideBody: true,
    bodyMode: 'jsonMerge',
    contentType: 'text/plain',
    headers: [],
    body: '{"user":{"role":"admin"},"debug":true,"legacy":null}',
};
const SERVER_JSON = '{"user":{"name":"Ada","role":"user"},"legacy":1,"items":[1,2]}';

function isFieldVisible(key: string, action: Record<string, unknown>): boolean {
    const field = ruleType.fields.find(candidate => candidate.key === key);

    return field?.visibleWhen?.(action) ?? true;
}

describe('MockResponseRule', () => {
    test('withoutSecrets_WhenASensitiveHeaderIsMocked_ShouldBlankOnlyItsValue', () => {
        // Arrange
        const action = {
            ...STATUS_ONLY,
            headers: [
                {
                    key: 'Set-Cookie',
                    value: 'session=abc',
                },
                {
                    key: 'X-Trace',
                    value: '1',
                },
            ],
        };

        // Act
        const stripped = ruleType.withoutSecrets(action);

        // Assert
        expect(stripped['headers']).toEqual([
            {
                key: 'Set-Cookie',
                value: '',
            },
            {
                key: 'X-Trace',
                value: '1',
            },
        ]);
        expect(stripped['status']).toBe(503);
    });

    test('applyRequest_WhenActionIsSet_ShouldAnswerWithRenderedStatusHeadersAndBody', () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable('build', 'b7');
        context.setVariable('userId', '42');
        const action = {
            status: 201,
            contentType: ' application/json ',
            headers: [
                {
                    key: ' X-Mock ',
                    value: '{{build}}',
                },
            ],
            body: '{"id":{{userId}}}',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context,
        });

        // Assert
        expect(draft.response).toEqual({
            status: 201,
            headers: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
                {
                    name: 'X-Mock',
                    value: 'b7',
                },
            ],
            body: '{"id":42}',
        });
    });

    test('applyRequest_WhenTheRequestHasAnOrigin_ShouldEchoItInCorsHeaders', () => {
        // Arrange
        const request = aRequestDraft({
            headers: [
                {
                    name: 'origin',
                    value: 'http://localhost:3000',
                },
            ],
        });
        const action = {
            status: 200,
            contentType: '',
            headers: [],
            body: '{}',
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: request,
            action,
            context: aRuleContext(),
        });

        // Assert
        expect(draft.response?.headers).toEqual([
            {
                name: 'Access-Control-Allow-Origin',
                value: 'http://localhost:3000',
            },
            {
                name: 'Access-Control-Allow-Credentials',
                value: 'true',
            },
            {
                name: 'Access-Control-Expose-Headers',
                value: '*',
            },
            {
                name: 'Vary',
                value: 'Origin',
            },
        ]);
    });

    test('applyRequest_WhenFieldsAreMissing_ShouldAnswer200AsJsonWithAnEmptyBody', () => {
        // Arrange
        const action = {};

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context: aRuleContext(),
        });

        // Assert
        expect(draft.response).toEqual({
            status: 200,
            headers: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
            body: '',
        });
    });

    test.each([
        99,
        600,
        201.5,
    ])('validate_WhenStatusIs(%s)_ShouldRejectIt', status => {
        // Arrange
        const action = {
            status,
            contentType: 'application/json',
            headers: [],
            body: '{}',
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(['Status must be a whole number from 100 to 599.']);
    });

    test('validate_WhenAHeaderNameHasSpaces_ShouldRejectIt', () => {
        // Arrange
        const action = {
            status: 200,
            headers: [
                {
                    key: 'X Mock',
                    value: '1',
                },
            ],
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(["Header name is empty or has characters a header can't carry."]);
    });

    test('summary_WhenSet_ShouldShowStatusAndContentType', () => {
        // Arrange
        const action = {
            status: 404,
            contentType: 'text/plain',
        };

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe('404 text/plain');
    });

    test('toDnr_WhenCalled_ShouldNeedTheDebugger', () => {
        // Arrange
        const action = ruleType.defaultAction();

        // Act
        const result = ruleType.toDnr({
            action,
            condition: CONDITION,
            context: aRuleContext(),
        });

        // Assert
        expect(result).toBeNull();
    });

    test('applyRequest_WhenTheRequestIsACorsPreflight_ShouldAllowItInsteadOfMockingIt', () => {
        // Arrange
        const preflight = aRequestDraft({
            method: 'OPTIONS',
            headers: [
                {
                    name: 'Origin',
                    value: 'https://app.example.com',
                },
                {
                    name: 'Access-Control-Request-Method',
                    value: 'POST',
                },
                {
                    name: 'Access-Control-Request-Headers',
                    value: 'authorization',
                },
            ],
        });

        // Act
        const draft = ruleType.applyRequest({
            draft: preflight,
            action: ruleType.defaultAction(),
            context: aRuleContext(),
        });

        // Assert
        expect(draft.response?.status).toBe(204);
        expect(draft.response?.body).toBe('');
        expect(draft.response?.headers).toEqual(expect.arrayContaining([
            {
                name: 'Access-Control-Allow-Origin',
                value: 'https://app.example.com',
            },
            {
                name: 'Access-Control-Allow-Methods',
                value: 'POST',
            },
            {
                name: 'Access-Control-Allow-Headers',
                value: 'authorization',
            },
        ]));
    });

    test.each([
        [
            'status only',
            STATUS_ONLY,
        ],
        [
            'body only',
            BODY_ONLY,
        ],
    ])('applyRequest_WhenOverriding(%s)_ShouldLetTheRequestReachTheServer', (_name, action) => {
        // Arrange
        const request = aRequestDraft();

        // Act
        const draft = ruleType.applyRequest({
            draft: request,
            action,
            context: aRuleContext(),
        });

        // Assert
        expect(draft).toEqual(request);
    });

    test('applyResponse_WhenOverridingTheStatusOnly_ShouldKeepTheServerBody', () => {
        // Arrange
        const response = aResponseDraft();

        // Act
        const draft = ruleType.applyResponse({
            draft: response,
            action: STATUS_ONLY,
            context: aRuleContext(),
            request: aRequestDraft(),
        });

        // Assert
        expect(draft).toEqual({
            ...response,
            status: 503,
        });
    });

    test('applyResponse_WhenOverridingTheBodyOnly_ShouldKeepTheServerStatus', () => {
        // Arrange
        const response = aResponseDraft({
            status: 404,
        });

        // Act
        const draft = ruleType.applyResponse({
            draft: response,
            action: BODY_ONLY,
            context: aRuleContext(),
            request: aRequestDraft(),
        });

        // Assert
        expect(draft.status).toBe(404);
        expect(draft.body).toBe('mocked');
        expect(draft.headers).toEqual([
            {
                name: 'Content-Type',
                value: 'text/plain',
            },
        ]);
    });

    test('applyResponse_WhenOverridingBoth_ShouldReplaceStatusHeadersAndBody', () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable('build', 'b7');
        const action = {
            overrideStatus: true,
            status: 418,
            overrideBody: true,
            contentType: 'text/plain',
            headers: [
                {
                    key: 'X-Mock',
                    value: '{{build}}',
                },
            ],
            body: 'teapot',
        };

        // Act
        const draft = ruleType.applyResponse({
            draft: aResponseDraft(),
            action,
            context,
            request: aRequestDraft(),
        });

        // Assert
        expect(draft.status).toBe(418);
        expect(draft.body).toBe('teapot');
        expect(draft.headers).toEqual([
            {
                name: 'Content-Type',
                value: 'text/plain',
            },
            {
                name: 'X-Mock',
                value: 'b7',
            },
        ]);
    });

    test('applyResponse_WhenTheRequestFailed_ShouldLeaveTheFailure', () => {
        // Arrange
        const response = aResponseDraft({
            status: 0,
            body: null,
            errorReason: 'ConnectionRefused',
        });

        // Act
        const draft = ruleType.applyResponse({
            draft: response,
            action: ruleType.defaultAction(),
            context: aRuleContext(),
            request: aRequestDraft(),
        });

        // Assert
        expect(draft).toEqual(response);
    });

    test('validate_WhenNothingIsOverridden_ShouldAskForTheStatusOrTheBody', () => {
        // Arrange
        const action = {
            ...STATUS_ONLY,
            overrideStatus: false,
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual([MOCK_MESSAGES.NothingToOverride]);
    });

    test('validate_WhenTheStatusIsNotOverridden_ShouldIgnoreAnInvalidStatus', () => {
        // Arrange
        const action = {
            ...BODY_ONLY,
            status: 99,
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual([]);
    });

    test.each([
        [
            STATUS_ONLY,
            '503',
        ],
        [
            BODY_ONLY,
            'text/plain',
        ],
    ])('summary_WhenOverridingPartOfTheResponse(%#)_ShouldShow(%s)', (action, expected) => {
        // Arrange
        const partial = action;

        // Act
        const summary = ruleType.summary(partial);

        // Assert
        expect(summary).toBe(expected);
    });

    test('runsAtResponse_WhenAFullMockHasRequestConditions_ShouldBeFalse', () => {
        // Arrange
        const criteria = criteriaOf(aCriterion());

        // Act
        const runs = ruleType.runsAtResponse(
            /* action: */ ruleType.defaultAction(),
            /* criteria: */ criteria,
        );

        // Assert
        expect(runs).toBe(false);
    });

    test('runsAtResponse_WhenOnlyTheStatusIsOverridden_ShouldBeTrue', () => {
        // Arrange
        const criteria = criteriaOf(aCriterion());

        // Act
        const runs = ruleType.runsAtResponse(STATUS_ONLY, criteria);

        // Assert
        expect(runs).toBe(true);
    });

    test('runsAtResponse_WhenAFullMockHasAResponseStatusCondition_ShouldBeTrue', () => {
        // Arrange
        const criteria = criteriaOf(aCriterion({
            field: 'responseStatus',
            op: 'range',
            value: '5xx',
        }));

        // Act
        const runs = ruleType.runsAtResponse(
            /* action: */ ruleType.defaultAction(),
            /* criteria: */ criteria,
        );

        // Assert
        expect(runs).toBe(true);
    });

    test('delayOf_WhenTheActionHoldsADelay_ShouldBeZero', () => {
        // Arrange
        const action = {
            ...ruleType.defaultAction(),
            delayMs: 2000,
        };

        // Act
        const delay = ruleType.delayOf(action);

        // Assert
        expect(delay).toBe(0);
    });

    test('defaultAction_WhenRead_ShouldReplaceTheBody', () => {
        // Arrange
        const expected = 'replace';

        // Act
        const action = ruleType.defaultAction();

        // Assert
        expect(action['bodyMode']).toBe(expected);
    });

    test('applyResponse_WhenPatchingAJsonBody_ShouldAddUpdateAndRemoveNestedFieldsAndKeepTheRest', () => {
        // Arrange
        const response = aResponseDraft({
            body: SERVER_JSON,
        });

        // Act
        const draft = ruleType.applyResponse({
            draft: response,
            action: PATCH,
            context: aRuleContext(),
            request: aRequestDraft(),
        });

        // Assert
        expect(JSON.parse(draft.body ?? '')).toEqual({
            user: {
                name: 'Ada',
                role: 'admin',
            },
            items: [
                1,
                2,
            ],
            debug: true,
        });
        expect(draft.headers).toEqual(response.headers);
        expect(draft.status).toBe(response.status);
    });

    test('applyResponse_WhenPatchingABodyThatIsNotJson_ShouldLeaveItAsItIs', () => {
        // Arrange
        const response = aResponseDraft({
            body: '<html>not json</html>',
        });

        // Act
        const draft = ruleType.applyResponse({
            draft: response,
            action: PATCH,
            context: aRuleContext(),
            request: aRequestDraft(),
        });

        // Assert
        expect(draft.body).toBe('<html>not json</html>');
    });

    test('applyResponse_WhenThePatchUsesVariables_ShouldFillThemInsideStrings', () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable('role', 'owner');
        const action = {
            ...PATCH,
            body: '{"user":{"role":"{{role}}"}}',
        };

        // Act
        const draft = ruleType.applyResponse({
            draft: aResponseDraft({
                body: SERVER_JSON,
            }),
            action,
            context,
            request: aRequestDraft(),
        });

        // Assert
        expect(JSON.parse(draft.body ?? '').user.role).toBe('owner');
    });

    test('applyResponse_WhenPatchingWithTheStatusOverridden_ShouldSetTheStatusAndPatchTheBody', () => {
        // Arrange
        const action = {
            ...PATCH,
            overrideStatus: true,
            status: 201,
        };

        // Act
        const draft = ruleType.applyResponse({
            draft: aResponseDraft({
                body: SERVER_JSON,
            }),
            action,
            context: aRuleContext(),
            request: aRequestDraft(),
        });

        // Assert
        expect(draft.status).toBe(201);
        expect(JSON.parse(draft.body ?? '').debug).toBe(true);
    });

    test('applyRequest_WhenPatchingWithTheStatusOverridden_ShouldLetTheServerAnswer', () => {
        // Arrange
        const request = aRequestDraft();
        const action = {
            ...PATCH,
            overrideStatus: true,
        };

        // Act
        const draft = ruleType.applyRequest({
            draft: request,
            action,
            context: aRuleContext(),
        });

        // Assert
        expect(draft).toEqual(request);
        expect(ruleType.runsAtRequest(action)).toBe(false);
        expect(ruleType.runsAtResponse(action, criteriaOf(aCriterion()))).toBe(true);
    });

    test.each([
        'replace',
        'unknown',
        undefined,
    ])('applyResponse_WhenTheBodyModeIs(%s)_ShouldReplaceTheBody', bodyMode => {
        // Arrange
        const action = {
            ...BODY_ONLY,
            bodyMode,
        };

        // Act
        const draft = ruleType.applyResponse({
            draft: aResponseDraft({
                body: SERVER_JSON,
            }),
            action,
            context: aRuleContext(),
            request: aRequestDraft(),
        });

        // Assert
        expect(draft.body).toBe('mocked');
    });

    test('validate_WhenThePatchIsNotJson_ShouldRejectIt', () => {
        // Arrange
        const action = {
            ...PATCH,
            body: '{oops',
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual([BODY_EDIT_MESSAGES.InvalidPatch]);
    });

    test('summary_WhenPatching_ShouldSayJsonPatch', () => {
        // Arrange
        const action = PATCH;

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe('JSON patch');
    });

    test.each([
        {
            key: 'bodyMode',
            action: BODY_ONLY,
            expected: true,
        },
        {
            key: 'bodyMode',
            action: STATUS_ONLY,
            expected: false,
        },
        {
            key: 'contentType',
            action: BODY_ONLY,
            expected: true,
        },
        {
            key: 'contentType',
            action: PATCH,
            expected: false,
        },
        {
            key: 'body',
            action: PATCH,
            expected: true,
        },
    ])('fields_WhenTheFieldIs($key)_ShouldShowOnlyWhenItApplies(%#)', ({ key, action, expected }) => {
        // Arrange
        const fieldKey = key;

        // Act
        const isVisible = isFieldVisible(fieldKey, action);

        // Assert
        expect(isVisible).toBe(expected);
    });
});
