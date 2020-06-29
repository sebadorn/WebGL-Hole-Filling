'use strict';


/**
 * Stopwatch "class" to stop time.
 * @namespace WebHF.Stopwatch
 */
WebHF.Stopwatch = {


	enabled: CONFIG.DEBUG.ENABLE_STOPWATCH,
	precision: 3,
	times: {},


	/**
	 * Get the average value of all stopped times.
	 * @param  {string}   identifier - Identifier for a Stopwatch entry.
	 * @param  {?boolean} print      - Print average time to console. (default: false)
	 * @return {number} Average time of all stopped times.
	 */
	average( identifier, print ) {
		if( !this.enabled ) {
			return false;
		}

		if( !this.times.hasOwnProperty( identifier ) ) {
			return false;
		}

		let average = 0.0;
		const time = this.times[identifier];

		for( let i = 0; i < time.total.length; i++ ) {
			average += time.total[i];
		}

		average /= time.total.length;

		if( print ) {
			const prec = Math.pow( 10, this.precision );
			const avStr = Math.round( average * prec ) / prec;

			console.log( `[WebHF.Stopwatch] [${ identifier }]: ${ avStr } ms on average in ${ time.total.length } measures.` );
		}

		return average;
	},


	/**
	 * Get time of a certain Stopwatch entry.
	 * @param {string} identifier - Identifier for a Stopwatch entry.
	 */
	get( identifier ) {
		if( !this.enabled ) {
			return false;
		}

		return this.times[identifier];
	},


	/**
	 * Delete a Stopwatch entry.
	 * @param {string} identifier - Identifier for the entry to delete.
	 */
	remove( identifier ) {
		delete this.times[identifier];
	},


	/**
	 * Start a new timer or restart an existing one.
	 * @param  {string} identifier - Identifier for the entry.
	 * @return {number} Starting time in ms.
	 */
	start( identifier ) {
		if( !this.enabled ) {
			return false;
		}

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
	 * @param  {string}  identifier - Identifier of the entry top stop.
	 * @param  {boolean} print      - Print total time to console. (optional, default: false)
	 * @return {number} Total time from last start to this stop in ms.
	 */
	stop( identifier, print ) {
		if( !this.enabled ) {
			return false;
		}

		const time = this.times[identifier];
		time.stop = new Date().getTime();
		time.total.push( time.stop - time.start );

		if( print ) {
			console.log( `[WebHF.Stopwatch] [${ identifier }]: ${ time.total[time.total.length - 1] } ms.` );
		}

		return time.total[time.total.length - 1];
	}


};
