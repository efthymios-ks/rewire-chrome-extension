import { describe, expect, test, vi } from 'vitest';
import { buildElement } from './buildElement';
import { click } from '../../PanelTestData';

describe('buildElement', () => {
    test('buildElement_WhenNoOptionsAreGiven_ShouldCreateABareElement', () => {
        // Arrange
        const tagName = 'section';

        // Act
        const element = buildElement(tagName);

        // Assert
        expect(element.tagName).toBe('SECTION');
        expect(element.className).toBe('');
        expect(element.textContent).toBe('');
        expect(element.hasAttribute('title')).toBe(false);
    });

    test('buildElement_WhenOptionsAreGiven_ShouldApplyClassTextTitleAndAttributes', () => {
        // Arrange
        const options = {
            className: 'badge',
            text: '3 rules',
            title: 'Active rules',
            attributes: {
                role: 'status',
                'data-state': 'on',
            },
        };

        // Act
        const element = buildElement('span', options);

        // Assert
        expect(element.className).toBe('badge');
        expect(element.textContent).toBe('3 rules');
        expect(element.title).toBe('Active rules');
        expect(element.getAttribute('role')).toBe('status');
        expect(element.dataset.state).toBe('on');
    });

    test('buildElement_WhenChildrenIncludeNull_ShouldAppendOnlyNodesAndText', () => {
        // Arrange
        const child = buildElement('b', {
            text: 'GET',
        });

        // Act
        const element = buildElement('p', {
            children: [
                child,
                null,
                ' /api',
            ],
        });

        // Assert
        expect(element.childNodes).toHaveLength(2);
        expect(element.firstChild).toBe(child);
        expect(element.textContent).toBe('GET /api');
    });

    test('buildElement_WhenListenersAreGiven_ShouldWireThem', () => {
        // Arrange
        const onClick = vi.fn();
        const element = buildElement('button', {
            listeners: {
                click: onClick,
            },
        });

        // Act
        click(element);

        // Assert
        expect(onClick).toHaveBeenCalledOnce();
    });
});
