import { describe, expect, test, vi } from 'vitest';
import { Result } from '../../../Common/Results/Result';
import { VIEW_ID } from '../../Core/ViewId';
import { CookiesView } from './CookiesView';
import { aPanelHarness, buttonNamed, click, controlNamed, nextRenderAsync, typeInto } from '../../PanelTestData';

const PARTITION_KEY = Object.freeze({
    topLevelSite: 'https://example.com',
    hasCrossSiteAncestor: false,
});

function aCookie(name: string, value: string): chrome.cookies.Cookie {
    return {
        name,
        value,
        domain: 'api.example.com',
        hostOnly: true,
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'lax',
        session: true,
        storeId: '0',
    };
}

function aPartitionedCookie(name: string, value: string): chrome.cookies.Cookie {
    return {
        ...aCookie(name, value),
        partitionKey: { ...PARTITION_KEY },
    };
}

async function aJarWithAsync(cookies: chrome.cookies.Cookie[]) {
    const harness = aPanelHarness({
        activeView: VIEW_ID.CookieJar,
        inspectedTab: {
            tabId: 7,
            url: 'https://api.example.com/users',
            title: 'Users',
        },
    });
    vi.mocked(harness.context.cookieClient.listAsync).mockResolvedValue(Result.ok(cookies));
    const view = new CookiesView(harness.context);
    await nextRenderAsync();

    return {
        harness,
        view,
    };
}

function partitionedColumnOf(view: CookiesView): string[] {
    return [...view.root.querySelectorAll('.cookie-item summary .cookie-field:last-child > span:last-child')]
        .map(value => value.textContent ?? '');
}

async function aLoadedViewAsync(): Promise<CookiesView> {
    const { view } = await aLoadedJarAsync();

    return view;
}

async function aLoadedJarAsync() {
    const harness = aPanelHarness({
        activeView: VIEW_ID.CookieJar,
        inspectedTab: {
            tabId: 7,
            url: 'https://api.example.com/users',
            title: 'Users',
        },
    });
    vi.mocked(harness.context.cookieClient.listAsync).mockResolvedValue(Result.ok([
        aCookie('session', 'abc123'),
        aCookie('theme', 'dark'),
        aCookie('MC1', 'GUID=df84&HASH=session-bound'),
    ]));
    const view = new CookiesView(harness.context);
    await nextRenderAsync();

    return {
        harness,
        view,
    };
}

interface EditFirstCookieOptions {
    view: CookiesView;
    label: string;
    value: string;
}

async function editFirstCookieAsync({ view, label, value }: EditFirstCookieOptions): Promise<void> {
    click(buttonNamed(view.root, 'Edit'));
    typeInto(controlNamed<HTMLInputElement | HTMLTextAreaElement>(view.root, label), value);
    click(buttonNamed(view.root, 'Save'));
    await nextRenderAsync();
}

function namesOf(view: CookiesView): string[] {
    return [...view.root.querySelectorAll('.cookie-item summary .cookie-name')]
        .map(name => name.textContent ?? '');
}

function searchOf(view: CookiesView): HTMLInputElement {
    return view.root.querySelector<HTMLInputElement>('.cookie-search')!;
}

