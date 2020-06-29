'use strict';


{

class HalfEdgeMesh {


	/**
	 * Mesh.
	 * (Original Java code by Henning Tjaden.)
	 * @constructor
	 * @param {THREE.Geometry} data
	 */
	constructor( data ) {
		this.data = data;
		this.edges = [];
		this.vertices = [];
		this.borderEdges = [];

		this.buildMesh();
	}


	/**
	 * Build the mesh.
	 */
	buildMesh() {
		const faces = this.data.faces;
		const tempList = [];

		for( let i = 0; i < this.data.vertices.length; i++ ) {
			this.vertices[i] = new WebHF.Vertex( i );
			tempList[i] = [];
		}

		for( let f = 0; f < this.data.faces.length; f++ ) {
			this.edges[f] = [];
		}

		for( let l = 0; l < faces.length; l++ ) {
			this.createEdges( faces[l], l );
			const faceArr = [faces[l].a, faces[l].b, faces[l].c];

			for( let i = 0; i < 3; i++ ) {
				for( let j = 0; j < 3; j++ ) {
					if( faceArr[i] < faceArr[j] ) {
						tempList[faceArr[i]].push( [faceArr[j], l] );
					}
				}
			}
		}

		this.findAdjacency( tempList );
		this.setFirstEdges();

		for( let i = 0; i < tempList.length; i++ ) {
			for( let j = 0; j < tempList[i].length; j++ ) {
				const v = tempList[i][j];

				if( v[0] >= 0 ) {
					const borderEdge = [parseInt( i, 10 ), v[0]];
					this.borderEdges.push( borderEdge );
				}
			}
		}
	}


	/**
	 * Connect edges.
	 * @param {number} v1
	 * @param {number} v2
	 * @param {number} f1
	 * @param {number} f2
	 */
	connectEdges( v1, v2, f1, f2 ) {
		let p1 = null;
		let p2 = null;

		for( let i = 0; i < this.edges[f1].length; i++ ) {
			const e = this.edges[f1][i];

			if(
				Math.min( e.vertex.index, e.q.index ) === Math.min( v2, v1 ) &&
				Math.max( e.vertex.index, e.q.index ) === Math.max( v2, v1 )
			) {
				p1 = e;
			}
		}

		for( let i = 0; i < this.edges[f2].length; i++ ) {
			const e = this.edges[f2][i];

			if(
				Math.min( e.vertex.index, e.q.index ) === Math.min( v2, v1 ) &&
				Math.max( e.vertex.index, e.q.index ) === Math.max( v2, v1 )
			) {
				p2 = e;
			}
		}

		p1.pair = p2;
		p2.pair = p1;
	}


	/**
	 * Create edges.
	 * @param {THREE.Face3} face
	 * @param {number}      faceIndex
	 */
	createEdges( face, faceIndex ) {
		const faceArr = [face.a, face.b, face.c];
		const firstEdge = new WebHF.Edge( this.vertices[face.b], this.vertices[face.a], faceIndex );

		let previous = firstEdge;

		this.vertices[face.a].edges.push( firstEdge );

		for( let i = 1; i < 3; i++ ) {
			const ix = ( i + 1 ) % 3;
			const current = new WebHF.Edge( this.vertices[faceArr[ix]], this.vertices[faceArr[i]], faceIndex );

			this.vertices[faceArr[i]].edges.push( current );
			previous.next = current;

			this.edges[faceIndex].push( previous );
			previous = current;
		}

		previous.next = firstEdge;
		this.edges[faceIndex].push( previous );
	}


	/**
	 * Find adjacency.
	 * @param {object[]} tempList
	 */
	findAdjacency( tempList ) {
		for( let i = 0; i < tempList.length; i++ ) {
			for( let j = 0; j < tempList[i].length; j++ ) {
				const v1 = tempList[i][j];

				for( let k = 0; k < tempList[i].length; k++ ) {
					const v2 = tempList[i][k];

					if(
						v1[0] > 0 &&
						v2[0] > 0 &&
						v1[0] == v2[0] &&
						v1[1] != v2[1]
					) {
						this.connectEdges( i, v1[0], v1[1], v2[1] );
						v1[0] = -1;
						v2[0] = -1;
					}
				}
			}
		}
	}


	/**
	 * Set first edges.
	 */
	setFirstEdges() {
		for( let i = 0; i < this.vertices.length; i++ ) {
			this.vertices[i].setUpFirstEdge();
		}
	}


}


WebHF.HalfEdgeMesh = HalfEdgeMesh;

}
