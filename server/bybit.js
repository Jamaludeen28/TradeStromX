const crypto = require('crypto');
const axios = require('axios');

// Bybit API credentials
const apiKey = 'VrT7AFfyAmoDgWr5ef'; // Replace with your Bybit API key
const apiSecret = '5I7KS1Ja7uftRjGWp45wRUUei1BTkqqrTvfr'; // Replace with your Bybit API secret

// Request parameters
const coin = 'USDC'; // Replace with the coin you want to deposit
const chainType = 'BASE'; // Replace with the chain type (e.g., ETH for ERC20)

// Get current timestamp in milliseconds
const timestamp = Date.now().toString();

// Method and Request Path
const method = 'GET';
const requestPath = '/v5/asset/deposit/query-address';

// Create query string
const queryString = `coin=${coin}&chainType=${chainType}`;

// Prepare the pre-hash string for signing
const prehashString = `${timestamp}${apiKey}5000${queryString}`;

// Generate the HMAC SHA256 signature
const signature = crypto.createHmac('sha256', apiSecret).update(prehashString).digest('hex');

// Prepare request headers
const headers = {
  'X-BAPI-API-KEY': apiKey,
  'X-BAPI-SIGN': signature,
  'X-BAPI-TIMESTAMP': timestamp,
  'X-BAPI-RECV-WINDOW': '5000', // This is usually set to 5000 ms
  'Content-Type': 'application/json'
};

// Make the request using Axios
axios.get(`https://api.bybit.com${requestPath}?${queryString}`, {
  headers: headers
})
  .then(response => {
    // Output the full deposit address details
    const depositAddress = response.data;
    console.log('Deposit Address Details:', JSON.stringify(depositAddress, null, 2));
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
