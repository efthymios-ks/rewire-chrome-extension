import { OwnEntry } from '../Objects/OwnEntry';
import type { EventStreamEvent } from './EventStreamEvent';

const LINE_BREAK = /\r\n|\r|\n/;
const CARRIAGE_RETURN = '\r';
const FIELD_SEPARATOR = ':';
const COMMENT_MARKER = ':';
const LEADING_SPACE = ' ';
const DATA_SEPARATOR = '\n';
const RETRY_PATTERN = /^\d+$/;

type FieldWriter = (event: EventStreamEvent, value: string) => EventStreamEvent;

const FIELD_WRITERS: Record<string, FieldWriter> = {
    event: (event, value) => ({
        ...event,
        event: value,
    }),
    data: (event, value) => ({
        ...event,
        data: event.data == null ? value : `${event.data}${DATA_SEPARATOR}${value}`,
    }),
    id: (event, value) => ({
        ...event,
        id: value,
    }),
    retry: (event, value) => ({
        ...event,
        retry: RETRY_PATTERN.test(value) ? Number(value) : event.retry,
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
    return event.event != null
        || event.id != null
        || event.retry != null
        || event.data != null;
}

export class EventStreamParser {
    private _buffer = '';
    private _pending = emptyEvent();

    push(chunk: string): EventStreamEvent[] {
        const text = `${this._buffer}${chunk}`;
        const endsInsideLineBreak = text.endsWith(CARRIAGE_RETURN);
        const lines = (endsInsideLineBreak ? text.slice(0, -1) : text).split(LINE_BREAK);
        const rest = lines.pop() ?? '';
        this._buffer = endsInsideLineBreak ? `${rest}${CARRIAGE_RETURN}` : rest;

        return lines
            .map(line => this.read(line))
            .filter((event): event is EventStreamEvent => event != null);
    }

    private read(line: string): EventStreamEvent | null {
        if (line === '') {
            const event = this._pending;
            this._pending = emptyEvent();

            return hasFields(event) ? event : null;
        }

        if (line.startsWith(COMMENT_MARKER)) {
            return null;
        }

        const separatorIndex = line.indexOf(FIELD_SEPARATOR);
        const name = separatorIndex < 0 ? line : line.slice(0, separatorIndex);
        const rawValue = separatorIndex < 0 ? '' : line.slice(separatorIndex + 1);
        const value = rawValue.startsWith(LEADING_SPACE) ? rawValue.slice(1) : rawValue;
        const writer = OwnEntry.of(FIELD_WRITERS, name);
        if (writer != null) {
            this._pending = writer(this._pending, value);
        }

        return null;
    }
}
