// Theme 5: Earth & Geology — landforms and geological processes.
import * as THREE from 'three/webgpu';
import { vec2, vec3, sin, cos, mix, fract, smoothstep, step, clamp, max, exp, pow, mod, length, color, positionLocal, mx_noise_float, mx_fractal_noise_float } from 'three/tsl';
import { defineScene, gradient, TAU, rand } from '../../lib/defineScene.js';
import { gauss } from '../../lib/points.js';

const ss = ( e0, e1, x ) => {

	const k = Math.min( Math.max( ( x - e0 ) / ( e1 - e0 ), 0 ), 1 );
	return k * k * ( 3 - 2 * k );

};

// 41 Volcano: a basalt cone with glowing lava rivulets, ejecta thrown on ballistic arcs.
const volcano = defineScene( {
	meta: {
		title: { ko: '화산 분화', en: 'Volcano' },
		ref: { ko: '분화구에서 솟구친 분출물이 포물선을 그리며 식어 떨어지고 용암이 산허리를 타고 흐른다', en: 'Ejecta arc out of the crater and cool as they fall while lava runs down the flanks' }
	},
	camera: [ 0, 1.0, 8 ],
	count: 170_000,
	init( i, n ) {

		if ( i < n * 0.53 ) { // cone surface, area-weighted

			let y;
			do y = Math.random() * 1.25; while ( Math.random() > 1 - y / 1.35 );
			const ang = rand( 0, TAU ), r = 1.9 * ( 1 - y / 1.35 ) + gauss() * 0.03;
			const flows = [ 0.4, 1.9, 3.3, 5.1 ].reduce( ( m, f ) => Math.max( m, Math.exp( - ( ( ( ( ang - f + 9 * Math.PI ) % TAU ) - Math.PI ) ** 2 ) * 300 ) ), 0 );
			return [ Math.cos( ang ) * r, y, Math.sin( ang ) * r, 0, flows * ss( 0, 1, y / 1.25 + Math.random() * 0.3 ), y ];

		}

		// Launch speed and angle from vertical (not independent box-uniform components) give an umbrella-shaped fountain.
		const ang = rand( 0, TAU ), tilt = Math.sqrt( Math.random() ) * 0.45, v = rand( 2.0, 2.9 );
		return [ Math.cos( ang ) * Math.sin( tilt ) * v, Math.cos( tilt ) * v, Math.sin( ang ) * Math.sin( tilt ) * v, 1, Math.random() ]; // apex <= 1.25 + 2.9^2 / 3.2 ~ 3.9

	},
	position: ( { a, b, t } ) => {

		// Ballistic flight lasts until the bomb lands (fastest needs ~2.6 s), so nothing vanishes mid-air.
		const tau = fract( t.mul( 0.36 ).add( b.y ) ).mul( 2.8 );
		const ejecta = vec3( 0, 1.25, 0 ).add( a.mul( tau ) ).sub( vec3( 0, tau.mul( tau ).mul( 1.6 ), 0 ) );
		return mix( a, ejecta, b.x );

	},
	color: ( { a, b, t } ) => {

		const tau = fract( t.mul( 0.36 ).add( b.y ) ).mul( 2.8 );
		const y = a.y.mul( tau ).add( 1.25 ).sub( tau.mul( tau ).mul( 1.6 ) );
		// Bombs stop where they hit the cone surface (height 1.35 * (1 - r / 1.9)), not at sea level.
		const cone = max( vec2( a.x, a.z ).length().mul( tau ).div( 1.9 ).oneMinus().mul( 1.35 ), 0 );
		const ejecta = gradient( tau.div( 2.8 ), [ 0xfff6c2, 0xffae3b, 0xe2401c, 0x4a3a3a ] ).mul( step( cone, y ) );
		// Glow pulses travel downslope with the lava (phase constant moves to lower y over time).
		const glow = b.y.mul( sin( t.mul( 2 ).add( b.z.mul( 6 ) ) ).mul( 0.3 ).add( 0.7 ) ).add( smoothstep( 1.1, 1.25, b.z ).mul( 0.8 ) );
		const rock = mix( color( 0x2b2323 ).mul( 0.6 ), color( 0xff5a1f ), clamp( glow, 0, 1 ) );
		return mix( rock, ejecta, b.x );

	},
	extras( { scene } ) {

		// Solid cone just inside the surface points: the far flank, its lava and bombs behind it stay hidden.
		const cone = new THREE.Mesh( new THREE.CylinderGeometry( 0.13, 1.84, 1.25, 64 ), new THREE.MeshBasicNodeMaterial( { color: 0x000000 } ) );
		cone.position.y = 0.625;
		scene.add( cone );
		scene.position.y = - 1.3; // frame the cone low so the full eruption column fits

	},
	alpha: 0.35,
	size: 0.011
} );

