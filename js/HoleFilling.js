"use strict";


/**
 * Class for finding the hole front.
 * @type {Object}
 */
var HoleFilling = {

	/**
	 * Find the border edges of a hole inside a half-edge structure.
	 * @param  {THREE.Mesh} model  The model to find holes in.
	 * @return {Object}            Arrays of lines and points, depending on configuration.
	 */
	findBorderEdges: function( model ) {
		var colors = CONFIG.HF.BORDER.COLOR,
		    holes = [],
		    ignore = [],
		    lines = [],
		    points = [],
		    pos = new THREE.Vector3();
		var geometry, line, material, mesh, v, vertex;

		mesh = new HalfEdgeMesh( model.geometry );

		for( var i = 0; i < mesh.vertices.length; i++ ) {
			vertex = mesh.vertices[i];

			if( ignore.indexOf( vertex.index ) < 0 && vertex.isBorderPoint() ) {
				// New hole, add first vertex
				holes.push( [model.geometry.vertices[vertex.index]] );

				// Find connected border points
				geometry = this.getNeighbouringBorderPoints( model, ignore, vertex );

				for( var j = 0; j < geometry.vertices.length; j++ ) {
					v = geometry.vertices[j];
					holes[holes.length - 1].push( v );
				}

				// Lines
				material = new THREE.LineBasicMaterial( {
					color: colors[lines.length % colors.length],
					linewidth: CONFIG.HF.BORDER.LINE_WIDTH
				} );

				line = new THREE.Line( geometry, material );
				line.position = model.position;
				lines.push( line );

				// Points
				if( CONFIG.HF.BORDER.SHOW_POINTS ) {
					for( var j = 0; j < geometry.vertices.length; j++ ) {
						v = geometry.vertices[j];
						points.push( Scene.createPoint( v, 0.02, 0xA1DA42, true ) );
					}
				}
			}
		}

		GLOBAL.HALFEDGE = mesh;

		return {
			holes: holes,
			lines: lines,
			points: points
		};
	},


	/**
	 * Get all the connected border points starting from one of the border points.
	 * Returns one hole in the mesh, if there is at least one.
	 * @param  {THREE.Mesh}     model  The model to search holes in.
	 * @param  {Array<int>}     ignore Vertices that have already been searched and can be ignored now.
	 * @param  {Vertex}         start  Starting vertex.
	 * @return {THREE.Geometry}        Geometry of a hole.
	 */
	getNeighbouringBorderPoints: function( model, ignore, start ) {
		var geometry = new THREE.Geometry(),
		    bpStart = start,
		    bp = bpStart;
		var v;

		while( true ) {
			if( ignore.indexOf( bp.index ) < 0 && bp.isBorderPoint() ) {
				v = model.geometry.vertices[bp.index];
				geometry.vertices.push( v );
				ignore.push( bp.index );

				if( bp.firstEdge == null ) {
					break;
				}
				bp = bp.firstEdge.vertex;
			}
			else {
				geometry.vertices.push( model.geometry.vertices[bpStart.index] );
				break;
			}
		}

		return geometry;
	}

};



/**
 * Class for hole finding and filling algorithms.
 * @type {Object}
 */
