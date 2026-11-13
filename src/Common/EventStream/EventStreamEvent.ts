export interface EventStreamEvent {
    event: string | null;
    id: string | null;
    retry: number | null;
    data: string | null;
}
