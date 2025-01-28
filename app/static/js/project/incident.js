import {datatable_column2index, datatable_reload_table, datatable_row_data_from_target, datatables_init, update_cell} from "../datatables/dt.js";
import {fetch_get, fetch_post, fetch_update, form_default_set, form_populate} from "../common/common.js";
import {badge_raw2hex} from "../common/rfid.js";
import {AlertPopup, FormioPopup} from "../common/popup.js";
import {qr_decode} from "../common/qr.js";

const meta = await fetch_get("incident.meta")

const __sw_hw_form = async (category = null, incident = null, history = null) => {
    const incident_update = incident !== null;

    const __state_select_set = incident => {
        const next_state = {
            "software": {started: ["transition", "repaired"], transition: ["started"], repaired: ["started", "transition"],},
            "reinstall": {started: ["transition", "repaired"], transition: ["started"], repaired: ["started", "transition"],},
            "hardware": {started: ["repaired"], repaired: ["started"]}
        }
        const incident_state_field = document.getElementById("incident-state-field");
        incident_state_field.innerHTML = "";
        for (const state of [incident.incident_state].concat(next_state[incident.incident_type][incident.incident_state])) {
            incident_state_field.add(new Option(meta.label.incident_state[state], state, incident.incident_state === state));
        }
    }

    let stored_password = incident ? incident.laptop_owner_password : "";
    const __password_field_visibility = (hidden = true) => {
        const password_field = document.getElementById("password-field");
        const password_show_field = document.getElementById("password-show-field");
        if (hidden) {
            password_show_field.classList.replace("fa-eye", "fa-eye-slash");
            password_field.value = "**";
            password_field.disabled = true;
        } else {
            password_show_field.classList.replace("fa-eye-slash", "fa-eye");
            password_field.disabled = false;
            password_field.value = stored_password;
        }
    }

    const __password_field_toggle = () => {
        const password_field = document.getElementById("password-field");
        const password_show_field = document.getElementById("password-show-field");
        if (password_show_field.classList.contains("fa-eye-slash")) {
            // hidden to visible
            __password_field_visibility(false);

        } else {
            // visible to hidden
            stored_password = password_field.value;
            __password_field_visibility(true)
        }
    }

    const title = incident_update ? "Incident aanpassen" : "Nieuw incident (<span style='color:orangered;'>verplichte velden</span>)";
    const form = await fetch_get("incident.form", {form: incident_update ? "sw-hw-update" : "sw-hw-new"});
    let bootbox_dialog = null;
    if (form) {
        let owner_field = null;
        bootbox_dialog = bootbox.dialog({
            title,
            size: "xl",
            message: form.template,
            buttons: {
                confirm: {label: "Bewaar", className: "btn-primary", callback: () => false},
                cancel: {label: "Annuleer", className: "btn-secondary", callback: async () => {if (incident_update) datatable_reload_table()}},
            },
            onShown: async () => {
                const location_field = document.getElementById("location-field");
                const incident_state_field = document.getElementById("incident-state-field");
                const lis_type_field = document.getElementById("lis-type-field");
                const info_field = document.getElementById("info-field");
                    const spare_field = document.getElementById("spare-field")

                if (!incident_update) { //new incident
                    owner_field = $("#owner-field");

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
                                        let loaners = await fetch_get("student.student", {filters: `rfid$=$${code}`, fields: "leerlingnummer"});
                                        if (loaners && loaners.length > 0) {
                                            owner_field.val("leerling-" + loaners[0].leerlingnummer).trigger("change");
                                            return true
                                        } else {
                                            const loaners = await fetch_get("staff.staff", {filters: `rfid$=$${code}`, fields: "code"});
                                            if (loaners && loaners.length > 0) {
                                                owner_field.val("personeel-" + loaners[0].code).trigger("change");
                                                return true
                                            }
                                        }
                                    }
                                    new AlertPopup("warning", "Ongeldige badge");
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
                                    laptop_field.add(new Option(label, label, true, true));
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
                                        if (spares && spares.length > 0) spare_field.value = spares[0].label;
                                    } else {
                                        spare_field.value = code;
                                    }
                                }
                            }
                        })
                    });

                    // when the owner field changes, get the associated laptops and populate the laptop field
                    owner_field.on('change', async e => {
                        const [laptop_type, laptop_owner_id] = e.target.value.split("-");
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

                    // Incident is for spare laptop
                    document.getElementById("type-spare-laptop-chk").addEventListener("click", e => {
                        document.querySelectorAll(".group-spare-laptop").forEach(i => i.hidden = e.target.checked);
                        spare_field.parentElement.classList.toggle("required", e.target.checked);
                    });
                }

                // if default password checked, disable the password field
                const password_field = document.getElementById("password-field");
                document.getElementById("password-default-chk").addEventListener("click", e => {
                    password_field.disabled = e.target.checked;
                    if (e.target.checked) bootbox.alert(`Opgelet, het paswoord wordt aangepast naar <b>${meta.default_password}</b>`)
                });
                const password_show_field = document.getElementById("password-show-field");
                password_show_field.addEventListener("click", e => __password_field_toggle());

                // set default values
                if (incident_update) {
                    if (history !== "") {
                        const previous_info_field = document.getElementById("info_previous");
                        previous_info_field.innerHTML = history;
                        previous_info_field.closest(".form-row").hidden = false;
                    }
                    incident.info = "";
                    // if the location is updated, change the event to transition
                    location_field.addEventListener("change", e => {
                        incident_state_field.value = "transition";
                    });
                    // if the state is changed (not transition), set the location to the original location.  This to prevent the state and location are changed at the same time.
                    incident_state_field.addEventListener("change", e => {
                        if (e.target.value !== "transition") location_field.value = incident.location;
                    });

                    // Just in case, populate the m4s category
                    incident.m4s_category = meta.default.m4s_category;
                    // in case of hardware incident, get the configured m4s category and guid and populate the respective fields
                    for (const [category, problems] of Object.entries(meta.m4s)) {
                        for (const problem of problems) {
                            if (problem.value === incident.m4s_problem_type_guid) {
                                incident.m4s_category = category;
                                meta.option.m4s_problem_type_guid = meta.m4s[category];
                                break;
                            }
                        }
                    }
                    document.querySelectorAll("#hardware-repair-group select").forEach(item => item.disabled = incident.m4s_guid !== null);
                    await form_populate(category, incident, meta);
                    document.querySelectorAll(".group-spare-laptop").forEach(i => i.hidden = incident.laptop_type === "reserve");

                } else { // new incident
                    // populate owner list
                    const students = await fetch_get("student.student", {fields: "naam,voornaam,klasgroepcode,leerlingnummer"})
                    const student_data = students ? students.map(e => ({id: "leerling-" + e.leerlingnummer, text: `${e.naam} ${e.voornaam} ${e.klasgroepcode}`})) : []
                    const staff = await fetch_get("staff.staff", {fields: "naam,voornaam,code"})
                    const staff_data = staff ? staff.map(e => ({id: "personeel-" + e.code, text: `${e.naam} ${e.voornaam}`})) : []
                    const data = student_data.concat(staff_data);
                    if (owner_field.hasClass("select2-hidden-accessible")) await owner_field.empty().select2('destroy').trigger("change")
                    await owner_field.select2({dropdownParent: $(".bootbox"), data, width: "600px"});
                    if (data.length > 0) await owner_field.val(data[0].id).trigger("change"); // use await to make sure the select2 is done initializing
                    const defaults = Object.assign(meta.default, {incident_state: "started", incident_type: "software"}); // clear password and lis field
                    await form_populate(category, defaults, meta);
                }
                __password_field_visibility(incident_update);

                // hardware incident specific, update m4s-id options when m4s-category has changed
                document.getElementById("m4s-category-field").addEventListener("change", (e) => {
                    e.preventDefault();
                    const options = meta.m4s[e.target.value];
                    const m4s_id_field = document.getElementById("m4s-problem-type-guid-field");
                    m4s_id_field.innerHTML = "";
                    for (const item of options) m4s_id_field.add(new Option(item.label, item.value));
                });

                // hide/display hardware problem types
                lis_type_field.addEventListener("change", e => {
                    const sw2hw_location = {ictbb: "baliebb", ictsum: "baliesum"}
                    document.getElementById("hardware-repair-group").hidden = e.target.value !== "hardware"
                    if (e.target.value === "hardware") { // make sure that a valid location is displayed, and highlight if it is changed.  Make sure the info field is filled in.
                        if (!(incident && incident.m4s_guid !== null)) info_field.parentElement.classList.add("required"); // option field not required when incident already in M4S
                        if (location_field.value in sw2hw_location) {
                            location_field.value = sw2hw_location[location_field.value];
                            location_field.style.background = "yellow";
                        }
                    } else {
                        info_field.parentElement.classList.remove("required");
                        location_field.value = meta.default.location;
                        location_field.style.background = "white";
                    }
                    if (incident) __state_select_set(incident); // when changing the incident_type, update the possible states
                })
                lis_type_field.dispatchEvent(new Event("change"));
            },
        });

        // Confirm button pushed
        document.querySelector(".bootbox .btn-primary").addEventListener("click", async e => {
            const form_data = new FormData(document.getElementById("incident-form"));
            const data = Object.fromEntries(form_data)
            // checkboxes are present only when selected and have the value "on" => convert
            document.getElementById("incident-form").querySelectorAll("input[type='checkbox']").forEach(c => data[c.name] = c.name in data)
            data.laptop_owner_password = data.laptop_owner_password || stored_password;
            if (incident_update) {
                if (data.lis_badge_id === "" || data.laptop_owner_id === "" || data.laptop_name === "" || data.incident_type === "hardware" && data.info === "" && incident.m4s_guid === null) {
                    new AlertPopup("warning", "Roodgekleurde velden invullen aub.");
                    return false
                }
                data.id = incident.id;
                data.event = document.getElementById("incident-state-field").value;
                await fetch_update("incident.incident", data);
            } else {  // new incident
                if (document.getElementById("type-spare-laptop-chk").checked) {  // spare laptop
                    data.laptop_owner_name = meta.label.location[data.location];
                    data.laptop_owner_id = data.location;
                    data.laptop_name = data.spare_laptop_name;
                    data.spare_laptop_name = "NVT";
                    if (data.lis_badge_id === "" || data.laptop_owner_id === "" || data.laptop_name === "") {
                        new AlertPopup("warning", "Roodgekleurde velden invullen aub.")
                        return false
                    }
                    data.laptop_type = "reserve";
                } else { // regular laptop
                    const owner_data = owner_field.select2("data")[0];
                    data.laptop_owner_name = owner_data.text;
                    const laptop_select_option = document.getElementById("laptop-field").selectedOptions[0];
                    data.laptop_name = laptop_select_option ? laptop_select_option.label : "";
                    if (data.lis_badge_id === "" || data.laptop_owner_id === "" || data.laptop_name === "" || data.incident_type === "hardware" && data.info === "") {
                        new AlertPopup("warning", "Roodgekleurde velden invullen aub.");
                        return false
                    }
                    [data.laptop_type, data.laptop_owner_id] = data.laptop_owner_id.split("-");
                }
                data.category = category
                data.lis_badge_id = parseInt(data.lis_badge_id);
                if (data["incident_type"] !== "hardware") data["m4s_problem_type_guid"] = ""
                data.event = "started";
                await fetch_post("incident.incident", data);
            }
            datatable_reload_table();
            if (bootbox_dialog) bootbox_dialog.modal("hide");
        });
    }
}

