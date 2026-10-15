// Theme 6: Cosmos — celestial bodies and the structure of the universe.
import * as THREE from 'three/webgpu';
import { vec3, sin, cos, mix, fract, step, smoothstep, max, pow, mod, abs, color, mx_noise_float, mx_fractal_noise_float } from 'three/tsl';
import { defineScene, gradient, TAU, rand } from '../../lib/defineScene.js';
import { gauss } from '../../lib/points.js';
import { curl } from '../../tsl/curl.js';

// 1 when v == k (integer kind flags stored as floats).
const is = ( v, k ) => step( k - 0.5, v ).mul( step( v, k + 0.5 ) );
const unit = () => new THREE.Vector3().randomDirection();

const spiralGalaxy = defineScene( {
	meta: {
		title: { ko: '나선 은하', en: 'Spiral Galaxy' },
		ref: { ko: '안쪽은 빠르게, 바깥은 느리게 도는 별들이 강체처럼 도는 밀도파를 지날 때 나선팔이 밝아진다', en: 'Stars orbit fast inside and slow outside; arms glow where they cross a rigidly turning density wave' }
	},
	camera: [ 0, 2.8, 4.4 ],
	count: 180_000,
	init() {

		if ( Math.random() < 0.15 ) {

			const r = Math.abs( gauss() ) * 0.3;
			return [ r, gauss() * 0.18 * Math.exp( - r * 3 ), rand( 0, TAU ), 0, Math.random(), Math.log( r + 1e-3 ) ];

		}

		const r = Math.min( 0.2 + - Math.log( 1 - Math.random() ) * 0.65, 2.8 );
		return [ r, gauss() * 0.035, rand( 0, TAU ), 1, Math.random(), Math.log( r ) ];

	},
	position: ( { a, t } ) => {

		const theta = a.z.add( t.mul( 0.22 ).div( a.x.add( 0.15 ) ) );
		return vec3( a.x.mul( cos( theta ) ), a.y, a.x.mul( sin( theta ) ) );

	},
	color: ( { a, b, t } ) => {

		const theta = a.z.add( t.mul( 0.22 ).div( a.x.add( 0.15 ) ) );
		// Two-armed logarithmic density wave, pattern speed 0.05 rad/s (slower than the stars).
		// Arm angle falls with radius (theta = c - 3.2 ln r): the outer arm lags the rotation, i.e. trailing spirals.
		const phi = theta.add( b.z.mul( 3.2 ) ).sub( t.mul( 0.05 ) );
		const arm = pow( max( cos( phi.mul( 2 ) ), 0 ), 6 );
		const disk = mix( color( 0x5a4436 ), color( 0x9fd0ff ), arm ).mul( arm.mul( 1.3 ).add( 0.22 ) )
			.add( color( 0xff5fa8 ).mul( arm.mul( arm ) ).mul( step( 0.93, b.y ) ).mul( 2 ) );
		return mix( color( 0xffcf8a ).mul( 0.9 ), disk, b.x );

	},
	alpha: 0.35,
	size: 0.011
} );

