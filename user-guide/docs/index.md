# Modus Explorer

## Prerequesiti

Per poter utilizzare l'applicazione in modalità di sviluppo, è necessario installare i seguenti tool:
- [NodeJS](https://nodejs.org/en/) - L'ambiente di esecuzione di tutti i tool di sviluppo. Installare la versione LTS raccomandata.
- [Git](https://git-scm.com/) - Software di version control. Necessario per reperire il codice sorgente dell'applicazione dal repository online.

Entrambi i tool funzionano da riga di comando. Per quanto riguarda Git è disponibile anche una versione con interfaccia grafica che però non verrà trattata in questo documento.

## Installazione

Il codice sorgente dell'applicazione viene reperito tramite il client Git dal repository online. 

Ogni volta che si vuole create un nuovo progretto Modus Explorer è necessario eseguire questa procedura. Ogni progretto contiene il codice sorgente e tutti i file utilizzati per la generazione dei contenuti. 

Per create un nuovo progetto, aprire un prompt dei comandi e posizionarsi sulla cartella di lavoro desidarata (as esempio, "Documenti" e lanciare il seguente comando:

`git clone https://github.com/erbuka/modus-explorer <cartella di destinazione>`

Si consiglia di usare il nome del progetto stesso per la cartella di destinazione. Se la cartella di destinazione non viene specificata, il sistema utilizza il nome stesso del repository "modus-explorer" per la cartella.

Dopo che l'operazione di clonazione è compeltata, è necessario installare tutti i pacchetti necessari allo sviluppo dell'applicazione: posizionarsi con il prompt dei comandi nella cartella appena creata e lanciare il seguente comandi:

`npm i`

A questo punto NodeJS installerà tutti i pacchetti necessari allo sviluppo dentro la cartella "node_modules".

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


