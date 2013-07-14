"use strict";


/**
 * User interface/interaction.
 * @type {Object}
 */
var UI = {

	/**
	 * Remove all child nodes of a node.
	 * @param  {DOMElement} node
	 * @return {DOMElement} The given node after removing the child nodes.
	 */
	cleanOfChildNodes: function( node ) {
		for( var i = node.childNodes.length - 1; i >= 0; i-- ) {
			node.removeChild( node.childNodes[i] );
		}
		return node;
	},


	/**
	 * Hide all details.
	 */
	hideAllDetails: function() {
		var details = document.getElementById( "details" ).querySelectorAll( ".details-collection" );

		for( var i = details.length - 1; i >= 0; i-- ) {
			details[i].setAttribute( "hidden", "hidden" );
		}
	},


	/**
	 * Init everything related to UI.
	 */
	init: function() {
		this.syncInterfaceWithConfig();
		this.registerEvents();
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
	 * Select a hole. Focus on it and show additional details.
	 */
	selectHole: function( e ) {
		var d = document;
		var children = e.target.parentNode.childNodes,
		    detailFillHole = d.getElementById( "details" ).querySelector( ".detail-fillhole" ),
		    index = parseInt( e.target.getAttribute( "data-index" ), 10 );
		var area, btnFill, number;

		for( var i = 0, len = children.length; i < len; i++ ) {
			children[i].className = children[i].className.replace( " active", "" );
		}
		e.target.className += " active";

		Scene.focusHole( index );

		number = detailFillHole.querySelector( ".caption .number" );
		number.textContent = index + 1;

		btnFill = d.createElement( "input" );
		btnFill.type = "button";
		btnFill.className = "button";
		btnFill.value = "Advancing Front";
		btnFill.setAttribute( "data-fillhole", index );
		btnFill.addEventListener( "click", Scene.fillHole.bind( Scene ), false );

		area = detailFillHole.querySelector( "fieldset" );
		this.cleanOfChildNodes( area );
		area.appendChild( btnFill );
	},


	/**
	 * List the found holes.
	 * @param {int} foundHoles Number of found holes.
	 */
	showDetailHoles: function( foundHoles ) {
		var d = document,
		    details = d.getElementById( "details" ).querySelector( ".details-holefilling" ),
		    section = details.querySelector( ".detail-foundholes fieldset" ),
		    selection = d.createElement( "div" );

		this.cleanOfChildNodes( section );
		selection.className = "selectContainer foundHoles";

		if( foundHoles > 0 ) {
			var btnFocusHole;

			for( var i = 0; i < foundHoles; i++ ) {
				btnFocusHole = d.createElement( "input" );
				btnFocusHole.type = "button";
				btnFocusHole.value = "Hole " + ( i + 1 );
				btnFocusHole.className = "foundHole";
				btnFocusHole.setAttribute( "data-index", i );
				btnFocusHole.addEventListener( "click", this.selectHole.bind( this ), false );

				selection.appendChild( btnFocusHole );
			}
			section.appendChild( selection );
		}
		else {
			var msg = d.createElement( "p" );
			msg.className = "message";
			msg.textContent = "No holes found."

			section.appendChild( msg );
		}

		this.hideAllDetails();
		details.removeAttribute( "hidden" );
	},


	/**
	 * Set the user interface settings according to the settings in the config file (config.js).
	 */
	syncInterfaceWithConfig: function() {
		var cfg = CONFIG,
		    d = document;

		// Rendering: Mode
		if( cfg.MODE == "solid" ) {
			d.getElementById( "render_solid" ).setAttribute( "checked", "checked" );
		}
		else if( cfg.MODE == "wireframe" ) {
			d.getElementById( "render_wireframe" ).setAttribute( "checked", "checked" );
		}

		// Rendering: Shading
		if( cfg.SHADING == "phong" ) {
			d.getElementById( "shading_phong" ).setAttribute( "checked", "checked" );
		}
		else if( cfg.SHADING == "flat" ) {
			d.getElementById( "shading_flat" ).setAttribute( "checked", "checked" );
		}
	}

};
