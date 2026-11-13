import { JwtToken } from "./JwtToken";

const CandidatePattern = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g;

export const JwtFinder = {
    find(text: string): string | null {
        const candidates = text.match(CandidatePattern) ?? [];

        return candidates.find(candidate => JwtToken.looksLike(candidate)) ?? null;
    },
};
