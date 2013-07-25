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
				v.neighbours = bp.edges;
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

		var ca = this.computeAngles( front.vertices ),
		    j = ca.smallest.index;
		var angle, len, v, vectors, vn, vNew, vp;

		var applied = 0,
		    appliedBefore = 0,
		    applyRule = 1,
		    count = 0,
		    ignoredAngles = 0,
		    loopCounter = 0;
		var stopIter = CONFIG.DEBUG.AFM_STOP_AFTER_ITER; // for debugging

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

			// Each round, we only apply one of the three rules.
			// And we strongly favor rule 1 and rule 2, because
			// rule 3 is really unrealiable. So we want to use it
			// as little as possible.
			if( loopCounter++ >= len ) {
				applyRule = this.getNextRule( applyRule, applied, appliedBefore );
				loopCounter = 0;
				appliedBefore = applied;
				applied = 0;
			}

			vectors = this.getNextVectors( front.vertices, j, len );
			if( !vectors ) {
				j++;
				continue;
			}
			vp = vectors.vp;
			v = vectors.v;
			vn = vectors.vn;

			// Calculate the angle between two adjacent vertices.
			angle = Utils.computeAngle( vp, v, vn, GLOBAL.MODEL.position );

			if( isNaN( angle ) ) {
				console.error( "Angle is NaN!\n", vp, v, vn );
			}

			// Create new triangles on the plane.
			if( applyRule == 1 && angle <= 75.0 ) {
				vNew = this.afRule1( front, filling, vp, v, vn );
				applied++;
			}
			else if( applyRule == 2 && angle <= 135.0 ) {
				vNew = this.afRule2( front, filling, vp, v, vn );
				j++;
				applied++;
			}
			else if( applyRule == 3 && angle > 135.0 && angle < 180.0 ) {
				vNew = this.afRule3( front, filling, vp, v, vn, angle );
				j += 2;
				applied++;
			}
			// TODO: Angle >= 180.0 not handled.
			else if( angle >= 180.0 ) {
				ignoredAngles++;
				j++;
				continue;
			}
			else {
				j++;
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

		filling.faces.push( new THREE.Face3( vIndex, vpIndex, len - 1 ) );
		filling.faces.push( new THREE.Face3( vIndex, len - 1, vnIndex ) );


		// Update front
		var ix = front.vertices.indexOf( v );
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

		if( !this.isInHole( front, filling, vNew.clone(), vp.clone(), vn.clone() ) ) {
			return false;
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
		var angle, v, vn, vp;

		for( var i = 0, len = front.length; i < len; i++ ) {
			vp = front[( i == 0 ) ? len - 2 : i - 1];
			v = front[i];
			vn = front[( i + 1 ) % len];

			angle = Utils.computeAngle( vp, v, vn, GLOBAL.MODEL.position );
			angles.push( angle );

			if( smallest.angle > angle ) {
				smallest.angle = angle;
				smallest.index = i;
			}
		}

		return {
			angles: angles,
			smallest: smallest
		};
	},


	/**
	 * Create new triangles in the hole, going from the border vertices.
	 * @param  {THREE.Geometry} front The border of the hole.
	 * @param  {Object}         ca    The computed angles and the smallest one found.
	 * @return {THREE.Geometry}       Geometry of the new triangles, building a new front.
	 */
	createNewTriangles: function( front, ca ) {
		var j = ca.smallest.index,
		    len = front.length,
		    update = new THREE.Geometry();
		var angle, angleLast, angleNext, v, vn, vp;

		while( true ) {
			if( j >= ca.smallest.index + len ) {
				break;
			}
			angle = ca.angles[j % len];
			vp = front[( j == 0 ) ? len - 2 : ( j - 1 ) % len];
			v = front[j % len];
			vn = front[( j + 1 ) % len];

			angleLast = ca.angles[( j - 1 ) % len];
			angleNext = ca.angles[( j + 1 ) % len];

			if( !v || !vn ) {
				j++;
				continue;
			}

			// Rule 1: Just close the gap.
			if( angle <= 75.0 ) {
				this.afRule1( update, vp, v, vn );
			}
			// Rule 2: Create one new vertice.
			else if( angle <= 135.0 ) {
				this.afRule2( update, vp, v, vn );
			}
			// Rule 3: Create two new vertices.
			else if( angle < 180.0 ) {
				this.afRule3( update, vp, v, vn, angleLast, angleNext );
			}

			j++;
		}


		return update;
	},


	/**
	 * Get the next rule to use on the hole.
	 * @param  {int} currentRule   Number of the rule used until now.
	 * @param  {int} applied       How often it has been applied to the current front.
	 * @param  {int} appliedBefore How often the former rule has been applied to the front of then.
	 * @return {int}               The new rule to use.
	 */
	getNextRule: function( currentRule, applied, appliedBefore ) {
		// Rule 3 gets always replaced. It is necessary,
		// but is likely to introduce problematic vectors.
		// So I really would like to avoid it as much as possible.
		if( currentRule == 3 ) {
			return 1;
		}
		// Rule 1 or 2: If there are no more targets, switch to the next one.
		else if( applied == 0 ) {
			if( currentRule == 1 ) {
				return 2;
			}
			else if( currentRule == 2 ) {
				// Before rule 2 comes rule 1. If rule 1 couldn't be applied in the
				// round before, then switch to rule 3. Otherwise try rule 1 again.
				if( appliedBefore == 0 ) {
					return 3;
				}
				else {
					return 1;
				}
			}
		}

		return currentRule;
	},


	/**
	 * Get the next vectors for the main AFM loop.
	 * @param  {Array<THREE.Vector3>} vertices The vertices of the moving front.
	 * @param  {int}                  j        Current index in the front.
	 * @param  {int}                  len      Length of the front.
	 * @return {Object}                        The previous, current and next vector.
	 */
	getNextVectors: function( vertices, j, len ) {
		var vpIndex = ( j == 0 ) ? len - 2 : ( j - 1 ) % len,
		    vIndex = j % len,
		    vnIndex = ( j + 1 ) % len;
		var vp = vertices[vpIndex],
		    v = vertices[vIndex],
		    vn = vertices[vnIndex];

		if( vp == v || v == vn || vp == vn ) {
			console.error( "Shouldn't happen: Same vertices in front!\n", vp, v, vn );
			return false;
		}

		return {
			vp: vp,
			v: v,
			vn: vn
		};
	},


	/**
	 * Check, if a vector is inside the hole or has left the boundary.
	 * @param  {Array}         front The current front of the hole.
	 * @param  {THREE.Vector3} v     The vector to check.
	 * @return {boolean}             True, if still inside, false otherwise.
	 */
	isInHole: function( front, filling, v, fromA, fromB ) {
		var a, b, c, face, fromA2D, fromB2D, v2D, variance;
		var s, t;

		for( var i = 0; i < filling.faces.length; i++ ) {
			face = filling.faces[i];

			a = filling.vertices[face.a].clone();
			b = filling.vertices[face.b].clone();
			c = filling.vertices[face.c].clone();

			variance = Utils.calculateVariances( [a, b, c, v] );

			if( variance.x < variance.y ) {
				if( variance.x < variance.z ) {
					a = new THREE.Vector2( a.y, a.z );
					b = new THREE.Vector2( b.y, b.z );
					c = new THREE.Vector2( c.y, c.z );
					v2D = new THREE.Vector2( v.y, v.z );
					fromA2D = new THREE.Vector2( fromA.y, fromA.z );
					fromB2D = new THREE.Vector2( fromB.y, fromB.z );
				}
				else {
					a = new THREE.Vector2( a.x, a.y );
					b = new THREE.Vector2( b.x, b.y );
					c = new THREE.Vector2( c.x, c.y );
					v2D = new THREE.Vector2( v.x, v.y );
					fromA2D = new THREE.Vector2( fromA.x, fromA.y );
					fromB2D = new THREE.Vector2( fromB.x, fromB.y );
				}
			}
			else {
				if( variance.y < variance.z ) {
					a = new THREE.Vector2( a.x, a.z );
					b = new THREE.Vector2( b.x, b.z );
					c = new THREE.Vector2( c.x, c.z );
					v2D = new THREE.Vector2( v.x, v.z );
					fromA2D = new THREE.Vector2( fromA.x, fromA.z );
					fromB2D = new THREE.Vector2( fromB.x, fromB.z );
				}
				else {
					a = new THREE.Vector2( a.x, a.y );
					b = new THREE.Vector2( b.x, b.y );
					c = new THREE.Vector2( c.x, c.y );
					v2D = new THREE.Vector2( v.x, v.y );
					fromA2D = new THREE.Vector2( fromA.x, fromA.y );
					fromB2D = new THREE.Vector2( fromB.x, fromB.y );
				}
			}

			if( Utils.checkIntersectionOfTriangles2D( a, b, c, fromA2D, fromB2D, v2D ) ) {
				return false;
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

		// TODO: Threshold?
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
			}
		}
	},


	/**
	 * Update the front according to the merged points.
	 * @param  {THREE.Geometry} front The current hole front.
	 * @param  {THREE.Vector3} v      The new vertex.
	 * @param  {THREE.Vector3} t      The merged-away vertex.
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
