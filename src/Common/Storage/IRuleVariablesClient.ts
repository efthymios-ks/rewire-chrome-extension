import type { ProfileVariable } from "../../Contracts/Settings/ProfileVariable";
import type { Result } from "../Results/Result";

export interface IRuleVariablesClient {
    load(): Promise<Result<ProfileVariable[]>>;
    subscribe(listener: (variables: ProfileVariable[]) => void): void;
}
