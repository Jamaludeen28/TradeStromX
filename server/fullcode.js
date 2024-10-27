require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Log file setup
const logFile = path.join(__dirname, 'trade.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Custom logging
const logToFile = (message) => {
    const timestamp = new Date().toISOString();
    logStream.write(`[${timestamp}] ${message}\n`);
};

// Override console.log and console.error
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
    const message = args.join(' ');
    originalLog(...args); // Keep the original console.log behavior
    logToFile(message);
};

console.error = (...args) => {
    const message = args.join(' ');
    originalError(...args); // Keep the original console.error behavior
    logToFile(`ERROR: ${message}`);
};

// Configuration
const tradingPair = 'ETHUSDT'; 
// const minProfitPercentage = 0.01; // 0.5% minimum profit threshold
const binanceFeePercentage = 0.001; 
const bitgetFeePercentage = 0.001; 
const krakenFeePercentage = 0.0026;  
const tradeAmount = 200; 
const maxRetries = 3;
const retryDelay = 5000; // 5 seconds
const SIMULATION_MODE = false; // Set to false to execute real trades

// API Keys
const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_SECRET_KEY = process.env.BINANCE_SECRET_KEY;
const BITGET_API_KEY = process.env.BITGET_API_KEY;
const BITGET_SECRET_KEY = process.env.BITGET_SECRET_KEY;
const BITGET_PASSPHRASE = process.env.BITGET_PASSPHRASE;
const KRAKEN_API_KEY = process.env.KRAKEN_API_KEY;
const KRAKEN_SECRET_KEY = process.env.KRAKEN_SECRET_KEY;

// Helper: Convert trading pair format
function getExchangeSymbol(exchange, tradingPair) {
    const formattedPair = tradingPair.replace('/', '');
    if (exchange === 'binance') {
        return formattedPair.toUpperCase(); // Binance: e.g., BTCUSDT
    } else if (exchange === 'bitget') {
        return formattedPair.toLowerCase(); // Bitget: e.g., btcusdt
    } else if (exchange === 'kraken') {
        return formattedPair.toUpperCase(); // Kraken: e.g., BTCUSD
    }
    return formattedPair;
}

// Helper function: Fetch Binance LOT_SIZE Info
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



