import { describe, expect, test } from 'vitest';
import { DefaultDebuggerSessions } from './DefaultDebuggerSessions';
import { MAX_ROUTES_PER_TAB } from './MaxRoutesPerTab';

describe('DefaultDebuggerSessions', () => {
    test('childrenOf_WhenChildrenAreAddedAndRemoved_ShouldListTheOnesLeft', () => {
        // Arrange
        const sessions = new DefaultDebuggerSessions();
        sessions.addChild(1, 'session-a');
        sessions.addChild(1, 'session-b');

        // Act
        sessions.removeChild(1, 'session-a');

        // Assert
        expect(sessions.childrenOf(1)).toEqual(['session-b']);
        expect(sessions.childrenOf(2)).toEqual([]);
    });

    test('sessionOf_WhenARequestWasSeenInAChild_ShouldReturnThatChild', () => {
        // Arrange
        const sessions = new DefaultDebuggerSessions();

        // Act
        sessions.remember({ tabId: 1, requestId: 'request-1', sessionId: 'session-a' });

        // Assert
        expect(sessions.sessionOf(1, 'request-1')).toBe('session-a');
        expect(sessions.sessionOf(2, 'request-1')).toBeUndefined();
    });

    test('removeChild_WhenTheChildGoes_ShouldDropItsRequests', () => {
        // Arrange
        const sessions = new DefaultDebuggerSessions();
        sessions.addChild(1, 'session-a');
        sessions.remember({ tabId: 1, requestId: 'request-1', sessionId: 'session-a' });
        sessions.remember({ tabId: 1, requestId: 'request-2', sessionId: 'session-b' });

        // Act
        sessions.removeChild(1, 'session-a');

        // Assert
        expect(sessions.sessionOf(1, 'request-1')).toBeUndefined();
        expect(sessions.sessionOf(1, 'request-2')).toBe('session-b');
    });

    test('remember_WhenTheLimitIsPassed_ShouldDropTheOldestRequest', () => {
        // Arrange
        const sessions = new DefaultDebuggerSessions();
        for (let index = 0; index < MAX_ROUTES_PER_TAB; index++) {
            sessions.remember({ tabId: 1, requestId: `request-${index}`, sessionId: 'session-a' });
        }

        // Act
        sessions.remember({ tabId: 1, requestId: 'request-last', sessionId: 'session-a' });

        // Assert
        expect(sessions.sessionOf(1, 'request-0')).toBeUndefined();
        expect(sessions.sessionOf(1, 'request-last')).toBe('session-a');
    });

    test('forget_WhenTheTabGoes_ShouldDropItsChildrenAndRequests', () => {
        // Arrange
        const sessions = new DefaultDebuggerSessions();
        sessions.addChild(1, 'session-a');
        sessions.remember({ tabId: 1, requestId: 'request-1', sessionId: 'session-a' });

        // Act
        sessions.forget(1);

        // Assert
        expect(sessions.childrenOf(1)).toEqual([]);
        expect(sessions.sessionOf(1, 'request-1')).toBeUndefined();
    });
});
