import { describe, expect, test } from "vitest";
import { TimelineEntryState } from "../../../../src/Contracts/Timeline/TimelineEntryState";
import { PanelLimits } from "../../../../src/SidePanel/Core/PanelLimits";
import { TimelineEntries } from "../../../../src/SidePanel/Features/Traffic/TimelineEntries";
import { aSummary } from "../../../TestData";

describe("TimelineEntries", () => {
    test("upsert_WhenTheEntryExists_ShouldReplaceInPlace", () => {
        // Arrange
        const entries = [
            aSummary({
                id: "a",
                state: TimelineEntryState.Pending,
            }),
            aSummary({
                id: "b",
            }),
        ];
        const updated = aSummary({
            id: "a",
            state: TimelineEntryState.Completed,
        });

        // Act
        const result = TimelineEntries.upsert(entries, updated);

        // Assert
        expect(result.map(entry => entry.id)).toEqual([
            "a",
            "b",
        ]);
        expect(result[0]).toBe(updated);
    });

    test("upsert_WhenTheListIsFull_ShouldDropTheOldest", () => {
        // Arrange
        const entries = Array.from(
            {
                length: PanelLimits.MaxTimelineEntries,
            },
            (_, index) => aSummary({
                id: `entry-${index}`,
            })
        );

        // Act
        const result = TimelineEntries.upsert(entries, aSummary({
            id: "newest",
        }));

        // Assert
        expect(result).toHaveLength(PanelLimits.MaxTimelineEntries);
        expect(result[0]?.id).toBe("entry-1");
        expect(result.at(-1)?.id).toBe("newest");
    });

    test("latestFor_WhenTheEndpointWasCalledTwice_ShouldReturnTheLastCall", () => {
        // Arrange
        const entries = [
            aSummary({
                id: "first",
            }),
            aSummary({
                id: "other",
                endpointKey: "GET https://api.example.com/orders",
            }),
            aSummary({
                id: "second",
            }),
        ];

        // Act
        const latest = TimelineEntries.latestFor(entries, "GET https://api.example.com/api/v1/users/42/profile");

        // Assert
        expect(latest?.id).toBe("second");
    });
});
