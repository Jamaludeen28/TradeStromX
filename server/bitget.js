const crypto = require('crypto');

// Bitget API credentials
const apiKey = 'bg_870506e71fa7eb4d3082e3061f0147f5';
const apiSecret = '6b2e61a26f86dd8b2a23784408520100c5f090b0f06a6c4589153ee752ae58ed';
const passphrase = 'Jamaludeen2809';

// Request parameters
const coin = 'USDC'; // Replace with the coin you want
const chain = 'base'; // Replace with the chain you want (if applicable)

// Get current timestamp in milliseconds
const timestamp = Date.now().toString();

// Method and Request Path
const method = 'GET';
const requestPath = '/api/v2/spot/wallet/deposit-address';

// Create query string
const queryString = `coin=${coin}${chain ? `&chain=${chain}` : ''}`;

// Concatenate the components to create the prehash string
const prehashString = `${timestamp}${method.toUpperCase()}${requestPath}?${queryString}`;

// Generate the HMAC SHA256 signature
const hmac = crypto.createHmac('sha256', apiSecret);
hmac.update(prehashString);
const signature = hmac.digest('base64');

// Prepare request headers
const headers = {
  'ACCESS-KEY': apiKey,
  'ACCESS-SIGN': signature,
  'ACCESS-PASSPHRASE': passphrase,
  'ACCESS-TIMESTAMP': timestamp,
  'Content-Type': 'application/json',
  'locale': 'en-US' // Optional
};

// Make the request using Axios
const axios = require('axios');
axios.get(`https://api.bitget.com${requestPath}?${queryString}`, {
  headers: headers
})
  .then(response => {
    console.log('Deposit Address:', response.data);
  })
  .catch(error => {
    if (error.response) {
      console.error('Error Response Data:', error.response.data);
      console.error('Error Response Status:', error.response.status);
      console.error('Error Response Headers:', error.response.headers);
    } else {
      console.error('Error Message:', error.message);
    }
  });


  //the depostie amount for usdc is hsould be mor than 0.01 usdc