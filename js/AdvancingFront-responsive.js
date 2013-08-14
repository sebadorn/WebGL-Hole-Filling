"use strict";


/**
 * Fill the hole using the advancing front algorithm.
 * @param  {THREE.Geometry}    modelGeo       The model to fill the holes in.
 * @param  {Array<THREE.Line>} hole           The hole described by lines.
 * @param  {float}             mergeThreshold Threshold for merging.
 * @return {THREE.Geometry}                   The generated filling.
 */
AdvancingFront.afmStart = function( modelGeo, hole, mergeThreshold, callback ) {
	this.callback = callback;
	this.hole = hole;
	this.holeIndex = SceneManager.holes.indexOf( this.hole );
	this.loopCounter = 0;
	this.mergeThreshold = mergeThreshold;
	this.modelGeo = modelGeo;

	this.filling = new THREE.Geometry();
	this.filling.vertices = this.hole.slice( 0 );
	this.filling.mergeVertices();

	this.front = new THREE.Geometry();
	this.front.vertices = this.hole.slice( 0 );
	this.front.mergeVertices();

	this.initHeap( this.front );
	this.mainLoop();
};


/**
 * Apply rule 1 of the advancing front mesh algorithm.
 * Rule 1: Close gaps of angles <= 75°.
 * @param {THREE.Geometry} front   The current border of the hole.
 * @param {THREE.Geometry} filling The currently filled part of the original hole.
 * @param {THREE.Vector3}  vp      Previous vector.
 * @param {THREE.Vector3}  v       Current vector.
 * @param {THREE.Vector3}  vn      Next vector.
 */
AdvancingFront.afRule1 = function( front, filling, vp, v, vn ) {
	var vIndex = filling.vertices.indexOf( v ),
	    vnIndex = filling.vertices.indexOf( vn ),
	    vpIndex = filling.vertices.indexOf( vp );

	if( !this.isInHole( front, filling, vp, vn ) ) {
		return false;
	}

	filling.faces.push( new THREE.Face3( vIndex, vpIndex, vnIndex ) );

	// The vector v is not a part of the (moving) hole front anymore.
	front.vertices.splice( front.vertices.indexOf( v ), 1 );

	return true;
};


/**
 * Apply rule 2 of the advancing front mesh algorithm.
 * Rule 2: Create one new vertex if the angle is > 75° and <= 135°.
 * @param {THREE.Geometry} front   The current border of the hole.
 * @param {THREE.Geometry} filling The currently filled part of the original hole.
 * @param {THREE.Vector3}  vp      Previous vector.
 * @param {THREE.Vector3}  v       Current vector.
 * @param {THREE.Vector3}  vn      Next vector.
 */
AdvancingFront.afRule2 = function( front, filling, vp, v, vn ) {
	// To make things easier, we just move the whole thing into the origin
	// and when we have the new point, we move it back.
	var vpClone = vp.clone().sub( v ),
	    vnClone = vn.clone().sub( v ),
	    origin = new THREE.Vector3();

	// Create the plane of the vectors vp and vn
	// with position vector v.
	var plane = new Plane( origin, vpClone, vnClone );
	var adjusted, avLen, vNew;

	// Get a vector on that plane, that lies on half the angle between vp and vn.
	vNew = plane.getPoint( 1, 1 );

	// Compute the average length of vp and vn.
	// Then adjust the position of the new vector, so it has this average length.
	avLen = Utils.getAverageLength( vpClone, vnClone );
	vNew.setLength( avLen );
	vNew.add( v );


	if( !this.isInHole( front, filling, vNew, vp, vn ) ) {
		// Second chance: Reduce length
		vNew.sub( v );
		vNew.setLength( avLen / 2 );
		vNew.add( v );

		if( !this.isInHole( front, filling, vNew, vp, vn ) ) {
			return false;
		}
	}


	// New vertex
	filling.vertices.push( vNew );

	// New faces for 2 new triangles
	var len = filling.vertices.length;
	var vpIndex = filling.vertices.indexOf( vp ),
	    vIndex = filling.vertices.indexOf( v ),
	    vnIndex = filling.vertices.indexOf( vn );

	filling.faces.push( new THREE.Face3( vIndex, vpIndex, len - 1 ) );
	filling.faces.push( new THREE.Face3( vIndex, len - 1, vnIndex ) );


	// Update front
	var ix = front.vertices.indexOf( v );
	front.vertices[ix] = vNew;

	return vNew;
};


