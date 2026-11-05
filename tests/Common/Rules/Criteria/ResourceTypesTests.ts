import { describe, expect, test } from "vitest";
import { ResourceTypes } from "../../../../src/Common/Rules/Criteria/ResourceTypes";

describe("ResourceTypes", () => {
    test.each([
        [
            "XHR",
            [
                "fetch",
                "xhr",
            ],
        ],
        [
            "Fetch",
            [
                "fetch",
                "xhr",
            ],
        ],
        [
            "WebSocket",
            ["websocket"],
        ],
        [
            "CSPViolationReport",
            ["cspviolationreport"],
        ],
    ])("idsOfDebuggerType_WhenTypeIs(%s)_ShouldReturn(%j)", (debuggerType, expected) => {
        // Arrange
        const type = debuggerType;

        // Act
        const ids = ResourceTypes.idsOfDebuggerType(type);

        // Assert
        expect(ids).toEqual(expected);
    });

    test("browserTypesOf_WhenIdsShareBrowserType_ShouldReturnItOnce", () => {
        // Arrange
        const ids = [
            "fetch",
            "xhr",
        ];

        // Act
        const types = ResourceTypes.browserTypesOf(ids);

        // Assert
        expect(types).toEqual(["xmlhttprequest"]);
    });

    test("browserTypesOf_WhenIdIsDocument_ShouldReturnBothFrameTypes", () => {
        // Arrange
        const ids = ["document"];

        // Act
        const types = ResourceTypes.browserTypesOf(ids);

        // Assert
        expect(types).toEqual([
            "main_frame",
            "sub_frame",
        ]);
    });

    test("browserTypesOf_WhenIdIsUnknown_ShouldSkipIt", () => {
        // Arrange
        const ids = [
            "preflight",
            "script",
        ];

        // Act
        const types = ResourceTypes.browserTypesOf(ids);

        // Assert
        expect(types).toEqual(["script"]);
    });

    test("debuggerTypesOf_WhenIdsAreMixed_ShouldMapKnownOnesInOrder", () => {
        // Arrange
        const ids = [
            "image",
            "unknown",
            "fetch",
        ];

        // Act
        const types = ResourceTypes.debuggerTypesOf(ids);

        // Assert
        expect(types).toEqual([
            "Image",
            "Fetch",
            "XHR",
        ]);
    });

    test("debuggerTypesOf_WhenFetchAndXhrAreNamed_ShouldReturnEachDebuggerTypeOnce", () => {
        // Arrange
        const ids = [
            "fetch",
            "xhr",
        ];

        // Act
        const types = ResourceTypes.debuggerTypesOf(ids);

        // Assert
        expect(types).toEqual([
            "Fetch",
            "XHR",
        ]);
    });
});
