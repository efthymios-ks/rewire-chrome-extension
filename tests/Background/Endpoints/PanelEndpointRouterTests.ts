import { describe, expect, test } from "vitest";
import { KeepAliveEndpoint } from "../../../src/Background/Endpoints/KeepAlive/KeepAliveEndpoint";
import { PanelEndpointRouter } from "../../../src/Background/Endpoints/PanelEndpointRouter";
import type { PanelConnection } from "../../../src/Background/Features/PanelConnections/PanelConnection";
import { Result } from "../../../src/Common/Results/Result";
import { PanelCommandType } from "../../../src/Contracts/Messaging/PanelCommandType";

const context = {
    connection: {
        id: "connection-1",
        tabId: null,
    } as unknown as PanelConnection,
};

describe("PanelEndpointRouter", () => {
    test.each([
        [
            {
                correlationId: "abc",
                command: {
                    type: PanelCommandType.KeepAlive,
                },
            },
            true,
        ],
        [
            {
                correlationId: "abc",
            },
            false,
        ],
        [
            {
                correlationId: 1,
                command: {
                    type: 1,
                },
            },
            false,
        ],
        [
            null,
            false,
        ],
    ])("isPanelRequest_WhenMessageIs(%j)_ShouldValidateTheShape", (message, expected) => {
        // Arrange
        const router = new PanelEndpointRouter();

        // Act
        const isRequest = router.isPanelRequest(message);

        // Assert
        expect(isRequest).toBe(expected);
    });

    test("route_WhenItHandlesTheCommand_ShouldCallTheRegisteredEndpoint", async () => {
        // Arrange
        const router = new PanelEndpointRouter().register(new KeepAliveEndpoint());

        // Act
        const result = await router.route(
            {
                correlationId: "abc",
                command: {
                    type: PanelCommandType.KeepAlive,
                },
            },
            context
        );

        // Assert
        expect(result).toEqual(Result.done());
    });

    test("route_WhenNoEndpointHandlesTheCommand_ShouldFail", async () => {
        // Arrange
        const router = new PanelEndpointRouter();

        // Act
        const result = await router.route(
            {
                correlationId: "abc",
                command: {
                    type: PanelCommandType.ClearTimeline,
                    tabId: 7,
                },
            },
            context
        );

        // Assert
        expect(result).toEqual(Result.fail("No endpoint handles command 3."));
    });
});
