import { describe, expect, test } from "vitest";
import { RecordedChanges } from "../../../../src/Background/Features/Capture/RecordedChanges";
import { ChangeArea, type ValueChange } from "../../../../src/Contracts/Rules/ValueChange";
import type { TimelineEntryDetail } from "../../../../src/Contracts/Timeline/TimelineEntryDetail";
import { aSummary, TestUrls } from "../../../TestData";

function aDetail(changes: ValueChange[], overrides: Partial<TimelineEntryDetail> = {}): TimelineEntryDetail {
    return {
        summary: aSummary(),
        requestHeaders: [
            {
                name: "Accept",
                value: "application/json",
            },
            {
                name: "Cookie",
                value: "session=1",
            },
        ],
        requestBody: "{\"name\":\"Ada\"}",
        responseHeaders: [
            {
                name: "Content-Type",
                value: "application/json",
            },
            {
                name: "Set-Cookie",
                value: "a=1",
            },
        ],
        responseBody: "{}",
        responseBodyNote: null,
        changes,
        ...overrides,
    };
}

function change(
    area: ChangeArea,
    name: string,
    before: string | null,
    after: string | null
): ValueChange {
    return {
        area,
        name,
        before,
        after,
    };
}

describe("RecordedChanges", () => {
    test("applyTo_WhenARuleAddedARequestHeaderChromeNeverSaw_ShouldListIt", () => {
        // Arrange
        const detail = aDetail([
            change(
                ChangeArea.RequestHeader,
                "x-debug",
                null,
                "1"
            ),
        ]);

        // Act
        const applied = RecordedChanges.applyTo(detail);

        // Assert
        expect(applied.requestHeaders).toContainEqual({
            name: "x-debug",
            value: "1",
        });
    });

    test("applyTo_WhenARuleUpdatedTheCookieHeader_ShouldShowTheNewValueInPlace", () => {
        // Arrange
        const detail = aDetail([
            change(
                ChangeArea.RequestHeader,
                "cookie",
                "session=1",
                "session=1; flag=beta"
            ),
        ]);

        // Act
        const applied = RecordedChanges.applyTo(detail);

        // Assert
        expect(applied.requestHeaders).toEqual([
            {
                name: "Accept",
                value: "application/json",
            },
            {
                name: "Cookie",
                value: "session=1; flag=beta",
            },
        ]);
    });

    test("applyTo_WhenARuleAddedASetCookie_ShouldListEveryValueOnItsOwnLine", () => {
        // Arrange
        const detail = aDetail([
            change(
                ChangeArea.ResponseHeader,
                "set-cookie",
                "a=1",
                "a=1\nb=2"
            ),
        ]);

        // Act
        const applied = RecordedChanges.applyTo(detail);

        // Assert
        expect(applied.responseHeaders.filter(header => header.name === "Set-Cookie").map(header => header.value)).toEqual([
            "a=1",
            "b=2",
        ]);
    });

    test("applyTo_WhenARuleRemovedAHeader_ShouldLeaveItOut", () => {
        // Arrange
        const detail = aDetail([
            change(
                ChangeArea.ResponseHeader,
                "content-type",
                "application/json",
                null
            ),
        ]);

        // Act
        const applied = RecordedChanges.applyTo(detail);

        // Assert
        expect(applied.responseHeaders.map(header => header.name)).toEqual(["Set-Cookie"]);
    });

    test("applyTo_WhenChromeAlreadyReportedTheChange_ShouldChangeNothing", () => {
        // Arrange
        const detail = aDetail(
            [
                change(
                    ChangeArea.RequestHeader,
                    "accept",
                    "*/*",
                    "application/json"
                ),
            ]
        );

        // Act
        const applied = RecordedChanges.applyTo(detail);

        // Assert
        expect(applied.requestHeaders).toEqual(detail.requestHeaders);
    });

    test("applyTo_WhenRulesRewroteTheUrlBodyAndStatus_ShouldShowWhatWasSentAndReceived", () => {
        // Arrange
        const detail = aDetail([
            change(
                ChangeArea.Url,
                "url",
                TestUrls.UsersProfile,
                `${TestUrls.UsersProfile}?debug=1`
            ),
            change(
                ChangeArea.RequestBody,
                "body",
                "{\"name\":\"Ada\"}",
                "{\"name\":\"Grace\"}"
            ),
            change(
                ChangeArea.Status,
                "status",
                "200",
                "503"
            ),
        ]);

        // Act
        const applied = RecordedChanges.applyTo(detail);

        // Assert
        expect(applied.summary.url).toBe(`${TestUrls.UsersProfile}?debug=1`);
        expect(applied.requestBody).toBe("{\"name\":\"Grace\"}");
        expect(applied.summary.statusCode).toBe(503);
    });

    test("applyTo_WhenTwoRulesSetTheSameHeader_ShouldEndWithTheLastValue", () => {
        // Arrange
        const detail = aDetail([
            change(
                ChangeArea.RequestHeader,
                "x-env",
                null,
                "staging"
            ),
            change(
                ChangeArea.RequestHeader,
                "x-env",
                "staging",
                "production"
            ),
        ]);

        // Act
        const applied = RecordedChanges.applyTo(detail);

        // Assert
        expect(applied.requestHeaders.filter(header => header.name === "x-env")).toEqual([
            {
                name: "x-env",
                value: "production",
            },
        ]);
    });
});
