import sys

from sqlalchemy_serializer import SerializerMixin

import app.data.models
from app import log, db
from sqlalchemy_serializer import SerializerMixin

class Person(db.Model, SerializerMixin):
    __tablename__ = 'persons'

    date_format = '%Y/%m/%d'
    datetime_format = '%Y/%m/%d %H:%M:%S'

    id = db.Column(db.Integer(), primary_key=True)
    voornaam = db.Column(db.String(256), default='')
    naam = db.Column(db.String(256), default='')
    roepnaam = db.Column(db.String(256), default='')
    geslacht = db.Column(db.String(256), default="")
    rfid = db.Column(db.String(256), default="")
    klasgroep = db.Column(db.String(256), default='')
    instellingsnummer = db.Column(db.String(256), default='')
    informatnummer = db.Column(db.String(256), default='')
    lijst_id = db.Column(db.Integer(), default=None)
    checkin_time = db.Column(db.DateTime, default=None)
    new_rfid_time = db.Column(db.DateTime, default=None)
    result_time = db.Column(db.Integer(), default=None)
    temp_badge = db.Column(db.String(256), default="")

    @property
    def schoolcode(self):
        if self.klasgroep == "Leerkracht":
            schoolnaam = "NVT"
        elif self.klasgroep == "OKAN":
            schoolnaam = "sul"
        elif int(self.klasgroep[0]) < 3:
            schoolnaam = "sum"
        elif self.instellingsnummer == "30569":
            schoolnaam = "sui"
        else:
            schoolnaam = "sul"
        return schoolnaam

    @property
    def graad(self):
        if self.klasgroep == "Leerkracht":
            graad = "NVT"
        elif self.klasgroep == "OKAN":
            graad = "3"
        elif self.klasgroep[0] in ["1", "2"]:
            graad = "1"
        elif self.klasgroep[0] in ["3", "4"]:
            graad = "2"
        else:
            graad = "3"
        return graad

    @property
    def jaar(self):
        if self.klasgroep == "Leerkracht":
            jaar = "NVT"
        elif self.klasgroep == "OKAN":
            jaar = "6"
        else:
            jaar = self.klasgroep[0]
        return jaar

def commit():
    return app.data.models.commit()

def add(data=None, commit=True):
    if data is None:
        data = {}
    return app.data.models.add_single(Person, data, commit)

def add_m(data=None):
    if data is None:
        data = []
    return app.data.models.add_multiple(Person, data, )

def update(obj, data=None, commit=True):
    if data is None:
        data = {}
    return app.data.models.update_single(Person, obj, data, commit)

def update_m(data=None):
    if data is None:
        data = []
    return app.data.models.update_multiple(Person, data)

def delete_m(ids=None, objs=None):
    if objs is None:
        objs = []
    if ids is None:
        ids = []
    return app.data.models.delete_multiple(Person, ids, objs)

def get_m(filters=None, fields=None, order_by=None, first=False, count=False, active=True):
    if fields is None:
        fields = []
    if filters is None:
        filters = []
    return app.data.models.get_multiple(Person, filters=filters, fields=fields, order_by=order_by, first=first, count=count, active=active)

def get(filters=None):
    if filters is None:
        filters = []
    return app.data.models.get_first_single(Person, filters)

def get_klasgroepen():
    try:
        query = db.session.query(Person.klasgroep).distinct().all()
        query.sort()
        klasgroepen = [k[0] for k in query]
        return klasgroepen
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        raise e

############ obj overview list #########
def pre_sql_query():
    return db.session.query(Person)

def pre_sql_filter(query, filters):
    for f in filters:
        if f['id'] == 'geslacht':
            if f['value'] != 'all':
                query = query.filter(Person.geslacht == f['value'])
        if f['id'] == 'lijst':
            if f['value'] != 'all':
                if f['value'] == 'no-list':
                    query = query.filter(Person.lijst_id == None)
                else:
                    query = query.filter(Person.lijst_id == f['value'])
    return query

def pre_sql_search(search_string):
    search_constraints = []
    search_constraints.append(Person.naam.like(search_string))
    search_constraints.append(Person.voornaam.like(search_string))
    return search_constraints
