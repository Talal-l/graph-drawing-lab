import { deepCopy } from "./util.js";

export function cleanId(str) {
  if (str == null) return null;

  // TODO: remove newline if any
  let id = String(str);
  // replace spaces with -
  return id.replace(/\s/, "-");
}
function swap(arr, a, b) {
  let t = arr[a];
  arr[a] = arr[b];
  arr[b] = t;
}

/**
 * Table interface to avoid dealing with HTML directly
 */
export class Table {
  /**
   * Create an HTML table wrapper
   * @param {string} tableElId - The id of the table to wrap
   * @param {object} [table] - Table object used to populate the table
   */
  constructor(tableElId, table) {
    this.sortClass = "sort-neutral";
    this.sortHeader = null;
    this.id = cleanId(tableElId);

    if (this.id != null) {
      this.tableEl = document.querySelector(`#${this.id}`);
      if (!this.tableEl) {
        throw `${this.id} is not a valid id`;
      }
    }

    // in memory representation of the table
    // array of row objects and array of header objects
    // each row object contain a pointer to its header
    if (table) {
      // TODO: validate table object
      this.table = deepCopy(table);
    } else {
      this.table = {
        rows: [],
        headers: [],
      };
    }
  }

  attachToHtml(tableElId) {
    this.id = cleanId(tableElId);
    this.tableEl = document.querySelector(`#${tableElId}`);
    if (this.tableEl == null) {
      throw `${this.id} is not a valid id`;
    }
  }
  /*
   * Update the HTML table to match the internal object
   */
  refresh() {
    if (this.tableEl == null) {
      throw `Table not attached to html`;
    }

    this.tableEl.innerHTML = "";
    let frag = document.createDocumentFragment();

    let thead = document.createElement("thead");
    let theadRow = document.createElement("tr");
    for (let col of this.table.headers) {
      if (!col.hidden) {
        let th = document.createElement("th");
        th.id = col.id;
        th.append(col.title);

        let button = document.createElement("button");
        button.classList.add(
          "sort",
          this.sortHeader === col.id ? this.sortClass : "sort-neutral"
        );
        th.append(button);

        theadRow.append(th);
      }
    }
    thead.append(theadRow);
    frag.append(thead);

    let tbody = document.createElement("tbody");
    for (let row of this.table.rows) {
      // skip hidden rows
      if (row.prop && row.prop.hidden) {
        continue;
      }
      let tr = document.createElement("tr");
      // order must match the headers
      for (let col of this.table.headers) {
        if (row[col.id] === undefined) {
          row[col.id] = { value: "-", type: "text" };
        }
        if (typeof row[col.id] !== "object") {
          row[col.id] = {
            value: String(row[col.id]),
            type: "text",
          };
        }
        if (!col.hidden) {
          let td = document.createElement("td");
          // TODO: use default
          let data = null;
          if (row[col.id].type === "text") {
            data = row[col.id].value;
          } else if (row[col.id].type === "image") {
            let img = document.createElement("img");
            img.src = row[col.id].src;
          } else if (row[col.id].type === "html") {
            data = document.createElement("div");
            data.insertAdjacentHTML("beforeend", row[col.id].value);
            data.onclick = row[col.id].onClick;
          }
          if (!data) data = "-";
          td.append(data);
          tr.append(td);
        }
      }
      tbody.append(tr);
    }
    frag.append(tbody);
    this.tableEl.append(frag);
  }

  /**
   * Add header to table with an optional index.
   * @param {object} header - Header object with a valid id
   * @param {number} [index] - Where to insert the header (starts from 0)
   */
  addHeader(header, index) {
    if (!header || header.id === undefined)
      throw `Expected a header object with a valid id, but got ${JSON.stringify(
        header
      )}`;

    let id = cleanId(header.id);
    let title = header.title !== undefined ? String(header.title) : "-";
    let headerObj = {
      id,
      title: title,
    };
    if (index === undefined || index < 0) index = this.table.headers.length;

    for (const h of this.table.headers) {
      if (h.id === id) throw `id ${id} already exists`;
    }

    this.table.headers.splice(index, 0, headerObj);
  }
  /**
   * Add a row to table with an optional index
   * @param {object} row - Object
   * @param {number} [index] - Where to add the row (starts from 0)
   */
  addRow(row, index) {
    if (!row) throw `Invalid row object ${row}`;
    if (index === undefined) index = this.table.rows.length;
    this.table.rows.splice(index, 0, row);
  }

  removeHeader(id) {
    id = String(id);
    let headers = this.getHeaders();
    for (var i = 0, len = headers.length; i < len; i++) {
      if (headers[i].id === id) {
        headers.splice(i, 1);
        break;
      }
    }
    let rows = this.getRows();
    for (var i = 0, len = rows.length; i < len; i++) {
      delete rows[i][id];
    }
  }

  removeRow(index) {
    let rows = this.getRows();
    if (typeof index !== "number") throw `${index} is not a number`;
    if (index < 0 || index >= rows.length)
      throw `index ${index} is out of bound`;
    rows.splice(index, 1);
  }

  /**
   * Move header with id to a given index without changing order of the other headers.
   * @param {string} id - Id of the header
   * @param {number} index - new index of the header
   */
  moveHeader(id, index) {
    let hIndex = this.getHeaderIndex(id);
    let headers = this.getHeaders();
    if (hIndex < 0) throw `No header with id ${id}`;
    if (index < 0 || index >= headers.length)
      throw `index ${index} is out of bound`;
    let s = hIndex < index ? 1 : -1;
    for (var i = hIndex, len = index; i !== len; i += s) {
      swap(headers, i, i + s);
    }
  }

