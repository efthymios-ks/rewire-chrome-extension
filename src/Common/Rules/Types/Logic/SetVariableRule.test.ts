import { describe, expect, test } from 'vitest';
import type { DnrCondition } from '../../Criteria/DnrCondition';
import { SetVariableRule } from './SetVariableRule';
import { VARIABLE_SOURCES } from './VariableSources';
import { CRITERION_FIELD_IDS } from '../../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../../Contracts/Rules/CriterionOperatorIds';
import { aCriterion, aRequestDraft, aResponseDraft, aRuleContext, criteriaOf, TEST_URLS } from '../../../../TestData';

const ruleType = new SetVariableRule();
const CONDITION: DnrCondition = {
    urlFilter: '||api.example.com',
};
const SUCCESS_STATUS = aCriterion({
    field: CRITERION_FIELD_IDS.ResponseStatus,
    op: CRITERION_OPERATOR_IDS.Range,
    value: '2xx',
});

function anAction(overrides: Partial<Parameters<SetVariableRule['validate']>[0]> = {}) {
    return {
        variable: 'captured',
        source: VARIABLE_SOURCES.Url,
        key: '',
        pattern: '',
        path: '',
        ...overrides,
    };
}

describe('SetVariableRule', () => {
    test('applyRequest_WhenUrlPatternHasAGroup_ShouldStoreTheFirstGroupAndKeepTheRequest', () => {
        // Arrange
        const context = aRuleContext();
        const action = anAction({
            variable: ' userId ',
            source: VARIABLE_SOURCES.Url,
            pattern: '/users/(\\d+)',
        });

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context,
        });

        // Assert
        expect(context.variable('userId')).toBe('42');
        expect(draft).toEqual(aRequestDraft());
    });

    test('applyRequest_WhenPatternHasNoGroup_ShouldStoreTheWholeMatch', () => {
        // Arrange
        const context = aRuleContext();
        const action = anAction({
            variable: 'version',
            source: VARIABLE_SOURCES.Url,
            pattern: 'v\\d+',
        });

        // Act
        ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context,
        });

        // Assert
        expect(context.variable('version')).toBe('v1');
    });

    test.each([
        [
            VARIABLE_SOURCES.Query,
            'page',
            '2',
        ],
        [
            VARIABLE_SOURCES.RequestHeader,
            'accept',
            'application/json',
        ],
        [
            VARIABLE_SOURCES.RequestCookie,
            'session',
            'abc',
        ],
    ])('applyRequest_WhenSourceIs(%s)WithKey(%s)_ShouldStore(%s)', (
        source,
        key,
        expected,
    ) => {
        // Arrange
        const context = aRuleContext();
        const request = aRequestDraft({
            url: TEST_URLS.Orders,
            headers: [
                {
                    name: 'Accept',
                    value: 'application/json',
                },
                {
                    name: 'Cookie',
                    value: 'theme=dark; session=abc',
                },
            ],
        });
        const action = anAction({
            source,
            key,
        });

        // Act
        ruleType.applyRequest({ draft: request, action, context });

        // Assert
        expect(context.variable('captured')).toBe(expected);
    });

    test('applyRequest_WhenSourceIsRequestBodyJson_ShouldStoreTheValueAtTheJsonPath', () => {
        // Arrange
        const context = aRuleContext();
        const request = aRequestDraft({
            body: JSON.stringify({
                user: {
                    id: 42,
                },
                items: [{
                    sku: 'A',
                }],
            }),
        });
        const action = anAction({
            variable: 'sku',
            source: VARIABLE_SOURCES.RequestBodyJson,
            path: '$.items[0].sku',
        });

        // Act
        ruleType.applyRequest({ draft: request, action, context });

        // Assert
        expect(context.variable('sku')).toBe('A');
    });

    test('applyRequest_WhenSourceIsRequestBodyJsonAndValueIsObject_ShouldStoreJsonText', () => {
        // Arrange
        const context = aRuleContext();
        const request = aRequestDraft({
            body: JSON.stringify({
                user: {
                    id: 42,
                    name: 'Ada',
                },
            }),
        });
        const action = anAction({
            variable: 'user',
            source: VARIABLE_SOURCES.RequestBodyJson,
            path: '$.user',
        });

        // Act
        ruleType.applyRequest({ draft: request, action, context });

        // Assert
        expect(JSON.parse(context.variable('user')!)).toEqual({
            id: 42,
            name: 'Ada',
        });
    });

    test('applyRequest_WhenSourceIsRequestBodyXml_ShouldStoreTheValueAtTheXPath', () => {
        // Arrange
        const context = aRuleContext();
        const request = aRequestDraft({
            body: '<order><item sku="A"/></order>',
        });
        const action = anAction({
            variable: 'sku',
            source: VARIABLE_SOURCES.RequestBodyXml,
            path: '/order/item/@sku',
        });

        // Act
        ruleType.applyRequest({ draft: request, action, context });

        // Assert
        expect(context.variable('sku')).toBe('A');
    });

    test('applyResponse_WhenSourceIsResponseBodyJson_ShouldStoreTheValue', () => {
        // Arrange
        const context = aRuleContext();
        const response = aResponseDraft({
            body: JSON.stringify({
                token: 'abc.def',
            }),
        });
        const action = anAction({
            variable: 'token',
            source: VARIABLE_SOURCES.ResponseBodyJson,
            path: '$.token',
        });

        // Act
        ruleType.applyResponse({
            draft: response,
            action,
            context,
            request: aRequestDraft(),
        });

        // Assert
        expect(context.variable('token')).toBe('abc.def');
    });

    test('applyResponse_WhenSourceIsResponseBodyXml_ShouldStoreTheTextOfTheNode', () => {
        // Arrange
        const context = aRuleContext();
        const response = aResponseDraft({
            body: '<response><trace>trace-1234</trace></response>',
        });
        const action = anAction({
            variable: 'trace',
            source: VARIABLE_SOURCES.ResponseBodyXml,
            path: '/response/trace',
        });

        // Act
        ruleType.applyResponse({
            draft: response,
            action,
            context,
            request: aRequestDraft(),
        });

        // Assert
        expect(context.variable('trace')).toBe('trace-1234');
    });

    test('applyRequest_WhenSourceIsAResponseBody_ShouldWaitForTheResponse', () => {
        // Arrange
        const context = aRuleContext();
        const action = anAction({
            variable: 'token',
            source: VARIABLE_SOURCES.ResponseBodyJson,
            path: '$.token',
        });

        // Act
        ruleType.applyRequest({
            draft: aRequestDraft({
                body: JSON.stringify({
                    token: 'abc',
                }),
            }),
            action,
            context,
        });

        // Assert
        expect(context.variable('token')).toBeNull();
    });

    test('applyRequest_WhenNothingMatches_ShouldKeepThePreviousValue', () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable('orderId', '7');
        const action = anAction({
            variable: 'orderId',
            source: VARIABLE_SOURCES.Url,
            pattern: '/orders/(\\d+)',
        });

        // Act
        ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context,
        });

        // Assert
        expect(context.variable('orderId')).toBe('7');
    });

    test('applyRequest_WhenSourceIsAResponseHeader_ShouldWaitForTheResponse', () => {
        // Arrange
        const context = aRuleContext();
        const action = anAction({
            variable: 'contentType',
            source: VARIABLE_SOURCES.ResponseHeader,
            key: 'Accept',
        });

        // Act
        ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context,
        });

        // Assert
        expect(context.variable('contentType')).toBeNull();
    });

    test('applyResponse_WhenSourceIsAResponseHeader_ShouldStoreTheMatch', () => {
        // Arrange
        const context = aRuleContext();
        const response = aResponseDraft({
            headers: [
                {
                    name: 'X-Trace-Id',
                    value: 'trace-1234',
                },
            ],
        });
        const action = anAction({
            variable: 'traceId',
            source: VARIABLE_SOURCES.ResponseHeader,
            key: 'x-trace-id',
            pattern: 'trace-(\\d+)',
        });

        // Act
        const draft = ruleType.applyResponse({
            draft: response,
            action,
            context,
            request: aRequestDraft(),
        });

        // Assert
        expect(context.variable('traceId')).toBe('1234');
        expect(draft).toEqual(response);
    });

    test('validate_WhenNameKeyAndRegexAreInvalid_ShouldReportEachOne', () => {
        // Arrange
        const action = anAction({
            variable: '1st',
            source: VARIABLE_SOURCES.Query,
            key: ' ',
            pattern: '(',
        });

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual([
            'Variable names start with a letter or _ and use letters, digits, _ . -.',
            'Name is required.',
            expect.stringMatching(/^Regex is invalid: /),
        ]);
    });

    test('validate_WhenJsonPathIsBlank_ShouldRequireIt', () => {
        // Arrange
        const action = anAction({
            variable: 'x',
            source: VARIABLE_SOURCES.RequestBodyJson,
            path: '',
        });

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(['Path is required.']);
    });

    test('validate_WhenJsonPathIsInvalid_ShouldReportIt', () => {
        // Arrange
        const action = anAction({
            variable: 'x',
            source: VARIABLE_SOURCES.RequestBodyJson,
            path: 'user.name',
        });

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual([expect.stringMatching(/^Path is invalid: /)]);
    });

    test('validate_WhenXPathIsInvalid_ShouldReportIt', () => {
        // Arrange
        const action = anAction({
            variable: 'x',
            source: VARIABLE_SOURCES.RequestBodyXml,
            path: 'order/root',
        });

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual([expect.stringMatching(/^Path is invalid: /)]);
    });

    test.each([
        [
            VARIABLE_SOURCES.Url,
            false,
        ],
        [
            VARIABLE_SOURCES.Query,
            false,
        ],
        [
            VARIABLE_SOURCES.RequestHeader,
            false,
        ],
        [
            VARIABLE_SOURCES.RequestCookie,
            false,
        ],
        [
            VARIABLE_SOURCES.RequestBodyJson,
            false,
        ],
        [
            VARIABLE_SOURCES.RequestBodyXml,
            false,
        ],
        [
            VARIABLE_SOURCES.ResponseHeader,
            true,
        ],
        [
            VARIABLE_SOURCES.ResponseBodyJson,
            true,
        ],
        [
            VARIABLE_SOURCES.ResponseBodyXml,
            true,
        ],
    ])('runsAtResponse_WhenSourceIs(%s)_ShouldReturn(%s)', (source, expected) => {
        // Arrange
        const action = anAction({
            source,
        });

        // Act
        const runsAtResponse = ruleType.runsAtResponse(action, criteriaOf());

        // Assert
        expect(runsAtResponse).toBe(expected);
    });

    test.each([
        [
            VARIABLE_SOURCES.Url,
            false,
        ],
        [
            VARIABLE_SOURCES.RequestBodyJson,
            false,
        ],
        [
            VARIABLE_SOURCES.ResponseHeader,
            false,
        ],
        [
            VARIABLE_SOURCES.ResponseBodyJson,
            true,
        ],
        [
            VARIABLE_SOURCES.ResponseBodyXml,
            true,
        ],
    ])('readsResponseBody_WhenSourceIs(%s)_ShouldReturn(%s)', (source, expected) => {
        // Arrange
        const action = anAction({
            source,
        });

        // Act
        const readsResponseBody = ruleType.readsResponseBody(action);

        // Assert
        expect(readsResponseBody).toBe(expected);
    });

    test('runsAtResponse_WhenARequestSourceWaitsForResponseCriteria_ShouldRunAtTheResponse', () => {
        // Arrange
        const action = anAction({
            source: VARIABLE_SOURCES.Url,
        });

        // Act
        const runsAtResponse = ruleType.runsAtResponse(action, criteriaOf(SUCCESS_STATUS));

        // Assert
        expect(runsAtResponse).toBe(true);
    });

    test('applyResponse_WhenARequestSourceWaitedForTheResponse_ShouldStoreFromTheRequest', () => {
        // Arrange
        const context = aRuleContext();
        const action = anAction({
            variable: 'userId',
            source: VARIABLE_SOURCES.Url,
            pattern: '/users/(\\d+)',
        });

        // Act
        ruleType.applyResponse({
            draft: aResponseDraft(),
            action,
            context,
            request: aRequestDraft(),
        });

        // Assert
        expect(context.variable('userId')).toBe('42');
    });

    test('toDnr_WhenCalled_ShouldNeedTheDebugger', () => {
        // Arrange
        const action = anAction({
            variable: 'userId',
            source: VARIABLE_SOURCES.Url,
            pattern: '/users/(\\d+)',
        });

        // Act
        const result = ruleType.toDnr({
            action,
            condition: CONDITION,
            context: aRuleContext(),
        });

        // Assert
        expect(result).toBeNull();
    });

    test('applyRequest_WhenTheSourceIsAnObjectPrototypeName_ShouldStoreNothing', () => {
        // Arrange
        const context = aRuleContext();
        const action = anAction({
            variable: 'captured',
            source: 'constructor',
            pattern: '.+',
        });

        // Act
        const draft = ruleType.applyRequest({
            draft: aRequestDraft(),
            action,
            context,
        });

        // Assert
        expect(draft).toEqual(aRequestDraft());
        expect(context.variable('captured')).toBeNull();
    });

    test('applyResponse_WhenTheSourceIsAnObjectPrototypeName_ShouldStoreNothing', () => {
        // Arrange
        const context = aRuleContext();
        const action = anAction({
            variable: 'captured',
            source: 'toString',
            path: '$.token',
        });

        // Act
        ruleType.applyResponse({
            request: aRequestDraft(),
            draft: aResponseDraft(),
            action,
            context,
        });

        // Assert
        expect(context.variable('captured')).toBeNull();
    });

    test('validate_WhenTheSourceIsAnObjectPrototypeName_ShouldNotRequireAPath', () => {
        // Arrange
        const action = anAction({
            source: 'toString',
            path: '',
        });

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).not.toContain('Path is required.');
    });
});
