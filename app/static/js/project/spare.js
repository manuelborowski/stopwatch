import {datatables_init, datatable_row_data_from_id, datatable_reload_table} from "../datatables/dt.js";
import {AlertPopup} from "../common/popup.js";
import {fetch_update, fetch_post, fetch_get} from "../common/common.js";
import {badge_raw2hex} from "../common/rfid.js";


const __dialog_new_single_spare = async (default_id = null, default_auto_increment = false) => {
    const form = await fetch_get("spare.form")
    if (form) {
        var new_spare = false;
        bootbox.dialog({
            title: "Nieuwe reserve laptop badge (* is vereist)",
            message: form.template,
            buttons: {
                confirm: {
                    label: 'Ok',
                    className: 'btn-primary',
                    callback: async () => {
                        const form_data = new FormData(document.getElementById("spare-form"));
                        const data = Object.fromEntries(form_data)
                        const auto_increment = data.auto_increment === "on";
                        if (data.id === "" || data.rfid === "") {
                            new AlertPopup("warning", "'Badgenummer' en 'Rfid' moeten ingevuld zijn.")
                        } else {
                            data.id = parseInt(data.id);
                            if (isNaN(data.id)) {
                                new AlertPopup("warning", "Het veld 'Badgenummer' moet een getal zijn.")
                            } else {
                                let resp = null;
                                if (new_spare)
                                    resp = await fetch_post("spare.spare", data);
                                else
                                    resp = await fetch_update("spare.spare", data);
                                datatable_reload_table();
                                if (resp !== null && auto_increment) {
                                    data.id += 1;
                                    await __dialog_new_single_spare(data.id, auto_increment);
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
                const rfid_field = document.getElementById('rfid-field');
                rfid_field.focus();
                rfid_field.addEventListener('keypress', function (event) {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        const [valid_code, code] = badge_raw2hex(rfid_field.value);
                        if (valid_code) {
                            rfid_field.value = code;
                            document.querySelector('.bootbox .btn-primary').click(); // Trigger the Submit button
                        }
                    }
                });

                document.getElementById("id-field").addEventListener("input", () => {
                    const id = document.getElementById("id-field").value;
                    if (id !== "") {
                        const data = datatable_row_data_from_id(id);
                        new_spare = data === undefined;
                        if (!new_spare) {
                            document.getElementById('rfid-field').value = data.rfid;
                            document.getElementById('serial-field').value = data.serial;
                            document.getElementById('label-field').value = data.label;
                            return
                        }
                    }
                    document.getElementById('rfid-field').value = "";
                    document.getElementById('serial-field').value = "";
                    document.getElementById('label-field').value = "";
                });
                setTimeout(() => {
                    document.getElementById('auto-increment-id').checked = default_auto_increment;
                    if (default_id) {
                        const id_field = document.getElementById('id-field');
                        id_field.value = default_id;
                        id_field.dispatchEvent(new Event("input"));
                    }
                }, 100);
            }
        });
    }
}

const __dialog_new_list_spare = () => {
    bootbox.dialog({
        title: "Lijst met nieuwe laptops",
        message: `
        <form>
            <div class="form-row">
                <div class="form-element" >
                    <label for="list-field">Lijst met laptops, velden gescheiden door <b>;</b><br>serienummer is optioneel.<br> badgenummer;laptop-label;serienummer</label>
                    <textarea id="list-field" style="flex: 1;" rows="4" cols="50"></textarea>
                </div>
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
