import bitcoinjs from 'bitcoinjs-lib'
import { Wallet } from 'libwallet-mnz'
import { QrcodeReader } from 'vue-qrcode-reader'
import Select2 from '@/components/Utils/Select2/Select2.vue';
import TransactionHistory from '@/components/TransactionHistory/TransactionHistory.vue';
import SelectAwesome from '@/components/Utils/SelectAwesome/SelectAwesome.vue';

var sb = require('satoshi-bitcoin')

export default {
	name: 'withdraw',
	components: {
		'select2': Select2,
		'transaction-history': TransactionHistory,
		'select-awesome': SelectAwesome,
		QrcodeReader
	},
	data() {
		return {
			blocks: 1,
			fee: 0,
			feeSpeed: 'veryFast',
			fees: [
				{ id: 0, label: 'Very fast', blocks: 1, value: 'veryFast' },
				{ id: 1, label: 'Fast', blocks: 6, value: 'fast' },
				{ id: 2, label: 'Low', blocks: 36, value: 'low' },
			],
			videoConstraints: { 
				width: { 
					min: 400, 
					ideal: 400, 
					max: 400 
				},
				height: { 
					min: 400, 
					ideal: 400, 
					max: 400 
				}
			},
			paused: false,
			readingQRCode: false,
			listData: [
			'BTC',
			'KMD',
			'MNZ',
			],
			select: 'MNZ',
			withdraw: {
				amount: null,
				address: '',
				coin: 'MNZ'
			},
			history: [],
			
		}
	},
	methods: {
		calculateFees(value) {
			if (this.select === 'BTC')
				this.callEstimateFee(value.blocks);
			else if (this.select === 'MNZ') {
				this.fee = 0;
			} else {
				this.fee = 10000;
			}
		},
		sendToken() {
			this.calculateFees(this.fees[0]);
		},
		callEstimateFee(blocks) {
			self = this;
			this.$http.post('http://localhost:8000', {
				ticker: self.select,
				method: 'blockchain.estimatefee',
				params: [ Number(blocks) ]
				}).then(response => {
					self.fee = response.data;
			});	
		},
		onChange (value) {
			this.calculateFees(value);
    },
		hideModal() {
			this.$refs.confirmWithdraw.hide()
		},
		numberWithSpaces(x) {
      var parts = x.toString().split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      return parts.join(".");
    },
		onDecode (content) {
			if (this.checkAddress(content)) {
				this.withdraw.address = content
			} else {
				this.$swal(`This address is not valid !`, content, 'error')
			}

			this.readingQRCode = false
			this.$root.$emit('bv::hide::modal', 'readerQrcodeModal')
			
		},
		checkAddress(addr) {
			if (addr) {
				let checkResult = bitcoinjs.address.fromBase58Check(addr);
				if (this.wallet.ticker === 'BTC') {
					return checkResult.version == 0;
				} else if (this.wallet.ticker === 'KMD' 
					|| this.wallet.ticker === 'MNZ')
					return checkResult.version == 60;
			} else
				return false
		},
		async onInit (promise) {
			this.loading = true

			try {
				await promise

				  // successfully initialized
				} catch (error) {
					if (error.name === 'NotAllowedError') {
				    // user denied camera access permisson
				} else if (error.name === 'NotFoundError') {
				    // no suitable camera device installed
				} else if (error.name === 'NotSupportedError') {
				    // page is not served over HTTPS (or localhost)
				} else if (error.name === 'NotReadableError') {
				    // maybe camera is already in use
				} else if (error.name === 'OverconstrainedError') {
				    // passed constraints don't match any camera. Did you requested the front camera although there is none?
				} else {
				    // browser is probably lacking features (WebRTC, Canvas)
				}
			} finally {
				this.loading = false
			}
		},
		updateCoin(value) {
			this.withdraw = {
				amount: null,
				address: '',
				coin: 'MNZ'
			};
			this.select = value
			this.withdraw.coin = value

			this.$store.dispatch('buildTxHistory', this.wallet)
		},
		
		// getRawTxAmount(tx) {
		// 	var rawTx
		// 	this.getRawTx(tx).then(response => {
		// 		rawTx = bitcoinjs.Transaction.fromHex(response.data);
		// 		tx.amount = rawTx.outs[0].value
		// 		console.log(tx)
		// 	})
		// },

		withdrawFunds() {
			this.hideModal();
			if(this.canWithdraw && this.addressIsValid) {
				var self = this
				this.$http.post('http://localhost:8000', {
					ticker: this.wallet.ticker,
					test: self.$store.getters.isTestMode,
					method: 'blockchain.address.listunspent',
					params: [ this.wallet.address ]
				}).then(response => {
					console.log(response)
					let wallet = new Wallet(self.wallet.privkey, self.wallet.coin, self.$store.getters.isTestMode)
					wallet.ticker = self.wallet.ticker
					console.log(response.data)
					let tx = wallet.prepareTx(response.data, self.withdraw.address, sb.toSatoshi(self.withdraw.amount), sb.toSatoshi(self.fee))
					console.log(wallet, tx)
					self.$http.post('http://localhost:8000', {
						ticker: self.wallet.ticker,
						test: self.$store.getters.isTestMode,
						method: 'blockchain.transaction.broadcast',
						params: [ tx ]
					}).then((response) => {
						self.$swal(`Transaction sent`, response.data, 'success')
					}).catch((error) => { self.$swal(`Transaction not send`, error, 'error') })
				})
			}
		}
	},
	mounted() {
		console.log(this.getConfig);
	},
	computed: {
		getConfig() {
			return this.$store.getters.getConfig;
		},
		getTotalPriceWithFee() {
			return this.numberWithSpaces((Number(this.withdraw.amount) + sb.toBitcoin(this.fee)).toFixed(8))
		},
		wallet() {
			return this.$store.getters.getWalletByTicker(this.select)
		},
		getBalance() {
			return this.numberWithSpaces(this.$store.getters.getWalletByTicker(this.select).balance)
		},
		canWithdraw() {
			console.log(this.getBalance);
			return (this.withdraw.amount < this.getBalance && this.withdraw.amount > 0 && this.addressIsValid)
		},
		addressIsValid() {
			if (this.withdraw.address)
				return bitcoinjs.address.fromBase58Check(this.withdraw.address).version > 0
			else return false
		},
}
}