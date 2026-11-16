import { describe, expect, test } from 'vitest';
import { DnrConditionMerge } from './DnrConditionMerge';

describe('DnrConditionMerge', () => {
    test('merge_WhenBothSidesFilterTheUrl_ShouldFail', () => {
        // Arrange
        const condition = {
            urlFilter: '||example.com',
        };
        const patch = {
            regexFilter: '^https://.*$',
        };

        // Act
        const merged = DnrConditionMerge.merge(condition, patch);

        // Assert
        expect(merged).toEqual({
            hasErrors: true,
            error: 'With more than one URL, path, extension, host pattern or query condition the rule works on the inspected tab only.',
        });
    });

    test('merge_WhenAnExclusionCoversAnIncludedHost_ShouldDropThatHostAndKeepTheExclusion', () => {
        // Arrange
        const condition = {
            requestDomains: [
                'example.com',
                'api.example.com',
            ],
        };
        const patch = {
            excludedRequestDomains: ['api.example.com'],
        };

        // Act
        const merged = DnrConditionMerge.merge(condition, patch);

        // Assert
        expect(merged).toEqual({
            hasErrors: false,
            value: {
                requestDomains: ['example.com'],
                excludedRequestDomains: ['api.example.com'],
            },
        });
    });

    test('merge_WhenExclusionsCoverEveryIncludedHost_ShouldFailAsNeverMatching', () => {
        // Arrange
        const condition = {
            requestDomains: ['api.example.com'],
        };
        const patch = {
            excludedRequestDomains: ['example.com'],
        };

        // Act
        const merged = DnrConditionMerge.merge(condition, patch);

        // Assert
        expect(merged).toEqual({
            hasErrors: true,
            error: 'These conditions can never match the same request, so the rule never applies.',
        });
    });

    test('merge_WhenAListIsEmpty_ShouldNeverEmitIt', () => {
        // Arrange
        const condition = {};
        const patch = {
            excludedRequestDomains: [],
        };

        // Act
        const merged = DnrConditionMerge.merge(condition, patch);

        // Assert
        expect(merged).toEqual({
            hasErrors: false,
            value: {},
        });
    });
});
