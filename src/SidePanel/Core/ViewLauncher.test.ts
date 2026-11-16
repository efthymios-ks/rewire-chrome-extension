import { describe, expect, test } from 'vitest';
import { PanelStateFactory } from './PanelStateFactory';
import { Store } from './Store';
import { VIEW_ID } from './ViewId';
import { ViewLauncher } from './ViewLauncher';

describe('ViewLauncher', () => {
    test('openClient_WhenGivenARequest_ShouldSwitchToTheClientWithIt', () => {
        // Arrange
        const store = new Store(PanelStateFactory.initial());
        const snapshot = {
            method: 'GET',
            url: 'https://api.example.com/users',
            headers: [],
            body: null,
        };

        // Act
        new ViewLauncher(store).openClient(snapshot);

        // Assert
        const state = store.getState();
        expect(state.activeView).toBe(VIEW_ID.Client);
        expect(state.clientLaunch?.snapshot).toEqual(snapshot);
    });

    test('openJwt_WhenGivenAToken_ShouldSwitchToTheJwtTabWithIt', () => {
        // Arrange
        const store = new Store(PanelStateFactory.initial());

        // Act
        new ViewLauncher(store).openJwt('Bearer abc.def.ghi');

        // Assert
        const state = store.getState();
        expect(state.activeView).toBe(VIEW_ID.Jwt);
        expect(state.jwtLaunch?.token).toBe('Bearer abc.def.ghi');
    });
});
