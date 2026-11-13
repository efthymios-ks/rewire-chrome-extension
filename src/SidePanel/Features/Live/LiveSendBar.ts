import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";

const EnterKey = "Enter";

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
            value: "",
            placeholder: args.placeholder,
            className: "input live-send-input",
        });
        this.input.addEventListener("keydown", event => {
            if (event.key === EnterKey) {
                event.preventDefault();
                args.onSend(this.input.value);
            }
        });
        this.root = buildElement("div", {
            className: `live-send ${args.className}`,
            children: [
                args.leading,
                this.input,
                FormControls.button({
                    text: "Send",
                    variant: ButtonVariants.Primary,
                    onClick: () => args.onSend(this.input.value),
                }),
            ],
        });
    }
}
