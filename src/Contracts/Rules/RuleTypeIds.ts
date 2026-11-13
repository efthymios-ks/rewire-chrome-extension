export const RuleTypeIds = {
    RequestHeader: "requestHeader",
    ResponseHeader: "responseHeader",
    Cors: "cors",
    SecurityHeaders: "securityHeaders",
    AllowEmbedding: "allowEmbedding",
    RequestCookie: "requestCookie",
    ResponseCookie: "responseCookie",
    Redirect: "redirect",
    Rewrite: "rewrite",
    QueryParams: "queryParams",
    UpgradeScheme: "upgradeScheme",
    MockResponse: "mockResponse",
    Delay: "delay",
    RequestBody: "requestBodyModify",
    ResponseBody: "responseBodyReplace",
    SetVariable: "setVariable",
} as const;

export type RuleTypeId = typeof RuleTypeIds[keyof typeof RuleTypeIds];
