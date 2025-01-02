from flask import Blueprint, render_template, request
from flask_login import login_required, current_user
from app.data.datatables import DatatableConfig
from app import data as dl, application as al
from app.presentation.view import datatable_get_data, fetch_return_error
import json, sys, pathlib

#logging on file level
import logging
from app import MyLogFilter, top_log_handle, app
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

bp_incident = Blueprint('incident', __name__)

@bp_incident.route('/incidentshow', methods=['GET'])
@login_required
def show():
    locations = dl.settings.get_configuration_setting("lis-locations")
    location_options = [{"label": v["label"], "value": k} for (k, v) in locations.items()]
    found, default_location = dl.settings.get_setting("default-location", current_user.username)
    if not found:
        default_location = location_options[0]["value"]
        dl.settings.add_setting("default-location", default_location, user=current_user.username)
    data = {"locations": {"options": location_options, "default": default_location}}
    return render_template("incident.html", table_config=config.create_table_config(), data=data)

# invoked when the client requests data from the database
al.socketio.subscribe_on_type("incident-datatable-data", lambda type, data: datatable_get_data(config, data))

@bp_incident.route('/incident', methods=['POST'])
@login_required
def incident():
    if request.method == "POST":
        data = json.loads(request.data)
        ret = al.incident.add(data)
        return json.dumps(ret)


@bp_incident.route('/incident/badge/lis', methods=['GET'])
@login_required
def lis_badge():
    ret = al.lisbadge.get(request.args)
    return json.dumps(ret)

@bp_incident.route('/incident/student/', methods=['GET'])
@login_required
def student():
    ret = al.student.get(request.args)
    return json.dumps(ret)

@bp_incident.route('/incident/student/option', methods=['GET'])
@login_required
def student_options():
    students = dl.student.get_m()
    student_options = sorted([{"label": f"{s.naam} {s.voornaam} {s.klasgroep}", "data": s.leerlingnummer} for s in students], key=lambda x: x["label"])
    ret = {"options": student_options}
    return json.dumps(ret)

@bp_incident.route('/incident/staff/', methods=['GET'])
@login_required
def staff():
    ret = al.staff.get(request.args)
    return json.dumps(ret)

@bp_incident.route('/incident/staff/option', methods=['GET'])
@login_required
def staff_options():
    staff = dl.staff.get_m()
    staff_options = sorted([{"label": f"{s.naam} {s.voornaam}", "data": s.code} for s in staff], key=lambda x: x["label"])
    ret = {"options": staff_options}
    return json.dumps(ret)

@bp_incident.route('/incident/location/default', methods=['POST'])
@login_required
def location_default():
    data = json.loads(request.data)
    if "location" in data:
        dl.settings.set_setting("default-location", data["location"], user=current_user.username)
        ret = {"data": "ok"}
    else:
        ret = {"status": "warning", "msg": f"location parameter niet gevonden"}
    return json.dumps(ret)

@bp_incident.route('/incident/form', methods=['GET'])
@login_required
def form():
    try:
        if request.method == "GET":
            locations = dl.settings.get_configuration_setting("lis-locations")
            location_options = [{"label": v["label"], "value": k} for (k, v) in locations.items()]
            _, location_default = dl.settings.get_setting("default-location", current_user.username)
            states = dl.settings.get_configuration_setting("lis-state")
            states_options = [{"label": v["label"], "value": k} for (k, v) in states.items()]
            states_default = "preparation"
            optional = {"url": app.config["ENTRA_API_URL"], "key": app.config["ENTRA_API_KEY"]}
            defaults = [
                {"id": "location-field", "type": "select",  "options": location_options, "default": location_default},
                {"id": "state-field", "type": "select",  "options": states_options, "default": states_default},
            ]
            template = open(pathlib.Path("app/presentation/template/lib/incident_form.html")).read()
            return {"template": template, "defaults": defaults, "data": optional}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: Exception, {e}')
        return fetch_return_error(f'Exception, {e}')


class Config(DatatableConfig):
    def pre_sql_query(self):
        return dl.incident.pre_sql_query()

    def pre_sql_filter(self, q, filters):
        return dl.incident.pre_sql_filter(q, filters)

    def pre_sql_search(self, search):
        return dl.incident.pre_sql_search(search)

config = Config("incident", "Incidenten")

