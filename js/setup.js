"use strict";


var GLOBAL = {
	CAMERA: null,
	CONTROLS: null,
	FILLINGS: {},
	HOLES: [],
	LIGHTS: {
		AMBIENT: [],
		DIRECTIONAL: [],
		CAMERA: []
	},
	RENDERER: null
};


/**
 * Start animation.
 */
function animate() {
	requestAnimationFrame( animate );
	GLOBAL.CONTROLS.update();
}


/**
 * Render.
 */
function render() {
	var g = GLOBAL;

	g.RENDERER.render( SceneManager.scene, g.CAMERA );
}


/**
 * Adjust camera and renderer to new window size.
 */
function resize() {
	var g = GLOBAL;

	if( g.CAMERA ) {
		g.CAMERA.aspect = window.innerWidth / window.innerHeight;
		g.CAMERA.updateProjectionMatrix();
	}
	if( g.RENDERER ) {
		g.RENDERER.setSize( window.innerWidth, window.innerHeight );
		render();
	}
}


/**
 * Error handler for requestFileSystem.
 * @param {FileError} errorFS FileError object.
 */
function errorHandlerFS( errorFS ) {
	console.error( errorFS );
}


window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

window.addEventListener( "load", Init.all.bind( Init ), false );