/**
 * Apply rule 3 of the advancing front mesh algorithm.
 * Rule 3: Create a new vertex if the angle is > 135°.
 * @param {THREE.Geometry} front   The current border of the hole.
 * @param {THREE.Geometry} filling The currently filled part of the original hole.
 * @param {THREE.Vector3}  vp      Previous vector.
 * @param {THREE.Vector3}  v       Current vector.
 * @param {THREE.Vector3}  vn      Next vector.
 * @param {float}          angle   Angle created by these vectors.
 */
AdvancingFront.afRule3 = function( front, filling, vp, v, vn, angle ) {
	var vpClone = vp.clone().sub( v ),
	    vnClone = vn.clone().sub( v );

	// New vertice
	var halfWay = vnClone.clone().divideScalar( 2 );

	var cross1 = new THREE.Vector3().crossVectors( vpClone, vnClone );
	cross1.normalize();
	cross1.add( halfWay );
	cross1.add( v );

	var cross2 = new THREE.Vector3().crossVectors(
		cross1.clone().sub( v ).sub( halfWay ),
		vnClone.clone().sub( halfWay )
	);
	if( angle < 180.0 ) {
		cross2.multiplyScalar( -1 );
	}
	cross2.normalize();
	cross2.add( v ).add( halfWay );

	var plane = new Plane(
		new THREE.Vector3(),
		vnClone.clone().sub( halfWay ),
		cross2.clone().sub( v ).sub( halfWay )
	);
	var vOnPlane = plane.getPoint( 0, vnClone.length() );
	var vNew = vOnPlane.clone();

	vNew.add( v ).add( halfWay );
	vNew = Utils.keepNearPlane( v, vn, vNew );

	if( !this.isInHole( front, filling, vNew, vp, vn ) ) {
		// Second chance: Reduce length
		vNew = vOnPlane.clone();
		vNew.setLength( vNew.length() / 2 );
		vNew.add( v ).add( halfWay );
		vNew = Utils.keepNearPlane( v, vn, vNew );

		if( !this.isInHole( front, filling, vNew, vp, vn ) ) {
			return false;
		}
	}


	// New vertex
	filling.vertices.push( vNew );

	// New face for the new triangle
	var len = filling.vertices.length;
	var vnIndex = filling.vertices.indexOf( vn ),
	    vIndex = filling.vertices.indexOf( v );

	filling.faces.push( new THREE.Face3( vnIndex, vIndex, len - 1 ) );

	// Update front
	var ix = front.vertices.indexOf( v );
	front.vertices.splice( ix + 1, 0, vNew );

	return vNew;
};


/**
 * Apply AF rule 1 and organise heaps/angles.
 * @param  {THREE.Geometry} front   Current front of hole.
 * @param  {THREE.Geometry} filling Current filling of hole.
 * @return {boolean}                Rule 1 doesn't create a new vertex, so it will always return false.
 */
AdvancingFront.applyRule1 = function( front, filling, angle ) {
	var vNew = this.afRule1(
		front, filling,
		angle.vertices[0], angle.vertices[1], angle.vertices[2]
	);

	// Angle has successfully been processed.
	// Update neighbouring angles.
	if( vNew ) {
		this.heap.remove( angle.previous.degree );
		angle.previous.setVertices( [
			angle.previous.vertices[0],
			angle.previous.vertices[1],
			angle.vertices[2]
		] );
		angle.previous.next = angle.next;
		this.heap.insert( angle.previous.degree, angle.previous );

		this.heap.remove( angle.next.degree );
		angle.next.setVertices( [
			angle.vertices[0],
			angle.next.vertices[1],
			angle.next.vertices[2]
		] );
		angle.next.previous = angle.previous;
		this.heap.insert( angle.next.degree, angle.next );
	}
	// It failed, so insert the Angle back in.
	else {
		this.heap.insert( angle.degree, angle );
	}

	return false;
};


