import { describe, expect, test } from 'vitest';
import { TIMELINE_ENTRY_STATE } from '../../../Contracts/Timeline/TimelineEntryState';
import { PANEL_LIMITS } from '../../Core/PanelLimits';
import { TimelineEntries } from './TimelineEntries';
import { aSummary } from '../../../TestData';

describe('TimelineEntries', () => {
    test('upsert_WhenTheEntryExists_ShouldReplaceInPlace', () => {
        // Arrange
        const entries = [
            aSummary({
                id: 'a',
                state: TIMELINE_ENTRY_STATE.Pending,
            }),
            aSummary({
                id: 'b',
            }),
        ];
        const updated = aSummary({
            id: 'a',
            state: TIMELINE_ENTRY_STATE.Completed,
        });

        // Act
        const result = TimelineEntries.upsert(entries, updated);

        // Assert
        expect(result.map(entry => entry.id)).toEqual([
            'a',
            'b',
        ]);
        expect(result[0]).toBe(updated);
    });

    test('upsert_WhenTheListIsFull_ShouldDropTheOldest', () => {
        // Arrange
        const entries = Array.from(
            /* iterable: */ {
                length: PANEL_LIMITS.MaxTimelineEntries,
            },
            /* mapfn: */ (_, index) => aSummary({
                id: `entry-${index}`,
            }),
        );

        // Act
        const result = TimelineEntries.upsert(
            /* entries: */ entries,
            /* entry: */ aSummary({
                id: 'newest',
            }),
        );

        // Assert
        expect(result).toHaveLength(PANEL_LIMITS.MaxTimelineEntries);
        expect(result[0]?.id).toBe('entry-1');
        expect(result.at(-1)?.id).toBe('newest');
    });

    test('latestFor_WhenTheEndpointWasCalledTwice_ShouldReturnTheLastCall', () => {
        // Arrange
        const entries = [
            aSummary({
                id: 'first',
            }),
            aSummary({
                id: 'other',
                endpointKey: 'GET https://api.example.com/orders',
            }),
            aSummary({
                id: 'second',
            }),
        ];

        // Act
        const latest = TimelineEntries.latestFor(
            /* entries: */ entries,
            /* endpointKey: */ 'GET https://api.example.com/api/v1/users/42/profile',
        );

        // Assert
        expect(latest?.id).toBe('second');
    });
});
