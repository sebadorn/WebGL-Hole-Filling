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

	this.normal = new THREE.Vector3().crossVectors(
		this.v1.clone().sub( this.p ),
		this.v2.clone().sub( this.p )
	);
	this.normal.normalize();
}


/**
 * Get a point from the plane.
 * @param  {float}         s Factor for vector v1.
 * @param  {float}         t Factor for vector v2.
 * @return {THREE.Vector3}   Point on the plane.
 */
Plane.prototype.getPoint = function( s, t ) {
	var v1s = this.v1.clone().multiplyScalar( s ),
	    v2t = this.v2.clone().multiplyScalar( t );

	return new THREE.Vector3().copy( this.p ).add( v1s ).add( v2t );
};


/**
 * Get the point of intersection of the plane and a given line.
 * @param  {THREE.Vector3} vStart Start of the line to find the intersection with.
 * @param  {THREE.Vector3} vEnd   End of the line to find the intersection with.
 * @return {THREE.Vector3}        Point of intersection or false if no intersection.
 */
Plane.prototype.getIntersection = function( vStart, vEnd ) {
	var numerator = this.normal.dot( this.p.clone().sub( vStart ) ),
	    denumerator = this.normal.dot( vEnd.clone().sub( vStart ) );

	if( denumerator == 0 ) {
		return false;
	}

	var r = numerator / denumerator;

	if( r < 0 || r > 1 ) {
		return false;
	}

	return vStart.clone().add( vEnd.clone().sub( vStart ).multiplyScalar( r ) );
};