// Fetch Binance Order Book
async function fetchBinanceOrderBook(symbol) {
    try {
        const response = await axios.get(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=5`);
        const data = response.data;
        return {
            exchange: 'binance',
            bids: parseFloat(data.bids[0][0]),
            asks: parseFloat(data.asks[0][0])
        };
    } catch (error) {
        console.error('Error fetching Binance order book:', error.message);
        return null;
    }
}

// Fetch Bitget Order Book
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


async function fetchKrakenOrderBook(symbol) {
    try {
        const response = await axios.get(`https://api.kraken.com/0/public/Depth?pair=${symbol}&count=5`);
        const data = response.data.result[Object.keys(response.data.result)[0]];
        return {
            exchange: 'kraken',
            bids: parseFloat(data.bids[0][0]),
            asks: parseFloat(data.asks[0][0])
        };
    } catch (error) {
        console.error('Error fetching Kraken order book:', error.message);
        return null;
    }
}

// Fetch Order Book with Retry
async function fetchOrderBookWithRetry(fetchFunction, symbol) {
    for (let i = 0; i < maxRetries; i++) {
        const result = await fetchFunction(symbol);
        if (result) return result;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    return null;
}



function findArbitrageOpportunity(book1, book2, book3) {
    const books = [book1, book2, book3];
    const buyBook = books.reduce((prev, current) => (current.asks < prev.asks ? current : prev));
    const sellBook = books.reduce((prev, current) => (current.bids > prev.bids ? current : prev));

    const buyPrice = buyBook.asks;
    const sellPrice = sellBook.bids;

    const profitPercentage = ((sellPrice - buyPrice) / buyPrice) * 100;

    if (profitPercentage > 0) {
        return {
            buyExchange: buyBook.exchange,
            sellExchange: sellBook.exchange,
            buyPrice,
            sellPrice,
        };
    }

    return null;
}


// Utility function to round the quantity based on step size
function roundToStepSize(quantity, stepSize) {
    return parseFloat((Math.floor(quantity / stepSize) * stepSize).toFixed(8));
}

async function executeBinanceTrade(tradeAmount, symbol, buyOrSell, price) {
    const baseCurrency = symbol.substring(0, 3);  // e.g., BTC
    const quoteCurrency = symbol.substring(3);    // e.g., USDT
    console.log("Trade amount in binance:", tradeAmount);

    // console.log('Trade Amount:', tradeAmount);
    // console.log('Price:', price);
    // console.log('Symbol:', symbol);
    // console.log('Buy or Sell:', buyOrSell);

    if (!price) {
        console.error('Error: Price is undefined or null. Please check the input data.');
        return;
    }

    const marketPrice = parseFloat(price);
    if (isNaN(marketPrice)) {
        console.error('Error: Market price is not a valid number. Please check the price input.');
        return;
    }

    let orderQuantity;

    // Fetch Binance lot size information and adjust quantity
    const lotSizeInfo = await getBinanceLotSize(symbol);
    if (!lotSizeInfo) {
        console.error('Failed to fetch lot size info for Binance.');
        return null;
    }
    
    // Round the trade amount based on the lot size step size
    const adjustedAmount = roundToStepSize(tradeAmount, lotSizeInfo.stepSize);

    if (buyOrSell.toLowerCase() === 'buy') {
        orderQuantity = adjustedAmount / marketPrice; // Convert USDT to base currency amount (BTC)
    } else if (buyOrSell.toLowerCase() === 'sell') {
        orderQuantity = adjustedAmount; // Directly use the trade amount as the base currency amount
    }

    console.log('Order Quantity before adjustment:', orderQuantity);

    // Round the order quantity based on step size and ensure it's within min/max bounds
    orderQuantity = roundToStepSize(orderQuantity, lotSizeInfo.stepSize);
    if (orderQuantity < parseFloat(lotSizeInfo.minQty)) {
        console.error(`Error: Order quantity (${orderQuantity}) is below the minimum quantity (${lotSizeInfo.minQty}).`);
        return;
    }
    if (orderQuantity > parseFloat(lotSizeInfo.maxQty)) {
        console.error(`Error: Order quantity (${orderQuantity}) is above the maximum quantity (${lotSizeInfo.maxQty}).`);
        return;
    }

    console.log('Order Quantity after adjustment:', orderQuantity);

    if (!orderQuantity || isNaN(orderQuantity) || orderQuantity <= 0) {
        console.error('Error: Order quantity is not valid. Please check the calculations.');
        return;
    }

    const timestamp = Date.now();
    const params = new URLSearchParams({
        symbol: symbol,
        side: buyOrSell.toUpperCase(),
        type: 'MARKET',
        quantity: orderQuantity.toFixed(6),  // Adjust precision to 6 decimal places
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

// Execute Bitget Trade
const executeBitgetTrade = async (tradeamount, symbol, buyOrSell, price) => {
    try {
        // Convert symbol to base and quote currencies (e.g., BTC/USDT)
        const baseCurrency = symbol.substring(0, 3);  // e.g., BTC
        const quoteCurrency = symbol.substring(3);    // e.g., USDT

        // Convert price to a number
        const marketPrice = parseFloat(price);

        let orderQuantity;

        // If Buy: Trade amount is in USDT; convert it to base currency (BTC)
        if (buyOrSell.toLowerCase() === 'buy') {
            orderQuantity = tradeamount ; // Convert USDT to base currency amount (BTC)
        }
        // If Sell: Trade amount is in base currency (e.g., BTC)
        else if (buyOrSell.toLowerCase() === 'sell') {
            orderQuantity = tradeamount/ marketPrice; // Directly use the trade amount as the base currency amount
        }
       

        const timestamp = Date.now();
    const path = '/api/v2/spot/trade/place-order';
    const body = JSON.stringify({
        symbol: symbol,
        side: buyOrSell.toLowerCase(),
        orderType: 'market',
        force: 'gtc',
        size: orderQuantity.toFixed(6),
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
    } catch (error) {
        console.error(`Error executing Bitget trade: ${error}`);
    }
};



async function executeKrakenTrade(tradeAmount, symbol, buyOrSell, price) {
    const nonce = Date.now() * 1000;
    const path = '/0/private/AddOrder';
    const body = {
        nonce,
        pair: symbol,
        type: buyOrSell.toLowerCase(),
        ordertype: 'market',
        volume: tradeAmount,
    };

    const signature = crypto
        .createHmac('sha512', Buffer.from(KRAKEN_SECRET_KEY, 'base64'))
        .update(`${nonce}${JSON.stringify(body)}`)
        .digest('base64');

    try {
        const response = await axios.post(`https://api.kraken.com${path}`, body, {
            headers: {
                'API-Key': KRAKEN_API_KEY,
                'API-Sign': signature,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error executing Kraken trade:', error.response ? error.response.data : error.message);
        return null;
    }
}




function calculateNetProfit(buyPrice, sellPrice, amount, buyExchange, sellExchange) {
    console.log("Amount", amount);
    console.log("Buyprice", buyPrice);
    console.log("Sellprice", sellPrice);


    let buyCost = amount * buyPrice;
    let sellRevenue = amount * sellPrice;

    let buyFee = 0;
    let sellFee = 0;

    if (buyExchange === 'bitget') buyFee = buyCost * bitgetFeePercentage;
    if (buyExchange === 'binance') buyFee = buyCost * binanceFeePercentage;
    if (buyExchange === 'kraken') buyFee = buyCost * krakenFeePercentage;

    if (sellExchange === 'bitget') sellFee = sellRevenue * bitgetFeePercentage;
    if (sellExchange === 'binance') sellFee = sellRevenue * binanceFeePercentage;
    if (sellExchange === 'kraken') sellFee = sellRevenue * krakenFeePercentage;


    console.log("Buyfee", buyFee);
    console.log("Sellfee", sellFee);

    const totalBuyCostAfterFee = buyCost + buyFee;
    const totalSellRevenueAfterFee = sellRevenue - sellFee;

    console.log("totalBuyCostAfterFee", totalBuyCostAfterFee);
    console.log("totalSellRevenueAfterFee", totalSellRevenueAfterFee);

    const netProfit = totalSellRevenueAfterFee - totalBuyCostAfterFee;
    const netProfitPercentage = (netProfit / totalBuyCostAfterFee) * 100;

    return { netProfit, netProfitPercentage };
}

// Execute Trade
async function executeTrade(buyExchange, sellExchange, usdtAmount) {
    try {

        console.log(`Attempting to execute trade: Buy ${usdtAmount} USDT worth of BTC on ${buyExchange}`);
        console.log(`Sell the corresponding BTC amount on ${sellExchange}`);


        const binanceBook = await fetchBinanceOrderBook(getExchangeSymbol('binance', tradingPair));
        const bitgetBook = await fetchBitgetOrderBook(getExchangeSymbol('bitget', tradingPair));
        const krakenBook = await fetchKrakenOrderBook(getExchangeSymbol('kraken', tradingPair));

        let buyPrice, sellPrice;

        if (buyExchange === 'binance') buyPrice = binanceBook.asks;
        else if (buyExchange === 'bitget') buyPrice = bitgetBook.asks;
        else if (buyExchange === 'kraken') buyPrice = krakenBook.asks;

        if (sellExchange === 'binance') sellPrice = binanceBook.bids;
        else if (sellExchange === 'bitget') sellPrice = bitgetBook.bids;
        else if (sellExchange === 'kraken') sellPrice = krakenBook.bids;

        const btcAmount = usdtAmount / buyPrice;

        const { netProfit, netProfitPercentage, buyCost, sellRevenue } = calculateNetProfit(buyPrice, sellPrice, btcAmount, buyExchange, sellExchange);

        if (netProfitPercentage > 0.04) {
            console.log(`Net Profit: ${netProfit.toFixed(6)} USDT (${netProfitPercentage.toFixed(4)}%)`);
            console.log('Executing trade...');

            if (buyExchange === 'binance') await executeBinanceTrade(buyCost, tradingPair, 'buy', buyPrice);
            if (buyExchange === 'bitget') await executeBitgetTrade(buyCost, tradingPair, 'buy', buyPrice);
            if (buyExchange === 'kraken') await executeKrakenTrade(buyCost, tradingPair, 'buy', buyPrice);

            if (sellExchange === 'binance') await executeBinanceTrade(sellRevenue, tradingPair, 'sell', sellPrice);
            if (sellExchange === 'bitget') await executeBitgetTrade(sellRevenue, tradingPair, 'sell', sellPrice);
            if (sellExchange === 'kraken') await executeKrakenTrade(sellRevenue, tradingPair, 'sell', sellPrice);

            console.log('Trade executed successfully.');
        } else {
            console.log(`Net Profit: ${netProfit.toFixed(6)} USDT (${netProfitPercentage.toFixed(2)}%) - Below the threshold, trade not executed.`);
        }
    } catch (error) {
        console.error('Error executing trade:', error.message);
    }
}

// Main Function
async function main() {
    while (true) {
        try {
            const binanceBook = await fetchOrderBookWithRetry(fetchBinanceOrderBook, getExchangeSymbol('binance', tradingPair));
            const bitgetBook = await fetchOrderBookWithRetry(fetchBitgetOrderBook, getExchangeSymbol('bitget', tradingPair));
            const krakenBook = await fetchOrderBookWithRetry(fetchKrakenOrderBook, getExchangeSymbol('kraken', tradingPair));

            if (!binanceBook || !bitgetBook || !krakenBook) {
                console.error('Failed to fetch order books');
                continue;
            }

            const opportunity = findArbitrageOpportunity(binanceBook, bitgetBook, krakenBook);

            if (opportunity) {
                // console.log('Arbitrage opportunity found:', opportunity);
                await executeTrade(opportunity.buyExchange, opportunity.sellExchange, tradeAmount);
            } else {
                console.log('No arbitrage opportunity at the moment');
            }

        } catch (error) {
            console.error('Error in main loop:', error.message);
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before checking again
    }
}

main();
