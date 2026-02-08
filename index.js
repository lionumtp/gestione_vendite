require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const Product = require('./models/Product');
const Sale = require('./models/Sale');

// Configurazione
const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sales-bot';

// Inizializza bot
const bot = new TelegramBot(token, { polling: true });

// Connessione MongoDB
mongoose.connect(mongoUri)
  .then(() => console.log('✅ Connesso a MongoDB'))
  .catch(err => console.error('❌ Errore connessione MongoDB:', err));

// Stato temporaneo per la creazione prodotti
const userStates = {};

// Utility: Ottieni data odierna in formato YYYY-MM-DD
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Utility: Formatta data
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// ==================== COMANDI ====================

// Comando /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
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
  
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Comando /help
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, 
    '📚 *Guida Comandi*\n\n' +
    '/aggiungi - Aggiungi nuovo prodotto\n' +
    '/vendi - Registra o correggi vendite (+1/-1)\n' +
    '/riepilogo - Riepilogo giornaliero\n' +
    '/lista_articoli - Elenco prodotti\n' +
    '/elimina - Rimuovi prodotto\n' +
    '/storico - Visualizza storico\n\n' +
    '💡 *Suggerimento:* Usa /vendi per aggiungere (+1) o rimuovere (-1) vendite. Utile per correggere errori!',
    { parse_mode: 'Markdown' }
  );
});

// Comando /aggiungi - Aggiungi nuovo articolo
bot.onText(/\/aggiungi/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  userStates[userId] = { step: 'awaiting_product_name' };
  
  bot.sendMessage(chatId, 
    '📦 *Aggiungi nuovo articolo*\n\n' +
    'Invia il nome del prodotto:', 
    { parse_mode: 'Markdown' }
  );
});

// Comando /lista_articoli
bot.onText(/\/lista_articoli/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const products = await Product.find({ active: true }).sort({ name: 1 });
    
    if (products.length === 0) {
      bot.sendMessage(chatId, 
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
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Errore lista articoli:', error);
    bot.sendMessage(chatId, '❌ Errore nel recuperare la lista articoli.');
  }
});

// Comando /vendi - Mostra prodotti con pulsanti +1 e -1
bot.onText(/\/vendi/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const products = await Product.find({ active: true }).sort({ name: 1 });
    
    if (products.length === 0) {
      bot.sendMessage(chatId, 
        '📭 Nessun articolo presente.\n\n' +
        'Usa /aggiungi per aggiungere prodotti prima di registrare vendite!'
      );
      return;
    }
    
    // Crea tastiera inline con i prodotti (ogni riga ha +1 e -1)
    const keyboard = products.map(product => [
      {
        text: `➕ ${product.name}`,
        callback_data: `sell_${product._id}`
      },
      {
        text: `➖`,
        callback_data: `remove_${product._id}`
      }
    ]);
    
    bot.sendMessage(chatId, 
      '🛒 *Registra/Correggi Vendita*\n\n' +
      '➕ Aggiungi vendita (+1)\n' +
      '➖ Rimuovi vendita (-1)\n\n' +
      'Seleziona il prodotto:', 
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      }
    );
  } catch (error) {
    console.error('Errore caricamento prodotti:', error);
    bot.sendMessage(chatId, '❌ Errore nel caricare i prodotti.');
  }
});

// Comando /riepilogo - Mostra vendite di oggi
bot.onText(/\/riepilogo/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const today = getTodayDate();
    
    // Aggrega le vendite per prodotto
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
      bot.sendMessage(chatId, 
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
    
    // Aggiungi pulsante per vedere lo storico
    const keyboard = [
      [{ text: '📈 Visualizza Storico', callback_data: 'show_history' }],
      [{ text: '🔄 Aggiorna', callback_data: 'refresh_summary' }]
    ];
    
    bot.sendMessage(chatId, message, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  } catch (error) {
    console.error('Errore riepilogo:', error);
    bot.sendMessage(chatId, '❌ Errore nel generare il riepilogo.');
  }
});

// Comando /storico - Ultimi 7 giorni
bot.onText(/\/storico/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Calcola data di 7 giorni fa
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
      bot.sendMessage(chatId, '📈 Nessuna vendita negli ultimi 7 giorni.');
      return;
    }
    
    // Raggruppa per data
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
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Errore storico:', error);
    bot.sendMessage(chatId, '❌ Errore nel recuperare lo storico.');
  }
});

// Comando /elimina
bot.onText(/\/elimina/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const products = await Product.find({ active: true }).sort({ name: 1 });
    
    if (products.length === 0) {
      bot.sendMessage(chatId, '📭 Nessun articolo da eliminare.');
      return;
    }
    
    const keyboard = products.map(product => [{
      text: `🗑️ ${product.name}`,
      callback_data: `delete_${product._id}`
    }]);
    
    keyboard.push([{ text: '❌ Annulla', callback_data: 'cancel' }]);
    
    bot.sendMessage(chatId, 
      '🗑️ *Elimina Articolo*\n\n' +
      'Seleziona l\'articolo da eliminare:', 
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      }
    );
  } catch (error) {
    console.error('Errore elimina:', error);
    bot.sendMessage(chatId, '❌ Errore.');
  }
});

// ==================== GESTIONE MESSAGGI ====================

