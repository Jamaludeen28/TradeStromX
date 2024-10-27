const ccxt = require('ccxt');

class OpportunityFinder {
    constructor(marketName, exchanges) {
        this.exchangeList = exchanges.map(exchange => new ccxt[exchange.name]({
            apiKey: exchange.apiKey,
            secret: exchange.secret,
            password: exchange.password,
            timeout: 60000,
            enableRateLimit: true,
        }));
        this.marketName = marketName;
        this.highestBid = { exchange: null, price: -1 };
        this.lowestAsk = { exchange: null, price: Infinity };
    }

    async _testBidAndAsk1(exchange) {
        try {
            await exchange.loadMarkets();
            const orderBook = await exchange.fetchOrderBook(this.marketName, 5);
            const ask = orderBook.asks[0][0];
            const bid = orderBook.bids[0][0];

            if (this.highestBid.price < bid) {
                this.highestBid.price = bid;
                this.highestBid.exchange = exchange;
            }

            if (ask < this.lowestAsk.price) {
                this.lowestAsk.price = ask;
                this.lowestAsk.exchange = exchange;
            }
        } catch (error) {
            console.error(`Error fetching data from exchange ${exchange.id}:`, error);
        }
    }

    async findOpportunity1() {
        await Promise.all(this.exchangeList.map(exchange => this._testBidAndAsk1(exchange)));
        const opportunity = {
            highestBid: this.highestBid,
            lowestAsk: this.lowestAsk,
            ticker: this.marketName
        };
        console.log('Opportunity found:', opportunity.ticker); // Log the opportunity
        return opportunity;
    }
}

module.exports = { OpportunityFinder };