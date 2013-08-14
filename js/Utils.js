"use strict";


/**
 * Class for generic functions, that will be needed here and there.
 * @type {Object}
 */
var Utils = {

	/**
	 * Calculate the angle between two vertices.
	 * Angle is in degree.
	 * @param  {THREE.Vector3} vp   The previous vertex.
	 * @param  {THREE.Vector3} v    The current vertex.
	 * @param  {THREE.Vector3} vn   The next vertex.
	 * @param  {THREE.Vector3} move Move by this vector. (optional)
	 * @return {float}              Angle between the vertices in degree and flag if it has been adjusted to point into the hole.
	 */
	calculateAngle: function( vp, v, vn, move ) {
		var vpClone = vp.clone().sub( v ),
		    vnClone = vn.clone().sub( v ),
		    vClone = v.clone();
		var angle, c;

		if( typeof move == "undefined" ) {
			move = new THREE.Vector3();
		}

		vClone.add( move );

		// Get angle and change radians to degree
		angle = THREE.Math.radToDeg( vpClone.angleTo( vnClone ) );

		// Get the axis described by the cross product of the vectors building the angle
		c = new THREE.Vector3().crossVectors( vpClone, vnClone );
		c.add( v ).add( move );

		// Use "the other side of the angle" if it doesn't point inside the hole
		if( c.length() < vClone.length() ) {
			angle = 360.0 - angle;
		}

		return angle;
	},


	/**
	 * Calculate the average of all angles in a given list of vertices.
	 * @param  {Array<THREE.Vector3>} gv       List of vertices.
	 * @param  {THREE.Vector3}        modelPos Position of model the vertices are a part of.
	 * @return {float}                         The angle average.
	 */
	calculateAngleAverage: function( gv, modelPos ) {
		var angleAverage = 0.0;
		var v, vn, vp;

		for( var i = 0; i < gv.length; i++ ) {
			vp = gv[( i == 0 ) ? ( gv.length - 1 ) : ( i - 1 )];
			v = gv[i];
			vn = gv[( i + 1 ) % gv.length];

			angleAverage += Utils.calculateAngle( vp, v, vn, modelPos );
		}

		angleAverage /= gv.length;

		return angleAverage;
	},


	/**
	 * Calculate standard variance and average of the X, Y and Z
	 * coordinates of the given vectors.
	 * @param  {Array<THREE.Vector3>} vectors The vectors to use.
	 * @return {Object}                       Object of the X, Y and Z variances and averages.
	 */
	calculateVariances: function( vectors ) {
		var x = [],
		    y = [],
		    z = [];
		var averageX = 0,
		    averageY = 0,
		    averageZ = 0;
		var varianceX = 0,
		    varianceY = 0,
		    varianceZ = 0;
		var len = vectors.length;
		var v;

		for( var i = 0; i < len; i++ ) {
			v = vectors[i];
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

		for( var i = 0; i < len; i++ ) {
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
	 * @return {boolean}          True, if lines intersect, false otherwise.
	 */
	checkIntersectionOfLines2D: function( p1, p2, q1, q2 ) {
		var s, t;

		s = ( q2.x - q1.x ) * ( p1.y - q1.y ) - ( q2.y - q1.y ) * ( p1.x - q1.x );
		s /= ( q2.y - q1.y ) * ( p2.x - p1.x ) - ( q2.x - q1.x ) * ( p2.y - p1.y );
		t = ( p2.x - p1.x ) * ( p1.y - q1.y ) - ( p2.y - p1.y ) * ( p1.x - q1.x );
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
	 * @return {boolean}             True, if triangles intersect, false otherwise.
	 */
	checkIntersectionOfTriangles2D: function( a, b, c, fromA, fromB, v ) {
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
	 * @return {boolean}             True, if triangles intersect, false otherwise.
	 */
	checkIntersectionOfTriangles3D: function( a, b, c, p, fromA, fromB ) {
		var planeOfTriangle = new Plane( a, b, c ),
		    test = [fromA],
		    u = b.clone().sub( a ),
		    v = c.clone().sub( a );
		var uDotU = u.dot( u ),
		    uDotV = u.dot( v ),
		    vDotV = v.dot( v );
		var d = uDotV * uDotV - uDotU * vDotV;
		var r, s, t, w, wDotU, wDotV;

		if( fromB ) {
			test.push( fromB );
		}

		for( var i = 0; i < test.length; i++ ) {
			r = planeOfTriangle.getIntersection( test[i], p );

			if( !r ) {
				continue;
			}

			w = r.sub( a );
			wDotV = w.dot( v );
			wDotU = w.dot( u );

			s = uDotV * wDotV - vDotV * wDotU;
			s /= d;

			t = uDotV * wDotU - uDotU * wDotV;
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
	 * @param  {Array<THREE.Face3>} faces    Faces to change.
	 * @param  {int}                i        Current index of face to check.
	 * @param  {int}                cmpIndex Threshold index to compare to.
	 * @return {Array<THREE.Face3>}          Changed faces.
	 */
	decreaseHigherFaceIndexes: function( faces, i, cmpIndex ) {
		var face = faces[i];

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
	 * Convert a 3D vector to a 2D vector by looking at the previously
	 * computed variance of relevant points.
	 * @param  {Object}        variance Variance to consider.
	 * @param  {THREE.Vector3} v        Vector to flatten.
	 * @return {THREE.Vector2}          Flattened vector.
	 */
	flattenByVariance: function( variance, v ) {
		var vFlat;

		if( variance.x < variance.y ) {
			if( variance.x < variance.z ) {
				vFlat = new THREE.Vector2( v.y, v.z );
			}
			else {
				vFlat = new THREE.Vector2( v.x, v.y );
			}
		}
		else {
			if( variance.y < variance.z ) {
				vFlat = new THREE.Vector2( v.x, v.z );
			}
			else {
				vFlat = new THREE.Vector2( v.x, v.y );
			}
		}

		return vFlat;
	},


	/**
	 * Convert the format of a float into a scientific notiation.
	 * @param  {float} value The value to convert.
	 * @return {String}      The scientific notation.
	 */
	floatToScientific: function( value ) {
		var splitted = value.toString( 10 ).split( "." );
		var a = splitted[0],
		    b = splitted[1],
		    exp = 0,
		    expSign = "+",
		    sign = "";

		// Shorten the decimal values a little
		if( b.length > 6 ) {
			b = b.substr( 0, 6 );
		}

		// Negative value
		if( a[0] == "-" ) {
			a = a.substr( 1 );
			sign = "-";
		}

		// Value less than 1
		if( a == "0" ) {
			exp--;

			while( b[0] == "0" ) {
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
			expSign = ""; // negative values bring their own minus sign
		}
		else {
			b = a.substr( 1 ) + b;
			a = a[0];
		}

		return ( sign + a + "." + b + "e" + expSign + exp );
	},


	/**
	 * Get the average length of two vectors.
	 * @param  {THREE.Vector3} vp Vector.
	 * @param  {THREE.Vector3} vn Vector.
	 * @return {float}            Average length.
	 */
	getAverageLength: function( v, w ) {
		return ( v.length() + w.length() ) / 2;
	},


	/**
	 * Get the bounding box for a bunch of geometries.
	 * @param  {Array}  geometries
	 * @return {Object}            Bounding box.
	 */
	getBoundingBox: function( geometries ) {
		var g = geometries[0];
		var bbox = {
			min: new THREE.Vector3( g.x, g.y, g.z ),
			max: new THREE.Vector3( g.x, g.y, g.z )
		};

		for( var i = 1, len = geometries.length; i< len; i++ ) {
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
	 * @param  {THREE.Vector2} p The point to check.
	 * @param  {THREE.Vector2} a Point A describing the triangle.
	 * @param  {THREE.Vector2} b Point B describing the triangle.
	 * @param  {THREE.Vector2} c Point C describing the triangle.
	 * @return {boolean}         True, if point is inside triangle, false otherwise.
	 */
	isPointInTriangle: function( p, a, b, c ) {
	    if( this.isSameSide( p, a, b, c )
	    		&& this.isSameSide( p, b, a, c )
	    		&& this.isSameSide( p, c, a, b ) ) {
	    	return true;
	    }

	    return false;
	},


	/**
	 * Check, if two points lie on the same side of a line (2D).
	 * @param  {THREE.Vector2} p1
	 * @param  {THREE.Vector2} p2
	 * @param  {THREE.Vector2} a
	 * @param  {THREE.Vector2} b
	 * @return {boolean}          True, if on the same side, false otherwise.
	 */
	isSameSide: function( p1, p2, a, b ) {
		var bClone = b.clone().sub( a );
	    var cp1 = new THREE.Vector3().crossVectors( bClone, p1.clone().sub( a ) ),
	        cp2 = new THREE.Vector3().crossVectors( bClone, p2.clone().sub( a ) );

	    return ( cp1.dot( cp2 ) >= 0 );
	},


	/**
	 * Keep a vector close to the plane of its creating vectors.
	 * Calculates the standard variance of the X, Y, and Z coordinates
	 * and adjusts the coordinate of the new vector to the smallest one.
	 * @param  {THREE.Vector3} v    One of the creating vectors.
	 * @param  {THREE.Vector3} vn   One of the creating vectors.
	 * @param  {THREE.Vector3} vNew The newly created vector.
	 * @return {THREE.Vector3}      Adjusted vector.
	 */
	keepNearPlane: function( v, vn, vNew ) {
		var variance = Utils.calculateVariances( [v, vn] );

		if( variance.x < variance.y ) {
			if( variance.x < variance.z ) {
				vNew.x = variance.average.x;
			}
			else {
				vNew.z = variance.average.z;
			}
		}
		else {
			if( variance.y < variance.z ) {
				vNew.y = variance.average.y;
			}
			else {
				vNew.z = variance.average.z;
			}
		}

		return vNew;
	},


	/**
	 * Remove child from its parent.
	 */
	selfRemoveFromDOM: function( e ) {
		e.target.parentNode.removeChild( e.target );
	}

};
