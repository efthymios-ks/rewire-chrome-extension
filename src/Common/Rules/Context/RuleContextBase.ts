import { TemplateText } from "../Templates/TemplateText";
import type { RuleContext } from "./RuleContext";

export abstract class RuleContextBase implements RuleContext {
    now(): Date {
        return new Date();
    }

    random(): number {
        return Math.random();
    }

    render(text: string): string {
        return TemplateText.render(text, name => this.variable(name));
    }

    abstract variable(name: string): string | null;

    abstract setVariable(name: string, value: string): void;
}
