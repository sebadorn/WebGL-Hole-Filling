"use strict";


/**
 * User interface/interaction.
 * @type {Object}
 */
var UI = {

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
	 * Signal in the point selection that a vertex has already been removed.
	 * @param {int} index Index of the point.
	 */
	checkPointRemoved: function( index ) {
		var pointsSelect = document.getElementById( "details" ).querySelector( ".foundPoints" );
		var pointBtn;

		for( var i = pointsSelect.childNodes.length - 1; i >= 0; i-- ) {
			pointBtn = pointsSelect.childNodes[i];

			if( pointBtn.getAttribute( "data-index" ) == index ) {
				pointBtn.className += " removed";
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
		this.registerEditOptions();
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


	/**
	 * Listen to events of the edit options.
	 */
	registerEditOptions: function() {
		var buttonFindEdges = document.getElementById( "edit_findedges" ),
		    buttonFindUnconnected = document.getElementById( "edit_findunconnected" );

		buttonFindEdges.addEventListener( "click", Scene.showEdges.bind( Scene ), false );
		buttonFindUnconnected.addEventListener( "click", Scene.showUnconnectedPoints.bind( Scene ), false );
	},


	registerExport: function() {
		var buttonShowExport = document.getElementById( "export_options" );

		buttonShowExport.addEventListener( "click", this.showDetailExport.bind( this ), false );
	},


	/**
	 * Listen to events of the import field.
	 */
	registerImport: function() {
		var inputUpload = document.getElementById( "import_file" ),
		    dropzone = document.body;

		inputUpload.addEventListener( "change", Loader.loadFile.bind( Loader ), false );
		dropzone.addEventListener( "dragover", this.dragoverOfImport, false );
		dropzone.addEventListener( "drop", Loader.loadFileFromDrop.bind( Loader ), false );
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
		var d = document;
		var details = d.body.querySelectorAll( ".details-collection" ),
		    detailFieldsets = d.body.querySelectorAll( ".detail fieldset" ),
		    detailFillHoleNumber = d.body.querySelector( ".detail-fillhole .number" );

		for( var i = 0; i < detailFieldsets.length; i++ ) {
			this.cleanOfChildNodes( detailFieldsets[i] );
		}

		for( var i = 0; i < details.length; i++ ) {
			details[i].setAttribute( "hidden", "hidden" );
		}

		detailFillHoleNumber.textContent = "-";
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
		    details = d.getElementById( "details" ),
		    detailFillHole = details.querySelector( ".detail-fillhole" ),
		    detailHoleInfo = details.querySelector( ".detail-holeinfo" ),
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

		btnFill = this.createButton( "Advancing Front", Scene.fillHole.bind( Scene ) );
		btnFill.setAttribute( "data-fillhole", index );

		area = detailFillHole.querySelector( "fieldset" );
		this.cleanOfChildNodes( area );
		area.appendChild( btnFill );

		// Detail: Hole Info
		infoVertices = detailHoleInfo.querySelector( "#holeinfo-vertices" );
		infoVertices.textContent = GLOBAL.HOLES[index].length;
	},


	/**
	 * Select a point. Focus on it and show additional details.
	 */
	selectPoint: function( e ) {
		var d = document;
		var children = e.target.parentNode.childNodes,
		    details = d.getElementById( "details" ),
		    detailRemovePoint = details.querySelector( ".detail-removepoint" ),
		    index = parseInt( e.target.getAttribute( "data-index" ), 10 );
		var area, btnRemove, number;

		for( var i = 0, len = children.length; i < len; i++ ) {
			children[i].className = children[i].className.replace( " active", "" );
		}
		e.target.className += " active";

		Scene.focusPoint( index );

		// Detail: Remove point
		number = detailRemovePoint.querySelector( ".caption .number" );
		number.textContent = index + 1;

		btnRemove = this.createButton( "Remove vertex", Scene.removeVertex.bind( Scene ) );
		btnRemove.setAttribute( "data-removepoint", index );

		area = detailRemovePoint.querySelector( "fieldset" );
		this.cleanOfChildNodes( area );
		area.appendChild( btnRemove );
	},


	/**
	 * Show further options for the export.
	 */
	showDetailExport: function() {
		var detail = document.getElementById( "details" ).querySelector( ".details-export" ),
		    formats = CONFIG.EXPORT.FORMATS,
		    sectionFormat = detail.querySelector( ".detail-exportformat fieldset" ),
		    sectionName = detail.querySelector( ".detail-exportname fieldset" ),
		    sectionExport = detail.querySelector( ".detail-export fieldset" );
		var defaultName, format, radioPair;

		this.cleanOfChildNodes( sectionFormat );
		this.cleanOfChildNodes( sectionName );
		this.cleanOfChildNodes( sectionExport );

		// Export formats
		for( var i = 0; i < formats.length; i++ ) {
			format = formats[i];

			radioPair = this.createRadioPair( "export", "export_" + format, format, format );
			radioPair.radio.addEventListener( "change", this.changeExportName, false );

			if( format == CONFIG.EXPORT.DEFAULT_FORMAT ) {
				radioPair.radio.setAttribute( "checked", "checked" );
			}

			sectionFormat.appendChild( radioPair.radio );
			sectionFormat.appendChild( radioPair.button );
		}

		// Insert name for model
		defaultName = GLOBAL.MODEL.name + "_filled." + CONFIG.EXPORT.DEFAULT_FORMAT.toLowerCase();

		sectionName.appendChild(
			this.createTextField( defaultName, "export_name" )
		);

		// Button to start export
		sectionExport.appendChild(
			this.createButton( "Export", this.startExport.bind( detail ) )
		);

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
		    sectionFoundHoles = detail.querySelector( ".detail-foundholes fieldset" ),
		    sectionHoleInfo = detail.querySelector( ".detail-holeinfo fieldset" ),
		    sectionProgress = detail.querySelector( ".detail-fillprogress fieldset" );
		var selection = d.createElement( "div" );
		var info, infoLabel, progress;

		this.cleanOfChildNodes( sectionFoundHoles );
		this.cleanOfChildNodes( sectionHoleInfo );
		this.cleanOfChildNodes( sectionProgress );


		// Found holes
		selection.className = "selectContainer foundHoles";

		if( foundHoles.length > 0 ) {
			var btnFocusHole;

			for( var i = 0; i < foundHoles.length; i++ ) {
				btnFocusHole = this.createButton(
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


		// Progress
		progress = d.createElement( "progress" );
		progress.max = 100;
		progress.value = 0;
		progress.textContent = "0%";

		sectionProgress.appendChild( progress );


		this.hideAllDetails();
		detail.removeAttribute( "hidden" );
	},


	/**
	 * List the found unconnected points.
	 * @param {Array<THREE.Vector3>} foundPoints The found unconnected points.
	 */
	showDetailUnconnected: function( foundPoints ) {
		var d = document,
		    detail = d.getElementById( "details" ).querySelector( ".details-unconnected" ),
		    sectionFoundPoints = detail.querySelector( ".detail-foundpoints fieldset" ),
		    sectionRemovePoints = detail.querySelector( ".detail-removepoint fieldset" ),
		    sectionProgress = detail.querySelector( ".detail-removeprogress fieldset" );
		var selection = d.createElement( "div" );
		var info, infoLabel, progress;

		this.cleanOfChildNodes( sectionFoundPoints );
		this.cleanOfChildNodes( sectionRemovePoints );
		this.cleanOfChildNodes( sectionProgress );


		// Found holes
		selection.className = "selectContainer foundPoints";

		if( foundPoints.length > 0 ) {
			var btnFocusPoint;

			for( var i = 0; i < foundPoints.length; i++ ) {
				btnFocusPoint = this.createButton(
					"Point " + ( i + 1 ), this.selectPoint.bind( this )
				);
				btnFocusPoint.className = "foundPoint";
				btnFocusPoint.style.borderLeftColor = "#" + foundPoints[i].material.color.getHexString();
				btnFocusPoint.setAttribute( "data-index", i );

				selection.appendChild( btnFocusPoint );
			}
			sectionFoundPoints.appendChild( selection );
		}
		else {
			var msg = d.createElement( "p" );
			msg.className = "message";
			msg.textContent = "No unconnected vertices found."

			sectionFoundPoints.appendChild( msg );
		}


		// Progress
		progress = d.createElement( "progress" );
		progress.max = 100;
		progress.value = 0;
		progress.textContent = "0%";

		sectionProgress.appendChild( progress );


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
		exportData = Scene.exportModel( format );
		content = new Blob( [exportData], { type: "text/plain" } );

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
	}

};
