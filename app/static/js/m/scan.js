import {fetch_get, fetch_update, now_iso_string} from "../common/common.js";
import {Rfid} from "../common/rfidusb.js";
import {socketio} from "../common/socketio.js";

$(document).ready(async () => {
    const scan_type_select = document.getElementById("scan-type-select");
    const main = document.getElementById("main");
    const scan_list = document.getElementById("scan-list");
    const out = document.getElementById("log-out");
    const clear_list_button = document.getElementById("clear-list-btn");

    const scan_type_options = [{label: "Selecteer een type", value: null}, {label: "TEST", value: "test"}, {label: "Aanmelden", value: "checkin"}, {label: "Aankomst", value: "result"}, {label: "Reservebadge", value: "new-rfid"}];
    scan_type_options.forEach(l => scan_type_select.add(new Option(l.label, l.value, false, false)));

    let ndef = null;
    const table = document.getElementById("person-table");
    const scan_cache = JSON.parse(localStorage.getItem("scans")) || {};
    const type_cache = localStorage.getItem("scan-type") || "";

    const meta = await fetch_get("person.meta");

    // use RFID usb to test mobile scanner on desktop computer
    const __rfid_status_changed = status => {
        if (status === Rfid.state.up) Rfid.set_location(scan_type_select.value);
    }

    Rfid.init(meta.rfidusb);
    Rfid.subscribe_state_change_cb(__rfid_status_changed);
    Rfid.set_location(scan_type_select.value);
    Rfid.set_managed_state(true);

    const __milliseconds2string = ms => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;

        // Pad with zeros
        const pad = (n, z = 2) => n.toString().padStart(z, '0');
        const padMs = (n) => n.toString().padStart(3, '0');

        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${padMs(milliseconds)}`;
    }

    // Called by the server when one or more items are updated in the list
    const __socketio_update_persons = (type, msg) => {
        const person = msg.data;
        const person_temp_badge = parseInt(person.temp_badge);
        const tr = document.querySelector(`[data-id="${person.id}"]`);
        const td = tr.firstChild;
        const rows = table.querySelectorAll("tr");
        for (const row of rows) {
            if (parseInt(row.dataset.temp_badge) === person_temp_badge) {
                const td = row.firstChild;
                td.dataset.temp_badge = "";
                td.innerHTML = td.innerHTML.replace(/.*\) /, "");
                td.style.backgroundColor = "";
            }
            if (parseInt(row.dataset.temp_badge) > person_temp_badge) continue;
            table.insertBefore(tr, row);
            tr.dataset.temp_badge = person_temp_badge;
            td.innerHTML = `(${person_temp_badge}) ` + td.innerHTML;
            td.style.backgroundColor = "yellow";
            tr.scrollIntoView(true);
            break
        }
    }

    const __socketio_add_to_list = (type, msg) => {
        if (msg.status) {
            if (type === "add-item-to-list-of-results")
                scan_list.innerHTML = `${__milliseconds2string(msg.data.result_time)}, ${msg.data.klasgroep}, ${msg.data.naam} ${msg.data.voornaam}<br><br>` + scan_list.innerHTML;
            else
                scan_list.innerHTML = `${msg.data.checkin_time.substring(11, 19)}, ${msg.data.klasgroep}, ${msg.data.naam} ${msg.data.voornaam}<br><br>` + scan_list.innerHTML;
            scan_cache[scan_type_select.value] = scan_list.innerHTML;
            localStorage.setItem("scans", JSON.stringify(scan_cache));
        } else {
            scan_list.innerHTML = `<div style="background:orange;">${msg.data}</div><br>` + scan_list.innerHTML;
        }
    }

    const __socketio_alert = (type, msg) => {
        scan_list.innerHTML = `<div style="background:orange;">${msg}</div><br>` + scan_list.innerHTML;
    }

    socketio.subscribe_to_room(meta.my_ip);
    socketio.subscribe_on_receive("update-item-in-list-of-persons", __socketio_update_persons);
    socketio.subscribe_on_receive("update-item-in-list-of-checkins", __socketio_add_to_list);
    socketio.subscribe_on_receive("update-item-in-list-of-tests", __socketio_add_to_list);
    socketio.subscribe_on_receive("add-item-to-list-of-results", __socketio_add_to_list);
    socketio.subscribe_on_receive("alert-popup", __socketio_alert);

    scan_type_select.addEventListener("change", async (e) => {
        localStorage.setItem("scan-type", e.target.value);
        socketio.subscribe_to_room(e.target.value);
        Rfid.set_location(e.target.value);
        if (["null", "test"].includes(e.target.value)) {
            main.classList.add("scan-not-active");
            main.classList.remove("register-active");
        } else {
            main.classList.remove("scan-not-active");
            main.classList.add("register-active");
        }

        //Spare badges, load persons and handle search
        if (e.target.value === "new-rfid") {
            document.querySelectorAll(".assign-spare-class").forEach(e => e.hidden = false);
            document.querySelectorAll(".scan-class").forEach(e => e.hidden = true);
            const persons = await fetch_get("person.person", {order_by: "naam"});
            persons.sort((a, b) => b.temp_badge.localeCompare(a.temp_badge) || a.naam.localeCompare(b.naam) || a.voornaam.localeCompare(b.voornaam));
            // create table
            for (const person of persons) {
                const row = document.createElement("tr");
                row.dataset.id = person.id;
                row.dataset.temp_badge = person.temp_badge;
                const td = document.createElement("td");
                if (person.temp_badge !== "") {
                    td.innerHTML = `(${person.temp_badge}) `;
                    td.style.backgroundColor = "yellow";
                } else {
                    td.innerHTML = "";
                }
                td.innerHTML += `${person.naam} ${person.roepnaam} ${person.klasgroep}`;
                row.appendChild(td);
                table.appendChild(row);
            }
            // filter table by typing in input field
            document.getElementById("search-person-id").addEventListener("input", e => {
                const rows = table.getElementsByTagName("tr");
                const search = e.target.value.toLowerCase();
                for (const row of rows) {
                    const td = row.getElementsByTagName("td")[0];
                    row.hidden = !td.innerHTML.toLowerCase().includes(search);
                }
            });
            // create context menu
            table.addEventListener("contextmenu", e => {
                const tr = e.target.closest("tr");
                const id = tr.dataset.id;
                bootbox.confirm(`Reserve voor: "${tr.firstChild.innerHTML}"<br>Druk Ok en scan binnen 5 seconden`, async result => {
                    if (result) {
                        await fetch_update("person.person", {id, new_rfid_time: now_iso_string()})
                    }
                });
            });
        } else {
            document.querySelectorAll(".assign-spare-class").forEach(e => e.hidden = true);
            document.querySelectorAll(".scan-class").forEach(e => e.hidden = false);
            table.innerText = "";
            if (e.target.value in scan_cache) {
                scan_list.innerHTML = scan_cache[e.target.value];
            } else {
                scan_list.innerHTML = "";
            }
        }

        try {
            if (!ndef) {
                ndef = new NDEFReader();
                await ndef.scan();
                out.value = "Scanner actief";

                ndef.addEventListener("readingerror", () => {
                    out.value("Fout opgetreden");
                });

                ndef.addEventListener("reading", async ({message, serialNumber}) => {
                    out.value = "code-> " + serialNumber;
                    const ret = await fetch(Flask.url_for('mobile.scan'), {method: 'POST', body: JSON.stringify({badge_code: serialNumber.replaceAll(":", ""), type: scan_type_select.value}),});
                    const resp = await ret.json();
                });
            }
        } catch (error) {
            out.value = "Fout " + error;
        }
    });

    if (type_cache !== "") {
        scan_type_select.value = type_cache;
        scan_type_select.dispatchEvent(new Event("change"));
    }

    clear_list_button.addEventListener("click", () => {
        bootbox.confirm("Bent u zeker?", result => {
            if (result) {
                if (scan_type_select.value in scan_cache) {
                    delete scan_cache[scan_type_select.value];
                    localStorage.setItem("scans", JSON.stringify(scan_cache));
                }
                scan_list.innerHTML = "";
            }
        });
    });
});
