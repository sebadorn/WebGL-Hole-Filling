'use strict';


/**
 * Manipulating the scene (models, lights, camera).
 * @namespace WebHF.SceneManager
 */
WebHF.SceneManager = {


	fillings: [],
	holeLines: [],
	holes: [],
	lightStatus: {
		ambient: true,
		camera: true,
		directional: true
	},
	modeFilling: CONFIG.MODE,
	model: null,
	modeModel: CONFIG.MODE,
	scene: null,
	shading: CONFIG.SHADING,


	/**
	 * Show coordinate system axis.
	 * Adds an axis to the scene. Does not call render() function!
	 */
	addAxis() {
		const axis = new THREE.AxisHelper( CONFIG.AXIS.SIZE );
		axis.name = 'axis';

		this.scene.add( axis );
	},


	/**
	 * Center a mesh.
	 * @param  {THREE.Mesh} mesh - The mesh to center.
	 * @return {THREE.Mesh} Centered mesh.
	 */
	centerModel( mesh ) {
		const center = new THREE.Vector3();
		mesh.geometry.boundingBox.getCenter( center );

		mesh.position.x -= center.x;
		mesh.position.y -= center.y;
		mesh.position.z -= center.z;

		return mesh;
	},


	/**
	 * Change the mode the model is rendered: Solid or Wireframe.
	 * @param {Event}  ev
	 * @param {string} what - "model" or "filling".
	 */
	changeMode( ev, what ) {
		const value = ev.target.value;

		if( !ev.target.checked || this.model === null ) {
			return false;
		}

		if( what === 'model' ) {
			switch( value ) {
				case 'solid':
					this.model.material.wireframe = false;
					break;

				case 'wireframe':
					this.model.material.wireframe = true;
					break;

				default:
					return false;
			}

			this.modeModel = value;
		}
		else if( what === 'filling' ) {
			switch( value ) {
				case 'solid':
					for( let i = 0; i < this.fillings.length; i++ ) {
						this.fillings[i].solid.material.wireframe = false;
					}
					break;

				case 'wireframe':
					for( let i = 0; i < this.fillings.length; i++ ) {
						this.fillings[i].solid.material.wireframe = true;
					}
					break;

				default:
					return false;
			}

			this.modeFilling = value;
		}

		WebHF.render();
	},


	/**
	 * Change the shading of the material: Flat or Phong.
	 * @param {Event} ev
	 */
	changeShading( ev ) {
		if( !ev.target.checked || this.model === null ) {
			return;
		}

		const value = ev.target.value;
		let flatShading = true;

		switch( value ) {
			case 'flat':
				flatShading = true;
				break;

			case 'phong':
				flatShading = false;
				break;

			default:
				return;
		}

		this.model.material.flatShading = flatShading;
		this.model.material.needsUpdate = true;

		this.model.geometry.normalsNeedUpdate = true;

		for( let i = 0; i < this.fillings.length; i++ ) {
			this.fillings[i].solid.material.flatShading = flatShading;
			this.fillings[i].solid.material.needsUpdate = true;

			this.fillings[i].solid.geometry.normalsNeedUpdate = true;
		}

		this.shading = value;
		WebHF.render();
	},


	/**
	 * Clear the scene (except for the lights, camera and axis).
	 */
	clearModels() {
		for( let i = this.scene.children.length - 1; i >= 0; i-- ) {
			let obj = this.scene.children[i];

			if( obj instanceof THREE.Light || obj instanceof THREE.Camera ) {
				continue;
			}
			if( obj.name === 'axis' ) {
				continue;
			}

			this.scene.remove( obj );
		}

		this.fillings = [];
	},


	/**
	 * Create an optical representation of a cross vector.
	 * Creates a point and a line.
	 * @param  {THREE.Vector3}   vp            - Previous vector.
	 * @param  {THREE.Vector3}   v             - Center vector of the angle.
	 * @param  {THREE.Vector3}   vn            - Next vector.
	 * @param  {number}          size          - Size of the point.
	 * @param  {(number|string)} color         - Color for the objects.
	 * @param  {boolean}         moveWithModel - Adjust position with the currently loaded model.
	 * @return {object} Point and line for the cross vector.
	 */
	createCrossVector( vp, v, vn, size, color, moveWithModel ) {
		let cross = new THREE.Vector3();
		cross = cross.crossVectors( vp.clone().sub( v ), vn.clone().sub( v ) ).add( v );

		const point = this.createPoint( cross, size, color, moveWithModel );
		const line = this.createLine( v, cross, 1, color, moveWithModel );

		return {
			point: point,
			line: line
		};
	},


	/**
	 * Create a line from a starting to an end point.
	 * @param  {THREE.Vector3}   start         - Start point.
	 * @param  {THREE.Vector3}   end           - End point.
	 * @param  {number}          width         - Line width of the line.
	 * @param  {(number|string)} color         - Color of the line.
	 * @param  {boolean}         moveWithModel - If true, move the line to the position of the model.
	 * @return {THREE.Line} A THREE.Line object.
	 */
	createLine( start, end, width, color, moveWithModel ) {
		const material = new THREE.LineBasicMaterial( { linewidth: width, color: color } );

		const geo = new THREE.Geometry();
		geo.vertices.push( start.clone().add( this.model.position ) );
		geo.vertices.push( end.clone().add( this.model.position ) );

		return new THREE.Line( geo, material );
	},


	/**
	 * Create a sphere mesh.
	 * @param  {object}          position      - Position of the sphere.
	 * @param  {object}          position.x
	 * @param  {object}          position.y
	 * @param  {object}          position.z
	 * @param  {number}          size          - Radius of the sphere.
	 * @param  {(number|string)} color         - Color of the sphere.
	 * @param  {boolean}         moveWithModel - If true, move the point to the position of the model.
	 * @return {THREE.Mesh}
	 */
	createPoint( position, size, color, moveWithModel ) {
		const material = new THREE.MeshBasicMaterial( { color: color } );
		const mesh = new THREE.Mesh( new THREE.SphereGeometry( size ), material );

		mesh.position.x = position.x;
		mesh.position.y = position.y;
		mesh.position.z = position.z;

		if( moveWithModel ) {
			const gmp = this.model.position;

			mesh.position.x += gmp.x;
			mesh.position.y += gmp.y;
			mesh.position.z += gmp.z;
		}

		return mesh;
	},


	/**
	 * Export the model.
	 * @param  {string}  format     - Name of the format to use.
	 * @param  {?string} modelName - Name for the model.
	 * @return {string} Exported model data.
	 */
	exportModel( format, modelName ) {
		let exportData = null;

		WebHF.Stopwatch.start( 'export' );

		switch( format ) {
			case 'obj':
				exportData = WebHF.Export.saveOBJ( this.model );
				break;

			case 'stl':
				exportData = WebHF.Export.saveSTL( this.model, modelName );
				break;

			default:
				throw new Error( 'Unknown export format: ' + format );
		}

		WebHF.Stopwatch.stop( 'export', true );

		return exportData;
	},


	/**
	 * Start the hole filling.
	 * @param {Event} ev
	 */
	fillHole( ev ) {
		const index = parseInt( ev.target.getAttribute( 'data-fillhole' ), 10 );
		const mergeThreshold = parseFloat( document.getElementById( 'merge-threshold' ).value, 10 );
		const workerNumber = parseInt( document.getElementById( 'collision-worker' ).value, 10 );

		if( isNaN( index ) ) {
			console.error( 'Not a valid hole index.' );
			return;
		}

		if( this.holes.length <= index ) {
			console.error( 'No hole exists for this index.' );
			return;
		}

		if( isNaN( mergeThreshold ) || mergeThreshold < 0.001 ) {
			console.error( 'Merge threshold not a valid value. Needs to be greater or equal 0.001.' );
			return;
		}

		if( isNaN( workerNumber ) || workerNumber < 1 ) {
			console.error( 'Number of worker processes not a valid value. Need to be greater or equal 1. Optimal number equals the number of CPU cores.' );
			return;
		}

		WebHF.Stopwatch.start( 'fill hole (AF)' );
		WebHF.UI.disableFillButton();

		WebHF.AdvancingFront.start(
			this.model.geometry,
			this.holes[index],
			mergeThreshold,
			this.mergeWithFilling.bind( this ),
			workerNumber
		);
	},


	/**
	 * Show the border edges of the model.
	 */
	findHoles() {
		if( this.model == null ) {
			console.error( 'No model loaded.' );
			return;
		}

		// Remove old hole outlines
		if( this.holeLines.length > 0 ) {
			for( let i = 0, len = this.holeLines.length; i < len; i++ ) {
				this.scene.remove( this.holeLines[i] );
			}
		}

		this.holeLines = [];

		WebHF.Stopwatch.start( 'find holes' );

		const border = WebHF.HoleFinding.findBorderEdges( this.model );

		WebHF.Stopwatch.stop( 'find holes', true );
		WebHF.Stopwatch.remove( 'find holes' );

		if( CONFIG.HOLES.SHOW_LINES ) {
			for( let i = 0, len = border.lines.length; i < len; i++ ) {
				this.scene.add( border.lines[i] );
			}

			this.holeLines = border.lines;
		}

		// @see HoleFinding.findBorderEdges() for
		// use of CONFIG.HOLES.SHOW_POINTS
		for( let i = 0, len = border.points.length; i < len; i++ ) {
			this.scene.add( border.points[i] );
		}

		WebHF.render();

		this.holes = border.holes;
		WebHF.UI.showDetailHoles( border.lines );
	},


	/**
	 * Fit the camera position to the model size.
	 */
	fitCameraToModel() {
		const bb = this.model.geometry.boundingBox;

		this.resetCamera();

		WebHF.camera.position.x = Math.abs( bb.max.x - bb.min.x );
		WebHF.camera.position.y = Math.abs( bb.max.y - bb.min.y );
		WebHF.camera.position.z = Math.abs( bb.max.z - bb.min.z );
	},


	/**
	 * Focus on the found hole.
	 * @param {number} index - Index of the found hole
	 */
	focusHole( index ) {
		const cfgCam = CONFIG.CAMERA;

		if( isNaN( index ) ) {
			console.error( 'Not a valid hole index.' );
			return;
		}

		if( this.holes.length <= index ) {
			console.error( 'No hole exists for this index.' );
			return;
		}

		const bbox = WebHF.Utils.getBoundingBox( this.holes[index] );
		bbox.center.add( this.model.position );
		bbox.center.setLength( bbox.center.length() * cfgCam.FOCUS.DISTANCE_FACTOR );

		let stepX = ( bbox.center.x - WebHF.camera.position.x );
		let stepY = ( bbox.center.y - WebHF.camera.position.y );
		let stepZ = ( bbox.center.z - WebHF.camera.position.z );

		if( cfgCam.FOCUS.STEPS > 0 ) {
			stepX /= cfgCam.FOCUS.STEPS;
		    stepY /= cfgCam.FOCUS.STEPS;
		    stepZ /= cfgCam.FOCUS.STEPS;
		}

		this.moveCameraToPosition( stepX, stepY, stepZ, 0 );
	},


	/**
	 * Prepare the model as mesh.
	 * @param  {THREE.Geometry} geometry - Geometry of the model.
	 * @return {THREE.Mesh} Model as mesh.
	 */
	geometryToMesh( geometry ) {
		const material = new THREE.MeshPhongMaterial();
		material.flatShading = this.isFlatShading();
		material.side = THREE.DoubleSide;
		material.wireframe = ( this.modeModel == 'wireframe' );

		const mesh = new THREE.Mesh( geometry );
		mesh.material = material;
		mesh.geometry.computeFaceNormals();
		mesh.geometry.computeVertexNormals();
		mesh.geometry.computeBoundingBox();

		return mesh;
	},


	/**
	 * Get the current shading type.
	 * @return {boolean}
	 */
	isFlatShading() {
		switch( this.shading ) {
			case 'flat':
				return true;

			case 'phong':
				return false;

			default:
				return true;
		}
	},


	/**
	 * Initialize the scene.
	 */
	init() {
		this.scene = new THREE.Scene();

		// Axis
		if( CONFIG.AXIS.SHOW ) {
			this.addAxis();
		}
	},


	/**
	 * Merge the model with the new filling.
	 * @param {THREE.Geometry} filling   - The filling to merge into the model.
	 * @param {number}         holeIndex
	 */
	mergeWithFilling( filling, holeIndex ) {
		const gm = this.model;
		gm.geometry.merge( filling );
		gm.geometry.mergeVertices();
		gm.geometry.computeFaceNormals();
		gm.geometry.computeVertexNormals();
		gm.geometry.computeBoundingBox();

		WebHF.UI.checkHoleFinished( holeIndex );
		WebHF.UI.updateProgress( 100 );

		WebHF.Stopwatch.stop( 'fill hole (AF)', true );
	},


	/**
	 * Move the camera lights to the camera position.
	 * @param {Event} ev - Change event fired by THREE.TrackballControls
	 */
	moveCameraLights( ev ) {
		const lights = WebHF.lights.camera;
		const pos = ev.target.object.position.clone();

		for( let i = 0, len = lights.length; i < len; i++ ) {
			lights[i].position.copy( pos );
		}
	},


	/**
	 * Move the camera (more-or-less) fluently to a position.
	 * @param {number} stepX - Step length in X direction.
	 * @param {number} stepY - Step length in Y direction.
	 * @param {number} stepZ - Step length in Z direction.
	 * @param {number} count - Counter to know when to stop.
	 */
	moveCameraToPosition( stepX, stepY, stepZ, count ) {
		WebHF.camera.position.x += stepX;
		WebHF.camera.position.y += stepY;
		WebHF.camera.position.z += stepZ;
		WebHF.render();

		count++;

		if( count >= CONFIG.CAMERA.FOCUS.STEPS ) {
			return;
		}
		else {
			setTimeout(
				function() {
					WebHF.SceneManager.moveCameraToPosition( stepX, stepY, stepZ, count );
				},
				CONFIG.CAMERA.FOCUS.TIMEOUTS
			);
		}
	},


	/**
	 * Show the bounding box of the model.
	 * @param {THREE.Mesh} model - The model.
	 */
	renderBoundingBox( model ) {
		const bb = model.geometry.boundingBox;
		const cubeGeometry = new THREE.Geometry();

		const material = new THREE.LineBasicMaterial( {
			color: CONFIG.BBOX.COLOR,
			shading: THREE.NoShading
		} );

		cubeGeometry.vertices.push(
			// bottom plane
			bb.min,
			new THREE.Vector3( bb.max.x, bb.min.y, bb.min.z ),

			new THREE.Vector3( bb.max.x, bb.min.y, bb.min.z ),
			new THREE.Vector3( bb.max.x, bb.max.y, bb.min.z ),

			new THREE.Vector3( bb.max.x, bb.max.y, bb.min.z ),
			new THREE.Vector3( bb.min.x, bb.max.y, bb.min.z ),

			new THREE.Vector3( bb.min.x, bb.max.y, bb.min.z ),
			bb.min,

			// top plane
			bb.max,
			new THREE.Vector3( bb.min.x, bb.max.y, bb.max.z ),

			new THREE.Vector3( bb.min.x, bb.min.y, bb.max.z ),
			new THREE.Vector3( bb.min.x, bb.max.y, bb.max.z ),

			new THREE.Vector3( bb.min.x, bb.min.y, bb.max.z ),
			new THREE.Vector3( bb.max.x, bb.min.y, bb.max.z ),

			new THREE.Vector3( bb.max.x, bb.min.y, bb.max.z ),
			bb.max,

			// "pillars" connecting bottom and top
			bb.min,
			new THREE.Vector3( bb.min.x, bb.min.y, bb.max.z ),

			new THREE.Vector3( bb.max.x, bb.min.y, bb.min.z ),
			new THREE.Vector3( bb.max.x, bb.min.y, bb.max.z ),

			new THREE.Vector3( bb.max.x, bb.max.y, bb.min.z ),
			new THREE.Vector3( bb.max.x, bb.max.y, bb.max.z ),

			new THREE.Vector3( bb.min.x, bb.max.y, bb.min.z ),
			new THREE.Vector3( bb.min.x, bb.max.y, bb.max.z )
		);

		const mesh = new THREE.Line( cubeGeometry, material, THREE.LinePieces );
		mesh.position = model.position;

		this.scene.add( mesh );
	},


	/**
	 * Reset the camera settings.
	 */
	resetCamera() {
		WebHF.controls.reset();
	},


	/**
	 * Render the finished hole filling.
	 * Create a mesh from the computed data and render it.
	 * @param {THREE.Geometry} front     - Front of the hole.
	 * @param {THREE.Geometry} filling   - Filling of the hole.
	 * @param {number}         holeIndex
	 */
	showFilling( front, filling, holeIndex ) {
		const model = WebHF.SceneManager.model;

		this.fillings.push( { solid: false, wireframe: false } );

		// Filling
		const materialFilling = new THREE.MeshPhongMaterial( {
			color: CONFIG.FILLING.COLOR,
			flatShading: WebHF.SceneManager.isFlatShading(),
			side: THREE.DoubleSide,
			wireframe: ( this.modeFilling == "wireframe" ),
			wireframeLinewidth: CONFIG.FILLING.LINE_WIDTH
		} );
		const meshFilling = new THREE.Mesh( filling, materialFilling );

		meshFilling.position.x += model.position.x;
		meshFilling.position.y += model.position.y;
		meshFilling.position.z += model.position.z;

		meshFilling.geometry.computeFaceNormals();
		meshFilling.geometry.computeVertexNormals();
		meshFilling.geometry.computeBoundingBox();

		this.fillings[this.fillings.length - 1].solid = meshFilling;
		WebHF.SceneManager.scene.add( meshFilling );


		// Extra option: Filling as wireframe (can be used as overlay)
		if( CONFIG.FILLING.SHOW_WIREFRAME ) {
			const materialWire = new THREE.MeshBasicMaterial( {
				color: 0xFFFFFF,
				side: THREE.DoubleSide,
				wireframe: true,
				wireframeLinewidth: CONFIG.FILLING.LINE_WIDTH
			} );
			const meshWire = new THREE.Mesh( filling, materialWire );

			meshWire.position.x += model.position.x;
			meshWire.position.y += model.position.y;
			meshWire.position.z += model.position.z;

			meshWire.geometry.computeFaceNormals();
			meshWire.geometry.computeVertexNormals();
			meshWire.geometry.computeBoundingBox();

			this.fillings[this.fillings.length - 1].wireframe = meshWire;
			WebHF.SceneManager.scene.add( meshWire );
		}


		// Draw the (moving) front
		if( CONFIG.DEBUG.SHOW_FRONT ) {
			const material = new THREE.LineBasicMaterial( {
				color: 0xFFFFFF,
				linewidth: 4
			} );

			const debugFront = front.clone();
			debugFront.vertices.push( debugFront.vertices[0] );

			const mesh = new THREE.Line( debugFront, material );

			mesh.position.x += model.position.x;
			mesh.position.y += model.position.y;
			mesh.position.z += model.position.z;

			WebHF.SceneManager.scene.add( mesh );
		}

		WebHF.render();
	},


	/**
	 * Switch the light on or off.
	 * @param {Event} ev
	 */
	toggleLight( ev ) {
		const lightType = ev.target.name;

		let lights = null;
		let lightStatus = null;

		switch( lightType ) {
			case 'light_ambient':
				lights = WebHF.lights.ambient;
				lightStatus = this.lightStatus.ambient;
				this.lightStatus.ambient = !lightStatus;
				break;

			case 'light_camera':
				lights = WebHF.lights.camera;
				lightStatus = this.lightStatus.camera;
				this.lightStatus.camera = !lightStatus;
				break;

			case 'light_directional':
				lights = WebHF.lights.directional;
				lightStatus = this.lightStatus.directional;
				this.lightStatus.directional = !lightStatus;
				break;

			default:
				console.error( 'Unknown light type: ' + lightType );
				return;
		}

		const len = lights.length;

		if( lightStatus ) {
			for( let i = 0; i < len; i++ ) {
				this.scene.remove( lights[i] );
			}
		}
		else {
			for( let i = 0; i < len; i++ ) {
				this.scene.add( lights[i] );
			}
		}

		WebHF.render();
	}


};
