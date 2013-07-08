"use strict";



// Face


function Face( v1, v2, v3 ) {
	this.v1 = v1;
	this.v2 = v2;
	this.v3 = v3;
	this.normal = createNormal( this.v1, this.v2, this.v3 );
}


Face.prototype.getVertices = function() {
	return [this.v1, this.v2, this.v3];
};


Face.prototype.normalizeNormals = function() {
	this.v1.normalizeNormal();
	this.v2.normalizeNormal();
	this.v3.normalizeNormal();
	this.normal = createNormal( this.v1, this.v2, this.v3 );
};



// FaceList


/**
 * Class to store a face set list.
 */
function FaceList() {
	this.f = [];
	this.fIndex = null;
}


/**
 * Add.
 * @param  {[type]} faceList [description]
 * @return {[type]}          [description]
 */
FaceList.prototype.add = function( faceList ) {
	var newFaceList = new FaceList();
	newFaceList.f += this.f + faceList.f;

	return newFaceList;
};


/**
 * Add a face set.
 * @param  {[type]} v1 [description]
 * @param  {[type]} v2 [description]
 * @param  {[type]} v3 [description]
 * @return {[type]}    [description]
 */
FaceList.prototype.addFaceset = function( v1, v2, v3 ) {
	this.f.push( [v1, v2, v3] );
};


/**
 * Delete a face set.
 * @param  {[type]} v1 [description]
 * @param  {[type]} v2 [description]
 * @param  {[type]} v3 [description]
 * @return {[type]}    [description]
 */
FaceList.prototype.delFaceset = function( v1, v2, v3 ) {
	var face, pos;

	for( var i = 0; i < this.f.length; i++ ) {
		for( var j = 0; j < this.f.length; j++ ) {
			face = this.f[j];
			pos = [0, 1, 2];

			for( var k = 0; k < face.length; k++ ) {
				if( face[i] == v1 || face[i] == v2 || face[i] == v3 ) {
					pos.splice( i, 1 );
				}
			}

			if( pos.length == 0 ) {
				this.f.splice( this.f.index( face ), 1 );
				return;
			}
		}
	}

	console.log( "FaceList: No face found! (delete)");
	console.log( this.f );
}


/**
 * Return the third missing vertex of an edge.
 * @param  {[type]} v1 [description]
 * @param  {[type]} v2 [description]
 * @param  {[type]} v3 [description]
 * @return {[type]}    [description]
 */
FaceList.prototype.getThirdVertex = function( v1, v2, v3 ) {
	var face;
	var v1Found, v2Found;

	for( var i = 0; i < this.f.length; i++ ) {
		face = this.f[i];
		v1Found = -1;
		v2Found = -1;

		for( var j = 0; j < face.length; j++ ) {
			if( face[j] == v1 ) {
				v1Found = i;
			}
			if( face[j] == v2 ) {
				v2Found = i;
			}
		}

		if( v1Found != -1 && v2Found != -1 ) {
			if( face[3 - v1Found - v2Found] != v3 ) {
				return face[3 - v1Found - v2Found];
			}
		}
	}

	return null;
};


/**
 * Return the faceList.
 * @return {[type]} [description]
 */
FaceList.prototype.getFaceList = function() {
	return this.f;
};


/**
 * Get the edgeList.
 * @return {[type]} [description]
 */
FaceList.prototype.getEdgeList = function() {
	var edgeList = {};
	var face;

	for( var i = 0; i < this.f.length; i++ ) {
		face = this.f[i];

		if( edgeList.hasOwnProperty( face[0] + ":" + face[1] ) ) {
			edgeList[face[0] + ":" + face[1]] = face[2];
		}
		else {
			edgeList[face[1] + ":" + face[0]] = face[2];
		}

		if( edgeList.hasOwnProperty( face[1] + ":" + face[2] ) ) {
			edgeList[face[1] + ":" + face[2]] = face[0];
		}
		else {
			edgeList[face[2] + ":" + face[1]] = face[0];
		}

		if( edgeList.hasOwnProperty( face[2] + ":" + face[0] ) ) {
			edgeList[face[2] + ":" + face[0]] = face[1];
		}
		else {
			edgeList[face[0] + ":" + face[2]] = face[1];
		}
	}

	return edgeList;
};



