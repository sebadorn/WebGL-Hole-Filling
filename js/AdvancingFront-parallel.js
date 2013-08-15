"use strict";


AdvancingFront.mode = "parallel";

AdvancingFront.front = null;
AdvancingFront.filling = null;
AdvancingFront.ruleCallback = null;
AdvancingFront.ruleCallbackData = null;


/**
 * Apply AF rule 1 and organise heaps/angles.
 */
AdvancingFront.applyRule1 = function( vNew ) {
	var angle = this.angle;

	// Angle has successfully been processed.
	// Update neighbouring angles.
	if( vNew ) {
		this.heap.remove( angle.previous.degree );
		angle.previous.setVertices( [
			angle.previous.vertices[0],
			angle.previous.vertices[1],
			angle.vertices[2]
		] );
		angle.previous.next = angle.next;
		this.heap.insert( angle.previous.degree, angle.previous );

		this.heap.remove( angle.next.degree );
		angle.next.setVertices( [
			angle.vertices[0],
			angle.next.vertices[1],
			angle.next.vertices[2]
		] );
		angle.next.previous = angle.previous;
		this.heap.insert( angle.next.degree, angle.next );
	}
	// It failed, so insert the Angle back in.
	else {
		this.heap.insert( angle.degree, angle );
	}

	this.mainEventLoopReceiveVertex( false );
};


/**
 * Apply AF rule 2 and organise heaps/angles.
 */
AdvancingFront.applyRule2 = function( vNew ) {
	var angle = this.angle;

	// Angle has successfully been processed.
	// Update the angle itself and neighbouring angles.
	if( vNew ) {
		angle.setVertices( [
			angle.vertices[0],
			vNew,
			angle.vertices[2]
		] );

		this.heap.remove( angle.previous.degree );
		angle.previous.setVertices( [
			angle.previous.vertices[0],
			angle.previous.vertices[1],
			vNew
		] );
		this.heap.insert( angle.previous.degree, angle.previous );

		this.heap.remove( angle.next.degree );
		angle.next.setVertices( [
			vNew,
			angle.next.vertices[1],
			angle.next.vertices[2]
		] );
		this.heap.insert( angle.next.degree, angle.next );
	}
	// Otherwise don't update the angles and just put it back in.
	this.heap.insert( angle.degree, angle );

	this.mainEventLoopReceiveVertex( vNew );
};


/**
 * Apply AF rule 3 and organise heaps/angles.
 */
AdvancingFront.applyRule3 = function( vNew ) {
	var angle = this.angle;

	// Angle has successfully been processed.
	// Update the angle itself, neighbouring angles and create a new one.
	if( vNew ) {
		var newAngle = new Angle( [
			angle.vertices[1],
			vNew,
			angle.vertices[2]
		] );
		newAngle.previous = angle;
		newAngle.next = angle.next;
		this.heap.insert( newAngle.degree, newAngle );

		this.heap.remove( angle.next.degree );
		angle.next.setVertices( [
			vNew,
			angle.next.vertices[1],
			angle.next.vertices[2]
		] );
		angle.next.previous = newAngle;
		this.heap.insert( angle.next.degree, angle.next );

		angle.setVertices( [
			angle.vertices[0],
			angle.vertices[1],
			vNew
		] );
		angle.next = newAngle;
	}
	// Otherwise don't update the angles and just put it back in.
	this.heap.insert( angle.degree, angle );

	this.mainEventLoopReceiveVertex( vNew );
};


/**
 * Check, if the sides of a triangle collide with a face of the filling and/or the whole model.
 * @param  {THREE.Vector3}  v       The vector to check.
 * @param  {THREE.Vector3}  fromA
 * @param  {THREE.Vector3}  fromB
 * @return {boolean}                True, if collision has been found, false otherwise.
 */
