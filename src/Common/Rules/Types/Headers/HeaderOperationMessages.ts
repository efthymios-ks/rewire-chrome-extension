export const HEADER_OPERATION_MESSAGES = Object.freeze({
    AddIfMissing: 'Add if missing looks at the headers that are there, which works on the inspected tab only.',
    AddToRequest: 'Add on a request header works on every tab only for standard headers; others work on the inspected tab only.',
} as const);
