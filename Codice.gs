/**
 * Biblioteca scolastica - I.C. Almese
 * © 2026 Istituto Comprensivo di Almese (www.comprensivoalmese.it) – sviluppata dal Wolf Team.
 * Tutti i diritti riservati: nessun uso senza permesso scritto della scuola (vedi LICENZA.md).
 *
 * Lato server (Google Apps Script). Il database e' un Foglio Google nella cartella Drive
 * della biblioteca: fogli Libri, Prestiti, Utenti, Impostazioni.
 */

const CARTELLA_ID = '1W0oK_XPOAO4Rf27_qH2vqB-MXt09oCq6';
const NOME_DB = 'Biblioteca - Database';
// Sottocartella con gli elenchi degli alunni (Fogli Google): servono a scegliere chi prende un libro.
const NOME_CARTELLA_ELENCHI = 'ELENCHI';
// Pagina con la fotocamera dal vivo (cartella docs/ del repo, pubblicata con GitHub Pages).
// Si puo' cambiare nel foglio Impostazioni, riga "Indirizzo scanner" (vuota = questo indirizzo).
const SCANNER_PREDEFINITO = 'https://comprensivoalmese.github.io/biblioteca/';

// [chiave usata dall'app, intestazione nel Foglio]. L'ordine e' quello delle colonne.
const COLONNE = {
  Libri: [['id', 'ID'], ['isbn', 'ISBN'], ['titolo', 'Titolo'], ['autori', 'Autori'], ['editore', 'Editore'],
    ['anno', 'Anno'], ['pagine', 'Pagine'], ['genere', 'Genere'], ['fascia', "Fascia d'eta'"],
    ['collocazione', 'Collocazione'], ['copie', 'Copie'], ['copertina', 'Copertina'],
    ['descrizione', 'Descrizione'], ['note', 'Note'], ['inseritoIl', 'Inserito il'], ['inseritoDa', 'Inserito da']],
  Prestiti: [['id', 'ID'], ['libroId', 'ID libro'], ['isbn', 'ISBN'], ['titolo', 'Titolo'], ['lettore', 'Lettore'],
    ['classe', 'Classe'], ['prestatoIl', 'Prestato il'], ['scadenza', 'Scadenza'], ['restituitoIl', 'Restituito il'],
    ['note', 'Note'], ['registratoDa', 'Registrato da']],
  Utenti: [['email', 'Email'], ['nome', 'Nome'], ['ruolo', 'Ruolo']],
  Impostazioni: [['chiave', 'Chiave'], ['valore', 'Valore']]
};

// Colonne da tenere come testo (ISBN e date in formato aaaa-mm-gg).
const COLONNE_TESTO = { Libri: ['isbn', 'inseritoIl'], Prestiti: ['isbn', 'prestatoIl', 'scadenza', 'restituitoIl'] };

const IMPOSTAZIONI_INIZIALI = [
  // Titolo grande dell'app; il nome della biblioteca compare sotto, come spiegazione.
  ['Titolo', 'Lupus in Libris'],
  ['Nome biblioteca', 'Biblioteca I.C. Almese'],
  ['Giorni di prestito', 30],
  ['Generi', 'Narrativa, Fiabe e favole, Avventura, Gialli, Fantasy, Fantascienza, Umorismo, Fumetti, Poesia, ' +
    'Albi illustrati, Storia, Scienze, Natura e animali, Geografia, Arte e musica, Sport, Lingue straniere, ' +
    'Divulgazione, Didattica, Altro'],
  ['Fasce', 'Infanzia, Primaria 1-2, Primaria 3-5, Secondaria, Adulti'],
  // Condizioni di prestito
  ['Libri per alunno', 2],
  ['Blocca chi ha ritardi', 'si'],
  ['Solo alunni degli elenchi', 'si'],
  // Indirizzo della pagina docs/index.html (pubblicata su https): abilita "Fotocamera dal vivo" nell'app.
  ['Indirizzo scanner', '']
];

