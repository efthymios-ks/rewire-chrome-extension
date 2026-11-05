import { describe, expect, test, vi } from "vitest";
import { Result } from "../../../../src/Common/Results/Result";
import { InspectionState } from "../../../../src/Contracts/Inspection/InspectionState";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";
import type { InspectedTab } from "../../../../src/SidePanel/Core/InspectedTab";
import type { PanelState } from "../../../../src/SidePanel/Core/PanelState";
import { PanelStateFactory } from "../../../../src/SidePanel/Core/PanelStateFactory";
import { Store } from "../../../../src/SidePanel/Core/Store";
import type { IWorkerConnection } from "../../../../src/SidePanel/Core/WorkerConnection";
import { TimelineSync } from "../../../../src/SidePanel/Features/Traffic/TimelineSync";

const TabId = 7;
const NewTabUrl = "chrome://newtab/";
const ApiUrl = "https://jsonplaceholder.typicode.com/posts";

function aTab(url: string, title: string = ""): InspectedTab {
    return {
        tabId: TabId,
        url,
        title,
    };
}

function storeWith(state: InspectionState): Store<PanelState> {
    return new Store<PanelState>({
        ...PanelStateFactory.initial(),
        inspectedTab: aTab(NewTabUrl),
        inspection: {
            state,
            message: "",
        },
    });
}

function connectionMock(): { connection: IWorkerConnection; send: ReturnType<typeof vi.fn> } {
    const send = vi.fn().mockResolvedValue(Result.ok({
        status: {
            state: InspectionState.Attached,
            message: "",
        },
        entries: [],
    }));

    return {
        connection: {
            send,
            onEvent: vi.fn(),
            onReconnect: vi.fn(),
        } as unknown as IWorkerConnection,
        send,
    };
}

describe("TimelineSync", () => {
    test("updateTab_WhenAttachingFailedAndTheTabMovesToAnotherAddress_ShouldTryAgain", () => {
        // Arrange
        const { connection, send } = connectionMock();
        const sync = new TimelineSync(storeWith(InspectionState.Failed), connection);

        // Act
        sync.updateTab(aTab(ApiUrl));

        // Assert
        expect(send).toHaveBeenCalledWith({
            type: PanelCommandType.InspectTab,
            tabId: TabId,
        });
    });

    test("updateTab_WhenTheDebuggerIsAttached_ShouldOnlyUpdateTheTab", () => {
        // Arrange
        const { connection, send } = connectionMock();
        const store = storeWith(InspectionState.Attached);
        const sync = new TimelineSync(store, connection);

        // Act
        sync.updateTab(aTab(ApiUrl));

        // Assert
        expect(send).not.toHaveBeenCalled();
        expect(store.getState().inspectedTab?.url).toBe(ApiUrl);
    });

    test("updateTab_WhenOnlyTheTitleChanges_ShouldNotTryAgain", () => {
        // Arrange
        const { connection, send } = connectionMock();
        const sync = new TimelineSync(storeWith(InspectionState.Failed), connection);

        // Act
        sync.updateTab(aTab(NewTabUrl, "New Tab"));

        // Assert
        expect(send).not.toHaveBeenCalled();
    });
});
