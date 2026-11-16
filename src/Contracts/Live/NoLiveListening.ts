import type { LiveListening } from './LiveListening';

export const NO_LIVE_LISTENING: LiveListening = Object.freeze({
    webSockets: false,
    eventStreams: false,
    postMessages: false,
});
