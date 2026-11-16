import { describe, expect, test } from 'vitest';
import { RequestSnippetBase } from './RequestSnippetBase';
import { SnippetBodies } from './SnippetBodies';

class EchoSnippet extends RequestSnippetBase {
    override toString(): string {
        return `${this.request.method} ${this.request.url}`;
    }
}

function anEcho(): EchoSnippet {
    return new EchoSnippet({
        method: 'get',
        url: 'https://api.example.com/users',
        headers: [],
        cookies: [],
        body: SnippetBodies.none(),
    });
}

describe('RequestSnippetBase', () => {
    test('constructor_WhenTheMethodIsLowerCase_ShouldStoreItInUpperCase', () => {
        // Arrange
        const expected = 'GET';

        // Act
        const snippet = anEcho();

        // Assert
        expect(snippet.method).toBe(expected);
    });

    test('constructor_WhenGivenEveryPart_ShouldExposeAndRenderThem', () => {
        // Act
        const snippet = new EchoSnippet({
            method: 'delete',
            url: 'https://api.example.com/users/42',
            headers: [
                {
                    name: 'Accept',
                    value: '*/*',
                },
            ],
            cookies: [
                {
                    name: 'a',
                    value: '1',
                },
            ],
            body: SnippetBodies.text('x'),
        });

        // Assert
        expect(snippet.toString()).toBe('DELETE https://api.example.com/users/42');
        expect(snippet.url).toBe('https://api.example.com/users/42');
        expect(snippet.headers).toHaveLength(1);
        expect(snippet.cookies).toHaveLength(1);
        expect(snippet.body).toEqual(SnippetBodies.text('x'));
    });
});
