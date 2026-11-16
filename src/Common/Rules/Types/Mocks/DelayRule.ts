import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import { ActionReader } from '../ActionReader';
import { CommonFields } from '../CommonFields';
import type { FieldSpec } from '../FieldSpec';
import { RuleTypeBase } from '../RuleTypeBase';

const DEFAULT_DELAY_IN_MILLISECONDS = 2000;

interface DelayAction {
    delayMs: number;
}

export class DelayRule extends RuleTypeBase<DelayAction> {
    readonly id = RULE_TYPE_IDS.Delay;
    readonly category = RULE_CATEGORY.MocksAndResponses;
    readonly label = 'Latency';
    readonly description = 'Hold matching requests for up to 10 seconds before they go out.';
    override readonly handlesRequest = true;
    readonly fields: FieldSpec[] = [CommonFields.latency()];

    override delayOf(action: RuleAction): number {
        return ActionReader.delay(action);
    }

    protected defaults(): DelayAction {
        return {
            delayMs: DEFAULT_DELAY_IN_MILLISECONDS,
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
        return action.delayMs > 0 ? [] : ['Set a latency above 0.'];
    }
}
