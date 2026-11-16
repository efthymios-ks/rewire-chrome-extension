import { describe, expect, test } from 'vitest';
import { JsonTreeView } from './JsonTreeView';

const MAX_CHILDREN = 500;

function rootNodeOf(tree: HTMLElement): HTMLElement {
    return tree.firstElementChild as HTMLElement;
}

function childrenOf(node: HTMLElement): HTMLElement[] {
    return [...node.children].filter(child => child.tagName !== 'SUMMARY') as HTMLElement[];
}

describe('JsonTreeView', () => {
    test('build_WhenWrapIsOn_ShouldMarkTheTreeAsWrapping', () => {
        // Arrange
        const shouldWrap = true;

        // Act
        const tree = JsonTreeView.build({}, shouldWrap);

        // Assert
        expect(tree.hasAttribute('data-wrap')).toBe(true);
    });

    test('build_WhenWrapIsOff_ShouldNotMarkTheTree', () => {
        // Arrange
        const shouldWrap = false;

        // Act
        const tree = JsonTreeView.build({}, shouldWrap);

        // Assert
        expect(tree.hasAttribute('data-wrap')).toBe(false);
    });

    test.each([
        [
            'text',
            '"text"',
            'json-string',
        ],
        [
            42,
            '42',
            'json-number',
        ],
        [
            true,
            'true',
            'json-boolean',
        ],
        [
            null,
            'null',
            'json-null',
        ],
    ])('build_WhenTheValueIsThePrimitive%s_ShouldShowItAsATypedLeaf', (
        value,
        text,
        className,
    ) => {
        // Arrange
        const json = value;

        // Act
        const tree = JsonTreeView.build(json, false);

        // Assert
        const leaf = rootNodeOf(tree);
        expect(leaf.className).toBe('json-leaf');
        expect(leaf.querySelector('.json-key')).toBeNull();
        expect(leaf.querySelector(`.${className}`)?.textContent).toBe(text);
    });

    test('build_WhenTheValueIsAnObject_ShouldShowItsSizeAndKeyedChildren', () => {
        // Arrange
        const json = {
            id: 42,
            name: 'Ada',
        };

        // Act
        const tree = JsonTreeView.build(json, false);

        // Assert
        const node = rootNodeOf(tree);
        expect(node.tagName).toBe('DETAILS');
        expect(node.querySelector('summary')?.textContent).toBe('{2}');
        expect(childrenOf(node).map(child => child.textContent)).toEqual([
            'id: 42',
            'name: "Ada"',
        ]);
    });

    test('build_WhenTheValueIsAnArray_ShouldShowItsLengthAndIndexedChildren', () => {
        // Arrange
        const json = [
            'a',
            'b',
        ];

        // Act
        const tree = JsonTreeView.build(json, false);

        // Assert
        const node = rootNodeOf(tree);
        expect(node.querySelector('summary')?.textContent).toBe('[2]');
        expect(childrenOf(node).map(child => child.textContent)).toEqual([
            '0: "a"',
            '1: "b"',
        ]);
    });

    test('build_WhenNested_ShouldOpenTheTopTwoLevelsOnly', () => {
        // Arrange
        const json = {
            user: {
                address: {
                    city: 'Athens',
                },
            },
        };

        // Act
        const tree = JsonTreeView.build(json, false);

        // Assert
        const nodes = [...tree.querySelectorAll('details')];
        expect(nodes.map(node => node.open)).toEqual([
            true,
            true,
            false,
        ]);
        expect(nodes[1]?.querySelector('summary')?.textContent).toBe('user: {1}');
    });

    test('build_WhenAContainerHasTooManyChildren_ShouldCapThemAndSayHowManyAreHidden', () => {
        // Arrange
        const json = Array.from({
            length: MAX_CHILDREN + 3,
        }, (_value, index) => index);

        // Act
        const tree = JsonTreeView.build(json, false);

        // Assert
        const node = rootNodeOf(tree);
        expect(node.querySelectorAll('.json-leaf')).toHaveLength(MAX_CHILDREN);
        expect(node.querySelector('.json-overflow')?.textContent).toBe('3 more not shown');
    });

    test('build_WhenAContainerIsWithinTheCap_ShouldNotMentionHiddenChildren', () => {
        // Arrange
        const json = [1];

        // Act
        const tree = JsonTreeView.build(json, false);

        // Assert
        expect(tree.querySelector('.json-overflow')).toBeNull();
    });
});
