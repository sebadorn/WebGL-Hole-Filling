"use strict";


/**
 * Class for hole finding and filling algorithms.
 * @type {Object}
 */
var AdvancingFront = {

	holeIndex: -1,
	modelGeo: null,
	resultCallback: null,
	ruleCallback: null,
	ruleCallbackData: null,

	front: null,
	filling: null,
	hole: null,

	heapRule1: null,
	heapRule2: null,
	heapRule3: null,
	heapRuleR: null,

	STOP_AFTER: CONFIG.DEBUG.AFM_STOP_AFTER_ITER,


	/**
	 * Fill the hole using the advancing front algorithm.
	 * @param  {THREE.Geometry}    modelGeo The model to fill the holes in.
	 * @param  {Array<THREE.Line>} hole     The hole described by lines.
	 * @return {THREE.Geometry}             The generated filling.
	 */
	afmStart: function( modelGeo, hole, callback ) {
		this.resultCallback = callback;

		this.filling = new THREE.Geometry();
		this.front = new THREE.Geometry();
		this.hole = hole;

		this.front.vertices = this.hole.slice( 0 );
		this.filling.vertices = this.hole.slice( 0 );

		this.front.mergeVertices();
		this.filling.mergeVertices();

		this.holeIndex = GLOBAL.HOLES.indexOf( this.hole );
		this.modelGeo = modelGeo;
		this.initHeaps( this.front );

		this.countLoops = 0;

		WorkerManager.createPool( "collision", CONFIG.HF.FILLING.WORKER + 1 );

		this.mainEventLoop();
	},


	/**
	 * Apply rule 1 of the advancing front mesh algorithm.
	 * Rule 1: Close gaps of angles <= 75°.
	 * @param {THREE.Vector3}  vp      Previous vector.
	 * @param {THREE.Vector3}  v       Current vector.
	 * @param {THREE.Vector3}  vn      Next vector.
	 */
	afRule1: function( vp, v, vn ) {
		this.ruleCallback = this.afRule1Callback;
		this.ruleCallbackData = {
			vp: vp,
			v: v,
			vn: vn
		};
		this.isInHole( vp, vn );
	},


	/**
	 * Callback for the collision test.
	 * @param {boolean} intersects True, if new vertex intersects with some other part.
	 */
	afRule1Callback: function( intersects ) {
		if( !intersects ) {
			var data = this.ruleCallbackData;
			var vIndex = this.filling.vertices.indexOf( data.v ),
			    vnIndex = this.filling.vertices.indexOf( data.vn ),
			    vpIndex = this.filling.vertices.indexOf( data.vp );

			this.filling.faces.push( new THREE.Face3( vIndex, vpIndex, vnIndex ) );

			// The vector v is not a part of the (moving) hole front anymore.
			this.front.vertices.splice( this.front.vertices.indexOf( data.v ), 1 );
		}

		this.applyRule1( !intersects );
	},


	/**
	 * Apply rule 2 of the advancing front mesh algorithm.
	 * Rule 2: Create one new vertex if the angle is > 75° and <= 135°.
	 * @param {THREE.Vector3} vp Previous vector.
	 * @param {THREE.Vector3} v  Current vector.
	 * @param {THREE.Vector3} vn Next vector.
	 */
	afRule2: function( vp, v, vn ) {
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

		this.ruleCallback = this.afRule2Callback;
		this.ruleCallbackData = {
			vp: vp,
			v: v,
			vn: vn,
			vNew: vNew
		};
		this.isInHole( vNew, vp, vn );
	},


	/**
	 * Callback for the collision test.
	 * @param {boolean} intersects True, if new vertex intersects with some other part.
	 */
	afRule2Callback: function( intersects ) {
		if( !intersects ) {
			var data = this.ruleCallbackData;

			// New vertex
			this.filling.vertices.push( data.vNew );

			// New faces for 2 new triangles
			var len = this.filling.vertices.length;
			var vpIndex = this.filling.vertices.indexOf( data.vp ),
			    vIndex = this.filling.vertices.indexOf( data.v ),
			    vnIndex = this.filling.vertices.indexOf( data.vn );

			this.filling.faces.push( new THREE.Face3( vIndex, vpIndex, len - 1 ) );
			this.filling.faces.push( new THREE.Face3( vIndex, len - 1, vnIndex ) );

			// Update front
			var ix = this.front.vertices.indexOf( data.v );
			this.front.vertices[ix] = data.vNew;

			this.applyRule2( data.vNew );
		}
		else {
			this.applyRule2( false );
		}
	},


	/**
	 * Apply rule 3 of the advancing front mesh algorithm.
	 * Rule 3: Create a new vertex if the angle is > 135°.
	 * @param {THREE.Vector3} vp    Previous vector.
	 * @param {THREE.Vector3} v     Current vector.
	 * @param {THREE.Vector3} vn    Next vector.
	 * @param {float}         angle Angle created by these vectors.
	 */
	afRule3: function( vp, v, vn, angle ) {
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

		this.ruleCallback = this.afRule3Callback;
		this.ruleCallbackData = {
			vp: vp,
			v: v,
			vn: vn,
			vNew: vNew
		};
		this.isInHole( vNew, vp, vn );
	},


	/**
	 * Callback for the collision test.
	 * @param {boolean} intersects True, if new vertex intersects with some other part.
	 */
	afRule3Callback: function( intersects ) {
		if( !intersects ) {
			var data = this.ruleCallbackData;

			// New vertex
			this.filling.vertices.push( data.vNew );

			// New face for the new triangle
			var len = this.filling.vertices.length;
			var vnIndex = this.filling.vertices.indexOf( data.vn ),
			    vIndex = this.filling.vertices.indexOf( data.v );

			this.filling.faces.push( new THREE.Face3( vnIndex, vIndex, len - 1 ) );

			// Update front
			var ix = this.front.vertices.indexOf( data.v );
			this.front.vertices.splice( ix + 1, 0, data.vNew );

			this.applyRule3( data.vNew );
		}
		else {
			this.applyRule3( false );
		}
	},


	/**
	 * Apply AF rule 1 and organise heaps/angles.
	 */
	applyRule1: function( vNew ) {
		var angle = this.angle;

		if( vNew ) {
			this.heapRemove( angle.previous );
			angle.previous.setVertices( [
				angle.previous.vertices[0],
				angle.previous.vertices[1],
				angle.vertices[2]
			] );
			angle.previous.next = angle.next;
			this.heapInsert( angle.previous );

			this.heapRemove( angle.next );
			angle.next.setVertices( [
				angle.vertices[0],
				angle.next.vertices[1],
				angle.next.vertices[2]
			] );
			angle.next.previous = angle.previous;
			this.heapInsert( angle.next );
		}
		// It failed, so insert the Angle back in.
		else {
			this.heapRule1.insert( angle );
		}

		this.mainEventLoopReceiveVertex( false );
	},


	/**
	 * Apply AF rule 2 and organise heaps/angles.
	 */
	applyRule2: function( vNew ) {
		var angle = this.angle;

		if( vNew ) {
			angle.setVertices( [
				angle.vertices[0],
				vNew,
				angle.vertices[2]
			] );
			this.heapInsert( angle );

			this.heapRemove( angle.previous );
			angle.previous.setVertices( [
				angle.previous.vertices[0],
				angle.previous.vertices[1],
				vNew
			] );
			this.heapInsert( angle.previous );

			this.heapRemove( angle.next );
			angle.next.setVertices( [
				vNew,
				angle.next.vertices[1],
				angle.next.vertices[2]
			] );
			this.heapInsert( angle.next );
		}
		else {
			this.heapRule2.insert( angle );
		}

		this.mainEventLoopReceiveVertex( vNew );
	},


	/**
	 * Apply AF rule 3 and organise heaps/angles.
	 */
	applyRule3: function( vNew ) {
		var angle = this.angle;

		if( vNew ) {
			var newAngle = new Angle( [
				angle.vertices[1],
				vNew,
				angle.vertices[2]
			] );
			newAngle.previous = angle;
			newAngle.next = angle.next;
			this.heapInsert( newAngle );

			this.heapRemove( angle.next );
			angle.next.setVertices( [
				vNew,
				angle.next.vertices[1],
				angle.next.vertices[2]
			] );
			angle.next.previous = newAngle;
			this.heapInsert( angle.next );

			angle.setVertices( [
				angle.vertices[0],
				angle.vertices[1],
				vNew
			] );
			angle.next = newAngle;
			this.heapInsert( angle );
		}
		else {
			this.heapRule3.insert( angle );
		}

		this.mainEventLoopReceiveVertex( vNew );
	},


	/**
	 * Close the last hole of only 3 vertices.
	 */
	closeHole3: function() {
		this.filling.faces.push( new THREE.Face3(
			this.filling.vertices.indexOf( this.front.vertices[1] ),
			this.filling.vertices.indexOf( this.front.vertices[0] ),
			this.filling.vertices.indexOf( this.front.vertices[2] )
		) );
		this.front.vertices = [];
	},


	/**
	 * Close the last hole of only 4 vertices.
	 */
	closeHole4: function() {
		this.filling.faces.push( new THREE.Face3(
			this.filling.vertices.indexOf( this.front.vertices[3] ),
			this.filling.vertices.indexOf( this.front.vertices[2] ),
			this.filling.vertices.indexOf( this.front.vertices[0] )
		) );
		this.filling.faces.push( new THREE.Face3(
			this.filling.vertices.indexOf( this.front.vertices[1] ),
			this.filling.vertices.indexOf( this.front.vertices[0] ),
			this.filling.vertices.indexOf( this.front.vertices[2] )
		) );
		this.front.vertices = [];
	},


	/**
	 * Compute the angles of neighbouring vertices.
	 * Angles are in degree.
	 * @param  {THREE.Geometry} front The model with the vertices.
	 * @return {Object}               The angles and the smallest one together with the index of the vertex.
	 */
	computeAngles: function( front ) {
		var angles = [],
		    smallest = {
				angle: 361.0,
				index: -1
		    };
		var angle, prev, v, vn, vp;

		for( var i = 0, len = front.length; i < len; i++ ) {
			vp = front[( i == 0 ) ? len - 1 : i - 1];
			v = front[i];
			vn = front[( i + 1 ) % len];

			prev = ( i == 0 ) ? null : angles[angles.length - 1];
			angle = new Angle( [vp, v, vn] );
			angle.previous = prev;

			angles.push( angle );

			if( i > 0 ) {
				angles[angles.length - 2].next = angles[angles.length - 1];
			}

			if( smallest.angle > angle.degree ) {
				smallest.angle = angle.degree;
				smallest.index = i;
			}
		}

		angles[0].previous = angles[angles.length - 1];
		angles[angles.length - 1].next = angles[0];

		return {
			angles: angles,
			smallest: smallest
		};
	},


	/**
	 * Insert an angle into the corresponding heap.
	 * @param {Angle} angle The angle to insert.
	 */
	heapInsert: function( angle ) {
		if( angle.degree <= 75.0 ) {
			this.heapRule1.insert( angle );
		}
		else if( angle.degree <= 135.0 ) {
			this.heapRule2.insert( angle );
		}
		else if( angle.degree < 180.0 ) {
			this.heapRule3.insert( angle );
		}
		else {
			this.heapRuleR.insert( angle );
		}
	},


	/**
	 * Remove an angle from its heap(s).
	 * @param {Angle} angle The angle to remove.
	 */
	heapRemove: function( angle ) {
		// Rule 1
		if( angle.degree <= 75.0 ) {
			this.heapRule1.remove( angle );
		}
		// Rule 2
		else if( angle.degree <= 135.0 ) {
			this.heapRule2.remove( angle );
		}
		// Rule 3
		else if( angle.degree < 180.0 ) {
			this.heapRule3.remove( angle );
		}
		else {
			this.heapRuleR.remove( angle );
		}
	},


	/**
	 * Angle heaps have to be updated if vertices of the front are being merged.
	 * @param  {THREE.Vector3} vOld The old vertex.
	 * @param  {THREE.Vector3} vNew The new vertex.
	 * @return {boolean}            True, if an angle has been updated, false otherwise.
	 */
	heapMergeVertex: function( vOld, vNew ) {
		var search = [
			this.heapRule1,
			this.heapRule2,
			this.heapRule3,
			this.heapRuleR
		];
		var angle, angles, heap;

		for( var i = 0; i < search.length; i++ ) {
			heap = search[i];

			for( var key in heap.values ) {
				angles = heap.values[key];

				for( var j = 0; j < angles.length; j++ ) {
					angle = angles[j];

					// Match with vOld in the "middle"
					if( angle.vertices[1] == vOld ) {
						if( angle.previous.vertices[1] == vNew ) {
							angle.previous.vertices[2] = angle.vertices[2];
							angle.next.vertices[0] = vNew;
						}
						else if( angle.next.vertices[1] == vNew ) {
							angle.previous.vertices[2] = vNew;
							angle.next.vertices[0] = angle.vertices[0];
						}
						else {
							throw new Error(
								"Situation that shouldn't be possible. "
								+ "Neither previous nor next angle contain the new vertex."
							);
						}

						angle.previous.next = angle.next;
						angle.next.previous = angle.previous;

						this.heapRemove( angle.previous );
						angle.previous.calculateAngle();
						this.heapInsert( angle.previous );

						this.heapRemove( angle.next );
						angle.next.calculateAngle();
						this.heapInsert( angle.next );

						heap.remove( angle );

						return true;
					}
				}
			}
		}

		return false;
	},


	/**
	 * Initialize heaps.
	 * @param {THREE.Geometry} front The current front (outline of the hole).
	 */
	initHeaps: function( front ) {
		var ca = this.computeAngles( front.vertices );
		var angle;

		this.heapRule1 = new Heap( "1" );
		this.heapRule2 = new Heap( "2" );
		this.heapRule3 = new Heap( "3" );
		this.heapRuleR = new Heap( "R" );

		// Initialize heaps
		for( var i = 0, len = ca.angles.length; i < len; i++ ) {
			angle = ca.angles[i];

			if( angle.degree <= 75.0 ) {
				this.heapRule1.insert( angle );
			}
			else if( angle.degree <= 135.0 ) {
				this.heapRule2.insert( angle );
			}
			else if( angle.degree < 180.0 ) {
				this.heapRule3.insert( angle );
			}
			else {
				this.heapRuleR.insert( angle );
			}
		}

		this.heapRule1.sort();
		this.heapRule2.sort();
		this.heapRule3.sort();
	},


	/**
	 * Check, if a vector is inside the hole or has left the boundary.
	 * @param  {THREE.Vector3} v     The vector to check.
	 * @param  {THREE.Vector3} fromA
	 * @param  {THREE.Vector3} fromB
	 * @return {boolean}             True, if still inside, false otherwise.
	 */
	isInHole: function( v, fromA, fromB ) {
		var a, b, c, face;

		this.workerResultCounter = 0;
		this.workerResult = false;

		var len = this.filling.faces.length;

		if( len == 0 ) {
			this.ruleCallback( false );
			return;
		}

		var callback = this.isInHoleCallback.bind( this );
		var data = {
			cmd: "check",
			faces: null,
			v: v, fromA: fromA, fromB: fromB
		};

		this.facesPerWorker = Math.ceil( len / CONFIG.HF.FILLING.WORKER );

		if( len < CONFIG.HF.FILLING.WORKER ) {
			this.workerResultCounter = CONFIG.HF.FILLING.WORKER - 1;
		}

		for( var i = 0; i < len; i += this.facesPerWorker ) {
			data.faces = [];

			for( var j = 0; j < this.facesPerWorker; j++ ) {
				if( i + j >= len ) {
					break;
				}

				face = this.filling.faces[i + j];
				a = this.filling.vertices[face.a];
				b = this.filling.vertices[face.b];
				c = this.filling.vertices[face.c];

				if( a == v || b == v || c == v ) {
					continue;
				}
				if( a == fromA || b == fromA || c == fromA ) {
					continue;
				}
				if( fromB != null ) {
					if( a == fromB || b == fromB || c == fromB ) {
						continue;
					}
				}

				data.faces.push( [a, b, c] );
			}

			if( data.faces.length == 0 ) {
				this.workerResultCounter++;
			}
			else {
				WorkerManager.employWorker( "collision", data, callback );
			}
		}

		if( face == null ) {
			this.ruleCallback( false );
		}

		// // TODO: collision test with whole model
		// if( CONFIG.HF.FILLING.COLLISION_TEST == "all" ) {
		// 	for( var i = 0, len = this.modelGeo.faces.length; i < len; i++ ) {
		// 		face = this.modelGeo.faces[i];

		// 		a = this.modelGeo.vertices[face.a];
		// 		b = this.modelGeo.vertices[face.b];
		// 		c = this.modelGeo.vertices[face.c];

		// 		if( a == v || b == v || c == v ) {
		// 			continue;
		// 		}
		// 		if( a == fromA || b == fromA || c == fromA ) {
		// 			continue;
		// 		}
		// 		if( fromB != null ) {
		// 			if( a == fromB || b == fromB || c == fromB ) {
		// 				continue;
		// 			}
		// 		}

		// 		if( Utils.checkIntersectionOfTriangles3D( a, b, c, v, fromA, fromB ) ) {
		// 			return false;
		// 		}
		// 	}
		// }
	},


	/**
	 * Callback function for the collision workers.
	 */
	isInHoleCallback: function( e ) {
		if( e.data.intersects ) {
			this.workerResult = true;
		}

		this.workerResultCounter++;

		if( this.workerResultCounter == CONFIG.HF.FILLING.WORKER ) {
			this.ruleCallback( this.workerResult );
		}
	},


	/**
	 * Main loop.
	 */
	mainEventLoop: function() {
		this.countLoops++;

		// for debugging
		if( this.STOP_AFTER !== false && this.countLoops > this.STOP_AFTER ) {
			this.wrapUp();
			return;
		}

		// Close last hole
		if( this.front.vertices.length == 4 ) {
			this.closeHole4();
			this.wrapUp();
			return;
		}
		else if( this.front.vertices.length == 3 ) {
			this.closeHole3();
			this.wrapUp();
			return;
		}
		else if( this.front.vertices.length == 1 ) {
			// TODO: REMOVE
			SceneManager.scene.add( SceneManager.createPoint( front.vertices[0], 0.04, 0x99CCFF, true ) );
			this.wrapUp();
			return;
		}

		// Rule 1
		if( this.heapRule1.length() > 0 ) {
			this.angle = this.heapRule1.removeFirst();
			this.afRule1( this.angle.vertices[0], this.angle.vertices[1], this.angle.vertices[2] );
		}
		// Rule 2
		else if( this.heapRule2.length() > 0 ) {
			this.angle = this.heapRule2.removeFirst();
			this.afRule2( this.angle.vertices[0], this.angle.vertices[1], this.angle.vertices[2] );
		}
		// Rule 3
		else if( this.heapRule3.length() > 0 ) {
			this.angle = this.heapRule3.removeFirst();
			this.afRule3( this.angle.vertices[0], this.angle.vertices[1], this.angle.vertices[2], this.angle.degree );
		}
		else {
			this.showFilling();
			throw new Error( "No rule could be applied." );
		}
	},


	/**
	 * Receive the new vertex (if there is one), call the merging and
	 * go back into the main loop.
	 * @param {THREE.Vector3} vNew New vertex by a rule.
	 */
	mainEventLoopReceiveVertex: function( vNew ) {
		if( !vNew || this.front.vertices.length != 3 ) {
			// Compute the distances between each new created
			// vertex and see, if they can be merged.
			this.mergeByDistance( vNew, this.hole );
		}

		this.mainEventLoop();
	},


	/**
	 * Merge vertices that are close together.
	 * @param {THREE.Geometry}       front   The current hole front.
	 * @param {THREE.Geometry}       filling The current hole filling.
	 * @param {THREE.Vector3}        v       The new vertex, otheres may be merged into.
	 * @param {Array<THREE.Vector3>} ignore  Vertices to ignore, that won't be merged.
	 */
	mergeByDistance: function( v, ignore ) {
		var vIndex = this.filling.vertices.indexOf( v ),
		    vIndexFront = this.front.vertices.indexOf( v );
		var t, tIndex;

		// No new vertex has been added, but
		// there may be some duplicate ones
		if( !v ) {
			return true;
		}

		if( vIndex < 0 ) {
			console.error( "mergeByDistance: Given vertex not part of filling!" );
			return false;
		}

		var vIndexBefore = vIndexFront - 1,
		    vIndexAfter = vIndexFront + 1;

		if( vIndexBefore < 0 ) {
			vIndexBefore = this.front.vertices.length - 1;
		}
		if( vIndexAfter > this.front.vertices.length - 1 ) {
			vIndexAfter = 0;
		}

		var compare = [
			this.front.vertices[vIndexBefore],
			this.front.vertices[vIndexAfter]
		];

		// Compare the new point to its direct neighbours
		for( var i = 0; i < compare.length; i++ ) {
			t = compare[i];

			// The original form of the hole shall not be changed
			if( ignore.indexOf( t ) >= 0 ) {
				continue;
			}

			// Merge points if distance below threshold
			if( v.distanceTo( t ) <= CONFIG.HF.FILLING.THRESHOLD_MERGE ) {
				if( CONFIG.DEBUG.SHOW_MERGING ) {
					SceneManager.scene.add( SceneManager.createPoint( t, 0.02, 0xFFEE00, true ) );
					SceneManager.scene.add( SceneManager.createPoint( v, 0.012, 0xFFEE00, true ) );
					SceneManager.scene.add( SceneManager.createLine( t, v, 1, 0xFFEE00, true ) );
				}

				tIndex = this.filling.vertices.indexOf( t );
				vIndex = this.filling.vertices.indexOf( v );
				this.filling.vertices.splice( tIndex, 1 );

				this.updateFaces( tIndex, vIndex );
				this.mergeUpdateFront( t, v );
				this.heapMergeVertex( t, v );
			}
		}
	},


	/**
	 * Update the front according to the merged points.
	 * @param {THREE.Vector3}  vOld  The new vertex.
	 * @param {THREE.Vector3}  vNew  The merged-away vertex.
	 */
	mergeUpdateFront: function( vOld, vNew ) {
		var ixFrom = this.front.vertices.indexOf( vOld ),
		    ixTo = this.front.vertices.indexOf( vNew );

		if( ixFrom < 0 || ixTo < 0 ) {
			throw new Error( "Vertex not found in front." );
		}

		this.front.vertices.splice( ixFrom, 1 );
	},


	/**
	 * Render the finished hole filling.
	 * Create a mesh from the computed data and render it.
	 * @param {THREE.Geometry} front   Front of the hole.
	 * @param {THREE.Geometry} filling Filling of the hole.
	 */
	showFilling: function() {
		var g = GLOBAL,
		    model = SceneManager.model;

		if( !g.FILLINGS.hasOwnProperty( this.holeIndex ) ) {
			g.FILLINGS[this.holeIndex] = {
				solid: false,
				wireframe: false
			};
		}

		// Filling as solid form
		if( CONFIG.HF.FILLING.SHOW_SOLID ) {
			if( g.FILLINGS[this.holeIndex].solid ) {
				SceneManager.scene.remove( g.FILLINGS[this.holeIndex].solid );
			}

			var materialSolid = new THREE.MeshPhongMaterial( {
				color: CONFIG.HF.FILLING.COLOR,
				shading: SceneManager.getCurrentShading(),
				side: THREE.DoubleSide,
				wireframe: false
			} );
			var meshSolid = new THREE.Mesh( this.filling, materialSolid );

			meshSolid.position.x += model.position.x;
			meshSolid.position.y += model.position.y;
			meshSolid.position.z += model.position.z;

			meshSolid.geometry.computeFaceNormals();
			meshSolid.geometry.computeVertexNormals();
			meshSolid.geometry.computeBoundingBox();

			g.FILLINGS[this.holeIndex].solid = meshSolid;
			SceneManager.scene.add( meshSolid );
		}

		// Filling as wireframe
		if( CONFIG.HF.FILLING.SHOW_WIREFRAME ) {
			var materialWire = new THREE.MeshBasicMaterial( {
				color: 0xFFFFFF,
				overdraw: true, // Doesn't seem to work
				side: THREE.DoubleSide,
				wireframe: true,
				wireframeLinewidth: CONFIG.HF.FILLING.LINE_WIDTH
			} );
			var meshWire = new THREE.Mesh( this.filling, materialWire );

			meshWire.position.x += model.position.x;
			meshWire.position.y += model.position.y;
			meshWire.position.z += model.position.z;

			meshWire.geometry.computeFaceNormals();
			meshWire.geometry.computeVertexNormals();
			meshWire.geometry.computeBoundingBox();

			g.FILLINGS[this.holeIndex].wireframe = meshWire;
			SceneManager.scene.add( meshWire );
		}

		// Draw the (moving) front
		if( CONFIG.DEBUG.SHOW_FRONT ) {
			var material = new THREE.LineBasicMaterial( {
				color: 0x4991E0,
				linewidth: 5
			} );
			var mesh = new THREE.Line( this.front, material );

			mesh.position.x += model.position.x;
			mesh.position.y += model.position.y;
			mesh.position.z += model.position.z;

			SceneManager.scene.add( mesh );
		}

		render();
	},


	/**
	 * Update the faces of the filling, because the index of a vertex has been changed.
	 * @param  {int} oldIndex The old vertex index.
	 * @param  {int} newIndex The new vertex index.
	 */
	updateFaces: function( oldIndex, newIndex ) {
		var face;

		for( var i = this.filling.faces.length - 1; i >= 0; i-- ) {
			face = this.filling.faces[i];

			// Replace all instances of the merged-away vertex
			if( face.a == oldIndex ) {
				face.a = newIndex;
			}
			if( face.b == oldIndex ) {
				face.b = newIndex;
			}
			if( face.c == oldIndex ) {
				face.c = newIndex;
			}

			// By removing a vertex all (greater) face indexes have to be updated.
			// May also remove faces, if necessary.
			this.filling.faces = Utils.decreaseHigherFaceIndexes( this.filling.faces, i, oldIndex );
		}
	},


	/**
	 * Advancing front has been completed.
	 * Print stats and return the filling as result to the callback.
	 */
	wrapUp: function() {
		console.log(
			"Finished after " + ( this.countLoops - 1 ) + " iterations.\n",
			"- New vertices: " + this.filling.vertices.length + "\n",
			"- New faces: " + this.filling.faces.length
		);

		if( this.heapRuleR.length() > 0 ) {
			console.warn( "Ignored " + this.heapRuleR.length() + " angles, because they were >= 180°." );
		}

		WorkerManager.closePool( "collision" );

		this.showFilling();
		this.resultCallback( this.filling, this.holeIndex );
	}

};
