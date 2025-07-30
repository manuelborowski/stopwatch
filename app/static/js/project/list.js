import {base_init} from "../base.js";
import {fetch_delete, fetch_get, fetch_post, fetch_update} from "../common/common.js";
import {ContextMenu} from "../common/context_menu.js";
import {AlertPopup} from "../common/popup.js";

let meta = await fetch_get("list.meta", {});
let list = null;

const list_info = {
    save_button: null,
    table_info: [
        {id: "delete", label: "", source: "value", value: `<a type="button" class="btn-item-delete btn btn-success"><i class="fa-solid fa-xmark" title="Lijn verwijderen"></i></a>`},
        {id: "name", label: "Naam", source: "data"},
        {id: "color", label: "Kleur", source: "data", options: [{label: "Geen", value: ""}].concat(meta.list_colors)},
        {id: "start", label: "Start", source: "value", value: `<a type="button" class="btn-item-start btn btn-success"><i class="fa-solid fa-play" title="Start"></i></a>`},
        {id: "stop", label: "Stop", source: "value", value: `<a type="button" class="btn-item-stop btn btn-success"><i class="fa-solid fa-stop" title="Stop"></i></a>`},
        {id: "time", label: "Tijd", source: "value", value: `<div class="div-item-time">00:00:00</div>`},
    ]
}

class List {
    static list_table_tbl = document.getElementById("list-table");

    constructor(list_info) {
        this.list_info = list_info;
        this.list_delete = [];
        this.id_ctr = -1;
        this.timer_cache = {};
        this.timer_handler();
    }

    draw = (data = [], nbr_rows = 20, add_to_table = false) => {

        const __draw_row = (item) => {
            const tr = document.createElement("tr");
            table.appendChild(tr);
            tr.dataset["id"] = item.id;
            for (const column of this.list_info.table_info) {
                const td = document.createElement("td");
                tr.appendChild(td);
                if (column.source === "value") {
                    td.innerHTML = column.value;
                } else {
                    if ("options" in column) { // Dropdownlist
                        const select = document.createElement("select")
                        td.appendChild(select);
                        select.dataset.field = column.id;
                        select.value = item[column.id];
                        for (const option of column.options) select.add(new Option(option.label, option.value, item[column.id] === option.value, item[column.id] === option.value));
                    } else {
                        const input = document.createElement("input");
                        td.appendChild(input);
                        input.dataset.field = column.id;
                        input.value = item[column.id];
                    }
                }
            }
        }

        let table = null;
        if (add_to_table) {
            table = List.list_table_tbl.querySelector("table");
        } else {
            List.list_table_tbl.innerHTML = "";
            table = document.createElement("table");
            List.list_table_tbl.appendChild(table);
            const tr = document.createElement("tr");
            table.appendChild(tr);
            for (const item of this.list_info.table_info) {
                const th = document.createElement("th");
                tr.appendChild(th);
                th.innerHTML = item.label;
            }
        }
        if (data.length > 0) { // use items from database
            for (const item of data) __draw_row(item)
        } else { // empty table
            const dummy_item = {name: "", color: ""};
            for (let i = 0; i < nbr_rows; i++) {
                dummy_item.id = this.id_ctr;
                this.id_ctr--;
                __draw_row(dummy_item)
            }
        }
        // attach an eventhandler on the "remove" button in each row
        List.list_table_tbl.querySelectorAll(".btn-item-delete").forEach(r => r.addEventListener("click", e => {
            const tr = e.target.closest("tr");
            this.row_remove(tr)
        }));

        // attach an eventhandler on the "start" button in each row
        List.list_table_tbl.querySelectorAll(".btn-item-start").forEach(r => r.addEventListener("click", e => {
            const tr = e.target.closest("tr");
            this.timer_start(tr)
        }));

        // attach an eventhandler on the "stop" button in each row
        List.list_table_tbl.querySelectorAll(".btn-item-stop").forEach(r => r.addEventListener("click", e => {
            bootbox.confirm({
                size: "small",
                message: "Wilt u deze timer stoppen?",
                callback: async result => {
                    if (result) {
                        const tr = e.target.closest("tr");
                        this.timer_stop(tr)
                    }
                }
            });
        }));

        // attach an eventhandler on each input of the table so that, when at least on input is changed, the save button begins to blink
        List.list_table_tbl.querySelectorAll("input, select").forEach(e => e.addEventListener("input", () => {
                this.list_info.save_button.classList.add("blink-button");
                data = []
                const rows = List.list_table_tbl.querySelectorAll('[data-id]');
                for (const row of rows) {
                    let item = {id: row.dataset.id};
                    const columns = row.querySelectorAll("[data-field]");
                    for (const column of columns) {
                        const field = column.dataset.field;
                        item[field] = column.value.trim();
                    }
                    if (item.name !== "") data.push(item);
                }
                localStorage.setItem("list-data", JSON.stringify(data));

            }
        ));

        // read the localstorage for the timer cache
        this.timer_cache = JSON.parse(localStorage.getItem("list-timers")) || {};
        if (this.timer_cache) {
            for (const [id, info] of Object.entries(this.timer_cache)) {
                const row = document.querySelector(`[data-id='${id}']`);
                info.element = row.querySelector(".div-item-time");
                info.start = new Date(info.start);
            }
        }
    }

    load = async () => {
        this.local_storage = JSON.parse(localStorage.getItem(`list-data`));
        if (this.local_storage) {
            this.list_info.save_button.classList.add("blink-button");
        }

        const resp_info = await fetch_get("list.list");
        if (resp_info) {
            if (this.local_storage)
                this.draw(this.local_storage);
            else
                this.draw(resp_info);
        }
    }

