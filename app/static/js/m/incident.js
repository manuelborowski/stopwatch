import {fetch_get, fetch_post, fetch_update, form_populate} from "../common/common.js";
import {badge_raw2hex} from "../common/rfid.js";
import {AlertPopup} from "../common/popup.js";
import {qr_decode} from "../common/qr.js";

const __populate_table = (placeholder) => {
    placeholder.innerHTML = "";
    const tr = document.createElement("tr");
    placeholder.appendChild(tr);
    const header = ["Id", "Eigenaar"];
    for (const h of header) {
        const th = document.createElement("th");
        th.innerHTML = h;
        tr.appendChild(th);
    }
    incidents.sort((a, b) => a.laptop_owner_name < b.laptop_owner_name ? -1 : 1);
    const row = ["lis_badge_id", "laptop_owner_name"];
    for (const incident of incidents) {
        const tr = document.createElement("tr");
        tr.dataset.id = incident.id;
        placeholder.appendChild(tr);
        for (const r of row) {
            const td = document.createElement("td");
            td.innerHTML = incident[r];
            tr.appendChild(td);
        }
    }
}

$(document).ready(async () => {
    if (document.getElementById("incident-table")) {  // show the list with incidents
        const incident_table = document.getElementById("incident-table");
        const search_input = document.getElementById("search-input");

        __populate_table(incident_table);

        search_input.addEventListener("keyup", () => {
            const search_value = search_input.value.toLowerCase();
            for (const row of incident_table.children) {
                let found = false;
                for (const cell of row.children) {
                    if (cell.innerHTML.toLowerCase().includes(search_value)) {
                        found = true;
                        break;
                    }
                }
                row.hidden = !found;
            }
        })

        incident_table.addEventListener("click", async e => {
            const id = e.target.closest("tr").dataset.id;
            window.location.href = Flask.url_for("incident.m_detail", {id: id.toString()});
        })
    } else if (document.getElementById("location-field")) { // update repair incident


        const __state_select_set = incident => {
            const next_state = {
                "software": {started: ["transition", "repaired"], transition: ["started"], repaired: ["started", "transition"],},
                "reinstall": {started: ["transition", "repaired"], transition: ["started"], repaired: ["started", "transition"],},
                "hardware": {started: ["repaired"], repaired: ["started"]},
                "newlaptop": {started: ["repaired"], repaired: ["started"]}
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

        const meta = await fetch_get("incident.meta")
        const incident_update = true;
        const location_field = document.getElementById("location-field");
        const incident_state_field = document.getElementById("incident-state-field");
        const lis_type_field = document.getElementById("lis-type-field");
        const info_field = document.getElementById("info-field");
        const spare_field = document.getElementById("spare-field");
        const cancel_btn = document.getElementById("cancel-btn");
        const save_btn = document.getElementById("save-btn");


        let owner_field = null;

        if (!incident_update) { //new incident
            owner_field = $("#owner-field");

            // Scan LIS badge
            document.getElementById("lis-badge-scan").addEventListener("click", (e) => {
                e.preventDefault();
                bootbox.prompt({
                    title: "Scan de LIS badge", callback: async res => {
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
                    title: "Scan de badge van de eigenaar", callback: async res => {
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
                    title: "Scan de QR code van de laptop", callback: async res => {
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
                    title: "Scan de badge van de reservelaptop", callback: async res => {
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
                    const devices = await fetch_get("incident.laptop", {type: laptop_type, id: laptop_owner_id});
                    if (devices) {
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
            const histories = await fetch_get("history.history", {filters: `incident_id$=$${incident.id}`});
            const history = histories.map(e => e.info).filter(e => e !== "").join("<br>");
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
            await form_populate("repair", incident, meta);
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
            document.getElementById("hardware-repair-group").hidden = e.target.value !== "hardware"
            if (e.target.value === "hardware") { // make sure that a valid location is displayed, and highlight if it is changed.  Make sure the info field is filled in.
                if (!(incident && incident.m4s_guid !== null)) info_field.parentElement.classList.add("required"); // option field not required when incident already in M4S
                if (location_field.value in meta.location && "hardware" in meta.location[location_field.value]) { // if required, change the location to were hardware repair can take place
                    location_field.value = meta.location[location_field.value].hardware;
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

        // cancel button
        cancel_btn.addEventListener("click", () => {
            window.location.href = Flask.url_for("incident.m_show");
        });
        // save button
        save_btn.addEventListener("click", async () => {
            const form_data = new FormData(document.getElementById("incident-form"));
            const data = Object.fromEntries(form_data)
            // checkboxes are present only when selected and have the value "on" => convert
            document.getElementById("incident-form").querySelectorAll("input[type='checkbox']").forEach(c => data[c.name] = c.name in data)
            data.laptop_owner_password = data.laptop_owner_password || stored_password;
            if (incident_update) {
                data.id = incident.id;
                data.event = document.getElementById("incident-state-field").value;
                if (data.incident_type !== "hardware") data.m4s_problem_type_guid = "";  // make sure to clear this field, else it pops up in different places
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
            window.location.href = Flask.url_for("incident.m_show");
        });

    }

});
