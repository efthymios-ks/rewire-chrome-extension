import { describe, expect, test } from "vitest";
import { SnapshotVariant } from "../../../src/Common/CodeGen/RequestSnapshot";
import { type SnapshotSource, RequestSnapshots } from "../../../src/Common/CodeGen/RequestSnapshots";
import { ChangeArea } from "../../../src/Contracts/Rules/ValueChange";

function aSource(): SnapshotSource {
    return {
        method: "GET",
        url: "http://localhost:5000/users",
        headers: [
            {
                name: "X-Tenant",
                value: "blue",
            },
        ],
        body: null,
        changes: [
            {
                area: ChangeArea.Url,
                name: "url",
                before: "https://api.example.com/users",
                after: "http://localhost:5000/users",
            },
            {
                area: ChangeArea.RequestHeader,
                name: "x-tenant",
                before: null,
                after: "blue",
            },
            {
                area: ChangeArea.Status,
                name: "status",
                before: "200",
                after: "500",
            },
        ],
    };
}

describe("RequestSnapshots", () => {
    test("of_WhenTheOriginalIsAsked_ShouldUndoRequestChanges", () => {
        // Arrange
        const source = aSource();

        // Act
        const snapshot = RequestSnapshots.of(source, SnapshotVariant.Original);

        // Assert
        expect(snapshot.url).toBe("https://api.example.com/users");
        expect(snapshot.headers).toEqual([]);
    });

    test("of_WhenTheModifiedIsAsked_ShouldApplyRequestChanges", () => {
        // Arrange
        const source = {
            ...aSource(),
            url: "https://api.example.com/users",
            headers: [],
        };

        // Act
        const snapshot = RequestSnapshots.of(source, SnapshotVariant.Modified);

        // Assert
        expect(snapshot.url).toBe("http://localhost:5000/users");
        expect(snapshot.headers).toEqual([
            {
                name: "x-tenant",
                value: "blue",
            },
        ]);
    });

    test.each([
        [
            ChangeArea.RequestBody,
            true,
        ],
        [
            ChangeArea.ResponseBody,
            false,
        ],
    ])("hasRequestChanges_WhenTheChangeAreaIs(%i)_ShouldReturn(%s)", (area, expected) => {
        // Arrange
        const changes = [
            {
                area,
                name: "body",
                before: "a",
                after: "b",
            },
        ];

        // Act
        const hasChanges = RequestSnapshots.hasRequestChanges(changes);

        // Assert
        expect(hasChanges).toBe(expected);
    });
});
