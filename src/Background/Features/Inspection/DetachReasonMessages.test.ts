import { describe, expect, test } from 'vitest';
import { DetachReasonMessages } from './DetachReasonMessages';

describe('DetachReasonMessages', () => {
    test.each([
        [
            'canceled_by_user',
            'Debugging was canceled from the browser bar. Reattach to keep capturing.',
        ],
        [
            'target_closed',
            'The tab was closed.',
        ],
        [
            'something_new',
            'The debugger detached.',
        ],
        [
            '',
            'The debugger detached.',
        ],
        [
            'toString',
            'The debugger detached.',
        ],
        [
            'constructor',
            'The debugger detached.',
        ],
    ])('of_WhenTheReasonIs(%s)_ShouldDescribeIt', (reason, expected) => {
        // Arrange
        const detachReason = reason;

        // Act
        const message = DetachReasonMessages.of(detachReason);

        // Assert
        expect(message).toBe(expected);
    });
});
