import type { HeaderEntry } from "../../../../Contracts/Timeline/HeaderEntry";
import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { SensitiveHeaders } from "../../../Http/SensitiveHeaders";
import { Result } from "../../../Results/Result";
import type { RuleContext } from "../../Context/RuleContext";
import { HeaderList } from "../../Http/HeaderList";
import { ActionReader } from "../ActionReader";
import { OperationKinds } from "../OperationKinds";
import { RuleChecks } from "../RuleChecks";

export interface HeaderOperation {
    op: string;
    name: string;
    value: string;
}

type ModifyHeaderInfo = chrome.declarativeNetRequest.ModifyHeaderInfo;

export const HeaderOperationMessages = {
    AddIfMissing: "Add if missing looks at the headers that are there, which works on the inspected tab only.",
    AddToRequest: "Add on a request header works on every tab only for standard headers; others work on the inspected tab only.",
} as const;

const BrowserAppendableRequestHeaders = [
    "accept",
    "accept-encoding",
    "accept-language",
    "access-control-request-headers",
    "cache-control",
    "connection",
    "content-language",
    "cookie",
    "forwarded",
    "if-match",
    "if-none-match",
    "keep-alive",
    "range",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "user-agent",
    "via",
    "want-digest",
    "x-forwarded-for",
];

const BrowserOperations: Record<string, `${chrome.declarativeNetRequest.HeaderOperation}`> = {
    [OperationKinds.Add]: "append",
    [OperationKinds.AddOrUpdate]: "set",
    [OperationKinds.Remove]: "remove",
};

type HeaderApplier = (
    headers: HeaderEntry[],
    operation: HeaderOperation,
    value: string
) => HeaderEntry[];

const OperationAppliers: Record<string, HeaderApplier> = {
    [OperationKinds.Add]: (
        headers,
        operation,
        value
    ) => HeaderList.append(
        headers,
        operation.name,
        value
    ),
    [OperationKinds.AddIfMissing]: (
        headers,
        operation,
        value
    ) => HeaderList.values(headers, operation.name).length > 0
        ? headers
        : HeaderList.append(
            headers,
            operation.name,
            value
        ),
    [OperationKinds.AddOrUpdate]: (
        headers,
        operation,
        value
    ) => HeaderList.set(
        headers,
        operation.name,
        value
    ),
    [OperationKinds.Remove]: (headers, operation) => HeaderList.remove(headers, operation.name),
};

function browserFailureOf(operations: HeaderOperation[], isRequest: boolean): string | null {
    if (operations.some(operation => operation.op === OperationKinds.AddIfMissing)) {
        return HeaderOperationMessages.AddIfMissing;
    }

    const blocked = operations.some(operation => isRequest
        && operation.op === OperationKinds.Add
        && !BrowserAppendableRequestHeaders.includes(operation.name.trim().toLowerCase()));

    return blocked ? HeaderOperationMessages.AddToRequest : null;
}

export const HeaderOperations = {
    read(raw: RuleAction, key: string = "operations"): HeaderOperation[] {
        return ActionReader.records(
            raw,
            key,
            item => ({
                op: ActionReader.field(
                    item,
                    "op",
                    OperationKinds.AddOrUpdate
                ),
                name: ActionReader.field(item, "name"),
                value: ActionReader.field(item, "value"),
            })
        );
    },

    check(operations: HeaderOperation[]): string[] {
        if (operations.length === 0) {
            return ["Add at least one header."];
        }

        return operations.flatMap(operation => RuleChecks.headerName(operation.name));
    },

    describe(operations: HeaderOperation[]): string {
        return operations
            .map(operation => `${operation.op} ${operation.name}`)
            .join(", ");
    },

    apply(
        headers: HeaderEntry[],
        operations: HeaderOperation[],
        context: RuleContext
    ): HeaderEntry[] {
        return operations.reduce(
            (current, operation) => {
                const applier = OperationAppliers[operation.op] ?? OperationAppliers[OperationKinds.AddOrUpdate]!;

                return applier(
                    current,
                    operation,
                    context.render(operation.value)
                );
            },
            headers
        );
    },

    toBrowser(
        operations: HeaderOperation[],
        context: RuleContext,
        isRequest: boolean
    ): Result<ModifyHeaderInfo[]> {
        const failure = browserFailureOf(operations, isRequest);
        if (failure !== null) {
            return Result.fail(failure);
        }

        return Result.ok(operations.map(operation => {
            const browserOperation = BrowserOperations[operation.op] ?? "set";

            return browserOperation === "remove"
                ? {
                    header: operation.name,
                    operation: browserOperation,
                }
                : {
                    header: operation.name,
                    operation: browserOperation,
                    value: context.render(operation.value),
                };
        }));
    },

    withoutSecrets(raw: RuleAction, key: string = "operations"): RuleAction {
        return {
            ...raw,
            [key]: HeaderOperations
                .read(raw, key)
                .map(operation => SensitiveHeaders.isSensitive(operation.name)
                    ? {
                        ...operation,
                        value: "",
                    }
                    : operation),
        };
    },
};
