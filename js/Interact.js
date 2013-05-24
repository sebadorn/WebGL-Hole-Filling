"use strict";


/**
 * Adjust camera and renderer to new window size.
 */
function resize() {
	if( CAMERA ) {
		CAMERA.aspect = window.innerWidth / window.innerHeight;
		CAMERA.updateProjectionMatrix();
	}
	if( RENDERER ) {
		RENDERER.setSize( window.innerWidth, window.innerHeight );
	}
};


var Interact = {


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
		if( e.target.length == 0 ) {
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

		var reader = new FileReader();
		reader.addEventListener( "load", this.loadModel.bind( this ), false );

		reader.readAsText( file );
	},


	/**
	 * Read the model data from the file and load it into the scene.
	 */
	loadModel: function( e ) {
		var loader = new THREE.OBJLoader();

		// Remove the old model
		if( MODEL ) {
			SCENE.remove( MODEL );
		}

		MODEL = loader.parse( e.target.result );
		SCENE.add( MODEL );
		render();
	},


	/**
	 * Add all the needed event listeners.
	 */
	registerEvents: function() {
		var d = document,
		    inputUpload = d.getElementById( "upload_file" );

		resize();
		window.addEventListener( "resize", resize, false );

		inputUpload.addEventListener( "change", this.loadFile.bind( this ), false );
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
