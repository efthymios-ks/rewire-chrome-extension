export enum ChangeArea {
    Url = 1,
    RequestHeader = 2,
    RequestBody = 3,
    Status = 4,
    ResponseHeader = 5,
    ResponseBody = 6,
    Outcome = 7,
}

export interface ValueChange {
    area: ChangeArea;
    name: string;
    before: string | null;
    after: string | null;
}
