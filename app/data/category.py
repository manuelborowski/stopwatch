import sys
import app.data.models
from app import db, data as dl
from sqlalchemy_serializer import SerializerMixin


class Category(db.Model, SerializerMixin):
    __tablename__ = 'categories'

    date_format = '%Y/%m/%d'
    datetime_format = '%Y/%m/%d %H:%M'

    id = db.Column(db.Integer(), primary_key=True)
    type = db.Column(db.String(256), default='')
    label = db.Column(db.String(256), default='')
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
    return app.data.models.add_single(Category, data, commit, timestamp=True)


def add_m(data=[]):
    return app.data.models.add_multiple(Category, data, timestamp=True)


def update(obj, data={}, commit=True):
    return app.data.models.update_single(Category, obj, data, commit, timestamp=True)


def update_m(data=[]):
    return app.data.models.update_multiple(Category, data, timestamp=True)


def delete_m(ids=[], objs=[]):
    return app.data.models.delete_multiple(Category, ids, objs)


def get_m(filters=[], fields=[], order_by=None, first=False, count=False, active=True):
    return app.data.models.get_multiple(Category, filters=filters, fields=fields, order_by=order_by, first=first, count=count, active=active)


def get(filters=[]):
    return app.data.models.get_first_single(Category, filters)

############ obj overview list #########
def pre_sql_query():
    return db.session.query(Category)

def pre_sql_filter(query, filter):
    for f in filter:
        if f['id'] == 'filter-type':
            query = query.filter(Category.type == f['value'])
        if f['id'] == 'filter-label':
            query = query.filter(Category.label == f['value'])
    return query

def pre_sql_search(search_string):
    search_constraints = []
    return search_constraints
