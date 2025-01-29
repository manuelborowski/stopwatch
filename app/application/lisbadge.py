import sys
from app import data as dl

#logging on file level
import logging
from app import MyLogFilter, top_log_handle
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

def add(f_data):
    try:
        find_badge = dl.lisbadge.get(("rfid", "=", f_data["rfid"]))
        if find_badge:
            log.info(f'{sys._getframe().f_code.co_name}: rfid already present, remove, {f_data["rfid"]}')
            dl.lisbadge.delete_m(objs=[find_badge])
        find_badge = dl.lisbadge.get(("id", "=", f_data["id"]))
        if find_badge:
            log.info(f'{sys._getframe().f_code.co_name}: id already present, remove, {f_data["id"]}')
            dl.lisbadge.delete_m(objs=[find_badge])
        badge = dl.lisbadge.add(f_data)
        log.info(f'{sys._getframe().f_code.co_name}: badge added, {f_data}')
        return {"id": badge.id}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}

def update(f_data):
    try:
        find_badge = dl.lisbadge.get(("rfid", "=", f_data["rfid"]))
        if find_badge:
            log.error(f'{sys._getframe().f_code.co_name}: rfid already present, {f_data["rfid"]}')
            return {"status": "error", "msg": f'Rfid code, {f_data["rfid"]}, bestaat al'}
        lis = dl.lisbadge.get(("id", "=", f_data["id"]))
        if lis:
            del f_data["id"]
            lis = dl.lisbadge.update(lis, f_data)
            log.info(f'{sys._getframe().f_code.co_name}: lis updated, {f_data}')
            return {"id": lis.id}
        log.error(f'{sys._getframe().f_code.co_name}: lis not found, id {f_data["id"]}')
        return {"status": "error", "msg": f'LIS badge niet gevonden, id {f_data["id"]}'}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}

def get(data):
    try:
        filters = [(k, "=", v) for k,v in data.items()]
        if filters:
            badge = dl.lisbadge.get(filters)
            if badge:
                return {"data": badge.to_dict()}
            else:
                return {"status": "error", "msg": f"Badge niet gevonden, filter {filters}"}
        else:
            return {"status": "error", "msg": f"No valid data {data}"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {data}, {e}')
        return {"status": "error", "msg": {str(e)}}


