import { describe, expect, test } from "vitest";
import { BodyEditMessages, BodyEditModes, FindKinds } from "../../../../../src/Common/Rules/Types/Mocks/BodyEdits";
import { RequestBodyRule } from "../../../../../src/Common/Rules/Types/Mocks/RequestBodyRule";
import { ResponseBodyRule } from "../../../../../src/Common/Rules/Types/Mocks/ResponseBodyRule";
import { aRequestDraft, aRuleContext } from "../../../../TestData";

const ruleType = new RequestBodyRule();

describe("RequestBodyRule", () => {
    test("fields_WhenComparedWithTheResponseBodyRule_ShouldUseTheSameWording", () => {
        // Arrange
        const responseRule = new ResponseBodyRule();

        // Act
        const requestFields = ruleType.fields.map(field => `${field.key}:${field.label}:${field.hint ?? ""}`);
        const responseFields = responseRule.fields.map(field => `${field.key}:${field.label}:${field.hint ?? ""}`);

        // Assert
        expect(requestFields).toEqual(responseFields);
        expect(ruleType.description.replace("request", "response")).toBe(responseRule.description);
    });

    test("applyRequest_WhenModeIsReplace_ShouldSendTheNewBodyAndContentType", () => {
        // Arrange
        const request = aRequestDraft({
            method: "POST",
            body: "{\"name\":\"Ada\"}",
        });
        const action = {
            mode: BodyEditModes.Replace,
            body: "name=Grace",
            contentType: "application/x-www-form-urlencoded",
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.body).toBe("name=Grace");
        expect(draft.headers).toContainEqual({
            name: "Content-Type",
            value: "application/x-www-form-urlencoded",
        });
    });

    test("applyRequest_WhenReplaceHasNoContentType_ShouldKeepTheHeaders", () => {
        // Arrange
        const request = aRequestDraft({
            body: "{}",
        });
        const action = {
            mode: BodyEditModes.Replace,
            body: "{\"id\":1}",
            contentType: "",
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.headers).toEqual(request.headers);
    });

    test("applyRequest_WhenModeIsJsonMerge_ShouldPatchTheBody", () => {
        // Arrange
        const request = aRequestDraft({
            body: "{\"name\":\"Ada\",\"role\":\"admin\"}",
        });
        const action = {
            mode: BodyEditModes.JsonMerge,
            body: "{\"role\":null,\"plan\":\"pro\"}",
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(JSON.parse(draft.body ?? "")).toEqual({
            name: "Ada",
            plan: "pro",
        });
    });

    test("applyRequest_WhenFindingRegex_ShouldReplaceWithGroups", () => {
        // Arrange
        const request = aRequestDraft({
            body: "user-1, user-2",
        });
        const action = {
            mode: BodyEditModes.FindReplace,
            find: "user-(\\d)",
            findAs: FindKinds.Regex,
            replace: "id:$1",
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.body).toBe("id:1, id:2");
    });

    test("applyRequest_WhenFindingText_ShouldTreatRegexCharactersLiterally", () => {
        // Arrange
        const request = aRequestDraft({
            body: "price (5)",
        });
        const action = {
            mode: BodyEditModes.FindReplace,
            find: "(5)",
            findAs: FindKinds.Text,
            replace: "(6)",
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.body).toBe("price (6)");
    });

    test("applyRequest_WhenThereIsNoBodyAndModeIsNotReplace_ShouldLeaveItMissing", () => {
        // Arrange
        const request = aRequestDraft({
            body: null,
        });
        const action = {
            mode: BodyEditModes.JsonMerge,
            body: "{\"a\":1}",
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.body).toBeNull();
    });

    test("applyRequest_WhenAnOldRuleUsesIsRegex_ShouldFindAsRegex", () => {
        // Arrange
        const request = aRequestDraft({
            body: "a1 b2",
        });
        const action = {
            mode: BodyEditModes.FindReplace,
            find: "\\d",
            replace: "#",
            isRegex: true,
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.body).toBe("a# b#");
    });

    test.each([
        [
            {
                mode: BodyEditModes.FindReplace,
                find: "",
            },
            ["Find is required."],
        ],
        [
            {
                mode: BodyEditModes.JsonMerge,
                body: "{not json",
            },
            [BodyEditMessages.InvalidPatch],
        ],
        [
            {
                mode: BodyEditModes.Replace,
                body: "",
            },
            [],
        ],
    ])("validate_WhenActionIs(%j)_ShouldReturn(%j)", (action, expected) => {
        // Arrange
        const input = action;

        // Act
        const errors = ruleType.validate(input);

        // Assert
        expect(errors).toEqual(expected);
    });

    test("defaultAction_WhenCreated_ShouldStartBlankInReplaceMode", () => {
        // Arrange
        const expected = {
            mode: BodyEditModes.Replace,
            body: "",
            contentType: "",
            find: "",
            findAs: FindKinds.Text,
            replace: "",
        };

        // Act
        const action = ruleType.defaultAction();

        // Assert
        expect(action).toEqual(expected);
    });
});
