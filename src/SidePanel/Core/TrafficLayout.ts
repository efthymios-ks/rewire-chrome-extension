export const TRAFFIC_LAYOUT = Object.freeze({
    List: 1,
    Waterfall: 2,
} as const);

export type TrafficLayout = (typeof TRAFFIC_LAYOUT)[keyof typeof TRAFFIC_LAYOUT];
