export interface LiveListening {
    webSockets: boolean;
    eventStreams: boolean;
    postMessages: boolean;
}

export type LiveListeningKind = keyof LiveListening;

export const NoLiveListening: LiveListening = {
    webSockets: false,
    eventStreams: false,
    postMessages: false,
};