AdvancingFront.collisionTest = function( v, fromA, fromB ) {
	var callback = this.collisionTestCallback.bind( this ),
	    data = {
	    	cmd: "check",
	    	type: "filling",
	    	faces: null,
	    	test: JSON.stringify( {
	    		v: v,
	    		fromA: fromA,
	    		fromB: fromB
	    	} )
	    },
	    employedWorkerCounter = 0,
	    lenFilling = this.filling.faces.length,
	    lenModel = 0;
	var a, b, c, dataMsg, face, facesPerWorker;

	Stopwatch.start( "collision" );

	this.workerResultCounter = 0;
	this.workerResult = false;
	this.neededWorkerResults = CONFIG.FILLING.WORKER;

	if( lenFilling == 0 ) {
		Stopwatch.stop( "collision" );
		this.ruleCallback( false );
		return;
	}

	facesPerWorker = Math.ceil( lenFilling / CONFIG.FILLING.WORKER );

	if( CONFIG.FILLING.COLLISION_TEST == "all" ) {
		lenModel = this.modelGeo.faces.length;
		this.neededWorkerResults *= 2;
	}

	if( lenFilling + lenModel < this.neededWorkerResults ) {
		this.workerResultCounter = this.neededWorkerResults - 1;
	}

	for( var i = 0; i < lenFilling; i += facesPerWorker ) {
		data.faces = [];

		for( var j = 0; j < facesPerWorker; j++ ) {
			if( i + j >= lenFilling ) {
				break;
			}

			face = this.filling.faces[i + j];
			a = this.filling.vertices[face.a];
			b = this.filling.vertices[face.b];
			c = this.filling.vertices[face.c];

			data.faces.push( [a, b, c] );
		}

		if( data.faces.length == 0 ) {
			this.workerResultCounter++;
		}
		else {
			data.faces = JSON.stringify( data.faces );
			employedWorkerCounter++;
			WorkerManager.employWorker( "collision", data, callback );
		}
	}

	if( CONFIG.FILLING.COLLISION_TEST == "all" ) {
		if( employedWorkerCounter < CONFIG.FILLING.WORKER ) {
			this.workerResultCounter += CONFIG.FILLING.WORKER - employedWorkerCounter;
		}

		data.type = "model";
		facesPerWorker = Math.ceil( lenModel / CONFIG.FILLING.WORKER );

		for( var i = 0; i < lenModel; i += facesPerWorker ) {
			data.faces = [];

			for( var j = 0; j < facesPerWorker; j++ ) {
				if( i + j >= lenModel ) {
					break;
				}

				face = this.modelGeo.faces[i + j];
				data.faces.push( [face.a, face.b, face.c] );
			}

			if( data.faces.length == 0 ) {
				this.workerResultCounter++;
			}
			else {
				data.faces = JSON.stringify( data.faces );
				WorkerManager.employWorker( "collision", data, callback );
			}
		}
	}

	if( face == null ) {
		Stopwatch.stop( "collision" );
		this.ruleCallback( false );
	}
};


/**
 * Callback function for the collision workers.
 */
AdvancingFront.collisionTestCallback = function( e ) {
	if( e.data.intersects ) {
		this.workerResult = true;
	}

	this.workerResultCounter++;

	if( this.workerResultCounter == this.neededWorkerResults ) {
		Stopwatch.stop( "collision" );
		this.ruleCallback( this.workerResult );
	}
};


/**
 * Get the rule function for the given angle.
 * @param  {float}    degree Angle in degree.
 * @return {Function}        The function to the rule, or false if none available.
 */
AdvancingFront.getRuleFunctionForAngle = function( degree ) {
	if( degree <= 75.0 ) {
		return this.rule1.bind( this );
	}
	else if( degree <= 135.0 ) {
		return this.rule2.bind( this );
	}
	else if( degree < 180.0 ) {
		return this.rule3.bind( this );
	}

	return false;
};


/**
 * Main loop.
 */
