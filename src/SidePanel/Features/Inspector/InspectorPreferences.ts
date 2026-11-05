export enum BodyMode {
    Tree = 1,
    Raw = 2,
}

export interface InspectorPreferences {
    bodyMode: BodyMode;
    wrap: boolean;
    generatorId: string;
    useModified: boolean;
}

export const CurrentInspectorPreferences: InspectorPreferences = {
    bodyMode: BodyMode.Tree,
    wrap: true,
    generatorId: "curl",
    useModified: false,
};
