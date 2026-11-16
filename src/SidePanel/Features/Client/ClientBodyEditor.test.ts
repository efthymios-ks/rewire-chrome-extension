import { describe, expect, test } from 'vitest';
import { ClientBodies } from './ClientBodies';
import type { ClientBody } from './ClientBody';
import { ClientBodyEditor } from './ClientBodyEditor';
import { CLIENT_BODY_TYPE } from './ClientBodyType';
import { buttonNamed, click, typeInto } from '../../PanelTestData';

function aBody(changes: Partial<ClientBody> = {}): ClientBody {
    return {
        ...ClientBodies.empty(),
        ...changes,
    };
}

function tabNamed(editor: ClientBodyEditor, label: string): HTMLButtonElement {
    return [...editor.root.querySelectorAll<HTMLButtonElement>('.client-body-tabs .tab')]
        .find(tab => tab.textContent === label)!;
}

describe('ClientBodyEditor', () => {
    test('constructor_WhenBuilt_ShouldOfferEveryBodyTypeAsATab', () => {
        // Arrange
        const body = aBody();

        // Act
        const editor = new ClientBodyEditor(body);

        // Assert
        const tabLabels = [...editor.root.querySelectorAll('.client-body-tabs .tab')]
            .map(tab => tab.textContent);
        expect(tabLabels).toEqual([
            'None',
            'Text',
            'JSON',
            'XML',
            'Form URL-encoded',
            'Multipart form',
            'Binary',
            'GraphQL',
        ]);
        expect(tabNamed(editor, 'None').getAttribute('aria-selected')).toBe('true');
    });

    test('tab_WhenJsonIsPickedAndFormatted_ShouldKeepTheIndentedText', () => {
        // Arrange
        const editor = new ClientBodyEditor(aBody());
        click(tabNamed(editor, 'JSON'));
        typeInto(
            /* input: */ editor.root.querySelector('textarea')!,
            /* value: */ '{"a":1}',
        );

        // Act
        click(buttonNamed(editor.root, 'Format'));

        // Assert
        const body = editor.current();
        expect(body.type).toBe(CLIENT_BODY_TYPE.Json);
        expect(body.text).toBe('{\n  "a": 1\n}');
    });

    test('tab_WhenTextIsPicked_ShouldOfferNoFormatButton', () => {
        // Arrange
        const editor = new ClientBodyEditor(aBody());

        // Act
        click(tabNamed(editor, 'Text'));

        // Assert
        const hasFormatButton = [...editor.root.querySelectorAll('button')]
            .some(button => button.textContent === 'Format');
        expect(hasFormatButton).toBe(false);
    });

    test('formRows_WhenTyped_ShouldShowInTheCurrentBody', () => {
        // Arrange
        const editor = new ClientBodyEditor(aBody({
            type: CLIENT_BODY_TYPE.FormUrlEncoded,
        }));
        const [name, value] = [...editor.root.querySelectorAll<HTMLInputElement>('.client-row input')];

        // Act
        typeInto(name!, 'q');
        typeInto(value!, 'ada');

        // Assert
        expect(editor.current().formRows).toEqual([
            {
                name: 'q',
                value: 'ada',
            },
        ]);
    });

    test('multipartRow_WhenSwitchedToFile_ShouldShowAFilePicker', () => {
        // Arrange
        const editor = new ClientBodyEditor(aBody({
            type: CLIENT_BODY_TYPE.Multipart,
        }));
        const kind = editor.root.querySelector<HTMLSelectElement>('.client-part-kind')!;

        // Act
        kind.value = 'file';
        kind.dispatchEvent(new Event('change'));

        // Assert
        expect(editor.root.querySelector('input[type=file]')).not.toBeNull();
        expect(editor.current().multipartRows[0]?.isFile).toBe(true);
    });

    test('binary_WhenAFileWasNamedButNotPicked_ShouldHintAtIt', () => {
        // Arrange
        const body = aBody({
            type: CLIENT_BODY_TYPE.Binary,
            fileName: 'payload.bin',
        });

        // Act
        const editor = new ClientBodyEditor(body);

        // Assert
        const hint = editor.root.querySelector<HTMLElement>('.client-file-hint')!;
        expect(hint.hidden).toBe(false);
        expect(hint.textContent).toBe('Pick payload.bin');
    });

    test('binary_WhenAFileIsPicked_ShouldKeepItAndHideTheHint', () => {
        // Arrange
        const editor = new ClientBodyEditor(aBody({
            type: CLIENT_BODY_TYPE.Binary,
            fileName: 'payload.bin',
        }));
        const input = editor.root.querySelector<HTMLInputElement>('input[type=file]')!;
        const file = new File(['data'], 'payload.bin');
        Object.defineProperty(
            /* o: */ input,
            /* p: */ 'files',
            /* attributes: */ {
                value: [file],
            },
        );

        // Act
        input.dispatchEvent(new Event('change'));

        // Assert
        expect(editor.current().file).toBe(file);
        expect(editor.root.querySelector<HTMLElement>('.client-file-hint')!.hidden).toBe(true);
    });

    test('fill_WhenGivenAGraphQlBody_ShouldShowTheQuery', () => {
        // Arrange
        const editor = new ClientBodyEditor(aBody());

        // Act
        editor.fill(aBody({
            type: CLIENT_BODY_TYPE.GraphQl,
            graphQlQuery: '{ users { id } }',
        }));

        // Assert
        expect(editor.root.querySelector('textarea')!.value).toBe('{ users { id } }');
        expect(tabNamed(editor, 'GraphQL').getAttribute('aria-selected')).toBe('true');
    });
});
