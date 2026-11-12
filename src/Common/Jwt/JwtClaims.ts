import type { JwtObject } from "./JwtToken";

export enum JwtValidity {
    Valid = 1,
    Expired = 2,
    NotYetValid = 3,
    NoExpiry = 4,
}

export interface JwtTime {
    claim: string;
    label: string;
    at: Date;
}

export const JwtClaimNames = {
    IssuedAt: "iat",
    NotBefore: "nbf",
    Expiry: "exp",
} as const;

const MillisecondsPerSecond = 1000;

const TimeClaims = [
    {
        claim: JwtClaimNames.IssuedAt,
        label: "Issued at",
    },
    {
        claim: JwtClaimNames.NotBefore,
        label: "Not before",
    },
    {
        claim: JwtClaimNames.Expiry,
        label: "Expires at",
    },
];

function dateOf(payload: JwtObject, claim: string): Date | null {
    const seconds = payload[claim];

    return typeof seconds === "number" && Number.isFinite(seconds) ? new Date(seconds * MillisecondsPerSecond) : null;
}

export const JwtClaims = {
    isTimeClaim(name: string): boolean {
        return TimeClaims.some(definition => definition.claim === name);
    },

    timesOf(payload: JwtObject): JwtTime[] {
        return TimeClaims.flatMap(definition => {
            const at = dateOf(payload, definition.claim);

            return at === null
                ? []
                : [
                    {
                        ...definition,
                        at,
                    },
                ];
        });
    },

    validityOf(payload: JwtObject, now: Date): JwtValidity {
        const notBefore = dateOf(payload, JwtClaimNames.NotBefore);
        if (notBefore !== null && notBefore > now) {
            return JwtValidity.NotYetValid;
        }

        const expiry = dateOf(payload, JwtClaimNames.Expiry);
        if (expiry === null) {
            return JwtValidity.NoExpiry;
        }

        return expiry <= now ? JwtValidity.Expired : JwtValidity.Valid;
    },
};
