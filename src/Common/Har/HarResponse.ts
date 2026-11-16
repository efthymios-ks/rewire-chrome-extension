import type { HarContent } from './HarContent';
import type { HarCookie } from './HarCookie';
import type { HarNameValue } from './HarNameValue';

export interface HarResponse {
    status: number;
    statusText: string;
    httpVersion: string;
    cookies: HarCookie[];
    headers: HarNameValue[];
    content: HarContent;
    redirectURL: string;
    headersSize: number;
    bodySize: number;
}
