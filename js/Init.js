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

		UI.registerEvents();

		this.camera();
		this.controls();
		this.scene();
		this.renderer();

		animate();
		render();
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

		g.CONTROLS = new THREE.TrackballControls( g.CAMERA );

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
		var ambient, dirLight;

		ambient = new THREE.AmbientLight( 0x101010 );
		g.SCENE = new THREE.Scene();
		g.SCENE.add( ambient );

		dirLight = new THREE.DirectionalLight( 0xffffff );
		dirLight.position.set( 0, 0, 1 ).normalize();
		g.SCENE.add( dirLight );
	}

};
