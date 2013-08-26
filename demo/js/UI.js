"use strict";


/**
 * User interface/interaction.
 * @type {Object}
 */
var UI = {

	callbackExport: null,
	callbackFillHole: null,
	domDetails: null,
	fillButton: null,
	visibleProgress: null,


	/**
	 * Change the export filename according to the chosen file format.
	 */
	changeExportName: function( e ) {
		var format = e.target.value.toLowerCase(),
		    textInput = document.getElementById( "export_name" );
		var nameParts = textInput.value.split( "." );

		textInput.value = textInput.value.replace( nameParts[nameParts.length - 1], format );
	},


	/**
	 * Signal in the hole selection that a hole has already been filled.
	 * @param {int} index Index of the hole.
	 */
	checkHoleFinished: function( index ) {
		var holesSelect = this.domDetails.querySelector( ".foundHoles" );
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
	 * Disable the fill button.
	 */
	disableFillButton: function() {
		if( this.fillButton.className.indexOf( " disabled" ) < 0 ) {
			this.fillButton.removeEventListener( "click", this.callbackFillHole, false );
			this.fillButton.className += " disabled";
		}
	},


	/**
	 * Dragover event of import area.
	 */
	dragoverOfImport: function( e ) {
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
	},


	/**
	 * Hide all details.
	 */
	hideAllDetails: function() {
		var details = this.domDetails.querySelectorAll( ".details-collection" );

		for( var i = details.length - 1; i >= 0; i-- ) {
			details[i].setAttribute( "hidden", "hidden" );
		}
	},


	/**
	 * Init everything related to UI.
	 */
	init: function() {
		this.domDetails = document.getElementById( "details" );

		this.callbackExport = this.startExport.bind( this.domDetails.querySelector( ".details-export" ) );
		this.callbackFillHole = SceneManager.fillHole.bind( SceneManager );

		this.fillButton = document.querySelector( ".fillholeStart" );

		this.syncInterfaceWithConfig();
		this.REGISTER.registerEvents();
	},


	/**
	 * Reset the interface.
	 */
	resetInterface: function() {
		var details = this.domDetails.querySelectorAll( ".details-collection" );

		for( var i = 0; i < details.length; i++ ) {
			details[i].setAttribute( "hidden", "hidden" );
		}

		this.visibleProgress = null;
	},


	/**
	 * Select a hole. Focus on it and show additional details.
	 */
	selectHole: function( e ) {
		var children = e.target.parentNode.childNodes,
		    detailFillHole = this.domDetails.querySelector( ".detail-fillhole" ),
		    detailHoleInfo = this.domDetails.querySelector( ".detail-holeinfo" ),
		    index = parseInt( e.target.getAttribute( "data-index" ), 10 );
		var area, infoVertices, merging, number;


		for( var i = 0, len = children.length; i < len; i++ ) {
			children[i].className = children[i].className.replace( " active", "" );
		}
		e.target.className += " active";

		SceneManager.focusHole( index );


		// Detail: Hole Info
		infoVertices = detailHoleInfo.querySelector( "#holeinfo-vertices" );
		infoVertices.textContent = SceneManager.holes[index].length;


		// Merging threshold
		merging = document.getElementById( "merge-threshold" );
		merging.value = SceneManager.holes[index].thresholdMerging;


		// Detail: Fill Hole
		number = detailFillHole.querySelector( ".caption .number" );
		number.textContent = index + 1;


		// Start button
		this.fillButton.setAttribute( "data-fillhole", index );
		this.fillButton.removeEventListener( "click", this.callbackFillHole, false );

		if( e.target.className.indexOf( "filled" ) >= 0 ) {
			if( this.fillButton.className.indexOf( " disabled" ) < 0 ) {
				this.fillButton.className += " disabled";
			}
		}
		else {
			this.fillButton.addEventListener( "click", this.callbackFillHole, false );
			this.fillButton.className = this.fillButton.className.replace( " disabled", "" );
		}


		// Progress bar
		if( e.target.className.indexOf( "filled" ) < 0 ) {
			UI.updateProgress( 0 );
		}
		else {
			UI.updateProgress( 100 );
		}
	},


	/**
	 * Show further options for the export.
	 */
	showDetailExport: function() {
		var detail = this.domDetails.querySelector( ".details-export" ),
		    formats = CONFIG.EXPORT.FORMATS;
		var sectionFormat = detail.querySelector( ".detail-exportformat fieldset" ),
		    sectionName = detail.querySelector( ".detail-exportname fieldset" ),
		    sectionExport = detail.querySelector( ".detail-export fieldset" ),
		    sectionProgress = detail.querySelector( ".detail-exportprogress fieldset" );
		var btnExport, defaultName, exportName, format, radioPair;


		// Export formats
		this.cleanOfChildNodes( sectionFormat );

		for( var i = 0; i < formats.length; i++ ) {
			format = formats[i];

			radioPair = this.BUILDER.createRadioPair( "export", "export_" + format, format, format );
			radioPair.radio.addEventListener( "change", this.changeExportName, false );

			if( format == CONFIG.EXPORT.DEFAULT_FORMAT ) {
				radioPair.radio.setAttribute( "checked", "checked" );
			}

			sectionFormat.appendChild( radioPair.radio );
			sectionFormat.appendChild( radioPair.button );
		}


		// Insert name for model
		defaultName = SceneManager.model.name + "_filled." + CONFIG.EXPORT.DEFAULT_FORMAT.toLowerCase();

		exportName = sectionName.querySelector( "#export_name" );
		exportName.value = defaultName;


		// Button to start export
		btnExport = sectionExport.querySelector( ".button" );
		btnExport.removeEventListener( "click", this.callbackExport, false );
		btnExport.addEventListener( "click", this.callbackExport, false );


		// Progress
		this.cleanOfChildNodes( sectionProgress );
		this.visibleProgress = this.BUILDER.createProgress();
		sectionProgress.appendChild( this.visibleProgress );


		this.hideAllDetails();
		detail.removeAttribute( "hidden" );
	},


	/**
	 * List the found holes.
	 * @param {Array<THREE.Line>} foundHoles The found holes.
	 */
	showDetailHoles: function( foundHoles ) {
		var detail = this.domDetails.querySelector( ".details-holefilling" );
		var sectionFoundHoles = detail.querySelector( ".detail-foundholes fieldset" ),
		    sectionHoleInfo = detail.querySelector( ".detail-holeinfo fieldset" ),
		    sectionFillHole = detail.querySelector( ".detail-fillhole fieldset" ),
		    sectionProgress = detail.querySelector( ".detail-fillprogress fieldset" );
		var btnFocusHole, callback, holeNumber, holeSelection,
		    holeVertices, merging, msg;


		// Found holes
		holeSelection = sectionFoundHoles.querySelector( ".foundHoles" );
		this.cleanOfChildNodes( holeSelection );

		msg = sectionFoundHoles.querySelector( ".message" );

		if( foundHoles.length > 0 ) {
			msg.setAttribute( "hidden", "hidden" );

			for( var i = 0; i < foundHoles.length; i++ ) {
				btnFocusHole = this.BUILDER.createButton(
					"Hole " + ( i + 1 ), this.selectHole.bind( this )
				);
				btnFocusHole.className = "foundHole";
				btnFocusHole.style.borderLeftColor = "#" + foundHoles[i].material.color.getHexString();
				btnFocusHole.setAttribute( "data-index", i );

				holeSelection.appendChild( btnFocusHole );
			}
			sectionFoundHoles.appendChild( holeSelection );
		}
		else {
			msg.removeAttribute( "hidden" );
		}


		// Hole info
		holeVertices = sectionHoleInfo.querySelector( "#holeinfo-vertices" );
		holeVertices.textContent = "-";


		// Fill hole options
		holeNumber = document.querySelector( ".detail-fillhole .number" );
		holeNumber.textContent = "-";

		merging = sectionFillHole.querySelector( "#merge-threshold" );
		merging.value = "0.000";


		// Progress
		this.cleanOfChildNodes( sectionProgress );
		this.visibleProgress = this.BUILDER.createProgress();
		sectionProgress.appendChild( this.visibleProgress );


		this.hideAllDetails();
		detail.removeAttribute( "hidden" );
	},


	/**
	 * Trigger the export.
	 * this == export detail
	 * Source: http://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
	 */
	startExport: function( e ) {
		var d = document;
		var format = this.querySelector( ".detail-exportformat input.newradio:checked" ),
		    name = this.querySelector( "#export_name" );
		var content, download, exportData;

		format = format.value.toLowerCase();
		exportData = SceneManager.exportModel( format, name.value.replace( "." + format, "" ) );
		content = new Blob( [exportData], { type: "text/plain" } );

		UI.updateProgress( 100 );

		download = d.createElement( "a" );
		download.download = name.value;
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
			d.getElementById( "render_solid_model" ).setAttribute( "checked", "checked" );
			d.getElementById( "render_solid_filling" ).setAttribute( "checked", "checked" );
		}
		else if( cfg.MODE == "wireframe" ) {
			d.getElementById( "render_wireframe_model" ).setAttribute( "checked", "checked" );
			d.getElementById( "render_wireframe_filling" ).setAttribute( "checked", "checked" );
		}

		// Rendering: Shading
		if( cfg.SHADING == "phong" ) {
			d.getElementById( "shading_phong" ).setAttribute( "checked", "checked" );
		}
		else if( cfg.SHADING == "flat" ) {
			d.getElementById( "shading_flat" ).setAttribute( "checked", "checked" );
		}

		// Hole filling: Collision test
		if( cfg.FILLING.COLLISION_TEST == "filling" ) {
			d.getElementById( "collision_test_filling" ).setAttribute( "checked", "checked" );
		}
		else if( cfg.FILLING.COLLISION_TEST == "all" ) {
			d.getElementById( "collision_test_all" ).setAttribute( "checked", "checked" );
		}

		if( cfg.FILLING.AF_MODE == "parallel" ) {
			d.getElementById( "collision-worker" ).value = cfg.FILLING.WORKER;
			d.getElementById( "collision-worker" ).parentNode.removeAttribute( "hidden" );
		}
	},


	/**
	 * Update the visible progress bar.
	 * @param {int} value New progress value. Think of it in percent.
	 */
	updateProgress: function( value ) {
		this.visibleProgress.value = value;
		this.visibleProgress.textContent = value + "%";

		if( value == 100 ) {
			this.visibleProgress.className += " finished";
		}
		else {
			this.visibleProgress.className = this.visibleProgress.className.replace( " finished", "" );
		}
	}

};



