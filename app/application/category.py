import sys
from thefuzz import process

from app import data as dl
import pandas as pd
from flask import request

# logging on file level
import logging
from app import MyLogFilter, top_log_handle

log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

# stage 1: upload file and store in temp folder.
# Return filename, columnheaders and first row of data
def upload1(files, data):
    try:
        header = data["header_present"] == "true"
        if (header):
            pd_data = pd.read_excel(files["tickoff_file"], keep_default_na=False)
            header = pd_data.columns.to_list()
        else:
            pd_data = pd.read_excel(files["tickoff_file"], keep_default_na=False, header=None)
            header = [f"kolom {n + 1}" for n in range(len(pd_data.columns))]
            pd_data.columns = header
        pd_data.to_csv(f"temp/{files["tickoff_file"].filename}")
        data = pd_data.to_dict("records")
        if (len(data) == 0):
            return {"status": "error", "msg": "Bestand is leeg"}
        return {"data": {"filename": files["tickoff_file"].filename, "column": header, "data": data[0]}}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {data}, {e}')
        return {"status": "error", "msg": str(e)}

# depending on the stage:
# stage 2: depending on the selected columns, process the file and return not found entries
# stage 3: process the file again and save to database
def upload2(parameters):
    try:
        def __create_item(person, line):
            item = {"naam": person.naam, "voornaam": person.voornaam, "klas": person.klas, "klasgroep": person.klasgroep, "rfid": person.rfid}
            for field, alias in type["alias"].items():
                item[alias] = line[parameters[field]] if parameters[field] != "NVT" else ""
            return item

        stage = parameters["stage"]
        types = dl.settings.get_configuration_setting("tickoff-types")
        type = types[parameters["type"]]
        if stage == 2:
            pd_file = pd.read_csv(f"temp/{parameters['filename']}", dtype="string")
            persons = dl.person.get_m()
            # the fields (in the database) that compromise the key
            key_fields = [[k2 for k1 in type["key"] for k2 in (type["combine"][k1] if k1 in type["combine"] else [k1])]]
            pd_key_fields = [parameters[k] for k in type["key"]]
            alternate_name = [["voornaam", "naam"], ["naam", "roepnaam"], ["roepnaam", "naam"]]
            additional_key_fields = False
            if "naam" in key_fields[0] and "voornaam" in key_fields[0]:
                additional_key_fields = True
                naam_pos = key_fields[0].index("naam")
                voornaam_pos = key_fields[0].index("voornaam")
                for i, a in enumerate(alternate_name):
                    key_fields.append(key_fields[0].copy())
                    key_fields[i + 1][naam_pos] = a[0]
                    key_fields[i + 1][voornaam_pos] = a[1]
            db_key_value2person = []  # array of dicts of key to person.  Each dict differs because voornaam is replaced by roepnaam or naam and voornaam are switched
            db_key_values = []  # array of arrays of keys.  The keys are the keys from the dicts above
            for dk in key_fields:
                key_dict = {"".join([getattr(p, k) for k in dk]).lower().replace(" ", ""): p for p in persons}
                db_key_value2person.append(key_dict)
                db_key_values.append(list(key_dict))
            pd_data = pd_file.to_dict("records")
            tbc = []  # To be confirmed
            found = []  # persons found
            for pd_line in pd_data:
                # from the field, combine the key columns to get the key value
                pd_key_value_raw = " ".join([pd_line[parameters[k]] for k in type["key"]])
                pd_key_value = pd_key_value_raw.lower().replace(" ", "")
                if pd_key_value in db_key_value2person[0]:
                    found.append(__create_item(db_key_value2person[0][pd_key_value], pd_line))
                else:
                    log.error(f'{sys._getframe().f_code.co_name}: import not found: {pd_line}')
                    # the normal, intended key was not found, try variations on this key (i.e. swap naam and voornaam, ...) if applicable
                    if additional_key_fields:
                        best = ["", 0, None]
                        for i in range(1, 4):
                            fuzz_found = process.extract(pd_key_value, db_key_values[i], limit=1)
                            if len(fuzz_found) > 0:
                                if fuzz_found[0][1] > best[1]:
                                    best[0] = key_fields[i]  # the key fields to create the key value
                                    best[1] = fuzz_found[0][1]  # the fuzz score, 100 means the literal key is found in keys[i]
                                    best[2] = db_key_value2person[i][fuzz_found[0][0]]  # the person, associated with the given key variant
                        if best[1] == 100:
                            found.append(__create_item(best[2], pd_line))
                        else:
                            tbc.append({"pd": {"key_fields": pd_key_fields, "data": pd_line}, "person": {"data": __create_item(best[2], pd_line), "key_fields": best[0]}})
            return {"tbc": tbc, "found": found}
        if stage == 3:
            [f.update({"type": parameters["type"], "label": parameters["category"]}) for f in parameters["found"]]
            dl.category.add_m(parameters["found"])
            db2pd_fields = {(type["combine"][k][0] if k in type["combine"] else k): parameters[k] for k in type["key"]}
            not_found = [{k: nf[v] for k, v in db2pd_fields.items()} for nf in parameters["not_found"]]
            [nf.update({"type": parameters["type"], "label": parameters["category"]}) for nf in not_found]
            dl.category.add_m(not_found)
            log.info(f'{sys._getframe().f_code.co_name}: uploaded {len(parameters["found"])} persons, not found: {len(not_found)}')
        return {"status": "ok", "msg": "Evenement is bewaard"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {parameters}, {e}')
        return {"status": "error", "msg": str(e)}

def get():
    try:
        category_sets = dl.models.get_multiple(dl.category.Category, fields=["label", "type"], distinct=True)
        categories = {}
        for s in category_sets:
            if s[1] in categories:
                categories[s[1]].append(s[0])
            else:
                categories[s[1]] = [s[0]]
        return categories
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}

def update(parameters):
    try:
        category = dl.category.get(("id", "=", parameters["id"]))
        del parameters["id"]
        dl.category.update(category, parameters)
        return {"status": "ok", "msg": "Deeelnemer is aangepast"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}

def add(parameters):
    try:
        dl.category.add(parameters)
        return {"status": "ok", "msg": "Deeelnemer is toegevoegd"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}

def delete_type_category(type, category):
    try:
        categories = dl.category.get_m([("type", "=", type), ("label", "=", category)])
        dl.category.delete_m(objs=categories)
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}

def delete(ids):
    try:
        dl.models.delete_multiple(dl.category.Category, ids)
        return {"status": "ok", "msg": "Deelnemers zijn verwijderd"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}




############ user overview list #########
def format_data(db_list, total_count=None, filtered_count=None):
    out = []
    for i in db_list:
        em = i.to_dict()
        em.update({"row_action": i.id, "DT_RowId": i.id})
        out.append(em)
    return total_count, filtered_count, out