/**
 * Apply AF rule 2 and organise heaps/angles.
 * @param  {THREE.Geometry} front   Current front of hole.
 * @param  {THREE.Geometry} filling Current filling of hole.
 * @return {THREE.Vector3}          New vertex.
 */
AdvancingFront.applyRule2 = function( front, filling, angle ) {
	var vNew = this.afRule2(
		front, filling,
		angle.vertices[0], angle.vertices[1], angle.vertices[2]
	);

	// Angle has successfully been processed.
	// Update the angle itself and neighbouring angles.
	if( vNew ) {
		angle.setVertices( [
			angle.vertices[0],
			vNew,
			angle.vertices[2]
		] );

		this.heap.remove( angle.previous.degree );
		angle.previous.setVertices( [
			angle.previous.vertices[0],
			angle.previous.vertices[1],
			vNew
		] );
		this.heap.insert( angle.previous.degree, angle.previous );

		this.heap.remove( angle.next.degree );
		angle.next.setVertices( [
			vNew,
			angle.next.vertices[1],
			angle.next.vertices[2]
		] );
		this.heap.insert( angle.next.degree, angle.next );
	}
	// Otherwise don't update the angles and just put it back in.
	this.heap.insert( angle.degree, angle );

	return vNew;
};


/**
 * Apply AF rule 3 and organise heaps/angles.
 * @param  {THREE.Geometry} front   Current front of hole.
 * @param  {THREE.Geometry} filling Current filling of hole.
 * @return {THREE.Vector3}          New vertex.
 */
AdvancingFront.applyRule3 = function( front, filling, angle ) {
	var vNew = this.afRule3(
		front, filling,
		angle.vertices[0], angle.vertices[1], angle.vertices[2],
		angle.degree
	);

	// Angle has successfully been processed.
	// Update the angle itself, neighbouring angles and create a new one.
	if( vNew ) {
		var newAngle = new Angle( [
			angle.vertices[1],
			vNew,
			angle.vertices[2]
		] );
		newAngle.previous = angle;
		newAngle.next = angle.next;
		this.heap.insert( newAngle.degree, newAngle );

		this.heap.remove( angle.next.degree );
		angle.next.setVertices( [
			vNew,
			angle.next.vertices[1],
			angle.next.vertices[2]
		] );
		angle.next.previous = newAngle;
		this.heap.insert( angle.next.degree, angle.next );

		angle.setVertices( [
			angle.vertices[0],
			angle.vertices[1],
			vNew
		] );
		angle.next = newAngle;
	}
	// Otherwise don't update the angles and just put it back in.
	this.heap.insert( angle.degree, angle );

	return vNew;
};


/**
 * Get the rule function for the given angle.
 * @param  {float}    degree Angle in degree.
 * @return {Function}        The function to the rule, or false if none available.
 */
AdvancingFront.getRuleFunctionForAngle = function( degree ) {
	if( degree <= 75.0 ) {
		return this.applyRule1.bind( this );
	}
	else if( degree <= 135.0 ) {
		return this.applyRule2.bind( this );
	}
	else if( degree < 180.0 ) {
		return this.applyRule3.bind( this );
	}

	return false;
};


/**
 * Check, if a vector is inside the hole or has left the boundary.
 * @param  {Array}         front The current front of the hole.
 * @param  {THREE.Vector3} v     The vector to check.
 * @param  {THREE.Vector3} fromA
 * @param  {THREE.Vector3} fromB
 * @return {boolean}             True, if still inside, false otherwise.
 */
