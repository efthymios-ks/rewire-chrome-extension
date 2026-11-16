import { JsonText } from '../../../Common/Json/JsonText';

const PACKET_PREFIX = /^\d+(?=[[{])/;

export const LivePayload = {
    jsonOf(data: string): unknown {
        const parsed = JsonText.tryParse(data);
        if (
            !parsed.hasErrors
            && typeof parsed.value === 'object'
            && parsed.value != null
        ) {
            return parsed.value;
        }

        const prefix = PACKET_PREFIX.exec(data);
        if (prefix == null) {
            return undefined;
        }

        const packet = JsonText.tryParse(data.slice(prefix[0].length));

        return packet.hasErrors ? undefined : packet.value;
    },
};