/* ------------------------------------------------------------------ web app */

function doGet() {
  let titolo = 'Biblioteca';
  try {
    const imp = impostazioni_();
    titolo = imp.titolo ? imp.titolo + ' – ' + imp.nome : imp.nome;
  } catch (e) { /* database non ancora pronto */ }
  const pagina = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(titolo) // e' il nome che compare sulla scheda del browser
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
  // Dalla schermata Home si apre a tutto schermo, come un'app.
  ['mobile-web-app-capable', 'apple-mobile-web-app-capable'].forEach(nome => {
    try { pagina.addMetaTag(nome, 'yes'); } catch (e) { /* non ammesso: pazienza */ }
  });
  // Icona della scheda del browser e della schermata Home: Google vuole un indirizzo pubblico che finisca in .png.
  // Quella pubblicata con lo scanner (GitHub Pages) e' sempre raggiungibile; in alternativa la copia su Drive.
  const icona = PropertiesService.getScriptProperties().getProperty('ICONA_ID');
  const urlIcona = SCANNER_PREDEFINITO ? SCANNER_PREDEFINITO.replace(/\/?$/, '/') + 'icona.png'
    : (icona ? 'https://drive.google.com/thumbnail?id=' + icona + '&sz=s256&f=.png' : '');
  if (urlIcona) { try { pagina.setFaviconUrl(urlIcona); } catch (e) { /* indirizzo rifiutato: senza icona */ } }
  return pagina;
}

/**
 * Da lanciare dall'editor (menu Esegui): crea il Foglio "Biblioteca - Database" nella cartella Drive,
 * prepara i fogli e salva l'icona dell'app. Rilanciarla non cancella nulla.
 */
function installa() {
  const ss = db_();
  Logger.log('Database pronto: ' + ss.getUrl());
  const icona = preparaIcona_();
  if (icona) Logger.log('Icona: https://drive.google.com/file/d/' + icona + '/view');
  return ss.getUrl();
}

/** Salva icona (Icona.gs) come PNG nella cartella della biblioteca, leggibile col link, per la favicon. */
function preparaIcona_() {
  if (typeof ICONA_PNG_BASE64 === 'undefined') return '';
  const props = PropertiesService.getScriptProperties();
  const vecchia = props.getProperty('ICONA_ID');
  if (vecchia) {
    try {
      const f = DriveApp.getFileById(vecchia);
      if (!f.isTrashed() && f.getSize() === Utilities.base64Decode(ICONA_PNG_BASE64).length) return vecchia;
      f.setTrashed(true); // icona cambiata: si rimette quella nuova
    } catch (e) { /* cancellata a mano: si ricrea */ }
  }
  const file = DriveApp.getFolderById(CARTELLA_ID)
    .createFile(Utilities.newBlob(Utilities.base64Decode(ICONA_PNG_BASE64), 'image/png', 'Biblioteca - icona.png'));
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    try {
      file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e2) {
      Logger.log('Non riesco a condividere l\'icona col link: ' + e2.message);
    }
  }
  props.setProperty('ICONA_ID', file.getId());
  return file.getId();
}

/* ------------------------------------------------------------------ chiamate dall'app */

