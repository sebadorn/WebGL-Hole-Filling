"use strict";


/**
 * Export model as OBJ.
 * @param  {THREE.Mesh} model The model to export.
 * @return {String}           The content for an OBJ file.
 */
function exportOBJ( model ) {
	var objF = "",
	    objV = "",
	    objVN = "";
	var faces = model.geometry.faces,
	    vertices = model.geometry.vertices;
	var f, v, vn;

	// Vertices
	for( var i = 0; i < vertices.length; i++ ) {
		v = vertices[i];
		objV += "v " + v.x + " " + v.y + " " + v.z + "\n";
	}

	// Faces and vertex normals
	for( var i = 0; i < faces.length; i++ ) {
		f = faces[i];
		objF += "f "
				+ f.a + "//" + f.a + " "
				+ f.b + "//" + f.b + " "
				+ f.c + "//" + f.c + "\n";

		vn = f.normal;
		objVN += "vn " + vn.x + " " + vn.y + " " + vn.z + "\n";
	}

	return objV + "\n\n" + objVN + "\n\n" + objF + "\n";
}


function exportSTL( model ) {

}
