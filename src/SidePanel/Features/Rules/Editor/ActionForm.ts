import type { RuleType } from '../../../../Common/Rules/Types/RuleType';
import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { buildElement } from '../../../Core/Dom/buildElement';
import type { FileClient } from '../../../Core/FileClient';
import type { Notifier } from '../../../Core/Notifier';
import { FieldControls } from '../Fields/FieldControls';

export interface ActionFormArguments {
    type: RuleType;
    action: RuleAction;
    fileClient: FileClient;
    notifier: Notifier;
    onChange: (action: RuleAction) => void;
}

export class ActionForm {
    readonly root: HTMLElement;

    private _action: RuleAction;

    constructor(args: ActionFormArguments) {
        this._action = structuredClone(args.action);
        const fields = args.type.fields.map(spec => ({
            spec,
            element: FieldControls.build({
                spec,
                action: this._action,
                fileClient: args.fileClient,
                notifier: args.notifier,
                onChange: value => {
                    this._action = {
                        ...this._action,
                        [spec.key]: value,
                    };
                    updateVisibility();
                    args.onChange(this._action);
                },
            }),
        }));
        const updateVisibility = (): void => fields.forEach(field => {
            field.element.hidden = field.spec.visibleWhen?.(this._action) === false;
        });
        updateVisibility();

        this.root = buildElement('div', {
            className: 'action-form',
            children: fields.map(field => field.element),
        });
    }
}