// 42 Tectonic Drift: two plates spread from a mid-ocean ridge, carrying magnetic stripes; mantle rolls beneath.
const PLATE = 2.8;
const tectonicDrift = defineScene( {
	meta: {
		title: { ko: '판 구조', en: 'Tectonic Drift' },
		ref: { ko: '해령에서 솟은 마그마가 새 지각이 되어 양쪽으로 밀려나며 지자기 줄무늬를 남긴다', en: 'Magma rising at a ridge becomes new crust that spreads both ways, recording magnetic stripes' }
	},
	camera: [ 0, 1.8, 5 ],
	count: 170_000,
	init( i, n ) {

		const side = Math.random() < 0.5 ? - 1 : 1, z = rand( - 1.6, 1.6 );
		if ( i < n * 0.7 ) return [ rand( 0, PLATE ), - Math.random() * 0.08, z, side, 0, 0.12 * Math.sin( z * 3 ) ];
		if ( i < n * 0.85 ) return [ Math.random() * 0.15, 0, z, side, 1, Math.random() ];
		const r = Math.sqrt( Math.random() ) * 0.75;
		return [ side * 1.4, - 1.15, z, side, 2, rand( 0, TAU ), r ];

	},
	position: ( { a, b, t } ) => {

		const d = fract( a.x.div( PLATE ).add( t.mul( 0.02 ) ) ).mul( PLATE );
		const plate = vec3( b.x.mul( d ), a.y.sub( d.mul( 0.06 ) ), a.z );
		const rise = fract( t.mul( 0.35 ).add( b.z ) );
		const magma = vec3( b.x.mul( a.x ).mul( rise.add( 0.3 ) ), rise.mul( 0.42 ).sub( 0.45 ), a.z );
		// Convection cells rise beneath the ridge and flow outward at the top, dragging the plates apart.
		const ang = b.z.sub( t.mul( 0.25 ).mul( b.x ) );
		const mantle = vec3( a.x.add( cos( ang ).mul( b.w ) ), a.y.add( sin( ang ).mul( b.w ).mul( 0.55 ) ), a.z );
		return mix( mix( plate, magma, step( 0.5, b.y ) ), mantle, step( 1.5, b.y ) );

	},
	color: ( { a, b, t } ) => {

		const d = fract( a.x.div( PLATE ).add( t.mul( 0.02 ) ) ).mul( PLATE );
		// Polarity is frozen in when the crust forms at the ridge (time t - age), so the stripes ride
		// outward with the plates, mirror-symmetric about the ridge. Spreading speed = 0.02 * PLATE.
		const formed = t.sub( d.div( 0.02 * PLATE ) );
		const polarity = step( 0.5, fract( formed.mul( 0.1 ).add( b.z ) ) );
		const plate = mix( color( 0x2a6fdb ), color( 0xe8e2d0 ), polarity ).mul( 0.55 );
		const magma = mix( color( 0xff4d1a ), color( 0xffd36b ), fract( t.mul( 0.35 ).add( b.z ) ) );
		return mix( mix( plate, magma, step( 0.5, b.y ) ), color( 0x6b1a0e ).mul( 0.7 ), step( 1.5, b.y ) );

	},
	alpha: 0.35,
	size: 0.011
} );

