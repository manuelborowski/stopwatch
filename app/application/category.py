import sys, datetime
from xml.sax.handler import property_declaration_handler

from app import data as dl
import pandas as pd
from flask import request

# logging on file level
import logging
from app import MyLogFilter, top_log_handle

log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

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

def upload2(data):
    try:
        types = dl.settings.get_configuration_setting("tickoff-types")
        type = types[data["type"]]
        pd_data = pd.read_csv(f"temp/{data['filename']}")
        persons = dl.person.get_m()
        key2person = {"".join([getattr(p, k) for k in type["key"]]).lower().replace(" ", ""): p for p in persons}
        data_list = pd_data.to_dict("records")
        category_new = []
        not_found = 0
        for d in data_list:
            key = "".join([d[data[k]] for k in type["key"]]).lower().replace(" ", "")
            if key not in key2person:
                log.error(f'{sys._getframe().f_code.co_name}: import not found: {d}')
                not_found += 1
                continue
            category = {"person_id": key2person[key].id, "type": data["type"], "label": data["category"]}
            for field, alias in type["alias"].items():
                category[alias] = d[data[field]]
            category_new.append(category)
        dl.category.add_m(category_new)
        log.info(f'{sys._getframe().f_code.co_name}: uploaded {len(category_new)} persons, not found: {not_found}')

        return {"status": "ok", "msg": f"Bestand is opgeladen"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {data}, {e}')
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

def delete(type, category):
    try:
        categories = dl.category.get_m([("type", "=", type), ("label", "=", category)])
        dl.category.delete_m(objs=categories)
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
