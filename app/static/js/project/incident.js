import {datatable_loaded_subscribe, datatable_reload_table, datatable_row_data_from_target, datatables_init, update_cell} from "../datatables/dt.js";
import {fetch_get, fetch_post, fetch_update, form_default_set, form_populate} from "../common/common.js";
import {badge_raw2hex} from "../common/rfid.js";
import {AlertPopup, FormioPopup} from "../common/popup.js";
import {qr_decode} from "../common/qr.js";

const meta = await fetch_get("incident.meta")

const __incident_show_form = async (params = {}) => {
    const incident_update = "id" in params;
    const __set_owner_options = async (placeholder, type) => {
        //populate options of owner field
        if (["leerling", "personeel"].includes(type)) {
            document.getElementById("owner-row").hidden = false;
            let data = [];
            if (type === "leerling") {
                const owners = await fetch_get("student.student", {fields: "naam,voornaam,klasgroepcode,leerlingnummer"})
                data = owners ? owners.map(e => ({id: e.leerlingnummer, text: `${e.naam} ${e.voornaam} ${e.klasgroepcode}`})) : []
            } else {
                const owners = await fetch_get("staff.staff", {fields: "naam,voornaam,code"})
                data = owners ? owners.map(e => ({id: e.code, text: `${e.naam} ${e.voornaam}`})) : []
            }
            if (placeholder.hasClass("select2-hidden-accessible")) await placeholder.empty().select2('destroy').trigger("change")
            await placeholder.select2({dropdownParent: $(".bootbox"), data, width: "600px"});
            if (data.length > 0) await placeholder.val(data[0].id).trigger("change"); // use await to make sure the select2 is done initializing
        } else {
            document.getElementById("owner-row").hidden = true;
        }
    }

    const __state_select_set = current_state => {
        const next_states = {
            started: ["transition", "repaired"],
            transition: ["started"],
            repaired: ["started", "transition"],
        }
        const incident_state_field = document.getElementById("incident-state-field");
        incident_state_field.innerHTML = "";
        for (const state of [current_state].concat(next_states[current_state])) {
            incident_state_field.add(new Option(meta.label.incident_state[state], state, current_state === state));
        }
        document.getElementById("location-field").disabled = !["started", "repaired"].includes(current_state);
    }

    const title = incident_update ? "Incident aanpassen" : "Nieuw incident (* is verplicht)";
    const form = await fetch_get("incident.form", {form: incident_update ? "incident-update" : "incident-new"});
    if (form) {
        let owner_field = null;
        bootbox.dialog({
            title,
            size: "xl",
            message: form.template,
            buttons: {
                confirm: {
                    label: "Bewaar",
                    className: "btn-primary",
                    callback: async () => {
                        const form_data = new FormData(document.getElementById("incident-form"));
                        const data = Object.fromEntries(form_data)
                        // checkboxes are present only when selected and have the value "on" => convert
                        document.getElementById("incident-form").querySelectorAll("input[type='checkbox']").forEach(c => data[c.name] = c.name in data)
                        if (incident_update) {
                            data.id = params.id;
                            data.event = document.getElementById("incident-state-field").value;
                            await fetch_update("incident.incident", data);
                        } else {
                            const owner_data = owner_field.select2("data")[0];
                            data.laptop_owner_name = owner_data.text;
                            data.laptop_name = document.getElementById("laptop-field").selectedOptions[0].label;
                            if (data.lis_badge_id === "" || data.laptop_owner_id === "" || data.laptop_serial === "") {
                                new AlertPopup("warning", "'Lis-badgenummer', 'Eigenaar' en 'Laptop' moeten ingevuld zijn.")
                                return
                            }
                            data.lis_badge_id = parseInt(data.lis_badge_id);
                            data.location = view_data.locations.default;
                            await fetch_post("incident.incident", data);
                        }
                        datatable_reload_table();
                    }
                },
                cancel: {
                    label: "Annuleer", className: "btn-secondary", callback: async () => {
                        if (incident_update) {
                            datatable_reload_table();
                        }
                    }
                },
            },
            onShown: async () => {
                if (!incident_update) {
                    owner_field = $("#owner-field");

                    // if the laptop-type field changes, update the options of the owner field
                    document.getElementById("laptop-type-field").addEventListener("change", e => __set_owner_options(owner_field, e.target.value));

                    // Scan LIS badge
                    document.getElementById("lis-badge-scan").addEventListener("click", (e) => {
                        e.preventDefault();
                        bootbox.prompt({
                            title: "Scan de LIS badge",
                            callback: async res => {
                                if (res !== null) {
                                    const [valid_code, code] = badge_raw2hex(res);
                                    if (valid_code) {
                                        const badges = await fetch_get("lisbadge.lisbadge", {filters: `rfid$=$${code}`})
                                        if (badges && badges.length > 0) document.getElementById("lis-badge-field").value = badges[0].id;
                                    }
                                }
                            }
                        })
                    });

                    // Scan laptop owner badge
                    document.getElementById("owner-badge-scan").addEventListener("click", (e) => {
                        e.preventDefault();
                        bootbox.prompt({
                            title: "Scan de badge van de eigenaar",
                            callback: async res => {
                                if (res !== null) {
                                    const [valid_code, code] = badge_raw2hex(res);
                                    if (valid_code) {
                                        if (document.getElementById("laptop-type-field").value === "leerling") {
                                            const owners = await fetch_get("student.student", {filters: `rfid$=$${code}`, fields: "leerlingnummer"});
                                            if (owners && owners.length > 0) owner_field.val(owners[0].leerlingnummer).trigger("change");
                                        } else {
                                            const owners = await fetch_get("staff.staff", {filters: `rfid$=$${code}`, fields: "code"});
                                            if (owners && owners.length > 0) owner_field.val(owners[0].code).trigger("change");
                                        }
                                    }
                                }
                            }
                        })
                    });

                    // Scan laptop owner laptop -> QR code
                    document.getElementById("laptop-code-scan").addEventListener("click", (e) => {
                        e.preventDefault();
                        bootbox.prompt({
                            title: "Scan de QR code van de laptop",
                            callback: async res => {
                                if (res !== null) {
                                    const label = qr_decode(res);
                                    const laptop_field = document.getElementById("laptop-field");
                                    laptop_field.innerHTML = "";
                                    const option = document.createElement("option");
                                    laptop_field.appendChild(option);
                                    option.label = label;
                                    option.value = label;
                                    option.selected = true;
                                }
                            }
                        })
                    });

                    // Scan spare badge
                    document.getElementById("spare-badge-scan").addEventListener("click", (e) => {
                        e.preventDefault();
                        bootbox.prompt({
                            title: "Scan de badge van de reservelaptop",
                            callback: async res => {
                                if (res !== null) {
                                    const [valid_code, code] = badge_raw2hex(res);
                                    if (valid_code) {
                                        const spares = await fetch_get("spare.spare", {filters: `rfid$=$${code}`, fields: "label"});
                                        if (spares && spares.length > 0) document.getElementById("spare-field").value = spares[0].label;
                                    }
                                }
                            }
                        })
                    });

                    // when the owner field changes, get the associated laptops and populate the laptop field
                    owner_field.on('change', async e => {
                        const laptop_type = document.getElementById("laptop-type-field").value;
                        const laptop_owner_id = e.target.value;
                        if (laptop_owner_id !== "") {
                            const url_suffix = laptop_type === "leerling" ? `student?filters=leerlingnummer$=$${laptop_owner_id}` : `staff?filters=code$=$${laptop_owner_id}`
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
                }
                // if default password checked, disable the password field
                document.getElementById("password-default-chk").addEventListener("click", e => {
                    document.getElementById("password-field").disabled = e.target.checked;
                    if (e.target.checked) bootbox.alert(`Opgelet, het paswoord wordt aangepast naar <b>${meta.default_password}</b>`)
                });

                // set default values
                if (incident_update) {
                    const incidents = await fetch_get("incident.incident", {filters: `id$=$${params.id}`});
                    const incident = incidents && incidents.length > 0 ? incidents[0] : null;
                    const histories = await fetch_get("history.history", {filters: `incident_id$=$${params.id}`});
                    let infos = histories.map(e => e.info).filter(e => e !== "").join("<br>");
                    if (infos !== "") {
                        const previous_info_field = document.getElementById("info_previous");
                        previous_info_field.innerHTML = infos;
                        previous_info_field.closest(".form-row").hidden = false;
                    }
                    if (incident) {
                        __state_select_set(incident.incident_state);
                        delete incident.incident_state; // avoid initializing it twice
                        incident["info"] = "";
                        // if the location is updated, change the event to transition
                        document.getElementById("location-field").addEventListener("change", e => {
                            document.getElementById("incident-state-field").value = "transition";
                        });
                        // if the state is changed (not transition), set the location to the original location.  This to prevent the state and location are changed at the same time.
                        document.getElementById("incident-state-field").addEventListener("change", e => {
                            if (e.target.value !== "transition") document.getElementById("location-field").value = incident.location;
                        });


                        await form_populate(incident, meta);
                    }
                } else {
                    // set default owner list
                    await __set_owner_options(owner_field, document.getElementById("laptop-type-field").value);
                    await form_populate(meta.default, meta);
                }

                // hide/display water and drop-damage checkboxes
                document.getElementById("lis-type-field").addEventListener("change", e => {
                    document.getElementById("drop-damage-chk").disabled = e.target.value !== "hardware"
                    document.getElementById("water-damage-chk").disabled = e.target.value !== "hardware"
                })
                document.getElementById("lis-type-field").dispatchEvent(new Event("change"));
            },
        });
    }
}

const __view_history = async (ids) => {
    const id = ids[0];
    const form = await fetch_get("incident.form", {form: "history"});
    if (form) {
        let owner_field = null;
        bootbox.dialog({
            title: "Incident historiek",
            size: "xl",
            message: form.template,
            buttons: {
                cancel: {
                    label: "Annuleer", className: "btn-secondary", callback: async () => {
                    }
                },
            },
            onShown: async () => {
                form_default_set(form.defaults);
                const incidents = await fetch_get("incident.incident", {filters: `id$=$${id}`});
                const incident = incidents && incidents.length > 0 ? incidents[0] : null;
                const histories = await fetch_get("history.history", {filters: `incident_id$=$${id}`});
                const history_table = document.querySelector("#history-table");
                for (const h of histories) {
                    let tr = "<tr>";
                    for (const e of ["incident_owner", "priority", "incident_state", "location", "info", "time", "incident_type", "drop_damage", "water_damage"]) {
                        let val = h[e];
                        if (e === "incident_state") val = meta.label.incident_state[val];
                        if (e === "location") val = meta.label.location[val];
                        if (val === true) val = "&#10003;"
                        if (val === false) val = "";
                        tr += `<td>${val}</td>`
                    }
                    tr += "</tr>";
                    history_table.innerHTML += tr;
                }
                await form_populate(incident);
                document.querySelectorAll(".form-group-1").forEach(e => e.disabled = true);
            },
        });
    }
}

const __save_default_location = () => {
    view_data.locations.default = document.querySelector("#location-default").value;
    const status = fetch_post("incident.location", {default: view_data.locations.default})
}

const button_menu_items = [
    {
        type: 'button',
        id: 'incident-new',
        label: 'Nieuw',
        cb: () => __incident_show_form()
    },
    {
        type: 'select',
        id: 'location-default',
        label: 'Standaardlocatie',
        options: view_data.locations.options,
        default: view_data.locations.default,
        cb: __save_default_location
    },
]

const context_menu_items = [
    {type: "item", label: 'Historiek', iconscout: 'history', cb: __view_history},
]

const __table_loaded = opaque => {
    document.querySelectorAll(".btn-incident-update").forEach(s => s.addEventListener("click", async e => {
        const row = datatable_row_data_from_target(e);
        await __incident_show_form({id: row.id});
    }));
    document.querySelectorAll(".btn-show-history").forEach(s => s.addEventListener("click", async e => {
        const row = datatable_row_data_from_target(e);
        await __view_history([row.id]);
    }));
    document.querySelectorAll(".btn-send-message").forEach(s => s.addEventListener("click", async e => {
        const row = datatable_row_data_from_target(e);
        await fetch_update("incident.incident", {id: row.id, event: "message", info: "Bericht verstuurd"});
        datatable_reload_table();
    }));
    document.querySelectorAll(".btn-incident-close").forEach(s => s.addEventListener("click", async e => {
        const row = datatable_row_data_from_target(e);
        await fetch_update("incident.incident", {id: row.id, event: "closed", info: "Incident gesloten"});
        datatable_reload_table();
    }));
}

const __filter_scan_lis_badge = () => {
        bootbox.prompt({
            title: "Scan de LIS badge",
            callback: async res => {
                if (res !== null) {
                    const [valid_code, code] = badge_raw2hex(res);
                    let lis_id = null;
                    if (valid_code) {
                        const badges = await fetch_get("lisbadge.lisbadge", {filters: `rfid$=$${code}`})
                        if (badges && badges.length > 0) lis_id = badges[0].id;
                    } else {
                        lis_id = code;  // it is assumed a valid lis code is entered
                    }
                    const incidents = await fetch_get("incident.incident", {filters: `lis_badge_id$=$${lis_id},incident_state$!$closed`, fields: "id"})
                    if (incidents && incidents.length > 0) {
                        const latest_id = incidents.reduce((max, item) => item.id > max.id ? item : max).id;
                        location.href = `${location.href}?id=${latest_id}`;
                    }
                }
            }
        });
}

const filter_menu_items = [
    {
        type: 'select',
        id: 'incident-owner-id',
        label: 'Hersteller',
        persistent: true
    },
    {
        type: 'select',
        id: 'incident-state',
        label: 'Status',
        persistent: true
    },
    {
        type: 'checkbox',
        id: 'incident-state-closed',
        label: 'Afgeleverd?',
        default: false,
        persistent: true
    },
    {
        type: 'button',
        id: 'btn-scan-lis-badge',
        label: 'Scan LIS',
        callback: __filter_scan_lis_badge
    },
]

$(document).ready(async () => {
    datatable_loaded_subscribe(__table_loaded, null);
    let owners = await fetch_get("incident.incident", {fields: "incident_owner"});
    owners = owners ? [...new Set(owners.map(e => e.incident_owner))] : [];
    owners = owners.map(e => ({label: e, value: e}));
    const incident_owner_options = [{label: current_user.username, value: current_user.username}, {label: "Iedereen", value: "all"}].concat(owners);
    const state_options = [{label: "Alles", value: "all"}].concat(meta.option.incident_state);

    filter_menu_items.filter((e, i, a) => {
        if (e.id === "incident-owner-id") {
            a[i].options = incident_owner_options;
            a[i].default = current_user.username;
            return true
        }
        if (e.id === "incident-state") {
            a[i].options = state_options;
            a[i].default = "all";
            return true
        }
        return false;
    });
    datatables_init({button_menu_items, context_menu_items, filter_menu_items});
});
