"use strict";


/**
 * Stopwatch "class" to stop time.
 * @type {Object}
 */
var Stopwatch = {

	times: {},


	/**
	 * Get time of a certain Stopwatch entry.
	 * @param {String} identifier Identifier for a Stopwatch entry.
	 */
	get: function( identifier ) {
		return this.times[identifier];
	},


	/**
	 * Start a new timer.
	 * @param  {String} identifier Identifier for the new entry.
	 * @return {int}               Starting time in ms.
	 */
	start: function( identifier ) {
		this.times[identifier] = {
			start: new Date().getTime(),
			stop: null,
			total: null
		};

		return this.times[identifier].start;
	},


	/**
	 * Stop a timer.
	 * @param  {String}  identifier Identifier of the entry top stop.
	 * @param  {boolean} print      Print total time to console.
	 * @return {int}                Total time from start to stop in ms.
	 */
	stop: function( identifier, print ) {
		var time = this.times[identifier];

		time.stop = new Date().getTime();
		time.total = time.stop - time.start;

		if( print ) {
			console.log( "Stopwatch [" + identifier + "]: " + time.total + "ms." );
		}

		return time.total;
	}

};
