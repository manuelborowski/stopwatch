import sys
import app.data.models
from app import db
from sqlalchemy_serializer import SerializerMixin


class Tickoff(db.Model, SerializerMixin):
    __tablename__ = 'tickoffs'

    date_format = '%Y/%m/%d'
    datetime_format = '%Y/%m/%d %H:%M'

    id = db.Column(db.Integer(), primary_key=True)
    type = db.Column(db.String(256), default='')
    category = db.Column(db.String(256), default='')
    label = db.Column(db.String(256), default='')
    timestamp = db.Column(db.DateTime(), default=None)
    roepnaam = db.Column(db.String(256), default='')
    voornaam = db.Column(db.String(256), default='')
    naam = db.Column(db.String(256), default='')
    klas = db.Column(db.String(256), default='')
    klasgroep = db.Column(db.String(256), default='')
    rfid = db.Column(db.String(256))
    field1 = db.Column(db.String(256), default='')
    field2 = db.Column(db.String(256), default='')
    field3 = db.Column(db.String(256), default='')

def commit():
    return app.data.models.commit()


def add(data={}, commit=True):
    return app.data.models.add_single(Tickoff, data, commit, timestamp=True)


def add_m(data=[]):
    return app.data.models.add_multiple(Tickoff, data, timestamp=True)


def update(obj, data={}, commit=True):
    return app.data.models.update_single(Tickoff, obj, data, commit, timestamp=True)


def update_m(data=[]):
    return app.data.models.update_multiple(Tickoff, data, timestamp=True)


def delete_m(ids=[], objs=[]):
    return app.data.models.delete_multiple(Tickoff, ids, objs)


def get_m(filters=[], fields=[], order_by=None, first=False, count=False, active=True):
    return app.data.models.get_multiple(Tickoff, filters=filters, fields=fields, order_by=order_by, first=first, count=count, active=active)


def get(filters=[]):
    return app.data.models.get_first_single(Tickoff, filters)

############ obj overview list #########
def pre_sql_query():
    return db.session.query(Tickoff)

def pre_sql_filter(query, filter):
    for f in filter:
        if f['id'] == 'filter-type':
            query = query.filter(Tickoff.type == f['value'])
        if f['id'] == 'filter-category':
            query = query.filter(Tickoff.category == f['value'])
        if f['id'] == 'filter-tickoff':
            query = query.filter(Tickoff.label == f['value'])
    return query

def pre_sql_search(search_string):
    search_constraints = []
    search_constraints.append(Tickoff.naam.like(search_string))
    search_constraints.append(Tickoff.roepnaam.like(search_string))
    search_constraints.append(Tickoff.voornaam.like(search_string))
    search_constraints.append(Tickoff.klas.like(search_string))
    search_constraints.append(Tickoff.klasgroep.like(search_string))
    search_constraints.append(Tickoff.field1.like(search_string))
    search_constraints.append(Tickoff.field2.like(search_string))
    search_constraints.append(Tickoff.field3.like(search_string))
    return search_constraints
