import {AlertPopup} from "./popup.js";

export const fetch_post = async (endpoint, body) => {
    const response = await fetch(Flask.url_for(endpoint), {headers: {'x-api-key': api_key,}, method: 'POST', body: JSON.stringify(body),});
    const data = await response.json();
    if ("status" in data) {
        new AlertPopup(data.status, data.msg);
        return null;
    }
    return data
}

export const fetch_update = async (endpoint, body) => {
    const response = await fetch(Flask.url_for(endpoint), {headers: {'x-api-key': api_key,}, method: 'UPDATE', body: JSON.stringify(body),});
    const data = await response.json();
    if ("status" in data) {
        new AlertPopup(data.status, data.msg);
        return null;
    }
    return data
}

export const fetch_get = async (endpoint, args) => {
    const respone = await fetch(Flask.url_for(endpoint, args), {headers: {'x-api-key': api_key,}});
    const data = await respone.json();
    if ("status" in data) {
        new AlertPopup(data.status, data.msg);
        return null;
    }
    return data
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