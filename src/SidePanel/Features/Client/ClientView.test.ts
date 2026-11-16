import { afterEach, describe, expect, test, vi } from 'vitest';
import { Result } from '../../../Common/Results/Result';
import type { LogClientExchangeCommand } from '../../../Contracts/Messaging/Commands/LogClientExchangeCommand';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { ClientView } from './ClientView';
import type { HttpClient } from './HttpClient';
import { aPanelHarness, buttonNamed, click, nextRenderAsync, sentOf, typeInto } from '../../PanelTestData';

function anHttpClient(): HttpClient {
    return {
        sendAsync: vi.fn().mockResolvedValue(Result.ok({
            status: 201,
            statusText: '',
            headers: [],
            body: '{"id":7}',
            durationInMilliseconds: 12,
        })),
    };
}

const INSPECTED_TAB = {
    tabId: 9,
    url: 'https://app.example.com/',
    title: 'App',
};

describe('ClientView', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    test('sendAsync_WhenTheUrlIsEmpty_ShouldAskForOne', async () => {
        // Arrange
        const harness = aPanelHarness();
        const httpClient = anHttpClient();
        const view = new ClientView(harness.context, httpClient);

        // Act
        click(buttonNamed(view.root, 'Send'));
        await nextRenderAsync();

        // Assert
        expect(httpClient.sendAsync).not.toHaveBeenCalled();
        expect(harness.noticeText()).toBe('Enter a URL first.');
    });

    test('sendAsync_WhenAnswered_ShouldShowTheStatusAndLogTheExchange', async () => {
        // Arrange
        const harness = aPanelHarness({
            inspectedTab: INSPECTED_TAB,
        });
        const view = new ClientView(
            /* context: */ harness.context,
            /* httpClient: */ anHttpClient(),
        );
        typeInto(
            /* input: */ view.root.querySelector<HTMLInputElement>('.client-url')!,
            /* value: */ 'https://api.example.com/users',
        );

        // Act
        click(buttonNamed(view.root, 'Send'));
        await nextRenderAsync();

        // Assert
        expect(view.root.querySelector('.client-response-header')?.textContent).toContain('201 Created');
        const logged = sentOf(harness, PANEL_COMMAND_TYPE.LogClientExchange) as LogClientExchangeCommand[];
        expect(logged).toHaveLength(1);
        expect(logged[0]?.tabId).toBe(9);
        expect(logged[0]?.request.url).toBe('https://api.example.com/users');
        expect(logged[0]?.response?.status).toBe(201);
    });

    test('clientLaunch_WhenACallIsOpened_ShouldFillTheFormFromIt', async () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new ClientView(
            /* context: */ harness.context,
            /* httpClient: */ anHttpClient(),
        );

        // Act
        harness.context.viewLauncher.openClient({
            method: 'PUT',
            url: 'https://api.example.com/users/42',
            headers: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
            body: '{"name":"Ada"}',
        });
        await nextRenderAsync();

        // Assert
        expect(view.root.querySelector<HTMLInputElement>('.client-url')!.value)
            .toBe('https://api.example.com/users/42');
        expect(view.root.querySelector<HTMLSelectElement>('.client-method')!.value).toBe('PUT');
        expect(view.root.querySelector<HTMLTextAreaElement>('.client-body-editor textarea')!.value)
            .toBe('{"name":"Ada"}');
    });

    test('sendAsync_WhenAGetCarriesABody_ShouldLogTheBodyItSent', async () => {
        // Arrange
        const harness = aPanelHarness({
            inspectedTab: INSPECTED_TAB,
        });
        const view = new ClientView(
            /* context: */ harness.context,
            /* httpClient: */ anHttpClient(),
        );
        typeInto(
            /* input: */ view.root.querySelector<HTMLInputElement>('.client-url')!,
            /* value: */ 'https://login.example.com/token',
        );
        click(buttonNamed(view.root, 'Text'));
        typeInto(
            /* input: */ view.root.querySelector<HTMLTextAreaElement>('.client-body-editor textarea')!,
            /* value: */ 'grant_type=client_credentials',
        );

        // Act
        click(buttonNamed(view.root, 'Send'));
        await nextRenderAsync();

        // Assert
        const logged = sentOf(harness, PANEL_COMMAND_TYPE.LogClientExchange) as LogClientExchangeCommand[];
        expect(logged[0]?.request.method).toBe('GET');
        expect(logged[0]?.request.body).toBe('grant_type=client_credentials');
    });

    test('copyAs_WhenAFormatIsPicked_ShouldCopyTheFormAsThatSnippet', async () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new ClientView(
            /* context: */ harness.context,
            /* httpClient: */ anHttpClient(),
        );
        document.body.append(view.root);
        typeInto(
            /* input: */ view.root.querySelector<HTMLInputElement>('.client-url')!,
            /* value: */ 'https://api.example.com/users',
        );

        // Act
        click(buttonNamed(view.root, 'Copy as'));
        click(buttonNamed(document.body, 'Copy as cURL (bash)'));
        await nextRenderAsync();

        // Assert
        expect(harness.copied).toEqual(["curl 'https://api.example.com/users'"]);
        expect(harness.noticeText()).toBe('cURL (bash) snippet copied.');
    });

    test('copyAs_WhenTheUrlIsEmpty_ShouldAskForOne', async () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new ClientView(
            /* context: */ harness.context,
            /* httpClient: */ anHttpClient(),
        );
        document.body.append(view.root);

        // Act
        click(buttonNamed(view.root, 'Copy as'));
        click(buttonNamed(document.body, 'Copy as Wget'));
        await nextRenderAsync();

        // Assert
        expect(harness.copied).toEqual([]);
        expect(harness.noticeText()).toBe('Enter a URL first.');
    });
});
