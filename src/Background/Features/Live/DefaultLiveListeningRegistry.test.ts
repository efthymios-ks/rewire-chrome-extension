import { describe, expect, test } from 'vitest';
import { DefaultLiveListeningRegistry } from './DefaultLiveListeningRegistry';
import { NO_LIVE_LISTENING } from '../../../Contracts/Live/NoLiveListening';

describe('DefaultLiveListeningRegistry', () => {
    test('of_WhenTheTabWasNeverSet_ShouldListenToNothing', () => {
        // Arrange
        const registry = new DefaultLiveListeningRegistry();

        // Act
        const listening = registry.of(7);

        // Assert
        expect(listening).toEqual(NO_LIVE_LISTENING);
    });

    test('forget_WhenTheTabGoes_ShouldDropItsListening', () => {
        // Arrange
        const registry = new DefaultLiveListeningRegistry();
        registry.set(7, {
            ...NO_LIVE_LISTENING,
            eventStreams: true,
        });

        // Act
        registry.forget(7);

        // Assert
        expect(registry.of(7).eventStreams).toBe(false);
    });
});
