# Modus Explorer - Guida utente <!-- omit in toc -->

- [Prerequisiti](#prerequisiti)
- [Installazione](#installazione)
- [Struttura del repository](#struttura-del-repository)
- [Sviluppo](#sviluppo)
  - [Comandi di avvio](#comandi-di-avvio)
- [Gestione contenuti](#gestione-contenuti)
  - [Overview](#overview)
  - [Configurazione globale](#configurazione-globale)
  - [Liste a blocchi](#liste-a-blocchi)
  - [Slideshow](#slideshow)
  - [Deepzoom](#deepzoom)
  - [3D](#3d)
  - [Pagine](#pagine)
- [Guida ai templates](#guida-ai-templates)
- [Produzione](#produzione)

## Prerequisiti

Per poter utilizzare l'applicazione in modalità di sviluppo, è necessario installare i seguenti tool:
- [NodeJS](https://nodejs.org/en/) - L'ambiente di esecuzione di tutti i tool di sviluppo. Installare la versione LTS raccomandata.
- [Git](https://git-scm.com/) - Software di version control. Necessario per reperire il codice sorgente dell'applicazione dal repository online.
- [Visual Studio Code](https://code.visualstudio.com/) (fortemente consigliato) - Visual Studio Code è la IDE gratuita di Microsoft. In alternativa è possibile utilizzare altri editor/IDE di propria scelta, tuttavia, in questa guida si farà riferimento a Visual Studio Code. I concetti rimangono comunque validi qualsiasi sia l'ambiente di sviluppo utilizzato.

Sia Git che NodeJS funzionano da riga di comando. Per quanto riguarda Git è disponibile anche una versione con interfaccia grafica che però non verrà trattata in questo documento.

## Installazione

Il codice sorgente dell'applicazione viene reperito tramite il client Git dal repository online. 

Ogni volta che si vuole create un nuovo progetto Modus Explorer è necessario eseguire questa procedura. Ogni progetto contiene il codice sorgente e tutti i file utilizzati per la generazione dei contenuti. 

Per create un nuovo progetto, aprire un prompt dei comandi e posizionarsi sulla cartella di lavoro desiderata (ad esempio, "Documenti") e lanciare il seguente comando:

`git clone https://github.com/erbuka/modus-explorer <cartella di destinazione>`

Si consiglia di usare il nome del progetto stesso per la cartella di destinazione. Se la cartella di destinazione non viene specificata, il sistema utilizza il nome stesso del repository "modus-explorer".

Dopo che l'operazione di clonazione è completata, è necessario installare tutti i pacchetti necessari allo sviluppo dell'applicazione: posizionarsi con il prompt dei comandi nella cartella appena creata e lanciare il seguente comando:

`npm i`

A questo punto NodeJS installerà tutti i pacchetti necessari allo sviluppo dentro la cartella "node_modules".

**Attenzione:** Se per qualsiasi motivo si volesse fare una copia manuale del progetto in un'altra cartella, escludere la cartella "node_modules" dalla copia, in quanto contiene centinaia di migliaia di file e **il tempo di copia sarebbe biblico**. E' molto più conveniente invece copiare tutto tranne "node_modules", ed eseguire nuovamente il comando "npm i" nella cartella di destinazione.

## Struttura del repository

Di seguito si riporta l'organizzazione delle cartelle del progetto. Alcune cartelle non saranno presenti immediatamente dopo aver creato il repository in quanto vengono automaticamente create dal sistema nel momento del bisogno.

- **assets/** - Configurazione e contenuti
- **build-dev/** - Build di sviluppo
- **build-prod/** - Build di produzione
- **node_modules/** - Moduli NodeJS
- **scripts/** - Script di automazione
- **src/** - Codice sorgente
  - **scss/** - Fogli di stile
- **templates/** - Template per schede/pagine

## Sviluppo

La modalità sviluppo consente di eseguire l'applicazione in us server web locale e di lavorare sui contenuti in maniera interattiva. Questa modalità richiede l'utilizzo di 2 o più prompt dei comandi aperti contemporaneamente, e quindi si consiglia di utilizzare Visual Studio Code per il terminale/prompt integrato.

### Comandi di avvio

Per avviare il server locale, aprire un prompt dei comandi nella cartella del progetto e lanciare il comando:

`npm run start:dev-server`

Il comando apre un server web locale in ascolto sulla porta 8080 e avvia una serie di comandi secondari che ricompilano alcune parti dell'applicazione (ad esempio, i templates) se queste vengono modificate dall'utente.

Per compilare il codice sorgente vero e proprio, aprire un altro prompt e lanciare il comando:

`npm start`

In questo modo si avvia il processo di compilazione. Al primo avvio in assoluto, potrebbero volerci alcuni minuti dato che il sistema deve compilare tutte le dipendenze.

**NB**: entrambe i comandi sono di tipo "watch", ossia dei processi attivi in attesa di modifiche ai file locali all'applicazione. Quando avviene una modifica, l'applicazione viene ricompilata. E' quindi necessario che i prompt dei comandi rimangano aperti durante la fase di sviluppo

A questo punto è possibile navigare tramite browser all'indirizzo http://localhost:8080/ e se la procedura è stata eseguita correttamente si dovrebbe visualizzare la seguente schermata:

![Starter Project](images/starter-project.jpg)

## Gestione contenuti

### Overview

### Configurazione globale

### Liste a blocchi

### Slideshow

### Deepzoom

### 3D

### Pagine

## Guida ai templates

## Produzione