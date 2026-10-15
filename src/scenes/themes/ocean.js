// Theme 3: Ocean & Water — seas, currents and freshwater.
import { vec3, float, sin, cos, mix, fract, mod, step, smoothstep, exp, max, min, pow, log, sqrt, color, mx_noise_float, mx_noise_vec3 } from 'three/tsl';
import { defineScene, gradient, TAU, rand } from '../../lib/defineScene.js';
import { gauss } from '../../lib/points.js';
import * as coralDreams from '../coralDreams.js';

// 22 Ocean Swell: sum of Gerstner waves; crests sharpen and whiten.
const WAVES = [ [ 1, 0.2, 1.1, 0.18 ], [ 0.7, 0.7, 1.7, 0.09 ], [ - 0.3, 1, 2.6, 0.05 ], [ 0.9, - 0.4, 3.4, 0.03 ] ]
	.map( ( [ dx, dz, k, A ] ) => {

		const l = Math.hypot( dx, dz );
		return [ dx / l, dz / l, k, A, Math.sqrt( 9.8 * k ) * 0.5 ];

	} );

const gerstner = ( a, t ) => WAVES.reduce( ( p, [ dx, dz, k, A, w ] ) => {

	const ph = a.x.mul( dx ).add( a.z.mul( dz ) ).mul( k ).sub( t.mul( w ) );
	return p.add( vec3( cos( ph ).mul( dx * A * 0.6 ), sin( ph ).mul( A ), cos( ph ).mul( dz * A * 0.6 ) ) );

}, vec3( a.x, 0, a.z ) );

const oceanSwell = defineScene( {
	meta: {
		title: { ko: '너울', en: 'Ocean Swell' },
		ref: { ko: '먼바다에서 온 긴 파장의 물결이 해수면을 들어 올린다', en: 'Long-period waves from distant storms lift and roll the sea surface' }
	},
	camera: [ 0, 1.1, 4.2 ],
	count: 160_000,
	init: ( i ) => [ ( ( i % 400 ) / 399 - 0.5 ) * 8, 0, ( Math.floor( i / 400 ) / 399 - 0.5 ) * 8 - 1 ],
	position: ( { a, t } ) => gerstner( a, t ),
	color: ( { a, t } ) => gradient( smoothstep( - 0.25, 0.3, gerstner( a, t ).y ), [ 0x02122b, 0x0a4f7a, 0x2fc4c9, 0xeafcff ] ),
	alpha: 0.3,
	size: 0.012
} );

// 23 Maelstrom: water spirals inward and down a funnel, faster near the throat.
// Sink + free vortex: radial inflow u_r = -Q/r gives r^2 = R0^2 - 2Q t (accelerating toward the throat),
// tangential v = G/r (angular speed G/r^2). Streamlines are log spirals: th = th0 - (G/Q) ln(r/R0).
// The free surface of a free vortex dips as 1/r^2 (the y term).
const R0 = 2.6, R1 = 0.2, SPIRAL = 6;
const swirl = ( a, t ) => {

	const f = fract( a.x.add( t.mul( 0.04 ) ) );
	const r = sqrt( f.mul( R1 * R1 - R0 * R0 ).add( R0 * R0 ) );
	const th = a.y.sub( log( r.div( R0 ) ).mul( SPIRAL ) );
	const y = float( - 1.4 ).div( r.mul( r ).div( 0.2 ).add( 1 ) );
	return { r, th, y, f };

};

const maelstrom = defineScene( {
	meta: {
		title: { ko: '소용돌이', en: 'Maelstrom' },
		ref: { ko: '조류가 엇갈리는 해협에서 바닷물이 깔때기처럼 빨려 든다', en: 'Where tides collide, the sea is drawn down into a spinning funnel' }
	},
	camera: [ 0, 2.6, 3.8 ],
	count: 170_000,
	init: () => [ Math.random(), rand( 0, TAU ), 0 ],
	position: ( { a, t } ) => {

		const { r, th, y } = swirl( a, t );
		return vec3( cos( th ).mul( r ), y, sin( th ).mul( r ) );

	},
	color: ( { a, t } ) => {

		const { r, th, y, f } = swirl( a, t );
		const k = th.add( r.mul( 2.5 ) );
		const foam = smoothstep( 0.3, 0.7, mx_noise_float( vec3( cos( k ).mul( r ).mul( 2 ), sin( k ).mul( r ).mul( 2 ), 0.3 ) ) );
		// Water vanishes down the throat and enters at the rim: fade both ends instead of teleporting.
		return mix( mix( color( 0x061a24 ), color( 0x0e5a50 ), smoothstep( - 1.2, 0, y ) ), color( 0xdffcf5 ), foam.mul( 0.8 ) )
			.mul( smoothstep( 0, 0.04, f ).mul( smoothstep( 1, 0.9, f ) ) );

	},
	alpha: 0.3,
	size: 0.011
} );

