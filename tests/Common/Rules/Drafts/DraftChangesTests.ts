import { describe, expect, test } from "vitest";
import { DraftChanges } from "../../../../src/Common/Rules/Drafts/DraftChanges";
import { ChangeArea } from "../../../../src/Contracts/Rules/ValueChange";
import { aRequestDraft, aResponseDraft, TestUrls } from "../../../TestData";

describe("DraftChanges", () => {
    test("ofRequest_WhenNothingChanges_ShouldReturnEmpty", () => {
        // Arrange
        const before = aRequestDraft();

        // Act
        const changes = DraftChanges.ofRequest(before, aRequestDraft());

        // Assert
        expect(changes).toEqual([]);
    });

    test("ofRequest_WhenUrlBodyAndOutcomeChange_ShouldReportEachInOrder", () => {
        // Arrange
        const before = aRequestDraft();
        const after = aRequestDraft({
            url: TestUrls.Orders,
            body: "{\"page\":2}",
            response: {
                status: 204,
                headers: [],
                body: "",
            },
        });

        // Act
        const changes = DraftChanges.ofRequest(before, after);

        // Assert
        expect(changes).toEqual([
            {
                area: ChangeArea.Url,
                name: "url",
                before: TestUrls.UsersProfile,
                after: TestUrls.Orders,
            },
            {
                area: ChangeArea.RequestBody,
                name: "body",
                before: null,
                after: "{\"page\":2}",
            },
            {
                area: ChangeArea.Outcome,
                name: "response",
                before: null,
                after: "204",
            },
        ]);
    });

    test("ofRequest_WhenHeadersAreAddedChangedAndRemoved_ShouldReportByLowercaseName", () => {
        // Arrange
        const before = aRequestDraft({
            headers: [
                {
                    name: "Accept",
                    value: "application/json",
                },
                {
                    name: "X-Debug",
                    value: "1",
                },
            ],
        });
        const after = aRequestDraft({
            headers: [
                {
                    name: "accept",
                    value: "text/plain",
                },
                {
                    name: "Authorization",
                    value: "Bearer abc",
                },
            ],
        });

        // Act
        const changes = DraftChanges.ofRequest(before, after);

        // Assert
        expect(changes).toEqual([
            {
                area: ChangeArea.RequestHeader,
                name: "accept",
                before: "application/json",
                after: "text/plain",
            },
            {
                area: ChangeArea.RequestHeader,
                name: "x-debug",
                before: "1",
                after: null,
            },
            {
                area: ChangeArea.RequestHeader,
                name: "authorization",
                before: null,
                after: "Bearer abc",
            },
        ]);
    });

    test("ofRequest_WhenHeaderOnlyChangesCase_ShouldReportNothing", () => {
        // Arrange
        const before = aRequestDraft();
        const after = aRequestDraft({
            headers: [
                {
                    name: "ACCEPT",
                    value: "application/json",
                },
            ],
        });

        // Act
        const changes = DraftChanges.ofRequest(before, after);

        // Assert
        expect(changes).toEqual([]);
    });

    test("ofResponse_WhenRepeatedHeaderGainsValue_ShouldJoinValuesWithNewLines", () => {
        // Arrange
        const before = aResponseDraft({
            headers: [
                {
                    name: "Set-Cookie",
                    value: "a=1",
                },
            ],
        });
        const after = aResponseDraft({
            headers: [
                {
                    name: "Set-Cookie",
                    value: "a=1",
                },
                {
                    name: "set-cookie",
                    value: "b=2",
                },
            ],
        });

        // Act
        const changes = DraftChanges.ofResponse(before, after);

        // Assert
        expect(changes).toEqual([
            {
                area: ChangeArea.ResponseHeader,
                name: "set-cookie",
                before: "a=1",
                after: "a=1\nb=2",
            },
        ]);
    });

    test("ofResponse_WhenStatusAndBodyChange_ShouldReportEachInOrder", () => {
        // Arrange
        const before = aResponseDraft();
        const after = aResponseDraft({
            status: 503,
            body: null,
        });

        // Act
        const changes = DraftChanges.ofResponse(before, after);

        // Assert
        expect(changes).toEqual([
            {
                area: ChangeArea.Status,
                name: "status",
                before: "200",
                after: "503",
            },
            {
                area: ChangeArea.ResponseBody,
                name: "body",
                before: "{\"id\":42}",
                after: null,
            },
        ]);
    });

    test("ofResponse_WhenOnlyErrorReasonChanges_ShouldReportNothing", () => {
        // Arrange
        const before = aResponseDraft();
        const after = aResponseDraft({
            errorReason: "ConnectionReset",
        });

        // Act
        const changes = DraftChanges.ofResponse(before, after);

        // Assert
        expect(changes).toEqual([]);
    });
});
