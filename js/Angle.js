"use strict";


/**
 * Class to store information about an angle in the front.
 * @param {Array<THREE.Vector3>} vertices The vertices that form the angle.
 */
function Angle( vertices ) {
	this.degree = null;
	this.vertices = vertices;
	this.next = null;
	this.previous = null;
	this.position = GLOBAL.MODEL.position;

	this.calculateAngle();
}


/**
 * Calculate the angle in degree.
 * (Should be done if the vertices changed.)
 * @return {float} The new value of the angle in degree.
 */
Angle.prototype.calculateAngle = function() {
	this.degree = Utils.calculateAngle( this.vertices[0], this.vertices[1], this.vertices[2], this.position );

	return this.degree;
};


/**
 * Set the vertices.
 * @param  {Array<THREE.Vector3>} vertices The new vertices.
 * @return {float}                         Re-calculated value of the angle in degree.
 */
Angle.prototype.setVertices = function( vertices ) {
	this.vertices = vertices;

	return this.calculateAngle();
};
