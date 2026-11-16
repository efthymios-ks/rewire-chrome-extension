import { afterEach, describe, expect, test, vi } from 'vitest';
import { Result } from '../../../../Common/Results/Result';
import type { ProfileBundle } from '../../../../Common/Profiles/Transfer/ProfileBundle';
import { SETTINGS_SCHEMA } from '../../../../Contracts/Settings/SettingsSchema';
import { ProfileTransferPanel } from './ProfileTransferPanel';
import { RuleFormatGuide } from './RuleFormatGuide';
import { aProfile, aRule, aSettings } from '../../../../TestData';
import { aFileClient, aPanelHarness, buttonNamed, click, nextRenderAsync } from '../../../PanelTestData';

function aTransferHarness(): ReturnType<typeof aPanelHarness> {
    return aPanelHarness({
        settings: aSettings({
            activeProfileId: 'local',
            profiles: [
                aProfile({
                    id: 'local',
                    name: 'Local',
                    rules: [
                        aRule({
                            id: 'a',
                        }),
                    ],
                }),
                aProfile({
                    id: 'staging',
                    name: 'Staging',
                }),
            ],
        }),
    });
}

function checkboxNamed(root: ParentNode, text: string): HTMLInputElement {
    const label = [...root.querySelectorAll('label')]
        .find(candidate => candidate.textContent?.startsWith(text));
    if (label == null) {
        throw new Error(`No checkbox named ${text}.`);
    }

    return label.querySelector('input')!;
}

function untick(input: HTMLInputElement): void {
    input.checked = false;
    input.dispatchEvent(new Event('change'));
}

const IMPORTED_FILE: ProfileBundle = {
    schemaVersion: SETTINGS_SCHEMA.CurrentVersion,
    profiles: [
        aProfile({
            id: 'local',
            name: 'Local',
            rules: [
                aRule({
                    id: 'b',
                }),
            ],
        }),
        aProfile({
            id: 'qa',
            name: 'QA',
        }),
    ],
};

