import {busy_indication_off, busy_indication_on} from "../base.js";

export const start_sync = async () => {
    busy_indication_on();
    var message = "Start met synchroniseren van van reservaties (nieuwe RFID...)"
    bootbox.dialog({
        message: `<span id='sync-message'>${message}</span>`,
        title: "Synchroniseer leerlingen, registraties, locaties...",
        buttons: {main: {label: "OK", className: "btn-primary", callback: result => window.location.reload()}},

    });
    // sync reservations (i.e students with new RFID, ....
    const ret4 = await fetch(Flask.url_for('student.sync_student_reservations'), {method: 'POST'});
    const status4 = await ret4.json();
    if (status4.status) {
        message += `\n->Aantal geslaagde reservaties: ${status4.data.nbr_ok}, aantal niet geslaagde: ${status4.data.nbr_nok}`
        message += `\n\nStart met synchroniseren van studenten (nieuw, verwijderd, ...)`
        document.querySelector("#sync-message").innerText = message;
    }

    // sync students
    const ret = await fetch(Flask.url_for('student.sync_student_registrations'), {method: 'POST'});
    const status = await ret.json();
    if (status.status) {
        message += `\n-> Nieuwe studenten: ${status.data.nbr_new}, Aangepaste studenten: ${status.data.nbr_updated}, Verwijderde studenten: ${status.data.nbr_deleted}`
        message += `\n\nStart met synchroniseren van registraties...`
        document.querySelector("#sync-message").innerText = message;
    }
    // sync registrations
    const ret2 = await fetch(Flask.url_for('register.sync_registrations'), {method: 'POST'});
    const status2 = await ret2.json();
    if (status2.status) {
        message += `\n->Nieuwe registraties: ${status2.data.nbr_new}, Dubbele registraties: ${status2.data.nbr_doubles}`
        message += `\n\nStart met synchroniseren van locaties en artikels...`
        document.querySelector("#sync-message").innerText = message;
    }

    // sync locations
    const ret3 = await fetch(Flask.url_for('register.sync_locations_articles'));
    const status3 = await ret3.json();
    if (status3.status) {
        message += `\n->Aantal locaties: ${status3.data.nbr_locations}, aantal artikels: ${status3.data.nbr_articles}`
        message += `\n\nSynchroniseren is gedaan`
        document.querySelector("#sync-message").innerText = message;
    }

    busy_indication_off();
}

export const start_update = async () => {
    busy_indication_on();
    bootbox.confirm("Start met software update...",
        async result => {const ret = await fetch(Flask.url_for('api.upgrade_software_client'), {method: 'POST', headers: {'x-api-key': api_key,}})});
    busy_indication_off();
}

