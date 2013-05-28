"use strict";


/**
 * Edge structure.
 * (Original Java code by Henning Tjaden.)
 * @param {[type]}   vertex [description]
 * @param {[type]}   q      [description]
 * @param {Edge}     next   [description]
 * @param {[type]}   pair   [description]
 * @param {[type]}   face   [description]
 * @param {[type]}   prev   [description]
 */
function Edge( vertex, q, next, pair, face, prev ) {
	this.vertex = vertex;
	this.q = q;
	this.next = next;
	this.pair = pair;
	this.face = face;
	this.prev = prev;
}