describe('ProfileTransferPanel', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    test('copyJson_WhenOneProfileIsUnticked_ShouldExportOnlyTheTickedOnes', async () => {
        // Arrange
        const harness = aTransferHarness();
        const panel = new ProfileTransferPanel(
            /* context: */ harness.context,
            /* fileClient: */ aFileClient(),
        );
        untick(checkboxNamed(panel.root, 'Staging'));

        // Act
        click(buttonNamed(panel.root, 'Copy JSON'));
        await nextRenderAsync();

        // Assert
        const bundle = JSON.parse(harness.copied[0]!) as ProfileBundle;
        expect(bundle.schemaVersion).toBe(SETTINGS_SCHEMA.CurrentVersion);
        expect(bundle.profiles.map(profile => profile.id)).toEqual(['local']);
        expect(harness.noticeText()).toBe('Profiles JSON copied.');
    });

    test('downloadJson_WhenNothingIsTicked_ShouldSaySoAndWriteNothing', () => {
        // Arrange
        const harness = aTransferHarness();
        const fileClient = aFileClient();
        const panel = new ProfileTransferPanel(harness.context, fileClient);
        untick(checkboxNamed(panel.root, 'Local'));
        untick(checkboxNamed(panel.root, 'Staging'));

        // Act
        click(buttonNamed(panel.root, 'Download JSON'));

        // Assert
        expect(fileClient.download).not.toHaveBeenCalled();
        expect(harness.noticeText()).toBe('Tick at least one profile.');
    });

    test('chooseFile_WhenTheFileHoldsProfiles_ShouldListThemWithSameIdsMarked', async () => {
        // Arrange
        const harness = aTransferHarness();
        const panel = new ProfileTransferPanel(
            /* context: */ harness.context,
            /* fileClient: */ aFileClient({
                pickTextAsync: vi.fn().mockResolvedValue(Result.ok(JSON.stringify(IMPORTED_FILE))),
            }),
        );

        // Act
        click(buttonNamed(panel.root, 'Choose file'));
        await nextRenderAsync();

        // Assert
        const preview = panel.root.querySelector('.import-preview')!;
        expect([...preview.querySelectorAll('label')].map(label => label.textContent)).toEqual([
            'Local (1 rule, 0 variables), same id as yours',
            'QA (0 rules, 0 variables)',
        ]);
        expect(preview.querySelector<HTMLSelectElement>('select')?.value).toBe('1');
    });

    test('import_WhenMergingTheTickedProfiles_ShouldPatchAndAddThem', async () => {
        // Arrange
        const harness = aTransferHarness();
        const panel = new ProfileTransferPanel(
            /* context: */ harness.context,
            /* fileClient: */ aFileClient({
                pickTextAsync: vi.fn().mockResolvedValue(Result.ok(JSON.stringify(IMPORTED_FILE))),
            }),
        );
        click(buttonNamed(panel.root, 'Choose file'));
        await nextRenderAsync();

        // Act
        click(buttonNamed(panel.root, 'Import'));
        await nextRenderAsync();

        // Assert
        const profiles = harness.store.getState().settings.profiles;
        const profileRuleIds = profiles.map(
            profile => `${profile.id}:${profile.rules.map(rule => rule.id).join(',')}`,
        );
        expect(profileRuleIds).toEqual([
            'local:a,b',
            'staging:',
            'qa:',
        ]);
        expect(harness.noticeText()).toBe('Imported 2 profiles.');
    });

    test('import_WhenReplacingWithOneTickedProfile_ShouldAskThenKeepOnlyThatOne', async () => {
        // Arrange
        const harness = aTransferHarness();
        const panel = new ProfileTransferPanel(
            /* context: */ harness.context,
            /* fileClient: */ aFileClient({
                pickTextAsync: vi.fn().mockResolvedValue(Result.ok(JSON.stringify(IMPORTED_FILE))),
            }),
        );
        click(buttonNamed(panel.root, 'Choose file'));
        await nextRenderAsync();
        const preview = panel.root.querySelector<HTMLElement>('.import-preview')!;
        untick(checkboxNamed(preview, 'Local'));
        const mode = preview.querySelector<HTMLSelectElement>('select')!;
        mode.value = '2';
        mode.dispatchEvent(new Event('change'));
        click(buttonNamed(panel.root, 'Import'));

        // Act
        click(buttonNamed(
            /* root: */ document.querySelector('.confirm-dialog')!,
            /* text: */ 'Replace',
        ));
        await nextRenderAsync();

        // Assert
        const settings = harness.store.getState().settings;
        expect(settings.profiles.map(profile => profile.id)).toEqual(['qa']);
        expect(settings.activeProfileId).toBe('qa');
    });

    test('chooseFile_WhenTheFileIsInvalid_ShouldShowTheError', async () => {
        // Arrange
        const harness = aTransferHarness();
        const panel = new ProfileTransferPanel(
            /* context: */ harness.context,
            /* fileClient: */ aFileClient({
                pickTextAsync: vi.fn().mockResolvedValue(Result.ok('not json')),
            }),
        );

        // Act
        click(buttonNamed(panel.root, 'Choose file'));
        await nextRenderAsync();

        // Assert
        expect(panel.root.querySelector('.import-preview .form-error')?.textContent)
            .toBe("The file isn't valid JSON.");
    });

    test('readPastedJson_WhenAnAiAnswerIsPasted_ShouldListItsProfiles', async () => {
        // Arrange
        const harness = aTransferHarness();
        const panel = new ProfileTransferPanel(
            /* context: */ harness.context,
            /* fileClient: */ aFileClient(),
        );
        const fence = '```';
        const answer = `Here you go:\n\n${fence}json\n${JSON.stringify(IMPORTED_FILE)}\n${fence}\n`;
        panel.root.querySelector<HTMLTextAreaElement>('.import-paste')!.value = answer;

        // Act
        click(buttonNamed(panel.root, 'Read pasted JSON'));
        await nextRenderAsync();

        // Assert
        expect(panel.root.querySelector("[aria-label='Profiles to import']")).not.toBeNull();
    });

    test('readPastedJson_WhenNothingIsPasted_ShouldAskForIt', () => {
        // Arrange
        const harness = aTransferHarness();
        const panel = new ProfileTransferPanel(
            /* context: */ harness.context,
            /* fileClient: */ aFileClient(),
        );

        // Act
        click(buttonNamed(panel.root, 'Read pasted JSON'));

        // Assert
        expect(panel.root.querySelector('.form-error')?.textContent).toBe('Paste the JSON first.');
    });

    test('copyRuleFormatAsync_WhenClicked_ShouldCopyTheRuleJsonGuideAndNoRules', async () => {
        // Arrange
        const harness = aTransferHarness();
        const panel = new ProfileTransferPanel(
            /* context: */ harness.context,
            /* fileClient: */ aFileClient(),
        );

        // Act
        click(buttonNamed(panel.root, 'Copy rule format'));
        await nextRenderAsync();

        // Assert
        expect(harness.copied).toEqual([RuleFormatGuide.text()]);
        expect(harness.copied[0]).toMatch(/^# Rule JSON/);
        expect(harness.noticeText()).toBe('Rule format copied.');
    });
});
