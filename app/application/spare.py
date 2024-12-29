import sys, datetime
from app import data as dl

#logging on file level
import logging
from app import MyLogFilter, top_log_handle
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

def add(f_data):
    try:
        spare = dl.spare.spare_add(f_data)
        log.info(f'{sys._getframe().f_code.co_name}: spare added, {f_data}')
        return {"id": spare.id}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}

def update(f_data):
    try:
        spare = dl.spare.spare_get(("id", "=", f_data["id"]))
        if spare:
            del f_data["id"]
            spare = dl.spare.spare_update(spare, f_data)
            log.info(f'{sys._getframe().f_code.co_name}: spare updated, {f_data}')
            return {"id": spare.id}
        log.error(f'{sys._getframe().f_code.co_name}: spare not found, id {f_data["id"]}')
        return {"status": "error", "msg": f'Reserve niet gevonden, id {f_data["id"]}'}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}

########### incident overview list #########
def format_data(db_list, total_count=None, filtered_count=None):
    out = []
    for i in db_list:
        em = i.to_dict()
        em.update({"row_action": i.id, "DT_RowId": i.id})
        out.append(em)
    return  total_count, filtered_count, out

