import type { SectionMemory } from "./SectionMemory";

const SectionAttribute = "section";

export const SectionAccordion = {
    attach(
        sections: HTMLDetailsElement[],
        entryId: string,
        memory: SectionMemory
    ): void {
        const openSectionId = memory.openSectionOf(entryId);
        sections.forEach(section => {
            const sectionId = section.dataset[SectionAttribute] ?? "";
            section.open = sectionId === openSectionId;
            section.addEventListener("toggle", () => {
                if (!section.open) {
                    memory.close(entryId, sectionId);

                    return;
                }

                memory.open(entryId, sectionId);
                sections
                    .filter(other => other !== section && other.open)
                    .forEach(other => {
                        other.open = false;
                    });
            });
        });
    },
};
