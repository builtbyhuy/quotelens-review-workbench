(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.QL = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var LIMITS = Object.freeze({ items: 200, offers: 2000, history: 50, csvChars: 2097152,
    csvRows: 2000, csvColumns: 64, fieldChars: 8192, count: 1000000000,
    leadDays: 36500, backupChars: 8388608, notes: 200, noteChars: 4000 });
  var currencies = ['USD', 'EUR', 'GBP', 'VND'];
  var forbidden = new Set(['__proto__', 'prototype', 'constructor']);
  var workspaceKeys = ['schemaVersion', 'id', 'title', 'date', 'currency', 'revision', 'request', 'offers', 'selections', 'notes', 'history', 'importErrors'];
  var itemKeys = ['id', 'label', 'quantity', 'unit', 'maxLeadDays'];
  var offerKeys = ['id', 'itemId', 'supplier', 'quoteId', 'packSize', 'packPrice', 'minPacks', 'stockPacks', 'leadDays', 'validUntil', 'currency', 'deliveryFee', 'source'];
  var receiptKeys = ['kind', 'schemaVersion', 'id', 'workspaceId', 'title', 'revision', 'fingerprint', 'approvedAt', 'currency', 'total', 'lines', 'snapshot'];
  var lineKeys = ['itemId', 'itemLabel', 'quantity', 'unit', 'offerId', 'supplier', 'quoteId', 'packs', 'units', 'overage', 'goodsCost', 'deliveryCost', 'total', 'currency', 'source', 'reason', 'request', 'offer'];
  var sequence = 0;

  function plain(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }
  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function integer(value, min, max) { return Number.isSafeInteger(value) && value >= min && value <= max; }
  function str(value, max, required) {
    return typeof value === 'string' && value.length <= max && !value.includes('\u0000') && (!required || value.trim().length > 0);
  }
  function id(value) { return str(value, 128, true) && !forbidden.has(value) && !/[\r\n\t]/.test(value); }
  function date(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parts = value.split('-').map(Number), year = parts[0], month = parts[1], day = parts[2];
    if (year < 1 || month < 1 || month > 12 || day < 1) return false;
    var leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  }
  function timestamp(value) {
    return typeof value === 'string' && value.length <= 40 &&
      /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value) &&
      date(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
  }
  function cents(value) {
    if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,14})(?:\.\d{1,2})?$/.test(value)) return null;
    var pieces = value.split('.');
    return BigInt(pieces[0]) * 100n + BigInt((pieces[1] || '').padEnd(2, '0'));
  }
  function money(value) { return (value / 100n).toString() + '.' + (value % 100n).toString().padStart(2, '0'); }
  function resultMoney(value) { return typeof value === 'string' && /^(?:0|[1-9]\d{0,26})\.\d{2}$/.test(value); }
  function nextId(prefix) {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return prefix + '-' + globalThis.crypto.randomUUID();
    sequence += 1;
    return prefix + '-' + Date.now().toString(36) + '-' + sequence.toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function canonical(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ':' + canonical(value[key]); }).join(',') + '}';
  }
  function keys(value, allowed, path, errors) {
    if (!plain(value)) { errors.push(path + ' must be a plain object.'); return false; }
    Object.keys(value).forEach(function (key) { if (!allowed.includes(key)) errors.push(path + ' has unknown field ' + key + '.'); });
    allowed.forEach(function (key) { if (!own(value, key)) errors.push(path + '.' + key + ' is required.'); });
    return true;
  }
  function scan(value, errors) {
    var stack = [{ value: value, path: 'workspace', depth: 0 }], seen = new Set(), nodes = 0;
    while (stack.length) {
      var node = stack.pop(), val = node.value;
      nodes += 1;
      if (nodes > 300000 || node.depth > 16) { errors.push('Backup is too large or too deeply nested.'); return false; }
      if (val === null || typeof val === 'boolean') continue;
      if (typeof val === 'string') {
        if (val.length > LIMITS.backupChars || val.includes('\u0000')) { errors.push(node.path + ' contains an oversized or NUL string.'); return false; }
        continue;
      }
      if (typeof val === 'number') {
        if (!Number.isFinite(val) || !Number.isSafeInteger(val)) { errors.push(node.path + ' has a non-integer or unsafe number.'); return false; }
        continue;
      }
      if (typeof val !== 'object' || (!Array.isArray(val) && !plain(val))) { errors.push(node.path + ' is not portable JSON.'); return false; }
      if (seen.has(val)) { errors.push('Backup contains circular or shared object references.'); return false; }
      seen.add(val);
      if (Array.isArray(val) && val.length > 10000) { errors.push(node.path + ' has too many entries.'); return false; }
      var names = Object.getOwnPropertyNames(val);
      if (names.length > 10001 || Object.getOwnPropertySymbols(val).length) { errors.push(node.path + ' has too many or non-JSON keys.'); return false; }
      for (var i = 0; i < names.length; i += 1) {
        var key = names[i];
        if (Array.isArray(val) && key === 'length') continue;
        if (forbidden.has(key)) { errors.push(node.path + ' contains forbidden key ' + key + '.'); return false; }
        var descriptor = Object.getOwnPropertyDescriptor(val, key);
        if (!descriptor || !own(descriptor, 'value') || !descriptor.enumerable) { errors.push(node.path + ' contains non-JSON properties.'); return false; }
        if (Array.isArray(val) && !/^(?:0|[1-9]\d*)$/.test(key)) { errors.push(node.path + ' contains non-JSON array properties.'); return false; }
        stack.push({ value: descriptor.value, path: node.path + '.' + key, depth: node.depth + 1 });
      }
      if (Array.isArray(val) && names.length !== val.length + 1) { errors.push(node.path + ' contains a sparse array.'); return false; }
    }
    return true;
  }
  function sourceErrors(source, path, errors) {
    if (!keys(source, ['filename', 'line', 'raw'], path, errors)) return;
    if (!str(source.filename, 240, false)) errors.push(path + '.filename is invalid.');
    if (source.line !== null && !integer(source.line, 1, LIMITS.csvChars)) errors.push(path + '.line is invalid.');
    if (Array.isArray(source.raw)) {
      if (source.raw.length > LIMITS.csvColumns || source.raw.some(function (v) { return !str(v, LIMITS.fieldChars, false); })) errors.push(path + '.raw must contain bounded original CSV fields.');
    } else if (plain(source.raw)) {
      var names = Object.keys(source.raw);
      if (names.length > LIMITS.csvColumns || names.some(function (key) {
        var value = source.raw[key];
        return !str(key, 128, true) || !(value === null || typeof value === 'boolean' || (Number.isSafeInteger(value)) || str(value, LIMITS.fieldChars, false));
      })) errors.push(path + '.raw must contain bounded original scalar fields.');
    } else errors.push(path + '.raw must be an array or plain object.');
  }
  function itemErrors(item, path, errors) {
    if (!keys(item, itemKeys, path, errors)) return;
    if (!id(item.id)) errors.push(path + '.id is invalid.');
    if (!str(item.label, 240, true)) errors.push(path + '.label is required (maximum 240 characters).');
    if (!integer(item.quantity, 1, LIMITS.count)) errors.push(path + '.quantity must be a positive integer up to ' + LIMITS.count + '.');
    if (!str(item.unit, 48, true)) errors.push(path + '.unit is required (maximum 48 characters).');
    if (item.maxLeadDays !== null && !integer(item.maxLeadDays, 0, LIMITS.leadDays)) errors.push(path + '.maxLeadDays must be null or a nonnegative bounded integer.');
  }
  function offerErrors(offer, path, errors) {
    if (!keys(offer, offerKeys, path, errors)) return;
    ['id', 'itemId'].forEach(function (key) { if (!id(offer[key])) errors.push(path + '.' + key + ' is invalid.'); });
    if (!str(offer.supplier, 160, true)) errors.push(path + '.supplier is required (maximum 160 characters).');
    if (!str(offer.quoteId, 120, false)) errors.push(path + '.quoteId is invalid.');
    ['packSize', 'minPacks'].forEach(function (key) { if (!integer(offer[key], 1, LIMITS.count)) errors.push(path + '.' + key + ' must be a positive bounded integer.'); });
    if (cents(offer.packPrice) === null) errors.push(path + '.packPrice must be a nonnegative decimal string with at most two decimals and 15 integer digits.');
    if (cents(offer.deliveryFee) === null) errors.push(path + '.deliveryFee must be a nonnegative decimal string with at most two decimals and 15 integer digits.');
    if (offer.stockPacks !== null && !integer(offer.stockPacks, 0, LIMITS.count)) errors.push(path + '.stockPacks must be null or a nonnegative bounded integer.');
    if (offer.leadDays !== null && !integer(offer.leadDays, 0, LIMITS.leadDays)) errors.push(path + '.leadDays must be null or a nonnegative bounded integer.');
    if (offer.validUntil !== '' && !date(offer.validUntil)) errors.push(path + '.validUntil must be empty or a valid ISO date.');
    if (!currencies.includes(offer.currency)) errors.push(path + '.currency is unsupported.');
    sourceErrors(offer.source, path + '.source', errors);
  }
  function workspaceErrors(input, path, errors, allowHistory) {
    if (!keys(input, workspaceKeys, path, errors)) return;
    if (input.schemaVersion !== 2) errors.push(path + '.schemaVersion must be 2.');
    if (!id(input.id)) errors.push(path + '.id is invalid.');
    if (!str(input.title, 160, true)) errors.push(path + '.title is required (maximum 160 characters).');
    if (!date(input.date)) errors.push(path + '.date must be a valid ISO review date.');
    if (!currencies.includes(input.currency)) errors.push(path + '.currency is unsupported.');
    if (!integer(input.revision, 1, Number.MAX_SAFE_INTEGER)) errors.push(path + '.revision is invalid.');
    var itemIds = new Set(), offerIds = new Set();
    if (!Array.isArray(input.request) || input.request.length > LIMITS.items) errors.push(path + '.request must have at most ' + LIMITS.items + ' items.');
    else input.request.forEach(function (item, i) {
      itemErrors(item, path + '.request[' + i + ']', errors);
      if (plain(item)) { if (itemIds.has(item.id)) errors.push('Duplicate request item ID: ' + item.id + '.'); itemIds.add(item.id); }
    });
    if (!Array.isArray(input.offers) || input.offers.length > LIMITS.offers) errors.push(path + '.offers must have at most ' + LIMITS.offers + ' offers.');
    else input.offers.forEach(function (offer, i) {
      offerErrors(offer, path + '.offers[' + i + ']', errors);
      if (plain(offer)) {
        if (offerIds.has(offer.id)) errors.push('Duplicate offer ID: ' + offer.id + '.');
        offerIds.add(offer.id);
        if (!itemIds.has(offer.itemId)) errors.push(path + '.offers[' + i + '] refers to an unknown request item.');
      }
    });
    if (!plain(input.selections) || Object.keys(input.selections).length > LIMITS.items) errors.push(path + '.selections must be a bounded plain object.');
    else Object.keys(input.selections).forEach(function (key) {
      if (!id(key) || !id(input.selections[key]) || !itemIds.has(key) || !offerIds.has(input.selections[key])) errors.push(path + '.selections contains an unknown or invalid reference.');
      else if (Array.isArray(input.offers) && !input.offers.some(function (offer) { return plain(offer) && offer.id === input.selections[key] && offer.itemId === key; })) errors.push(path + '.selections refers to an offer for a different item.');
    });
    if (!plain(input.notes) || Object.keys(input.notes).length > LIMITS.notes) errors.push(path + '.notes must be a bounded plain object.');
    else Object.keys(input.notes).forEach(function (key) {
      if (!id(key) || !str(input.notes[key], LIMITS.noteChars, false)) errors.push(path + '.notes contains an invalid key or note.');
    });
    if (!Array.isArray(input.importErrors) || input.importErrors.length > 200 || input.importErrors.some(function (v) { return !str(v, 1000, false); })) errors.push(path + '.importErrors is invalid.');
    if (!Array.isArray(input.history) || input.history.length > (allowHistory ? LIMITS.history : 0)) errors.push(path + '.history is too large or recursively nested.');
    else if (allowHistory) input.history.forEach(function (receipt, i) { receiptErrors(receipt, path + '.history[' + i + ']', errors); });
  }
  function receiptErrors(receipt, path, errors) {
    if (!keys(receipt, receiptKeys, path, errors)) return;
    if (receipt.kind !== 'QuoteLensDecision' || receipt.schemaVersion !== 2 || !id(receipt.id) || !id(receipt.workspaceId)) errors.push(path + ' has invalid receipt identity.');
    if (!str(receipt.title, 160, true) || !integer(receipt.revision, 1, Number.MAX_SAFE_INTEGER) || !timestamp(receipt.approvedAt) || !currencies.includes(receipt.currency) || !resultMoney(receipt.total)) errors.push(path + ' has invalid receipt metadata.');
    if (!str(receipt.fingerprint, LIMITS.backupChars, true)) errors.push(path + '.fingerprint is invalid.');
    workspaceErrors(receipt.snapshot, path + '.snapshot', errors, false);
    if (!Array.isArray(receipt.lines) || !receipt.lines.length || receipt.lines.length > LIMITS.items) errors.push(path + '.lines is invalid.');
    else receipt.lines.forEach(function (line, i) {
      var p = path + '.lines[' + i + ']';
      if (!keys(line, lineKeys, p, errors)) return;
      if (!id(line.itemId) || !id(line.offerId) || !str(line.itemLabel, 240, true) || !str(line.unit, 48, true) || !str(line.supplier, 160, true) || !str(line.quoteId, 120, false) || !str(line.reason, LIMITS.noteChars, true) || !currencies.includes(line.currency)) errors.push(p + ' has invalid selection text.');
      ['quantity', 'packs', 'units'].forEach(function (key) { if (!integer(line[key], 1, Number.MAX_SAFE_INTEGER)) errors.push(p + '.' + key + ' is invalid.'); });
      if (!integer(line.overage, 0, Number.MAX_SAFE_INTEGER)) errors.push(p + '.overage is invalid.');
      ['goodsCost', 'deliveryCost', 'total'].forEach(function (key) { if (!resultMoney(line[key])) errors.push(p + '.' + key + ' is invalid.'); });
      itemErrors(line.request, p + '.request', errors); offerErrors(line.offer, p + '.offer', errors); sourceErrors(line.source, p + '.source', errors);
    });
    if (plain(receipt.snapshot) && Array.isArray(receipt.snapshot.request) && Array.isArray(receipt.snapshot.offers) && plain(receipt.snapshot.notes) && plain(receipt.snapshot.selections)) {
      try {
        if (receipt.fingerprint !== fingerprint(receipt.snapshot) || receipt.workspaceId !== receipt.snapshot.id || receipt.title !== receipt.snapshot.title || receipt.revision !== receipt.snapshot.revision || receipt.currency !== receipt.snapshot.currency) errors.push(path + ' does not match its snapshot.');
        var expected = decisionLines(receipt.snapshot), sum = expected.reduce(function (total, line) { return total + BigInt(line.total.replace('.', '')); }, 0n);
        if (canonical(expected) !== canonical(receipt.lines) || money(sum) !== receipt.total) errors.push(path + ' selection lines or total do not match its snapshot.');
      } catch (error) { errors.push(path + ' has an incomplete or invalid snapshot.'); }
    }
  }
  function checkedWorkspace(input) {
    var errors = [];
    try {
      if (!scan(input, errors)) return { valid: false, safe: false, errors: errors };
      if (JSON.stringify(input).length > LIMITS.backupChars) return { valid: false, safe: false, errors: ['Backup exceeds the 8 MiB character limit.'] };
      workspaceErrors(input, 'workspace', errors, true);
    } catch (error) { return { valid: false, safe: false, errors: ['Backup could not be validated as portable JSON.'] }; }
    return { valid: errors.length === 0, safe: true, errors: errors.slice(0, 200) };
  }
  function validateWorkspace(input) {
    var checked = checkedWorkspace(input);
    return { valid: checked.valid, errors: checked.errors };
  }
  function newWorkspace(options) {
    options = options || {};
    var workspace = { schemaVersion: 2, id: nextId('workspace'), title: options.title === undefined ? 'Untitled review' : options.title,
      date: options.date === undefined ? new Date().toISOString().slice(0, 10) : options.date, currency: options.currency === undefined ? 'USD' : options.currency,
      revision: 1, request: [], offers: [], selections: {}, notes: {}, history: [], importErrors: [] };
    var validation = validateWorkspace(workspace);
    if (!validation.valid) throw new Error(validation.errors.join(' '));
    return workspace;
  }
  function parseCsv(text) {
    var headers = [], rows = [], errors = [];
    if (typeof text !== 'string' || text.length > LIMITS.csvChars || text.includes('\u0000')) return { headers: [], rows: [], errors: ['CSV must be NUL-free text no longer than 2 MiB characters.'] };
    text = text.replace(/^\uFEFF/, '');
    if (!text.length) return { headers: [], rows: [], errors: ['CSV is empty.'] };
    var records = [], fields = [], field = '', state = 'start', line = 1, startLine = 1, active = false;
    function fail(message) { errors.push('CSV line ' + line + ': ' + message); }
    function fieldEnd() {
      fields.push(field); field = ''; state = 'start';
      if (fields.length > LIMITS.csvColumns) fail('too many columns (maximum ' + LIMITS.csvColumns + ').');
    }
    function rowEnd() {
      fieldEnd();
      if (!(fields.length === 1 && fields[0] === '' && !active)) records.push({ line: startLine, raw: fields });
      fields = []; active = false;
      if (records.length > LIMITS.csvRows + 1) fail('too many rows (maximum ' + LIMITS.csvRows + ' data rows).');
    }
    for (var i = 0; i < text.length && !errors.length; i += 1) {
      var char = text[i], newline = char === '\r' || char === '\n';
      if (state === 'quoted') {
        if (char === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 1; } else state = 'closed';
        } else {
          field += char;
          if (newline) { if (char === '\r' && text[i + 1] === '\n') { field += '\n'; i += 1; } line += 1; }
        }
      } else if (char === ',') { active = true; fieldEnd(); }
      else if (newline) { rowEnd(); if (char === '\r' && text[i + 1] === '\n') i += 1; line += 1; startLine = line; }
      else if (state === 'closed') fail('unexpected text after a closing quote.');
      else if (char === '"') {
        if (state !== 'start') fail('quote inside an unquoted field.');
        else { state = 'quoted'; active = true; }
      } else { field += char; state = 'unquoted'; active = true; }
      if (field.length > LIMITS.fieldChars) fail('field exceeds ' + LIMITS.fieldChars + ' characters.');
    }
    if (!errors.length && state === 'quoted') fail('unterminated quoted field.');
    if (!errors.length && (active || fields.length || field.length || state === 'closed')) rowEnd();
    if (errors.length) return { headers: [], rows: [], errors: errors };
    if (!records.length) return { headers: [], rows: [], errors: ['CSV has no header.'] };
    headers = records[0].raw.map(function (header) { return header.trim(); });
    var seen = new Set();
    headers.forEach(function (header) {
      if (!str(header, 128, true) || forbidden.has(header)) errors.push('CSV header is empty, unsafe or longer than 128 characters.');
      else if (seen.has(header)) errors.push('CSV has duplicate header: ' + header + '.');
      seen.add(header);
    });
    records.slice(1).forEach(function (record) {
      if (record.raw.length !== headers.length) { errors.push('CSV line ' + record.line + ': expected ' + headers.length + ' fields, received ' + record.raw.length + '.'); return; }
      var values = {};
      headers.forEach(function (header, index) { if (!forbidden.has(header)) values[header] = record.raw[index]; });
      rows.push({ line: record.line, values: values, raw: record.raw.slice() });
    });
    return { headers: headers, rows: errors.length ? [] : rows, errors: errors.slice(0, 200) };
  }
  function importCsv(text, mapping, filename) {
    var parsed = parseCsv(text), errors = parsed.errors.slice(), offers = [];
    if (errors.length) return { offers: [], headers: parsed.headers, errors: errors };
    var mappingFields = offerKeys.filter(function (key) { return !['id', 'source'].includes(key); });
    if (!plain(mapping) || Object.keys(mapping).some(function (key) { return forbidden.has(key) || (!mappingFields.includes(key) && key !== '_currency'); })) errors.push('Mapping must use supported canonical fields only.');
    else {
      ['itemId', 'supplier', 'packSize', 'packPrice'].forEach(function (key) {
        if (!str(mapping[key], 128, true) || !parsed.headers.includes(mapping[key])) errors.push('Map required field ' + key + ' to an existing CSV header.');
      });
      Object.keys(mapping).forEach(function (key) {
        if (key !== '_currency' && mapping[key] !== '' && (!str(mapping[key], 128, true) || !parsed.headers.includes(mapping[key]))) errors.push('Mapped header for ' + key + ' does not exist.');
      });
      if (!mapping.currency && !currencies.includes(mapping._currency)) errors.push('Set mapping._currency to the workspace currency when no currency column is mapped.');
    }
    if (filename === undefined) filename = 'import.csv';
    if (!str(filename, 240, true)) errors.push('Filename must be a nonempty string up to 240 characters.');
    if (errors.length) return { offers: [], headers: parsed.headers, errors: errors };
    function value(row, key, fallback) { return mapping[key] ? row.values[mapping[key]].trim() : fallback; }
    function number(row, key, fallback, nullable) {
      var raw = value(row, key, fallback);
      if (raw === '' && nullable) return null;
      return typeof raw === 'number' ? raw : /^(?:0|[1-9]\d{0,9})$/.test(raw) ? Number(raw) : NaN;
    }
    parsed.rows.forEach(function (row) {
      var offer = { id: nextId('offer'), itemId: value(row, 'itemId', ''), supplier: value(row, 'supplier', ''), quoteId: value(row, 'quoteId', ''),
        packSize: number(row, 'packSize', '', false), packPrice: value(row, 'packPrice', ''), minPacks: number(row, 'minPacks', '1', false),
        stockPacks: number(row, 'stockPacks', '', true), leadDays: number(row, 'leadDays', '', true), validUntil: value(row, 'validUntil', ''),
        currency: value(row, 'currency', mapping._currency), deliveryFee: value(row, 'deliveryFee', '0'),
        source: { filename: filename, line: row.line, raw: row.raw.slice() } };
      var rowErrors = []; offerErrors(offer, 'CSV line ' + row.line, rowErrors);
      if (!rowErrors.length) {
        offer.packPrice = money(cents(offer.packPrice)); offer.deliveryFee = money(cents(offer.deliveryFee)); offers.push(offer);
      } else errors.push.apply(errors, rowErrors);
    });
    return { offers: errors.length ? [] : offers, errors: errors.slice(0, 200), headers: parsed.headers };
  }
  function evaluateOffer(item, offer, workspace) {
    var reasons = [], warnings = [], packs = null, units = null, overage = null, goodsCost = null, deliveryCost = null, total = null;
    itemErrors(item, 'Request', reasons); offerErrors(offer, 'Offer', reasons);
    if (!plain(workspace) || !date(workspace.date) || !currencies.includes(workspace.currency)) reasons.push('Workspace review date or currency is invalid.');
    if (plain(item) && plain(offer)) {
      if (item.id !== offer.itemId) reasons.push('Offer item identity does not match the request.');
      if (plain(workspace) && offer.currency !== workspace.currency) reasons.push('Offer currency does not match workspace currency; no FX conversion is assumed.');
      if (offer.validUntil === '') warnings.push('Quote expiry was not supplied; validity is unverified.');
      else if (date(offer.validUntil) && plain(workspace) && date(workspace.date) && offer.validUntil < workspace.date) reasons.push('Quote expired before the review date.');
      if (offer.stockPacks === null) warnings.push('Stock was not supplied; availability is unverified.');
      if (offer.leadDays === null) {
        warnings.push('Lead time was not supplied; delivery timing is unverified.');
        if (item.maxLeadDays !== null && integer(item.maxLeadDays, 0, LIMITS.leadDays)) reasons.push('Lead time is required to check the request deadline.');
      } else if (integer(item.maxLeadDays, 0, LIMITS.leadDays) && integer(offer.leadDays, 0, LIMITS.leadDays) && offer.leadDays > item.maxLeadDays) reasons.push('Lead time exceeds the request maximum of ' + item.maxLeadDays + ' days.');
      if (integer(item.quantity, 1, LIMITS.count) && integer(offer.packSize, 1, LIMITS.count) && integer(offer.minPacks, 1, LIMITS.count)) {
        var packBig = BigInt(offer.packSize), required = (BigInt(item.quantity) + packBig - 1n) / packBig;
        var buy = required > BigInt(offer.minPacks) ? required : BigInt(offer.minPacks), boughtUnits = buy * packBig;
        packs = Number(buy);
        if (boughtUnits > BigInt(Number.MAX_SAFE_INTEGER)) reasons.push('Purchased unit count exceeds the safe integer limit.');
        else { units = Number(boughtUnits); overage = units - item.quantity; }
        if (integer(offer.stockPacks, 0, LIMITS.count) && packs > offer.stockPacks) reasons.push('Insufficient stock: need ' + packs + ' whole packs, have ' + offer.stockPacks + '.');
        var price = cents(offer.packPrice), delivery = cents(offer.deliveryFee);
        if (price !== null) goodsCost = money(buy * price);
        if (delivery !== null) deliveryCost = money(delivery);
        if (price !== null && delivery !== null) total = money(buy * price + delivery);
      }
    }
    return { offer: offer, eligible: reasons.length === 0, reasons: reasons, warnings: warnings, packs: packs, units: units, overage: overage, goodsCost: goodsCost, deliveryCost: deliveryCost, total: total };
  }
  function duplicateFlags(offers) {
    var groups = new Map(), flags = new Map();
    offers.forEach(function (offer) {
      if (!plain(offer)) return;
      var identity = canonical([offer.supplier, offer.quoteId, offer.itemId]);
      if (!groups.has(identity)) groups.set(identity, []);
      groups.get(identity).push(offer);
    });
    groups.forEach(function (group) {
      if (group.length < 2) return;
      var terms = group.map(function (offer) {
        var values = {};
        offerKeys.forEach(function (key) {
          if (key !== 'id' && key !== 'source') values[key] = ['packPrice', 'deliveryFee'].includes(key) && cents(offer[key]) !== null ? money(cents(offer[key])) : offer[key];
        });
        return canonical(values);
      });
      var conflict = new Set(terms).size > 1;
      group.forEach(function (offer) { flags.set(offer, conflict ? 'Conflicting duplicate supplier, quote and item identity; reconcile the source rows.' : 'Exact duplicate supplier, quote and item identity; remove the duplicate or assign a distinct quote reference.'); });
    });
    return flags;
  }
  function analyze(workspace) {
    var validation = checkedWorkspace(workspace), issues = validation.errors.slice(), warnings = [], items = [], total = 0n;
    if (!validation.safe) return { items: [], total: '0.00', complete: false, issues: issues, warnings: [] };
    if (!plain(workspace) || !Array.isArray(workspace.request) || !Array.isArray(workspace.offers) || workspace.request.length > LIMITS.items || workspace.offers.length > LIMITS.offers) return { items: [], total: '0.00', complete: false, issues: issues, warnings: [] };
    var flags = duplicateFlags(workspace.offers);
    workspace.request.forEach(function (item) {
      if (!plain(item)) { items.push({ request: item, offers: [], selected: null, cheapest: null }); return; }
      var evaluations = workspace.offers.filter(function (offer) { return plain(offer) && offer.itemId === item.id; }).map(function (offer) {
        var evaluated = evaluateOffer(item, offer, workspace);
        if (flags.has(offer)) { evaluated.reasons.push(flags.get(offer)); evaluated.eligible = false; }
        evaluated.warnings.forEach(function (warning) { warnings.push(item.label + ' / ' + offer.supplier + ': ' + warning); });
        return evaluated;
      });
      var eligible = evaluations.filter(function (evaluation) { return evaluation.eligible; });
      var cheapest = eligible.reduce(function (best, current) {
        return !best || BigInt(current.total.replace('.', '')) < BigInt(best.total.replace('.', '')) ? current : best;
      }, null);
      var selectedId = plain(workspace.selections) && own(workspace.selections, item.id) ? workspace.selections[item.id] : null;
      var selected = evaluations.find(function (evaluation) { return evaluation.offer.id === selectedId; }) || null;
      if (selected && selected.eligible) total += BigInt(selected.total.replace('.', ''));
      if (!selected) issues.push(item.label + ': select an eligible offer.');
      else if (!selected.eligible) issues.push(item.label + ': selected offer is blocked. ' + selected.reasons.join(' '));
      if (selected && selected.eligible && cheapest && selected.offer.id !== cheapest.offer.id) warnings.push(item.label + ': selected offer is not the lowest eligible purchase total (or is tied).');
      items.push({ request: item, offers: evaluations, selected: selected, cheapest: cheapest });
    });
    flags.forEach(function (message, offer) { issues.push(offer.supplier + ' / ' + offer.itemId + ': ' + message); });
    if (!items.length) issues.push('Add at least one request item.');
    return { items: items, total: money(total), complete: validation.valid && items.length > 0 && items.every(function (item) { return item.selected && item.selected.eligible; }), issues: issues, warnings: warnings };
  }
  function fingerprint(workspace) {
    if (!plain(workspace)) throw new Error('Workspace must be a plain object.');
    var content = {};
    ['schemaVersion', 'id', 'title', 'date', 'currency', 'request', 'offers', 'selections', 'notes'].forEach(function (key) {
      if (!own(workspace, key)) throw new Error('Workspace is missing fingerprint field ' + key + '.');
      content[key] = workspace[key];
    });
    return 'ql2-content:' + canonical(content);
  }
  function decisionLines(workspace) {
    var analysis = analyzeWithoutHistory(workspace);
    if (!analysis.complete) throw new Error('Complete the review before approval. ' + analysis.issues.join(' '));
    return analysis.items.map(function (entry) {
      var chosen = entry.selected, offer = chosen.offer, item = entry.request;
      return { itemId: item.id, itemLabel: item.label, quantity: item.quantity, unit: item.unit, offerId: offer.id, supplier: offer.supplier, quoteId: offer.quoteId,
        packs: chosen.packs, units: chosen.units, overage: chosen.overage, goodsCost: chosen.goodsCost, deliveryCost: chosen.deliveryCost, total: chosen.total,
        currency: workspace.currency, source: clone(offer.source), reason: (workspace.notes[item.id] || '').trim() || (chosen.offer.id === entry.cheapest.offer.id ? 'Lowest eligible whole-pack purchase total.' : 'Selected by reviewer.'),
        request: clone(item), offer: clone(offer) };
    });
  }
  function analyzeWithoutHistory(workspace) {
    var shallow = Object.assign({}, workspace, { history: [] });
    return analyze(shallow);
  }
  function createReceipt(workspace, nowISO) {
    var analysis = analyze(workspace);
    if (!analysis.complete) throw new Error('Complete the review before approval. ' + analysis.issues.join(' '));
    if (!timestamp(nowISO)) throw new Error('Approval time must be a valid ISO timestamp with timezone.');
    var snapshot = clone(workspace); snapshot.history = [];
    return { kind: 'QuoteLensDecision', schemaVersion: 2, id: nextId('decision'), workspaceId: workspace.id, title: workspace.title, revision: workspace.revision,
      fingerprint: fingerprint(workspace), approvedAt: nowISO, currency: workspace.currency, total: analysis.total, lines: decisionLines(workspace), snapshot: snapshot };
  }
  function csvCell(value, textCell) {
    var text = value === null || value === undefined ? '' : String(value);
    if (textCell && /^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = "'" + text;
    if (/[",\r\n]/.test(text)) text = '"' + text.replace(/"/g, '""') + '"';
    return text;
  }
  function exportDecisionCsv(workspace) {
    var lines = decisionLines(workspace), headings = ['item_id', 'item', 'requested_quantity', 'unit', 'supplier', 'quote_id', 'packs', 'units_purchased', 'overage', 'goods_cost', 'delivery_per_offer_line', 'total', 'currency', 'source_file', 'source_line', 'reason'];
    var numericColumns = new Set([2, 6, 7, 8, 9, 10, 11, 14]);
    var rows = lines.map(function (line) { return [line.itemId, line.itemLabel, line.quantity, line.unit, line.supplier, line.quoteId, line.packs, line.units, line.overage, line.goodsCost, line.deliveryCost, line.total, line.currency, line.source.filename, line.source.line, line.reason]; });
    return [headings].concat(rows).map(function (row, index) { return row.map(function (value, column) { return csvCell(value, index === 0 || !numericColumns.has(column)); }).join(','); }).join('\r\n') + '\r\n';
  }
  return Object.freeze({ LIMITS: LIMITS, newWorkspace: newWorkspace, parseCsv: parseCsv, importCsv: importCsv, evaluateOffer: evaluateOffer,
    analyze: analyze, fingerprint: fingerprint, createReceipt: createReceipt, exportDecisionCsv: exportDecisionCsv, validateWorkspace: validateWorkspace });
});
