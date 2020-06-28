'use strict';


{

const AdvancingFront = WebHF.AdvancingFront;

AdvancingFront.mode = 'parallel';

AdvancingFront.front = null;
AdvancingFront.filling = null;
AdvancingFront.ruleCallback = null;
AdvancingFront.ruleCallbackData = null;


/**
 * Apply AF rule 1 and organise heaps/angles.
 * @param {THREE.Vector3} vNew - The new vertex.
 */
AdvancingFront.applyRule1 = function( vNew ) {
	const angle = this.angle;
	const vp = angle.vertices[0];
	const v = angle.vertices[1];
	const vn = angle.vertices[2];

	// Angle has successfully been processed.
	// Update neighbouring angles.
	if( vNew ) {
		const angleNext = angle.next;
		const anglePrev = angle.previous;

		this.heap.remove( anglePrev.degree );
		this.heap.remove( angleNext.degree );

		anglePrev.setVertices( [anglePrev.vertices[0], anglePrev.vertices[1], vn] );
		anglePrev.next = angleNext;

		angleNext.setVertices( [vp, angleNext.vertices[1], angleNext.vertices[2]] );
		angleNext.previous = anglePrev;

		this.heap.insert( anglePrev.degree, anglePrev );
		this.heap.insert( angleNext.degree, angleNext );
	}
	// It failed, so insert the Angle back in.
	else {
		angle.waitForUpdate = true;
		this.heap.insert( angle.degree, angle );
	}

	this.mainEventLoopReceiveVertex( false );
};


/**
 * Apply AF rule 2 and organise heaps/angles.
 * @param {THREE.Vector3} vNew - The new vertex.
 */
AdvancingFront.applyRule2 = function( vNew ) {
	const angle = this.angle;
	const vp = angle.vertices[0];
	const v = angle.vertices[1];
	const vn = angle.vertices[2];

	// Angle has successfully been processed.
	// Update the angle itself and neighbouring angles.
	if( vNew ) {
		const angleNext = angle.next;
		const anglePrev = angle.previous;

		angle.setVertices( [vp, vNew, vn] );

		this.heap.remove( anglePrev.degree );
		this.heap.remove( angleNext.degree );

		anglePrev.setVertices( [anglePrev.vertices[0], anglePrev.vertices[1], vNew] );
		angleNext.setVertices( [vNew, angleNext.vertices[1], angleNext.vertices[2]] );

		this.heap.insert( anglePrev.degree, anglePrev );
		this.heap.insert( angleNext.degree, angleNext );
	}
	else {
		angle.waitForUpdate = true;
	}

	// Otherwise don't update the Angles.
	this.heap.insert( angle.degree, angle );

	this.mainEventLoopReceiveVertex( vNew );
};


/**
 * Apply AF rule 3 and organise heaps/angles.
 * @param {THREE.Vector3} vNew - The new vertex.
 */
AdvancingFront.applyRule3 = function( vNew ) {
	const angle = this.angle;
	const vp = angle.vertices[0];
	const v = angle.vertices[1];
	const vn = angle.vertices[2];

	// Angle has successfully been processed.
	// Update the angle itself, neighbouring angles and create a new one.
	if( vNew ) {
		const angleNext = angle.next;
		const anglePrev = angle.previous;
		const newAngle = new WebHF.Angle( [v, vNew, vn] );

		this.heap.remove( angleNext.degree );

		newAngle.previous = angle;
		newAngle.next = angleNext;

		angle.setVertices( [vp, v, vNew] );
		angle.next = newAngle;

		angleNext.setVertices( [vNew, angleNext.vertices[1], angleNext.vertices[2]] );
		angleNext.previous = newAngle;

		this.heap.insert( newAngle.degree, newAngle );
		this.heap.insert( angleNext.degree, angleNext );
	}
	else {
		angle.waitForUpdate = true;
	}

	// Otherwise don't update the Angles.
	this.heap.insert( angle.degree, angle );

	this.mainEventLoopReceiveVertex( vNew );
};


/**
 * Check, if the sides of a triangle collide with a face of the filling and/or the whole model.
 * @param {THREE.Vector3}  v     - The vector to check.
 * @param {THREE.Vector3}  fromA
 * @param {THREE.Vector3}  fromB
 */
AdvancingFront.collisionTest = function( v, fromA, fromB ) {
	const callback = this.collisionTestCallback.bind( this );
	const data = {
		cmd: 'check',
		type: 'filling',
		faces: null,
		test: JSON.stringify( {
			v: v,
			fromA: fromA,
			fromB: fromB
		} )
	};
	const lenFilling = this.filling.faces.length;
	const workerNumber = WebHF.WorkerManager.getPoolSize( 'collision' );

	let lenModel = 0;
	let sendResults = 0;

	WebHF.Stopwatch.start( 'collision' );

	this.workerResultCounter = 0;
	this.workerResult = false;
	this.neededWorkerResults = workerNumber;

	if( lenFilling === 0 ) {
		WebHF.Stopwatch.stop( 'collision' );
		this.ruleCallback( false );
		return;
	}

	let facesPerWorker = Math.ceil( lenFilling / workerNumber );

	if( this.collisionTestMode === 'all' ) {
		lenModel = this.modelGeo.faces.length;
		this.neededWorkerResults *= 2;
	}

	if(
		lenFilling > workerNumber &&
		lenFilling % workerNumber !== 0 &&
		lenFilling % facesPerWorker === 0
	) {
		this.collisionTestCallback( false );
		sendResults++;
	}

	if( lenFilling < workerNumber ) {
		for( let i = 0; i < workerNumber - lenFilling; i++ ) {
			this.collisionTestCallback( false );
			sendResults++;
		}
	}

	let face = null;

	for( let i = 0; i < lenFilling; i += facesPerWorker ) {
		data.faces = [];

		for( let j = 0; j < facesPerWorker; j++ ) {
			if( i + j >= lenFilling ) {
				break;
			}

			face = this.filling.faces[i + j];
			const a = this.filling.vertices[face.a];
			const b = this.filling.vertices[face.b];
			const c = this.filling.vertices[face.c];

			data.faces.push( [a, b, c] );
		}

		if( data.faces.length === 0 ) {
			console.log( [this.testCounter], 'data.faces.length === 0' );
			this.collisionTestCallback( false );
		}
		else {
			data.faces = JSON.stringify( data.faces );
			WebHF.WorkerManager.employWorker( 'collision', data, callback );
		}

		sendResults++;
	}

	if( sendResults < workerNumber ) {
		this.collisionTestCallback( false );
		sendResults++;
	}

	if( this.collisionTestMode === 'all' ) {
		data.type = 'model';
		facesPerWorker = Math.ceil( lenModel / workerNumber );

		for( let i = 0; i < lenModel; i += facesPerWorker ) {
			data.faces = [];

			for( let j = 0; j < facesPerWorker; j++ ) {
				if( i + j >= lenModel ) {
					break;
				}

				face = this.modelGeo.faces[i + j];
				data.faces.push( [face.a, face.b, face.c] );
			}

			if( data.faces.length === 0 ) {
				this.collisionTestCallback( false );
			}
			else {
				data.faces = JSON.stringify( data.faces );
				WebHF.WorkerManager.employWorker( 'collision', data, callback );
			}

			sendResults++;
		}
	}

	if( sendResults < workerNumber ) {
		this.collisionTestCallback( false );
		sendResults++;
	}

	if( face === null ) {
		WebHF.Stopwatch.stop( 'collision' );
		this.ruleCallback( false );
	}
};


/**
 * Callback function for the collision workers.
 * @param {?Event} ev
 */
AdvancingFront.collisionTestCallback = function( ev ) {
	if( ev && ev.data.intersects ) {
		this.workerResult = true;
	}

	this.workerResultCounter++;

	if( this.workerResultCounter === this.neededWorkerResults ) {
		WebHF.Stopwatch.stop( 'collision' );
		this.ruleCallback( this.workerResult );
	}
};


/**
 * Get the rule function for the given angle.
 * @param  {number} degree - Angle in degree.
 * @return {function} The function to the rule, or false if none available.
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
		console.warn( 'front.vertices.length == 2' );
		this.wrapUp( this.front, this.filling );
		return;
	}
	else if( this.front.vertices.length == 1 ) {
		console.warn( 'front.vertices.length == 1' );
		this.wrapUp( this.front, this.filling );
		return;
	}

	// Get next angle and apply rule
	if( this.heap.size() > 0 ) {
		this.angle = this.getNextAngle();

		const ruleFunc = this.getRuleFunctionForAngle( this.angle.degree );

		if( ruleFunc === false ) {
			WebHF.SceneManager.showFilling( this.front, this.filling );
			throw new Error( 'No rule could be applied. Stopping before entering endless loop.' );
		}

		ruleFunc( this.angle.vertices[0], this.angle.vertices[1], this.angle.vertices[2], this.angle );
	}
	else {
		WebHF.SceneManager.showFilling( this.front, this.filling );
		throw new Error( 'Hole has not been filled yet, but heap is empty.' );
	}
};


/**
 * Receive the new vertex (if there is one), call the merging and
 * go back into the main loop.
 * @param {THREE.Vector3} vNew - New vertex by a rule.
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
		WebHF.UI.updateProgress( 100 - Math.round( this.front.vertices.length / this.hole.length * 100 ) );
	}

	this.mainEventLoop();
};


/**
 * Apply rule 1 of the advancing front mesh algorithm.
 * Rule 1: Close gaps of angles <= 75°.
 * @param {THREE.Vector3} vp - Previous vector.
 * @param {THREE.Vector3} v  - Current vector.
 * @param {THREE.Vector3} vn - Next vector.
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
 * @param {boolean} intersects - True, if new vertex intersects with some other part.
 */
AdvancingFront.rule1Callback = function( intersects ) {
	if( !intersects ) {
		const data = this.ruleCallbackData;
		const vIndexFront = this.front.vertices.indexOf( data.v );
		const vIndexFilling = this.filling.vertices.indexOf( data.v );
		const vnIndexFilling = this.filling.vertices.indexOf( data.vn );
		const vpIndexFilling = this.filling.vertices.indexOf( data.vp );

		this.filling.faces.push( new THREE.Face3( vIndexFilling, vpIndexFilling, vnIndexFilling ) );

		// The vector v is not a part of the (moving) hole front anymore.
		this.front.vertices.splice( vIndexFront, 1 );
	}

	this.applyRule1( !intersects );
};


/**
 * Apply rule 2 of the advancing front mesh algorithm.
 * Rule 2: Create one new vertex if the angle is > 75° and <= 135°.
 * @param {THREE.Vector3} vp - Previous vector.
 * @param {THREE.Vector3} v  - Current vector.
 * @param {THREE.Vector3} vn - Next vector.
 */
AdvancingFront.rule2 = function( vp, v, vn ) {
	const vNew = this.rule2Calc( vp, v, vn );

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
 * @param {boolean} intersects - True, if new vertex intersects with some other part.
 */
AdvancingFront.rule2Callback = function( intersects ) {
	if( !intersects ) {
		const data = this.ruleCallbackData;

		// New vertex
		this.filling.vertices.push( data.vNew );

		// New faces for 2 new triangles
		const len = this.filling.vertices.length;
		const vIndexFront = this.front.vertices.indexOf( data.v );
		const vpIndexFilling = this.filling.vertices.indexOf( data.vp );
		const vIndexFilling = this.filling.vertices.indexOf( data.v );
		const vnIndexFilling = this.filling.vertices.indexOf( data.vn );

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
 * @param {THREE.Vector3} vp    - Previous vector.
 * @param {THREE.Vector3} v     - Current vector.
 * @param {THREE.Vector3} vn    - Next vector.
 * @param {number}        angle - Angle created by these vectors.
 */
AdvancingFront.rule3 = function( vp, v, vn, angle ) {
	const vNew = this.rule3Calc( vp, v, vn, angle );

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
 * @param {boolean} intersects - True, if new vertex intersects with some other part.
 */
AdvancingFront.rule3Callback = function( intersects ) {
	if( !intersects ) {
		const data = this.ruleCallbackData;

		// New vertex
		this.filling.vertices.push( data.vNew );

		// New face for the new triangle
		const len = this.filling.vertices.length;
		const vIndexFront = this.front.vertices.indexOf( data.v );
		const vnIndexFilling = this.filling.vertices.indexOf( data.vn );
		const vIndexFilling = this.filling.vertices.indexOf( data.v );

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
 * @param  {THREE.Geometry} modelGeo       - The model to fill the holes in.
 * @param  {THREE.Line[]}   hole           - The hole described by lines.
 * @param  {number}         mergeThreshold - Threshold for merging.
 * @param  {function}       callback       - Function to call after finishing the filling.
 * @param  {number}         workerNumber   - Number of worker processes to use.
 * @return {THREE.Geometry} The generated filling.
 */
AdvancingFront.start = function( modelGeo, hole, mergeThreshold, callback, workerNumber ) {
	this.callback = callback;

	this.filling = new THREE.Geometry();
	this.front = new THREE.Geometry();
	this.hole = hole;
	this.mergeThreshold = mergeThreshold;

	this.front.vertices = this.hole.slice( 0 );
	this.filling.vertices = this.hole.slice( 0 );

	this.front.mergeVertices();
	this.filling.mergeVertices();

	this.holeIndex = WebHF.SceneManager.holes.indexOf( this.hole );
	this.loopCounter = 0;
	this.modelGeo = modelGeo;

	this.initHeap( this.front );

	let firstMsg = false;

	if( this.collisionTestMode === 'all' ) {
		firstMsg = {
			cmd: 'prepare',
			modelF: JSON.stringify( this.modelGeo.faces ),
			modelV: JSON.stringify( this.modelGeo.vertices )
		};
	}

	WebHF.Stopwatch.start( 'init workers' );

	WebHF.WorkerManager.createPool( 'collision', workerNumber, firstMsg, () => {
		WebHF.Stopwatch.stop( 'init workers', true );
		WebHF.Stopwatch.remove( 'init workers' );

		this.mainEventLoop();
	} );
};

}
