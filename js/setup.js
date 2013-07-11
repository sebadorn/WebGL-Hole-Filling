"use strict";


var GLOBAL = {
	CAMERA: null,
	CONTAINER: null,
	CONTROLS: null,
	HALFEDGE: null,
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


window.addEventListener( "load", Init.all.bind( Init ), false );
