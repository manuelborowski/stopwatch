
// simple popup (single h2) that is removed after a specified delay (default 5s)
export class TimedPopup {
    timer_id = null;
    constructor(msg, color = "green", delay = 5000) {
        if (this.timer_id !== null) clearTimeout(timer.timer_id);
        const overlay_div = document.createElement("div");
        overlay_div.classList.add("overlay");
        const popup_div = document.createElement("div");
        popup_div.classList.add("popup");
        popup_div.style.borderColor = color;
        overlay_div.appendChild(popup_div);
        const message = document.createElement("h2");
        message.innerHTML = msg;
        popup_div.appendChild(message);
        const body = document.querySelector("body");
        body.appendChild(overlay_div);
        overlay_div.addEventListener("click", () => overlay_div.remove());
        this.timer_id = setTimeout(() => overlay_div.remove(), delay);
    }
}

// popup with a formio-layout
export class FormioPopup {
    formio_handle = null;
    async init(template, cb = null, defaults = null, opaque = null, width = null) {
        const form_options = {sanitizeConfig: {addTags: ['iframe'], addAttr: ['allow'], ALLOWED_TAGS: ['iframe'], ALLOWED_ATTR: ['allow']},/* noAlerts: true,*/}
        const overlay = document.createElement("div");
        overlay.classList.add("overlay");
        const popup = document.createElement("div");
        overlay.appendChild(popup)
        popup.classList.add("popup");
        document.querySelector("body").appendChild(overlay);
        if (width)
            popup.style.maxWidth = width;
        this.formio_handle = await Formio.createForm(popup, template, form_options)
        if (defaults != null) {
            for (const [k, v] of Object.entries(defaults)) {
                const c = this.formio_handle.getComponent(k)
                if (c !== undefined) c.setValue(v);
            }
        }
        this.formio_handle.on('submit', async submitted => {
            cb('submit', opaque, submitted.data);
            overlay.remove()
        });
        this.formio_handle.on('cancel', () => {
            cb('cancel', opaque)
            overlay.remove()
        });
        this.formio_handle.on('clear', () => {
            cb('clear', opaque)
            overlay.remove()
        });
    }
}