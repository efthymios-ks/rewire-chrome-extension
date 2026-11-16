import { JWT_CLAIM_NAMES } from './JwtClaimNames';
import type { JwtObject } from './JwtObject';
import { JWT_VALIDITY, type JwtValidity } from './JwtValidity';

export interface JwtTime {
    claim: string;
    label: string;
    at: Date;
}

const MILLISECONDS_PER_SECOND = 1000;

const TIME_CLAIMS = [
    {
        claim: JWT_CLAIM_NAMES.IssuedAt,
        label: 'Issued at',
    },
    {
        claim: JWT_CLAIM_NAMES.NotBefore,
        label: 'Not before',
    },
    {
        claim: JWT_CLAIM_NAMES.Expiry,
        label: 'Expires at',
    },
];

function dateOf(payload: JwtObject, claim: string): Date | null {
    const seconds = payload[claim];

    return typeof seconds === 'number' && Number.isFinite(seconds)
        ? new Date(seconds * MILLISECONDS_PER_SECOND)
        : null;
}

export const JwtClaims = {
    isTimeClaim(name: string): boolean {
        return TIME_CLAIMS.some(definition => definition.claim === name);
    },

    timesOf(payload: JwtObject): JwtTime[] {
        return TIME_CLAIMS.flatMap(definition => {
            const at = dateOf(payload, definition.claim);

            return at == null
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
        const notBefore = dateOf(payload, JWT_CLAIM_NAMES.NotBefore);
        if (notBefore != null && notBefore > now) {
            return JWT_VALIDITY.NotYetValid;
        }

        const expiry = dateOf(payload, JWT_CLAIM_NAMES.Expiry);
        if (expiry == null) {
            return JWT_VALIDITY.NoExpiry;
        }

        return expiry <= now ? JWT_VALIDITY.Expired : JWT_VALIDITY.Valid;
    },
};