/**
 * Sub-class of UI for building HTMLObjects.
 * @type {Object}
 */
UI.BUILDER = {

	/**
	 * Create a button.
	 * @param  {String}     value     Value of the input.
	 * @param  {Function}   clickCall Function to call if input is clicked. (optional)
	 * @param  {String}     id        ID for the input element. (optional)
	 * @return {HTMLObject}           The created input button.
	 */
	createButton: function( value, clickCall, id ) {
		var btn = document.createElement( "input" );

		btn.className = "button";
		btn.type = "button";
		btn.value = value;

		if( id ) {
			btn.id = id;
		}

		if( typeof clickCall == "function" ) {
			btn.addEventListener( "click", clickCall, false );
		}

		return btn;
	},


	/**
	 * Create a progress bar element.
	 * @return {HTMLObject} Progress element.
	 */
	createProgress: function() {
		var progress = document.createElement( "progress" );

		progress.max = 100;
		progress.value = 0;
		progress.textContent = "0%";

		return progress;
	},


	/**
	 * Create a pair of hidden radio element and button, that checks it.
	 * @param  {String} group      Name of the radio group the pair belongs to.
	 * @param  {String} id         ID for the radio element.
	 * @param  {String} radioValue Value for the radio element.
	 * @param  {String} btnText    Text for the button.
	 * @return {Object}            Object with the radio element and the button.
	 */
	createRadioPair: function( group, id, radioValue, btnText ) {
		var input = document.createElement( "input" ),
		    label = document.createElement( "label" );

		input.className = "newradio";
		input.type = "radio";
		input.name = group;
		input.id = id;
		input.value = radioValue;

		label.className = "newradio";
		label.setAttribute( "for", id );
		label.textContent = btnText;

		return {
			radio: input,
			button: label
		};
	}

};



