const express = require('express');
const bodyParser = require('body-parser');
const { monitorPrices1, loadConfig1 } = require('./monitor1');
const { monitorPrices, loadConfig } = require('./monitor');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();
const axios = require('axios');


const app = express();
const port = 3002;

app.use(bodyParser.json());
app.use(cors());

const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_SECRET_KEY = process.env.BINANCE_SECRET_KEY;
const BITGET_API_KEY = process.env.BITGET_API_KEY;
const BITGET_SECRET_KEY = process.env.BITGET_SECRET_KEY;
const BITGET_PASSPHRASE = process.env.BITGET_PASSPHRASE;

app.post('/api/find-opportunity1', async (req, res) => {
    let { token1, token2, amount } = req.body;
    if (!token1 || !token2 || !amount) {
        return res.status(400).json({ error: 'Token1, Token2, and amount are required.' });
    }

    try {
        // Convert amount to a number
        amount = parseFloat(amount);

        if (isNaN(amount) || amount <= 0) {
            throw new Error('Invalid amount');
        }

        const { config, pairs } = loadConfig1(token1, token2);
        if (!config || !pairs) {
            throw new Error('Failed to load config or pairs');
        }

        const opportunities = await monitorPrices1(config, pairs, amount);
        console.log(opportunities);
        res.json({ success: true, data: opportunities });
    } catch (error) {
        console.error('Error in /api/find-opportunity1:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/find-opportunity', async (req, res) => {
    const { token, amount } = req.body;
    if (!token || !amount) {
        return res.status(400).json({ error: 'Token and amount are required.' });
    }

    try {
        if (typeof amount !== 'number' || amount <= 0) {
            throw new Error('Invalid amount');
        }

        const { config, pairs } = loadConfig(token);
        if (!config || !pairs) {
            throw new Error('Failed to load config or pairs');
        }

        const opportunities = await monitorPrices(config, pairs, amount);
        console.log(opportunities);
        res.json({ success: true, data: opportunities });
    } catch (error) {
        console.error('Error in /api/find-opportunity:', error.message);
        res.status(500).json({ success: false, error: 'Internal server error.', details: error.message });
    }
});


const createSignature = (secret, params) => {
    return crypto.createHmac('sha256', secret).update(params).digest('hex');
};

// Buy order on Binance
// const buyOnBinance = async (symbol, quantity) => {
//     try {
//         const timestamp = Date.now();
//         const query = `symbol=${symbol}&side=BUY&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
//         const signature = createSignature(BINANCE_API_SECRET, query);
        
//         const response = await axios.post(`https://api.binance.com/api/v3/order?${query}&signature=${signature}`, {}, {
//             headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
//         });
//         return response.data;
//     } catch (error) {
//         console.error('Error buying on Binance:', error);
//         throw error;
//     }
// };

// // Transfer BTC to Kraken
// const transferToKraken = async (address, amount) => {
//     // Kraken API logic to withdraw to an external wallet address
//     // You'll need to get the Kraken wallet address for the target exchange
// };

// // Sell order on Kraken
// const sellOnKraken = async (symbol, quantity) => {
//     try {
//         // Kraken API call to place a sell order
//         const response = await axios.post('https://api.kraken.com/0/private/AddOrder', {
//             pair: symbol,
//             type: 'sell',
//             ordertype: 'market',
//             volume: quantity
//         }, {
//             headers: { 'API-Key': process.env.KRAKEN_API_KEY }
//         });
//         return response.data;
//     } catch (error) {
//         console.error('Error selling on Kraken:', error);
//         throw error;
//     }
// };

// // Execute trade route
// app.post('/api/execute-trade', async (req, res) => {
//     const { token, buyExchange, sellExchange, buyPrice, sellPrice } = req.body;
//     try {
//         const symbol = token.replace('/', ''); // Convert "BTC/USDC" to "BTCUSDC"
        
//         // Step 1: Buy on the buy exchange (Binance)
//         if (buyExchange === 'Binance') {
//             const buyResult = await buyOnBinance(symbol, buyPrice);
//             console.log('Bought on Binance:', buyResult);
//         }
//         // Add logic for other exchanges like Bybit, Bitget if needed

//         // Step 2: Transfer the token to the sell exchange (Kraken in this case)
//         // You'll need the deposit address of Kraken for the token
//         if (sellExchange === 'Kraken') {
//             const transferResult = await transferToKraken('kraken-address', amount);
//             console.log('Transferred to Kraken:', transferResult);
//         }

//         // Step 3: Sell on the sell exchange
//         if (sellExchange === 'Kraken') {
//             const sellResult = await sellOnKraken(symbol, sellPrice);
//             console.log('Sold on Kraken:', sellResult);
//         }
        
//         res.json({ success: true, message: 'Trade executed successfully' });
//     } catch (error) {
//         console.error('Error executing trade:', error);
//         res.json({ success: false, message: 'Trade execution failed', error });
//     }
// });




async function fetchPrice(tradingPair) {
    const symbol = tradingPair.replace('/', '').toUpperCase(); // Format the trading pair
    try {
        const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        // console.log("usdt price response", response);
        return parseFloat(response.data.price);
    } catch (error) {
        console.error('Error fetching price:', error.message);
        throw new Error('Failed to fetch price');
    }
}



app.post('/execute-trade', async (req, res) => {
    const { token, buyExchange, sellExchange, buyPrice } = req.body; // tradeAmount is in USDT
    console.log("buy price in backend", buyPrice);
    

    try {
        // Fetch current price based on the token
        const priceInQuoteCurrency = await fetchPrice(token); // Pass the token to fetchPrice

        // Convert trade amount from USDT to the quote currency (DOGE)
        const tradeAmountInQuoteCurrency = buyPrice / priceInQuoteCurrency;
        console.log("token in doge", tradeAmountInQuoteCurrency);

        // Execute the trade with the converted amount
        await executeTrade(buyExchange, sellExchange, tradeAmountInQuoteCurrency,token);

        // If successful, send a success response
        return res.json({ success: true });
    } catch (error) {
        console.error('Trade execution error:', error);
        return res.status(500).json({ success: false, message: 'Trade execution failed' });
    }
});

function getExchangeSymbol(exchange, tradingPair) {
    const formattedPair = tradingPair.replace('/', '');
    if (exchange === 'binance') {
        return formattedPair.toUpperCase(); // Binance: e.g., DOGEUSDT
    } else if (exchange === 'bitget') {
        return formattedPair.toLowerCase(); // Bitget: e.g., dogeusdt
    }
    return formattedPair;
}

async function getBinanceLotSize(symbol) {
    try {
        const response = await axios.get(`https://api.binance.com/api/v3/exchangeInfo`);
        const symbolInfo = response.data.symbols.find(s => s.symbol === symbol);
        if (symbolInfo) {
            const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
            return {
                minQty: parseFloat(lotSizeFilter.minQty),
                maxQty: parseFloat(lotSizeFilter.maxQty),
                stepSize: parseFloat(lotSizeFilter.stepSize),
            };
        } else {
            console.error('Symbol not found on Binance');
            return null;
        }
    } catch (error) {
        console.error('Error fetching Binance LOT_SIZE info:', error.message);
        return null;
    }
}

// Helper function: Round quantity to LOT_SIZE step
function roundToStepSize(quantity, stepSize) {
    return Math.floor(quantity / stepSize) * stepSize;
}


async function executeBinanceTrade(side, amount,token) {
    
    // Get Binance lot size and adjust quantity
    const lotSizeInfo = await getBinanceLotSize(getExchangeSymbol('binance', token));
    if (!lotSizeInfo) {
        console.error('Failed to fetch lot size info for Binance');
        return null;
    }
    const adjustedAmount = roundToStepSize(amount, lotSizeInfo.stepSize);

    const timestamp = Date.now();
    const params = new URLSearchParams({
        symbol: getExchangeSymbol('binance', token),
        side: side.toUpperCase(),
        type: 'MARKET',
        quantity: adjustedAmount,
        timestamp: timestamp
    });

    const signature = crypto
        .createHmac('sha256', BINANCE_SECRET_KEY)
        .update(params.toString())
        .digest('hex');

    params.append('signature', signature);

    try {
        const response = await axios.post('https://api.binance.com/api/v3/order', params.toString(), {
            headers: {
                'X-MBX-APIKEY': BINANCE_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error executing Binance trade:', error.response ? error.response.data : error.message);
        return null;
    }
}

function generateSignature(secretKey, method, path, body, queryString, timestamp) {
    const message = timestamp + method.toUpperCase() + path + queryString + body;
    return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

async function fetchBitgetOrderBook(symbol) {
    try {
        const response = await axios.get(`https://api.bitget.com/api/v2/spot/market/orderbook?symbol=${symbol}&limit=5`);
        const data = response.data;
        return {
            exchange: 'bitget',
            bids: parseFloat(data.data.bids[0][0]),
            asks: parseFloat(data.data.asks[0][0])
        };
    } catch (error) {
        console.error('Error fetching Bitget order book:', error.message);
        return null;
    }
}
// Execute Bitget Trade
async function executeBitgetTrade(side, amount,token) {
    const bitgetOrderBook = await fetchBitgetOrderBook(getExchangeSymbol('bitget', token));
    if (!bitgetOrderBook) {
        console.error('Failed to fetch Bitget order book');
        return null;
    }

    const price = side === 'buy' ? bitgetOrderBook.asks : bitgetOrderBook.bids;
    const usdtAmount = amount * price; 

    const timestamp = Date.now();
    const path = '/api/v2/spot/trade/place-order';
    const body = JSON.stringify({
        symbol: getExchangeSymbol('bitget', token),
        side: side.toLowerCase(),
        orderType: 'market',
        force: 'gtc',
        size: usdtAmount.toFixed(4),
        clientOid: timestamp.toString(),
    });

    const signature = generateSignature(BITGET_SECRET_KEY, 'POST', path, body, '', timestamp);

    try {
        const response = await axios.post(`https://api.bitget.com${path}`, body, {
            headers: {
                'ACCESS-KEY': BITGET_API_KEY,
                'ACCESS-SIGN': signature,
                'ACCESS-TIMESTAMP': timestamp.toString(),
                'ACCESS-PASSPHRASE': BITGET_PASSPHRASE,
                'Content-Type': 'application/json',
                'locale': 'en-US'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error executing Bitget trade:', error.response ? error.response.data : error.message);
        return null;
    }
}

// Execute Trade
async function executeTrade(buyExchange, sellExchange, amount,token) {
    try {
        console.log(`Attempting to execute trade: Buy ${amount} DOGE on ${buyExchange}`);
        console.log(`Sell ${amount} DOGE on ${sellExchange}`);

        let buyOrder, sellOrder, buyPrice, sellPrice;


        // Determine buy order and price
        if (buyExchange === 'binance') {
            buyOrder = await executeBinanceTrade('buy', amount,token);  // Execute buy order on Binance
        
        } else {
            buyOrder = await executeBitgetTrade('buy', amount,token);   // Execute buy order on Bitget
            
        }

        // Determine sell order and price
        if (sellExchange === 'binance') {
            sellOrder = await executeBinanceTrade('sell', amount,token);  // Execute sell order on Binance
            
        } else {
            sellOrder = await executeBitgetTrade('sell', amount,token);   // Execute sell order on Bitget
            
        }

        // Ensure both buy and sell orders were executed successfully
        if (buyOrder && sellOrder) {
            console.log('Trade executed successfully');
            console.log('Buy order:', buyOrder);
            console.log('Sell order:', sellOrder);

        } else {
            console.log('Failed to execute trade');
        }

    } catch (error) {
        console.error('Error executing trade:', error.message);
    }
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
