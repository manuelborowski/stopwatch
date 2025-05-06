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

# 0.1 copy from laptop-incident-systeem v0.84
# 0.2: removed files not needed.  Get staff and students from SDH
# 0.3: small bugfixes.  Reworked settings page to remove formio.
# 0.4: removed old settings code and replaced with new (without formio)
# 0.5: removed formio from users page
# 0.6: added category-functionality.  Upload category-data from xlsx
# 0.7: updated settings
# 0.8: updated user
# 0.9: table columns can change depending on a condition (type). Category, added filters.  Filters, added dynamic attribute, i.e. options can change depening on a condition.
# 0.10: upload excel file is ok.
# 0.11: add context menu to update rfid or person.  Added in-table-edit of fields
# 0.12: renamed some topics.  Add or delete persons
# 0.13: reworked menu in base.js, it is possible to specify additional arguments for a menu item.  Value can be stored in localStorage
# 0.14: updated loghandler so that it can handle utf-8.  When uploading a file, the type is set to the filter-value.  Reworked filter-menu to include filters that depend on other filters.
# 0.15: added tickoff (session) tree.  Updated filter-menu, added "invalidate" and "skip" attributes
# 0.16: major rework in filters.  A filter's option can depend on another filter's value.
# 0.18: models, update_single, make it possible to add datetime as string in quasi iso format.  Added functionality to add a registration, delete a session
# 0.19: extended api to receive registrations from external source.
# 0.20: add rfidusb.  Update rfid by making a reservation and then scan the badge.
# 0.21: update logo
# 0.22: after login, go to session page
# 0.23: sync client to server
# 0.24: bugfix sync-to-server
# 0.25: update logo
# 0.26: rfidusb, added timeout else it takes too long before notification.  tickoff-page, added rfid-status-change.
# 0.27: remove registrations

version = "0.27"

app = Flask(__name__, instance_relative_config=True, template_folder='presentation/template/')

#  enable logging
top_log_handle = "TICKOFF"
log = logging.getLogger(f"{top_log_handle}.{__name__}")
# support custom filtering while logging
class MyLogFilter(logging.Filter):
    def filter(self, record):
        record.username = current_user.username if current_user and current_user.is_active else 'NONE'
        return True
log.addFilter(MyLogFilter())
LOG_FILENAME = os.path.join(sys.path[0], f'log/tickoff.txt')
log_level = getattr(logging, 'INFO')
log.setLevel(log_level)
log_handler = logging.handlers.RotatingFileHandler(LOG_FILENAME, maxBytes=1024 * 1024, backupCount=20, encoding="utf-8")
log_formatter = logging.Formatter(u'%(asctime)s - %(levelname)s - %(username)s - %(message)s')
log_handler.setFormatter(log_formatter)
log.addHandler(log_handler)

log.info("START Tickoff")

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
            # create admin account if not present
            find_admin = User.query.filter(User.username == 'admin').first()
            if not find_admin:
                admin = User(username='admin', password='admin', level=5, user_type=User.USER_TYPE.LOCAL)
                db.session.add(admin)
                db.session.commit()

        except Exception as e:
            db.session.rollback()
            log.error(f'{sys._getframe().f_code.co_name}: {e}')

default_db_entries()

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
from app.presentation.view import auth, api, user, settings, category, person, tickoff
app.register_blueprint(auth.bp_auth)
app.register_blueprint(api.bp_api)
app.register_blueprint(user.bp_user)
app.register_blueprint(settings.bp_settings)
app.register_blueprint(category.bp_category)
app.register_blueprint(person.bp_person)
app.register_blueprint(tickoff.bp_tickoff)
