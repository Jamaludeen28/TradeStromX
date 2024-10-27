require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

// Configuration
const tradingPair = 'ETH/USDT';
const [baseCurrency, quoteCurrency] = tradingPair.split('/');
const binancePair = tradingPair.replace('/', '');
const bitgetPair = `${baseCurrency}${quoteCurrency}_SPBL`;

const minProfitPercentage = 0.001; // 0.5%
const fixedTradeAmountUSDT = 1; // Fixed amount to trade in USDT
const maxRetries = 3;
const retryDelay = 5000; // 5 seconds
const SIMULATION_MODE = true; // Set to false to execute real trades

// API Keys
const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_SECRET_KEY = process.env.BINANCE_SECRET_KEY;
const BITGET_API_KEY = process.env.BITGET_API_KEY;
const BITGET_SECRET_KEY = process.env.BITGET_SECRET_KEY;

// Simulated balances
let binanceBalance = { [baseCurrency]: 100, [quoteCurrency]: 10000 };
let bitgetBalance = { [baseCurrency]: 100, [quoteCurrency]: 10000 };

function fetchBinanceOrderBook(symbol) {
    return new Promise(function(resolve, reject) {
        axios.get(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=5`)
            .then(function(response) {
                var data = response.data;
                resolve({
                    exchange: 'binance',
                    bids: parseFloat(data.bids[0][0]),
                    asks: parseFloat(data.asks[0][0])
                });
            })
            .catch(function(error) {
                console.error('Error fetching Binance order book:', error.message);
                reject(error);
            });
    });
}

function fetchBitgetOrderBook(symbol) {
    return new Promise(function(resolve, reject) {
        axios.get(`https://api.bitget.com/api/spot/v1/market/depth?symbol=${symbol}&type=step0`)
            .then(function(response) {
                var data = response.data.data;
                resolve({
                    exchange: 'bitget',
                    bids: parseFloat(data.bids[0][0]),
                    asks: parseFloat(data.asks[0][0])
                });
            })
            .catch(function(error) {
                console.error('Error fetching Bitget order book:', error.message);
                reject(error);
            });
    });
}

function fetchOrderBookWithRetry(fetchFunction, symbol) {
    return new Promise(function(resolve, reject) {
        var attempts = 0;
        function attempt() {
            fetchFunction(symbol)
                .then(resolve)
                .catch(function(error) {
                    attempts++;
                    if (attempts < maxRetries) {
                        setTimeout(attempt, retryDelay);
                    } else {
                        reject(error);
                    }
                });
        }
        attempt();
    });
}

function findArbitrageOpportunity(book1, book2) {
    var buyBook = book1.asks < book2.asks ? book1 : book2;
    var sellBook = book1.bids > book2.bids ? book1 : book2;

    var buyPrice = buyBook.asks;
    var sellPrice = sellBook.bids;

    var profitPercentage = ((sellPrice - buyPrice) / buyPrice) * 100;
    
    if (profitPercentage > minProfitPercentage) {
        return { 
            buyExchange: buyBook.exchange, 
            sellExchange: sellBook.exchange, 
            buyPrice: buyPrice, 
            sellPrice: sellPrice, 
            profitPercentage: profitPercentage 
        };
    }

    return null;
}

function executeBinanceTrade(side, amountBase, price) {
    return new Promise(function(resolve, reject) {
        var amountQuote = amountBase * price;
        if (SIMULATION_MODE) {
            console.log(`Simulating Binance ${side} order: ${amountBase} ${baseCurrency} at ${price} ${tradingPair}`);
            if (side === 'buy') {
                if (binanceBalance[quoteCurrency] >= amountQuote) {
                    binanceBalance[quoteCurrency] -= amountQuote;
                    binanceBalance[baseCurrency] += amountBase;
                } else {
                    console.log(`Insufficient ${quoteCurrency} balance on Binance for buy order`);
                    resolve(null);
                    return;
                }
            } else {
                if (binanceBalance[baseCurrency] >= amountBase) {
                    binanceBalance[baseCurrency] -= amountBase;
                    binanceBalance[quoteCurrency] += amountQuote;
                } else {
                    console.log(`Insufficient ${baseCurrency} balance on Binance for sell order`);
                    resolve(null);
                    return;
                }
            }
            resolve({ simulated: true, side: side, amountBase: amountBase, price: price, amountQuote: amountQuote });
            return;
        }

        var timestamp = Date.now();
        var params = new URLSearchParams({
            symbol: binancePair,
            side: side.toUpperCase(),
            type: 'MARKET',
            quantity: amountBase.toFixed(8),
            timestamp: timestamp
        });

        var signature = crypto
            .createHmac('sha256', BINANCE_SECRET_KEY)
            .update(params.toString())
            .digest('hex');

        params.append('signature', signature);

        axios.post('https://api.binance.com/api/v3/order', params.toString(), {
            headers: {
                'X-MBX-APIKEY': BINANCE_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then(function(response) {
            console.log(`Binance ${side} order executed successfully:`, response.data);
            resolve(response.data);
        })
        .catch(function(error) {
            console.error('Error executing Binance trade:', error.response ? error.response.data : error.message);
            if (error.response && error.response.data.code === -2015) {
                console.error('Invalid API key or permissions. Please check your Binance API configuration.');
            }
            resolve(null);
        });
    });
}

function executeBitgetTrade(side, amountBase, price) {
    return new Promise(function(resolve, reject) {
        var amountQuote = amountBase * price;
        if (SIMULATION_MODE) {
            console.log(`Simulating Bitget ${side} order: ${amountBase} ${baseCurrency} at ${price} ${tradingPair}`);
            if (side === 'buy') {
                if (bitgetBalance[quoteCurrency] >= amountQuote) {
                    bitgetBalance[quoteCurrency] -= amountQuote;
                    bitgetBalance[baseCurrency] += amountBase;
                } else {
                    console.log(`Insufficient ${quoteCurrency} balance on Bitget for buy order`);
                    resolve(null);
                    return;
                }
            } else {
                if (bitgetBalance[baseCurrency] >= amountBase) {
                    bitgetBalance[baseCurrency] -= amountBase;
                    bitgetBalance[quoteCurrency] += amountQuote;
                } else {
                    console.log(`Insufficient ${baseCurrency} balance on Bitget for sell order`);
                    resolve(null);
                    return;
                }
            }
            resolve({ simulated: true, side: side, amountBase: amountBase, price: price, amountQuote: amountQuote });
            return;
        }

        var timestamp = Date.now().toString();
        var params = {
            symbol: bitgetPair,
            side: side.toUpperCase(),
            orderType: 'market',
            quantity: amountBase.toFixed(8),
            timestamp: timestamp
        };

        var sortedParams = Object.keys(params).sort().reduce(function(acc, key) {
            acc[key] = params[key];
            return acc;
        }, {});

        var stringToSign = timestamp + 'POST' + '/api/spot/v1/trade/orders' + JSON.stringify(sortedParams);
        var signature = crypto.createHmac('sha256', BITGET_SECRET_KEY).update(stringToSign).digest('hex');

        axios.post('https://api.bitget.com/api/spot/v1/trade/orders', params, {
            headers: {
                'ACCESS-KEY': BITGET_API_KEY,
                'ACCESS-SIGN': signature,
                'ACCESS-TIMESTAMP': timestamp,
                'Content-Type': 'application/json'
            }
        })
        .then(function(response) {
            console.log(`Bitget ${side} order executed successfully:`, response.data);
            resolve(response.data);
        })
        .catch(function(error) {
            console.error('Error executing Bitget trade:', error.response ? error.response.data : error.message);
            if (error.response && error.response.data.code === '40037') {
                console.error('Invalid API key. Please check your Bitget API configuration.');
            }
            resolve(null);
        });
    });
}

function executeTrade(buyExchange, sellExchange, buyPrice, sellPrice) {
    return new Promise(function(resolve, reject) {
        var amountBase = fixedTradeAmountUSDT / buyPrice;

        console.log(`Executing trade: Buy ${amountBase} ${baseCurrency} on ${buyExchange} at ${buyPrice}`);
        console.log(`                 Sell ${amountBase} ${baseCurrency} on ${sellExchange} at ${sellPrice}`);
        
        var buyOrderPromise = buyExchange === 'binance' ? 
            executeBinanceTrade('buy', amountBase, buyPrice) : 
            executeBitgetTrade('buy', amountBase, buyPrice);

        buyOrderPromise.then(function(buyOrder) {
            if (!buyOrder) {
                console.log('Failed to execute buy order');
                resolve();
                return;
            }

            var sellOrderPromise = sellExchange === 'binance' ? 
                executeBinanceTrade('sell', amountBase, sellPrice) : 
                executeBitgetTrade('sell', amountBase, sellPrice);

            sellOrderPromise.then(function(sellOrder) {
                if (!sellOrder) {
                    console.log('Failed to execute sell order');
                    resolve();
                    return;
                }

                console.log('Trade executed successfully');
                if (SIMULATION_MODE) {
                    console.log('Buy order:', buyOrder);
                    console.log('Sell order:', sellOrder);
                }
                resolve();
            });
        });
    });
}

function main() {
    setInterval(function() {
        Promise.all([
            fetchOrderBookWithRetry(fetchBinanceOrderBook, binancePair),
            fetchOrderBookWithRetry(fetchBitgetOrderBook, bitgetPair)
        ])
        .then(function(results) {
            var binanceBook = results[0];
            var bitgetBook = results[1];

            if (binanceBook && bitgetBook) {
                console.log(`Current prices for ${tradingPair}:`);
                console.log(`Binance - Buy: ${binanceBook.asks}, Sell: ${binanceBook.bids}`);
                console.log(`Bitget  - Buy: ${bitgetBook.asks}, Sell: ${bitgetBook.bids}`);

                var opportunity = findArbitrageOpportunity(binanceBook, bitgetBook);

                if (opportunity) {
                    console.log('Arbitrage opportunity found!');
                    console.log(`Buy on ${opportunity.buyExchange} at ${opportunity.buyPrice}`);
                    console.log(`Sell on ${opportunity.sellExchange} at ${opportunity.sellPrice}`);
                    console.log(`Potential profit: ${opportunity.profitPercentage.toFixed(2)}%`);

                    executeTrade(
                        opportunity.buyExchange,
                        opportunity.sellExchange,
                        opportunity.buyPrice,
                        opportunity.sellPrice
                    ).then(function() {
                        if (SIMULATION_MODE) {
                            console.log('Current balances:');
                            console.log(`Binance: ${baseCurrency}: ${binanceBalance[baseCurrency]}, ${quoteCurrency}: ${binanceBalance[quoteCurrency]}`);
                            console.log(`Bitget: ${baseCurrency}: ${bitgetBalance[baseCurrency]}, ${quoteCurrency}: ${bitgetBalance[quoteCurrency]}`);
                        }
                    });
                } else {
                    console.log('No arbitrage opportunity found.');
                }
            } else {
                console.log('Failed to fetch order books after multiple attempts. Skipping this iteration.');
            }
        })
        .catch(function(error) {
            console.error('An error occurred in the main loop:', error.message);
        });
    }, 5000); // 5 seconds delay between iterations
}

main();





