/** Tutto quello che serve all'app: utente, impostazioni, catalogo e (per i bibliotecari) prestiti. */
function carica(rileggiElenchi) {
  const utente = utente_();
  const prestiti = leggi_('Prestiti');
  // Per il catalogo servono solo numeri, non nomi: copie fuori, quante volte e' stato letto, primo rientro previsto.
  const fuori = {}, letture = {}, rientro = {};
  prestiti.forEach(p => {
    letture[p.libroId] = (letture[p.libroId] || 0) + 1;
    if (p.restituitoIl) return;
    fuori[p.libroId] = (fuori[p.libroId] || 0) + 1;
    const s = String(p.scadenza || '');
    if (s && (!rientro[p.libroId] || s < rientro[p.libroId])) rientro[p.libroId] = s;
  });
  const libri = leggi_('Libri').map(l => {
    l.isbn = String(l.isbn);
    l.copie = Math.max(1, parseInt(l.copie, 10) || 1);
    l.inPrestito = fuori[l.id] || 0;
    l.disponibili = Math.max(0, l.copie - l.inPrestito);
    l.letture = letture[l.id] || 0;
    l.rientro = l.disponibili ? '' : (rientro[l.id] || '');
    return l;
  });
  let indirizzoApp = '';
  try { indirizzoApp = ScriptApp.getService().getUrl() || ''; } catch (e) { /* senza deployment */ }
  const stato = { utente: utente, impostazioni: impostazioni_(), oggi: oggi_(), libri: libri, indirizzoApp: indirizzoApp };
  if (utente.ruolo === 'bibliotecario') {
    const attivi = prestiti.filter(p => !p.restituitoIl);
    const chiusi = prestiti.filter(p => p.restituitoIl).slice(-400);
    stato.prestiti = attivi.concat(chiusi);
    stato.dbUrl = db_().getUrl();
    stato.alunni = alunni_(rileggiElenchi);
  }
  return pulisci_(stato);
}

/** Nuovo libro (senza id) o modifica (con id). */
function salvaLibro(dati) {
  richiediBibliotecario_();
  return conBlocco_(() => {
    const titolo = testo_(dati.titolo);
    if (!titolo) throw new Error('Manca il titolo.');
    const isbn = String(dati.isbn || '').toUpperCase().replace(/[^0-9X]/g, '');
    const libri = leggi_('Libri');
    const doppio = isbn && libri.find(l => String(l.isbn) === isbn && l.id !== dati.id);
    if (doppio) throw new Error('Questo ISBN e\' gia\' in catalogo: "' + doppio.titolo + '". Aumenta le copie di quello.');
    const campi = {
      isbn: isbn, titolo: titolo, autori: testo_(dati.autori), editore: testo_(dati.editore),
      anno: testo_(dati.anno), pagine: testo_(dati.pagine), genere: testo_(dati.genere), fascia: testo_(dati.fascia),
      collocazione: testo_(dati.collocazione), copie: Math.max(1, parseInt(dati.copie, 10) || 1),
      copertina: testo_(dati.copertina), descrizione: testo_(dati.descrizione), note: testo_(dati.note)
    };
    if (dati.id) {
      const libro = libri.find(l => l.id === dati.id);
      if (!libro) throw new Error('Libro non trovato: forse e\' stato eliminato.');
      const fuori = leggi_('Prestiti').filter(p => p.libroId === libro.id && !p.restituitoIl).length;
      if (campi.copie < fuori) throw new Error('Ci sono ' + fuori + ' copie in prestito: non puoi scendere sotto.');
      Object.assign(libro, campi);
      aggiorna_('Libri', libro);
    } else {
      aggiungi_('Libri', Object.assign({ id: nuovoId_('L'), inseritoIl: oggi_(), inseritoDa: utente_().email }, campi));
    }
    return carica();
  });
}

function eliminaLibro(id) {
  richiediBibliotecario_();
  return conBlocco_(() => {
    const libro = leggi_('Libri').find(l => l.id === id);
    if (!libro) throw new Error('Libro non trovato.');
    if (leggi_('Prestiti').some(p => p.libroId === id && !p.restituitoIl)) {
      throw new Error('Il libro e\' in prestito: registra prima la restituzione.');
    }
    foglio_('Libri').deleteRow(libro._riga);
    return carica();
  });
}

/**
 * dati: { libroId, lettore, classe, giorni, note, esterno }
 * esterno = chi non e' negli elenchi degli alunni (docenti, personale): niente limite di libri.
 */
