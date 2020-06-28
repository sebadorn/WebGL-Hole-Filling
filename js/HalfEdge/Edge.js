'use strict';


{

class Edge {


	/**
	 * Edge structure.
	 * (Original Java code by Henning Tjaden.)
	 * @param {WebHF.Vertex} vertex
	 * @param {WebHF.Vertex} q
	 * @param {number}       face   - Index of the face.
	 */
	constructor( vertex, q, face ) {
		this.vertex = vertex;
		this.q = q;
		this.next = null;
		this.pair = null;
		this.face = face;
		this.prev = null;
	}


	/**
	 * Check if the edge is a border edge.
	 * @return {boolean} True, if edge is a border edge, false otherwise.
	 */
	isBorderEdge() {
		return ( this.pair === null );
	}


}


WebHF.Edge = Edge;

}
