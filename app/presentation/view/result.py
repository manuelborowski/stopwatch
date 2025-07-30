from flask import Blueprint, render_template, request
from flask_login import login_required

from app.data.datatables import DatatableConfig
from app import data as dl, application as al

#logging on file level
import logging
from app import MyLogFilter, top_log_handle, app
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())
bp_result = Blueprint('result', __name__)

@bp_result.route('/resultshow', methods=['GET', 'POST'])
@login_required
def show():
    return render_template("result.html", table_config=config.create_table_config())

class Config(DatatableConfig):
    def pre_sql_query(self):
        return dl.person.pre_sql_query()

    def pre_sql_filter(self, query, filters):
        return dl.person.pre_sql_filter(query, filters)

    def pre_sql_search(self, search):
        return dl.person.pre_sql_search(search)

    def format_data(self, db_list, total_count=None, filtered_count=None):
        return al.person.format_data(db_list, total_count, filtered_count)

    def post_sql_order(self, l, on, direction):
        return al.person.post_sql_order(l, on, direction)

    def post_sql_filter(self, l, filter, count):
        return al.person.post_sql_filter(l, filter, count)

config = Config("result", "Uitslag")

