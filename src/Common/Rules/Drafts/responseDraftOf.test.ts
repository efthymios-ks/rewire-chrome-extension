import { describe, expect, test } from 'vitest';
import { responseDraftOf } from './responseDraftOf';

describe('responseDraftOf', () => {
    test('responseDraftOf_WhenGivenAStatusAndHeaders_ShouldBuildADraftWithNoBodyOrError', () => {
        // Arrange
        const headers = [
            {
                name: 'Content-Type',
                value: 'application/json',
            },
        ];

        // Act
        const draft = responseDraftOf(204, headers);

        // Assert
        expect(draft).toEqual({
            status: 204,
            headers,
            body: null,
            errorReason: null,
        });
        expect(draft.headers).toBe(headers);
    });
});