function presta(dati) {
  richiediBibliotecario_();
  return conBlocco_(() => {
    let lettore = testo_(dati.lettore);
    let classe = testo_(dati.classe).toUpperCase();
    if (!lettore) throw new Error('Scrivi il nome di chi prende il libro.');
    const libro = leggi_('Libri').find(l => l.id === dati.libroId);
    if (!libro) throw new Error('Libro non trovato.');
    const attivi = leggi_('Prestiti').filter(p => !p.restituitoIl);
    if (attivi.filter(p => p.libroId === libro.id).length >= (parseInt(libro.copie, 10) || 1)) {
      throw new Error('Nessuna copia disponibile di questo libro.');
    }
    const imp = impostazioni_();
    const oggi = oggi_();
    const esterno = dati.esterno === true || dati.esterno === 'on' || dati.esterno === 'true';
    if (!esterno) {
      const alunno = trovaAlunno_(lettore, classe);
      if (alunno) {
        lettore = alunno.n;
        classe = alunno.c || classe;
      } else if (imp.soloElenchi) {
        throw new Error(lettore + (classe ? ' (' + classe + ')' : '') + ' non e\' negli elenchi degli alunni. ' +
          'Controlla il nome oppure segna "Non e\' un alunno".');
      }
    }
    const suoi = attivi.filter(p => stessoNome_(p.lettore, lettore));
    const ritardi = suoi.filter(p => p.scadenza < oggi);
    if (imp.bloccaRitardi && ritardi.length) {
      throw new Error(lettore + ' deve ancora restituire "' + ritardi[0].titolo + '" (scaduto il ' +
        ritardi[0].scadenza.split('-').reverse().join('/') + ').');
    }
    if (!esterno && imp.libriPerAlunno > 0 && suoi.length >= imp.libriPerAlunno) {
      throw new Error(lettore + ' ha gia\' ' + suoi.length + ' libri in prestito (massimo ' + imp.libriPerAlunno + ').');
    }
    const giorni = parseInt(dati.giorni, 10) || imp.giorniPrestito;
    aggiungi_('Prestiti', {
      id: nuovoId_('P'), libroId: libro.id, isbn: String(libro.isbn), titolo: libro.titolo, lettore: lettore,
      classe: classe, prestatoIl: oggi, scadenza: piuGiorni_(oggi, giorni),
      restituitoIl: '', note: testo_(dati.note), registratoDa: utente_().email
    });
    return carica();
  });
}

function restituisci(prestitoId) {
  richiediBibliotecario_();
  return conBlocco_(() => {
    const p = leggi_('Prestiti').find(x => x.id === prestitoId);
    if (!p) throw new Error('Prestito non trovato.');
    if (!p.restituitoIl) {
      p.restituitoIl = oggi_();
      aggiorna_('Prestiti', p);
    }
    return carica();
  });
}

function proroga(prestitoId, giorni) {
  richiediBibliotecario_();
  return conBlocco_(() => {
    const p = leggi_('Prestiti').find(x => x.id === prestitoId);
    if (!p || p.restituitoIl) throw new Error('Prestito non trovato o gia\' chiuso.');
    const oggi = oggi_();
    const base = p.scadenza > oggi ? p.scadenza : oggi;
    p.scadenza = piuGiorni_(base, parseInt(giorni, 10) || impostazioni_().giorniPrestito);
    aggiorna_('Prestiti', p);
    return carica();
  });
}

/** Ricerca dei dati di un ISBN fatta dal server, se dal browser non si riesce. */
function cercaOnline(isbn) {
  isbn = String(isbn || '').toUpperCase().replace(/[^0-9X]/g, '');
  const prendi = url => {
    try {
      const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      return r.getResponseCode() === 200 ? r.getContentText() : '';
    } catch (e) {
      return '';
    }
  };
  return {
    google: prendi('https://www.googleapis.com/books/v1/volumes?q=isbn:' + isbn),
    openlibrary: prendi('https://openlibrary.org/api/books?bibkeys=ISBN:' + isbn + '&format=json&jscmd=data'),
    // Catalogo nazionale delle biblioteche italiane (SBN): conosce quasi tutti i libri italiani.
    sbn: prendi('https://opac.sbn.it/opacmobilegw/search.json?isbn=' + isbn)
  };
}

