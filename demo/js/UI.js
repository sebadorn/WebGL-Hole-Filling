'use strict';


/**
 * User interface/interaction.
 * @namespace WebHF.UI
 */
WebHF.UI = {


	callbackExport: null,
	callbackFillHole: null,
	domDetails: null,
	fillButton: null,
	visibleProgress: null,


	/**
	 * Change the export filename according to the chosen file format.
	 * @param {Event} ev
	 */
	changeExportName( ev ) {
		const format = ev.target.value.toLowerCase();
		const textInput = document.getElementById( 'export_name' );
		const nameParts = textInput.value.split( '.' );

		textInput.value = textInput.value.replace( nameParts[nameParts.length - 1], format );
	},


	/**
	 * Signal in the hole selection that a hole has already been filled.
	 * @param {number} index - Index of the hole.
	 */
	checkHoleFinished( index ) {
		const holesSelect = this.domDetails.querySelector( '.foundHoles' );

		for( let i = holesSelect.childNodes.length - 1; i >= 0; i-- ) {
			const holeBtn = holesSelect.childNodes[i];

			if( holeBtn.getAttribute( 'data-index' ) == index ) {
				holeBtn.className += ' filled';
				break;
			}
		}
	},


	/**
	 * Remove all child nodes of a node.
	 * @param  {HTMLElement} node
	 * @return {HTMLElement} The given node after removing the child nodes.
	 */
	cleanOfChildNodes( node ) {
		for( let i = node.childNodes.length - 1; i >= 0; i-- ) {
			node.removeChild( node.childNodes[i] );
		}

		return node;
	},


	/**
	 * Disable the fill button.
	 */
	disableFillButton() {
		if( this.fillButton.className.indexOf( ' disabled' ) < 0 ) {
			this.fillButton.removeEventListener( 'click', this.callbackFillHole );
			this.fillButton.className += ' disabled';
		}
	},


	/**
	 * Dragover event of import area.
	 * @param {Event} ev
	 */
	dragoverOfImport: function( ev ) {
		ev.preventDefault();
		ev.dataTransfer.dropEffect = 'copy';
	},


	/**
	 * Hide all details.
	 */
	hideAllDetails: function() {
		const details = this.domDetails.querySelectorAll( '.details-collection' );

		for( let i = details.length - 1; i >= 0; i-- ) {
			details[i].setAttribute( 'hidden', 'hidden' );
		}
	},


	/**
	 * Init everything related to UI.
	 */
	init() {
		this.domDetails = document.getElementById( 'details' );

		this.callbackExport = this.startExport.bind( this.domDetails.querySelector( '.details-export' ) );
		this.callbackFillHole = WebHF.SceneManager.fillHole.bind( WebHF.SceneManager );

		this.fillButton = document.querySelector( '.fillholeStart' );

		this.syncInterfaceWithConfig();
		this.REGISTER.registerEvents();
	},


	/**
	 * Reset the interface.
	 */
	resetInterface: function() {
		this.hideAllDetails();
		this.visibleProgress = null;
	},


	/**
	 * Select a hole. Focus on it and show additional details.
	 * @param {Event} ev
	 */
	selectHole( ev ) {
		const children = ev.target.parentNode.childNodes;
		const detailFillHole = this.domDetails.querySelector( '.detail-fillhole' );
		const detailHoleInfo = this.domDetails.querySelector( '.detail-holeinfo' );
		const index = parseInt( ev.target.getAttribute( 'data-index' ), 10 );

		for( let i = 0, len = children.length; i < len; i++ ) {
			children[i].className = children[i].className.replace( ' active', '' );
		}

		ev.target.className += ' active';

		WebHF.SceneManager.focusHole( index );

		// Detail: Hole Info
		const infoVertices = detailHoleInfo.querySelector( '#holeinfo-vertices' );
		infoVertices.textContent = WebHF.SceneManager.holes[index].length;

		// Merging threshold
		const merging = document.getElementById( 'merge-threshold' );
		merging.value = WebHF.SceneManager.holes[index].thresholdMerging;

		// Detail: Fill Hole
		const number = detailFillHole.querySelector( '.caption .number' );
		number.textContent = index + 1;

		// Start button
		this.fillButton.setAttribute( 'data-fillhole', index );
		this.fillButton.removeEventListener( 'click', this.callbackFillHole );

		if( ev.target.className.indexOf( 'filled' ) >= 0 ) {
			if( this.fillButton.className.indexOf( ' disabled' ) < 0 ) {
				this.fillButton.className += ' disabled';
			}
		}
		else {
			this.fillButton.addEventListener( 'click', this.callbackFillHole );
			this.fillButton.className = this.fillButton.className.replace( ' disabled', '' );
		}

		// Progress bar
		if( ev.target.className.indexOf( 'filled' ) < 0 ) {
			WebHF.UI.updateProgress( 0 );
		}
		else {
			WebHF.UI.updateProgress( 100 );
		}
	},


	/**
	 * Show further options for the export.
	 */
	showDetailExport() {
		const FORMATS = CONFIG.EXPORT.FORMATS;

		const detail = this.domDetails.querySelector( '.details-export' );
		const sectionFormat = detail.querySelector( '.detail-exportformat fieldset' );
		const sectionName = detail.querySelector( '.detail-exportname fieldset' );
		const sectionExport = detail.querySelector( '.detail-export fieldset' );
		const sectionProgress = detail.querySelector( '.detail-exportprogress fieldset' );

		// Export formats
		this.cleanOfChildNodes( sectionFormat );

		for( let i = 0; i < FORMATS.length; i++ ) {
			const format = FORMATS[i];

			const radioPair = this.BUILDER.createRadioPair( 'export', 'export_' + format, format, format );
			radioPair.radio.addEventListener( 'change', this.changeExportName );

			if( format == CONFIG.EXPORT.DEFAULT_FORMAT ) {
				radioPair.radio.setAttribute( 'checked', 'checked' );
			}

			sectionFormat.appendChild( radioPair.radio );
			sectionFormat.appendChild( radioPair.button );
		}

		// Insert name for model
		const defaultName = WebHF.SceneManager.model.name + '_filled.' + CONFIG.EXPORT.DEFAULT_FORMAT.toLowerCase();

		const exportName = sectionName.querySelector( '#export_name' );
		exportName.value = defaultName;

		// Button to start export
		const btnExport = sectionExport.querySelector( '.button' );
		btnExport.removeEventListener( 'click', this.callbackExport, false );
		btnExport.addEventListener( 'click', this.callbackExport, false );

		// Progress
		this.cleanOfChildNodes( sectionProgress );
		this.visibleProgress = this.BUILDER.createProgress();
		sectionProgress.appendChild( this.visibleProgress );

		this.hideAllDetails();
		detail.removeAttribute( 'hidden' );
	},


	/**
	 * List the found holes.
	 * @param {THREE.Line[]} foundHoles - The found holes.
	 */
	showDetailHoles( foundHoles ) {
		const detail = this.domDetails.querySelector( '.details-holefilling' );
		const sectionFoundHoles = detail.querySelector( '.detail-foundholes fieldset' );
		const sectionHoleInfo = detail.querySelector( '.detail-holeinfo fieldset' );
		const sectionFillHole = detail.querySelector( '.detail-fillhole fieldset' );
		const sectionProgress = detail.querySelector( '.detail-fillprogress fieldset' );

		// Found holes
		const holeSelection = sectionFoundHoles.querySelector( '.foundHoles' );
		this.cleanOfChildNodes( holeSelection );

		const msg = sectionFoundHoles.querySelector( '.message' );

		if( foundHoles.length > 0 ) {
			msg.setAttribute( 'hidden', 'hidden' );

			for( let i = 0; i < foundHoles.length; i++ ) {
				const btnFocusHole = this.BUILDER.createButton(
					'Hole ' + ( i + 1 ), this.selectHole.bind( this )
				);
				btnFocusHole.className = 'foundHole';
				btnFocusHole.style.borderLeftColor = '#' + foundHoles[i].material.color.getHexString();
				btnFocusHole.setAttribute( 'data-index', i );

				holeSelection.appendChild( btnFocusHole );
			}

			sectionFoundHoles.appendChild( holeSelection );
		}
		else {
			msg.removeAttribute( 'hidden' );
		}

		// Hole info
		const holeVertices = sectionHoleInfo.querySelector( '#holeinfo-vertices' );
		holeVertices.textContent = '-';

		// Fill hole options
		const holeNumber = document.querySelector( '.detail-fillhole .number' );
		holeNumber.textContent = '-';

		const merging = sectionFillHole.querySelector( '#merge-threshold' );
		merging.value = '0.000';

		// Progress
		this.cleanOfChildNodes( sectionProgress );
		this.visibleProgress = this.BUILDER.createProgress();
		sectionProgress.appendChild( this.visibleProgress );

		this.hideAllDetails();
		detail.removeAttribute( 'hidden' );
	},


	/**
	 * Trigger the export.
	 * this == export detail
	 * Source: http://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
	 * @param {Event} ev
	 */
	startExport( ev ) {
		const d = document;
		const inputFormat = this.querySelector( '.detail-exportformat input.newradio:checked' );
		const name = this.querySelector( '#export_name' );

		const format = inputFormat.value.toLowerCase();
		const exportData = WebHF.SceneManager.exportModel( format, name.value.replace( '.' + format, '' ) );
		const content = new Blob( [exportData], { type: 'text/plain' } );

		WebHF.UI.updateProgress( 100 );

		const download = d.createElement( 'a' );
		download.download = name.value;
		download.href = window.URL.createObjectURL( content );
		download.addEventListener( 'click', WebHF.Utils.selfRemoveFromDOM );
		download.setAttribute( 'hidden', 'hidden' );

		d.body.appendChild( download );
		download.click();
	},


	/**
	 * Set the user interface settings according to the settings in the config file (config.js).
	 */
	syncInterfaceWithConfig() {
		const d = document;

		// Rendering: Mode
		if( CONFIG.MODE === 'solid' ) {
			d.getElementById( 'render_solid_model' ).setAttribute( 'checked', 'checked' );
			d.getElementById( 'render_solid_filling' ).setAttribute( 'checked', 'checked' );
		}
		else if( CONFIG.MODE === 'wireframe' ) {
			d.getElementById( 'render_wireframe_model' ).setAttribute( 'checked', 'checked' );
			d.getElementById( 'render_wireframe_filling' ).setAttribute( 'checked', 'checked' );
		}

		// Rendering: Shading
		if( CONFIG.SHADING === 'phong' ) {
			d.getElementById( 'shading_phong' ).setAttribute( 'checked', 'checked' );
		}
		else if( CONFIG.SHADING === 'flat' ) {
			d.getElementById( 'shading_flat' ).setAttribute( 'checked', 'checked' );
		}

		// Hole filling: Collision test
		if( CONFIG.FILLING.COLLISION_TEST === 'filling' ) {
			d.getElementById( 'collision_test_filling' ).setAttribute( 'checked', 'checked' );
		}
		else if( CONFIG.FILLING.COLLISION_TEST === 'all' ) {
			d.getElementById( 'collision_test_all' ).setAttribute( 'checked', 'checked' );
		}

		if( CONFIG.FILLING.AF_MODE === 'parallel' ) {
			d.getElementById( 'collision-worker' ).value = CONFIG.FILLING.WORKER;
			d.getElementById( 'collision-worker' ).parentNode.removeAttribute( 'hidden' );
		}
	},


	/**
	 * Update the visible progress bar.
	 * @param {number} value - New progress value. Think of it in percent.
	 */
	updateProgress: function( value ) {
		this.visibleProgress.value = value;
		this.visibleProgress.textContent = value + '%';

		if( value == 100 ) {
			this.visibleProgress.className += ' finished';
		}
		else {
			this.visibleProgress.className = this.visibleProgress.className.replace( ' finished', '' );
		}
	}

};



