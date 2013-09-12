/* global postal */
/*jshint -W117 */

var slice = Array.prototype.slice;

var SubscriptionDefinition = function ( channel, topic, callback ) {
	this.options = [];
	this.channel = channel;
	this.topic = topic;
	this.context = null;
	this.subscribe(callback);
	postal.configuration.bus.publish( {
		channel : postal.configuration.SYSTEM_CHANNEL,
		topic   : "subscription.created",
		data    : {
			event   : "subscription.created",
			channel : channel,
			topic   : topic
		}
	} );
	postal.configuration.bus.subscribe( this );
};

SubscriptionDefinition.prototype = {
	buildCallback : function() {
		var strategies = postal.configuration.strategies;
		this.callback = _.bind(this._origcallback, this.context || this);
		_.each(this.options, function(option){
			var oldCb = this.callback;
			this.callback = strategies[option.strategy].apply(this, [oldCb].concat(option.args));
		}, this);
	},

	applyStrategy : function(strategy, args) {
		var exists = false, idx = 0;
		for(; idx < this.options.length; idx++) {
			if(this.options[idx].strategy === strategy) {
				this.options[idx].args = args;
				exists = true;
				break;
			}
		}
		if(!exists) {
			this.options.push({ strategy: strategy, args: args });
		}
	},

	unsubscribe : function () {
		if ( !this.inactive ) {
			this.inactive = true;
			postal.configuration.bus.unsubscribe( this );
			postal.configuration.bus.publish( {
				channel : postal.configuration.SYSTEM_CHANNEL,
				topic   : "subscription.removed",
				data    : {
					event   : "subscription.removed",
					channel : this.channel,
					topic   : this.topic
				}
			} );
		}
	},

	subscribe : function ( callback ) {
		this._origcallback = callback;
		this.buildCallback();
		return this;
	},

	withContext : function ( context ) {
		this.context = context;
		this.buildCallback();
		return this;
	},
};