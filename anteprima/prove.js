/* Prove delle regole del server. Si attivano con  index.html?azzera&prove  ; esito nella console e nel titolo. */
(function () {
  if (!new URLSearchParams(location.search).has('prove')) return;
  const esiti = [];
  const prova = (nome, fn) => { try { fn(); esiti.push('OK   ' + nome); } catch (e) { esiti.push('FALLITA ' + nome + ': ' + e.message); } };
  const vero = (c, msg) => { if (!c) throw new Error(msg || 'atteso vero'); };
  const errore = (fn, testo) => {
    try { fn(); } catch (e) { vero(e.message.includes(testo), 'messaggio diverso: ' + e.message); return; }
    throw new Error('doveva dare errore: ' + testo);
  };
  const st = () => carica();
  const libro = t => st().libri.find(l => l.titolo === t);

  prova('anagrafica letta da ELENCHI', () => {
    const a = st().alunni;
    vero(a.length === 6, 'alunni: ' + a.length);
    vero(a.some(x => x.n === 'Bianchi Marta' && x.c === '2A'), JSON.stringify(a[0]));
    vero(a.some(x => x.n === 'Verdi Giorgio' && x.c === '2A'), 'classe in numeri romani non convertita');
  });
  prova('elenchi con intestazioni CL e SEZ (classe e sezione separate)', () => {
    const a = leggiElenco_([['COGNOME', 'NOME', 'CL', 'SEZ'], ['Neri', 'Ada', '2', 'D'], ['Blu', 'Ugo', '3D', 'D'], ['Gialli', 'Ivo', 'II', 'b']], 'Foglio1');
    vero(a.length === 3 && a[0].c === '2D' && a[1].c === '3D' && a[2].c === '2B', JSON.stringify(a));
  });
  prova('nome invertito riconosciuto e normalizzato', () => {
    const p = st().prestiti.find(x => x.titolo === 'Draghi di montagna');
    vero(p.lettore === 'Bianchi Marta' && p.classe === '2A', p.lettore + ' ' + p.classe);
  });
  prova('chi e\' in ritardo non puo\' prendere libri', () =>
    errore(() => presta({ libroId: libro('Piccolo atlante delle stelle').id, lettore: 'Luca Rossi' }), 'deve ancora restituire'));
  prova('chi non e\' negli elenchi viene respinto', () =>
    errore(() => presta({ libroId: libro('Piccolo atlante delle stelle').id, lettore: 'Mario Inventato' }), 'non e\' negli elenchi'));
  prova('omonimi: la classe distingue', () => {
    vero(trovaAlunno_('Rossi Lucia', '1A').c === '1A');
    vero(trovaAlunno_('Rossi Lucia', '').n === 'Rossi Lucia');
  });
  prova('limite di 2 libri per alunno', () => {
    presta({ libroId: libro('Piccolo atlante delle stelle').id, lettore: 'Marta Bianchi' });
    errore(() => presta({ libroId: libro('La gatta che sapeva contare').id, lettore: 'Bianchi Marta' }), 'massimo 2');
  });
  prova('docente (non alunno) senza limite', () => {
    presta({ libroId: libro('La gatta che sapeva contare').id, lettore: 'Prof. Gallo', esterno: true });
    presta({ libroId: libro('Viaggio al centro del bosco').id, lettore: 'Prof. Gallo', esterno: true });
    vero(st().prestiti.filter(p => p.lettore === 'Prof. Gallo' && !p.restituitoIl).length === 3);
  });
  prova('nessuna copia disponibile', () =>
    errore(() => presta({ libroId: libro('Viaggio al centro del bosco').id, lettore: 'Verdi Giorgio' }), 'Nessuna copia'));
  prova('restituzione sblocca chi era in ritardo', () => {
    const p = st().prestiti.find(x => x.lettore === 'Rossi Luca' && !x.restituitoIl);
    restituisci(p.id);
    presta({ libroId: libro('Il giardino dei sussurri').id, lettore: 'Luca Rossi' });
  });
  prova('proroga sposta la scadenza', () => {
    const p = st().prestiti.find(x => x.lettore === 'Tosco Sofia' && !x.restituitoIl);
    proroga(p.id, 30);
    const q = st().prestiti.find(x => x.id === p.id);
    vero(q.scadenza > p.scadenza, p.scadenza + ' -> ' + q.scadenza);
  });
  prova('ISBN doppio respinto', () => {
    const l = libro('Draghi di montagna');
    errore(() => salvaLibro({ isbn: l.isbn, titolo: 'Copia' }), 'gia\' in catalogo');
  });
  prova('modifica copie ed eliminazione', () => {
    const l = libro('Draghi di montagna');
    salvaLibro(Object.assign({}, l, { copie: 1 }));
    vero(libro('Draghi di montagna').disponibili === 0);
    errore(() => eliminaLibro(l.id), 'e\' in prestito');
    eliminaLibro(libro('Il mistero della campanella').id);
    vero(!libro('Il mistero della campanella'));
  });
  prova('un lettore non puo\' prestare', () => {
    const vecchio = Session.getActiveUser;
    Session.getActiveUser = () => ({ getEmail: () => 'alunno@scuola.test' });
    try {
      vero(st().utente.ruolo === 'lettore' && !st().prestiti && !st().alunni, 'il lettore vede prestiti o alunni');
      errore(() => presta({ libroId: libro('Draghi di montagna').id, lettore: 'Verdi Giorgio' }), 'Solo i bibliotecari');
    } finally { Session.getActiveUser = vecchio; }
  });
  const ko = esiti.filter(e => e.startsWith('FALLITA')).length;
  console.log('PROVE\n' + esiti.join('\n'));
  document.title = ko ? 'PROVE FALLITE ' + ko : 'PROVE OK ' + esiti.length;
  window.ESITI_PROVE = esiti;
})();
