import type { EventStreamEvent } from "./EventStreamEvent";

const LineBreak = /\r\n|\r|\n/;
const CarriageReturn = "\r";
const FieldSeparator = ":";
const CommentMarker = ":";
const LeadingSpace = " ";
const DataSeparator = "\n";
const RetryPattern = /^\d+$/;

type FieldWriter = (event: EventStreamEvent, value: string) => EventStreamEvent;

const FieldWriters: Record<string, FieldWriter> = {
    event: (event, value) => ({
        ...event,
        event: value,
    }),
    data: (event, value) => ({
        ...event,
        data: event.data === null ? value : `${event.data}${DataSeparator}${value}`,
    }),
    id: (event, value) => ({
        ...event,
        id: value,
    }),
    retry: (event, value) => ({
        ...event,
        retry: RetryPattern.test(value) ? Number(value) : event.retry,
    }),
};

function emptyEvent(): EventStreamEvent {
    return {
        event: null,
        id: null,
        retry: null,
        data: null,
    };
}

function hasFields(event: EventStreamEvent): boolean {
    return event.event !== null || event.id !== null || event.retry !== null || event.data !== null;
}

export class EventStreamParser {
    private _buffer = "";
    private _pending = emptyEvent();

    push(chunk: string): EventStreamEvent[] {
        const text = `${this._buffer}${chunk}`;
        const endsInsideLineBreak = text.endsWith(CarriageReturn);
        const lines = (endsInsideLineBreak ? text.slice(0, -1) : text).split(LineBreak);
        const rest = lines.pop() ?? "";
        this._buffer = endsInsideLineBreak ? `${rest}${CarriageReturn}` : rest;

        return lines
            .map(line => this.read(line))
            .filter((event): event is EventStreamEvent => event !== null);
    }

    private read(line: string): EventStreamEvent | null {
        if (line === "") {
            const event = this._pending;
            this._pending = emptyEvent();

            return hasFields(event) ? event : null;
        }

        if (line.startsWith(CommentMarker)) {
            return null;
        }

        const separatorIndex = line.indexOf(FieldSeparator);
        const name = separatorIndex < 0 ? line : line.slice(0, separatorIndex);
        const rawValue = separatorIndex < 0 ? "" : line.slice(separatorIndex + 1);
        const value = rawValue.startsWith(LeadingSpace) ? rawValue.slice(1) : rawValue;
        const writer = FieldWriters[name];
        if (writer !== undefined) {
            this._pending = writer(this._pending, value);
        }

        return null;
    }
}
