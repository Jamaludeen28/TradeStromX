const crypto = require('crypto');
const axios = require('axios');
const querystring = require('querystring');
// Kraken API credentials
const apiKey = 'sz2BGqVUT9UnEMX33/Jb3NQ4bAm4syLchTyBIHdNKHXY5geZ5HEv90zC';
const apiSecret = 'MUccIuXOvPJti8xssHFgLLLR0B1jCEVq/srALHG2x+nu04rRHdLCfUamXyQMi8gIwbxVRK5+OhV7G2iwhmlRmg==';

// Function to generate Kraken signature
function getKrakenSignature(urlPath, data, secret) {
    // Combine nonce and request data
    const postData = querystring.stringify(data);
    const message = data.nonce + postData;
    
    // Hash the message with SHA256
    const sha256Hash = crypto.createHash('sha256').update(message).digest();
    
    // Combine the URI path and SHA256 hash
    const hmacMessage = urlPath + sha256Hash.toString('binary');
    
    // Decode the secret and create an HMAC with it
    const secretBuffer = Buffer.from(secret, 'base64');
    const hmac = crypto.createHmac('sha512', secretBuffer);
    hmac.update(hmacMessage, 'binary');
    
    // Return the Base64 encoded signature
    return hmac.digest('base64');
}

// Generate nonce (timestamp in milliseconds)
const nonce = Date.now().toString();

// Request payload
const payload = {
    nonce: nonce,
    asset: 'ETC',  // Replace with the asset you want to deposit, e.g., 'XBT' for Bitcoin
    method: 'Ethereum Classic',  // Replace with the deposit method, e.g., 'Bitcoin'
    new: true  // Set to true if you want to generate a new deposit address
};

// Generate the API signature
const signature = getKrakenSignature('/0/private/DepositAddresses', payload, apiSecret);

// Set up the request headers
const headers = {
    'API-Key': apiKey,
    'API-Sign': signature,
    'Content-Type': 'application/x-www-form-urlencoded'
};

// Make the POST request to Kraken API
axios.post('https://api.kraken.com/0/private/DepositAddresses', querystring.stringify(payload), { headers: headers })
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







