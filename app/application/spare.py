import sys, qrcode, secrets, base64, io, hashlib
from app import data as dl
from flask import request

#logging on file level
import logging
from app import MyLogFilter, top_log_handle
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())


def add(data):
    try:
        find_spare = dl.spare.get(('rfid', "=", data['rfid']))
        if find_spare:
            log.error(f'Error, spare badge with RFID {find_spare.rfid} already exists')
            return {"status": "warning", "msg": f'Fout, badge met RFID {find_spare.rfid} bestaat al'}
        spare = dl.spare.add(data)
        log.info(f"Add spare badge: {data}")
        return {"id": spare.id}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}


def delete(ids):
    try:
        dl.spare.delete_m(ids)
        return {"status": "ok", "msg": "Reservebadges zijn verwijderd"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}

############ spare badge overview list #########
def format_data(db_list, total_count=None, filtered_count=None):
    out = []
    for i in db_list:
        em = i.to_dict()
        em.update({"row_action": i.id, "DT_RowId": i.id})
        out.append(em)
    return  total_count, filtered_count, out

