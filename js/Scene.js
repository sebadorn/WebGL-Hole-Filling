"use strict";


/**
 * Manipulating the scene (models, lights, camera).
 * @type {Object}
 */
var Scene = {

	HOLE_LINES: [],
	LIGHT_STATUS: {
		AMBIENT: true,
		CAMERA: true,
		DIRECTIONAL: true
	},
	MODE: CONFIG.MODE,
	SHADING: CONFIG.SHADING,


	/**
	 * Show coordinate system axis.
	 * Adds an axis to the scene. Does not call render() function!
	 */
	addAxis: function() {
		var axis = new THREE.AxisHelper( CONFIG.AXIS.SIZE );

		axis.name = "axis";
		GLOBAL.SCENE.add( axis );
	},


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
				for( var key in GLOBAL.FILLINGS ) {
					GLOBAL.FILLINGS[key].solid.material.wireframe = false;
				}
				break;

			case "wireframe":
				model.material.wireframe = true;
				for( var key in GLOBAL.FILLINGS ) {
					GLOBAL.FILLINGS[key].solid.material.wireframe = true;
				}
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
		var shading;

		if( !e.target.checked || model === null ) {
			return false;
		}

		switch( value ) {

			case "none":
				shading = THREE.NoShading;
				break;

			case "flat":
				shading = THREE.FlatShading;
				break;

			case "phong":
				shading = THREE.SmoothShading;
				break;

			default:
				return false;

		}

		model.material.shading = shading;
		model.geometry.normalsNeedUpdate = true;

		for( var key in g.FILLINGS ) {
			g.FILLINGS[key].solid.material.shading = shading;
			g.FILLINGS[key].solid.geometry.normalsNeedUpdate = true;
		}

		this.SHADING = value;
		render();
	},


	/**
	 * Clear the scene (except for the lights and axis).
	 */
	clearModels: function() {
		var scene = GLOBAL.SCENE;
		var obj;

		for( var i = scene.children.length - 1; i >= 0; i-- ) {
			obj = scene.children[i];

			if( obj instanceof THREE.Light || obj instanceof THREE.Camera ) {
				continue;
			}
			if( obj.name == "axis" ) {
				continue;
			}
			scene.remove( obj );
		}
	},


	/**
	 * Create a line from a starting to an end point.
	 * @param  {THREE.Vector3} from          Start point.
	 * @param  {THREE.Vector3} to            End point.
	 * @param  {float}         width         Line width of the line.
	 * @param  {hexadecimal}   color         Color of the line.
	 * * @param  {boolean}     moveWithModel If true, move the line to the position of the model.
	 * @return {THREE.Line}                  A THREE.Line object.
	 */
	createLine: function( from, to, width, color, moveWithModel ) {
		var material = new THREE.LineBasicMaterial( { linewidth: width, color: color } ),
		    geo = new THREE.Geometry();

		geo.vertices.push( from.clone().add( GLOBAL.MODEL.position ) );
		geo.vertices.push( to.clone().add( GLOBAL.MODEL.position ) );

		return new THREE.Line( geo, material );
	},


	/**
	 * Create a sphere mesh.
	 * @param  {Dictionary}  position      Position of the sphere.
	 * @param  {float}       size          Radius of the sphere.
	 * @param  {hexadecimal} color         Color of the sphere.
	 * @param  {boolean}     moveWithModel If true, move the point to the position of the model.
	 * @return {THREE.Mesh}
	 */
	createPoint: function( position, size, color, moveWithModel ) {
		var material = new THREE.MeshBasicMaterial( { color: color } ),
		    mesh = new THREE.Mesh( new THREE.SphereGeometry( size ), material );

		mesh.position.x = position.x;
		mesh.position.y = position.y;
		mesh.position.z = position.z;

		if( typeof moveWithModel != "undefined" && moveWithModel ) {
			var gmp = GLOBAL.MODEL.position;

			mesh.position.x += gmp.x;
			mesh.position.y += gmp.y;
			mesh.position.z += gmp.z;
		}

		return mesh;
	},


	/**
	 * Export the model.
	 * @param  {String} format    Name of the format to use.
	 * @param  {String} modelName Name for the model. (optional)
	 * @return {String}           Exported model data.
	 */
	exportModel: function( format, modelName ) {
		var exportData;

		switch( format ) {

			case "obj":
				exportData = exportOBJ( GLOBAL.MODEL );
				break;

			case "stl":
				exportData = exportSTL( GLOBAL.MODEL, modelName );
				break;

			default:
				throw new Error( "Unknown export format: " + format );

		}

		return exportData;
	},


	/**
	 * Start the hole filling.
	 */
	fillHole: function( e ) {
		var g = GLOBAL;
		var index = parseInt( e.target.getAttribute( "data-fillhole" ), 10 );

		if( isNaN( index ) ) {
			console.error( "Not a valid hole index." );
			return;
		}
		if( g.HOLES.length <= index ) {
			console.error( "No hole exists for this index." );
			return;
		}

		var filling = AdvancingFront.afmStart( g.MODEL, g.HOLES[index] );

		// Merge original model with the new filling
		THREE.GeometryUtils.merge( g.MODEL.geometry, filling );
		g.MODEL.geometry.mergeVertices();
		g.MODEL.geometry.computeFaceNormals();
		g.MODEL.geometry.computeVertexNormals();
		g.MODEL.geometry.computeBoundingBox();

		UI.checkHoleFinished( index );
		UI.updateProgress( 100 );
	},


	/**
	 * Focus on the found hole.
	 * @param {int} index Index of the found hole
	 */
	focusHole: function( index ) {
		var cfgCam = CONFIG.CAMERA,
		    g = GLOBAL;

		if( isNaN( index ) ) {
			console.error( "Not a valid hole index." );
			return;
		}
		if( g.HOLES.length <= index ) {
			console.error( "No hole exists for this index." );
			return;
		}

		var bbox = Utils.getBoundingBox( g.HOLES[index] );

		bbox.center.add( GLOBAL.MODEL.position );
		bbox.center.setLength( bbox.center.length() + cfgCam.FOCUS.DISTANCE );

		var stepX = ( bbox.center.x - GLOBAL.CAMERA.position.x ),
		    stepY = ( bbox.center.y - GLOBAL.CAMERA.position.y ),
		    stepZ = ( bbox.center.z - GLOBAL.CAMERA.position.z );

		if( cfgCam.FOCUS.STEPS > 0 ) {
			stepX /= cfgCam.FOCUS.STEPS;
		    stepY /= cfgCam.FOCUS.STEPS;
		    stepZ /= cfgCam.FOCUS.STEPS;
		}

		this.moveCameraToPosition( stepX, stepY, stepZ, 0 );
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
		material.side = THREE.DoubleSide;
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
	 * Move the camera lights to the camera position.
	 * @param {Event} e Change event fired by THREE.TrackballControls
	 */
	moveCameraLights: function( e ) {
		var lights = GLOBAL.LIGHTS.CAMERA,
		    pos = e.target.object.position.clone();

		for( var i = 0; i < lights.length; i++ ) {
			lights[i].position = pos;
		}
	},


	/**
	 * Move the camera (more-or-less) fluently to a position.
	 * @param {float} stepX Step length in X direction.
	 * @param {float} stepY Step length in Y direction.
	 * @param {float} stepZ Step length in Z direction.
	 * @param {int}   count Counter to know when to stop.
	 */
	moveCameraToPosition: function( stepX, stepY, stepZ, count ) {
		GLOBAL.CAMERA.position.x += stepX;
		GLOBAL.CAMERA.position.y += stepY;
		GLOBAL.CAMERA.position.z += stepZ;
		render();

		count++;

		if( count >= CONFIG.CAMERA.FOCUS.STEPS ) {
			return;
		}
		else {
			setTimeout(
				function() { Scene.moveCameraToPosition( stepX, stepY, stepZ, count ); },
				CONFIG.CAMERA.FOCUS.TIMEOUTS
			);
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
			color: CONFIG.BBOX_COLOR,
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
	},


	/**
	 * Show the border edges of the model.
	 */
	showEdges: function() {
		var g = GLOBAL;

		if( g.MODEL == null ) {
			console.error( "No model loaded." );
			return;
		}

		// Remove old hole outlines
		if( this.HOLE_LINES.length > 0 ) {
			for( var i = 0; i < this.HOLE_LINES.length; i++ ) {
				g.SCENE.remove( this.HOLE_LINES[i] );
			}
		}
		this.HOLE_LINES = [];

		var border = HoleFilling.findBorderEdges( g.MODEL );

		if( CONFIG.HF.BORDER.SHOW_LINES ) {
			for( var i = 0; i < border.lines.length; i++ ) {
				g.SCENE.add( border.lines[i] );
			}
			this.HOLE_LINES = border.lines;
		}
		// @see HoleFilling.findBorderEdges() for
		// use of CONFIG.HF.BORDER.SHOW_POINTS
		for( var j = 0; j < border.points.length; j++ ) {
			g.SCENE.add( border.points[j] );
		}
		render();

		g.HOLES = border.holes;
		UI.showDetailHoles( border.lines );
	},


	/**
	 * Switch the light on or off.
	 */
	toggleLight: function( e ) {
		var g = GLOBAL,
		    lightType = e.target.name;
		var lights, lightStatus;

		switch( lightType ) {

			case "light_ambient":
				lights = g.LIGHTS.AMBIENT;
				lightStatus = this.LIGHT_STATUS.AMBIENT;
				this.LIGHT_STATUS.AMBIENT = !lightStatus;
				break;

			case "light_camera":
				lights = g.LIGHTS.CAMERA;
				lightStatus = this.LIGHT_STATUS.CAMERA;
				this.LIGHT_STATUS.CAMERA = !lightStatus;
				break;

			case "light_directional":
				lights = g.LIGHTS.DIRECTIONAL;
				lightStatus = this.LIGHT_STATUS.DIRECTIONAL;
				this.LIGHT_STATUS.DIRECTIONAL = !lightStatus;
				break;

			default:
				console.error( "Unknown light type: " + lightType );
				return;

		}

		var len = lights.length;

		if( lightStatus ) {
			for( var i = 0; i < len; i++ ) {
				g.SCENE.remove( lights[i] );
			}
		}
		else {
			for( var i = 0; i < len; i++ ) {
				g.SCENE.add( lights[i] );
			}
		}

		render();
	}

};
