import { describe, expect, test } from "vitest";
import { HeaderList } from "../../../../src/Common/Rules/Http/HeaderList";
import type { HeaderEntry } from "../../../../src/Contracts/Timeline/HeaderEntry";

function sampleHeaders(): HeaderEntry[] {
    return [
        {
            name: "Accept",
            value: "application/json",
        },
        {
            name: "X-Trace",
            value: "a",
        },
        {
            name: "x-trace",
            value: "b",
        },
    ];
}

describe("HeaderList", () => {
    test("values_WhenNameDiffersInCase_ShouldReturnEveryMatchInOrder", () => {
        // Arrange
        const headers = sampleHeaders();

        // Act
        const values = HeaderList.values(headers, "X-TRACE");

        // Assert
        expect(values).toEqual([
            "a",
            "b",
        ]);
    });

    test("first_WhenHeaderIsMissing_ShouldReturnNull", () => {
        // Arrange
        const headers = sampleHeaders();

        // Act
        const present = HeaderList.first(headers, "x-trace");
        const missing = HeaderList.first(headers, "Authorization");

        // Assert
        expect(present).toBe("a");
        expect(missing).toBeNull();
    });

    test("set_WhenHeaderRepeats_ShouldReplaceEveryCopyWithOneAtTheEnd", () => {
        // Arrange
        const headers = sampleHeaders();

        // Act
        const updated = HeaderList.set(
            headers,
            "X-Trace",
            "c"
        );

        // Assert
        expect(updated).toEqual([
            {
                name: "Accept",
                value: "application/json",
            },
            {
                name: "X-Trace",
                value: "c",
            },
        ]);
        expect(headers).toEqual(sampleHeaders());
    });

    test("append_WhenHeaderExists_ShouldKeepItAndAddAnother", () => {
        // Arrange
        const headers = sampleHeaders();

        // Act
        const updated = HeaderList.append(
            headers,
            "Accept",
            "text/plain"
        );

        // Assert
        expect(HeaderList.values(updated, "accept")).toEqual([
            "application/json",
            "text/plain",
        ]);
        expect(headers).toHaveLength(3);
    });

    test("remove_WhenNameDiffersInCase_ShouldDropEveryCopy", () => {
        // Arrange
        const headers = sampleHeaders();

        // Act
        const updated = HeaderList.remove(headers, "X-TRACE");

        // Assert
        expect(updated).toEqual([
            {
                name: "Accept",
                value: "application/json",
            },
        ]);
    });
});
