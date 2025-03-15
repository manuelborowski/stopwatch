from app import data as dl, application as al
import sys, requests
from thefuzz import process

#logging on file level
import logging
from app import MyLogFilter, top_log_handle, app
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())


def get(data):
    try:
        persons = al.models.get(dl.person.Student, data)
        return {"status": "ok", "data": persons}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {data}, {e}')
        return {"status": "error", "msg": {str(e)}}

# data is the number of found items to return and a list of fields with values
# {"number": 5,
#  "fields": "naam=pieters,voornaam=johan,..." }
def fuzzy(data):
    try:
        persons = dl.person.get_m()
        fields = [f.split("=")[0] for f in data["fields"].split(",")]
        search_for = "".join([f.split("=")[1] for f in data["fields"].split(",")]).replace(" ", "").lower()
        fuzzy_students = {"".join([getattr(s, f) for f in fields]).replace(" ", "").lower(): s for s in persons}
        students_found = process.extract(search_for, list(fuzzy_students.keys()), limit=int(data["number"]) if "number" in data else 5)
        students_out = []
        for s in students_found:
            person = fuzzy_students[s[0]].to_dict()
            person["fuzzy_score"] = s[1]
            students_out.append(person)
        return students_out
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {data}, {e}')
        return {"status": "error", "msg": {str(e)}}



######################### CRON HANDLERS ##################################

def person_cron_load_from_sdh(opaque=None, **kwargs):
    log.info(f"{sys._getframe().f_code.co_name}, START")
    try:
        updated_persons = []
        nbr_updated = 0
        new_persons = []
        sdh_key = app.config["SDH_API_KEY"]
        # check for new, updated or deleted students
        sdh_student_url = app.config["SDH_GET_STUDENT_URL"]
        res = requests.get(sdh_student_url, headers={'x-api-key': sdh_key})
        if res.status_code == 200:
            sdh_students = res.json()
            if sdh_students['status']:
                log.info(f'{sys._getframe().f_code.co_name}, retrieved {len(sdh_students["data"])} students from SDH')
                db_persons = dl.person.get_m(("klas", "!", "NVT"))
                db_informatnummer_to_student = {s.informatnummer: s for s in db_persons}
                for sdh_student in sdh_students["data"]:
                    if sdh_student["leerlingnummer"] in db_informatnummer_to_student:
                        # check for changed rfid or classgroup
                        db_student = db_informatnummer_to_student[sdh_student["leerlingnummer"]]
                        update = {}
                        klascode = sdh_student["klascode"]
                        klas = klascode if klascode == "OKAN" or int(klascode[0]) > 1 and sdh_student["instellingsnummer"] == "30569" or len(klascode) == 2 else klascode[:2]
                        if db_student.rfid != sdh_student["rfid"]:
                            update["rfid"] = sdh_student["rfid"]
                        if db_student.klas != klas:
                            update["klas"] = klas
                        if update:
                            update.update({"item": db_student})
                            updated_persons.append(update)
                            log.info(f'{sys._getframe().f_code.co_name}, Update student {db_student.informatnummer}, update {update}')
                            nbr_updated += 1
                        del(db_informatnummer_to_student[sdh_student["leerlingnummer"]])
                    else:
                        klascode = sdh_student["klascode"]
                        klas = klascode if klascode == "OKAN" or int(klascode[0]) > 1 and sdh_student["instellingsnummer"] == "030569" or len(klascode) == 2 else klascode[:2]
                        new_student = {"informatnummer": sdh_student["leerlingnummer"], "klas": klas,
                                       "naam": sdh_student["naam"], "voornaam": sdh_student["voornaam"], "rfid": sdh_student["rfid"], "username": sdh_student["username"]}
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
                db_persons = dl.person.get_m(("klas", "=", "NVT"))
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
                        del(db_informatnummer_to_staff[sdh_staff["informat_id"]])
                    else:
                        new_staff = {"informatnummer": sdh_staff["informat_id"], "klas": "NVT",
                                       "naam": sdh_staff["naam"], "voornaam": sdh_staff["voornaam"], "rfid": sdh_staff["rfid"], "username": sdh_staff["code"]}
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

############ datatables: person overview list #########
def format_data(db_list, total_count=None, filtered_count=None):
    out = []
    for person in db_list:
        em = person.to_dict()
        em.update({
            'row_action': person.id,
            'DT_RowId': person.id
        })
        out.append(em)
    return total_count, filtered_count, out


