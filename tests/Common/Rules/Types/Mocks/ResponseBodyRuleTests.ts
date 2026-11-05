import { describe, expect, test } from "vitest";
import { BodyEditModes, FindKinds } from "../../../../../src/Common/Rules/Types/Mocks/BodyEdits";
import { ResponseBodyRule } from "../../../../../src/Common/Rules/Types/Mocks/ResponseBodyRule";
import { aRequestDraft, aResponseDraft, aRuleContext } from "../../../../TestData";

const ruleType = new ResponseBodyRule();

function responseAfter(action: Record<string, unknown>, body: string | null = "{\"id\":42,\"name\":\"Ada\"}"): ReturnType<typeof aResponseDraft> {
    return ruleType.applyResponse(
        aResponseDraft({
            body,
        }),
        action,
        aRuleContext(),
        aRequestDraft()
    );
}

describe("ResponseBodyRule", () => {
    test("applyResponse_WhenModeIsReplace_ShouldServeTheNewBodyAndContentType", () => {
        // Arrange
        const action = {
            mode: BodyEditModes.Replace,
            body: "<user/>",
            contentType: "application/xml",
        };

        // Act
        const draft = responseAfter(action);

        // Assert
        expect(draft.body).toBe("<user/>");
        expect(draft.headers).toEqual([
            {
                name: "Content-Type",
                value: "application/xml",
            },
        ]);
    });

    test("applyResponse_WhenModeIsJsonMerge_ShouldPatchTheBody", () => {
        // Arrange
        const action = {
            mode: BodyEditModes.JsonMerge,
            body: "{\"name\":\"Grace\"}",
        };

        // Act
        const draft = responseAfter(action);

        // Assert
        expect(JSON.parse(draft.body ?? "")).toEqual({
            id: 42,
            name: "Grace",
        });
    });

    test("applyResponse_WhenFindingText_ShouldReplaceEveryOccurrence", () => {
        // Arrange
        const action = {
            mode: BodyEditModes.FindReplace,
            find: "Ada",
            findAs: FindKinds.Text,
            replace: "Grace",
        };

        // Act
        const draft = responseAfter(action, "Ada and Ada");

        // Assert
        expect(draft.body).toBe("Grace and Grace");
    });

    test("applyResponse_WhenAnOldRuleHasNoMode_ShouldFindAndReplace", () => {
        // Arrange
        const action = {
            find: "Ada",
            replace: "Grace",
            isRegex: false,
        };

        // Act
        const draft = responseAfter(action);

        // Assert
        expect(draft.body).toBe("{\"id\":42,\"name\":\"Grace\"}");
    });

    test("applyResponse_WhenTheRequestFailed_ShouldLeaveTheFailure", () => {
        // Arrange
        const response = aResponseDraft({
            errorReason: "ConnectionRefused",
        });
        const action = {
            mode: BodyEditModes.Replace,
            body: "{}",
        };

        // Act
        const draft = ruleType.applyResponse(
            response,
            action,
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft).toEqual(response);
    });

    test("applyResponse_WhenTheBodyWasNotReadAndModeIsReplace_ShouldStillServeTheNewBody", () => {
        // Arrange
        const action = {
            mode: BodyEditModes.Replace,
            body: "{}",
        };

        // Act
        const draft = responseAfter(action, null);

        // Assert
        expect(draft.body).toBe("{}");
    });
});
