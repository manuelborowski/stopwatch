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
                        c.component.data.json = v.options;
                        if ("default" in v) c.setValue(v.default);
                    } else c.setValue(v);
                }
            }
        }
        if (cb !== null) {
            this.formio_handle.on('submit', async submitted => {
                cb('submit', opaque, submitted.data);
                overlay.remove()
            });
            this.formio_handle.on('cancel', async () => {
                cb('cancel', opaque)
                overlay.remove()
            });
            this.formio_handle.on('clear', async () => {
                cb('clear', opaque)
                overlay.remove()
            });
            for (const event of events) {
                this.formio_handle.on(event, data => cb(event, opaque, data));
            }
        }
        return true
    }

    set_value = (key, value) => {
        const c = this.formio_handle.getComponent(key)
        if (c !== undefined && c !== null) c.setValue(value);
    }

    get_value = (key) => {
        const c = this.formio_handle.getComponent(key)
        if (c !== undefined && c !== null) return c.getValue();
    }

    // I have no clue how to set the options and default value of a select component.  Below is the result of trial and error
    set_options = (key, options, default_value = null) => {
        const c = this.formio_handle.getComponent(key)
        if (c !== undefined && c !== null) {
            setTimeout(() => {
                c.component.data.json = options
                c.redraw();
            }, 500);
            // c.setItems(options)
            // c.component.data.values = options;
            // c.component.data.json = options;
            // c.selectOptions = options.map(({value, label}) => ({value, label: `<span>${label}</span>`}));
            // c.selectItems = options;
            // c.templateData = {}
            // c.defaultDownloadedResources = []
            // if (default_value) c.setValue(default_value);
            // c.component.data.selectOptions = c.component.data.selectItems;
            // setTimeout(() => {
            //     if (default_value) c.component.defaultValue = default_value;
            //     if (default_value) c.component.value = default_value;
            //     c.redraw();
            // }, 500);
            // c.redraw();
            // if (default_value) c.setValue(default_value);
            // this.formio_handle.redraw();
        }
    }

}