describe('CookiesView', () => {
    test('constructor_WhenTheJarOpens_ShouldOfferAShortSearchBox', async () => {
        // Arrange
        const view = await aLoadedViewAsync();

        // Act
        const search = searchOf(view);

        // Assert
        expect(search.placeholder).toBe('Search name or value');
        expect(search.getAttribute('aria-label')).toBe('Search cookie names and values');
        expect(namesOf(view)).toEqual([
            'session',
            'theme',
            'MC1',
        ]);
    });

    test('search_WhenTyped_ShouldKeepCookiesWhoseNameOrValueContainsTheText', async () => {
        // Arrange
        const view = await aLoadedViewAsync();

        // Act
        typeInto(
            /* input: */ searchOf(view),
            /* value: */ 'Session',
        );

        // Assert
        expect(namesOf(view)).toEqual([
            'session',
            'MC1',
        ]);
    });

    test('search_WhenNothingMatches_ShouldSaySo', async () => {
        // Arrange
        const view = await aLoadedViewAsync();

        // Act
        typeInto(
            /* input: */ searchOf(view),
            /* value: */ 'zzz',
        );

        // Assert
        expect(view.root.querySelector('.cookie-content')?.textContent)
            .toBe('No cookie name or value contains "zzz".');
    });

    test('search_WhenTheTabMovedToAPageWithoutCookies_ShouldNotBringBackTheOldCookies', async () => {
        // Arrange
        const harness = aPanelHarness({
            activeView: VIEW_ID.CookieJar,
            inspectedTab: {
                tabId: 7,
                url: 'https://api.example.com/users',
                title: 'Users',
            },
        });
        vi.mocked(harness.context.cookieClient.listAsync).mockResolvedValue(Result.ok([
            aCookie('session', 'abc123'),
        ]));
        const view = new CookiesView(harness.context);
        await nextRenderAsync();
        harness.store.update(state => ({
            ...state,
            inspectedTab: {
                tabId: 7,
                url: 'chrome://extensions/',
                title: 'Extensions',
            },
        }));
        await nextRenderAsync();

        // Act
        typeInto(searchOf(view), 'session');

        // Assert
        expect(namesOf(view)).toEqual([]);
        expect(view.root.textContent).toContain('Open an http or https page to see its cookies.');
    });

    test('search_WhenCleared_ShouldListEveryCookieAgain', async () => {
        // Arrange
        const view = await aLoadedViewAsync();
        typeInto(
            /* input: */ searchOf(view),
            /* value: */ 'dark',
        );

        // Act
        typeInto(
            /* input: */ searchOf(view),
            /* value: */ '',
        );

        // Assert
        expect(namesOf(view)).toHaveLength(3);
    });

    test('edit_WhenTheDomainChanges_ShouldRemoveTheOriginalOnceTheNewOneIsSaved', async () => {
        // Arrange
        const { harness, view } = await aLoadedJarAsync();
        const { saveAsync, removeAsync } = vi.mocked(harness.context.cookieClient);

        // Act
        await editFirstCookieAsync({
            view,
            label: 'Domain',
            value: 'example.com',
        });

        // Assert
        expect(saveAsync).toHaveBeenCalledWith(expect.objectContaining({
            name: 'session',
            domain: 'example.com',
        }));
        expect(removeAsync).toHaveBeenCalledExactlyOnceWith(aCookie('session', 'abc123'));
        expect(saveAsync.mock.invocationCallOrder[0]).toBeLessThan(removeAsync.mock.invocationCallOrder[0]!);
        expect(view.root.querySelector('.form-host')?.children).toHaveLength(0);
    });

    test('edit_WhenRemovingTheOriginalAlsoTakesTheNewOne_ShouldSaveTheNewOneAgain', async () => {
        // Arrange
        const { harness, view } = await aLoadedJarAsync();
        const { saveAsync, removeAsync } = vi.mocked(harness.context.cookieClient);

        // Act
        await editFirstCookieAsync({
            view,
            label: 'Path',
            value: '/api',
        });

        // Assert
        expect(saveAsync).toHaveBeenCalledTimes(2);
        expect(saveAsync.mock.invocationCallOrder[1])
            .toBeGreaterThan(removeAsync.mock.invocationCallOrder[0]!);
    });

    test('edit_WhenSavingFails_ShouldKeepTheOriginalAndSayWhy', async () => {
        // Arrange
        const { harness, view } = await aLoadedJarAsync();
        const { saveAsync, removeAsync } = vi.mocked(harness.context.cookieClient);
        saveAsync.mockResolvedValue(Result.fail('Chrome rejected the cookie.'));

        // Act
        await editFirstCookieAsync({
            view,
            label: 'Domain',
            value: 'example.com',
        });

        // Assert
        expect(removeAsync).not.toHaveBeenCalled();
        expect(view.root.querySelector('.form-error')?.textContent).toBe('Chrome rejected the cookie.');
    });

    test('edit_WhenOnlyTheValueChanges_ShouldUpdateTheCookieInPlace', async () => {
        // Arrange
        const { harness, view } = await aLoadedJarAsync();
        const { saveAsync, removeAsync } = vi.mocked(harness.context.cookieClient);

        // Act
        await editFirstCookieAsync({
            view,
            label: 'Value',
            value: 'xyz',
        });

        // Assert
        expect(saveAsync).toHaveBeenCalledOnce();
        expect(removeAsync).not.toHaveBeenCalled();
    });
    test('refresh_WhenTheJarOpens_ShouldAskForTheCookiesOfTheInspectedTab', async () => {
        // Arrange
        const cookies = [aCookie('session', 'abc123')];

        // Act
        const { harness } = await aJarWithAsync(cookies);

        // Assert
        expect(harness.context.cookieClient.listAsync).toHaveBeenCalledWith({
            url: 'https://api.example.com/users',
            tabId: 7,
        });
    });

    test('render_WhenACookieIsPartitioned_ShouldSaySoInThePartitionedColumn', async () => {
        // Arrange
        const cookies = [
            aCookie('session', 'abc123'),
            aPartitionedCookie('embed', 'chips'),
        ];

        // Act
        const { view } = await aJarWithAsync(cookies);

        // Assert
        expect(view.root.querySelector('.cookie-columns-header')?.lastElementChild?.textContent)
            .toBe('Partitioned');
        expect(partitionedColumnOf(view)).toEqual([
            'No',
            'Yes',
        ]);
    });

    test('edit_WhenThePartitionedCookieValueChanges_ShouldSaveItInItsPartition', async () => {
        // Arrange
        const { harness, view } = await aJarWithAsync([aPartitionedCookie('embed', 'chips')]);
        const { saveAsync, removeAsync } = vi.mocked(harness.context.cookieClient);

        // Act
        await editFirstCookieAsync({
            view,
            label: 'Value',
            value: 'fresh',
        });

        // Assert
        expect(saveAsync).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
            name: 'embed',
            value: 'fresh',
            partitionKey: PARTITION_KEY,
        }));
        expect(removeAsync).not.toHaveBeenCalled();
    });

    test('remove_WhenThePartitionedCookieIsConfirmed_ShouldRemoveItFromItsPartition', async () => {
        // Arrange
        const { harness, view } = await aJarWithAsync([aPartitionedCookie('embed', 'chips')]);
        const { removeAsync } = vi.mocked(harness.context.cookieClient);
        click(buttonNamed(view.root, 'Remove'));

        // Act
        click(buttonNamed(document.querySelector('dialog')!, 'Remove'));
        await nextRenderAsync();

        // Assert
        expect(removeAsync).toHaveBeenCalledExactlyOnceWith(aPartitionedCookie('embed', 'chips'));
    });

    test('render_WhenTwinCookiesDifferOnlyByPartition_ShouldKeepOnlyTheOpenedOneOpen', async () => {
        // Arrange
        const { view } = await aJarWithAsync([
            aCookie('embed', 'plain'),
            aPartitionedCookie('embed', 'chips'),
        ]);
        const partitioned = view.root.querySelectorAll<HTMLDetailsElement>('.cookie-item')[1]!;
        partitioned.open = true;
        partitioned.dispatchEvent(new Event('toggle'));

        // Act
        typeInto(searchOf(view), 'embed');

        // Assert
        expect([...view.root.querySelectorAll<HTMLDetailsElement>('.cookie-item')].map(item => item.open))
            .toEqual([
                false,
                true,
            ]);
    });
});
