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

def get():
    try:
        tickoff_sets = dl.models.get_multiple(dl.tickoff.Tickoff, fields=["label", "category", "type"], distinct=True)
        tickoffs = {}
        for s in tickoff_sets:
            if s[2] in tickoffs:
                if s[1] in tickoffs[s[2]]:
                    tickoffs[s[2]][s[1]].append(s[0])
                else:
                    tickoffs[s[2]][s[1]] = [s[0]]
            else:
                tickoffs[s[2]] = {s[1]: [s[0]]}
        return tickoffs
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
        categories = dl.category.get_m([("type", "=", parameters["type"]), ("label", "=", parameters["category"])])
        tickoffs = [c.to_dict() for c in categories]
        [t.pop("id") for t in tickoffs]
        [t.update({"category": t["label"], "label": parameters["label"]}) for t in tickoffs]
        dl.tickoff.add_m(tickoffs)
        return {"status": "ok", "msg": "Nieuwe sessie is toegevoegd"}
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
