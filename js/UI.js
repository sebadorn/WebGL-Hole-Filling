"use strict";


/**
 * Adjust camera and renderer to new window size.
 */
function resize() {
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

		resize();
		window.addEventListener( "resize", resize, false );

		inputUpload = d.getElementById( "import_file" );
		inputUpload.addEventListener( "change", Loader.loadFile.bind( Loader ), false );
	}

};



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
		if( e.target.length === 0 ) {
			console.error( "No file selected." );
			return false;
		}

		var file = e.target.files[0],
		    extension = this.getFileExtension( file.name );

		if( !this.validateFileExtension( extension ) ) {
			console.error(
				"Extension of file (." + extension + ") not supported. Supported are:",
				CONFIG.ALLOWED_FILE_EXTENSIONS
			);
			return false;
		}

		this.readFile( file, extension, this.loadModel.bind( this ) );
	},


	/**
	 * Read the model data from the file and load it into the scene.
	 */
	loadModel: function( e, extension ) {
		var g = GLOBAL;
		var content, loader;

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

		// Remove the old model
		if( g.MODEL ) {
			g.SCENE.remove( g.MODEL );
		}

		content = loader.parse( e.target.result );

		if( extension == "obj" ) {
			g.MODEL = content;
		}
		else {
			var material = new THREE.MeshPhongMaterial();

			g.MODEL = new THREE.Mesh( content, material );
		}

		// g.MODEL.traverse( function( child ) {
		// 	if( child instanceof THREE.Mesh ) {
		// 		child.geometry.computeBoundingBox()
		// 		child.geometry.boundingBox;
		// 	}
		// } );

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
			callback( e, extension );
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
