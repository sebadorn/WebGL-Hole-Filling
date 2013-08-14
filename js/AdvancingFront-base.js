"use strict";


/**
 * Class for the Advancing Front hole filling algorithm.
 * @type {Object}
 */
var AdvancingFront = {

	callback: null,
	heap: null,
	hole: null,
	holeIndex: null,
	loopCounter: null,
	mergeThreshold: null,
	modelGeo: null,

	STOP_AFTER: CONFIG.DEBUG.AF_STOP_AFTER_ITER,


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
	}

};
