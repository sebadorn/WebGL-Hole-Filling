"use strict";


var WorkerManager = {

	pool: {},
	queue: {},


	closePool: function( identifier ) {
		if( !this.pool.hasOwnProperty( identifier ) ) {
			throw new Error( "WorkerManager: No pool with identifer " + identifer + "." );
		}

		if( this.queue[identifier].length > 0 ) {
			throw new Error( "WorkerManager: Queue for " + identifier + " is not empty!" );
		}

		for( var i = 0; i < this.pool[identifier].length; i++ ) {
			this.pool[identifier][i].postMessage( { cmd: "close" } );
		}
	},


	createPool: function( identifier, number ) {
		var blob = new Blob(
			[document.getElementById( "worker-collision" ).textContent],
			{ type: "application/javascript" }
		);
		var workerBlobURL = window.URL.createObjectURL( blob );
		var msgURL = {
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
			this.pool[identifier].push( worker );
		}

		return this.pool[identifier];
	},


	employWorker: function( identifier, data, callback ) {
		var workers = this.pool[identifier];

		for( var i = 0; i < workers.length; i++ ) {
			if( workers[i].isFree ) {
				this.useWorker( identifier, workers[i], data, callback );
				return;
			}
		}

		// No worker available; add to queue
		this.queue[identifier].push( {
			data: data,
			callback: callback
		} );
	},


	useWorker: function( identifier, worker, data, callback ) {
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
