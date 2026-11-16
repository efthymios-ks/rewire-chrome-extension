export interface LiveListening {
    webSockets: boolean;
    eventStreams: boolean;
    postMessages: boolean;
}

export type LiveListeningKind = keyof LiveListening;
