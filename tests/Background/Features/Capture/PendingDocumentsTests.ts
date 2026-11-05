import { describe, expect, test } from "vitest";
import { PendingDocuments } from "../../../../src/Background/Features/Capture/PendingDocuments";
import { TimelineLimits } from "../../../../src/Background/Features/Capture/TimelineLimits";
import { aSummary } from "../../../TestData";
import { aTimelineRecord } from "../../BackgroundTestData";

const TabId = 7;

describe("PendingDocuments", () => {
    test("take_WhenADocumentIsHeld_ShouldReturnItOnce", () => {
        // Arrange
        const documents = new PendingDocuments();
        documents.hold(aTimelineRecord());

        // Act
        const first = documents.take(TabId, "request-1");
        const second = documents.take(TabId, "request-1");

        // Assert
        expect(first?.summary.id).toBe("request-1");
        expect(second).toBeUndefined();
    });

    test("get_WhenADocumentIsHeld_ShouldReturnItWithoutRemoving", () => {
        // Arrange
        const documents = new PendingDocuments();
        documents.hold(aTimelineRecord());

        // Act
        const first = documents.get(TabId, "request-1");
        const second = documents.get(TabId, "request-1");

        // Assert
        expect(first?.summary.id).toBe("request-1");
        expect(second?.summary.id).toBe("request-1");
        expect(documents.has(TabId, "request-1")).toBe(true);
    });

    test("get_WhenNoDocumentIsHeld_ShouldReturnUndefined", () => {
        // Arrange
        const documents = new PendingDocuments();

        // Act
        const held = documents.get(TabId, "missing");

        // Assert
        expect(held).toBeUndefined();
    });

    test("update_WhenADocumentIsHeld_ShouldKeepTheChangedRecord", () => {
        // Arrange
        const documents = new PendingDocuments();
        documents.hold(aTimelineRecord());

        // Act
        documents.update(
            TabId,
            "request-1",
            record => ({
                ...record,
                summary: {
                    ...record.summary,
                    url: "https://api.example.com/moved",
                },
            })
        );

        // Assert
        expect(documents.take(TabId, "request-1")?.summary.url).toBe("https://api.example.com/moved");
    });

    test("hold_WhenMoreDocumentsThanTheLimitWait_ShouldDropTheOldest", () => {
        // Arrange
        const documents = new PendingDocuments();
        const count = TimelineLimits.MaxPendingDocuments + 1;

        // Act
        for (let index = 0; index < count; index++) {
            documents.hold(aTimelineRecord({
                summary: aSummary({
                    id: `request-${index}`,
                }),
            }));
        }

        // Assert
        expect(documents.has(TabId, "request-0")).toBe(false);
        expect(documents.has(TabId, `request-${count - 1}`)).toBe(true);
    });
});
