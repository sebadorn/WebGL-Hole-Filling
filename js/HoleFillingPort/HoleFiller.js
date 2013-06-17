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
		w[( i, i + 1 )] = new Weight( 0.0, 0 ); // TODO: Weight
	}

	// Calculate the weight for the direct triangulations
};
