"use strict";


/**
 * User interface/interaction.
 * @type {Object}
 */
var UI = {

	TOOLWINDOW: null,


	/**
	 * Hide the extra tool window.
	 */
	closeToolWindow: function() {
		if( !this.TOOLWINDOW.hasAttribute( "hidden" ) ) {
			this.TOOLWINDOW.setAttribute( "hidden" );
		}
	},


	/**
	 * Init everything related to UI.
	 */
	init: function() {
		this.initToolWindow();
		this.registerEvents();
	},


	/**
	 * Init the extra tool window.
	 */
	initToolWindow: function() {
		var buttonClose;

		this.TOOLWINDOW = document.getElementById( "tool-extra-window" );

		buttonClose = this.TOOLWINDOW.querySelector( ".icon-close" );
		buttonClose.addEventListener( "click", this.closeToolWindow.bind( this ), false );
	},


	/**
	 * Add all the needed event listeners.
	 */
	registerEvents: function() {
		var d = document;
		var buttonResetCamera, inputUpload;

		this.resize();
		window.addEventListener( "resize", this.resize, false );

		inputUpload = d.getElementById( "import_file" );
		inputUpload.addEventListener( "change", Loader.loadFile.bind( Loader ), false );

		this.registerLightingOptions();
		this.registerModeOptions();
		this.registerShadingOptions();
		this.registerHoleFillingOptions();

		buttonResetCamera = d.getElementById( "controls_reset" );
		buttonResetCamera.addEventListener( "click", Scene.resetCamera.bind( Scene ), false );
	},


	/**
	 * Listen to events of the hole filling options.
	 */
	registerHoleFillingOptions: function() {
		var d = document;
		var buttonShowEdges;

		buttonShowEdges = d.getElementById( "hf_showedges" );
		buttonShowEdges.addEventListener( "click", Scene.showEdges.bind( Scene ), false );
	},


	registerLightingOptions: function() {
		var d = document,
		    lightingOptions = ["on", "off"];
		var radio;

		for( var i = 0; i < lightingOptions.length; i++ ) {
			radio = d.getElementById( "light_" + lightingOptions[i] );
			radio.addEventListener( "change", function(){}, false ); // TODO
		}
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
	},


	/**
	 * Update the counter of found holes.
	 * @param {int} foundHoles New number of found holes.
	 */
	updateWindowHoles: function( foundHoles ) {
		if( this.TOOLWINDOW.hasAttribute( "hidden" ) ) {
			this.TOOLWINDOW.removeAttribute( "hidden" );
		}

		var section = this.TOOLWINDOW.querySelector( "section" );

		section.textContent = foundHoles;
	}

};
