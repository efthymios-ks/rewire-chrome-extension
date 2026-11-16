import { afterEach, describe, expect, test, vi } from 'vitest';
import { STATUS_CODE_PRESETS } from '../../../../Contracts/Http/StatusCodePreset';
import { StatusCodeSelect } from './StatusCodeSelect';
import { typeInto } from '../../../PanelTestData';

function selectOf(status: StatusCodeSelect): HTMLSelectElement {
    return status.root.querySelector('select')!;
}

function customOf(status: StatusCodeSelect): HTMLInputElement {
    return status.root.querySelector<HTMLInputElement>('.status-custom')!;
}

function pick(status: StatusCodeSelect, value: string): void {
    const select = selectOf(status);
    select.value = value;
    select.dispatchEvent(new Event('change'));
}

describe('StatusCodeSelect', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    test('constructor_WhenBuilt_ShouldOfferDefaultEveryPresetAndCustom', () => {
        // Arrange
        const status = new StatusCodeSelect(null, vi.fn());

        // Act
        const labels = [...selectOf(status).options].map(option => option.textContent);

        // Assert
        expect(labels).toEqual([
            'Default: server status, 200 for mocks',
            ...STATUS_CODE_PRESETS.map(preset => `${preset.code} ${preset.phrase}`),
            'Custom...',
        ]);
        expect(customOf(status).getAttribute('min')).toBe('100');
        expect(customOf(status).getAttribute('max')).toBe('599');
    });

    test.each([
        [
            null,
            '',
            true,
            '',
        ],
        [
            404,
            '404',
            true,
            '404',
        ],
        [
            299,
            'custom',
            false,
            '299',
        ],
    ])('constructor_WhenTheStatusIs(%s)_ShouldSelect(%s)', (
        statusCode,
        optionValue,
        isCustomHidden,
        customValue,
    ) => {
        // Arrange
        const onChange = vi.fn();

        // Act
        const status = new StatusCodeSelect(statusCode, onChange);

        // Assert
        expect(selectOf(status).value).toBe(optionValue);
        expect(customOf(status).hidden).toBe(isCustomHidden);
        expect(customOf(status).value).toBe(customValue);
    });

    test('select_WhenAPresetIsPicked_ShouldReportItsCodeAndHideCustom', () => {
        // Arrange
        const onChange = vi.fn();
        const status = new StatusCodeSelect(299, onChange);

        // Act
        pick(status, '503');

        // Assert
        expect(onChange).toHaveBeenCalledWith(503);
        expect(customOf(status).hidden).toBe(true);
    });

    test('select_WhenDefaultIsPicked_ShouldReportNull', () => {
        // Arrange
        const onChange = vi.fn();
        const status = new StatusCodeSelect(404, onChange);

        // Act
        pick(status, '');

        // Assert
        expect(onChange).toHaveBeenCalledWith(null);
    });

    test('select_WhenCustomIsPicked_ShouldRevealAndFocusTheInputWithoutReporting', () => {
        // Arrange
        const onChange = vi.fn();
        const status = new StatusCodeSelect(200, onChange);
        document.body.append(status.root);

        // Act
        pick(status, 'custom');

        // Assert
        expect(customOf(status).hidden).toBe(false);
        expect(document.activeElement).toBe(customOf(status));
        expect(onChange).not.toHaveBeenCalled();
    });

    test.each([
        [
            '418',
            418,
        ],
        [
            '',
            null,
        ],
    ])('custom_WhenTyped(%s)_ShouldReport(%s)', (value, statusCode) => {
        // Arrange
        const onChange = vi.fn();
        const status = new StatusCodeSelect(299, onChange);

        // Act
        typeInto(customOf(status), value);

        // Assert
        expect(onChange).toHaveBeenCalledWith(statusCode);
    });
});