// 43 Sand Dunes: ridged dunes creep downwind, wind ripples on their backs, lee faces in shadow.
// Transverse dunes, wind blowing +x: long gentle windward slope, short steep lee (slip) face downwind.
// Height/width keeps the lee slope under sand's angle of repose (~34 deg, tan ~0.67).
const duneHeight = ( x, z ) => {

	const u = fract( x.div( 2 ).add( mx_noise_float( vec3( 0, z.mul( 0.5 ), 7 ) ).mul( 0.6 ) ) );
	const amp = mx_noise_float( vec3( x.mul( 0.2 ), z.mul( 0.35 ), 3 ) ).mul( 0.05 ).add( 0.22 );
	return smoothstep( 0, 0.75, u ).mul( smoothstep( 0.75, 1, u ).oneMinus() ).mul( amp ).add( 0.25 );

};

const sandDunes = defineScene( {
	meta: {
		title: { ko: '사구', en: 'Sand Dunes' },
		ref: { ko: '바람이 모래를 실어 날라 언덕이 바람 방향으로 천천히 이동하고 등에는 잔물결이 새겨진다', en: 'Wind carries sand so dunes creep downwind, their backs etched with ripples' }
	},
	camera: [ 0, 1.5, 3.8 ],
	count: 160_000,
	init( i ) {

		return [ ( ( i % 420 ) / 419 - 0.5 ) * 6.4, 0, Math.floor( i / 420 ) / 380 * 5 - 3 ];

	},
	position: ( { a, t } ) => {

		const x = a.x.sub( t.mul( 0.03 ) );
		// Wind ripples run perpendicular to the wind and migrate with it.
		return vec3( a.x, duneHeight( x, a.z ).add( sin( a.x.sub( t.mul( 0.12 ) ).mul( 40 ).add( a.z.mul( 1.5 ) ) ).mul( 0.008 ) ).sub( 0.6 ), a.z );

	},
	color: ( { a, t } ) => {

		const x = a.x.sub( t.mul( 0.03 ) );
		const slope = duneHeight( x.add( 0.03 ), a.z ).sub( duneHeight( x.sub( 0.03 ), a.z ) );
		const lit = clamp( slope.mul( 6 ).add( 0.55 ), 0.15, 1.1 );
		return gradient( lit.div( 1.1 ), [ 0x3d2410, 0xb5763a, 0xf6cf8e ] ).mul( 0.7 );

	},
	alpha: 0.35,
	size: 0.012
} );

// 44 Canyon Strata: terraced canyon walls banded by sediment layers, a river at the bottom.
const canyonStrata = defineScene( {
	meta: {
		title: { ko: '협곡 지층', en: 'Canyon Strata' },
		ref: { ko: '강이 깎아 낸 계단식 협곡 벽에 수백만 년의 퇴적층이 색 띠로 드러난다', en: 'A river-cut, terraced canyon exposes millions of years of sediment as bands of color' }
	},
	camera: [ 0, 1.0, 3.0 ],
	count: 158_400,
	init( i ) {

		const x = ( ( i % 440 ) / 439 - 0.5 ) * 4.8, z = Math.floor( i / 440 ) / 360 * 6 - 4;
		const m = 0.35 * Math.sin( z * TAU / 6 ), w = 0.4 + 0.12 * Math.sin( z * TAU / 3 );
		const e = Math.min( Math.max( ( Math.abs( x - m ) - w ) / 1.3, 0 ), 1 ), tq = e * 5;
		const y = Math.abs( x - m ) < w ? - 1 : - 1 + ( Math.floor( tq ) + ss( 0.6, 1, tq % 1 ) ) / 5 * 1.9 + gauss() * 0.01;
		return [ x, y, z, 0.05 * Math.sin( x * 5 + z * 2 ) ];

	},
	position: ( { a, t } ) => vec3( a.x, a.y, mod( a.z.add( t.mul( 0.15 ) ).add( 4 ), 6 ).sub( 4 ) ),
	color: ( { a, b, t } ) => {

		const band = fract( a.y.add( 1 ).mul( 3.2 ).add( b.x ) );
		const rock = gradient( band, [ 0x7a2e1b, 0xc1502e, 0xe39a5b, 0xf3d9b1, 0xa0522d ] ).mul( 0.6 );
		const river = color( 0x2f7bb5 ).mul( sin( t.mul( 2 ).add( a.z.mul( 8 ) ) ).mul( 0.2 ).add( 0.8 ) );
		const z = mod( a.z.add( t.mul( 0.15 ) ).add( 4 ), 6 ).sub( 4 );
		return mix( rock, river, step( a.y, - 0.99 ) ).mul( smoothstep( - 4, - 2.5, z ) );

	},
	alpha: 0.35,
	size: 0.012
} );

