import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import type { HeaderEntry } from '../../../../Contracts/Timeline/HeaderEntry';
import { SensitiveHeaders } from '../../../Http/SensitiveHeaders';
import { Result } from '../../../Results/Result';
import type { RuleContext } from '../../Context/RuleContext';
import { HeaderList } from '../../Http/HeaderList';
import { ActionReader } from '../ActionReader';
import { OPERATION_KINDS } from '../OperationKinds';
import { RuleChecks } from '../RuleChecks';
import { HEADER_OPERATION_MESSAGES } from './HeaderOperationMessages';

export interface HeaderOperation {
    op: string;
    name: string;
    value: string;
}

type ModifyHeaderInfo = chrome.declarativeNetRequest.ModifyHeaderInfo;

const BROWSER_APPENDABLE_REQUEST_HEADERS = [
    'accept',
    'accept-encoding',
    'accept-language',
    'access-control-request-headers',
    'cache-control',
    'connection',
    'content-language',
    'cookie',
    'forwarded',
    'if-match',
    'if-none-match',
    'keep-alive',
    'range',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'user-agent',
    'via',
    'want-digest',
    'x-forwarded-for',
];

const BROWSER_OPERATIONS: Record<string, `${chrome.declarativeNetRequest.HeaderOperation}`> = Object.freeze({
    [OPERATION_KINDS.Add]: 'append',
    [OPERATION_KINDS.AddOrUpdate]: 'set',
    [OPERATION_KINDS.Remove]: 'remove',
});

interface HeaderApplierOptions {
    headers: HeaderEntry[];
    operation: HeaderOperation;
    value: string;
}

type HeaderApplier = (options: HeaderApplierOptions) => HeaderEntry[];

const OPERATION_APPLIERS: Record<string, HeaderApplier> = {
    [OPERATION_KINDS.Add]: ({ headers, operation, value }) => HeaderList.append({
        headers,
        name: operation.name,
        value,
    }),
    [OPERATION_KINDS.AddIfMissing]: ({
        headers,
        operation,
        value,
    }) => HeaderList.values(headers, operation.name).length > 0
        ? headers
        : HeaderList.append({ headers, name: operation.name, value }),
    [OPERATION_KINDS.AddOrUpdate]: ({ headers, operation, value }) => HeaderList.set({
        headers,
        name: operation.name,
        value,
    }),
    [OPERATION_KINDS.Remove]: ({ headers, operation }) => HeaderList.remove(headers, operation.name),
};

function browserFailureOf(operations: HeaderOperation[], isRequest: boolean): string | null {
    if (operations.some(operation => operation.op === OPERATION_KINDS.AddIfMissing)) {
        return HEADER_OPERATION_MESSAGES.AddIfMissing;
    }

    const isBlocked = operations.some(operation => isRequest
        && operation.op === OPERATION_KINDS.Add
        && !BROWSER_APPENDABLE_REQUEST_HEADERS.includes(operation.name.trim().toLowerCase()));

    return isBlocked ? HEADER_OPERATION_MESSAGES.AddToRequest : null;
}

export interface ApplyOptions {
    headers: HeaderEntry[];
    operations: HeaderOperation[];
    context: RuleContext;
}

export interface ToBrowserOptions {
    operations: HeaderOperation[];
    context: RuleContext;
    isRequest: boolean;
}

export const HeaderOperations = {
    read(raw: RuleAction, key: string = 'operations'): HeaderOperation[] {
        return ActionReader.records({
            raw,
            key,
            map: item => ({
                op: ActionReader.text({ raw: item, key: 'op', fallback: OPERATION_KINDS.AddOrUpdate }),
                name: ActionReader.text({ raw: item, key: 'name' }),
                value: ActionReader.text({ raw: item, key: 'value' }),
            }),
        });
    },

    check(operations: HeaderOperation[]): string[] {
        if (operations.length === 0) {
            return ['Add at least one header.'];
        }

        return operations.flatMap(operation => RuleChecks.headerName(operation.name));
    },

    describe(operations: HeaderOperation[]): string {
        return operations
            .map(operation => `${operation.op} ${operation.name}`)
            .join(', ');
    },

    apply({ headers, operations, context }: ApplyOptions): HeaderEntry[] {
        return operations.reduce(
            /* callbackfn: */ (current, operation) => {
                const op = Object.hasOwn(OPERATION_APPLIERS, operation.op)
                    ? operation.op
                    : OPERATION_KINDS.AddOrUpdate;
                const applier = OPERATION_APPLIERS[op]!;

                return applier({
                    headers: current,
                    operation,
                    value: context.render(operation.value),
                });
            },
            /* initialValue: */ headers,
        );
    },

    toBrowser({ operations, context, isRequest }: ToBrowserOptions): Result<ModifyHeaderInfo[]> {
        const failure = browserFailureOf(operations, isRequest);
        if (failure != null) {
            return Result.fail(failure);
        }

        return Result.ok(operations.map(operation => {
            const browserOperation = Object.hasOwn(BROWSER_OPERATIONS, operation.op)
                ? BROWSER_OPERATIONS[operation.op]!
                : 'set';

            return browserOperation === 'remove'
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

    withoutSecrets(raw: RuleAction, key: string = 'operations'): RuleAction {
        return {
            ...raw,
            [key]: HeaderOperations
                .read(raw, key)
                .map(operation => SensitiveHeaders.isSensitive(operation.name)
                    ? {
                        ...operation,
                        value: '',
                    }
                    : operation),
        };
    },
};
