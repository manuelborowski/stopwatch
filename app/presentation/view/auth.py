from flask import redirect, render_template, url_for, request, Blueprint
from flask_login import login_required, login_user, logout_user
from app import app, data as dl
import datetime, json, sys

#logging on file level
import logging
from app import MyLogFilter, top_log_handle
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

auth = Blueprint('auth', __name__, )

@auth.route('/', methods=["GET", 'POST'])
def login():
    try:
        message = None
        if request.method == "POST":
            user = dl.user.user_get (('username', "c=", request.form["username"])) # c= : case sensitive comparison
            if user is not None and user.verify_password(request.form["password"]):
                login_user(user)
                log.info(f'user {user.username} logged in')
                user = dl.user.user_update(user, {"last_login": datetime.datetime.now()})
                if not user:
                    log.error('Could not save timestamp')
                # Ok, continue
                return redirect(url_for('user.show'))
            else:
                log.error(f'{sys._getframe().f_code.co_name}: Invalid username/password')
                message = {"status": "error", "data": "Ongeldig(e) gebruikersnaam/wachtwoord"}
                return render_template('login.html', message=message)
        return render_template('login.html', message=message)
    except Exception as e:
        message = {"status": "error", "data": f"{str(e)}"}
        log.error(f'{sys._getframe().f_code.co_name}: {str(e)}')
        return render_template('login.html', message=message)

@auth.route('/logout')
@login_required
def logout():
    log.info(u'User logged out')
    logout_user()
    return redirect(url_for('auth.login'))


SMARTSCHOOL_ALLOWED_BASE_ROLES = [
    'Andere',
    'Leerkracht',
    'Directie'
]


@auth.route('/ss', methods=['POST', 'GET'])
def login_ss():
    if 'version' in request.args:
        profile = json.loads(request.args['profile'])

        if not 'username' in profile:  # not good
            log.error(f'Smartschool geeft een foutcode terug: {profile["error"]}')
            return redirect(url_for('auth.login'))

        if profile['basisrol'] in SMARTSCHOOL_ALLOWED_BASE_ROLES:
            # Students are NOT allowed to log in
            user = muser.get_first_user({'username': profile['username'], 'user_type': muser.User.USER_TYPE.OAUTH})
            profile['last_login'] = datetime.datetime.now()
            if user:
                profile['first_name'] = profile['name']
                profile['last_name'] = profile['surname']
                user.email = profile['email']
                user = muser.user_update(user, profile)
            else:
                user = muser.user_add(profile)
                # if msettings.get_configuration_setting('generic-new-via-smartschool'):
                #     profile['first_name'] = profile['name']
                #     profile['last_name'] = profile['surname']
                #     profile['user_type'] = muser.User.USER_TYPE.OAUTH
                #     profile['level'] = muser.User.LEVEL.USER
                #     user = muser.add_user(profile)
                # else:
                #     log.info('New users not allowed via smartschool')
                #     return redirect(url_for('auth.login'))
            login_user(user)
            log.info(u'OAUTH user {} logged in'.format(user.username))
            if not user:
                log.error('Could not save user')
                return redirect(url_for('auth.login'))
            # Ok, continue
            return redirect(url_for('student.show'))
    else:
        redirect_uri = f'{app.config["SMARTSCHOOL_OUATH_REDIRECT_URI"]}/ss'
        return redirect(f'{app.config["SMARTSCHOOL_OAUTH_SERVER"]}?app_uri={redirect_uri}')
