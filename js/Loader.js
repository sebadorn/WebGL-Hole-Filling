'use strict';


/**
 * Load 3D models.
 * @namespace WebHF.Loader
 */
WebHF.Loader = {


	/**
	 * Remove vertices that are either not part of any face,
	 * or are (wrongly) connected to themself.
	 * @param  {THREE.Geometry} geometry - The model geometry to check and fix.
	 * @return {THREE.Geometry} The checked and fixed geometry.
	 */
	checkAndFixFaces( geometry ) {
		const mesh = new WebHF.HalfEdgeMesh( geometry );
		const remove = [];

		let facesRemoved = 0;

		// Find prolematic vertices
		for( let i = mesh.vertices.length - 1; i >= 0; i-- ) {
			const v = mesh.vertices[i];

			// Problem: Vertex has at least one connection to itself
			for( let j = 0, len = v.edges.length; j < len; j++ ) {
				if( v.edges[j].vertex.index == v.index ) {
					remove.push( v.index );
					break;
				}
			}

			// Problem: Vertex is just a single, unconnected point,
			// floating around all alone.
			if( v.edges.length === 0 ) {
				remove.push( v.index );
			}
		}

		remove.sort( ( a, b ) => a - b );

		// Remove them from the model and affected faces
		for( let i = remove.length - 1; i >= 0; i-- ) {
			geometry.vertices.splice( remove[i], 1 );

			for( let j = geometry.faces.length - 1; j >= 0; j-- ) {
				const f = geometry.faces[j];

				// Face was built with vertex
				if( remove[i] == f.a || remove[i] == f.b || remove[i] == f.c ) {
					geometry.faces.splice( j, 1 );
					facesRemoved++;
					continue;
				}

				// Vertex index has been removed, so all above it have to be decreased by one.
				// May also remove faces, if necessary.
				geometry.faces = WebHF.Utils.decreaseHigherFaceIndexes( geometry.faces, j, remove[i] );
			}
		}

		console.log( 'CHECK_AND_FIX_FACES: Removed ' + remove.length + ' vertices and ' + facesRemoved + ' faces.' );

		return geometry;
	},


	/**
	 * Get the extension part of a file name.
	 * @param  {string} filename - Name of the file.
	 * @return {string} Extension part of the file name.
	 */
	getFileExtension( filename ) {
		const extension = filename.split( '.' );

		return extension[extension.length - 1].toLowerCase();
	},


	/**
	 * Get the loader for the given file type.
	 * @param {string}   extension - File extension.
	 * @param {function} cb
	 */
	getLoader: function( extension, cb ) {
		let modulePath = './threeJS/loaders/';
		let className = null;

		switch( extension ) {
			case 'obj':
				modulePath += 'OBJLoader.js';
				className = 'OBJLoader';
				break;

			case 'ply':
				modulePath += 'PLYLoader.js';
				className = 'PLYLoader';
				break;

			case 'stl':
				modulePath += 'STLLoader.js';
				className = 'STLLoader';
				break;

			case 'vtk':
				modulePath += 'VTKLoader.js';
				className = 'VTKLoader';
				break;

			default:
				throw new Error( `No loader available for extension ${ extension.toUpperCase() }.` );
		}

		/* jshint ignore:start */
		import( modulePath )
			.then( module => cb( new module[className]() ) );
		/* jshint ignore:end */
	},


	/**
	 * Evaluate and load the model file.
	 * @param {Event} ev
	 */
	loadFile( ev ) {
		if( ev.target.files.length === 0 ) {
			console.log( 'No file selected.' );
			return false;
		}

		const file = ev.target.files[0];
		const extension = this.getFileExtension( file.name );

		if( this.validateFileExtension( extension ) ) {
			this.readFile( file, extension, this.loadModel.bind( this ) );
		}
		else {
			console.error(
				'Extension of file (.' + extension + ') not supported. Supported are:',
				CONFIG.ALLOWED_FILE_EXTENSIONS
			);
		}
	},


	/**
	 * File has been dropped in the browser.
	 * @param {Event} ev
	 */
	loadFileFromDrop( ev ) {
		ev.preventDefault();

		if( ev.dataTransfer.files.length === 0 ) {
			console.log( 'No file selected' );
			return false;
		}

		const dummyE = { target: { files: ev.dataTransfer.files } };

		this.loadFile( dummyE );
	},


	/**
	 * Read the model data from the file and load it into the scene.
	 * @param {Event}  ev
	 * @param {string} filename
	 * @param {string} extension
	 */
	loadModel( ev, filename, extension ) {
		const SM = WebHF.SceneManager;

		this.getLoader( extension, loader => {
			const content = loader.parse( ev.target.result );
			let bufferGeometry = null;

			if( extension === 'obj' ) {
				bufferGeometry = content.children[0].geometry;
			}
			else {
				bufferGeometry = content;
			}

			let geometry = new THREE.Geometry();
			geometry.fromBufferGeometry( bufferGeometry );
			geometry.mergeVertices();

			if( CONFIG.CHECK_AND_FIX_FACES ) {
				WebHF.Stopwatch.start( 'checkAndFixFaces' );
				geometry = this.checkAndFixFaces( geometry );
				WebHF.Stopwatch.stop( 'checkAndFixFaces', true );
			}

			SM.model = SM.geometryToMesh( geometry );
			SM.model = SM.centerModel( SM.model );
			SM.model.name = filename.replace( '.' + extension, '' );

			console.log( 'Imported: ' + filename );

			WebHF.UI.resetInterface();

			SM.clearModels();
			SM.fitCameraToModel();

			if( CONFIG.BBOX.SHOW ) {
				SM.renderBoundingBox( SM.model );
			}

			SM.scene.add( SM.model );

			WebHF.render();
		} );
	},


	/**
	 * Read the file content.
	 * @param {object}   file      - The file to read.
	 * @param {string}   extension - The file extension WITHOUT leading dot.
	 * @param {function} callback  - Function to call when data has been read.
	 */
	readFile( file, extension, callback ) {
		const reader = new FileReader();
		reader.addEventListener( 'load', ev => callback( ev, file.name, extension ) );
		reader.readAsText( file );
	},


	/**
	 * Check if a file extension has been allowed through the config.
	 * @param  {string} extension - The file extension WITHOUT leading dot.
	 * @return {boolean} True if extension is allowed, false otherwise.
	 */
	validateFileExtension( extension ) {
		return CONFIG.ALLOWED_FILE_EXTENSIONS.includes( extension );
	}


};
