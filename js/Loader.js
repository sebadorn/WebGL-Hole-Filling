"use strict";


/**
 * Load 3D models.
 * @type {Object}
 */
var Loader = {

	/**
	 * Get the extension part of a file name.
	 * @param  {String} filename Name of the file.
	 * @return {String}          Extension part of the file name.
	 */
	getFileExtension: function( filename ) {
		var extension = filename.split( "." );

		return extension[extension.length - 1].toLowerCase();
	},


	/**
	 * Evaluate and load the model file.
	 */
	loadFile: function( e ) {
		if( e.target.files.length === 0 ) {
			console.log( "No file selected." );
			return false;
		}

		var file = e.target.files[0],
		    extension = this.getFileExtension( file.name );

		if( this.validateFileExtension( extension ) ) {
			this.readFile( file, extension, this.loadModel.bind( this ) );
		}
		else {
			console.error(
				"Extension of file (." + extension + ") not supported. Supported are:",
				CONFIG.ALLOWED_FILE_EXTENSIONS
			);
		}
	},


	/**
	 * File has been dropped in the browser.
	 */
	loadFileFromDrop: function( e ) {
		e.preventDefault();

		if( e.dataTransfer.files.length === 0 ) {
			console.log( "No file selected" );
			return false;
		}

		var dummyE = { target: { files: e.dataTransfer.files } };

		this.loadFile( dummyE );
	},


	/**
	 * Read the model data from the file and load it into the scene.
	 */
	loadModel: function( e, filename, extension ) {
		var g = GLOBAL;
		var content, geometry, loader;

		switch( extension ) {
			case "obj":
				loader = new THREE.OBJLoader();
				break;
			case "ply":
				loader = new THREE.PLYLoader();
				break;
			case "stl":
				loader = new THREE.STLLoader();
				break;
		}

		content = loader.parse( e.target.result );
		geometry = ( extension == "obj" ) ? content.children[0].geometry : content;

		g.MODEL = Scene.geometryToMesh( geometry );
		g.MODEL = Scene.centerModel( g.MODEL );
		g.MODEL.name = filename.replace( "." + extension, "" );

		UI.resetInterface();

		Scene.clearModels();
		Scene.resetCamera();
		Scene.renderBoundingBox( g.MODEL );

		g.FILLINGS = {};
		g.SCENE.add( g.MODEL );

		render();
	},


	/**
	 * Read the file content.
	 * @param {Object}   file      The file to read.
	 * @param {String}   extension The file extension WITHOUT leading dot.
	 * @param {function} callback  Function to call when data has been read.
	 */
	readFile: function( file, extension, callback ) {
		var reader = new FileReader();

		reader.addEventListener( "load", function( e ) {
			callback( e, file.name, extension );
		}, false );
		reader.readAsText( file );
	},


	/**
	 * Check if a file extension has been allowed through the config.
	 * @param  {String}  extension The file extension WITHOUT leading dot.
	 * @return {boolean}           True if extension is allowed, false otherwise.
	 */
	validateFileExtension: function( extension ) {
		return CONFIG.ALLOWED_FILE_EXTENSIONS.indexOf( extension ) >= 0;
	}

};