// 24 Waterfall: a river spills off a cliff lip, falls ballistically and bursts into spray.
const part = ( b, k ) => step( k - 0.5, b.x ).mul( step( b.x, k + 0.5 ) );

const waterfall = defineScene( {
	meta: {
		title: { ko: '폭포', en: 'Waterfall' },
		ref: { ko: '절벽 끝을 넘은 강물이 포물선으로 떨어져 물보라로 부서진다', en: 'A river leaps the cliff edge, falls in arcs and shatters into spray' }
	},
	camera: [ 2.2, 0.2, 4.4 ],
	count: 170_000,
	init( i, n ) {

		const u = i / n;
		if ( u < 0.25 ) {

			const x = rand( - 1.8, 1.8 ), y = rand( - 1.6, 1.5 );
			return [ x, y, - 0.2 - Math.abs( Math.sin( x * 5 + y * 3 ) ) * 0.12 - Math.random() * 0.06, 0 ]; // cliff

		}

		if ( u < 0.75 ) return [ rand( - 0.7, 0.7 ), 0, 0, 1, Math.random() ]; // falling curtain
		if ( u < 0.9 ) return [ rand( - 0.8, 0.8 ), 0, 0.73, 2, Math.random(), rand( 0, TAU ), rand( 0.3, 1 ) ]; // spray where the curtain lands
		return [ rand( - 0.7, 0.7 ), 1.5, rand( 0, 1.7 ), 3, Math.random() ]; // river on top

	},
	position: ( { a, b, t } ) => {

		const s = fract( t.mul( 0.35 ).add( b.y ) );
		// Ballistic: constant horizontal speed equal to the river's speed at the lip (0.25/s), parabolic drop.
		const fall = vec3( a.x.mul( s.mul( 0.15 ).add( 1 ) ), s.mul( s ).mul( - 3.1 ).add( 1.5 ), s.mul( 0.25 / 0.35 ).add( 0.02 ) );
		const q = fract( t.mul( 0.6 ).add( b.y ) );
		const spray = vec3( a.x.add( cos( b.z ).mul( b.w ).mul( q ) ), q.mul( 1.2 ).sub( q.mul( q ).mul( 1.6 ) ).sub( 1.6 ), a.z.add( sin( b.z ).mul( b.w ).mul( q ).mul( 0.6 ) ) );
		const river = vec3( a.x, 1.5, mod( a.z.add( t.mul( 0.25 ) ), 1.7 ).sub( 1.68 ) );
		return a.mul( part( b, 0 ) ).add( fall.mul( part( b, 1 ) ) ).add( spray.mul( part( b, 2 ) ) ).add( river.mul( part( b, 3 ) ) );

	},
	color: ( { a, b, t } ) => {

		const rock = color( 0x2a1d17 ).mul( mx_noise_float( a.mul( 3 ) ).mul( 0.4 ).add( 0.6 ) );
		const s = fract( t.mul( 0.35 ).add( b.y ) );
		const fall = mix( color( 0x4f8fd8 ), color( 0xf0fbff ), s );
		return rock.mul( part( b, 0 ) ).add( fall.mul( part( b, 1 ) ) )
			// Spray droplets fall back into the pool: fade as they return to the surface.
			.add( color( 0xbfeeff ).mul( smoothstep( 1, 0.75, fract( t.mul( 0.6 ).add( b.y ) ) ).mul( 0.7 ) ).mul( part( b, 2 ) ) ).add( color( 0x2f6fb8 ).mul( part( b, 3 ) ) );

	},
	alpha: 0.32,
	size: 0.012
} );

