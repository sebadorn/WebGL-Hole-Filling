"use strict";


/**
 * Class to store values in by an associated numeric key.
 * @param {String} identifier Identifying name. (optional)
 */
function Heap( identifier ) {
	this.identifier = identifier || "none";
	this.indexes = [];
	this.values = {};
}


/**
 * Get the value for a given key.
 * If more than one value exist with this exact key,
 * only the first one will be returned.
 * @param  {numeric} key Key of the value.
 * @return {mixed}       The (first) value for this key.
 */
Heap.prototype.get = function( key ) {
	if( !this.values.hasOwnProperty( key ) ) {
		throw new Error( "No entry found for " + key );
	}

	return this.values[key][0];
};


/**
 * Insert a value.
 * @param {numeric} key   The key to the value.
 * @param {mixed}   value The value to insert.
 */
Heap.prototype.insert = function( key, value ) {
	this.indexes.push( key );

	if( !this.values.hasOwnProperty( key ) ) {
		this.values[key] = [];
	}
	this.values[key].push( value );
};


/**
 * Remove a value.
 * If more values exist for a given key,
 * only the first one in the list will be removed.
 * @param {mixed} key Key of the value to remove.
 */
Heap.prototype.remove = function( key ) {
	var ix = this.indexes.indexOf( key );

	if( ix >= 0 ) {
		this.indexes.splice( ix, 1 );
	}

	this.values[key].splice( 0, 1 );

	if( this.values[key].length == 0 ) {
		delete this.values[key];
	}
};


/**
 * Remove and return the value with the smallest key.
 * @return {mixed} The removed value.
 */
Heap.prototype.removeFirst = function() {
	var value = this.values[this.indexes[0]][0];

	this.remove( this.indexes[0] );

	return value;
};


/**
 * Number of indexes.
 * @return {int} The number of indexes.
 */
Heap.prototype.size = function() {
	return this.indexes.length;
};


/**
 * Sort the indexes by value small to big.
 */
Heap.prototype.sort = function() {
	this.indexes.sort( numCompareFunc );
};
