import {badge_raw2hex} from "../common/rfid.js";
import {fetch_get, fetch_post, fetch_update, form_populate} from "../common/common.js";
import {AlertPopup} from "../common/popup.js";
import {qr_decode} from "../common/qr.js";

export class IncidentRepair {
    category = "repair"

    constructor({meta = null, incident = null, history = "", dropdown_parent = null}) {
        this.incident_update = incident !== null;
        this.incident = incident;
        this.history = history;
        this.meta = meta;
        this.dropdown_parent = dropdown_parent;
    }

    __state_select_set = () => {
        const next_state = {
            "software": {started: ["transition", "repaired"], transition: ["started"], repaired: ["started", "transition", "closed"],},
            "reinstall": {started: ["transition", "repaired"], transition: ["started"], repaired: ["started", "transition", "closed"],},
            "hardware": {started: ["repaired"], repaired: ["started", "closed"]},
            "newlaptop": {started: ["repaired"], repaired: ["started", "closed"]}
        }
        const incident_state_field = document.getElementById("incident-state-field");
        incident_state_field.innerHTML = "";
        for (const state of [this.incident.incident_state].concat(next_state[this.incident.incident_type][this.incident.incident_state])) {
            incident_state_field.add(new Option(this.meta.label.incident_state[state], state, this.incident.incident_state === state));
        }
    }

    __stored_password = this.incident ? this.incident.laptop_owner_password : "";
    __password_field_visibility = (hidden = true) => {
        const password_field = document.getElementById("password-field");
        const password_show_field = document.getElementById("password-show-field");
        if (hidden) {
            password_show_field.classList.replace("fa-eye", "fa-eye-slash");
            password_field.value = "**";
            password_field.disabled = true;
        } else {
            password_show_field.classList.replace("fa-eye-slash", "fa-eye");
            password_field.disabled = false;
            password_field.value = this.__stored_password;
        }
    }

    __password_field_toggle = () => {
        const password_field = document.getElementById("password-field");
        const password_show_field = document.getElementById("password-show-field");
        if (password_show_field.classList.contains("fa-eye-slash")) {
            // hidden to visible
            this.__password_field_visibility(false);

        } else {
            // visible to hidden
            this.__stored_password = password_field.value;
            this.__password_field_visibility(true)
        }
    }