// 25 Jellyfish: five bells pulsing as they drift upward, tentacles trailing in their wake.
const JELLIES = Array.from( { length: 5 }, ( _, j ) => [ ( j - 2 ) * 1.1 + gauss() * 0.2, rand( 0, 4.4 ), gauss() * 0.6, rand( 0, TAU ) ] );

const jellyfish = defineScene( {
	meta: {
		title: { ko: '해파리', en: 'Jellyfish' },
		ref: { ko: '갓을 오므렸다 펴는 박동으로 물을 밀어내며 떠오르는 해파리', en: 'Jellyfish rise by squeezing water out of their pulsing bells' }
	},
	camera: [ 0, 0, 5 ],
	count: 130_000,
	init() {

		const jelly = JELLIES[ Math.floor( Math.random() * JELLIES.length ) ];
		if ( Math.random() < 0.55 ) {

			let x = gauss(), y = Math.abs( gauss() ), z = gauss();
			const l = Math.hypot( x, y, z ) || 1;
			y = Math.max( y / l, 0.02 );
			return [ x / l, y, z / l, ...jelly ];

		}

		const th = Math.floor( rand( 0, 12 ) ) / 12 * TAU;
		return [ Math.cos( th ), - rand( 0.001, 1 ), Math.sin( th ), ...jelly ];

	},
	position: ( { a, b, t } ) => {

		const pulse = sin( t.mul( 2.2 ).add( b.w ) );
		const R = pulse.mul( 0.12 ).add( 1 ).mul( 0.32 );
		const squeeze = pulse.mul( 0.15 ).mul( a.y.oneMinus() ).add( 1 );
		const bell = vec3( a.x.mul( R ).mul( squeeze ), a.y.mul( R ).mul( 0.75 ), a.z.mul( R ).mul( squeeze ) );
		const s = a.y.mul( - 1 );
		const tentacle = vec3(
			a.x.mul( R ).mul( 0.9 ).add( sin( s.mul( 7 ).sub( t.mul( 2 ) ).add( b.w ) ).mul( 0.06 ).mul( s ) ),
			s.mul( - 1.3 ),
			a.z.mul( R ).mul( 0.9 ).add( cos( s.mul( 6 ).sub( t.mul( 1.7 ) ).add( b.w ) ).mul( 0.06 ).mul( s ) )
		);
		// Jet propulsion: the bell surges upward while contracting (pulse = -1), coasts while relaxing.
		// Wrap well outside the frame so neither bell nor tentacles pop.
		const center = vec3( b.x, mod( b.y.add( t.mul( 0.1 ) ).add( cos( t.mul( 2.2 ).add( b.w ) ).mul( 0.04 ) ), 6.4 ).sub( 3.2 ), b.z );
		return mix( bell, tentacle, step( a.y, 0 ) ).add( center );

	},
	color: ( { a } ) => {

		const bell = mix( color( 0x7ff5ff ), color( 0xb44cff ), smoothstep( 0, 0.8, a.y ) );
		const tentacle = color( 0xff9ad5 ).mul( a.y.add( 1 ).mul( 0.6 ) );
		return mix( bell, tentacle, step( a.y, 0 ) );

	},
	alpha: 0.35,
	size: 0.011
} );

// 26 Bioluminescence: a night wave rolls ashore; plankton flare blue where the crest churns them.
const crest = ( z, t ) => z.sub( mod( t.mul( 0.55 ), 4.5 ).sub( 3 ) );

