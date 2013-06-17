"use strict";


/**
 * KFU Projection developed by Kalbe, Fuhrmann, and Uhrig at TU Darmstadt.
 * Roughly implemented as described in their paper "A new projection
 * method for point set surfaces".
 * 
 * Projection a point from the border of a hole further into the hole
 * in order to use the new point in an advancing front algorithm.
 * This uses a variation of the Moving Least-Squares (MLS) algorithm.
 * @type {Object}
 */
var PointProjection = {

	/**
	 * Smoothing factor for the weighting function.
	 * @type {float}
	 */
	h: null,

	border: null,
	mesh: null,


	/**
	 * Prepare the point projection.
	 * Normally this would include generating a first mesh using the Cocone algorithm.
	 * But we already have a mesh at this point and hopefully can use it.
	 * @param {THREE.Mesh}        mesh   The mesh to fill a hole in.
	 * @param {Array<THREE.Line>} border The border around the hole.
	 */
	prepare: function( mesh, border ) {
		this.mesh = mesh;
		this.border = border;
	},


	buildMatrix: function() {
		var matrix = [];

		for( var j = 1; j < N; j++ ) {
			this.weight( this.riemann( pi, pj ) );
		}
	},


	buildVector: function() {
		var vector = [];

		for( var j = 1; j < N; j++ ) {
			this.weight( this.riemann( pi, pj ) );
		}
	},


	/**
	 * Weighting function.
	 * @param  {int}   degree Degree of the polynomial.
	 * @return {float}        Calculated weight.
	 */
	weight: function( degree ) {
		var exponent = ( degree * degree ) / ( this.h * this.h );

		return Math.pow( Math.E, -exponent );
	},


	/**
	 * Calculate the Riemannian distance using the Euclidean distance.
	 * @param  {THREE.Vector3} p1 Point 1.
	 * @param  {THREE.Vector3} p2 Point 2.
	 * @return {?}
	 */
	riemann: function( p1, p2 ) {
		// TODO, but WHAT and HOW?!
	},


	solveEquation: function() {
		// A * c = d
	},


	/**
	 * Euclidean distance between two points.
	 * @param  {THREE.Vector3} p1 Point 1.
	 * @param  {THREE.Vector3} p2 Point 2.
	 * @return {?}
	 */
	euclid: function( p1, p2 ) {
		// TODO
	},


	/**
	 * Get the projection for a point p.
	 * @param  {THREE.Vector3} p The point to get a projection for.
	 * @return {THREE.Vector3}   Projection of the point.
	 */
	getProjection: function( p ) {
		// TOD
	}

};
