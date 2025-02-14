import {GvasString, gvasToString} from './Gvas';
import {IndustryType, industryName} from './IndustryType';
import {Quadruplet} from './Railroad';
import {Rotator} from './Rotator';
import {SplineTrackType} from './SplineTrackType';
import {Studio} from './Studio';
import {Vector} from './Vector';
import {fp32r, fp32v} from './util';

export interface InputTextOptions {
    max?: string;
    min?: string;
    step?: string;
}

export function bootstrapIcon(className: string, label: string) {
    const i = document.createElement('i');
    i.classList.add('bi', className);
    i.setAttribute('role', 'img');
    i.ariaLabel = label;
    return i;
}

export function saveContext(
    studio: Studio,
    input: Node,
    saveAction: () => boolean | void,
    cancelAction: () => boolean,
    formatValue: () => string,
): Node {
    const pre = document.createElement('pre');
    pre.classList.add('m-0');
    pre.textContent = formatValue();
    pre.addEventListener('click', () => {
        pre.parentElement?.replaceChildren(div);
    });
    // Save
    const btnSave = document.createElement('button');
    btnSave.classList.add('btn', 'btn-success');
    btnSave.appendChild(bootstrapIcon('bi-save', 'Save'));
    btnSave.addEventListener('click', () => {
        const stayOpen = saveAction();
        studio.setMapModified();
        pre.textContent = formatValue();
        if (typeof stayOpen === 'boolean' && stayOpen) return;
        // Close the edit control
        div.parentElement?.replaceChildren(pre);
    });
    // Cancel
    const btnCancel = document.createElement('button');
    btnCancel.classList.add('btn', 'btn-danger');
    btnCancel.appendChild(bootstrapIcon('bi-x-circle', 'Cancel'));
    btnCancel.addEventListener('click', () => {
        if (cancelAction()) return;
        // Close the edit control
        div.parentElement?.replaceChildren(pre);
    });
    // Layout
    const div = document.createElement('div');
    div.classList.add('hstack', 'gap-2');
    div.replaceChildren(input, btnSave, btnCancel);
    return pre;
}

export function editNumber(
    studio: Studio,
    value: number,
    options: InputTextOptions,
    saveValue: (value: number) => number,
    customFormatValue?: (value: number) => string,
) {
    const formatValue = customFormatValue ? () => customFormatValue(value) : () => {
        const num = Number.isInteger(value) ? String(value) : value.toFixed(2);
        return options.max ? `${num} / ${options.max}` : num;
    };
    const input = document.createElement('input');
    input.type = 'number';
    input.classList.add('form-control');
    if (options.max) input.max = options.max;
    if (options.min) input.min = options.min;
    if (options.step) input.step = options.step;
    input.pattern = '[0-9]+';
    input.value = String(value);
    const onSaveValue = () => {
        value = Number(input.value);
        value = saveValue(value);
        return onCancel();
    };
    const onCancel = () => {
        if (Number(input.value) !== value) {
            // Restore the original value
            input.value = String(value);
            return true;
        }
        // Close the edit control
        return false;
    };
    return saveContext(studio, input, onSaveValue, onCancel, formatValue);
}

export function editSlider(
    studio: Studio,
    value: number,
    options: InputTextOptions,
    saveValue: (value: number) => number,
    customFormatValue: (value: number) => string,
) {
    const formatValue = () => customFormatValue(value);
    const input = document.createElement('input');
    input.type = 'range';
    input.classList.add('form-range');
    if (options.max) input.max = options.max;
    if (options.min) input.min = options.min;
    if (options.step) input.step = options.step;
    input.value = String(value);
    const onSaveValue = () => {
        value = Number(input.value);
        value = saveValue(value);
        return onCancel();
    };
    const onCancel = () => {
        const inputValue = Number(input.value);
        if (inputValue !== value) {
            // Restore the original value
            input.value = String(value);
            if (inputValue === Number(input.value)) {
                // The slider was already as close as possible to the original value. Close the edit control
                return false;
            }
            updatePreview();
            return true;
        }
        // Close the edit control
        return false;
    };
    const preview = document.createElement('pre');
    preview.classList.add('mb-0');
    preview.textContent = formatValue();
    const updatePreview = () => preview.textContent = customFormatValue(Number(input.value));
    input.addEventListener('input', updatePreview);
    const form = document.createElement('form');
    form.classList.add('form-group', 'w-100');
    form.replaceChildren(preview, input);
    return saveContext(studio, form, onSaveValue, onCancel, formatValue);
}

export function editString(
    studio: Studio,
    value: GvasString,
    saveValue: (value: GvasString) => void,
) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.title = 'Null';
    checkbox.checked = (value === null);
    let tempValue = value ?? '';
    checkbox.addEventListener('click', () => {
        input.disabled = checkbox.checked;
        if (checkbox.checked) {
            tempValue = input.value;
            input.value = 'null';
        } else {
            input.value = tempValue;
        }
    });
    const input = document.createElement('input');
    input.type = 'text';
    input.disabled = (value === null);
    input.value = (value === null) ? 'null' : value;
    const onSave = () => {
        value = checkbox.checked ? null : input.value;
        saveValue(value);
    };
    const onCancel = () => {
        const newValue = checkbox.checked ? null : input.value;
        if (newValue !== value) {
            // Restore the original value
            input.disabled = checkbox.checked = (value === null);
            input.value = (value === null) ? 'null' : value;
            tempValue = value ?? '';
            return true;
        }
        // Close the edit control
        return false;
    };
        // Layout
    const form = document.createElement('form');
    form.replaceChildren(checkbox, input);
    const formatValue = () => gvasToString(value);
    return saveContext(studio, form, onSave, onCancel, formatValue);
}