const bioluminescence = defineScene( {
	meta: {
		title: { ko: '발광 플랑크톤', en: 'Bioluminescence' },
		ref: { ko: '밤바다의 플랑크톤이 파도에 휘저어질 때마다 푸르게 빛난다', en: 'Night-sea plankton flash blue whenever a breaking wave stirs them' }
	},
	camera: [ 0, 2.4, 3.4 ],
	count: 170_000,
	init: ( i, n ) => i < n * 0.72
		? [ rand( - 3.5, 3.5 ), - 0.2, rand( - 3, 1.3 ), 0 ]
		: ( ( z ) => [ rand( - 3.5, 3.5 ), - 0.25 + ( z - 1.2 ) * 0.12 + gauss() * 0.01, z, 1 ] )( rand( 1.2, 2.6 ) ),
	position: ( { a, b, t } ) => {

		const d = crest( a.z, t );
		// Shoaling: the wave grows as the water shallows, then breaks and collapses before the beach.
		const amp = smoothstep( - 3, 0.4, a.z ).mul( smoothstep( 1.3, 0.5, a.z ) ).mul( 0.26 ).add( 0.03 );
		const y = a.y.add( exp( d.mul( d ).mul( - 6 ) ).mul( amp ) ).add( sin( a.x.mul( 3 ).add( t ) ).mul( 0.02 ) );
		return mix( vec3( a.x, y, a.z ), a, b.x );

	},
	color: ( { a, b, t } ) => {

		const d = crest( a.z, t );
		const trail = exp( d.mul( 2.5 ) ).mul( step( d, 0 ) );
		const sparkle = smoothstep( 0, 0.5, mx_noise_float( vec3( a.x.mul( 6 ), a.z.mul( 6 ), t.mul( 0.8 ) ) ) );
		const glow = exp( d.mul( d ).mul( - 10 ) ).add( trail.mul( 0.6 ) ).mul( sparkle.mul( 1.5 ).add( 0.2 ) ).add( sparkle.mul( 0.25 ) );
		const water = mix( color( 0x0b2a4a ), color( 0x3ff0ff ), min( glow, 1 ) ).add( color( 0x1c7bff ).mul( glow.mul( 0.4 ) ) );
		return mix( water, color( 0x1a1712 ).mul( 0.5 ), b.x );

	},
	alpha: 0.35,
	size: 0.011
} );

// 27 Fish School: a bait ball circling as a filled torus, scales glinting as fish turn.
const fishSchool = defineScene( {
	meta: {
		title: { ko: '물고기 떼', en: 'Fish School' },
		ref: { ko: '포식자를 피해 수천 마리가 하나의 회전하는 공처럼 뭉친다', en: 'Thousands of fish close ranks into one rotating ball against predators' }
	},
	camera: [ 0, 1.2, 4 ],
	count: 120_000,
	init: () => [ rand( 0, TAU ), rand( 0, TAU ), Math.sqrt( Math.random() ) * 0.4, 1 + gauss() * 0.12, Math.random() ],
	position: ( { a, b, t } ) => {

		const phi = a.x.add( t.mul( b.y.mul( 0.15 ).add( 0.6 ) ) );
		// Fish mill around the ring; they drift slowly across the tube rather than looping through it.
		const psi = a.y.add( t.mul( 0.2 ) );
		const ring = b.x.add( cos( psi ).mul( a.z ) );
		return vec3( cos( phi ).mul( ring ), sin( psi ).mul( a.z ).mul( 0.8 ).add( sin( phi.mul( 2 ).add( t.mul( 0.5 ) ) ).mul( 0.15 ) ), sin( phi ).mul( ring ) );

	},
	color: ( { a, b, t } ) => {

		const phi = a.x.add( t.mul( b.y.mul( 0.15 ).add( 0.6 ) ) );
		const glint = pow( max( sin( phi.mul( 3 ).add( a.y ).sub( t.mul( 2 ) ) ), 0 ), 8 );
		return color( 0x2a5f8f ).mul( 0.6 ).add( color( 0xe8f4ff ).mul( glint.mul( 1.4 ) ) );

	},
	alpha: 0.35,
	size: 0.012,
	spin: 0.05
} );

