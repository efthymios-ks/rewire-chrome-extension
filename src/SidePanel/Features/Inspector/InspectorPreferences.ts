export enum BodyMode {
    Tree = 1,
    Raw = 2,
}

export interface InspectorPreferences {
    bodyMode: BodyMode;
    wrap: boolean;
    snippetId: string;
}

export const CurrentInspectorPreferences: InspectorPreferences = {
    bodyMode: BodyMode.Tree,
    wrap: true,
    snippetId: "curl",
};
