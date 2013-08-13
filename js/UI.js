"use strict";


/**
 * User interface/interaction.
 * @type {Object}
 */
var UI = {

	domDetails: null,
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

		this.syncInterfaceWithConfig();
		this.REGISTER.registerEvents();
	},


	/**
	 * Reset detail section.
	 * @param {DOMElement} detail Detail section to reset/clean.
	 */
	resetDetail: function( detail ) {
		var areas = detail.querySelectorAll( ".detail fieldset" );

		for( var i = 0; i < areas.length; i++ ) {
			this.cleanOfChildNodes( areas[i] );
		}
	},


	/**
	 * Reset the interface.
	 */
	resetInterface: function() {
		var details = this.domDetails.querySelectorAll( ".details-collection" ),
		    detailFieldsets = this.domDetails.querySelectorAll( ".detail fieldset" ),
		    detailFillHoleNumber = this.domDetails.querySelector( ".detail-fillhole .number" );

		for( var i = 0; i < detailFieldsets.length; i++ ) {
			this.cleanOfChildNodes( detailFieldsets[i] );
		}

		for( var i = 0; i < details.length; i++ ) {
			details[i].setAttribute( "hidden", "hidden" );
		}

		detailFillHoleNumber.textContent = "-";
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
		var area, btnFill, infoVertices, merging, number;

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
		merging.value = CONFIG.HF.FILLING.THRESHOLD_MERGE;

		// Detail: Fill Hole
		number = detailFillHole.querySelector( ".caption .number" );
		number.textContent = index + 1;

		// Start button
		btnFill = detailFillHole.querySelector( ".fillholeStart" );
		btnFill.setAttribute( "data-fillhole", index );

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
		var defaultName, format, progress, radioPair;

		this.resetDetail( detail );

		// Export formats
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

		sectionName.appendChild(
			this.BUILDER.createTextField( defaultName, "export_name" )
		);

		// Button to start export
		sectionExport.appendChild(
			this.BUILDER.createButton( "Export", this.startExport.bind( detail ) )
		);

		// Progress
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
		var d = document,
		    detail = this.domDetails.querySelector( ".details-holefilling" );
		var sectionFoundHoles = detail.querySelector( ".detail-foundholes fieldset" ),
		    sectionHoleInfo = detail.querySelector( ".detail-holeinfo fieldset" ),
		    sectionFillHole = detail.querySelector( ".detail-fillhole fieldset" ),
		    sectionProgress = detail.querySelector( ".detail-fillprogress fieldset" ),
		    selection = d.createElement( "div" );
		var btnFill, info, infoLabel, merging, progress;

		this.resetDetail( detail );


		// Found holes
		selection.className = "selectContainer foundHoles";

		if( foundHoles.length > 0 ) {
			var btnFocusHole;

			for( var i = 0; i < foundHoles.length; i++ ) {
				btnFocusHole = this.BUILDER.createButton(
					"Hole " + ( i + 1 ), this.selectHole.bind( this )
				);
				btnFocusHole.className = "foundHole";
				btnFocusHole.style.borderLeftColor = "#" + foundHoles[i].material.color.getHexString();
				btnFocusHole.setAttribute( "data-index", i );

				selection.appendChild( btnFocusHole );
			}
			sectionFoundHoles.appendChild( selection );
		}
		else {
			var msg = d.createElement( "p" );
			msg.className = "message";
			msg.textContent = "No holes found."

			sectionFoundHoles.appendChild( msg );
		}


		// Hole information
		info = d.createElement( "span" );
		info.className = "info";
		info.id = "holeinfo-vertices";
		info.textContent = "-";

		infoLabel = d.createElement( "label" );
		infoLabel.textContent = "front vertices";

		sectionHoleInfo.appendChild( info );
		sectionHoleInfo.appendChild( infoLabel );


		// Fill hole options
		merging = d.createElement( "input" );
		merging.type = "number";
		merging.min = "0.01";
		merging.step = "0.01";
		merging.value = CONFIG.HF.FILLING.THRESHOLD_MERGE;
		merging.id = "merge-threshold";

		btnFill = this.BUILDER.createButton( "Advancing Front", SceneManager.fillHole.bind( SceneManager ) );
		btnFill.className += " fillholeStart";

		sectionFillHole.appendChild( merging );
		sectionFillHole.appendChild( btnFill );


		// Progress
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
		exportData = SceneManager.exportModel( format );
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
	},


	/**
	 * Update the visible progress bar.
	 * @param {int} value New progress value. Think of it in percent.
	 */
	updateProgress: function( value ) {
		this.visibleProgress.value = value;
		this.visibleProgress.textContent = value + "%";
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
	},


	/**
	 * Create a text input field.
	 * @param  {String}     value Initial value of the field.
	 * @param  {String}     id    ID for the field. (optional)
	 * @return {HTMLObject}       The created input text field.
	 */
	createTextField: function( value, id ) {
		var text = document.createElement( "input" );

		text.className = "textinput";
		text.type = "text";
		text.value = value;

		if( id ) {
			text.id = id;
		}

		return text;
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
	 * Listen to events of the edit options.
	 */
	registerEditOptions: function() {
		var buttonFindEdges = document.getElementById( "edit_findedges" );

		buttonFindEdges.addEventListener( "click", SceneManager.showEdges.bind( SceneManager ), false );
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
			radio = d.getElementById( "render_" + modeOptions[i] );
			radio.addEventListener( "change", SceneManager.changeMode.bind( SceneManager ), false );
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