// 45 Geode: a cracked-open rock whose hollow is lined with amethyst crystals.
const geode = defineScene( {
	meta: {
		title: { ko: '정동', en: 'Geode' },
		ref: { ko: '평범한 돌을 쪼개면 속이 빈 공간 안쪽으로 자수정 결정이 빽빽하게 자라 있다', en: 'Split an ordinary stone and find its hollow densely lined with amethyst crystals' }
	},
	camera: [ 0, 0, 3.8 ],
	count: 158_000,
	init( i ) {

		const dir = () => {

			let v;
			do v = new THREE.Vector3().randomDirection(); while ( v.z > 0.2 );
			return v;

		};

		if ( i < 60000 ) { // rough outer crust

			const v = dir().multiplyScalar( 1.25 + Math.abs( gauss() ) * 0.06 );
			return [ v.x, v.y, v.z, 0 ];

		}

		if ( i < 68000 ) { // quartz rim at the cut

			const a = rand( 0, TAU ), r = rand( 1.1, 1.3 ), z = Math.sqrt( Math.max( 0, 1.25 ** 2 - r * r ) );
			return [ Math.cos( a ) * r, Math.sin( a ) * r, Math.min( z, 0.2 ), 1 ];

		}

		const c = Math.floor( ( i - 68000 ) / 30 ), u = ( ( i - 68000 ) % 30 ) / 29;
		const root = new THREE.Vector3( Math.sin( c * 12.9898 ) * 43758.5453 % 1, Math.sin( c * 78.233 ) * 43758.5453 % 1, - Math.abs( Math.sin( c * 39.425 ) * 43758.5453 % 1 ) ).normalize().multiplyScalar( 1.12 );
		const len = 0.2 + Math.abs( Math.sin( c * 7.1 ) ) * 0.3;
		const p = root.clone().multiplyScalar( 1 - u * len / 1.12 ).add( new THREE.Vector3( gauss(), gauss(), gauss() ).multiplyScalar( ( 1 - u ) * 0.035 ) );
		return [ p.x, p.y, p.z, 2, u ];

	},
	position: ( { a } ) => a,
	color: ( { b, t, h } ) => {

		const sparkle = smoothstep( 0.97, 1, fract( h.mul( 13 ).add( t.mul( 0.5 ) ) ) ).mul( 1.5 );
		const crystal = gradient( b.y, [ 0x2a0f45, 0x7b3fbf, 0xe3c7ff ] ).add( vec3( sparkle ) );
		const crust = mix( color( 0x4a4036 ).mul( 0.5 ), color( 0xe8e4f0 ).mul( 0.6 ), step( 0.5, b.x ) );
		return mix( crust, crystal, step( 1.5, b.x ) );

	},
	update: ( ctx, t ) => {

		ctx.points.rotation.y = Math.sin( t * 0.25 ) * 0.6;

	},
	alpha: 0.35,
	size: 0.011
} );

