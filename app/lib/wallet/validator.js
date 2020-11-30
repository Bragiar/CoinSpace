'use strict';

var toAtom = require('lib/convert').toAtom
var toUnitString = require('lib/convert').toUnitString
    // Default fee amount imported from Cs-Wallet.
var smileycoin = require('cs-wallet').bitcoin.networks.smileycoin

function validateSend(wallet, to, unitValue, data, dynamicFees, unspents, callback) {
    var amount = toAtom(unitValue)
    var tx = null
    var fee;

    try {
        if (['bitcoin', 'bitcoincash', 'litecoin', 'smileycoin', 'testnet'].indexOf(wallet.networkName) !== -1) {
            // Dynamic fees have not been implemented for the Smileycoin block explorer yet (June 2020).
            // If dynamicFees is null, use feePerKb instead.
            var isDynFee = dynamicFees != null && !isNaN(dynamicFees);
            var feePerKb = smileycoin.feePerKb;
            // dynamicFees is in satoshis per byte
            var whichFee = isDynFee ? dynamicFees.minimum * 1000 : feePerKb;

            fee = Math.max(feePerKb, wallet.estimateFees(to, amount, [whichFee])[0]);
        }
        // check if data exceeds maximum
        /*
        tx = wallet.createTx(to, amount, data, fee, 4, [{address: "BJX8Xd4XxeF4Nu7vvSR3huGLmf2PYH1UeR",
confirmations: 6,
txId: "f2c5e4ddc9214475e10764d28cad8a78b1ab4c1368434a67ad01f253d4f9f046",
value: 1000000000,
vout: 0
}]
)
*/
        //tx = wallet.createTx(to, amount, data, fee, 4, unspents)
        tx = wallet.createTx(to, amount, data, fee, 1, unspents)

    } catch (e) {
        var error;
        if (e.message.match(/Invalid address/)) {
            return callback(new Error('Please enter a valid address to send to'))
        } else if (e.message.match(/Invalid value/)) {
            error = new Error('Please enter an amount above')
            error.interpolations = { dust: toUnitString(e.dustThreshold) }
            return callback(error)
        } else if (e.message.match(/Invalid gasLimit/)) {
            return callback(new Error('Please enter Gas Limit greater than zero'))
        } else if (e.message.match(/Insufficient funds/)) {
            if (e.details && e.details.match(/Additional funds confirmation pending/)) {
                error = new Error('Some funds are temporarily unavailable. To send this transaction, you will need to wait for your pending transactions to be confirmed first.')
                return callback(error)
            } else if (e.details && e.details.match(/Attempt to empty wallet/) && wallet.networkName === 'ethereum') {
                var message = [
                    'It seems like you are trying to empty your wallet',
                    'Taking transaction fee into account, we estimated that the max amount you can send is',
                    'We have amended the value in the amount field for you'
                ].join('. ')
                error = new Error(message)
                error.interpolations = { sendableBalance: toUnitString(e.sendableBalance) }
                return callback(error)
            } else {
                error = new Error('You do not have enough funds in your wallet (incl. fee)')
                error.fee = toUnitString(fee)
                return callback(error)
            }
        } else if (e.message.match(/Insufficient ethereum funds for token transaction/)) {
            error = new Error('You do not have enough Ethereum funds to pay transaction fee (:ethereumRequired ETH).');
            error.interpolations = { ethereumRequired: toUnitString(e.ethereumRequired) };
            return callback(error);
        }

        return callback(e);
    }

    callback(null)
}

module.exports = validateSend
