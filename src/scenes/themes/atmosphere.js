// Theme 2: Atmosphere & Weather — large-scale weather phenomena.
import { vec3, sin, cos, mix, fract, mod, step, smoothstep, exp, max, color, mx_noise_float, mx_noise_vec3 } from 'three/tsl';
import { defineScene, gradient, TAU, rand } from '../../lib/defineScene.js';
import { gauss } from '../../lib/points.js';
import * as windPainting from '../windPainting.js';

// 12 Aurora: four folded curtains, rays flickering along their length.
const aurora = defineScene( {
	meta: {
		title: { ko: '오로라', en: 'Aurora' },
		ref: { ko: '태양풍 입자가 대기와 부딪혀 하늘에 빛의 커튼을 드리운다', en: 'Solar wind meets the upper atmosphere and hangs curtains of light across the sky' }
	},
	camera: [ 0, - 1.4, 4.2 ],
	count: 160_000,
	init: () => [ Math.random(), Math.random(), Math.floor( rand( 0, 4 ) ) ],
	position: ( { a, t } ) => {

		const x = a.x.sub( 0.5 ).mul( 6.4 ), c = a.z;
		const z = c.mul( 0.45 ).sub( 0.7 )
			.add( sin( x.mul( 0.7 ).add( t.mul( 0.25 ) ).add( c.mul( 1.7 ) ) ).mul( 0.5 ) )
			.add( sin( x.mul( 2.3 ).sub( t.mul( 0.5 ) ) ).mul( 0.12 ) );
		const base = sin( x.mul( 1.1 ).add( c ) ).mul( 0.15 ).sub( 0.2 );
		return vec3( x, base.add( a.y.mul( a.y ).mul( 1.9 ) ), z );

	},
	color: ( { a, t } ) => {

		const rays = mx_noise_float( vec3( a.x.mul( 14 ), t.mul( 0.35 ), a.z.mul( 3 ) ) ).mul( 0.5 ).add( 0.5 );
		const edge = smoothstep( 0, 0.06, a.y ).mul( smoothstep( 1, 0.3, a.y ) );
		return gradient( a.y, [ 0x3dff8f, 0x1fd6a0, 0x7b3cff, 0xff4fd8 ] ).mul( rays.mul( rays ).mul( 1.8 ).add( 0.08 ) ).mul( edge );

	},
	alpha: 0.3,
	size: 0.012
} );

// 13 Lightning: five branching channels, each flashing on its own clock and lighting its cloud base.
const BOLT_SEGS = [];
for ( let bolt = 0; bolt < 5; bolt ++ ) {

	const phase = bolt / 5 + rand( 0, 0.08 );
	const grow = ( start, dx, depth ) => {

		let cur = start;
		for ( let k = 0; k < ( depth ? 9 : 30 ) && cur[ 1 ] > - 1.7; k ++ ) {

			const next = [ cur[ 0 ] + dx * 0.13 + gauss() * 0.06, cur[ 1 ] - 0.12, cur[ 2 ] + gauss() * 0.04 ];
			BOLT_SEGS.push( [ cur, next, phase, depth ] );
			if ( depth < 2 && Math.random() < 0.13 ) grow( next, dx + gauss() * 0.7, depth + 1 );
			cur = next;

		}

	};

	grow( [ rand( - 2, 2 ), 1.7, rand( - 0.5, 0.5 ) ], gauss() * 0.2, 0 );

}

const lightning = defineScene( {
	meta: {
		title: { ko: '번개', en: 'Lightning' },
		ref: { ko: '구름과 땅 사이 전위차가 갈라지는 방전 경로로 한순간에 터진다', en: 'Charge between cloud and ground bursts along a branching discharge path' }
	},
	camera: [ 0, 0, 5.2 ],
	count: 120_000,
	init( i, n ) {

		const [ p, q, phase, depth ] = BOLT_SEGS[ Math.floor( Math.random() * BOLT_SEGS.length ) ];
		if ( i < n * 0.25 ) return [ p[ 0 ] + gauss() * 0.7, rand( 1.6, 2.2 ), gauss() * 0.5, phase, 1, 0 ]; // cloud base
		const s = Math.random(), j = 0.008 * ( 1 + depth );
		return [ p[ 0 ] + ( q[ 0 ] - p[ 0 ] ) * s + gauss() * j, p[ 1 ] + ( q[ 1 ] - p[ 1 ] ) * s, p[ 2 ] + ( q[ 2 ] - p[ 2 ] ) * s + gauss() * j, phase, 0, depth ];

	},
	position: ( { a } ) => a,
	color: ( { b, t } ) => {

		const f = fract( t.mul( 0.4 ).add( b.x ) );
		const strike = exp( f.mul( - 9 ) ).mul( sin( f.mul( 90 ) ).mul( 0.4 ).add( 0.6 ) );
		const bolt = mix( color( 0xc9b8ff ), color( 0xffffff ), step( b.z, 0.5 ) ).mul( strike.mul( 2.2 ) ).mul( b.z.mul( - 0.3 ).add( 1 ) );
		const cloud = mix( color( 0x221d38 ), color( 0x9d8cff ), strike ).mul( strike.add( 0.12 ) );
		return mix( bolt, cloud, b.y );

	},
	alpha: 0.45,
	size: 0.011
} );