// 46 Seismic Waves: P waves pass through the core, S waves cannot cross the liquid outer core.
const seismicWaves = defineScene( {
	meta: {
		title: { ko: '지진파', en: 'Seismic Waves' },
		ref: { ko: '진원에서 퍼진 P파는 핵을 통과하지만 S파는 액체 외핵에 막혀 그림자 지대가 생긴다', en: 'P waves pass through the core but S waves stop at the liquid outer core, leaving a shadow zone' }
	},
	camera: [ 0, 0, 5.2 ],
	count: 170_000,
	init() {

		const r = 2 * Math.sqrt( Math.random() ), a = rand( 0, TAU );
		return [ Math.cos( a ) * r, Math.sin( a ) * r, gauss() * 0.02 ];

	},
	position: ( { a } ) => a,
	color: ( { a, t } ) => {

		const r = length( a.xy );
		// Earth radius ~1.95: inner core 0.19 R = 0.37, liquid outer core 0.55 R = 1.07.
		const RC = 1.07;
		const layer = mix( mix( mix( color( 0xf2c14e ), color( 0xc4661c ), step( 0.37, r ) ), color( 0x7a2e14 ), step( RC, r ) ), color( 0x8a6a4a ), step( 1.9, r ) ).mul( 0.3 );
		const tau = fract( t.div( 9 ) ).mul( 9 );
		const src = vec2( 0, 1.95 ), ray = a.xy.sub( src );
		const d = length( ray );
		// Straight ray from the focus: how much of it runs through the outer core (chord clipped to the segment).
		const u = src.negate().dot( ray ).div( ray.dot( ray ).add( 1e-5 ) );
		const miss = src.add( ray.mul( u ) ).length();
		const half = max( miss.mul( miss ).negate().add( RC * RC ), 0 ).sqrt().div( d.add( 1e-5 ) );
		const inCore = clamp( u.add( half ), 0, 1 ).sub( clamp( u.sub( half ), 0, 1 ) ).mul( d );
		// P waves slow down in the liquid core (~13.7 to ~8 km/s), so their front lags behind it.
		const dp = d.add( inCore.mul( 0.6 ) ).sub( tau.mul( 0.55 ) ), ds = d.sub( tau.mul( 0.32 ) );
		const fade = tau.div( 9 ).oneMinus();
		// S waves cannot travel through liquid: none in the core and none in the shadow behind it.
		const sOk = step( inCore, 0.001 );
		const p = exp( dp.mul( dp ).mul( - 30 ) ).mul( fade ), s = exp( ds.mul( ds ).mul( - 30 ) ).mul( sOk ).mul( fade );
		return layer.add( color( 0x7fe7ff ).mul( p ) ).add( color( 0xff3b3b ).mul( s ) );

	},
	alpha: 0.35,
	size: 0.012
} );

