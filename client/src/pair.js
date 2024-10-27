import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const Pair = () => {
    const location = useLocation();
    const { token, amount } = location.state || JSON.parse(localStorage.getItem('pairState')) || {};
    const [opportunities, setOpportunities] = useState(null);

    useEffect(() => {
        const fetchOpportunities = async () => {
            if (token && amount) {
                try {
                    const response = await axios.post('http://localhost:3002/api/find-opportunity', {
                        token,
                        amount
                    });
                    

                    if (response.data) {
                        setOpportunities(response.data.data);
                        console.log(response.data);
                    } else {
                        setOpportunities([]);
                    }
                } catch (error) {
                    console.error('Error fetching opportunity:', error);
                    setOpportunities([]);
                }
            }
        };

        fetchOpportunities();
    }, [token, amount]);

    useEffect(() => {
        if (token && amount) {
            localStorage.setItem('pairState', JSON.stringify({ token, amount }));
        }
    }, [token, amount]);


    const handleTrade = async (opportunity) => {
        try {
            // Send request to the backend to execute the trade
            const response = await axios.post('http://localhost:3002/execute-trade', {
                token: opportunity.ticker,
                buyExchange: opportunity.lowestAsk.exchange,
                sellExchange: opportunity.highestBid.exchange,
                buyPrice: opportunity.totalCost.toFixed(5),
            });
    
            if (response.data.success) {
                alert('Trade executed successfully');
            } else {
                alert('Trade execution failed');
            }
        } catch (error) {
            console.error('Error executing trade:', error);
            alert('Error executing trade');
        }
    };
    
    

    return (
        <div className="text-white font-poppins overflow-hidden">
            <div className='min-h-screen' style={{ backgroundImage: 'url(./assets/image94.png)' }}>
                <div className='py-20'>
                <div>
          <img
            src="./assets/poppers.png"
            className="w-[10rem] md:w-[20rem] 2xl:w-[24rem] absolute"
            alt=""
          ></img>
          <img
            src="./assets/poppers.png"
            className="w-[10rem] md:w-[20rem] 2xl:w-[24rem] scale-x-[-1] absolute right-0"
            alt=""
          ></img>
        </div>
                    <div className="md:absolute md:top-14 md:-left-48 md:w-[30rem] md:h-[30rem] md:filter md:blur-3xl  md:bg-[#E4387536] md:rounded-full"></div>

                    <p className="text-center font-bold text-[#979797] text-2xl md:text-3xl 2xl:[48px] tracking-widest">
            PAIRS
          </p>

                    
                    <div className="mt-10">
                            {opportunities === null ? (
                                <p className='flex justify-center'>Fetching Pairs...</p>
                            ) : opportunities.length > 0 ? (
                                <div className='flex flex-wrap gap-6  justify-center'>
                                    {opportunities.map((opportunity, index) => (
                                        <div key={index} className='bg-pink-200 border-[#f4b4cb] border-8 p-6 rounded-xl shadow-md w-full md:w-[45%] lg:w-[30%]'>
                                            <div className="bg-[#E4387536] w-full text-center rounded-t-md 2xl:rounded-t-xl border-b border-[#E4387536]">
                                                <p className="pt-2 2xl:pt-4 pb-1 2xl:pb-2 flex justify-center font-bold 2xl:text-xl">
                                                    Pairs<p className="flex flex-col ml-4"></p>
                                                </p>
                                            </div>
                                            <div className="flex text-sm 2xl:text-lg bg-[#E4387536] rounded-b-md 2xl:rounded-b-xl">
                                                <div className="w-[50%] pt-2 2xl:pt-4 pb-3 2xl:pb-5 flex justify-center">
                                                    {opportunity.ticker ? opportunity.ticker.split('/')[0] : "N/A"}
                                                </div>
                                                <p className="flex flex-col ml-4 mt-3">
                                                    <i className="fa-solid fa-arrow-right-long"></i>
                                                    <i className="fa-solid fa-arrow-left-long -translate-x-2 -translate-y-2"></i>
                                                </p>
                                                <div className="w-[50%] pt-2 2xl:pt-4 pb-3 2xl:pb-5 flex justify-center">
                                                    {opportunity.ticker ? opportunity.ticker.split('/')[1] : "N/A"}
                                                </div>
                                            </div>
                                            <div className="pt-2 2xl:pt-4 text-sm px-3 pb-3 2xl:pb-5 flex justify-between">
                                                <p className="mt-1">
                                                    Buy Price: {opportunity.totalCost.toFixed(5)}
                                                </p>
                                                <p className="mt-1"> {opportunity.lowestAsk.exchange}</p>
                                            </div>
                                            <div className="pt-2 2xl:pt-4 text-sm pb-3 px-3 2xl:pb-5 flex justify-between">
                                                <p className="mt-1">
                                                    Sell Price : {opportunity.totalRevenue.toFixed(5)}
                                                </p>
                                                <p className="mt-1"> {opportunity.highestBid.exchange}</p>
                                            </div>
                                            <div className="pt-2 2xl:pt-4 text-sm pb-3 px-3 2xl:pb-5 flex justify-between">
                                                <p className="mt-1">
                                                    Profit Amount :{" "}
                                                    <span className="text-green-500">
                                                        {opportunity.profit.toFixed(5)}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="pt-2 2xl:pt-4 text-sm pb-3 px-3 2xl:pb-5 flex justify-between">
                                                <p className="mt-1">
                                                    Profit Percentage :{" "}
                                                    <span className="text-green-500">
                                                        {opportunity.profitPercentage} %
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="flex justify-center mt-5">
                                                <button
                                                    className="bg-blue-500 hover:bg-transparent border-transparent border hover:border-blue-500 text-white font-bold py-2 px-4 rounded"
                                                    onClick={() => handleTrade(opportunity)}

                                                >
                                                    Trade
                                                </button>
                                            </div>
                                        </div>

                                    ))}
                                </div>
                            ) : (
                                <p className='flex justify-center'>No opportunities found.</p>
                            )}
                        </div>
                    </div>
                </div>
            
        </div>
    );
};

export default Pair;