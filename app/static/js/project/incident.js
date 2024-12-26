import {ctx, datatables_init} from "../datatables/dt.js";
import {FormioPopup, AlertPopup} from "../common/popup.js";
import {fetch_get} from "../common/common.js";
import {badge_raw2hex} from "../common/rfid.js";


const __incident_new_cb = async () => {
    const incident_popup = await fetch_get("api.popup_get", {id: "popup-new-update-incident"})
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
                                const lis_nbr = await fetch_get("incident.get_lis_badge_id", {code});
                                if (lis_nbr)
                                    form.set_value("lis-badge-number", lis_nbr.data);
                            } else form.set_value("lis-badge-number", res);
                        }
                    })
                }
                if (action === "owner-badge-scan-event") {
                    bootbox.prompt({
                        title: "Scan de badge van de eigenaar",
                        callback: async res => {
                            const [valid_code, code] = badge_raw2hex(res);
                            if (valid_code) {
                                const user_id = await fetch_get("api.student_get", {rfid: code});
                                if (user_id)
                                    form.set_value("owner-name-id", user_id.data.leerlingnummer);
                            }
                        }
                    })
                }
                if (action === "change" && data.changed) {
                    if (data.changed.component.key === "owner-name-id") {
                        // const leerlingnummer = data.changed.value;
                        const leerlingnummer = form.get_value("owner-name-id");
                        const url = `${incident_popup.data.url}/student/get?filters=leerlingnummer$=$${leerlingnummer}`
                        const fetch_resp = await fetch(url, {headers: {'x-api-key': incident_popup.data.key}});
                        var resp = await fetch_resp.json();
                        if ("status" in resp) {
                            const user_entra_id = resp.data[0].entra_id;
                            const url = `${incident_popup.data.url}/device/get?filters=user_entra_id$=$${user_entra_id},active$=$null`
                            const fetch_resp = await fetch(url, {headers: {'x-api-key': incident_popup.data.key}});
                            resp = await fetch_resp.json();
                            const devices = resp.data;
                            var options = [];
                            var default_value = null;
                            for (const device of devices) {
                                const label =  device.m4s_csu_label !== device.m4s_signpost_label ? `${device.m4s_csu_label}/${device.m4s_signpost_label}` :device.m4s_csu_label
                                options.push({label , data: device.serial_number})
                                default_value = (device.active == 1) ? device.serial_number : null;
                            }
                            // Seems to work better with the timeout, no idea why....
                            setTimeout(() => form.set_options("laptop-id", options, default_value), 500);
                        }
                    }
                }
            },
            events: ["lis-badge-scan-event", "owner-badge-scan-event", "change"],
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
