import {datatable_reload_table, datatable_row_data_from_target, datatables_init, update_cell} from "../datatables/dt.js";
import {fetch_get, fetch_post, fetch_update, form_default_set, form_populate} from "../common/common.js";
import {badge_raw2hex} from "../common/rfid.js";
import {AlertPopup, FormioPopup} from "../common/popup.js";
import {qr_decode} from "../common/qr.js";

const meta = await fetch_get("incident.meta")

const __sw_hw_form = async (category = null, incident = null, history = null) => {
    const incident_update = incident !== null;
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
        const next_state = {
            software: {
                started: ["transition", "repaired"],
                transition: ["started"],
                repaired: ["started", "transition"],
            },
            hardware: {
                started: ["repaired"],
                repaired: ["started"],
            }
        }
        const incident_state_field = document.getElementById("incident-state-field");
        incident_state_field.innerHTML = "";
        for (const state of [current_state].concat(next_state[category][current_state])) {
            incident_state_field.add(new Option(meta.label.incident_state[state], state, current_state === state));
        }
    }

    const title = incident_update ? "Incident aanpassen" : "Nieuw incident (* is verplicht)";
    const form = await fetch_get("incident.form", {form: incident_update ? "sw-hw-update" : "sw-hw-new"});
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
                            data.id = incident.id;
                            data.event = document.getElementById("incident-state-field").value;
                            await fetch_update("incident.incident", data);
                        } else {
                            const owner_data = owner_field.select2("data")[0];
                            data.laptop_owner_name = owner_data.text;
                            const laptop_select_option = document.getElementById("laptop-field").selectedOptions[0];
                            data.laptop_name = laptop_select_option ? laptop_select_option.label : "";
                            if (data.lis_badge_id === "" || data.laptop_owner_id === "" || data.laptop_name === "") {
                                new AlertPopup("warning", "'Lis-badgenummer', 'Eigenaar' en 'Laptop' moeten ingevuld zijn.")
                                return
                            }
                            data.category = category
                            data.lis_badge_id = parseInt(data.lis_badge_id);
                            data.event = "started";
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
                const password_field = document.getElementById("password-field");
                document.getElementById("password-default-chk").addEventListener("click", e => {
                    password_field.disabled = e.target.checked;
                    if (e.target.checked) bootbox.alert(`Opgelet, het paswoord wordt aangepast naar <b>${meta.default_password}</b>`)
                });

                const password_show_field = document.getElementById("password-show-field");
                password_show_field.addEventListener("click", e => {
                    if (password_show_field.classList.contains("fa-eye")) {
                        password_show_field.classList.replace("fa-eye", "fa-eye-slash");
                        password_field.type = "password";
                    } else {
                        password_show_field.classList.replace("fa-eye-slash", "fa-eye");
                        password_field.type = "text";
                    }
                });

                // set default values
                if (incident_update) {
                    if (history !== "") {
                        const previous_info_field = document.getElementById("info_previous");
                        previous_info_field.innerHTML = history;
                        previous_info_field.closest(".form-row").hidden = false;
                    }
                    __state_select_set(incident.incident_state);
                    delete incident.incident_state; // avoid initializing it twice
                    incident.info = "";
                    // if the location is updated, change the event to transition
                    document.getElementById("location-field").addEventListener("change", e => {
                        document.getElementById("incident-state-field").value = "transition";
                    });
                    // if the state is changed (not transition), set the location to the original location.  This to prevent the state and location are changed at the same time.
                    document.getElementById("incident-state-field").addEventListener("change", e => {
                        if (e.target.value !== "transition") document.getElementById("location-field").value = incident.location;
                    });
                    await form_populate(category, incident, meta);
                } else {
                    // set default owner list
                    await __set_owner_options(owner_field, document.getElementById("laptop-type-field").value);
                    const defaults = Object.assign(meta.default, {incident_state: "started", incident_type: "software"}); // clear password and lis field
                    await form_populate(category, defaults, meta);
                }

                // hide/display water and drop-damage checkboxes
                document.getElementById("lis-type-field").addEventListener("change", e => {
                    document.getElementById("hardware-damage-group").hidden = e.target.value !== "hardware"
                })
                document.getElementById("lis-type-field").dispatchEvent(new Event("change"));
            },
        });
    }
}

