import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import { ActionReader } from "../ActionReader";
import { CommonFields, type FieldSpec } from "../FieldSpec";
import { RuleTypeBase } from "../RuleTypeBase";

const DefaultDelayInMilliseconds = 2000;

interface DelayAction {
    delayMs: number;
}

export class DelayRule extends RuleTypeBase<DelayAction> {
    readonly id = RuleTypeIds.Delay;
    readonly category = RuleCategory.MocksAndResponses;
    readonly label = "Latency";
    readonly description = "Hold matching requests for up to 10 seconds before they go out.";
    override readonly handlesRequest = true;
    readonly fields: FieldSpec[] = [CommonFields.latency()];

    override delayOf(action: RuleAction): number {
        return ActionReader.delay(action);
    }

    protected defaults(): DelayAction {
        return {
            delayMs: DefaultDelayInMilliseconds,
        };
    }

    protected read(action: RuleAction): DelayAction {
        return {
            delayMs: ActionReader.delay(action),
        };
    }

    protected describe(action: DelayAction): string {
        return `${action.delayMs} ms`;
    }

    protected override check(action: DelayAction): string[] {
        return action.delayMs > 0 ? [] : ["Set a latency above 0."];
    }
}
