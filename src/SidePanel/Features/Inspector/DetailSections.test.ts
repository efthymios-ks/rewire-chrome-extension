import { describe, expect, test, vi } from 'vitest';
import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { DetailSections } from './DetailSections';
import { click } from '../../PanelTestData';

const HEADERS = [
    {
        name: 'Authorization',
        value: 'Bearer token',
    },
    {
        name: 'Accept',
        value: '*/*',
    },
];

describe('DetailSections', () => {
    test('headers_WhenAnActionIsGivenForAHeader_ShouldPutAnIconButtonNextToItsValue', () => {
        // Arrange
        const run = vi.fn();

        // Act
        const root = DetailSections.headers({
            headers: HEADERS,
            changes: [],
            area: CHANGE_AREA.RequestHeader,
            actionOf: header => header.name === 'Authorization'
                ? {
                    label: 'Open in the JWT tab',
                    icon: 'J',
                    run,
                }
                : undefined,
        });
        click(root.querySelector('.detail-action'));

        // Assert
        expect(root.querySelectorAll('.detail-action')).toHaveLength(1);
        expect(root.querySelector('.detail-action')?.getAttribute('aria-label')).toBe('Open in the JWT tab');
        expect(run).toHaveBeenCalledOnce();
    });

    test('headers_WhenARuleAddedAHeader_ShouldTagItModified', () => {
        // Arrange
        const changes = [
            {
                area: CHANGE_AREA.RequestHeader,
                name: 'accept',
                before: null,
                after: '*/*',
            },
        ];

        // Act
        const root = DetailSections.headers({ headers: HEADERS, changes, area: CHANGE_AREA.RequestHeader });

        // Assert
        const tags = [...root.querySelectorAll<HTMLElement>('.modified-tag')];
        expect(tags.map(tag => `${tag.parentElement?.textContent}|${tag.title}`))
            .toEqual(['AcceptModified|Added by a rule.']);
    });

    test('headers_WhenAValueIsEmpty_ShouldStillListTheHeaderAndItsTag', () => {
        // Arrange
        const headers = [
            {
                name: 'X-Debug',
                value: '',
            },
        ];
        const changes = [
            {
                area: CHANGE_AREA.RequestHeader,
                name: 'X-Debug',
                before: '1',
                after: '',
            },
        ];

        // Act
        const root = DetailSections.headers({ headers, changes, area: CHANGE_AREA.RequestHeader });

        // Assert
        expect([...root.querySelectorAll('dt')].map(term => term.textContent)).toEqual(['X-DebugModified']);
        expect([...root.querySelectorAll('dd')].map(value => value.textContent)).toEqual(['']);
    });

    test('headers_WhenARuleRemovedAHeader_ShouldListItAsRemovedWithTheSameTag', () => {
        // Arrange
        const changes = [
            {
                area: CHANGE_AREA.RequestHeader,
                name: 'X-Debug',
                before: '1',
                after: null,
            },
        ];

        // Act
        const root = DetailSections.headers({ headers: HEADERS, changes, area: CHANGE_AREA.RequestHeader });

        // Assert
        const tag = root.querySelector<HTMLElement>('.modified-tag');
        expect(tag?.textContent).toBe('Modified');
        expect(tag?.title).toBe('Removed by a rule. Was: 1');
        expect(root.querySelector('dt:last-of-type')?.nextElementSibling?.textContent).toBe('(removed)');
    });

    test('cookies_WhenAValueIsLong_ShouldShowItInFull', () => {
        // Arrange
        const value = 'GUID=df848449e0aa403cbcf129537989562c&HASH=df84&LV=202512&V=7&LU=1765380000000';

        // Act
        const root = DetailSections.cookies([
            {
                name: 'MC1',
                value,
            },
        ]);

        // Assert
        expect(root?.querySelector('dd')?.textContent).toBe(value);
        expect(root?.querySelector('h4')?.textContent).toBe('Cookies (1)');
    });

    test('setCookies_WhenACookieHasAttributes_ShouldListEachOneInFull', () => {
        // Arrange
        const cookie = {
            name: 'session',
            value: 'abc123',
            domain: '.example.com',
            path: '/',
            expires: '',
            maxAge: '3600',
            secure: true,
            httpOnly: true,
            sameSite: 'Lax',
            partitioned: false,
        };

        // Act
        const root = DetailSections.setCookies([cookie]);

        // Assert
        const pairs = [...root!.querySelectorAll('dt')]
            .map(term => `${term.textContent}=${term.nextElementSibling?.textContent}`);
        expect(pairs).toEqual([
            'Name=session',
            'Value=abc123',
            'Domain=.example.com',
            'Path=/',
            'Expires=Max-Age 3600',
            'Flags=Secure HttpOnly SameSite=Lax',
        ]);
    });

    test('body_WhenARuleChangedTheBody_ShouldTagItModified', () => {
        // Arrange
        const change = {
            area: CHANGE_AREA.ResponseBody,
            name: 'body',
            before: '{}',
            after: '{"id":42}',
        };

        // Act
        const root = DetailSections.body({ body: '{"id":42}', note: null, query: null, change });

        // Assert
        expect(root.querySelector('.modified-tag')?.textContent).toBe('Modified');
    });

    test.each([
        '{"id":42}',
        '[1,2]',
    ])('body_WhenTheBodyIsAJsonObjectOrArray(%s)_ShouldOfferTreeAndRaw', body => {
        // Arrange
        const options = { body, note: null, query: null };

        // Act
        const root = DetailSections.body(options);

        // Assert
        const labels = [...root.querySelectorAll('select option')].map(option => option.textContent);
        expect(labels).toEqual([
            'Tree',
            'Raw',
        ]);
    });

    test.each([
        '<!DOCTYPE html><html><title>Error 404</title></html>',
        'plain text',
        '42',
        '"text"',
        'null',
    ])('body_WhenTheBodyHasNoTree(%s)_ShouldShowTheTextWithNoViewChoice', body => {
        // Arrange
        const options = { body, note: null, query: null };

        // Act
        const root = DetailSections.body(options);

        // Assert
        expect(root.querySelector('select')).toBeNull();
        expect(root.querySelector('.code-block')?.textContent).toBe(body);
        expect(root.querySelector('.checkbox')?.textContent).toBe('Wrap');
    });

    test('body_WhenThereIsNoBody_ShouldSaySo', () => {
        // Arrange
        const body = null;

        // Act
        const root = DetailSections.body({ body, note: null, query: null });

        // Assert
        expect(root.textContent).toBe('No body.');
    });

    test('headers_WhenThereAreNone_ShouldSayNone', () => {
        // Arrange
        const headers: typeof HEADERS = [];

        // Act
        const root = DetailSections.headers({ headers, changes: [], area: CHANGE_AREA.RequestHeader });

        // Assert
        expect(root.textContent).toBe('None.');
    });
});
