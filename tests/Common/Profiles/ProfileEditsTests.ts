import { describe, expect, test } from "vitest";
import { ProfileEdits } from "../../../src/Common/Profiles/ProfileEdits";
import type { PanelSettings } from "../../../src/Contracts/Settings/PanelSettings";
import { aProfile, aRule, aSettings } from "../../TestData";

function threeProfiles(activeProfileId: string = "b"): PanelSettings {
    return aSettings({
        activeProfileId,
        profiles: [
            aProfile({
                id: "a",
                name: "Local",
            }),
            aProfile({
                id: "b",
                name: "Staging",
                rules: [
                    aRule({
                        id: "rule-1",
                    }),
                ],
                variables: [
                    {
                        name: "env",
                        value: "staging",
                    },
                ],
            }),
            aProfile({
                id: "c",
                name: "Production",
            }),
        ],
    });
}

function idsOf(settings: PanelSettings): string[] {
    return settings.profiles.map(profile => profile.id);
}

describe("ProfileEdits", () => {
    test("create_WhenCalled_ShouldAppendAnEmptyProfileAndActivateIt", () => {
        // Arrange
        const settings = threeProfiles();

        // Act
        const created = ProfileEdits.create(settings, "d");

        // Assert
        expect(idsOf(created)).toEqual([
            "a",
            "b",
            "c",
            "d",
        ]);
        expect(created.activeProfileId).toBe("d");
        expect(created.profiles[3]).toEqual({
            id: "d",
            name: "Profile",
            rules: [],
            variables: [],
        });
    });

    test("create_WhenTheNameIsTaken_ShouldNumberIt", () => {
        // Arrange
        const settings = ProfileEdits.create(threeProfiles(), "d");

        // Act
        const created = ProfileEdits.create(settings, "e");

        // Assert
        expect(created.profiles.at(-1)?.name).toBe("Profile 2");
    });

    test("rename_WhenTheNameIsBlank_ShouldKeepTheOldName", () => {
        // Arrange
        const settings = threeProfiles();

        // Act
        const renamed = ProfileEdits.rename(
            settings,
            "a",
            "   "
        );

        // Assert
        expect(renamed).toBe(settings);
    });

    test("rename_WhenGivenAName_ShouldTrimAndStoreIt", () => {
        // Arrange
        const settings = threeProfiles();

        // Act
        const renamed = ProfileEdits.rename(
            settings,
            "a",
            "  Dev box "
        );

        // Assert
        expect(renamed.profiles[0]?.name).toBe("Dev box");
    });

    test("duplicate_WhenCalled_ShouldPlaceACopyWithNewRuleIdsAfterTheOriginal", () => {
        // Arrange
        const settings = threeProfiles();
        let next = 0;

        // Act
        const duplicated = ProfileEdits.duplicate(
            settings,
            "b",
            "b2",
            () => `copy-${++next}`
        );

        // Assert
        expect(idsOf(duplicated)).toEqual([
            "a",
            "b",
            "b2",
            "c",
        ]);
        const copy = duplicated.profiles[2]!;
        expect(copy.name).toBe("Staging copy");
        expect(copy.rules.map(rule => rule.id)).toEqual(["copy-1"]);
        expect(copy.variables).toEqual(settings.profiles[1]?.variables);
        expect(duplicated.activeProfileId).toBe("b");
    });

    test("duplicate_WhenACopyAlreadyExists_ShouldNumberTheNewCopy", () => {
        // Arrange
        const settings = ProfileEdits.duplicate(
            threeProfiles(),
            "b",
            "b2",
            () => "x"
        );

        // Act
        const duplicated = ProfileEdits.duplicate(
            settings,
            "b",
            "b3",
            () => "y"
        );

        // Assert
        expect(duplicated.profiles.map(profile => profile.name)).toEqual([
            "Local",
            "Staging",
            "Staging copy 2",
            "Staging copy",
            "Production",
        ]);
    });

    test("remove_WhenTheActiveProfileIsRemoved_ShouldActivateTheOneBeforeIt", () => {
        // Arrange
        const settings = threeProfiles("b");

        // Act
        const removed = ProfileEdits.remove(settings, "b");

        // Assert
        expect(idsOf(removed)).toEqual([
            "a",
            "c",
        ]);
        expect(removed.activeProfileId).toBe("a");
    });

    test("remove_WhenTheFirstActiveProfileIsRemoved_ShouldActivateTheNextOne", () => {
        // Arrange
        const settings = threeProfiles("a");

        // Act
        const removed = ProfileEdits.remove(settings, "a");

        // Assert
        expect(removed.activeProfileId).toBe("b");
    });

    test("remove_WhenItIsTheLastProfile_ShouldKeepIt", () => {
        // Arrange
        const settings = aSettings();

        // Act
        const removed = ProfileEdits.remove(settings, settings.activeProfileId);

        // Assert
        expect(removed).toBe(settings);
        expect(ProfileEdits.canRemove(settings)).toBe(false);
    });

    test("switchTo_WhenTheProfileIsUnknown_ShouldKeepTheActiveOne", () => {
        // Arrange
        const settings = threeProfiles();

        // Act
        const switched = ProfileEdits.switchTo(settings, "gone");

        // Assert
        expect(switched).toBe(settings);
    });

    test("changeActive_WhenCalled_ShouldOnlyTouchTheActiveProfile", () => {
        // Arrange
        const settings = threeProfiles("c");

        // Act
        const changed = ProfileEdits.changeActive(settings, profile => ({
            ...profile,
            name: "Live",
        }));

        // Assert
        expect(changed.profiles.map(profile => profile.name)).toEqual([
            "Local",
            "Staging",
            "Live",
        ]);
    });
});
