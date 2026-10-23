# DJ KIST — contesto per riprendere il lavoro in locale

Aggiornato il 23 ottobre 2026. Documento di passaggio dalla chat che ha sviluppato la **stanza segreta** al progetto locale. Leggere questo file prima di proporre o modificare qualcosa; poi verificare sempre il codice corrente e gli eventuali cambiamenti successivi.

## Ripartenza rapida

- Repository canonico: <https://github.com/dobrogeanuedward/djkist>
- Sito pubblico: <https://www.djkist.it/>
- Stanza segreta pubblica: <https://www.djkist.it/#b-side>
- Branch di lavoro/pubblicazione esistente: `main`, collegato all'auto-deploy Vercel. Conservare questa infrastruttura.
- Ultimo commit applicativo verificato durante questo passaggio: `588059dca9d37525587dddedb3be98829467acb2`, «Rename the secret-room invitation and headline». Il commit che aggiunge questo documento è successivo e non cambia l'applicazione.
- Stack: Astro 5, TypeScript, CSS, Web Audio API nativa; `three` presente per le altre esperienze del sito. Node 22 in CI.
- Nessun backend/account/servizio di generazione audio richiesto dalla stanza segreta. Sorgenti e asset usati dall'app sono nel repository; non occorre recuperare i file temporanei della vecchia chat per avviarla.

Per un checkout nuovo, usare la propria autenticazione GitHub già configurata:

```bash
git clone https://github.com/dobrogeanuedward/djkist.git
cd djkist
npm ci
npm run dev -- --host 0.0.0.0
```

Per un checkout esistente, controllare prima `git status`, remote e branch. Non sovrascrivere modifiche locali. Aggiornare da `origin/main` in modo coerente con lo stato trovato. Aprire `http://localhost:4321/#b-side` per la stanza. Build: `npm run build`; anteprima build: `npm run preview`.

Il vecchio `README.md` contiene cronologia ormai parzialmente superata (ad esempio riferimenti a vecchi componenti, pause scena e voce «Mondo KIST»). Per lo stato del 23 ottobre prevalgono questo contesto e il codice corrente. Non ripristinare quelle vecchie soluzioni seguendo il README alla lettera. Al momento del passaggio non risultavano file `AGENTS.md` nel tree remoto: controllare di nuovo nel checkout locale e rispettare eventuali istruzioni aggiunte dopo.

## Che cosa vuole l'utente

Il sito è il portfolio di DJ KIST, Bologna. La stanza segreta è un easter egg musicale che deve sorprendere, essere riconoscibilmente suo e risultare semplicissimo da usare anche su telefono. L'utente vuole risultati musicalmente credibili, molta creatività e scelta, profondità dietro un'interfaccia immediata. Non basta un compositore generico con il logo sopra: deve avvicinarsi davvero al suo sound e al suo modo di costruire un set.

Direzione approvata: identità KIST, verde acido ben presente insieme a viola, rosa e ciano; atmosfera notturna, personaggio arcade piccolo e riconoscibile, Bologna, fotografie vere. Evolvere il lavoro approvato, senza sostituirlo con componenti anonimi o perdere i dettagli. Particolare attenzione a proporzioni, leggibilità, ritmo della pagina, accessibilità, audio e performance su tutti i dispositivi.

Copy finale richiesto dall'utente e già pubblicato:

- Ingresso: **«Scopri la stanza segreta»**.
- Titolo: **«Il tuo mix, nel mio stile»** (su due righe).
- Rimosse le precedenti diciture «Il tuo lato B» come titolo e «Il lato B ti aspetta» al ritorno.
- Il termine tecnico `bside`, l'hash `#b-side` e alcuni piccoli dettagli interni «lato B» restano nel codice: la richiesta precedente non era una rinomina globale di API, hash e classi.

**Confine della richiesta che ha prodotto questo documento:** preparare il contesto per una chat locale; nessuna nuova modifica funzionale o sonora richiesta in questa fase. L'ultimo messaggio su «Un altro mondo. Ogni volta.» e l'alternanza chiaro/scuro riguardava un altro progetto ed è stato esplicitamente annullato. Non applicarlo a DJ KIST e non modificare DOGO.

## Stato implementato della stanza segreta

È un vero strumento browser, non un mockup. Un `<dialog>` nativo contiene uno studio scenografico e una groovebox funzionante.

### Studio e interazione

