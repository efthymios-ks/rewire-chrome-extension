import { describe, expect, test } from 'vitest';
import { ActiveProfile } from './ActiveProfile';
import { DEFAULT_PROFILE } from '../../Contracts/Settings/DefaultProfile';
import { aProfile, aRule, aSettings } from '../../TestData';

describe('ActiveProfile', () => {
    test('of_WhenTheActiveIdIsKnown_ShouldReturnThatProfile', () => {
        // Arrange
        const settings = aSettings({
            activeProfileId: 'staging',
            profiles: [
                aProfile({
                    id: 'local',
                }),
                aProfile({
                    id: 'staging',
                    rules: [aRule()],
                }),
            ],
        });

        // Act
        const rules = ActiveProfile.rules(settings);

        // Assert
        expect(ActiveProfile.of(settings).id).toBe('staging');
        expect(rules).toEqual([aRule()]);
    });

    test('of_WhenTheActiveIdIsUnknown_ShouldFallBackToTheFirstProfile', () => {
        // Arrange
        const settings = aSettings({
            activeProfileId: 'gone',
            profiles: [
                aProfile({
                    id: 'local',
                }),
            ],
        });

        // Act
        const profile = ActiveProfile.of(settings);

        // Assert
        expect(profile.id).toBe('local');
    });

    test('of_WhenThereAreNoProfiles_ShouldFallBackToTheDefaultProfile', () => {
        // Arrange
        const settings = aSettings({
            profiles: [],
        });

        // Act
        const variables = ActiveProfile.variables(settings);

        // Assert
        expect(ActiveProfile.of(settings)).toBe(DEFAULT_PROFILE);
        expect(variables).toEqual([]);
    });
});
