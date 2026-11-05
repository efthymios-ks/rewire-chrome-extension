export const CriterionFieldIds = {
    Url: "url",
    Host: "host",
    Method: "method",
    Path: "path",
    Extension: "extension",
    Query: "query",
    RequestHeader: "requestHeader",
    RequestCookie: "requestCookie",
    ResourceType: "resourceType",
    ResponseStatus: "responseStatus",
    ResponseHeader: "responseHeader",
    ContentType: "contentType",
    Sample: "sample",
    TimeWindow: "timeWindow",
} as const;

export const CriterionOperatorIds = {
    Wildcard: "wildcard",
    Regex: "regex",
    Domains: "domains",
    OneOf: "oneOf",
    Exists: "exists",
    Range: "range",
    Percent: "percent",
    Between: "between",
} as const;

export type CriteriaMatch = "all" | "any";

export const CriteriaMatches = {
    All: "all",
    Any: "any",
} as const;

export interface Criterion {
    field: string;
    op: string;
    name: string;
    value: string;
    negate: boolean;
}

export interface RuleCriteria {
    match: CriteriaMatch;
    items: Criterion[];
}
