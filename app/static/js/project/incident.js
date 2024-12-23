import {ctx, datatables_init} from "../datatables/dt.js";
import {FormioPopup, AlertPopup} from "../common/popup.js";
import {api_get} from "../common/common.js";
import {badge_raw2hex} from "../common/rfid.js";


const __incident_new_cb = async () => {
    const incident_popup = await api_get("popup_get", {id: "popup-new-update-incident"})
    if (incident_popup) {
        const form = new FormioPopup();
        await form.init({
            template: incident_popup.template,
            cb: async (action, opaque, data = null) => {
                if (action === 'submit') {
                    alert("submit pushed");
                }
                if (action === "lis-badge-scan-event") {
                    bootbox.prompt({
                        title: "Scan een lege LIS-badge",
                        callback: async res => {
                            const [valid_code, code] = badge_raw2hex(res);
                            if (valid_code) {
                                const ret = await fetch(Flask.url_for("incident.get_lis_badge_id", {code}));
                                const status = await ret.json();
                                if (status.status)
                                    form.set_value("lis-badge-number", status.data);
                                else
                                    new AlertPopup("warning", status.data)
                            } else form.set_value("lis-badge-number", res);


                        }
                    })
                }
            },
            events: ["lis-badge-scan-event"],
            defaults: incident_popup.defaults,
            width: "70%",
        });
    }
}

const button_menu_items = [
    {
        type: 'button',
        id: 'incident-new',
        label: 'Nieuw',
        cb: __incident_new_cb
    },
    {
        type: 'select',
        id: 'location-default',
        label: 'Post',
        options: [{value: "none", label: "-"}, {value: "balie-sum", label: "Balie SUM"}, {value: "ict-sum", label: "ICT SUM"}],
        default: 'none',
        cb: __incident_new_cb
    },
]

$(document).ready(function () {
    datatables_init({button_menu_items});
});
