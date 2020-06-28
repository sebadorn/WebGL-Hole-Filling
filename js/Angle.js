'use strict';


{

class Angle {


	/**
	 * Class to store information about an angle in the front.
	 * @constructor
	 * @param {THREE.Vector3[]} vertices - The vertices that form the angle.
	 * @param {THREE.Vector3}   position - Center position of the angle. (optional)
	 */
	constructor( vertices, position ) {
		this.degree = null;
		this.vertices = vertices;
		this.next = null;
		this.previous = null;
		this.waitForUpdate = false;

		if( typeof position === 'undefined' ) {
			this.position = WebHF.SceneManager.model.position;
		}
		else {
			this.position = position;
		}

		this.calculateAngle();
	}


	/**
	 * Calculate the angle in degree.
	 * (Should be done if the vertices changed.)
	 * @return {number} The new value of the angle in degree.
	 */
	calculateAngle() {
		this.degree = WebHF.Utils.calculateAngle(
			this.vertices[0],
			this.vertices[1],
			this.vertices[2],
			this.position
		);

		this.waitForUpdate = false;

		return this.degree;
	}


	/**
	 * Set the vertices.
	 * @param  {THREE.Vector3[]} vertices - The new vertices.
	 * @return {number} Re-calculated value of the angle in degree.
	 */
	setVertices( vertices ) {
		this.vertices = vertices;

		return this.calculateAngle();
	}


}


WebHF.Angle = Angle;

}
