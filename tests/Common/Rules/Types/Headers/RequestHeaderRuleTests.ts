import { describe, expect, test } from "vitest";
import { Result } from "../../../../../src/Common/Results/Result";
import type { DnrCondition } from "../../../../../src/Common/Rules/Criteria/DnrFragment";
import { HeaderOperationMessages } from "../../../../../src/Common/Rules/Types/Headers/HeaderOperations";
import { RequestHeaderRule } from "../../../../../src/Common/Rules/Types/Headers/RequestHeaderRule";
import { OperationKinds } from "../../../../../src/Common/Rules/Types/OperationKinds";
import type { HeaderEntry } from "../../../../../src/Contracts/Timeline/HeaderEntry";
import { aRequestDraft, aRuleContext } from "../../../../TestData";

const ruleType = new RequestHeaderRule();
const condition: DnrCondition = {
    urlFilter: "||api.example.com",
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

function headersAfter(operations: Record<string, string>[]): HeaderEntry[] {
    return ruleType.applyRequest(
        aRequestDraft(),
        {
            operations,
        },
        aRuleContext()
    ).headers;
}

describe("RequestHeaderRule", () => {
    test("applyRequest_WhenAddAndTheHeaderIsThere_ShouldAddAnotherValue", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.Add,
                "Accept",
                "text/plain"
            ),
        ];

        // Act
        const headers = headersAfter(operations);

        // Assert
        expect(headers).toEqual([
            {
                name: "Accept",
                value: "application/json",
            },
            {
                name: "Accept",
                value: "text/plain",
            },
        ]);
    });

    test("applyRequest_WhenAddIfMissingAndTheHeaderIsThere_ShouldKeepItsValue", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.AddIfMissing,
                "accept",
                "text/plain"
            ),
        ];

        // Act
        const headers = headersAfter(operations);

        // Assert
        expect(headers).toEqual([
            {
                name: "Accept",
                value: "application/json",
            },
        ]);
    });

    test("applyRequest_WhenAddIfMissingAndTheHeaderIsMissing_ShouldAddIt", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.AddIfMissing,
                "X-Debug",
                "1"
            ),
        ];

        // Act
        const headers = headersAfter(operations);

        // Assert
        expect(headers).toEqual([
            {
                name: "Accept",
                value: "application/json",
            },
            {
                name: "X-Debug",
                value: "1",
            },
        ]);
    });

    test("applyRequest_WhenAddOrUpdate_ShouldReplaceTheHeaderWhateverItsCase", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.AddOrUpdate,
                "accept",
                "text/plain"
            ),
        ];

        // Act
        const headers = headersAfter(operations);

        // Assert
        expect(headers).toEqual([
            {
                name: "accept",
                value: "text/plain",
            },
        ]);
    });

    test("applyRequest_WhenAddOrUpdateAndTheHeaderIsMissing_ShouldAddIt", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.AddOrUpdate,
                "X-Debug",
                "1"
            ),
        ];

        // Act
        const headers = headersAfter(operations);

        // Assert
        expect(headers).toContainEqual({
            name: "X-Debug",
            value: "1",
        });
    });

    test("applyRequest_WhenRemove_ShouldDropTheHeader", () => {
        // Arrange
        const operations = [operation(OperationKinds.Remove, "ACCEPT")];

        // Act
        const headers = headersAfter(operations);

        // Assert
        expect(headers).toEqual([]);
    });

    test("applyRequest_WhenTheOperationIsUnknown_ShouldAddOrUpdate", () => {
        // Arrange
        const operations = [
            operation(
                "set",
                "Accept",
                "text/plain"
            ),
        ];

        // Act
        const headers = headersAfter(operations);

        // Assert
        expect(headers).toEqual([
            {
                name: "Accept",
                value: "text/plain",
            },
        ]);
    });

    test("applyRequest_WhenValueIsATemplate_ShouldRenderKnownVariablesOnly", () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable("tenant", "blue");
        const action = {
            operations: [
                operation(
                    OperationKinds.AddOrUpdate,
                    "X-Tenant",
                    "{{tenant}}/{{region}}"
                ),
            ],
        };

        // Act
        const draft = ruleType.applyRequest(
            aRequestDraft(),
            action,
            context
        );

        // Assert
        expect(draft.headers).toContainEqual({
            name: "X-Tenant",
            value: "blue/{{region}}",
        });
    });

    test("defaultAction_WhenCreated_ShouldStartWithOneBlankAddOrUpdateRow", () => {
        // Arrange
        const expected = [
            operation(
                OperationKinds.AddOrUpdate,
                "",
                ""
            ),
        ];

        // Act
        const action = ruleType.defaultAction();

        // Assert
        expect(action["operations"]).toEqual(expected);
    });

    test("validate_WhenThereAreNoOperations_ShouldAskForAHeader", () => {
        // Arrange
        const action = {
            operations: [],
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(["Add at least one header."]);
    });

    test("validate_WhenAHeaderNameHasSpaces_ShouldRejectIt", () => {
        // Arrange
        const action = {
            operations: [
                operation(
                    OperationKinds.AddOrUpdate,
                    "X Debug",
                    "1"
                ),
            ],
        };

        // Act
        const errors = ruleType.validate(action);

        // Assert
        expect(errors).toEqual(["Header name is empty or has characters a header can't carry."]);
    });

    test("withoutSecrets_WhenAnAuthorizationHeaderIsSet_ShouldBlankOnlyItsValue", () => {
        // Arrange
        const action = {
            operations: [
                operation(
                    OperationKinds.AddOrUpdate,
                    "Authorization",
                    "Bearer abc"
                ),
                operation(
                    OperationKinds.AddOrUpdate,
                    "X-Debug",
                    "1"
                ),
            ],
        };

        // Act
        const stripped = ruleType.withoutSecrets(action);

        // Assert
        expect(stripped["operations"]).toEqual([
            operation(
                OperationKinds.AddOrUpdate,
                "Authorization",
                ""
            ),
            operation(
                OperationKinds.AddOrUpdate,
                "X-Debug",
                "1"
            ),
        ]);
    });

    test("toDnr_WhenAddOrUpdateAndRemove_ShouldSetAndRemoveRequestHeaders", () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable("build", "b7");
        const action = {
            operations: [
                operation(
                    OperationKinds.AddOrUpdate,
                    "X-Build",
                    "{{build}}"
                ),
                operation(OperationKinds.Remove, "Cookie"),
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
                    type: "modifyHeaders",
                    requestHeaders: [
                        {
                            header: "X-Build",
                            operation: "set",
                            value: "b7",
                        },
                        {
                            header: "Cookie",
                            operation: "remove",
                        },
                    ],
                },
                condition,
            },
        ]));
    });

    test("toDnr_WhenAddingAStandardHeader_ShouldAppendInTheBrowser", () => {
        // Arrange
        const action = {
            operations: [
                operation(
                    OperationKinds.Add,
                    "Accept",
                    "text/plain"
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
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: "modifyHeaders",
                    requestHeaders: [
                        {
                            header: "Accept",
                            operation: "append",
                            value: "text/plain",
                        },
                    ],
                },
                condition,
            },
        ]));
    });

    test("toDnr_WhenAddingACustomHeader_ShouldWorkOnTheInspectedTabOnly", () => {
        // Arrange
        const action = {
            operations: [
                operation(
                    OperationKinds.Add,
                    "X-Trace",
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
        expect(result).toEqual(Result.fail(HeaderOperationMessages.AddToRequest));
    });

    test("toDnr_WhenAddIfMissing_ShouldWorkOnTheInspectedTabOnly", () => {
        // Arrange
        const action = {
            operations: [
                operation(
                    OperationKinds.AddIfMissing,
                    "Accept",
                    "text/plain"
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
        expect(result).toEqual(Result.fail(HeaderOperationMessages.AddIfMissing));
    });
});
