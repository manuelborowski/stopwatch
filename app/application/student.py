from app import data as dl
import sys, requests

#logging on file level
import logging
from app import MyLogFilter, top_log_handle, app

log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())


def student_get(data):
    try:
        filter = None
        if "id" in data:
            filter = ("id", "=", data['id'])
        if "rfid" in data:
            filter = ("rfid", "=", data['rfid'])
        if filter:
            student = dl.student.student_get(filter)
            if student:
                return {"data": student.to_dict()}
            else:
                return {"status": "error", "msg": f"Student not found, filter {filter}"}
        else:
            return {"status": "error", "msg": f"No valid data {data}"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {data}, {e}')
        return {"status": "error", "msg": {str(e)}}

######################### CRON HANDLERS ##################################

def student_cron_load_from_sdh(opaque=None, **kwargs):
    log.info(f"{sys._getframe().f_code.co_name}, START")
    updated_students = []
    nbr_updated = 0
    new_students = []
    deleted_students = []
    try:
        # check for new, updated or deleted students
        sdh_student_url = app.config["SDH_GET_STUDENT_URL"]
        sdh_key = app.config["SDH_GET_API_KEY"]
        res = requests.get(sdh_student_url, headers={'x-api-key': sdh_key})
        if res.status_code == 200:
            sdh_students = res.json()
            if sdh_students['status']:
                log.info(f'{sys._getframe().f_code.co_name}, retrieved {len(sdh_students["data"])} students from SDH')
                db_students = dl.student.student_get_m()
                db_leerlingnummer_to_student = {s.leerlingnummer: s for s in db_students}
                for sdh_student in sdh_students["data"]:
                    if sdh_student["leerlingnummer"] in db_leerlingnummer_to_student:
                        # check for changed rfid or classgroup
                        db_student = db_leerlingnummer_to_student[sdh_student["leerlingnummer"]]
                        update = {}
                        if db_student.rfid != sdh_student["rfid"]:
                            update["rfid"] = sdh_student["rfid"]
                        if db_student.klascode != sdh_student["klascode"]:
                            update["klascode"] = sdh_student["klascode"]
                            update["instellingsnummer"] = sdh_student["instellingsnummer"]
                        if db_student.username != sdh_student["username"]:
                            update["username"] = sdh_student["username"]
                        if update:
                            update.update({"item": db_student})
                            updated_students.append(update)
                            log.info(f'{sys._getframe().f_code.co_name}, Update student {db_student.leerlingnummer}, update {update}')
                            nbr_updated += 1
                        del(db_leerlingnummer_to_student[sdh_student["leerlingnummer"]])
                    else:
                        new_student = {"leerlingnummer": sdh_student["leerlingnummer"], "klascode": sdh_student["klascode"], "instellingsnummer": sdh_student["instellingsnummer"],
                                       "naam": sdh_student["naam"], "voornaam": sdh_student["voornaam"], "rfid": sdh_student["rfid"], "username": sdh_student["username"]}
                        new_students.append(new_student)
                        log.info(f'{sys._getframe().f_code.co_name}, New student {sdh_student["leerlingnummer"]}')
                deleted_students = [v for (k, v) in db_leerlingnummer_to_student.items()]
                for student in deleted_students:
                    log.info(f'{sys._getframe().f_code.co_name}, Delete student {student.leerlingnummer}')
                dl.student.student_add_m(new_students)
                dl.student.student_update_m(updated_students)
                dl.student.student_delete_m(students=deleted_students)
                log.info(f'{sys._getframe().f_code.co_name}, students add {len(new_students)}, update {nbr_updated}, delete {len(deleted_students)}')
            else:
                log.info(f'{sys._getframe().f_code.co_name}, error retrieving students from SDH, {sdh_students["data"]}')
        else:
            log.error(f'{sys._getframe().f_code.co_name}: api call to {sdh_student_url} returned {res.status_code}')
        log.info(f"{sys._getframe().f_code.co_name}, STOP")
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return 0, 0, 0
    return len(new_students), nbr_updated, len(deleted_students)


def student_cron_post_processing(opaque=None):
    try:
        log.info(f'{sys._getframe().f_code.co_name}: START')
        changed_new_student = dl.student.student_get_m([("changed", "!", "")])
        changed_new_student.extend(dl.student.student_get_m([("new", "=", True)]))
        for student in changed_new_student:
            student.new = False
            student.changed = ""
        dl.student.commit()
        log.info(f"new, changed {len(changed_new_student)} student")
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')


############ datatables: student overview list #########
def format_data(db_list, total_count=None, filtered_count=None):
    out = []
    for student in db_list:
        em = student.to_dict()
        em.update({
            'row_action': student.id,
            'DT_RowId': student.id
        })
        out.append(em)
    return total_count, filtered_count, out


