"use strict";


/**
 * User interface/interaction.
 * @type {Object}
 */
var UI = {

	/**
	 * Add all the needed event listeners.
	 */
	registerEvents: function() {
		var d = document;
		var inputUpload, radioModeSolid, radioModeWireframe;

		this.resize();
		window.addEventListener( "resize", this.resize, false );

		inputUpload = d.getElementById( "import_file" );
		inputUpload.addEventListener( "change", Loader.loadFile.bind( Loader ), false );

		radioModeSolid = d.getElementById( "render_solid" );
		radioModeSolid.addEventListener( "change", Scene.changeMode.bind( Scene ), false );

		radioModeWireframe = d.getElementById( "render_wireframe" );
		radioModeWireframe.addEventListener( "change", Scene.changeMode.bind( Scene ), false );
	},


	/**
	 * Adjust camera and renderer to new window size.
	 */
	resize: function() {
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

};
