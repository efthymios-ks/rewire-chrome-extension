import type { Protocol } from 'devtools-protocol';
import { HeaderLookup } from '../../../Common/Http/HeaderLookup';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { BrowserRuleSimulator } from './BrowserRuleSimulator';
import type { TimelineStore } from './TimelineStore';
import type { TimelineRecordClassifier } from './TimelineRecordClassifier';

export interface ResponseReceivedHandlerDependencies {
    timelineStore: TimelineStore;
    recordClassifier: TimelineRecordClassifier;
    browserRuleSimulator: BrowserRuleSimulator;
}

export class ResponseReceivedHandler implements CdpEventHandler<'Network.responseReceived'> {
    readonly event = 'Network.responseReceived';

    private readonly _dependencies: ResponseReceivedHandlerDependencies;

    constructor(dependencies: ResponseReceivedHandlerDependencies) {
        this._dependencies = dependencies;
    }

    async handleAsync(tabId: number, event: Protocol.Network.ResponseReceivedEvent): Promise<void> {
        const { timelineStore, recordClassifier, browserRuleSimulator } = this._dependencies;
        const record = timelineStore.get(tabId, event.requestId);
        if (record == null) {
            return;
        }

        const responseHeaders = HeaderLookup.fromRecord(event.response.headers);
        timelineStore.update({
            tabId,
            entryId: event.requestId,
            change: current => recordClassifier.reclassify({
                ...current,
                responseHeaders,
                summary: {
                    ...current.summary,
                    statusCode: event.response.status,
                    statusText: event.response.statusText,
                    mimeType: event.response.mimeType,
                },
            }),
        });

        if (record.summary.isAnsweredByRule) {
            return;
        }

        const annotation = browserRuleSimulator.simulateResponse({
            record,
            status: event.response.status,
            headers: responseHeaders,
        });
        if (annotation != null) {
            timelineStore.annotate({ tabId, entryId: event.requestId, annotation });
        }
    }
}