/* ------------------------------------------------------------------ database */

let ss_ = null;

function db_() {
  if (ss_) return ss_;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('DB_ID');
  if (id) {
    try { ss_ = SpreadsheetApp.openById(id); } catch (e) { ss_ = null; }
  }
  if (!ss_) {
    // Script collegato a un Foglio (Estensioni > Apps Script): usa quel Foglio.
    ss_ = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss_) {
      ss_ = SpreadsheetApp.create(NOME_DB);
      DriveApp.getFileById(ss_.getId()).moveTo(DriveApp.getFolderById(CARTELLA_ID));
    }
    props.setProperty('DB_ID', ss_.getId());
  }
  preparaFogli_(ss_);
  return ss_;
}

function preparaFogli_(ss) {
  Object.keys(COLONNE).forEach(nome => {
    let sh = ss.getSheetByName(nome);
    if (!sh) sh = ss.insertSheet(nome);
    if (sh.getLastRow() > 0) {
      // Database creato da una versione precedente: aggiunge le impostazioni nuove.
      if (nome === 'Impostazioni') {
        const ci = sh.getDataRange().getValues().map(r => String(r[0]).trim().toLowerCase());
        IMPOSTAZIONI_INIZIALI.filter(i => ci.indexOf(i[0].toLowerCase()) < 0).forEach(i => sh.appendRow(i));
      }
      return;
    }
    const intest = COLONNE[nome].map(c => c[1]);
    sh.getRange(1, 1, 1, intest.length).setValues([intest]).setFontWeight('bold');
    sh.setFrozenRows(1);
    (COLONNE_TESTO[nome] || []).forEach(k => {
      const col = lettera_(COLONNE[nome].findIndex(c => c[0] === k) + 1);
      sh.getRange(col + '2:' + col).setNumberFormat('@');
    });
    if (nome === 'Impostazioni') {
      sh.getRange(2, 1, IMPOSTAZIONI_INIZIALI.length, 2).setValues(IMPOSTAZIONI_INIZIALI);
    }
  });
  // Il foglio vuoto che Google crea insieme al file non serve.
  const primo = ss.getSheets()[0];
  if (ss.getSheets().length > Object.keys(COLONNE).length && !COLONNE[primo.getName()] && primo.getLastRow() === 0) {
    ss.deleteSheet(primo);
  }
}

function foglio_(nome) {
  return db_().getSheetByName(nome);
}

/** Righe del foglio come oggetti; _riga e' il numero di riga nel Foglio. */
function leggi_(nome) {
  const valori = foglio_(nome).getDataRange().getValues();
  const colonne = COLONNE[nome];
  const out = [];
  for (let r = 1; r < valori.length; r++) {
    const riga = valori[r];
    if (riga.every(v => v === '' || v === null)) continue;
    const o = { _riga: r + 1 };
    colonne.forEach((c, i) => { o[c[0]] = valore_(riga[i]); });
    out.push(o);
  }
  return out;
}

function riga_(nome, o) {
  return COLONNE[nome].map(c => (o[c[0]] === undefined || o[c[0]] === null ? '' : o[c[0]]));
}

function aggiungi_(nome, o) {
  foglio_(nome).appendRow(riga_(nome, o));
}

function aggiorna_(nome, o) {
  foglio_(nome).getRange(o._riga, 1, 1, COLONNE[nome].length).setValues([riga_(nome, o)]);
}

