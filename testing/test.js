"use strict";


function test_setup() {
	GLOBAL.CAMERA.position = new THREE.Vector3( 2, 2, 8 );
	GLOBAL.MODEL = new Object();
	GLOBAL.MODEL.position = new THREE.Vector3( 0, 0, 0 );
}


function test() {
	test_setup();

	var gs = GLOBAL.SCENE;

	var a = new THREE.Vector3( 1, 1, 0 ),
	    b = new THREE.Vector3( 1.5, 2, 0 ),
	    c = new THREE.Vector3( 2, 1, 0 ),
	    p = new THREE.Vector3( 1.5, 1.6, 0 );

	gs.add( Scene.createPoint( a, 0.04, 0x101010 ) );
	gs.add( Scene.createPoint( b, 0.04, 0x101010 ) );
	gs.add( Scene.createPoint( c, 0.04, 0x101010 ) );
	gs.add( Scene.createPoint( p, 0.04, 0xd00000 ) );

	gs.add( Scene.createLine( a, b, 1, 0x101010 ) );
	gs.add( Scene.createLine( b, c, 1, 0x101010 ) );
	gs.add( Scene.createLine( c, a, 1, 0x101010 ) );

	var cross1 = new THREE.Vector3().crossVectors( b.clone().sub( a ), p.clone().sub( a ) ),
	    cross2 = new THREE.Vector3().crossVectors( b.clone().sub( a ), c.clone().sub( a ) );

	console.log( cross1.dot( cross2 ) );

	cross1.add( a );
	cross2.add( a );

	gs.add( Scene.createPoint( cross1, 0.04, 0xd06060 ) );
	gs.add( Scene.createPoint( cross2, 0.04, 0x0000d0 ) );

	render();
}


function testRule3() {
	test_setup();

	var o = new THREE.Vector3(),
	    m = new THREE.Vector3( 1.7, 2.3, 0.2 ),
	    p = new THREE.Vector3( -2, 0, 0 ).add( m ),
	    q = new THREE.Vector3( 3, 1, 1 ).add( m );

	gs.add( Scene.createPoint( m, 0.04, 0x101010 ) );
	gs.add( Scene.createPoint( p, 0.04, 0x101010 ) );
	gs.add( Scene.createPoint( q, 0.04, 0x101010 ) );
	gs.add( Scene.createLine( m, p, 2, 0xFFFFFF ) );
	gs.add( Scene.createLine( m, q, 2, 0xFFFFFF ) );

	console.log( HoleFilling.computeAngle( p, m, q ) );

	var halfWay = p.clone().sub( m ).divideScalar( 2 );

	var cross = new THREE.Vector3().crossVectors( p.clone().sub( m ), q.clone().sub( m ) );
	cross.normalize();
	cross.add( halfWay );
	cross.add( m );

	gs.add( Scene.createPoint( cross, 0.05, 0x44AAEE ) );
	gs.add( Scene.createLine( halfWay.clone().add( m ), cross, 1, 0x44AAEE ) );

	var cross2 = new THREE.Vector3().crossVectors( cross.clone().sub( m ).sub( halfWay ), p.clone().sub( m ).sub( halfWay ) );
	cross2.normalize();
	cross2.add( m ).add( halfWay );

	gs.add( Scene.createPoint( cross2, 0.05, 0x00AA00 ) );
	gs.add( Scene.createLine( m.clone().add( halfWay ), cross2, 1, 0x00AA00 ) );

	var plane = new Plane( new THREE.Vector3(), p.clone().sub( m ).sub( halfWay ), cross2.clone().sub( m ).sub( halfWay ) );
	var vNew = plane.getPoint( 0, p.clone().sub( m ).length() );
	vNew.add( m ).add( halfWay );

	gs.add( Scene.createPoint( vNew, 0.06, 0xB06000 ) );
	gs.add( Scene.createLine( vNew, halfWay.clone().add( m ), 1, 0xB06000 ) );

	render();
}


function testRule2() {
	test_setup();

	var gs = GLOBAL.SCENE;

	var v = new THREE.Vector3( 2, 1, -3 ),
	    vp = new THREE.Vector3( 2.4, 1, 0 ).add( v ),
	    vn = new THREE.Vector3( 0, 1, 2.4 ).add( v );

	gs.add( Scene.createPoint( v, 0.08, 0x101010 ) );
	gs.add( Scene.createPoint( vp, 0.08, 0x101010 ) );
	gs.add( Scene.createPoint( vn, 0.08, 0x101010 ) );
	gs.add( Scene.createLine( v, vp, 1, 0xFFFFFF ) );
	gs.add( Scene.createLine( v, vn, 1, 0xFFFFFF ) );

	var angle = HoleFilling.computeAngle( vp, v, vn );
	console.log( "angle: " + angle + "°" );


	// Move to 0
	var vpClone = vp.clone().sub( v );
	var vnClone = vn.clone().sub( v );

	gs.add( Scene.createPoint( new THREE.Vector3(), 0.08, 0x101010 ) );
	gs.add( Scene.createPoint( vpClone, 0.08, 0x101010 ) );
	gs.add( Scene.createPoint( vnClone, 0.08, 0x101010 ) );
	gs.add( Scene.createLine( new THREE.Vector3(), vpClone, 1, 0xFFFFFF ) );
	gs.add( Scene.createLine( new THREE.Vector3(), vnClone, 1, 0xFFFFFF ) );


	// Get point at half the angle between vp and vn
	var plane = new Plane( new THREE.Vector3(), vpClone, vnClone );
	var q = plane.getPoint( 1, 1 );
	console.log( q );

	gs.add( Scene.createPoint( q, 0.04, 0xEC3A7C ) );
	gs.add( Scene.createLine( new THREE.Vector3(), q, 1, 0xEC3A7C ) );
	render();

	var avLen = ( vpClone.length() + vnClone.length() ) / 2.0;
	console.log( "average length: " + avLen );
	console.log( "length: " + q.length() );
	console.log( "correctional factor: " + avLen / q.length() );

	q = plane.getPoint( avLen / q.length(), avLen / q.length() );
	q.add( v );
	console.log( "adjusted length: " + q.length() );

	gs.add( Scene.createPoint( q, 0.04, 0x831DE4 ) );
	gs.add( Scene.createLine( v, q, 1, 0x831DE4 ) );
	render();
}



function variance() {
	if( this.LAST_ITERATION ) {
		var x = [vp.x, v.x, vn.x];
		var y = [vp.y, v.y, vn.y];
		var z = [vp.z, v.z, vn.z];

		var averageX = ( vp.x + v.x + vn.x ) / 3;
		var averageY = ( vp.y + v.y + vn.y ) / 3;
		var averageZ = ( vp.z + v.z + vn.z ) / 3;

		var varianceX = 0, varianceY = 0, varianceZ = 0;

		for( var i = 0; i < 3; i++ ) {
			varianceX += Math.pow( x[i] - averageX, 2 );
			varianceY += Math.pow( y[i] - averageY, 2 );
			varianceZ += Math.pow( z[i] - averageZ, 2 );
		}

		varianceX /= 2;
		varianceY /= 2;
		varianceZ /= 2;

		if( varianceX < varianceY ) {
			if( varianceX < varianceZ ) {
				vNew1.x = averageX;
			}
			else {
				vNew1.z = averageZ;
			}
		}
		else {
			if( varianceY < varianceZ ) {
				vNew1.y = averageY;
			}
			else {
				vNew1.z = averageZ;
			}
		}
	}
}