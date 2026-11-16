import { SAME_SITE_LABELS } from '../../../Common/Http/SameSiteLabels';
import { buildElement } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { FormControls } from '../../Core/Dom/FormControls';
import type { CookieDraft } from './CookieDraft';

const VALUE_ROWS = 3;

const SAME_SITE_OPTIONS = Object
    .entries(SAME_SITE_LABELS)
    .map(([value, label]) => ({
        value: value as CookieDraft['sameSite'],
        label,
    }));

export interface CookieFormArguments {
    draft: CookieDraft;
    isNew: boolean;
    onSave(draft: CookieDraft): void;
    onCancel(): void;
}

export class CookieForm {
    readonly root: HTMLElement;

    private _draft: CookieDraft;
    private readonly _error: HTMLElement;

    constructor(args: CookieFormArguments) {
        this._draft = {
            ...args.draft,
        };
        this._error = buildElement('p', {
            className: 'form-error',
        });

        const nameInput = FormControls.textInput({
            value: this._draft.name,
            className: 'input cookie-name-input',
            onInput: value => this.change({
                name: value,
            }),
        });
        nameInput.readOnly = !args.isNew;

        const expiresInput = FormControls.textInput({
            value: this._draft.expiresAt,
            type: 'datetime-local',
            onInput: value => this.change({
                expiresAt: value,
            }),
        });

        this.root = buildElement('form', {
            className: 'rule-editor',
            listeners: {
                submit: event => event.preventDefault(),
            },
            children: [
                FormControls.field({ label: 'Name', control: nameInput }),
                FormControls.field({
                    label: 'Value',
                    control: FormControls.textArea({
                        value: this._draft.value,
                        rows: VALUE_ROWS,
                        onInput: value => this.change({
                            value,
                        }),
                    }),
                }),
                buildElement('div', {
                    className: 'field-row',
                    children: [
                        FormControls.field({
                            label: 'Domain',
                            control: FormControls.textInput({
                                value: this._draft.domain,
                                onInput: value => this.change({
                                    domain: value.trim(),
                                }),
                            }),
                        }),
                        FormControls.field({
                            label: 'Path',
                            control: FormControls.textInput({
                                value: this._draft.path,
                                onInput: value => this.change({
                                    path: value.trim(),
                                }),
                            }),
                        }),
                    ],
                }),
                buildElement('div', {
                    className: 'field-row',
                    children: [
                        FormControls.field({
                            label: 'Expires',
                            control: expiresInput,
                            hint: 'Empty makes a session cookie.',
                        }),
                        FormControls.field({
                            label: 'SameSite',
                            control: FormControls.select({
                                value: this._draft.sameSite,
                                options: SAME_SITE_OPTIONS,
                                onChange: value => this.change({
                                    sameSite: value as CookieDraft['sameSite'],
                                }),
                            }),
                        }),
                    ],
                }),
                buildElement('div', {
                    className: 'field-row',
                    children: [
                        FormControls.checkbox({
                            checked: this._draft.hostOnly,
                            label: 'Host only',
                            onChange: isChecked => this.change({
                                hostOnly: isChecked,
                            }),
                        }),
                        FormControls.checkbox({
                            checked: this._draft.secure,
                            label: 'Secure',
                            onChange: isChecked => this.change({
                                secure: isChecked,
                            }),
                        }),
                        FormControls.checkbox({
                            checked: this._draft.httpOnly,
                            label: 'HttpOnly',
                            onChange: isChecked => this.change({
                                httpOnly: isChecked,
                            }),
                        }),
                    ],
                }),
                this._error,
                buildElement('div', {
                    className: 'actions',
                    children: [
                        FormControls.button({
                            text: 'Save',
                            variant: BUTTON_VARIANTS.Primary,
                            onClick: () => this.save(args),
                        }),
                        FormControls.button({
                            text: 'Cancel',
                            onClick: () => args.onCancel(),
                        }),
                    ],
                }),
            ],
        });
    }

    showError(message: string): void {
        this._error.textContent = message;
    }

    private change(patch: Partial<CookieDraft>): void {
        this._draft = {
            ...this._draft,
            ...patch,
        };
    }

    private save(args: CookieFormArguments): void {
        if (this._draft.name.trim() === '' || this._draft.domain === '') {
            this.showError('Name and domain are required.');

            return;
        }

        this.showError('');
        args.onSave(this._draft);
    }
}
