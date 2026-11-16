import { ALL_SNIPPET_PARTS } from '../../../Common/CodeGen/AllSnippetParts';
import { RequestSnippets } from '../../../Common/CodeGen/RequestSnippets';
import { ClientBodies } from './ClientBodies';
import type { ClientRequest } from './ClientRequest';
import { ClientRoutes } from './ClientRoutes';

export const ClientSnippets = {
    of(request: ClientRequest, snippetId: string): string {
        const body = ClientRoutes.bodySent(request);
        const snippet = RequestSnippets
            .get(snippetId)
            .from(
                /* snapshot: */ {
                    method: request.method,
                    url: request.url.trim(),
                    headers: ClientBodies.withContentType(request.headers, body),
                    body: null,
                },
                /* options: */ ALL_SNIPPET_PARTS,
            );
        snippet.body = ClientBodies.snippetBodyOf(body);

        return snippet.toString();
    },
};
