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
		var inputUpload;

		this.resize();
		window.addEventListener( "resize", this.resize, false );

		inputUpload = d.getElementById( "import_file" );
		inputUpload.addEventListener( "change", Loader.loadFile.bind( Loader ), false );

		this.registerModeOptions();
		this.registerShadingOptions();
		this.registerHoleFillingOptions();
	},


	/**
	 * Listen to events of the hole filling options.
	 */
	registerHoleFillingOptions: function() {
		var d = document;
		var test;

		test = d.getElementById( "hf_test" );
		test.addEventListener( "click", HoleDetection.naive.bind( HoleDetection ), false );
	},


	/**
	 * Listen to events of the mode options.
	 */
	registerModeOptions: function() {
		var d = document,
		    modeOptions = ["solid", "wireframe"];
		var radio;

		for( var i = 0; i < modeOptions.length; i++ ) {
			radio = d.getElementById( "render_" + modeOptions[i] );
			radio.addEventListener( "change", Scene.changeMode.bind( Scene ), false );
		}
	},


	/**
	 * Listen to events of the shading options.
	 */
	registerShadingOptions: function() {
		var d = document,
		    shadingOptions = ["flat", "phong"];
		var radio;

		for( var i = 0; i < shadingOptions.length; i++ ) {
			radio = d.getElementById( "shading_" + shadingOptions[i] );
			radio.addEventListener( "change", Scene.changeShading.bind( Scene ), false );
		}
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
