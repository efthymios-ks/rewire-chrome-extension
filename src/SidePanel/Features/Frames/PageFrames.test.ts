import { describe, expect, test } from 'vitest';
import type { EntryFrame } from '../../../Contracts/Timeline/EntryFrame';
import { FRAME_FILTERS } from '../../Core/FrameFilters';
import { PageFrames } from './PageFrames';

interface AFrameOptions {
    id: string;
    url: string;
    isTop?: boolean;
}

function aFrame({ id, url, isTop = false }: AFrameOptions): EntryFrame {
    return {
        id,
        url,
        isTop,
    };
}

describe('PageFrames', () => {
    test('of_WhenCallsComeFromSeveralFrames_ShouldListEachIframeOnceByHostAndPath', () => {
        // Arrange
        const frames = [
            aFrame({ id: 'top-frame', url: 'https://app.example.com/', isTop: true }),
            aFrame({ id: 'iframe-1', url: 'https://pay.example.com/start' }),
            null,
            aFrame({ id: 'iframe-2', url: 'https://pay.example.com/other' }),
            aFrame({ id: 'iframe-1', url: 'https://pay.example.com/confirm' }),
        ];

        // Act
        const pageFrames = PageFrames.of(frames);

        // Assert
        expect(pageFrames).toEqual([
            {
                id: 'iframe-1',
                url: 'https://pay.example.com/confirm',
                label: 'pay.example.com · /confirm',
            },
            {
                id: 'iframe-2',
                url: 'https://pay.example.com/other',
                label: 'pay.example.com · /other',
            },
        ]);
    });

    test('of_WhenSameSiteIframesSitBesideTheTopFrame_ShouldTellThemApartByPath', () => {
        // Arrange
        const frames = [
            aFrame({ id: 'top-frame', url: 'https://app.example.com/dashboard', isTop: true }),
            aFrame({ id: 'iframe-1', url: 'https://app.example.com/widgets/chart' }),
            aFrame({ id: 'iframe-2', url: 'https://app.example.com/widgets/table' }),
            aFrame({ id: 'iframe-3', url: 'https://app.example.com/' }),
        ];

        // Act
        const labels = PageFrames.of(frames).map(frame => frame.label);

        // Assert
        expect(labels).toEqual([
            'app.example.com · /widgets/chart',
            'app.example.com · /widgets/table',
            'app.example.com',
        ]);
    });

    test('of_WhenIframesShareHostAndPath_ShouldNumberTheLaterOnesInFrameOrder', () => {
        // Arrange
        const frames = [
            aFrame({ id: 'iframe-1', url: 'https://ads.example.net/slot?id=1' }),
            aFrame({ id: 'iframe-2', url: 'https://ads.example.net/slot?id=2' }),
            aFrame({ id: 'iframe-3', url: 'https://ads.example.net/slot#bottom' }),
        ];

        // Act
        const labels = PageFrames.of(frames).map(frame => frame.label);

        // Assert
        expect(labels).toEqual([
            'ads.example.net · /slot',
            'ads.example.net · /slot (2)',
            'ads.example.net · /slot (3)',
        ]);
    });

    test.each([
        [
            'https://pay.example.com/checkout?step=2&token=abc',
            'pay.example.com · /checkout',
        ],
        [
            'http://localhost:3000/embed',
            'localhost:3000 · /embed',
        ],
        [
            'https://cdn.example.com/static/widgets/payment/v3/index.html',
            'cdn.example.com · /…/payment/v3/index.html',
        ],
        [
            'https://cdn.example.com/embed/aVeryLongTokenThatNeverEnds',
            'cdn.example.com · /…LongTokenThatNeverEnds',
        ],
        [
            'about:blank',
            'about:blank',
        ],
        [
            'chrome-extension://abcdefgh/popup.html',
            'abcdefgh',
        ],
    ])('of_WhenTheIframeUrlIs(%s)_ShouldLabelIt(%s)', (url, expected) => {
        // Arrange
        const frames = [aFrame({ id: 'iframe-1', url })];

        // Act
        const labels = PageFrames.of(frames).map(frame => frame.label);

        // Assert
        expect(labels).toEqual([expected]);
    });

    test.each([
        [
            FRAME_FILTERS.All,
            [
                true,
                true,
                true,
            ],
        ],
        [
            FRAME_FILTERS.Top,
            [
                true,
                false,
                true,
            ],
        ],
        [
            'iframe-1',
            [
                false,
                true,
                false,
            ],
        ],
    ])('accepts_WhenTheFilterIs(%s)_ShouldKeepTheMatchingCalls', (filter, expected) => {
        // Arrange
        const frames = [
            aFrame({ id: 'top-frame', url: 'https://app.example.com/', isTop: true }),
            aFrame({ id: 'iframe-1', url: 'https://pay.example.com/' }),
            null,
        ];

        // Act
        const accepted = frames.map(frame => PageFrames.accepts(frame, filter));

        // Assert
        expect(accepted).toEqual(expected);
    });

    test.each([
        'constructor',
        '__proto__',
        'toString',
    ])('accepts_WhenAFrameIdIsAnObjectPrototypeKey(%s)_ShouldMatchOnlyThatFrame', filter => {
        // Arrange
        const frames = [
            aFrame({ id: filter, url: 'https://pay.example.com/' }),
            aFrame({ id: 'iframe-1', url: 'https://ads.example.com/' }),
            null,
        ];

        // Act
        const accepted = frames.map(frame => PageFrames.accepts(frame, filter));

        // Assert
        expect(accepted).toEqual([
            true,
            false,
            false,
        ]);
        expect(PageFrames.isFixed(filter)).toBe(false);
    });
});
