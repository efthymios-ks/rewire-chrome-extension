import { describe, expect, test } from "vitest";
import { TimelineRecordMapper } from "../../../../src/Background/Features/Capture/TimelineRecordMapper";
import { RuleEngine } from "../../../../src/Contracts/Rules/RuleEngine";
import { ChangeArea } from "../../../../src/Contracts/Rules/ValueChange";
import { aSummary } from "../../../TestData";
import { aTimelineRecord } from "../../BackgroundTestData";

const PageHeaders = [
    {
        name: "content-type",
        value: "application/json",
    },
    {
        name: "test",
        value: "123",
    },
];

const WireHeaders = [
    {
        name: "content-type",
        value: "application/json",
    },
    {
        name: "x-powered-by",
        value: "Express",
    },
    {
        name: "set-cookie",
        value: "session=1",
    },
];

function aBrowserRuleSummary(): ReturnType<typeof aSummary> {
    return aSummary({
        appliedRules: [
            {
                ruleId: "header",
                ruleName: "Header",
                engine: RuleEngine.Browser,
                note: "Response header",
            },
        ],
    });
}

describe("TimelineRecordMapper", () => {
    test("toDetail_WhenWireHeadersExist_ShouldShowThePageHeadersPlusSetCookie", () => {
        // Arrange
        const record = aTimelineRecord({
            responseHeaders: PageHeaders,
            rawResponseHeaders: WireHeaders,
        });

        // Act
        const detail = TimelineRecordMapper.toDetail(record);

        // Assert
        expect(detail.responseHeaders).toEqual([
            ...PageHeaders,
            {
                name: "set-cookie",
                value: "session=1",
            },
        ]);
    });

    test("toDetail_WhenABrowserRuleRan_ShouldReportWhatItChangedOnTheWireHeaders", () => {
        // Arrange
        const record = aTimelineRecord({
            summary: aBrowserRuleSummary(),
            responseHeaders: PageHeaders,
            rawResponseHeaders: WireHeaders,
        });

        // Act
        const detail = TimelineRecordMapper.toDetail(record);

        // Assert
        expect(detail.changes).toEqual([
            {
                area: ChangeArea.ResponseHeader,
                name: "x-powered-by",
                before: "Express",
                after: null,
            },
            {
                area: ChangeArea.ResponseHeader,
                name: "test",
                before: null,
                after: "123",
            },
        ]);
    });

    test("toDetail_WhenNoBrowserRuleRan_ShouldReportNoHeaderChanges", () => {
        // Arrange
        const record = aTimelineRecord({
            responseHeaders: PageHeaders,
            rawResponseHeaders: WireHeaders,
        });

        // Act
        const detail = TimelineRecordMapper.toDetail(record);

        // Assert
        expect(detail.changes).toEqual([]);
    });

    test("toDetail_WhenAChangeIsAlreadyRecorded_ShouldNotRepeatIt", () => {
        // Arrange
        const recorded = {
            area: ChangeArea.ResponseHeader,
            name: "test",
            before: null,
            after: "123",
        };
        const record = aTimelineRecord({
            summary: aBrowserRuleSummary(),
            responseHeaders: PageHeaders,
            rawResponseHeaders: WireHeaders.filter(header => header.name !== "x-powered-by"),
            changes: [recorded],
        });

        // Act
        const detail = TimelineRecordMapper.toDetail(record);

        // Assert
        expect(detail.changes).toEqual([recorded]);
    });

    test("toDetail_WhenThereAreNoWireHeaders_ShouldShowThePageHeaders", () => {
        // Arrange
        const record = aTimelineRecord({
            responseHeaders: PageHeaders,
        });

        // Act
        const detail = TimelineRecordMapper.toDetail(record);

        // Assert
        expect(detail.responseHeaders).toEqual(PageHeaders);
    });
});
