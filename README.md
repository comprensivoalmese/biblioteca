# Biblioteca scolastica – I.C. Almese

<img src="icona/icona.png" alt="Icona Biblioteca" width="96" align="right">

© 2026 Istituto Comprensivo di Almese ([www.comprensivoalmese.it](https://www.comprensivoalmese.it)) – sviluppata dal **Wolf Team** <img src="icona/wolf-team.png" alt="Wolf Team" width="28" valign="middle">.
**Tutti i diritti riservati**: il codice, anche in parte, si può usare solo con il permesso scritto della scuola,
che può concederlo in licenza a chi ne fa richiesta. Dettagli in [LICENZA.md](LICENZA.md).

App web per il catalogo e i prestiti della biblioteca: funziona su telefono, tablet e PC,
carica i libri leggendo il **codice a barre ISBN con la fotocamera**, prende titolo/autori/copertina
da internet (Google Libri e Open Library) e tiene i dati in un **Foglio Google** nella cartella Drive
BIBLIOTECA (Drive condiviso COMPRENSIVOALMESE).

È un progetto Google Apps Script: niente server da mantenere, l'app gira sull'account della scuola.

## File

| File | Cosa contiene |
|---|---|
| `Codice.gs` | Lato server: database, regole di prestito, lettura dell'anagrafica alunni |
| `Index.html` | L'app (grafica, catalogo, scanner, prestiti) |
| `appsscript.json` | Manifest (fuso orario, permessi, pubblicazione nel dominio) |
| `Icona.gs` | Icona dell'app in base64 (generata da `icona/crea-icona.ps1`) |
| `docs/` | Pagina autonoma con la **fotocamera dal vivo** (da pubblicare su https, vedi sotto) |
| `icona/` | Icona (lupo del Wolf Team in oro e pergamena) e script che crea `Icona.gs` |
| `LICENZA.md`, `LICENSE` | Titolarità e condizioni d'uso |
| `anteprima/` | Prova in locale senza Google (vedi in fondo) |

## Installazione (una volta, circa 10 minuti)

1. Vai su <https://script.google.com> con l'account che gestirà la biblioteca → **Nuovo progetto**.
   Rinominalo "Biblioteca".
2. Copia il contenuto di `Codice.gs` nel file `Codice.gs` dell'editor (sostituisci tutto).
3. **+** → **HTML** → chiamalo `Index` → incolla il contenuto di `Index.html`.
4. Impostazioni progetto (ingranaggio) → spunta "Mostra il file manifest appsscript.json" →
   torna all'editor e incolla il contenuto di `appsscript.json`.
5. Nel menu in alto scegli la funzione **installa** → **Esegui** → autorizza.
   Crea il Foglio **Biblioteca - Database** nella cartella BIBLIOTECA (il link compare nel registro).
6. **Esegui il deployment** → **Nuovo deployment** → tipo **App web**:
   - Esegui come: **Me**
   - Chi ha accesso: **Chiunque in comprensivoalmese.it**
   
   Copia l'URL che termina con `/exec`: è l'indirizzo dell'app.
7. Sui telefoni/tablet: apri l'URL e dal menu del browser **Aggiungi a schermata Home**.

Dopo una modifica al codice: **Gestisci deployment** → matita → Versione: **Nuova versione** → Esegui il deployment
(l'URL resta lo stesso).

## Chi può fare cosa

- **Bibliotecari**: chi ha installato lo script + chi è nel foglio **Utenti** con ruolo `bibliotecario`
  (colonne Email | Nome | Ruolo). Aggiungono/modificano libri, registrano prestiti e restituzioni,
  vedono l'anagrafica alunni.
- **Tutti gli altri** dell'istituto: consultano il catalogo e vedono se un libro è disponibile
  (non vedono chi ha i libri né gli elenchi degli alunni).

## Anagrafica alunni (cartella ELENCHI)

L'app legge **tutti i Fogli Google** nella sottocartella `ELENCHI` (tutte le schede).
Riconosce da sola le colonne guardando l'intestazione (anche se c'è un titolo nelle prime righe):

- **Cognome** + **Nome**, oppure una colonna **Alunno** / **Nominativo** / **Cognome e nome**;
- **Classe** (es. `3B`), oppure **Classe** + **Sezione** (`3` + `B`); se manca, vale il nome della scheda
  quando è del tipo `3B`.

L'elenco resta in memoria 30 minuti; dopo aver cambiato un file usa **Info → Rileggi gli elenchi**.
Se un giorno arrivano gli elenchi della primaria basta metterli nella stessa cartella.

## Condizioni di prestito (foglio Impostazioni)

| Chiave | Predefinito | Significato |
|---|---|---|
| Giorni di prestito | 30 | Durata proposta (modificabile per il singolo prestito); anche la proroga |
| Libri per alunno | 2 | Massimo di libri in mano contemporaneamente (0 = nessun limite) |
| Blocca chi ha ritardi | si | Niente nuovi prestiti finché non restituisce i libri scaduti |
| Solo alunni degli elenchi | si | Il nome deve essere nell'anagrafica; per docenti e personale si spunta "Non è un alunno" (nessun limite di libri) |
| Nome biblioteca, Generi, Fasce | | Titolo dell'app e voci dei menu (separate da virgole) |
| Indirizzo scanner | vuoto | Indirizzo https di `docs/index.html` per la fotocamera dal vivo |

Le regole le controlla il server: valgono anche se qualcuno usa una versione vecchia dell'app.

## Uso quotidiano

- **Nuovo libro**: Scansiona → inquadra il codice a barre (quello che inizia con 978/979) →
  i dati arrivano da internet → scegli genere, fascia, scaffale → Aggiungi.
  Se il libro c'è già si apre la sua scheda: per una copia in più usa Modifica → Copie.
- **Prestito**: scansiona il libro → Presta → scrivi le prime lettere del cognome (o la classe, es. `2A`)
  e tocca il nome → Registra.
- **Restituzione**: scansiona il libro → Restituito (oppure dalla scheda Prestiti).
- Dentro la pagina di Google la fotocamera **dal vivo** non è permessa (la cornice di Apps Script non ha
  il permesso "camera"): senza la pagina scanner l'app usa **"Fotografa il codice a barre"**, che apre la
  fotocamera del tablet e legge il codice dalla foto. In alternativa scrivi l'ISBN o usa un lettore
  di codici a barre USB sul PC.

## Fotocamera dal vivo (pagina scanner)

La cartella `docs/` è una pagina web a sé, che sta **fuori da Google** e quindi può usare la fotocamera del
dispositivo (telefono, tablet, PC). Funziona così: nell'app tocchi **Fotocamera dal vivo** → si apre lo scanner →
appena legge un ISBN valido torni all'app, che apre la scheda del libro (o "Nuovo libro" per i bibliotecari).

1. Pubblica la cartella `docs/` su un indirizzo **https** (la fotocamera lo richiede), per esempio con GitHub Pages
   (Settings → Pages → cartella `/docs`, se il piano dell'organizzazione lo consente per i repo privati) o su
   qualsiasi sito della scuola. Il file `icona.png` deve restare accanto a `index.html`.
2. L'indirizzo predefinito è `https://comprensivoalmese.github.io/biblioteca/` (costante `SCANNER_PREDEFINITO` in
   `Codice.gs`). Per usarne un altro scrivilo nel foglio **Impostazioni**, riga **Indirizzo scanner**
   (la riga compare da sola dopo l'aggiornamento del codice).
3. Aggiorna il deployment (nuova versione). Fatto: nella scheda Scansiona compare **Fotocamera dal vivo**.

La pagina scanner torna solo a indirizzi `https://script.google.com/…`, non a siti qualsiasi, e non invia i dati
da nessuna parte: l'ISBN viaggia nell'indirizzo di ritorno verso la tua app, che ti chiede comunque di accedere.
Se la fotocamera viene negata o non c'è, si può scrivere l'ISBN nella pagina stessa.

## Icona

`icona/icona.svg` → `powershell -ExecutionPolicy Bypass -File icona\crea-icona.ps1` crea `icona/icona.png`
e `Icona.gs` (l'immagine in base64, da copiare nel progetto come file di script "Icona").
Eseguendo `installa` l'icona viene salvata nella cartella BIBLIOTECA, condivisa col link, e usata come
favicon e icona della schermata Home (Android/PC; Safari su iPad non la usa).

## Prova in locale (senza Google)

```
powershell -ExecutionPolicy Bypass -File anteprima\prepara.ps1
```

poi apri `anteprima\index.html` nel browser. Un finto Apps Script (`anteprima/finto-gas.js`) fa girare
il vero `Codice.gs` con dati inventati. Parametri: `?azzera` (ricomincia), `?prove` (13 prove automatiche
delle regole, esito nella console), `?utente=nome@scuola.test` (vista di chi consulta).

## Licenza

© 2026 Istituto Comprensivo di Almese – sviluppata dal Wolf Team. Tutti i diritti riservati; licenza su richiesta:
vedi [LICENZA.md](LICENZA.md).
