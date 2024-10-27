import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Ai from './Ai';
import Pair from './pair';
import Dapp from './Dapp';
import DepositeToken from './DepositeToken';
import BotAi from './Botai';

const App = () => {
    return (
        <Router>
            <Routes>
                {/* <Route path="/" element ={<Dapp />}/> */}
                <Route path="/Ai" element={<Ai />} />
                <Route path="/pair" element={<Pair />} />
                <Route path="/depositetoken" element={<DepositeToken />} />
                <Route path="/" element={<BotAi />} />
            </Routes>
        </Router>
    );
};

export default App;
