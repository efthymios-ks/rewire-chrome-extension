import type { DnrCondition } from "../Criteria/DnrFragment";

export interface DnrRuleDraft {
    action: chrome.declarativeNetRequest.RuleAction;
    condition: DnrCondition;
}
