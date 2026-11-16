export const INSPECTION_STATE = Object.freeze({
    Idle: 1,
    Attaching: 2,
    Attached: 3,
    Detached: 4,
    Failed: 5,
} as const);

export type InspectionState = (typeof INSPECTION_STATE)[keyof typeof INSPECTION_STATE];
