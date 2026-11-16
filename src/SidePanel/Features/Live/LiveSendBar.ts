import { buildElement } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { FormControls } from '../../Core/Dom/FormControls';

const ENTER_KEY = 'Enter';

export interface LiveSendBarArguments {
    className: string;
    placeholder: string;
    leading: HTMLElement | null;
    onSend: (text: string) => void;
}

export class LiveSendBar {
    readonly root: HTMLElement;
    readonly input: HTMLInputElement;

    constructor(args: LiveSendBarArguments) {
        this.input = FormControls.textInput({
            value: '',
            placeholder: args.placeholder,
            className: 'input live-send-input',
        });
        this.input.addEventListener(
            /* type: */ 'keydown',
            /* listener: */ event => {
                if (event.key === ENTER_KEY && !event.isComposing) {
                    event.preventDefault();
                    args.onSend(this.input.value);
                }
            },
        );
        this.root = buildElement('div', {
            className: `live-send ${args.className}`,
            children: [
                args.leading,
                this.input,
                FormControls.button({
                    text: 'Send',
                    variant: BUTTON_VARIANTS.Primary,
                    onClick: () => args.onSend(this.input.value),
                }),
            ],
        });
    }
}
