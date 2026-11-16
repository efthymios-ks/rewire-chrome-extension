import { OPERATION_KINDS } from './OperationKinds';
import type { SelectOption } from './SelectOption';

export const OPERATION_OPTIONS: SelectOption[] = [
    {
        value: OPERATION_KINDS.Add,
        label: 'Add',
    },
    {
        value: OPERATION_KINDS.AddIfMissing,
        label: 'Add if missing',
    },
    {
        value: OPERATION_KINDS.AddOrUpdate,
        label: 'Add or update',
    },
    {
        value: OPERATION_KINDS.Remove,
        label: 'Remove',
    },
];
