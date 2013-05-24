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
		CONTAINER = document.getElementById( "container" );

		Interact.registerEvents();

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
		var cc = CONFIG.CAMERA;

		CAMERA = new THREE.PerspectiveCamera(
			cc.ANGLE,
			window.innerWidth / window.innerHeight,
			cc.ZNEAR,
			cc.ZFAR
		);
		CAMERA.position.z = 20;
	},


	/**
	 * Initialize the controls.
	 */
	controls: function() {
		CONTROLS = new THREE.OrbitControls( CAMERA );
		CONTROLS.addEventListener( "change", render, false );
	},


	/**
	 * Initialize the renderer.
	 */
	renderer: function() {
		RENDERER = new THREE.WebGLRenderer();
		RENDERER.setSize( window.innerWidth, window.innerHeight );

		CONTAINER.appendChild( RENDERER.domElement );
	},


	/**
	 * Initialize the scene.
	 */
	scene: function() {
		SCENE = new THREE.Scene();

		var ambient = new THREE.AmbientLight( 0x101030 );
		var dirLight = new THREE.DirectionalLight( 0xffeedd );

		SCENE.add( ambient );

		dirLight.position.set( 0, 0, 1 ).normalize();
		SCENE.add( dirLight );
	}

};
