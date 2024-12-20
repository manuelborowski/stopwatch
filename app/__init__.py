import logging.handlers, os, sys
from flask import Flask, abort
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, current_user
from flask_jsglue import JSGlue
from flask_migrate import Migrate
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

version = "0.9"

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
from app.presentation.view import auth, api, user, settings
app.register_blueprint(auth.auth)
app.register_blueprint(api.api)
app.register_blueprint(user.user)
app.register_blueprint(settings.settings)


