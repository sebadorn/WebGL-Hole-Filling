"use strict";


function Octree( points, boundingBox, level ) {
	this.leaves = [];
	this.boundingBox = boundingBox;
	this.center = [];
	this.points = [];

	this.init( points, level );
};


Octree.prototype.init = function( points, level ) {
	// Check depth of the tree and empty leaves
	if( level < 1 || points.length < 1 ) {
		this.points = points;
		return;
	}

	// Calculate lower left and upper right corner
	var point1 = this.boundingBox[0];
	var point2 = this.boundingBox[1];
	var data = zip( point1, point2 ); // TODO: zip
	lowLeftCorner = [min( data[0] ), min( data [1] ), min( data[2] )]; // TODO: min
	upRightCorner = [max( data[0] ), max( data [1] ), max( data[2] )]; // TODO: max

	// Calculate bounding box center
	this.center = [( x + y) / 2.0 for ( x, y ) in zip( lowLeftCorner, upRightCorner)]; // TODO: list comprehension

	// Sort points to octree leaves
	var sortedPoints = [
		[( x, y, z ) for ( x, y, z ) in points if x <  this.center[0] and y <  this.center[1] and z <  this.center[2]], // front bottom left
		[( x, y, z ) for ( x, y, z ) in points if x <  this.center[0] and y <  this.center[1] and z >= this.center[2]], // back bottom left
		[( x, y, z ) for ( x, y, z ) in points if x >= this.center[0] and y <  this.center[1] and z <  this.center[2]], // front bottom right
		[( x, y, z ) for ( x, y, z ) in points if x >= this.center[0] and y <  this.center[1] and z >= this.center[2]], // back bottom right
		[( x, y, z ) for ( x, y, z ) in points if x >= this.center[0] and y >= this.center[1] and z <  this.center[2]], // front top right
		[( x, y, z ) for ( x, y, z ) in points if x >= this.center[0] and y >= this.center[1] and z >= this.center[2]], // back top right
		[( x, y, z ) for ( x, y, z ) in points if x <  this.center[0] and y >= this.center[1] and z <  this.center[2]], // front top left
		[( x, y, z ) for ( x, y, z ) in points if x <  this.center[0] and y >= this.center[1] and z >= this.center[2]]  // back top left
	];

	// New bounding boxes
	var newBoundingBox = [
		[lowLeftCorner, this.center], // front bottom left
		[[lowLeftCorner[0], lowLeftCorner[1], upRightCorner[2]], this.center], // back bottom left
		[[upRightCorner[0], lowLeftCorner[1], lowLeftCorner[2]], this.center], // front bottom right
		[[upRightCorner[0], lowLeftCorner[1], upRightCorner[2]], this.center], // back bottom right
		[[upRightCorner[0], upRightCorner[1], lowLeftCorner[2]], this.center], // front top right
		[upRightCorner, this.center], // back top right
		[[lowLeftCorner[0], upRightCorner[1], lowLeftCorner[2]], this.center], // front top left
		[[lowLeftCorner[0], upRightCorner[1], upRightCorner[2]], this.center]  // back top left
	];

	// Create new Octree object for each of the 8 boxes
	this.leaves.push( new Octree( sortedPoints[0], newBoundingBox[0], level - 1 ) );
	this.leaves.push( new Octree( sortedPoints[1], newBoundingBox[1], level - 1 ) );
	this.leaves.push( new Octree( sortedPoints[2], newBoundingBox[2], level - 1 ) );
	this.leaves.push( new Octree( sortedPoints[3], newBoundingBox[3], level - 1 ) );
	this.leaves.push( new Octree( sortedPoints[4], newBoundingBox[4], level - 1 ) );
	this.leaves.push( new Octree( sortedPoints[5], newBoundingBox[5], level - 1 ) );
	this.leaves.push( new Octree( sortedPoints[6], newBoundingBox[6], level - 1 ) );
	this.leaves.push( new Octree( sortedPoints[7], newBoundingBox[7], level - 1 ) );
};


Octree.prototype.createCube = function( node ) {
	//
};


Octree.prototype.createSphere = function( node ) {
	//
};
