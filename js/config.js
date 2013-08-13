"use strict";


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
		SHOW_FRONT: false,
		SHOW_MERGING: false,
		// <int>: stop after x iterations; <false>: stop when finished
		AFM_STOP_AFTER_ITER: 3000
	},

	// Export of model
	EXPORT: {
		DEFAULT_FORMAT: "STL",
		FORMATS: ["OBJ", "STL"]
	},

	// Hole Filling
	HF: {
		// Border of the hole(s)
		BORDER: {
			COLOR: [0xFF0000, 0xE227BD, 0xFFA420, 0x38F221],
			LINE_WIDTH: 3,
			SHOW_LINES: true,
			SHOW_POINTS: false
		},
		// The filling to be created
		FILLING: {
			COLOR: 0x87C3EC,
			// COLLISION_TEST values: "filling" or "all"
			// "all" will test to whole mesh for collisions with a newly created point,
			// while "filling" only tests the hole filling.
			// "all" is really slow.
			COLLISION_TEST: "filling",
			LINE_WIDTH: 3,
			SHOW_SOLID: true,
			SHOW_WIREFRAME: false,
			THRESHOLD_MERGE: 0.16,
			// Number of Web Worker threads
			// (only relevant if using AdvancingFront-withWorkers.js)
			WORKER: 3
		}
	},

	// Lights of the scene
	LIGHTS: {
		// Ambient lights
		AMBIENT: [
			{ color: 0x101016 }
		],
		// Directional lights, don't move with the camera
		DIRECTIONAL: [
			// {
			// 	color: 0xFFFFFF,
			// 	intensity: 0.3,
			// 	position: [1, 0, 1]
			// }
		],
		// Directional lights, move with the camera
		CAMERA: [
			{
				color: 0xFFFFFF,
				intensity: 0.8
			}
		]
	},

	// Mode: "solid" or "wireframe"
	MODE: "solid",

	// Shading: "flat" or "phong"
	SHADING: "flat"

};
