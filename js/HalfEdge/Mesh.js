"use strict";


/**
 * Mesh.
 * (Original Java code by Henning Tjaden.)
 * @param {Object} data
 */
function Mesh( data ) {
	this.data = data;
	this.edges = {};
	this.vertices = {};
	this.borderEdges = [];

	this.buildMesh();
}


/**
 * Build the mesh.
 */
Mesh.prototype.buildMesh = function() {
	var tempList = {};

	for( var i = 0; i < this.data.vertices.length; i++ ) {
		this.vertices[i] = new Vertex( i );
		tempList[i] = [];
	}

	for( var f = 0; f < this.data.faces.length; f++ ) {
		this.edges[f] = [];
	}

	var faces = this.data.faces;

	for( var j = 0; j < faces.length; j++ ) {
		this.createEdges( faces[j], j );

		for( var k = 0; k < faces[j].length; k++ ) {
			var faceArr = [faces[j].x, faces[j].y, faces[j].z];

			for( var m = 0; m < faceArr[k].length; m++ ) {
				if( faceArr[k] < faceArr[m] ) {
					var v = [faceArr[m], j];

					tempList[faceArr[k]].push( v );
				}
			}
		}
	}

	this.findAdjacency( tempList );
	this.setFirstEdges();

	for( var key in tempList ) {
		if( !tempList.hasOwnProperty( key ) ) {
			continue;
		}

		for( var i = 0; i < tempList[key].length; i++ ) {
			var v = tempList[key];

			if( v[0] >= 0 ) {
				var borderEdge = [parseInt( key, 10 ), v[0]];

				this.borderEdges.push( borderEdge );
			}
		}
	}
};


/**
 * Connect edges.
 * @param {int} v1
 * @param {int} v2
 * @param {int} f1
 * @param {int} f2
 */
Mesh.prototype.connectEdges = function( v1, v2, f1, f2 ) {
	var p1 = null,
	    p2 = null;
	var e;

	for( var i = 0; i < this.edges[f1].length; i++ ) {
		e = this.edges[f1][i];

		if( Math.min( e.vertex.index, e.q.index ) == Math.min( v2, v1 )
		    && Math.max( e.vertex.index, e.q.index ) == Math.max( v2, v1 ) ) {
			p1 = e;
		}
	}

	for( var i = 0; i < this.edges[f2].length; i++ ) {
		e = this.edges[f1][i];

		if( Math.min( e.vertex.index, e.q.index ) == Math.min( v2, v1 )
		    && Math.max( e.vertex.index, e.q.index ) == Math.max( v2, v1 ) ) {
			p2 = e;
		}
	}

	p1.pair = p2;
	p2.pair = p1;
};


/**
 * Create edges.
 * @param {Array} face
 * @param {int}   faceIndex
 */
Mesh.prototype.createEdges = function( face, faceIndex ) {
	var firstEdge = new Edge( this.vertices[face.b], this.vertices[face.a], null, null, faceIndex, null );
	var previous = firstEdge;
	var faceArr = [face.a, face.b, face.c];

	this.vertices[face.a].edges.push( firstEdge );

	for( var i = 1; i < faceArr.length; i++ ) {
		var ix = ( i + 1 ) % faceArr.length;
		var current = new Edge( this.vertices[faceArr[ix]], this.vertices[faceArr[i]], null, null, faceIndex, null );

		this.vertices[faceArr[i]].edges.push( current );
		previous.next = current;
		this.edges[faceIndex].push( previous );
		previous = current;
	}

	previous.next = firstEdge;
	this.edges[faceIndex].push( previous );
};


/**
 * Find adjacency.
 * @param {Dictionary} tempList
 */
Mesh.prototype.findAdjacency = function( tempList ) {
	var i, v1, v2;

	for( var key in tempList ) {
		if( !tempList.hasOwnProperty( key ) ) {
			continue;
		}

		i = parseInt( key, 10 );

		for( var j = 0; j < tempList[key].length; j++ ) {
			v1 = tempList[key][j];

			for( var k = 0; k < tempList[key].length; k++ ) {
				v2 = tempList[key][k];

				if( v1[0] > 0 && v2[0] > 0 && v1[0] == v2[0] && v1[1] != v2[1] ) {
					this.connectEdges( i, v1[0], v1[1], v2[1] );
					v1[0] = -1;
					v2[0] = -1;
				}
			}
		}
	}
};


/**
 * Get the vector length.
 * @param  {Array} a Vector.
 * @param  {Array} b Vector.
 * @return {float}   Vector length.
 */
Mesh.prototype.getVectorLength = function( a, b ) {
	var pow0 = Math.pow( a[0] - b[0], 2.0 ),
	    pow1 = Math.pow( a[1] - b[1], 2.0 ),
	    pow2 = Math.pow( a[2] - b[2], 2.0 );

	return Math.sqrt( pow0 + pow1 + pow2 );
};


/**
 * Set first edges.
 */
Mesh.prototype.setFirstEdges = function() {
	for( var i = 0; i < this.vertices.length; i++ ) {
		this.vertices[i].setUpFirstEdge();
	}
};


/**
 * Smoothes the mesh using the umbrella operator.
 */
Mesh.prototype.smooth = function() {
	var vs = data.vertices,
	    vsCopy = [];
	var v;

	for( var i = 0; i < vs.length; i++ ) {
		vsCopy[i] = vs[i].slice( 0 );
	}

	for( var j = 0; j < this.vertices.length; j++ ) {
		v = this.vertices[i];

		if( !v.isBorderPoint() ) {
			var nbs = v.getNeighbours();
			var e = 0.0;
			var vNew = [];

			for( var k = 0; k < nbs.length; k++ ) {
				var nb = nbs[k];
				var len = this.getVectorLength( vsCopy[nb], vsCopy[v.index] );

				vNew[0] += ( vsCopy[v.index][0] - vsCopy[nb][0] ) / len;
				vNew[1] += ( vsCopy[v.index][1] - vsCopy[nb][1] ) / len;
				vNew[2] += ( vsCopy[v.index][2] - vsCopy[nb][2] ) / len;
				e += 1.0 / len;
			}

			if( e === Infinity ) {
				vs[v.index][0] -= vNew[0] / e;
				vs[v.index][1] -= vNew[1] / e;
				vs[v.index][2] -= vNew[2] / e;
			}
		}
	}
};
