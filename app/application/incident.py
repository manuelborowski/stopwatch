import sys, datetime
from app import data as dl

#logging on file level
import logging
from app import MyLogFilter, top_log_handle
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())


def incident_add(f_data):
    try:
        data = {"lis_badge_id": f_data["lis-badge-number"], "owner_name": f_data["owner-name-id"]["label"], "owner_id": f_data["owner-name-id"]["data"], "laptop_type": f_data["laptop-type"],
                "laptop_name": f_data["laptop-id"]["label"], "laptop_serial": f_data["laptop-id"]["data"], "spare_laptop_name": f_data["spare-laptop-id"], "spare_laptop_serial": None,
                "charger": f_data["charger-chk"], "info": f_data["incident-info"], "type": f_data["incident-type"], "drop_damage": f_data["drop-damage"] if "drop-damage" in f_data else False,
                "water_damage": f_data["water-damage"] if "water-damage" in f_data else False, "status": f_data["incident-status"], "location": f_data["incident-location"],
                "time": datetime.datetime.now()}
        incident = dl.incident.incident_add(data)
        log.info(f'{sys._getframe().f_code.co_name}: incident added, {data}')
        return {"status": "ok", "msg": f"Incident, {incident.id} toegevoegd."}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}


############ incident overview list #########
def format_data(db_list, total_count=None, filtered_count=None):
    out = []
    for i in db_list:
        em = i.to_dict()
        em.update({"row_action": i.id, "DT_RowId": i.id})
        out.append(em)
    return  total_count, filtered_count, out