// 14 Tornado: funnel spinning faster as it narrows, debris skirt at the ground.
const tornado = defineScene( {
	meta: {
		title: { ko: '토네이도', en: 'Tornado' },
		ref: { ko: '좁아질수록 빨라지는 회전 기둥이 땅의 잔해를 감아올린다', en: 'A rotating column that spins faster as it narrows, lifting debris from the ground' }
	},
	camera: [ 0, 0, 5.4 ],
	count: 160_000,
	init: ( i, n ) => i < n * 0.82
		? [ Math.random(), rand( 0, TAU ), Math.abs( gauss() ) * 0.06, 0, Math.random() ]
		: [ Math.random(), rand( 0, TAU ), rand( 0.3, 1.4 ), 1, Math.random() ],
	position: ( { a, b, t } ) => {

		const isDebris = b.x;
		const y = mix( fract( a.x.add( t.mul( 0.12 ) ) ), fract( a.x.add( t.mul( 0.3 ) ) ).mul( 0.25 ), isDebris );
		const r = mix( y.mul( y ).mul( 1.1 ).add( 0.1 ).add( a.z ), a.z.mul( y.mul( 1.5 ).add( 0.6 ) ), isDebris );
		// Rankine-like vortex: tangential speed ~ 1/r outside the core, so angular speed ~ 1/r^2.
		const th = a.y.add( t.mul( 0.35 ).div( r.mul( r ).add( 0.04 ) ) );
		const wobble = sin( y.mul( 3.5 ).add( t.mul( 0.6 ) ) ).mul( 0.25 ).mul( y.oneMinus() );
		// z = -sin: counter-clockwise seen from above, i.e. cyclonic (Northern Hemisphere).
		return vec3( cos( th ).mul( r ).add( wobble ), y.mul( 3.4 ).sub( 1.7 ), sin( th ).mul( r ).mul( - 1 ) );

	},
	color: ( { a, b, t } ) => {

		const bands = mx_noise_float( vec3( a.y.mul( 2 ), a.x.mul( 6 ).sub( t.mul( 0.5 ) ), 0 ) ).mul( 0.5 ).add( 0.6 );
		// Updraft carries matter up and out of the top; fade there instead of popping back to the ground.
		const y = mix( fract( a.x.add( t.mul( 0.12 ) ) ), fract( a.x.add( t.mul( 0.3 ) ) ), b.x );
		return mix( gradient( a.x, [ 0x3a2a1c, 0x6d6a6a, 0xb9bcc6 ] ).mul( bands ), color( 0xb5732f ), b.x ).mul( smoothstep( 1, 0.85, y ) );

	},
	alpha: 0.3,
	size: 0.011
} );