const __loan_form = async (category = null, incident = null, history = null) => {
    const incident_update = incident !== null;
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
                        data.incident_type = data.event;
                        if (incident_update) {
                            data.id = incident.id;
                            data.event = "loaned"
                            await fetch_update("incident.incident", data);
                        } else {
                            data.event = "started";
                            const owner_data = owner_field.select2("data")[0];
                            data.laptop_owner_name = owner_data.text;
                            data.category = category;
                            [data.laptop_type, data.laptop_owner_id] = data.laptop_owner_id.split("-");
                            data.laptop_name = "NVT";
                            await fetch_post("incident.incident", data);
                        }
                        datatable_reload_table();
                    }
                },
                cancel: {
                    label: "Annuleer", className: "btn-secondary", callback: async () => {
                        if (incident_update) datatable_reload_table();
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
                                    let loaners = await fetch_get("student.student", {filters: `rfid$=$${code}`, fields: "leerlingnummer"});
                                    if (loaners && loaners.length > 0) {
                                        owner_field.val("leerling-" + loaners[0].leerlingnummer).trigger("change");
                                        return true
                                    } else {
                                        const loaners = await fetch_get("staff.staff", {filters: `rfid$=$${code}`, fields: "code"});
                                        if (loaners && loaners.length > 0) {
                                            owner_field.val("personeel-" + loaners[0].code).trigger("change");
                                            return true
                                        }
                                    }
                                }
                                new AlertPopup("warning", "Ongeldige badge");
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
                                const spare_field = document.getElementById("spare-field")
                                const [valid_code, code] = badge_raw2hex(res);
                                if (valid_code) {
                                    const spares = await fetch_get("spare.spare", {filters: `rfid$=$${code}`, fields: "label"});
                                    if (spares && spares.length > 0) spare_field.value = spares[0].label;
                                } else {
                                    spare_field.value = code;
                                }
                            }
                        }
                    })
                });

                // set default values
                if (incident_update) {
                    if (history !== "") {
                        const previous_info_field = document.getElementById("info_previous");
                        previous_info_field.innerHTML = history;
                        previous_info_field.closest(".form-row").hidden = false;
                    }
                    incident.info = "";
                    meta.option.laptop_owner_id = [{value: incident.laptop_owner_id, label: incident.laptop_owner_name}];
                    incident.long_loan = incident.incident_type === "longloan";
                    await form_populate(category, incident, meta);
                } else {
                    const students = await fetch_get("student.student", {fields: "naam,voornaam,klasgroepcode,leerlingnummer"})
                    const student_data = students ? students.map(e => ({id: "leerling-" + e.leerlingnummer, text: `${e.naam} ${e.voornaam} ${e.klasgroepcode}`})) : []
                    const staff = await fetch_get("staff.staff", {fields: "naam,voornaam,code"})
                    const staff_data = staff ? staff.map(e => ({id: "personeel-" + e.code, text: `${e.naam} ${e.voornaam}`})) : []
                    const data = student_data.concat(staff_data);
                    if (owner_field.hasClass("select2-hidden-accessible")) await owner_field.empty().select2('destroy').trigger("change")
                    await owner_field.select2({dropdownParent: $(".bootbox"), data, width: "600px"});
                    if (data.length > 0) await owner_field.val(data[0].id).trigger("change"); // use await to make sure the select2 is done initializing
                    await form_populate(category, meta.default, meta);
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
                    for (const e of ["time", "incident_owner", "priority", "incident_state", "location", "info", "incident_type"]) {
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
                await form_populate(incident.category, incident);
            },
        });
    }
}

const __send_message = async (ids) => {
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
                        datatable_reload_table();
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
                if (defaults) {
                    await message_content_quill.clipboard.dangerouslyPasteHTML(defaults.message_content);
                    message_subject_field.value = defaults.message_subject;
                    default_message_field.checked = true;
                }
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
        id: 'repair-new',
        label: 'Nieuwe reparatie',
        cb: () => __sw_hw_form("repair")
    },
    {
        type: 'button',
        id: 'laptoploan-new',
        label: 'Laptop uitlenen',
        cb: () => __loan_form("loan")
    },
    {
        type: 'text',
        id: 'default-location',
        label: 'Locatie',
        align: "right",
        width: "15ch"
    },
    {
        type: 'button',
        id: 'settings',
        label: 'Instellingen',
        cb: () => __setting_form(),
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
        const history = histories.map(e => e.info).filter(e => e !== "").join("<br>");
        if (incident.category === "repair") {
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
    if (data.m4s_guid !== null) {
        const cell_index = datatable_column2index["m4s_reference"];
        row.cells[cell_index].innerHTML = `<a target="_blank" href="https://byod.signpost.be/incidents/${data.m4s_guid}">${cells[cell_index].innerHTML}</a>`;
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
