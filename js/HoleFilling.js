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
		// Step 1: Get the front using the boundary vertices of the hole.
		var front = holes[0].geometry.vertices;

		// Step 2: Calculate the angel between two adjacent vertices.
		var ca = this.computeAngles( front );

		// Step 3: Create new triangles on the plane.
		var update = this.createNewTriangles( front, ca );

		// Step 4: Compute the distances between each new
		// created vertex and see, if they can be merged.
		update = this.mergeByDistance( update );

		// Step 5: Update the front.


		// Step 6: Repeat step 2–5.
		// -> loop

		// Create a mesh from the computed data and render it.
		var material = new THREE.MeshBasicMaterial( {
			color: 0xFFFFFF,
			wireframe: true
		} );
		var mesh = new THREE.Mesh( update, material );

		mesh.position.x += model.position.x;
		mesh.position.y += model.position.y;
		mesh.position.z += model.position.z;

		mesh.geometry.computeFaceNormals();
		mesh.geometry.computeVertexNormals();
		mesh.geometry.computeBoundingBox();

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
	afRule1: function( update, vp, v, vn ) {
		update.vertices.push( v );
		update.vertices.push( vp );
		update.vertices.push( vn );
	},


	/**
	 * Apply rule 2 of the advancing front mesh algorithm.
	 * Rule 2: Create one new vertex if the angle is > 75° and <= 135°.
	 * @param {THREE.Geometry} update New geometry of the current iteration.
	 * @param {THREE.Vector3}  vp     Previous vector.
	 * @param {THREE.Vector3}  v      Current vector.
	 * @param {THREE.Vector3}  vn     Next vector.
	 */
	afRule2: function( update, vp, v, vn ) {
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


		update.vertices.push( v );
		update.vertices.push( vp );
		update.vertices.push( vNew );
		update.vertices.push( v );
		update.vertices.push( vNew );
		update.vertices.push( vn );


		GLOBAL.SCENE.add( Scene.createPoint( vNew, 0.02, 0xFFFFFF, true ) );
	},


	/**
	 * Apply rule 3 of the advancing front mesh algorithm.
	 * Rule 3: Create two new vertices if the angle is > 135°.
	 * @param {THREE.Geometry} update New geometry of the current iteration.
	 * @param {THREE.Vector3}  vp     Previous vector.
	 * @param {THREE.Vector3}  v      Current vector.
	 * @param {THREE.Vector3}  vn     Next vector.
	 */
	afRule3: function( update, vp, v, vn ) {
		var origin = new THREE.Vector3();

		var neigh;
		var vertex;
		var vPotentialCommonPoints = [];
		var commonPoint;

		neigh = v.neighbours;
		for( var i = 0; i < neigh.length; i++ ) {
			vertex = GLOBAL.MODEL.geometry.vertices[neigh[i].vertex.index];
			vPotentialCommonPoints.push( vertex );
		}

		neigh = vn.neighbours;
		for( var i = 0; i < neigh.length; i++ ) {
			vertex = GLOBAL.MODEL.geometry.vertices[neigh[i].vertex.index];

			if( vPotentialCommonPoints.indexOf( vertex ) >= 0 ) {
				commonPoint = vertex;
				break;
			}
		}


		var vClone = v.clone().sub( commonPoint );
		var vnClone = vn.clone().sub( commonPoint );

		var plane = new Plane( origin, vClone, vnClone );
		var vNew1 = plane.getPoint( 1, 1 );
		var adjust = ( vClone.length() + vnClone.length() ) / vNew1.length();
		vNew1 = plane.getPoint( adjust, adjust );

		vNew1.add( commonPoint );


		// Second new point

		var neigh;
		var vertex;
		var vPotentialCommonPoints = [];
		var commonPoint;

		neigh = v.neighbours;
		for( var i = 0; i < neigh.length; i++ ) {
			vertex = GLOBAL.MODEL.geometry.vertices[neigh[i].vertex.index];
			vPotentialCommonPoints.push( vertex );
		}

		neigh = vp.neighbours;
		for( var i = 0; i < neigh.length; i++ ) {
			vertex = GLOBAL.MODEL.geometry.vertices[neigh[i].vertex.index];

			if( vPotentialCommonPoints.indexOf( vertex ) >= 0 ) {
				commonPoint = vertex;
				break;
			}
		}


		var vClone = v.clone().sub( commonPoint );
		var vpClone = vp.clone().sub( commonPoint );

		var plane = new Plane( origin, vClone, vpClone );
		var vNew2 = plane.getPoint( 1, 1 );
		var adjust = ( vClone.length() + vpClone.length() ) / vNew2.length();
		vNew2 = plane.getPoint( adjust, adjust );

		vNew2.add( commonPoint );


		update.vertices.push( v );
		update.vertices.push( vp );
		update.vertices.push( vNew2 );
		update.vertices.push( v );
		update.vertices.push( vNew2 );
		update.vertices.push( vNew1 );
		update.vertices.push( v );
		update.vertices.push( vNew1 );
		update.vertices.push( vn );


		GLOBAL.SCENE.add( Scene.createPoint( vNew1, 0.02, 0xFFFFFF, true ) );
		GLOBAL.SCENE.add( Scene.createPoint( vNew2, 0.02, 0xFFFFFF, true ) );
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
		var angle, v, vn, vp;

		while( true ) {
			if( j >= ca.smallest.index + len ) {
				break;
			}
			angle = ca.angles[j % len];
			vp = front[( j == 0 ) ? len - 2 : ( j - 1 ) % len];
			v = front[j % len];
			vn = front[( j + 1 ) % len];

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
				this.afRule3( update, vp, v, vn );
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
		    ignore = [],
		    lines = [],
		    points = [],
		    pos = new THREE.Vector3();
		var geometry, line, material, mesh, v, vertex;

		mesh = new HalfEdgeMesh( model.geometry );

		for( var i = 0; i < mesh.vertices.length; i++ ) {
			vertex = mesh.vertices[i];

			if( ignore.indexOf( vertex.index ) < 0 && vertex.isBorderPoint() ) {
				// Find connected border points
				geometry = this.getNeighbouringBorderPoints( model, ignore, vertex );

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
						points.push( Scene.createPoint( v, 0.03, 0xA1DA42, true ) );
					}
				}
			}
		}

		GLOBAL.HALFEDGE = mesh;

		return {
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
	 * @param  {THREE.Geometry} update Vertices that will be part of the new front.
	 * @return {THREE.Geometry}        New front with merged vertices.
	 */
	mergeByDistance: function( update ) {
		var face, skip, t, v;
		var skip = [];

		// Move already close vertices to the exact same position
		for( var i = 0, len = update.vertices.length; i < len; i++ ) {
			if( skip.indexOf( i ) >= 0 ) {
				continue;
			}
			v = update.vertices[i];

			// Compare current point to all other new points
			for( var j = 0; j < len; j++ ) {
				if( j == i ) {
					continue;
				}
				t = update.vertices[j];

				// Merge points if distance below threshold
				if( v.distanceTo( t ) <= CONFIG.HF.FILLING.THRESHOLD_MERGE ) {
					update.vertices[j] = v;
					skip.push( j );
				}
			}
		}

		// Create face values from vertices, assuming they are in a fitting order
		for( var i = 0, len = update.vertices.length; i < len; i += 3 ) {
			update.faces.push( new THREE.Face3(
				i,
				( i + 1 ) % len,
				( i + 2 ) % len )
			);
		}

		// Remove doublicate vertices (also updates the faces)
		var beforeMerge = update.vertices.length;
		update.mergeVertices();

		console.log( "merged vertices from " + beforeMerge + " to " + update.vertices.length );

		return update;
	}

};
