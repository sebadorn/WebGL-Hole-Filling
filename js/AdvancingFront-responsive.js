"use strict";


/**
 * Class for hole finding and filling algorithms.
 * @type {Object}
 */
var AdvancingFront = {

	heap: null,
	holeIndex: -1,
	mergeThreshold: null,
	modelGeo: null,

	STOP_AFTER: CONFIG.DEBUG.AFM_STOP_AFTER_ITER,


	/**
	 * Fill the hole using the advancing front algorithm.
	 * @param  {THREE.Geometry}    modelGeo       The model to fill the holes in.
	 * @param  {Array<THREE.Line>} hole           The hole described by lines.
	 * @param  {float}             mergeThreshold Threshold for merging.
	 * @return {THREE.Geometry}                   The generated filling.
	 */
	afmStart: function( modelGeo, hole, mergeThreshold, callback ) {
		this.filling = new THREE.Geometry(),
		this.front = new THREE.Geometry();

		this.front.vertices = hole.slice( 0 );
		this.filling.vertices = hole.slice( 0 );

		this.front.mergeVertices();
		this.filling.mergeVertices();

		this.callback = callback;
		this.hole = hole;
		this.holeIndex = SceneManager.holes.indexOf( hole );
		this.mergeThreshold = mergeThreshold;
		this.modelGeo = modelGeo;

		this.initHeap( this.front );

		var angle, ruleFunc, vNew;

		this.loopCounter = 0;
		this.mainLoop();
	},


	/**
	 * Apply rule 1 of the advancing front mesh algorithm.
	 * Rule 1: Close gaps of angles <= 75°.
	 * @param {THREE.Geometry} front   The current border of the hole.
	 * @param {THREE.Geometry} filling The currently filled part of the original hole.
	 * @param {THREE.Vector3}  vp      Previous vector.
	 * @param {THREE.Vector3}  v       Current vector.
	 * @param {THREE.Vector3}  vn      Next vector.
	 */
	afRule1: function( front, filling, vp, v, vn ) {
		var vIndex = filling.vertices.indexOf( v ),
		    vnIndex = filling.vertices.indexOf( vn ),
		    vpIndex = filling.vertices.indexOf( vp );

		if( !this.isInHole( front, filling, vp, vn ) ) {
			return false;
		}

		filling.faces.push( new THREE.Face3( vIndex, vpIndex, vnIndex ) );

		// The vector v is not a part of the (moving) hole front anymore.
		front.vertices.splice( front.vertices.indexOf( v ), 1 );

		return true;
	},


	/**
	 * Apply rule 2 of the advancing front mesh algorithm.
	 * Rule 2: Create one new vertex if the angle is > 75° and <= 135°.
	 * @param {THREE.Geometry} front   The current border of the hole.
	 * @param {THREE.Geometry} filling The currently filled part of the original hole.
	 * @param {THREE.Vector3}  vp      Previous vector.
	 * @param {THREE.Vector3}  v       Current vector.
	 * @param {THREE.Vector3}  vn      Next vector.
	 */
	afRule2: function( front, filling, vp, v, vn ) {
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


		if( !this.isInHole( front, filling, vNew, vp, vn ) ) {
			// Second chance: Reduce length
			vNew.sub( v );
			vNew.setLength( avLen / 2 );
			vNew.add( v );

			if( !this.isInHole( front, filling, vNew, vp, vn ) ) {
				return false;
			}
		}


		// New vertex
		filling.vertices.push( vNew );

		// New faces for 2 new triangles
		var len = filling.vertices.length;
		var vpIndex = filling.vertices.indexOf( vp ),
		    vIndex = filling.vertices.indexOf( v ),
		    vnIndex = filling.vertices.indexOf( vn );

		filling.faces.push( new THREE.Face3( vIndex, vpIndex, len - 1 ) );
		filling.faces.push( new THREE.Face3( vIndex, len - 1, vnIndex ) );


		// Update front
		var ix = front.vertices.indexOf( v );
		front.vertices[ix] = vNew;

		return vNew;
	},


	/**
	 * Apply rule 3 of the advancing front mesh algorithm.
	 * Rule 3: Create a new vertex if the angle is > 135°.
	 * @param {THREE.Geometry} front   The current border of the hole.
	 * @param {THREE.Geometry} filling The currently filled part of the original hole.
	 * @param {THREE.Vector3}  vp      Previous vector.
	 * @param {THREE.Vector3}  v       Current vector.
	 * @param {THREE.Vector3}  vn      Next vector.
	 * @param {float}          angle   Angle created by these vectors.
	 */
	afRule3: function( front, filling, vp, v, vn, angle ) {
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

		if( !this.isInHole( front, filling, vNew, vp, vn ) ) {
			// Second chance: Reduce length
			vNew = vOnPlane.clone();
			vNew.setLength( vNew.length() / 2 );
			vNew.add( v ).add( halfWay );
			vNew = Utils.keepNearPlane( v, vn, vNew );

			if( !this.isInHole( front, filling, vNew, vp, vn ) ) {
				return false;
			}
		}


		// New vertex
		filling.vertices.push( vNew );

		// New face for the new triangle
		var len = filling.vertices.length;
		var vnIndex = filling.vertices.indexOf( vn ),
		    vIndex = filling.vertices.indexOf( v );

		filling.faces.push( new THREE.Face3( vnIndex, vIndex, len - 1 ) );

		// Update front
		var ix = front.vertices.indexOf( v );
		front.vertices.splice( ix + 1, 0, vNew );

		return vNew;
	},


	/**
	 * Apply AF rule 1 and organise heaps/angles.
	 * @param  {THREE.Geometry} front   Current front of hole.
	 * @param  {THREE.Geometry} filling Current filling of hole.
	 * @return {boolean}                Rule 1 doesn't create a new vertex, so it will always return false.
	 */
	applyRule1: function( front, filling, angle ) {
		var vNew = this.afRule1(
			front, filling,
			angle.vertices[0], angle.vertices[1], angle.vertices[2]
		);

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

		return false;
	},


	/**
	 * Apply AF rule 2 and organise heaps/angles.
	 * @param  {THREE.Geometry} front   Current front of hole.
	 * @param  {THREE.Geometry} filling Current filling of hole.
	 * @return {THREE.Vector3}          New vertex.
	 */
	applyRule2: function( front, filling, angle ) {
		var vNew = this.afRule2(
			front, filling,
			angle.vertices[0], angle.vertices[1], angle.vertices[2]
		);

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

		return vNew;
	},


	/**
	 * Apply AF rule 3 and organise heaps/angles.
	 * @param  {THREE.Geometry} front   Current front of hole.
	 * @param  {THREE.Geometry} filling Current filling of hole.
	 * @return {THREE.Vector3}          New vertex.
	 */
	applyRule3: function( front, filling, angle ) {
		var vNew = this.afRule3(
			front, filling,
			angle.vertices[0], angle.vertices[1], angle.vertices[2],
			angle.degree
		);

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

		return vNew;
	},


	/**
	 * Close the last hole of only 3 vertices.
	 * @param  {THREE.Geometry} front   Current hole front.
	 * @param  {THREE.Geometry} filling Current hole filling.
	 * @return {THREE.Geometry}         Completed hole filling.
	 */
	closeHole3: function( front, filling ) {
		filling.faces.push( new THREE.Face3(
			filling.vertices.indexOf( front.vertices[1] ),
			filling.vertices.indexOf( front.vertices[0] ),
			filling.vertices.indexOf( front.vertices[2] )
		) );

		return filling;
	},


	/**
	 * Close the last hole of only 4 vertices.
	 * @param  {THREE.Geometry} front   Current hole front.
	 * @param  {THREE.Geometry} filling Current hole filling.
	 * @return {THREE.Geometry}         Completed hole filling.
	 */
	closeHole4: function( front, filling ) {
		filling.faces.push( new THREE.Face3(
			filling.vertices.indexOf( front.vertices[3] ),
			filling.vertices.indexOf( front.vertices[2] ),
			filling.vertices.indexOf( front.vertices[0] )
		) );
		filling.faces.push( new THREE.Face3(
			filling.vertices.indexOf( front.vertices[1] ),
			filling.vertices.indexOf( front.vertices[0] ),
			filling.vertices.indexOf( front.vertices[2] )
		) );

		return filling;
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
			return this.applyRule1.bind( this );
		}
		else if( degree <= 135.0 ) {
			return this.applyRule2.bind( this );
		}
		else if( degree < 180.0 ) {
			return this.applyRule3.bind( this );
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
	 * @param  {Array}         front The current front of the hole.
	 * @param  {THREE.Vector3} v     The vector to check.
	 * @param  {THREE.Vector3} fromA
	 * @param  {THREE.Vector3} fromB
	 * @return {boolean}             True, if still inside, false otherwise.
	 */
	isInHole: function( front, filling, v, fromA, fromB ) {
		var a, b, c, face;

		Stopwatch.start( "collision" );

		for( var i = 0, len = filling.faces.length; i < len; i++ ) {
			face = filling.faces[i];

			a = filling.vertices[face.a];
			b = filling.vertices[face.b];
			c = filling.vertices[face.c];

			if( a == v || b == v || c == v ) {
				continue;
			}
			if( a == fromA || b == fromA || c == fromA ) {
				continue;
			}
			if( fromB ) {
				if( a == fromB || b == fromB || c == fromB ) {
					continue;
				}
			}

			if( Utils.checkIntersectionOfTriangles3D( a, b, c, v, fromA, fromB ) ) {
				Stopwatch.stop( "collision" );
				return false;
			}
		}

		if( CONFIG.HF.FILLING.COLLISION_TEST == "all" ) {
			for( var i = 0, len = this.modelGeo.faces.length; i < len; i++ ) {
				face = this.modelGeo.faces[i];

				a = this.modelGeo.vertices[face.a];
				b = this.modelGeo.vertices[face.b];
				c = this.modelGeo.vertices[face.c];

				if( a == v || b == v || c == v ) {
					continue;
				}
				if( a == fromA || b == fromA || c == fromA ) {
					continue;
				}
				if( fromB ) {
					if( a == fromB || b == fromB || c == fromB ) {
						continue;
					}
				}

				if( Utils.checkIntersectionOfTriangles3D( a, b, c, v, fromA, fromB ) ) {
					Stopwatch.stop( "collision" );
					return false;
				}
			}
		}

		Stopwatch.stop( "collision" );

		return true;
	},


	/**
	 * Merge vertices that are close together.
	 * @param {THREE.Geometry}       front   The current hole front.
	 * @param {THREE.Geometry}       filling The current hole filling.
	 * @param {THREE.Vector3}        v       The new vertex, otheres may be merged into.
	 * @param {Array<THREE.Vector3>} ignore  Vertices to ignore, that won't be merged.
	 */
	mergeByDistance: function( front, filling, v, ignore ) {
		var vIndex = filling.vertices.indexOf( v ),
		    vIndexFront = front.vertices.indexOf( v );
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
			vIndexBefore = front.vertices.length - 1;
		}
		if( vIndexAfter > front.vertices.length - 1 ) {
			vIndexAfter = 0;
		}

		var compare = [
			front.vertices[vIndexBefore],
			front.vertices[vIndexAfter]
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

				tIndex = filling.vertices.indexOf( t );
				vIndex = filling.vertices.indexOf( v );
				filling.vertices.splice( tIndex, 1 );

				this.updateFaces( filling, tIndex, vIndex );
				this.mergeUpdateFront( front, t, v );
				this.heapMergeVertex( t, v );
			}
		}
	},


	/**
	 * Main loop
	 */
	mainLoop: function() {
		var vNew = false;
		var angle, ruleFunc;

		this.loopCounter++;

		// for debugging
		if( this.STOP_AFTER !== false && this.loopCounter > this.STOP_AFTER ) {
			this.wrapUp();
			return;
		}

		// Close last hole
		if( this.front.vertices.length == 4 ) {
			this.filling = this.closeHole4( this.front, this.filling );
			this.wrapUp();
			return;
		}
		else if( this.front.vertices.length == 3 ) {
			this.filling = this.closeHole3( this.front, this.filling );
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
			angle = this.heap.removeFirst();
			ruleFunc = this.getRuleFunctionForAngle( angle.degree );

			if( ruleFunc == false ) {
				SceneManager.showFilling( this.front, this.filling );
				throw new Error( "No rule could be applied. Stopping before entering endless loop." );
			}

			vNew = ruleFunc( this.front, this.filling, angle );

			this.heap.sort();
		}
		else {
			SceneManager.showFilling( this.front, this.filling );
			throw new Error( "Hole has not been filled yet, but heap is empty." );
		}

		if( !vNew || this.front.vertices.length != 3 ) {
			// Compute the distances between each new created
			// vertex and see, if they can be merged.
			this.mergeByDistance( this.front, this.filling, vNew, this.hole );
		}

		// Update progress bar
		UI.updateProgress( 100 - Math.round( this.front.vertices.length / this.hole.length * 100 ) );

		// Keep on looping
		setTimeout( function() { this.mainLoop(); }.bind( this ), 0 );
	},


	/**
	 * Update the front according to the merged points.
	 * @param {THREE.Geometry} front The current hole front.
	 * @param {THREE.Vector3}  vOld  The new vertex.
	 * @param {THREE.Vector3}  vNew  The merged-away vertex.
	 */
	mergeUpdateFront: function( front, vOld, vNew ) {
		var ixFrom = front.vertices.indexOf( vOld ),
		    ixTo = front.vertices.indexOf( vNew );

		if( ixFrom < 0 || ixTo < 0 ) {
			throw new Error( "Vertex not found in front." );
		}

		front.vertices.splice( ixFrom, 1 );
	},


	/**
	 * Update the faces of the filling, because the index of a vertex has been changed.
	 * @param  {THREE.Geometry} filling  The current state of the filling.
	 * @param  {int}            oldIndex The old vertex index.
	 * @param  {int}            newIndex The new vertex index.
	 */
	updateFaces: function( filling, oldIndex, newIndex ) {
		var face;

		for( var i = filling.faces.length - 1; i >= 0; i-- ) {
			face = filling.faces[i];

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
			filling.faces = Utils.decreaseHigherFaceIndexes( filling.faces, i, oldIndex );
		}
	},


	/**
	 * Wrapping up the action: Console printing and result returning.
	 */
	wrapUp: function() {
		console.log(
			"Finished after " + ( this.loopCounter - 1 ) + " iterations.\n",
			"- New vertices: " + this.filling.vertices.length + "\n",
			"- New faces: " + this.filling.faces.length
		);
		Stopwatch.average( "collision", true );

		SceneManager.showFilling( this.front, this.filling, this.holeIndex );

		this.callback( this.filling, this.holeIndex );
	}

};
