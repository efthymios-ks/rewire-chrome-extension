import { Base64Text } from "../Encoding/Base64Text";
import { ErrorText } from "../Errors/ErrorText";
import { Result } from "../Results/Result";

export type JwtObject = Record<string, unknown>;

export interface DecodedJwt {
    header: JwtObject;
    payload: JwtObject;
    signature: string;
}

const BearerPrefixPattern = /^bearer\s+/i;
const TokenPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
const PartSeparator = ".";
const PartCount = 3;
const Base64UrlPattern = /[-_]/g;
const Base64UrlCharacters: Record<string, string> = {
    "-": "+",
    "_": "/",
};
const PaddingBlock = 4;
const Padding = "=";

function base64Of(base64Url: string): string {
    const base64 = base64Url.replace(Base64UrlPattern, character => Base64UrlCharacters[character]!);
    const remainder = base64.length % PaddingBlock;

    return remainder === 0 ? base64 : `${base64}${Padding.repeat(PaddingBlock - remainder)}`;
}

function objectOf(part: string, label: string): Result<JwtObject> {
    try {
        const parsed: unknown = JSON.parse(Base64Text.toUtf8(base64Of(part)));
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
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
            .replace(BearerPrefixPattern, "")
            .trim();
    },

    looksLike(text: string): boolean {
        const token = JwtToken.clean(text);

        return TokenPattern.test(token) && !JwtToken.decode(token).hasErrors;
    },

    decode(text: string): Result<DecodedJwt> {
        const parts = JwtToken
            .clean(text)
            .split(PartSeparator);
        if (parts.length !== PartCount) {
            return Result.fail("A JWT has three parts separated by dots.");
        }

        const [headerPart = "", payloadPart = "", signature = ""] = parts;
        const header = objectOf(headerPart, "header");
        if (header.hasErrors) {
            return header;
        }

        const payload = objectOf(payloadPart, "payload");
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
