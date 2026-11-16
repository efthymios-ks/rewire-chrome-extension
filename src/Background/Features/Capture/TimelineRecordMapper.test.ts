import { describe, expect, test } from 'vitest';
import { TimelineRecordMapper } from './TimelineRecordMapper';
import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { RULE_ENGINE } from '../../../Contracts/Rules/RuleEngine';
import { aSummary } from '../../../TestData';
import { aTimelineRecord } from '../../BackgroundTestData';

const PAGE_HEADERS = [
    {
        name: 'content-type',
        value: 'application/json',
    },
    {
        name: 'test',
        value: '123',
    },
];

const WIRE_HEADERS = [
    {
        name: 'content-type',
        value: 'application/json',
    },
    {
        name: 'x-powered-by',
        value: 'Express',
    },
    {
        name: 'set-cookie',
        value: 'session=1',
    },
];

function aBrowserRuleSummary(): ReturnType<typeof aSummary> {
    return aSummary({
        appliedRules: [
            {
                ruleId: 'header',
                ruleName: 'Header',
                engine: RULE_ENGINE.Browser,
                note: 'Response header',
            },
        ],
    });
}

describe('TimelineRecordMapper', () => {
    test('toDetail_WhenWireHeadersExist_ShouldShowThePageHeadersPlusSetCookie', () => {
        // Arrange
        const record = aTimelineRecord({
            responseHeaders: PAGE_HEADERS,
            rawResponseHeaders: WIRE_HEADERS,
        });

        // Act
        const detail = TimelineRecordMapper.toDetail(record);

        // Assert
        expect(detail.responseHeaders).toEqual([
            ...PAGE_HEADERS,
            {
                name: 'set-cookie',
                value: 'session=1',
            },
        ]);
    });

    test('toDetail_WhenABrowserRuleRan_ShouldReportWhatItChangedOnTheWireHeaders', () => {
        // Arrange
        const record = aTimelineRecord({
            summary: aBrowserRuleSummary(),
            responseHeaders: PAGE_HEADERS,
            rawResponseHeaders: WIRE_HEADERS,
        });

        // Act
        const detail = TimelineRecordMapper.toDetail(record);

        // Assert
        expect(detail.changes).toEqual([
            {
                area: CHANGE_AREA.ResponseHeader,
                name: 'x-powered-by',
                before: 'Express',
                after: null,
            },
            {
                area: CHANGE_AREA.ResponseHeader,
                name: 'test',
                before: null,
                after: '123',
            },
        ]);
    });

    test('toDetail_WhenNoBrowserRuleRan_ShouldReportNoHeaderChanges', () => {
        // Arrange
        const record = aTimelineRecord({
            responseHeaders: PAGE_HEADERS,
            rawResponseHeaders: WIRE_HEADERS,
        });

        // Act
        const detail = TimelineRecordMapper.toDetail(record);

        // Assert
        expect(detail.changes).toEqual([]);
    });

    test('toDetail_WhenAChangeIsAlreadyRecorded_ShouldNotRepeatIt', () => {
        // Arrange
        const recorded = {
            area: CHANGE_AREA.ResponseHeader,
            name: 'test',
            before: null,
            after: '123',
        };
        const record = aTimelineRecord({
            summary: aBrowserRuleSummary(),
            responseHeaders: PAGE_HEADERS,
            rawResponseHeaders: WIRE_HEADERS.filter(header => header.name !== 'x-powered-by'),
            changes: [recorded],
        });

        // Act
        const detail = TimelineRecordMapper.toDetail(record);

        // Assert
        expect(detail.changes).toEqual([recorded]);
    });

    test('toDetail_WhenThereAreNoWireHeaders_ShouldShowThePageHeaders', () => {
        // Arrange
        const record = aTimelineRecord({
            responseHeaders: PAGE_HEADERS,
        });

        // Act
        const detail = TimelineRecordMapper.toDetail(record);

        // Assert
        expect(detail.responseHeaders).toEqual(PAGE_HEADERS);
    });

    test('toDetail_WhenTheRequestBodyIsBinary_ShouldCarryItsNoteAndBytes', () => {
        // Arrange
        const record = aTimelineRecord({
            requestBody: null,
            requestBodyNote: 'Binary body · 4 bytes.',
            requestBodyBase64: 'AP+ACg==',
            requestBodyByteSize: 4,
        });

        // Act
        const detail = TimelineRecordMapper.toDetail(record);

        // Assert
        expect(detail.requestBody).toBeNull();
        expect(detail.requestBodyNote).toBe('Binary body · 4 bytes.');
        expect(detail.requestBodyBase64).toBe('AP+ACg==');
        expect(detail.requestBodyByteSize).toBe(4);
    });
});
