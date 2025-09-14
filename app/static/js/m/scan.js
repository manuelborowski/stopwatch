$(document).ready(async () => {
    const scan_type_select = document.getElementById("scan-type-select");
    const main = document.getElementById("main");
    const scan_list = document.getElementById("scan-list");
    const out = document.getElementById("log-out");
    const clear_list_button = document.getElementById("clear-list-btn");

    const scan_type_options = [{label: "Selecteer een type", value: null}, {label: "TEST", value: "test"}, {label: "Inchecken", value: "checkin"}, {label: "Aankomst", value: "result"}];
    scan_type_options.forEach(l => scan_type_select.add(new Option(l.label, l.value, false, false)));

    let ndef = null;

    const scan_cache = JSON.parse(localStorage.getItem("scans")) || {};

    scan_type_select.addEventListener("change", async (e) => {
        if (["null", "test"].includes(e.target.value)) {
            main.classList.add("scan-not-active");
            main.classList.remove("register-active");
        } else {
            main.classList.remove("scan-not-active");
            main.classList.add("register-active");
        }
        if (e.target.value in scan_cache) {
            scan_list.innerHTML = scan_cache[e.target.value];
        } else {
            scan_list.innerHTML = "";
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

                    if (resp.status) {
                        scan_list.innerHTML = `${resp.data.checkin_time.substring(11, 19)}, ${resp.data.klasgroep}, ${resp.data.naam} ${resp.data.voornaam}<br><br>` + scan_list.innerHTML;
                        scan_cache[e.target.value] = scan_list.innerHTML;
                        localStorage.setItem("scans", JSON.stringify(scan_cache));
                    } else {
                        scan_list.innerHTML = `<div style="background:orange;">${resp.data}</div><br>` + scan_list.innerHTML;

                    }
                });
            }
        } catch (error) {
            out.value = "Fout " + error;
        }
    });

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
