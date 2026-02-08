# 🚀 Guida Deploy su Vercel

Questa guida ti aiuterà a deployare il bot Telegram su Vercel (hosting serverless gratuito).

## 📋 Prerequisiti

1. Account [Vercel](https://vercel.com) (gratuito)
2. Account [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (gratuito)
3. Bot Telegram creato con [@BotFather](https://t.me/BotFather)
4. [Vercel CLI](https://vercel.com/cli) installato (opzionale, ma consigliato)

## 🔧 Configurazione MongoDB Atlas

### 1. Crea un Cluster

1. Vai su [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crea un account (se non ce l'hai)
3. Crea un nuovo cluster (scegli il piano FREE M0)
4. Attendi che il cluster sia pronto (2-3 minuti)

### 2. Configura Accesso Database

1. Clicca su **Database Access** nel menu laterale
2. Clicca su **Add New Database User**
3. Crea un utente con username e password (salvali!)
4. Assegna il ruolo **Read and write to any database**

### 3. Configura Network Access

1. Clicca su **Network Access** nel menu laterale
2. Clicca su **Add IP Address**
3. Clicca su **Allow Access from Anywhere** (0.0.0.0/0)
4. Conferma

### 4. Ottieni Connection String

1. Clicca su **Database** nel menu laterale
2. Clicca su **Connect** sul tuo cluster
3. Scegli **Connect your application**
4. Copia la stringa di connessione (es: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/sales-bot?retryWrites=true&w=majority`)
5. Sostituisci `<password>` con la password del tuo utente
6. Sostituisci `myFirstDatabase` con `sales-bot` (o il nome che preferisci)

## 🌐 Deploy su Vercel

### Opzione 1: Deploy tramite GitHub (Consigliato)

#### 1. Carica il progetto su GitHub

```bash
# Inizializza repository Git
git init

# Aggiungi file
git add .

# Commit
git commit -m "Initial commit"

# Crea repository su GitHub e collegalo
git remote add origin https://github.com/tuo-username/telegram-sales-bot.git
git branch -M main
git push -u origin main
```

#### 2. Importa su Vercel

1. Vai su [vercel.com](https://vercel.com)
2. Clicca su **Add New** → **Project**
3. Importa il tuo repository GitHub
4. Vercel rileverà automaticamente la configurazione

#### 3. Configura Variabili d'Ambiente

Durante l'import, aggiungi queste variabili:

```
TELEGRAM_BOT_TOKEN=il_tuo_token_telegram
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sales-bot
```

4. Clicca su **Deploy**

### Opzione 2: Deploy tramite Vercel CLI

#### 1. Installa Vercel CLI

```bash
npm install -g vercel
```

#### 2. Login a Vercel

```bash
vercel login
```

#### 3. Deploy il progetto

```bash
# Dalla directory del progetto
vercel

# Segui le istruzioni:
# - Set up and deploy? Yes
# - Which scope? (scegli il tuo account)
# - Link to existing project? No
# - What's your project's name? telegram-sales-bot
# - In which directory is your code located? ./
```

#### 4. Aggiungi Variabili d'Ambiente

```bash
# Aggiungi token Telegram
vercel env add TELEGRAM_BOT_TOKEN

# Aggiungi MongoDB URI
vercel env add MONGODB_URI

# Scegli per tutti gli ambienti (production, preview, development)
```

#### 5. Deploy in produzione

```bash
vercel --prod
```

## 🔗 Configura Webhook Telegram

Dopo il deploy, devi configurare il webhook di Telegram.

### 1. Ottieni URL Vercel

Dopo il deploy, Vercel ti darà un URL tipo:
```
https://telegram-sales-bot.vercel.app
```

### 2. Configura il file .env locale

Crea un file `.env` nella root del progetto:

```env
TELEGRAM_BOT_TOKEN=il_tuo_token
MONGODB_URI=la_tua_stringa_mongodb
WEBHOOK_URL=https://telegram-sales-bot.vercel.app/api/webhook
```

### 3. Esegui lo script di configurazione

```bash
npm run setup-webhook
```

Dovresti vedere:
```
✅ Webhook configurato con successo!
```

### Metodo Alternativo (manuale)

Apri nel browser:
```
https://api.telegram.org/bot<IL_TUO_TOKEN>/setWebhook?url=https://telegram-sales-bot.vercel.app/api/webhook
```

Dovresti vedere:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

## ✅ Verifica Funzionamento

### 1. Verifica Webhook

```bash
curl https://api.telegram.org/bot<IL_TUO_TOKEN>/getWebhookInfo
```

Dovresti vedere il tuo URL nel campo `url` e `pending_update_count: 0`

### 2. Testa il Bot

1. Apri Telegram
2. Cerca il tuo bot
3. Invia `/start`
4. Il bot dovrebbe rispondere!

## 🔍 Troubleshooting

### Il bot non risponde

1. **Verifica variabili d'ambiente su Vercel**
   - Vai su Vercel Dashboard → Il tuo progetto → Settings → Environment Variables
   - Assicurati che `TELEGRAM_BOT_TOKEN` e `MONGODB_URI` siano impostate

2. **Controlla i log**
   ```bash
   vercel logs
   ```

3. **Verifica webhook**
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```
   - `url` deve corrispondere al tuo URL Vercel
   - `last_error_message` non deve essere presente

### Errore "Internal Server Error"

1. Controlla che MongoDB Atlas accetti connessioni da 0.0.0.0/0
2. Verifica che la stringa di connessione sia corretta
3. Controlla i log su Vercel Dashboard

### Webhook non si configura

1. Verifica che l'URL sia HTTPS (Vercel lo fornisce automaticamente)
2. Assicurati che il token sia corretto
3. Prova a rimuovere il webhook prima:
   ```
   https://api.telegram.org/bot<TOKEN>/deleteWebhook
   ```
   Poi riconfiguralo

## 🔄 Aggiornamenti

Per aggiornare il bot dopo modifiche:

### Con GitHub
```bash
git add .
git commit -m "Descrizione modifiche"
git push
```
Vercel farà il deploy automatico!

### Con Vercel CLI
```bash
vercel --prod
```

## 💰 Costi

- **Vercel Free Tier**: 100GB bandwidth/mese - Sufficiente per bot personali
- **MongoDB Atlas Free Tier**: 512MB storage - Più che sufficiente
- **Telegram**: Gratuito

**Totale: 0€/mese** 🎉

## 🔒 Sicurezza

### Variabili d'Ambiente

- ✅ Mai committare il file `.env`
- ✅ Usa sempre variabili d'ambiente su Vercel
- ✅ Rigenera i token se esposti

### MongoDB

- ✅ Usa sempre password complesse
- ✅ Limita l'accesso IP se possibile (per IP fisso)
- ✅ Backup regolari (MongoDB Atlas li fa automaticamente)

## 📊 Monitoraggio

### Vercel Dashboard
- Visualizza i log in tempo reale
- Monitora le richieste
- Controlla l'utilizzo delle risorse

### MongoDB Atlas
- Monitora le query
- Controlla le performance
- Visualizza metriche di utilizzo

## 🆘 Supporto

Se riscontri problemi:

1. Controlla questa guida
2. Verifica i log su Vercel
3. Controlla le variabili d'ambiente
4. Verifica la configurazione MongoDB
5. Controlla lo stato del webhook

## 📚 Risorse Utili

- [Documentazione Vercel](https://vercel.com/docs)
- [Documentazione MongoDB Atlas](https://docs.atlas.mongodb.com/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Node.js Telegram Bot API](https://github.com/yagop/node-telegram-bot-api)

---

Buon deploy! 🚀
