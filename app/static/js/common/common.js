import {AlertPopup} from "./popup.js";

const __handle_fetch = async resp => {
    const data = await resp.json();
    if ("status" in data) {
        new AlertPopup(data.status, data.msg);
        return null;
    }
    return data
}

export const fetch_post = async (endpoint, body) => {
    const response = await fetch(Flask.url_for(endpoint), {method: 'POST', body: JSON.stringify(body),});
    return __handle_fetch(response);
}

export const fetch_update = async (endpoint, body) => {
    const response = await fetch(Flask.url_for(endpoint), {method: 'UPDATE', body: JSON.stringify(body),});
    return __handle_fetch(response);
}

export const fetch_get = async (endpoint, args = {}) => {
    const response = await fetch(Flask.url_for(endpoint, args));
    return __handle_fetch(response);
}

export const fetch_delete = async (endpoint, args) => {
    const response = await fetch(Flask.url_for(endpoint, args), {method: "DELETE"});
    return __handle_fetch(response);
}

export const form_default_set = (defaults) => {
    for (const def of defaults) {
        const field = document.getElementById(def.id);
        if (def.type === "select") {
            field.innerHTML = "";
            for (const option of def.options) {
                const o = document.createElement("option");
                o.label = option.label;
                o.value = option.value;
                o.selected = (def.default || null) === option.value;
                field.appendChild(o);
            }
        }
    }
}

export const form_populate = async (data, meta=null) => {
    for (let [field_name, value] of Object.entries(data)) {
        const field = document.querySelector(`[name=${field_name}]`);
        if (field) {
            if (field.type === "checkbox") {
                field.checked = value;
            } else if (field.classList.contains("select2-hidden-accessible")) { // select2 type
                await $(`[name=${field_name}]`).val(value).trigger("change");
            } else if (field.type === "select-one") {
                if (meta && field_name in meta.option) {
                    for (const item of meta.option[field_name]) {
                        const option = document.createElement("option");
                        field.appendChild(option);
                        option.innerHTML = item.label;
                        option.value = item.value;
                        option.selected = value === item.value;
                    }
                }
            } else {
                if (meta && field_name in meta.label) value = meta.label[field_name][value];
                field.value = value;
            }
        }
    }
}


let busy_indicator = null;

export function busy_indication_on() {
    // document.querySelector(".busy-indicator").style.display = "block";
    busy_indicator = document.createElement("div");
    busy_indicator.classList.add(".busy-indicator");
    document.querySelector("body").appendChild(busy_indicator);
}

export function busy_indication_off() {
    // document.querySelector(".busy-indicator").style.display = "none";
    if (busy_indicator !== null) busy_indicator.remove();
    busy_indicator = null;
}