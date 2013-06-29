"use strict";


var CONFIG = {
	ALLOWED_FILE_EXTENSIONS: ["obj", "ply", "stl"],
	AXIS: {
		SHOW: true,
		SIZE: 40
	},
	BBOX_COLOR: 0x37FEFE,
	CAMERA: {
		ANGLE: 45,
		POSITION: {
			X: 0,
			Y: 0,
			Z: 20
		},
		ZFAR: 2500,
		ZNEAR: 0.1
	},
	CONTROLS: { // Trackball controls
		PAN_SPEED: 0.8,
		ROT_SPEED: 1.5,
		ZOOM_SPEED: 1.5
	},
	HF: { // Hole Filling
		BORDER: {
			COLOR: [0xFF0000, 0xFF57DE, 0xFFC620, 0x74FF3A],
			LINE_WIDTH: 2,
			SHOW_POINTS: true
		},
		FILLING: {
			COLOR: 0xFFFF00,
			LINE_WIDTH: 2,
			SHOW_POINTS: true,
			THRESHOLD_MERGE: 0.12
		}
	},
	MODE: "solid",
	SHADING: "phong"
};
