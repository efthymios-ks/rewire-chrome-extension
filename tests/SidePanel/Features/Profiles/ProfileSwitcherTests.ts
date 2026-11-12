import { describe, expect, test } from "vitest";
import { ProfileSwitcher } from "../../../../src/SidePanel/Features/Profiles/ProfileSwitcher";
import { aProfile, aSettings } from "../../../TestData";
import { aPanelHarness } from "../../PanelTestData";

function twoProfileHarness(): ReturnType<typeof aPanelHarness> {
    return aPanelHarness({
        settings: aSettings({
            activeProfileId: "staging",
            profiles: [
                aProfile({
                    id: "local",
                    name: "Local",
                }),
                aProfile({
                    id: "staging",
                    name: "Staging",
                }),
            ],
        }),
    });
}

describe("ProfileSwitcher", () => {
    test("constructor_WhenBuilt_ShouldListProfilesAndSelectTheActiveOne", () => {
        // Arrange
        const harness = twoProfileHarness();

        // Act
        const switcher = new ProfileSwitcher(harness.context);

        // Assert
        expect([...switcher.root.options].map(option => option.textContent)).toEqual([
            "Local",
            "Staging",
        ]);
        expect(switcher.root.value).toBe("staging");
        expect(switcher.root.getAttribute("aria-label")).toBe("Profile");
    });

    test("change_WhenAnotherProfileIsPicked_ShouldActivateIt", () => {
        // Arrange
        const harness = twoProfileHarness();
        const switcher = new ProfileSwitcher(harness.context);

        // Act
        switcher.root.value = "local";
        switcher.root.dispatchEvent(new Event("change"));

        // Assert
        expect(harness.store.getState().settings.activeProfileId).toBe("local");
    });

    test("render_WhenAProfileIsRenamedElsewhere_ShouldShowTheNewName", async () => {
        // Arrange
        const harness = twoProfileHarness();
        const switcher = new ProfileSwitcher(harness.context);

        // Act
        await harness.context.settingsService.renameProfile("local", "Dev box");

        // Assert
        expect(switcher.root.options[0]?.textContent).toBe("Dev box");
        expect(switcher.root.value).toBe("staging");
    });
});
