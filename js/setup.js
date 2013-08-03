"use strict";


var GLOBAL = {
	CAMERA: null,
	CONTAINER: null,
	CONTROLS: null,
	FILLINGS: {},
	HOLES: [],
	LIGHTS: {
		AMBIENT: [],
		DIRECTIONAL: []
	},
	MODEL: null,
	RENDERER: null,
	SCENE: null
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

	g.RENDERER.render( g.SCENE, g.CAMERA );
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
