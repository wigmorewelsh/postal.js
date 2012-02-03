var SubscriptionDefinition = function(exchange, topic, callback) {
    this.exchange = exchange;
    this.topic = topic;
    this.callback = callback;
    this.priority = DEFAULT_PRIORITY;
    this.constraints = [];
    this.maxCalls = DEFAULT_DISPOSEAFTER;
    this.onHandled = NO_OP;
    this.context = null;
};

SubscriptionDefinition.prototype = {
    unsubscribe: function() {
        postal.configuration.bus.unsubscribe(this);
    },

	aggregate: function(aggregateFn, initialState) {
		if(! _.isFunction(aggregateFn)) {
			throw "Value provided to 'aggregate' must be a function";
		}
		var fn = this.callback, newData, args;
		this.callback = (function(){
			var execCount = 0,
				lastResult = initialState,
				result,
				canInvoke;
			return function() {
				args = slice.call(arguments, 0);
				lastResult = aggregateFn.apply(this.context, [lastResult, ++execCount].concat(args));
				result = typeof lastResult === 'object' && !_.isArray(lastResult) ? lastResult.data : lastResult;
				canInvoke = typeof lastResult === 'object' && lastResult.hasOwnProperty("canInvoke") ? lastResult.canInvoke : true;
				if(canInvoke) {
					fn.apply(this.context, [result].concat(args.slice(1)));
				}
			};
		})();
		return this;
	},

	batchByCount: function(count) {
		if(_.isNaN(count) || count <= 0) {
			throw "The value provided to batchByCount must be a number greater than zero.";
		}
		this.aggregate((function(cnt){
			var threshold = cnt,
				current = 0,
				batch = [],
				args = slice.call(arguments,1);
			return function(state, executionCount, data){
				if(current >= threshold) {
					current = 0;
					state.data = [];
				}
				state.data.push(data);
				current++;
				state.canInvoke = current === threshold;
				return state;
			};
		})(count), { data: [] });
		return this;
	},

    defer: function() {
        var fn = this.callback;
        this.callback = function(data) {
            setTimeout(fn,0,data);
        };
        return this;
    },

    disposeAfter: function(maxCalls) {
        if(_.isNaN(maxCalls) || maxCalls <= 0) {
            throw "The value provided to disposeAfter (maxCalls) must be a number greater than zero.";
        }

        var fn = this.onHandled;
        var dispose = _.after(maxCalls, _.bind(function() {
                this.unsubscribe(this);
            }, this));

        this.onHandled = function() {
            fn.apply(this.context, arguments);
            dispose();
        };
        return this;
    },

    ignoreDuplicates: function() {
        this.withConstraint(new DistinctPredicate());
        return this;
    },

	once: function() {
		this.disposeAfter(1);
		return this;
	},

    whenHandledThenExecute: function(callback) {
        if(! _.isFunction(callback)) {
            throw "Value provided to 'whenHandledThenExecute' must be a function";
        }
        this.onHandled = callback;
        return this;
    },

    withConstraint: function(predicate) {
        if(! _.isFunction(predicate)) {
            throw "Predicate constraint must be a function";
        }
        this.constraints.push(predicate);
        return this;
    },

    withConstraints: function(predicates) {
        var self = this;
        if(_.isArray(predicates)) {
            _.each(predicates, function(predicate) { self.withConstraint(predicate); } );
        }
        return self;
    },

    withContext: function(context) {
        this.context = context;
        return this;
    },

    withDebounce: function(milliseconds) {
        if(_.isNaN(milliseconds)) {
            throw "Milliseconds must be a number";
        }
        var fn = this.callback;
        this.callback = _.debounce(fn, milliseconds);
        return this;
    },

    withDelay: function(milliseconds) {
        if(_.isNaN(milliseconds)) {
            throw "Milliseconds must be a number";
        }
        var fn = this.callback;
        this.callback = function(data) {
            setTimeout(fn, milliseconds, data);
        };
        return this;
    },

    withPriority: function(priority) {
        if(_.isNaN(priority)) {
            throw "Priority must be a number";
        }
        this.priority = priority;
        return this;
    },

    withThrottle: function(milliseconds) {
        if(_.isNaN(milliseconds)) {
            throw "Milliseconds must be a number";
        }
        var fn = this.callback;
        this.callback = _.throttle(fn, milliseconds);
        return this;
    }
};
