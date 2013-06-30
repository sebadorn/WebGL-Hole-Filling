"use strict";


/**
 * Class for hole finding and filling algorithms.
 * @type {Object}
 */
var HoleFilling = {

	/**
	 * Fill the hole using the advancing front algorithm.
	 * @param {THREE.Mesh}        model The model to fill the holes in.
	 * @param {Array<THREE.Line>} holes List of the holes.
	 */
	advancingFront: function( model, holes ) {
		var filling = new THREE.Geometry();
		var front = new THREE.Geometry();

		// filling.vertices = holes[0].slice( 0 ); // TODO
		front.vertices = holes[0].slice( 0 );
		filling.vertices = [];

		var ca = this.computeAngles( front.vertices ),
		    j = ca.smallest.index;
		var angle, len, v, vn, vNew, vp;
		var vIndex, vnIndex, vpIndex;
		var count = 0;


		while( true ) {
			len = front.vertices.length;

			if( ++count > /*holes[0].length*/5 ) {
				break;
			}
			if( len == 3 ) {
				console.log( "Hole filled! (Except for the last triangle.)" );
				break;
			}

			vpIndex = ( j == 0 ) ? len - 2 : ( j - 1 ) % len;
			vIndex = j % len;
			vnIndex = ( j + 1 ) % len;

			vp = front.vertices[vpIndex];
			v = front.vertices[vIndex];
			vn = front.vertices[vnIndex];

			// Calculate the angle between two adjacent vertices.
			angle = this.computeAngle( vp, v, vn );

			// Create new triangles on the plane.
			if( angle <= 75.0 ) {
				vNew = this.afRule1( front, filling, vp, v, vn );
			}
			else if( angle <= 135.0 ) {
				vNew = this.afRule2( front, filling, vp, v, vn );
				j++;
			}
			else if( angle > 135.0 && angle < 180.0 ) {
				vNew = this.afRule3( front, filling, vp, v, vn, angle );
				j += 2;
			}
			else {
				vNew = false;
				j++;
			}

			// Compute the distances between each new created
			// vertex and see, if they can be merged.
			this.mergeByDistance( front, filling, vNew, holes[0] );
		}

		console.log( filling.clone() );

		// Create a mesh from the computed data and render it.
		var materialSolid = new THREE.MeshBasicMaterial( {
			color: 0x87C3EC,
			side: THREE.DoubleSide,
			wireframe: false
		} );
		var materialWire = new THREE.MeshBasicMaterial( {
			color: 0xFFFFFF,
			side: THREE.DoubleSide,
			wireframe: true,
			wireframeLinewidth: 3
		} );
		var meshSolid = new THREE.Mesh( filling, materialSolid );
		var meshWire = new THREE.Mesh( filling, materialWire );

		meshSolid.position.x += model.position.x;
		meshSolid.position.y += model.position.y;
		meshSolid.position.z += model.position.z;

		meshSolid.geometry.computeFaceNormals();
		meshSolid.geometry.computeVertexNormals();
		meshSolid.geometry.computeBoundingBox();

		meshWire.position.x += model.position.x;
		meshWire.position.y += model.position.y;
		meshWire.position.z += model.position.z;

		meshWire.geometry.computeFaceNormals();
		meshWire.geometry.computeVertexNormals();
		meshWire.geometry.computeBoundingBox();

		GLOBAL.SCENE.add( meshSolid );
		GLOBAL.SCENE.add( meshWire );
		render();


		// Draw the (moving) front
		var material = new THREE.LineBasicMaterial( {
			color: 0x4991E0,
			linewidth: 5
		} );
		var mesh = new THREE.Line( front, material );

		mesh.position.x += model.position.x;
		mesh.position.y += model.position.y;
		mesh.position.z += model.position.z;

		GLOBAL.SCENE.add( mesh );
		render();
	},


	/**
	 * Apply rule 1 of the advancing front mesh algorithm.
	 * Rule 1: Close gaps of angles <= 75°.
	 * @param {THREE.Geometry} update New geometry of the current iteration.
	 * @param {THREE.Vector3}  vp     Previous vector.
	 * @param {THREE.Vector3}  v      Current vector.
	 * @param {THREE.Vector3}  vn     Next vector.
	 */
	afRule1: function( front, filling, vp, v, vn ) {
		filling.vertices.push( v );
		filling.vertices.push( vp );
		filling.vertices.push( vn );

		var f = filling.vertices.length;
		filling.faces.push( new THREE.Face3( f - 3, f - 2, f - 1 ) );

		// The vector v is not a part of the (moving) hole front anymore.
		front.vertices.splice( front.vertices.indexOf( v ), 1 );

		return false;
	},


	/**
	 * Apply rule 2 of the advancing front mesh algorithm.
	 * Rule 2: Create one new vertex if the angle is > 75° and <= 135°.
	 * @param {THREE.Geometry} update New geometry of the current iteration.
	 * @param {THREE.Vector3}  vp     Previous vector.
	 * @param {THREE.Vector3}  v      Current vector.
	 * @param {THREE.Vector3}  vn     Next vector.
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
		avLen = this.getAverageLength( vpClone, vnClone );
		adjusted = avLen / vNew.length();
		vNew = plane.getPoint( adjusted, adjusted );
		vNew.add( v );


		// New triangle 1
		filling.vertices.push( v );
		filling.vertices.push( vp );
		filling.vertices.push( vNew );

		// New triangle 2
		filling.vertices.push( v );
		filling.vertices.push( vNew );
		filling.vertices.push( vn );


		// New faces for the triangles
		var l = filling.vertices.length;
		filling.faces.push( new THREE.Face3( l - 6, l - 5, l - 4 ) );
		filling.faces.push( new THREE.Face3( l - 3, l - 2, l - 1 ) );

		// Update front
		var ix = front.vertices.indexOf( v );
		front.vertices[ix] = vNew;

		return vNew;
		//GLOBAL.SCENE.add( Scene.createPoint( vNew, 0.02, 0xFFFFFF, true ) );
	},


	/**
	 * Apply rule 3 of the advancing front mesh algorithm.
	 * Rule 3: Create two new vertices if the angle is > 135°.
	 * @param {THREE.Geometry} update New geometry of the current iteration.
	 * @param {THREE.Vector3}  vp     Previous vector.
	 * @param {THREE.Vector3}  v      Current vector.
	 * @param {THREE.Vector3}  vn     Next vector.
	 */
	afRule3: function( front, filling, vp, v, vn, angle ) {
		var vpClone = vp.clone().sub( v ),
		    vnClone = vn.clone().sub( v );

		var cross1 = new THREE.Vector3().crossVectors( vpClone, vnClone );
		cross1.normalize();
		cross1.add( v );


		// New vertice 1
		var crossVp = new THREE.Vector3().crossVectors( cross1.clone().sub( v ), vpClone );
		if( angle > 180.0 ) {
			crossVp.multiplyScalar( -1 );
		}
		crossVp.normalize();
		crossVp.add( v );

		var plane = new Plane( new THREE.Vector3(), vpClone, crossVp.clone().sub( v ) );
		var vNew1 = plane.getPoint( 1, 1 );

		var avLen = this.getAverageLength( vpClone, vnClone );
		var adjusted = avLen / vNew1.length();
		vNew1 = plane.getPoint( adjusted, adjusted );
		vNew1.add( v );


		// // New vertice 2
		// var crossVn = new THREE.Vector3().crossVectors( cross1.clone().sub( v ), vnClone );
		// if( angle <= 180.0 ) {
		// 	crossVn.multiplyScalar( -1 );
		// }
		// crossVn.normalize();
		// crossVn.add( v );

		// var plane = new Plane( new THREE.Vector3(), vnClone, crossVn.clone().sub( v ) );
		// var vNew2 = plane.getPoint( 1, 1 );

		// var adjusted = avLen / vNew2.length();
		// vNew2 = plane.getPoint( adjusted, adjusted );
		// vNew2.add( v );


		// New triangle 1
		filling.vertices.push( vp );
		filling.vertices.push( vNew1 );
		filling.vertices.push( v );

		// // New triangle 2
		// filling.vertices.push( v );
		// filling.vertices.push( vNew2 );
		// filling.vertices.push( vn );

		// // New triangle 3
		// filling.vertices.push( vNew1 );
		// filling.vertices.push( v );
		// filling.vertices.push( vNew2 );

		// New faces for the triangles
		var l = filling.vertices.length;
		// filling.faces.push( new THREE.Face3( l - 9, l - 8, l - 7 ) );
		// filling.faces.push( new THREE.Face3( l - 6, l - 5, l - 4 ) );
		filling.faces.push( new THREE.Face3( l - 3, l - 2, l - 1 ) );

		// Update front
		var ix = front.vertices.indexOf( v );
		// front.vertices.splice( ix, 1, vNew1, vNew2 );
		front.vertices.splice( ix, 0, vNew1 );

		return vNew1;
		//GLOBAL.SCENE.add( Scene.createPoint( vNew1, 0.02, 0xFFFFFF, true ) );
		//GLOBAL.SCENE.add( Scene.createPoint( vNew2, 0.02, 0xFFFFFF, true ) );
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

			angle = this.computeAngle( vp, v, vn );
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
	 * Compute the angle between two vertices.
	 * Angle is in degree.
	 * @param  {THREE.Vector3} vp The previous vertex.
	 * @param  {THREE.Vector3} v  The current vertex.
	 * @param  {THREE.Vector3} vn The next vertex.
	 * @return {float}            Angle between the vertices in degree and flag if it has been adjusted to point into the hole.
	 */
	computeAngle: function( vp, v, vn ) {
		var vpClone = vp.clone().sub( v ),
		    vnClone = vn.clone().sub( v ),
		    vClone = v.clone().add( GLOBAL.MODEL.position );
		var angle, c;

		// Get angle and change radians to degree
		angle = vpClone.angleTo( vnClone ) * 180 / Math.PI;

		// Get the axis described by the cross product of the vectors building the angle
		c = new THREE.Vector3().crossVectors( vpClone, vnClone );
		c.add( v ).add( GLOBAL.MODEL.position );

		// Use "the other side of the angle" if it doesn't point inside the hole
		if( c.length() < vClone.length() ) {
			angle = 360.0 - angle;
		}

		return angle;
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
			else if( angle > 75.0 && angle <= 135.0 ) {
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
	 * Get the average length of two vectors.
	 * @param  {THREE.Vector3} vp Vector.
	 * @param  {THREE.Vector3} vn Vector.
	 * @return {float}            Average length.
	 */
	getAverageLength: function( vp, vn ) {
		return ( vp.length() + vn.length() ) / 2;
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
				bp = bp.firstEdge.vertex;
			}
			else {
				geometry.vertices.push( model.geometry.vertices[bpStart.index] );
				break;
			}
		}

		return geometry;
	},


	/**
	 * Merge vertices that are close together.
	 */
	mergeByDistance: function( front, filling, v, ignore ) {
		var ixV = filling.vertices.indexOf( v );
		var t;

		// No new vertex has been added, but
		// there may be some duplicate ones
		if( !v ) {
			return true;
		}

		if( ixV < 0 ) {
			console.error( "mergeByDistance: given vertex not part of filling" );
			return false;
		}

		// Compare current point to all other new points
		for( var i = filling.vertices.length - 1; i >= 0; i-- ) {
			// Don't compare a vertex to itself
			if( i == ixV ) {
				continue;
			}

			t = filling.vertices[i];

			// The original form of the hole shall not be changed
			if( ignore.indexOf( t ) >= 0 ) {
				continue;
			}

			// Merge points if distance below threshold
			if( v.distanceTo( t ) <= CONFIG.HF.FILLING.THRESHOLD_MERGE ) {
				GLOBAL.SCENE.add( Scene.createPoint( t.clone(), 0.024, 0xFFEE00, true ) );

				filling.vertices.splice( i, 1 );
				ixV = filling.vertices.indexOf( v );

				this.updateFaces( filling, ixV, i );
				this.mergeUpdateFront( front, v, t );
			}
		}
	},


	mergeUpdateFront: function( front, v, t ) {
		var ixFrom = front.vertices.indexOf( t ),
		    ixTo = front.vertices.indexOf( v );
		var cutOff;

		if( ixFrom >= 0 ) {
			front.vertices[ixFrom] = v;

			if( ixTo >= 0 ) {
				cutOff = ixTo - ixFrom;

				// Two vertices directly neighboured are merged
				// -> One less in the moving front
				if( Math.abs( cutOff ) == 1 ) {
					front.vertices.splice( ixFrom, 1 );
				}
				// Two vertices more than one step apart are merged
				// -> All vertices between them are cut off from the front
				// -> This may create a second front, but that's a story for another time.
				else {
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


	updateFaces: function( filling, ixV, i ) {
		var face;

		for( var j = filling.faces.length - 1; j >= 0; j-- ) {
			face = filling.faces[j];

			// Replace vertex index of the merged-away
			// one with the merge-surviving one
			if( face.a == i ) {
				face.a = ixV;
			}
			if( face.b == i ) {
				face.b = ixV;
			}
			if( face.c == i ) {
				face.c = ixV;
			}

			// By removing a vertex all (greater) face
			// indexes have to be updated
			if( face.a >= i && face.a != ixV ) {
				face.a--;
			}
			if( face.b >= i && face.b != ixV ) {
				face.b--;
			}
			if( face.c >= i && face.c != ixV ) {
				face.c--;
			}

			// Triangle disappeared through merge
			if( face.a == face.b && face.b == face.c ) {
				filling.faces.splice( j, 1 );
			}
		}
	}

};
