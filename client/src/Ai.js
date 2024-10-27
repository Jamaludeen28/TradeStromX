import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';

const Ai = () => {
    const [selectedToken, setSelectedToken] = useState('');
    const [selectedAmount, setSelectedAmount] = useState('');
    const [tokens] = useState([
        { name: 'BTC', address: 'BTC', logo: './assets/bitcoin.png' },
        { name: 'ETH', address: 'ETH', logo: './assets/eth.png' },
        { name: 'DAI', address: 'DAI', logo: './assets/dai.png' },
        { name: 'LINK', address: 'LINK', logo: './assets/chain link.png' },
        { name: 'MATIC', address: 'MATIC', logo: './assets/pol.png' },
        { name: 'USDC', address: 'USDC', logo: './assets/pol.png' },
        { name: 'DOGE', address: 'DOGE', logo: './assets/pol.png' }

    ]);
    const navigate = useNavigate();

    const customStyles = {
        control: (provided, state) => ({
            ...provided,
            borderRadius: '8px',
            backgroundColor: state.isFocused ? '#dd7c0b' : '#dd7c0b',
            borderColor: state.isFocused ? '#00897b' : '#ccc',
            boxShadow: state.isFocused ? '0 0 0 1px #00897b' : 'none',
            color: '#ffffff',
        }),
        placeholder: (provided, state) => ({
            ...provided,
            color: 'white',
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: '#27062b', // Set dropdown menu background color
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isFocused ? '#b2dfdb' : '#dd7c0b', // Set option background color
            color: state.isFocused ? '#00897b' : '#fff', // Set option text color
        }),
        singleValue: (provided) => ({
            ...provided,
            color: '#fff', // Set text color for selected option
        }),
    };

    const handleTokenChange = (selectedOption) => {
        setSelectedToken(selectedOption ? selectedOption.address : '');
    };

    const handleAmountClick = (amount) => {
        setSelectedAmount(amount);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!selectedAmount || !selectedToken) {
            alert('Please select an amount and a token.');
            return;
        }

        navigate('/pair', { state: { token: selectedToken, amount: selectedAmount } });
    };

    return (
        <div className="text-white font-poppins overflow-hidden">

            <div className='min-h-screen ' style={{ backgroundImage: `url(assets/image94.png)` }}>
                <div className='py-20'>
                    <div className=''>
                        <img src='./assets/poppers.png' className='w-[10rem]  md:w-[20rem] 2xl:w-[24rem] absolute'></img>
                        <img src='./assets/poppers.png' className='w-[10rem] md:w-[20rem] 2xl:w-[24rem] scale-x-[-1] absolute right-0'></img>
                    </div>

                    <p className='text-center font-bold text-white text-2xl md:text-3xl 2xl:[48px] tracking-widest font-Artemus'>Welcome to AI Bot !</p>

                    <div className='flex justify-center py-10 md:py-20'>
                        <div className='md:w-[5%] flex justify-center'>
                            <div><img src='./assets/Group 1000015632.png' className='md:absolute  w-[10rem] md:w-[15rem] 2xl:w-[20rem] md:-translate-x-16 md:-translate-y-20'></img></div>
                        </div>
                        <div className='w-[85%] md:w-[75%] border-2 border-[#E43875]/80  bg-[#E43875]/20 p-5 2xl:p-10 rounded-xl'>
                            <p className='text-center text-xs 2xl:text-[15px]'>Click to choose Ticket in usd!*</p>

                            <form onSubmit={handleSubmit}>
                                <div className='w-[95%] font-Artemus flex justify-center items-center gap-3 md:gap-10 2xl:gap-14 py-7 md:py-12 2xl:py-16'>
                                    <div
                                        className={`flex justify-center items-center cursor-pointer active:translate-y-2 duration-500 ${selectedAmount === 2 ? 'active brightness-100 rounded-lg' : selectedAmount ? 'brightness-50' : ''}`}
                                        onClick={() => handleAmountClick(2)}
                                    >
                                        <img src='./assets/image 153.png' className='w-[6rem] md:w-[5rem] 2xl:w-[6rem]' alt='Amount 10' />
                                        <p className='font-bold md:text-xl 2xl:text-3xl absolute'>2</p>
                                    </div>

                                    <div
                                        className={`flex justify-center items-center cursor-pointer active:translate-y-2 duration-500 ${selectedAmount === 20 ? 'active brightness-100 rounded-lg' : selectedAmount ? 'brightness-50' : ''}`}
                                        onClick={() => handleAmountClick(20)}
                                    >
                                        <img src='./assets/image 153.png' className='w-[6rem] md:w-[5rem] 2xl:w-[6rem]' alt='Amount 20' />
                                        <p className='font-bold md:text-xl 2xl:text-3xl absolute'>20</p>
                                    </div>

                                    <div
                                        className={`flex justify-center items-center cursor-pointer active:translate-y-2 duration-500 ${selectedAmount === 30 ? 'active brightness-100 rounded-lg' : selectedAmount ? 'brightness-50' : ''}`}
                                        onClick={() => handleAmountClick(30)}
                                    >
                                        <img src='./assets/image 153.png' className='w-[6rem] md:w-[5rem] 2xl:w-[6rem]' alt='Amount 30' />
                                        <p className='font-bold md:text-xl 2xl:text-3xl absolute'>30</p>
                                    </div>

                                    <div
                                        className={`flex justify-center items-center cursor-pointer active:translate-y-2 duration-500 ${selectedAmount === 50 ? 'active brightness-100 rounded-lg' : selectedAmount ? 'brightness-50' : ''}`}
                                        onClick={() => handleAmountClick(50)}
                                    >
                                        <img src='./assets/image 153.png' className='w-[6rem] md:w-[5rem] 2xl:w-[6rem]' alt='Amount 500' />
                                        <p className='font-bold md:text-xl 2xl:text-3xl absolute'>50</p>
                                    </div>

                                    <div
                                        className={`flex justify-center items-center cursor-pointer active:translate-y-2 duration-500 ${selectedAmount === 100 ? 'active brightness-100 rounded-lg' : selectedAmount ? 'brightness-50' : ''}`}
                                        onClick={() => handleAmountClick(100)}
                                    >
                                        <img src='./assets/image 153.png' className='w-[6rem] md:w-[5rem] 2xl:w-[6rem]' alt='Amount 100' />
                                        <p className='font-bold md:text-xl 2xl:text-3xl absolute'>100</p>
                                    </div>
                                </div>
                                <div className='flex justify-center gap-8 text-white'>
                                    <Select
                                        className='w-[20%] '
                                        value={tokens.find(token => token.address === selectedToken)}
                                        onChange={handleTokenChange}
                                        options={tokens}
                                        getOptionLabel={(option) => (
                                            <div className='flex items-center'>
                                                <img src={option.logo} alt={option.name} className="h-5 mr-2" />
                                                {option.name}
                                            </div>
                                        )}
                                        getOptionValue={(option) => option.address}
                                        placeholder="Select Token"
                                        styles={customStyles}
                                    />
                                </div>

                                <div className='flex mt-10 justify-center gap-8 text-white'>
                                    <button className='bg-[#E43875] px-7 py-2 rounded-xl' type="submit">Confirm</button>
                                    
                                </div>
                            </form>

                        </div></div>


                </div>
            </div>
        </div>
    );
};

export default Ai;