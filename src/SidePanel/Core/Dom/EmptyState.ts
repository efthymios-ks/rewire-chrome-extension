import { buildElement } from './buildElement';

export const EmptyState = {
    build(message: string): HTMLDivElement {
        return buildElement('div', {
            className: 'empty-state',
            children: [
                buildElement('p', {
                    text: message,
                }),
            ],
        });
    },
};
