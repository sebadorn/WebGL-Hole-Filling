"use strict";


/**
 * Stopwatch "class" to stop time.
 * @type {Object}
 */
var Stopwatch = {

	enabled: CONFIG.DEBUG.ENABLE_STOPWATCH,
	precision: 3,
	times: {},


	/**
	 * Get the average value of all stopped times.
	 * @param  {String} identifier Identifier for a Stopwatch entry.
	 * @param  {boolean} print     Print average time to console. (optional, default: false)
	 * @return {float}             Average time of all stopped times.
	 */
	average: function( identifier, print ) {
		if( !this.enabled ) { return false; }

		var time = this.times[identifier];
		var average = 0.0;

		for( var i = 0; i < time.total.length; i++ ) {
			average += time.total[i];
		}
		average /= time.total.length;

		if( print ) {
			var prec = Math.pow( 10, this.precision );
			var avStr = Math.round( average * prec ) / prec;

			console.log( "Stopwatch [" + identifier + "]: " + avStr + "ms on average in " + time.total.length + " measures." );
		}

		return average;
	},


	/**
	 * Get time of a certain Stopwatch entry.
	 * @param {String} identifier Identifier for a Stopwatch entry.
	 */
	get: function( identifier ) {
		if( !this.enabled ) { return false; }

		return this.times[identifier];
	},


	/**
	 * Start a new timer or restart an existing one.
	 * @param  {String} identifier Identifier for the entry.
	 * @return {int}               Starting time in ms.
	 */
	start: function( identifier ) {
		if( !this.enabled ) { return false; }

		if( !this.times.hasOwnProperty( identifier ) ) {
			this.times[identifier] = {
				firstStart: new Date().getTime(),
				start: null,
				stop: null,
				total: []
			};
			this.times[identifier].start = this.times[identifier].firstStart;
		}
		else {
			this.times[identifier].start = new Date().getTime();
		}

		return this.times[identifier].start;
	},


	/**
	 * Stop the current time for a timer.
	 * @param  {String}  identifier Identifier of the entry top stop.
	 * @param  {boolean} print      Print total time to console. (optional, default: false)
	 * @return {int}                Total time from last start to this stop in ms.
	 */
	stop: function( identifier, print ) {
		if( !this.enabled ) { return false; }

		var time = this.times[identifier];

		time.stop = new Date().getTime();
		time.total.push( time.stop - time.start );

		if( print ) {
			console.log( "Stopwatch [" + identifier + "]: " + time.total[time.total.length - 1] + "ms." );
		}

		return time.total[time.total.length - 1];
	}

};