/**
 * Sub-class of UI for registering listeners.
 * @type {Object}
 */
UI.REGISTER = {

	/**
	 * Add all the needed event listeners.
	 */
	registerEvents: function() {
		resize();
		window.addEventListener( "resize", resize, false );

		this.registerImport();
		this.registerLightingOptions();
		this.registerModeOptions();
		this.registerShadingOptions();
		this.registerEditOptions();
		this.registerCollisionTestOptions();
		this.registerCameraReset();
		this.registerExport();
	},


	/**
	 * Listen to events of the camera reset button.
	 */
	registerCameraReset: function() {
		var buttonResetCamera = document.getElementById( "controls_reset" );

		buttonResetCamera.addEventListener( "click", SceneManager.resetCamera.bind( SceneManager ), false );
	},


	/**
	 * Listen to events of the collision test options.
	 */
	registerCollisionTestOptions: function() {
		var d = document;
		var radio;

		radio = d.getElementById( "collision_test_filling" );
		radio.addEventListener( "change", function( e ) {
			AdvancingFront.setCollisionTest( e, "filling" );
		}.bind( AdvancingFront ), false );

		radio = d.getElementById( "collision_test_all" );
		radio.addEventListener( "change", function( e ) {
			AdvancingFront.setCollisionTest( e, "all" );
		}.bind( AdvancingFront ), false );
	},


	/**
	 * Listen to events of the edit options.
	 */
	registerEditOptions: function() {
		var buttonFindEdges = document.getElementById( "edit_findedges" );

		buttonFindEdges.addEventListener( "click", SceneManager.findHoles.bind( SceneManager ), false );
	},


	/**
	 * Listen to events of the export options.
	 */
	registerExport: function() {
		var buttonShowExport = document.getElementById( "export_options" );

		buttonShowExport.addEventListener( "click", UI.showDetailExport.bind( UI ), false );
	},


	/**
	 * Listen to events of the import field.
	 */
	registerImport: function() {
		var inputUpload = document.getElementById( "import_file" ),
		    dropzone = document.body;

		inputUpload.addEventListener( "change", Loader.loadFile.bind( Loader ), false );
		dropzone.addEventListener( "dragover", UI.dragoverOfImport, false );
		dropzone.addEventListener( "drop", Loader.loadFileFromDrop.bind( Loader ), false );
	},


	/**
	 * Listen to events of the lighting options.
	 */
	registerLightingOptions: function() {
		var d = document,
		    lightOptions = ["on", "off"],
		    lightTypes = ["ambient", "camera", "directional"];
		var radio;

		for( var i = 0; i < lightTypes.length; i++ ) {
			for( var j = 0; j < lightOptions.length; j++ ) {
				radio = d.getElementById( "light_" + lightTypes[i] + "_" + lightOptions[j] );
				radio.addEventListener( "change", SceneManager.toggleLight.bind( SceneManager ), false );
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
			radio = d.getElementById( "render_" + modeOptions[i] + "_model" );
			radio.addEventListener( "change", function( e ) {
				SceneManager.changeMode( e, "model" );
			}.bind( SceneManager ), false );
		}
		for( var i = 0; i < modeOptions.length; i++ ) {
			radio = d.getElementById( "render_" + modeOptions[i] + "_filling" );
			radio.addEventListener( "change", function( e ) {
				SceneManager.changeMode( e, "filling" );
			}.bind( SceneManager ), false );
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
			radio.addEventListener( "change", SceneManager.changeShading.bind( SceneManager ), false );
		}
	}

};
