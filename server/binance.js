const crypto = require('crypto');
const axios = require('axios');

// Binance API credentials
const apiKey = 'EEPxpd3iPPhoSHpSOSqyuEvjTK1BFFHVbQZAPd037sdDm8MDc7Zdaz1lbxSykW9t';
const apiSecret = 'URSCdAzBe8av93JWdWkMMz6njy0EHcpEsffOkJNJufUKZGl7dhuiQw1xn3r6J7wo';

// Request parameters
const params = {
  coin: 'ETH',
  timestamp: Date.now(),
  
  recvWindow: 5000, // 10 seconds
};

// Create the query string
const queryString = new URLSearchParams(params).toString();

// Generate the signature using HMAC SHA256
const signature = crypto
  .createHmac('sha256', apiSecret)
  .update(queryString)
  .digest('hex');

// Make the request
axios.get(`https://api.binance.com/sapi/v1/capital/deposit/address?${queryString}&signature=${signature}`, {
  headers: { 'X-MBX-APIKEY': apiKey },
})
.then(response => {
  console.log(response.data);
})
.catch(error => {
  console.error(error.response.data);
});
