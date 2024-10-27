const express = require('express');
const axios = require('axios');
const fs = require('fs');
const cors = require('cors');

const { main, emitter } = require('./newone');

const app = express();
const PORT = 3002; 

app.use(cors()); 

let tradeResults = []; 
let commonPairs = [];
let isArbitrageInProgress = false; 

const NUMBER_OF_TOP_MOVERS = 50;
const binanceUrl = 'https://api.binance.com/api/v3/ticker/24hr';
const bitgetUrl = 'https://api.bitget.com/api/v2/spot/market/tickers';
const configFilePath = './config2.json'; 

async function getBinanceTopMovers() {
    try {
        const response = await axios.get(binanceUrl);
        const data = response.data;

        const topGainers = data
            .filter((coin) => parseFloat(coin.priceChangePercent) > 0)
            .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
            .slice(0, NUMBER_OF_TOP_MOVERS);

        return { topGainers };
    } catch (error) {
        console.error('Error fetching Binance top movers:', error.message);
    }
}

async function getBitgetTopMovers() {
    try {
        const response = await axios.get(bitgetUrl);
        const data = response.data.data;

        const topGainers = data
            .filter((coin) => parseFloat(coin.change24h) > 0)
            .sort((a, b) => parseFloat(b.change24h) - parseFloat(a.change24h))
            .slice(0, NUMBER_OF_TOP_MOVERS);

        return { topGainers };
    } catch (error) {
        console.error('Error fetching Bitget top movers:', error.message);
    }
}

async function getTopMovers() {
    console.log('Fetching top gainers from both exchanges...');

    const binanceMovers = await getBinanceTopMovers();
    const bitgetMovers = await getBitgetTopMovers();

    if (binanceMovers && bitgetMovers) {
        const commonPairs = findCommonPairs(binanceMovers, bitgetMovers);

        if (commonPairs.length > 0) {
             updateConfigWithCommonPairs(commonPairs);

            return commonPairs;
        } else {
            console.log('No common pairs found in top gainers of both exchanges.');
            return Promise.resolve(); 
        }
    }
}

function findCommonPairs(binanceMovers, bitgetMovers) {
    const binanceGainers = binanceMovers.topGainers.map((coin) => coin.symbol);
    const bitgetGainers = bitgetMovers.topGainers.map((coin) => coin.symbol);

    const commonGainers = binanceGainers.filter((symbol) => bitgetGainers.includes(symbol));
    const formattedPairs = commonGainers.map((symbol) => formatSymbol(symbol));

    return formattedPairs;
}

function formatSymbol(symbol) {
    const base = symbol.slice(0, -4); 
    const quote = symbol.slice(-4); 
    return `${base}/${quote}`;
}

function updateConfigWithCommonPairs(commonPairs) {
    return new Promise((resolve, reject) => {
        fs.readFile(configFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading config file:', err);
                return reject(err);
            }

            try {
                const config = JSON.parse(data);
                config.tradingPairs = commonPairs;

                fs.writeFile(configFilePath, JSON.stringify(config, null, 2), (err) => {
                    if (err) {
                        console.error('Error writing to config file:', err);
                        return reject(err);
                    } else {
                        console.log('Config file updated successfully with common pairs:', commonPairs);
                        return resolve(); 
                    }
                });
            } catch (error) {
                console.error('Error parsing config file:', error);
                return reject(error);
            }
        });
    });
}


app.get('/api/common-pairs', async (req, res) => {
    try {
        if (!isArbitrageInProgress) {
            commonPairs = await getTopMovers();

            if (commonPairs.length > 0) {
                res.json({ commonPairs });

                isArbitrageInProgress = true;

                await main();

                isArbitrageInProgress = false;
            } else {
                res.json({ message: 'No common pairs found for arbitrage' });
            }
        } else {
            res.json({ message: 'Arbitrage process already in progress' });
        }
    } catch (error) {
        console.error('Error fetching common pairs:', error);
        res.status(500).json({ error: 'Failed to fetch common pairs' });
    }
});

app.get('/api/trade-results', (req, res) => {
    if (tradeResults.length > 0) {
        res.json({ trades: tradeResults });
    } else if (commonPairs.length > 0 && isArbitrageInProgress) {
        res.json({ message: 'Arbitrage trading in progress... No results yet' });
    } else {
        res.json({ message: 'No arbitrage opportunities found' });
    }
});

emitter.on('tradeExecuted', (tradeData) => {
    tradeResults.push(tradeData); 
    console.log('Trade executed:', tradeData);
});

emitter.on('arbitrageCompleted', (data) => {
    if (data.trades.length > 0) {
        tradeResults.push(...data.trades);
    } else {
        tradeResults.push({ message: 'No arbitrage opportunities found for any of the pairs' });
    }

    isArbitrageInProgress = false;
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});