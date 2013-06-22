"use strict";


/**
 * Plane.
 * @param {THREE.Vector3} p
 * @param {THREE.Vector3} v1
 * @param {THREE.Vector3} v2
 */
function Plane( p, v1, v2 ) {
	this.p = p.clone();
	this.v1 = v1.clone();
	this.v2 = v2.clone();

	this.p.normalize();
	this.v1.normalize();
	this.v2.normalize();
};


Plane.prototype = {

	constructor: Plane,


	/**
	 * Get a point from the plane.
	 * @param  {float}         s Factor for vector v1.
	 * @param  {float}         t Factor for vector v2.
	 * @return {THREE.Vector3}   Point on the plane.
	 */
	getPoint: function( s, t ) {
		var v1s = this.v1.clone().multiplyScalar( s ),
		    v2t = this.v2.clone().multiplyScalar( t );

		return new THREE.Vector3().copy( this.p ).add( v1s ).add( v2t );
	}

};
