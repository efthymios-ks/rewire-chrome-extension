import { describe, expect, test, vi } from 'vitest';
import { HeaderSuggestions } from '../../../../Common/Http/HeaderSuggestions';
import { FIELD_KIND } from '../../../../Common/Rules/Types/FieldKind';
import type { FieldSpec } from '../../../../Common/Rules/Types/FieldSpec';
import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { Notifier } from '../../../Core/Notifier';
import { PanelStateFactory } from '../../../Core/PanelStateFactory';
import { Store } from '../../../Core/Store';
import { FieldControls } from './FieldControls';
import { aFileClient, typeInto } from '../../../PanelTestData';

function controlOf(spec: FieldSpec, action: RuleAction): HTMLElement {
    return FieldControls.build({
        spec,
        action,
        onChange: vi.fn(),
        fileClient: aFileClient(),
        notifier: new Notifier(new Store(PanelStateFactory.initial())),
    });
}

function suggestionsOf(input: HTMLInputElement): string[] {
    const list = input.parentElement!.querySelector<HTMLElement>('.suggestion-list')!;

    return list.hidden
        ? []
        : [...list.querySelectorAll('.suggestion-item')].map(item => item.textContent ?? '');
}

describe('FieldControls', () => {
    test('operations_WhenAHeaderRowNamesContentType_ShouldSuggestMediaTypesForItsValue', () => {
        // Arrange
        const control = controlOf(
            /* spec: */ {
                kind: FIELD_KIND.Operations,
                key: 'operations',
                label: 'Headers',
                nameLabel: 'Header',
                nameSuggestions: HeaderSuggestions.names(),
                valueSuggestionsFor: HeaderSuggestions.valuesFor,
            },
            /* action: */ {
                operations: [
                    {
                        op: 'addOrUpdate',
                        name: 'Content-Type',
                        value: '',
                    },
                ],
            },
        );
        const inputs = [...control.querySelectorAll<HTMLInputElement>('tbody .suggestion-input input')];
        const value = inputs[1]!;

        // Act
        typeInto(value, 'text/p');

        // Assert
        expect(suggestionsOf(value)).toEqual(['text/plain']);
    });

    test('operations_WhenTheSpecHasNoValueSuggestions_ShouldUseAPlainValueInput', () => {
        // Arrange
        const spec: FieldSpec = {
            kind: FIELD_KIND.Operations,
            key: 'operations',
            label: 'Params',
        };

        // Act
        const control = controlOf(spec, {
            operations: [],
        });

        // Assert
        expect(control.querySelector('.suggestion-input')).toBeNull();
    });

    test('mediaType_WhenTyped_ShouldSuggestMediaTypeNames', () => {
        // Arrange
        const control = controlOf(
            /* spec: */ {
                kind: FIELD_KIND.MediaType,
                key: 'contentType',
                label: 'Content type',
            },
            /* action: */ {
                contentType: '',
            },
        );
        const input = control.querySelector<HTMLInputElement>('.suggestion-input input')!;

        // Act
        typeInto(input, 'application/problem');

        // Assert
        expect(suggestionsOf(input)).toEqual([
            'application/problem+json',
            'application/problem+xml',
        ]);
    });
});
