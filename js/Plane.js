'use strict';


{

class Plane {


	/**
	 *
	 * @constructor
	 * @param {THREE.Vector3} p
	 * @param {THREE.Vector3} v1
	 * @param {THREE.Vector3} v2
	 */
	constructor( p, v1, v2 ) {
		this.p = p.clone();
		this.v1 = v1.clone();
		this.v2 = v2.clone();

		this.normal = new THREE.Vector3().crossVectors(
			this.v1.clone().sub( this.p ),
			this.v2.clone().sub( this.p )
		);
		this.normal.normalize();
	}


	/**
	 * Get a point from the plane.
	 * @param  {number} s - Factor for vector v1.
	 * @param  {number} t - Factor for vector v2.
	 * @return {THREE.Vector3} Point on the plane.
	 */
	getPoint( s, t ) {
		const v1s = this.v1.clone().sub( this.p ).multiplyScalar( s );
		const v2t = this.v2.clone().sub( this.p ).multiplyScalar( t );

		return this.p.clone().add( v1s ).add( v2t );
	}


	/**
	 * Get the point of intersection of the plane and a given line.
	 * Source: http://geomalgorithms.com/a06-_intersect-2.html
	 * @param  {THREE.Vector3} vStart - Start of the line to find the intersection with.
	 * @param  {THREE.Vector3} vEnd   - End of the line to find the intersection with.
	 * @return {THREE.Vector3} Point of intersection or false if no intersection.
	 */
	getIntersection( v0, v1 ) {
		const vStart = v0.clone();
		const vEnd = v1.clone();

		const numerator = this.normal.dot( this.p.clone().sub( vStart ) );
		const denumerator = this.normal.dot( vEnd.clone().sub( vStart ) );

		if( denumerator == 0 ) {
			return false;
		}

		const r = numerator / denumerator;

		if( r < 0 || r > 1 ) {
			return false;
		}

		return v0.clone().add( ( v1.clone().sub( v0 ) ).multiplyScalar( r ) );
	}


}


WebHF.Plane = Plane;

}
