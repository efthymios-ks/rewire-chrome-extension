import { afterEach, describe, expect, test } from "vitest";
import { ProfilesPanel } from "../../../../src/SidePanel/Features/Profiles/ProfilesPanel";
import { aProfile, aRule, aSettings } from "../../../TestData";
import { aPanelHarness, buttonNamed, click, nextRender } from "../../PanelTestData";

function twoProfileHarness(): ReturnType<typeof aPanelHarness> {
    return aPanelHarness({
        settings: aSettings({
            activeProfileId: "local",
            profiles: [
                aProfile({
                    id: "local",
                    name: "Local",
                    rules: [aRule()],
                }),
                aProfile({
                    id: "staging",
                    name: "Staging",
                }),
            ],
        }),
    });
}

function rowsOf(panel: ProfilesPanel): HTMLElement[] {
    return [...panel.root.querySelectorAll<HTMLElement>(".profile-row")];
}

function nameInputOf(row: HTMLElement | undefined): HTMLInputElement {
    return row!.querySelector<HTMLInputElement>(".profile-name")!;
}

describe("ProfilesPanel", () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    test("constructor_WhenBuilt_ShouldListEveryProfileAndMarkTheActiveOne", () => {
        // Arrange
        const harness = twoProfileHarness();

        // Act
        const panel = new ProfilesPanel(harness.context);

        // Assert
        const rows = rowsOf(panel);
        expect(rows.map(row => nameInputOf(row).value)).toEqual([
            "Local",
            "Staging",
        ]);
        expect(rows.map(row => row.classList.contains("active"))).toEqual([
            true,
            false,
        ]);
        expect(rows[0]?.querySelector(".profile-count")?.textContent).toBe("1 rule, 0 variables");
    });

    test("newProfile_WhenClicked_ShouldAddAndActivateIt", async () => {
        // Arrange
        const harness = twoProfileHarness();
        const panel = new ProfilesPanel(harness.context);

        // Act
        click(buttonNamed(panel.root, "New profile"));
        await nextRender();

        // Assert
        expect(rowsOf(panel).map(row => nameInputOf(row).value)).toEqual([
            "Local",
            "Staging",
            "Profile",
        ]);
        expect(rowsOf(panel)[2]?.classList.contains("active")).toBe(true);
    });

    test("nameInput_WhenChanged_ShouldRenameTheProfile", () => {
        // Arrange
        const harness = twoProfileHarness();
        const panel = new ProfilesPanel(harness.context);
        const input = nameInputOf(rowsOf(panel)[1]);

        // Act
        input.value = "QA";
        input.dispatchEvent(new Event("change"));

        // Assert
        expect(harness.store.getState().settings.profiles[1]?.name).toBe("QA");
    });

    test("radio_WhenPicked_ShouldActivateThatProfile", () => {
        // Arrange
        const harness = twoProfileHarness();
        const panel = new ProfilesPanel(harness.context);
        const radio = rowsOf(panel)[1]!.querySelector<HTMLInputElement>("input[type=radio]")!;

        // Act
        radio.checked = true;
        radio.dispatchEvent(new Event("change"));

        // Assert
        expect(harness.store.getState().settings.activeProfileId).toBe("staging");
    });

    test("duplicate_WhenClicked_ShouldPlaceTheCopyAfterTheOriginal", async () => {
        // Arrange
        const harness = twoProfileHarness();
        const panel = new ProfilesPanel(harness.context);

        // Act
        click(buttonNamed(rowsOf(panel)[0]!, "Duplicate"));
        await nextRender();

        // Assert
        expect(rowsOf(panel).map(row => nameInputOf(row).value)).toEqual([
            "Local",
            "Local copy",
            "Staging",
        ]);
    });

    test("remove_WhenConfirmed_ShouldRemoveTheProfile", async () => {
        // Arrange
        const harness = twoProfileHarness();
        const panel = new ProfilesPanel(harness.context);
        click(buttonNamed(rowsOf(panel)[1]!, "Remove"));

        // Act
        click(buttonNamed(document.querySelector(".confirm-dialog")!, "Remove"));
        await nextRender();

        // Assert
        expect(rowsOf(panel).map(row => nameInputOf(row).value)).toEqual(["Local"]);
        expect(buttonNamed(rowsOf(panel)[0]!, "Remove").disabled).toBe(true);
    });

    test("dispose_WhenCalled_ShouldStopFollowingTheProfiles", async () => {
        // Arrange
        const harness = twoProfileHarness();
        const panel = new ProfilesPanel(harness.context);
        panel.dispose();

        // Act
        await harness.context.settingsService.createProfile();

        // Assert
        expect(rowsOf(panel)).toHaveLength(2);
    });
});