const blackHole = defineScene( {
	meta: {
		title: { ko: '블랙홀', en: 'Black Hole' },
		ref: { ko: '구형 사건의 지평선이 드리운 그림자와 광자 고리, 케플러 속도로 도는 강착 원반, 중력 렌즈로 휘어 그림자를 감싸는 원반 뒷면의 상', en: 'The spherical horizon casts a shadow ringed by photons; the Keplerian disk\'s far side is lensed up and around it' }
	},
	camera: [ 0, 0.35, 6.5 ],
	count: 170_000,
	init( i, n ) {

		const theta = rand( 0, TAU );
		if ( i < n * 0.06 ) return [ 1.06 + gauss() * 0.008, 0, theta, 2, 0 ]; // photon ring
		const r = 1.25 * Math.pow( 3.2 / 1.25, Math.random() );
		const omega = 0.9 * Math.pow( r, - 1.5 );
		// Lensed image of the far side: mostly bent over the top, a thinner secondary image below.
		if ( i < n * 0.3 ) return [ 1.15 + ( r - 1.25 ) * 0.55, 0, theta, 1, omega, r, Math.random() < 0.75 ? 1 : - 1 ];
		return [ r, gauss() * 0.012 * r, theta, 0, omega, r ];

	},
	position: ( { a, b, t } ) => {

		const theta = a.z.add( t.mul( b.y ) );
		const disk = vec3( a.x.mul( cos( theta ) ), a.y, a.x.mul( sin( theta ) ) );
		// The image keeps the disk's lateral position x = r cos(theta), so it drifts the same way as the far side.
		const plane = vec3( a.x.mul( cos( theta ) ), a.x.mul( abs( sin( theta ) ) ).mul( b.w ), - 0.3 );
		// Photon ring: light orbiting at 1.5 r_s escapes along the shadow edge, seen as a circle facing the viewer.
		const ring = vec3( a.x.mul( cos( theta ) ), a.x.mul( sin( theta ) ), 0 );
		return mix( mix( disk, plane, step( 0.5, b.x ) ), ring, is( b.x, 2 ) );

	},
	color: ( { a, b, t } ) => {

		const theta = a.z.add( t.mul( b.y ) );
		const T = smoothstep( 3.2, 1.2, mix( b.z, a.x, is( b.x, 2 ) ) );
		const beam = cos( theta ).mul( 0.6 ).add( 1 ); // Doppler: approaching side brighter
		// Only material behind the hole (z = r sin(theta) < 0) is lensed; it fades out as it comes round to the front.
		const farSide = smoothstep( - 0.15, 0.25, sin( theta ) ).oneMinus().mul( step( 0, b.w ).mul( 0.55 ).add( 0.45 ) );
		const hot = gradient( T, [ 0x5a0f00, 0xff5a12, 0xffc27a, 0xfff6e8 ] ).mul( beam ).mul( mix( 1, farSide, is( b.x, 1 ) ) );
		return mix( hot, color( 0xfff2d0 ).mul( 1.8 ), is( b.x, 2 ) );

	},
	// The event horizon is a sphere (r_s); its shadow (radius ~2.6 r_s, edged by the photon ring at 1.06)
	// hides everything behind it. An opaque black sphere writes depth so points behind it are occluded.
	extras( { scene } ) {

		scene.add( new THREE.Mesh( new THREE.SphereGeometry( 1.0, 64, 32 ), new THREE.MeshBasicNodeMaterial( { color: 0x000000 } ) ) );

	},
	alpha: 0.35,
	size: 0.011
} );

// Pillars of gas rising from a cloud bank, plus embedded young stars.
const PILLARS = [ [ - 1.3, 0.6 ], [ 0.1, 1.5 ], [ 1.4, 0.3 ] ];
function nebulaDensity( x, y, z ) {

	let d = 0.3 * Math.exp( - ( ( y + 1.6 ) ** 2 ) / 0.4 - z * z / 1.2 );
	for ( const [ px, top ] of PILLARS ) {

		if ( y > top ) continue;
		const r = 0.15 + 0.3 * ( top - y ) / ( top + 2 );
		const cx = px + ( y + 2 ) * 0.08;
		d = Math.max( d, Math.exp( - ( ( x - cx ) ** 2 + z * z ) / ( r * r ) ) );

	}

	return d;

}

