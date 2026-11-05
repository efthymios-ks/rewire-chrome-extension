type ValueControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export const InputSync = {
    setValue(control: ValueControl, value: string): void {
        if (document.activeElement === control || control.value === value) {
            return;
        }

        control.value = value;
    },

    setChecked(input: HTMLInputElement, checked: boolean): void {
        if (input.checked === checked) {
            return;
        }

        input.checked = checked;
    },
};