    save = async () => {
        const rows = List.list_table_tbl.querySelectorAll('[data-id]');
        let list_add = []
        let list_update = []
        let duplicate_name = new Set()
        for (const row of rows) {
            let item = {};
            const columns = row.querySelectorAll("[data-field]");
            for (const column of columns) {
                const field = column.dataset.field;
                item[field] = column.value.trim();
            }
            if (item.name !== "") {
                // Check if name already exists.  If so, abort and show error
                if (duplicate_name.has(item.name)) {
                    new AlertPopup("warning", `Opgepast, naam "${item.name}" bestaat reeds!`)
                    return
                } else {
                    duplicate_name.add(item.name)
                }
                if (row.dataset.id <= -1) {
                    list_add.push(item);
                } else {
                    item.id = row.dataset.id;
                    list_update.push(item);
                }
            }
        }

        if (list_add.length > 0) await fetch_post("list.list", list_add);
        if (list_update.length > 0) await fetch_update("list.list", list_update);
        if (this.list_delete.length > 0) await fetch_delete("list.list", {ids: this.list_delete.join(",")});
        this.list_info.save_button.classList.remove("blink-button");
        localStorage.removeItem("list-data");
        await this.load();
    }

    delete = async () => {
        bootbox.confirm({
            size: "small",
            message: "U gaat alle rijen wissen, zeker?",
            callback: async result => {
                if (result) {
                    const rows = List.list_table_tbl.querySelectorAll('[data-id]');
                    for (const row of rows) this.row_remove(row);
                }
            }
        });
    }

    row_add = nbr => {
        this.draw([], nbr, true);
    }

    row_remove = row => {
        if (parseInt(row.dataset.id) > -1) this.list_delete.push(row.dataset.id);
        row.remove();
        this.list_info.save_button.classList.add("blink-button");
    }

    timer_start = async row => {
        if (parseInt(row.dataset.id) <= -1 || row.dataset.id in this.timer_cache) return
        const time_div = row.querySelector(".div-item-time");
        const now = new Date();
        const formatted_now = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ` +
                  `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        this.timer_cache[row.dataset.id] = {start: now, element: time_div};
        await fetch_update("list.list", [{id: row.dataset.id, start_time: formatted_now}]);
        localStorage.setItem("list-timers", JSON.stringify(this.timer_cache));
    }

    timer_stop = async row => {
        if (parseInt(row.dataset.id) <= -1 || !(row.dataset.id in this.timer_cache)) return
        this.timer_cache[row.dataset.id].element.innerHTML = "00:00:00";
        delete this.timer_cache[row.dataset.id];
        await fetch_update("list.list", [{id: row.dataset.id, start_time: null, current_place: 1}]);
        localStorage.setItem("list-timers", JSON.stringify(this.timer_cache));
    }

    timer_handler = () => {
        const now = new Date();
        for (const [id, info] of Object.entries(this.timer_cache)) {
            const delta_secs = (now - info.start) / 1000;
            const hours = Math.floor(delta_secs / 3600);
            const minutes = Math.floor((delta_secs - 3600 * hours) / 60);
            const seconds = Math.floor(delta_secs - hours * 3600 - minutes * 60);
            const time_string = `${hours.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})}:${minutes.toLocaleString('en-US', {
                minimumIntegerDigits: 2,
                useGrouping: false
            })}:${(seconds + 1).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})}`
            info.element.innerHTML = time_string;
        }
        setTimeout(() => this.timer_handler(), 1000);
    }
}

// Use arrow keys to navigate through the table.
const __init_arrow_keys = () => {
    document.addEventListener('keydown', (event) => {
        const current_td = document.activeElement.parentNode;
        const current_tr = current_td.parentNode;
        const index = Array.from(current_tr.children).indexOf(current_td);

        if (event.ctrlKey) {
            switch (event.key) {
                case "ArrowLeft":
                    // Left pressed
                    const input_left = current_td.previousElementSibling.getElementsByTagName('input')[0];
                    if (input_left) input_left.focus();
                    break;
                case "ArrowRight":
                    // Right pressed
                    const input_rigth = current_td.nextElementSibling.getElementsByTagName('input')[0];
                    if (input_rigth) input_rigth.focus();
                    break;
                case "ArrowUp":
                    // Up pressed
                    const input_up = Array.from(current_tr.previousElementSibling.children)[index].getElementsByTagName('input')[0];
                    if (input_up) input_up.focus();
                    break;
                case "ArrowDown":
                    // Down pressed
                    const row_down = current_tr.nextElementSibling;
                    if (row_down) {
                        const input_down = Array.from(row_down.children)[index].getElementsByTagName('input')[0];
                        if (input_down) input_down.focus();
                    }
                    break;
            }
        }
    })

}

const button_menu_items = [
    {
        type: 'button',
        id: 'list-save',
        label: 'Bewaar',
        cb: () => list.save()
    },
    {
        type: 'button',
        id: 'list-delete',
        label: 'Leegmaken',
        cb: () => list.delete()
    },
    {
        type: 'button',
        id: 'list-add',
        label: '+5 rijen',
        cb: () => list.row_add(5)
    },
]

$(document).ready(async function () {
    if (current_user.level < 2)
        base_init({});
    else
        base_init({button_menu_items});

    list_info.save_button = document.getElementById("list-save")
    list = new List(list_info)
    await list.load();

    if (performance.getEntriesByType('navigation')[0].type === 'navigate') {
        console.log("voor de eerste keer bezocht")
    }
    __init_arrow_keys();
});

