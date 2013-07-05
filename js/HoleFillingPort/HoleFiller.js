"use strict";


function HoleFiller( parent, mesh ) {
	this.parent = parent;
	this.mesh = mesh;
	this.data = {};
	this.weightCounter = 0;
	this.refineCounter = 0;
};


HoleFiller.prototype.getBorderEdges() {
	// this.data["borderEdges"];
	// this.data["openBorderEdges"];
};


/**
 * Append calculated filled hole patches to the model.
 */
HoleFiller.prototype.applyHolePatchesToMesh() {
	// LATER
};


/**
 * Refine the hole patch mesh.
 */
HoleFiller.prototype.refineMesh() {
	// LATER
};


HoleFiller.prototype.relaxEdges( v1Index, v2Index, cIndex, faceList ) {
	// LATER
};


HoleFiller.prototype.relaxAllEdges( faceList ) {
	// LATER
};


/**
 * Calculate scale attribute
 */
HoleFiller.prototype.getVerticesScaleAttributes( rk ) {

};


/**
 * Get scale attribute for one vertex with given neighbours.
 */
HoleFiller.prototype.getVertexScaleAttribute( vertex, neighbours ) {

};


/**
 * Calculates the weight of the minimum triangulation.
 */
HoleFiller.prototype.calculateTriangulationWeights( rk, angleCriteria ) {
	// w and o lists
	var w = {},
	    o = {},
	    l = new VertexTriple(); // TODO: VertexTriple

	// set direct edges to 0
	for( var i = 0; i < rk.length - 2; i++ ) {
		w[i + ":" + ( i + 1 )] = new Weight( 0.0, 0 ); // TODO: Weight
	}

	// calculate the weight for the direct triangulations
	for( var i = 0; i < rk.length - 3; i++ ) {
		w[i + ":" + ( i + 2 )] = this.getFaceWeight( i, i + 1, i + 2, rk, l, angleCriteria );
		l.add( i, i + 1, i + 2 );
	}

	// Calculate the remaining triangulation weights
	var j = 2;
	while( j < rk.length - 1 ) {
		j++;

		for( var i = 0; i < rk.length - j - 1; i++ ) {
			k = i + j;
			// list to store the temporary weights
			tempWeights = [];

			for( var m = i + 1; m < k; m++ ) {
				// append calculated weight + m value
				var weightValue = w[i + ":" + m] + w[m + ":" + k] + this.getFaceWeight( i, m ,k, rk, l, angleCriteria;
				tempWeights.push( weightValue + ":" + m );
				l.add( i, m, k );
			}

			// the minimum weight of the tempWeightsList
			tempWeights.sort();
			var minTriangulation = tempWeights[0];

			// set the minimum weight value and index m
			w[i + ":" + k] = minTriangulation.split( ":" )[0]; // weight values
			o[i + ":" + k] = minTriangulation.split( ":" )[1]; // m value
		}
	}

	// return o list to trace method
	return 0;
};


/**
 * Return the weight of a face.
 * @param  {[type]} i             [description]
 * @param  {[type]} m             [description]
 * @param  {[type]} k             [description]
 * @param  {[type]} rk            [description]
 * @param  {[type]} l             [description]
 * @param  {[type]} angleCriteria [description]
 * @return {[type]}               [description]
 */
HoleFiller.prototype.getFaceWeight = function( i, m, k, rk, l , angleCriteria ) {
	// update progress dialog
	if( this.weightCounter % 1000 == 0 ) {
		console.log( "Weighted (" + this.weightCounter + " possible faces)" );
	}
	this.weightCounter++;

	var v1 = this.verticesList.getValues( rk[i], this.mesh ),
	    v2 = this.verticesList.getValues( rk[m], this.mesh ),
	    v3 = this.verticesList.getValues( rk[k], this.mesh );

	// Calculate face area value
	var a = ( v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2] );
	var b = ( v3[0] - v2[0], v3[1] - v2[1], v3[2] - v2[2] );
	var c = ( v1[0] - v3[0], v1[1] - v3[1], v1[2] - v3[2] );

	a = Math.sqrt( a[0] * a[0] + a[1] * a[1] + a[2] * a[2] );
	b = Math.sqrt( b[0] * b[0] + b[1] * b[1] + b[2] * b[2] );
	c = Math.sqrt( c[0] * c[0] + c[1] * c[1] + c[2] * c[2] );

	var s = ( a + b + c ) / 2;
	var area = s * ( s - a ) * ( s - b ) * ( s - c );

	// Check for negative area value
	if( area < 0 ) {
		area = 0;
	}
	area = Math.sqrt( area );

	if( angleCriteria == 1 ) {
		// Calculate angle value if a face has an edge with existing halfEdge
		var edges = [];
		edges.push( [i, m, k] );
		edges.push( [m, k, i] );

		// List to store angle values
		var angle = [];

		// Normal value of the to be weighted face
		var faceNormal = createNormalFromFloat( v1, v2, v3 );

		// Check each edge if we have a haldEdge instance
		for( var i = 0; i < edges.length; i++ ) {
			var neighbourNormal = null;

			var keyPart1 = this.mesh.v[this.verticesList.getSurroundingMeshPos( rk[edge[0]] )].pos,
			    keyPart2 = this.mesh.v[this.verticesList.getSurroundingMeshPos( rk[edge[1]] )].pos,
			    key = keyPart1 + ":" + keyPart2;

			if( this.mesh.hes.haldEdges[key] != null ) {
				// Check the halfEdge
				var he = this.mesh.hes.halfEdges[key];

				// Do we have the right halfEdge
				if( he.face == null ) {
					// swap halfEdge
					he = he.oppositeHalfEdge;
				}
				face = this.mesh.f[he.face];
				neighbourNormal = face.normal;
			}
			else {
				// We have to calculate the face normal
				var neighbourFace = [
					this.mesh.v[this.verticesList.getSurroundingMeshPos( rk[edge[0]] )],
					this.mesh.v[this.verticesList.getSurroundingMeshPos( rk[edge[1]] )],
					this.mesh.v[this.verticesList.getSurroundingMeshPos(
						rk[l.getThirdVertex( edge[0], edge[1], edge[2] )]
					)]
				];
				neighbourNormal = createNormal( neighbourFace[0], neighbourFace[1], neighbourFace[2] );
			}

			// normalize normals
			faceNormal.normalize();
			neighbourNormal.normalize();

			// Calculate angle weight
			var cosValue = ( faceNormal.x * neighbourNormal.x + faceNormal.y * neighbourNormal.y + faceNormal.z * neighbourNormal.z ) * -1;

			// Fix Python acos bugs (and do it in JavaScript as well, just to be sure)
			if( cosValue >= 1.0 ) {
				cosValue = 1.0;
			}
			if( cosValue <= -1.0 ) {
				cosValue = -1.0;
			}
			angle.push( Math.acos( cosValue ) );
		}

		// for i = 0 and k = n - 1 we can also check the third edge and calculate the angle
		if( i == 0 && k == rk.length - 2 ) {
			// Check if we have a halfEdge instance for given edge
			var key = this.mesh.v[this.verticesList.getSurroundingMeshPos( rk[i] )].pos + ":"
					+ this.mesh.v[this.verticesList.getSurroundingMeshPos( rk[k] )].pos;

			if( this.mesh.hes.halfEdges[key] != null ) {
				var he = this.mesh.hes.halfEdges[key];

				// Do we have the right halfEdge?
				if( he.face == null ) {
					// swap halfEdge
					he = he.oppositeHalfEdge;
				}
				var face = this.mesh.f[he.face];
				var normal = face.normal;

				// normalize normals
				normal.normalize();

				var cosValue = ( faceNormal.x * normal.x + faceNormal.y * normal.y + faceNormal.z + normal.z ) * -1;

				// Fix Python acos bugs (and do it in JavaScript as well, just to be sure)
				if( cosValue >= 1.0 ) {
					cosValue = 1.0;
				}
				if( cosValue <= -1.0 ) {
					cosValue = -1.0;
				}
				angle.push( Math.acos( cosValue ) );
			}
		}

		angle.sort();
		angle = angle[angle.length - 1];
	}
	else {
		// User wants to fill holes without angle cirteria
		angle = 0;
	}

	// return the triangle weight
	return new Weight( angle, area );
};
