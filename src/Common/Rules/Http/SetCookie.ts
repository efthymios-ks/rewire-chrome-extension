export interface SetCookie {
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: string;
    maxAge: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite: string;
    partitioned: boolean;
}
