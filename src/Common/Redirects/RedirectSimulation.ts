import type { SimulationOutcome } from "./SimulationOutcome";

export interface RedirectSimulation {
    url: string;
    outcome: SimulationOutcome;
    resultUrl: string | null;
    message: string;
}