AdvancingFront.mainEventLoop = function() {
	this.loopCounter++;

	// for debugging
	if( this.STOP_AFTER !== false && this.loopCounter > this.STOP_AFTER ) {
		this.wrapUp( this.front, this.filling );
		return;
	}

	// Close last hole
	if( this.front.vertices.length == 4 ) {
		this.filling = this.closeHole4( this.front, this.filling );
		this.wrapUp( this.front, this.filling );
		return;
	}
	else if( this.front.vertices.length == 3 ) {
		this.filling = this.closeHole3( this.front, this.filling );
		this.wrapUp( this.front, this.filling );
		return;
	}
	// Problematic/strange situations
	else if( this.front.vertices.length == 2 ) {
		console.warn( "front.vertices.length == 2" );
		this.wrapUp( this.front, this.filling );
		return;
	}
	else if( this.front.vertices.length == 1 ) {
		console.warn( "front.vertices.length == 1" );
		this.wrapUp( this.front, this.filling );
		return;
	}

	// Get next angle and apply rule
	if( this.heap.size() > 0 ) {
		this.angle = this.heap.removeFirst();

		while( this.angle.waitForUpdate ) {
			this.heap.insert( this.angle.degree, this.angle );
			this.angle = this.heap.removeFirst();
		}

		var ruleFunc = this.getRuleFunctionForAngle( this.angle.degree );

		if( ruleFunc == false ) {
			SceneManager.showFilling( this.front, this.filling );
			throw new Error( "No rule could be applied. Stopping before entering endless loop." );
		}

		ruleFunc( this.angle.vertices[0], this.angle.vertices[1], this.angle.vertices[2], this.angle.degree );
	}
	else {
		SceneManager.showFilling( this.front, this.filling );
		throw new Error( "Hole has not been filled yet, but heap is empty." );
	}
};


/**
 * Receive the new vertex (if there is one), call the merging and
 * go back into the main loop.
 * @param {THREE.Vector3} vNew New vertex by a rule.
 */
AdvancingFront.mainEventLoopReceiveVertex = function( vNew ) {
	this.heap.sort();

	if( !vNew || this.front.vertices.length != 3 ) {
		// Compute the distances between each new created
		// vertex and see, if they can be merged.
		this.mergeByDistance( this.front, this.filling, vNew, this.hole );
	}

	// Update progress bar
	if( this.loopCounter % CONFIG.FILLING.PROGRESS_UPDATE == 0 ) {
		UI.updateProgress( 100 - Math.round( this.front.vertices.length / this.hole.length * 100 ) );
	}

	this.mainEventLoop();
};


/**
 * Apply rule 1 of the advancing front mesh algorithm.
 * Rule 1: Close gaps of angles <= 75°.
 * @param {THREE.Vector3}  vp      Previous vector.
 * @param {THREE.Vector3}  v       Current vector.
 * @param {THREE.Vector3}  vn      Next vector.
 */
AdvancingFront.rule1 = function( vp, v, vn ) {
	this.ruleCallback = this.rule1Callback;
	this.ruleCallbackData = {
		vp: vp,
		v: v,
		vn: vn
	};
	this.collisionTest( vp, vn );
};


/**
 * Callback for the collision test.
 * @param {boolean} intersects True, if new vertex intersects with some other part.
 */
AdvancingFront.rule1Callback = function( intersects ) {
	if( !intersects ) {
		var data = this.ruleCallbackData;
		var vIndexFront = this.front.vertices.indexOf( data.v ),
		    vIndexFilling = this.filling.vertices.indexOf( data.v ),
		    vnIndexFilling = this.filling.vertices.indexOf( data.vn ),
		    vpIndexFilling = this.filling.vertices.indexOf( data.vp );

		this.filling.faces.push( new THREE.Face3( vIndexFilling, vpIndexFilling, vnIndexFilling ) );

		// The vector v is not a part of the (moving) hole front anymore.
		this.front.vertices.splice( vIndexFront, 1 );
	}

	this.applyRule1( !intersects );
};


/**
 * Apply rule 2 of the advancing front mesh algorithm.
 * Rule 2: Create one new vertex if the angle is > 75° and <= 135°.
 * @param {THREE.Vector3} vp Previous vector.
 * @param {THREE.Vector3} v  Current vector.
 * @param {THREE.Vector3} vn Next vector.
 */
AdvancingFront.rule2 = function( vp, v, vn ) {
	var vNew = this.rule2Calc( vp, v, vn );

	this.ruleCallback = this.rule2Callback;
	this.ruleCallbackData = {
		vp: vp,
		v: v,
		vn: vn,
		vNew: vNew
	};
	this.collisionTest( vNew, vp, vn );
};


/**
 * Callback for the collision test.
 * @param {boolean} intersects True, if new vertex intersects with some other part.
 */
