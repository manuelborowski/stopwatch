export class ColumnVisibility {
    constructor(placeholder, column_list, visibility_changed_cb, id) {
        // Settings are locally stored
        this.visibility_changed_cb = visibility_changed_cb;
        this.id = id;
        this.settings = []
        placeholder.innerHTML = "Kolommen: &nbsp;";
        this.settings = JSON.parse(localStorage.getItem(`ColumnsVisible-${id}`));
        if (!this.settings || this.settings.length !== column_list.length) {
            this.settings = column_list.map(t => ({data: t.data, visible: t.visible, name: t.name, tt: t.tt || ""}))
            localStorage.setItem(`ColumnsVisible-${id}`, JSON.stringify(this.settings));
        }
        // create the buttons on top of the page
        this.settings.forEach((column, i) => {
            if (!['always', "never"].includes(column.visible)) {
                let a = document.createElement('p');
                a.appendChild(document.createTextNode(`${column.name}`));
                a.setAttribute("title", column.tt);
                a.setAttribute("data-column", i);
                a.setAttribute("class", column.visible === 'yes' ? "column-visible-a" : "column-invisible-a")
                a.addEventListener('click', e => {
                    e.preventDefault();
                    const column = e.currentTarget.dataset.column;
                    let visible = this.settings[column].visible === 'yes';
                    visible = !visible;
                    this.visibility_changed_cb(i, visible);
                    if (visible) {
                        e.currentTarget.classList.remove('column-invisible-a')
                        e.currentTarget.classList.add('column-visible-a')
                    } else {
                        e.currentTarget.classList.add('column-invisible-a')
                        e.currentTarget.classList.remove('column-visible-a')
                    }
                    this.settings[column].visible = visible ? 'yes' : 'no';
                    localStorage.setItem(`ColumnsVisible-${id}`, JSON.stringify(this.settings));
                });
                placeholder.appendChild(a);
                placeholder.style.display = "flex";
            }
        });
        this.settings.forEach((column, i) => {
            if (column.visible === 'always') {
                if (column.data !== "row_action") this.visibility_changed_cb(i, true); // Bug?  When using local data store (no ajax), it is not possible to change the visibility of the first column
            } else if (column.visible === 'never') {
                this.visibility_changed_cb(i, false);
            } else {
                this.visibility_changed_cb(i, column.visible === 'yes');
            }
        });
    }
}