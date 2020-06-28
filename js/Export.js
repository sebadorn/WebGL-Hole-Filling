'use strict';


/**
 * @namespace WebHF.Export
 */
WebHF.Export = {


	/**
	 * Export model as OBJ.
	 * (Vertices and faces only.)
	 * @param  {THREE.Mesh} model - The model to export.
	 * @return {string} The content for an OBJ file.
	 */
	saveOBJ( model ) {
		const mgFaces = model.geometry.faces;
		const mgVertices = model.geometry.vertices;

		let objF = '';
		let objV = '';

		// Vertices
		for( let i = 0, len = mgVertices.length; i < len; i++ ) {
			const v = mgVertices[i];
			objV += `v ${ v.x } ${ v.y } ${ v.z }\n`;
		}

		// Faces
		for( let i = 0, len = mgFaces.length; i < len; i++ ) {
			const f = mgFaces[i];
			objF += `f ${ f.a + 1 } ${ f.b + 1 } ${ f.c + 1 }\n`;
		}

		return objV + '\n' + objF;
	},


	/**
	 * Export model as STL.
	 * @param  {THREE.Mesh} model     - The model to export.
	 * @param  {string}     modelName - A name for the model. (optional)
	 * @return {string} The content for an STL file.
	 */
	saveSTL( model, modelName ) {
		const mgFaces = model.geometry.faces;
		const mgVertices = model.geometry.vertices;

		let data = '';

		if( !modelName ) {
			modelName = '';
		}

		// Name: optional, but not the "solid " at the beginning
		data += 'solid ' + modelName.replace( ' ', '_' ) + '\n';

		// Faces, normals, vertices
		for( let i = 0, len = mgFaces.length; i < len; i++ ) {
			const f = mgFaces[i];
			const fn = f.normal;

			let x = WebHF.Utils.floatToScientific( fn.x );
			let y = WebHF.Utils.floatToScientific( fn.y );
			let z = WebHF.Utils.floatToScientific( fn.z );

			data += `  facet normal ${ x } ${ y } ${ z }\n`;
			data += '    outer loop\n';

			x = WebHF.Utils.floatToScientific( mgVertices[f.a].x );
			y = WebHF.Utils.floatToScientific( mgVertices[f.a].y );
			z = WebHF.Utils.floatToScientific( mgVertices[f.a].z );

			data += `      vertex ${ x } ${ y } ${ z }\n`;

			x = WebHF.Utils.floatToScientific( mgVertices[f.b].x );
			y = WebHF.Utils.floatToScientific( mgVertices[f.b].y );
			z = WebHF.Utils.floatToScientific( mgVertices[f.b].z );

			data += `      vertex ${ x } ${ y } ${ z }\n`;

			x = WebHF.Utils.floatToScientific( mgVertices[f.c].x );
			y = WebHF.Utils.floatToScientific( mgVertices[f.c].y );
			z = WebHF.Utils.floatToScientific( mgVertices[f.c].z );

			data += `      vertex ${ x } ${ y } ${ z }\n`;
			data += '    endloop\n';
			data += '  endfacet\n';
		}

		data += 'endsolid ' + modelName + '\n';

		return data;
	}


};
