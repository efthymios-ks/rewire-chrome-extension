import type { RedirectDefinition, RedirectKind } from "./RedirectDefinition";
import type { Result } from "../Results/Result";
import type { CompiledRedirect } from "./CompiledRedirect";

export interface IRedirectKindCompiler {
    readonly kind: RedirectKind;
    compile(rule: RedirectDefinition): Result<CompiledRedirect>;
}
