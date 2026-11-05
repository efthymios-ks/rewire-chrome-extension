import { describe, expect, test } from "vitest";
import { StatusAppearance } from "../../../../src/SidePanel/Core/Formatting/StatusAppearance";
import { TimelineEntryState } from "../../../../src/Contracts/Timeline/TimelineEntryState";
import { aSummary } from "../../../TestData";

describe("StatusAppearance", () => {
    test.each([
        [
            200,
            "status-ok",
        ],
        [
            308,
            "status-redirect",
        ],
        [
            404,
            "status-client-error",
        ],
        [
            502,
            "status-server-error",
        ],
    ])("classOf_WhenTheStatusIs(%s)_ShouldReturn(%s)", (status, expected) => {
        // Arrange
        const summary = aSummary({
            statusCode: status,
        });

        // Act
        const className = StatusAppearance.classOf(summary);

        // Assert
        expect(className).toBe(expected);
    });

    test("classOf_WhenTheRequestFailed_ShouldReturnTheFailedClass", () => {
        // Arrange
        const summary = aSummary({
            state: TimelineEntryState.Failed,
            statusCode: null,
        });

        // Act
        const className = StatusAppearance.classOf(summary);

        // Assert
        expect(className).toBe("status-failed");
    });

    test("classOf_WhenTheRequestIsPending_ShouldReturnThePendingClass", () => {
        // Arrange
        const summary = aSummary({
            state: TimelineEntryState.Pending,
            statusCode: null,
        });

        // Act
        const className = StatusAppearance.classOf(summary);

        // Assert
        expect(className).toBe("status-pending");
    });

    test("textOf_WhenTheRequestIsPending_ShouldReturnEllipsis", () => {
        // Arrange
        const summary = aSummary({
            state: TimelineEntryState.Pending,
            statusCode: null,
        });

        // Act
        const text = StatusAppearance.textOf(summary);

        // Assert
        expect(text).toBe("...");
    });

    test("textOf_WhenTheRequestFailed_ShouldReturnErr", () => {
        // Arrange
        const summary = aSummary({
            state: TimelineEntryState.Failed,
            statusCode: null,
        });

        // Act
        const text = StatusAppearance.textOf(summary);

        // Assert
        expect(text).toBe("ERR");
    });

    test("describeOf_WhenTheResponseHasStatusText_ShouldReturnCodeAndPhrase", () => {
        // Arrange
        const summary = aSummary({
            statusCode: 307,
            statusText: "Internal Redirect",
        });

        // Act
        const description = StatusAppearance.describeOf(summary);

        // Assert
        expect(description).toBe("307 Internal Redirect");
    });

    test("describeOf_WhenTheResponseIsHttp2WithoutStatusText_ShouldFallBackToStandardPhrase", () => {
        // Arrange
        const summary = aSummary({
            statusCode: 204,
            statusText: "",
        });

        // Act
        const description = StatusAppearance.describeOf(summary);

        // Assert
        expect(description).toBe("204 No Content");
    });

    test("describeOf_WhenTheStatusIsUnknown_ShouldReturnJustTheCode", () => {
        // Arrange
        const summary = aSummary({
            statusCode: 599,
            statusText: "",
        });

        // Act
        const description = StatusAppearance.describeOf(summary);

        // Assert
        expect(description).toBe("599");
    });

    test("describeOf_WhenTheRequestIsPending_ShouldReturnEllipsis", () => {
        // Arrange
        const summary = aSummary({
            state: TimelineEntryState.Pending,
            statusCode: null,
            statusText: "",
        });

        // Act
        const description = StatusAppearance.describeOf(summary);

        // Assert
        expect(description).toBe("...");
    });

    test("describeOf_WhenTheRequestFailed_ShouldReturnErr", () => {
        // Arrange
        const summary = aSummary({
            state: TimelineEntryState.Failed,
            statusCode: null,
            statusText: "",
            errorText: "net::ERR_FAILED",
        });

        // Act
        const description = StatusAppearance.describeOf(summary);

        // Assert
        expect(description).toBe("ERR");
    });

    test.each([
        [
            404,
            "status-client-error",
        ],
        [
            302,
            "status-redirect",
        ],
        [
            0,
            "status-pending",
        ],
    ])("classOfCode_WhenTheStatusIs(%s)_ShouldReturn(%s)", (status, expected) => {
        // Arrange
        const statusCode = status;

        // Act
        const className = StatusAppearance.classOfCode(statusCode);

        // Assert
        expect(className).toBe(expected);
    });

    test.each([
        [
            200,
            "",
            "200 OK",
        ],
        [
            200,
            "Fine",
            "200 Fine",
        ],
        [
            599,
            "",
            "599",
        ],
    ])("lineOf_WhenTheStatusIs(%s)AndTheTextIs(%s)_ShouldReturn(%s)", (
        status,
        text,
        expected
    ) => {
        // Arrange
        const statusText = text;

        // Act
        const line = StatusAppearance.lineOf(status, statusText);

        // Assert
        expect(line).toBe(expected);
    });
});
