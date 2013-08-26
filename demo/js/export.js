"use strict";


/**
 * Export model as OBJ.
 * (Vertices and faces only.)
 * @param  {THREE.Mesh} model The model to export.
 * @return {String}           The content for an OBJ file.
 */
function exportOBJ( model ) {
	var mgFaces = model.geometry.faces,
	    mgVertices = model.geometry.vertices,
	    objF = "",
	    objV = "";
	var f, v;

	// Vertices
	for( var i = 0, len = mgVertices.length; i < len; i++ ) {
		v = mgVertices[i];
		objV += "v " + v.x + " " + v.y + " " + v.z + "\n";
	}

	// Faces
	for( var i = 0, len = mgFaces.length; i < len; i++ ) {
		f = mgFaces[i];
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
	    mgFaces = model.geometry.faces,
	    mgVertices = model.geometry.vertices;
	var f, fn, x, y, z;

	if( !modelName ) {
		modelName = "";
	}

	// Name: optional, but not the "solid " at the beginning
	data += "solid " + modelName.replace( " ", "_" ) + "\n";

	// Faces, normals, vertices
	for( var i = 0, len = mgFaces.length; i < len; i++ ) {
		f = mgFaces[i];
		fn = f.normal;

		x = Utils.floatToScientific( fn.x );
		y = Utils.floatToScientific( fn.y );
		z = Utils.floatToScientific( fn.z );

		data += "  facet normal " + x + " " + y + " " + z + "\n";
		data += "    outer loop\n";

		x = Utils.floatToScientific( mgVertices[f.a].x );
		y = Utils.floatToScientific( mgVertices[f.a].y );
		z = Utils.floatToScientific( mgVertices[f.a].z );

		data += "      vertex " + x + " " + y + " " + z + "\n";

		x = Utils.floatToScientific( mgVertices[f.b].x );
		y = Utils.floatToScientific( mgVertices[f.b].y );
		z = Utils.floatToScientific( mgVertices[f.b].z );

		data += "      vertex " + x + " " + y + " " + z + "\n";

		x = Utils.floatToScientific( mgVertices[f.c].x );
		y = Utils.floatToScientific( mgVertices[f.c].y );
		z = Utils.floatToScientific( mgVertices[f.c].z );

		data += "      vertex " + x + " " + y + " " + z + "\n";
		data += "    endloop\n";
		data += "  endfacet\n";
	}

	data += "endsolid " + modelName + "\n";

	return data;
}
