import type { Protocol } from 'devtools-protocol';
import { HeaderLookup } from '../../../Common/Http/HeaderLookup';
import type { Logger } from '../../../Common/Logging/Logger';
import type { DebuggerClient } from '../Debugging/DebuggerClient';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { BrowserRuleSimulator } from './BrowserRuleSimulator';
import type { CaptureFilter } from './CaptureFilter';
import type { TimelineStore } from './TimelineStore';
import { RequestBodyDecoder } from './RequestBodyDecoder';
import { RequestPostData } from './RequestPostData';
import type { TimelineAdmission } from './TimelineAdmission';
import type { TimelineRecord } from './TimelineRecord';
import type { TimelineRecordClassifier } from './TimelineRecordClassifier';
import type { TimelineRecordFactory } from './TimelineRecordFactory';

interface AddRedirectLegOptions {
    tabId: number;
    base: TimelineRecord;
    event: Protocol.Network.RequestWillBeSentEvent;
    redirectResponse: Protocol.Network.Response;
}

export interface RequestWillBeSentHandlerDependencies {
    timelineStore: TimelineStore;
    admission: TimelineAdmission;
    captureFilter: CaptureFilter;
    recordFactory: TimelineRecordFactory;
    recordClassifier: TimelineRecordClassifier;
    browserRuleSimulator: BrowserRuleSimulator;
    debuggerClient: DebuggerClient;
    logger: Logger;
}

export class RequestWillBeSentHandler implements CdpEventHandler<'Network.requestWillBeSent'> {
    readonly event = 'Network.requestWillBeSent';

    private readonly _dependencies: RequestWillBeSentHandlerDependencies;

    constructor(dependencies: RequestWillBeSentHandlerDependencies) {
        this._dependencies = dependencies;
    }

    async handleAsync(tabId: number, event: Protocol.Network.RequestWillBeSentEvent): Promise<void> {
        const {
            timelineStore,
            admission,
            captureFilter,
            recordFactory,
            browserRuleSimulator,
        } = this._dependencies;
        const existing = timelineStore.get(tabId, event.requestId);
        if (existing != null && event.redirectResponse != null) {
            // Admission already simulated the first hop; only later hops start without annotations.
            const annotation = existing.summary.redirectedFromUrl == null
                ? null
                : browserRuleSimulator.simulateRequest(existing);
            if (annotation != null) {
                timelineStore.annotate({ tabId, entryId: event.requestId, annotation });
            }

            this.addRedirectLeg({
                tabId,
                base: timelineStore.get(tabId, event.requestId) ?? existing,
                event,
                redirectResponse: event.redirectResponse,
            });
            timelineStore.update({
                tabId,
                entryId: event.requestId,
                change: record => recordFactory.redirect(record, event),
            });

            return;
        }

        if (existing != null || !captureFilter.shouldCapture(event.type)) {
            return;
        }

        admission.admit(recordFactory.create(tabId, event));
        await this.decodeRequestBodyAsync(tabId, event);
    }

    private addRedirectLeg({ tabId, base, event, redirectResponse }: AddRedirectLegOptions): void {
        const { timelineStore, recordFactory } = this._dependencies;
        timelineStore.addLeg({
            tabId,
            baseId: event.requestId,
            make: legId => recordFactory.toCompletedLeg({
                base,
                legId,
                response: redirectResponse,
                endedTimestamp: event.timestamp,
            }),
        });
    }

    private async decodeRequestBodyAsync(
        tabId: number,
        event: Protocol.Network.RequestWillBeSentEvent,
    ): Promise<void> {
        const { timelineStore, recordClassifier } = this._dependencies;
        const headers = HeaderLookup.fromRecord(event.request.headers);
        const inlineBytes = RequestPostData.bytesOf(event.request);
        // The factory already decoded inline bodies that need no decompression.
        if (inlineBytes != null && !RequestBodyDecoder.isCompressed({ bytes: inlineBytes, headers })) {
            return;
        }

        const bytes = inlineBytes ?? await this.fetchPostDataAsync(tabId, event);
        if (bytes == null) {
            return;
        }

        const captured = await RequestBodyDecoder.decodeAsync({ bytes, headers });
        timelineStore.update({
            tabId,
            entryId: event.requestId,
            change: record => recordClassifier.reclassify({
                ...record,
                ...captured,
            }),
        });
    }

    private async fetchPostDataAsync(
        tabId: number,
        event: Protocol.Network.RequestWillBeSentEvent,
    ): Promise<Uint8Array | null> {
        if (event.request.hasPostData !== true || event.request.postData != null) {
            return null;
        }

        const { debuggerClient, logger } = this._dependencies;
        const postData = await debuggerClient.sendAsync(
            /* tabId: */ tabId,
            /* command: */ 'Network.getRequestPostData',
            /* params: */ {
                requestId: event.requestId,
            },
        );
        if (postData.hasErrors) {
            logger.warn(postData.error);

            return null;
        }

        return RequestPostData.fetchedBytesOf(postData.value);
    }
}
