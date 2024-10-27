const fs = require('fs');
const { getBalance1, calcPurchaseAmount1, buy1, sell1 } = require('./cex1');
const { OpportunityFinder } = require('./finders1');
const log4js = require('log4js');
const axios = require('axios');

log4js.configure({
    appenders: { app: { type: 'file', filename: 'app.log' } },
    categories: { default: { appenders: ['app'], level: 'info' } }
});
const logger = log4js.getLogger();

async function processPair1(pair, config, amountInUsd) {
    logger.info(`Price monitoring started for ${pair}...`);
    let purchaseExchange, sellingExchange;

    try {
        const finder = new OpportunityFinder(pair, config.exchanges);
        const opportunity = await finder.findOpportunity1();
        if (!opportunity) {
            logger.info(`${pair} - Opportunity not found.`);
            return null;
        }

        const purchasePrice = opportunity.lowestAsk.price;
        purchaseExchange = opportunity.lowestAsk.exchange;
        const sellingPrice = opportunity.highestBid.price;
        sellingExchange = opportunity.highestBid.exchange;

        logger.info(`${pair} - ${purchaseExchange.id} price: ${purchasePrice.toFixed(13)}`);
        logger.info(`${pair} - ${sellingExchange.id} price: ${sellingPrice.toFixed(13)}`);

        const purchaseBalance = await getBalance1(purchaseExchange, pair);
        const sellingBalance = await getBalance1(sellingExchange, pair);

        logger.info(`${pair} - ${purchaseExchange.id} balance: ${JSON.stringify(purchaseBalance)}`);
        logger.info(`${pair} - ${sellingExchange.id} balance: ${JSON.stringify(sellingBalance)}`);

        const { amount: purchaseAmount, price: finalPurchasePrice } = await calcPurchaseAmount1(purchaseExchange, pair, amountInUsd);
        const totalCost = purchaseAmount * finalPurchasePrice;
        buy1(purchaseExchange, pair, purchaseAmount, purchasePrice);
        const totalRevenue = await sell1(sellingExchange, pair, purchaseAmount);
        const priceDiff = totalRevenue - totalCost;
        const profitPercentage = (priceDiff / totalCost) * 100;
        const token2 = pair.split('/')[1];
        const tokenPriceInUSD = await fetchTokenPriceInUSD1(token2);
        const profitInUSD = priceDiff * tokenPriceInUSD;

        if (priceDiff > 0) {
            const result = {
                ticker: pair,
                lowestAsk: {
                    price: finalPurchasePrice,
                    exchange: purchaseExchange.id,
                    amount: purchaseAmount
                },
                highestBid: {
                    price: sellingPrice,
                    exchange: sellingExchange.id,
                    amount: purchaseAmount
                },
                profit: priceDiff,
                profitPercentage: profitPercentage.toFixed(2),
                totalCost: totalCost,
                totalRevenue: totalRevenue,
                profitInUSD: profitInUSD
            };

            return result;
        } else {
            return null;
        }

    } catch (error) {
        logger.error(`Error in processPair1() for ${pair}:`, error);
        await Promise.all([
            purchaseExchange?.close(),
            sellingExchange?.close()
        ]);
        return null;
    }
}

async function fetchTokenPriceInUSD1(tokenSymbol) {
    try {
        const response = await axios.get(`https://min-api.cryptocompare.com/data/price`, {
            params: {
                fsym: tokenSymbol,
                tsyms: 'USD',
                api_key: '2aeee6fbe025c5317ce4c9e7bd537ab2d245e31c288838e55580dc88d7ba8fb2'
            }
        });
        // Extract the price in USD
        return response.data.USD;
    } catch (error) {
        console.error(`Error fetching price for ${tokenSymbol}:`, error);
        throw error; // Re-throw the error for handling in caller
    }
}

async function monitorPrices1(config, pairs, amount) {
    console.log('Pairs to process:', pairs); // Debug log
    const allOpportunities = []; // Collect all opportunities

    for (const pair of pairs) {
        const opportunity = await processPair1(pair, config, amount);
        console.log("Opportunity for pair:", pair, "=>", opportunity); // Debug log
        if (opportunity) {
            allOpportunities.push(opportunity);
            logger.info(`Opportunity added: ${JSON.stringify(opportunity)}`);
        } else {
            logger.info(`No opportunity for ${pair}`);
        }

        // Optional: Add a delay between processing pairs if needed
        await new Promise(resolve => setTimeout(resolve, config.pause * 1000));
    }

    logger.info('All pairs processed.');
    console.log('Opportunities:', allOpportunities); // Print all opportunities
    return allOpportunities; // Return collected opportunities
}


function loadConfig1(token1, token2) {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const pairs = getCommonPairs(token1, token2, config.exchanges);

    if (pairs.length === 0) {
        throw new Error(`No common pairs found for tokens ${token1} and ${token2}`);
    }

    return { config, pairs };
}


function getCommonPairs(token1, token2, exchanges) {
    const bybitPairs = exchanges.find(ex => ex.name === 'bybit').supportedPairs;
    const krakenPairs = exchanges.find(ex => ex.name === 'kraken').supportedPairs;

    const bybitTokenPairs = bybitPairs
        .filter(pair => pair.startsWith(token1) && pair.endsWith(token2))
        .map(pair => `${pair.slice(0, token1.length)}/${pair.slice(token1.length)}`);

    const krakenTokenPairs = krakenPairs
        .filter(pair => pair.startsWith(token1) && pair.endsWith(token2))
        .map(pair => pair.replace('/', ''));

    return bybitTokenPairs.filter(pair => krakenTokenPairs.includes(pair.replace('/', '')));
}

module.exports = { monitorPrices1, loadConfig1 };
