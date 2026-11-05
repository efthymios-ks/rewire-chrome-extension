import { describe, expect, test } from "vitest";
import type { DnrCondition } from "../../../../../src/Common/Rules/Criteria/DnrFragment";
import { ResponseCookieRule } from "../../../../../src/Common/Rules/Types/Cookies/ResponseCookieRule";
import { OperationKinds } from "../../../../../src/Common/Rules/Types/OperationKinds";
import type { HeaderEntry } from "../../../../../src/Contracts/Timeline/HeaderEntry";
import { aRequestDraft, aResponseDraft, aRuleContext } from "../../../../TestData";

const ruleType = new ResponseCookieRule();
const condition: DnrCondition = {
    urlFilter: "||api.example.com",
};
const serverCookies: HeaderEntry[] = [
    {
        name: "Set-Cookie",
        value: "session=old; Path=/app; HttpOnly",
    },
    {
        name: "set-cookie",
        value: "theme=dark",
    },
];

describe("ResponseCookieRule", () => {
    test("applyResponse_WhenOperationIsAdd_ShouldAppendASetCookieWithEveryAttribute", () => {
        // Arrange
        const action = {
            op: OperationKinds.Add,
            name: "session",
            value: "abc",
            domain: "example.com",
            path: "/",
            maxAge: "3600",
            sameSite: "Lax",
            secure: true,
            httpOnly: true,
        };

        // Act
        const draft = ruleType.applyResponse(
            aResponseDraft(),
            action,
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft.headers).toEqual([
            {
                name: "Content-Type",
                value: "application/json",
            },
            {
                name: "Set-Cookie",
                value: "session=abc; Domain=example.com; Path=/; Max-Age=3600; Secure; HttpOnly; SameSite=Lax",
            },
        ]);
    });

    test("applyResponse_WhenAddOrUpdateLeavesFieldsEmpty_ShouldKeepTheServerAttributes", () => {
        // Arrange
        const response = aResponseDraft({
            headers: serverCookies,
        });
        const action = {
            op: OperationKinds.AddOrUpdate,
            name: "session",
            value: "",
            domain: "",
            path: "",
            maxAge: "",
            sameSite: "Strict",
            secure: true,
            httpOnly: false,
        };

        // Act
        const draft = ruleType.applyResponse(
            response,
            action,
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft.headers).toEqual([
            {
                name: "Set-Cookie",
                value: "session=old; Path=/app; Secure; HttpOnly; SameSite=Strict",
            },
            {
                name: "set-cookie",
                value: "theme=dark",
            },
        ]);
    });

    test("applyResponse_WhenAddOrUpdateHasATemplateValue_ShouldRenderAndReplaceTheValue", () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable("sessionId", "s-42");
        const response = aResponseDraft({
            headers: serverCookies,
        });
        const action = {
            op: OperationKinds.AddOrUpdate,
            name: "session",
            value: "{{sessionId}}",
        };

        // Act
        const draft = ruleType.applyResponse(
            response,
            action,
            context,
            aRequestDraft()
        );

        // Assert
        expect(draft.headers[0]).toEqual({
            name: "Set-Cookie",
            value: "session=s-42; Path=/app; HttpOnly",
        });
    });

    test("applyResponse_WhenAddOrUpdateFindsNoSuchCookie_ShouldAddOne", () => {
        // Arrange
        const action = {
            op: OperationKinds.AddOrUpdate,
            name: "session",
            value: "abc",
            path: "/",
        };

        // Act
        const draft = ruleType.applyResponse(
            aResponseDraft(),
            action,
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft.headers).toEqual([
            ...aResponseDraft().headers,
            {
                name: "Set-Cookie",
                value: "session=abc; Path=/",
            },
        ]);
    });

    test("applyResponse_WhenAddIfMissingFindsTheCookie_ShouldKeepTheServerSetCookie", () => {
        // Arrange
        const response = aResponseDraft({
            headers: serverCookies,
        });
        const action = {
            op: OperationKinds.AddIfMissing,
            name: "session",
            value: "abc",
        };

        // Act
        const draft = ruleType.applyResponse(
            response,
            action,
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft.headers).toEqual(serverCookies);
    });

    test("applyResponse_WhenAddIfMissingFindsNoSuchCookie_ShouldAddOne", () => {
        // Arrange
        const response = aResponseDraft({
            headers: serverCookies,
        });
        const action = {
            op: OperationKinds.AddIfMissing,
            name: "lang",
            value: "en",
        };

        // Act
        const draft = ruleType.applyResponse(
            response,
            action,
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft.headers).toEqual([
            ...serverCookies,
            {
                name: "Set-Cookie",
                value: "lang=en",
            },
        ]);
    });

    test("applyResponse_WhenAddFindsTheCookie_ShouldAppendAnotherSetCookie", () => {
        // Arrange
        const response = aResponseDraft({
            headers: serverCookies,
        });
        const action = {
            op: OperationKinds.Add,
            name: "session",
            value: "new",
        };

        // Act
        const draft = ruleType.applyResponse(
            response,
            action,
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft.headers).toEqual([
            ...serverCookies,
            {
                name: "Set-Cookie",
                value: "session=new",
            },
        ]);
    });

    test("applyResponse_WhenOperationIsRemove_ShouldDropOnlyThatSetCookie", () => {
        // Arrange
        const response = aResponseDraft({
            headers: serverCookies,
        });
        const action = {
            op: OperationKinds.Remove,
            name: "session",
        };

        // Act
        const draft = ruleType.applyResponse(
            response,
            action,
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft.headers).toEqual([
            {
                name: "set-cookie",
                value: "theme=dark",
            },
        ]);
    });

    test("validate_WhenNameIsBlank_ShouldRequireIt", () => {
        // Arrange
        const action = ruleType.defaultAction();

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(["Cookie name is required."]);
    });

    test("withoutSecrets_WhenCalled_ShouldBlankTheValue", () => {
        // Arrange
        const action = {
            op: OperationKinds.Add,
            name: "session",
            value: "abc",
            path: "/",
        };

        // Act
        const stripped = ruleType.withoutSecrets(action);

        // Assert
        expect(stripped).toEqual({
            op: OperationKinds.Add,
            name: "session",
            value: "",
            path: "/",
        });
    });

    test("toDnr_WhenCalled_ShouldWorkOnTheInspectedTabOnly", () => {
        // Arrange
        const action = {
            op: OperationKinds.Add,
            name: "session",
            value: "abc",
        };

        // Act
        const result = ruleType.toDnr(
            action,
            condition,
            aRuleContext()
        );

        // Assert
        expect(result).toBeNull();
    });
});
