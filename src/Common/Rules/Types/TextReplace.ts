import { RegexCache } from "../Criteria/RegexCache";

export interface TextReplacement {
    find: string;
    replace: string;
    isRegex: boolean;
}

const GlobalFlag = "g";

export const TextReplace = {
    apply(text: string, replacement: TextReplacement): string {
        if (replacement.find === "") {
            return text;
        }

        if (!replacement.isRegex) {
            return text.split(replacement.find).join(replacement.replace);
        }

        const compiled = RegexCache.compile(replacement.find);
        if (compiled.hasErrors) {
            return text;
        }

        return text.replace(new RegExp(compiled.value.source, GlobalFlag), replacement.replace);
    },
};
