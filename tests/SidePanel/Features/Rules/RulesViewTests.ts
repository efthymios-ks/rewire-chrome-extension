import { describe, expect, test } from "vitest";
import { RuleTypeIds } from "../../../../src/Contracts/Rules/RuleTypeIds";
import { RulesView } from "../../../../src/SidePanel/Features/Rules/RulesView";
import { aRule, aSettingsWithRules } from "../../../TestData";
import { aPanelHarness, buttonNamed, click, nextRender, typeInto } from "../../PanelTestData";

describe("RulesView", () => {
    test("constructor_WhenBuilt_ShouldPutAddAndSearchOnTopAndTestAndTransferBelow", () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const view = new RulesView(harness.context);

        // Assert
        const rows = view.root.querySelectorAll(".rules-toolbar > .rules-toolbar-row");
        expect(rows).toHaveLength(2);
        expect(rows[0]?.textContent).toContain("Add rule");
        expect(rows[0]?.querySelector(".rule-search")).not.toBeNull();
        expect(rows[1]?.textContent).toBe("Test rulesProfilesVariablesImport / export");
        expect(view.root.querySelector(".rules-toolbar select")).toBeNull();
    });

    test("search_WhenTyped_ShouldKeepRulesByNameWhateverTheirType", async () => {
        // Arrange
        const harness = aPanelHarness({
            settings: aSettingsWithRules([
                aRule({
                    id: "users-mock",
                    name: "Users mock",
                }),
                aRule({
                    id: "users-delay",
                    name: "Users delay",
                    type: RuleTypeIds.Delay,
                }),
                aRule({
                    id: "orders-mock",
                    name: "Orders mock",
                }),
            ]),
        });
        const view = new RulesView(harness.context);

        // Act
        typeInto(view.root.querySelector<HTMLInputElement>(".rule-search")!, "users");
        await nextRender();

        // Assert
        const names = [...view.root.querySelectorAll(".rule-row")].map(row => row.textContent ?? "");
        expect(names).toHaveLength(2);
        expect(names.every(name => name.includes("Users"))).toBe(true);
    });

    test.each([
        [
            "Profiles",
            ".profiles-panel",
        ],
        [
            "Variables",
            ".variables-panel",
        ],
        [
            "Import / export",
            ".transfer-panel",
        ],
    ])("toolbarButton_When(%s)IsClicked_ShouldOpenItsPanel", (text, selector) => {
        // Arrange
        const harness = aPanelHarness();
        const view = new RulesView(harness.context);

        // Act
        click(buttonNamed(view.root, text));

        // Assert
        expect(view.root.querySelector(`.slide-body ${selector}`)).not.toBeNull();
        expect(view.root.querySelector(".slide-title")?.textContent).toBe(text);
    });
});
