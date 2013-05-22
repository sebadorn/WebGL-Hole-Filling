"use strict";


var CANVAS = null;


/**
 * Resize the canvas to inner window dimensions.
 */
function resize() {
	CANVAS.width = window.innerWidth;
	CANVAS.height = window.innerHeight;
};


window.addEventListener( "load", function() {

	CANVAS = document.getElementById( "main" );

	resize();
	window.addEventListener( "resize", resize, false );

} );
