"use strict";


/**
 * Intializing the basic stuff.
 * @type {Object}
 */
var Init = {

	/**
	 * Intialize everything: Camera, scene, renderer …
	 */
	all: function() {
		GLOBAL.CONTAINER = document.getElementById( "container" );

		UI.init();

		this.camera();
		this.controls();
		this.scene();
		this.renderer();

		animate();
		render();

		if( typeof test != "undefined" ) { test(); } // TODO: remove
	},


	/**
	 * Intialize the camera.
	 */
	camera: function() {
		var g = GLOBAL,
		    cc = CONFIG.CAMERA;

		g.CAMERA = new THREE.PerspectiveCamera(
			cc.ANGLE,
			window.innerWidth / window.innerHeight,
			cc.ZNEAR,
			cc.ZFAR
		);
		g.CAMERA.position.x = cc.POSITION.X;
		g.CAMERA.position.y = cc.POSITION.Y;
		g.CAMERA.position.z = cc.POSITION.Z;
	},


	/**
	 * Initialize the controls.
	 */
	controls: function() {
		var g = GLOBAL,
		    cc = CONFIG.CONTROLS;

		g.CONTROLS = new THREE.TrackballControls( g.CAMERA, g.CONTAINER );

		g.CONTROLS.rotateSpeed = cc.ROT_SPEED;
		g.CONTROLS.zoomSpeed = cc.ZOOM_SPEED;
		g.CONTROLS.panSpeed = cc.PAN_SPEED;
		g.CONTROLS.noZoom = false;
		g.CONTROLS.noPan = false;
		g.CONTROLS.staticMoving = true;
		g.CONTROLS.dynamicDampingFactor = 0.3;

		g.CONTROLS.addEventListener( "change", render, false );
	},


	/**
	 * Initialize lights. Scene has to be initialized first.
	 */
	lights: function() {
		var g = GLOBAL,
		    l = CONFIG.LIGHTS;
		var ambient, directional;
		var lDir;

		// Lighting: Ambient
		for( var i = 0; i < l.AMBIENT.length; i++ ) {
			ambient = new THREE.AmbientLight( l.AMBIENT[i].color );
			g.LIGHTS.AMBIENT.push( ambient );
			g.SCENE.add( ambient );
		}

		// Lighting: Directional
		for( var i = 0; i < l.DIRECTIONAL.length; i++ ) {
			lDir = l.DIRECTIONAL[i];
			directional = new THREE.DirectionalLight( lDir.color, lDir.intensity );
			directional.position.set(
				lDir.position[0], lDir.position[1], lDir.position[2]
			);
			g.LIGHTS.DIRECTIONAL.push( directional );
			g.SCENE.add( directional );
		}
	},


	/**
	 * Initialize the renderer.
	 */
	renderer: function() {
		var g = GLOBAL;

		g.RENDERER = new THREE.WebGLRenderer();
		g.RENDERER.setSize( window.innerWidth, window.innerHeight );

		g.CONTAINER.appendChild( g.RENDERER.domElement );
	},


	/**
	 * Initialize the scene.
	 */
	scene: function() {
		var g = GLOBAL;

		g.SCENE = new THREE.Scene();

		// Axis
		if( CONFIG.AXIS.SHOW ) {
			Scene.addAxis();
		}

		this.lights();
	}

};



/**
 * Class for generic functions, that will be needed here and there.
 * @type {Object}
 */
