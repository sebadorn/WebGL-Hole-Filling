"use strict";


/**
 * Export model as OBJ.
 * (Vertices and faces only.)
 * @param  {THREE.Mesh} model The model to export.
 * @return {String}           The content for an OBJ file.
 */
function exportOBJ( model ) {
	var objF = "",
	    objV = "";
	var faces = model.geometry.faces,
	    vertices = model.geometry.vertices;
	var f, v;

	// Vertices
	for( var i = 0; i < vertices.length; i++ ) {
		v = vertices[i];
		objV += "v " + v.x + " " + v.y + " " + v.z + "\n";
	}

	// Faces
	for( var i = 0; i < faces.length; i++ ) {
		f = faces[i];
		objF += "f " + ( f.a + 1 ) + " " + ( f.b + 1 ) + " " + ( f.c + 1 ) + "\n";
	}

	return objV + "\n" + objF;
}


/**
 * Export model as STL.
 * @param  {THREE.Mesh} model     The model to export.
 * @param  {String}     modelName A name for the model. (optional)
 * @return {String}               The content for an STL file.
 */
function exportSTL( model, modelName ) {
	var data = "",
	    faces = model.geometry.faces,
	    vertices = model.geometry.vertices;
	var f, fn, x, y, z;

	if( !modelName ) {
		modelName = "";
	}

	// Name: optional, but not the "solid " at the beginning
	data += "solid " + modelName + "\n";

	// Faces, normals, vertices
	for( var i = 0; i < faces.length; i++ ) {
		f = faces[i];
		fn = f.normal;

		x = Utils.floatToScientific( fn.x );
		y = Utils.floatToScientific( fn.y );
		z = Utils.floatToScientific( fn.z );

		data += "  facet normal " + x + " " + y + " " + z + "\n";
		data += "    outer loop\n";

		x = Utils.floatToScientific( vertices[f.a].x );
		y = Utils.floatToScientific( vertices[f.a].y );
		z = Utils.floatToScientific( vertices[f.a].z );

		data += "      vertex " + x + " " + y + " " + z + "\n";

		x = Utils.floatToScientific( vertices[f.b].x );
		y = Utils.floatToScientific( vertices[f.b].y );
		z = Utils.floatToScientific( vertices[f.b].z );

		data += "      vertex " + x + " " + y + " " + z + "\n";

		x = Utils.floatToScientific( vertices[f.c].x );
		y = Utils.floatToScientific( vertices[f.c].y );
		z = Utils.floatToScientific( vertices[f.c].z );

		data += "      vertex " + x + " " + y + " " + z + "\n";
		data += "    endloop\n";
		data += "  endfacet\n";
	}

	data += "endsolid " + modelName + "\n";

	return data;
}
