from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from flask_login import current_user
from app import db, log
from sqlalchemy_serializer import SerializerMixin
from app import data as dl

class User(UserMixin, db.Model, SerializerMixin):
    __tablename__ = 'users'

    date_format = '%d/%m/%Y'
    datetime_format = '%d/%m/%Y %H:%M'
    serialize_rules = ("-password_hash",)

    class USER_TYPE:
        LOCAL = 'local'
        OAUTH = 'oauth'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(256))
    username = db.Column(db.String(256))
    first_name = db.Column(db.String(256))
    last_name = db.Column(db.String(256))
    password_hash = db.Column(db.String(256))
    level = db.Column(db.Integer)
    user_type = db.Column(db.String(256))
    last_login = db.Column(db.DateTime())

    @property
    def is_local(self):
        return self.user_type == User.USER_TYPE.LOCAL

    @property
    def is_oauth(self):
        return self.user_type == User.USER_TYPE.OAUTH

    @property
    def is_at_least_user(self):
        return self.level >= 1

    @property
    def is_strict_user(self):
        return self.level == 1

    @property
    def is_at_least_supervisor(self):
        return self.level >= 3

    @property
    def is_at_least_admin(self):
        return self.level >= 5

    @property
    def password(self):
        raise AttributeError('Paswoord kan je niet lezen.')

    @password.setter
    def password(self, password):
        if password:
            self.password_hash = generate_password_hash(password)

    def verify_password(self, password):
        if self.password_hash:
            return check_password_hash(self.password_hash, password)
        else:
            return False

    def __repr__(self):
        return '<User: {}>'.format(self.username)

    def log(self):
        return '<User: {}/{}>'.format(self.id, self.username)


def user_add(data = {}):
    if 'password' in data:
        data['password_hash'] = generate_password_hash(data['password'])
    return dl.models.add_single(User, data)


def user_update(user, data={}):
    if 'password' in data:
        data['password_hash'] = generate_password_hash(data['password'])
    return dl.models.update_single(User, user, data)


def user_get_m(filters=[], fields=[], order_by=None, first=False, count=False, active=True):
    return dl.models.get_multiple(User, filters=filters, fields=fields, order_by=order_by, first=first, count=count, active=active)


def user_get(filters=[]):
    return dl.models.get_first_single(User, filters)


def user_delete(ids=None):
    return dl.models.delete_multiple(User, ids=ids)


############ user overview list #########
def filter(query_in):
    #If the logged in user is NOT administrator, display the data of the current user only
    if not current_user.is_at_least_admin:
        return query_in.filter(User.id==current_user.id)
    return query_in


# Set up user_loader
# @login_manager.user_loader
def load_user(user_id):
    user = User.query.get(int(user_id))
    return user


def pre_sql_query():
    return db.session.query(User)


def pre_sql_filter(query, filters):
    for f in filters:
        if f['id'] == 'user-type':
            if f['value'] != 'all':
                query = query.filter(User.user_type == f['value'])
        if f['id'] == 'user-level':
            if f['value'] != 'all':
                query = query.filter(User.level == f['value'])
    return query


def pre_sql_search(search_string):
    search_constraints = []
    search_constraints.append(User.username.like(search_string))
    search_constraints.append(User.first_name.like(search_string))
    search_constraints.append(User.last_name.like(search_string))
    search_constraints.append(User.email.like(search_string))
    return search_constraints




