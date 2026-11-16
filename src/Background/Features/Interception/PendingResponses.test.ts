import { describe, expect, test } from 'vitest';
import { type PendingResponse, PendingResponses } from './PendingResponses';
import { TIMELINE_LIMITS } from '../Capture/TimelineLimits';
import { aRequestDraft } from '../../../TestData';

function aPendingResponse(url: string = 'https://api.example.com/'): PendingResponse {
    return {
        request: aRequestDraft({
            url,
        }),
        candidates: [],
    };
}

describe('PendingResponses', () => {
    test('take_WhenTheInterceptionIsPending_ShouldReturnItOnce', () => {
        // Arrange
        const pendingResponses = new PendingResponses();
        const pending = aPendingResponse();
        pendingResponses.add('interception-1', pending);

        // Act
        const first = pendingResponses.take('interception-1');
        const second = pendingResponses.take('interception-1');

        // Assert
        expect(first).toBe(pending);
        expect(second).toBeNull();
    });

    test('take_WhenTheInterceptionIsUnknown_ShouldReturnNull', () => {
        // Arrange
        const pendingResponses = new PendingResponses();

        // Act
        const pending = pendingResponses.take('interception-1');

        // Assert
        expect(pending).toBeNull();
    });

    test('add_WhenTheLimitIsPassed_ShouldDropTheOldest', () => {
        // Arrange
        const pendingResponses = new PendingResponses();
        for (let index = 0; index < TIMELINE_LIMITS.MaxPendingInterceptions; index++) {
            pendingResponses.add(`interception-${index}`, aPendingResponse());
        }

        // Act
        pendingResponses.add('interception-new', aPendingResponse());

        // Assert
        expect(pendingResponses.take('interception-0')).toBeNull();
        expect(pendingResponses.take('interception-1')).not.toBeNull();
        expect(pendingResponses.take('interception-new')).not.toBeNull();
    });

    test('add_WhenTheIdIsAlreadyPending_ShouldReplaceIt', () => {
        // Arrange
        const pendingResponses = new PendingResponses();
        pendingResponses.add('interception-1', aPendingResponse('https://api.example.com/old'));

        // Act
        pendingResponses.add('interception-1', aPendingResponse('https://api.example.com/new'));

        // Assert
        expect(pendingResponses.take('interception-1')?.request.url).toBe('https://api.example.com/new');
    });
});
