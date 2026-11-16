import { describe, expect, test, vi } from 'vitest';
import { LatencySlider } from './LatencySlider';
import { typeInto } from '../../../PanelTestData';

function sliderOf(latency: LatencySlider): HTMLInputElement {
    return latency.root.querySelector<HTMLInputElement>('.latency-slider')!;
}

function labelOf(latency: LatencySlider): string {
    return latency.root.querySelector('.latency-value')?.textContent ?? '';
}

describe('LatencySlider', () => {
    test('constructor_WhenGivenADelay_ShouldSetTheRangeAndShowTheDelay', () => {
        // Arrange
        const delayInMilliseconds = 750;

        // Act
        const latency = new LatencySlider(delayInMilliseconds, vi.fn());

        // Assert
        const slider = sliderOf(latency);
        expect(slider.getAttribute('type')).toBe('range');
        expect(slider.getAttribute('min')).toBe('0');
        expect(slider.getAttribute('max')).toBe('10000');
        expect(slider.getAttribute('step')).toBe('250');
        expect(slider.getAttribute('aria-label')).toBe('Delay');
        expect(slider.value).toBe('750');
        expect(labelOf(latency)).toBe('750 ms');
    });

    test('constructor_WhenTheDelayIsZero_ShouldSayNoDelay', () => {
        // Arrange
        const delayInMilliseconds = 0;

        // Act
        const latency = new LatencySlider(delayInMilliseconds, vi.fn());

        // Assert
        expect(labelOf(latency)).toBe('No delay');
    });

    test.each([
        [
            '2500',
            2500,
            '2.50 s',
        ],
        [
            '0',
            0,
            'No delay',
        ],
    ])('slider_WhenMovedTo(%s)_ShouldReportAndLabelIt', (
        value,
        delayInMilliseconds,
        label,
    ) => {
        // Arrange
        const onChange = vi.fn();
        const latency = new LatencySlider(500, onChange);

        // Act
        typeInto(sliderOf(latency), value);

        // Assert
        expect(onChange).toHaveBeenCalledWith(delayInMilliseconds);
        expect(labelOf(latency)).toBe(label);
    });
});
