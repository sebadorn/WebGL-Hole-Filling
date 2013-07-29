"use strict";


/**
 * Class to store Angles in that fit a certain AF rule.
 * @param {String} identifier Identifying name. (optional)
 */
function Heap( identifier ) {
	this.identifier = identifier || "none";
	this.indexes = [];
	this.values = {};
}


/**
 * Get the Angle object for a given angle degree.
 * If more than one Angle object exist with this exact degree value,
 * only the first one will be returned.
 * @param  {float} degree Angle in degree.
 * @return {Angle}        The (first) Angle with this degree value.
 */
Heap.prototype.get = function( degree ) {
	if( !this.values.hasOwnProperty( degree ) ) {
		throw new Error( "No entry found for " + degree );
	}

	return this.values[degree][0];
};


/**
 * Insert an angle.
 * @param {Angle} angle The angle to insert.
 */
Heap.prototype.insert = function( angle ) {
	this.indexes.push( angle.degree );

	if( !this.values.hasOwnProperty( angle.degree ) ) {
		this.values[angle.degree] = [];
	}
	this.values[angle.degree].push( angle );
};


/**
 * Number of indexes.
 * @return {int} The number of indexes.
 */
Heap.prototype.length = function() {
	return this.indexes.length;
};


/**
 * Remove an angle.
 * If more Angle objects exist for a given angle degree,
 * only the first one in the list will be removed.
 * @param {Angle} angle Angle to remove.
 */
Heap.prototype.remove = function( angle ) {
	var ix = this.indexes.indexOf( angle.degree );

	if( ix >= 0 ) {
		this.indexes.splice( ix, 1 );
	}

	this.values[angle.degree].splice( 0, 1 );

	if( this.values[angle.degree].length == 0 ) {
		delete this.values[angle.degree];
	}
};


/**
 * Remove and return the Angle with the smallest degree value.
 * @return {Angle} The removed Angle.
 */
Heap.prototype.removeFirst = function() {
	var angle = this.values[this.indexes[0]][0];

	this.remove( angle );

	return angle;
};


/**
 * Sort the indexes by value small to big.
 */
Heap.prototype.sort = function() {
	this.indexes.sort();
};
