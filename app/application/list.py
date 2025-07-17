import sys
import app.data as dl

# logging on file level
import logging
from app import MyLogFilter, top_log_handle

log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

def update_m(data):
    try:
        ids = [d["id"] for d in data]
        cache = {int(d["id"]): d for d in data}
        lists = dl.list.get_m(("id", "in", ids))
        for list in lists: cache[list.id]["item"] = list
        dl.list.update_m(data)

    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}
