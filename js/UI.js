"use strict";


/**
 * User interface/interaction.
 * @type {Object}
 */
var UI = {

	/**
	 * Signal in the hole selection that a hole has already been filled.
	 * @param {int} index Index of the hole.
	 */
	checkHoleFinished: function( index ) {
		var holesSelect = document.getElementById( "details" ).querySelector( ".foundHoles" );
		var holeBtn;

		for( var i = holesSelect.childNodes.length - 1; i >= 0; i-- ) {
			holeBtn = holesSelect.childNodes[i];
			if( holeBtn.getAttribute( "data-index" ) == index ) {
				holeBtn.className += " filled";
				break;
			}
		}
	},


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
		this.resize();
		window.addEventListener( "resize", this.resize, false );

		this.registerImport();
		this.registerLightingOptions();
		this.registerModeOptions();
		this.registerShadingOptions();
		this.registerHoleFillingOptions();
		this.registerCameraReset();
		this.registerExport();
	},


	/**
	 * Listen to events of the camera reset button.
	 */
	registerCameraReset: function() {
		var buttonResetCamera = document.getElementById( "controls_reset" );

		buttonResetCamera.addEventListener( "click", Scene.resetCamera.bind( Scene ), false );
	},


	registerExport: function() {
		var buttonShowExport = document.getElementById( "export_options" );

		buttonShowExport.addEventListener( "click", this.showDetailExport.bind( this ), false );
	},


	/**
	 * Listen to events of the hole filling options.
	 */
	registerHoleFillingOptions: function() {
		var buttonShowEdges = document.getElementById( "hf_findedges" );

		buttonShowEdges.addEventListener( "click", Scene.showEdges.bind( Scene ), false );
	},


	/**
	 * Listen to events of the import field.
	 */
	registerImport: function() {
		var inputUpload = document.getElementById( "import_file" );

		inputUpload.addEventListener( "change", Loader.loadFile.bind( Loader ), false );
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
	 * Reset the interface.
	 */
	resetInterface: function() {
		var details = document.querySelector( ".details-holefilling" ),
		    detailFoundHoles = details.querySelector( ".detail-foundholes fieldset" ),
		    detailHoleInfoVertices = details.querySelector( "#holeinfo-vertices" ),
		    detailFillHole = details.querySelector( ".detail-fillhole fieldset" ),
		    detailFillHoleNumber = details.querySelector( ".detail-fillhole .number" );

		details.setAttribute( "hidden", "hidden" );
		this.cleanOfChildNodes( detailFoundHoles );
		this.cleanOfChildNodes( detailFillHole );
		detailFillHoleNumber.textContent = "-";
		detailHoleInfoVertices.textContent = "-";
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
		    detailHoleInfo = d.getElementById( "details" ).querySelector( ".detail-holeinfo" ),
		    index = parseInt( e.target.getAttribute( "data-index" ), 10 );
		var area, btnFill, infoVertices, number;

		for( var i = 0, len = children.length; i < len; i++ ) {
			children[i].className = children[i].className.replace( " active", "" );
		}
		e.target.className += " active";

		Scene.focusHole( index );

		// Detail: Fill Hole
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

		// Detail: Hole Info
		infoVertices = detailHoleInfo.querySelector( "#holeinfo-vertices" );
		infoVertices.textContent = GLOBAL.HOLES[index].length;
	},


	/**
	 * Show further options for the export.
	 */
	showDetailExport: function() {
		var d = document,
		    detail = d.getElementById( "details" ).querySelector( ".details-export" ),
		    formats = CONFIG.EXPORT.FORMATS,
		    section = detail.querySelector( ".detail-exportformat fieldset" );
		var btnExport, format, input, label;

		this.cleanOfChildNodes( section );

		// Export formats
		for( var i = 0; i < formats.length; i++ ) {
			format = formats[i];

			input = d.createElement( "input" );
			label = d.createElement( "label" );

			input.className = "newradio";
			input.type = "radio";
			input.name = "export";
			input.id = "export_" + formats[i];
			input.value = formats[i];

			if( i == 0 ) {
				input.setAttribute( "checked", "checked" );
			}

			label.className = "newradio";
			label.setAttribute( "for", "export_" + formats[i] );
			label.textContent = formats[i];

			section.appendChild( input );
			section.appendChild( label );
		}

		// Button to start export
		btnExport = d.createElement( "input" );
		btnExport.className = "button";
		btnExport.type = "button";
		btnExport.value = "Export";
		btnExport.addEventListener( "click", this.startExport.bind( section ), false );

		section.appendChild( btnExport );

		this.hideAllDetails();
		detail.removeAttribute( "hidden" );
	},


	/**
	 * List the found holes.
	 * @param {Array<THREE.Line>} foundHoles The found holes.
	 */
	showDetailHoles: function( foundHoles ) {
		var d = document,
		    detail = d.getElementById( "details" ).querySelector( ".details-holefilling" ),
		    section = detail.querySelector( ".detail-foundholes fieldset" ),
		    selection = d.createElement( "div" );

		this.cleanOfChildNodes( section );
		selection.className = "selectContainer foundHoles";

		if( foundHoles.length > 0 ) {
			var btnFocusHole;

			for( var i = 0; i < foundHoles.length; i++ ) {
				btnFocusHole = d.createElement( "input" );
				btnFocusHole.type = "button";
				btnFocusHole.value = "Hole " + ( i + 1 );
				btnFocusHole.className = "foundHole";
				btnFocusHole.style.borderLeftColor = "#" + foundHoles[i].material.color.getHexString();
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
		detail.removeAttribute( "hidden" );
	},


	/**
	 * Trigger the export.
	 * this == export section
	 * Source: http://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
	 */
	startExport: function( e ) {
		var d = document;
		var format = this.querySelector( "input.newradio:checked" );
		var exportData;

		format = format.value.toLowerCase();
		exportData = Scene.exportModel( format );

		var content = new Blob( [exportData], { type: "text/plain" } );
		var download = d.createElement( "a" );

		download.download = "export." + format;
		download.href = window.URL.createObjectURL( content );
		download.addEventListener( "click", Utils.selfRemoveFromDOM, false );
		download.setAttribute( "hidden", "hidden" );

		d.body.appendChild( download );
		download.click();
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