// 47 Stalactite Cave: dripstones hang from the ceiling, rise from the floor, and droplets fall between them.
let caveTips;
const stalactiteCave = defineScene( {
	meta: {
		title: { ko: '종유굴', en: 'Stalactite Cave' },
		ref: { ko: '석회수 방울이 천장에서 떨어지며 위로는 종유석, 아래로는 석순을 수천 년에 걸쳐 키운다', en: 'Dripping lime water grows stalactites above and stalagmites below over millennia' }
	},
	camera: [ 0, - 0.2, 4.2 ],
	count: 160_000,
	init( i ) {

		if ( i === 0 ) caveTips = Array.from( { length: 60 }, () => ( { x: rand( - 2.8, 2.8 ), z: rand( - 2, 0.8 ), len: rand( 0.4, 1.3 ), base: rand( 0.12, 0.25 ), mite: Math.random() < 0.5 ? rand( 0.2, 0.8 ) : 0 } ) );
		const roughY = ( x, z ) => 0.08 * Math.sin( x * 3.1 ) * Math.cos( z * 2.3 );

		if ( i < 40000 ) { const x = rand( - 3, 3 ), z = rand( - 2.2, 1 ); return [ x, 1.3 + roughY( x, z ), z, 0 ]; }
		if ( i < 70000 ) { const x = rand( - 3, 3 ), z = rand( - 2.2, 1 ); return [ x, - 1.3 + roughY( z, x ), z, 0 ]; }

		const tip = caveTips[ Math.floor( Math.random() * caveTips.length ) ];
		if ( i < 130000 ) { // stalactite cone

			const u = Math.sqrt( Math.random() ), a = rand( 0, TAU ), r = tip.base * u;
			return [ tip.x + Math.cos( a ) * r, 1.3 - tip.len * ( 1 - u ), tip.z + Math.sin( a ) * r, 0 ];

		}

		if ( i < 155000 ) { // stalagmite below

			const h = tip.mite || 0.1, u = Math.sqrt( Math.random() ), a = rand( 0, TAU ), r = tip.base * 1.3 * u;
			return [ tip.x + Math.cos( a ) * r, - 1.3 + h * ( 1 - u ), tip.z + Math.sin( a ) * r, 0 ];

		}

		return [ tip.x + gauss() * 0.01, 0, tip.z + gauss() * 0.01, 3, Math.random(), 1.3 - tip.len, - 1.3 + ( tip.mite || 0.1 ) ];

	},
	position: ( { a, b, t } ) => {

		const tau = fract( t.mul( 0.22 ).add( b.y ) );
		// Drop hangs at the stalactite tip while it swells, then free-falls: y = tip - g/2 * s^2 with
		// g ~ 4.9 units/s^2 (cave ~2.6 units = ~5 m). fall = 0.484 s, so 10.5 * fall^2 = 2.45 s^2.
		const fall = max( tau.sub( 0.4 ), 0 ).mul( 2.2 );
		const drop = vec3( a.x, max( b.z.sub( fall.mul( fall ).mul( 10.5 ) ), b.w ), a.z );
		return mix( a, drop, step( 2.5, b.x ) );

	},
	color: ( { a, b, t } ) => {

		const rock = gradient( a.y.add( 1.3 ).div( 2.6 ), [ 0x2a2420, 0x8c7a64, 0xd8c7a8 ] ).mul( 0.5 ).add( color( 0x0d2236 ).mul( 0.3 ) );
		const tau = fract( t.mul( 0.22 ).add( b.y ) );
		const fall = max( tau.sub( 0.4 ), 0 ).mul( 2.2 );
		const landed = step( b.z.sub( fall.mul( fall ).mul( 10.5 ) ), b.w.add( 0.01 ) );
		return mix( rock, color( 0xbdf3ff ).mul( 1.5 ).mul( landed.oneMinus() ), step( 2.5, b.x ) );

	},
	alpha: 0.35,
	size: 0.011
} );

