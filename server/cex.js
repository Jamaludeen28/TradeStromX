const ccxt = require('ccxt');
const log4js = require('log4js');
const logger = log4js.getLogger();

async function getBalance(exchange, symbol) {
    const startTime = Date.now();
    try {
        const balance = await exchange.fetchFreeBalance();
        const [baseSymbol, quoteSymbol] = symbol.split('/');
        
        const endTime = Date.now();
        logger.info(`Balance fetch took ${endTime - startTime}ms`);

        return {
            [baseSymbol]: balance[baseSymbol] || 0,
            [quoteSymbol]: balance[quoteSymbol] || 0
        };
    } catch (error) {
        logger.error(`Error fetching balance for ${symbol}: ${error.message}`, {
            stack: error.stack,
            symbol,
            timeTaken: Date.now() - startTime
        });

        return {
            [symbol.split('/')[0]]: 0,
            [symbol.split('/')[1]]: 0
        };
    }
}


async function calcPurchaseAmount(exchange, symbol, usdAmount) {
    try {
        const orderBook = await exchange.fetchOrderBook(symbol, 10);
        const asks = orderBook.asks;
        let amountToBuy = 0;
        let remainingUsdAmount = usdAmount;

        for (let i = 0; i < asks.length; i++) {
            const [askPrice, askAmount] = asks[i];
            const askCost = askAmount * askPrice;

            if (remainingUsdAmount >= askCost) {
                amountToBuy += askAmount;
                remainingUsdAmount -= askCost;
            } else {
                amountToBuy += remainingUsdAmount / askPrice;
                remainingUsdAmount = 0;
                break;
            }
        }

        return { amount: amountToBuy.toFixed(5), price: asks[0][0] };
    } catch (error) {
        logger.error(`Error in calcPurchaseAmount(): ${error}`);
        return { amount: 0, price: 0 };
    }
}



async function calcSellingPrice(exchange, symbol, amount) {
    try {
        const orderBook = await exchange.fetchOrderBook(symbol, 10);
        const bids = orderBook.bids;
        let amountToSell = amount;
        let totalValue = 0;

        for (let i = 0; i < bids.length; i++) {
            const [bidPrice, bidAmount] = bids[i];
            const sellAmount = Math.min(amountToSell, bidAmount);
            totalValue += sellAmount * bidPrice;
            amountToSell -= sellAmount;

            if (amountToSell <= 0) {
                break;
            }
        }

        if (amountToSell > 0) {
            throw new Error('Not enough liquidity to sell the entire amount');
        }

        return totalValue / amount; // Average selling price
    } catch (error) {
        logger.error(`Error in calcSellingPrice(): ${error}`);
        return 0;
    }
}



async function buy(exchange, symbol, amount, price) {
    if (!amount || !price) {
        logger.error('Invalid amount or price for buy order');
        return;
    }

    logger.info(`Buy ${symbol} on ${exchange.id}, amount: ${amount} with price: ${price}`);
    // return exchange.createLimitBuyOrder(symbol, amount, price);
}

async function sell(exchange, symbol, amount) {
    try {
        const price = await calcSellingPrice(exchange, symbol, amount);
        if (!amount || !price) {
            logger.error('Invalid amount or price for sell order');
            return;
        }

        logger.info(`Sell ${symbol} on ${exchange.id}, amount: ${amount} with price: ${price}`);
        // Simulate the sell order by calculating the total revenue
        const totalRevenue = amount * price;
        return totalRevenue;
    } catch (error) {
        logger.error(`Error in sell(): ${error}`);
        return 0;
    }
}
module.exports = { getBalance, calcPurchaseAmount, buy, sell };