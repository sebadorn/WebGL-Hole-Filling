"use strict";


var HoleFilling = {

	/**
	 * Fill the hole using the advancing front algorithm.
	 * @param {THREE.Mesh}        model The model to fill the holes in.
	 * @param {Array<THREE.Line>} holes List of the holes.
	 */
	advancingFront: function( model, holes ) {
		var filling = new THREE.Geometry();

		// Step 1: Get the front using the boundary vertices of the hole.
		var front = holes[0].geometry.vertices;
		var len = front.length;


		// Step 2: Calculate the angel between two adjacent vertices.
		var angles = [],
		    smallest = {
				angle: 361.0,
				index: -1
		    };
		var angle, v, vn, vp;

		for( var i = 0; i < len; i++ ) {
			// TODO: refactor, maybe add to config and/or as option
			var m = new THREE.Mesh(
				new THREE.SphereGeometry( 0.03 ),
				new THREE.MeshBasicMaterial( { color: 0xA1DA42 } )
			);
			m.position.x = front[i].x + model.position.x;
			m.position.y = front[i].y + model.position.y;
			m.position.z = front[i].z + model.position.z;
			GLOBAL.SCENE.add( m );
			// ODOT

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

		render();


		// Step 3: Create new triangles on the plane.
		var j = smallest.index;
		var ix;

		while( true ) {
			if( j >= smallest.index + len ) {
				break;
			}
			ix = j % len;
			angle = angles[ix + ":" + ( ix + 1 )];

			// Rule 1: Just close the gap.
			if( angle <= 75.0 ) {
				// TODO
			}
			// Rule 2: Create one new vertice.
			else if( angle > 75.0 && angle <= 135.0 ) {
				// TODO
			}
			// Rule 3: Create two new vertices.
			else { // angle > 135.0
				// TODO
			}

			j++;
		}

		render();


		// Step 4: Compute the distances between each new created vertices and see, if they are merged.
		// Step 5: Update the front.
		// Step 6: Repeat step 2–5.
	},


	/**
	 * Compute the angle between two vertices.
	 * @param  {THREE.Vector3} vp The previous vertex.
	 * @param  {THREE.Vector3} v  The current vertex.
	 * @param  {THREE.Vector3} vn The next vertex.
	 * @return {float}         Angle between the vertices in degree.
	 */
	computeAngle: function( vp, v, vn ) {
		var vpTemp = new THREE.Vector3(),
		    vnTemp = new THREE.Vector3();

		vpTemp.subVectors( vp, v );
		vnTemp.subVectors( vn, v );

		return vpTemp.angleTo( vnTemp ) * 180 / Math.PI;
	},


	/**
	 * Find the border edges of a hole inside a half-edge structure.
	 * @param  {THREE.Mesh}        model  The model to find holes in.
	 * @return {Array<THREE.Line>}        List of THREE.Line marking holes.
	 */
	findBorderEdges: function( model ) {
		var colors = CONFIG.COLOR.HF_BORDER_EDGES,
		    ignore = [],
		    lines = [];
		var geometry, line, material, mesh, vertex;

		mesh = new HalfEdgeMesh( model.geometry );

		for( var i = 0; i < mesh.vertices.length; i++ ) {
			vertex = mesh.vertices[i];

			if( ignore.indexOf( vertex.index ) < 0 && vertex.isBorderPoint() ) {
				// Find connected border points
				geometry = this.getNeighbouringBorderPoints( model, ignore, vertex );

				material = new THREE.LineBasicMaterial( {
					color: colors[lines.length % colors.length],
					linewidth: CONFIG.HF_LINEWIDTH
				} );

				line = new THREE.Line( geometry, material );
				line.position = model.position;
				lines.push( line );
			}
		}

		return lines;
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
