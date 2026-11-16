import { JWT_CLAIM_NAMES } from '../../../Common/Jwt/JwtClaimNames';
import { JwtClaims } from '../../../Common/Jwt/JwtClaims';
import type { JwtObject } from '../../../Common/Jwt/JwtObject';
import { JWT_VALIDITY, type JwtValidity } from '../../../Common/Jwt/JwtValidity';
import { UtcText } from '../../Core/Formatting/UtcText';

function timeOf(payload: JwtObject, claim: string): string {
    const time = JwtClaims
        .timesOf(payload)
        .find(candidate => candidate.claim === claim);

    return time == null ? '' : UtcText.of(time.at);
}

const STATUS_TEXTS: Record<JwtValidity, (payload: JwtObject) => string> = {
    [JWT_VALIDITY.Valid]: payload => `Valid until ${timeOf(payload, JWT_CLAIM_NAMES.Expiry)}`,
    [JWT_VALIDITY.Expired]: payload => `Expired at ${timeOf(payload, JWT_CLAIM_NAMES.Expiry)}`,
    [JWT_VALIDITY.NotYetValid]: payload => `Not valid before ${timeOf(payload, JWT_CLAIM_NAMES.NotBefore)}`,
    [JWT_VALIDITY.NoExpiry]: () => 'Never expires',
};

export const JwtStatusText = {
    of(payload: JwtObject, now: Date): string {
        return STATUS_TEXTS[JwtClaims.validityOf(payload, now)](payload);
    },
};
