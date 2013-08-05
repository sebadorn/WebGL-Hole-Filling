"use strict";


/**
 * Class for finding the hole front.
 * @type {Object}
 */
var HoleFilling = {

	visitedBorderPoints: null,
	debugFlag: false, // TODO: REMOVE


	/**
	 * Change each HalfEdge Vertex into THREE.Vector3.
	 * @param  {Array<Vertex>}        routeComplete Route with HE vertices.
	 * @return {Array<THREE.Vector3>}               Route with THREE vectors.
	 */
	changeVertexToVector: function( routeComplete ) {
		var r = [];

		for( var i = 0; i < routeComplete.length; i++ ) {
			this.visitedBorderPoints.push( routeComplete[i].index );
			r[i] = GLOBAL.MODEL.geometry.vertices[routeComplete[i].index];
		}

		return r;
	},


	/**
	 * Handle the special case where a border point belongs to more than one hole border.
	 * @param  {Vertex}               bp     Multiple border point that triggered this routine.
	 * @param  {Vertex}               start  Starting point of the hole.
	 * @return {Array<THREE.Vector3>}        The border points to add the hole so far in order to complete it.
	 */
	exploreEdgesOfBorderPoint: function( bp, start ) {
		var routes = [];
		var edge, nextBp, result, route, routeComplete;

		var gs = GLOBAL.SCENE,
		    gv = GLOBAL.MODEL.geometry.vertices;

		// TODO: REMOVE
		gs.add( Scene.createPoint( gv[bp.index], 0.03, 0x4499CC, true ) );
		gs.add( Scene.createPoint( gv[start.index], 0.03, 0xEEEE00, true ) );

		// Explore edges
		for( var i = 0; i < bp.edges.length; i++ ) {
			edge = bp.edges[i];

			if( !edge.isBorderEdge() || edge == bp.prev ) {
				continue;
			}

			// Follow the border points of this edge
			result = this.followBorder( edge.vertex, start, bp );

			if( !result ) {
				continue;
			}

			route = result.route;

			// Save result of following this edge
			if( result.completed ) {
				if( routeComplete != null ) {
					throw new Error( "More than one complete route, should not be possible!" );
				}
				routeComplete = route;
			}
			else {
				routes.push( route.slice( 0 ) );
			}
		}

		if( routeComplete == null ) {
			return false;
		}

		routes = this.removeDuplicateRoutes( routes );
		routeComplete = this.mergeWithOtherRoutes( routeComplete, routes );
		routeComplete = this.changeVertexToVector( routeComplete );

		return routeComplete;
	},


	/**
	 * Find the border edges of a hole inside a half-edge structure.
	 * @param  {THREE.Mesh} model  The model to find holes in.
	 * @return {Object}            Arrays of lines and points, depending on configuration.
	 */
	findBorderEdges: function( model ) {
		var mesh = new HalfEdgeMesh( model.geometry );
		var colors = CONFIG.HF.BORDER.COLOR,
		    holes = [],
		    ignoredUnconnected = 0,
		    lines = [],
		    points = [];
		var geometry, line, material, v, vertex;

		this.visitedBorderPoints = [];

		for( var i = 0; i < mesh.vertices.length; i++ ) {
			vertex = mesh.vertices[i];

			if( holes.length == 0 ) {
				this.debugFlag = true;
			}

			// Ignore vertices without any connections/edges
			if( vertex.edges.length == 0 ) {
				ignoredUnconnected++;
				continue;
			}

			if( this.visitedBorderPoints.indexOf( vertex.index ) < 0 && vertex.isBorderPoint() ) {
				// Find connected border points
				try {
					geometry = this.getNeighbouringBorderPoints( model, mesh, vertex );
				}
				catch( err ) {
					console.error( err.name + ": " + err.message );
					console.warn( "Skipping hole." );
					this.visitedBorderPoints.push( vertex.index );
					continue;
				}

				// New hole, add first vertex
				holes.push( [model.geometry.vertices[vertex.index]] );

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
	 * Follow the border points of this edge
	 * @param  {Vertex} nextBp Starting border point.
	 * @param  {Vertex} start  Starting point of hole.
	 * @param  {Vertex} bp     Multi border point we started from.
	 * @return {Object}        Found route and flag if it completes the hole.
	 */
	followBorder: function( nextBp, start, bp ) {
		var completed = false,
		    route = [];

		while( true ) {
			if( nextBp.isBorderPoint() ) {
				route.push( nextBp );

				// We found the route that completes the hole
				if( nextBp == start ) {
					completed = true;
					break;
				}
				// We are back at the (multi) border point
				// and therefore didn't complete the hole
				if( nextBp == bp ) {
					completed = false;
					break;
				}
				nextBp = nextBp.firstEdge.vertex;

				// Sketchy workaround to prevent endless loops
				if( nextBp != start && nextBp != bp && nextBp.isMultiBorderPoint() ) {
					return false;
				}
			}
		}

		return {
			route: route,
			completed: completed
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
		var geometry = new THREE.Geometry(),
		    bpStart = start;
		var bp = bpStart;
		var restOfHole, v;

		while( true ) {
			v = model.geometry.vertices[bp.index];

			if( geometry.vertices.indexOf( v ) < 0 && bp.isBorderPoint() ) {
				geometry.vertices.push( v );

				// Special case
				if( bp.isMultiBorderPoint() ) {
					restOfHole = this.exploreEdgesOfBorderPoint( bp, start );

					if( restOfHole ) {
						geometry.vertices = geometry.vertices.concat( restOfHole );
					}
					break;
				}

				// "Normal" procedure
				this.visitedBorderPoints.push( bp.index );

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
	},


	/**
	 * Ignore "inner holes" and merge complete route with "outer holes".
	 * @param  {Array<Vertex>}        rc     Route that draws the hole so far.
	 * @param  {Array<Array<Vertex>>} routes Other found routes.
	 * @return {Array<Vertex>}               Complete route merged with found "inner holes".
	 */
	mergeWithOtherRoutes: function( rc, routes ) {
		var angleAverage, ixPrev, vp, v, vn;
		var modelVertices = GLOBAL.MODEL.geometry.vertices,
		    routeComplete = rc.slice( 0 );

		for( var i = 0; i < routes.length; i++ ) {
			angleAverage = 0.0;

			for( var j = 0; j < routes[i].length; j++ ) {
				ixPrev = routes[i][j].index - 1;

				vp = modelVertices[ixPrev < 0 ? 0 : ixPrev];
				v = modelVertices[routes[i][j].index];
				vn = modelVertices[(routes[i][j].index + 1 ) % modelVertices.length];

				angleAverage += Utils.computeAngle( vp, v, vn, GLOBAL.MODEL.position );
			}

			angleAverage /= routes[i].length;

			// "outer hole" -> add to complete route
			if( angleAverage >= 180.0 ) {
				console.log( "outer hole", angleAverage ); // TODO: REMOVE

				for( var j = routes[i].length - 1; j >= 0; j-- ) {
					routeComplete.splice( 0, 0, routes[i][j] );
				}
			}
			// "inner hole" -> ignore
			else {
				console.log( "inner hole", angleAverage ); // TODO: REMOVE
			}
		}

		return routeComplete;
	},


	/**
	 * Remove duplicate routes (same hole, but in the other direction).
	 * @param  {Array<Array<Vertex>>} rs All found routes except the complete one.
	 * @return {Array<Array<Vertex>>}    Routes without duplicates.
	 */
	removeDuplicateRoutes: function( rs ) {
		var routes = [];

		for( var i = 0; i < rs.length; i++ ) {
			if( routes.indexOf( rs[i] ) < 0 ) {
				routes.push( rs[i] );
			}
		}

		return routes;
	}

};