function impostazioni_() {
  const mappa = {};
  leggi_('Impostazioni').forEach(r => { mappa[String(r.chiave).trim().toLowerCase()] = r.valore; });
  const elenco = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
  const si = (v, predefinito) => (v === undefined || v === '' ? predefinito : /^(s|y|v|1)/i.test(String(v).trim()));
  const libri = parseInt(mappa['libri per alunno'], 10);
  return {
    titolo: String(mappa['titolo'] || 'Lupus in Libris'),
    nome: String(mappa['nome biblioteca'] || 'Biblioteca'),
    giorniPrestito: parseInt(mappa['giorni di prestito'], 10) || 30,
    generi: elenco(mappa['generi']),
    fasce: elenco(mappa['fasce']),
    libriPerAlunno: isNaN(libri) ? 2 : libri, // 0 = nessun limite
    bloccaRitardi: si(mappa['blocca chi ha ritardi'], true),
    soloElenchi: si(mappa['solo alunni degli elenchi'], true),
    scanner: String(mappa['indirizzo scanner'] || SCANNER_PREDEFINITO).trim()
  };
}

/* ------------------------------------------------------------------ elenchi alunni */

/**
 * Legge tutti i Fogli Google della cartella ELENCHI (tutte le schede) e restituisce
 * [{ n: 'Cognome Nome', c: '3B' }]. Le colonne si riconoscono dall'intestazione:
 * Cognome + Nome oppure Alunno/Nominativo, e Classe (+ Sezione). Se manca la classe,
 * vale il nome della scheda quando e' del tipo "3B". Tenuto in cache per 30 minuti.
 */
function alunni_(rileggi) {
  const cache = CacheService.getScriptCache();
  if (!rileggi) {
    const c = cache.get('alunni-v2');
    if (c) return JSON.parse(c);
  }
  const elenco = [];
  try {
    const cartelle = DriveApp.getFolderById(CARTELLA_ID).getFoldersByName(NOME_CARTELLA_ELENCHI);
    if (cartelle.hasNext()) {
      const file = cartelle.next().getFilesByType(MimeType.GOOGLE_SHEETS);
      while (file.hasNext()) {
        SpreadsheetApp.openById(file.next().getId()).getSheets().forEach(sh => {
          leggiElenco_(sh.getDataRange().getDisplayValues(), sh.getName()).forEach(a => elenco.push(a));
        });
      }
    }
  } catch (e) {
    Logger.log('Elenchi alunni non letti: ' + e.message);
  }
  const visti = {};
  const unici = elenco.filter(a => { const k = a.n + '|' + a.c; if (visti[k]) return false; visti[k] = true; return true; })
    .sort((a, b) => a.n.localeCompare(b.n, 'it'));
  try { cache.put('alunni-v2', JSON.stringify(unici), 1800); } catch (e) { /* elenco troppo grande per la cache */ }
  return unici;
}

function stessoNome_(a, b) {
  const n = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  return n(a) === n(b);
}

/** Cerca nell'anagrafica: stesso nome (anche con cognome e nome invertiti), e stessa classe se indicata. */
function trovaAlunno_(nome, classe) {
  const parole = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z']+/).filter(Boolean).sort().join(' ');
  const cercato = parole(nome);
  const trovati = alunni_().filter(a => parole(a.n) === cercato);
  return trovati.find(a => !classe || a.c === classe) || (trovati.length === 1 ? trovati[0] : null);
}