const nebula = defineScene( {
	meta: {
		title: { ko: '성운', en: 'Nebula' },
		ref: { ko: '별이 태어나는 가스 기둥과 그 안에서 반짝이는 갓 태어난 별', en: 'Pillars of star-forming gas with newborn stars glittering inside' }
	},
	camera: [ 0, 0, 5.2 ],
	count: 160_000,
	init( i, n ) {

		if ( i < n * 0.03 ) return [ rand( - 3, 3 ), rand( - 2, 1.6 ), rand( - 0.6, 0.6 ), 1 ];
		for ( ;; ) {

			const x = rand( - 3, 3 ), y = rand( - 2.2, 1.8 ), z = rand( - 1, 1 );
			if ( Math.random() < nebulaDensity( x, y, z ) ) return [ x, y, z, 0 ];

		}

	},
	position: ( { a, t } ) => a.add( curl( a.mul( 0.4 ).add( t.mul( 0.02 ) ) ).mul( 0.05 ) ),
	color: ( { a, b, t, h } ) => {

		const n = mx_fractal_noise_float( a.mul( 0.9 ).add( vec3( 0, 0, t.mul( 0.03 ) ) ), 4 ).mul( 0.5 ).add( 0.5 );
		const gas = gradient( n, [ 0x0b2a3a, 0x1f8a8a, 0xd9a441, 0xff6a3d ] ).mul( n.mul( 0.7 ).add( 0.25 ) );
		const twinkle = sin( t.mul( 3 ).add( h.mul( 40 ) ) ).mul( 0.4 ).add( 1.2 );
		return mix( gas, color( 0xcfe6ff ).mul( twinkle ), b.x );

	},
	alpha: 0.3,
	size: 0.012
} );

// Coronal loops: arcs between nearby footpoints; points are seeded in runs of 1800 so each arc stays coherent.
const SUN_R = 1.3, LOOP_POINTS = 1800;
let loopSeed = null;

const solarCorona = defineScene( {
	meta: {
		title: { ko: '태양 코로나', en: 'Solar Corona' },
		ref: { ko: '쌀알 무늬로 끓는 태양 표면에서 자기 고리를 따라 플라스마가 오르내리고 플레어가 번쩍인다', en: 'Plasma runs along magnetic loops above a granulated solar surface, flaring now and then' }
	},
	camera: [ 0, 0, 5.4 ],
	count: 180_000,
	init( i, n ) {

		if ( i < n * 0.6 ) {

			const d = unit().multiplyScalar( SUN_R );
			return [ d.x, d.y, d.z, 0, 0, 0, 0 ];

		}

		if ( ! loopSeed || i % LOOP_POINTS === 0 ) loopSeed = { p: unit(), q: unit(), span: rand( 0.12, 0.35 ), lift: rand( 0.8, 1.6 ), phase: Math.random() };
		const { p, q, span, lift, phase } = loopSeed;
		const tangent = new THREE.Vector3().crossVectors( p, q ).normalize();
		const s = Math.random();
		const dir = p.clone().applyAxisAngle( tangent, ( s - 0.5 ) * span );
		const r = SUN_R * ( 1 + span * lift * Math.sin( Math.PI * s ) );
		const j = 0.01;
		return [ dir.x * r + gauss() * j, dir.y * r + gauss() * j, dir.z * r + gauss() * j, s, phase, 0, 1 ];

	},
	position: ( { a } ) => a,
	color: ( { a, b, t } ) => {

		const g = mx_noise_float( a.mul( 7 ).add( t.mul( 0.15 ) ) ).mul( 0.5 ).add( 0.5 );
		const spot = smoothstep( 0.45, 0.6, mx_noise_float( a.mul( 1.3 ) ) );
		const surface = gradient( g, [ 0x7a1e00, 0xff7a1a, 0xffd36b ] ).mul( spot.mul( - 0.8 ).add( 1 ) ).mul( 0.6 );
		const flow = pow( fract( b.x.sub( t.mul( 0.4 ) ).add( b.y ) ), 6 );
		const flare = smoothstep( 0.92, 1, sin( t.mul( 0.4 ).add( b.y.mul( 40 ) ) ) );
		const loop = mix( color( 0xffa640 ), color( 0xfff3d6 ), flow ).mul( flow.mul( 1.4 ).add( 0.3 ).add( flare.mul( 1.5 ) ) );
		return mix( surface, loop, b.w );

	},
	alpha: 0.3,
	size: 0.011,
	spin: 0.04
} );

// Ring structure: C ring faint, B ring bright, Cassini division, A ring with the Encke gap.
function ringBrightness( r ) {

	if ( r > 1.95 && r < 2.1 ) return 0.08;
	if ( r > 2.42 && r < 2.46 ) return 0.05;
	if ( r < 1.6 ) return 0.35;
	if ( r < 1.95 ) return 1;
	return 0.7;

}