// 15 Hurricane: spiral rain bands and an eyewall seen from orbit, inner bands rotating faster.
const hurricane = defineScene( {
	meta: {
		title: { ko: '허리케인', en: 'Hurricane' },
		ref: { ko: '따뜻한 바다 위에서 나선 구름 띠가 고요한 눈을 감싸고 돈다', en: 'Over warm sea, spiral cloud bands wheel around a calm eye' }
	},
	camera: [ 0, 5.2, 1.4 ],
	count: 170_000,
	init( i, n ) {

		if ( i < n * 0.12 ) return [ rand( - 3.2, 3.2 ), - 0.3, rand( - 3.2, 3.2 ), 1 ]; // ocean
		for ( ;; ) {

			const r = 0.22 + Math.pow( Math.random(), 0.7 ) * 2.4, th = rand( 0, TAU );
			const band = 0.5 + 0.5 * Math.cos( 2 * th + 4 * Math.log( r ) );
			const wall = Math.exp( - ( ( r - 0.35 ) ** 2 ) / 0.004 );
			if ( Math.random() < band * 0.85 * Math.exp( - r * 0.25 ) + wall + 0.04 ) return [ r, th, gauss() * 0.04, 0, wall ];

		}

	},
	position: ( { a, b, t } ) => {

		// Rain bands are a quasi-steady pattern: rotating them differentially would wind them up into noise
		// within a minute. The pattern turns rigidly; the axisymmetric eyewall (b.y) spins faster.
		const th = a.y.add( t.mul( b.y.mul( 0.9 ).add( 0.18 ) ) );
		const cloud = vec3( cos( th ).mul( a.x ), a.z.add( exp( a.x.mul( - 1.2 ) ).mul( 0.25 ) ), sin( th ).mul( a.x ).mul( - 1 ) );
		return mix( cloud, a, b.x );

	},
	color: ( { a, b } ) => {

		const cloud = gradient( smoothstep( 2.6, 0.3, a.x ), [ 0x5a7fa8, 0xcfe6ff, 0xffffff ] ).mul( b.y.mul( 0.8 ).add( 0.6 ) );
		return mix( cloud, color( 0x05224a ).mul( 0.5 ), b.x );

	},
	alpha: 0.3,
	size: 0.012
} );

// 16 Cumulus: a towering cloud of puffs, boiling slowly, lit from the upper right.
const PUFFS = Array.from( { length: 48 }, () => {

	const y = - 0.9 + Math.pow( Math.random(), 1.3 ) * 1.9;
	const spread = 1 - ( y + 0.9 ) / 2.4;
	return [ gauss() * 0.8 * spread, y, gauss() * 0.4 * spread, rand( 0.22, 0.48 ) * ( 0.6 + spread * 0.6 ) ];

} );

const cumulus = defineScene( {
	meta: {
		title: { ko: '적운', en: 'Cumulus' },
		ref: { ko: '상승 기류를 타고 부풀어 오르는 뭉게구름 덩어리', en: 'Billowing cloud towers inflated by rising thermals' }
	},
	camera: [ 0, 0.1, 4.6 ],
	count: 170_000,
	init() {

		const [ cx, cy, cz, r ] = PUFFS[ Math.floor( Math.random() * PUFFS.length ) ];
		let x = gauss(), y = gauss(), z = gauss();
		const l = Math.hypot( x, y, z ) || 1;
		x /= l; y /= l; z /= l;
		const d = r * ( 0.75 + 0.25 * Math.random() );
		return [ cx + x * d, cy + y * d, cz + z * d, x, y, z, Math.random() ];

	},
	position: ( { a, t } ) => {

		// Cumulus have flat bases at the lifting condensation level; only the tops billow.
		const p = a.add( mx_noise_vec3( a.mul( 1.6 ).add( vec3( 0, t.mul( 0.12 ), 0 ) ) ).mul( 0.07 ) );
		return vec3( p.x, max( p.y, - 0.95 ), p.z );

	},
	color: ( { a, b } ) => {

		const light = b.x.mul( 0.5 ).add( b.y.mul( 0.8 ) ).add( b.z.mul( 0.3 ) );
		const shade = smoothstep( - 0.7, 1, light ).mul( smoothstep( - 1, 0.8, a.y ).mul( 0.5 ).add( 0.5 ) );
		return mix( color( 0x3c4170 ), color( 0xf2f4ff ), shade ).add( color( 0xffc27a ).mul( smoothstep( 0.75, 1, light ).mul( 0.4 ) ) );

	},
	alpha: 0.22,
	size: 0.013
} );

// 17 Monsoon: slanted rain streaks over a puddled ground that sparkles with impacts.
const sr = ( n ) => {

	const x = Math.sin( n * 12.9898 ) * 43758.5453;
	return x - Math.floor( x );

};

