export interface CaptureFilter {
    shouldCapture(resourceType: string | undefined): boolean;
}
