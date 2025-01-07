import sys, json
import app.data.models
from app import log, db
from sqlalchemy_serializer import SerializerMixin


class Student(db.Model, SerializerMixin):
    __tablename__ = 'students'

    date_format = '%Y/%m/%d'
    datetime_format = '%Y/%m/%d %H:%M'

    id = db.Column(db.Integer(), primary_key=True)
    voornaam = db.Column(db.String(256), default='')
    naam = db.Column(db.String(256), default='')
    rfid = db.Column(db.String(256))
    klasgroepcode = db.Column(db.String(256), default='')
    leerlingnummer = db.Column(db.String(256), default='')
    username = db.Column(db.String(256), default='')
    timestamp = db.Column(db.DateTime)

    new = db.Column(db.Boolean, default=True)
    delete = db.Column(db.Boolean, default=False)
    active = db.Column(db.Boolean, default=True)    # long term
    enable = db.Column(db.Boolean, default=True)    # short term
    changed = db.Column(db.TEXT, default='')

    @property
    def person_id(self):
        return self.leerlingnummer

def get_columns():
    return [p for p in dir(Student) if not p.startswith('_')]


def commit():
    return app.data.models.commit()


def add(data={}, commit=True):
    return app.data.models.add_single(Student, data, commit, timestamp=True)


def add_m(data=[]):
    return app.data.models.add_multiple(Student, data, timestamp=True)


def update(student, data={}, commit=True):
    return app.data.models.update_single(Student, student, data, commit, timestamp=True)


def update_m(data=[]):
    return app.data.models.update_multiple(Student, data, timestamp=True)


def delete_m(ids=[], students=[]):
    return app.data.models.delete_multiple(Student, ids, students)


def get_m(filters=[], fields=[], order_by=None, first=False, count=False, active=True):
    return app.data.models.get_multiple(Student, filters=filters, fields=fields, order_by=order_by, first=first, count=count, active=active)


def get(filters=[]):
    return app.data.models.get_first_single(Student, filters)

############ student overview list #########
def pre_sql_query():
    return db.session.query(Student).filter(Student.active == True)


def pre_sql_filter(query, filter):
    return query


def pre_sql_search(search_string):
    search_constraints = []
    return search_constraints