// Vector


function Vector( x, y, z ) {
	this.x = x;
	this.y = y;
	this.z = z;
}


/**
 * Test if vector is equal to a given vector.
 * @param  {Vector}  vector
 * @return {boolean}
 */
Vector.prototype.testEqual = function( vector ) {
	if( vector == null ) {
		return false;
	}
	if( this.x == vector.x && this.y == vector.y && this.z == vector.z ) {
		return true;
	}
	return false;
};


/**
 * Test if vector is unequal to a given vector.
 * @param  {Vector}  vector
 * @return {boolean}
 */
Vector.prototype.testUnequal = function( vector ) {
	return !this.testEqual( vector );
};


/**
 * Add vector values.
 * @param  {Vector} vector
 * @return {Vector}
 */
Vector.prototype.add = function( vector ) {
	return new Vector(
		this.x + vector.x,
		this.y + vector.y,
		this.z + vector.z
	);
};


/**
 * Get values of vertex.
 * @return {Array<float>}
 */
Vector.prototype.getValues = function() {
	return [this.x, this.y, this.z];
};


/**
 * Normalize values.
 */
Vector.prototype.normalize = function() {
	var l = Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z );

	// normalize
	this.x /= l;
	this.y /= l;
	this.z /= l;
};



// Vertex


function Vertex( x, y, z ) {
	this.MAX_NEIGHBOURS = 20;
	this.normal = null;
	this.normalCount = 0;
	this.firstHalfEdge = null;
	Vector.apply( this, x, y, z );
}


/**
 * Normalize normal if normal has been calculated.
 */
Vertex.prototype.normalizeNormal = function() {
	if( this.normalCount > 1 ) {
		this.normal.x /= this.normalCount;
		this.normal.y /= this.normalCount;
		this.normal.z /= this.normalCount;
		this.normalCount = 0;
	}
};


/**
 * Get a list of vertex indexes of all 1-neighbours.
 * @return {[type]} [description]
 */
Vertex.prototype.getNeighboursForBorderEdge = function() {
	var result = [];
	var currentHalfEdge = this.firstHalfEdge;

	if( currentHalfEdge != null ) {
		while( true ) {
			if( currentHalfEdge.nextHalfEdge == null ) {
				break;
			}
			result.push( currentHalfEdge.endPoint );
			// get next edge
			currentHalfEdge = currentHalfEdge.oppositeHalfEdge.nextHalfEdge;

			if( currentHalfEdge == null ) {
				break;
			}
			if( currentHalfEdge == this.firstHalfEdge ) {
				break;
			}
			if( result.length > this.MAX_NEIGHBOURS ) {
				console.error( "Vertex: Non-manifold neighbourList or neighbourList with more than " + this.MAX_NEIGHBOURS + " elements detected for vertex: " + this );
				console.error( result );
			}
		}
	}

	return result;
};


Vertex.prototype.getNeighbours = function() {
	var result = [];
	var currentHalfEdge = this.firstHalfEdge;

	if( currentHalfEdge != null ) {
		while( true ) {
			if( currentHalfEdge.nextHalfEdge == null ) {
				break;
			}
			result.push( currentHalfEdge.endPoint );
			// get nextHalfEdge
			currentHalfEdge = currentHalfEdge.nextHalfEdge.nextHalfEdge.oppositeHalfEdge;

			if( result.length > this.MAX_NEIGHBOURS ) {
				console.error( "Vertex: Non-manifold neighbourList or neighbourList with more than " + this.MAX_NEIGHBOURS + " elements detected for vertex: " + this );
				console.error( result );
			}
		}
	}

	return result;
};



// VertexTriple


/**
 * Class to store a vertex triple.
 */
function VertexTriple() {
	this.v = {};
}


