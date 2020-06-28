'use strict';


const WebHF = {};
let MODEL_F = null;
let MODEL_V = null;


function checkForCollision( data ) {
	const dt = JSON.parse( data.test );
	const faces = JSON.parse( data.faces );
	const v = new THREE.Vector3( dt.v.x, dt.v.y, dt.v.z );

	let fromA = new THREE.Vector3( dt.fromA.x, dt.fromA.y, dt.fromA.z );
	let fromB = dt.fromB;

	if( fromB ) {
		fromB = new THREE.Vector3( dt.fromB.x, dt.fromB.y, dt.fromB.z );
	}

	if( data.type === 'filling' ) {
		for( let i = 0, len = faces.length; i < len; i++ ) {
			const f = faces[i];
			const a = new THREE.Vector3( f[0].x, f[0].y, f[0].z );
			const b = new THREE.Vector3( f[1].x, f[1].y, f[1].z );
			const c = new THREE.Vector3( f[2].x, f[2].y, f[2].z );

			if( a.equals( v ) || b.equals( v ) || c.equals( v ) ) {
				continue;
			}

			if( a.equals( fromA ) || b.equals( fromA ) || c.equals( fromA ) ) {
				continue;
			}

			if( fromB ) {
				if( a.equals( fromB ) || b.equals( fromB ) || c.equals( fromB ) ) {
					continue;
				}
			}

			if( WebHF.Utils.checkIntersectionOfTriangles3D( a, b, c, v, fromA, fromB ) ) {
				return true;
			}
		}
	}
	else if( data.type == 'model' ) {
		for( let i = 0, len = faces.length; i < len; i++ ) {
			const f = faces[i];
			const v0 = MODEL_V[f[0]];
			const v1 = MODEL_V[f[1]];
			const v2 = MODEL_V[f[2]];
			const a = new THREE.Vector3( v0.x, v0.y, v0.z );
			const b = new THREE.Vector3( v1.x, v1.y, v1.z );
			const c = new THREE.Vector3( v2.x, v2.y, v2.z );

			if( a.equals( v ) || b.equals( v ) || c.equals( v ) ) {
				continue;
			}

			if( a.equals( fromA ) || b.equals( fromA ) || c.equals( fromA ) ) {
				continue;
			}

			if( fromB ) {
				if( a.equals( fromB ) || b.equals( fromB ) || c.equals( fromB ) ) {
					continue;
				}
			}

			if( WebHF.Utils.checkIntersectionOfTriangles3D( a, b, c, v, fromA, fromB ) ) {
				return true;
			}
		}
	}

	return false;
}


function handleMessages( ev ) {
	switch( ev.data.cmd ) {
		case 'url':
			const url = ev.data.url + 'js/';

			importScripts(
				url + 'threeJS/three.min.js',
				url + 'Plane.js',
				url + 'Utils.js'
			);
			break;

		case 'prepare':
			MODEL_F = JSON.parse( ev.data.modelF );
			MODEL_V = JSON.parse( ev.data.modelV );
			break;

		case 'check':
			self.postMessage( {
				type: 'check',
				intersects: checkForCollision( ev.data )
			} );
			break;

		case 'close':
			self.close();
			break;
	}
}


self.addEventListener( 'message', handleMessages );