/**
 * @namespace WebHF.UI.BUILDER
 */
WebHF.UI.BUILDER = {


	/**
	 * Create a button.
	 * @param  {string}    value     - Value of the input.
	 * @param  {?function} clickCall - Function to call if input is clicked.
	 * @param  {?string}   id        - ID for the input element.
	 * @return {HTMLElement} The created input button.
	 */
	createButton( value, clickCall, id ) {
		const btn = document.createElement( 'input' );
		btn.className = 'button';
		btn.type = 'button';
		btn.value = value;

		if( id ) {
			btn.id = id;
		}

		if( typeof clickCall === 'function' ) {
			btn.addEventListener( 'click', clickCall );
		}

		return btn;
	},


	/**
	 * Create a progress bar element.
	 * @return {HTMLElement} Progress element.
	 */
	createProgress() {
		const progress = document.createElement( 'progress' );
		progress.max = 100;
		progress.value = 0;
		progress.textContent = '0%';

		return progress;
	},


	/**
	 * Create a pair of hidden radio element and button, that checks it.
	 * @param  {string} group      - Name of the radio group the pair belongs to.
	 * @param  {string} id         - ID for the radio element.
	 * @param  {string} radioValue - Value for the radio element.
	 * @param  {string} btnText    - Text for the button.
	 * @return {object} Object with the radio element and the button.
	 */
	createRadioPair( group, id, radioValue, btnText ) {
		const input = document.createElement( 'input' );
		input.className = 'newradio';
		input.type = 'radio';
		input.name = group;
		input.id = id;
		input.value = radioValue;

		const label = document.createElement( 'label' );
		label.className = 'newradio';
		label.setAttribute( 'for', id );
		label.textContent = btnText;

		return {
			radio: input,
			button: label
		};
	}


};