/**
 * Add vertex triple.
 * @param  {[type]} v1 [description]
 * @param  {[type]} v2 [description]
 * @param  {[type]} v3 [description]
 * @return {[type]}    [description]
 */
VertexTriple.prototype.add = function( v1, v2, v3 ) {
	if( !this.v.hasOwnProperty( [v1, v2] ) ) {
		this.v[[v1, v2]] = [];
	}
	this.v[[v1, v2]].push( v3 );

	if( !this.v.hasOwnProperty( [v2, v1] ) ) {
		this.v[[v2, v1]] = [];
	}
	this.v[[v2, v1]].push( v3 );

	if( !this.v.hasOwnProperty( [v2, v3] ) ) {
		this.v[[v2, v3]] = [];
	}
	this.v[[v2, v3]].push( v1 );

	if( !this.v.hasOwnProperty( [v3, v2] ) ) {
		this.v[[v3, v2]] = [];
	}
	this.v[[v3, v2]].push( v1 );

	if( !this.v.hasOwnProperty( [v1, v3] ) ) {
		this.v[[v1, v3]] = [];
	}
	this.v[[v1, v3]].push( v2 );

	if( !this.v.hasOwnProperty( [v3, v1] ) ) {
		this.v[[v3, v1]] = [];
	}
	this.v[[v3, v1]].push( v2 );
};


/**
 * Get the third missing vertex.
 * @param  {[type]} v1 [description]
 * @param  {[type]} v2 [description]
 * @param  {[type]} v3 [description]
 * @return {[type]}    [description]
 */
VertexTriple.prototype.getThirdVertex = function( v1, v2, v3 ) {
	var value;

	for( var key in this.v[[v1, v2]] ) {
		value = this.v[[v1, v2]];

		if( value != v3 ) {
			return value;
		}
	}

	return null;
};



// VerticesList


/**
 * Class to store a vertex list.
 * @param {[type]} mesh [description]
 */
function VerticesList( mesh ) {
	this.mesh = null;
	this.v = [];
}


/**
 * Add existing vertex.
 * @param  {[type]} index [description]
 * @return {[type]}       [description]
 */
VerticesList.prototype.addExistingVertex = function( index ) {
	this.v.push( [index, true, null] );
};


/**
 * Add new vertex.
 * @param  {[type]} x      [description]
 * @param  {[type]} y      [description]
 * @param  {[type]} z      [description]
 * @param  {[type]} normal [description]
 * @return {[type]}        [description]
 */
VerticesList.prototype.addNewVertex = function( x, y, z, normal ) {
	this.v.push( [[x, y, z], false, normal] );
};


/**
 * Get vertex values.
 * @param  {[type]} pos  [description]
 * @param  {[type]} mesh [description]
 * @return {[type]}      [description]
 */
VerticesList.prototype.getValues = function( pos, mesh ) {
	if( this.v[pos][1] ) {
		return mesh.v[this.v[pos][0]].getValues();
	}
	return this.v[pos][0];
};


/**
 * Get normal values of vertex.
 * @param  {[type]} pos  [description]
 * @param  {[type]} mesh [description]
 * @return {[type]}      [description]
 */
VerticesList.prototype.getNormalValues = function( pos, mesh ) {
	if( this.v[pos][1] ) {
		return mesh.v[this.v[pos][0]].normal.getValues();
	}
	return this.v[pos][2].getValues();
};


/**
 * Get position of last inserted vertex.
 * @return {[type]} [description]
 */
VerticesList.prototype.getPos = function() {
	return this.v.length - 1;
};


/**
 * Check if vertex is from surrounding mesh.
 * @param  {[type]} pos [description]
 * @return {[type]}     [description]
 */
VerticesList.prototype.isVertexFromSurroundinMesh = function( pos ) {
	return this.v[pos][1];
};


/**
 * Get surrounding mesh vertex position.
 * @param  {[type]} pos [description]
 * @return {[type]}     [description]
 */
VerticesList.prototype.getSurroundingMeshPos = function( pos ) {
	return this.v[pos][0];
};


