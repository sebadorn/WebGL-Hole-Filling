'use strict';


/**
 * Class for finding the holes.
 * @namespace WebHF.HoleFinding
 */
WebHF.HoleFinding = {


	allVisitedBp: null,
	visitedBp: null,


	/**
	 * Decide the next vertex from the available edges. Do so by choosing
	 * the direction with the smallest angle. This assures for multi border
	 * points that we stay inside the hole and not cross over to another hole.
	 * @param  {THREE.Vector3[]} gv    - The vertices of the hole so far.
	 * @param  {THREE.Vector3}   vPrev - The previous vector.
	 * @param  {Vertex}          bp    - The current border point.
	 * @param  {THREE.Mesh}      model - The model we search holes in.
	 * @return {Vertex} The next vertex to follow.
	 */
	decideNextVertexByAngle( gv, vPrev, bp, model ) {
		const mgv = model.geometry.vertices;
		const nextRoute = {
			angle: 360.0,
			index: -1
	    };
		const v = mgv[bp.index];

		let alreadyVisited = 0;

		for( let i = 0; i < bp.edges.length; i++ ) {
			const ix = bp.edges[i].vertex.index;
			const vNext = mgv[ix];

			if(
				!bp.edges[i].isBorderEdge() ||
				gv.includes( vNext ) ||
				this.allVisitedBp.includes( ix )
			) {
				alreadyVisited++;
				continue;
			}

			const angle = WebHF.Utils.calculateAngle( vPrev, v, vNext, model.position );

			if( angle < nextRoute.angle ) {
				nextRoute.angle = angle;
				nextRoute.index = i;
			}
		}

		// This multi border point has no more edges to offer, so mark him as visited.
		if( alreadyVisited === bp.edges.length - 1 ) {
			this.visitedBp.push( bp.index );
		}

		if( nextRoute.index === -1 ) {
			throw new Error( "Couldn't find edge to follow from multi border point." );
		}

		return bp.edges[nextRoute.index].vertex;
	},


	/**
	 * Find the border edges of a hole inside a half-edge structure.
	 * @param  {THREE.Mesh} model  The model to find holes in.
	 * @return {Object}            Arrays of lines and points, depending on configuration.
	 */
	findBorderEdges( model ) {
		const COLORS = CONFIG.HOLES.COLOR;
		const mesh = new WebHF.HalfEdgeMesh( model.geometry );
		const holes = [];
		const lines = [];
		const points = [];

		let ignoredUnconnected = 0;

		this.allVisitedBp = [];

		for( let i = 0, lenMV = mesh.vertices.length; i < lenMV; i++ ) {
			const vertex = mesh.vertices[i];

			// Ignore vertices without any connections/edges
			if( vertex.edges.length === 0 ) {
				ignoredUnconnected++;
				continue;
			}

			if( !this.allVisitedBp.includes( vertex.index ) && vertex.isBorderPoint() ) {
				this.visitedBp = [];

				let geometry = null;

				// Find connected border points
				try {
					geometry = this.getNeighbouringBorderPoints( model, mesh, vertex );
				}
				catch( err ) {
					console.error( err.name + ': ' + err.message );
					console.warn( 'Skipping hole.' );
					continue;
				}

				holes.push( this.geometryToHoleArray( geometry ) );
				// Add the first vertex of the hole at the beginning
				holes[holes.length - 1].splice( model.geometry.vertices[vertex.index], 0 );

				// Lines
				const material = new THREE.LineBasicMaterial( {
					color: COLORS[lines.length % COLORS.length],
					linewidth: CONFIG.HOLES.LINE_WIDTH
				} );

				const line = new THREE.Line( geometry, material );
				line.position.copy( model.position );
				lines.push( line );

				// Points
				if( CONFIG.HOLES.SHOW_POINTS ) {
					for( let j = 0, lenGV = geometry.vertices.length; j < lenGV; j++ ) {
						const v = geometry.vertices[j];
						points.push( WebHF.SceneManager.createPoint( v, 0.02, 0xA1DA42, true ) );
					}
				}

				this.allVisitedBp = this.allVisitedBp.concat( this.visitedBp );
			}
		}

		if( ignoredUnconnected > 0 ) {
			console.warn( 'Ignored ' + ignoredUnconnected + ' vertices, because they were not part of any edge.' );
		}

		return {
			holes: holes,
			lines: lines,
			points: points
		};
	},


	/**
	 * Put the vertices of the geometry into an array and
	 * calculate a suggestion for the merging threshold.
	 * @param  {THREE.Geometry} geometry - Hole geometry to convert.
	 * @return {object[]} The array with the hole vertices and an extra attribute for the merging threshold.
	 */
	geometryToHoleArray( geometry ) {
		// We need the per-hole-merging-threshold later for the filling process
		const hole = [];
		const len = geometry.vertices.length;

		let thresholdMerging = 0.0;

		for( let i = 0; i < len; i++ ) {
			const v = geometry.vertices[i];
			const vn = geometry.vertices[( i + 1 ) % len];

			hole.push( v );
			thresholdMerging += v.distanceTo( vn );
		}

		thresholdMerging /= len;
		hole.thresholdMerging = Math.round( thresholdMerging * 1000 ) / 1000;

		return hole;
	},


	/**
	 * Get all the connected border points starting from one of the border points.
	 * Returns one hole in the mesh, if there is at least one.
	 * @param  {THREE.Mesh}     model  - The model to search holes in.
	 * @param  {Vertex}         start  - Starting vertex.
	 * @return {THREE.Geometry} Geometry of a hole.
	 */
	getNeighbouringBorderPoints( model, mesh, start ) {
		const geometry = new THREE.Geometry();
		const mgv = model.geometry.vertices;

		let bp = start;
		let v = null;

		while( true ) {
			const vPrev = v;
			v = mgv[bp.index];

			if( !bp.isBorderPoint() ) {
				break;
			}

			if( !bp.isMultiBorderPoint() && geometry.vertices.includes( v ) ) {
				break;
			}

			if( this.allVisitedBp.includes( bp.index ) ) {
				break;
			}

			// Hole completed
			if( vPrev !== null && bp == start ) {
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
				if( vPrev === null ) {
					// ... but if the vertex has a firstEdge, we can use that!
					if( bp.firstEdge === null ) {
						break;
					}
					// As long as the point hasn't already been visited.
					else if( this.visitedBp.includes( bp.firstEdge.vertex.index ) ) {
						break;
					}
				}

				// No previous point for reference, but a firstEdge to use.
				if( vPrev === null ) {
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

		if( geometry.vertices.length === 1 ) {
			throw new Error( "Hole has only 1 vertex. Which isn't really a hole." );
		}

		// Check if it is really a hole and not the outline of an existing triangle.
		const angleAverage = WebHF.Utils.calculateAngleAverage( geometry.vertices, model.position );

		if( angleAverage >= 180.0 ) {
			throw new Error( 'Found hole is not a hole, but the outline of an existing triangle.' );
		}

		// Add first vertex again to complete the hole.
		geometry.vertices.push( model.geometry.vertices[start.index] );

		return geometry;
	}


};
