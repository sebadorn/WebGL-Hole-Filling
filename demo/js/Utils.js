'use strict';


/**
 * Class for generic functions, that will be needed here and there.
 * @namespace WebHF.Utils
 */
WebHF.Utils = {


	/**
	 * Calculate the angle between two vertices.
	 * Angle is in degree.
	 * @param  {THREE.Vector3}  vp   - The previous vertex.
	 * @param  {THREE.Vector3}  v    - The current vertex.
	 * @param  {THREE.Vector3}  vn   - The next vertex.
	 * @param  {?THREE.Vector3} move - Move by this vector.
	 * @return {number} Angle between the vertices in degree and flag if it has been adjusted to point into the hole.
	 */
	calculateAngle( vp, v, vn, move ) {
		const vpClone = vp.clone().sub( v );
		const vnClone = vn.clone().sub( v );
		const vClone = v.clone();

		if( typeof move === 'undefined' ) {
			move = new THREE.Vector3();
		}

		vClone.add( move );

		// Get angle and change radians to degree
		let angle = THREE.Math.radToDeg( vpClone.angleTo( vnClone ) );

		// Get the axis described by the cross product of the vectors building the angle
		const c = new THREE.Vector3().crossVectors( vpClone, vnClone ).normalize();
		c.add( v ).add( move );

		// Use "the other side of the angle" if it doesn't point inside the hole
		// TODO: Works most of the time, but not always!
		if( c.length() < vClone.length() ) {
			angle = 360.0 - angle;
		}

		return angle;
	},


	/**
	 * Calculate the average of all angles in a given list of vertices.
	 * @param  {THREE.Vector3[]} gv       - List of vertices.
	 * @param  {THREE.Vector3}   modelPos - Position of model the vertices are a part of.
	 * @return {number} The angle average.
	 */
	calculateAngleAverage( gv, modelPos ) {
		let angleAverage = 0.0;

		for( let i = 0; i < gv.length; i++ ) {
			const vp = gv[( i == 0 ) ? ( gv.length - 1 ) : ( i - 1 )];
			const v = gv[i];
			const vn = gv[( i + 1 ) % gv.length];

			angleAverage += WebHF.Utils.calculateAngle( vp, v, vn, modelPos );
		}

		angleAverage /= gv.length;

		return angleAverage;
	},


	/**
	 * Calculate standard variance and average of the X, Y and Z
	 * coordinates of the given vectors.
	 * @param  {THREE.Vector3[]} vectors - The vectors to use.
	 * @return {object} Object of the X, Y and Z variances and averages.
	 */
	calculateVariances( vectors ) {
		const x = [];
		const y = [];
		const z = [];

		let averageX = 0;
		let averageY = 0;
		let averageZ = 0;

		let varianceX = 0;
		let varianceY = 0;
		let varianceZ = 0;

		const len = vectors.length;

		for( let i = 0; i < len; i++ ) {
			const v = vectors[i];

			x.push( v.x );
			y.push( v.y );
			z.push( v.z );

			averageX += v.x;
			averageY += v.y;
			averageZ += v.z;
		}

		averageX /= len + 1;
		averageY /= len + 1;
		averageZ /= len + 1;

		for( let i = 0; i < len; i++ ) {
			varianceX += Math.pow( x[i] - averageX, 2 );
			varianceY += Math.pow( y[i] - averageY, 2 );
			varianceZ += Math.pow( z[i] - averageZ, 2 );
		}

		varianceX /= len;
		varianceY /= len;
		varianceZ /= len;

		return {
			x: varianceX,
			y: varianceY,
			z: varianceZ,
			average: {
				x: averageX,
				y: averageY,
				z: averageZ
			}
		};
	},


	/**
	 * Check if two lines intersect.
	 * @param  {THREE.Vector2} p1
	 * @param  {THREE.Vector2} p2
	 * @param  {THREE.Vector2} q1
	 * @param  {THREE.Vector2} q2
	 * @return {boolean} True, if lines intersect, false otherwise.
	 */
	checkIntersectionOfLines2D( p1, p2, q1, q2 ) {
		let s = ( q2.x - q1.x ) * ( p1.y - q1.y ) - ( q2.y - q1.y ) * ( p1.x - q1.x );
		s /= ( q2.y - q1.y ) * ( p2.x - p1.x ) - ( q2.x - q1.x ) * ( p2.y - p1.y );

		let t = ( p2.x - p1.x ) * ( p1.y - q1.y ) - ( p2.y - p1.y ) * ( p1.x - q1.x );
		t /= ( q2.y - q1.y ) * ( p2.x - p1.x ) - ( q2.x - q1.x ) * ( p2.y - p1.y );

		return ( s > 0 && s < 1 && t > 0 && t < 1 );
	},


	/**
	 * Check if lines of two triangles intersect.
	 * @param  {THREE.Vector2} a
	 * @param  {THREE.Vector2} b
	 * @param  {THREE.Vector2} c
	 * @param  {THREE.Vector2} fromA
	 * @param  {THREE.Vector2} fromB
	 * @param  {THREE.Vector2} v
	 * @return {boolean} True, if triangles intersect, false otherwise.
	 */
	checkIntersectionOfTriangles2D( a, b, c, fromA, fromB, v ) {
		if( this.checkIntersectionOfLines2D( a, b, fromA, v ) ) {
			return true;
		}

		if( this.checkIntersectionOfLines2D( a, b, fromB, v ) ) {
			return true;
		}

		if( this.checkIntersectionOfLines2D( b, c, fromA, v ) ) {
			return true;
		}

		if( this.checkIntersectionOfLines2D( b, c, fromB, v ) ) {
			return true;
		}

		if( this.checkIntersectionOfLines2D( c, a, fromA, v ) ) {
			return true;
		}

		if( this.checkIntersectionOfLines2D( c, a, fromB, v ) ) {
			return true;
		}

		return false;
	},


	/**
	 * Check if lines of one triangle intersects with surface of another.
	 * Source: http://geomalgorithms.com/a06-_intersect-2.html
	 * @param  {THREE.Vector3} a
	 * @param  {THREE.Vector3} b
	 * @param  {THREE.Vector3} c
	 * @param  {THREE.Vector3} p
	 * @param  {THREE.Vector3} fromA
	 * @param  {THREE.Vector3} fromB
	 * @return {boolean} True, if triangles intersect, false otherwise.
	 */
	checkIntersectionOfTriangles3D( a, b, c, p, fromA, fromB ) {
		const planeOfTriangle = new WebHF.Plane( a, b, c );
		const test = [fromA];

		const u = b.clone().sub( a );
		const v = c.clone().sub( a );

		const uDotU = u.dot( u );
		const uDotV = u.dot( v );
		const vDotV = v.dot( v );

		const d = uDotV * uDotV - uDotU * vDotV;

		if( fromB ) {
			test.push( fromB );
		}

		for( let i = 0; i < test.length; i++ ) {
			const r = planeOfTriangle.getIntersection( test[i], p );

			if( !r ) {
				continue;
			}

			const w = r.clone().sub( a );
			const wDotV = w.dot( v );
			const wDotU = w.dot( u );

			let s = uDotV * wDotV - vDotV * wDotU;
			s /= d;

			let t = uDotV * wDotU - uDotU * wDotV;
			t /= d;

			// Intersection of line with triangle found
			if( s >= 0 && s <= 1 && t >= 0 && t <= 1 && s + t <= 1 ) {
				return true;
			}
		}

		return false;
	},


	/**
	 * Decrease the face index of vertices that have a higher index than a given one.
	 * Afterwards check the face and if faulty, remove it.
	 * @param  {THREE.Face3[]} faces    - Faces to change.
	 * @param  {number}        i        - Current index of face to check.
	 * @param  {number}        cmpIndex - Threshold index to compare to.
	 * @return {THREE.Face3[]} Changed faces.
	 */
	decreaseHigherFaceIndexes( faces, i, cmpIndex ) {
		const face = faces[i];

		if( face.a > cmpIndex ) {
			face.a--;
		}

		if( face.b > cmpIndex ) {
			face.b--;
		}

		if( face.c > cmpIndex ) {
			face.c--;
		}

		// Triangle disappeared through merge
		if( face.a == face.b || face.a == face.c || face.b == face.c ) {
			faces.splice( i, 1 );
		}

		return faces;
	},


	/**
	 * Convert the format of a float into a scientific notiation.
	 * @param  {number} value - The value to convert.
	 * @return {string} The scientific notation.
	 */
	floatToScientific( value ) {
		const splitted = value.toString( 10 ).split( '.' );

		let a = splitted[0];
		let b = splitted[1];
		let exp = 0;
		let expSign = '+';
		let sign = '';

		// Shorten the decimal values a little
		if( !b ) {
			b = '';
		}
		else if( b.length > 6 ) {
			b = b.substr( 0, 6 );
		}

		// Negative value
		if( a[0] === '-' ) {
			a = a.substr( 1 );
			sign = '-';
		}

		// Value less than 1
		if( a == '0' ) {
			exp--;

			while( b.length > 0 && b[0] == '0' ) {
				exp--;
				b = b.substr( 1 );
			}
		}
		// Value equal to or more than 1
		else {
			exp = a.length - 1;
		}

		// Move decimal point
		if( exp < 0 ) {
			a = b[0];
			b = b.substr( 1 );
			expSign = ''; // negative values bring their own minus sign
		}
		else {
			b = a.substr( 1 ) + b;
			a = a[0];
		}

		if( b == '' ) {
			b = '0';
		}

		return ( sign + a + '.' + b + 'e' + expSign + exp );
	},


	/**
	 * Get the average length of a list of vectors.
	 * @param  {THREE.Vector3[]} vectors - Array of vectors.
	 * @return {number} Average length.
	 */
	getAverageLength( vectors ) {
		let length = 0.0;

		for( let i = 0; i < vectors.length; i++ ) {
			length += vectors[i].length();
		}

		return ( length / vectors.length );
	},


	/**
	 * Get the bounding box for a bunch of geometries.
	 * @param  {object[]} geometries
	 * @return {object} Bounding box.
	 */
	getBoundingBox( geometries ) {
		let g = geometries[0];

		const bbox = {
			min: new THREE.Vector3( g.x, g.y, g.z ),
			max: new THREE.Vector3( g.x, g.y, g.z )
		};

		for( let i = 1, len = geometries.length; i< len; i++ ) {
			g = geometries[i];

			bbox.min.x = ( g.x < bbox.min.x ) ? g.x : bbox.min.x;
			bbox.min.y = ( g.y < bbox.min.y ) ? g.y : bbox.min.y;
			bbox.min.z = ( g.z < bbox.min.z ) ? g.z : bbox.min.z;

			bbox.max.x = ( g.x > bbox.max.x ) ? g.x : bbox.max.x;
			bbox.max.y = ( g.y > bbox.max.y ) ? g.y : bbox.max.y;
			bbox.max.z = ( g.z > bbox.max.z ) ? g.z : bbox.max.z;
		}

		bbox.center = new THREE.Vector3(
			( bbox.min.x + bbox.max.x ) / 2,
			( bbox.min.y + bbox.max.y ) / 2,
			( bbox.min.z + bbox.max.z ) / 2
		);

		return bbox;
	},


	/**
	 * Checks if a point lies in a triangle (2D).
	 * @param  {THREE.Vector2} p - The point to check.
	 * @param  {THREE.Vector2} a - Point A describing the triangle.
	 * @param  {THREE.Vector2} b - Point B describing the triangle.
	 * @param  {THREE.Vector2} c - Point C describing the triangle.
	 * @return {boolean} True, if point is inside triangle, false otherwise.
	 */
	isPointInTriangle( p, a, b, c ) {
	    return (
	    	this.isSameSide( p, a, b, c ) &&
	    	this.isSameSide( p, b, a, c ) &&
	    	this.isSameSide( p, c, a, b )
	    );
	},


	/**
	 * Check, if two points lie on the same side of a line (2D).
	 * @param  {THREE.Vector2} p1
	 * @param  {THREE.Vector2} p2
	 * @param  {THREE.Vector2} a
	 * @param  {THREE.Vector2} b
	 * @return {boolean} True, if on the same side, false otherwise.
	 */
	isSameSide( p1, p2, a, b ) {
		const bClone = b.clone().sub( a );
	    const cp1 = new THREE.Vector3().crossVectors( bClone, p1.clone().sub( a ) );
	    const cp2 = new THREE.Vector3().crossVectors( bClone, p2.clone().sub( a ) );

	    return ( cp1.dot( cp2 ) >= 0 );
	},


	/**
	 * Keep a vector close to the plane of its creating vectors.
	 * Calculates the standard variance of the X, Y, and Z coordinates
	 * and adjusts the coordinate of the new vector to the smallest one.
	 * @param  {THREE.Vector3} v    - One of the creating vectors.
	 * @param  {THREE.Vector3} vn   - One of the creating vectors.
	 * @param  {THREE.Vector3} vNew - The newly created vector.
	 * @return {THREE.Vector3} Adjusted vector.
	 */
	keepNearPlane( vNew, vectors, mergeThreshold) {
		const newV = vNew.clone();
		const variance = WebHF.Utils.calculateVariances( vectors );

		if( variance.x < variance.y ) {
			if( variance.x < variance.z ) {
				if( variance.x < mergeThreshold ) {
					newV.x = variance.average.x;
				}
			}
			else {
				if( variance.z < mergeThreshold ) {
					newV.z = variance.average.z;
				}
			}
		}
		else {
			if( variance.y < variance.z ) {
				if( variance.y < mergeThreshold ) {
					newV.y = variance.average.y;
				}
			}
			else {
				if( variance.z < mergeThreshold ) {
					newV.z = variance.average.z;
				}
			}
		}

		return newV;
	},


	/**
	 * Remove child from its parent.
	 * @param {Event} ev
	 */
	selfRemoveFromDOM( ev ) {
		ev.target.parentNode.removeChild( ev.target );
	}


};
