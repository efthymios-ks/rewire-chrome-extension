import { describe, expect, test } from "vitest";
import { Result } from "../../../../../src/Common/Results/Result";
import type { DnrCondition } from "../../../../../src/Common/Rules/Criteria/DnrFragment";
import { OperationKinds } from "../../../../../src/Common/Rules/Types/OperationKinds";
import { QueryParamsMessages, QueryParamsRule } from "../../../../../src/Common/Rules/Types/Url/QueryParamsRule";
import { aRequestDraft, aRuleContext, TestUrls } from "../../../../TestData";

const ruleType = new QueryParamsRule();
const condition: DnrCondition = {
    requestDomains: ["api.example.com"],
};

function operation(
    op: string,
    name: string,
    value: string = ""
): Record<string, string> {
    return {
        op,
        name,
        value,
    };
}

function urlAfter(url: string, operations: Record<string, string>[]): string {
    return ruleType.applyRequest(
        aRequestDraft({
            url,
        }),
        {
            operations,
        },
        aRuleContext()
    ).url;
}

describe("QueryParamsRule", () => {
    test("applyRequest_WhenAddAndTheKeyIsThere_ShouldAppendAnotherValue", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.Add,
                "page",
                "3"
            ),
        ];

        // Act
        const url = urlAfter(TestUrls.Orders, operations);

        // Assert
        expect(url).toBe("https://api.example.com/api/v1/orders?page=2&page=3");
    });

    test("applyRequest_WhenAddAndTheKeyIsNew_ShouldAppendIt", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.Add,
                "debug",
                "true"
            ),
        ];

        // Act
        const url = urlAfter(TestUrls.Orders, operations);

        // Assert
        expect(url).toBe("https://api.example.com/api/v1/orders?page=2&debug=true");
    });

    test("applyRequest_WhenAddIfMissingAndTheKeyIsThere_ShouldKeepIt", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.AddIfMissing,
                "page",
                "3"
            ),
        ];

        // Act
        const url = urlAfter(TestUrls.Orders, operations);

        // Assert
        expect(url).toBe(TestUrls.Orders);
    });

    test("applyRequest_WhenAddIfMissingAndTheKeyIsNew_ShouldAppendIt", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.AddIfMissing,
                "debug",
                "true"
            ),
        ];

        // Act
        const url = urlAfter(TestUrls.Orders, operations);

        // Assert
        expect(url).toBe("https://api.example.com/api/v1/orders?page=2&debug=true");
    });

    test("applyRequest_WhenAddOrUpdateAndTheKeyIsThere_ShouldReplaceItsValue", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.AddOrUpdate,
                "page",
                "3"
            ),
        ];

        // Act
        const url = urlAfter(TestUrls.Orders, operations);

        // Assert
        expect(url).toBe("https://api.example.com/api/v1/orders?page=3");
    });

    test("applyRequest_WhenAddOrUpdateAndTheKeyIsNew_ShouldAppendIt", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.AddOrUpdate,
                "debug",
                "true"
            ),
        ];

        // Act
        const url = urlAfter(TestUrls.Orders, operations);

        // Assert
        expect(url).toBe("https://api.example.com/api/v1/orders?page=2&debug=true");
    });

    test("applyRequest_WhenRemoveWithExactKeys_ShouldStripOnlyThoseKeys", () => {
        // Arrange
        const operations = [
            operation(OperationKinds.Remove, "fbclid"),
            operation(OperationKinds.Remove, "gclid"),
        ];

        // Act
        const url = urlAfter("https://api.example.com/api/v1/orders?page=2&fbclid=abc&gclid=def", operations);

        // Assert
        expect(url).toBe(TestUrls.Orders);
    });

    test("applyRequest_WhenRemoveWithAWildcardKey_ShouldStripEveryMatchingKey", () => {
        // Arrange
        const operations = [operation(OperationKinds.Remove, "utm_*")];

        // Act
        const url = urlAfter("https://api.example.com/api/v1/orders?utm_source=mail&page=2&utm_medium=email", operations);

        // Assert
        expect(url).toBe(TestUrls.Orders);
    });

    test("applyRequest_WhenTheValueHasAVariable_ShouldRenderIt", () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable("tenant", "blue");
        const request = aRequestDraft({
            url: TestUrls.Orders,
        });
        const action = {
            operations: [
                operation(
                    OperationKinds.AddOrUpdate,
                    "tenant",
                    "{{tenant}}"
                ),
            ],
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            context
        );

        // Assert
        expect(draft.url).toBe("https://api.example.com/api/v1/orders?page=2&tenant=blue");
    });

    test("applyRequest_WhenOperationsChain_ShouldApplyThemInOrder", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.AddOrUpdate,
                "page",
                "5"
            ),
            operation(OperationKinds.Remove, "fbclid"),
        ];

        // Act
        const url = urlAfter("https://api.example.com/api/v1/orders?page=2&fbclid=abc", operations);

        // Assert
        expect(url).toBe("https://api.example.com/api/v1/orders?page=5");
    });

    test("defaultAction_WhenCreated_ShouldStartWithOneBlankAddOrUpdateRow", () => {
        // Arrange
        const expected = [
            {
                op: OperationKinds.AddOrUpdate,
                name: "",
                value: "",
            },
        ];

        // Act
        const action = ruleType.defaultAction();

        // Assert
        expect(action["operations"]).toEqual(expected);
    });

    test("validate_WhenThereAreNoOperations_ShouldAskForOne", () => {
        // Arrange
        const action = {
            operations: [],
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(["Add at least one param."]);
    });

    test("validate_WhenAParamIsBlank_ShouldRequireIt", () => {
        // Arrange
        const action = {
            operations: [
                operation(
                    OperationKinds.AddOrUpdate,
                    " ",
                    "1"
                ),
            ],
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(["Param is required."]);
    });

    test("summary_WhenOperationsAreSet_ShouldListThem", () => {
        // Arrange
        const action = {
            operations: [
                operation(
                    OperationKinds.AddOrUpdate,
                    "page",
                    "1"
                ),
                operation(OperationKinds.Remove, "fbclid"),
            ],
        };

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe("addOrUpdate page, remove fbclid");
    });

    test("toDnr_WhenAddOrUpdateAndRemove_ShouldEmitOneQueryTransform", () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable("tenant", "blue");
        const action = {
            operations: [
                operation(
                    OperationKinds.AddOrUpdate,
                    "tenant",
                    "{{tenant}}"
                ),
                operation(OperationKinds.Remove, "fbclid"),
            ],
        };

        // Act
        const result = ruleType.toDnr(
            action,
            condition,
            context
        );

        // Assert
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: "redirect",
                    redirect: {
                        transform: {
                            queryTransform: {
                                removeParams: ["fbclid"],
                                addOrReplaceParams: [
                                    {
                                        key: "tenant",
                                        value: "blue",
                                        replaceOnly: false,
                                    },
                                ],
                            },
                        },
                    },
                },
                condition,
            },
        ]));
    });

    test("toDnr_WhenOnlyRemoving_ShouldRedirectOnlyWhenAKeyIsThere", () => {
        // Arrange
        const action = {
            operations: [
                operation(OperationKinds.Remove, "fbclid"),
                operation(OperationKinds.Remove, "mc.eid"),
            ],
        };

        // Act
        const result = ruleType.toDnr(
            action,
            condition,
            aRuleContext()
        );

        // Assert
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: "redirect",
                    redirect: {
                        transform: {
                            queryTransform: {
                                removeParams: [
                                    "fbclid",
                                    "mc.eid",
                                ],
                            },
                        },
                    },
                },
                condition: {
                    requestDomains: ["api.example.com"],
                    regexFilter: "[?&](?:fbclid|mc\\.eid)(?:=|&|#|$)",
                },
            },
        ]));
    });

    test("toDnr_WhenOnlyRemovingAndTheConditionHasARegex_ShouldWorkOnTheInspectedTabOnly", () => {
        // Arrange
        const regexCondition: DnrCondition = {
            regexFilter: "/users/\\d+",
        };
        const action = {
            operations: [operation(OperationKinds.Remove, "fbclid")],
        };

        // Act
        const result = ruleType.toDnr(
            action,
            regexCondition,
            aRuleContext()
        );

        // Assert
        expect(result).toEqual(Result.fail(QueryParamsMessages.OwnUrlPattern));
    });

    test("toDnr_WhenAddingOrUpdatingAndTheConditionHasARegex_ShouldKeepTheCondition", () => {
        // Arrange
        const regexCondition: DnrCondition = {
            regexFilter: "/users/\\d+",
        };
        const action = {
            operations: [
                operation(
                    OperationKinds.AddOrUpdate,
                    "debug",
                    "1"
                ),
            ],
        };

        // Act
        const result = ruleType.toDnr(
            action,
            regexCondition,
            aRuleContext()
        );

        // Assert
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: "redirect",
                    redirect: {
                        transform: {
                            queryTransform: {
                                addOrReplaceParams: [
                                    {
                                        key: "debug",
                                        value: "1",
                                        replaceOnly: false,
                                    },
                                ],
                            },
                        },
                    },
                },
                condition: regexCondition,
            },
        ]));
    });

    test.each([
        OperationKinds.Add,
        OperationKinds.AddIfMissing,
    ])("toDnr_WhenTheOperationIs(%s)_ShouldWorkOnTheInspectedTabOnly", kind => {
        // Arrange
        const action = {
            operations: [
                operation(
                    kind,
                    "debug",
                    "1"
                ),
            ],
        };

        // Act
        const result = ruleType.toDnr(
            action,
            condition,
            aRuleContext()
        );

        // Assert
        expect(result).toEqual(Result.fail(QueryParamsMessages.KeepsExisting));
    });

    test.each([
        "utm_*",
        "ref?",
    ])("toDnr_WhenRemovingAWildcardKey(%s)_ShouldWorkOnTheInspectedTabOnly", key => {
        // Arrange
        const action = {
            operations: [
                operation(OperationKinds.Remove, "fbclid"),
                operation(OperationKinds.Remove, key),
            ],
        };

        // Act
        const result = ruleType.toDnr(
            action,
            condition,
            aRuleContext()
        );

        // Assert
        expect(result).toEqual(Result.fail(QueryParamsMessages.WildcardKeys));
    });
});