export function editNumbers(
    studio: Studio,
    labels: string[],
    value: number[],
    display: (value: number[]) => string,
    saveValue: (value: number[]) => number[],
    options?: InputTextOptions,
) {
    const formatValue = () => display(value);
    const vstack = document.createElement('div');
    vstack.classList.add('vstack');
    const inputs: HTMLInputElement[] = [];
    value.forEach((v, i) => {
        const input = document.createElement('input');
        inputs.push(input);
        input.type = 'number';
        input.value = String(value[i]);
        if (options) {
            if (options.min) input.min = options.min;
            if (options.max) input.max = options.max;
            if (options.step) input.step = options.step;
        }
        input.pattern = '[0-9]+';
        input.classList.add('form-control');
        const div = document.createElement('div');
        div.classList.add('form-floating', 'mt-1', 'mb-1');
        const label = document.createElement('label');
        label.textContent = labels[i];
        div.replaceChildren(input, label);
        vstack.appendChild(div);
    });
    const onSave = () => {
        value = inputs.map((i) => Number(i.value));
        value = saveValue(value);
        return onCancel();
    };
    const onCancel = () => {
        if (!value.every((v, i) => String(v) === inputs[i].value)) {
            // Restore the original values
            inputs.forEach((input, i) => input.value = String(value[i]));
            return true;
        }
        // Close the edit control
        return false;
    };
    return saveContext(studio, vstack, onSave, onCancel, formatValue);
}

export function editIndustryProducts(
    studio: Studio,
    type: string,
    labels: Quadruplet<string>,
    values: Quadruplet<number>,
    saveValue: (value: number[]) => number[],
): Node {
    const display = (value: number[]) => {
        const zeroPredicate = (v: number): boolean => v === 0;
        if (value.every(zeroPredicate)) return '[Empty]';
        return String(value).replace(/(,0)+$/g, '');
    };
    const options = {
        min: '0',
        step: '1',
    };
    return editNumbers(studio, labels, values, display, saveValue, options);
}

export function editRotator(
    studio: Studio,
    value: Rotator,
    saveValue: (value: Rotator) => Rotator,
) {
    const encode = (r: Rotator): number[] => [r.roll, r.yaw, r.pitch];
    const decode = (t: number[]): Rotator => fp32r({roll: t[0], yaw: t[1], pitch: t[2]});
    const display = (t: number[]) => {
        if (t[0] === 0 && t[2] === 0) {
            return Number.isInteger(t[1]) ? String(t[1]) : t[1].toFixed(2);
        }
        return '[Rotator]';
    };
    const labels = ['roll', 'yaw', 'pitch'];
    const save = (t: number[]) => encode(saveValue(decode(t)));
    return editNumbers(studio, labels, encode(value), display, save);
}

export function editVector(
    studio: Studio,
    value: Vector,
    saveValue: (value: Vector) => Vector,
) {
    const encode = (v: Vector): number[] => [v.x, v.y, v.z];
    const decode = (t: number[]): Vector => fp32v({x: t[0], y: t[1], z: t[2]});
    const display = (t: number[]) => {
        const xZero = t[0] === 0;
        const yZero = t[1] === 0;
        const zZero = t[2] === 0;
        if (xZero && yZero && zZero) return '0';
        if (yZero && zZero) return (t[0] > 0) ? `X+${t[0].toFixed(2)}` : `X${t[0].toFixed(2)}`;
        if (xZero && zZero) return (t[1] > 0) ? `Y+${t[1].toFixed(2)}` : `Y${t[1].toFixed(2)}`;
        if (xZero && yZero) return (t[2] > 0) ? `Z+${t[2].toFixed(2)}` : `Z${t[2].toFixed(2)}`;
        if (t.every(Number.isInteger)) return `{${t[0]},${t[1]},${t[2]}}`;
        return '[Vector]';
    };
    const labels = ['x', 'y', 'z'];
    const save = (t: number[]) => encode(saveValue(decode(t)));
    return editNumbers(studio, labels, encode(value), display, save);
}

export function editIndustryType(
    studio: Studio,
    type: IndustryType,
    saveValue: (value: IndustryType) => void,
): Node {
    const options: {[key: string]: string} = {};
    for (const key in IndustryType) {
        if (!isNaN(Number(key))) continue;
        const i = Number(IndustryType[key]);
        if (isNaN(i)) continue;
        options[String(i)] = industryName[i as IndustryType] || 'Unknown';
    }
    const save = (value: string) => saveValue(Number(value) as IndustryType);
    return editDropdown(studio, String(type), options, save);
}

export function editTrackType(
    studio: Studio,
    type: SplineTrackType,
    saveValue: (value: SplineTrackType) => unknown,
): Node {
    const options = Object.fromEntries(
        Object.values(SplineTrackType)
            .map((v) => [v, v]));
    const save = (value: string) => saveValue(value as SplineTrackType);
    return editDropdown(studio, type, options, save);
}

export function editDropdown(
    studio: Studio,
    value: string,
    options: Record<string, string>,
    saveValue: (value: string) => unknown,
): Node {
    const select = document.createElement('select');
    select.classList.add('form-select');
    for (const [value, text] of Object.entries(options)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
    }
    select.value = String(value);
    const onSave = () => {
        value = select.value;
        saveValue(value);
    };
    const onCancel = () => {
        if (select.value !== value) {
            // Restore the original value
            select.value = value;
            return true;
        }
        // Close the edit control
        return false;
    };
    const formatValue = () => (options[value] || 'Unknown');
    return saveContext(studio, select, onSave, onCancel, formatValue);
}
