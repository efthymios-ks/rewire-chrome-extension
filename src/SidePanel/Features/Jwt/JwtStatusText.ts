import { JwtClaimNames, JwtClaims, JwtValidity } from "../../../Common/Jwt/JwtClaims";
import type { JwtObject } from "../../../Common/Jwt/JwtToken";
import { UtcText } from "../../Core/Formatting/UtcText";

function timeOf(payload: JwtObject, claim: string): string {
    const time = JwtClaims
        .timesOf(payload)
        .find(candidate => candidate.claim === claim);

    return time === undefined ? "" : UtcText.of(time.at);
}

const StatusTexts: Record<JwtValidity, (payload: JwtObject) => string> = {
    [JwtValidity.Valid]: payload => `Valid until ${timeOf(payload, JwtClaimNames.Expiry)}`,
    [JwtValidity.Expired]: payload => `Expired at ${timeOf(payload, JwtClaimNames.Expiry)}`,
    [JwtValidity.NotYetValid]: payload => `Not valid before ${timeOf(payload, JwtClaimNames.NotBefore)}`,
    [JwtValidity.NoExpiry]: () => "Never expires",
};

export const JwtStatusText = {
    of(payload: JwtObject, now: Date): string {
        return StatusTexts[JwtClaims.validityOf(payload, now)](payload);
    },
};
