import type { DnrCondition } from '../Criteria/DnrCondition';

export interface DnrRuleDraft {
    action: chrome.declarativeNetRequest.RuleAction;
    condition: DnrCondition;
}
