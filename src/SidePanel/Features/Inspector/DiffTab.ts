import { JsonDiffer } from "../../../Common/Diff/JsonDiffer";
import { JsonText } from "../../../Common/Json/JsonText";
import { InMemoryRuleContext } from "../../../Common/Rules/Context/InMemoryRuleContext";
import { CriteriaEvaluator, CriteriaOutcome } from "../../../Common/Rules/Criteria/CriteriaEvaluator";
import { ActionReader } from "../../../Common/Rules/Types/ActionReader";
import { MockResponseKeys } from "../../../Common/Rules/Types/Mocks/MockResponseRule";
import type { Rule } from "../../../Contracts/Rules/Rule";
import { RuleTypeIds } from "../../../Contracts/Rules/RuleTypeIds";
import type { PanelSettings } from "../../../Contracts/Settings/PanelSettings";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { EmptyState } from "../../Core/Dom/EmptyState";
import { InspectorTabId } from "../../Core/InspectorTabId";
import type { PanelState } from "../../Core/PanelState";
import type { IInspectorTab } from "./IInspectorTab";
import { JsonDiffView } from "./JsonDiffView";

interface LiveSide {
    body: string;
    label: string;
}

function isMock(rule: Rule): boolean {
    return rule.type === RuleTypeIds.MockResponse && rule.action[MockResponseKeys.OverrideBody] !== false;
}

function matchesRequest(rule: Rule, detail: TimelineEntryDetail): boolean {
    const evaluation = CriteriaEvaluator.evaluate(
        rule.criteria,
        {
            request: {
                url: detail.summary.url,
                method: detail.summary.method,
                headers: detail.requestHeaders,
                body: detail.requestBody,
                resourceType: detail.summary.resourceType,
                response: null,
            },
            response: null,
        },
        new InMemoryRuleContext()
    );

    return evaluation.outcome === CriteriaOutcome.Matched;
}

function mockRuleOf(detail: TimelineEntryDetail, settings: PanelSettings): Rule | undefined {
    const appliedIds = detail.summary.appliedRules.map(applied => applied.ruleId);
    const applied = settings.rules.find(rule => isMock(rule) && appliedIds.includes(rule.id));
    if (applied !== undefined) {
        return applied;
    }

    return settings.rules.find(rule => isMock(rule) && matchesRequest(rule, detail));
}

function liveSideOf(detail: TimelineEntryDetail, rule: Rule): LiveSide {
    if (detail.summary.isAnsweredByRule) {
        return {
            body: ActionReader.text(rule.action, "baselineBody"),
            label: "Live payload captured when the mock was made, against the mock.",
        };
    }

    return {
        body: detail.responseBody ?? "",
        label: "Live payload of this request, against the mock.",
    };
}

export class DiffTab implements IInspectorTab {
    readonly id = InspectorTabId.Diff;
    readonly label = "Diff";

    keyOf(state: PanelState, detail: TimelineEntryDetail): string {
        const rule = mockRuleOf(detail, state.settings) ?? null;

        return `${state.detailVersion}|${JSON.stringify(rule)}`;
    }

    render(detail: TimelineEntryDetail, state: PanelState): HTMLElement {
        const rule = mockRuleOf(detail, state.settings);
        if (rule === undefined) {
            return EmptyState.build("Mock this request to compare the live payload with the mock.");
        }

        const live = liveSideOf(detail, rule);
        const before = JsonText.tryParse(live.body);
        const after = JsonText.tryParse(ActionReader.text(rule.action, "body"));
        if (before.hasErrors || after.hasErrors) {
            return EmptyState.build("The diff needs JSON on both sides.");
        }

        const diff = JsonDiffer.diff(before.value, after.value);

        return buildElement("div", {
            className: "diff-tab",
            children: [
                buildElement("p", {
                    className: "view-hint",
                    text: `${live.label} Rule: ${rule.name}.`,
                }),
                JsonDiffView.build(diff, JsonDiffer.summarize(diff)),
            ],
        });
    }
}
