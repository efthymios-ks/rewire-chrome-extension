import { buildElement } from "./ElementBuilder";
import { ButtonVariants, FormControls } from "./FormControls";

export interface ConfirmArguments {
    title: string;
    message: string;
    confirmText: string;
}

export const ConfirmDialog = {
    ask(args: ConfirmArguments): Promise<boolean> {
        return new Promise(resolve => {
            const dialog = buildElement("dialog", {
                className: "confirm-dialog",
            });
            const finish = (confirmed: boolean): void => {
                if (!dialog.isConnected) {
                    return;
                }

                dialog.close();
                dialog.remove();
                resolve(confirmed);
            };
            dialog.addEventListener("cancel", event => {
                event.preventDefault();
                finish(false);
            });
            const cancel = FormControls.button({
                text: "Cancel",
                variant: ButtonVariants.Ghost,
                onClick: () => finish(false),
            });
            dialog.append(
                buildElement("h2", {
                    className: "confirm-title",
                    text: args.title,
                }),
                buildElement("p", {
                    text: args.message,
                }),
                buildElement("div", {
                    className: "actions",
                    children: [
                        FormControls.button({
                            text: args.confirmText,
                            variant: ButtonVariants.Danger,
                            onClick: () => finish(true),
                        }),
                        cancel,
                    ],
                })
            );
            document.body.append(dialog);
            dialog.showModal();
            cancel.focus();
        });
    },
};
