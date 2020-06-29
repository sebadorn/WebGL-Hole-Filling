'use strict';


/**
 * Class for the Advancing Front hole filling algorithm.
 * @namespace WebHF.AdvancingFront
 */
WebHF.AdvancingFront = {


	callback: null,
	collisionTestMode: CONFIG.FILLING.COLLISION_TEST,
	heap: null,
	hole: null,
	holeIndex: null,
	loopCounter: null,
	mergeThreshold: null,
	modelGeo: null,

	STOP_AFTER: CONFIG.DEBUG.AF_STOP_AFTER_ITER,


	/**
	 * Close the last hole of only 3 vertices.
	 * @param  {THREE.Geometry} front   - Current hole front.
	 * @param  {THREE.Geometry} filling - Current hole filling.
	 * @return {THREE.Geometry} Completed hole filling.
	 */
	closeHole3( front, filling ) {
		filling.faces.push( new THREE.Face3(
			filling.vertices.indexOf( front.vertices[1] ),
			filling.vertices.indexOf( front.vertices[0] ),
			filling.vertices.indexOf( front.vertices[2] )
		) );

		return filling;
	},


	/**
	 * Close the last hole of only 4 vertices.
	 * @param  {THREE.Geometry} front   - Current hole front.
	 * @param  {THREE.Geometry} filling - Current hole filling.
	 * @return {THREE.Geometry} Completed hole filling.
	 */
	closeHole4( front, filling ) {
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
	 * @param  {THREE.Geometry} front - The model with the vertices.
	 * @return {object} The angles and the smallest one together with the index of the vertex.
	 */
	computeAngles( front ) {
		const angles = [];
		const smallest = {
			angle: 361.0,
			index: -1
	    };

		for( let i = 0, len = front.length; i < len; i++ ) {
			const vp = front[( i == 0 ) ? len - 1 : i - 1];
			const v = front[i];
			const vn = front[( i + 1 ) % len];

			const prev = ( i == 0 ) ? null : angles[angles.length - 1];

			const angle = new WebHF.Angle( [vp, v, vn] );
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
	 * Get the next angle to handle.
	 * @return {WebHF.Angle} The next angle.
	 */
	getNextAngle() {
		let angle = this.heap.removeFirst();
		let count = 0;

		while( angle.waitForUpdate ) {
			this.heap.insert( angle.degree, angle );
			angle = this.heap.removeFirst();

			if( ++count >= this.heap.size() ) {
				throw new Error( "No more angles available, that don't need an update." );
			}
		}

		return angle;
	},


	/**
	 * Angle heaps have to be updated if vertices of the front are being merged.
	 * @param  {THREE.Vector3} vOld - The old vertex.
	 * @param  {THREE.Vector3} vNew - The new vertex.
	 * @return {boolean} True, if an angle has been updated, false otherwise.
	 */
	heapMergeVertex( vOld, vNew ) {
		for( const key in this.heap.values ) {
			const angles = this.heap.values[key];

			for( let j = 0; j < angles.length; j++ ) {
				const angle = angles[j];

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
							"Situation that shouldn't be possible. " +
							'Neither previous nor next angle contain the new vertex.'
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
	 * @param {THREE.Geometry} front - The current front (outline of the hole).
	 */
	initHeap( front ) {
		const ca = this.computeAngles( front.vertices );

		this.heap = new WebHF.Heap( "all" );

		// Initialize heaps
		for( let i = 0, len = ca.angles.length; i < len; i++ ) {
			const angle = ca.angles[i];
			this.heap.insert( angle.degree, angle );
		}

		this.heap.sort();
	},


	/**
	 * Merge vertices that are close together.
	 * @param {THREE.Geometry}  front   - The current hole front.
	 * @param {THREE.Geometry}  filling - The current hole filling.
	 * @param {THREE.Vector3}   v       - The new vertex, otheres may be merged into.
	 * @param {THREE.Vector3[]} ignore  - Vertices to ignore, that won't be merged.
	 */
	mergeByDistance( front, filling, v, ignore ) {
		// No new vertex has been added, but
		// there may be some duplicate ones
		if( !v ) {
			return true;
		}

		let vIndex = filling.vertices.indexOf( v );

		if( vIndex < 0 ) {
			console.error( 'mergeByDistance: Given vertex not part of filling!' );
			return false;
		}

		const vIndexFront = front.vertices.indexOf( v );

		let vIndexBefore = vIndexFront - 1;
		let vIndexAfter = vIndexFront + 1;

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
		for( let i = 0; i < compare.length; i++ ) {
			const t = compare[i];

			// The original form of the hole shall not be changed
			if( ignore.indexOf( t ) >= 0 ) {
				continue;
			}

			// Merge points if distance below threshold
			if( v.distanceTo( t ) <= this.mergeThreshold ) {
				if( CONFIG.DEBUG.SHOW_MERGING ) {
					WebHF.SceneManager.scene.add( WebHF.SceneManager.createPoint( t, 0.02, 0xFFEE00, true ) );
					WebHF.SceneManager.scene.add( WebHF.SceneManager.createPoint( v, 0.012, 0xFFEE00, true ) );
					WebHF.SceneManager.scene.add( WebHF.SceneManager.createLine( t, v, 1, 0xFFEE00, true ) );
				}

				const tIndex = filling.vertices.indexOf( t );

				vIndex = filling.vertices.indexOf( v );
				filling.vertices.splice( tIndex, 1 );

				this.updateFaces( filling, tIndex, vIndex );
				this.mergeUpdateFront( front, t, v );
				this.heapMergeVertex( t, v );
			}
		}
	},


	/**
	 * Update the front according to the merged points.
	 * @param {THREE.Geometry} front - The current hole front.
	 * @param {THREE.Vector3}  vOld  - The new vertex.
	 * @param {THREE.Vector3}  vNew  - The merged-away vertex.
	 */
	mergeUpdateFront( front, vOld, vNew ) {
		const ixFrom = front.vertices.indexOf( vOld );
		const ixTo = front.vertices.indexOf( vNew );

		if( ixFrom < 0 || ixTo < 0 ) {
			throw new Error( "Vertex not found in front." );
		}

		front.vertices.splice( ixFrom, 1 );
	},


	// rule1Calc: There isn't anything to calculate.


	/**
	 * Calculate a new vertex for rule 2.
	 * @param  {THREE.Vector3} vp - Previous vector.
	 * @param  {THREE.Vector3} v  - Current vector.
	 * @param  {THREE.Vector3} vn - Next vector.
	 * @return {THREE.Vector3} New vector.
	 */
	rule2Calc( vp, v, vn ) {
		// To make things easier, we just move the whole thing into the origin
		// and when we have the new point, we move it back.
		const vpClone = vp.clone().sub( v );
		const vnClone = vn.clone().sub( v );
		const origin = new THREE.Vector3();

		// Create the plane of the vectors vp and vn
		// with position vector v.
		const plane = new WebHF.Plane( origin, vpClone, vnClone );

		// Get a vector on that plane, that lies on half the angle between vp and vn.
		const vNew = plane.getPoint( 1, 1 );

		// Compute the average length of vp and vn.
		// Then adjust the position of the new vector, so it has this average length.
		const avLen = WebHF.Utils.getAverageLength( [vpClone, vnClone] );
		vNew.setLength( avLen );
		vNew.add( v );

		return vNew;
	},


	/**
	 * Calculate a new vertex for rule 3.
	 * @param  {THREE.Vector3} vp    - Previous vector.
	 * @param  {THREE.Vector3} v     - Current vector.
	 * @param  {THREE.Vector3} vn    - Next vector.
	 * @param  {WebHF.Angle}   angle - Angle created by these vectors.
	 * @return {THREE.Vector3} New vector.
	 */
	rule3Calc( vp, v, vn, angle ) {
		const vnClone = vn.clone().sub( v );
		const vpClone = vp.clone().sub( v );

		// Cross vector pointing inside the hole ( well, it should, probably not always the case).
		const c = vnClone.clone().cross( vpClone ).normalize();

		// Cross vector lying (more-or-less) on the imagined plane of the hole. More-or-less.
		const c2 = c.clone().cross( vnClone ).normalize().add( v );

		// Now it's similar to rule 2.
		const plane = new WebHF.Plane( new THREE.Vector3(), vnClone, c2.clone().sub( v ) );

		let vNew = plane.getPoint( 1, 1 );
		vNew.setLength( vnClone.length() );
		vNew.add( v );
		vNew = WebHF.Utils.keepNearPlane( vNew, [vp, v, vn], this.mergeThreshold);

		return vNew;
	},


	/**
	 * Set the mode for the collision test.
	 * @see UI.registerCollisionTestOptions()
	 * @param {string} mode - "filling" or "all".
	 */
	setCollisionTest( mode ) {
		this.collisionTestMode = mode;
	},


	/**
	 * Update the faces of the filling, because the index of a vertex has been changed.
	 * @param  {THREE.Geometry} filling  - The current state of the filling.
	 * @param  {number}         oldIndex - The old vertex index.
	 * @param  {number}         newIndex - The new vertex index.
	 */
	updateFaces( filling, oldIndex, newIndex ) {
		for( let i = filling.faces.length - 1; i >= 0; i-- ) {
			const face = filling.faces[i];

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
			filling.faces = WebHF.Utils.decreaseHigherFaceIndexes( filling.faces, i, oldIndex );
		}
	},


	/**
	 * Advancing front has been completed.
	 * Print stats and return the filling as result to the callback.
	 * @param {THREE.Geometry} front   - Front of the hole.
	 * @param {THREE.Geometry} filling - Filling of the hole.
	 */
	wrapUp( front, filling ) {
		console.log(
			'Finished after ' + ( this.loopCounter - 1 ) + ' iterations.\n',
			'- New vertices: ' + filling.vertices.length + '\n',
			'- New faces: ' + filling.faces.length
		);

		WebHF.Stopwatch.average( 'collision', true );
		WebHF.Stopwatch.remove( 'collision' );

		if( this.mode === 'parallel' ) {
			WebHF.WorkerManager.closePool( 'collision' );
		}

		WebHF.SceneManager.showFilling( front, filling, this.holeIndex );
		this.callback( filling, this.holeIndex );
	}


};
