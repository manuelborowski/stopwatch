from email.policy import default

from app import db
from sqlalchemy_serializer import SerializerMixin
from app import data as dl

class Incident(db.Model, SerializerMixin):
    __tablename__ = 'incidents'

    date_format = '%d/%m/%Y'
    datetime_format = '%d/%m/%Y %H:%M'

    id = db.Column(db.Integer, primary_key=True)
    lis_badge_id = db.Column(db.Integer, default=-1)
    owner = db.Column(db.String(256), default=None)
    laptop = db.Column(db.String(256), default=None)
    info = db.Column(db.String(256), default=None)
    spare_laptop = db.Column(db.String(256), default=None)
    charger = db.Column(db.String(256), default=None)
    type = db.Column(db.String(256), default=None)


class History(db.Model, SerializerMixin):
    __tablename__ = 'histories'

    date_format = '%d/%m/%Y'
    datetime_format = '%d/%m/%Y %H:%M'

    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer)
    info = db.Column(db.String(256), default=None)
    type = db.Column(db.String(256), default=None)
    status = db.Column(db.String(256), default=None)
    location = db.Column(db.String(256), default=None)
    time = db.Column(db.DateTime, default=None)


def incident_add(data = {}):
    return dl.models.add_single(Incident, data)


def incident_update(incident, data={}):
    return dl.models.update_single(Incident, incident, data)


def incident_get_m(filters=[], fields=[], order_by=None, first=False, count=False, active=True):
    return dl.models.get_multiple(Incident, filters=filters, fields=fields, order_by=order_by, first=first, count=count, active=active)


def incident_get(filters=[]):
    return dl.models.get_first_single(Incident, filters)


def incident_delete(ids=None):
    return dl.models.delete_multiple(Incident, ids=ids)


############ incident overview list #########
def filter(query_in):
    return query_in

def pre_sql_query():
    return db.session.query(Incident)


def pre_sql_filter(query, filters):
    for f in filters:
        if f['id'] == 'incident-type':
            if f['value'] != 'all':
                query = query.filter(Incident.incident_type == f['value'])
    return query


def pre_sql_search(search_string):
    search_constraints = []
    search_constraints.append(Incident.id.like(search_string))
    search_constraints.append(Incident.lis_badge_id.like(search_string))
    search_constraints.append(Incident.owner.like(search_string))
    search_constraints.append(Incident.laptop.like(search_string))
    return search_constraints




