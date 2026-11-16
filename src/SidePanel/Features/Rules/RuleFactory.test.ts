import { describe, expect, test } from 'vitest';
import { RuleTypeRegistry } from '../../../Common/Rules/Types/RuleTypeRegistry';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';
import { RuleFactory } from './RuleFactory';
import { aDetail, aSummary } from '../../../TestData';

describe('RuleFactory', () => {
    test('create_WhenATypeIsPicked_ShouldStartEnabledWithItsDefaults', () => {
        // Arrange
        const type = RuleTypeRegistry.get(RULE_TYPE_IDS.Delay)!;

        // Act
        const rule = RuleFactory.create(type);

        // Assert
        expect(rule).toMatchObject({
            name: type.label,
            enabled: true,
            type: RULE_TYPE_IDS.Delay,
            criteria: {
                match: 'all',
                items: [],
            },
            action: type.defaultAction(),
        });
    });

    test('mockOf_WhenARequestIsMocked_ShouldMatchItsMethodAndPathAndKeepTheBaseline', () => {
        // Arrange
        const detail = aDetail({
            summary: aSummary({
                method: 'POST',
                url: 'https://api.example.com/api/v1/orders?page=2',
                statusCode: 201,
            }),
            responseBody: '{"id":7}',
        });

        // Act
        const rule = RuleFactory.mockOf(detail);

        // Assert
        expect(rule.type).toBe(RULE_TYPE_IDS.MockResponse);
        expect(rule.name).toBe('Mock POST /api/v1/orders');
        expect(rule.criteria.items).toEqual([
            {
                field: CRITERION_FIELD_IDS.Method,
                op: CRITERION_OPERATOR_IDS.OneOf,
                name: '',
                value: 'POST',
                negate: false,
            },
            {
                field: CRITERION_FIELD_IDS.Url,
                op: CRITERION_OPERATOR_IDS.Wildcard,
                name: '',
                value: 'https://api.example.com/api/v1/orders*',
                negate: false,
            },
        ]);
        expect(rule.action).toMatchObject({
            status: 201,
            contentType: 'application/json',
            body: '{\n  "id": 7\n}',
        });
    });

    test('cookieOf_WhenTheCookieDomainHasALeadingDot_ShouldMatchTheBareDomain', () => {
        // Arrange
        const cookie = {
            name: 'session',
            value: 'abc',
            domain: '.example.com',
            path: '/',
            hostOnly: false,
            secure: true,
            httpOnly: true,
            sameSite: 'lax',
            session: true,
            storeId: '0',
        } satisfies chrome.cookies.Cookie;

        // Act
        const rule = RuleFactory.cookieOf(cookie);

        // Assert
        expect(rule.type).toBe(RULE_TYPE_IDS.RequestCookie);
        expect(rule.criteria.items[0]).toMatchObject({
            field: CRITERION_FIELD_IDS.Host,
            op: CRITERION_OPERATOR_IDS.Domains,
            value: 'example.com',
        });
        expect(rule.action).toMatchObject({
            op: 'addOrUpdate',
            name: 'session',
            value: 'abc',
        });
    });
});
