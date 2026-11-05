import { CurlCmdSnippet } from "./CurlCmdSnippet";
import { CurlSnippet } from "./CurlSnippet";
import { FetchNodeSnippet } from "./FetchNodeSnippet";
import { FetchSnippet } from "./FetchSnippet";
import { PowerShellSnippet } from "./PowerShellSnippet";
import type { ISnippetGenerator } from "./RequestSnapshot";
import { WgetSnippet } from "./WgetSnippet";

const Generators: ISnippetGenerator[] = [
    new CurlSnippet(),
    new CurlCmdSnippet(),
    new WgetSnippet(),
    new FetchSnippet(),
    new FetchNodeSnippet(),
    new PowerShellSnippet(),
];

export const SnippetGenerators = {
    all(): ISnippetGenerator[] {
        return Generators;
    },

    get(id: string): ISnippetGenerator {
        return Generators.find(generator => generator.id === id) ?? Generators[0]!;
    },
};
