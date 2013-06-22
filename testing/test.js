"use strict";


function test_setup() {
	GLOBAL.CAMERA.position = new THREE.Vector3( 2, 2, 8 );
	GLOBAL.MODEL = new Object();
	GLOBAL.MODEL.position = new THREE.Vector3( 0, 0, 0 );
}


function test() {
	test_setup();

	var gs = GLOBAL.SCENE;

	var p = new THREE.Vector3(),
	    q = new THREE.Vector3( 1.5, 1.7, 2.5 );

	gs.add( Scene.createPoint( p, 0.04, 0x101010 ) );
	gs.add( Scene.createPoint( q, 0.04, 0x101010 ) );
	gs.add( Scene.createLine( p, q, 1, 0xFFFFFF ) );

	var cross = new THREE.Vector3().crossVectors( new THREE.Vector3( 0, 0, -1 ), q );
	cross.normalize();

	gs.add( Scene.createPoint( cross, 0.04, 0x831DE4 ) );
	gs.add( Scene.createLine( p, cross, 1, 0x831DE4 ) );

	var len = q.length(); // from p to q
	var plane = new Plane( p, cross, q );
	var newQ = plane.getPoint( 1, 2/3 );

	gs.add( Scene.createPoint( newQ, 0.05, 0x707070 ) );
	render();

	var adjust = len / newQ.length();
	newQ = plane.getPoint( adjust, adjust * 2/3 );

	console.log( q.length() );
	console.log( newQ.length() );
	console.log( newQ.distanceTo( q ) );

	gs.add( Scene.createPoint( newQ, 0.05, 0x707070 ) );
	gs.add( Scene.createLine( newQ, p, 1, 0x707070 ) );
	gs.add( Scene.createLine( newQ, q, 1, 0x707070 ) );

	render();
}


function testRule3() {
	test_setup();

	var gs = GLOBAL.SCENE;

	var v = new THREE.Vector3( 1.38, 4.44, 0.01 ),
	    vp = new THREE.Vector3( 1.39, 4.66, -0.00 ),
	    vn = new THREE.Vector3( 1.13, 4.62, 0.02 );

	gs.add( Scene.createPoint( v, 0.04, 0x101010 ) );
	gs.add( Scene.createPoint( vp, 0.04, 0x101010 ) );
	gs.add( Scene.createPoint( vn, 0.04, 0x101010 ) );
	gs.add( Scene.createLine( v, vp, 1, 0xFFFFFF ) );
	gs.add( Scene.createLine( v, vn, 1, 0xFFFFFF ) );

	var angle = HoleFilling.computeAngle( vp, v, vn );
	angle.degree = 360.0 - angle.degree;
	console.log( angle );

	// Move to 0
	var vpClone = vp.clone().sub( v );
	var vnClone = vn.clone().sub( v );

	gs.add( Scene.createPoint( new THREE.Vector3(), 0.04, 0x101010 ) );
	gs.add( Scene.createPoint( vpClone, 0.04, 0x101010 ) );
	gs.add( Scene.createPoint( vnClone, 0.04, 0x101010 ) );
	gs.add( Scene.createLine( new THREE.Vector3(), vpClone, 1, 0xFFFFFF ) );
	gs.add( Scene.createLine( new THREE.Vector3(), vnClone, 1, 0xFFFFFF ) );


	var plane = new Plane( new THREE.Vector3(), vpClone, vnClone );
	var f = ( 360 - angle.degree ) / angle.degree;
	var q1 = plane.getPoint( -f * 0.666, -1 ),
	    q2 = plane.getPoint( -1, -f * 0.666 );
	console.log( f );

	gs.add( Scene.createPoint( q1, 0.04, 0xEC3A7C ) );
	gs.add( Scene.createLine( new THREE.Vector3(), q1, 1, 0xEC3A7C ) );
	gs.add( Scene.createPoint( q2, 0.04, 0xEC3A7C ) );
	gs.add( Scene.createLine( new THREE.Vector3(), q2, 1, 0xEC3A7C ) );
	render();

	var avLen = ( vpClone.length() + vnClone.length() ) / 2.0;

	var adjusted = avLen / q1.length();
	q1 = plane.getPoint( 0.666 * -adjusted, -adjusted );

	var adjusted = avLen / q2.length();
	q2 = plane.getPoint( -adjusted, 0.666 * -adjusted );

	q1.add( v );
	q2.add( v );

	gs.add( Scene.createPoint( q1, 0.04, 0xEC3A7C ) );
	gs.add( Scene.createLine( v, q1, 1, 0xEC3A7C ) );
	gs.add( Scene.createPoint( q2, 0.04, 0xEC3A7C ) );
	gs.add( Scene.createLine( v, q2, 1, 0xEC3A7C ) );
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
