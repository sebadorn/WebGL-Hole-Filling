"use strict";


/**
 * User interface/interaction.
 * @type {Object}
 */
var UI = {

	MOUSE: {
		X: null,
		Y: null
	},
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
		var buttonClose, topBar;

		this.TOOLWINDOW = document.getElementById( "tool-extra-window" );

		buttonClose = this.TOOLWINDOW.querySelector( ".icon-close" );
		buttonClose.addEventListener( "click", this.closeToolWindow.bind( this ), false );

		topBar = this.TOOLWINDOW.querySelector( "legend" );
		document.addEventListener( "mouseup", this.moveToolWindowEnd.bind( this ), false );
		topBar.addEventListener( "mousedown", this.moveToolWindowStart.bind( this ), false );
	},


	/**
	 * Move the tool window with the mouse.
	 */
	moveToolWindow: function( e ) {
		var tw = UI.TOOLWINDOW,
		    oldX = tw.offsetLeft,
		    oldY = tw.offsetTop,
		    posX = oldX + ( e.clientX - UI.MOUSE.X ),
		    posY = oldY + ( e.clientY - UI.MOUSE.Y );

		// X limits
		if( posX < 76 ) {
			posX = 76;
		}
		else if( posX > window.innerWidth - tw.offsetWidth - 16 ) {
			posX = window.innerWidth - tw.offsetWidth - 16;
		}

		// Y limits
		if( posY < 16 ) {
			posY = 16;
		}
		else if( posY > window.innerHeight - tw.offsetHeight - 16 ) {
			posY = window.innerHeight - tw.offsetHeight - 16;
		}

		UI.MOUSE.X = e.clientX;
		UI.MOUSE.Y = e.clientY;

		tw.style.left = posX + "px";
		tw.style.top = posY + "px";
	},


	/**
	 * Initialize moving of tool window.
	 */
	moveToolWindowEnd: function( e ) {
		document.removeEventListener( "mousemove", this.moveToolWindow, false );
		this.MOUSE.X = null;
		this.MOUSE.Y = null;
	},


	/**
	 * Initialize moving of tool window.
	 */
	moveToolWindowStart: function( e ) {
		this.MOUSE.X = e.clientX;
		this.MOUSE.Y = e.clientY;
		document.addEventListener( "mousemove", this.moveToolWindow, false );
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

		buttonShowEdges = d.getElementById( "hf_findedges" );
		buttonShowEdges.addEventListener( "click", Scene.showEdges.bind( Scene ), false );
	},


	/**
	 * Listen to events of the lighting options.
	 */
	registerLightingOptions: function() {
		var d = document,
		    lightOptions = ["on", "off"],
		    lightTypes = ["ambient", "directional"];
		var radio;

		for( var i = 0; i < lightTypes.length; i++ ) {
			for( var j = 0; j < lightOptions.length; j++ ) {
				radio = d.getElementById( "light_" + lightTypes[i] + "_" + lightOptions[j] );
				radio.addEventListener( "change", Scene.toggleLight.bind( Scene ), false );
			}
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
	 * Show a little window with information about the found holes.
	 * @param {int} foundHoles New number of found holes.
	 */
	showWindowHoles: function( foundHoles ) {
		if( this.TOOLWINDOW.hasAttribute( "hidden" ) ) {
			this.TOOLWINDOW.removeAttribute( "hidden" );
		}

		var d = document,
		    section = this.TOOLWINDOW.querySelector( "section" );
		var btnFocusHole;

		for( var i = 0; i < foundHoles; i++ ) {
			btnFocusHole = d.createElement( "input" );
			btnFocusHole.type = "button";
			btnFocusHole.value = "Hole " + ( i + 1 );
			btnFocusHole.setAttribute( "data-index", i );
			btnFocusHole.addEventListener( "click", Scene.focusHole, false );

			section.appendChild( btnFocusHole );
		}
	}

};
