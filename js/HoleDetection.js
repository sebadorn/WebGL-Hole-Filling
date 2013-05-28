"use strict";


/**
 * Detect holes in the mesh.
 * @type {Object}
 */
var HoleDetection = {

	/**
	 * Naive detection. Slow.
	 * @param {THREE.Mesh} mesh The mesh to find the holes in.
	 */
	naive: function( mesh ) {
		var mesh = GLOBAL.MODEL;
		var v = mesh.geometry.vertices;

		console.log( mesh );
	},


	/**
	 * Detection using a Kd-tree. Not so slow.
	 * @param {THREE.Mesh} mesh The mesh to find the holes in.
	 */
	kdtree: function( mesh ) {
		//
	}

};
