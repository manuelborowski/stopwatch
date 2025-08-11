from app import data as dl, application as al
import sys, requests

# logging on file level
import logging
from app import MyLogFilter, top_log_handle, app
import datetime

from app.application.socketio import send_to_room

log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

def update(data):
    try:
        if ("lijst_id" in data):
            persons = dl.person.get_m(("id", "in", data["ids"]))
            for p in persons:
                p.lijst_id = data["lijst_id"]
            dl.person.commit()
            if (data["lijst_id"] is None):
                return {"status": "ok", "msg": "Deelnemers verwijderd van lijst"}
            else:
                return {"status": "ok", "msg": "Deelnemers toegevoegd aan lijst"}
        elif ("temp_badge" in data):
            persons = dl.person.get_m(("id", "in", data["ids"]))
            for p in persons:
                p.temp_badge = data["temp_badge"]
                p.rfid = data["rfid"]
            dl.person.commit()
            if (data["temp_badge"] is None):
                return {"status": "ok", "msg": "Reserve badges verwijderd"}
            else:
                return {"status": "ok", "msg": "Reserve badges toegevoegd"}
        elif ("new_rfid_time" in data):
            person = dl.person.get_m(("id", "=", data["id"]))[0]
            person.new_rfid_time = data["new_rfid_time"]
            dl.person.commit()
            return {"status": "ok", "msg": "Nu badgen aub"}
        elif ("result_time" in data):
            persons = dl.person.get_m(("id", "in", data["ids"]))
            for p in persons:
                p.result_time = data["result_time"]
            dl.person.commit()
            al.socketio.send_to_room({"type": "delete-items-from-list-of-results", "data": {"status": True, "data": [p.to_dict() for p in persons]}}, "result")
            if data["result_time"] is None:
                return {"status": "ok", "msg": "Uitslag(en) verwijderd"}
            else:
                return {"status": "ok", "msg": "Uitslag(en) toegevoegd"}
        return {"status": "error", "msg": f"Onbekende operatie: {data}"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {data}, {e}')
        return {"status": "error", "msg": str(e)}

# depending on the "to" parameter, return values are sent to:
# ip: only to the client/terminal the registration came from.  Used for alerts, messages, ... due to registering
# location: all the clients/terminals that display/are set to said location
# broadcast: all the clients/terminals
def registration_add(location_key, timestamp=None, leerlingnummer=None, rfid=None):
    try:
        if timestamp:
            now = datetime.datetime.strptime(timestamp + "000", "%Y-%m-%dT%H:%M:%S.%f")
        else:
            now = datetime.datetime.now()
        if location_key == "new-rfid":
            reservation_margin = app.config["NEW_RFID_MARGIN"]
            minimum_reservation_time = now - datetime.timedelta(seconds=reservation_margin)
            persons = dl.person.get_m([("new_rfid_time", ">", minimum_reservation_time)])
            if persons:
                person = persons[0]
                find_spares = dl.spare.get_m(("rfid", "=", rfid))
                if find_spares:
                    person.temp_badge = find_spares[0].label
                find_rfids = dl.person.get_m([("rfid", "=", rfid), ("id", "!", person.id)])
                if find_rfids:  # rfid already in database, delete this rfid.
                    find_rfid = find_rfids[0]
                    log.error(f'{sys._getframe().f_code.co_name}:  Rfid, {rfid}, already in database for {find_rfid.informatnummer}, {find_rfid.naam} {find_rfid.voornaam} => deleted')
                    find_rfid.rfid = ""
                    find_rfid.temp_badge = ""
                person.new_rfid_time = None
                person.rfid = rfid
                dl.person.commit()
                log.info(f'{sys._getframe().f_code.co_name}:  Add new rfid for {person.informatnummer}, {person.naam} {person.voornaam}, {rfid}')
                return [
                    {"to": "ip", "type": "alert-popup", "data": f"Deelnemer {person.naam} {person.voornaam} heeft nu RFID code {rfid}{f'<br>En reserve badge nummer {person.temp_badge}' if person.temp_badge != '' else ''}"},
                    {"to": "ip", "type": "update-items-in-list-of-persons", "data": {"status": True, "data": [{"id": person.id, "rfid": person.rfid, "temp_badge": person.temp_badge}]}}]
            log.info(f'{sys._getframe().f_code.co_name}:  No valid reservation for {location_key}')
            return [{"to": "ip", "type": "alert-popup", "data": f"Nieuwe RFID niet gelukt.  Misschien te lang gewacht met scannen, probeer nogmaals"}]
        elif location_key == "checkin":
            persons = dl.person.get_m([("rfid", "=", rfid)])
            if persons:
                person = persons[0]
                person.checkin_time = now
                dl.person.commit()
                log.info(f'{sys._getframe().f_code.co_name}:  Check in for {person.informatnummer}, {person.naam} {person.voornaam}, {now}')
                return [{"to": "location", "type": "update-items-in-list-of-checkins", "data": {"status": True, "data": [{"id": person.id, "checkin_time": str(person.checkin_time)}]}}]
            log.info(f'{sys._getframe().f_code.co_name}:  RFID not found {rfid}')
            return [{"to": "ip", "type": "alert-popup", "data": f"RFID niet gevonden ({rfid})"}]
        elif location_key == "result":
            person = dl.person.get([("rfid", "=", rfid)])
            if person:
                if person.result_time:
                    log.info(f'{sys._getframe().f_code.co_name}:  Already result for {person.naam} {person.voornaam}, {person.result_time}')
                    return [{"to": "ip", "type": "alert-popup", "data": f"{person.naam} {person.voornaam} heeft al een uitslag"}]
                else:
                    list = dl.list.get(("id", "=", person.lijst_id))
                    if list:
                        if list.start_time:
                            person.result_time = (now - list.start_time) / datetime.timedelta(milliseconds=1)
                            dl.person.commit()
                            log.info(f'{sys._getframe().f_code.co_name}:  Result in for  {person.naam} {person.voornaam}, {person.result_time}')
                            return [{"to": "location", "type": "add-item-to-list-of-results", "data": {"status": True, "data": person.to_dict()}}]
                        log.info(f'{sys._getframe().f_code.co_name}:  List not started yet {list.name}')
                        return [{"to": "ip", "type": "alert-popup", "data": f"Lijst {list.name} Is nog niet gestart!"}]
                    log.info(f'{sys._getframe().f_code.co_name}:  Not in list yet {person.naam} {person.voornaam}')
                    return [{"to": "ip", "type": "alert-popup", "data": f"{person.naam} {person.voornaam} staat nog niet op een lijst"}]
            log.info(f'{sys._getframe().f_code.co_name}:  RFID not found {rfid}')
            return [{"to": "ip", "type": "alert-popup", "data": f"RFID niet gevonden ({rfid})"}]
        log.info(f'{sys._getframe().f_code.co_name}:  rif/leerlingnummer {rfid}/{leerlingnummer} not found in database')
        return [{"to": "ip", "type": "alert-popup", "data": f"Kan student met rfid {rfid} / leerlingnummer {leerlingnummer} niet vinden in database"}]
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return [{"to": "ip", 'type': 'alert-popup', "data": f"Fout, {str(e)}"}]

######################### CRON HANDLERS ##################################
def person_cron_load_from_sdh(opaque=None, **kwargs):
    log.info(f"{sys._getframe().f_code.co_name}, START")
    try:
        updated_persons = []
        nbr_updated = 0
        new_persons = []
        sdh_key = app.config["SDH_API_KEY"]
        # get the klassen and klasgroepen
        klas2klasgroep = {}
        res = requests.get(app.config["SDH_GET_KLAS_URL"], headers={'x-api-key': sdh_key})
        if res.status_code == 200:
            sdh_klassen = res.json()
            if sdh_klassen['status']:
                log.info(f'{sys._getframe().f_code.co_name}, retrieved {len(sdh_klassen["data"])} klassen from SDH')
                klas2klasgroep = {k["klascode"]: k["klasgroepcode"] for k in sdh_klassen["data"]}

        # check for new, updated or deleted students
        sdh_student_url = app.config["SDH_GET_STUDENT_URL"]
        res = requests.get(sdh_student_url, headers={'x-api-key': sdh_key})
        if res.status_code == 200:
            sdh_students = res.json()
            if sdh_students['status']:
                log.info(f'{sys._getframe().f_code.co_name}, retrieved {len(sdh_students["data"])} students from SDH')
                db_persons = dl.person.get_m(("klasgroep", "!", "Leerkracht"))
                db_informatnummer_to_student = {s.informatnummer: s for s in db_persons}
                for sdh_student in sdh_students["data"]:
                    if sdh_student["leerlingnummer"] in db_informatnummer_to_student:
                        # check for changed rfid or classgroup
                        db_student = db_informatnummer_to_student[sdh_student["leerlingnummer"]]
                        update = {}
                        klas = sdh_student["klascode"]
                        klasgroep = klas2klasgroep[klas]
                        if db_student.rfid != sdh_student["rfid"]:
                            update["rfid"] = sdh_student["rfid"]
                        if db_student.klasgroep != klasgroep:
                            update["klasgroep"] = klasgroep
                        if db_student.instellingsnummer != sdh_student["instellingsnummer"]:
                            update["instellingsnummer"] = sdh_student["instellingsnummer"]
                        if update:
                            update.update({"item": db_student})
                            updated_persons.append(update)
                            log.info(f'{sys._getframe().f_code.co_name}, Update student {db_student.informatnummer}, update {update}')
                            nbr_updated += 1
                        del (db_informatnummer_to_student[sdh_student["leerlingnummer"]])
                    else:
                        new_student = {"informatnummer": sdh_student["leerlingnummer"], "klasgroep": klas2klasgroep[sdh_student["klascode"]], "instellingsnummer": sdh_student["instellingsnummer"],
                                       "roepnaam": sdh_student["roepnaam"], "naam": sdh_student["naam"], "voornaam": sdh_student["voornaam"], "rfid": sdh_student["rfid"], "geslacht": sdh_student[
                                "geslacht"]}
                        new_persons.append(new_student)
                        log.info(f'{sys._getframe().f_code.co_name}, New student {sdh_student["leerlingnummer"]}')
                deleted_persons = [v for (k, v) in db_informatnummer_to_student.items()]
                for person in deleted_persons:
                    log.info(f'{sys._getframe().f_code.co_name}, Delete student {person.informatnummer}')
                dl.person.add_m(new_persons)
                dl.person.update_m(updated_persons)
                dl.person.delete_m(objs=deleted_persons)
                log.info(f'{sys._getframe().f_code.co_name}, Students add {len(new_persons)}, update {nbr_updated}, delete {len(deleted_persons)}')
            else:
                log.info(f'{sys._getframe().f_code.co_name}, error retrieving students from SDH, {sdh_students["data"]}')
        else:
            log.error(f'{sys._getframe().f_code.co_name}: api call to {sdh_student_url} returned {res.status_code}')

        updated_persons = []
        nbr_updated = 0
        new_persons = []
        # check for new, updated or deleted staff
        sdh_staff_url = app.config["SDH_GET_STAFF_URL"]
        res = requests.get(sdh_staff_url, headers={'x-api-key': sdh_key})
        if res.status_code == 200:
            sdh_staffs = res.json()
            if sdh_staffs['status']:
                log.info(f'{sys._getframe().f_code.co_name}, retrieved {len(sdh_staffs["data"])} staffs from SDH')
                db_persons = dl.person.get_m(("klasgroep", "=", "Leerkracht"))
                db_informatnummer_to_staff = {s.informatnummer: s for s in db_persons}
                for sdh_staff in sdh_staffs["data"]:
                    if sdh_staff["informat_id"] in ["", None]: continue
                    if sdh_staff["informat_id"] in db_informatnummer_to_staff:
                        # check for changed rfid
                        db_staff = db_informatnummer_to_staff[sdh_staff["informat_id"]]
                        update = {}
                        if db_staff.rfid != sdh_staff["rfid"]:
                            update["rfid"] = sdh_staff["rfid"]
                        if update:
                            update.update({"item": db_staff})
                            updated_persons.append(update)
                            log.info(f'{sys._getframe().f_code.co_name}, Update staff {db_staff.informatnummer}, update {update}')
                            nbr_updated += 1
                        del (db_informatnummer_to_staff[sdh_staff["informat_id"]])
                    else:
                        new_staff = {"informatnummer": sdh_staff["informat_id"], "klasgroep": "Leerkracht", "roepnaam": sdh_staff["voornaam"],
                                     "naam": sdh_staff["naam"], "voornaam": sdh_staff["voornaam"], "rfid": sdh_staff["rfid"], "geslacht": sdh_staff["geslacht"]}
                        new_persons.append(new_staff)
                        log.info(f'{sys._getframe().f_code.co_name}, New staff {sdh_staff["informat_id"]}')
                deleted_persons = [v for (k, v) in db_informatnummer_to_staff.items()]
                for person in deleted_persons:
                    log.info(f'{sys._getframe().f_code.co_name}, Delete staff {person.informatnummer}')
                dl.person.add_m(new_persons)
                dl.person.update_m(updated_persons)
                dl.person.delete_m(objs=deleted_persons)
                log.info(f'{sys._getframe().f_code.co_name}, Staff add {len(new_persons)}, update {nbr_updated}, delete {len(deleted_persons)}')
            else:
                log.info(f'{sys._getframe().f_code.co_name}, error retrieving staff from SDH, {sdh_staffs["data"]}')
        else:
            log.error(f'{sys._getframe().f_code.co_name}: api call to {sdh_staff_url} returned {res.status_code}')

        log.info(f"{sys._getframe().f_code.co_name}, STOP")
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')

######################### DATATABLE HELPERS ##############################
def format_data(db_list, total_count=None, filtered_count=None):
    out = []
    lists = dl.list.get_m()
    list_cache = {l.id: l for l in lists}
    for i in db_list:
        em = i.to_dict()
        em.update({"row_action": i.id, "DT_RowId": i.id, "deelschool": i.schoolcode, "jaar": i.jaar, "graad": i.graad, "lijst": list_cache[i.lijst_id].name if i.lijst_id in list_cache else "NVT"})
        out.append(em)
    return total_count, filtered_count, out

def post_sql_order(l, on, direction):
    l.sort(reverse=direction == "desc", key=lambda x: x[on])
    return l

def post_sql_filter(item_list, filters, count):
    for f in filters:
        if f['id'] in ['deelschool', "graad", "jaar", "klasgroep"]:
            if f['value'] != 'all':
                item_list = [i for i in item_list if i[f["id"]] == f["value"]]
    count = len(item_list)
    return count, item_list