AdvancingFront.isInHole = function( front, filling, v, fromA, fromB ) {
	var a, b, c, face;

	Stopwatch.start( "collision" );

	for( var i = 0, len = filling.faces.length; i < len; i++ ) {
		face = filling.faces[i];

		a = filling.vertices[face.a];
		b = filling.vertices[face.b];
		c = filling.vertices[face.c];

		if( a == v || b == v || c == v ) {
			continue;
		}
		if( a == fromA || b == fromA || c == fromA ) {
			continue;
		}
		if( fromB ) {
			if( a == fromB || b == fromB || c == fromB ) {
				continue;
			}
		}

		if( Utils.checkIntersectionOfTriangles3D( a, b, c, v, fromA, fromB ) ) {
			Stopwatch.stop( "collision" );
			return false;
		}
	}

	if( CONFIG.HF.FILLING.COLLISION_TEST == "all" ) {
		for( var i = 0, len = this.modelGeo.faces.length; i < len; i++ ) {
			face = this.modelGeo.faces[i];

			a = this.modelGeo.vertices[face.a];
			b = this.modelGeo.vertices[face.b];
			c = this.modelGeo.vertices[face.c];

			if( a == v || b == v || c == v ) {
				continue;
			}
			if( a == fromA || b == fromA || c == fromA ) {
				continue;
			}
			if( fromB ) {
				if( a == fromB || b == fromB || c == fromB ) {
					continue;
				}
			}

			if( Utils.checkIntersectionOfTriangles3D( a, b, c, v, fromA, fromB ) ) {
				Stopwatch.stop( "collision" );
				return false;
			}
		}
	}

	Stopwatch.stop( "collision" );

	return true;
};


/**
 * Main loop
 */
AdvancingFront.mainLoop = function() {
	var vNew = false;
	var angle, ruleFunc;

	this.loopCounter++;

	// for debugging
	if( this.STOP_AFTER !== false && this.loopCounter > this.STOP_AFTER ) {
		this.wrapUp();
		return;
	}

	// Close last hole
	if( this.front.vertices.length == 4 ) {
		this.filling = this.closeHole4( this.front, this.filling );
		this.wrapUp();
		return;
	}
	else if( this.front.vertices.length == 3 ) {
		this.filling = this.closeHole3( this.front, this.filling );
		this.wrapUp();
		return;
	}
	// Problematic/strange situations
	else if( this.front.vertices.length == 2 ) {
		console.warn( "front.vertices.length == 2" );
		this.wrapUp();
		return;
	}
	else if( this.front.vertices.length == 1 ) {
		console.warn( "front.vertices.length == 1" );
		this.wrapUp();
		return;
	}

	// Get next angle and apply rule
	if( this.heap.size() > 0 ) {
		angle = this.heap.removeFirst();
		ruleFunc = this.getRuleFunctionForAngle( angle.degree );

		if( ruleFunc == false ) {
			SceneManager.showFilling( this.front, this.filling );
			throw new Error( "No rule could be applied. Stopping before entering endless loop." );
		}

		vNew = ruleFunc( this.front, this.filling, angle );

		this.heap.sort();
	}
	else {
		SceneManager.showFilling( this.front, this.filling );
		throw new Error( "Hole has not been filled yet, but heap is empty." );
	}

	if( !vNew || this.front.vertices.length != 3 ) {
		// Compute the distances between each new created
		// vertex and see, if they can be merged.
		this.mergeByDistance( this.front, this.filling, vNew, this.hole );
	}

	// Update progress bar
	if( this.loopCounter % 4 == 0 ) {
		UI.updateProgress( 100 - Math.round( this.front.vertices.length / this.hole.length * 100 ) );
	}

	// Keep on looping
	setTimeout( function() { this.mainLoop(); }.bind( this ), 0 );
};


/**
 * Wrapping up the action: Console printing and result returning.
 */
AdvancingFront.wrapUp = function() {
	console.log(
		"Finished after " + ( this.loopCounter - 1 ) + " iterations.\n",
		"- New vertices: " + this.filling.vertices.length + "\n",
		"- New faces: " + this.filling.faces.length
	);
	Stopwatch.average( "collision", true );

	SceneManager.showFilling( this.front, this.filling, this.holeIndex );

	this.callback( this.filling, this.holeIndex );
};
