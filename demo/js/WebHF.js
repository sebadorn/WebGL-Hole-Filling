'use strict';


/**
 * @namespace WebHF
 */
const WebHF = {


	camera: null,
	controls: null,
	lights: {
		ambient: [],
		camera: [],
		directional: []
	},
	renderer: null,


	/**
	 * Intialize everything: Camera, scene, renderer …
	 */
	init() {
		const container = document.getElementById( 'container' );

		this.loadChosenAdvancingFrontFile();

		this.UI.init();

		this._initCamera();
		this.SceneManager.init();
		this._initLights();
		this._initRenderer( container );
		this._initControls( container, () => {
			this.animate();
			this.render();
		} );
	},


	/**
	 * Intialize the camera.
	 * @private
	 */
	_initCamera() {
		const cc = CONFIG.CAMERA;

		WebHF.camera = new THREE.PerspectiveCamera(
			cc.ANGLE,
			window.innerWidth / window.innerHeight,
			cc.ZNEAR,
			cc.ZFAR
		);

		// Camera position doesn't really matter at this point.
		// Will get overwritten the moment a model has been loaded.
		WebHF.camera.position.x = 10;
		WebHF.camera.position.y = 10;
		WebHF.camera.position.z = 10;
	},


	/**
	 * Initialize the controls.
	 * @private
	 * @param {HTMLElement} container
	 * @param {function}    cb
	 */
	_initControls( container, cb ) {
		const cc = CONFIG.CONTROLS;

		const proceed = module => {
			WebHF.controls = new module.TrackballControls( WebHF.camera, container );

			WebHF.controls.rotateSpeed = cc.ROT_SPEED;
			WebHF.controls.zoomSpeed = cc.ZOOM_SPEED;
			WebHF.controls.panSpeed = cc.PAN_SPEED;
			WebHF.controls.noZoom = false;
			WebHF.controls.noPan = false;
			WebHF.controls.staticMoving = true;
			WebHF.controls.dynamicDampingFactor = 0.3;

			WebHF.controls.addEventListener( 'change', this.SceneManager.moveCameraLights );
			WebHF.controls.addEventListener( 'change', WebHF.render );

			cb();
		};

		/* jshint ignore:start */
		import( './threeJS/controls/TrackballControls.js' ).then( proceed );
		/* jshint ignore:end */
	},


	/**
	 * Initialize lights. Scene has to be initialized first.
	 * @private
	 */
	_initLights() {
		const d = document;
		const LIGHTS = CONFIG.LIGHTS;
		const scene = this.SceneManager.scene;


		// Lighting: Ambient

		// Remove light option if no lights if this type exist
		if( LIGHTS.AMBIENT.length == 0 ) {
			const sectionAmbient = d.getElementById( "light_ambient" );
			sectionAmbient.parentNode.removeChild( sectionAmbient );
		}

		for( let i = 0; i < LIGHTS.AMBIENT.length; i++ ) {
			const ambient = new THREE.AmbientLight( LIGHTS.AMBIENT[i].color );

			WebHF.lights.ambient.push( ambient );
			scene.add( ambient );
		}


		// Lighting: Directional, moves with camera

		// Remove light option if no lights if this type exist
		if( LIGHTS.CAMERA.length == 0 ) {
			const sectionCamera = d.getElementById( "light_camera" );
			sectionCamera.parentNode.removeChild( sectionCamera );
		}

		for( let i = 0; i < LIGHTS.CAMERA.length; i++ ) {
			const lDir = LIGHTS.CAMERA[i];
			const directional = new THREE.DirectionalLight( lDir.color, lDir.intensity );

			WebHF.lights.camera.push( directional );
			scene.add( directional );
		}


		// Lighting: Directional

		// Remove light option if no lights if this type exist
		if( LIGHTS.DIRECTIONAL.length == 0 ) {
			const sectionDirectional = d.getElementById( "light_directional" );
			sectionDirectional.parentNode.removeChild( sectionDirectional );
		}

		for( let i = 0; i < LIGHTS.DIRECTIONAL.length; i++ ) {
			const lDir = LIGHTS.DIRECTIONAL[i];
			const directional = new THREE.DirectionalLight( lDir.color, lDir.intensity );
			directional.position.set( lDir.position[0], lDir.position[1], lDir.position[2] );

			WebHF.lights.directional.push( directional );
			scene.add( directional );
		}
	},


	/**
	 * Initialize the renderer.
	 * @private
	 * @param {HTMLElement} container
	 */
	_initRenderer( container ) {
		WebHF.renderer = new THREE.WebGLRenderer( CONFIG.RENDERER );
		WebHF.renderer.setSize( window.innerWidth, window.innerHeight );

		container.appendChild( WebHF.renderer.domElement );
	},


	/**
	 * Start animation.
	 */
	animate() {
		requestAnimationFrame( WebHF.animate );
		WebHF.controls.update();
	},


	/**
	 * Load the JavaScript file for the chosen Advancing Front implementation.
	 */
	loadChosenAdvancingFrontFile() {
		const script = document.createElement( 'script' );
		script.src = `js/AdvancingFront-${ CONFIG.FILLING.AF_MODE }.js`;

		if( CONFIG.DEBUG.AF_INVALIDATE_CACHE ) {
			script.src += '?uncache=' + Date.now();
		}

		document.head.appendChild( script );
	},


	/**
	 * Render.
	 */
	render() {
		WebHF.renderer.render( WebHF.SceneManager.scene, WebHF.camera );
	},


	/**
	 * Adjust camera and renderer to new window size.
	 */
	resize() {
		if( WebHF.camera ) {
			WebHF.camera.aspect = window.innerWidth / window.innerHeight;
			WebHF.camera.updateProjectionMatrix();
		}

		if( WebHF.renderer ) {
			WebHF.renderer.setSize( window.innerWidth, window.innerHeight );
			WebHF.render();
		}
	}


};
