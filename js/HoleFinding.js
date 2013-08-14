"use strict";


/**
 * Class for finding the holes.
 * @type {Object}
 */
var HoleFinding = {

	allVisitedBp: null,
	visitedBp: null,


	/**
	 * Decide the next vertex from the available edges. Do so by choosing
	 * the direction with the smallest angle. This assures for multi border
	 * points that we stay inside the hole and not cross over to another hole.
	 * @param  {Array<THREE.Vector3>} gv    The vertices of the hole so far.
	 * @param  {THREE.Vector3}        vPrev The previous vector.
	 * @param  {Vertex}               bp    The current border point.
	 * @param  {THREE.Mesh}           model The model we search holes in.
	 * @return {Vertex}                     The next vertex to follow.
	 */
	decideNextVertexByAngle: function( gv, vPrev, bp, model ) {
		var alreadyVisited = 0,
		    mgv = model.geometry.vertices,
		    nextRoute = {
		    	angle: 360.0,
		    	index: -1
		    },
		    v = mgv[bp.index];
		var angle, ix, vNext;

		for( var i = 0; i < bp.edges.length; i++ ) {
			ix = bp.edges[i].vertex.index;
			vNext = mgv[ix];

			if( !bp.edges[i].isBorderEdge()
					|| gv.indexOf( vNext ) >= 0
					|| this.allVisitedBp.indexOf( ix ) >= 0 ) {
				alreadyVisited++;
				continue;
			}

			angle = Utils.calculateAngle( vPrev, v, vNext, model.position );

			if( angle < nextRoute.angle ) {
				nextRoute.angle = angle;
				nextRoute.index = i;
			}
		}

		// This multi border point has no more edges to offer, so mark him as visited.
		if( alreadyVisited == bp.edges.length - 1 ) {
			this.visitedBp.push( bp.index );
		}

		if( nextRoute.index == -1 ) {
			throw new Error( "Couldn't find edge to follow from multi border point." );
		}

		return bp.edges[nextRoute.index].vertex;
	},


	/**
	 * Find the border edges of a hole inside a half-edge structure.
	 * @param  {THREE.Mesh} model  The model to find holes in.
	 * @return {Object}            Arrays of lines and points, depending on configuration.
	 */
	findBorderEdges: function( model ) {
		var mesh = new HalfEdgeMesh( model.geometry );
		var colors = CONFIG.HOLES.COLOR,
		    holes = [],
		    ignoredUnconnected = 0,
		    lines = [],
		    points = [];
		var geometry, line, material, v, vertex;

		this.allVisitedBp = [];

		for( var i = 0, lenMV = mesh.vertices.length; i < lenMV; i++ ) {
			vertex = mesh.vertices[i];

			// Ignore vertices without any connections/edges
			if( vertex.edges.length == 0 ) {
				ignoredUnconnected++;
				continue;
			}

			if( this.allVisitedBp.indexOf( vertex.index ) < 0 && vertex.isBorderPoint() ) {
				this.visitedBp = [];

				// Find connected border points
				try {
					geometry = this.getNeighbouringBorderPoints( model, mesh, vertex );
				}
				catch( err ) {
					console.error( err.name + ": " + err.message );
					console.warn( "Skipping hole." );
					continue;
				}

				// New hole, add first vertex
				holes.push( [model.geometry.vertices[vertex.index]] );

				for( var j = 0, lenGV = geometry.vertices.length; j < lenGV; j++ ) {
					v = geometry.vertices[j];
					holes[holes.length - 1].push( v );
				}

				// Lines
				material = new THREE.LineBasicMaterial( {
					color: colors[lines.length % colors.length],
					linewidth: CONFIG.HOLES.LINE_WIDTH
				} );

				line = new THREE.Line( geometry, material );
				line.position = model.position;
				lines.push( line );

				// Points
				if( CONFIG.HOLES.SHOW_POINTS ) {
					for( var j = 0, lenGV = geometry.vertices.length; j < lenGV; j++ ) {
						v = geometry.vertices[j];
						points.push( SceneManager.createPoint( v, 0.02, 0xA1DA42, true ) );
					}
				}

				this.allVisitedBp = this.allVisitedBp.concat( this.visitedBp );
			}
		}

		if( ignoredUnconnected > 0 ) {
			console.warn( "Ignored " + ignoredUnconnected + " vertices, because they were not part of any edge." );
		}

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
	 * @param  {Vertex}         start  Starting vertex.
	 * @return {THREE.Geometry}        Geometry of a hole.
	 */
	getNeighbouringBorderPoints: function( model, mesh, start ) {
		var bp = start,
		    geometry = new THREE.Geometry(),
		    mgv = model.geometry.vertices;
		var angle, angleAverage, v, vPrev;

		while( true ) {
			vPrev = v;
			v = mgv[bp.index];

			if( !bp.isBorderPoint() ) {
				break;
			}
			if( !bp.isMultiBorderPoint() && geometry.vertices.indexOf( v ) >= 0 ) {
				break;
			}
			if( this.allVisitedBp.indexOf( bp.index ) >= 0 ) {
				break;
			}

			// Hole completed
			if( vPrev != null && bp == start ) {
				break;
			}

			// We add the first vertex after finishing the hole
			if( bp != start ) {
				geometry.vertices.push( v.clone() );
			}

			// Handle border points that belong to more than one hole
			if( bp.isMultiBorderPoint() ) {
				// In order to find the right edge, we need a previous vertex
				// as reference point. No previous point is bad ...
				if( vPrev == null ) {
					// ... but if the vertex has a firstEdge, we can use that!
					if( bp.firstEdge == null ) {
						break;
					}
					// As long as the point hasn't already been visited.
					else if( this.visitedBp.indexOf( bp.firstEdge.vertex.index ) >= 0 ) {
						break;
					}
				}

				// No previous point for reference, but a firstEdge to use.
				if( vPrev == null ) {
					bp = bp.firstEdge.vertex;
				}
				// Otherwise decide the edge to follow by angle comparison.
				else {
					bp = this.decideNextVertexByAngle( geometry.vertices, vPrev, bp, model );
				}

				// We can't afford to ignore multi border points, as they will obviously
				// be needed for at least one other hole later on.
				if( !bp.isMultiBorderPoint() ) {
					this.visitedBp.push( bp.index );
				}
			}
			// Border point of only one hole
			else {
				this.visitedBp.push( bp.index );
				bp = bp.firstEdge.vertex;
			}
		}

		// Add the starting point of the hole. (We didn't do that until now.)
		geometry.vertices.splice( 0, 0, mgv[start.index] );

		if( geometry.vertices.length == 1 ) {
			throw new Error( "Hole has only 1 vertex. Which isn't really a hole." );
		}

		// Check if it is really a hole and not the outline of an existing triangle.
		angleAverage = Utils.calculateAngleAverage( geometry.vertices, model.position );

		if( angleAverage >= 180.0 ) {
			throw new Error( "Found hole is not a hole, but the outline of an existing triangle." );
		}

		// Add first vertex again to complete the hole.
		geometry.vertices.push( model.geometry.vertices[start.index] );

		return geometry;
	}

};
