import logging.handlers, os, sys
from flask import Flask, abort
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, current_user
from flask_jsglue import JSGlue
from flask_migrate import Migrate
from flask_apscheduler import APScheduler
from werkzeug.routing import IntegerConverter
from functools import wraps

#Warning: update flask_jsglue.py: from markupsafe import Markup

# 0.1 first backup, user-view is ok
# 0.2: messages have status [ok, warning, error].  Reworked user add/update/delete
# 0.3: clean up.  Datatables to 2.1.8.  Replaced most document.ready in js to fix the order of invocation.  Updated cell_edit
# 0.4: minor updates
# 0.5: reworked column visibility
# 0.6: columns visibility, in rowCallback(), cells refer to the columns that are visible, so a mapping from real to visible colums must be made.
# 0.7: fixed issue with column-visibility and local-store of datatable settings.
# 0.8: ellipsis and variable column width
# 0.9: cleanup.  fixed cell- and row-backgroundcolor
# 0.10: bugfixed cell_edit.  Introduced incident.
# 0.11: moved filter and column menu into navbar
# 0.12: added students-table and sync from SDH.  When client fetches, return inband message.  Added cron.  Formio-templates/defaults are fetched iso hard-inserted in HTML.
# Updated incidents.  Placed filters and column-visibility into navbar.  Added buttons in navbar.
# 0.13: added fetch to entra to get laptopinfo.  Incident, added code to get the laptops of a selected student.
# 0.14: added tables for staff and spares.  Added popups to add a single spare or a list.
# 0.15: added lis-badge.  Various large updates
# 0.16: small bugfix in incident.  Updated CSS
# 0.17: added history.  Added helper functions for forms.  Added datatable cell renderer for labels.  Incident form reused for incident update/state change.
# Added event buttons/select to table.  Added template-post-processing to e.g. replace a value with a label.
# 0.18: added history overview page.  Bugfix select2, make sure it is done initializing before changing its value.
# 0.19: on incident overview page, added a context-menu and popup to display history
# 0.20: reworked fetch-get to use the api filters/fields.  Put the endpoints in the correct files. Use try/except and logging as much as possible to propagate errors.
# Data/defaults/configuration/... is fetched from the server when required.
# 0.21: log in via smartschool
# 0.22: send email when location changed.  Add arguments to incident.show url.
# 0.23: pywin only on windows
# 0.24: added smartschool-send-message
# 0.25: updated smartschool.  Added incident-update form
# 0.26: generate incidents for test purposes
# 0.27: small bugfix
# 0.28: incident-generate, avoid endless loop in case no default-location
# 0.29: replaced, in table, select with button.  Select is now in update-form.  Unified labels/options/defaults.  State-change-buttons, moved from server to client
# 0.30: added filter to hide closed incidents

version = "0.30"

app = Flask(__name__, instance_relative_config=True, template_folder='presentation/template/')

#  enable logging
top_log_handle = "LIS"
log = logging.getLogger(f"{top_log_handle}.{__name__}")
# support custom filtering while logging
class MyLogFilter(logging.Filter):
    def filter(self, record):
        record.username = current_user.username if current_user and current_user.is_active else 'NONE'
        return True
LOG_FILENAME = os.path.join(sys.path[0], f'log/lis.txt')
log_level = getattr(logging, 'INFO')
log.setLevel(log_level)
log_handler = logging.handlers.RotatingFileHandler(LOG_FILENAME, maxBytes=1024 * 1024, backupCount=20)
log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(name)s - %(message)s')
log_handler.setFormatter(log_formatter)
log.addHandler(log_handler)

log.info("START Laptop Incident Systeem")

from app.config import app_config
config_name = os.getenv('FLASK_CONFIG')
config_name = config_name if config_name else 'production'
app.config.from_object(app_config[config_name])
app.config.from_pyfile('config.py')

jsglue = JSGlue(app)
db = SQLAlchemy()
login_manager = LoginManager()
db.app = app  #  hack:-(
db.init_app(app)
migrate = Migrate(app, db)

app.url_map.converters['int'] = IntegerConverter
login_manager.init_app(app)
login_manager.login_message = 'Je moet aangemeld zijn om deze pagina te zien!'
login_manager.login_view = 'auth.login'

socketio = SocketIO(app, async_mode=app.config['SOCKETIO_ASYNC_MODE'], cors_allowed_origins="*")


def create_admin():
    with app.app_context():
        try:
            from app.data.user import User
            find_admin = User.query.filter(User.username == 'admin').first()
            if not find_admin:
                admin = User(username='admin', password='admin', level=5, user_type=User.USER_TYPE.LOCAL)
                db.session.add(admin)
                db.session.commit()
        except Exception as e:
            db.session.rollback()
            log.error(f'{sys._getframe().f_code.co_name}: {e}')

create_admin()

SCHEDULER_API_ENABLED = True
ap_scheduler = APScheduler()
ap_scheduler.init_app(app)
ap_scheduler.start()

# decorator to grant access to admins only
def admin_required(func):
    @wraps(func)
    def decorated_view(*args, **kwargs):
        if not current_user.is_at_least_admin:
            abort(403)
        return func(*args, **kwargs)
    return decorated_view


# decorator to grant access to at least supervisors
def supervisor_required(func):
    @wraps(func)
    def decorated_view(*args, **kwargs):
        if not current_user.is_at_least_supervisor:
            abort(403)
        return func(*args, **kwargs)
    return decorated_view


# Should be last to avoid circular import
from app.presentation.view import auth, api, user, settings, incident, spare, lisbadge, history, student, staff
app.register_blueprint(auth.bp_auth)
app.register_blueprint(api.bp_api)
app.register_blueprint(user.bp_user)
app.register_blueprint(settings.bp_settings)
app.register_blueprint(incident.bp_incident)
app.register_blueprint(spare.bp_spare)
app.register_blueprint(lisbadge.bp_lisbadge)
app.register_blueprint(history.bp_history)
app.register_blueprint(student.bp_student)
app.register_blueprint(staff.bp_staff)
