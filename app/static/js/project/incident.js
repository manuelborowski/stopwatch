import {datatable_reload_table, datatables_init} from "../datatables/dt.js";
import {FormioPopup} from "../common/popup.js";
import {fetch_get, fetch_post} from "../common/common.js";
import {badge_raw2hex} from "../common/rfid.js";


const __incident_new_cb = async () => {
    const incident_popup = await fetch_get("api.popup_get", {id: "popup-new-update-incident"})
    if (incident_popup) {
        const form = new FormioPopup();
        await form.init({
            template: incident_popup.template,
            cb: async (action, opaque, data = null) => {
                if (action === 'submit') {
                    const status = fetch_post("incident.incident", {data})
                    datatable_reload_table();
                }
                if (action === "lis-badge-scan-event") {
                    bootbox.prompt({
                        title: "Scan een lege LIS-badge",
                        callback: async res => {
                            const [valid_code, code] = badge_raw2hex(res);
                            if (valid_code) {
                                const lis_nbr = await fetch_get("incident.lis_badge_get_id", {code});
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
                    if (data.changed.component.key === "laptop-type") {
                        const type = form.get_value("laptop-type");
                        if (type === "leerling") {
                            const ret = await fetch_get("incident.options_student");
                            if (ret) {
                                form.set_options("owner-name-id", ret.options);
                            }
                        } else if (type === "personeel") {
                            const ret = await fetch_get("incident.options_staff");
                            if (ret) {
                                form.set_options("owner-name-id", ret.options);
                            }
                        }
                    }
                    if (data.changed.component.key === "owner-name-id" && form.get_value("laptop-type") === "leerling") {
                        const laptop_type = form.get_value("laptop-type");
                        const value_data = form.get_value("owner-name-id");
                        const url_suffix = laptop_type === "leerling" ? `student?filters=leerlingnummer$=$${value_data.data}` : `staff?filters=code$=$${value_data.data}`
                        const url = `${incident_popup.data.url}/${url_suffix}`
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
                                const label = device.m4s_csu_label !== device.m4s_signpost_label ? `${device.m4s_csu_label}/${device.m4s_signpost_label}` : device.m4s_csu_label
                                options.push({label, data: device.serial_number})
                                default_value = (device.active == 1) ? device.serial_number : null;
                            }
                            // Seems to work better with the timeout, no idea why....
                            form.set_options("laptop-id", options, default_value);
                        }
                    }
                }
            },
            events: ["lis-badge-scan-event", "owner-badge-scan-event", "change"],
            defaults: incident_popup.defaults,
            width: "70%",
        });
        form.set_value("incident-location", data.locations.default);
        const ret = await fetch_get("incident.options_student");
        if (ret) {
            form.set_options("owner-name-id", ret.options);
        }

    }
}

const __save_default_location = () => {
    data.locations.default = document.querySelector("#location-default").value;
    const status = fetch_post("incident.location_set_default", {"location": data.locations.default})
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
        label: 'Locatie',
        options: data.locations.options,
        default: data.locations.default,
        cb: __save_default_location
    },
]

$(document).ready(function () {
    datatables_init({button_menu_items});
});