- Parete/logo KIST, finestra su una Bologna stilizzata, luna, diffusori, console, giradischi/vinili e LED realizzati con HTML/CSS/SVG.
- Sprite KIST esistente in posa mix, sincronizzato allo stato della stanza.
- Foto girabile e pulsante luci rosa/viola; verde `#c9ff52` parte dell'identità dell'interfaccia.
- Apertura dalla pagina oppure direttamente con `#b-side`; apertura silenziosa, senza allocare subito un AudioContext.
- Suono avviato soltanto da un gesto dell'utente: play, pad o fill.
- Chiusura con X, Escape o area esterna; focus ripristinato all'elemento che aveva aperto la stanza e scroll della pagina bloccato dietro al dialog.
- Layout adattato da 320 px al desktop, sequencer in un'area che può scorrere e controlli touch più grandi; rispetto di `prefers-reduced-motion`.

### Strumento musicale

| Parte | Stato corrente |
| --- | --- |
| Voci | 9: cassa, rullante, hi-hat, percussioni, sub, acid, accordi, atmosfera, vocal |
| Pad | Touch/click e tasti 1–9; feedback visivo |
| Sequencer | 32 passi, organizzati in 2 battute da 16; step con velocity e mute per voce |
| Stili | UK garage 132 BPM, Breakbeat 138, Jungle 164, Drum & bass 172, Acid techno 140 |
| Momenti | Warm up, Groove, Peak time, Afterhours |
| Controlli | BPM 110–180, energia, spazio, filtro, swing 0–32%, tonalità minore |
| Espressione | Superficie XY filtro/eco, momentanea e utilizzabile anche da tastiera |
| Costruzione | Variazioni con seed, fill, annulla fino a 24 snapshot |
| Vocal | 3 timbri sintetizzati: Air / ah–oh, Club / hey–ya, Robot / e–o |
| Salvataggio | Esplicito sul browser, con «Salva qui»; non è autosave |
| Condivisione | URL che conserva la partitura con «Passa il groove» |
| Export | WAV reale stereo PCM 16 bit, 44,1 kHz, 8 battute |

Le sequenze sono originali e generate in modo deterministico dal seed: comprendono accenti, ghost note, densità e arrangiamenti distinti. Cambio di stile/scena durante il playback accodato al prossimo ciclo di 32 passi; feedback «Al prossimo giro». I parametri e i mute si aggiornano attraverso il motore.

I vocal sono sintesi a formanti nel motore Web Audio. Non sono registrazioni di KIST, voice cloning, sintesi vocale del sistema o campioni estratti dai suoi set.

Il motore usa scheduling con lookahead: timer ogni 25 ms e orizzonte di 100 ms. Stessa rete sonora per live ed export offline: filtro master, compressione, saturazione, ducking delle parti melodiche, eco e riverbero a convoluzione. L'AudioContext viene riusato; stop/chiusura/pagina nascosta interrompono scheduling e voci in modo controllato.

### Salvataggi, URL ed export: contratti da preservare

