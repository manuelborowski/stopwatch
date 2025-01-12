import sys, datetime, re, random, requests, wonderwords
from app import app, data as dl
from flask_login import current_user
from flask import request

#logging on file level
import logging
from app import MyLogFilter, top_log_handle
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

def __event_location_changed(incident):
    try:
        if incident.lis_badge_id > 999999:
            return True
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

def __event_repaired(incident):
    try:
        if incident.lis_badge_id > 999999:
            return True
        template = dl.settings.get_configuration_setting("ss-student-message-template")
        if incident.laptop_type == "leerling":
            laptop_owner = dl.student.get(("leerlingnummer", "=", incident.laptop_owner_id))
            ss_to = laptop_owner.leerlingnummer
        elif incident.laptop_type == "personeel":
            laptop_owner = dl.staff.get(("code", "=", incident.laptop_owner_id))
            ss_to = laptop_owner.ss_internal_nbr
        else:
            return False
        if laptop_owner:
            template = template.replace("%%VOORNAAM%%", laptop_owner.voornaam)
            password_match_template = re.search("%%IF_STANDARD_PASSWORD%%.*?%%ENDIF%%", template, re.DOTALL)[0]
            if incident.laptop_owner_password_default:
                password_match = password_match_template.replace("%%IF_STANDARD_PASSWORD%%", "")
                password_match = password_match.replace("%%ENDIF%%", "")
                template = template.replace(password_match_template, password_match)
            else:
                template = template.replace(password_match_template, "")
            state = dl.settings.get_configuration_setting("lis-state")["repaired"]
            tos = state["ss_to"] if "ss_to" in state else [ss_to]
            log.info(f"{sys._getframe().f_code.co_name}, laptop repaired ss-message to {tos}")
            for to in tos:
                ret = dl.smartschool.smartschool.send_message(to, "lis", "Laptop is klaar", template)
                if ret != 0:
                    log.error(f'{sys._getframe().f_code.co_name}: send_message returned {ret}')
            return True
        log.error(f'{sys._getframe().f_code.co_name}: laptop_owner not found, {incident.laptop_owner_id}')
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')

def __event(incident, event):
    try:
        if event == "new":
            incident.incident_state = "started"
        elif event == "location":
            incident.incident_state = "transition"
            __event_location_changed(incident)
        elif event == "started":
            incident.incident_state = "started"
        elif event == "repaired":
            incident.incident_state = "repaired"
            __event_repaired(incident)
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
        if "incident_owner" not in data: data["incident_owner"] = current_user.username
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
            if "incident_owner" not in data: data["incident_owner"] = current_user.username
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

# generate a number of random incidents (lis_badge_id > 999999)
def generate(nbr):
    try:
        random_info = wonderwords.RandomSentence()
        students = dl.student.get_m()
        staff = dl.staff.get_m()
        incident_owners = dl.user.get_m()
        user_with_default_location = []
        for owner in incident_owners:
            found, default_location = dl.settings.get_setting("default-location", user=owner.username)
            if found:
                owner.default_location = default_location
                user_with_default_location.append(owner)

        entra_url = app.config["ENTRA_API_URL"]
        entra_key = app.config["ENTRA_API_KEY"]
        for i in range(nbr):
            incident_owner = random.choice(user_with_default_location)
            laptop_type = random.choice(["leerling", "personeel"])
            default_password = random.choice([False, True])
            incident_type = random.choice(["hardware", "software", "herinstalleren"])
            drop_damage = random.choice([True, False]) if incident_type == "hardware" else False
            water_damage = random.choice([True, False]) if incident_type == "hardware" else False
            entra_id = None
            device = None
            if laptop_type == "leerling":
                laptop_owner = random.choice(students)
                laptop_owner_id = laptop_owner.leerlingnummer
                res = requests.get(f"{entra_url}/student?filters=leerlingnummer$=${laptop_owner_id}", headers={'x-api-key': entra_key})
                if res.status_code == 200:
                    entra_students = res.json()
                    if entra_students['status']:
                        entra_id = entra_students["data"][0]["entra_id"]
            else:
                laptop_owner = random.choice(staff)
                laptop_owner_id = laptop_owner.code
                res = requests.get(f"{entra_url}/staff?filters=code=${laptop_owner_id}", headers={'x-api-key': entra_key})
                if res.status_code == 200:
                    entra_staffs = res.json()
                    if entra_staffs['status']:
                        entra_id = entra_staffs["data"][0]["entra_id"]
            if entra_id:
                res = requests.get(f"{entra_url}/device/get?filters=user_entra_id$=${entra_id}", headers={'x-api-key': entra_key})
                if res.status_code == 200:
                    devices = res.json()
                    if devices['status'] and len(devices["data"]) > 0:
                        device = [d for d in devices["data"] if d["active"]][0]
            if device:
                data = {
                    "lis_badge_id": 1000000+i, "laptop_owner_name": f"{laptop_owner.naam} {laptop_owner.voornaam}", "laptop_owner_id": laptop_owner_id,
                    "laptop_owner_password": random.choice(["password1", "password2"]) if not default_password else "", "laptop_owner_password_default": default_password,
                    "laptop_type": laptop_type, "laptop_name": device["m4s_csu_label"], "laptop_serial": device["serial_number"], "spare_laptop_name": "", "spare_laptop_serial": "",
                    "charger": "", "info": random_info.sentence(), "incident_type": incident_type, "drop_damage": drop_damage, "water_damage": water_damage,
                    "location": incident_owner.default_location, "incident_owner": incident_owner.username, "m4s_id": "",
                }
                add(data)
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')

# send random event to random incident (lis_badge_id > 999999)
def event(nbr):
    try:
        random_info = wonderwords.RandomSentence()
        incidents = dl.incident.get_m(("lis_badge_id", ">", 999999))
        locations = [k for k, _ in dl.settings.get_setting("lis-locations")[1].items()]
        incident_owners = dl.user.get_m()
        location_owner = {}
        for owner in incident_owners:
            found, location = dl.settings.get_setting("default-location", user=owner.username)
            if found: location_owner[location] = owner.username

        for i in range(nbr):
            incident = random.choice(incidents)
            data = {}
            event = None
            data["incident_owner"] = incident.incident_owner
            if incident.incident_state == "started":
                event = random.choice(["location", "repaired"])
                if event == "location":
                    data["location"] = random.choice(locations)
                    if data["location"] in location_owner:
                        data["incident_owner"] = location_owner[data["location"]]
            elif incident.incident_state == "transition":
                event = "started"
            elif incident.incident_state == "repaired":
                event = random.choice(["closed", "started"])
            if event:
                data.update({"event": event, "info": random_info.sentence(), "id": incident.id,})
                update(data)
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')

def format_data(db_list, total_count=None, filtered_count=None):
    out = []
    for i in db_list:
        em = i.to_dict()
        em.update({"row_action": i.id, "DT_RowId": i.id,"state_event": "NA"})
        out.append(em)
    return total_count, filtered_count, out