const TILT = 0.45, CT = Math.cos( TILT ), ST = Math.sin( TILT );

const planetaryRings = defineScene( {
	meta: {
		title: { ko: '행성의 고리', en: 'Planetary Rings' },
		ref: { ko: '띠무늬 행성을 따라 도는 얼음 입자 고리, 안쪽일수록 빨리 돌고 카시니 간극이 비어 있다', en: 'Icy ring particles circle a banded planet, faster inside, with the Cassini gap left empty' }
	},
	camera: [ 0, 1, 6.4 ],
	count: 180_000,
	init( i, n ) {

		if ( i < n * 0.35 ) {

			const d = unit();
			return [ Math.hypot( d.x, d.z ), d.y * 0.9, Math.atan2( d.z, d.x ), 0.3, 0, 0, 0 ];

		}

		for ( ;; ) {

			const r = rand( 1.4, 2.6 ), bright = ringBrightness( r );
			if ( Math.random() < bright ) return [ r, gauss() * 0.006, rand( 0, TAU ), 0.6 * Math.pow( r, - 1.5 ), bright * rand( 0.6, 1 ), 0, 1 ];

		}

	},
	position: ( { a, b, t } ) => {

		const theta = a.z.add( t.mul( b.x ) );
		const p = vec3( a.x.mul( cos( theta ) ), a.y, a.x.mul( sin( theta ) ) );
		return vec3( p.x, p.y.mul( CT ).sub( p.z.mul( ST ) ), p.y.mul( ST ).add( p.z.mul( CT ) ) );

	},
	color: ( { a, b } ) => {

		const lat = a.y;
		const band = sin( lat.mul( 16 ).add( mx_noise_float( vec3( lat.mul( 4 ), a.z, 0 ) ).mul( 1.5 ) ) ).mul( 0.5 ).add( 0.5 );
		const planet = gradient( band, [ 0x6b4f2c, 0xd9b77a, 0xf3e2b8 ] ).mul( 0.7 );
		return mix( planet, color( 0xe8dcc0 ).mul( b.y ), b.w );

	},
	alpha: 0.32,
	size: 0.01
} );

const supernova = defineScene( {
	meta: {
		title: { ko: '초신성', en: 'Supernova' },
		ref: { ko: '별의 붕괴 섬광 뒤로 원소별 색을 띤 충격파 껍질이 손가락 모양 필라멘트를 뻗으며 팽창한다', en: 'After the flash, an element-tinted shock shell expands into fingered filaments' }
	},
	camera: [ 0, 0, 6.6 ],
	count: 170_000,
	init( i ) {

		const d = unit();
		if ( i < 1500 ) return [ d.x, d.y, d.z, 0, 0, 1 ];
		return [ d.x, d.y, d.z, Math.random(), Math.random(), 0 ];

	},
	position: ( { a, b, t } ) => {

		const s = fract( t.div( 12 ) );
		const R = pow( s.oneMinus(), 2.2 ).oneMinus().mul( 2.6 ).add( 0.15 );
		const finger = mx_noise_float( a.mul( 3.5 ) ).mul( 0.5 ).add( 0.5 );
		const r = R.mul( finger.mul( 0.35 ).add( 0.75 ).add( b.x.mul( 0.15 ) ) );
		return mix( a.mul( r ), a.mul( 0.04 ), b.z );

	},
	color: ( { a, b, t } ) => {

		const s = fract( t.div( 12 ) );
		const finger = mx_noise_float( a.mul( 3.5 ) ).mul( 0.5 ).add( 0.5 );
		const element = mix( mix( color( 0x2fe0c8 ), color( 0xff3b4a ), step( 0.4, b.y ) ), color( 0xffc24a ), step( 0.82, b.y ) );
		const shell = mix( color( 0xdfe9ff ).mul( 2 ), element.mul( finger.mul( finger ).mul( 1.6 ).add( 0.2 ) ), smoothstep( 0.04, 0.3, s ) )
			.mul( pow( s.oneMinus(), 0.8 ) );
		return mix( shell, color( 0xbfe0ff ).mul( 2 ), b.z );

	},
	alpha: 0.3,
	size: 0.012
} );