const __loan_form = async (params = {}) => {
    const loan_update = "incident" in params;

    const form = await fetch_get("incident.form", {form: "loan"});
    if (form) {
        let owner_field = null;
        bootbox.dialog({
            title: "Uitlenen van laptop en/of lader",
            size: "xl",
            message: form.template,
            buttons: {
                confirm: {
                    label: "Bewaar",
                    className: "btn-primary",
                    callback: async () => {
                        const form_data = new FormData(document.getElementById("loan-form"));
                        const data = Object.fromEntries(form_data)
                        // checkboxes are present only when selected and have the value "on" => convert
                        document.getElementById("loan-form").querySelectorAll("input[type='checkbox']").forEach(c => data[c.name] = c.name in data)
                        data.event = data.long_loan ? "longloan" : "shortloan"
                        if (loan_update) {
                            data.id = params.incident.id;
                            await fetch_update("incident.incident", data);
                        } else {
                            const owner_data = owner_field.select2("data")[0];
                            data.laptop_owner_name = owner_data.text;
                            data.category = "loan";
                            await fetch_post("incident.incident", data);
                        }
                        datatable_reload_table();
                    }
                },
                cancel: {
                    label: "Annuleer", className: "btn-secondary", callback: async () => {
                        if (loan_update) datatable_reload_table();
                    }
                },
            },
            onShown: async () => {
                owner_field = $("#owner-field");

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

                // set default values
                if (loan_update) {
                    if (params.history !== "") {
                        const previous_info_field = document.getElementById("info_previous");
                        previous_info_field.innerHTML = params.history;
                        previous_info_field.closest(".form-row").hidden = false;
                    }
                    params.incident.info = "";
                    meta.option.laptop_owner_id = [{value: params.incident.laptop_owner_id, label: params.incident.laptop_owner_name}];
                    params.incident.long_loan = params.incident.incident_state === "longloan";
                    await form_populate(params.incident, meta);
                } else {
                    const owner_field = $("#owner-field");
                    const owners = await fetch_get("student.student", {fields: "naam,voornaam,klasgroepcode,leerlingnummer"})
                    const data = owners ? owners.map(e => ({id: e.leerlingnummer, text: `${e.naam} ${e.voornaam} ${e.klasgroepcode}`})) : []
                    if (owner_field.hasClass("select2-hidden-accessible")) await owner_field.empty().select2('destroy').trigger("change")
                    await owner_field.select2({dropdownParent: $(".bootbox"), data, width: "600px"});
                    if (data.length > 0) await owner_field.val(data[0].id).trigger("change"); // use await to make sure the select2 is done initializing
                    await form_populate(meta.default, meta);
                }
            },
        });
    }
}

const __setting_form = async () => {
    const form = await fetch_get("incident.form", {form: "setting"});
    if (form) {
        bootbox.dialog({
            title: "Instellingen",
            message: form.template,
            buttons: {
                confirm: {
                    label: "Bewaar",
                    className: "btn-primary",
                    callback: async () => {
                        const form_data = new FormData(document.getElementById("setting-form"));
                        const data = Object.fromEntries(form_data)
                        // checkboxes are present only when selected and have the value "on" => convert
                        document.getElementById("setting-form").querySelectorAll("input[type='checkbox']").forEach(c => data[c.name] = c.name in data)
                        await fetch_post("incident.location", {default: data.location})
                        meta.default.location = data.location;
                        __update_toolbar_fields();
                        datatable_reload_table();
                    }
                },
                cancel: {
                    label: "Annuleer", className: "btn-secondary", callback: async () => {
                    }
                },
            },
            onShown: async () => {
                const defaults = {location: meta.default.location};
                form_populate("software", defaults, meta);
            },
        });
    }
}

const __history_form = async (ids) => {
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
                const incidents = await fetch_get("incident.incident", {filters: `id$=$${id}`});
                const incident = incidents && incidents.length > 0 ? incidents[0] : null;
                const histories = await fetch_get("history.history", {filters: `incident_id$=$${id}`, order_by: "-id"});
                const history_table = document.querySelector("#history-table");
                for (const h of histories) {
                    let tr = "<tr>";
                    for (const e of ["time", "incident_owner", "priority", "incident_state", "location", "info", "incident_type", "drop_damage", "water_damage"]) {
                        let val = h[e];
                        if (e === "incident_state") val = meta.label.incident_state[val];
                        if (e === "location") val = meta.label.location[val];
                        if (e === "info") val = val.replaceAll(/<[^>]*>?/gm, " ");
                        if (val === true) val = "&#10003;"
                        if (val === false) val = "";
                        tr += `<td>${val}</td>`
                    }
                    tr += "</tr>";
                    history_table.innerHTML += tr;
                }
                await form_populate(incident.category, incident);
            },
        });
    }
}

