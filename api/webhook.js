const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

// Modelli
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const saleSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, default: 1, min: 0 },
  date: { type: Date, default: Date.now },
  dateOnly: { type: String, required: true },
  userId: { type: Number, required: true },
  username: { type: String }
});

productSchema.index({ name: 1 });
productSchema.index({ active: 1 });
saleSchema.index({ dateOnly: 1, productId: 1 });
saleSchema.index({ productId: 1 });
saleSchema.index({ userId: 1 });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);

// Configurazione
const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;

// Bot (senza polling per serverless)
const bot = new TelegramBot(token);

// Cache per connessione MongoDB
let cachedDb = null;

// Connessione MongoDB con cache
async function connectDB() {
  if (cachedDb) {
    return cachedDb;
  }
  
  const conn = await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
  
  cachedDb = conn;
  return conn;
}

// Utility functions
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Handler per i comandi
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userId = msg.from.id;
  
  try {
    // Comando /start
    if (text === '/start' || text === '/help') {
      const welcomeMessage = `
🛍️ *Benvenuto nel Bot Vendite!*

Comandi disponibili:

📦 /aggiungi - Aggiungi un nuovo articolo
🛒 /vendi - Registra vendita o correggi (+1/-1)
📊 /riepilogo - Visualizza il riepilogo di oggi
📋 /lista_articoli - Mostra tutti gli articoli
🗑️ /elimina - Elimina un articolo
📈 /storico - Visualizza storico vendite
❓ /help - Mostra questo messaggio

*Nota:* Il comando /vendi permette sia di aggiungere (+1) che rimuovere (-1) vendite per correggere eventuali errori!
      `;
      await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    }
    
    // Comando /aggiungi
    else if (text === '/aggiungi') {
      await bot.sendMessage(chatId, 
        '📦 *Aggiungi nuovo articolo*\n\n' +
        'Invia il nome del prodotto:', 
        { parse_mode: 'Markdown' }
      );
    }
    
    // Comando /lista_articoli
    else if (text === '/lista_articoli') {
      const products = await Product.find({ active: true }).sort({ name: 1 });
      
      if (products.length === 0) {
        await bot.sendMessage(chatId, 
          '📭 Nessun articolo presente.\n\n' +
          'Usa /aggiungi per aggiungere il tuo primo prodotto!'
        );
        return;
      }
      
      let message = '📋 *Lista Articoli*\n\n';
      products.forEach((product, index) => {
        message += `${index + 1}. ${product.name}`;
        if (product.price > 0) {
          message += ` - €${product.price.toFixed(2)}`;
        }
        if (product.description) {
          message += `\n   _${product.description}_`;
        }
        message += '\n\n';
      });
      
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
    
    // Comando /vendi
    else if (text === '/vendi') {
      const products = await Product.find({ active: true }).sort({ name: 1 });
      
      if (products.length === 0) {
        await bot.sendMessage(chatId, 
          '📭 Nessun articolo presente.\n\n' +
          'Usa /aggiungi per aggiungere prodotti prima di registrare vendite!'
        );
        return;
      }
      
      const keyboard = products.map(product => [
        { text: `➕ ${product.name}`, callback_data: `sell_${product._id}` },
        { text: `➖`, callback_data: `remove_${product._id}` }
      ]);
      
      await bot.sendMessage(chatId, 
        '🛒 *Registra/Correggi Vendita*\n\n' +
        '➕ Aggiungi vendita (+1)\n' +
        '➖ Rimuovi vendita (-1)\n\n' +
        'Seleziona il prodotto:', 
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        }
      );
    }
    
    // Comando /riepilogo
    else if (text === '/riepilogo') {
      const today = getTodayDate();
      
      const salesSummary = await Sale.aggregate([
        { $match: { dateOnly: today } },
        { 
          $group: { 
            _id: '$productId',
            productName: { $first: '$productName' },
            totalQuantity: { $sum: '$quantity' }
          } 
        },
        { $sort: { totalQuantity: -1 } }
      ]);
      
      if (salesSummary.length === 0) {
        await bot.sendMessage(chatId, 
          `📊 *Riepilogo ${formatDate(today)}*\n\n` +
          '📭 Nessuna vendita registrata oggi.'
        );
        return;
      }
      
      let message = `📊 *Riepilogo ${formatDate(today)}*\n\n`;
      let totalItems = 0;
      
      salesSummary.forEach((item, index) => {
        message += `${index + 1}. *${item.productName}*: ${item.totalQuantity} pz\n`;
        totalItems += item.totalQuantity;
      });
      
      message += `\n📦 *Totale articoli venduti: ${totalItems}*`;
      
      const keyboard = [
        [{ text: '📈 Visualizza Storico', callback_data: 'show_history' }],
        [{ text: '🔄 Aggiorna', callback_data: 'refresh_summary' }]
      ];
      
      await bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    }
    
    // Comando /storico
    else if (text === '/storico') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split('T')[0];
      
      const salesHistory = await Sale.aggregate([
        { $match: { dateOnly: { $gte: startDate } } },
        { 
          $group: { 
            _id: { date: '$dateOnly', productId: '$productId' },
            productName: { $first: '$productName' },
            totalQuantity: { $sum: '$quantity' }
          } 
        },
        { $sort: { '_id.date': -1, totalQuantity: -1 } }
      ]);
      
      if (salesHistory.length === 0) {
        await bot.sendMessage(chatId, '📈 Nessuna vendita negli ultimi 7 giorni.');
        return;
      }
      
      const groupedByDate = {};
      salesHistory.forEach(item => {
        const date = item._id.date;
        if (!groupedByDate[date]) {
          groupedByDate[date] = [];
        }
        groupedByDate[date].push(item);
      });
      
      let message = '📈 *Storico Vendite (Ultimi 7 giorni)*\n\n';
      
      Object.keys(groupedByDate).sort().reverse().forEach(date => {
        message += `📅 *${formatDate(date)}*\n`;
        const dayTotal = groupedByDate[date].reduce((sum, item) => sum + item.totalQuantity, 0);
        
        groupedByDate[date].forEach(item => {
          message += `   • ${item.productName}: ${item.totalQuantity} pz\n`;
        });
        
        message += `   _Totale giorno: ${dayTotal} pz_\n\n`;
      });
      
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
    
    // Comando /elimina
    else if (text === '/elimina') {
      const products = await Product.find({ active: true }).sort({ name: 1 });
      
      if (products.length === 0) {
        await bot.sendMessage(chatId, '📭 Nessun articolo da eliminare.');
        return;
      }
      
      const keyboard = products.map(product => [{
        text: `🗑️ ${product.name}`,
        callback_data: `delete_${product._id}`
      }]);
      
      keyboard.push([{ text: '❌ Annulla', callback_data: 'cancel' }]);
      
      await bot.sendMessage(chatId, 
        '🗑️ *Elimina Articolo*\n\n' +
        'Seleziona l\'articolo da eliminare:', 
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        }
      );
    }
    
    // Aggiunta prodotto (messaggio non comando)
    else if (text && !text.startsWith('/')) {
      const existingProduct = await Product.findOne({ 
        name: { $regex: new RegExp(`^${text}$`, 'i') } 
      });
      
      if (existingProduct) {
        await bot.sendMessage(chatId, 
          '⚠️ Questo prodotto esiste già!\n\n' +
          'Prova con un altro nome o usa /lista_articoli per vedere i prodotti esistenti.'
        );
        return;
      }
      
      const product = new Product({ name: text, active: true });
      await product.save();
      
      await bot.sendMessage(chatId, 
        `✅ *Prodotto aggiunto!*\n\n` +
        `📦 ${text}\n\n` +
        `Ora puoi iniziare a registrare le vendite con /vendi`,
        { parse_mode: 'Markdown' }
      );
    }
    
  } catch (error) {
    console.error('Errore handleMessage:', error);
    await bot.sendMessage(chatId, '❌ Si è verificato un errore.');
  }
}

