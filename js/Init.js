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
		var container = document.getElementById( "container" );

		this.loadChosenAdvancingFrontFile();

		UI.init();

		this.camera();
		SceneManager.init();
		this.lights();
		this.renderer( container );
		this.controls( container );

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
	controls: function( container ) {
		var g = GLOBAL,
		    cc = CONFIG.CONTROLS;

		g.CONTROLS = new THREE.TrackballControls( g.CAMERA, container );

		g.CONTROLS.rotateSpeed = cc.ROT_SPEED;
		g.CONTROLS.zoomSpeed = cc.ZOOM_SPEED;
		g.CONTROLS.panSpeed = cc.PAN_SPEED;
		g.CONTROLS.noZoom = false;
		g.CONTROLS.noPan = false;
		g.CONTROLS.staticMoving = true;
		g.CONTROLS.dynamicDampingFactor = 0.3;

		g.CONTROLS.addEventListener( "change", SceneManager.moveCameraLights, false );
		g.CONTROLS.addEventListener( "change", render, false );
	},


	/**
	 * Initialize lights. Scene has to be initialized first.
	 */
	lights: function() {
		var d = document,
		    g = GLOBAL,
		    l = CONFIG.LIGHTS,
		    s = SceneManager.scene;
		var camPos = CONFIG.CAMERA.POSITION;
		var ambient, directional, lDir, sectionAmbient, sectionCamera, sectionDirectional;

		// Lighting: Ambient
		if( l.AMBIENT.length == 0 ) {
			sectionAmbient = d.getElementById( "light_ambient" );
			sectionAmbient.parentNode.removeChild( sectionAmbient );
		}

		for( var i = 0; i < l.AMBIENT.length; i++ ) {
			ambient = new THREE.AmbientLight( l.AMBIENT[i].color );

			g.LIGHTS.AMBIENT.push( ambient );
			s.add( ambient );
		}

		// Lighting: Directional, moves with camera
		if( l.CAMERA.length == 0 ) {
			sectionCamera = d.getElementById( "light_camera" );
			sectionCamera.parentNode.removeChild( sectionCamera );
		}

		for( var i = 0; i < l.CAMERA.length; i++ ) {
			lDir = l.CAMERA[i];
			directional = new THREE.DirectionalLight( lDir.color, lDir.intensity );
			directional.position.set( camPos.X, camPos.Y, camPos.Z );

			g.LIGHTS.CAMERA.push( directional );
			s.add( directional );
		}

		// Lighting: Directional
		if( l.DIRECTIONAL.length == 0 ) {
			sectionDirectional = d.getElementById( "light_directional" );
			sectionDirectional.parentNode.removeChild( sectionDirectional );
		}

		for( var i = 0; i < l.DIRECTIONAL.length; i++ ) {
			lDir = l.DIRECTIONAL[i];
			directional = new THREE.DirectionalLight( lDir.color, lDir.intensity );
			directional.position.set( lDir.position[0], lDir.position[1], lDir.position[2] );

			g.LIGHTS.DIRECTIONAL.push( directional );
			s.add( directional );
		}
	},


	/**
	 * Load the JavaScript file for the chosen Advancing Front implementation.
	 */
	loadChosenAdvancingFrontFile: function() {
		var script = document.createElement( "script" );

		script.src = "js/AdvancingFront-" + CONFIG.FILLING.AF_MODE + ".js";

		if( CONFIG.DEBUG.AF_INVALIDATE_CACHE ) {
			script.src += "?uncache=" + Math.round( Math.random() * 10000 );
		}

		document.head.appendChild( script );
	},


	/**
	 * Initialize the renderer.
	 */
	renderer: function( container ) {
		var g = GLOBAL;

		g.RENDERER = new THREE.WebGLRenderer();
		g.RENDERER.setSize( window.innerWidth, window.innerHeight );

		container.appendChild( g.RENDERER.domElement );
	}

};
