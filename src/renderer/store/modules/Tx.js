import * as _ from 'lodash';
import axios from 'axios';
import getTxFromRawTx from '../../lib/txtools';

const actions = {
  getRawTx({ commit, rootGetters }, { ticker, tx }) {
    const payload = {
      ticker: ticker,
      test: rootGetters.isTestMode,
      method: 'blockchain.transaction.get',
      params: [tx.tx_hash, 1],
    };
    return axios.post('http://localhost:8000', payload);
  },
  decodeTx({ commit, dispatch, rootGetters, rootState }, { wallet, tx }) {
    // const txExists = rootGetters.getWallets[wallet.ticker].txs.map(t => {
    //   return t.tx_hash;
    // }).indexOf(tx.tx_hash);

    // if (txExists >= 0) {
    //   return Promise.resolve();
    // }
    return dispatch('getRawTx', { ticker: wallet.ticker, tx: tx })
      .then(response => {
        const verboseTx = getTxFromRawTx(wallet, response.data, tx.height, rootGetters.isTestMode);
        if (verboseTx != null && verboseTx.tx_hash != null) {
          commit('DELETE_PENDING_TX', verboseTx.tx_hash, { root: true });
        }
        return verboseTx;
      })
    ;
  },
  buildTxHistory({ commit, dispatch, getters, rootGetters }, wallet) {
    return axios
      .post('http://localhost:8000', {
        ticker: wallet.ticker,
        test: rootGetters.isTestMode,
        method: 'blockchain.address.get_history',
        params: [wallet.address],
      })
      .then(response => {
        if (response.data.length > 0) {
          const txs = response.data;
          const promises = _.map(txs, tx => {
            return dispatch('decodeTx', { wallet: wallet, tx: tx });
          });
          return Promise.all(promises);
        }
      })
      .then((txsDetails) => {
        commit('ADD_TXS', { ticker: wallet.ticker, txs: txsDetails }, { root: true });
      })
      .then(() => {
        const promiseForKMDWallet = rootGetters.getWalletByTicker('KMD');
        const promiseForBTCWallet = rootGetters.getWalletByTicker('BTC');
        const promiseForMNZWallet = rootGetters.getWalletByTicker('MNZ');
        return Promise.all([promiseForKMDWallet, promiseForBTCWallet, promiseForMNZWallet]);
      })
      .then((wallets) => {
        const associations = associateTxsFromWallet(wallets[0].txs.concat(wallets[1].txs), wallets[2].txs);
        commit('UPDATE_ASSOCIATED_TXS', associations, { root: true });
      })
    ;
  },
};

const associateTxsFromWallet = (cryptoTxs, mnzTxs) => {
  const associateArray = [];
  if (cryptoTxs != null && mnzTxs != null) {
    _.forEach(mnzTxs, (mnzTx) => {
      if (mnzTx.origin != null) {
        const cryptoTxsForMnz = _.filter(cryptoTxs, (cryptoTx) => {
          if (cryptoTx.tx_hash.substring(0, 9) === mnzTx.origin.txHash) {
            return true;
          }
          return false;
        });
        if (cryptoTxsForMnz[0]) {
          associateArray.push({ mnzTx: mnzTx, cryptoTx: cryptoTxsForMnz[0], ticker: mnzTx.origin.ticker });
        }
      }
    });
  }
  return associateArray;
};

export default {
  actions,
};

