const VariablePattern = /\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g;

export const TemplateText = {
    render(text: string, lookup: (name: string) => string | null): string {
        return text.replace(VariablePattern, (match, name: string) => lookup(name) ?? match);
    },
};
