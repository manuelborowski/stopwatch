import logging.handlers, os, sys
from flask import Flask
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, current_user
from flask_jsglue import JSGlue
from flask_migrate import Migrate
from flask_apscheduler import APScheduler
from werkzeug.routing import IntegerConverter

#Warning: update flask_jsglue.py: from markupsafe import Markup

# 0.1 copy from tickoff V0.27
# 0.2: implemented lists
# 0.3: added page "deelnemers".  Contestants are loaded from SDH.
# 0.4: deelnemers page, add option to assign new RFID code
# 0.5: updated user-levels.  Clean up pages/menus and associated levels.
# 0.6: removed obsolete files
# 0.7: add spare badges
# 0.8: hand out or revoke spare badges
# 0.9: on application level, reverse the order of the data-sort.  Data filters, value must be a string.  Add no-list-option to lijst-filter
# 0.10: add checkin page.  Reworked columns visibility, seems to be buggy when loading data locally iso ajax.  Reworked datatables, filter and column visibility to handle local data
# 0.11: columns visibility, add page load, handle invisible columns only
# 0.12: check in is ok.
# 0.13: add result page and functionality
# 0.14: added test-rfid
# 0.15: result -> place is calculated dynamically in the browser and is not maintained in the database.  This allows priming a list (load the result page), adding new results and removing results.
# 0.16: stopwatch start/stop, use socketio to inform all clients
# 0.17: add support for Android Smartphone
# 0.18: small udpate
# 0.19: mobile, added socketio support
# 0.20: add cache for type-select
# 0.21: add pdfkit to export results to PDF
# 0.22: reworked export-to-pdf. Added button to start export
# 0.23: small bugfix
# 0.24: mobile, when scanning results, show the passed time iso the current time
# 0.25: mobile scan, add option to enter with pin
# 0.25: mobile scan, remove pin from login screen.  Update test-scan
# 0.26: added multiple pin users, else socketio does not work properly
# 0.27: spare badges, scroll to top when adding one
# 0.28: updated and bugfixed export to pdf

version = "0.28"

app = Flask(__name__, instance_relative_config=True, template_folder='presentation/template/')

#  enable logging
top_log_handle = "STOPWATCH"
log = logging.getLogger(f"{top_log_handle}.{__name__}")
# support custom filtering while logging
class MyLogFilter(logging.Filter):
    def filter(self, record):
        record.username = current_user.username if current_user and current_user.is_active else 'NONE'
        return True
log.addFilter(MyLogFilter())
LOG_FILENAME = os.path.join(sys.path[0], f'log/stopwatch.txt')
log_level = getattr(logging, 'INFO')
log.setLevel(log_level)
log_handler = logging.handlers.RotatingFileHandler(LOG_FILENAME, maxBytes=1024 * 1024, backupCount=20, encoding="utf-8")
log_formatter = logging.Formatter(u'%(asctime)s - %(levelname)s - %(username)s - %(message)s')
log_handler.setFormatter(log_formatter)
log.addHandler(log_handler)

log.info("START Stopwatch")

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

def default_db_entries():
    with app.app_context():
        try:
            from app.data.user import User
            from app import data as dl
            # create default accounts, if not present
            for user in app.config["DEFAULT_USERS"]:
                find_user = User.query.filter(User.username == user[0]).first()
                if not find_user:
                    new_user = User(username=user[0], password=user[1], level=user[2], first_name=user[3], user_type=User.USER_TYPE.LOCAL)
                    db.session.add(new_user)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            log.error(f'{sys._getframe().f_code.co_name}: {e}')

default_db_entries()

SCHEDULER_API_ENABLED = True
ap_scheduler = APScheduler()
ap_scheduler.init_app(app)
ap_scheduler.start()

# Should be last to avoid circular import
from app.presentation.view import auth, api, user, settings, list, person, spare, checkin, result, mobile
app.register_blueprint(auth.bp_auth)
app.register_blueprint(api.bp_api)
app.register_blueprint(user.bp_user)
app.register_blueprint(settings.bp_settings)
app.register_blueprint(list.bp_list)
app.register_blueprint(person.bp_person)
app.register_blueprint(spare.bp_spare)
app.register_blueprint(checkin.bp_checkin)
app.register_blueprint(result.bp_result)
app.register_blueprint(mobile.bp_mobile)
