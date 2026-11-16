import { describe, expect, test } from 'vitest';
import { CommonFields } from './CommonFields';
import { FIELD_KIND } from './FieldKind';

describe('CommonFields', () => {
    test('latency_WhenCalled_ShouldDescribeTheDelayField', () => {
        // Act
        const field = CommonFields.latency();

        // Assert
        expect(field).toEqual({
            kind: FIELD_KIND.Latency,
            key: 'delayMs',
            label: 'Latency',
        });
    });

    test('latency_WhenCalledTwice_ShouldReturnIndependentSpecs', () => {
        // Arrange
        const first = CommonFields.latency();

        // Act
        first.label = 'Changed';
        const second = CommonFields.latency();

        // Assert
        expect(second.label).toBe('Latency');
    });

    test('DelayKey_WhenRead_ShouldMatchTheLatencyFieldKey', () => {
        // Act
        const key = CommonFields.DelayKey;

        // Assert
        expect(key).toBe(CommonFields.latency().key);
    });
});
