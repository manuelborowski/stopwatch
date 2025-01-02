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
            log.error(f'{sys._getframe().f_code.co_name}: rfid already present, {f_data["rfid"]}')
            return {"status": "error", "msg": f'Rfid code, {f_data["rfid"]}, bestaat al'}
        spare = dl.spare.add(f_data)
        log.info(f'{sys._getframe().f_code.co_name}: spare added, {f_data}')
        return {"id": spare.id}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}

def update(f_data):
    try:
        find_spare = dl.spare.get(("rfid", "=", f_data["rfid"]))
        if find_spare:
            log.error(f'{sys._getframe().f_code.co_name}: rfid already present, {f_data["rfid"]}')
            return {"status": "error", "msg": f'Rfid code, {f_data["rfid"]}, bestaat al'}
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