const monsoon = defineScene( {
	meta: {
		title: { ko: '몬순', en: 'Monsoon' },
		ref: { ko: '계절풍이 실어 온 수증기가 비스듬한 장대비로 쏟아진다', en: 'Seasonal winds deliver moisture as heavy, slanting rain' }
	},
	camera: [ 0, 0.2, 4.6 ],
	count: 150_000,
	init( i, n ) {

		if ( i < n * 0.15 ) return [ rand( - 3, 3 ), - 1.5, rand( - 2.5, 1.5 ), 0, Math.random(), 1 ];
		const d = Math.floor( i / 6 ), s = ( i % 6 ) / 5;
		return [ sr( d ) * 6 - 3, sr( d + 0.5 ) * 4, sr( d + 0.25 ) * 4 - 2.5, s, sr( d + 0.75 ), 0 ];

	},
	position: ( { a, b, t } ) => {

		const speed = b.y.mul( 1.5 ).add( 3.5 );
		// Gusting wind: slant(t) is the horizontal/vertical speed ratio, so drift is its time integral
		// (multiplying slant(t) by t would make horizontal speed grow without bound).
		const slant = sin( t.mul( 0.3 ) ).mul( 0.1 ).add( 0.35 );
		const drift = t.mul( 0.35 ).sub( cos( t.mul( 0.3 ) ).mul( 0.1 / 0.3 ) );
		const y = mod( a.y.sub( t.mul( speed ) ), 4 ).sub( 1.5 );
		const x = mod( a.x.add( 3 ).add( drift.mul( speed ) ), 6 ).sub( 3 );
		const drop = vec3( x.sub( slant.mul( b.x ).mul( 0.2 ) ), y.add( b.x.mul( 0.2 ) ), a.z );
		return mix( drop, a, b.z );

	},
	color: ( { b, t } ) => {

		const drop = color( 0x9fb4d8 ).mul( b.x.oneMinus().mul( 0.6 ).add( 0.4 ) );
		const splash = mix( color( 0x0f1a2a ), color( 0x5fd3ff ), smoothstep( 0.9, 1, fract( t.mul( 0.8 ).add( b.y.mul( 7 ) ) ) ) );
		return mix( drop, splash, b.z );

	},
	alpha: 0.35,
	size: 0.01
} );

// 18 Snowfall: flakes fluttering down at different speeds onto a soft blanket.
const snowfall = defineScene( {
	meta: {
		title: { ko: '눈 내림', en: 'Snowfall' },
		ref: { ko: '가벼운 눈송이가 공기의 흐름에 흔들리며 천천히 쌓인다', en: 'Light flakes flutter on the air and slowly settle into a blanket' }
	},
	camera: [ 0, 0, 4.8 ],
	count: 7_000,
	init: ( i, n ) => i < n * 0.2
		? ( ( x, z ) => [ x, - 1.6 + 0.15 * Math.sin( x * 1.3 ) * Math.cos( z * 1.1 ) + gauss() * 0.02, z, 0, 0, 1 ] )( rand( - 3.2, 3.2 ), rand( - 2.5, 1.5 ) )
		: [ rand( - 3.2, 3.2 ), rand( 0, 4 ), rand( - 2.5, 1.5 ), Math.random(), Math.random(), 0 ],
	position: ( { a, b, t } ) => {

		const y = mod( a.y.sub( t.mul( b.x.mul( 0.35 ).add( 0.2 ) ) ), 4 ).sub( 1.6 );
		const flake = vec3(
			a.x.add( sin( t.mul( b.y.add( 0.8 ) ).add( b.x.mul( TAU ) ) ).mul( 0.18 ) ),
			y,
			a.z.add( cos( t.mul( 0.7 ).add( b.y.mul( TAU ) ) ).mul( 0.12 ) )
		);
		return mix( flake, a, b.z );

	},
	color: ( { b } ) => mix( color( 0xf4f8ff ).mul( b.x.mul( 0.5 ).add( 0.5 ) ), color( 0x8fb0d8 ).mul( 0.45 ), b.z ),
	alpha: 0.55,
	size: 0.05
} );

