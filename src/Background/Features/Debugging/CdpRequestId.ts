export const CdpRequestId = {
    of(params: unknown): string | null {
        if (typeof params !== "object" || params === null) {
            return null;
        }

        const requestId = (params as Record<string, unknown>)["requestId"];

        return typeof requestId === "string" ? requestId : null;
    },
};
