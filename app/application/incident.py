import sys, datetime
from app import data as dl
from flask_login import current_user
from flask import request

#logging on file level
import logging
from app import MyLogFilter, top_log_handle
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

def __inform_location(incident):
    try:
        body_template = [
            {"state": "transition", "heading": {"s": "1 incident komt van een andere locatie", "m": "{nbr} incidenten komen van een andere locatie"}},
            {"state": "started", "heading": {"s": "1 incident in reparatie", "m": "{nbr} incidenten in reparatie"}},
            {"state": "repaired", "heading": {"s": "1 incident hersteld, laptop nog niet afgehaald", "m": "{nbr} incidenten hersteld, laptop nog niet afgehaald"}},
        ]
        logging = f"{incident.id}/{incident.location}"
        locations = dl.settings.get_configuration_setting("lis-locations")
        location = locations[incident.location]
        if "email" in location:
            url = request.url_root
            incidents = dl.incident.get_m(("location", "=", incident.location))
            incident_info = {}
            for incident in incidents:
                if incident.incident_state in incident_info:
                    incident_info[incident.incident_state].append(incident)
                else:
                    incident_info[incident.incident_state] = [incident]
            body = ""
            for item in body_template:
                if item["state"] in incident_info:
                    nbr = len(incident_info[item["state"]])
                    line = item["heading"]["m"].replace("{nbr}", str(nbr)) if nbr > 1 else item["heading"]["s"]
                    body += f"<b><u>{line}</u></b><br>"
                    for incident in incident_info[item["state"]]:
                        line = f'<a href="{url}incidentshow?id={incident.id}">&#x1F517;</a>(Tijd) {incident.time}, (Wie) {incident.incident_owner}, (Locatie) {incident.location}, (Type) {incident.incident_type}, (Info) {incident.info}'
                        body += f"{line}<br>"
                    body += "<br><br>"
            if body:
                body += "<br><br>Laptop Incident Systeem"
                dl.entra.entra.send_mail(location["email"], "LIS update", body)
                log.info(f"{sys._getframe().f_code.co_name}, location-changed mail sent to {location['email']}, {logging}")
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')

def __event(incident, event):
    try:
        if event == "new":
            incident.incident_state = "started"
        elif event == "location":
            incident.incident_state = "transition"
            __inform_location(incident)
        elif event == "started":
            incident.incident_state = "started"
        elif event == "repaired":
            incident.incident_state = "repaired"
        elif event == "closed":
            incident.incident_state = "closed"
        dl.incident.commit()
        log.info(f'{sys._getframe().f_code.co_name}: state change, incident-id/state/event, {incident.id}/{incident.incident_state}/{event}')
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')

def add(data):
    try:
        data["time"] = datetime.datetime.now()
        states = dl.settings.get_configuration_setting("lis-state")
        default_state = [k for k, v in states.items() if "default" in v][0]
        data["incident_state"] = default_state
        data["incident_owner"] = current_user.username
        incident = dl.incident.add(data)
        if incident:
            # store some data in history
            history_data = {"incident_id": incident.id, "priority": incident.priority, "info": incident.info, "incident_type": incident.incident_type, "drop_damage": incident.drop_damage,
                            "water_damage": incident.water_damage, "incident_state": incident.incident_state, "location": incident.location, "incident_owner": incident.incident_owner, "time": incident.time, }
            history = dl.history.add(history_data)
        log.info(f'{sys._getframe().f_code.co_name}: incident added, {data}')
        return {"status": "ok", "msg": f"Incident, {incident.id} toegevoegd."}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}

def update(data):
    try:
        incident = dl.incident.get(("id", "=", data["id"]))
        if incident:
            # if the info field is empty, but the previous was not, copy that...
            if data["info"] == "":
                history_latest = dl.history.get_m(("incident_id", "=", data["id"]), order_by="-id", first=True)
                if history_latest:
                    data["info"] = history_latest.info
            data["time"] = datetime.datetime.now()
            data["incident_owner"] = current_user.username
            del data["id"]
            incident = dl.incident.update(incident, data)
            if incident:
                if "event" in data:
                    __event(incident, data["event"])
                # store some data in history
                history_data = {"incident_id": incident.id, "priority": incident.priority, "info": incident.info, "incident_type": incident.incident_type, "drop_damage": incident.drop_damage,
                    "water_damage": incident.water_damage, "incident_state": incident.incident_state, "location": incident.location, "incident_owner": incident.incident_owner, "time": incident.time,}
                history = dl.history.add(history_data)
                log.info(f'{sys._getframe().f_code.co_name}: incident updated, {data}')
                return {"id": incident.id}
        log.error(f'{sys._getframe().f_code.co_name}: incident not found, id {data["id"]}')
        return {"status": "error", "msg": f'Incident niet gevonden, id {data["id"]}'}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}

def get(data={}):
    try:
        filters = [(k, "=", v) for k,v in data.items()]
        incidents = dl.incident.get_m(filters)
        if incidents:
            if len(incidents) > 1:
                return {"data": [i.to_dict() for i in incidents]}
            else:
                return {"data": incidents[0].to_dict()}
        else:
            return {"status": "error", "msg": f"Incident niet gevonden, filter {filters}"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {data}, {e}')
        return {"status": "error", "msg": {str(e)}}

def format_data(db_list, total_count=None, filtered_count=None):
    # build event_template location select
    locations = dl.settings.get_configuration_setting("lis-locations")
    out = []
    for i in db_list:
        em = i.to_dict()
        location_select_options = ""
        if i.incident_state == "started":
            for k, v in locations.items():
                selected = " selected" if k == i.location else ""
                location_select_options += f'<option value="{k}" {selected}>{v["label"]}</option>'
            event_template = f'<div class="dt-incell-row"><select class="state-event-location-select">{location_select_options}</select>'
            event_template += f'<a type="button" class="state-event-button-repaired btn btn-success">Hersteld</a></div>'
        elif i.incident_state == "transition":
            event_template = f'<div class="dt-incell-row"><a type="button" class="state-event-button-started btn btn-success">Starten</a></div>'
        elif i.incident_state == "repaired":
            event_template = f'<div class="dt-incell-row"><a type="button" class="state-event-button-closed btn btn-success">Sluiten</a>'
            event_template += f'<a type="button" class="state-event-button-started btn btn-success">Starten</a></div>'
        else:
            event_template = "/"
        em.update({"row_action": i.id, "DT_RowId": i.id, "state_event": event_template})
        out.append(em)
    return total_count, filtered_count, out