/**
 * @namespace WebHF.UI.REGISTER
 */
WebHF.UI.REGISTER = {


	/**
	 * Add all the needed event listeners.
	 */
	registerEvents() {
		WebHF.resize();
		window.addEventListener( 'resize', WebHF.resize );

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
	registerCameraReset() {
		const buttonResetCamera = document.getElementById( 'controls_reset' );
		buttonResetCamera.addEventListener( 'click', ev => WebHF.SceneManager.resetCamera() );
	},


	/**
	 * Listen to events of the collision test options.
	 */
	registerCollisionTestOptions() {
		const d = document;

		let radio = d.getElementById( 'collision_test_filling' );
		radio.addEventListener( 'change', ev => WebHF.AdvancingFront.setCollisionTest( 'filling' ) );

		radio = d.getElementById( 'collision_test_all' );
		radio.addEventListener( 'change', ev => WebHF.AdvancingFront.setCollisionTest( 'all' ) );
	},


	/**
	 * Listen to events of the edit options.
	 */
	registerEditOptions() {
		const buttonFindEdges = document.getElementById( 'edit_findedges' );
		buttonFindEdges.addEventListener( 'click', ev => WebHF.SceneManager.findHoles( ev ) );
	},


	/**
	 * Listen to events of the export options.
	 */
	registerExport() {
		const buttonShowExport = document.getElementById( 'export_options' );
		buttonShowExport.addEventListener( 'click', ev => WebHF.UI.showDetailExport( ev ) );
	},


	/**
	 * Listen to events of the import field.
	 */
	registerImport() {
		const inputUpload = document.getElementById( 'import_file' );
		inputUpload.addEventListener( 'change', ev => WebHF.Loader.loadFile( ev ) );

		const dropzone = document.body;
		dropzone.addEventListener( 'dragover', ev => WebHF.UI.dragoverOfImport( ev ) );
		dropzone.addEventListener( 'drop', ev => WebHF.Loader.loadFileFromDrop( ev ) );
	},


	/**
	 * Listen to events of the lighting options.
	 */
	registerLightingOptions() {
		const d = document;
		const lightOptions = ['on', 'off'];
		const lightTypes = ['ambient', 'camera', 'directional'];

		const onChange = ev => WebHF.SceneManager.toggleLight( ev );

		for( let i = 0; i < lightTypes.length; i++ ) {
			for( let j = 0; j < lightOptions.length; j++ ) {
				const radio = d.getElementById( 'light_' + lightTypes[i] + '_' + lightOptions[j] );
				radio.addEventListener( 'change', onChange );
			}
		}
	},


	/**
	 * Listen to events of the mode options.
	 */
	registerModeOptions() {
		const d = document;
		const modeOptions = ['solid', 'wireframe'];

		const onChangeModel = ev => WebHF.SceneManager.changeMode( ev, 'model' );
		const onChangeFilling = ev => WebHF.SceneManager.changeMode( ev, 'filling' );

		for( let i = 0; i < modeOptions.length; i++ ) {
			let radio = d.getElementById( 'render_' + modeOptions[i] + '_model' );
			radio.addEventListener( 'change', onChangeModel );
		}

		for( let i = 0; i < modeOptions.length; i++ ) {
			let radio = d.getElementById( 'render_' + modeOptions[i] + '_filling' );
			radio.addEventListener( 'change', onChangeFilling );
		}
	},


	/**
	 * Listen to events of the shading options.
	 */
	registerShadingOptions() {
		const d = document;
		const shadingOptions = ['flat', 'phong'];

		const onChange = ev => WebHF.SceneManager.changeShading( ev );

		for( let i = 0; i < shadingOptions.length; i++ ) {
			const radio = d.getElementById( 'shading_' + shadingOptions[i] );
			radio.addEventListener( 'change', onChange );
		}
	}

};
