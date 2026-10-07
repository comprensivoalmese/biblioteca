/*
 * Finto Google Apps Script per provare l'app nel browser senza Google:
 * SpreadsheetApp, Session, PropertiesService... minimi, dati nel localStorage.
 * Utente: ?utente=email (di default il proprietario = bibliotecario). ?azzera cancella i dati.
 */
(function () {
  const CHIAVE = 'biblioteca-anteprima-v1';
  const par = new URLSearchParams(location.search);
  const PROPRIETARIO = 'bibliotecaria@scuola.test';
  const ATTIVO = par.get('utente') || PROPRIETARIO;
  let d = null;
  try { if (par.has('azzera')) localStorage.removeItem(CHIAVE); d = JSON.parse(localStorage.getItem(CHIAVE)); } catch (e) { /* niente */ }
  if (!d) d = { props: {}, ordine: [], fogli: {} };
  const salva = () => { try { localStorage.setItem(CHIAVE, JSON.stringify(d)); } catch (e) { /* niente */ } };

  function Foglio(nome) { this.nome = nome; }
  Foglio.prototype = {
    righe() { return d.fogli[this.nome]; },
    getName() { return this.nome; },
    getLastRow() { return this.righe().length; },
    getDataRange() { const r = this.righe(); return new Intervallo(this, 1, 1, Math.max(1, r.length), Math.max(1, ...r.map(x => x.length))); },
    getRange(a, b, c, e) { return typeof a === 'string' ? new Intervallo(this, 0, 0, 0, 0) : new Intervallo(this, a, b, c || 1, e || 1); },
    appendRow(v) { this.righe().push(v.slice()); salva(); return this; },
    deleteRow(n) { this.righe().splice(n - 1, 1); salva(); },
    setFrozenRows() { return this; }
  };
  function Intervallo(f, r, c, nr, nc) { Object.assign(this, { f, r, c, nr, nc }); }
  Intervallo.prototype = {
    getValues() {
      const out = [];
      for (let i = 0; i < this.nr; i++) {
        const riga = this.f.righe()[this.r - 1 + i] || [];
        const o = []; for (let j = 0; j < this.nc; j++) { const v = riga[this.c - 1 + j]; o.push(v === undefined ? '' : v); }
        out.push(o);
      }
      return out;
    },
    setValues(v) {
      const righe = this.f.righe();
      v.forEach((riga, i) => {
        while (righe.length < this.r + i) righe.push([]);
        riga.forEach((x, j) => { righe[this.r - 1 + i][this.c - 1 + j] = x; });
      });
      salva(); return this;
    },
    setFontWeight() { return this; },
    setNumberFormat() { return this; }
  };
  const File = {
    getId: () => 'db-anteprima',
    getUrl: () => 'https://docs.google.com/spreadsheets/ (anteprima)',
    getSheetByName: n => (d.fogli[n] ? new Foglio(n) : null),
    insertSheet: n => { d.fogli[n] = []; d.ordine.push(n); salva(); return new Foglio(n); },
    getSheets: () => d.ordine.map(n => new Foglio(n)),
    deleteSheet: f => { delete d.fogli[f.nome]; d.ordine = d.ordine.filter(n => n !== f.nome); salva(); }
  };
  const fuso = 'Europe/Rome';
  // Finto elenco alunni nella cartella ELENCHI (nomi inventati): una scheda con intestazione su due righe.
  const ELENCO = [
    ['Elenco alunni a.s. 2026/27', '', '', ''],
    ['Cognome', 'Nome', 'Classe', 'Sezione'],
    ['Bianchi', 'Marta', '2', 'A'], ['Rossi', 'Luca', '3', 'B'], ['Tosco', 'Sofia', '1', 'C'],
    ['Verdi', 'Giorgio', 'II', 'A'], ['Rossi', 'Lucia', '1', 'A'], ['Neri', 'Paolo', '3', 'B']
  ];
  const fileElenco = { getSheets: () => [{ getName: () => 'Secondaria', getDataRange: () => ({ getDisplayValues: () => ELENCO }) }] };
  const iteratore = arr => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
  window.SpreadsheetApp = {
    openById: id => { if (id === 'elenco-anteprima') return fileElenco; if (id !== 'db-anteprima') throw new Error('non trovato'); return File; },
    getActiveSpreadsheet: () => null,
    create: () => { d.fogli = { Foglio1: [] }; d.ordine = ['Foglio1']; salva(); return File; }
  };
  window.MimeType = { GOOGLE_SHEETS: 'application/vnd.google-apps.spreadsheet' };
  window.DriveApp = {
    getFileById: () => ({ moveTo() {} }),
    getFolderById: () => ({
      getFoldersByName: n => iteratore(n === 'ELENCHI' ? [{ getFilesByType: () => iteratore([{ getId: () => 'elenco-anteprima' }]) }] : [])
    })
  };
  const cache = {};
  window.CacheService = { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; } }) };
  window.PropertiesService = { getScriptProperties: () => ({ getProperty: k => d.props[k] || null, setProperty: (k, v) => { d.props[k] = v; salva(); } }) };
  window.Session = {
    getActiveUser: () => ({ getEmail: () => ATTIVO }),
    getEffectiveUser: () => ({ getEmail: () => PROPRIETARIO }),
    getScriptTimeZone: () => fuso
  };
  window.Utilities = {
    formatDate: (data, tz, fmt) => new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(data)
  };
  window.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
  window.Logger = { log: (...a) => console.log('[Logger]', ...a) };
  window.UrlFetchApp = { fetch: () => { throw new Error('non disponibile in anteprima'); } };

  // google.script.run: chiama le funzioni globali di Codice.gs, in modo asincrono come il vero.
  function corridore() {
    let ok = () => {}, ko = e => console.error(e);
    const p = new Proxy({}, {
      get(_, nome) {
        if (nome === 'withSuccessHandler') return f => { ok = f; return p; };
        if (nome === 'withFailureHandler') return f => { ko = f; return p; };
        return (...arg) => setTimeout(() => {
          try { ok(JSON.parse(JSON.stringify(window[nome](...JSON.parse(JSON.stringify(arg)))))); } catch (e) { ko(e); }
        }, 120);
      }
    });
    return p;
  }
  window.google = { script: { url: { getLocation: cb => cb({ parameter: Object.fromEntries(par) }) } } };
  Object.defineProperty(window.google.script, 'run', { get: corridore });

  // ?esegui=codice: per le prove, eseguito un attimo dopo l'avvio dell'app.
  if (par.get('esegui')) window.addEventListener('load', () => setTimeout(() => (0, eval)(par.get('esegui')), 700));
})();