    display = async () => {
        const location_field = document.getElementById("location-field");
        const incident_state_field = document.getElementById("incident-state-field");
        const lis_type_field = document.getElementById("lis-type-field");
        const info_field = document.getElementById("info-field");
        const spare_field = document.getElementById("spare-field")
        const owner_field = $("#owner-field");

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
            if (laptop_owner_id && laptop_owner_id !== "") {
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

        // if default password checked, disable the password field
        const password_field = document.getElementById("password-field");
        document.getElementById("password-default-chk").addEventListener("click", e => {
            password_field.disabled = e.target.checked;
            if (e.target.checked) bootbox.alert(`Opgelet, het paswoord wordt aangepast naar <b>${this.meta.default_password}</b>`)
        });
        const password_show_field = document.getElementById("password-show-field");
        password_show_field.addEventListener("click", e => this.__password_field_toggle());

        // if the location is updated, change the event to transition
        location_field.addEventListener("change", e => {
            incident_state_field.value = "transition";
        });
        // if the state is changed (not transition), set the location to the original location.  This to prevent the state and location are changed at the same time.
        incident_state_field.addEventListener("change", e => {
            if (e.target.value !== "transition") location_field.value = this.incident.location;
        });

        // hardware incident specific, update m4s-id options when m4s-category has changed
        document.getElementById("m4s-category-field").addEventListener("change", (e) => {
            e.preventDefault();
            const options = this.meta.m4s[e.target.value];
            const m4s_id_field = document.getElementById("m4s-problem-type-guid-field");
            m4s_id_field.innerHTML = "";
            for (const item of options) m4s_id_field.add(new Option(item.label, item.value));
        });

        // if history is available, show the history list
        if (this.history !== "") {
            const previous_info_field = document.getElementById("info_previous");
            previous_info_field.innerHTML = this.history;
            previous_info_field.closest(".form-row").hidden = false;
        }

        // set default values, create the select2 for the laptop-owners and populate with a single student/staff (update) or a list of all students and staffs
        let owner_field_options = null;

        // other default values
        if (this.incident_update) {
            this.incident.info = "";
            // Just in case, populate the m4s category
            this.incident.m4s_category = this.meta.default.m4s_category;
            // in case of hardware incident, get the configured m4s category and guid and populate the respective fields
            for (const [category, problems] of Object.entries(this.meta.m4s)) {
                for (const problem of problems) {
                    if (problem.value === this.incident.m4s_problem_type_guid) {
                        this.incident.m4s_category = category;
                        this.meta.option.m4s_problem_type_guid = this.meta.m4s[category];
                        break;
                    }
                }
            }
            // disable the m4s category and type when the incident is not of the hardware-repair type
            document.querySelectorAll("#hardware-repair-group select").forEach(item => item.disabled = this.incident.m4s_guid !== null);
            // hide some fields when the repair concerns a spare laptop
            document.querySelectorAll(".group-spare-laptop").forEach(i => i.hidden = this.incident.laptop_type === "reserve");
            // set the owner-laptop value
            this.meta.option.laptop_serial = [{value: this.incident.laptop_serial, label: this.incident.laptop_name}];

            await form_populate(this.category, this.incident, this.meta);
            owner_field_options = [{id: this.incident.laptop_owner_id, text: this.incident.laptop_owner_name}];

            document.querySelectorAll(".repair-update-hidden").forEach(i => i.hidden = true);
            document.querySelectorAll(".repair-update-disabled").forEach(i => i.disabled = true);
            document.querySelectorAll(".required").forEach(i => i.classList.toggle("required"));
        } else { // new repair
            const defaults = Object.assign(this.meta.default, {incident_state: "started", incident_type: "software", laptop_owner_password: ""}); // clear password and lis field
            await form_populate(this.category, defaults, this.meta);
            const students = await fetch_get("student.student", {fields: "naam,voornaam,klasgroepcode,leerlingnummer"})
            const student_data = students ? students.map(e => ({id: "leerling-" + e.leerlingnummer, text: `${e.naam} ${e.voornaam} ${e.klasgroepcode}`})) : []
            const staff = await fetch_get("staff.staff", {fields: "naam,voornaam,code"})
            const staff_data = staff ? staff.map(e => ({id: "personeel-" + e.code, text: `${e.naam} ${e.voornaam}`})) : []
            owner_field_options = student_data.concat(staff_data);
        }
        // select2 field has it's own way of adding options
        if (owner_field.hasClass("select2-hidden-accessible")) await owner_field.empty().select2('destroy').trigger("change")
        let select2_config = {data: owner_field_options, width: "600px"};
        if (this.dropdown_parent) select2_config.dropdownParent = this.dropdown_parent;
        await owner_field.select2(select2_config);
        if (owner_field_options.length > 0) await owner_field.val(owner_field_options[0].id).trigger("change"); // use await to make sure the select2 is done initializing

        // default hide the password when the incident is being updated
        this.__password_field_visibility(this.incident_update);

        // hide/display hardware problem types (M4S)
        lis_type_field.addEventListener("change", e => {
            document.getElementById("hardware-repair-group").hidden = e.target.value !== "hardware"
            if (e.target.value === "hardware") { // make sure that a valid location is displayed, and highlight if it is changed.  Make clear the info field is required
                if (!(this.incident && this.incident.m4s_guid !== null)) info_field.parentElement.classList.add("required"); // info field not required when incident already in M4S
                if (location_field.value in this.meta.location && "hardware" in this.meta.location[location_field.value]) { // if required, change the location to were hardware repair can take place
                    location_field.value = this.meta.location[location_field.value].hardware;
                    location_field.style.background = "yellow";  // and make the background yellow to make clear the location has changed.
                }
            } else { // not a hardware incident
                info_field.parentElement.classList.remove("required"); // info field is not required
                location_field.value = this.meta.default.location;
                location_field.style.background = "white";
            }
            if (this.incident) this.__state_select_set(); // The possible states depend on the incident type
        })
        lis_type_field.dispatchEvent(new Event("change"));
    }

    save = async () => {
        const owner_field = $("#owner-field");
        const form_data = new FormData(document.getElementById("incident-form"));
        const data = Object.fromEntries(form_data)
        // checkboxes are present only when selected and have the value "on" => convert
        document.getElementById("incident-form").querySelectorAll("input[type='checkbox']").forEach(c => data[c.name] = c.name in data)
        data.laptop_owner_password = data.laptop_owner_password || this.__stored_password;
        if (this.incident_update) {
            if (data.lis_badge_id === "" || data.laptop_owner_id === "" || data.laptop_name === "" || data.incident_type === "hardware" && data.info === "" && this.incident.m4s_guid === null) {
                new AlertPopup("warning", "Roodgekleurde velden invullen aub.");
                return false
            }
            data.id = this.incident.id;
            data.event = document.getElementById("incident-state-field").value;
            if (data.incident_type !== "hardware") data.m4s_problem_type_guid = "";  // make sure to clear this field, else it pops up in different places
            await fetch_update("incident.incident", data);
        } else {  // new incident
            let lis_badge_id_exist = [];
            if (data.lis_badge_id !== "") lis_badge_id_exist = await fetch_get("incident.incident", {filters: `lis_badge_id$=$${data.lis_badge_id},incident_state$!$closed`});
            if (lis_badge_id_exist.length > 0) {
                new AlertPopup("warning", "Dit nummer is al in gebruik")
                return false
            }
            if (document.getElementById("type-spare-laptop-chk").checked) {  // spare laptop
                data.laptop_owner_name = this.meta.label.location[data.location];
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
            data.category = this.category
            data.lis_badge_id = parseInt(data.lis_badge_id);
            if (data["incident_type"] !== "hardware") data["m4s_problem_type_guid"] = ""
            data.event = "started";
            await fetch_post("incident.incident", data);
        }
        return true
    }
}
