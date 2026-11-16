import type { HarCookie } from './HarCookie';
import type { HarNameValue } from './HarNameValue';
import type { HarPostData } from './HarPostData';

export interface HarRequest {
    method: string;
    url: string;
    httpVersion: string;
    cookies: HarCookie[];
    headers: HarNameValue[];
    queryString: HarNameValue[];
    postData?: HarPostData;
    headersSize: number;
    bodySize: number;
}