// 19 Jet Stream: two meandering westerly bands (Rossby waves) racing around a dim globe.
const jetStream = defineScene( {
	meta: {
		title: { ko: '제트 기류', en: 'Jet Stream' },
		ref: { ko: '중위도 상공의 강한 서풍이 로스비 파로 굽이치며 지구를 감싼다', en: 'Fast westerlies high over the mid-latitudes meander around the planet as Rossby waves' }
	},
	camera: [ 0, 1.6, 4.8 ],
	count: 170_000,
	init( i, n ) {

		if ( i < n * 0.35 ) {

			const y = rand( - 1, 1 ), r = Math.sqrt( 1 - y * y ), th = rand( 0, TAU );
			return [ Math.cos( th ) * r * 1.6, y * 1.6, Math.sin( th ) * r * 1.6, 0 ];

		}

		return [ rand( 0, TAU ), Math.random() < 0.5 ? - 1 : 1, gauss() * 0.05, 1, Math.random() ];

	},
	position: ( { a, b, t } ) => {

		const lon = a.x.add( t.mul( b.y.mul( 0.15 ).add( 0.35 ) ) );
		const lat = a.y.mul( 0.8 ).add( sin( lon.mul( 5 ).sub( t.mul( 0.3 ) ) ).mul( 0.22 ) ).add( a.z );
		// z = -sin(lon): increasing longitude is eastward (counter-clockwise seen from the north pole), so the westerlies flow west to east.
		const stream = vec3( cos( lat ).mul( cos( lon ) ), sin( lat ), cos( lat ).mul( sin( lon ) ).mul( - 1 ) ).mul( 1.75 );
		return mix( a, stream, b.x );

	},
	color: ( { a, b, t } ) => {

		const land = step( 0.15, mx_noise_float( a.mul( 1.2 ) ) );
		const globe = mix( color( 0x0a1c3a ), color( 0x1f4a32 ), land ).mul( 0.5 );
		const lon = a.x.add( t.mul( b.y.mul( 0.15 ).add( 0.35 ) ) );
		const pulse = smoothstep( 0.6, 1, fract( lon.mul( 3 ).sub( t ) ) );
		return mix( globe, mix( color( 0xff4f6d ), color( 0xffb547 ), pulse ).mul( pulse.add( 0.35 ) ), b.x );

	},
	alpha: 0.35,
	size: 0.011
} );

// 20 Valley Fog: a low layer of mist creeping along a valley floor, hidden where the hills rise above it.
const ridgeJS = ( x, z ) => 0.16 * x * x - 0.9 + 0.12 * Math.sin( z * 1.4 + x * 0.5 );
const ridge = ( x, z ) => x.mul( x ).mul( 0.16 ).sub( 0.9 ).add( sin( z.mul( 1.4 ).add( x.mul( 0.5 ) ) ).mul( 0.12 ) );

const valleyFog = defineScene( {
	meta: {
		title: { ko: '안개', en: 'Valley Fog' },
		ref: { ko: '밤새 식은 공기가 골짜기 바닥에 고여 낮은 안개층으로 흐른다', en: 'Air cooled overnight pools on the valley floor and drifts as a low fog' }
	},
	camera: [ 0, 0.6, 4.6 ],
	count: 160_000,
	init( i, n ) {

		const x = rand( - 3, 3 ), z = rand( - 3, 2 );
		return i < n * 0.45 ? [ x, ridgeJS( x, z ), z, 0 ] : [ x, - 0.85 + Math.random() ** 2 * 0.45, z, 1, Math.random() ];

	},
	position: ( { a, b, t } ) => {

		const z = mod( a.z.add( 3 ).add( t.mul( 0.1 ) ), 5 ).sub( 3 );
		const x = a.x.add( mx_noise_float( vec3( a.x, a.z, t.mul( 0.05 ) ) ).mul( 0.15 ) );
		const fog = vec3( x, a.y.add( sin( x.mul( 2 ).add( t.mul( 0.3 ) ) ).mul( 0.03 ) ), z );
		return mix( a, fog, b.x );

	},
	color: ( { a, b, t } ) => {

		const z = mod( a.z.add( 3 ).add( t.mul( 0.1 ) ), 5 ).sub( 3 );
		// Fade at the ends of the drift window so wrapped fog does not pop in and out.
		const visible = smoothstep( 0, 0.12, a.y.sub( ridge( a.x, z ) ) ).mul( smoothstep( - 3, - 2.4, z ) ).mul( smoothstep( 2, 1.4, z ) );
		const density = mx_noise_float( vec3( a.x.mul( 1.2 ), z.mul( 1.2 ), t.mul( 0.08 ) ) ).mul( 0.5 ).add( 0.5 );
		const fog = mix( color( 0xffd9c2 ), color( 0xc9c3ff ), smoothstep( - 0.85, - 0.4, a.y ) ).mul( density ).mul( visible );
		const land = mix( color( 0x0f1716 ), color( 0x3b5a4a ), smoothstep( - 0.6, 0.6, a.y ) ).mul( 0.6 );
		return mix( land, fog, b.x );

	},
	alpha: 0.3,
	size: 0.013
} );

export default [ windPainting, aurora, lightning, tornado, hurricane, cumulus, monsoon, snowfall, jetStream, valleyFog ];
