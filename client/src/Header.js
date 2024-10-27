import React, { useState, useEffect,useContext } from "react";
import './App.css'
import axios from 'axios'
import { NavLink } from "react-router-dom";
import {
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
  Avatar,
  Typography,
} from "@material-tailwind/react";

const Header = () => {

//   const [pairs, setPairs] = useState({});

//   const [selectedOption, setSelectedOption] = useState("");
//   const handleSelectChange = (e) => {
//     setSelectedOption(e.target.value);
//   };

//   const [open, setOpen] = useState(false);


//   useEffect(() => {
//     const intervalId = setInterval(() => {
//       generatePairs();
//     }, 30000);

//     return () => clearInterval(intervalId);
//   }, []);


//   useEffect(() => {
//     generatePairs()
//   }, []);

//   const fetchData = async () => {
//     try {
//       const response = await axios.get('http://localhost:3006/apiv4/getPairs')
//       setPairs(response.data.data)
//       //  console.log(response)
//       return response.data.data
//     } catch (error) {
//       console.log("Error while fetching : ", error)
//     }
//   }

// //   const getTokenImage = symbol => {
// //     const token = polytokens.find(token => token.symbol === symbol);
// //     return token ? token.img : '';
// //   };


//   const generatePairs = async () => {
//     const pairs = await fetchData()

//     const allPairs = Object.keys(pairs).map(pairKey => {
//       const pairData = pairs[pairKey];
//       const [symbolA, symbolB] = pairData.pair.split('-');
//       return {
//         tokenA: { symbol: symbolA, img: getTokenImage(symbolA) },
//         tokenB: { symbol: symbolB, img: getTokenImage(symbolB) },
//         profit: pairData.percentage,
//       };
//     });

//     for (let i = allPairs.length - 1; i > 0; i--) {
//       const j = Math.floor(Math.random() * (i + 1));
//       [allPairs[i], allPairs[j]] = [allPairs[j], allPairs[i]];
//     }

//     const selectedPairs = allPairs.slice(0, 12);

//     window.localStorage.setItem('profitpairSymbols1', JSON.stringify(selectedPairs));
//     const pairSymbolsArray = selectedPairs.map((pair) => [pair.tokenA.symbol + '-' + pair.tokenB.symbol]);
//     localStorage.setItem('profitpairSymbols', JSON.stringify(pairSymbolsArray));
//   };


  return (

    <nav className="flex bg-black  py-2 items-center">
      <div className="flex items-center md:w-[15%] w-[40%]">
        <NavLink to='/'>
          <img src="assets/MBC Logo_Final 1.png" className="" /></NavLink>      </div>
      <div className={` md:w-[85%] text-xs lg:flex-row  flex-col    flex justify-center items-center lg:justify-between px-3  w-full`}>
        <ul className="w-[80%] flex items-center gap-8">

          <a className="hover:text-gray-500" href="/">
            Dapp
          </a>

          {/* <a className="hover:text-gray-500" href="/Marketopp">
              Market opportunities
            </a> */}

          <a className="hover:text-gray-500" href="/Trades">
            Transaction History
          </a>

          {/* <a className="hover:text-gray-500" href="/Subscription">
            Subscription
          </a> */}

          <a className="hover:text-gray-500" href="/ai">
            AI Bot
          </a>
          <a className="hover:text-gray-500" href="/wallet">
            Wallet
          </a>
          <img src="assets/mbc-bot.png" className="w-[5%]" />
          </ul>
        
      </div>
    
    </nav>
  )
}

export default Header