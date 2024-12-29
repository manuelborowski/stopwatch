from flask import Blueprint, render_template, request
from flask_login import login_required, current_user
from app.data.datatables import DatatableConfig
from app import data as dl, application as al
from app.presentation.view import datatable_get_data
import json

bp_incident = Blueprint('incident', __name__)

@bp_incident.route('/incidentoverview', methods=['GET'])
@login_required
def show():
    locations = dl.settings.get_configuration_setting("lis-locations")
    location_options = [{"label": v["label"], "value": k} for (k, v) in locations.items()]
    found, default_location = dl.settings.get_setting("default-location", current_user.username)
    if not found:
        default_location = location_options[0]["value"]
        dl.settings.add_setting("default-location", default_location, user=current_user.username)
    data = {"locations": {"options": location_options, "default": default_location}}
    return render_template("incident.html", table_config=table_configuration.create_table_config(), data=data)

@bp_incident.route('/incident', methods=['GET', "POST"])
@login_required
def incident():
    if request.method == "POST":
        data = json.loads(request.data)
        ret = al.incident.incident_add(data["data"])
        return json.dumps(ret)

# invoked when the client requests data from the database
al.socketio.subscribe_on_type("incident-datatable-data", lambda type, data: datatable_get_data(table_configuration, data))

@bp_incident.route('/incident/badge/lis', methods=['GET'])
@login_required
def lis_badge_get_id():
    code = request.args.get('code').lower()
    lis_rfids = dl.settings.get_configuration_setting("lis-badge-rfid")
    if code in lis_rfids:
        ret = {"data": lis_rfids[code]}
    else:
        ret = {"status": "warning", "msg": f"RFID code, {code.upper()} is niet gevonden in database"}
    return json.dumps(ret)

@bp_incident.route('/incident/options/student', methods=['GET'])
@login_required
def options_student():
    students = dl.student.student_get_m()
    student_options = sorted([{"label": f"{s.naam} {s.voornaam} {s.klasgroep}", "data": s.leerlingnummer} for s in students], key=lambda x: x["label"])
    ret = {"options": student_options}
    return json.dumps(ret)

@bp_incident.route('/incident/options/staff', methods=['GET'])
@login_required
def options_staff():
    staff = dl.staff.staff_get_m()
    staff_options = sorted([{"label": f"{s.naam} {s.voornaam}", "data": s.code} for s in staff], key=lambda x: x["label"])
    ret = {"options": staff_options}
    return json.dumps(ret)


@bp_incident.route('/incident/location/default', methods=['POST'])
@login_required
def location_set_default():
    data = json.loads(request.data)
    if "location" in data:
        dl.settings.set_setting("default-location", data["location"], user=current_user.username)
        ret = {"data": "ok"}
    else:
        ret = {"status": "warning", "msg": f"location parameter niet gevonden"}
    return json.dumps(ret)



class UserConfig(DatatableConfig):
    def pre_sql_query(self):
        return dl.incident.pre_sql_query()

    def pre_sql_filter(self, q, filters):
        return dl.incident.pre_sql_filter(q, filters)

    def pre_sql_search(self, search):
        return dl.incident.pre_sql_search(search)

    def format_data(self, l, total_count, filtered_count):
        return al.incident.format_data(l, total_count, filtered_count)

table_configuration = UserConfig("incident", "Incidenten")

