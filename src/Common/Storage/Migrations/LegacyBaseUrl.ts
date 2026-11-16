import { RegexText } from '../../Urls/RegexText';

const TRAILING_SLASHES_PATTERN = /\/+$/;

export const LegacyBaseUrl = {
    trimmed(base: string): string {
        return base.trim().replace(TRAILING_SLASHES_PATTERN, '');
    },

    mirrorRegex(sourceBase: string): string {
        return `^${RegexText.escape(LegacyBaseUrl.trimmed(sourceBase))}((?:[/?#].*)?)$`;
    },

    mirrorTarget(targetBase: string): string {
        return `${LegacyBaseUrl.trimmed(targetBase)}$1`;
    },
};
