from flask import redirect, render_template, url_for, request, Blueprint, session
from flask_login import login_required, login_user, logout_user
from app import app, data as dl
import datetime, json, sys, hashlib

#logging on file level
import logging
from app import MyLogFilter, top_log_handle
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

bp_auth = Blueprint('auth', __name__, )

@bp_auth.route('/', methods=["GET", 'POST'])
def login():
    try:
        # local server, auto login
        if "AUTO_LOGIN" in app.config and app.config["AUTO_LOGIN"]:
            if "AUTO_USER" in app.config:
                user = dl.user.get(('username', "=", app.config["AUTO_USER"]))
                login_user(user)
                log.info(u'user {} logged in'.format(user.username))
                user = dl.user.update(user, {"last_login": datetime.datetime.now()})
                if not user:
                    log.error('Could not save timestamp')
                return redirect(url_for('person.show'))
        message = None
        if request.method == "POST":
            user = dl.user.get (('username', "c=", request.form["username"])) # c= : case sensitive comparison
            if user is not None and user.verify_password(request.form["password"]):
                login_user(user)
                log.info(f'user {user.username} logged in')
                user = dl.user.update(user, {"last_login": datetime.datetime.now()})
                session["token-login"] = False
                if not user:
                    log.error('Could not save timestamp')
                # Ok, continue
                return redirect(url_for('person.show'))
            else:
                log.error(f'{sys._getframe().f_code.co_name}: Invalid username/password')
                message = {"status": "error", "data": "Ongeldig(e) gebruikersnaam/wachtwoord"}
                return render_template('login.html', message=message)
        return render_template('login.html', message=message)
    except Exception as e:
        message = {"status": "error", "data": f"{str(e)}"}
        log.error(f'{sys._getframe().f_code.co_name}: {str(e)}')
        return render_template('login.html', message=message)

@bp_auth.route('/logout')
@login_required
def logout():
    log.info(u'User logged out')
    logout_user()
    if "token-login" in session and session["token-login"]:
        return redirect(url_for('auth.login_t'))
    return redirect(url_for('auth.login'))

SMARTSCHOOL_ALLOWED_BASE_ROLES = [
    'Andere',
    'Leerkracht',
    'Directie'
]

@bp_auth.route('/ss', methods=['POST', 'GET'])
def login_ss():
    try:
        if 'version' in request.args:
            profile = json.loads(request.args['profile'])

            if not 'username' in profile:  # not good
                log.error(f'Smartschool geeft een foutcode terug: {profile["error"]}')
                return redirect(url_for('auth.login'))

            if profile['basisrol'] in SMARTSCHOOL_ALLOWED_BASE_ROLES:
                # Students are NOT allowed to log in
                user = dl.user.get([('username', "c=" ,profile['username']), ('user_type', "=", dl.user.User.USER_TYPE.OAUTH)])
                profile['last_login'] = datetime.datetime.now()
                if user:
                    profile['first_name'] = profile['name']
                    profile['last_name'] = profile['surname']
                    user.email = profile['email']
                    user = dl.user.update(user, profile)
                else:
                    if dl.settings.get_configuration_setting('generic-new-via-smartschool'):
                        default_level = dl.settings.get_configuration_setting('generic-new-via-smartschool-default-level')
                        profile['first_name'] = profile['name']
                        profile['last_name'] = profile['surname']
                        profile['user_type'] = dl.user.User.USER_TYPE.OAUTH
                        profile['level'] = default_level
                        user = dl.user.add(profile)
                    else:
                        log.info('New users not allowed via smartschool')
                        return redirect(url_for('auth.login'))
                login_user(user)
                log.info(f'OAUTH user {user.username} logged in')
                if not user:
                    log.error('Could not save user')
                    return redirect(url_for('auth.login'))
                # Ok, continue
                return redirect(url_for('person.show'))
        else:
            redirect_uri = f'{app.config["SMARTSCHOOL_OUATH_REDIRECT_URI"]}/ss'
            return redirect(f'{app.config["SMARTSCHOOL_OAUTH_SERVER"]}?app_uri={redirect_uri}')
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {str(e)}')
