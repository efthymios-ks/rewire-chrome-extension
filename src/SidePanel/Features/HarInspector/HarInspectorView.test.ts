import { afterEach, describe, expect, test, vi } from 'vitest';
import { Result } from '../../../Common/Results/Result';
import { VIEW_ID } from '../../Core/ViewId';
import { HarInspectorView } from './HarInspectorView';
import { aFileClient, aPanelHarness, buttonNamed, click, nextRenderAsync } from '../../PanelTestData';

const HAR_TEXT = JSON.stringify({
    log: {
        version: '1.2',
        entries: [
            {
                startedDateTime: '2026-11-12T10:00:00.000Z',
                time: 80,
                request: {
                    method: 'GET',
                    url: 'https://api.example.com/users/42',
                    headers: [],
                },
                response: {
                    status: 200,
                    statusText: 'OK',
                    headers: [],
                    content: {
                        mimeType: 'application/json',
                        text: '{"id":42}',
                    },
                },
            },
            {
                startedDateTime: '2026-11-12T10:00:01.000Z',
                time: 40,
                request: {
                    method: 'POST',
                    url: 'https://api.example.com/orders',
                    headers: [],
                },
                response: {
                    status: 500,
                    statusText: 'Internal Server Error',
                    headers: [],
                    content: {
                        mimeType: 'application/json',
                        text: '{}',
                    },
                },
            },
        ],
    },
});

function paste(target: EventTarget, text: string): Event {
    const event = new Event('paste', {
        bubbles: true,
        cancelable: true,
    });
    Object.defineProperty(
        /* o: */ event,
        /* p: */ 'clipboardData',
        /* attributes: */ {
            value: {
                getData: () => text,
            },
        },
    );
    target.dispatchEvent(event);

    return event;
}

function drop(target: EventTarget, file: Pick<File, 'name' | 'text'>): Event {
    const event = new Event('drop', {
        bubbles: true,
        cancelable: true,
    });
    Object.defineProperty(
        /* o: */ event,
        /* p: */ 'dataTransfer',
        /* attributes: */ {
            value: {
                files: [file],
            },
        },
    );
    target.dispatchEvent(event);

    return event;
}

