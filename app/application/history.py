import sys
from app import data as dl

#logging on file level
import logging
from app import MyLogFilter, top_log_handle
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())


def get(data):
    try:
        filters = [(k, "=", v) for k,v in data.items()]
        if filters:
            histories = dl.history.get_m(filters, order_by="id")
            if histories:
                data = [h.to_dict() for h in histories]
                return {"data": data}
            return {"data": []}
        else:
            return {"status": "error", "msg": f"No valid data {data}"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {data}, {e}')
        return {"status": "error", "msg": {str(e)}}

