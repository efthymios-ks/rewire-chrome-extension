import { buildElement } from './buildElement';
import { BUTTON_VARIANTS } from './ButtonVariants';
import { FormControls } from './FormControls';

export interface ConfirmArguments {
    title: string;
    message: string;
    confirmText: string;
}

export const ConfirmDialog = {
    askAsync(args: ConfirmArguments): Promise<boolean> {
        return new Promise(resolve => {
            const dialog = buildElement('dialog', {
                className: 'confirm-dialog',
            });
            const finish = (isConfirmed: boolean): void => {
                if (!dialog.isConnected) {
                    return;
                }

                dialog.close();
                dialog.remove();
                resolve(isConfirmed);
            };
            dialog.addEventListener(
                /* type: */ 'cancel',
                /* listener: */ event => {
                    event.preventDefault();
                    finish(false);
                },
            );
            const cancel = FormControls.button({
                text: 'Cancel',
                variant: BUTTON_VARIANTS.Ghost,
                onClick: () => finish(false),
            });
            dialog.append(
                /* nodes: */ buildElement('h2', {
                    className: 'confirm-title',
                    text: args.title,
                }),
                /* nodes: */ buildElement('p', {
                    text: args.message,
                }),
                /* nodes: */ buildElement('div', {
                    className: 'actions',
                    children: [
                        FormControls.button({
                            text: args.confirmText,
                            variant: BUTTON_VARIANTS.Danger,
                            onClick: () => finish(true),
                        }),
                        cancel,
                    ],
                }),
            );
            document.body.append(dialog);
            dialog.showModal();
            cancel.focus();
        });
    },
};