var AdvancingFront = {

	HOLE_INDEX: -1,
	LAST_ITERATION: false, // for debugging

	HEAP_ANGLES: {
		rule1: [],
		rule2: [],
		rule3: []
	},
	HEAP_RULES: {
		rule1: {},
		rule2: {},
		rule3: {}
	},


	/**
	 * Fill the hole using the advancing front algorithm.
	 * @param  {THREE.Mesh}        model The model to fill the holes in.
	 * @param  {Array<THREE.Line>} hole  The hole described by lines.
	 * @return {THREE.Geometry}          The generated filling.
	 */
	afmStart: function( model, hole ) {
		var filling = new THREE.Geometry(),
		    front = new THREE.Geometry();

		this.HOLE_INDEX = GLOBAL.HOLES.indexOf( hole );

		front.vertices = hole.slice( 0 );
		filling.vertices = hole.slice( 0 );
		front.mergeVertices();
		filling.mergeVertices();

		var ca = this.computeAngles( front.vertices );
		var angle, len, v, vectors, vn, vNew, vp;

		var applied = 0,
		    appliedBefore = 0,
		    applyRule = 1,
		    count = 0,
		    ignoredAngles = 0,
		    loopCounter = 0;
		var stopIter = CONFIG.DEBUG.AFM_STOP_AFTER_ITER; // for debugging

		var degree, prev, newAngle, next;

		// Initialize heaps
		for( var i = 0; i < ca.angles.length; i++ ) {
			angle = ca.angles[i];

			if( angle.degree <= 75.0 ) {
				this.HEAP_ANGLES.rule1.push( angle.degree );
				this.HEAP_RULES.rule1[angle.degree] = angle;
			}
			else if( angle.degree <= 135.0 ) {
				this.HEAP_ANGLES.rule2.push( angle.degree );
				this.HEAP_RULES.rule2[angle.degree] = angle;
			}
			else if( angle.degree < 180.0 ) {
				this.HEAP_ANGLES.rule3.push( angle.degree );
				this.HEAP_RULES.rule3[angle.degree] = angle;
			}
		}

		this.HEAP_ANGLES.rule1.sort();
		this.HEAP_ANGLES.rule2.sort();
		this.HEAP_ANGLES.rule3.sort();


		while( true ) {
			len = front.vertices.length;
			count++;

			// for debugging
			if( stopIter !== false && ++count > stopIter ) {
				break;
			}
			if( stopIter !== false && count == stopIter - 1 ) {
				this.LAST_ITERATION = true;
			}

			// Close last hole
			if( len == 3 ) {
				filling.faces.push( new THREE.Face3(
					filling.vertices.indexOf( front.vertices[1] ),
					filling.vertices.indexOf( front.vertices[0] ),
					filling.vertices.indexOf( front.vertices[2] )
				) );
				break;
			}

			vNew = false;

			if( this.HEAP_ANGLES.rule1.length > 0 ) {
				degree = this.HEAP_ANGLES.rule1.splice( 0, 1 );
				angle = this.HEAP_RULES.rule1[degree];

				this.afRule1(
					front, filling, angle.vertices[0], angle.vertices[1], angle.vertices[2]
				);

				prev = angle.previous;
				angle.previous.setVertices( [prev.vertices[0], prev.vertices[1], angle.vertices[2]] );
				angle.previous.next = angle.next;
				this.heapRemove( prev );
				this.heapInsert( prev );

				next = angle.next;
				angle.next.setVertices( [angle.vertices[0], next.vertices[1], next.vertices[2]] );
				angle.next.previous = angle.previous;
				this.heapRemove( next );
				this.heapInsert( next );

				delete this.HEAP_RULES.rule1[degree];
			}
			else if( this.HEAP_ANGLES.rule2.length > 0 ) {
				degree = this.HEAP_ANGLES.rule2.splice( 0, 1 );
				angle = this.HEAP_RULES.rule2[degree];

				vNew = this.afRule2(
					front, filling, angle.vertices[0], angle.vertices[1], angle.vertices[2]
				);

				if( vNew ) {
					angle.setVertices( [angle.vertices[0], vNew, angle.vertices[2]] );
					this.heapRemove( angle );
					this.heapInsert( angle );

					prev = angle.previous;
					angle.previous.setVertices( [prev.vertices[0], prev.vertices[1], vNew] );
					this.heapRemove( prev );
					this.heapInsert( prev );

					next = angle.next;
					angle.next.setVertices( [vNew, next.vertices[1], next.vertices[2]] );
					this.heapRemove( next );
					this.heapInsert( next );

					var found = false;
					for( var i = 0; i < filling.vertices.length; i++ ) {
						if( filling.vertices[i].equals( vNew ) ) {
							found = true;
							break;
						}
					}
					if( !found ) {
						console.log( "It's gone!", vNew );
						console.log( filling.vertices[filling.vertices.length - 1] );
					}
				}
			}
			else if( this.HEAP_ANGLES.rule3.length > 0 ) {
				degree = this.HEAP_ANGLES.rule3.splice( 0, 1 );
				angle = this.HEAP_RULES.rule3[degree];

				vNew = this.afRule3(
					front, filling, angle.vertices[0], angle.vertices[1], angle.vertices[2], degree
				);

				if( vNew ) {
					newAngle = new Angle( [angle.vertices[1], vNew, angle.vertices[2]] );
					newAngle.previous = angle;
					newAngle.next = angle.next;
					this.heapInsert( newAngle );

					next = angle.next;
					angle.next.setVertices( [vNew, next.vertices[1], next.vertices[2]] );
					angle.next.previous = newAngle;
					this.heapRemove( next );
					this.heapInsert( next );

					angle.setVertices( [angle.vertices[0], angle.vertices[1], vNew] );
					angle.next = newAngle;
					this.heapRemove( angle );
					this.heapInsert( angle );

					var found = false;
					for( var i = 0; i < front.vertices.length; i++ ) {
						if( front.vertices[i].equals( vNew ) ) {
							found = true;
							break;
						}
					}
					if( !found ) {
						console.log( "It's gone!" );
					}
				}
			}
			else {
				ignoredAngles++;
				continue;
			}

			// Compute the distances between each new created
			// vertex and see, if they can be merged.
			this.mergeByDistance( front, filling, vNew, hole );
		}


		console.log(
			"Finished after " + count + " iterations.\n",
			"- New vertices: " + filling.vertices.length + "\n",
			"- New faces: " + filling.faces.length
		);
		if( ignoredAngles > 0 ) {
			console.warn( "Ignored " + ignoredAngles + " angles, because they were >= 180°." );
		}

		this.showFilling( front, filling );
		UI.checkHoleFinished( this.HOLE_INDEX );

		return filling;
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

		// if( !this.isInHole( front, filling, vp.clone(), vn.clone(), vn.clone(), null ) ) {
		// 	return false;
		// }

		filling.faces.push( new THREE.Face3( vIndex, vpIndex, vnIndex ) );

		// The vector v is not a part of the (moving) hole front anymore.
		front.vertices.splice( front.vertices.indexOf( v ), 1 );

		return false;
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


		if( !this.isInHole( front, filling, vNew.clone(), vp.clone(), vn.clone() ) ) {
			return false;
		}


		// New vertex
		filling.vertices.push( vNew );

		// New faces for 2 new triangles
		var len = filling.vertices.length;
		var vpIndex = filling.vertices.indexOf( vp ),
		    vIndex = filling.vertices.indexOf( v ),
		    vnIndex = filling.vertices.indexOf( vn );

	if( vnIndex == -1 ) {
		console.log( "rule2 vnIndex", vn );
		GLOBAL.SCENE.add( Scene.createPoint( vn, 0.04, 0xFF0000, true ) );
	}
	if( vpIndex == -1 ) {
		console.log( "rule2 vpIndex", vp );
	}
	if( vIndex == -1 ) {
		console.log( "rule2 vIndex", v );
	}

		filling.faces.push( new THREE.Face3( vIndex, vpIndex, len - 1 ) );
		filling.faces.push( new THREE.Face3( vIndex, len - 1, vnIndex ) );


		// Update front
		var ix = front.vertices.indexOf( v );
	if( ix == -1 ) {
		console.log( "fuck" );
	}
		front.vertices[ix] = vNew;

		return vNew;
	},


	/**
	 * Apply rule 3 of the advancing front mesh algorithm.
	 * Rule 3: Create two new vertices if the angle is > 135°.
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
		var vNew = plane.getPoint( 0, vnClone.length() );

		vNew.add( v ).add( halfWay );
		vNew = this.keepNearPlane( v, vn, vNew );

		// if( !this.isInHole( front, filling, vNew.clone(), vp.clone(), vn.clone() ) ) {
		// 	return false;
		// }


		// New vertex
		filling.vertices.push( vNew );

		// New face for the new triangle
		var len = filling.vertices.length;
		var vnIndex = filling.vertices.indexOf( vn ),
		    vIndex = filling.vertices.indexOf( v );

	if( vnIndex == -1 ) {
		console.log( "rule3 vnIndex", vn );
	}
	if( vIndex == -1 ) {
		console.log( "rule3 vIndex", v );
	}

		filling.faces.push( new THREE.Face3( vnIndex, vIndex, len - 1 ) );

		// Update front
		var ix = front.vertices.indexOf( v );
		front.vertices.splice( ix + 1, 0, vNew );

		return vNew;
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
			vp = front[( i == 0 ) ? len - 2 : i - 1];
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
	 * Insert an angle into the corresponding heap.
	 * @param {Angle} angle The angle to insert.
	 */
	heapInsert: function( angle ) {
		if( angle.degree <= 75.0 ) {
			this.HEAP_ANGLES.rule1.push( angle.degree );
			this.HEAP_ANGLES.rule1.sort();
			this.HEAP_RULES.rule1[angle.degree] = angle;
		}
		else if( angle.degree <= 135.0 ) {
			this.HEAP_ANGLES.rule2.push( angle.degree );
			this.HEAP_ANGLES.rule2.sort();
			this.HEAP_RULES.rule2[angle.degree] = angle;
		}
		else if( angle.degree < 180.0 ) {
			this.HEAP_ANGLES.rule3.push( angle.degree );
			this.HEAP_ANGLES.rule3.sort();
			this.HEAP_RULES.rule3[angle.degree] = angle;
		}
	},


	/**
	 * Remove an angle from its heap(s).
	 * @param {Angle} angle The angle to remove.
	 */
	heapRemove: function( angle ) {
		if( angle.degree <= 75.0 ) {
			this.HEAP_ANGLES.rule1.splice( this.HEAP_ANGLES.rule1.indexOf( angle.degree ), 1 );
			delete this.HEAP_RULES.rule1[angle.degree];
		}
		else if( angle.degree <= 135.0 ) {
			this.HEAP_ANGLES.rule2.splice( this.HEAP_ANGLES.rule2.indexOf( angle.degree ), 1 );
			delete this.HEAP_RULES.rule2[angle.degree];
		}
		else if( angle.degree < 180.0 ) {
			this.HEAP_ANGLES.rule3.splice( this.HEAP_ANGLES.rule3.indexOf( angle.degree ), 1 );
			delete this.HEAP_RULES.rule3[angle.degree];
		}
	},


	/**
	 * Angle heaps have to be updated if vertices of the front are being merged.
	 * @param {THREE.Vector3} vOld The old vertex.
	 * @param {THREE.Vector3} vNew The new vertex.
	 */
	heapUpdateVertex: function( vOld, vNew ) {
		var search = [
			this.HEAP_RULES.rule1,
			this.HEAP_RULES.rule2,
			this.HEAP_RULES.rule3
		];
		var heap, prev, next;

		for( var i = 0; i < search.length; i++ ) {
			heap = search[i];

			for( var key in heap ) {
				// Match with vOld in the "middle"
				if( heap[key].vertices[1] == vOld ) {
					// Update this one
					heap[key].vertices[1] = vNew;
					heap[key].calculateAngle();

					// Update the previous one
					prev = heap[key].previous;
					prev.vertices[2] = vNew;
					prev.calculateAngle();

					// Update the next one
					next = heap[key].next;
					next.vertices[0] = vNew;
					next.calculateAngle();

					break;
				}
			}
		}
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
		var modelGeo = GLOBAL.MODEL.geometry;
		var a, b, c, face;

		for( var i = 0; i < filling.faces.length; i++ ) {
			face = filling.faces[i];

			a = filling.vertices[face.a];
			b = filling.vertices[face.b];
			c = filling.vertices[face.c];

			if( a.equals( fromA ) || a.equals( fromB )
					|| b.equals( fromA ) || b.equals( fromB )
					|| c.equals( fromA ) || c.equals( fromB ) ) {
				continue;
			}

			if( Utils.checkIntersectionOfTriangles3D( a, b, c, v, fromA, fromB ) ) {
				GLOBAL.SCENE.add( Scene.createPoint( a, 0.04, 0xFFEE00, true ) );
				GLOBAL.SCENE.add( Scene.createPoint( b, 0.04, 0xFFEE00, true ) );
				GLOBAL.SCENE.add( Scene.createPoint( c, 0.04, 0xFFEE00, true ) );

				GLOBAL.SCENE.add( Scene.createLine( a, b, 1, 0xFFEE00, true ) );
				GLOBAL.SCENE.add( Scene.createLine( b, c, 1, 0xFFEE00, true ) );
				GLOBAL.SCENE.add( Scene.createLine( c, a, 1, 0xFFEE00, true ) );

				GLOBAL.SCENE.add( Scene.createPoint( fromA, 0.04, 0xFF0000, true ) );
				GLOBAL.SCENE.add( Scene.createPoint( fromB, 0.04, 0xFF0000, true ) );
				GLOBAL.SCENE.add( Scene.createPoint( v, 0.04, 0xFF0000, true ) );

				GLOBAL.SCENE.add( Scene.createLine( fromA, v, 1, 0xFF0000, true ) );
				GLOBAL.SCENE.add( Scene.createLine( fromB, v, 1, 0xFF0000, true ) );

				return false;
			}
		}

		if( CONFIG.HF.FILLING.COLLISION_TEST == "all" ) {
			for( var i = 0; i < modelGeo.faces.length; i++ ) {
				face = modelGeo.faces[i];

				a = modelGeo.vertices[face.a];
				b = modelGeo.vertices[face.b];
				c = modelGeo.vertices[face.c];

				if( a.equals( fromA ) || a.equals( fromB )
						|| b.equals( fromA ) || b.equals( fromB )
						|| c.equals( fromA ) || c.equals( fromB ) ) {
					continue;
				}

				if( Utils.checkIntersectionOfTriangles3D( a, b, c, fromA, fromB, v ) ) {
					GLOBAL.SCENE.add( Scene.createPoint( a, 0.04, 0xFFEE00, true ) );
					GLOBAL.SCENE.add( Scene.createPoint( b, 0.04, 0xFFEE00, true ) );
					GLOBAL.SCENE.add( Scene.createPoint( c, 0.04, 0xFFEE00, true ) );

					GLOBAL.SCENE.add( Scene.createLine( a, b, 1, 0xFFEE00, true ) );
					GLOBAL.SCENE.add( Scene.createLine( b, c, 1, 0xFFEE00, true ) );
					GLOBAL.SCENE.add( Scene.createLine( c, a, 1, 0xFFEE00, true ) );

					GLOBAL.SCENE.add( Scene.createPoint( fromA, 0.04, 0xFF0000, true ) );
					GLOBAL.SCENE.add( Scene.createPoint( fromB, 0.04, 0xFF0000, true ) );
					GLOBAL.SCENE.add( Scene.createPoint( v, 0.04, 0xFF0000, true ) );

					GLOBAL.SCENE.add( Scene.createLine( fromA, v, 1, 0xFF0000, true ) );
					GLOBAL.SCENE.add( Scene.createLine( fromB, v, 1, 0xFF0000, true ) );

					console.log( "a", a ); console.log( "b", b ); console.log( "c", c );
					console.log( "fromA", fromA ); console.log( "fromB", fromB ); console.log( "v", v );

					return false;
				}
			}
		}

		return true;
	},


	/**
	 * Keep a vector close to the plane of its creating vectors.
	 * Calculates the standard variance of the X, Y, and Z coordinates
	 * and adjusts the coordinate of the new vector to the smallest one.
	 * @param  {THREE.Vector3} v    One of the creating vectors.
	 * @param  {THREE.Vector3} vn   One of the creating vectors.
	 * @param  {THREE.Vector3} vNew The newly created vector.
	 * @return {THREE.Vector3}      Adjusted vector.
	 */
	keepNearPlane: function( v, vn, vNew ) {
		var variance = Utils.calculateVariances( [v, vn] );

		if( variance.x < variance.y ) {
			if( variance.x < variance.z ) {
				vNew.x = variance.average.x;
			}
			else {
				vNew.z = variance.average.z;
			}
		}
		else {
			if( variance.y < variance.z ) {
				vNew.y = variance.average.y;
			}
			else {
				vNew.z = variance.average.z;
			}
		}

		return vNew;
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

		// Compare current point to all other new points
		for( var i = 0; i < compare.length; i++ ) {
			t = compare[i];

			// The original form of the hole shall not be changed
			if( ignore.indexOf( t ) >= 0 ) {
				continue;
			}

			// Merge points if distance below threshold
			if( v.distanceTo( t ) <= CONFIG.HF.FILLING.THRESHOLD_MERGE ) {
				if( CONFIG.DEBUG.SHOW_MERGING ) {
					GLOBAL.SCENE.add( Scene.createPoint( t.clone(), 0.02, 0xFFEE00, true ) );
					GLOBAL.SCENE.add( Scene.createPoint( v.clone(), 0.012, 0xFFEE00, true ) );
					GLOBAL.SCENE.add( Scene.createLine( t.clone(), v.clone(), 1, 0xFFEE00, true ) );
				}

				tIndex = filling.vertices.indexOf( t );
				vIndex = filling.vertices.indexOf( v );
				filling.vertices.splice( tIndex, 1 );

				this.updateFaces( filling, tIndex, vIndex );
				this.mergeUpdateFront( front, v, t );
				this.heapUpdateVertex( t, v );
			}
		}
	},


	/**
	 * Update the front according to the merged points.
	 * @param  {THREE.Geometry} front The current hole front.
	 * @param  {THREE.Vector3}  v      The new vertex.
	 * @param  {THREE.Vector3}  t      The merged-away vertex.
	 */
	mergeUpdateFront: function( front, v, t ) {
		var ixFrom = front.vertices.indexOf( t ),
		    ixTo = front.vertices.indexOf( v );
		var cutOff;

		if( ixFrom >= 0 ) {
			front.vertices[ixFrom] = v;

			if( ixTo >= 0 ) {
				cutOff = ixTo - ixFrom;
				cutOff = cutOff % ( front.vertices.length - 2 );

				// Two vertices directly neighboured are merged
				// -> One less in the moving front
				if( Math.abs( cutOff ) == 1 ) {
					front.vertices.splice( ixFrom, 1 );
				}
				// Two vertices more than one step apart are merged
				// -> All vertices between them are cut off from the front
				// -> This may create a second front, but that's a story for another time.
				else {
					console.warn(
						"mergeUpdateFront: Case for cutOff > 1 not enough tested.\n",
						"- Front vertices: " + front.vertices.length + "\n",
						"- Cut index from: " + ixFrom + "\n",
						"- Cut index to: " + ixTo + "\n",
						"- Remove items: " + cutOff
					);
					if( cutOff > 1 ) {
						front.vertices.splice( ixFrom, cutOff );
					}
					else {
						front.vertices.splice( ixTo, -cutOff );
					}
				}
			}
		}
	},


	/**
	 * Render the finished hole filling.
	 * Create a mesh from the computed data and render it.
	 * @param {THREE.Geometry} front   Front of the hole.
	 * @param {THREE.Geometry} filling Filling of the hole.
	 */
	showFilling: function( front, filling ) {
		var g = GLOBAL,
		    model = g.MODEL;

		if( !g.FILLINGS.hasOwnProperty( this.HOLE_INDEX ) ) {
			g.FILLINGS[this.HOLE_INDEX] = {
				solid: false,
				wireframe: false
			};
		}

		// Filling as solid form
		if( CONFIG.HF.FILLING.SHOW_SOLID ) {
			if( g.FILLINGS[this.HOLE_INDEX].solid ) {
				g.SCENE.remove( g.FILLINGS[this.HOLE_INDEX].solid );
			}

			var materialSolid = new THREE.MeshPhongMaterial( {
				color: CONFIG.HF.FILLING.COLOR,
				shading: THREE.FlatShading,
				side: THREE.DoubleSide,
				wireframe: false
			} );
			var meshSolid = new THREE.Mesh( filling, materialSolid );

			meshSolid.position.x += model.position.x;
			meshSolid.position.y += model.position.y;
			meshSolid.position.z += model.position.z;

			meshSolid.geometry.computeFaceNormals();
			meshSolid.geometry.computeVertexNormals();
			meshSolid.geometry.computeBoundingBox();

			g.FILLINGS[this.HOLE_INDEX].solid = meshSolid;
			GLOBAL.SCENE.add( meshSolid );
		}

		// Filling as wireframe
		if( CONFIG.HF.FILLING.SHOW_WIREFRAME ) {
			var materialWire = new THREE.MeshBasicMaterial( {
				color: 0xFFFFFF,
				overdraw: true,
				side: THREE.DoubleSide,
				wireframe: true,
				wireframeLinewidth: CONFIG.HF.FILLING.LINE_WIDTH
			} );
			var meshWire = new THREE.Mesh( filling, materialWire );

			meshWire.position.x += model.position.x;
			meshWire.position.y += model.position.y;
			meshWire.position.z += model.position.z;

			meshWire.geometry.computeFaceNormals();
			meshWire.geometry.computeVertexNormals();
			meshWire.geometry.computeBoundingBox();

			g.FILLINGS[this.HOLE_INDEX].wireframe = meshWire;
			GLOBAL.SCENE.add( meshWire );
		}

		// Draw the (moving) front
		if( CONFIG.DEBUG.SHOW_FRONT ) {
			var material = new THREE.LineBasicMaterial( {
				color: 0x4991E0,
				linewidth: 5
			} );
			var mesh = new THREE.Line( front, material );

			mesh.position.x += model.position.x;
			mesh.position.y += model.position.y;
			mesh.position.z += model.position.z;

			GLOBAL.SCENE.add( mesh );
		}

		render();
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

			// By removing a vertex all (greater)
			// face indexes have to be updated
			if( face.a > oldIndex ) {
				face.a--;
			}
			if( face.b > oldIndex ) {
				face.b--;
			}
			if( face.c > oldIndex ) {
				face.c--;
			}

			// Triangle disappeared through merge
			if( face.a == face.b || face.a == face.c || face.b == face.c ) {
				filling.faces.splice( i, 1 );
			}
		}
	}

};
