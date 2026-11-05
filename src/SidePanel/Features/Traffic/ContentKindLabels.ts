import { ContentKind } from "../../../Contracts/Timeline/ContentKind";

export const ContentKindLabels: Record<ContentKind, string> = {
    [ContentKind.Json]: "JSON",
    [ContentKind.GraphQl]: "GQL",
    [ContentKind.FormData]: "FORM",
    [ContentKind.Other]: "",
};
