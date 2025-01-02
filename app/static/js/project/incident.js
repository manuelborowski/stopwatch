import {datatable_reload_table, datatables_init} from "../datatables/dt.js";
import {fetch_get, fetch_post, form_default_set} from "../common/common.js";
import {badge_raw2hex} from "../common/rfid.js";
import {AlertPopup} from "../common/popup.js";

const __incident_new_cb = async () => {
    const __set_owner_options = async (placeholder, type) => {
        //populate options of owner field
        if (["leerling", "personeel"].includes(type)) {
            document.getElementById("owner-row").hidden = false;
            const ret = type === "leerling" ? await fetch_get("incident.student_options") : await fetch_get("incident.staff_options")
            if (ret) {
                let data = []
                for (const owner of ret.options) {
                    data.push({id: owner.data, text: owner.label})
                }
                if (placeholder.hasClass("select2-hidden-accessible")) placeholder.empty().select2('destroy').trigger("change")
                placeholder.select2({dropdownParent: $(".bootbox"), data, width: "600px"});
                placeholder.val(data[0].id).trigger("change");
            }
        } else {
            document.getElementById("owner-row").hidden = true;
        }
    }

    const form = await fetch_get("incident.form")
    if (form) {
        let owner_field = null;
        bootbox.dialog({
            title: "Nieuw incident (* is verplicht)",
            size: "xl",
            message: form.template,
            buttons: {
                confirm: {
                    label: "Submit",
                    className: "btn-primary",
                    callback: async () => {
                        const form_data = new FormData(document.getElementById("incident-form"));
                        const data = Object.fromEntries(form_data)
                        const owner_data = owner_field.select2("data")[0];
                        data.owner_name = owner_data.text;
                        data.laptop_name = document.getElementById("laptop-field").selectedOptions[0].textContent;
                        if (data.lis_badge_id === "" || data.owner_id === "" || data.laptop_serial === "") {
                            new AlertPopup("warning", "'Lis-badgenummer', 'Eigenaar' en 'Laptop' moeten ingevuld zijn.")
                        } else {
                            data.lis_badge_id = parseInt(data.lis_badge_id);
                            await fetch_post("incident.incident", data);
                            datatable_reload_table();
                        }
                    },
                },
                cancel: {label: "Cancel", className: "btn-secondary",},
            },
            onShown: async () => {
                owner_field = $("#owner-field");

                // if the laptop-type field changes, update the options of the owner field
                document.getElementById("laptop-type-field").addEventListener("change", e => __set_owner_options(owner_field, e.target.value));

                // Scan LIS badge
                document.getElementById("lis-badge-scan").addEventListener("click", () => {
                    bootbox.prompt({
                        title: "Scan de LIS badge",
                        callback: async res => {
                            const [valid_code, code] = badge_raw2hex(res);
                            if (valid_code) {
                                const badge = await fetch_get("incident.lis_badge", {"rfid": code})
                                if (badge) {
                                    document.getElementById("lis-badge-field").value = badge.data.id;
                                }
                            }
                        }
                    })
                });

                // Scan owner badge
                document.getElementById("owner-badge-scan").addEventListener("click", () => {
                    bootbox.prompt({
                        title: "Scan de badge van de eigenaar",
                        callback: async res => {
                            const [valid_code, code] = badge_raw2hex(res);
                            if (valid_code) {
                                if (document.getElementById("laptop-type-field").value === "leerling") {
                                    const user = await fetch_get("incident.student", {rfid: code});
                                    if (user) owner_field.val(user.data.leerlingnummer).trigger("change");
                                } else {
                                    const user = await fetch_get("incident.staff", {rfid: code});
                                    if (user) owner_field.val(user.data.code).trigger("change");
                                }
                            }
                        }
                    })
                });

                // when the owner field changes, get the associated laptops and populate the laptop field
                owner_field.on('change', async e => {
                    const laptop_type = document.getElementById("laptop-type-field").value;
                    const owner_id = e.target.value;
                    if (owner_id !== "") {
                        const url_suffix = laptop_type === "leerling" ? `student?filters=leerlingnummer$=$${owner_id}` : `staff?filters=code$=$${owner_id}`
                        const url = `${form.data.url}/${url_suffix}`
                        const fetch_resp = await fetch(url, {headers: {'x-api-key': form.data.key}});
                        let resp = await fetch_resp.json();
                        if ("status" in resp) {
                            const user_entra_id = resp.data[0].entra_id;
                            const url = `${form.data.url}/device/get?filters=user_entra_id$=$${user_entra_id},active$=$null`
                            const fetch_resp = await fetch(url, {headers: {'x-api-key': form.data.key}});
                            resp = await fetch_resp.json();
                            const devices = resp.data;
                            const laptop_field = document.getElementById("laptop-field");
                            laptop_field.innerHTML = "";
                            for (const device of devices) {
                                const label_list = [...new Set([device.m4s_csu_label, device.m4s_signpost_label, device.device_name])].filter(e => e !== null);
                                const label = label_list.join(" / ");
                                const option = document.createElement("option");
                                option.innerHTML = label;
                                option.value = device.serial_number;
                                if (device.active === true) option.selected = true;
                                laptop_field.appendChild(option);
                            }
                        }
                    }
                });

                // if default password checked, disable the password field
                document.getElementById("password-default-chk").addEventListener("click", e => document.getElementById("password-field").disabled = e.target.checked);

                // set default owner list
                __set_owner_options(owner_field, document.getElementById("laptop-type-field").value);

                // set default values
                form_default_set(form.defaults);

                // hide/display water and drop-damage checkboxes
                document.getElementById("lis-type-field").addEventListener("change", e => {
                    document.getElementById("drop-damage-chk").disabled = e.target.value !== "hardware"
                    document.getElementById("water-damage-chk").disabled = e.target.value !== "hardware"
                })

            },
        });

    }
}


const __save_default_location = () => {
    data.locations.default = document.querySelector("#location-default").value;
    const status = fetch_post("incident.location_default", {"location": data.locations.default})
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
