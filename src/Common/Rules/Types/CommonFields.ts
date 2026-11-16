import { FIELD_KIND } from './FieldKind';
import type { FieldSpec } from './FieldSpec';

export const CommonFields = {
    DelayKey: 'delayMs',

    latency(): FieldSpec {
        return {
            kind: FIELD_KIND.Latency,
            key: CommonFields.DelayKey,
            label: 'Latency',
        };
    },
};
