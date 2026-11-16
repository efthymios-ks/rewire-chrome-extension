export const CORS_DEFAULTS = Object.freeze({
    AllowedMethods: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    AllowedHeaders: 'Authorization, Content-Type, X-Requested-With',
    AnyOrigin: '*',
    AllowCredentials: 'true',
    ExposeAllHeaders: '*',
    PreflightMaxAgeInSeconds: 600,
} as const);