const HEAD = new THREE.Vector3( - 1.9, 0.3, 0 );

const comet = defineScene( {
	meta: {
		title: { ko: '혜성', en: 'Comet' },
		ref: { ko: '태양 반대쪽으로 휘어지는 먼지 꼬리와 곧게 뻗는 푸른 이온 꼬리', en: 'A curved golden dust tail and a straight blue ion tail, both streaming away from the Sun' }
	},
	camera: [ 0, 0, 5 ],
	count: 150_000,
	init( i, n ) {

		const g = [ gauss(), gauss(), gauss() ];
		if ( i < n * 0.12 ) return [ ...g.map( ( v ) => v * 0.1 ), 0, Math.random() ];
		if ( i < n * 0.62 ) return [ ...g, 1, Math.random() ];
		if ( i < n * 0.95 ) return [ ...g, 2, Math.random() ];
		return [ rand( - 6, 6 ), rand( - 3.5, 3.5 ), - 4, 3, Math.random() ];

	},
	position: ( { a, b, t } ) => {

		const head = vec3( HEAD.x, HEAD.y, HEAD.z );
		const sd = fract( t.mul( 0.12 ).add( b.y ) ), si = fract( t.mul( 0.35 ).add( b.y ) );
		const coma = head.add( a.mul( sin( t.mul( 2 ).add( b.y.mul( 6 ) ) ).mul( 0.1 ).add( 1 ) ) );
		const dust = head.add( vec3( sd.mul( 3.8 ), sd.mul( sd ).mul( - 0.9 ), 0 ) ).add( a.mul( sd.mul( 0.32 ).add( 0.03 ) ) );
		const ion = head.add( vec3( si.mul( 4.6 ), si.mul( 0.15 ).add( sin( si.mul( 12 ).sub( t.mul( 3 ) ) ).mul( si ).mul( 0.05 ) ), 0 ) ).add( a.mul( si.mul( 0.07 ).add( 0.01 ) ) );
		return coma.mul( is( b.x, 0 ) ).add( dust.mul( is( b.x, 1 ) ) ).add( ion.mul( is( b.x, 2 ) ) ).add( a.mul( is( b.x, 3 ) ) );

	},
	color: ( { b, t } ) => {

		const sd = fract( t.mul( 0.12 ).add( b.y ) ), si = fract( t.mul( 0.35 ).add( b.y ) );
		return color( 0xe8fbff ).mul( 1.4 ).mul( is( b.x, 0 ) )
			.add( color( 0xffc96b ).mul( sd.oneMinus() ).mul( is( b.x, 1 ) ) )
			.add( color( 0x4fa8ff ).mul( si.oneMinus().mul( 1.3 ) ).mul( is( b.x, 2 ) ) )
			.add( color( 0x9aa6c0 ).mul( 0.4 ).mul( is( b.x, 3 ) ) );

	},
	alpha: 0.32,
	size: 0.011
} );

// Periodic foam of jittered nodes and filaments; the camera drifts through it forever.
const WEB_N = 5, WEB_S = 1.4, WEB_L = WEB_N * WEB_S;
const webJitter = Array.from( { length: WEB_N ** 3 }, () => [ gauss() * 0.3, gauss() * 0.3, gauss() * 0.3 ] );
const webNode = ( x, y, z ) => {

	const j = webJitter[ ( ( ( x % WEB_N ) * WEB_N ) + ( y % WEB_N ) ) * WEB_N + ( z % WEB_N ) ];
	return [ x * WEB_S + j[ 0 ] - WEB_L / 2, y * WEB_S + j[ 1 ] - WEB_L / 2, z * WEB_S + j[ 2 ] - WEB_L / 2 ];

};

