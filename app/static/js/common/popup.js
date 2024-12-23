// create a popup the displayes a message with a specified bordercolor
// the popup disappears after a delay (5s) or when clicked next to the popup
export class AlertPopup {
    timer_id = null;
    constructor(status = "ok", msg, delay = 5000) {
        if (this.timer_id !== null) clearTimeout(timer.timer_id);
        this.timer_id = setTimeout(() => bootbox.hideAll(), delay);
        bootbox.dialog({
            backdrop: true,
            message: msg,
            closeButton: false,
            className: status === "ok" ? "timed-popup-ok" : status === "warning" ? "timed-popup-warning" : "timed-popup-error"
        })
    }
}

// popup with a formio-layout
// standard are the submit, cancel and clear events returned.  events is a list of additional events
export class FormioPopup {
    formio_handle = null;

    async init({template = null, events = [], cb = null, defaults = null, opaque = null, width = null}) {
        if (template === null) return false
        const form_options = {sanitizeConfig: {addTags: ['iframe'], addAttr: ['allow'], ALLOWED_TAGS: ['iframe'], ALLOWED_ATTR: ['allow']},/* noAlerts: true,*/}
        const overlay = document.createElement("div");
        overlay.classList.add("overlay");
        const popup = document.createElement("div");
        overlay.appendChild(popup)
        popup.classList.add("popup");
        document.querySelector("body").appendChild(overlay);
        if (width)
            popup.style.width = width;
        this.formio_handle = await Formio.createForm(popup, template, form_options)
        if (defaults != null) {
            for (const [k, v] of Object.entries(defaults)) {
                const c = this.formio_handle.getComponent(k)
                if (c !== undefined && c !== null) {
                    if (c.type === "select") {
                        c.component.data.json = v;
                    } else c.setValue(v);
                }
            }
        }
        if (cb !== null) {
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
            for (const event of events) {
                this.formio_handle.on(event, () => cb(event, opaque));
            }
        }
        return true
    }

    set_value = (key, value) => {
        const c = this.formio_handle.getComponent(key)
        if (c !== undefined && c !== null) c.setValue(value);
    }
}