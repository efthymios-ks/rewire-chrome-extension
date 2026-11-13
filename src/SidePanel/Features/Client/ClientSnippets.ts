import { AllSnippetParts } from "../../../Common/CodeGen/RequestSnapshot";
import { RequestSnippets } from "../../../Common/CodeGen/RequestSnippets";
import { ClientBodies } from "./ClientBodies";
import type { ClientRequest } from "./ClientRequest";
import { ClientRoutes } from "./ClientRoutes";

export const ClientSnippets = {
    of(request: ClientRequest, snippetId: string): string {
        const body = ClientRoutes.bodySent(request);
        const snippet = RequestSnippets
            .get(snippetId)
            .from(
                {
                    method: request.method,
                    url: request.url.trim(),
                    headers: ClientBodies.withContentType(request.headers, body),
                    body: null,
                },
                AllSnippetParts
            );
        snippet.body = ClientBodies.snippetBodyOf(body);

        return snippet.toString();
    },
};