AdvancingFront.rule2Callback = function( intersects ) {
	if( !intersects ) {
		var data = this.ruleCallbackData;

		// New vertex
		this.filling.vertices.push( data.vNew );

		// New faces for 2 new triangles
		var len = this.filling.vertices.length,
		    vIndexFront = this.front.vertices.indexOf( data.v ),
		    vpIndexFilling = this.filling.vertices.indexOf( data.vp ),
		    vIndexFilling = this.filling.vertices.indexOf( data.v ),
		    vnIndexFilling = this.filling.vertices.indexOf( data.vn );

		this.filling.faces.push( new THREE.Face3( vIndexFilling, vpIndexFilling, len - 1 ) );
		this.filling.faces.push( new THREE.Face3( vIndexFilling, len - 1, vnIndexFilling ) );

		// Update front
		this.front.vertices[vIndexFront] = data.vNew;

		this.applyRule2( data.vNew );
	}
	else {
		this.applyRule2( false );
	}
};


/**
 * Apply rule 3 of the advancing front mesh algorithm.
 * Rule 3: Create a new vertex if the angle is > 135°.
 * @param {THREE.Vector3} vp    Previous vector.
 * @param {THREE.Vector3} v     Current vector.
 * @param {THREE.Vector3} vn    Next vector.
 * @param {float}         angle Angle created by these vectors.
 */
AdvancingFront.rule3 = function( vp, v, vn, angle ) {
	var vNew = this.rule3Calc( vp, v, vn, angle );

	this.ruleCallback = this.rule3Callback;
	this.ruleCallbackData = {
		vp: vp,
		v: v,
		vn: vn,
		vNew: vNew
	};
	this.collisionTest( vNew, vp, vn );
};


/**
 * Callback for the collision test.
 * @param {boolean} intersects True, if new vertex intersects with some other part.
 */
AdvancingFront.rule3Callback = function( intersects ) {
	if( !intersects ) {
		var data = this.ruleCallbackData;

		// New vertex
		this.filling.vertices.push( data.vNew );

		// New face for the new triangle
		var len = this.filling.vertices.length,
		    vIndexFront = this.front.vertices.indexOf( data.v ),
		    vnIndexFilling = this.filling.vertices.indexOf( data.vn ),
		    vIndexFilling = this.filling.vertices.indexOf( data.v );

		this.filling.faces.push( new THREE.Face3( vnIndexFilling, vIndexFilling, len - 1 ) );

		// Update front
		this.front.vertices.splice( vIndexFront + 1, 0, data.vNew );

		this.applyRule3( data.vNew );
	}
	else {
		this.applyRule3( false );
	}
};


/**
 * Fill the hole using the advancing front algorithm.
 * @param  {THREE.Geometry}    modelGeo       The model to fill the holes in.
 * @param  {Array<THREE.Line>} hole           The hole described by lines.
 * @param  {float}             mergeThreshold Threshold for merging.
 * @return {THREE.Geometry}                   The generated filling.
 */
AdvancingFront.start = function( modelGeo, hole, mergeThreshold, callback ) {
	this.callback = callback;

	this.filling = new THREE.Geometry();
	this.front = new THREE.Geometry();
	this.hole = hole;
	this.mergeThreshold = mergeThreshold;

	this.front.vertices = this.hole.slice( 0 );
	this.filling.vertices = this.hole.slice( 0 );

	this.front.mergeVertices();
	this.filling.mergeVertices();

	this.holeIndex = SceneManager.holes.indexOf( this.hole );
	this.loopCounter = 0;
	this.modelGeo = modelGeo;

	this.initHeap( this.front );

	var firstMsg = false;

	if( CONFIG.FILLING.COLLISION_TEST == "all" ) {
		firstMsg = {
			cmd: "prepare",
			modelF: JSON.stringify( this.modelGeo.faces ),
			modelV: JSON.stringify( this.modelGeo.vertices )
		};
	}

	Stopwatch.start( "init workers" );
	WorkerManager.createPool( "collision", CONFIG.FILLING.WORKER + 1, firstMsg );
	Stopwatch.stop( "init workers", true );

	this.mainEventLoop();
};
