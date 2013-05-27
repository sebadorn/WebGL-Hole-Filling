"use strict";


var CONFIG = {
	ALLOWED_FILE_EXTENSIONS: ["obj", "ply", "stl"],
	CAMERA: {
		ANGLE: 45,
		POSITION: {
			X: 0,
			Y: 0,
			Z: 20
		},
		ZFAR: 2000,
		ZNEAR: 1
	},
	CONTROLS: {
		PAN_SPEED: 0.8,
		ROT_SPEED: 1.5,
		ZOOM_SPEED: 1.5
	},
	COLOR: {
		BOUNDING_BOX: 0x37FEFE
	},
	MODE: "solid",
	SHADING: "phong"
};
