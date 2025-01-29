import sys, datetime
from app import data as dl

#logging on file level
import logging
from app import MyLogFilter, top_log_handle
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

def add(f_data):
    try:
        find_spare = dl.spare.get(("rfid", "=", f_data["rfid"]))
        if find_spare:
            log.info(f'{sys._getframe().f_code.co_name}: rfid already present, remove {f_data["rfid"]}')
            dl.spare.delete_m(objs=[find_spare])
        find_spare = dl.spare.get(("id", "=", f_data["id"]))
        if find_spare:
            log.info(f'{sys._getframe().f_code.co_name}: id already present, remove {f_data["id"]}')
            dl.spare.delete_m(objs=[find_spare])
        spare = dl.spare.add(f_data)
        log.info(f'{sys._getframe().f_code.co_name}: spare added, {f_data}')
        return {"id": spare.id}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}

def update(f_data):
    try:
        spare = dl.spare.get(("id", "=", f_data["id"]))
        if spare:
            del f_data["id"]
            spare = dl.spare.update(spare, f_data)
            log.info(f'{sys._getframe().f_code.co_name}: spare updated, {f_data}')
            return {"id": spare.id}
        log.error(f'{sys._getframe().f_code.co_name}: spare not found, id {f_data["id"]}')
        return {"status": "error", "msg": f'Reserve niet gevonden, id {f_data["id"]}'}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}

def get(data):
    try:
        filters = [(k, "=", v) for k,v in data.items()]
        if filters:
            spare = dl.spare.get(filters)
            if spare:
                return {"data": spare.to_dict()}
            else:
                return {"status": "error", "msg": f"Spare niet gevonden, filter {filters}"}
        else:
            return {"status": "error", "msg": f"No valid data {data}"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {data}, {e}')
        return {"status": "error", "msg": {str(e)}}

