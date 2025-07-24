import sys
import app.data.models
from app import db
from sqlalchemy_serializer import SerializerMixin


class Spare(db.Model, SerializerMixin):
    __tablename__ = 'spares'

    date_format = '%Y/%m/%d'
    datetime_format = '%Y/%m/%d %H:%M'

    id = db.Column(db.Integer(), primary_key=True)
    person_id = db.Column(db.Integer(), default=None)
    label = db.Column(db.String(256), default='')
    rfid = db.Column(db.String(256), default='')

def commit():
    return app.data.models.commit()


def add(data={}, commit=True):
    return app.data.models.add_single(Spare, data, commit)


def add_m(data=[]):
    return app.data.models.add_multiple(Spare, data)


def update(obj, data={}, commit=True):
    return app.data.models.update_single(Spare, obj, data, commit)


def update_m(data=[]):
    return app.data.models.update_multiple(Spare, data)


def delete_m(ids=[], objs=[]):
    return app.data.models.delete_multiple(Spare, ids, objs)


def get_m(filters=[], fields=[], order_by=None, first=False, count=False, active=True):
    return app.data.models.get_multiple(Spare, filters=filters, fields=fields, order_by=order_by, first=first, count=count, active=active)


def get(filters=[]):
    return app.data.models.get_first_single(Spare, filters)

############ obj overview list #########
def pre_sql_query():
    return db.session.query(Spare)

def pre_sql_filter(query, filter):
    return query

def pre_sql_search(search_string):
    search_constraints = []
    return search_constraints
