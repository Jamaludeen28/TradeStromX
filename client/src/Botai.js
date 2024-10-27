import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BotAi = () => {
    const [commonPairs, setCommonPairs] = useState([]);
    const [tradeResults, setTradeResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [hasStarted, setHasStarted] = useState(false); 


    const handleStartTrade = () => {
        setLoading(true);
        setHasStarted(true); 
        setStatusMessage('Fetching common pairs and starting arbitrage...');

        axios.get('http://localhost:3002/api/common-pairs')
            .then(response => {
                if (response.data.commonPairs) {
                    setCommonPairs(response.data.commonPairs);
                    setStatusMessage('Common pairs found. Initiating arbitrage...');
                } else if (response.data.message) {
                    setStatusMessage(response.data.message);
                }
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching common pairs:', error);
                setStatusMessage('Failed to fetch common pairs.');
                setLoading(false);
            });
    };

    useEffect(() => {
        if (hasStarted) {
            const interval = setInterval(() => {
                axios.get('http://localhost:3002/api/trade-results')
                    .then(response => {
                        if (response.data.trades) {
                            setTradeResults(response.data.trades);
                        } else if (response.data.message) {
                            setStatusMessage(response.data.message);
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching trade results:', error);
                    });
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [hasStarted]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-8">
            <div className="w-full max-w-lg bg-white shadow-md rounded-lg p-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Arbitrage Dashboard</h1>
                
                <button 
                    onClick={handleStartTrade}
                    className={`px-6 py-3 text-lg rounded-lg text-white transition-colors duration-300 ease-in-out 
                                ${loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'} mb-8 w-full`}
                    disabled={loading} 
                >
                    {loading ? 'Fetching the Pairs...' : 'Start Trade'}
                </button>

                {hasStarted && !loading && ( 
                    <>
                        <h2 className="text-xl font-medium text-gray-700 mb-2">Status:</h2>
                        <p className="text-lg text-gray-600 mb-6">{statusMessage}</p>

                        {commonPairs.length > 0 && (
                            <>
                                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Common Pairs:</h2>
                                <ul className="list-disc list-inside mb-6">
                                    {commonPairs.map((pair, index) => (
                                        <li key={index} className="text-gray-700">{pair}</li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {tradeResults.length > 0 && (
                            <>
                                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Trade Results:</h2>
                                <ul className="list-disc list-inside">
                                    {tradeResults.map((result, index) => (
                                        <li key={index} className="text-gray-700">
                                            {result.message || `Trade executed for ${result.pair} with profit: ${result.profit}`}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default BotAi;