function leggiElenco_(valori, nomeScheda) {
  const norm = v => String(v || '').trim().toLowerCase();
  let h = -1, cCognome = -1, cNome = -1, cAlunno = -1, cClasse = -1, cSezione = -1;
  for (let r = 0; r < Math.min(10, valori.length) && h < 0; r++) {
    const t = valori[r].map(norm);
    cCognome = t.findIndex(x => /^cognome$|^cognome\s*alunn/.test(x));
    cNome = t.findIndex(x => /^nome$|^nome\s*alunn/.test(x));
    // solo celle brevi: "Elenco alunni a.s. 2026/27" e' un titolo, non un'intestazione
    cAlunno = t.findIndex(x => x.length <= 25 && /^(alunn|student|nominativo|cognome\s*e\s*nome)/.test(x));
    // "Classe", "Anno di corso" oppure le abbreviazioni CL / CL. / CLS / ANNO
    cClasse = t.findIndex(x => /^classe|^anno\s*di\s*corso|^(cl\.?|cls|anno)$/.test(x));
    cSezione = t.findIndex(x => /^sez/.test(x));
    if (cCognome >= 0 || cAlunno >= 0) h = r;
  }
  if (h < 0) return [];
  const classeScheda = /^\s*\d\s*[a-z]{1,2}\s*$/i.test(nomeScheda) ? nomeScheda.replace(/\s+/g, '').toUpperCase() : '';
  const out = [];
  for (let r = h + 1; r < valori.length; r++) {
    const v = valori[r];
    const nome = (cCognome >= 0 ? [v[cCognome], cNome >= 0 ? v[cNome] : ''].join(' ') : String(v[cAlunno] || ''))
      .replace(/\s+/g, ' ').trim();
    if (!nome) continue;
    const romani = { I: '1', II: '2', III: '3', IV: '4', V: '5' };
    let anno = cClasse >= 0 ? String(v[cClasse] || '').trim().toUpperCase() : '';
    anno = anno.replace(/^(I{1,3}|IV|V)(?![A-Z])/, r => romani[r]);
    // Classe e sezione in colonne separate (2 + D) diventano "2D"; se la classe contiene gia' la sezione non si ripete.
    const sez = cSezione >= 0 ? String(v[cSezione] || '').trim().toUpperCase() : '';
    let classe = sez && anno.replace(/\s+/g, '').endsWith(sez) ? anno : anno + sez;
    classe = classe.replace(/[\s^°ª.\-]/g, '').toUpperCase() || classeScheda;
    out.push({ n: nome, c: classe });
  }
  return out;
}

/* ------------------------------------------------------------------ utenti */

/**
 * Il proprietario dello script e chi e' nel foglio Utenti con ruolo "bibliotecario" gestiscono
 * catalogo e prestiti; tutti gli altri consultano il catalogo.
 */
function utente_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const proprietario = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  let ruolo = email && email === proprietario ? 'bibliotecario' : 'lettore';
  let nome = '';
  const u = email ? leggi_('Utenti').find(x => String(x.email).trim().toLowerCase() === email) : null;
  if (u) {
    nome = String(u.nome || '');
    if (/bibliotec|ammin|admin/i.test(String(u.ruolo))) ruolo = 'bibliotecario';
  }
  return { email: email, nome: nome || (email ? email.split('@')[0] : 'ospite'), ruolo: ruolo };
}

function richiediBibliotecario_() {
  if (utente_().ruolo !== 'bibliotecario') throw new Error('Solo i bibliotecari possono farlo.');
}

/* ------------------------------------------------------------------ aiuti */

function conBlocco_(fn) {
  const blocco = LockService.getScriptLock();
  blocco.waitLock(20000);
  try {
    return fn();
  } finally {
    blocco.releaseLock();
  }
}

function oggi_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/** 'aaaa-mm-gg' + n giorni, senza problemi di fuso orario. */
function piuGiorni_(iso, n) {
  const p = iso.split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10);
}

/** Date del Foglio -> 'aaaa-mm-gg' (anche se qualcuno scrive 6/10/2026 a mano). */
function valore_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const m = typeof v === 'string' && v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return v;
}

function testo_(v) {
  return String(v === undefined || v === null ? '' : v).trim();
}

function nuovoId_(prefisso) {
  return prefisso + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function lettera_(n) {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Toglie _riga e tutto cio' che google.script.run non sa trasmettere. */
function pulisci_(o) {
  return JSON.parse(JSON.stringify(o, (k, v) => (k === '_riga' ? undefined : v)));
}
