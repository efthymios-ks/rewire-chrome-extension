import { describe, expect, test } from 'vitest';
import { type CorsPolicy, CorsHeaders } from './CorsHeaders';
import type { HeaderEntry } from '../../../../Contracts/Timeline/HeaderEntry';
import { aRequestDraft } from '../../../../TestData';

const EMPTY_POLICY: CorsPolicy = {
    allowedOrigin: '',
    allowedMethods: '',
    allowedHeaders: '',
};

const PREFLIGHT_HEADERS: HeaderEntry[] = [
    {
        name: 'origin',
        value: 'http://localhost:3000',
    },
    {
        name: 'access-control-request-method',
        value: 'PUT',
    },
    {
        name: 'access-control-request-headers',
        value: 'X-Token',
    },
];

function aPolicy(overrides: Partial<CorsPolicy> = {}): CorsPolicy {
    return {
        allowedOrigin: 'https://app.example.com',
        allowedMethods: 'GET, POST',
        allowedHeaders: 'Authorization',
        ...overrides,
    };
}

function valueOf(headers: HeaderEntry[], name: string): string | undefined {
    return headers.find(header => header.name === name)?.value;
}

describe('CorsHeaders', () => {
    test.each([
        [
            'OPTIONS',
            true,
        ],
        [
            'options',
            true,
        ],
        [
            'GET',
            false,
        ],
        [
            'POST',
            false,
        ],
    ])('isPreflight_WhenMethodIs(%s)WithARequestMethodHeader_ShouldReturn(%s)', (method, expected) => {
        // Arrange
        const request = aRequestDraft({
            method,
            headers: PREFLIGHT_HEADERS,
        });

        // Act
        const isPreflight = CorsHeaders.isPreflight(request);

        // Assert
        expect(isPreflight).toBe(expected);
    });

    test('isPreflight_WhenOptionsLacksARequestMethodHeader_ShouldReturnFalse', () => {
        // Arrange
        const request = aRequestDraft({
            method: 'OPTIONS',
            headers: [
                {
                    name: 'Origin',
                    value: 'http://localhost:3000',
                },
            ],
        });

        // Act
        const isPreflight = CorsHeaders.isPreflight(request);

        // Assert
        expect(isPreflight).toBe(false);
    });

    test('isPreflight_WhenTheRequestMethodHeaderIsEmpty_ShouldStillReturnTrue', () => {
        // Arrange
        const request = aRequestDraft({
            method: 'OPTIONS',
            headers: [
                {
                    name: 'Access-Control-Request-Method',
                    value: '',
                },
            ],
        });

        // Act
        const isPreflight = CorsHeaders.isPreflight(request);

        // Assert
        expect(isPreflight).toBe(true);
    });

    test('echo_WhenOriginIsNull_ShouldReturnNoHeaders', () => {
        // Act
        const headers = CorsHeaders.echo(null);

        // Assert
        expect(headers).toEqual([]);
    });

    test('echo_WhenOriginIsGiven_ShouldAllowItWithCredentials', () => {
        // Act
        const headers = CorsHeaders.echo('https://app.example.com');

        // Assert
        expect(headers).toEqual([
            {
                name: 'Access-Control-Allow-Origin',
                value: 'https://app.example.com',
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

    test('echo_WhenOriginIsEmpty_ShouldEchoItAsIs', () => {
        // Act
        const headers = CorsHeaders.echo('');

        // Assert
        expect(valueOf(headers, 'Access-Control-Allow-Origin')).toBe('');
    });

    test('forResponse_WhenPolicyIsSet_ShouldUseItAndAllowCredentials', () => {
        // Arrange
        const policy = aPolicy({
            allowedOrigin: '  https://app.example.com  ',
        });

        // Act
        const headers = CorsHeaders.forResponse(policy);

        // Assert
        expect(headers).toEqual([
            {
                name: 'Access-Control-Allow-Origin',
                value: 'https://app.example.com',
            },
            {
                name: 'Access-Control-Allow-Methods',
                value: 'GET, POST',
            },
            {
                name: 'Access-Control-Allow-Headers',
                value: 'Authorization',
            },
            {
                name: 'Access-Control-Expose-Headers',
                value: '*',
            },
            {
                name: 'Access-Control-Allow-Credentials',
                value: 'true',
            },
        ]);
    });

    test('forResponse_WhenPolicyIsEmpty_ShouldUseDefaultsWithoutCredentials', () => {
        // Act
        const headers = CorsHeaders.forResponse(EMPTY_POLICY);

        // Assert
        expect(headers).toEqual([
            {
                name: 'Access-Control-Allow-Origin',
                value: '*',
            },
            {
                name: 'Access-Control-Allow-Methods',
                value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            },
            {
                name: 'Access-Control-Allow-Headers',
                value: 'Authorization, Content-Type, X-Requested-With',
            },
            {
                name: 'Access-Control-Expose-Headers',
                value: '*',
            },
        ]);
    });

    test('forResponse_WhenPolicyIsOnlyWhitespace_ShouldUseDefaults', () => {
        // Arrange
        const policy = {
            allowedOrigin: '   ',
            allowedMethods: '\t',
            allowedHeaders: ' ',
        };

        // Act
        const headers = CorsHeaders.forResponse(policy);

        // Assert
        expect(headers).toEqual(CorsHeaders.forResponse(EMPTY_POLICY));
    });

    test('forResponse_WhenOriginIsExplicitlyAny_ShouldNotAllowCredentials', () => {
        // Arrange
        const policy = aPolicy({
            allowedOrigin: ' * ',
        });

        // Act
        const headers = CorsHeaders.forResponse(policy);

        // Assert
        expect(valueOf(headers, 'Access-Control-Allow-Origin')).toBe('*');
        expect(valueOf(headers, 'Access-Control-Allow-Credentials')).toBeUndefined();
        expect(valueOf(headers, 'Access-Control-Allow-Methods')).toBe('GET, POST');
    });

    test('forPreflight_WhenPolicyIsNull_ShouldEchoTheRequest', () => {
        // Arrange
        const request = aRequestDraft({
            method: 'OPTIONS',
            headers: PREFLIGHT_HEADERS,
        });

        // Act
        const headers = CorsHeaders.forPreflight(request, null);

        // Assert
        expect(headers).toEqual([
            {
                name: 'Access-Control-Allow-Origin',
                value: 'http://localhost:3000',
            },
            {
                name: 'Access-Control-Allow-Credentials',
                value: 'true',
            },
            {
                name: 'Access-Control-Allow-Methods',
                value: 'PUT',
            },
            {
                name: 'Access-Control-Allow-Headers',
                value: 'X-Token',
            },
            {
                name: 'Access-Control-Max-Age',
                value: '600',
            },
            {
                name: 'Vary',
                value: 'Origin',
            },
        ]);
    });

    test('forPreflight_WhenPolicyIsEmpty_ShouldEchoTheRequest', () => {
        // Arrange
        const request = aRequestDraft({
            method: 'OPTIONS',
            headers: PREFLIGHT_HEADERS,
        });

        // Act
        const headers = CorsHeaders.forPreflight(request, EMPTY_POLICY);

        // Assert
        expect(headers).toEqual(CorsHeaders.forPreflight(request, null));
    });

    test('forPreflight_WhenPolicyIsSet_ShouldPreferItOverTheRequest', () => {
        // Arrange
        const request = aRequestDraft({
            method: 'OPTIONS',
            headers: PREFLIGHT_HEADERS,
        });

        // Act
        const headers = CorsHeaders.forPreflight(
            /* request: */ request,
            /* policy: */ aPolicy({
                allowedHeaders: '  Authorization, X-Token  ',
            }),
        );

        // Assert
        expect(valueOf(headers, 'Access-Control-Allow-Origin')).toBe('https://app.example.com');
        expect(valueOf(headers, 'Access-Control-Allow-Methods')).toBe('GET, POST');
        expect(valueOf(headers, 'Access-Control-Allow-Headers')).toBe('Authorization, X-Token');
    });

    test('forPreflight_WhenPolicyIsPartial_ShouldFillTheGapsFromTheRequest', () => {
        // Arrange
        const request = aRequestDraft({
            method: 'OPTIONS',
            headers: PREFLIGHT_HEADERS,
        });

        // Act
        const headers = CorsHeaders.forPreflight(
            /* request: */ request,
            /* policy: */ aPolicy({
                allowedOrigin: '',
                allowedHeaders: ' ',
            }),
        );

        // Assert
        expect(valueOf(headers, 'Access-Control-Allow-Origin')).toBe('http://localhost:3000');
        expect(valueOf(headers, 'Access-Control-Allow-Methods')).toBe('GET, POST');
        expect(valueOf(headers, 'Access-Control-Allow-Headers')).toBe('X-Token');
    });

    test('forPreflight_WhenTheRequestCarriesNothingAndPolicyIsNull_ShouldUseDefaults', () => {
        // Arrange
        const request = aRequestDraft({
            method: 'OPTIONS',
            headers: [],
        });

        // Act
        const headers = CorsHeaders.forPreflight(request, null);

        // Assert
        expect(valueOf(headers, 'Access-Control-Allow-Origin')).toBe('*');
        expect(valueOf(headers, 'Access-Control-Allow-Credentials')).toBe('true');
        expect(valueOf(headers, 'Access-Control-Allow-Methods'))
            .toBe('GET, POST, PUT, PATCH, DELETE, OPTIONS');
        expect(valueOf(headers, 'Access-Control-Allow-Headers'))
            .toBe('Authorization, Content-Type, X-Requested-With');
    });

    test('forPreflight_WhenRequestHeadersAreEmpty_ShouldSkipThemForDefaults', () => {
        // Arrange
        const request = aRequestDraft({
            method: 'OPTIONS',
            headers: [
                {
                    name: 'Origin',
                    value: '',
                },
                {
                    name: 'Access-Control-Request-Method',
                    value: '',
                },
                {
                    name: 'Access-Control-Request-Headers',
                    value: '',
                },
            ],
        });

        // Act
        const headers = CorsHeaders.forPreflight(request, null);

        // Assert
        expect(valueOf(headers, 'Access-Control-Allow-Origin')).toBe('*');
        expect(valueOf(headers, 'Access-Control-Allow-Methods'))
            .toBe('GET, POST, PUT, PATCH, DELETE, OPTIONS');
        expect(valueOf(headers, 'Access-Control-Allow-Headers'))
            .toBe('Authorization, Content-Type, X-Requested-With');
    });
});
