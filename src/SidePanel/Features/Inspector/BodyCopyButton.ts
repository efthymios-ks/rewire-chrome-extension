import { copyWithNoticeAsync } from '../../Core/copyWithNoticeAsync';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { FormControls } from '../../Core/Dom/FormControls';
import type { PanelContext } from '../Shell/PanelContext';

export interface BuildOptions {
    context: PanelContext;
    body: string | null;
    text: string;
}

export const BodyCopyButton = {
    build({ context, body, text }: BuildOptions): HTMLButtonElement | null {
        if (body == null || body === '') {
            return null;
        }

        return FormControls.button({
            text,
            variant: BUTTON_VARIANTS.Ghost,
            onClick: () => copyWithNoticeAsync({
                context,
                text: body,
                successMessage: 'Body copied.',
            }),
        });
    },
};
