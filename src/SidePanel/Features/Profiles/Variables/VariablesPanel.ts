import { ActiveProfile } from '../../../../Common/Profiles/ActiveProfile';
import { VariableNames } from '../../../../Common/Rules/Templates/VariableNames';
import type { ProfileVariable } from '../../../../Contracts/Settings/ProfileVariable';
import { buildElement } from '../../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../../Core/Dom/ButtonVariants';
import { FormControls } from '../../../Core/Dom/FormControls';
import type { SlidePanel } from '../../../Core/Dom/SlidePanel';
import { CountText } from '../../../Core/Formatting/CountText';
import type { PanelContext } from '../../Shell/PanelContext';

const MISSING_NAME_TEXT = 'Every variable with a value needs a name.';

function isBlank(variable: ProfileVariable): boolean {
    return variable.name.trim() === '' && variable.value === '';
}

function errorsOf(variables: ProfileVariable[]): string[] {
    const names = variables.map(variable => variable.name.trim());
    const invalid = names.filter(name => name !== '' && !VariableNames.isValid(name));
    const repeated = names.filter((name, index) => name !== '' && names.indexOf(name) !== index);

    return [
        ...(names.includes('') ? [MISSING_NAME_TEXT] : []),
        ...invalid.map(name => `"${name}": ${VariableNames.RuleMessage}`),
        ...[...new Set(repeated)].map(name => `"${name}" is listed more than once.`),
    ];
}

export class VariablesPanel implements SlidePanel {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _intro: HTMLElement;
    private readonly _rows: HTMLElement;
    private readonly _errors: HTMLElement;
    private readonly _captured: HTMLElement;
    private readonly _unsubscribes: Array<() => void>;
    private _draft: ProfileVariable[] = [];

    constructor(context: PanelContext) {
        this._context = context;
        this._intro = buildElement('p', {
            className: 'help-text',
        });
        this._rows = buildElement('div', {
            className: 'variable-rows',
        });
        this._errors = buildElement('ul', {
            className: 'form-error',
        });
        this._captured = buildElement('div', {
            className: 'captured-variables',
        });

        this.root = buildElement('div', {
            className: 'variables-panel',
            children: [
                this._intro,
                this._rows,
                buildElement('div', {
                    className: 'actions',
                    children: [
                        FormControls.button({
                            text: 'Add variable',
                            onClick: () => this.add(),
                        }),
                        FormControls.button({
                            text: 'Save variables',
                            variant: BUTTON_VARIANTS.Primary,
                            onClick: () => void this.saveAsync(),
                        }),
                    ],
                }),
                this._errors,
                buildElement('h3', {
                    className: 'editor-section-title',
                    text: 'Captured this session',
                }),
                this._captured,
            ],
        });

        this._unsubscribes = [
            context.store.select({
                selector: state => state.settings.activeProfileId,
                listener: () => this.load(),
            }),
            context.store.select({
                selector: state => state.capturedVariables,
                listener: variables => this.renderCaptured(variables),
            }),
        ];
    }

    dispose(): void {
        this._unsubscribes.forEach(unsubscribe => unsubscribe());
    }

    private load(): void {
        const profile = ActiveProfile.of(this._context.store.getState().settings);
        this._intro.textContent = `Variables of "${profile.name}". Rules use them as {{name}}. A value a Set variable rule captures wins over the one typed here.`;
        this._draft = profile.variables.map(variable => ({
            ...variable,
        }));
        this._errors.replaceChildren();
        this.renderRows();
    }

    private add(): void {
        this._draft = [
            ...this._draft,
            {
                name: '',
                value: '',
            },
        ];
        this.renderRows();
        this._rows.querySelector<HTMLInputElement>('.variable-row:last-child .variable-name')?.focus();
    }

    private renderRows(): void {
        if (this._draft.length === 0) {
            this._rows.replaceChildren(buildElement('p', {
                className: 'empty-note',
                text: 'No variables yet.',
            }));

            return;
        }

        this._rows.replaceChildren(...this._draft.map((variable, index) => this.row(variable, index)));
    }

    private row(variable: ProfileVariable, index: number): HTMLElement {
        const nameInput = FormControls.textInput({
            value: variable.name,
            placeholder: 'Name',
            className: 'input variable-name',
            onInput: name => this.change(index, {
                name,
            }),
        });
        nameInput.setAttribute('aria-label', 'Variable name');
        const valueInput = FormControls.textInput({
            value: variable.value,
            placeholder: 'Value',
            className: 'input variable-value',
            onInput: value => this.change(index, {
                value,
            }),
        });
        valueInput.setAttribute('aria-label', 'Variable value');

        return buildElement('div', {
            className: 'variable-row',
            children: [
                nameInput,
                valueInput,
                FormControls.button({
                    text: '×',
                    variant: BUTTON_VARIANTS.Ghost,
                    title: 'Remove this variable',
                    ariaLabel: 'Remove this variable',
                    onClick: () => this.remove(index),
                }),
            ],
        });
    }

    private change(index: number, changes: Partial<ProfileVariable>): void {
        this._draft = this._draft.map((current, currentIndex) => currentIndex === index
            ? {
                ...current,
                ...changes,
            }
            : current);
    }

    private remove(index: number): void {
        this._draft = this._draft.filter((_variable, currentIndex) => currentIndex !== index);
        this.renderRows();
    }

    private async saveAsync(): Promise<void> {
        const variables = this._draft
            .filter(variable => !isBlank(variable))
            .map(variable => ({
                name: variable.name.trim(),
                value: variable.value,
            }));
        const errors = errorsOf(variables);
        this._errors.replaceChildren(...errors.map(error => buildElement('li', {
            text: error,
        })));
        if (errors.length > 0) {
            return;
        }

        const saved = await this._context.settingsService.saveVariablesAsync(variables);
        if (saved.hasErrors) {
            return;
        }

        this._context.notifier.show(`Saved ${CountText.of({
            count: variables.length,
            singular: 'variable',
        })}.`);
        this.load();
    }

    private renderCaptured(variables: ProfileVariable[]): void {
        if (variables.length === 0) {
            this._captured.replaceChildren(buildElement('p', {
                className: 'empty-note',
                text: 'None yet. Set variable rules fill this list while they run; it empties when the browser restarts.',
            }));

            return;
        }

        this._captured.replaceChildren(buildElement('dl', {
            className: 'definitions',
            children: variables.flatMap(variable => [
                buildElement('dt', {
                    className: 'captured-name',
                    text: variable.name,
                }),
                buildElement('dd', {
                    className: 'captured-value',
                    text: variable.value,
                }),
            ]),
        }));
    }
}