const cosmicWeb = defineScene( {
	meta: {
		title: { ko: '우주 거대 구조', en: 'Cosmic Web' },
		ref: { ko: '은하단 매듭을 잇는 필라멘트와 그 사이 거대한 공동 속을 끝없이 비행한다', en: 'An endless flight through filaments joining galaxy-cluster knots across vast voids' }
	},
	camera: [ 0, 0, 2.5 ],
	count: 180_000,
	init( i, n ) {

		const x = Math.floor( rand( 0, WEB_N ) ), y = Math.floor( rand( 0, WEB_N ) ), z = Math.floor( rand( 0, WEB_N ) );
		const p = webNode( x, y, z );
		if ( i < n * 0.25 ) return [ p[ 0 ] + gauss() * 0.1, p[ 1 ] + gauss() * 0.1, p[ 2 ] + gauss() * 0.1, 1 ];
		const axis = Math.floor( rand( 0, 3 ) );
		const q = webNode( x + ( axis === 0 ), y + ( axis === 1 ), z + ( axis === 2 ) );
		const s = Math.random(), w = 0.03 + 0.05 * Math.sin( Math.PI * s );
		return [ p[ 0 ] + ( q[ 0 ] - p[ 0 ] ) * s + gauss() * w, p[ 1 ] + ( q[ 1 ] - p[ 1 ] ) * s + gauss() * w, p[ 2 ] + ( q[ 2 ] - p[ 2 ] ) * s + gauss() * w, 0 ];

	},
	position: ( { a, t } ) => mod( a.add( vec3( 0, 0, t.mul( 0.15 ) ) ).add( WEB_L / 2 ), WEB_L ).sub( WEB_L / 2 ),
	color: ( { a, b, t } ) => {

		const p = mod( a.add( vec3( 0, 0, t.mul( 0.15 ) ) ).add( WEB_L / 2 ), WEB_L ).sub( WEB_L / 2 );
		const fade = smoothstep( WEB_L / 2, WEB_L / 2 - 1, abs( p.z ) ).mul( smoothstep( WEB_L / 2, WEB_L / 2 - 1, abs( p.x ) ) );
		return mix( color( 0x5b3cc4 ).mul( 0.5 ), color( 0xffe2a8 ).mul( 1.3 ), b.x ).mul( fade );

	},
	alpha: 0.32,
	size: 0.012
} );

// Pulsar: magnetic axis tilted 30 degrees from the spin axis; the whole frame spins.
const M = new THREE.Vector3( Math.sin( 0.5 ), Math.cos( 0.5 ), 0 );
function dipolePoint() {

	// Field line r = L sin^2(theta) in the magnetic frame, then rotated so its pole aligns with M.
	const L = rand( 0.45, 1.7 ), th = rand( 0.2, Math.PI - 0.2 ), az = Math.floor( rand( 0, 12 ) ) / 12 * TAU;
	const r = L * Math.sin( th ) ** 2;
	const p = new THREE.Vector3( r * Math.sin( th ) * Math.cos( az ), r * Math.cos( th ), r * Math.sin( th ) * Math.sin( az ) );
	return p.applyQuaternion( new THREE.Quaternion().setFromUnitVectors( new THREE.Vector3( 0, 1, 0 ), M ) );

}

const pulsar = defineScene( {
	meta: {
		title: { ko: '펄서', en: 'Pulsar' },
		ref: { ko: '빠르게 자전하는 중성자별의 자기극에서 나온 두 빔이 등대처럼 공간을 휩쓴다', en: 'Two beams from a spinning neutron star\'s magnetic poles sweep space like a lighthouse' }
	},
	camera: [ 0, 0.5, 6 ],
	count: 140_000,
	init( i, n ) {

		if ( i < n * 0.05 ) {

			const d = unit().multiplyScalar( 0.16 );
			return [ d.x, d.y, d.z, 0, 0, 0, 0 ];

		}

		if ( i < n * 0.6 ) {

			const perp = new THREE.Vector3().crossVectors( M, unit() ).normalize().multiplyScalar( Math.sqrt( Math.random() ) );
			return [ perp.x, perp.y, perp.z, Math.random() < 0.5 ? - 1 : 1, Math.random(), 0, 1 ];

		}

		const p = dipolePoint();
		return [ p.x, p.y, p.z, 0, Math.random(), 0, 2 ];

	},
	position: ( { a, b, t } ) => {

		const s = fract( t.mul( 0.6 ).add( b.y ) );
		const beam = vec3( M.x, M.y, M.z ).mul( b.x.mul( s.mul( 3.2 ).add( 0.2 ) ) ).add( a.mul( s.mul( 0.35 ) ) );
		return mix( a, beam, is( b.w, 1 ) );

	},
	color: ( { b, t } ) => {

		const s = fract( t.mul( 0.6 ).add( b.y ) );
		const beam = mix( color( 0xf2e6ff ), color( 0x5a4dff ), s ).mul( s.oneMinus().mul( 1.4 ) );
		const field = color( 0x2fd5ff ).mul( pow( fract( b.y.sub( t.mul( 0.5 ) ) ), 8 ).mul( 1.2 ).add( 0.12 ) );
		return color( 0xeaf4ff ).mul( 1.6 ).mul( is( b.w, 0 ) ).add( beam.mul( is( b.w, 1 ) ) ).add( field.mul( is( b.w, 2 ) ) );

	},
	alpha: 0.32,
	size: 0.011,
	spin: 2.2
} );