const __send_message = async (ids) => {
    const id = ids[0];
    let message_content_quill = null;
    const form = await fetch_get("incident.form", {form: "message"});
    if (form) {
        bootbox.dialog({
            title: "Bericht sturen",
            message: form.template,
            buttons: {
                confirm: {
                    label: "Verzenden",
                    className: "btn-primary",
                    callback: async () => {
                        const ss_message_form = document.getElementById("ss-message-form")
                        const form_data = new FormData(ss_message_form);
                        const data = Object.fromEntries(form_data)
                        // checkboxes are present only when selected and have the value "on" => convert
                        ss_message_form.querySelectorAll("input[type='checkbox']").forEach(c => data[c.name] = c.name in data)
                        data.id = ids[0];
                        data.message_content = message_content_quill.root.innerHTML;
                        await fetch_post("incident.message", data);
                    }
                },
                cancel: {
                    label: "Annuleer", className: "btn-secondary", callback: async () => {
                    }
                },
            },
            onShown: async () => {
                const default_message_field = document.getElementById("default-message-chk");
                const message_content_field = document.getElementById("message-content");
                const message_subject_field = document.getElementById("message-subject");
                message_content_quill = new Quill(message_content_field, {theme: 'snow'});
                const defaults = await fetch_get("incident.message", {"id": ids[0]})
                await message_content_quill.clipboard.dangerouslyPasteHTML(defaults.message_content);
                message_subject_field.value = defaults.message_subject;
                default_message_field.checked = true;
                default_message_field.addEventListener("click", async e => {
                    if (e.target.checked) {
                        await message_content_quill.clipboard.dangerouslyPasteHTML(defaults.message_content);
                        message_subject_field.value = defaults.message_subject;
                    } else {
                        await message_content_quill.clipboard.dangerouslyPasteHTML("");
                        message_subject_field.value = "";
                    }
                });

            },
        });
    }
}

const __update_toolbar_fields = () => {
    document.getElementById("default-location").value = meta.label.location[meta.default.location];
}

const button_menu_items = [
    {
        type: 'button',
        id: 'software-new',
        label: 'SW probleem',
        cb: () => __sw_hw_form("software")
    },
    {
        type: 'button',
        id: 'hardware-new',
        label: 'HW probleem',
        cb: () => __sw_hw_form("hardware")
    },
    {
        type: 'button',
        id: 'laptoploan-new',
        label: 'Laptop uitlenen',
        cb: () => __loan_form()
    },
    {
        type: 'text',
        id: 'default-location',
        label: 'Standaard locatie',
        align: "right",
        width: "15ch"
    },
    {
        type: 'button',
        id: 'settings',
        label: 'Instellingen',
        cb: () => __setting_form(),
        // align: "right"
    },
]

const context_menu_items = [
    {type: "item", label: 'Historiek', iconscout: 'history', cb: __history_form},
]

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
        id: 'location',
        label: 'Locatie',
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

const __table_loaded = () => {
    document.querySelectorAll(".btn-incident-update").forEach(s => s.addEventListener("click", async e => {
        const row = datatable_row_data_from_target(e);
        const incidents = await fetch_get("incident.incident", {filters: `id$=$${row.id}`});
        const incident = incidents && incidents.length > 0 ? incidents[0] : null;
        const histories = await fetch_get("history.history", {filters: `incident_id$=$${row.id}`});
        const history = histories.map(e => e.info.replaceAll(/<[^>]*>?/gm, " ")).filter(e => e !== "").join("<br>");
        if (["software", "hardware"].includes(incident.category)) {
            await __sw_hw_form(incident.category, incident, history);
        } else {
            await __loan_form(incident.category, incident, history)
        }
    }));
    document.querySelectorAll(".btn-show-history").forEach(s => s.addEventListener("click", async e => {
        const row = datatable_row_data_from_target(e);
        await __history_form([row.id]);
    }));
    document.querySelectorAll(".btn-send-message").forEach(s => s.addEventListener("click", async e => {
        const row = datatable_row_data_from_target(e);
        await __send_message([row.id])
    }));
    document.querySelectorAll(".btn-incident-close").forEach(s => s.addEventListener("click", async e => {
        const row = datatable_row_data_from_target(e);
        await fetch_update("incident.incident", {id: row.id, event: "closed", info: "Incident gesloten"});
        datatable_reload_table();
    }));
}

const __row_created = (row, data, data_index, cells) => {
    if (data.flags && data.flags.split(",").includes("state-timeout")) {
        $(row).attr("style", `background-color: #ffa5006b;`);
    }
}

$(document).ready(async () => {
    let owners = await fetch_get("incident.incident", {fields: "incident_owner"});
    owners = owners ? [...new Set(owners.map(e => e.incident_owner))] : [];
    owners = owners.map(e => ({label: e, value: e}));
    const incident_owner_options = [{label: current_user.username, value: current_user.username}, {label: "Iedereen", value: "all"}].concat(owners);
    const state_options = [{label: "Alles", value: "all"}].concat(meta.option.incident_state);
    const filtered_location = meta.option.location.filter(i => i.value !== meta.default.location);
    const location_options = [{label: meta.label.location[meta.default.location], value: meta.default.location}, {label: "Alle", value: "all"}].concat(filtered_location);
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
        if (e.id === "location") {
            a[i].options = location_options;
            a[i].default = location_options[0].value;
            return true
        }
        return false;
    });
    const callbacks = {table_loaded: __table_loaded, created_row: __row_created};
    datatables_init({button_menu_items, context_menu_items, filter_menu_items, callbacks});
    __update_toolbar_fields();
});
