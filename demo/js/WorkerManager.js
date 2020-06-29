'use strict';


/**
 * Create and use pools of Web Workers for parallization.
 * @namespace WebHF.WorkerManager
 */
WebHF.WorkerManager = {


	pool: {},
	queue: {},


	/**
	 * Employ a worker with a task.
	 * @private
	 * @param {string}   id     - Identifier of the pool.
	 * @param {Worker}   worker - Worker to employ with the task.
	 * @param {object}   data   - Data to send to the worker.
	 * @param {function} cb     - Callback function to call after completing the task.
	 */
	_useWorker( id, worker, data, cb ) {
		worker.isFree = false;

		const workerCallback = function( ev ) {
			worker.removeEventListener( 'message', workerCallback );
			worker.isFree = true;

			if( WebHF.WorkerManager.queue[id].length > 0 ) {
				const q = WebHF.WorkerManager.queue[id].splice( 0, 1 )[0];
				WebHF.WorkerManager.employWorker( id, q.data, q.callback );
			}

			cb( ev );
		};

		worker.addEventListener( 'message', workerCallback );
		worker.postMessage( data );
	},


	/**
	 * Close a pool of workers.
	 * @param {string} id - Identifier for the pool to close.
	 */
	closePool( id ) {
		if( !this.pool.hasOwnProperty( id ) ) {
			console.error( `WorkerManager: No pool with identifer ${ id }.` );
			return false;
		}

		if( this.queue[id].length > 0 ) {
			console.error( `WorkerManager: Queue for ${ id } is not empty!` );
			return false;
		}

		const pool = this.pool[id];

		for( let i = 0; i < pool.length; i++ ) {
			pool[i].postMessage( { cmd: 'close' } );
		}
	},


	/**
	 * Create a worker pool.
	 * @param {string} id       - Identifier for the pool.
	 * @param {number} number   - Number of workers in the pool.
	 * @param {object} firstMsg - Initial data to send to each worker. (optional)
	 */
	createPool( id, number, firstMsg, cb ) {
		let url = window.location.href;
		url = url.replace( window.location.hash, '' );
		url = url.replace( /index\.htm(l?)$/i, '' );

		const onLoad = code => {
			const blob = new Blob( [code], { type: 'application/javascript' } );
			const workerBlobURL = window.URL.createObjectURL( blob );
			const msgURL = {
				cmd: 'url',
				url: url
			};

			this.pool[id] = [];
			this.queue[id] = [];

			for( let i = 0; i < number; i++ ) {
				const worker = new Worker( workerBlobURL );
				worker.isFree = true;
				worker.postMessage( msgURL );

				if( firstMsg ) {
					worker.postMessage( firstMsg );
				}

				this.pool[id].push( worker );
			}

			cb();
		};

		fetch( `./js/workers/${ id }.js` )
			.then( res => res.text() )
			.then( onLoad );
	},


	/**
	 * Give a worker of a pool a task. If no worker is available,
	 * the task will be added to a queue and processed when a
	 * worker becomes available.
	 * @param  {string}   id   - Identifier of the pool to use.
	 * @param  {object}   data - Data to send to the worker.
	 * @param  {function} cb   - Callback function to call after completing the task.
	 */
	employWorker( id, data, cb ) {
		const workers = this.pool[id];

		for( let i = 0; i < workers.length; i++ ) {
			if( workers[i].isFree ) {
				this._useWorker( id, workers[i], data, cb );
				return;
			}
		}

		// No worker available; add to queue
		this.queue[id].push( {
			data: data,
			callback: cb
		} );
	},


	/**
	 * Get the number of workers in a pool.
	 * @param  {string} id - Identifier of the pool.
	 * @return {number} Number of workers in the pool.
	 */
	getPoolSize( id ) {
		return this.pool[id].length;
	}


};
