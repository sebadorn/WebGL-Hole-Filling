"use strict";


/**
 * Load 3D models.
 * @type {Object}
 */
var Loader = {

	/**
	 * Remove vertices that are either not part of any face,
	 * or are (wrongly) connected to themself.
	 * @param  {THREE.Geometry} geometry The model geomtry to check and fix.
	 * @return {THREE.Geometry}          The checked and fixed geometry.
	 */
	checkAndFixFaces: function( geometry ) {
		var facesRemoved = 0,
		    mesh = new HalfEdgeMesh( geometry ),
		    remove = [];
		var f, v;

		// Find prolematic vertices
		for( var i = mesh.vertices.length - 1; i >= 0; i-- ) {
			v = mesh.vertices[i];

			// Problem: Vertex has at least one connection to itself
			for( var j = 0, len = v.edges.length; j < len; j++ ) {
				if( v.edges[j].vertex.index == v.index ) {
					remove.push( v.index );
					break;
				}
			}

			// Problem: Vertex is just a single, unconnected point,
			// floating around all alone.
			if( v.edges.length == 0 ) {
				remove.push( v.index );
			}
		}

		remove.sort( numCompareFunc );

		// Remove them from the model and affected faces
		for( var i = remove.length - 1; i >= 0; i-- ) {
			geometry.vertices.splice( remove[i], 1 );

			for( var j = geometry.faces.length - 1; j >= 0; j-- ) {
				f = geometry.faces[j];

				// Face was built with vertex
				if( remove[i] == f.a || remove[i] == f.b || remove[i] == f.c ) {
					geometry.faces.splice( j, 1 );
					facesRemoved++;
					continue;
				}

				// Vertex index has been removed, so all above it have to be decreased by one.
				// May also remove faces, if necessary.
				geometry.faces = Utils.decreaseHigherFaceIndexes( geometry.faces, j, remove[i] );
			}
		}

		console.log( "CHECK_AND_FIX_FACES: Removed " + remove.length + " vertices and " + facesRemoved + " faces." );

		return geometry;
	},


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
	 * Get the loader for the given file type.
	 * @param  {String}        extension File extension.
	 * @return {THREE.?Loader}           Loader.
	 */
	getLoader: function( extension ) {
		var loader;

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

			default:
				throw new Error( "No loader available for extension " + extension.toUpperCase() + "." );

		}

		return loader;
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
		var loader = this.getLoader( extension ),
		    sm = SceneManager;
		var content, geometry;

		content = loader.parse( e.target.result );
		geometry = ( extension == "obj" ) ? content.children[0].geometry : content;

		if( extension == "stl" ) {
			geometry.mergeVertices();
		}

		if( CONFIG.CHECK_AND_FIX_FACES ) {
			Stopwatch.start( "checkAndFixFaces" );
			geometry = this.checkAndFixFaces( geometry );
			Stopwatch.stop( "checkAndFixFaces", true );
		}

		sm.model = sm.geometryToMesh( geometry );
		sm.model = sm.centerModel( sm.model );
		sm.model.name = filename.replace( "." + extension, "" );

		console.log( "Imported: " + filename );

		UI.resetInterface();

		sm.clearModels();
		sm.resetCamera();
		sm.renderBoundingBox( sm.model );

		sm.scene.add( sm.model );

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
