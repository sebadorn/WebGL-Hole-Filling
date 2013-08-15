"use strict";


/**
 * Global CONFIG object.
 * @type {Object}
 */
var CONFIG = {

	ALLOWED_FILE_EXTENSIONS: ["obj", "ply", "stl"],

	// Axis
	AXIS: {
		SHOW: true,
		SIZE: 40
	},

	// Bounding Box
	BBOX_COLOR: 0x37FEFE,

	// Camera. Always looking at (0,0,0)
	CAMERA: {
		ANGLE: 45,
		FOCUS: {
			DISTANCE: 8.0,
			STEPS: 0,
			TIMEOUTS: 30
		},
		POSITION: {
			X: 20,
			Y: 20,
			Z: 0
		},
		ZFAR: 2500,
		ZNEAR: 0.01
	},

	// Check the model right after import for problems.
	// Remove vertices that are either not part of any face, or
	// are (wrongly) connected to themself.
	// Removing vertices also means that the faces have to be updated.
	// Normally, this option shouldn't have to be enabled, but some
	// models may be faulty. Hints, if you are dealing with such a
	// faulty model:
	// - After filling some holes, searching again will show new holes.
	// - A filled and then exported model will show new holes after import.
	CHECK_AND_FIX_FACES: true,

	// Trackball controls
	CONTROLS: {
		PAN_SPEED: 0.8,
		ROT_SPEED: 1.5,
		ZOOM_SPEED: 1.5
	},

	// Debug
	DEBUG: {
		// Add bogus parameters to the AdvancingFront-<x>.js file, so it doesn't
		// get pulled from cache. Important for developing, so changes take place
		// immediately after reload.
		AF_INVALIDATE_CACHE: true,
		// The Stopwatch shows how long certain tasks took in the console
		// <int>: stop after x iterations; <false>: stop when finished
		AF_STOP_AFTER_ITER: 2000,
		ENABLE_STOPWATCH: true,
		// After stopping, show the current front
		SHOW_FRONT: false,
		// Show position where vertices have been merged away
		SHOW_MERGING: false
	},

	// Export of model
	EXPORT: {
		DEFAULT_FORMAT: "STL",
		FORMATS: ["OBJ", "STL"]
	},

	// The filling to be created
	FILLING: {
		// Which Advancing Front implementation to use:
		// - "iterative": Fast, but UI freezes until finished
		// - "responsive": ~5-6x slower, but UI stays responsive (= progress bar updates)
		// - "parallel": ~5-6x slower, but UI stays responsive; uses Web Workers.
		AF_MODE: "parallel",
		// COLLISION_TEST values: "filling" or "all"
		// "all" will test to whole mesh for collisions with a newly created point,
		// while "filling" only tests the hole filling.
		// "all" is really slow.
		COLLISION_TEST: "filling",
		COLOR: 0x87C3EC,
		LINE_WIDTH: 3,
		// Update the progress bar every <int> loops.
		// (No progress bar updates in "iterative" mode.)
		PROGRESS_UPDATE: 4,
		SHOW_SOLID: true,
		SHOW_WIREFRAME: false,
		// Threshold for the distance between two vertices before they are merged.
		// Has to be positive value.
		THRESHOLD_MERGE: 0.16,
		// Number of Web Worker threads
		// (only relevant if using AdvancingFront-parallel.js)
		WORKER: 4
	},

	// Outline of the hole(s)
	HOLES: {
		COLOR: [0xFF0000, 0xE227BD, 0xFFA420, 0x38F221],
		LINE_WIDTH: 3,
		SHOW_LINES: true,
		SHOW_POINTS: false
	},

	// Lights of the scene
	LIGHTS: {
		// Ambient lights
		AMBIENT: [
			{ color: 0x101016 }
		],
		// Directional lights, move with the camera
		CAMERA: [
			{
				color: 0xFFFFFF,
				intensity: 0.8
			}
		],
		// Directional lights, don't move with the camera
		DIRECTIONAL: [
			// {
			// 	color: 0xFFFFFF,
			// 	intensity: 0.3,
			// 	position: [1, 0, 1]
			// }
		]
	},

	// Mode: "solid" or "wireframe"
	MODE: "solid",

	// Shading: "flat" or "phong"
	SHADING: "flat"

};



// Validate CONFIG
( function() {
	var OPTIONS_AF_MODE = ["iterative", "parallel", "responsive"],
	    OPTIONS_COLLISION_TEST = ["all", "filling"],
	    OPTIONS_MODE = ["solid", "wireframe"],
	    OPTIONS_SHADING = ["flat", "phong"];

	if( OPTIONS_AF_MODE.indexOf( CONFIG.FILLING.AF_MODE ) < 0 ) {
		console.error( "CONFIG.FILLING.AF_MODE: Unknown setting [" + CONFIG.FILLING.AF_MODE + "]." );
	}
	if( OPTIONS_COLLISION_TEST.indexOf( CONFIG.FILLING.COLLISION_TEST ) < 0 ) {
		console.error( "CONFIG.FILLING.COLLISION_TEST: Unknown setting [" + CONFIG.FILLING.COLLISION_TEST + "]." );
	}
	if( OPTIONS_MODE.indexOf( CONFIG.MODE ) < 0 ) {
		console.error( "CONFIG.MODE: Unknown setting [" + CONFIG.MODE + "]." );
	}
	if( OPTIONS_SHADING.indexOf( CONFIG.SHADING ) < 0 ) {
		console.error( "CONFIG.SHADING: Unknown setting [" + CONFIG.SHADING + "]." );
	}

	if( CONFIG.ALLOWED_FILE_EXTENSIONS.length == 0 ) {
		console.warn( "CONFIG.ALLOWED_FILE_EXTENSIONS: If no file extensions are allowed, it won't be possible to import anything." );
	}
	if( CONFIG.HOLES.COLOR.length == 0 ) {
		console.warn( "CONFIG.HOLES.COLOR: No colors set." );
	}
	if( CONFIG.LIGHTS.CAMERA.length == 0 && CONFIG.LIGHTS.DIRECTIONAL.length == 0 ) {
		console.warn( "CONFIG.LIGHTS: No camera and/or directional light(s) set, you won't see much details." );
	}
	if( CONFIG.EXPORT.FORMATS.length == 0 ) {
		console.warn( "CONFIG.EXPORT.FORMATS: If no export formats are specified, it won't be possible to export a model." );
	}
} )();