  moveRow(oldIndex, newIndex) {
    let rows = this.getRows();
    if (oldIndex < 0 || oldIndex >= rows.length)
      throw `index ${oldIndex} is out of bound`;
    if (newIndex < 0 || newIndex >= rows.length)
      throw `index ${newIndex} is out of bound`;
    let s = oldIndex < newIndex ? 1 : -1;
    for (var i = oldIndex, len = newIndex; i !== len; i += s) {
      swap(rows, i, i + s);
    }
  }

  getHeaders() {
    return this.table.headers;
  }

  getRows() {
    return this.table.rows;
  }

  getHeader(id) {
    let headers = this.getHeaders();
    for (var i = 0, len = headers.length; i < len; i++) {
      if (headers[i].id === id) return headers[i];
    }
  }

  getHiddenHeaders() {
    let hidden = [];
    let headers = this.getHeaders();
    for (var i = 0, len = headers.length; i < len; i++) {
      if (headers[i].hidden) hidden.push(headers[i]);
    }
    return hidden;
  }

  getVisibleHeaders() {
    let visible = [];
    let headers = this.getHeaders();
    for (var i = 0, len = headers.length; i < len; i++) {
      if (!headers[i].hidden) visible.push(headers[i]);
    }
    return visible;
  }

  getVisibleRow(index) {
    if (typeof index !== "number") throw `${index} is not a number`;
    if (index < 0 || index >= this.table.rows.length)
      throw `${index} is out of bound`;
    let rows = this.getRows();
    let j = 0;
    for (var i = 0, len = rows.length; i < len; i++) {
      // skip hidden rows
      if (!rows[i].prop || !rows[i].prop.hidden) {
        if (j === index) {
          return rows[i];
        }
        j++;
      }
    }
  }

  getVisibleRows() {
    let rows = this.getRows();
    let visible = [];
    for (var i = 0, len = rows.length; i < len; i++) {
      if (!(rows[i].prop && rows[i].prop.hidden))
        visible.push({ index: i, row: rows[i] });
    }
    return visible;
  }

  getHiddenRows() {
    let rows = this.getRows();
    let hidden = [];
    for (var i = 0, len = rows.length; i < len; i++) {
      if (rows[i].prop && rows[i].prop.hidden)
        hidden.push({ index: i, row: rows[i] });
    }
    return hidden;
  }

  getRow(index) {
    if (typeof index !== "number") throw `${index} is not a number`;
    if (index < 0 || index >= this.table.rows.length)
      throw `${index} is out of bound`;
    return this.getRows()[index];
  }
  // Return first occurrence
  getRowByHeader(header, value) {
    let rows = this.getRows();
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][header].value === value) return rows[i];
    }
    return null;
  }

  hideHeader(id) {
    let rows = this.getRows();
    let header = this.getHeader(id);
    if (!header) throw `No header with id ${id}`;
    header.hidden = true;
  }

  hideRow(index) {
    if (typeof index !== "number") throw `${index} is not a number`;
    if (!this.table.hiddenRowsNum) this.table.hiddenRowsNum = 1;
    else this.table.hiddenRowsNum++;
    let row = this.getVisibleRow(index);
    if (!row.prop) row.prop = { hidden: true };
    row.prop.hidden = true;
  }

  showHeader(id) {
    let rows = this.getRows();
    let header = this.getHeader(id);
    if (!header) throw `No header with id ${id}`;
    header.hidden = false;
    for (var i = 0, len = rows.length; i < len; i++) {
      rows[i][id].hidden = false;
    }
  }

  showRow(index) {
    if (typeof index !== "number") throw `${index} is not a number`;
    let row = this.getRow(index);
    if (row.prop && row.prop.hidden) {
      row.prop.hidden = false;
    }
  }
  sort(header, ascending = true) {
    if (ascending) this.sortClass = "sort-asc";
    else this.sortClass = "sort-desc";

    this.sortHeader = header;
    let rows = this.getRows();

    let cmpNumber = (a, b) => {
      a = Number(a);
      b = Number(b);
      return ascending ? a - b : b - a;
    };
    let cmpString = (a, b) => {
      if (a < b) return ascending ? -1 : 1;
      else if (a > b) return ascending ? 1 : -1;
      else return 0;
    };

    let cmp;
    let sample = rows[0];
    if (sample) {
      if (isFinite(Number(sample[header].value))) cmp = cmpNumber;
      else cmp = cmpString;
      rows.sort((a, b) => cmp(a[header].value, b[header].value));
    }
  }

  /*
   ** Clear rows in a table
   */
  clear() {
    this.table.rows = [];
  }

  /**
   * Returns -1 if not found
   * @returns {number}
   */
  getHeaderIndex(id) {
    id = String(id);
    let headers = this.getHeaders();
    for (var i = 0, len = headers.length; i < len; i++) {
      if (headers[i].id === id) {
        return i;
      }
    }
    return -1;
  }
  serialize(string = true) {
    if (string === true) return JSON.stringify(this);

    // TODO: is this fine?
    return JSON.parse(JSON.stringify(this));
  }
  deserialize(data) {
    if (typeof data === "string") data = JSON.parse(data);
    // TODO: is this fine?
    data = JSON.parse(JSON.stringify(data));

    Object.assign(this, data);
    return this;
  }
}
