"use strict";


var CAMERA = null,
    CONTAINER = null,
    CONTROLS = null,
    MODEL = null,
	RENDERER = null,
	SCENE = null;


/**
 * Start animation.
 */
function animate() {
	requestAnimationFrame( animate );
	CONTROLS.update();
};


/**
 * Render.
 */
function render() {
	RENDERER.render( SCENE, CAMERA );
};



window.addEventListener( "load", Init.all.bind( Init ), false );