// 48 Mountain Range: a low flight over ridged peaks with snow caps and green valleys.
// Ridged fBm: sharp crests where the noise crosses zero, broad valleys elsewhere (no flat high plateaus).
const ridgeHeight = ( x, z, t ) => {

	const n = mx_fractal_noise_float( vec3( x.mul( 0.35 ), 0, z.sub( t.mul( 0.25 ) ).mul( 0.35 ) ), 5 );
	const r = clamp( n.abs().mul( 2.2 ).oneMinus(), 0, 1 );
	return r.mul( r ).mul( r ).mul( 1.25 ).sub( 1.0 ); // peaks top out at 0.25, below the 0.9 flight height

};
const mountainRange = defineScene( {
	meta: {
		title: { ko: '산맥', en: 'Mountain Range' },
		ref: { ko: '눈 덮인 봉우리와 푸른 골짜기가 이어지는 산맥 위를 낮게 날아간다', en: 'A low flight over a chain of snow-capped peaks and green valleys' }
	},
	camera: [ 0, 0.9, 2.6 ],
	count: 172_800,
	init( i ) {

		return [ ( ( i % 600 ) / 599 - 0.5 ) * 8, 0, Math.floor( i / 600 ) / 288 * 5 - 4 ]; // x in [-4, 4], z in [-4, 1]

	},
	position: ( { a, t } ) => vec3( a.x, ridgeHeight( a.x, a.z, t ), a.z ),
	color: ( { a, t } ) => gradient( ridgeHeight( a.x, a.z, t ).add( 1.0 ).div( 1.25 ), [ 0x0f3d2e, 0x3f5f4a, 0x8a8f98, 0xffffff ] ).mul( 0.65 ).mul( smoothstep( - 4, - 2, a.z ) ),
	extras( { scene, t } ) {

		// Opaque terrain just under the points so near ridges hide the ones behind (mountains are not see-through).
		const geo = new THREE.PlaneGeometry( 8, 5, 400, 250 ).rotateX( - Math.PI / 2 ).translate( 0, 0, - 1.5 );
		const mat = new THREE.MeshBasicNodeMaterial( { color: 0x000000 } );
		mat.positionNode = vec3( positionLocal.x, ridgeHeight( positionLocal.x, positionLocal.z, t ).sub( 0.03 ), positionLocal.z );
		scene.add( new THREE.Mesh( geo, mat ) );

	},
	alpha: 0.35,
	size: 0.012
} );

// 49 Geyser: pressure builds, the vent erupts a water column, steam lingers over a mineral pool.
// Eruption strength over an 11 s cycle: sudden onset, a few seconds of play, then quiet recharge.
const eruption = ( time ) => {

	const c = fract( time.div( 11 ) );
	return smoothstep( 0, 0.04, c ).mul( smoothstep( 0.5, 0.25, c ) );

};

const geyser = defineScene( {
	meta: {
		title: { ko: '간헐천', en: 'Geyser' },
		ref: { ko: '지하에서 압력이 차오르면 뜨거운 물기둥이 주기적으로 솟고 증기가 광물 웅덩이 위에 남는다', en: 'Underground pressure periodically launches a column of hot water, leaving steam over a mineral pool' }
	},
	camera: [ 0, 1.2, 5.2 ],
	count: 170_000,
	init( i ) {

		const a = rand( 0, TAU );
		if ( i < 70000 ) { const r = 2.2 * Math.sqrt( Math.random() ); return [ Math.cos( a ) * r, - 0.02 * r, Math.sin( a ) * r, 0, r / 2.2 ]; }
		if ( i < 130000 ) return [ Math.cos( a ), Math.sin( a ), Math.random() * 0.8, 1, Math.random(), rand( 0.02, 0.18 ) ];
		return [ Math.cos( a ), Math.sin( a ), rand( 0.5, 1 ), 2, Math.random() ];

	},
	position: ( { a, b, t } ) => {

		// Flight time covers the full parabola (v0 <= 3.6, g = 4: lands after <= 1.8 s), and launch speed is
		// set by the vent pressure at launch time, not by the pressure now (no mid-air speed changes).
		const tau = fract( t.mul( 0.55 ).add( b.y ) ).mul( 1.9 );
		const e = eruption( t.sub( tau.div( 1.045 ) ) );
		const v0 = a.z.add( 2.8 ).mul( e.mul( 0.75 ).add( 0.25 ) );
		const column = vec3( a.x.mul( tau ).mul( b.z ), max( v0.mul( tau ).sub( tau.mul( tau ).mul( 2 ) ), 0 ), a.y.mul( tau ).mul( b.z ) );
		const s = fract( t.mul( 0.07 ).add( b.y ) );
		const rad = s.mul( 1.3 ).add( 0.15 ).mul( a.z ).add( sin( t.add( b.y.mul( 20 ) ) ).mul( 0.05 ) );
		// Buoyant steam slows as it cools and mixes (rise ~ age^0.6), widening as it goes.
		const steam = vec3( a.x.mul( rad ), pow( s, 0.6 ).mul( 3.2 ), a.y.mul( rad ) );
		return mix( mix( a, column, step( 0.5, b.x ) ), steam, step( 1.5, b.x ) );

	},
	color: ( { b, t } ) => {

		const e = eruption( t );
		const pool = gradient( b.y, [ 0x0a4fa8, 0x1fb3c4, 0xd9e36b, 0xf2a03d, 0xb5502a ] ).mul( 0.55 );
		const water = color( 0xd6f3ff ).mul( e.mul( 0.9 ).add( 0.3 ) );
		const s = fract( t.mul( 0.07 ).add( b.y ) );
		const steam = color( 0xe9eef5 ).mul( s.oneMinus().mul( e.mul( 0.5 ).add( 0.2 ) ) );
		return mix( mix( pool, water, step( 0.5, b.x ) ), steam, step( 1.5, b.x ) );

	},
	alpha: 0.3,
	size: 0.012
} );

