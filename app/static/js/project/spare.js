import {datatables_init, datatable_row_data_get, datatable_reload_table} from "../datatables/dt.js";
import {AlertPopup} from "../common/popup.js";
import {fetch_update, fetch_post} from "../common/common.js";


const __dialog_new_single_spare = (default_id = null, default_auto_increment = false) => {
    var new_spare = false;
    bootbox.dialog({
        title: "Nieuwe reserve laptop badge (* is vereist)",
        message: `
        <form>
            <div class="form-group">
                <div class="checkbox">
                    <label>
                        <input type="checkbox" id="auto-increment-id"> Auto Increment ID
                    </label>
                </div>
            </div>
            <div class="form-group" style="display: flex; align-items: center;">
                <label for="id-field" style="margin-right: 10px;">Badge nummer (*)</label>
                <input type="text" class="form-control" id="id-field" style="flex: 1;">
            </div>
            <div class="form-group" style="display: flex; align-items: center;">
                <label for="rfid-field" style="margin-right: 10px;">RFID (*)</label>
                <input type="text" class="form-control" id="rfid-field" style="flex: 1;">
            </div>

            <div class="form-group" style="display: flex; align-items: center;">
                <label for="label-field" style="margin-right: 10px;">Label</label>
                <input type="text" class="form-control" id="label-field" style="flex: 1;">
            </div>

            <div class="form-group" style="display: flex; align-items: center;">
                <label for="serial-field" style="margin-right: 10px;">Serienummer</label>
                <input type="text" class="form-control" id="serial-field" style="flex: 1;">
            </div>
        </form> `,
        buttons: {
            confirm: {
                label: 'Ok',
                className: 'btn-primary',
                callback: async () => {
                    const auto_increment = document.getElementById('auto-increment-id').checked;
                    let id = document.getElementById('id-field').value;
                    const rfid = document.getElementById('rfid-field').value;
                    const serial = document.getElementById('serial-field').value;
                    const label = document.getElementById('label-field').value;
                    if (id === "" || rfid === "") {
                        new AlertPopup("warning", "'Badge nummer' en 'Rfid' moeten ingevuld zijn.")
                    } else {
                        id = parseInt(id);
                        if (isNaN(id)) {
                            new AlertPopup("warning", "Het veld 'Id' moet een getal zijn.")
                        } else {
                            let resp = null;
                            if (new_spare)
                                resp = await fetch_post("spare.spare", {id, rfid, label, serial});
                            else
                                resp = await fetch_update("spare.spare", {id, rfid, label, serial});
                            datatable_reload_table();
                            if (resp !== null && auto_increment) {
                                id += 1;
                                __dialog_new_single_spare(id, auto_increment);
                            }
                        }
                    }
                }
            },
            cancel: {
                label: 'Annuleer',
                className: 'btn-secondary'
            }
        },
        onShown: function () {
            setTimeout(() => {
                document.getElementById('auto-increment-id').checked = default_auto_increment;
                if (default_id) document.getElementById('id-field').value = default_id;
            }, 100);
            const rfid_field = document.getElementById('rfid-field');
            rfid_field.focus();
            rfid_field.addEventListener('keypress', function (event) {
                if (event.key === 'Enter') {
                    event.preventDefault(); // Prevent form submission or default behavior
                    document.querySelector('.bootbox .btn-primary').click(); // Trigger the Submit button
                }
            });

            document.getElementById("id-field").addEventListener("input", () => {
                const id = document.getElementById("id-field").value;
                const data = datatable_row_data_get(id);
                new_spare = data === undefined;
                if (!new_spare) {
                    document.getElementById('rfid-field').value = data.rfid;
                    document.getElementById('serial-field').value = data.serial;
                    document.getElementById('label-field').value = data.label;
                }
            });
        }
    });
}

const __dialog_new_list_spare = () => {
    bootbox.dialog({
        title: "Lijst met nieuwe laptops",
        message: `
        <form>
            <div class="form-group">
                <label for="list-field" style="margin-right: 10px;">Lijst met laptops, velden gescheiden door ;<br>serienummer is optioneel<br> badge-nummer;label;serienummer</label>
                <textarea class="form-control" id="list-field" style="flex: 1;" rows="4"></textarea>
            </div>
        </form> `,
        buttons: {
            confirm: {
                label: 'Ok',
                className: 'btn-primary',
                callback: async () => {
                    const list_text = document.getElementById("list-field").value;
                    const list = list_text.split("\n");
                    for (const line of list) {
                        var [id, label, serial] = line.split(";");
                        if (label !== "") {
                            let params = {};
                            if (serial === undefined)
                                params = {id, label};
                            else
                                params = {id, label, serial}
                            const resp = await fetch_update("spare.spare", params);
                        }
                    }
                    datatable_reload_table();
                }
            },
            cancel: {
                label: 'Annuleer',
                className: 'btn-secondary'
            }
        },
        onShown: function () {
        }
    });
}

const button_menu_items = [
    {
        type: 'button',
        id: 'spare-new-single',
        label: 'Eén toevoegen',
        cb: () => __dialog_new_single_spare()
    },
    {
        type: 'button',
        id: 'spare-new-list',
        label: 'Lijst toevoegen',
        cb: () => __dialog_new_list_spare()
    },
]

$(document).ready(function () {
    datatables_init({button_menu_items});
});
