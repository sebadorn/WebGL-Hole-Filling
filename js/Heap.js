'use strict';


{

class Heap {


	/**
	 * Class to store values in by an associated numeric key.
	 * @param {?string} identifier - Identifying name.
	 */
	constructor( identifier ) {
		this.identifier = identifier || 'none';
		this.indexes = [];
		this.values = {};
	}


	/**
	 * Get the value for a given key.
	 * If more than one value exist with this exact key,
	 * only the first one will be returned.
	 * @param  {number} key - Key of the value.
	 * @return {*} The (first) value for this key.
	 */
	get( key ) {
		if( !this.values.hasOwnProperty( key ) ) {
			throw new Error( 'No entry found for ' + key );
		}

		return this.values[key][0];
	}


	/**
	 * Insert a value.
	 * @param {number} key   - The key to the value.
	 * @param {*}      value - The value to insert.
	 */
	insert( key, value ) {
		this.indexes.push( key );

		if( !this.values.hasOwnProperty( key ) ) {
			this.values[key] = [];
		}

		this.values[key].push( value );
	}


	/**
	 * Remove a value.
	 * If more values exist for a given key,
	 * only the first one in the list will be removed.
	 * @param {*} key - Key of the value to remove.
	 */
	remove( key ) {
		const ix = this.indexes.indexOf( key );

		if( ix >= 0 ) {
			this.indexes.splice( ix, 1 );
		}

		this.values[key].splice( 0, 1 );

		if( this.values[key].length === 0 ) {
			delete this.values[key];
		}
	}


	/**
	 * Remove and return the value with the smallest key.
	 * @return {*} The removed value.
	 */
	removeFirst() {
		const value = this.values[this.indexes[0]][0];

		this.remove( this.indexes[0] );

		return value;
	}


	/**
	 * Number of indexes.
	 * @return {number} The number of indexes.
	 */
	size() {
		return this.indexes.length;
	}


	/**
	 * Sort the indexes by value small to big.
	 */
	sort() {
		this.indexes.sort( ( a, b ) => a - b );
	}


}


WebHF.Heap = Heap;

}
