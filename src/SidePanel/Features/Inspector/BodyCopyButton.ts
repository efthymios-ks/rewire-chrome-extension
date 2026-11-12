import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import type { PanelContext } from "../Shell/PanelContext";

export const BodyCopyButton = {
    build(
        context: PanelContext,
        body: string | null,
        text: string
    ): HTMLButtonElement | null {
        if (body === null || body === "") {
            return null;
        }

        return FormControls.button({
            text,
            variant: ButtonVariants.Ghost,
            onClick: () => void context.clipboardClient
                .copy(body)
                .then(copied => context.notifier.show(copied.hasErrors ? copied.error : "Body copied.")),
        });
    },
};