- Tipo `Session`, versione **2**, in `bside-presets.ts`.
- Chiave localStorage: `kist:bside:session:v2`; discovery: `kist:bside:found:v1`.
- `#b-side` apre la stanza; `#b-side=<base64url>` carica la partitura condivisa.
- Il codec conserva score/velocity (quantizzate a 8 bit nell'URL), mute, seed, stile, scena, BPM, swing, tonalità, energia, spazio, filtro e timbro vocal. Valida limiti/formato e rifiuta payload non validi.
- Se Clipboard API non disponibile, la condivisione mette il groove nell'URL corrente così si può copiare manualmente.
- Export con `OfflineAudioContext`: file reale, non un nome fittizio o una registrazione muta. Su iOS appare un link da toccare per scaricare, evitando di affidarsi al click automatico dopo un'operazione asincrona.
- L'export rappresenta la **sessione programmata corrente**, non la registrazione della performance: non include i gesti XY transitori, i pad suonati manualmente o il fill eseguito dal vivo.
- Il motore ha `setVolume`, ma **la UI della stanza non espone attualmente un master volume**. Non confonderlo con il controllo volume del player SoundCloud.
- Se si evolve lo schema, mantenere migrazione o fallback sicuro per salvataggi e link v2 esistenti; non romperli senza una scelta esplicita.

### Rapporto con il player SoundCloud

`experience.ts` gestisce il player principale. La stanza comunica con eventi:

- `kist:bside-open`: chiude/sopprime l'invito musicale iniziale, anche per il deep link.
- `kist:bside-audio` con `detail.active`: prende/rilascia il controllo dell'audio.

Quando la stanza inizia a suonare, il player viene messo in pausa. Alla chiusura riprende soltanto se prima era in riproduzione e widget/URL sono ancora gli stessi; ci sono protezioni contro eventi PLAY tardivi del provider. Aprire la stanza da sola non deve far partire audio. Chiudere la stanza non deve avviare un set che l'utente non stava ascoltando. Evitare due fonti sonore sovrapposte o widget SoundCloud duplicati.

## Mappa dei file

| File | Responsabilità |
| --- | --- |
| `src/components/BSide.astro` | Markup stanza, studio, controlli, titoli e integrazione sprite |
| `src/scripts/bside.ts` | Controller UI, lifecycle, preset/scene, undo, pad, XY, salvataggio, link ed export |
| `src/scripts/bside-audio.ts` | Sintesi, graph live/offline, scheduler, gestione voci, WAV |
| `src/scripts/bside-presets.ts` | Tipi, canali, stili, scene, pattern, seed, variazioni e sanitizzazione |
| `src/scripts/bside-session.ts` | Encode/decode compatto dei link condivisi |
| `src/styles/bside.css` | Base del dialog e della stanza scenografica |
| `src/styles/bside-lab.css` | Evoluzione groovebox e responsive, importata dopo la base |
| `src/scripts/experience.ts` | Player SoundCloud e bridge audio con la stanza |
| `src/components/KistSprite.astro`, `src/styles/sprites.css` | Personaggio condiviso col sito |
| `src/pages/index.astro` | Pagina principale e inserimento del componente BSide |
| `tests/bside-interactions.mjs` | Test stanza, audio, export, link e bridge player |
| `tests/player-interactions.mjs` | Interazioni del player principale |
| `tests/world-motion.mjs` | Corsa, scroll e lifecycle del mondo Bologna |
| `.github/workflows/bside.yml` | Suite stanza Chromium/WebKit |
| `.github/workflows/browser.yml` | Verifica generale responsive e flussi sito |
| `.github/workflows/player.yml`, `world-motion.yml`, `build.yml` | Suite specializzate e build |

Altri riferimenti utili: `src/data/artist.ts` per contenuti e link; `ASSET-SOURCES.md`, `asset-manifest.md` e `design/world-art-prompts.md` per provenienza degli asset. `RESEARCH.md` è anche cronologia: confrontarlo con la versione corrente.

Foto, loghi, sprite, livelli Bologna e video hero già utilizzati sono sotto `public/`; i video hero sono muti e non sono materiale utile all'analisi dei mix. Non servono nuovi download dalla vecchia chat per usare gli asset già integrati. Per i percorsi effettivi delle immagini della stanza, leggere `BSide.astro` e `KistSprite.astro` invece di inventare nomi.

## Punto ancora aperto: il sound autentico di KIST

L'utente ha chiesto di analizzare i suoi set, capirne mixing e sound, e rendere lo strumento estremamente fedele al suo stile. Ha chiesto i link e si è offerto di inviare il materiale audio. **Non è ancora arrivato un MP3/WAV dei set in questa chat.**

Sono stati forniti questi link:

- <https://soundcloud.com/benedetta-pasquariello/declinatio-electronica>
- <https://soundcloud.com/benedetta-pasquariello/thirtyteen>
- <https://soundcloud.com/benedetta-pasquariello/bipolar>
- Profilo: <https://soundcloud.com/benedetta-pasquariello>

Nella precedente sessione non è stato possibile ottenere e ascoltare direttamente gli stream SoundCloud o una tracklist verificata. La sessione Plug Radio/YouTube non ha fornito audio analizzabile. **Non è stato quindi analizzato il mixing reale, misurato il BPM dei suoi set o identificato con certezza i campioni che usa.**

I cinque stili e i timbri attuali sono una base originale ispirata ai generi dichiarati, non una replica provata dei suoi set. I BPM della tabella sono impostazioni del compositore, non misure delle tracce SoundCloud. Il titolo «Il tuo mix, nel mio stile» è il copy richiesto, non una prova di fedeltà sonora già raggiunta.

Passi consigliati quando arriverà il materiale (sono lavoro futuro, non già eseguito):

1. Ricevere MP3/WAV, anche un estratto significativo di 5–10 minuti; se più set, annotare provenienza e riferimento temporale.
2. Ascoltare davvero e produrre un profilo verificabile: andamento ritmico, tempi e mezzi tempi, swing, break, sub, timbri, uso vocal, densità, struttura delle frasi e passaggi tra energie. Separare misure, osservazioni d'ascolto e ipotesi.
3. Tradurre il profilo in nuovi kit/pattern/scelte di sintesi e arrangiamento. Non limitarsi a rinominare preset generici; confrontare il risultato con segmenti reali, anche nei passaggi.
4. Preferire sintesi originale per i suoni; per usare gli stessi sample chiedere le sorgenti riutilizzabili/autorizzate. L'accesso a un mix pubblico non dimostra la disponibilità delle singole tracce o dei campioni.
5. Validare ascolto ed export su cuffie, speaker piccoli e device reali, mantenendo l'uso semplice. Non promettere una DAW professionale solo perché i controlli sono numerosi.

Non affermare di aver ascoltato/replicato il suo sound in assenza di audio acquisito e analisi effettiva. Non usare snippet di metadati come sostituto dell'ascolto.

## Test: come riprodurli e cosa dimostrano

Il repository non ha uno script `npm test`. Playwright viene installato temporaneamente in CI e non è una dipendenza dichiarata in `package.json`. Dopo la build, avviare il server statico in un terminale separato:

```bash
npm ci
npm run build
npm install --no-save playwright
npx playwright install chrome
python3 -m http.server 4321 --directory dist
```

Lasciare il server attivo. In un altro terminale, nella root del progetto:

```bash
BSIDE_BROWSER=chromium node tests/bside-interactions.mjs
npx playwright install --with-deps webkit
BSIDE_BROWSER=webkit node tests/bside-interactions.mjs
```

Su Windows PowerShell impostare ad esempio `$env:BSIDE_BROWSER='webkit'` e poi eseguire `node tests/bside-interactions.mjs`. Il runner Chromium usa `channel: 'chrome'`: occorre Chrome installato, non basta il solo Chromium scaricato di default da Playwright. In Linux l'installazione delle dipendenze WebKit può richiedere privilegi del sistema; adeguare alla macchina locale.

`BASE_URL` può sostituire `http://127.0.0.1:4321`. Preferire una build locale per la suite: il test installa fixture SoundCloud e osserva Web Audio. Screenshot e WAV prodotti si trovano sotto `screenshots/bside`.

Verifiche della suite stanza:

- Viewport 320×740, 390×844 con profilo iPhone, 844×390 landscape, 1440×1000 desktop; overflow, chiusura raggiungibile e focus.
- Apertura silenziosa, riuso dell'AudioContext e stop effettivo alla chiusura/background.
- Stili, scene, cambio al confine di ciclo, entrambe le battute, mute, range, pad, variazioni, undo ed XY.
- Vocal sintetizzati senza `SpeechSynthesis`; su Chromium verifica tre WAV vocal distinti.
- Export WAV: intestazione e formato PCM reali, audio non silenzioso, RMS/peak/clipping controllati.
- Salvataggio/reload, share, hash incompleto/non valido e deep link semplice.
- Coordinamento col player, ripresa corretta e soppressione di PLAY tardivi; assenza di errori JS.

Questi test **non** provano la fedeltà al sound di KIST, né lo streaming reale del provider: il widget SoundCloud è una fixture. Un profilo iPhone/WebKit automatizzato non equivale a una verifica su ogni iPhone reale.

Se si cambia il bridge o il player, eseguire anche `PLAYER_BROWSER=chromium node tests/player-interactions.mjs` e la variante `webkit`; se si modifica la corsa/mondo usare `MOTION_BROWSER` con `tests/world-motion.mjs`. Prima leggere i workflow relativi per installazioni e condizioni correnti.

Piccolo limite CI già individuato, non corretto durante questo passaggio: il filtro `paths` di `.github/workflows/bside.yml` include `src/styles/bside.css` ma non `src/styles/bside-lab.css`. Una modifica al solo lab CSS richiede dispatch manuale della suite stanza o l'estensione del filtro. Non scambiare l'assenza di un run per un test passato.

### Evidenza verificata al passaggio

Sul commit applicativo `588059dca9d37525587dddedb3be98829467acb2`:

- Validate Astro: successo — <https://github.com/dobrogeanuedward/djkist/actions/runs/39994761058>
- Browser validation: successo — <https://github.com/dobrogeanuedward/djkist/actions/runs/39994761137>
- B-side secret room (matrice Chromium/WebKit): successo — <https://github.com/dobrogeanuedward/djkist/actions/runs/39994761403>
- Stato integrazione Vercel: `success` — <https://vercel.com/edwards-projects-c448201f/djkist/5CBKXsQFtYBchT2DFd9KLvaBWdTJ>

Non sono stati rieseguiti test funzionali per scrivere questo documento: è un aggiornamento di sola documentazione. Le evidenze sopra appartengono al commit indicato, non a eventuali modifiche future.

## Preferenze e comportamenti del resto del sito da conservare

Questi punti sono il contesto delle scelte già fatte, non una nuova lista di interventi da eseguire adesso:

- Niente frecce emoji nel sito; le icone UI sono disegnate/SVG, anche per azioni e menu.
- Header desktop uniformato al menu compatto con dropdown del mobile. Un esperimento quasi full-width su desktop è stato esplicitamente revocato: non ripristinarlo.
- Etichetta menu «Social» al posto di «Mondo KIST»; evitare gap tra i contenitori dell'header quando si restringe, conservando l'effetto a doppio bordo.
- Player hero verso il fondo dell'hero al posto del vecchio controllo pausa slideshow; superficie trasparente/multicolore, proporzioni compatte mobile e più grandi desktop.
- Mobile senza player nel menu header completo; trasporto disponibile nel dropdown. Interazione diretta col player, senza ripassare dall'invito a ogni tap.
- Player principale: precedente/successivo, timeline, controlli sincronizzati. Pulsante volume con barra verticale sui dispositivi supportati; **controllo volume nascosto su iPhone**, decisione esplicita dopo i problemi con il volume dell'embed.
- Titolo/copertina cliccabili aprono un dialog dedicato con copertina grande, titolo sotto, bottone SoundCloud, X in alto e blur dietro; titolo sottolineato per rendere visibile l'interazione.
- Nella scena corsa/Bologna il vecchio pausa/riprendi è stato rimosso e sostituito da un bottone Instagram «Segui». Il personaggio deve fermarsi rapidamente al termine dello scroll, senza corsa intermittente o freeze; rendering sospeso in background, fuori schermo e dietro ai dialog, con reduced motion statico.
- Due foto reali nella biografia; ritratto con crop 4:5. «Fifteen Frames» rimosso dalla zona Notti secondo richiesta, non cancellato globalmente da ogni provenienza/asset.
- Footer senza «3D credits»; DOGO Studio è un link reale a <https://www.dogostudio.it/>.
- Conservare il componente SoundCloud personalizzato, gli asset approvati e le informazioni verificate degli eventi; non inventare orari o date. Nel contenuto precedente gli eventi richiesti erano del 2026.

## Metodo per continuare senza perdere il lavoro

1. Leggere questo contesto, controllare repository/stato Git e analizzare i file correnti della stanza.
2. Avviare l'app e provare la stanza da tastiera, touch e desktop prima di cambiarla.
3. Attendere le nuove indicazioni della chat locale. Se il prossimo obiettivo è la fedeltà sonora, il materiale mancante sono i set audio reali, non un'altra direzione grafica generica.
4. Fare cambiamenti mirati, conservare accessibilità, gestione audio, codec e export; verificare le parti toccate con le suite appropriate e con ascolto effettivo.
5. Prima di pubblicare, allineare la modifica all'HEAD remoto corrente e proteggere il lavoro concorrente. Niente force push o reset distruttivi. Usare il percorso GitHub/Vercel già in funzione; non creare un altro sito/progetto per sostituirlo.
6. Riportare cosa è cambiato, prove eseguite e limiti concreti. Non dichiarare test non eseguiti o fedeltà musicale non dimostrata.

Prompt breve da usare nella chat locale:

> Riprendi DJ KIST e la stanza segreta dal file CONTEXT.md nel repository dobrogeanuedward/djkist. Controlla prima branch, modifiche locali e codice attuale; avvia la versione esistente e conserva le scelte approvate. Non applicare il messaggio su DOGO, che era stato annullato. La prossima evoluzione deve essere davvero nel sound di KIST: per l'analisi dei mix siamo ancora in attesa dei suoi MP3/WAV. Poi prosegui sulle nuove indicazioni che ti darò.
