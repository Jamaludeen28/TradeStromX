

require('dotenv').config();
const axios = require('axios');
const { pro } = require('ccxt');
const crypto = require('crypto');
const fs = require('fs');
const EventEmitter = require('events');
const emitter = new EventEmitter();



let config = JSON.parse(fs.readFileSync('config2.json', 'utf8'));

let {
    tradingPairs,
    minProfitPercentage,
    tradeAmountUSDT,
    mintradeamountusdt,
    maxRetries,
    retryDelay,
    binanceFee,
    bitgetFee,
    logFile,
    balanceCheckInterval,
    simulationMode,
    stopLossPercentage,
    takeProfitPercentage,
    binanceApiKey,
    binanceSecretKey,
    bitgetApiKey,
    bitgetSecretKey,
    bitgetPassphrase
} = config;

let totalProfit = 0;
let trades = 0;
const balances = { binance: {}, bitget: {} };

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let n=0;

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(logFile, logMessage);
}

function handleError(error, context) {
    log(`${RED}Error in ${context}: ${error.message}${RESET}`);
    if (error.response) {
        log(`${RED}Response data: ${JSON.stringify(error.response.data)}${RESET}`);
    }
}

async function fetchBinanceOrderBook(symbol) {
    try {
        const binanceSymbol = symbol.replace('/', '');
        const response = await axios.get(`https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=5`);
        const data = response.data;
        return {
            exchange: 'binance',
            symbol: symbol,
            bids: parseFloat(data.bids[0][0]),
            asks: parseFloat(data.asks[0][0])
        };
    } catch (error) {
        handleError(error, 'fetchBinanceOrderBook');
        return null;
    }
}

async function fetchBitgetOrderBook(symbol) {
    try {
        const response = await axios.get(`https://api.bitget.com/api/v2/spot/market/orderbook?symbol=${symbol}&limit=5`);
        const data = response.data;
        return {
            exchange: 'bitget',
            symbol: symbol,
            bids: parseFloat(data.data.bids[0][0]),
            asks: parseFloat(data.data.asks[0][0])
        };
    } catch (error) {
        handleError(error, 'fetchBitgetOrderBook');
        return null;
    }
}

