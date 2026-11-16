import { describe, expect, test } from 'vitest';
import { RecordedChanges } from './RecordedChanges';
import { CHANGE_AREA, type ChangeArea } from '../../../Contracts/Rules/ChangeArea';
import type { ValueChange } from '../../../Contracts/Rules/ValueChange';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';
import { aDetail, TEST_URLS } from '../../../TestData';

function aDetailWithChanges(
    changes: ValueChange[],
    overrides: Partial<TimelineEntryDetail> = {},
): TimelineEntryDetail {
    return aDetail({
        requestHeaders: [
            {
                name: 'Accept',
                value: 'application/json',
            },
            {
                name: 'Cookie',
                value: 'session=1',
            },
        ],
        requestBody: '{"name":"Ada"}',
        responseHeaders: [
            {
                name: 'Content-Type',
                value: 'application/json',
            },
            {
                name: 'Set-Cookie',
                value: 'a=1',
            },
        ],
        responseBody: '{}',
        changes,
        ...overrides,
    });
}

interface ChangeOptions {
    area: ChangeArea;
    name: string;
    before: string | null;
    after: string | null;
}

function change({ area, name, before, after }: ChangeOptions): ValueChange {
    return {
        area,
        name,
        before,
        after,
    };
}

describe('RecordedChanges', () => {
    test('applyTo_WhenARuleAddedARequestHeaderChromeNeverSaw_ShouldListIt', () => {
        // Arrange
        const detail = aDetailWithChanges([
            change({ area: CHANGE_AREA.RequestHeader, name: 'x-debug', before: null, after: '1' }),
        ]);

        // Act
        const applied = RecordedChanges.applyTo(detail);

        // Assert
        expect(applied.requestHeaders).toContainEqual({
            name: 'x-debug',
            value: '1',
        });
    });

    test('applyTo_WhenARuleUpdatedTheCookieHeader_ShouldShowTheNewValueInPlace', () => {
        // Arrange
        const detail = aDetailWithChanges([
            change({
                area: CHANGE_AREA.RequestHeader,
                name: 'cookie',
                before: 'session=1',
                after: 'session=1; flag=beta',
            }),
        ]);

        // Act
        const applied = RecordedChanges.applyTo(detail);

        // Assert
        expect(applied.requestHeaders).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
            {
                name: 'Cookie',
                value: 'session=1; flag=beta',
            },
        ]);
    });

    test('applyTo_WhenARuleAddedASetCookie_ShouldListEveryValueOnItsOwnLine', () => {
        // Arrange
        const detail = aDetailWithChanges([
            change({
                area: CHANGE_AREA.ResponseHeader,
                name: 'set-cookie',
                before: 'a=1',
                after: 'a=1\nb=2',
            }),
        ]);

        // Act
        const applied = RecordedChanges.applyTo(detail);

        // Assert
        const cookieValues = applied.responseHeaders
            .filter(header => header.name === 'Set-Cookie')
            .map(header => header.value);
        expect(cookieValues).toEqual([
            'a=1',
            'b=2',
        ]);
    });

    test('applyTo_WhenARuleRemovedAHeader_ShouldLeaveItOut', () => {
        // Arrange
        const detail = aDetailWithChanges([
            change({
                area: CHANGE_AREA.ResponseHeader,
                name: 'content-type',
                before: 'application/json',
                after: null,
            }),
        ]);

        // Act
        const applied = RecordedChanges.applyTo(detail);

        // Assert
        expect(applied.responseHeaders.map(header => header.name)).toEqual(['Set-Cookie']);
    });

    test('applyTo_WhenChromeAlreadyReportedTheChange_ShouldChangeNothing', () => {
        // Arrange
        const detail = aDetailWithChanges(
            [
                change({
                    area: CHANGE_AREA.RequestHeader,
                    name: 'accept',
                    before: '*/*',
                    after: 'application/json',
                }),
            ],
        );

        // Act
        const applied = RecordedChanges.applyTo(detail);

        // Assert
        expect(applied.requestHeaders).toEqual(detail.requestHeaders);
    });

    test('applyTo_WhenRulesRewroteTheUrlBodyAndStatus_ShouldShowWhatWasSentAndReceived', () => {
        // Arrange
        const detail = aDetailWithChanges([
            change({
                area: CHANGE_AREA.Url,
                name: 'url',
                before: TEST_URLS.UsersProfile,
                after: `${TEST_URLS.UsersProfile}?debug=1`,
            }),
            change({
                area: CHANGE_AREA.RequestBody,
                name: 'body',
                before: '{"name":"Ada"}',
                after: '{"name":"Grace"}',
            }),
            change({ area: CHANGE_AREA.Status, name: 'status', before: '200', after: '503' }),
        ]);

        // Act
        const applied = RecordedChanges.applyTo(detail);

        // Assert
        expect(applied.summary.url).toBe(`${TEST_URLS.UsersProfile}?debug=1`);
        expect(applied.requestBody).toBe('{"name":"Grace"}');
        expect(applied.summary.statusCode).toBe(503);
    });

    test('applyTo_WhenARuleReplacedABinaryBody_ShouldShowTheNewTextInsteadOfTheBytes', () => {
        // Arrange
        const detail = aDetailWithChanges(
            /* changes: */ [
                change({
                    area: CHANGE_AREA.RequestBody,
                    name: 'body',
                    before: null,
                    after: '{"name":"Grace"}',
                }),
            ],
            /* overrides: */ {
                requestBody: null,
                requestBodyNote: 'Binary body · 4 bytes.',
                requestBodyBase64: 'AP+ACg==',
                requestBodyByteSize: 4,
            },
        );

        // Act
        const applied = RecordedChanges.applyTo(detail);

        // Assert
        expect(applied.requestBody).toBe('{"name":"Grace"}');
        expect(applied.requestBodyNote).toBeNull();
        expect(applied.requestBodyBase64).toBeNull();
        expect(applied.requestBodyByteSize).toBeNull();
    });

    test('applyTo_WhenTwoRulesSetTheSameHeader_ShouldEndWithTheLastValue', () => {
        // Arrange
        const detail = aDetailWithChanges([
            change({ area: CHANGE_AREA.RequestHeader, name: 'x-env', before: null, after: 'staging' }),
            change({
                area: CHANGE_AREA.RequestHeader,
                name: 'x-env',
                before: 'staging',
                after: 'production',
            }),
        ]);

        // Act
        const applied = RecordedChanges.applyTo(detail);

        // Assert
        expect(applied.requestHeaders.filter(header => header.name === 'x-env')).toEqual([
            {
                name: 'x-env',
                value: 'production',
            },
        ]);
    });
});
