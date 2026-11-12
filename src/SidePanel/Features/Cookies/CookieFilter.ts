export interface NamedValue {
    name: string;
    value: string;
}

export const CookieFilter = {
    apply<TCookie extends NamedValue>(cookies: TCookie[], text: string): TCookie[] {
        const needle = text.trim().toLowerCase();
        if (needle === "") {
            return cookies;
        }

        return cookies.filter(cookie => cookie.name.toLowerCase().includes(needle) || cookie.value.toLowerCase().includes(needle));
    },
};