async function fetchOrderBookWithRetry(fetchFunction, symbol) {
    for (let i = 0; i < maxRetries; i++) {
        const result = await fetchFunction(symbol);
        if (result) return result;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    return null;
}

function findArbitrageOpportunity(book1, book2) {
    const buyBook = book1.asks < book2.asks ? book1 : book2;
    const sellBook = book1.bids > book2.bids ? book1 : book2;

    const buyPrice = buyBook.asks;
    const sellPrice = sellBook.bids;

    const profitPercentage = ((sellPrice - buyPrice) / buyPrice) * 100;
    const totalFeePercentage = binanceFee + bitgetFee;
    const netProfitPercentage = profitPercentage - totalFeePercentage;

    if (netProfitPercentage > minProfitPercentage) {
        return { 
            buyExchange: buyBook.exchange, 
            sellExchange: sellBook.exchange, 
            buyPrice, 
            sellPrice, 
            netProfitPercentage,
            symbol: book1.symbol.includes('/') ? book1.symbol : `${book1.symbol.slice(0, -4)}/${book1.symbol.slice(-4)}`
        };
    }

    return null;
}

function calculateProfitAfterFees(buyPrice, sellPrice, amount, buyExchange, sellExchange) {
    const buyFee = buyExchange === 'binance' ? binanceFee : bitgetFee;
    const sellFee = sellExchange === 'binance' ? binanceFee : bitgetFee;

    const buyAmount = amount / buyPrice;
    const sellAmount = buyAmount * (1 - buyFee / 100);
    const revenue = sellAmount * sellPrice * (1 - sellFee / 100);
    const profit = revenue - amount;
    // console.log("Profit Amount:", profit)

    return profit;
}

async function executeBinanceTrade(side, amount, symbol) {
    if (simulationMode) {
        log(`${YELLOW}Simulating Binance ${side} trade: ${amount} USDT of ${symbol}${RESET}`);
        return { simulated: true, side, amount, symbol };
    }

    const binanceSymbol = symbol.replace('/', '');
    const timestamp = Date.now();
    const params = new URLSearchParams({
        symbol: binanceSymbol,
        side: side.toUpperCase(),
        type: 'MARKET',
        quoteOrderQty: amount.toFixed(8),
        timestamp: timestamp
    });

    const signature = crypto
        .createHmac('sha256', binanceSecretKey)
        .update(params.toString())
        .digest('hex');

    params.append('signature', signature);

    try {
        const response = await axios.post('https://api.binance.com/api/v3/order', params.toString(), {
            headers: {
                'X-MBX-APIKEY': binanceApiKey,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data;
    } catch (error) {
        handleError(error, 'executeBinanceTrade');
        return null;
    }
}

async function executeBitgetTrade(side, amount, symbol) {
    if (simulationMode) {
        log(`${YELLOW}Simulating Bitget ${side} trade: ${amount} USDT of ${symbol}${RESET}`);
        return { simulated: true, side, amount, symbol };
    }

    const timestamp = Date.now();
    const path = '/api/v2/spot/trade/place-order';
    const body = JSON.stringify({
        symbol: symbol,
        side: side.toLowerCase(),
        orderType: 'market',
        force: 'gtc',
        size: amount.toFixed(6),
        clientOid: timestamp.toString(),
    });

    const signature = generateBitgetSignature(bitgetSecretKey, 'POST', path, body, '', timestamp);

    try {
        const response = await axios.post(`https://api.bitget.com${path}`, body, {
            headers: {
                'ACCESS-KEY': bitgetApiKey,
                'ACCESS-SIGN': signature,
                'ACCESS-TIMESTAMP': timestamp.toString(),
                'ACCESS-PASSPHRASE': bitgetPassphrase,
                'Content-Type': 'application/json',
                'locale': 'en-US'
            }
        });
        return response.data;
    } catch (error) {
        handleError(error, 'executeBitgetTrade');
        return null;
    }
}

function generateBitgetSignature(secret, method, path, body = '', queryString = '', timestamp) {
    let message = `${timestamp}${method.toUpperCase()}${path}`;
    if (queryString) {
        message += `?${queryString}`;
    }
    message += body;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(message);
    return hmac.digest('base64');
}

function logBalances(buyExchange, sellExchange, baseCurrency, quoteCurrency) {
    log(`${buyExchange} ${baseCurrency}: ${balances[buyExchange][baseCurrency] || 0}`);
    log(`${buyExchange} ${quoteCurrency}: ${balances[buyExchange][quoteCurrency] || 0}`);
    log(`${sellExchange} ${baseCurrency}: ${balances[sellExchange][baseCurrency] || 0}`);
    log(`${sellExchange} ${quoteCurrency}: ${balances[sellExchange][quoteCurrency] || 0}`);
}

function updateSimulatedBalances(buyExchange, sellExchange, baseCurrency, quoteCurrency, amountUSDT, buyPrice, actualProfit) {
    balances[buyExchange][quoteCurrency] -= amountUSDT;
    balances[buyExchange][baseCurrency] += amountUSDT / buyPrice;
    balances[sellExchange][baseCurrency] -= amountUSDT / buyPrice;
    balances[sellExchange][quoteCurrency] += amountUSDT + actualProfit;
}

async function executeTrade(buyExchange, sellExchange, amountUSDT, symbol, buyPrice, sellPrice) {
    const [baseCurrency, quoteCurrency] = symbol.split('/');
    const binanceSymbol = baseCurrency + quoteCurrency;
    const bitgetSymbol = (baseCurrency + quoteCurrency).toLowerCase();
    
    log(`${BLUE}Evaluating trade for ${symbol}:${RESET}`);
    log(`${BLUE}Buy ${amountUSDT} USDT worth on ${buyExchange} at ${buyPrice}${RESET}`);
    log(`${BLUE}Sell on ${sellExchange} at ${sellPrice}${RESET}`);

    if (amountUSDT < mintradeamountusdt) {
        log(`${RED}Trade amount too small: ${amountUSDT} USDT. Minimum is ${mintradeamountusdt} USDT.${RESET}`);
        return 0;
    }

    if (!isBalanceSufficient(buyExchange, quoteCurrency, amountUSDT)) {
        log(`${RED}Insufficient balance on ${buyExchange} for ${quoteCurrency}. Aborting trade.${RESET}`);
        return 0;
    }

    const estimatedProfit = calculateProfitAfterFees(buyPrice, sellPrice, amountUSDT, buyExchange, sellExchange);
    if (estimatedProfit <= 0) {
        log(`${RED}Estimated profit is not positive: ${estimatedProfit.toFixed(8)} USDT. Aborting trade.${RESET}`);
        return 0;
    }

    log(`${YELLOW}Balances before trade:${RESET}`);
    logBalances(buyExchange, sellExchange, baseCurrency, quoteCurrency);

    let buyOrder, sellOrder;

    try {
        if (buyExchange === 'binance') {
            buyOrder = await executeBinanceTrade('buy', amountUSDT, binanceSymbol);
        } else {
            buyOrder = await executeBitgetTrade('buy', amountUSDT, bitgetSymbol);
        }

        if (!buyOrder) {
            throw new Error(`Failed to execute buy order on ${buyExchange}`);
        }

        if (sellExchange === 'binance') {
            sellOrder = await executeBinanceTrade('sell', amountUSDT, binanceSymbol);
        } else {
            sellOrder = await executeBitgetTrade('sell', amountUSDT/sellPrice, bitgetSymbol);
        }

        if (!sellOrder) {
            throw new Error(`Failed to execute sell order on ${sellExchange}`);
        }

        const actualProfit = calculateProfitAfterFees(buyPrice, sellPrice, amountUSDT, buyExchange, sellExchange);
        log(`${GREEN}Actual profit after fees: ${actualProfit.toFixed(8)} USDT${RESET}`);

        if (simulationMode) {
            updateSimulatedBalances(buyExchange, sellExchange, baseCurrency, quoteCurrency, amountUSDT, buyPrice, actualProfit);
        } else {
            await updateBalances();
        }

        log(`${YELLOW}Balances after trade:${RESET}`);
        logBalances(buyExchange, sellExchange, baseCurrency, quoteCurrency);

        return actualProfit;

    } catch (error) {
        log(`${RED}Error during trade execution: ${error.message}${RESET}`);
        
        if (buyOrder && !sellOrder) {
            log(`${YELLOW}Attempting to revert buy order...${RESET}`);
            try {
                if (buyExchange === 'binance') {
                    await executeBinanceTrade('sell', amountUSDT, binanceSymbol);
                } else {
                    await executeBitgetTrade('sell', amountUSDT, bitgetSymbol);
                }
                log(`${GREEN}Successfully reverted buy order${RESET}`);
            } catch (revertError) {
                log(`${RED}Failed to revert buy order: ${revertError.message}. Manual intervention may be required.${RESET}`);
            }
        }

        return 0;
    }
}

async function fetchBinanceBalance() {
    if (simulationMode) {
        return Object.entries(balances.binance).map(([asset, free]) => ({
            asset,
            free: free.toString()
        }));
    }

    const timestamp = Date.now();
    const params = new URLSearchParams({
        timestamp: timestamp
    });

    const signature = crypto
        .createHmac('sha256', binanceSecretKey)
        .update(params.toString())
        .digest('hex');

    params.append('signature', signature);

    try {
        const response = await axios.get(`https://api.binance.com/api/v3/account?${params.toString()}`, {
            headers: {
                'X-MBX-APIKEY': binanceApiKey
            }
        });
        return response.data.balances;
    } catch (error) {
        handleError(error, 'fetchBinanceBalance');
        return null;
    }
}

async function fetchBitgetBalance() {
    if (simulationMode) {
        return Object.entries(balances.bitget).map(([coinName, available]) => ({
            coinName,
            available: available.toString()
        }));
    }

    const timestamp = Date.now();
    const path = '/api/v2/spot/account/assets';
    const signature = generateBitgetSignature(bitgetSecretKey, 'GET', path, '', '', timestamp);

    try {
        const response = await axios.get(`https://api.bitget.com${path}`, {
            headers: {
                'ACCESS-KEY': bitgetApiKey,
                'ACCESS-SIGN': signature,
                'ACCESS-TIMESTAMP': timestamp.toString(),
                'ACCESS-PASSPHRASE': bitgetPassphrase,
                'Content-Type': 'application/json',
                'locale': 'en-US'
            }
        });
        
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
            return response.data.data;
        } else {
            log(`${YELLOW}Unexpected Bitget balance response format${RESET}`);
            return [];
        }
    } catch (error) {
        handleError(error, 'fetchBitgetBalance');
        return [];
    }
}

async function updateBalances() {
    const binanceBalances = await fetchBinanceBalance();
    const bitgetBalances = await fetchBitgetBalance();

    balances.binance = {};
    balances.bitget = {};
    // console.log(tradingPairs);

    const tradingCurrencies = new Set(tradingPairs.flatMap(pair => pair.split('/')));

    log(`${BLUE}Current trading pairs: ${tradingPairs.join(', ')}${RESET}`);

    if (binanceBalances) {
        binanceBalances.forEach(balance => {
            const asset = balance.asset;
            const free = parseFloat(balance.free);
            if (tradingCurrencies.has(asset) && free > 0) {
                balances.binance[asset] = free;
            }
        });
    }

    if (bitgetBalances) {
        bitgetBalances.forEach(balance => {
            const coinName = balance.coin || balance.coinName;
            const available = parseFloat(balance.available);
            if (tradingCurrencies.has(coinName) && available > 0) {
                balances.bitget[coinName] = available;
            }
        });
    }

    log(`${YELLOW}Balances updated:${RESET}`);
    log(`${YELLOW}Binance: ${JSON.stringify(balances.binance, null, 2)}${RESET}`);
    log(`${YELLOW}Bitget: ${JSON.stringify(balances.bitget, null, 2)}${RESET}`);
}

function isBalanceSufficient(exchange, currency, amount) {
    return (balances[exchange][currency] || 0) >= amount;
}

function initializeSimulatedBalances() {
    tradingPairs.forEach(pair => {
        const [baseCurrency, quoteCurrency] = pair.split('/');
        balances.binance[baseCurrency] = balances.binance[baseCurrency] || 10;
        balances.binance[quoteCurrency] = balances.binance[quoteCurrency] || 1000;
        balances.bitget[baseCurrency] = balances.bitget[baseCurrency] || 10;
        balances.bitget[quoteCurrency] = balances.bitget[quoteCurrency] || 1000;
    });
}

function applyStopLossAndTakeProfit(initialPrice, currentPrice, position) {
    const priceDifference = ((currentPrice - initialPrice) / initialPrice) * 100;
    
    if (position === 'long') {
        if (priceDifference <= -stopLossPercentage) {
            log(`${RED}Stop-loss triggered: Current price ${currentPrice}, Initial price ${initialPrice}${RESET}`);
            return 'stop-loss';
        } else if (priceDifference >= takeProfitPercentage) {
            log(`${GREEN}Take-profit triggered: Current price ${currentPrice}, Initial price ${initialPrice}${RESET}`);
            return 'take-profit';
        }
    } else if (position === 'short') {
        if (priceDifference >= stopLossPercentage) {
            log(`${RED}Stop-loss triggered: Current price ${currentPrice}, Initial price ${initialPrice}${RESET}`);
            return 'stop-loss';
        } else if (priceDifference <= -takeProfitPercentage) {
            log(`${GREEN}Take-profit triggered: Current price ${currentPrice}, Initial price ${initialPrice}${RESET}`);
            return 'take-profit';
        }
    }
    
    return null;
}

async function tradingLoop() {
    for (const pair of tradingPairs) {
        const [baseCurrency, quoteCurrency] = pair.split('/');
        const binanceSymbol = baseCurrency + quoteCurrency;
        const bitgetSymbol = (baseCurrency + quoteCurrency).toLowerCase();

        try {
            const binanceBook = await fetchOrderBookWithRetry(fetchBinanceOrderBook, pair);
            const bitgetBook = await fetchOrderBookWithRetry(fetchBitgetOrderBook, bitgetSymbol);

            if (!binanceBook || !bitgetBook) {
                log(`${YELLOW}Failed to fetch order books for ${pair}${RESET}`);
                continue;
            }

            const opportunity = findArbitrageOpportunity(binanceBook, bitgetBook);

            if (opportunity) {
                log(`${GREEN}-----------------------------------------------------${RESET}`);
                log(`${GREEN}🚀 ARBITRAGE OPPORTUNITY FOUND for ${pair} 🚀${RESET}`);
                log(`${GREEN}-----------------------------------------------------${RESET}`);
                log(`${BLUE}Buy on ${opportunity.buyExchange} at ${opportunity.buyPrice}${RESET}`);
                log(`${BLUE}Sell on ${opportunity.sellExchange} at ${opportunity.sellPrice}${RESET}`);
                log(`${GREEN}Potential net profit: ${opportunity.netProfitPercentage.toFixed(2)}%${RESET}`);

                if (!isBalanceSufficient(opportunity.buyExchange, quoteCurrency, tradeAmountUSDT)) {
                    log(`${RED}Insufficient balance on ${opportunity.buyExchange} for ${quoteCurrency}${RESET}`);
                    continue;
                }

                const profit = await executeTrade(
                    opportunity.buyExchange,
                    opportunity.sellExchange,
                    tradeAmountUSDT,
                    opportunity.symbol,
                    opportunity.buyPrice,
                    opportunity.sellPrice
                );
                

                if (profit > 0) {
                    totalProfit += profit;
                    trades++;
                    log(`${GREEN}Trade executed successfully. Profit: ${profit.toFixed(8)} USDT${RESET}`);

                       emitter.emit('tradeExecuted', {
                        pair,
                        buyExchange: opportunity.buyExchange,
                        sellExchange: opportunity.sellExchange,
                        buyPrice: opportunity.buyPrice,
                        sellPrice: opportunity.sellPrice,
                        profit
                    });
                } else {
                    log(`${YELLOW}Trade aborted due to unfavorable conditions${RESET}`);
                }

                log(`${GREEN}-----------------------------------------------------${RESET}`);
            } else {
                log(`${YELLOW}No profitable arbitrage opportunity found for ${pair}${RESET}`);
                emitter.emit('noArbitrage', { pair });
            }
        } catch (error) {
            handleError(error, `processing ${pair}`);
        }
    }

    log(`${BLUE}Total profit: ${GREEN}${totalProfit.toFixed(8)} USDT${RESET}`);
    log(`${BLUE}Total trades: ${GREEN}${trades}${RESET}`);
    log(`${YELLOW}Waiting for next cycle...${RESET}`);
    log('\n');
}

async function main() {

  

    config = JSON.parse(fs.readFileSync('config2.json', 'utf8'));
    tradingPairs = config.tradingPairs; 
    
    

    log(`${BLUE}Starting arbitrage bot in ${simulationMode ? 'simulation' : 'real'} mode...${RESET}`);

    if (simulationMode) {
        initializeSimulatedBalances();
    } else {
        await updateBalances();
    }

    let balanceCheckCounter = 0;

    while (n<=3) {
        await tradingLoop();

        balanceCheckCounter++;
        if (balanceCheckCounter >= balanceCheckInterval) {
            await updateBalances();
            balanceCheckCounter = 0;
        }

        log(`${GREEN}Total profit: ${totalProfit.toFixed(8)} USDT${RESET}`);
        log(`${BLUE}Total trades: ${trades}${RESET}`);
        log(`${YELLOW}Waiting for next cycle...${RESET}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        n++;
    }
    n=0;
}


module.exports = {main,emitter};



