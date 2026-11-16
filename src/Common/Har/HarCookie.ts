export interface HarCookie {
    name: string;
    value: string;
    path?: string;
    domain?: string;
    expires?: string;
    httpOnly?: boolean;
    secure?: boolean;
}
