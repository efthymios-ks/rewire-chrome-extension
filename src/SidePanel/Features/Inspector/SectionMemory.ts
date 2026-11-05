export class SectionMemory {
    private _entryId: string | null = null;
    private _sectionId: string | null = null;

    openSectionOf(entryId: string): string | null {
        return entryId === this._entryId ? this._sectionId : null;
    }

    open(entryId: string, sectionId: string): void {
        this._entryId = entryId;
        this._sectionId = sectionId;
    }

    close(entryId: string, sectionId: string): void {
        if (this.openSectionOf(entryId) !== sectionId) {
            return;
        }

        this._sectionId = null;
    }
}
