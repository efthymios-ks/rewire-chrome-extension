export const SIMULATION_OUTCOME = Object.freeze({
    Redirected: 1,
    NoMatch: 2,
    MissingGroup: 3,
    Unsupported: 4,
} as const);

export type SimulationOutcome = (typeof SIMULATION_OUTCOME)[keyof typeof SIMULATION_OUTCOME];
