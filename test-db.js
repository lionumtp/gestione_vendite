require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sales-bot';

console.log('🔍 Test connessione MongoDB...');
console.log('📍 URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Nascondi password

mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ Connessione MongoDB riuscita!');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
    console.log('🔌 Port:', mongoose.connection.port);
    
    // Chiudi connessione
    mongoose.connection.close();
    console.log('\n✅ Test completato con successo!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Errore connessione MongoDB:', err.message);
    console.log('\n💡 Suggerimenti:');
    console.log('1. Verifica che MongoDB sia in esecuzione');
    console.log('2. Controlla la stringa di connessione nel file .env');
    console.log('3. Per MongoDB Atlas, verifica username, password e whitelist IP');
    process.exit(1);
  });
