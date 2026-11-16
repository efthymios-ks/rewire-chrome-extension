import { describe, expect, test, vi } from 'vitest';
import { TesterForm } from './TesterForm';
import { controlNamed, typeInto } from '../../../PanelTestData';

const SAMPLE_URL = 'https://api.example.com/api/v1/users/42';

function selectsOf(form: TesterForm): HTMLSelectElement[] {
    return [...form.root.querySelectorAll<HTMLSelectElement>('.field-row select')];
}

function pick(select: HTMLSelectElement | undefined, value: string): void {
    select!.value = value;
    select!.dispatchEvent(new Event('change'));
}

describe('TesterForm', () => {
    test('input_WhenUntouched_ShouldDescribeAGetFetchWithA200SampleResponse', () => {
        // Arrange
        const form = new TesterForm(SAMPLE_URL, vi.fn());

        // Act
        const input = form.input();

        // Assert
        expect(input).toEqual({
            url: SAMPLE_URL,
            method: 'GET',
            headers: [],
            body: null,
            resourceType: 'Fetch',
            response: {
                status: 200,
                headers: [],
                body: '',
            },
        });
        expect(controlNamed<HTMLInputElement>(form.root, 'URL').value).toBe(SAMPLE_URL);
        expect(selectsOf(form).map(select => select.value)).toEqual([
            'GET',
            'Fetch',
        ]);
    });

    test('url_WhenTyped_ShouldUpdateTheInputAndNotify', () => {
        // Arrange
        const onChange = vi.fn();
        const form = new TesterForm(SAMPLE_URL, onChange);

        // Act
        typeInto(controlNamed(form.root, 'URL'), 'https://api.example.com/orders');

        // Assert
        expect(form.input().url).toBe('https://api.example.com/orders');
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    test('method_WhenPicked_ShouldUpdateTheInputAndNotify', () => {
        // Arrange
        const onChange = vi.fn();
        const form = new TesterForm(SAMPLE_URL, onChange);

        // Act
        pick(selectsOf(form)[0], 'DELETE');

        // Assert
        expect(form.input().method).toBe('DELETE');
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    test('resourceType_WhenPicked_ShouldUseItsDebuggerType', () => {
        // Arrange
        const onChange = vi.fn();
        const form = new TesterForm(SAMPLE_URL, onChange);

        // Act
        pick(selectsOf(form)[1], 'Document');

        // Assert
        expect(form.input().resourceType).toBe('Document');
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    test('requestHeaders_WhenTyped_ShouldParseOneHeaderPerLine', () => {
        // Arrange
        const form = new TesterForm(SAMPLE_URL, vi.fn());

        // Act
        typeInto(controlNamed(form.root, 'Request headers'), 'Accept: application/json\nX-Trace: abc');

        // Assert
        expect(form.input().headers).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
            {
                name: 'X-Trace',
                value: 'abc',
            },
        ]);
    });

    test.each([
        [
            '{"id":42}',
            '{"id":42}',
        ],
        [
            '',
            null,
        ],
    ])('requestBody_WhenTyped(%s)_ShouldSetTheBodyTo(%s)', (value, body) => {
        // Arrange
        const form = new TesterForm(SAMPLE_URL, vi.fn());
        typeInto(controlNamed(form.root, 'Request body'), 'draft');

        // Act
        typeInto(controlNamed(form.root, 'Request body'), value);

        // Assert
        expect(form.input().body).toBe(body);
    });

    test.each([
        [
            '404',
            404,
        ],
        [
            '0',
            200,
        ],
        [
            '',
            200,
        ],
    ])('responseStatus_WhenTyped(%s)_ShouldSetTheStatusTo(%s)', (value, status) => {
        // Arrange
        const form = new TesterForm(SAMPLE_URL, vi.fn());

        // Act
        typeInto(controlNamed(form.root, 'Response status'), value);

        // Assert
        expect(form.input().response?.status).toBe(status);
    });

    test('sampleResponse_WhenHeadersAndBodyAreTyped_ShouldFillTheResponse', () => {
        // Arrange
        const onChange = vi.fn();
        const form = new TesterForm(SAMPLE_URL, onChange);
        typeInto(controlNamed(form.root, 'Response headers'), 'Content-Type: text/plain');

        // Act
        typeInto(controlNamed(form.root, 'Response body'), 'hello');

        // Assert
        expect(form.input().response).toEqual({
            status: 200,
            headers: [
                {
                    name: 'Content-Type',
                    value: 'text/plain',
                },
            ],
            body: 'hello',
        });
        expect(onChange).toHaveBeenCalledTimes(2);
    });

    test('input_WhenTheReturnedCopyIsChanged_ShouldKeepTheFormInput', () => {
        // Arrange
        const form = new TesterForm(SAMPLE_URL, vi.fn());
        const copy = form.input();

        // Act
        copy.url = 'https://changed.example.com/';
        copy.response!.status = 500;

        // Assert
        expect(form.input().url).toBe(SAMPLE_URL);
        expect(form.input().response?.status).toBe(200);
    });
});
