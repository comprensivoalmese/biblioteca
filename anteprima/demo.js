/* Dati di esempio per l'anteprima (solo la prima volta). Gli ISBN sono inventati (con cifra di controllo valida). */
(function () {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('DEMO')) return;
  installa();
  const isbn = base => { let s = 0; for (let i = 0; i < 12; i++) s += +base[i] * (i % 2 ? 3 : 1); return base + ((10 - s % 10) % 10); };
  const libri = [
    ['Il giardino dei sussurri', 'Lucia Ferri', 'Edizioni Esempio', 2019, 'Narrativa', 'Primaria 3-5', 'A1', 2],
    ['Viaggio al centro del bosco', 'Marco Pini', 'Edizioni Esempio', 2021, 'Avventura', 'Primaria 3-5', 'A2', 1],
    ['Il mistero della campanella', 'Sara Conti', 'Gialli Junior', 2018, 'Gialli', 'Secondaria', 'B1', 1],
    ['Draghi di montagna', 'Paolo Neri', 'Fantastica', 2022, 'Fantasy', 'Secondaria', 'B2', 3],
    ['Piccolo atlante delle stelle', 'Giulia Rossi', 'Scienza Facile', 2020, 'Scienze', 'Primaria 3-5', 'C1', 1],
    ['La gatta che sapeva contare', 'Anna Bruni', 'Albi Belli', 2017, 'Albi illustrati', 'Infanzia', 'D1', 2],
    ['Storie della Val di Susa', 'AA.VV.', 'Editrice Locale', 2015, 'Storia', 'Adulti', 'E1', 1]
  ];
  libri.forEach((l, i) => salvaLibro({ isbn: isbn('97912999000' + i), titolo: l[0], autori: l[1], editore: l[2], anno: l[3], genere: l[4], fascia: l[5], collocazione: l[6], copie: l[7] }));
  const id = t => carica().libri.find(l => l.titolo === t).id;
  presta({ libroId: id('Draghi di montagna'), lettore: 'Marta Bianchi', giorni: 30 });
  presta({ libroId: id('Il mistero della campanella'), lettore: 'Rossi Luca', classe: '3B', giorni: -4 });
  presta({ libroId: id('Il giardino dei sussurri'), lettore: 'Sofia Tosco', giorni: 2 });
  presta({ libroId: id('Storie della Val di Susa'), lettore: 'Prof. Gallo', esterno: true, giorni: 60 });
  props.setProperty('DEMO', '1');
})();
