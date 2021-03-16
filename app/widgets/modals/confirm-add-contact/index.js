'use strict';

var Ractive = require('widgets/modals/base');
var db = require('lib/db');
var emitter = require('lib/emitter');
var getWallet = require('lib/wallet').getWallet;
var parseHistoryTx = require('lib/wallet').parseHistoryTx;
var toAtom = require('lib/convert').toAtom;
var toUnitString = require('lib/convert').toUnitString;
var bitcoin = require('cs-wallet').bitcoin;
var showInfo = require('widgets/modals/flash').showInfo;
var getTokenNetwork = require('lib/token').getTokenNetwork;

var minTransactionFee = 100000000;
var minFeePerByte = 100000;

function open(_contact) {

  var ractive = new Ractive({
    partials: {
      content: require('./_content.ract')
    },
    data: {
      addContact: true,
    },
    contact: _contact
  });

  ractive.on('add', function(){
    ractive.set('addContact',false);

    var _address = ractive.contact.address;
    var _name = ractive.contact.name;

    var contact = {
      name: _name,
      address: _address
    }
    console.log(contact)


    var contacts = db.get('contacts')
    if(contacts == undefined){

      contacts = [];

    }
    contacts.push(contact)

    console.log("all contacts:")
    console.log(contacts)
    db.set('contacts',contacts)
    console.log(db.get('contacts'));

    ractive.set("contacts", contacts);
    ractive.set('success',true);
    emitter.emit('sync-contacts')
  });

  return ractive
}

function updateUrl(){
  var loc = window.location.search
  loc = loc.split('&')
  if (loc.length > 2) {
    window.location.href = loc[0]
  }
  return 0
}

function extendData(data) {

  var network = getTokenNetwork();

  data.confirmation = true;
  data.isEthereum = network === 'ethereum';
  data.isBitcoin = network === 'bitcoin' || network === 'testnet';
  data.isBitcoinCash = network === 'bitcoincash';
  data.isLitecoin = network === 'litecoin';
  data.isSmileycoin = network === 'smileycoin';
  data.feeSign = data.importTxOptions ? '-' : '+';

  var wallet = getWallet();
  var feeRates = null;
  var fees = null;
  var unspents = data.importTxOptions ? data.importTxOptions.unspents : null;

  if (data.isBitcoin) {
    var defaultFeePerKb = data.dynamicFees.minimum * 1000 || bitcoin.networks['bitcoin'].feePerKb;

    feeRates = [
      defaultFeePerKb,
      data.dynamicFees.hour * 1000 || defaultFeePerKb,
      data.dynamicFees.fastest * 1000 || defaultFeePerKb
    ];
    fees = wallet.estimateFees(data.to, toAtom(data.amount), feeRates, unspents);

    data.feeMinimum = toUnitString(fees[0]);
    data.feeHour = toUnitString(fees[1]);
    data.feeFastest = toUnitString(fees[2]);
    data.fee = data.feeHour;

    data.onFocus = function() {
      this.find('.js-fee-dropdown').selectedIndex = 1; // fix issue when values are the same
    }

  } else if (data.isBitcoinCash) {
    feeRates = [data.dynamicFees.minimum * 1000 || bitcoin.networks['bitcoincash'].feePerKb];
    fees = wallet.estimateFees(data.to, toAtom(data.amount), feeRates, unspents);
    data.fee = toUnitString(fees[0]);

  } else if (data.isLitecoin) {
    feeRates = [data.dynamicFees.minimum * 1000 || bitcoin.networks['litecoin'].feePerKb];
    fees = wallet.estimateFees(data.to, toAtom(data.amount), feeRates, unspents);
    data.fee = toUnitString(fees[0]);

  } else if (data.isSmileycoin) {
    feeRates = [bitcoin.networks['smileycoin'].feePerKb || 100000000];
    fees = Math.max(100000000, wallet.estimateFees(data.to, toAtom(data.amount), feeRates, unspents));
    data.fee = toUnitString(fees);

  } else if (data.isEthereum) {
    data.fee = toUnitString(wallet.getDefaultFee(), 18);
    data.feeDenomination = 'ETH';
  }

  return data;
}

module.exports = open