// 28 Iceberg: a bobbing berg, small above the waterline and massive beneath.
const iceberg = defineScene( {
	meta: {
		title: { ko: '빙산', en: 'Iceberg' },
		ref: { ko: '수면 위로 드러난 것은 일부일 뿐, 몸체 대부분은 물 아래 잠겨 있다', en: 'Only a fraction shows above the waterline; most of the mass lies beneath' }
	},
	camera: [ 0, 0.5, 5 ],
	count: 160_000,
	init( i, n ) {

		if ( i < n * 0.3 ) return [ rand( - 3.2, 3.2 ), 0, rand( - 3.2, 3.2 ), 1 ];
		let x = gauss(), y = gauss(), z = gauss();
		const l = Math.hypot( x, y, z ) || 1;
		x /= l; y /= l; z /= l;
		const r = ( 1 + 0.2 * Math.sin( 3 * x + 1 ) * Math.sin( 2.5 * z ) + 0.1 * Math.sin( 5 * y + 2 ) ) * Math.cbrt( 0.6 + 0.4 * Math.random() );
		// Ice (917 kg/m^3) in seawater (1025 kg/m^3): about 10% of the volume floats above the waterline.
		const up = y > 0 ? 0.22 * ( 1 + 0.8 * Math.max( 0, Math.sin( x * 4 + z * 2 ) ) ) : 1.7;
		return [ x * r * 0.9, y * r * up, z * r * 0.6, 0 ];

	},
	position: ( { a, b, t } ) => {

		const berg = a.add( vec3( 0, sin( t.mul( 0.5 ) ).mul( 0.04 ), 0 ) );
		const water = vec3( a.x, sin( a.x.mul( 2 ).add( t ) ).mul( 0.02 ).add( cos( a.z.mul( 2.3 ).add( t.mul( 0.8 ) ) ).mul( 0.02 ) ), a.z );
		return mix( berg, water, b.x );

	},
	color: ( { a, b } ) => {

		const above = color( 0xeaf6ff ).mul( 0.9 );
		const below = color( 0x2fb7c9 ).mul( exp( a.y.mul( 0.9 ) ) );
		return mix( mix( below, above, step( 0, a.y ) ), color( 0x0b3a66 ).mul( 0.4 ), b.x );

	},
	alpha: 0.3,
	size: 0.012,
	spin: 0.04
} );

// 29 Hydrothermal Vent: a mineral chimney on the abyssal floor venting a turbulent plume, tube worms at its foot.
const BASE = - 1.9;

const hydrothermalVent = defineScene( {
	meta: {
		title: { ko: '열수 분출공', en: 'Hydrothermal Vent' },
		ref: { ko: '심해저 굴뚝이 광물을 머금은 뜨거운 물을 연기처럼 뿜어 생태계를 먹인다', en: 'A deep-sea chimney vents hot, mineral-laden water that feeds a whole ecosystem' }
	},
	camera: [ 0, 0.3, 5.2 ],
	count: 150_000,
	init( i, n ) {

		const u = i / n;
		if ( u < 0.3 ) {

			const h = Math.random(), th = rand( 0, TAU ), r = 0.25 * ( 1 - h * 0.4 ) + Math.abs( Math.sin( th * 5 + h * 9 ) ) * 0.05;
			return [ Math.cos( th ) * r, BASE + h * 1.5, Math.sin( th ) * r, 0 ];

		}

		if ( u < 0.85 ) return [ rand( 0, TAU ), Math.sqrt( Math.random() ), 0, 1, Math.random() ];
		const th = rand( 0, TAU ), r = rand( 0.35, 0.9 );
		return [ Math.cos( th ) * r, Math.random(), Math.sin( th ) * r, 2, Math.random() ];

	},
	position: ( { a, b, t } ) => {

		const s = fract( t.mul( 0.12 ).add( b.y ) );
		// Buoyant plume: rise slows as it entrains cold water (~s^0.6), width grows linearly,
		// the bottom current bends it at a steady speed.
		const spread = s.mul( 0.9 ).add( 0.08 ).mul( a.y );
		const plume = vec3( cos( a.x ).mul( spread ).add( s.mul( 0.45 ) ), pow( s, 0.6 ).mul( 3.4 ).add( BASE + 1.5 ), sin( a.x ).mul( spread ) )
			.add( mx_noise_vec3( vec3( s.mul( 4 ), a.x, t.mul( 0.2 ) ) ).mul( s.mul( 0.4 ) ) );
		const worm = vec3( a.x.add( sin( t.mul( 1.5 ).add( b.y.mul( TAU ) ) ).mul( 0.03 ).mul( a.y ) ), a.y.mul( 0.35 ).add( BASE ), a.z );
		return a.mul( part( b, 0 ) ).add( plume.mul( part( b, 1 ) ) ).add( worm.mul( part( b, 2 ) ) );

	},
	color: ( { a, b, t } ) => {

		const crack = smoothstep( 0.55, 0.8, mx_noise_float( a.mul( 6 ) ) );
		const chimney = color( 0x1b1512 ).add( color( 0xff6a1f ).mul( crack ) );
		const s = fract( t.mul( 0.12 ).add( b.y ) );
		const plume = mix( color( 0x8a5a3a ), color( 0x2a3550 ), smoothstep( 0, 0.4, s ) ).mul( s.oneMinus().mul( 0.7 ).add( 0.15 ) );
		const worm = mix( color( 0xd8d0c8 ).mul( 0.5 ), color( 0xff2e3c ), smoothstep( 0.8, 1, a.y ) );
		return chimney.mul( part( b, 0 ) ).add( plume.mul( part( b, 1 ) ) ).add( worm.mul( part( b, 2 ) ) );

	},
	alpha: 0.32,
	size: 0.012
} );

