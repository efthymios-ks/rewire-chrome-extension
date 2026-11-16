import { CHANGE_AREA, type ChangeArea } from '../../../../Contracts/Rules/ChangeArea';

export const CHANGE_AREA_LABELS: Record<ChangeArea, string> = Object.freeze({
    [CHANGE_AREA.Url]: 'URL',
    [CHANGE_AREA.RequestHeader]: 'Request header',
    [CHANGE_AREA.RequestBody]: 'Request body',
    [CHANGE_AREA.Status]: 'Status',
    [CHANGE_AREA.ResponseHeader]: 'Response header',
    [CHANGE_AREA.ResponseBody]: 'Response body',
    [CHANGE_AREA.Outcome]: 'Outcome',
});
