export const CLIENT_BODY_TYPE = Object.freeze({
    None: 1,
    Text: 2,
    Json: 3,
    Xml: 4,
    FormUrlEncoded: 5,
    Multipart: 6,
    Binary: 7,
    GraphQl: 8,
} as const);

export type ClientBodyType = (typeof CLIENT_BODY_TYPE)[keyof typeof CLIENT_BODY_TYPE];
