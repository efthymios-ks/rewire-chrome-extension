import { describe, expect, test } from 'vitest';
import type { ClientExchangeResponse } from '../../../Contracts/Messaging/Commands/ClientExchangeResponse';
import { ClientResponseView } from './ClientResponseView';
import { buttonNamed, click } from '../../PanelTestData';

function aResponse(overrides: Partial<ClientExchangeResponse> = {}): ClientExchangeResponse {
    return {
        status: 200,
        statusText: '',
        headers: [
            {
                name: 'Content-Type',
                value: 'application/json',
            },
        ],
        body: '{"id":42}',
        durationInMilliseconds: 12,
        ...overrides,
    };
}

function headerOf(view: ClientResponseView): HTMLElement {
    return view.root.querySelector<HTMLElement>('.client-response-header')!;
}

function bodyOf(view: ClientResponseView): HTMLElement {
    return view.root.querySelector<HTMLElement>('.client-response-body')!;
}

function tabsOf(view: ClientResponseView): HTMLButtonElement[] {
    return [...view.root.querySelectorAll<HTMLButtonElement>('[role=tab]')];
}

describe('ClientResponseView', () => {
    test('constructor_WhenBuilt_ShouldPromptToSendAndDisableTheTabs', () => {
        // Arrange
        const view = new ClientResponseView();

        // Act
        const tabs = tabsOf(view);

        // Assert
        expect(view.root.getAttribute('aria-label')).toBe('Response');
        expect(headerOf(view).textContent).toBe('Send a request to see the response.');
        expect(tabs.map(tab => tab.textContent)).toEqual([
            'Body',
            'Headers',
        ]);
        expect(tabs.every(tab => tab.disabled)).toBe(true);
        expect(tabs.map(tab => tab.getAttribute('aria-selected'))).toEqual([
            'false',
            'false',
        ]);
        expect(bodyOf(view).childElementCount).toBe(0);
    });

    test('showPending_WhenCalled_ShouldSaySendingAndClearTheBody', () => {
        // Arrange
        const view = new ClientResponseView();
        view.showResponse(aResponse());

        // Act
        view.showPending();

        // Assert
        expect(headerOf(view).textContent).toBe('Sending...');
        expect(bodyOf(view).childElementCount).toBe(0);
        expect(tabsOf(view).every(tab => tab.disabled)).toBe(true);
    });

    test('showError_WhenCalled_ShouldShowTheErrorAndClearTheBody', () => {
        // Arrange
        const view = new ClientResponseView();
        view.showResponse(aResponse());

        // Act
        view.showError('Network unreachable');

        // Assert
        expect(headerOf(view).querySelector('.form-error')?.textContent).toBe('Network unreachable');
        expect(bodyOf(view).childElementCount).toBe(0);
        expect(tabsOf(view).every(tab => tab.disabled)).toBe(true);
    });

    test('showResponse_WhenJsonIsReturned_ShouldShowStatusDurationAndPrettyBody', () => {
        // Arrange
        const view = new ClientResponseView();

        // Act
        view.showResponse(aResponse({
            status: 201,
            durationInMilliseconds: 1500,
        }));

        // Assert
        const status = headerOf(view).querySelector('.status')!;
        expect(status.textContent).toBe('201 Created');
        expect(status.classList.contains('status-ok')).toBe(true);
        expect(headerOf(view).querySelector('.client-response-duration')?.textContent).toBe('1.50 s');
        expect(tabsOf(view).map(tab => tab.getAttribute('aria-selected'))).toEqual([
            'true',
            'false',
        ]);
        expect(tabsOf(view).some(tab => tab.disabled)).toBe(false);
        expect(bodyOf(view).querySelector('pre.code-block')?.textContent).toBe('{\n  "id": 42\n}');
    });

    test('showResponse_WhenTheServerGivesAReason_ShouldPreferIt', () => {
        // Arrange
        const view = new ClientResponseView();

        // Act
        view.showResponse(aResponse({
            status: 404,
            statusText: 'Nope',
        }));

        // Assert
        const status = headerOf(view).querySelector('.status')!;
        expect(status.textContent).toBe('404 Nope');
        expect(status.classList.contains('status-client-error')).toBe(true);
    });

    test('showResponse_WhenTheBodyIsNotJson_ShouldShowItAsIs', () => {
        // Arrange
        const view = new ClientResponseView();

        // Act
        view.showResponse(aResponse({
            body: '<p>hi</p>',
        }));

        // Assert
        expect(bodyOf(view).querySelector('pre')?.textContent).toBe('<p>hi</p>');
    });

    test('showResponse_WhenTheBodyIsEmpty_ShouldSayEmptyBody', () => {
        // Arrange
        const view = new ClientResponseView();

        // Act
        view.showResponse(aResponse({
            body: '',
        }));

        // Assert
        expect(bodyOf(view).querySelector('.empty-note')?.textContent).toBe('Empty body.');
    });

    test('headersTab_WhenClicked_ShouldListTheResponseHeaders', () => {
        // Arrange
        const view = new ClientResponseView();
        view.showResponse(aResponse());

        // Act
        click(buttonNamed(view.root, 'Headers'));

        // Assert
        expect([...bodyOf(view).querySelectorAll('dt, dd')].map(cell => cell.textContent)).toEqual([
            'Content-Type',
            'application/json',
        ]);
        expect(tabsOf(view).map(tab => tab.getAttribute('aria-selected'))).toEqual([
            'false',
            'true',
        ]);
    });

    test('headersTab_WhenThereAreNoHeaders_ShouldSaySo', () => {
        // Arrange
        const view = new ClientResponseView();
        view.showResponse(aResponse({
            headers: [],
        }));

        // Act
        click(buttonNamed(view.root, 'Headers'));

        // Assert
        expect(bodyOf(view).querySelector('.empty-note')?.textContent).toBe('No response headers.');
    });

    test('showResponse_WhenTheHeadersTabWasPicked_ShouldKeepIt', () => {
        // Arrange
        const view = new ClientResponseView();
        view.showResponse(aResponse());
        click(buttonNamed(view.root, 'Headers'));

        // Act
        view.showResponse(aResponse({
            headers: [
                {
                    name: 'X-Trace',
                    value: 'abc',
                },
            ],
        }));

        // Assert
        expect(bodyOf(view).querySelector('dt')?.textContent).toBe('X-Trace');
    });
});
