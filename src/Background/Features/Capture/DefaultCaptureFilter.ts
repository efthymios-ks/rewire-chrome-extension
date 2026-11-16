import type { CaptureFilter } from './CaptureFilter';

const CAPTURED_RESOURCE_TYPES: readonly string[] = Object.freeze([
    'XHR',
    'Fetch',
    'Ping',
    'Document',
]);

export class DefaultCaptureFilter implements CaptureFilter {
    shouldCapture(resourceType: string | undefined): boolean {
        return resourceType != null && CAPTURED_RESOURCE_TYPES.includes(resourceType);
    }
}