// Gestione messaggi per aggiunta prodotto
bot.on('message', async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text;
  
  // Ignora comandi
  if (!text || text.startsWith('/')) return;
  
  const state = userStates[userId];
  
  if (!state) return;
  
  try {
    if (state.step === 'awaiting_product_name') {
      // Verifica se il prodotto esiste già
      const existingProduct = await Product.findOne({ 
        name: { $regex: new RegExp(`^${text}$`, 'i') } 
      });
      
      if (existingProduct) {
        bot.sendMessage(chatId, 
          '⚠️ Questo prodotto esiste già!\n\n' +
          'Prova con un altro nome o usa /lista_articoli per vedere i prodotti esistenti.'
        );
        delete userStates[userId];
        return;
      }
      
      // Salva il prodotto
      const product = new Product({
        name: text,
        active: true
      });
      
      await product.save();
      
      bot.sendMessage(chatId, 
        `✅ *Prodotto aggiunto!*\n\n` +
        `📦 ${text}\n\n` +
        `Ora puoi iniziare a registrare le vendite con /vendi`,
        { parse_mode: 'Markdown' }
      );
      
      delete userStates[userId];
    }
  } catch (error) {
    console.error('Errore gestione messaggio:', error);
    bot.sendMessage(chatId, '❌ Si è verificato un errore.');
    delete userStates[userId];
  }
});

// ==================== GESTIONE CALLBACK ====================

bot.on('callback_query', async (query) => {
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
        bot.answerCallbackQuery(query.id, { text: '❌ Prodotto non trovato!' });
        return;
      }
      
      const today = getTodayDate();
      
      // Crea o aggiorna la vendita
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
      
      bot.answerCallbackQuery(query.id, { 
        text: `✅ +1 ${product.name}`,
        show_alert: false
      });
      
      // Aggiorna il messaggio
      bot.editMessageText(
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
        bot.answerCallbackQuery(query.id, { text: '❌ Prodotto non trovato!' });
        return;
      }
      
      const today = getTodayDate();
      
      // Cerca la vendita esistente
      let sale = await Sale.findOne({
        productId: productId,
        dateOnly: today,
        userId: userId
      });
      
      if (!sale || sale.quantity <= 0) {
        bot.answerCallbackQuery(query.id, { 
          text: `⚠️ Nessuna vendita da rimuovere per ${product.name}`,
          show_alert: true
        });
        return;
      }
      
      // Decrementa la quantità
      sale.quantity -= 1;
      
      if (sale.quantity === 0) {
        // Se la quantità arriva a 0, elimina la vendita
        await Sale.deleteOne({ _id: sale._id });
        
        bot.answerCallbackQuery(query.id, { 
          text: `✅ -1 ${product.name} (rimossa completamente)`,
          show_alert: false
        });
        
        bot.editMessageText(
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
        // Altrimenti aggiorna la quantità
        await sale.save();
        
        bot.answerCallbackQuery(query.id, { 
          text: `✅ -1 ${product.name} (rimangono ${sale.quantity})`,
          show_alert: false
        });
        
        bot.editMessageText(
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
      
      bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      
      bot.answerCallbackQuery(query.id, { text: '✅ Aggiornato!' });
    }
    
    // Gestione visualizza storico
    else if (data === 'show_history') {
      bot.answerCallbackQuery(query.id);
      
      // Invia comando storico
      bot.sendMessage(chatId, '/storico');
    }
    
    // Gestione eliminazione prodotto
    else if (data.startsWith('delete_')) {
      const productId = data.replace('delete_', '');
      const product = await Product.findById(productId);
      
      if (!product) {
        bot.answerCallbackQuery(query.id, { text: '❌ Prodotto non trovato!' });
        return;
      }
      
      // Conferma eliminazione
      const keyboard = [
        [
          { text: '✅ Sì, elimina', callback_data: `confirm_delete_${productId}` },
          { text: '❌ Annulla', callback_data: 'cancel' }
        ]
      ];
      
      bot.editMessageText(
        `⚠️ *Conferma Eliminazione*\n\n` +
        `Sei sicuro di voler eliminare "${product.name}"?\n\n` +
        `_Questa azione non può essere annullata._`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard
          }
        }
      );
      
      bot.answerCallbackQuery(query.id);
    }
    
    // Conferma eliminazione
    else if (data.startsWith('confirm_delete_')) {
      const productId = data.replace('confirm_delete_', '');
      const product = await Product.findById(productId);
      
      if (product) {
        product.active = false;
        await product.save();
        
        bot.editMessageText(
          `✅ *Prodotto eliminato*\n\n` +
          `"${product.name}" è stato rimosso dalla lista.`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
          }
        );
        
        bot.answerCallbackQuery(query.id, { text: '✅ Eliminato!' });
      }
    }
    
    // Annulla operazione
    else if (data === 'cancel') {
      bot.editMessageText(
        '❌ Operazione annullata.',
        {
          chat_id: chatId,
          message_id: messageId
        }
      );
      
      bot.answerCallbackQuery(query.id, { text: 'Annullato' });
    }
    
  } catch (error) {
    console.error('Errore callback query:', error);
    bot.answerCallbackQuery(query.id, { text: '❌ Errore!' });
  }
});

// Gestione errori
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('🤖 Bot Telegram avviato!');
console.log('📱 In attesa di messaggi...');
