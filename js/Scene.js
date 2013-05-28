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
		if( e.target.length === 0 ) {
			console.error( "No file selected." );
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
	 * Read the model data from the file and load it into the scene.
	 */
	loadModel: function( e, extension ) {
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

		Scene.clearModels();
		Scene.resetCamera();
		Scene.renderBoundingBox( g.MODEL );

		g.SCENE.add( g.MODEL );
		render();

		// TODO
		console.log( "Starting to create mesh ..." );
		var mesh = new Mesh( g.MODEL.geometry );
		console.log( "... Done." );
		var bp = [];
		for( var i in mesh.vertices ) {
			if( !mesh.vertices.hasOwnProperty( i ) ) {
				continue;
			}
			if( mesh.vertices[i].isBorderPoint() ) {
				bp.push( mesh.vertices[i] );
			}
		}
		console.log( bp );
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



/**
 * Manipulating the scene (models, lights, camera).
 * @type {Object}
 */
var Scene = {

	MODE: CONFIG.MODE,
	SHADING: CONFIG.SHADING,


	/**
	 * Center a mesh.
	 * @param  {THREE.Mesh} mesh The mesh to center.
	 * @return {THREE.Mesh}      Centered mesh.
	 */
	centerModel: function( mesh ) {
		var center = mesh.geometry.boundingBox.center();

		mesh.position.x -= center.x;
		mesh.position.y -= center.y;
		mesh.position.z -= center.z;

		return mesh;
	},


	/**
	 * Change the mode the model is rendered: Solid or Wireframe.
	 */
	changeMode: function( e ) {
		var model = GLOBAL.MODEL,
		    value = e.target.value;

		if( !e.target.checked || model === null ) {
			return false;
		}

		switch( value ) {
			case "solid":
				model.material.wireframe = false;
				break;
			case "wireframe":
				model.material.wireframe = true;
				break;
			default:
				return false;
		}

		this.MODE = value;
		render();
	},


	/**
	 * Change the shading of the material: None, Flat or Phong.
	 */
	changeShading: function( e ) {
		var g = GLOBAL,
		    model = g.MODEL,
		    value = e.target.value;
		var material;

		if( !e.target.checked || model === null ) {
			return false;
		}

		switch( value ) {
			case "none":
				material = new THREE.MeshPhongMaterial( {
					shading: THREE.NoShading,
					wireframe: ( this.MODE == "wireframe" )
				} );
				break;
			case "flat":
				material = new THREE.MeshPhongMaterial( {
					shading: THREE.FlatShading,
					wireframe: ( this.MODE == "wireframe" )
				} );
				break;
			case "phong":
				material = new THREE.MeshPhongMaterial( {
					shading: THREE.SmoothShading,
					wireframe: ( this.MODE == "wireframe" )
				} );
				break;
			default:
				return false;
		}

		model.setMaterial( material );
		model.geometry.normalsNeedUpdate = true;

		this.SHADING = value;
		render();
	},


	/**
	 * Clear the scene (except for the lights).
	 */
	clearModels: function() {
		var scene = GLOBAL.SCENE;
		var obj;

		for( var i = scene.children.length - 1; i >= 0; i-- ) {
			obj = scene.children[i];

			if( obj instanceof THREE.Light || obj instanceof THREE.Camera ) {
				continue;
			}
			scene.remove( obj );
		}
	},


	/**
	 * Prepare the model as mesh.
	 * @param  {THREE.Geometry} geometry Geometry of the model.
	 * @return {THREE.Mesh}              Model as mesh.
	 */
	geometryToMesh: function( geometry ) {
		var material = new THREE.MeshPhongMaterial(),
		    mesh = new THREE.Mesh( geometry );

		material.shading = this.getCurrentShading();
		material.wireframe = ( this.MODE == "wireframe" );

		mesh.setMaterial( material );

		mesh.geometry.computeFaceNormals();
		mesh.geometry.computeVertexNormals();
		mesh.geometry.computeBoundingBox();

		return mesh;
	},


	/**
	 * Get the current shading type.
	 * @return {int} THREE.NoShading, THREE.FlatShading or THREE.SmoothShading.
	 */
	getCurrentShading: function() {
		switch( this.SHADING ) {
			case "none":
				return THREE.NoShading;
			case "flat":
				return THREE.FlatShading;
			case "phong":
				return THREE.SmoothShading;
			default:
				return false;
		}
	},


	/**
	 * Show the bounding box of the model.
	 * The bounding box will be centered independent of the model itself.
	 * @param {THREE.Mesh} model The model.
	 */
	renderBoundingBox: function( model ) {
		var bb = model.geometry.boundingBox,
		    width = bb.max.x - bb.min.x,
		    height = bb.max.y - bb.min.y,
		    depth = bb.max.z - bb.min.z;
		var cubeGeometry, cubeMesh, material;

		material = new THREE.MeshBasicMaterial( {
			color: CONFIG.COLOR.BOUNDING_BOX,
			shading: THREE.NoShading,
			wireframe: true
		} );

		cubeGeometry = new THREE.CubeGeometry( width, height, depth );
		cubeMesh = new THREE.Mesh( cubeGeometry, material );
		cubeMesh.position.set( 0, 0, 0 );

		GLOBAL.SCENE.add( cubeMesh );
	},


	/**
	 * Reset the camera settings.
	 */
	resetCamera: function() {
		GLOBAL.CONTROLS.reset();
	}

};
