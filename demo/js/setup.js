"use strict";


var GLOBAL = {
	CAMERA: null,
	CONTROLS: null,
	LIGHTS: {
		AMBIENT: [],
		DIRECTIONAL: [],
		CAMERA: []
	},
	RENDERER: null,
	URL: null
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


/**
 * Compare function for numeric values in arrays.
 * @param  {float} a Value a.
 * @param  {float} b Value b.
 * @return {float}   Wether a is greater (or equal) than b.
 */
function numCompareFunc( a, b ) {
	return ( a - b );
}



var url = document.location.href;
var index = url.indexOf( "index.html" );

if( index != -1 ) {
	url = url.substring( 0, index );
}
GLOBAL.URL = url;


window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

window.addEventListener( "load", Init.all.bind( Init ), false );
