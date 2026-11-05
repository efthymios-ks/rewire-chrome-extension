import type { Result } from "../../../Common/Results/Result";
import type { ClientExchangeRequest, ClientExchangeResponse } from "../../../Contracts/Messaging/Commands/LogClientExchangeCommand";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import type { PanelContext } from "../Shell/PanelContext";
import { ClientForm } from "./ClientForm";
import { ClientResponseView } from "./ClientResponseView";
import { HttpClient, type IHttpClient } from "./HttpClient";

const DefaultRequest: ClientExchangeRequest = {
    method: "GET",
    url: "",
    headers: [],
    body: "",
};

export class ClientView {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _httpClient: IHttpClient;
    private readonly _form: ClientForm;
    private readonly _response: ClientResponseView;
    private readonly _sendButton: HTMLButtonElement;
    private _isBusy = false;

    constructor(context: PanelContext, httpClient: IHttpClient = new HttpClient()) {
        this._context = context;
        this._httpClient = httpClient;
        this._form = new ClientForm(DefaultRequest);
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
                            text: "Client",
                        }),
                        this._sendButton,
                    ],
                }),
                this._form.root,
                this._response.root,
            ],
        });
    }

    private async send(): Promise<void> {
        if (this._isBusy) {
            return;
        }

        const raw = this._form.current();
        if (raw.url.trim() === "") {
            this._context.notifier.show("Enter a URL first.");

            return;
        }

        const request: ClientExchangeRequest = {
            ...raw,
            headers: raw.headers.filter(header => header.name.trim() !== ""),
        };

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
        request: ClientExchangeRequest,
        result: Result<ClientExchangeResponse>,
        startedAt: string
    ): void {
        const tabId = this._context.store.getState().inspectedTab?.tabId;
        if (tabId === undefined) {
            return;
        }

        void this._context.connection.send({
            type: PanelCommandType.LogClientExchange,
            entryId: `client-${crypto.randomUUID()}`,
            tabId,
            startedAt,
            request,
            response: result.hasErrors ? null : result.value,
            error: result.hasErrors ? result.error : null,
        });
    }
}
