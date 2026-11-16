import { Base64Text } from '../Encoding/Base64Text';
import { ErrorText } from '../Errors/ErrorText';
import { Result } from '../Results/Result';
import type { JwtObject } from './JwtObject';

export interface DecodedJwt {
    header: JwtObject;
    payload: JwtObject;
    signature: string;
}

const BEARER_PREFIX_PATTERN = /^bearer\s+/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
const PART_SEPARATOR = '.';
const PART_COUNT = 3;
const BASE64_URL_PATTERN = /[-_]/g;
const BASE64_URL_CHARACTERS: Record<string, string> = Object.freeze({
    '-': '+',
    '_': '/',
});
const PADDING_BLOCK = 4;
const PADDING = '=';

function base64Of(base64Url: string): string {
    const base64 = base64Url.replace(BASE64_URL_PATTERN, character => BASE64_URL_CHARACTERS[character]!);
    const remainder = base64.length % PADDING_BLOCK;

    return remainder === 0 ? base64 : `${base64}${PADDING.repeat(PADDING_BLOCK - remainder)}`;
}

function objectOf(part: string, label: string): Result<JwtObject> {
    try {
        const parsed: unknown = JSON.parse(Base64Text.toUtf8(base64Of(part)));
        if (
            typeof parsed !== 'object'
            || parsed == null
            || Array.isArray(parsed)
        ) {
            return Result.fail(`The ${label} is not a JSON object.`);
        }

        return Result.ok(parsed as JwtObject);
    } catch (error) {
        return Result.fail(`The ${label} can't be decoded: ${ErrorText.of(error)}`);
    }
}

export const JwtToken = {
    clean(text: string): string {
        return text
            .trim()
            .replace(BEARER_PREFIX_PATTERN, '')
            .trim();
    },

    looksLike(text: string): boolean {
        const token = JwtToken.clean(text);

        return TOKEN_PATTERN.test(token) && !JwtToken.decode(token).hasErrors;
    },

    decode(text: string): Result<DecodedJwt> {
        const parts = JwtToken
            .clean(text)
            .split(PART_SEPARATOR);
        if (parts.length !== PART_COUNT) {
            return Result.fail('A JWT has three parts separated by dots.');
        }

        const [headerPart = '', payloadPart = '', signature = ''] = parts;
        const header = objectOf(headerPart, 'header');
        if (header.hasErrors) {
            return header;
        }

        const payload = objectOf(payloadPart, 'payload');
        if (payload.hasErrors) {
            return payload;
        }

        return Result.ok({
            header: header.value,
            payload: payload.value,
            signature,
        });
    },
};
