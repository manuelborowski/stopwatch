import sys
from app import data as dl

#logging on file level
import logging
from app import MyLogFilter, top_log_handle
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())


############ incident overview list #########
def format_data(db_list, total_count=None, filtered_count=None):
    out = []
    for i in db_list:
        em = i.to_dict()
        em.update({"row_action": i.id, "DT_RowId": i.id})
        out.append(em)
    return  total_count, filtered_count, out

