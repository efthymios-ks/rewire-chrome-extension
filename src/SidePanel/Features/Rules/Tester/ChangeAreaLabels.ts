import { ChangeArea } from "../../../../Contracts/Rules/ValueChange";

export const ChangeAreaLabels: Record<ChangeArea, string> = {
    [ChangeArea.Url]: "URL",
    [ChangeArea.RequestHeader]: "Request header",
    [ChangeArea.RequestBody]: "Request body",
    [ChangeArea.Status]: "Status",
    [ChangeArea.ResponseHeader]: "Response header",
    [ChangeArea.ResponseBody]: "Response body",
    [ChangeArea.Outcome]: "Outcome",
};
