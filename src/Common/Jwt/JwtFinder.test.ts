import { describe, expect, test } from 'vitest';
import { Base64Text } from '../Encoding/Base64Text';
import { JwtFinder } from './JwtFinder';

function partOf(value: object): string {
    return Base64Text
        .fromUtf8(JSON.stringify(value))
        .replace(/=+$/, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

const TOKEN = `${partOf({
    alg: 'HS256',
    typ: 'JWT',
})}.${partOf({
    sub: 'user-42',
})}.signature`;

describe('JwtFinder', () => {
    test('find_WhenAPayloadCarriesAToken_ShouldReturnIt', () => {
        // Arrange
        const payload = `42["auth",{"token":"${TOKEN}"}]`;

        // Act
        const token = JwtFinder.find(payload);

        // Assert
        expect(token).toBe(TOKEN);
    });

    test('find_WhenThePayloadHasNoToken_ShouldReturnNull', () => {
        // Arrange
        const payload = '{"type":"ping"}';

        // Act
        const token = JwtFinder.find(payload);

        // Assert
        expect(token).toBeNull();
    });
});
