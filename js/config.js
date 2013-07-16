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
		FOCUS_HOLE: {
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
		AFM_STOP_AFTER_ITER: 30000
	},
	// Hole Filling
	HF: {
		// Border of the hole(s)
		BORDER: {
			COLOR: [0xFF0000, 0xFF57DE, 0xFFC620, 0x74FF3A],
			LINE_WIDTH: 2,
			SHOW_POINTS: false
		},
		// The filling to be created
		FILLING: {
			COLOR: 0x87C3EC,
			LINE_WIDTH: 3,
			SHOW_SOLID: true,
			SHOW_WIREFRAME: false,
			THRESHOLD_MERGE: 0.16
		}
	},
	// Lights of the scene
	LIGHTS: {
		AMBIENT: [
			{ color: 0x101010 }
		],
		DIRECTIONAL: [
			{
				color: 0xF4F4F4,
				intensity: 1.0,
				position: [-1, 0, -1]
			},
			{
				color: 0xF4F4F4,
				intensity: 0.2,
				position: [1, 0, 1]
			}
		]
	},
	// Model rendering
	MODE: "solid",
	SHADING: "flat"
};