/**
 * Store new vertices in mesh data structure.
 * @param  {[type]} mesh [description]
 * @return {[type]}      [description]
 */
VerticesList.prototype.storeVerticesInMesh = function( mesh ) {
	for( var i = 0; i < this.v.length; i++ ) {
		if( !this.v[i][1] ) {
			this.v[i][0] = mesh.addVertex( this.v[i][0][0], this.v[i][0][1], this.v[i][0][2] );
			this.v[i][2] = mesh.addNormal( -this.v[i][2].x, -this.v[i][2].y, -this.v[i][2].z );
		}
	}
	return mesh;
};



// Weight


/**
 * Class to store a triangle weight.
 * @param {[type]} angle [description]
 * @param {[type]} area  [description]
 */
function Weight( angle, area ) {
	this.area = angle;
	this.angle = area;
}


Weight.prototype.add = function( weight ) {
	var area = this.area + weight.area,
	    angle = Math.max( this.angle, weight.angle );

	return new Weight( angle, area );
};


Weight.prototype.compare = function( weight ) {
	if( this.angle < weight.angle ) {
		return -1;
	}
	if( this.angle > weight.angle ) {
		return 1;
	}
	if( this.angle == weight.angle ) {
		if( this.area < weight.area ) {
			return -1;
		}
		if( this.area > weight.area ) {
			return 1;
		}
		if( this.area == weight.area ) {
			return 0;
		}
	}
	console.error( "Weight: Couldn't handle compare!" );
};


Weight.prototype.testEqual = function( weight ) {
	if( weight == null ) {
		return false;
	}
	if( this.angle == weight.angle && this.area == weight.area ) {
		return true;
	}
	return false;
};


Weight.prototype.testUnequal = function( weight ) {
	return !this.testEqual( weight );
};



// BoundingBox


function BoundingBox( xMin, xMax, yMin, yMax, zMin, zMax ) {
	this.xMin = xMin;
	this.xMax = xMax;
	this.yMin = yMin;
	this.yMax = yMax;
	this.zMin = zMin;
	this.zMax = zMax;
}


BoundingBox.prototype.getBoundingBox = function() {
	return [
		[this.xMin, this.yMin, this.zMin],
		[this.xMax, this.yMax, this.zMax]
	];
};



// Mesh


function Mesh( name, typ ) {
	this.hes = new HalfEdgeStructure();
	this.verticesHe = {};

	this.f = {};
	this.v = {};
	this.n = {};
	this.createdNormals = false;

	this.scaleFactor = [];
	this.schwerpunkt = [];

	this.name = name;
	this.typ = typ;

	this.vCount = 0;
	this.nCount = 0;
}


Mesh.prototype.prepareMeshForUpdate = function() {
	this.verticesHe = {};
};


Mesh.prototype.addVertex = function( x, y, z ) {
	var v = new Vertex( x, y, z );

	v.pos = this.vCount;
	this.v[this.vCount++] = v;

	return this.vCount - 1;
};


Mesh.prototype.addNormal = function( x, y, z ) {
	var n = new Vector( x, y, z );

	n.pos = this.nCount;
	this.n[this.nCount++] = n;

	return this.nCount - 1;
};