// [semi-major axis, eccentricity, body radius]; distances are compressed for display.
// Mean motion follows Kepler's third law on the displayed radii (n ~ a^-1.5, Earth at a = 1.05 -> 1 rad/s).
const PLANETS = [
	[ 0.55, 0.2, 0.03 ], [ 0.8, 0.01, 0.05 ], [ 1.05, 0.017, 0.05 ], [ 1.35, 0.09, 0.04 ],
	[ 1.9, 0.05, 0.12 ], [ 2.4, 0.06, 0.1 ], [ 2.85, 0.05, 0.07 ], [ 3.25, 0.01, 0.07 ]
].map( ( [ A, e, size ] ) => [ A, e, Math.pow( A / 1.05, - 1.5 ), size ] );

const orrery = defineScene( {
	meta: {
		title: { ko: '태양계', en: 'Orrery' },
		ref: { ko: '케플러 방정식대로 타원 궤도를 도는 여덟 행성, 안쪽 행성일수록 빠르다', en: 'Eight planets on Keplerian ellipses, the inner ones racing ahead' }
	},
	camera: [ 0, 3.4, 5.2 ],
	count: 120_000,
	init( i, n ) {

		const g = unit().multiplyScalar( Math.cbrt( Math.random() ) );
		if ( i < n * 0.1 ) return [ g.x * 0.22, g.y * 0.22, g.z * 0.22, 0, 0, 0, 0 ];
		const [ A, e, w, size ] = PLANETS[ Math.floor( rand( 0, PLANETS.length ) ) ];
		if ( i < n * 0.4 ) return [ g.x * size, g.y * size, g.z * size, A, e, w * 0.35, PLANETS.length ];
		return [ gauss() * 0.004, gauss() * 0.004, gauss() * 0.004, A, e, 0, rand( 0, TAU ) ];

	},
	position: ( { a, b, t } ) => {

		const Mean = t.mul( b.z ).add( b.w );
		const E1 = Mean.add( b.y.mul( sin( Mean ) ) );
		const E = Mean.add( b.y.mul( sin( E1 ) ) );
		return vec3( b.x.mul( cos( E ).sub( b.y ) ), 0, b.x.mul( b.y.mul( b.y ).mul( - 0.5 ).add( 1 ) ).mul( sin( E ) ) ).add( a );

	},
	color: ( { b } ) => {

		const body = step( 0.0001, b.z ).add( step( b.x, 0.01 ) );
		return gradient( b.x.div( 3.3 ), [ 0xffd36b, 0xc9a27a, 0x4fa8ff, 0xff7a4a, 0xe8c49a, 0xf3e2b8, 0x8fe8ff, 0x3a6bff ] )
			.mul( body.mul( 1.28 ).add( 0.12 ) );

	},
	alpha: 0.4,
	size: 0.012
} );

export default [ spiralGalaxy, blackHole, nebula, solarCorona, planetaryRings, supernova, comet, cosmicWeb, pulsar, orrery ];