describe('HarInspectorView', () => {
    afterEach(async () => {
        await nextRenderAsync();
        document.body.replaceChildren();
    });

    test('constructor_WhenNoFileIsOpen_ShouldShowTheDropArea', () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const view = new HarInspectorView({
            context: harness.context,
            fileClient: aFileClient(),
        });

        // Assert
        expect(view.root.querySelector('.drop-zone')?.textContent)
            .toContain('Drop a .har file here, or paste one');
        expect(view.root.querySelector('.drop-zone button')).toBeNull();
        expect(buttonNamed(view.root, 'Close file').hidden).toBe(true);
    });

    test('open_WhenTheFileIsValid_ShouldShowItsCallsWithoutLiveActions', async () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new HarInspectorView({
            context: harness.context,
            fileClient: aFileClient(),
        });

        // Act
        view.open('staging.har', HAR_TEXT);
        await nextRenderAsync();

        // Assert
        expect(view.root.querySelector('.har-file-name')?.textContent).toBe('staging.har · 2 entries');
        expect(view.root.querySelectorAll('.timeline-row')).toHaveLength(2);
        expect(view.root.querySelector('.pin-toggle')).toBeNull();
        const toolbarLabels = [...view.root.querySelectorAll('.traffic-toolbar button')]
            .map(button => button.textContent);
        expect(toolbarLabels).not.toContain('HAR');
        expect(toolbarLabels).not.toContain('Clear');
        expect(harness.store.getState().entries).toEqual([]);
    });

    test('open_WhenACallIsPicked_ShouldHideMockThisAndPin', async () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new HarInspectorView({
            context: harness.context,
            fileClient: aFileClient(),
        });
        view.open('staging.har', HAR_TEXT);
        await nextRenderAsync();

        // Act
        click(view.root.querySelector('.timeline-row'));
        await new Promise(resolve => setTimeout(resolve, 250));

        // Assert
        const actions = [...view.root.querySelectorAll('.general-tab .actions button')]
            .map(button => button.textContent);
        expect(actions).toEqual(['Copy URL']);
    });

    test('openHar_WhenAFileIsPicked_ShouldOpenIt', async () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new HarInspectorView({
            context: harness.context,
            fileClient: aFileClient({
                pickNamedTextAsync: vi.fn().mockResolvedValue(Result.ok({
                    name: 'picked.har',
                    text: HAR_TEXT,
                })),
            }),
        });

        // Act
        click(buttonNamed(
            /* root: */ view.root.querySelector('.har-header')!,
            /* text: */ 'Open .har',
        ));
        await nextRenderAsync();

        // Assert
        expect(view.root.querySelector('.har-file-name')?.textContent).toBe('picked.har · 2 entries');
        expect(buttonNamed(view.root, 'Close file').hidden).toBe(false);
    });

    test('open_WhenTheFileIsInvalid_ShouldSayWhyAndKeepTheView', () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new HarInspectorView({
            context: harness.context,
            fileClient: aFileClient(),
        });

        // Act
        view.open('broken.har', '{ nope');

        // Assert
        expect(harness.noticeText()).toBe("Can't open broken.har: it isn't valid JSON.");
        expect(view.root.querySelector('.drop-zone')).not.toBeNull();
    });

    test('closeFile_WhenClicked_ShouldGoBackToTheDropArea', async () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new HarInspectorView({
            context: harness.context,
            fileClient: aFileClient(),
        });
        view.open('staging.har', HAR_TEXT);
        await nextRenderAsync();

        // Act
        click(buttonNamed(view.root, 'Close file'));

        // Assert
        expect(view.root.querySelector('.drop-zone')).not.toBeNull();
        expect(view.root.querySelector('.har-file-name')?.textContent).toBe('');
    });

    test('paste_WhenHarTextIsPastedOnTheTab_ShouldOpenIt', async () => {
        // Arrange
        const harness = aPanelHarness({
            activeView: VIEW_ID.HarInspector,
        });
        const view = new HarInspectorView({
            context: harness.context,
            fileClient: aFileClient(),
        });
        document.body.append(view.root);

        // Act
        const event = paste(document.body, HAR_TEXT);
        await nextRenderAsync();

        // Assert
        expect(event.defaultPrevented).toBe(true);
        expect(view.root.querySelector('.har-file-name')?.textContent).toBe('Pasted HAR · 2 entries');
    });

    test('paste_WhenAnotherTabIsOpen_ShouldIgnoreIt', () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new HarInspectorView({
            context: harness.context,
            fileClient: aFileClient(),
        });
        document.body.append(view.root);

        // Act
        paste(document.body, HAR_TEXT);

        // Assert
        expect(view.root.querySelector('.drop-zone')).not.toBeNull();
        expect(harness.noticeText()).toBe('');
    });

    test('paste_WhenPastingIntoAField_ShouldLeaveItToTheField', async () => {
        // Arrange
        const harness = aPanelHarness({
            activeView: VIEW_ID.HarInspector,
        });
        const view = new HarInspectorView({
            context: harness.context,
            fileClient: aFileClient(),
        });
        view.open('staging.har', HAR_TEXT);
        document.body.append(view.root);
        await nextRenderAsync();

        // Act
        const event = paste(
            /* target: */ view.root.querySelector('input')!,
            /* text: */ 'grace',
        );

        // Assert
        expect(event.defaultPrevented).toBe(false);
        expect(view.root.querySelector('.har-file-name')?.textContent).toBe('staging.har · 2 entries');
    });

    test('paste_WhenThePastedTextIsNotHar_ShouldSayWhy', () => {
        // Arrange
        const harness = aPanelHarness({
            activeView: VIEW_ID.HarInspector,
        });
        const view = new HarInspectorView({
            context: harness.context,
            fileClient: aFileClient(),
        });
        document.body.append(view.root);

        // Act
        paste(document.body, 'hello');

        // Assert
        expect(harness.noticeText()).toBe("Can't open Pasted HAR: it isn't valid JSON.");
    });

    test('drop_WhenAHarFileIsDropped_ShouldOpenIt', async () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new HarInspectorView({
            context: harness.context,
            fileClient: aFileClient(),
        });

        // Act
        drop(view.root, {
            name: 'shop.har',
            text: () => Promise.resolve(HAR_TEXT),
        });
        await nextRenderAsync();

        // Assert
        expect(view.root.querySelector('.har-file-name')?.textContent).toBe('shop.har · 2 entries');
    });

    test('drop_WhenTheDroppedFileCannotBeRead_ShouldSayWhyAndKeepTheView', async () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new HarInspectorView({
            context: harness.context,
            fileClient: aFileClient(),
        });

        // Act
        drop(view.root, {
            name: 'locked.har',
            text: () => Promise.reject(new Error('The file is locked.')),
        });
        await nextRenderAsync();

        // Assert
        expect(harness.noticeText()).toBe("Can't read locked.har: The file is locked.");
        expect(view.root.querySelector('.drop-zone')).not.toBeNull();
    });
});
