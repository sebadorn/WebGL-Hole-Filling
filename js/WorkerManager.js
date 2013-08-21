"use strict";


/**
 * Create and use pools of Web Workers for parallization.
 * @type {Object}
 */
var WorkerManager = {

	pool: {},
	queue: {},


	/**
	 * Close a pool of workers.
	 * @param {String} identifier Identifier for the pool to close.
	 */
	closePool: function( identifier ) {
		if( !this.pool.hasOwnProperty( identifier ) ) {
			console.error( "WorkerManager: No pool with identifer " + identifer + "." );
			return false;
		}

		if( this.queue[identifier].length > 0 ) {
			console.error( "WorkerManager: Queue for " + identifier + " is not empty!" );
			return false;
		}

		for( var i = 0; i < this.pool[identifier].length; i++ ) {
			this.pool[identifier][i].postMessage( { cmd: "close" } );
		}
	},


	/**
	 * Create a worker pool.
	 * @param {String} identifier Identifier for the pool.
	 * @param {int}    number     Number of workers in the pool.
	 * @param {Object} firstMsg   Initial data to send to each worker. (optional)
	 */
	createPool: function( identifier, number, firstMsg ) {
		var blob = new Blob(
			[document.getElementById( "worker-" + identifier ).textContent],
			{ type: "application/javascript" }
		);
		var workerBlobURL = window.URL.createObjectURL( blob ),
		    msgURL = {
		    	cmd: "url",
		    	url: GLOBAL.URL
		    };
		var worker;

		this.pool[identifier] = [];
		this.queue[identifier] = [];

		for( var i = 0; i < number; i++ ) {
			worker = new Worker( workerBlobURL );
			worker.isFree = true;
			worker.postMessage( msgURL );
			if( firstMsg ) {
				worker.postMessage( firstMsg );
			}
			this.pool[identifier].push( worker );
		}
	},


	/**
	 * Give a worker of a pool a task. If no worker is available,
	 * the task will be added to a queue and processed when a
	 * worker becomes available.
	 * @param  {String}   identifier Identifier of the pool to use.
	 * @param  {Object}   data       Data to send to the worker.
	 * @param  {Function} callback   Callback function to call after completing the task.
	 */
	employWorker: function( identifier, data, callback ) {
		var workers = this.pool[identifier];

		for( var i = 0; i < workers.length; i++ ) {
			if( workers[i].isFree ) {
				this._useWorker( identifier, workers[i], data, callback );
				return;
			}
		}

		// No worker available; add to queue
		this.queue[identifier].push( {
			data: data,
			callback: callback
		} );
	},


	/**
	 * Get the number of workers in a pool.
	 * @param  {String} identifier Identifier of the pool.
	 * @return {int}               Number of workers in the pool.
	 */
	getPoolSize: function( identifier ) {
		return this.pool[identifier].length;
	},


	/**
	 * Employ a worker with a task.
	 * @param  {String}   identifier Identifier of the pool.
	 * @param  {Worker}   worker     Worker to employ with the task.
	 * @param  {Object}   data       Data to send to the worker.
	 * @param  {Function} callback   Callback function to call after completing the task.
	 */
	_useWorker: function( identifier, worker, data, callback ) {
		worker.isFree = false;

		var workerCallback = function( e ) {
			worker.removeEventListener( "message", workerCallback, false );
			worker.isFree = true;

			if( WorkerManager.queue[identifier].length > 0 ) {
				var q = WorkerManager.queue[identifier].splice( 0, 1 )[0];
				WorkerManager.employWorker( identifier, q.data, q.callback );
			}

			callback( e );
		};

		worker.addEventListener( "message", workerCallback, false );
		worker.postMessage( data );
	}

};
