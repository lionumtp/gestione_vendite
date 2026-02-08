# 🛍️ Bot Telegram per Gestione Vendite

Bot Telegram completo per tracciare e gestire le vendite giornaliere con MongoDB.

**🚀 Supporta sia deploy locale che su Vercel (serverless)!**

## 📋 Funzionalità

- ✅ Aggiungi articoli al catalogo
- ✅ Registra vendite con un click (+1)
- ✅ Correggi vendite errate (-1)
- ✅ Visualizza riepilogo giornaliero
- ✅ Storico vendite ultimi 7 giorni
- ✅ Gestione completa articoli (aggiungi/elimina)
- ✅ Interface intuitiva con pulsanti inline

## 🚀 Installazione

### ⚡ Deploy Rapido su Vercel (Consigliato)

**Deploy il bot su Vercel gratuitamente in 5 minuti!**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lionumtp/gestione_vendite)

📖 **[Guida Completa Deploy Vercel →](DEPLOY.md)**

**Vantaggi:**
- ✅ Hosting gratuito
- ✅ Sempre online 24/7
- ✅ Auto-scaling
- ✅ HTTPS incluso
- ✅ Deploy automatici da GitHub

---

### 💻 Deploy Locale (per sviluppo)

Usa questa opzione se vuoi eseguire il bot sul tuo computer/server.

### 1. Prerequisiti

- Node.js (v14 o superiore)
- MongoDB (locale o cloud)
- Account Telegram

### 2. Crea il Bot Telegram

1. Apri Telegram e cerca `@BotFather`
2. Invia `/newbot`
3. Segui le istruzioni per creare il bot
4. Copia il **token** che ricevi

### 3. Installa le dipendenze

```bash
npm install
```

### 4. Configura le variabili d'ambiente

Crea un file `.env` nella root del progetto:

```env
TELEGRAM_BOT_TOKEN=il_tuo_token_qui
MONGODB_URI=mongodb://localhost:27017/sales-bot
```

**Per MongoDB Cloud (MongoDB Atlas):**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sales-bot
```

### 5. Avvia il bot

**Modalità produzione:**
```bash
npm start
```

**Modalità sviluppo (con auto-reload):**
```bash
npm run dev
```

## 📱 Comandi Bot

### Comandi Principali

- `/start` - Avvia il bot e mostra il menu
- `/help` - Mostra l'elenco dei comandi
- `/aggiungi` - Aggiungi un nuovo articolo al catalogo
- `/vendi` - Registra una vendita (mostra pulsanti prodotti)
- `/riepilogo` - Visualizza il riepilogo delle vendite di oggi
- `/lista_articoli` - Mostra tutti gli articoli nel catalogo
- `/elimina` - Rimuovi un articolo dal catalogo
- `/storico` - Visualizza lo storico vendite degli ultimi 7 giorni

## 🎯 Utilizzo

### Aggiungere un Prodotto

1. Invia `/aggiungi`
2. Digita il nome del prodotto
3. Il prodotto viene aggiunto al catalogo

### Registrare una Vendita

1. Invia `/vendi`
2. Clicca sul pulsante **➕** accanto al prodotto venduto
3. Viene aggiunto +1 a quel prodotto per oggi

### Correggere una Vendita (rimuovere)

1. Invia `/vendi`
2. Clicca sul pulsante **➖** accanto al prodotto da correggere
3. Viene rimosso -1 da quel prodotto
4. Se la quantità arriva a 0, la vendita viene eliminata completamente

**Nota:** Il pulsante ➖ rimuove vendite solo per l'utente corrente e solo per il giorno odierno.

### Visualizzare il Riepilogo

1. Invia `/riepilogo`
2. Vedi tutte le vendite di oggi raggruppate per prodotto
3. Puoi cliccare su "Aggiorna" per vedere i dati aggiornati

## 🗂️ Struttura Progetto

```
telegram-sales-bot/
├── api/
│   └── webhook.js        # Handler webhook per Vercel
├── models/
│   ├── Product.js        # Schema MongoDB per i prodotti
│   └── Sale.js          # Schema MongoDB per le vendite
├── index.js              # File principale del bot (polling - locale)
├── setup-webhook.js      # Script configurazione webhook
├── test-db.js           # Test connessione MongoDB
├── package.json          # Dipendenze del progetto
├── vercel.json          # Configurazione Vercel
├── .env.example         # Template variabili d'ambiente
├── .env                 # Tue variabili d'ambiente (non committare!)
├── README.md            # Questo file
└── DEPLOY.md            # Guida deploy Vercel
```

## 🔀 Differenze Locale vs Vercel

| Caratteristica | Locale | Vercel |
|----------------|--------|--------|
| **File principale** | `index.js` | `api/webhook.js` |
| **Modalità** | Polling | Webhook |
| **Comando avvio** | `npm start` | Deploy automatico |
| **Hosting** | Tuo server/PC | Cloud Vercel |
| **Costo** | Dipende dal server | Gratis |
| **Uptime** | Quando acceso | 24/7 |
| **Setup** | Più semplice | Richiede webhook |

**💡 Consiglio:** Usa locale per sviluppo/test, Vercel per produzione.

## 🔧 Configurazione MongoDB

### MongoDB Locale

Se usi MongoDB in locale, assicurati che sia in esecuzione:

```bash
# macOS/Linux
mongod

