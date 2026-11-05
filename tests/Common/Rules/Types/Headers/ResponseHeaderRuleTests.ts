import { describe, expect, test } from "vitest";
import { Result } from "../../../../../src/Common/Results/Result";
import type { DnrCondition } from "../../../../../src/Common/Rules/Criteria/DnrFragment";
import { HeaderOperationMessages } from "../../../../../src/Common/Rules/Types/Headers/HeaderOperations";
import { ResponseHeaderRule } from "../../../../../src/Common/Rules/Types/Headers/ResponseHeaderRule";
import { OperationKinds } from "../../../../../src/Common/Rules/Types/OperationKinds";
import type { HeaderEntry } from "../../../../../src/Contracts/Timeline/HeaderEntry";
import { aRequestDraft, aResponseDraft, aRuleContext } from "../../../../TestData";

const ruleType = new ResponseHeaderRule();
const condition: DnrCondition = {
    urlFilter: "||api.example.com",
};
const varyHeaders: HeaderEntry[] = [
    {
        name: "Vary",
        value: "Accept",
    },
];

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

function headersAfter(headers: HeaderEntry[], operations: Record<string, string>[]): HeaderEntry[] {
    return ruleType.applyResponse(
        aResponseDraft({
            headers,
        }),
        {
            operations,
        },
        aRuleContext(),
        aRequestDraft()
    ).headers;
}

describe("ResponseHeaderRule", () => {
    test("applyResponse_WhenAdd_ShouldKeepTheServerValue", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.Add,
                "Vary",
                "Origin"
            ),
        ];

        // Act
        const headers = headersAfter(varyHeaders, operations);

        // Assert
        expect(headers).toEqual([
            {
                name: "Vary",
                value: "Accept",
            },
            {
                name: "Vary",
                value: "Origin",
            },
        ]);
    });

    test("applyResponse_WhenAddIfMissingAndTheHeaderIsThere_ShouldKeepTheServerValue", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.AddIfMissing,
                "vary",
                "Origin"
            ),
        ];

        // Act
        const headers = headersAfter(varyHeaders, operations);

        // Assert
        expect(headers).toEqual(varyHeaders);
    });

    test("applyResponse_WhenAddIfMissingAndTheHeaderIsMissing_ShouldAddIt", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.AddIfMissing,
                "Cache-Control",
                "no-store"
            ),
        ];

        // Act
        const headers = headersAfter(varyHeaders, operations);

        // Assert
        expect(headers).toEqual([
            ...varyHeaders,
            {
                name: "Cache-Control",
                value: "no-store",
            },
        ]);
    });

    test("applyResponse_WhenAddOrUpdate_ShouldReplaceTheHeader", () => {
        // Arrange
        const operations = [
            operation(
                OperationKinds.AddOrUpdate,
                "content-type",
                "text/plain"
            ),
        ];

        // Act
        const headers = headersAfter(aResponseDraft().headers, operations);

        // Assert
        expect(headers).toEqual([
            {
                name: "content-type",
                value: "text/plain",
            },
        ]);
    });

    test("applyResponse_WhenRemove_ShouldDropTheHeader", () => {
        // Arrange
        const operations = [operation(OperationKinds.Remove, "Content-Type")];

        // Act
        const headers = headersAfter(aResponseDraft().headers, operations);

        // Assert
        expect(headers).toEqual([]);
    });

    test("applyResponse_WhenValueIsATemplate_ShouldRenderTheVariable", () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable("build", "1.2.3");
        const action = {
            operations: [
                operation(
                    OperationKinds.AddOrUpdate,
                    "X-Build",
                    "{{build}}"
                ),
            ],
        };

        // Act
        const draft = ruleType.applyResponse(
            aResponseDraft(),
            action,
            context,
            aRequestDraft()
        );

        // Assert
        expect(draft.headers).toContainEqual({
            name: "X-Build",
            value: "1.2.3",
        });
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

    test("withoutSecrets_WhenCalled_ShouldKeepResponseHeaders", () => {
        // Arrange
        const action = {
            operations: [
                operation(
                    OperationKinds.AddOrUpdate,
                    "Authorization",
                    "Bearer abc"
                ),
            ],
        };

        // Act
        const stripped = ruleType.withoutSecrets(action);

        // Assert
        expect(stripped).toEqual(action);
    });

    test("toDnr_WhenAddingACustomHeader_ShouldAppendInTheBrowser", () => {
        // Arrange
        const action = {
            operations: [
                operation(
                    OperationKinds.Add,
                    "X-Custom",
                    "1"
                ),
                operation(
                    OperationKinds.AddOrUpdate,
                    "Cache-Control",
                    "no-store"
                ),
                operation(OperationKinds.Remove, "Server"),
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
                    responseHeaders: [
                        {
                            header: "X-Custom",
                            operation: "append",
                            value: "1",
                        },
                        {
                            header: "Cache-Control",
                            operation: "set",
                            value: "no-store",
                        },
                        {
                            header: "Server",
                            operation: "remove",
                        },
                    ],
                },
                condition,
            },
        ]));
    });

    test("toDnr_WhenAddIfMissing_ShouldWorkOnTheInspectedTabOnly", () => {
        // Arrange
        const action = {
            operations: [
                operation(
                    OperationKinds.AddIfMissing,
                    "Cache-Control",
                    "no-store"
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
