import sys, json
import app.data.models
from app import log, db
from sqlalchemy_serializer import SerializerMixin


class Person(db.Model, SerializerMixin):
    __tablename__ = 'persons'

    date_format = '%Y/%m/%d'
    datetime_format = '%Y/%m/%d %H:%M'

    id = db.Column(db.Integer(), primary_key=True)
    voornaam = db.Column(db.String(256), default='')
    naam = db.Column(db.String(256), default='')
    rfid = db.Column(db.String(256))
    klas = db.Column(db.String(256), default='')
    informatnummer = db.Column(db.String(256), default='')
    username = db.Column(db.String(256), default='')

def commit():
    return app.data.models.commit()


def add(data={}, commit=True):
    return app.data.models.add_single(Person, data, commit, timestamp=True)


def add_m(data=[]):
    return app.data.models.add_multiple(Person, data, timestamp=True)


def update(obj, data={}, commit=True):
    return app.data.models.update_single(Person, obj, data, commit, timestamp=True)


def update_m(data=[]):
    return app.data.models.update_multiple(Person, data, timestamp=True)


def delete_m(ids=[], objs=[]):
    return app.data.models.delete_multiple(Person, ids, objs)


def get_m(filters=[], fields=[], order_by=None, first=False, count=False, active=True):
    return app.data.models.get_multiple(Person, filters=filters, fields=fields, order_by=order_by, first=first, count=count, active=active)


def get(filters=[]):
    return app.data.models.get_first_single(Person, filters)

############ obj overview list #########
def pre_sql_query():
    return db.session.query(Person).filter(Person.active == True)


def pre_sql_filter(query, filter):
    return query


def pre_sql_search(search_string):
    search_constraints = []
    return search_constraints
