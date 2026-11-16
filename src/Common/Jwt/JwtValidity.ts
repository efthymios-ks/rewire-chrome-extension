export const JWT_VALIDITY = Object.freeze({
    Valid: 1,
    Expired: 2,
    NotYetValid: 3,
    NoExpiry: 4,
} as const);

export type JwtValidity = (typeof JWT_VALIDITY)[keyof typeof JWT_VALIDITY];
