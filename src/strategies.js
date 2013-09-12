var strategies = {
	withDebounce         : function( cb, milliseconds, immediate ) {
		if ( _.isNaN( milliseconds ) ) {
			throw "Milliseconds must be a number";
		}
		return _.debounce( cb, milliseconds, !!immediate );
	},
	defer                : function( cb ) {
		return function( data, env ) {
			setTimeout( function() {
				cb( data, env );
			}, 0 );
		};
	},
	withDelay            : function( cb, milliseconds ) {
		if ( _.isNaN( milliseconds ) ) {
			throw "Milliseconds must be a number";
		}
		return function( data, env ) {
			setTimeout( function() {
				cb( data, env );
			}, milliseconds );
		};
	},
	disposeAfter         : function( cb, maxCalls ) {
		if ( _.isNaN( maxCalls ) || maxCalls <= 0 ) {
			throw "The value provided to disposeAfter (maxCalls) must be a number greater than zero.";
		}
		var dispose = _.after( maxCalls, _.bind( function() {
			this.unsubscribe();
		}, this ) );
		return function( data, env ) {
			cb( data, env );
			dispose();
		};
	},
	distinct             : function( cb ) {
		var pred = _.bind( new DistinctPredicate(), this.context );
		return function( data, env ) {
			if ( pred( data, env ) ) {
				cb( data, env );
			}
		};
	},
	distinctUntilChanged : function( cb ) {
		var pred = _.bind( new ConsecutiveDistinctPredicate(), this.context );
		return function( data, env ) {
			if ( pred( data, env ) ) {
				cb( data, env );
			}
		};
	},
	once                 : function( cb ) {
		var dispose = _.after( 1, _.bind( function() {
			this.unsubscribe();
		}, this ) );
		return function( data, env ) {
			cb( data, env );
			dispose();
		};
	},
	withThrottle         : function( cb, milliseconds ) {
		if ( _.isNaN( milliseconds ) ) {
			throw "Milliseconds must be a number";
		}
		return _.throttle( cb, milliseconds );
	},
	withConstraints      : function( cb, predicates ) {
		predicates = _.isArray( predicates ) ? predicates : [predicates];
		var self = this;
		var allPredicates = function( data, env ) {
			return _.all( predicates, function( constraint ) {
				return constraint.call( self.context, data, env );
			} );
		};
		return function( data, env ) {
			if ( allPredicates( data, env ) ) {
				cb( data, env );
			}
		};
	}
};

_.each( strategies, function( fn, name ) {
	postal.configuration.registerStrategy( name, fn, "SubscriptionDefinition" );
} );