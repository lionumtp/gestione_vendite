require('dotenv').config();
const https = require('https');

const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.WEBHOOK_URL; // Es: https://your-app.vercel.app/api/webhook

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN non trovato nel file .env');
  process.exit(1);
}

if (!webhookUrl) {
  console.error('❌ WEBHOOK_URL non trovato nel file .env');
  console.log('💡 Aggiungi WEBHOOK_URL=https://your-app.vercel.app/api/webhook al file .env');
  process.exit(1);
}

console.log('🔧 Configurazione webhook Telegram...');
console.log('📍 URL:', webhookUrl);

const url = `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`;

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const response = JSON.parse(data);
    
    if (response.ok) {
      console.log('✅ Webhook configurato con successo!');
      console.log('📊 Dettagli:', response.result);
      
      // Verifica webhook
      const infoUrl = `https://api.telegram.org/bot${token}/getWebhookInfo`;
      https.get(infoUrl, (infoRes) => {
        let infoData = '';
        
        infoRes.on('data', (chunk) => {
          infoData += chunk;
        });
        
        infoRes.on('end', () => {
          const info = JSON.parse(infoData);
          console.log('\n📋 Informazioni Webhook:');
          console.log(JSON.stringify(info.result, null, 2));
        });
      });
    } else {
      console.error('❌ Errore configurazione webhook:', response.description);
    }
  });
}).on('error', (err) => {
  console.error('❌ Errore richiesta:', err.message);
});
