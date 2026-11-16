import { describe, expect, test } from 'vitest';
import { VariablesPanel } from './VariablesPanel';
import { aProfile, aSettings } from '../../../../TestData';
import { aPanelHarness, buttonNamed, click, nextRenderAsync, typeInto } from '../../../PanelTestData';

function aVariablesHarness(): ReturnType<typeof aPanelHarness> {
    return aPanelHarness({
        settings: aSettings({
            activeProfileId: 'local',
            profiles: [
                aProfile({
                    id: 'local',
                    name: 'Local',
                    variables: [
                        {
                            name: 'baseUrl',
                            value: 'http://localhost:5000',
                        },
                    ],
                }),
                aProfile({
                    id: 'staging',
                    name: 'Staging',
                }),
            ],
        }),
        capturedVariables: [
            {
                name: 'token',
                value: 'captured',
            },
        ],
    });
}

function rowsOf(panel: VariablesPanel): HTMLElement[] {
    return [...panel.root.querySelectorAll<HTMLElement>('.variable-row')];
}

describe('VariablesPanel', () => {
    test('constructor_WhenBuilt_ShouldShowTheActiveProfileVariablesAndTheCapturedOnes', () => {
        // Arrange
        const harness = aVariablesHarness();

        // Act
        const panel = new VariablesPanel(harness.context);

        // Assert
        const row = rowsOf(panel)[0]!;
        expect(row.querySelector<HTMLInputElement>('.variable-name')?.value).toBe('baseUrl');
        expect(row.querySelector<HTMLInputElement>('.variable-value')?.value).toBe('http://localhost:5000');
        expect(panel.root.querySelector('.captured-variables')?.textContent).toBe('tokencaptured');
        expect(panel.root.textContent).toContain('Variables of "Local".');
    });

    test('saveAsync_WhenAVariableIsAdded_ShouldStoreItOnTheActiveProfile', async () => {
        // Arrange
        const harness = aVariablesHarness();
        const panel = new VariablesPanel(harness.context);
        click(buttonNamed(panel.root, 'Add variable'));
        const row = rowsOf(panel)[1]!;
        typeInto(
            /* input: */ row.querySelector<HTMLInputElement>('.variable-name')!,
            /* value: */ ' tenant ',
        );
        typeInto(
            /* input: */ row.querySelector<HTMLInputElement>('.variable-value')!,
            /* value: */ 'acme',
        );

        // Act
        click(buttonNamed(panel.root, 'Save variables'));
        await nextRenderAsync();

        // Assert
        expect(harness.store.getState().settings.profiles[0]?.variables).toEqual([
            {
                name: 'baseUrl',
                value: 'http://localhost:5000',
            },
            {
                name: 'tenant',
                value: 'acme',
            },
        ]);
        expect(harness.noticeText()).toBe('Saved 2 variables.');
    });

    test('saveAsync_WhenANameIsInvalidOrRepeated_ShouldListTheErrorsAndKeepTheProfile', async () => {
        // Arrange
        const harness = aVariablesHarness();
        const panel = new VariablesPanel(harness.context);
        click(buttonNamed(panel.root, 'Add variable'));
        click(buttonNamed(panel.root, 'Add variable'));
        const rows = rowsOf(panel);
        typeInto(
            /* input: */ rows[1]!.querySelector<HTMLInputElement>('.variable-name')!,
            /* value: */ '2fast',
        );
        typeInto(
            /* input: */ rows[2]!.querySelector<HTMLInputElement>('.variable-name')!,
            /* value: */ 'baseUrl',
        );

        // Act
        click(buttonNamed(panel.root, 'Save variables'));
        await nextRenderAsync();

        // Assert
        expect([...panel.root.querySelectorAll('.form-error li')].map(item => item.textContent)).toEqual([
            '"2fast": Variable names start with a letter or _ and use letters, digits, _ . -.',
            '"baseUrl" is listed more than once.',
        ]);
        expect(harness.store.getState().settings.profiles[0]?.variables).toHaveLength(1);
    });

    test('saveAsync_WhenTwoRowsHaveValuesButNoNames_ShouldAskForNamesOnly', async () => {
        // Arrange
        const harness = aVariablesHarness();
        const panel = new VariablesPanel(harness.context);
        click(buttonNamed(panel.root, 'Add variable'));
        click(buttonNamed(panel.root, 'Add variable'));
        const rows = rowsOf(panel);
        typeInto(
            /* input: */ rows[1]!.querySelector<HTMLInputElement>('.variable-value')!,
            /* value: */ 'one',
        );
        typeInto(
            /* input: */ rows[2]!.querySelector<HTMLInputElement>('.variable-value')!,
            /* value: */ 'two',
        );

        // Act
        click(buttonNamed(panel.root, 'Save variables'));
        await nextRenderAsync();

        // Assert
        expect([...panel.root.querySelectorAll('.form-error li')].map(item => item.textContent)).toEqual([
            'Every variable with a value needs a name.',
        ]);
    });

    test('remove_WhenClickedAndSaved_ShouldDropTheVariable', async () => {
        // Arrange
        const harness = aVariablesHarness();
        const panel = new VariablesPanel(harness.context);
        click(buttonNamed(rowsOf(panel)[0]!, '×'));

        // Act
        click(buttonNamed(panel.root, 'Save variables'));
        await nextRenderAsync();

        // Assert
        expect(harness.store.getState().settings.profiles[0]?.variables).toEqual([]);
        expect(panel.root.querySelector('.variable-rows')?.textContent).toBe('No variables yet.');
    });

    test('activeProfile_WhenSwitched_ShouldLoadTheOtherProfileVariables', async () => {
        // Arrange
        const harness = aVariablesHarness();
        const panel = new VariablesPanel(harness.context);

        // Act
        await harness.context.settingsService.switchProfileAsync('staging');

        // Assert
        expect(rowsOf(panel)).toHaveLength(0);
        expect(panel.root.textContent).toContain('Variables of "Staging".');
    });
});
