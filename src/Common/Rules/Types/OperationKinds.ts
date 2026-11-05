import type { SelectOption } from "./FieldSpec";

export const OperationKinds = {
    Add: "add",
    AddIfMissing: "addIfMissing",
    AddOrUpdate: "addOrUpdate",
    Remove: "remove",
} as const;

export const OperationOptions: SelectOption[] = [
    {
        value: OperationKinds.Add,
        label: "Add",
    },
    {
        value: OperationKinds.AddIfMissing,
        label: "Add if missing",
    },
    {
        value: OperationKinds.AddOrUpdate,
        label: "Add or update",
    },
    {
        value: OperationKinds.Remove,
        label: "Remove",
    },
];

export const OperationHint = "Add puts in another value, Add if missing leaves an existing one alone, Add or update replaces it.";