// Handler per callback query
async function handleCallbackQuery(query) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;
  const userId = query.from.id;
  const username = query.from.username || query.from.first_name;
  
  try {
    // Gestione vendita (+1)
    if (data.startsWith('sell_')) {
      const productId = data.replace('sell_', '');
      const product = await Product.findById(productId);
      
      if (!product) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Prodotto non trovato!' });
        return;
      }
      
      const today = getTodayDate();
      
      let sale = await Sale.findOne({
        productId: productId,
        dateOnly: today,
        userId: userId
      });
      
      if (sale) {
        sale.quantity += 1;
        await sale.save();
      } else {
        sale = new Sale({
          productId: product._id,
          productName: product.name,
          quantity: 1,
          dateOnly: today,
          userId: userId,
          username: username
        });
        await sale.save();
      }
      
      await bot.answerCallbackQuery(query.id, { 
        text: `✅ +1 ${product.name}`,
        show_alert: false
      });
      
      await bot.editMessageText(
        `✅ *Vendita registrata!*\n\n` +
        `📦 Prodotto: ${product.name}\n` +
        `🔢 Quantità: +1\n\n` +
        `Usa /vendi per altre operazioni o /riepilogo per il totale.`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        }
      );
    }
    
    // Gestione rimozione vendita (-1)
    else if (data.startsWith('remove_')) {
      const productId = data.replace('remove_', '');
      const product = await Product.findById(productId);
      
      if (!product) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Prodotto non trovato!' });
        return;
      }
      
      const today = getTodayDate();
      
      let sale = await Sale.findOne({
        productId: productId,
        dateOnly: today,
        userId: userId
      });
      
      if (!sale || sale.quantity <= 0) {
        await bot.answerCallbackQuery(query.id, { 
          text: `⚠️ Nessuna vendita da rimuovere per ${product.name}`,
          show_alert: true
        });
        return;
      }
      
      sale.quantity -= 1;
      
      if (sale.quantity === 0) {
        await Sale.deleteOne({ _id: sale._id });
        
        await bot.answerCallbackQuery(query.id, { 
          text: `✅ -1 ${product.name} (rimossa completamente)`,
          show_alert: false
        });
        
        await bot.editMessageText(
          `✅ *Vendita rimossa!*\n\n` +
          `📦 Prodotto: ${product.name}\n` +
          `🔢 Quantità: -1 (azzerata)\n\n` +
          `Usa /vendi per altre operazioni o /riepilogo per il totale.`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
          }
        );
      } else {
        await sale.save();
        
        await bot.answerCallbackQuery(query.id, { 
          text: `✅ -1 ${product.name} (rimangono ${sale.quantity})`,
          show_alert: false
        });
        
        await bot.editMessageText(
          `✅ *Vendita corretta!*\n\n` +
          `📦 Prodotto: ${product.name}\n` +
          `🔢 Quantità: -1\n` +
          `📊 Totale attuale: ${sale.quantity}\n\n` +
          `Usa /vendi per altre operazioni o /riepilogo per il totale.`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
          }
        );
      }
    }
    
    // Gestione aggiornamento riepilogo
    else if (data === 'refresh_summary') {
      const today = getTodayDate();
      
      const salesSummary = await Sale.aggregate([
        { $match: { dateOnly: today } },
        { 
          $group: { 
            _id: '$productId',
            productName: { $first: '$productName' },
            totalQuantity: { $sum: '$quantity' }
          } 
        },
        { $sort: { totalQuantity: -1 } }
      ]);
      
      let message = `📊 *Riepilogo ${formatDate(today)}*\n\n`;
      let totalItems = 0;
      
      if (salesSummary.length === 0) {
        message += '📭 Nessuna vendita registrata oggi.';
      } else {
        salesSummary.forEach((item, index) => {
          message += `${index + 1}. *${item.productName}*: ${item.totalQuantity} pz\n`;
          totalItems += item.totalQuantity;
        });
        message += `\n📦 *Totale articoli venduti: ${totalItems}*`;
      }
      
      const keyboard = [
        [{ text: '📈 Visualizza Storico', callback_data: 'show_history' }],
        [{ text: '🔄 Aggiorna', callback_data: 'refresh_summary' }]
      ];
      
      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      
      await bot.answerCallbackQuery(query.id, { text: '✅ Aggiornato!' });
    }
    
    // Gestione visualizza storico
    else if (data === 'show_history') {
      await bot.answerCallbackQuery(query.id);
      await handleMessage({ chat: { id: chatId }, text: '/storico', from: query.from });
    }
    
    // Gestione eliminazione prodotto
    else if (data.startsWith('delete_')) {
      const productId = data.replace('delete_', '');
      const product = await Product.findById(productId);
      
      if (!product) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Prodotto non trovato!' });
        return;
      }
      
      const keyboard = [
        [
          { text: '✅ Sì, elimina', callback_data: `confirm_delete_${productId}` },
          { text: '❌ Annulla', callback_data: 'cancel' }
        ]
      ];
      
      await bot.editMessageText(
        `⚠️ *Conferma Eliminazione*\n\n` +
        `Sei sicuro di voler eliminare "${product.name}"?\n\n` +
        `_Questa azione non può essere annullata._`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        }
      );
      
      await bot.answerCallbackQuery(query.id);
    }
    
    // Conferma eliminazione
    else if (data.startsWith('confirm_delete_')) {
      const productId = data.replace('confirm_delete_', '');
      const product = await Product.findById(productId);
      
      if (product) {
        product.active = false;
        await product.save();
        
        await bot.editMessageText(
          `✅ *Prodotto eliminato*\n\n` +
          `"${product.name}" è stato rimosso dalla lista.`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
          }
        );
        
        await bot.answerCallbackQuery(query.id, { text: '✅ Eliminato!' });
      }
    }
    
    // Annulla operazione
    else if (data === 'cancel') {
      await bot.editMessageText(
        '❌ Operazione annullata.',
        {
          chat_id: chatId,
          message_id: messageId
        }
      );
      
      await bot.answerCallbackQuery(query.id, { text: 'Annullato' });
    }
    
  } catch (error) {
    console.error('Errore handleCallbackQuery:', error);
    await bot.answerCallbackQuery(query.id, { text: '❌ Errore!' });
  }
}

// Export handler per Vercel
module.exports = async (req, res) => {
  try {
    // Connetti a MongoDB
    await connectDB();
    
    // Verifica che sia una richiesta POST da Telegram
    if (req.method !== 'POST') {
      return res.status(200).json({ message: 'Bot is running' });
    }
    
    const { body } = req;
    
    // Gestisci messaggi
    if (body.message) {
      await handleMessage(body.message);
    }
    
    // Gestisci callback query
    if (body.callback_query) {
      await handleCallbackQuery(body.callback_query);
    }
    
    res.status(200).json({ ok: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