// 50 Salt Flat: evaporite crust cracked into hexagons, a film of water mirroring the dusk sky.
const hexEdge = ( x, y ) => {

	const r = [ 1, 1.732 ], h = [ 0.5, 0.866 ];
	const m = ( v, d ) => ( ( v % d ) + d ) % d;
	const a = [ m( x, r[ 0 ] ) - h[ 0 ], m( y, r[ 1 ] ) - h[ 1 ] ], b = [ m( x - h[ 0 ], r[ 0 ] ) - h[ 0 ], m( y - h[ 1 ], r[ 1 ] ) - h[ 1 ] ];
	const g = a[ 0 ] ** 2 + a[ 1 ] ** 2 < b[ 0 ] ** 2 + b[ 1 ] ** 2 ? a : b;
	const px = Math.abs( g[ 0 ] ), py = Math.abs( g[ 1 ] );
	return 0.5 - Math.max( px * 0.5 + py * 0.866, px ); // distance to the cell edge

};

const saltFlat = defineScene( {
	meta: {
		title: { ko: '소금 사막', en: 'Salt Flat' },
		ref: { ko: '물이 증발한 소금 지각이 육각형으로 갈라지고 얇은 물막이 노을 하늘을 거울처럼 비춘다', en: 'Evaporated salt crust cracks into hexagons while a thin film of water mirrors the dusk sky' }
	},
	camera: [ 0, 0.6, 2.6 ],
	count: 167_200,
	init( i ) {

		const x = ( ( i % 440 ) / 439 - 0.5 ) * 8, z = Math.floor( i / 440 ) / 380 * 8 - 6;
		const wob = 0.04 * Math.sin( x * 2.3 + z * 1.7 );
		const crack = 1 - ss( 0, 0.05, hexEdge( x / 0.4 + wob, z / 0.4 - wob ) );
		return [ x, crack * 0.02 - 0.5, z, crack ];

	},
	position: ( { a } ) => a,
	color: ( { a, b, t } ) => {

		const k = clamp( a.z.add( 6 ).div( 8 ).add( sin( t.mul( 0.05 ) ).mul( 0.1 ) ), 0, 1 );
		const sky = gradient( k, [ 0x2b2d6e, 0xb46ab8, 0xf6a5a0, 0xffd8a8 ] ).mul( 0.45 ).add( vec3( sin( t.mul( 1.5 ).add( a.x.mul( 12 ) ).add( a.z.mul( 9 ) ) ).mul( 0.03 ) ) );
		return mix( sky, color( 0xf4f1ea ).mul( 0.8 ), b.x ).mul( smoothstep( - 6, - 4.5, a.z ) );

	},
	alpha: 0.35,
	size: 0.012
} );

export default [ volcano, tectonicDrift, sandDunes, canyonStrata, geode, seismicWaves, stalactiteCave, mountainRange, geyser, saltFlat ];