// 30 River Delta: distributaries fanning out over sediment toward the sea, water pulsing downstream.
const CHANNELS = [];
( function branch( x, z, dir, dist, depth ) {

	for ( let k = 0; k < 60 && z < 1.6; k ++ ) {

		dir += gauss() * 0.12;
		const nx = x + Math.sin( dir ) * 0.08, nz = z + Math.cos( dir ) * 0.08;
		CHANNELS.push( [ x, z, nx, nz, dist, depth ] );
		x = nx; z = nz; dist += 0.08;
		if ( depth < 5 && k > 4 && Math.random() < 0.08 ) {

			branch( x, z, dir + rand( 0.25, 0.6 ), dist, depth + 1 );
			dir -= rand( 0.25, 0.6 );

		}

	}

} )( 0, - 2.6, 0, 0, 0 );

const riverDelta = defineScene( {
	meta: {
		title: { ko: '강 삼각주', en: 'River Delta' },
		ref: { ko: '강이 실어 온 퇴적물 위로 물길이 여러 갈래로 갈라져 바다에 닿는다', en: 'A river splits into distributaries across its own sediment on the way to the sea' }
	},
	camera: [ 0, 4.8, 2.4 ],
	count: 150_000,
	init( i, n ) {

		const u = i / n;
		if ( u < 0.55 ) {

			const [ x0, z0, x1, z1, dist, depth ] = CHANNELS[ Math.floor( Math.random() * CHANNELS.length ) ];
			const s = Math.random(), w = 0.035 / ( 1 + depth * 0.4 );
			return [ x0 + ( x1 - x0 ) * s + gauss() * w, 0.01, z0 + ( z1 - z0 ) * s + gauss() * w, 0, dist + s * 0.08 ];

		}

		if ( u < 0.85 ) {

			const z = rand( - 2.6, 1.6 ), half = 0.3 + ( z + 2.6 ) * 0.55;
			return [ rand( - half, half ), 0, z, 1, Math.random() ];

		}

		return [ rand( - 3, 3 ), - 0.02, rand( 1.6, 2.8 ), 2 ];

	},
	position: ( { a, b, t } ) => a.add( vec3( 0, sin( a.x.mul( 9 ).add( t ) ).mul( 0.005 ).mul( part( b, 0 ) ), 0 ) ),
	color: ( { a, b, t } ) => {

		const water = color( 0x2fa8ff ).mul( smoothstep( 0.6, 1, fract( b.y.mul( 3 ).sub( t.mul( 0.6 ) ) ) ).mul( 1.2 ).add( 0.35 ) );
		const land = mix( color( 0xc9a26b ), color( 0x3f7a3a ), smoothstep( - 0.2, 0.4, mx_noise_float( a.mul( 2 ) ) ) ).mul( 0.35 );
		return water.mul( part( b, 0 ) ).add( land.mul( part( b, 1 ) ) ).add( color( 0x0a3d6b ).mul( 0.5 ).mul( part( b, 2 ) ) );

	},
	alpha: 0.55,
	size: 0.012
} );

export default [ coralDreams, oceanSwell, maelstrom, waterfall, jellyfish, bioluminescence, fishSchool, iceberg, hydrothermalVent, riverDelta ];
