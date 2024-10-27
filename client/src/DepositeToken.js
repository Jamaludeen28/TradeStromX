import React, { useState } from 'react';
import axios from 'axios';

function DepositeToken() {
    const [addressData, setAddressData] = useState([]);
    const [asset, setAsset] = useState('XBT'); // Default asset (e.g., Bitcoin)
    const [method, setMethod] = useState('Bitcoin'); // Default method (e.g., Bitcoin network)
    const [error, setError] = useState('');

    const handleGetAddress = async () => {
        try {
            const response = await axios.post('http://localhost:3002/get-deposit-address', {
                asset: asset,
                method: method,
                newAddress: true
            });
            setAddressData(response.data.addresses);
            setError('');
        } catch (error) {
            setError('Failed to get deposit address');
        }
    };

    return (
        <div>
            <h1>Generate Deposit Address</h1>
            <label>
                Asset:
                <select value={asset} onChange={(e) => setAsset(e.target.value)}>
                    <option value="XBT">Bitcoin (XBT)</option>
                    <option value="ETH">Ethereum (ETH)</option>
                    {/* Add more assets as needed */}
                </select>
            </label>
            <label>
                Method:
                <select value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option value="Bitcoin">Bitcoin Network</option>
                    <option value="Ethereum">Ethereum Network</option>
                    {/* Add more methods as needed */}
                </select>
            </label>
            <button onClick={handleGetAddress}>Get Deposit Address</button>
            {addressData.length > 0 && (
                <div>
                    <h2>Your Deposit Address:</h2>
                    {addressData.map((addr, index) => (
                        <div key={index}>
                            <p>Address: {addr.address}</p>
                            {addr.tag && <p>Tag: {addr.tag}</p>}
                            <p>Expires at: {addr.expiretm ? new Date(addr.expiretm * 1000).toLocaleString() : 'Never'}</p>
                        </div>
                    ))}
                </div>
            )}
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}

export default DepositeToken;
