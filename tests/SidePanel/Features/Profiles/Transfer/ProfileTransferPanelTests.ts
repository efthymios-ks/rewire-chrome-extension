import { afterEach, describe, expect, test, vi } from "vitest";
import { Result } from "../../../../../src/Common/Results/Result";
import type { ProfileBundle } from "../../../../../src/Common/Profiles/Transfer/ProfileBundle";
import { SettingsSchema } from "../../../../../src/Contracts/Settings/DefaultPanelSettings";
import type { IFileClient } from "../../../../../src/SidePanel/Core/FileClient";
import { ProfileTransferPanel } from "../../../../../src/SidePanel/Features/Profiles/Transfer/ProfileTransferPanel";
import { aProfile, aRule, aSettings } from "../../../../TestData";
import { aPanelHarness, buttonNamed, click, nextRender } from "../../../PanelTestData";

function aTransferHarness(): ReturnType<typeof aPanelHarness> {
    return aPanelHarness({
        settings: aSettings({
            activeProfileId: "local",
            profiles: [
                aProfile({
                    id: "local",
                    name: "Local",
                    rules: [
                        aRule({
                            id: "a",
                        }),
                    ],
                }),
                aProfile({
                    id: "staging",
                    name: "Staging",
                }),
            ],
        }),
    });
}

function aFileClient(picked: string | null = null): IFileClient {
    return {
        download: vi.fn(),
        pickText: vi.fn().mockResolvedValue(Result.ok(picked)),
    };
}

function checkboxNamed(root: ParentNode, text: string): HTMLInputElement {
    const label = [...root.querySelectorAll("label")].find(candidate => candidate.textContent?.startsWith(text));
    if (label === undefined) {
        throw new Error(`No checkbox named ${text}.`);
    }

    return label.querySelector("input")!;
}

function untick(input: HTMLInputElement): void {
    input.checked = false;
    input.dispatchEvent(new Event("change"));
}

const ImportedFile: ProfileBundle = {
    schemaVersion: SettingsSchema.CurrentVersion,
    profiles: [
        aProfile({
            id: "local",
            name: "Local",
            rules: [
                aRule({
                    id: "b",
                }),
            ],
        }),
        aProfile({
            id: "qa",
            name: "QA",
        }),
    ],
};

describe("ProfileTransferPanel", () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    test("copyJson_WhenOneProfileIsUnticked_ShouldExportOnlyTheTickedOnes", async () => {
        // Arrange
        const harness = aTransferHarness();
        const panel = new ProfileTransferPanel(harness.context, aFileClient());
        untick(checkboxNamed(panel.root, "Staging"));

        // Act
        click(buttonNamed(panel.root, "Copy JSON"));
        await nextRender();

        // Assert
        const bundle = JSON.parse(harness.copied[0]!) as ProfileBundle;
        expect(bundle.schemaVersion).toBe(SettingsSchema.CurrentVersion);
        expect(bundle.profiles.map(profile => profile.id)).toEqual(["local"]);
        expect(harness.noticeText()).toBe("Profiles JSON copied.");
    });

    test("downloadJson_WhenNothingIsTicked_ShouldSaySoAndWriteNothing", () => {
        // Arrange
        const harness = aTransferHarness();
        const fileClient = aFileClient();
        const panel = new ProfileTransferPanel(harness.context, fileClient);
        untick(checkboxNamed(panel.root, "Local"));
        untick(checkboxNamed(panel.root, "Staging"));

        // Act
        click(buttonNamed(panel.root, "Download JSON"));

        // Assert
        expect(fileClient.download).not.toHaveBeenCalled();
        expect(harness.noticeText()).toBe("Tick at least one profile.");
    });

    test("chooseFile_WhenTheFileHoldsProfiles_ShouldListThemWithSameIdsMarked", async () => {
        // Arrange
        const harness = aTransferHarness();
        const panel = new ProfileTransferPanel(harness.context, aFileClient(JSON.stringify(ImportedFile)));

        // Act
        click(buttonNamed(panel.root, "Choose file"));
        await nextRender();

        // Assert
        const preview = panel.root.querySelector(".import-preview")!;
        expect([...preview.querySelectorAll("label")].map(label => label.textContent)).toEqual([
            "Local (1 rule, 0 variables), same id as yours",
            "QA (0 rules, 0 variables)",
        ]);
        expect(preview.querySelector<HTMLSelectElement>("select")?.value).toBe("1");
    });

    test("import_WhenMergingTheTickedProfiles_ShouldPatchAndAddThem", async () => {
        // Arrange
        const harness = aTransferHarness();
        const panel = new ProfileTransferPanel(harness.context, aFileClient(JSON.stringify(ImportedFile)));
        click(buttonNamed(panel.root, "Choose file"));
        await nextRender();

        // Act
        click(buttonNamed(panel.root, "Import"));
        await nextRender();

        // Assert
        const profiles = harness.store.getState().settings.profiles;
        expect(profiles.map(profile => `${profile.id}:${profile.rules.map(rule => rule.id).join(",")}`)).toEqual([
            "local:a,b",
            "staging:",
            "qa:",
        ]);
        expect(harness.noticeText()).toBe("Imported 2 profiles.");
    });

    test("import_WhenReplacingWithOneTickedProfile_ShouldAskThenKeepOnlyThatOne", async () => {
        // Arrange
        const harness = aTransferHarness();
        const panel = new ProfileTransferPanel(harness.context, aFileClient(JSON.stringify(ImportedFile)));
        click(buttonNamed(panel.root, "Choose file"));
        await nextRender();
        const preview = panel.root.querySelector<HTMLElement>(".import-preview")!;
        untick(checkboxNamed(preview, "Local"));
        const mode = preview.querySelector<HTMLSelectElement>("select")!;
        mode.value = "2";
        mode.dispatchEvent(new Event("change"));
        click(buttonNamed(panel.root, "Import"));

        // Act
        click(buttonNamed(document.querySelector(".confirm-dialog")!, "Replace"));
        await nextRender();

        // Assert
        const settings = harness.store.getState().settings;
        expect(settings.profiles.map(profile => profile.id)).toEqual(["qa"]);
        expect(settings.activeProfileId).toBe("qa");
    });

    test("chooseFile_WhenTheFileIsInvalid_ShouldShowTheError", async () => {
        // Arrange
        const harness = aTransferHarness();
        const panel = new ProfileTransferPanel(harness.context, aFileClient("not json"));

        // Act
        click(buttonNamed(panel.root, "Choose file"));
        await nextRender();

        // Assert
        expect(panel.root.querySelector(".import-preview .form-error")?.textContent).toBe("The file isn't valid JSON.");
    });
});