# Windows
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
```

### MongoDB Atlas (Cloud)

1. Vai su [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crea un cluster gratuito
3. Crea un database user
4. Ottieni la stringa di connessione
5. Inseriscila nel file `.env`

## 📊 Database Collections

### Products
```javascript
{
  name: String,          // Nome prodotto (unico)
  description: String,   // Descrizione opzionale
  price: Number,         // Prezzo (opzionale)
  active: Boolean,       // Prodotto attivo/eliminato
  createdAt: Date       // Data creazione
}
```

### Sales
```javascript
{
  productId: ObjectId,   // Riferimento al prodotto
  productName: String,   // Nome prodotto (denormalizzato)
  quantity: Number,      // Quantità venduta
  date: Date,           // Data e ora
  dateOnly: String,     // Data formato YYYY-MM-DD
  userId: Number,       // ID utente Telegram
  username: String      // Username Telegram
}
```

## 🛡️ Sicurezza

- **NON** committare il file `.env` nel repository
- Aggiungi `.env` al `.gitignore`
- Usa variabili d'ambiente per dati sensibili
- Limita l'accesso al bot solo agli utenti autorizzati (opzionale)

## 🔐 Limitare l'Accesso (Opzionale)

Per permettere solo a determinati utenti di usare il bot, aggiungi questo controllo in `index.js`:

```javascript
// Lista utenti autorizzati (Telegram User ID)
const AUTHORIZED_USERS = [123456789, 987654321];

// Aggiungi questo middleware
bot.use((msg, metadata, next) => {
  if (!AUTHORIZED_USERS.includes(msg.from.id)) {
    bot.sendMessage(msg.chat.id, '🚫 Non sei autorizzato ad usare questo bot.');
    return;
  }
  next();
});
```

Per trovare il tuo User ID, usa [@userinfobot](https://t.me/userinfobot) su Telegram.

## 🐛 Troubleshooting

### Il bot non risponde
- Verifica che il token sia corretto
- Controlla che MongoDB sia in esecuzione
- Verifica i log della console per errori

### Errore connessione MongoDB
- Verifica che MongoDB sia avviato
- Controlla la stringa di connessione in `.env`
- Per MongoDB Atlas, verifica le credenziali e la whitelist IP

### Polling Error
- Il token potrebbe essere già in uso da un'altra istanza
- Ferma tutte le altre istanze del bot

## 📈 Possibili Miglioramenti

- [ ] Aggiungere prezzi ai prodotti e calcolare totali
- [ ] Export dati in Excel/CSV
- [ ] Grafici e statistiche avanzate
- [ ] Notifiche automatiche
- [ ] Multi-utente con permessi
- [ ] Backup automatico database
- [ ] Interfaccia web per visualizzazione dati

## 📝 Note

- Le vendite sono raggruppate per giorno
- I prodotti eliminati diventano inattivi (soft delete)
- Tutti i dati sono salvati in MongoDB
- Il bot supporta più utenti contemporaneamente

## 🤝 Supporto

Per problemi o domande, verifica:
1. La console per errori
2. La connessione a MongoDB
3. Il token Telegram

## 📄 Licenza

ISC

---

Creato con ❤️ per gestire le vendite quotidiane
