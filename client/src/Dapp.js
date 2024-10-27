import React, { useState } from 'react';
import Select from 'react-select';
import axios from 'axios';
import Header from './Header';
import { useMediaQuery } from 'react-responsive';
import {
    faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Dapp = () => {
    const [selectedToken1, setSelectedToken1] = useState('');
    const [selectedToken2, setSelectedToken2] = useState('');
    const [amount, setAmount] = useState('');
    const [opportunities, setOpportunities] = useState([{
        pair: 'N/A',
        lowestAsk: { exchange: 'N/A', price: 0 },
        highestBid: { exchange: 'N/A', price: 0 },
        profit: 0,
        profitPercentage: 0
    }]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const tokens = [
        { name: 'BTC', address: 'BTC', logo: './assets/bitcoin.png' },
        { name: 'ETH', address: 'ETH', logo: './assets/eth.png' },
        { name: 'DAI', address: 'DAI', logo: './assets/dai.png' },
        { name: 'LINK', address: 'LINK', logo: './assets/chain link.png' },
        { name: 'USDT', address: 'USDT', logo: './assets/tether.png' },
        
    ];

   
    const handleToken1Change = (selectedOption) => {
        setSelectedToken1(selectedOption ? selectedOption.address : '');
    };

    const handleToken2Change = (selectedOption) => {
        setSelectedToken2(selectedOption ? selectedOption.address : '');
    };

    const handleAmountChange = (event) => {
        setAmount(event.target.value);
    };

    const fetchOpportunities = async () => {
        if (selectedToken1 && selectedToken2 && amount) {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.post('http://localhost:3002/api/find-opportunity1', {
                    token1: selectedToken1,
                    token2: selectedToken2,
                    amount
                });

                if (response.data) {
                    setOpportunities(response.data.data || [{
                        ticker: '-',
                        lowestAsk: { exchange: 'N/A', price: 0 },
                        highestBid: { exchange: 'N/A', price: 0 },
                        profit: 0,
                        profitPercentage: 0
                    }]);
                } else {
                    setOpportunities([{
                        ticker: '-',
                        lowestAsk: { exchange: 'N/A', price: 0 },
                        highestBid: { exchange: 'N/A', price: 0 },
                        profit: 0,
                        profitPercentage: 0
                    }]);
                }
            } catch (err) {
                console.error('Error fetching opportunity:', err);
                setError('Failed to fetch opportunities.');
                setOpportunities([{
                    ticker: '-',
                    lowestAsk: { exchange: 'N/A', price: 0 },
                    highestBid: { exchange: 'N/A', price: 0 },
                    profit: 0,
                    profitPercentage: 0
                }]);
            } finally {
                setLoading(false);
            }
        }
    };

    const customStyles = {
        control: (provided) => ({
            ...provided,
            backgroundColor: '#000', // Background color of the control
            color: '#fff',
            border: 'none', // Remove border
        borderRadius: '0.5rem', // Adjust as needed
        boxShadow: 'none', // Text color of the control
           
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: '#000', // Background color of the dropdown menu
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? '#444' : '#000', // Background color of options
            color: '#fff', // Text color of options
            '&:hover': {
                backgroundColor: '#333', // Background color of options on hover
            },
        }),
        placeholder: (provided) => ({
            ...provided,
            color: '#fff', // Placeholder text color
        }),
        singleValue: (provided) => ({
            ...provided,
            color: '#fff', // Color of the selected value
        }),
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!amount || !selectedToken1 || !selectedToken2) {
            alert('Please select two tokens and enter an amount.');
            return;
        }
        fetchOpportunities();
    };

    const isMobile = useMediaQuery({ query: '(max-width: 736px)' });

    return (
        <div className="bg-black min-h-screen text-white font-poppins overflow-hidden">
            <Header />
            <div className="flex justify-center">
                <img className="w-5" src="assets/Sparkle.svg" />
                <h1 className="font-bold lg:text-xl text-lg font-Artemus">SWAP PAIR</h1>
            </div>
            <div className="ml-[2%] mr-[2%] md:flex justify-between rounded-2xl bg-[#E43875]/40 md:bg-[#E43875]/0 md:mt-[0%]  bg-cover bg-center bg-no-repeat" style={{
                backgroundImage: 'url("../assets/Rectangle.png")',
            }}>

                <div className='py-[5%] flex justify-between w-full'>
                    <form onSubmit={handleSubmit} className='flex justify-between w-full '>
                        <div className='flex-1 text-white flex ml-[2%] items-center'>
                            <input
                                type='number'
                                value={amount}
                                onChange={handleAmountChange}
                                placeholder='Enter Quantity'
                                className=' placeholder-white p-6 rounded-2xl w-[70%] bg-[#7b5357]'
                            />
                        </div>
                        <div className="flex items-center  "><img src="../assets/MBC Logo_Final 2.png" className="hidden md:block"></img></div>
                        <div className='flex-1 flex flex-col '>
                            <div className="flex flex-col gap-2 ml-[18%]  mb-4">
                                <div className='bg-[#7b5357] p-5 w-[80%] bg-[#7b5357] rounded-2xl'>
                                    <Select
                                        className='w-[30%] mb-4'
                                        value={tokens.find(token => token.address === selectedToken1)}
                                        onChange={handleToken1Change}
                                        options={tokens}
                                        getOptionLabel={(option) => (
                                            <div className='flex items-center'>
                                                <img src={option.logo} alt={option.name} className="h-5 mr-2" />
                                                {option.name}
                                            </div>
                                        )}
                                        getOptionValue={(option) => option.address}
                                        placeholder="Select"
                                        styles={customStyles}
                                    />
                                </div>
                                <div className="flex items-center ml-[35%] my-2 md:my-0">
                                    <img src="assets/icon.png" class='md:w-12 w-10 absolute translate-y-0' />
                                </div>
                                <div className='bg-[#7b5357] p-5 w-[80%] bg-[#7b5357] rounded-2xl'>
                                    <Select
                                        className='w-[30%]'
                                        value={tokens.find(token => token.address === selectedToken2)}
                                        onChange={handleToken2Change}
                                        options={tokens}
                                        getOptionLabel={(option) => (
                                            <div className='flex items-center'>
                                                <img src={option.logo} alt={option.name} className="h-5 mr-2" />
                                                {option.name}
                                            </div>
                                        )}
                                        getOptionValue={(option) => option.address}
                                        placeholder="Select"
                                        styles={customStyles}
                                    />
                                </div>
                            </div>
                            {/* <button className='bg-[#E43875] px-7 py-2 rounded-xl mt-4' type="submit">Confirm</button> */}
                        </div>
                    </form>
                </div>
            </div>
            <div className="flex justify-center my-6" >
                <div className="w-[10%] md:w-[27%] h-32 bg-cover bg-center font-poppins flex justify-center items-center cursor-pointer md:absolute md:-translate-y-12" style={{ backgroundImage: 'url("../assets/Rectangle 39469 (1).png")' }}>
                    <button className="-translate-y-8 text-xl font-bold" onClick={handleSubmit}>Confirm</button>
                </div>
            </div>
            <div className='flex justify-center mt-[2%]'>
                <div className="md:w-[50%] bg-gradient-to-b from-[#F98736]/35 to-[#E43875]/35 rounded-[20px] py-3 p-2">
                    <div className="flex space-x-2 px-3">
                        <img className="w-5" src="assets/Sparkle.svg" />
                        <h1 className="font-bold lg:text-xl text-lg font-Artemus">Arbitrage Details</h1>
                    </div>
                    <div className="sm:flex space-y-5 sm:space-y-0 sm:px-5 pt-5">
                        {opportunities.map((opportunity, index) => (
                            <div key={index} className="flex w-full">
                                <div className="sm:w-[50%] space-y-5 px-5 sm:border-r-2 border-white/15">
                                    <p className="text-white text-sm font-bold flex text-md justify-between truncate">
                                        Swap Tokens:<span className='text-[#1EEF32]'>{opportunity.ticker}</span>
                                    </p>
                                    <p className="text-white text-sm font-bold flex text-md justify-between truncate">
                                        Profit percent(%):<span className='text-[#1EEF32]'>{opportunity.profitPercentage}</span>
                                    </p>
                                    <p className="text-white text-sm font-bold flex text-md justify-between truncate">
                                        Profit Amount:<span className='text-[#1EEF32]'>{(opportunity.profit * 1).toFixed(6)}</span>
                                    </p>
                                </div>
                                <div className="sm:w-[50%] space-y-5 px-5">
                                    <p className="text-white text-sm font-bold flex text-md justify-between truncate">
                                        Payout Amount:<span>{amount}</span>
                                    </p>
                                    <p className="text-white text-sm font-bold flex text-md justify-between truncate">
                                        Profit Amount(USD):<span>{(opportunity.profitInUSD*1).toFixed(6)}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-5 w-[95.5%] bg-gradient-to-b from-[#F98736]/35 to-[#E43875]/35 rounded-[20px] p-3 ml-[2%] mr-[80%]">
                <div className="flex space-x-3">
                    <img src="assets/Sparkle.svg" className="w-5" />
                    <p className=" font-bold lg:text-xl text-lg font-Artemus">AI Suggestions</p>
                </div>
                {opportunities.map((opportunity, index) => (
                    <div className="mt-3 flex flex-col md:flex-row md:space-x-5">
                        <div className="md:w-[50%] flex flex-col justify-center items-center">
                            <div>
                                <p className="text-[#1EEF32] md:text-lg font-bold underline">
                                    Buy
                                </p>
                            </div>

                            <div className="flex flex-col justify-center md:flex-row md:gap-3 gap-0">
                                <div className="md:w-[70%] flex mt-3 p-8  items-center justify-between bg-gradient-to-b rounded-2xl from-[#E43875]/20">
                                    <img src={`assets/${opportunity.lowestAsk.exchange === 'bybit' ? 'bybit.png' : opportunity.lowestAsk.exchange === 'kraken' ? 'kraken.png' : 'bybit.png'}`} className="w-4/12 flex-shrink-0" />
                                    <img src="assets/Yes.png" className="w-3/12 flex-shrink-0" />
                                    <p className={opportunity.totalCost < 0 ? 'text-[#FF1313]' : 'text-[#1EEF32]'}>
                                        {(opportunity.totalCost ? opportunity.totalCost : 0.000).toFixed(6)}</p>
                                </div>
                                
                            </div>
                        </div>

                        <div className="md:w-[50%] flex flex-col justify-center items-center">
                            <div>
                                <p className="text-[#FF1313] md:text-lg font-bold underline">
                                    Sell
                                </p>
                            </div>

                            <div className="flex flex-col justify-center md:flex-row md:gap-3 gap-0">
                                <div className="md:w-[70%] flex mt-3 p-8 items-center justify-between bg-gradient-to-b rounded-2xl from-[#E43875]/20">
                                    <img src={`assets/${opportunity.highestBid.exchange === 'bybit' ? 'bybit.png' : opportunity.highestBid.exchange === 'kraken' ? 'kraken.png' : 'kraken.png'}`} className="w-4/12 flex-shrink-0" />
                                    <img src="assets/Yes.png" className="w-3/12 flex-shrink-0" />
                                    <p className={opportunity.totalRevenue < 0 ? 'text-[#FF1313]' : 'text-[#1EEF32]'}>
                                        {(opportunity.totalRevenue ? opportunity.totalRevenue : 0.000).toFixed(6)}</p>
                                </div>
                               
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* {loading && <p className="text-center text-white mt-5">Fetching Pairs...</p>}
            {error && <p className="text-center text-red-500 mt-5">{error}</p>}
            <div className='mt-10 flex flex-wrap gap-6 justify-center'>
                {opportunities.map((opportunity, index) => (
                    <div key={index} className='bg-pink-200 border-[#f4b4cb] border-8 p-6 rounded-xl shadow-md w-full md:w-[45%] lg:w-[30%]'>
                        <div className="bg-[#E4387536] w-full text-center rounded-t-md 2xl:rounded-t-xl border-b border-[#E4387536]">
                            <p className="pt-2 2xl:pt-4 pb-1 2xl:pb-2 flex justify-center font-bold 2xl:text-xl">
                                Pairs<p className="font-normal pl-2">{opportunity.pair}</p>
                            </p>
                        </div>
                        <div className="text-center p-4">
                            <p>Buy Exchange: {opportunity.lowestAsk.exchange}</p>
                            <p>Sell Exchange: {opportunity.highestBid.exchange}</p>
                            <p>Buy Price: {opportunity.lowestAsk.price}</p>
                            <p>Sell Price: {opportunity.highestBid.price}</p>
                            <p>Profit Amount: {opportunity.profit}</p>
                            <p>Profit Percentage: {opportunity.profitPercentage}</p>
                        </div>
                    </div>
                ))}
            </div> */}
        </div>
    );
};

export default Dapp;
