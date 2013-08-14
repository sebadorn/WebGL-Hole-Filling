"use strict";


/**
 * Class for hole finding and filling algorithms.
 * @type {Object}
 */
var AdvancingFront = {

	front: null,
	filling: null,
	heap: null,
	hole: null,
	holeIndex: -1,
	loopCounter: null,
	mergeThreshold: null,
	modelGeo: null,
	resultCallback: null,
	ruleCallback: null,
	ruleCallbackData: null,

	STOP_AFTER: CONFIG.DEBUG.AF_STOP_AFTER_ITER,


	/**
	 * Fill the hole using the advancing front algorithm.
	 * @param  {THREE.Geometry}    modelGeo       The model to fill the holes in.
	 * @param  {Array<THREE.Line>} hole           The hole described by lines.
	 * @param  {float}             mergeThreshold Threshold for merging.
	 * @return {THREE.Geometry}                   The generated filling.
	 */
	afmStart: function( modelGeo, hole, mergeThreshold, callback ) {
		this.resultCallback = callback;

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

		if( CONFIG.HF.FILLING.COLLISION_TEST == "all" ) {
			firstMsg = {
				cmd: "prepare",
				modelF: JSON.stringify( this.modelGeo.faces ),
				modelV: JSON.stringify( this.modelGeo.vertices )
			};
		}

		Stopwatch.start( "init workers" );
		WorkerManager.createPool( "collision", CONFIG.HF.FILLING.WORKER + 1, firstMsg );
		Stopwatch.stop( "init workers", true );

		this.mainEventLoop();
	},


	/**
	 * Apply rule 1 of the advancing front mesh algorithm.
	 * Rule 1: Close gaps of angles <= 75°.
	 * @param {THREE.Vector3}  vp      Previous vector.
	 * @param {THREE.Vector3}  v       Current vector.
	 * @param {THREE.Vector3}  vn      Next vector.
	 */
	afRule1: function( vp, v, vn ) {
		this.ruleCallback = this.afRule1Callback;
		this.ruleCallbackData = {
			vp: vp,
			v: v,
			vn: vn
		};
		this.isInHole( vp, vn );
	},


	/**
	 * Callback for the collision test.
	 * @param {boolean} intersects True, if new vertex intersects with some other part.
	 */
	afRule1Callback: function( intersects ) {
		if( !intersects ) {
			var data = this.ruleCallbackData;
			var vIndex = this.filling.vertices.indexOf( data.v ),
			    vnIndex = this.filling.vertices.indexOf( data.vn ),
			    vpIndex = this.filling.vertices.indexOf( data.vp );

			this.filling.faces.push( new THREE.Face3( vIndex, vpIndex, vnIndex ) );

			// The vector v is not a part of the (moving) hole front anymore.
			this.front.vertices.splice( this.front.vertices.indexOf( data.v ), 1 );
		}

		this.applyRule1( !intersects );
	},


	/**
	 * Apply rule 2 of the advancing front mesh algorithm.
	 * Rule 2: Create one new vertex if the angle is > 75° and <= 135°.
	 * @param {THREE.Vector3} vp Previous vector.
	 * @param {THREE.Vector3} v  Current vector.
	 * @param {THREE.Vector3} vn Next vector.
	 */
	afRule2: function( vp, v, vn ) {
		// To make things easier, we just move the whole thing into the origin
		// and when we have the new point, we move it back.
		var vpClone = vp.clone().sub( v ),
		    vnClone = vn.clone().sub( v ),
		    origin = new THREE.Vector3();

		// Create the plane of the vectors vp and vn
		// with position vector v.
		var plane = new Plane( origin, vpClone, vnClone );
		var adjusted, avLen, vNew;

		// Get a vector on that plane, that lies on half the angle between vp and vn.
		vNew = plane.getPoint( 1, 1 );

		// Compute the average length of vp and vn.
		// Then adjust the position of the new vector, so it has this average length.
		avLen = Utils.getAverageLength( vpClone, vnClone );
		vNew.setLength( avLen );
		vNew.add( v );

		this.ruleCallback = this.afRule2Callback;
		this.ruleCallbackData = {
			vp: vp,
			v: v,
			vn: vn,
			vNew: vNew
		};
		this.isInHole( vNew, vp, vn );
	},


	/**
	 * Callback for the collision test.
	 * @param {boolean} intersects True, if new vertex intersects with some other part.
	 */
	afRule2Callback: function( intersects ) {
		if( !intersects ) {
			var data = this.ruleCallbackData;

			// New vertex
			this.filling.vertices.push( data.vNew );

			// New faces for 2 new triangles
			var len = this.filling.vertices.length;
			var vpIndex = this.filling.vertices.indexOf( data.vp ),
			    vIndex = this.filling.vertices.indexOf( data.v ),
			    vnIndex = this.filling.vertices.indexOf( data.vn );

			this.filling.faces.push( new THREE.Face3( vIndex, vpIndex, len - 1 ) );
			this.filling.faces.push( new THREE.Face3( vIndex, len - 1, vnIndex ) );

			// Update front
			var ix = this.front.vertices.indexOf( data.v );
			this.front.vertices[ix] = data.vNew;

			this.applyRule2( data.vNew );
		}
		else {
			this.applyRule2( false );
		}
	},


	/**
	 * Apply rule 3 of the advancing front mesh algorithm.
	 * Rule 3: Create a new vertex if the angle is > 135°.
	 * @param {THREE.Vector3} vp    Previous vector.
	 * @param {THREE.Vector3} v     Current vector.
	 * @param {THREE.Vector3} vn    Next vector.
	 * @param {float}         angle Angle created by these vectors.
	 */
	afRule3: function( vp, v, vn, angle ) {
		var vpClone = vp.clone().sub( v ),
		    vnClone = vn.clone().sub( v );

		// New vertice
		var halfWay = vnClone.clone().divideScalar( 2 );

		var cross1 = new THREE.Vector3().crossVectors( vpClone, vnClone );
		cross1.normalize();
		cross1.add( halfWay );
		cross1.add( v );

		var cross2 = new THREE.Vector3().crossVectors(
			cross1.clone().sub( v ).sub( halfWay ),
			vnClone.clone().sub( halfWay )
		);
		if( angle < 180.0 ) {
			cross2.multiplyScalar( -1 );
		}
		cross2.normalize();
		cross2.add( v ).add( halfWay );

		var plane = new Plane(
			new THREE.Vector3(),
			vnClone.clone().sub( halfWay ),
			cross2.clone().sub( v ).sub( halfWay )
		);
		var vOnPlane = plane.getPoint( 0, vnClone.length() );
		var vNew = vOnPlane.clone();

		vNew.add( v ).add( halfWay );
		vNew = Utils.keepNearPlane( v, vn, vNew );

		this.ruleCallback = this.afRule3Callback;
		this.ruleCallbackData = {
			vp: vp,
			v: v,
			vn: vn,
			vNew: vNew
		};
		this.isInHole( vNew, vp, vn );
	},


	/**
	 * Callback for the collision test.
	 * @param {boolean} intersects True, if new vertex intersects with some other part.
	 */
	afRule3Callback: function( intersects ) {
		if( !intersects ) {
			var data = this.ruleCallbackData;

			// New vertex
			this.filling.vertices.push( data.vNew );

			// New face for the new triangle
			var len = this.filling.vertices.length;
			var vnIndex = this.filling.vertices.indexOf( data.vn ),
			    vIndex = this.filling.vertices.indexOf( data.v );

			this.filling.faces.push( new THREE.Face3( vnIndex, vIndex, len - 1 ) );

			// Update front
			var ix = this.front.vertices.indexOf( data.v );
			this.front.vertices.splice( ix + 1, 0, data.vNew );

			this.applyRule3( data.vNew );
		}
		else {
			this.applyRule3( false );
		}
	},


	/**
	 * Apply AF rule 1 and organise heaps/angles.
	 */
	applyRule1: function( vNew ) {
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
	},


	/**
	 * Apply AF rule 2 and organise heaps/angles.
	 */
	applyRule2: function( vNew ) {
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
	},


	/**
	 * Apply AF rule 3 and organise heaps/angles.
	 */
	applyRule3: function( vNew ) {
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
	},


	/**
	 * Close the last hole of only 3 vertices.
	 */
	closeHole3: function() {
		this.filling.faces.push( new THREE.Face3(
			this.filling.vertices.indexOf( this.front.vertices[1] ),
			this.filling.vertices.indexOf( this.front.vertices[0] ),
			this.filling.vertices.indexOf( this.front.vertices[2] )
		) );
		this.front.vertices = [];
	},


	/**
	 * Close the last hole of only 4 vertices.
	 */
	closeHole4: function() {
		this.filling.faces.push( new THREE.Face3(
			this.filling.vertices.indexOf( this.front.vertices[3] ),
			this.filling.vertices.indexOf( this.front.vertices[2] ),
			this.filling.vertices.indexOf( this.front.vertices[0] )
		) );
		this.filling.faces.push( new THREE.Face3(
			this.filling.vertices.indexOf( this.front.vertices[1] ),
			this.filling.vertices.indexOf( this.front.vertices[0] ),
			this.filling.vertices.indexOf( this.front.vertices[2] )
		) );
		this.front.vertices = [];
	},


	/**
	 * Compute the angles of neighbouring vertices.
	 * Angles are in degree.
	 * @param  {THREE.Geometry} front The model with the vertices.
	 * @return {Object}               The angles and the smallest one together with the index of the vertex.
	 */
	computeAngles: function( front ) {
		var angles = [],
		    smallest = {
				angle: 361.0,
				index: -1
		    };
		var angle, prev, v, vn, vp;

		for( var i = 0, len = front.length; i < len; i++ ) {
			vp = front[( i == 0 ) ? len - 1 : i - 1];
			v = front[i];
			vn = front[( i + 1 ) % len];

			prev = ( i == 0 ) ? null : angles[angles.length - 1];
			angle = new Angle( [vp, v, vn] );
			angle.previous = prev;

			angles.push( angle );

			if( i > 0 ) {
				angles[angles.length - 2].next = angles[angles.length - 1];
			}

			if( smallest.angle > angle.degree ) {
				smallest.angle = angle.degree;
				smallest.index = i;
			}
		}

		angles[0].previous = angles[angles.length - 1];
		angles[angles.length - 1].next = angles[0];

		return {
			angles: angles,
			smallest: smallest
		};
	},


	/**
	 * Get the rule function for the given angle.
	 * @param  {float}    degree Angle in degree.
	 * @return {Function}        The function to the rule, or false if none available.
	 */
	getRuleFunctionForAngle: function( degree ) {
		if( degree <= 75.0 ) {
			return this.afRule1.bind( this );
		}
		else if( degree <= 135.0 ) {
			return this.afRule2.bind( this );
		}
		else if( degree < 180.0 ) {
			return this.afRule3.bind( this );
		}

		return false;
	},


	/**
	 * Angle heaps have to be updated if vertices of the front are being merged.
	 * @param  {THREE.Vector3} vOld The old vertex.
	 * @param  {THREE.Vector3} vNew The new vertex.
	 * @return {boolean}            True, if an angle has been updated, false otherwise.
	 */
	heapMergeVertex: function( vOld, vNew ) {
		var angle, angles;

		for( var key in this.heap.values ) {
			angles = this.heap.values[key];

			for( var j = 0; j < angles.length; j++ ) {
				angle = angles[j];

				// Match with vOld in the "middle"
				if( angle.vertices[1] == vOld ) {
					if( angle.previous.vertices[1] == vNew ) {
						angle.previous.vertices[2] = angle.vertices[2];
						angle.next.vertices[0] = vNew;
					}
					else if( angle.next.vertices[1] == vNew ) {
						angle.previous.vertices[2] = vNew;
						angle.next.vertices[0] = angle.vertices[0];
					}
					else {
						throw new Error(
							"Situation that shouldn't be possible. "
							+ "Neither previous nor next angle contain the new vertex."
						);
					}

					angle.previous.next = angle.next;
					angle.next.previous = angle.previous;

					this.heap.remove( angle.previous.degree );
					this.heap.remove( angle.next.degree );

					angle.previous.calculateAngle();
					angle.next.calculateAngle();

					this.heap.insert( angle.previous.degree, angle.previous );
					this.heap.insert( angle.next.degree, angle.next );

					this.heap.remove( angle.degree );

					return true;
				}
			}
		}

		return false;
	},


	/**
	 * Initialize heap.
	 * @param {THREE.Geometry} front The current front (outline of the hole).
	 */
	initHeap: function( front ) {
		var ca = this.computeAngles( front.vertices );
		var angle;

		this.heap = new Heap( "all" );

		// Initialize heaps
		for( var i = 0, len = ca.angles.length; i < len; i++ ) {
			angle = ca.angles[i];
			this.heap.insert( angle.degree, angle );
		}

		this.heap.sort();
	},


	/**
	 * Check, if a vector is inside the hole or has left the boundary.
	 * @param  {THREE.Vector3} v     The vector to check.
	 * @param  {THREE.Vector3} fromA
	 * @param  {THREE.Vector3} fromB
	 * @return {boolean}             True, if still inside, false otherwise.
	 */
	isInHole: function( v, fromA, fromB ) {
		var callback = this.isInHoleCallback.bind( this ),
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
		this.neededWorkerResults = CONFIG.HF.FILLING.WORKER;

		if( lenFilling == 0 ) {
			Stopwatch.stop( "collision" );
			this.ruleCallback( false );
			return;
		}

		facesPerWorker = Math.ceil( lenFilling / CONFIG.HF.FILLING.WORKER );

		if( CONFIG.HF.FILLING.COLLISION_TEST == "all" ) {
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

		if( CONFIG.HF.FILLING.COLLISION_TEST == "all" ) {
			if( employedWorkerCounter < CONFIG.HF.FILLING.WORKER ) {
				this.workerResultCounter += CONFIG.HF.FILLING.WORKER - employedWorkerCounter;
			}

			data.type = "model";
			facesPerWorker = Math.ceil( lenModel / CONFIG.HF.FILLING.WORKER );

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
	},


	/**
	 * Callback function for the collision workers.
	 */
	isInHoleCallback: function( e ) {
		if( e.data.intersects ) {
			this.workerResult = true;
		}

		this.workerResultCounter++;

		if( this.workerResultCounter == this.neededWorkerResults ) {
			Stopwatch.stop( "collision" );
			this.ruleCallback( this.workerResult );
		}
	},


	/**
	 * Main loop.
	 */
	mainEventLoop: function() {
		this.loopCounter++;

		// for debugging
		if( this.STOP_AFTER !== false && this.loopCounter > this.STOP_AFTER ) {
			this.wrapUp();
			return;
		}

		// Close last hole
		if( this.front.vertices.length == 4 ) {
			this.closeHole4();
			this.wrapUp();
			return;
		}
		else if( this.front.vertices.length == 3 ) {
			this.closeHole3();
			this.wrapUp();
			return;
		}
		// Problematic/strange situations
		else if( this.front.vertices.length == 2 ) {
			console.warn( "front.vertices.length == 2" );
			this.wrapUp();
			return;
		}
		else if( this.front.vertices.length == 1 ) {
			console.warn( "front.vertices.length == 1" );
			this.wrapUp();
			return;
		}

		// Get next angle and apply rule
		if( this.heap.size() > 0 ) {
			this.angle = this.heap.removeFirst();
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
	},


	/**
	 * Receive the new vertex (if there is one), call the merging and
	 * go back into the main loop.
	 * @param {THREE.Vector3} vNew New vertex by a rule.
	 */
	mainEventLoopReceiveVertex: function( vNew ) {
		this.heap.sort();

		if( !vNew || this.front.vertices.length != 3 ) {
			// Compute the distances between each new created
			// vertex and see, if they can be merged.
			this.mergeByDistance( vNew, this.hole );
		}

		// Update progress bar
		if( this.loopCounter % 4 == 0 ) {
			UI.updateProgress( 100 - Math.round( this.front.vertices.length / this.hole.length * 100 ) );
		}

		this.mainEventLoop();
	},


	/**
	 * Merge vertices that are close together.
	 * @param {THREE.Vector3}        v      The new vertex, otheres may be merged into.
	 * @param {Array<THREE.Vector3>} ignore Vertices to ignore, that won't be merged.
	 */
	mergeByDistance: function( v, ignore ) {
		var vIndex = this.filling.vertices.indexOf( v ),
		    vIndexFront = this.front.vertices.indexOf( v );
		var t, tIndex;

		// No new vertex has been added, but
		// there may be some duplicate ones
		if( !v ) {
			return true;
		}

		if( vIndex < 0 ) {
			console.error( "mergeByDistance: Given vertex not part of filling!" );
			return false;
		}

		var vIndexBefore = vIndexFront - 1,
		    vIndexAfter = vIndexFront + 1;

		if( vIndexBefore < 0 ) {
			vIndexBefore = this.front.vertices.length - 1;
		}
		if( vIndexAfter > this.front.vertices.length - 1 ) {
			vIndexAfter = 0;
		}

		var compare = [
			this.front.vertices[vIndexBefore],
			this.front.vertices[vIndexAfter]
		];

		// Compare the new point to its direct neighbours
		for( var i = 0; i < compare.length; i++ ) {
			t = compare[i];

			// The original form of the hole shall not be changed
			if( ignore.indexOf( t ) >= 0 ) {
				continue;
			}

			// Merge points if distance below threshold
			if( v.distanceTo( t ) <= this.mergeThreshold ) {
				if( CONFIG.DEBUG.SHOW_MERGING ) {
					SceneManager.scene.add( SceneManager.createPoint( t, 0.02, 0xFFEE00, true ) );
					SceneManager.scene.add( SceneManager.createPoint( v, 0.012, 0xFFEE00, true ) );
					SceneManager.scene.add( SceneManager.createLine( t, v, 1, 0xFFEE00, true ) );
				}

				tIndex = this.filling.vertices.indexOf( t );
				vIndex = this.filling.vertices.indexOf( v );
				this.filling.vertices.splice( tIndex, 1 );

				this.updateFaces( tIndex, vIndex );
				this.mergeUpdateFront( t, v );
				this.heapMergeVertex( t, v );
			}
		}
	},


	/**
	 * Update the front according to the merged points.
	 * @param {THREE.Vector3}  vOld  The new vertex.
	 * @param {THREE.Vector3}  vNew  The merged-away vertex.
	 */
	mergeUpdateFront: function( vOld, vNew ) {
		var ixFrom = this.front.vertices.indexOf( vOld ),
		    ixTo = this.front.vertices.indexOf( vNew );

		if( ixFrom < 0 || ixTo < 0 ) {
			throw new Error( "Vertex not found in front." );
		}

		this.front.vertices.splice( ixFrom, 1 );
	},


	/**
	 * Update the faces of the filling, because the index of a vertex has been changed.
	 * @param  {int} oldIndex The old vertex index.
	 * @param  {int} newIndex The new vertex index.
	 */
	updateFaces: function( oldIndex, newIndex ) {
		var face;

		for( var i = this.filling.faces.length - 1; i >= 0; i-- ) {
			face = this.filling.faces[i];

			// Replace all instances of the merged-away vertex
			if( face.a == oldIndex ) {
				face.a = newIndex;
			}
			if( face.b == oldIndex ) {
				face.b = newIndex;
			}
			if( face.c == oldIndex ) {
				face.c = newIndex;
			}

			// By removing a vertex all (greater) face indexes have to be updated.
			// May also remove faces, if necessary.
			this.filling.faces = Utils.decreaseHigherFaceIndexes( this.filling.faces, i, oldIndex );
		}
	},


	/**
	 * Advancing front has been completed.
	 * Print stats and return the filling as result to the callback.
	 */
	wrapUp: function() {
		console.log(
			"Finished after " + ( this.loopCounter - 1 ) + " iterations.\n",
			"- New vertices: " + this.filling.vertices.length + "\n",
			"- New faces: " + this.filling.faces.length
		);
		Stopwatch.average( "collision", true );

		WorkerManager.closePool( "collision" );

		SceneManager.showFilling( this.front, this.filling, this.holeIndex );
		this.resultCallback( this.filling, this.holeIndex );
	}

};
