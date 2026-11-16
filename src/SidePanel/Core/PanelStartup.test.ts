import { describe, expect, test, vi } from 'vitest';
import { PanelStartup } from './PanelStartup';

function aLoadingPage(): HTMLElement {
    const root = document.createElement('div');
    root.innerHTML = '<p class="booting">Loading...</p>';

    return root;
}

function aLogger() {
    return {
        warn: vi.fn(),
        error: vi.fn(),
    };
}

describe('PanelStartup', () => {
    test('runAsync_WhenStartupFails_ShouldReplaceTheLoadingTextWithTheErrorAndLogIt', async () => {
        // Arrange
        const root = aLoadingPage();
        const logger = aLogger();
        const error = new Error('Storage is unavailable.');

        // Act
        await PanelStartup.runAsync({
            logger,
            root,
            task: () => Promise.reject(error),
        });

        // Assert
        const message = root.querySelector('[role="alert"]');
        expect(root.children).toHaveLength(1);
        expect(message?.textContent).toBe("Rewire couldn't start: Storage is unavailable.");
        expect(logger.error).toHaveBeenCalledWith('Side panel startup failed.', error);
    });

    test('runAsync_WhenStartupSucceeds_ShouldLeaveThePageToTheApp', async () => {
        // Arrange
        const root = aLoadingPage();
        const logger = aLogger();

        // Act
        await PanelStartup.runAsync({
            logger,
            root,
            task: async () => {
                root.replaceChildren(document.createElement('main'));
            },
        });

        // Assert
        expect(root.innerHTML).toBe('<main></main>');
        expect(logger.error).not.toHaveBeenCalled();
    });
});