var Utils = {

	/**
	 * Calculate standard variance and average of the X, Y and Z
	 * coordinates of the given vectors.
	 * @param  {Array<THREE.Vector3>} vectors The vectors to use.
	 * @return {Object}                       Object of the X, Y and Z variances and averages.
	 */
	calculateVariances: function( vectors ) {
		var x = [],
		    y = [],
		    z = [];
		var averageX = 0,
		    averageY = 0,
		    averageZ = 0;
		var varianceX = 0,
		    varianceY = 0,
		    varianceZ = 0;
		var len = vectors.length;
		var v;

		for( var i = 0; i < len; i++ ) {
			v = vectors[i];
			x.push( v.x );
			y.push( v.y );
			z.push( v.z );
			averageX += v.x;
			averageY += v.y;
			averageZ += v.z;
		}

		averageX /= len + 1;
		averageY /= len + 1;
		averageZ /= len + 1;

		for( var i = 0; i < len; i++ ) {
			varianceX += Math.pow( x[i] - averageX, 2 );
			varianceY += Math.pow( y[i] - averageY, 2 );
			varianceZ += Math.pow( z[i] - averageZ, 2 );
		}

		varianceX /= len;
		varianceY /= len;
		varianceZ /= len;

		return {
			x: varianceX,
			y: varianceY,
			z: varianceZ,
			average: {
				x: averageX,
				y: averageY,
				z: averageZ
			}
		};
	},


	/**
	 * Check if two lines intersect.
	 * @param  {THREE.Vector2} p1
	 * @param  {THREE.Vector2} p2
	 * @param  {THREE.Vector2} q1
	 * @param  {THREE.Vector2} q2
	 * @return {boolean}          True, if lines intersect, false otherwise.
	 */
	checkIntersectionOfLines2D: function( p1, p2, q1, q2 ) {
		var s, t;

		s = ( q2.x - q1.x ) * ( p1.y - q1.y ) - ( q2.y - q1.y ) * ( p1.x - q1.x );
		s /= ( q2.y - q1.y ) * ( p2.x - p1.x ) - ( q2.x - q1.x ) * ( p2.y - p1.y );
		t = ( p2.x - p1.x ) * ( p1.y - q1.y ) - ( p2.y - p1.y ) * ( p1.x - q1.x );
		t /= ( q2.y - q1.y ) * ( p2.x - p1.x ) - ( q2.x - q1.x ) * ( p2.y - p1.y );

		return ( s > 0 && s < 1 && t > 0 && t < 1 );
	},


	/**
	 * CHeck if lines of two triangles intersect.
	 * @param  {THREE.Vector2} a
	 * @param  {THREE.Vector2} b
	 * @param  {THREE.Vector2} c
	 * @param  {THREE.Vector2} fromA
	 * @param  {THREE.Vector2} fromB
	 * @param  {THREE.Vector2} v
	 * @return {boolean}             True, if triangles intersect, false otherwise.
	 */
	checkIntersectionOfTriangles2D: function( a, b, c, fromA, fromB, v ) {
		if( this.checkIntersectionOfLines2D( a, b, fromA, v ) ) {
			return true;
		}
		if( this.checkIntersectionOfLines2D( a, b, fromB, v ) ) {
			return true;
		}
		if( this.checkIntersectionOfLines2D( b, c, fromA, v ) ) {
			return true;
		}
		if( this.checkIntersectionOfLines2D( b, c, fromB, v ) ) {
			return true;
		}
		if( this.checkIntersectionOfLines2D( c, a, fromA, v ) ) {
			return true;
		}
		if( this.checkIntersectionOfLines2D( c, a, fromB, v ) ) {
			return true;
		}

		return false;
	},


	/**
	 * Compute the angle between two vertices.
	 * Angle is in degree.
	 * @param  {THREE.Vector3} vp   The previous vertex.
	 * @param  {THREE.Vector3} v    The current vertex.
	 * @param  {THREE.Vector3} vn   The next vertex.
	 * @param  {THREE.Vector3} move Move by this vector.
	 * @return {float}              Angle between the vertices in degree and flag if it has been adjusted to point into the hole.
	 */
	computeAngle: function( vp, v, vn, move ) {
		var vpClone = vp.clone().sub( v ),
		    vnClone = vn.clone().sub( v ),
		    vClone = v.clone().add( move );
		var angle, c;

		// Get angle and change radians to degree
		angle = THREE.Math.radToDeg( vpClone.angleTo( vnClone ) );

		// Get the axis described by the cross product of the vectors building the angle
		c = new THREE.Vector3().crossVectors( vpClone, vnClone );
		c.add( v ).add( move );

		// Use "the other side of the angle" if it doesn't point inside the hole
		if( c.length() < vClone.length() ) {
			angle = 360.0 - angle;
		}

		return angle;
	},


	/**
	 * Get the average length of two vectors.
	 * @param  {THREE.Vector3} vp Vector.
	 * @param  {THREE.Vector3} vn Vector.
	 * @return {float}            Average length.
	 */
	getAverageLength: function( v, w ) {
		return ( v.length() + w.length() ) / 2;
	},


	/**
	 * Get the bounding box for a bunch of geometries.
	 * @param  {Array}  geometries
	 * @return {Object}            Bounding box.
	 */
	getBoundingBox: function( geometries ) {
		var g = geometries[0];
		var bbox = {
			min: new THREE.Vector3( g.x, g.y, g.z ),
			max: new THREE.Vector3( g.x, g.y, g.z )
		};

		for( var i = 1; i < geometries.length; i++ ) {
			g = geometries[i];

			bbox.min.x = ( g.x < bbox.min.x ) ? g.x : bbox.min.x;
			bbox.min.y = ( g.y < bbox.min.y ) ? g.y : bbox.min.y;
			bbox.min.z = ( g.z < bbox.min.z ) ? g.z : bbox.min.z;

			bbox.max.x = ( g.x > bbox.max.x ) ? g.x : bbox.max.x;
			bbox.max.y = ( g.y > bbox.max.y ) ? g.y : bbox.max.y;
			bbox.max.z = ( g.z > bbox.max.z ) ? g.z : bbox.max.z;
		}

		bbox.center = new THREE.Vector3(
			( bbox.min.x + bbox.max.x ) / 2,
			( bbox.min.y + bbox.max.y ) / 2,
			( bbox.min.z + bbox.max.z ) / 2
		);

		return bbox;
	},


	/**
	 * Checks if a point lies in a triangle (2D).
	 * @param  {THREE.Vector2} p The point to check.
	 * @param  {THREE.Vector2} a Point A describing the triangle.
	 * @param  {THREE.Vector2} b Point B describing the triangle.
	 * @param  {THREE.Vector2} c Point C describing the triangle.
	 * @return {boolean}         True, if point is inside triangle, false otherwise.
	 */
	isPointInTriangle: function( p, a, b, c ) {
	    if( this.isSameSide( p, a, b, c )
	    		&& this.isSameSide( p, b, a, c )
	    		&& this.isSameSide( p, c, a, b ) ) {
	    	return true;
	    }
	    return false;
	},


	/**
	 * Check, if two points lie on the same side of a line (2D).
	 * @param  {THREE.Vector2} p1
	 * @param  {THREE.Vector2} p2
	 * @param  {THREE.Vector2} a
	 * @param  {THREE.Vector2} b
	 * @return {boolean}          True, if on the same side, false otherwise.
	 */
	isSameSide: function( p1, p2, a, b ) {
		var bClone = b.clone().sub( a );
	    var cp1 = new THREE.Vector3().crossVectors( bClone, p1.clone().sub( a ) );
	    var cp2 = new THREE.Vector3().crossVectors( bClone, p2.clone().sub( a ) );

	    return ( cp1.dot( cp2 ) >= 0 );
	}

};