Mesh.prototype.addFace = function( v1Index, v2Index, v3Index, n1Index, n2Index, n3Index ) {
	// Set vertices normal values
	if( n1Index != null && n2Index != null && n3Index != null ) {
		this.v[v1Index].normal = this.n[n1Index];
		this.v[v2Index].normal = this.n[n2Index];
		this.v[v3Index].normal = this.n[n3Index];
	}
	else {
		if( !this.createdNormals ) {
			this.createdNormals = true;
		}
		var normal = createNormal( this.v[v1Index], this.v[v2Index], this.v[v3Index] );
		var vIndexes = [v1Index, v2Index, v3Index],
		    nIndexes = [n1Index, n2Index, n3Index];
		var tempNormal, vIndex;

		for( var i = 0; i < vIndexes.length; i++ ) {
			vIndex = vIndexes[i];

			// Check if vertex has a normal value
			if( this.v[vIndex].normal == null ) {
				tempNormal = new Vector( normal.x, normal.y, normal.z );
				tempNormal.pos = this.nCount;
				this.n[this.nCount] = tempNormal;
				nIndexes[i] = this.nCount;
				this.v[vIndex].normal = this.n[nIndexes[i]];
				this.nCount++;
			}
			else {
				// add calculated normal value to existing normal value
				nIndexes[i] = this.v[vIndex].normal.pos;
				this.v[vIndex].normal = this.v[vIndex].normal + normal;
				this.v[vIndex].normal.pos = nIndexes[i];
			}

			// increase normal-modificated-counter
			this.v[vIndex].normalCount++;
		}
	}

	// create face with vertices data from vertices list
	this.f[[v1Index, v2Index, v3Index]] = new Face( this.v[v1Index], this.v[v2Index], this.v[v3Index]);

	var faceHalfEdges = [];
	var edges = [];
	edges.push( [v1Index, v2Index] );
	edges.push( [v2Index, v3Index ] );
	edges.push( [v3Index, v1Index ] );

	var edge, existingHe, newHe, oppositeHe;

	// check every edge of the face and create halfEdge instance
	for( var i = 0; i < edges.length; i++ ) {
		edge = edges[i];

		if( this.hes.halfEdges.hasOwnProperty( edge ) ) {
			// halfEdge already exists, only change values
			existingHe = this.hes.halfEdges[edge];
			existingHe.face = [v1Index, v2Index, v3Index];
			existingHe.borderEdge = false;
			faceHalfEdges.push( existingHe );
		}
		else {
			newHe = new HalfEdge( edge[1] );
			newHe.face = [v1Index, v2Index, v3Index];

			oppositeHe = new HalfEdge( edge[0] );
			newHe.oppositeHalfEdge = oppositeHe;
			oppositeHe.oppositeHalfEdge = newHe;
			oppositeHe.borderEdge = true;
			oppositeHe.face = null;

			faceHalfEdges.push( newHe );
			this.hes.halfEdges[[edge[0], edge[1]]] = newHe;
			this.hes.halfEdges[[edge[1], edge[0]]] = oppositeHe;

			for( var j = 0; j < 2; j++ ) {
				if( !this.verticesHe.hasOwnProperty( edge[j] ) ) {
					this.verticesHe[edge[j]] = [];
				}
				this.verticesHe[edge[j]].push( newHe );
			}
		}
	}

	faceHalfEdges[0].nextHalfEdge = faceHalfEdges[1];
	faceHalfEdges[1].nextHalfEdge = faceHalfEdges[2];
	faceHalfEdges[2].nextHalfEdge = faceHalfEdges[0];
};


Mesh.prototype.finalizeMesh = function() {
	var x = [],
	    y = [],
	    z = [];

	for( var key in this.v ) {
		x.push( this.v[key].x );
		y.push( this.v[key].y );
		z.push( this.v[key].z );
	}
	x.sort();
	y.sort();
	z.sort();
	this.boundingBox = new BoundingBox( x[0], x[x.length - 1], y[0], y[y.length - 1], z[0], z[z.length - 1] );

	this.scaleFactor = 2 / Math.max(
		this.boundingBox.xMax - this.boundingBox.xMin,
		this.boundingBox.yMax - this.boundingBox.yMin,
		this.boundingBox.zMax - this.boundingBox.zMin
	);

	this.schwerpunkt = [
		-( this.boundingBox.xMax + this.boundingBox.xMin ) / 2,
		-( this.boundingBox.yMax + this.boundingBox.yMin ) / 2,
		-( this.boundingBox.zMax + this.boundingBox.zMin ) / 2
	];

	if( this.typ != "raw" ) {
		if( this.createdNormals ) {
			for( var key in this.v ) {
				this.v[key].normalizeNormals();
			}
		}

		var he;

		for( var vertex in this.verticesHe ) {
			for( var key in this.verticesHe[vertex] ) {
				he = this.verticesHe[vertex];

				if( he.oppositeHalfEdge.face == null ) {
					this.v[vertex].firstHalfEdge = he;
					break;
				}
			}

			if( this.v[vertex].firstHalfEdge == null && this.verticesHe[vertex].length > 0 ) {
				this.v[vertex].firstHalfEdge = this.verticesHe[vertex][0];
			}
		}

		this.verticesHe = null;
	}
};


