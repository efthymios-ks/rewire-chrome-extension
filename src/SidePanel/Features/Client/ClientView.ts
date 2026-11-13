import { CurlBashSnippet } from "../../../Common/CodeGen/CurlBashSnippet";
import type { Result } from "../../../Common/Results/Result";
import type { ClientExchangeResponse } from "../../../Contracts/Messaging/Commands/LogClientExchangeCommand";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import { ContextMenu } from "../../Core/Dom/ContextMenu";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import { MenuButton } from "../../Core/Dom/MenuButton";
import type { ClientLaunchRequest } from "../../Core/ViewLaunchRequests";
import { SnippetMenuItems } from "../Inspector/SnippetMenuItems";
import type { PanelContext } from "../Shell/PanelContext";
import { ClientBodies } from "./ClientBodies";
import { ClientForm } from "./ClientForm";
import type { ClientRequest } from "./ClientRequest";
import { ClientRequestDraft } from "./ClientRequestDraft";
import { ClientResponseView } from "./ClientResponseView";
import { ClientRoutes } from "./ClientRoutes";
import { ClientSnippets } from "./ClientSnippets";
import { DebuggerHttpClient } from "./DebuggerHttpClient";
import { HttpClient, type IHttpClient } from "./HttpClient";
import { RoutedHttpClient } from "./RoutedHttpClient";

const DefaultMethod = "GET";

function defaultRequest(): ClientRequest {
    return {
        method: DefaultMethod,
        url: "",
        headers: [],
        body: ClientBodies.empty(),
    };
}

export class ClientView {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _httpClient: IHttpClient;
    private readonly _form: ClientForm;
    private readonly _response: ClientResponseView;
    private readonly _sendButton: HTMLButtonElement;
    private _isBusy = false;

    constructor(context: PanelContext, httpClient: IHttpClient = new RoutedHttpClient(new HttpClient(), new DebuggerHttpClient(context.connection))) {
        this._context = context;
        this._httpClient = httpClient;
        this._form = new ClientForm({
            initial: defaultRequest(),
            onPasteFilled: () => context.notifier.show("Filled in from the pasted command. Pick any files it names."),
        });
        this._response = new ClientResponseView();
        this._sendButton = FormControls.button({
            text: "Send",
            variant: ButtonVariants.Primary,
            onClick: () => void this.send(),
        });

        this.root = buildElement("section", {
            className: "client-view",
            children: [
                buildElement("div", {
                    className: "view-header",
                    children: [
                        buildElement("h2", {
                            text: "HTTP Client",
                        }),
                        buildElement("div", {
                            className: "actions",
                            children: [
                                MenuButton.build({
                                    text: "Copy as",
                                    title: "Copy this request as a command or a script",
                                    menu: new ContextMenu(),
                                    items: () => SnippetMenuItems.of(snippetId => void this.copy(snippetId)),
                                }),
                                this._sendButton,
                            ],
                        }),
                    ],
                }),
                this._form.root,
                this._response.root,
            ],
        });

        context.store.select(
            state => state.clientLaunch,
            launch => this.open(launch)
        );
    }

    private open(launch: ClientLaunchRequest | null): void {
        if (launch === null) {
            return;
        }

        this._form.fill(ClientRequestDraft.fromSnippet(CurlBashSnippet.from(launch.snapshot)));
    }

    private async copy(snippetId: string): Promise<void> {
        const request = this._form.current();
        if (request.url.trim() === "") {
            this._context.notifier.show("Enter a URL first.");

            return;
        }

        const copied = await this._context.clipboardClient.copy(ClientSnippets.of(request, snippetId));
        this._context.notifier.show(copied.hasErrors ? copied.error : SnippetMenuItems.copiedText(snippetId));
    }

    private async send(): Promise<void> {
        if (this._isBusy) {
            return;
        }

        const request = this._form.current();
        if (request.url.trim() === "") {
            this._context.notifier.show("Enter a URL first.");

            return;
        }

        this._isBusy = true;
        this._sendButton.disabled = true;
        this._response.showPending();

        const startedAt = new Date().toISOString();
        const result = await this._httpClient.send(request);

        this._isBusy = false;
        this._sendButton.disabled = false;
        this.log(
            request,
            result,
            startedAt
        );
        if (result.hasErrors) {
            this._response.showError(result.error);

            return;
        }

        this._response.showResponse(result.value);
    }

    private log(
        request: ClientRequest,
        result: Result<ClientExchangeResponse>,
        startedAt: string
    ): void {
        const tabId = this._context.store.getState().inspectedTab?.tabId;
        if (tabId === undefined) {
            return;
        }

        const sentBody = ClientRoutes.bodySent(request);
        void this._context.connection.send({
            type: PanelCommandType.LogClientExchange,
            entryId: `client-${crypto.randomUUID()}`,
            tabId,
            startedAt,
            request: {
                method: request.method,
                url: request.url,
                headers: ClientBodies.withContentType(request.headers, sentBody),
                body: ClientBodies.logTextOf(sentBody),
            },
            response: result.hasErrors ? null : result.value,
            error: result.hasErrors ? result.error : null,
        });
    }
}
