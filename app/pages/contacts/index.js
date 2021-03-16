'use strict';

var Ractive = require('lib/ractive')
var emitter = require('lib/emitter')
var toUnitString = require('lib/convert').toUnitString
var getTokenNetwork = require('lib/token').getTokenNetwork;
var getWallet = require('lib/wallet').getWallet
var strftime = require('strftime')
var showConfirmation = require('widgets/modals/confirm-add-contact');
var modifyContact = require('widgets/modals/modify-contact');
var db = require('lib/db')
//const { truncateSync } = require('fs-extra');

module.exports = function(el){
  var network = getTokenNetwork();
  var ractive = new Ractive({
    el: el,
    template: require('./index.ract'),
    data: {
      transactions: [],
      formatTimestamp: function(timestamp){
        var date = new Date(timestamp)
        return strftime('%b %d %l:%M %p', date)
      },
      formatConfirmations: function(number){
        if (number === 1) {
          return number + ' confirmation'
        } else {
          return number + ' confirmations'
        }
      },
      getToAddress: function(tx) {
        if (network === 'ethereum') {
          return tx.to;
        } else if (['bitcoin', 'bitcoincash', 'litecoin', 'smileycoin', 'testnet'].indexOf(network) !== -1) {
          return tx.outs[0].address;
        }
      },
      isReceived: function(tx) {
        if (network === 'ethereum') {
          return tx.to === getWallet().addressString;
        } else if (['bitcoin', 'bitcoincash', 'litecoin', 'smileycoin', 'testnet'].indexOf(network) !== -1) {
          return tx.amount > 0;
        }
      },
      isConfirmed: function(confirmations) {
        return confirmations >= getWallet().minConf;
      },
      isFailed: function(tx) {
        if (network === 'ethereum') {
          return tx.status === false;
        } else if (['bitcoin', 'bitcoincash', 'litecoin', 'smileycoin', 'testnet'].indexOf(network) !== -1) {
          return false;
        }
      },
      toUnitString: toUnitString,
      loadingTx: true,
    }
  })

  emitter.on('append-transactions', function(newTxs){
    newTxs.forEach(function(tx) {
      ractive.unshift('transactions', tx);
    })
    ractive.set('loadingTx', false)
  })

  emitter.on('set-transactions', function(txs) {
    network = getTokenNetwork();
    ractive.set('transactions', txs)
    ractive.set('loadingTx', false)
    ractive.set('contacts', db.get('contacts'))
  })

  emitter.on('sync', function() {
    ractive.set('transactions', [])
    ractive.set('loadingTx', true)
  })

  emitter.on('sync-contacts',function(){
    console.log('syncing contacts...')
    console.log(db.get('contacts'))
    ractive.set('contacts',db.get('contacts'))

  })

  ractive.on('open-add-contact', function(){
    var _address = ractive.find("#address").value
    var _name = ractive.find("#name").value
    /*
    
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

    ractive.set("contacts", contacts)
    //ractive.set('addContact',true)
    ractive.set('address',_address);
    ractive.set('name',_name)
    */
    showConfirmation({
      name: _name,
      address: _address
    })
  })

  ractive.on('show-detail', function(context) {
    var index = context.node.getAttribute('data-index')
    var contact = ractive.get('contacts')[index]
    modifyContact({
      name: contact.name,
      address: contact.address
    },
     index
     )});

  return ractive
};