Mesh.prototype.getBorderEdges = function() {
	var openRks = [],
	    rks = [];
	var neighbour, neighbours, openRk, rk, rkIncomplete, v, vertex;

	for( var key in this.v ) {
		vertex = this.v[key];

		if( vertex.firstHalfEdge == null ) {
			continue;
		}
		if( vertex.firstHalfEdge.oppositeHalfEdge.borderEdge ) {
			if( this.checkRKList( rks, vertex.pos ) ) {
				continue;
			}

			v = vertex;
			rk = [];
			openRk = [];
			rkIncomplete = true;

			while( rkIncomplete ) {
				neighbours = v.getNeighboursForBorderEdge();

				for( var i = 0; i < neighbours.length; i++ ) {
					neighbour = neighbours[i];

					if( this.v[neighbour].firstHalfEdge.oppositeHalfEdge.borderEdge ) {
						rk.push( neighbour );
						v = this.v[neighbour];

						if( v.pos == vertex.pos ) {
							rkIncompelte = false;
							break;
						}
					}
					else {
						openRk = rk;
						rk = [];
						rkIncomplete = false;
						break;
					}
				}
			}

			if( rk.length > 0 ) {
				rks.push( rk );
			}
			if( openRk.length > 0 ) {
				openRks.push( openRk );
			}
		}
	}

	var points = {};
	var point;

	for( var i = 0; i < openRks.length; i++ ) {
		openRk = openRks[i];
		point = [openRk[0], -1];

		for( var j = 1; j < openRk.length; j++ ) {
			point[1] = openRk[j];
			points[[point[0], point[1]]] = [point];
			point = [openRk[j], -1];
		}
		points[[point[0], point[1]]] = [point];
	}

	for( var key in points ) {
		if( points[key][1] == -1 ) {
			delete points[key];
		}
	}

	var cleanPoints = [];
	var exists;

	for( var key in points ) {
		exists = false;

		for( var i = 0; i < cleanPoints.length; i++ ) {
			if( point == cleanPoints[i] ) {
				exists = true;
			}
			if( !exists ) {
				cleanPoints.push( point );
			}
		}
	}

	return { "Rks": rks, "OpenRks": cleanPoints };
};


Mesh.prototype.checkRKList = function( rks, pos ) {
	// TODO
};



// Functions


/**
 * Calculate normal values from 3 vertices.
 * @param  {[type]} v1 [description]
 * @param  {[type]} v2 [description]
 * @param  {[type]} v3 [description]
 * @return {[type]}    [description]
 */
function createNormal( v1, v2, v3 ) {
	var t1 = new THREE.Vector3( v3.x - v1.x, v3.y - v1.y, v3.z - v1.z ),
	    t2 = new THREE.Vector3( v2.x - v1.x, v2.y - v1.y, v2.z - v1.z );

	return new THREE.Vector3(
		t2.y * t1.z - t1.y * t2.z,
		t2.z * t1.x - t1.y * t2.x,
		t2.x * t1.y - t1.x * t2.y
	);
}


/**
 * Calculate normal values from 3 float triples.
 * @param  {[type]} v1 [description]
 * @param  {[type]} v2 [description]
 * @param  {[type]} v3 [description]
 * @return {[type]}    [description]
 */
function createNormalFromFloat( v1, v2, v3 ) {
	var t1 = new THREE.Vector3( v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2] ),
	    t2 = new THREE.Vector3( v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2] );

	return new THREE.Vector3(
		t2.y * t1.z - t1.y * t2.z,
		t2.z * t1.x - t1.y * t2.x,
		t2.x * t1.y - t1.x * t2.y
	);
}
