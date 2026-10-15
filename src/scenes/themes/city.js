// Theme 8: City — urban infrastructure and street life.
import { vec2, vec3, sin, cos, mix, fract, floor, step, smoothstep, clamp, exp, abs, max, min, mod, length, hash, color, mx_noise_float, mx_noise_vec3 } from 'three/tsl';
import { defineScene, gradient, TAU, rand } from '../../lib/defineScene.js';
import * as sphere from '../sphere.js';
import * as livingArchitecture from '../livingArchitecture.js';

// Deterministic 0..1 from an integer, so grouped points (one car, one window) share randomness.
const hr = ( k ) => {

	const x = Math.sin( k * 12.9898 + 78.233 ) * 43758.5453;
	return x - Math.floor( x );

};
const pick = ( arr ) => arr[ Math.floor( Math.random() * arr.length ) ];
const oneMinusStep = ( e, x ) => smoothstep( 0, e, x ).oneMinus(); // 1 at x = 0, 0 beyond e

// 73: two directions of traffic on a curving, rising highway; each car is a short streak.
const LANES = [ - 0.42, - 0.3, - 0.18, - 0.06, 0.06, 0.18, 0.3, 0.42 ];
const highwayTrails = defineScene( {
	meta: {
		title: { ko: '고속도로 빛의 궤적', en: 'Highway Trails' },
		ref: { ko: '굽이진 고속도로 위로 하얀 전조등과 붉은 미등이 서로 반대 방향으로 흐른다', en: 'White headlights and red taillights stream in opposite directions along a curving highway' }
	},
	camera: [ 0, 2.4, 5 ],
	count: 140_000,
	init() {

		if ( Math.random() < 0.15 ) return [ pick( [ - 0.5, 0, 0.5 ] ), 0, 0, Math.random(), 0, 0, 1 ]; // road edge and median
		const lane = Math.floor( rand( 0, 8 ) ), car = Math.floor( rand( 0, 30 ) );
		const dir = lane < 4 ? - 1 : 1;
		return [ LANES[ lane ], dir, 0.03 + hr( lane ) * 0.03, ( car + hr( lane * 31 + car ) * 0.6 ) / 30, Math.pow( Math.random(), 1.5 ), 0, 0 ];

	},
	position: ( { a, b, t } ) => {

		const moving = fract( b.x.add( t.mul( a.z ).mul( a.y ) ) ).sub( a.y.mul( b.y ).mul( 0.03 ) );
		const x = mix( moving, b.x, b.w ).mul( 10 ).sub( 5 );
		return vec3( x, sin( x.mul( 0.25 ) ).mul( 0.15 ), sin( x.mul( 0.35 ) ).add( a.x ) );

	},
	color: ( { a, b } ) => {

		const tail = b.y.oneMinus();
		const car = mix( color( 0xff2a3a ), color( 0xfff1c9 ), step( 0, a.y ) ).mul( tail.mul( tail ).mul( 1.4 ).add( 0.05 ) );
		return mix( car, color( 0x3a4256 ).mul( 0.4 ), b.w );

	},
	alpha: 0.35,
	size: 0.011
} );

// 74: straight lines and one loop line; static track dots with brighter stations, trains as moving clusters.
const METRO = [ [ 0, 0, 0, 7 ], [ 0, 0.3, Math.PI / 4, 6.5 ], [ 0.4, - 0.2, Math.PI / 2, 5 ], [ - 0.5, 0.1, - Math.PI / 4, 6 ], [ 0, - 1.1, 0.1, 6.5 ], [ 0.2, 1.2, - 0.08, 6 ], [ - 1.6, 0, Math.PI / 2.2, 4 ], [ 1.7, 0, Math.PI / 1.8, 4.2 ], [ 0, 0, 0, - 1.5 ] ];
const metroNetwork = defineScene( {
	meta: {
		title: { ko: '지하철 노선망', en: 'Metro Network' },
		ref: { ko: '색색의 노선과 순환선 위로 열차들이 역을 지나며 달린다', en: 'Trains run along colored lines and a loop line, passing through glowing stations' }
	},
	camera: [ 0, 0, 5.6 ],
	count: 120_000,
	init() {

		const line = Math.floor( rand( 0, METRO.length ) );
		const [ cx, cy, ang, len ] = METRO[ line ];
		if ( Math.random() < 0.7 ) return [ cx, cy, ang, len, Math.random(), 0, line * 2 ];
		const train = Math.floor( rand( 0, 5 ) ), dir = hr( line * 7 + train ) < 0.5 ? - 1 : 1;
		return [ cx, cy, ang, len, train / 5 + Math.random() * 0.015, dir * 0.03, line * 2 + 1 ];

	},
	position: ( { a, b, t } ) => {

		// Trains (b.z != 0) brake into each of the 8 stations, dwell ~35% of the interval, then pull away.
		// The train's base phase is a multiple of 0.2; the remainder is the car offset, so the train stays rigid.
		const base = floor( b.y.mul( 5 ) ).div( 5 ), offset = b.y.sub( base );
		const u = base.add( t.mul( b.z ) ).mul( 8 );
		const stop = floor( u ).add( smoothstep( 0.35, 1, fract( u ) ) ).div( 8 );
		const s = fract( mix( b.y, stop.add( offset ), step( 0.5, abs( b.z ).mul( 100 ) ) ) );
		const c = vec2( a.x, a.y );
		const straight = c.add( vec2( cos( a.z ), sin( a.z ) ).mul( s.sub( 0.5 ).mul( b.x ) ) );
		const loop = c.add( vec2( cos( s.mul( TAU ) ), sin( s.mul( TAU ) ) ).mul( b.x.negate() ) );
		const p = mix( straight, loop, step( b.x, 0 ) );
		return vec3( p.x, p.y, 0 );

	},
	color: ( { b, t } ) => {

		const isTrain = mod( b.w, 2 ), line = floor( b.w.div( 2 ) );
		const lineCol = gradient( line.div( METRO.length - 1 ), [ 0x2e7dff, 0x3cc35a, 0xff7a1a, 0x1fb6d9, 0x9b4dff, 0xc8a24a, 0xe8324d, 0x7fd14e, 0x27c6a0 ] );
		const s = fract( b.y.add( t.mul( b.z ) ) );
		const station = oneMinusStep( 0.035, abs( fract( s.mul( 8 ).add( 0.5 ) ).sub( 0.5 ) ) );
		return mix( lineCol.mul( station.mul( 0.9 ).add( 0.25 ) ), lineCol.mul( 1.4 ).add( 0.25 ), isTrain );

	},
	alpha: 0.32,
	size: 0.012
} );

// 75: three depth rows of towers; each point is one window that switches on and off on its own schedule.
const BUILDINGS = Array.from( { length: 54 }, ( _, k ) => {

	const depth = k % 3;
	return { x: rand( - 4.6, 4.6 ), w: rand( 0.25, 0.65 ), h: rand( 0.5, 3.1 ) * ( 1 - depth * 0.15 ), z: - depth * 0.9 - rand( 0, 0.3 ), depth };

} );
const AREA = BUILDINGS.map( ( b ) => b.w * b.h );
const AREA_SUM = AREA.reduce( ( s, x ) => s + x, 0 );
const skylineWindows = defineScene( {
	meta: {
		title: { ko: '마천루 창문', en: 'Skyline Windows' },
		ref: { ko: '밤의 고층 빌딩 창마다 사람들의 시간이 켜지고 꺼진다', en: 'Window by window, lives switch on and off across the night towers' }
	},
	camera: [ 0, 0.4, 7 ],
	count: 70_000,
	init() {

		let r = Math.random() * AREA_SUM, k = 0;
		while ( r > AREA[ k ] ) r -= AREA[ k ++ ];
		const b = BUILDINGS[ k ], cell = 0.07;
		const cols = Math.max( 1, Math.floor( b.w / cell ) ), rows = Math.max( 1, Math.floor( b.h / cell ) );
		const col = Math.floor( rand( 0, cols ) ), row = Math.floor( rand( 0, rows ) );
		return [ b.x - b.w / 2 + ( col + 0.5 ) * cell, - 1.6 + ( row + 0.5 ) * cell, b.z, k * 10000 + row * 100 + col, hr( k ), b.depth ];

	},
	position: ( { a } ) => a,
	color: ( { b, t } ) => {

		const slot = floor( t.mul( 0.2 ).add( fract( b.x.mul( 0.618 ) ).mul( 5 ) ) );
		const lit = step( 0.42, hash( b.x.mul( 13 ).add( slot.mul( 7919 ) ) ) );
		const on = mix( color( 0xffc46b ), color( 0xbfe3ff ), step( 0.7, b.y ) );
		return mix( color( 0x0a1430 ).mul( 0.5 ), on, lit ).mul( b.z.mul( - 0.25 ).add( 1 ) );

	},
	alpha: 0.5,
	size: 0.022
} );

// 76: street-light grid seen from a plane, warped like an organic city, cut by a dark river; cars move on streets.
const cityGridNight = defineScene( {
	meta: {
		title: { ko: '야경 항공뷰', en: 'City Grid at Night' },
		ref: { ko: '비행기 창으로 내려다본 가로등 격자, 도심은 밝고 강과 공원은 어둡다', en: 'Street-light grid seen from a plane window: a bright core, dark parks and a river' }
	},
	camera: [ 0, 6.5, 2.2 ],
	count: 160_000,
	init() {

		const k = Math.floor( rand( - 16, 17 ) );
		const car = Math.random() < 0.15;
		return [ k * 0.25, rand( - 4, 4 ), Math.random() < 0.5 ? 0 : 1, Math.random(), rand( 0.02, 0.05 ) * ( Math.random() < 0.5 ? - 1 : 1 ), car ? 1 : 0, k % 4 === 0 ? 1 : 0 ];

	},
	position: ( { a, b, t } ) => {

		const along = mix( a.y, fract( b.x.add( t.mul( b.y ) ) ).mul( 8 ).sub( 4 ), b.z );
		const x = mix( along, a.x, a.z ), z = mix( a.x, along, a.z );
		const w = mx_noise_vec3( vec3( x.mul( 0.25 ), 0, z.mul( 0.25 ) ) ).mul( 0.35 );
		return vec3( x.add( w.x ), 0, z.add( w.z ) );

	},
	color: ( { a, b, t } ) => {

		const along = mix( a.y, fract( b.x.add( t.mul( b.y ) ) ).mul( 8 ).sub( 4 ), b.z );
		const x = mix( along, a.x, a.z ), z = mix( a.x, along, a.z );
		const r2 = x.mul( x ).add( z.mul( z ) );
		const parks = smoothstep( - 0.35, 0.1, mx_noise_float( vec3( x.mul( 0.5 ), 3, z.mul( 0.5 ) ) ) );
		const river = smoothstep( 0.15, 0.35, abs( z.sub( sin( x.mul( 0.5 ) ).mul( 1.2 ) ) ) );
		const density = exp( r2.mul( - 0.12 ) ).mul( 0.8 ).add( 0.2 ).mul( parks ).mul( river );
		const lamp = mix( color( 0xff9a3c ), color( 0xe8f0ff ), b.w ).mul( density );
		const car = mix( color( 0xff3040 ), color( 0xfff4d8 ), step( 0, b.y ) ).mul( river.mul( 1.5 ) );
		return mix( lamp, car, b.z );

	},
	alpha: 0.3,
	size: 0.012
} );

// 77: pedestrians cross from every corner at once (diagonals included), then cars take their turn.
const CORNERS = [ [ - 1.55, - 1.55 ], [ 1.55, - 1.55 ], [ 1.55, 1.55 ], [ - 1.55, 1.55 ] ];
const CYCLE = 30; // long enough for walking-speed crossings before cars get the green
const scrambleCrossing = defineScene( {
	meta: {
		title: { ko: '스크램블 교차로', en: 'Scramble Crossing' },
		ref: { ko: '보행 신호가 켜지면 네 모퉁이의 사람들이 대각선까지 사방으로 엇갈려 건넌다', en: 'When the walk signal turns, crowds from four corners cross in every direction, diagonals included' }
	},
	camera: [ 0, 5.4, 2.2 ],
	count: 60_000,
	init() {

		const r = Math.random();
		if ( r < 0.35 ) { // pedestrians

			const c0 = Math.floor( rand( 0, 4 ) );
			const c1 = ( c0 + 1 + Math.floor( rand( 0, 3 ) ) ) % 4;
			const j = () => rand( - 0.35, 0.35 );
			return [ CORNERS[ c0 ][ 0 ] + j(), 0, CORNERS[ c0 ][ 1 ] + j(), CORNERS[ c1 ][ 0 ] + j(), CORNERS[ c1 ][ 1 ] + j(), rand( 0, 0.12 ), 0 ];

		}

		if ( r < 0.9 ) { // zebra stripes: four sides plus the two diagonals

			const u = ( Math.floor( rand( - 6, 6 ) ) + rand( 0, 0.5 ) ) / 6, v = rand( - 0.22, 0.22 ), side = Math.floor( rand( 0, 6 ) );
			if ( side < 4 ) {

				const s = side < 2 ? - 1.5 : 1.5;
				return side % 2 === 0 ? [ u * 1.1, 0, s + v, 0, 0, 0, 1 ] : [ s + v, 0, u * 1.1, 0, 0, 0, 1 ];

			}

			const d = side === 4 ? 1 : - 1, k = Math.SQRT1_2;
			return [ ( u * 1.5 - v * d ) * k, 0, ( u * 1.5 * d + v ) * k, 0, 0, 0, 1 ];

		}

		const lane = pick( [ - 0.35, - 0.12, 0.12, 0.35 ] ); // cars, east-west
		return [ 0, 0, lane, Math.random(), lane < 0 ? - 1 : 1, 0, 2 ]; // right-hand traffic: +x on the near (+z) side

	},
	position: ( { a, b, t, h } ) => {

		const p = fract( t.div( CYCLE ) );
		// Constant walking pace (0.3 units/s, cars run ~7x faster): duration scales with crossing length,
		// so even the longest diagonal clears the road (p < 0.65) before cars get the green at p = 0.7.
		const dist = length( vec3( b.x.sub( a.x ), 0, b.y.sub( a.z ) ) );
		const start = b.z.mul( 0.4 ).add( 0.02 );
		const walk = clamp( p.sub( start ).div( dist.div( 0.3 * CYCLE ) ), 0, 1 );
		const parity = mod( floor( t.div( CYCLE ) ), 2 );
		const prog = mix( walk, walk.oneMinus(), parity );
		const ped = vec3( mix( a.x, b.x, prog ).add( sin( t.mul( 8 ).add( h.mul( 40 ) ) ).mul( 0.008 ) ), 0.02, mix( a.z, b.y, prog ) );
		const car = vec3( fract( b.x.add( t.mul( 0.25 ).mul( b.y ) ) ).mul( 8 ).sub( 4 ), 0.01, a.z );
		const isPed = step( b.w, 0.5 ), isCar = step( 1.5, b.w );
		return ped.mul( isPed ).add( car.mul( isCar ) ).add( a.mul( isPed.add( isCar ).oneMinus() ) );

	},
	color: ( { b, t, h } ) => {

		const p = fract( t.div( CYCLE ) );
		const carGate = smoothstep( 0.7, 0.74, p ).mul( smoothstep( 0.95, 0.99, p ).oneMinus() );
		const ped = gradient( h, [ 0xff4f7a, 0x2fd5ff, 0xffd447, 0x8aff7a, 0xc07bff ] ).mul( 1.3 );
		const stripe = color( 0x9aa3b5 ).mul( 0.3 );
		const car = color( 0xfff1c9 ).mul( carGate.mul( 1.5 ) );
		return mix( mix( ped, stripe, step( 0.5, b.w ) ), car, step( 1.5, b.w ) );

	},
	alpha: 0.45,
	size: 0.02
} );

// 78: shells rise from a barge, burst into spheres that fall under gravity, mirrored in the harbor.
const SHELLS = Array.from( { length: 12 }, ( _, k ) => [ rand( - 2.6, 2.6 ), rand( 1.2, 2.4 ), rand( - 1, 0.5 ), k / 12 + rand( 0, 0.05 ) ] );
const fireworks = defineScene( {
	meta: {
		title: { ko: '불꽃놀이', en: 'Fireworks' },
		ref: { ko: '항구 위로 솟은 불꽃이 구형으로 터져 중력에 흘러내리고 수면에 비친다', en: 'Shells climb over the harbor, burst into spheres, droop under gravity and mirror in the water' }
	},
	camera: [ 0, 1.2, 6.5 ],
	count: 150_000,
	init() {

		const [ x, H, z, off ] = pick( SHELLS );
		const u = rand( - 1, 1 ), th = rand( 0, TAU ), s = Math.sqrt( 1 - u * u ) * rand( 0.85, 1 );
		return [ x, H, z, Math.cos( th ) * s, u * rand( 0.85, 1 ), Math.sin( th ) * s, off ];

	},
	position: ( { a, b, t, h } ) => {

		const tau = fract( t.div( 6 ).add( b.w ) ).mul( 6 );
		// Ballistic ascent: y = H(1 - (1 - tau)^2) reaches the apex with zero vertical speed, where the shell bursts.
		const climb = min( tau, 1 ).oneMinus();
		const rise = climb.mul( climb ).oneMinus();
		const e = max( tau.sub( 1 ), 0 );
		const burst = vec3( b.x, b.y, b.z ).mul( exp( e.mul( - 1.6 ) ).oneMinus().mul( 0.9 ) );
		const p = vec3( a.x, rise.mul( a.y ), a.z ).add( burst ).sub( vec3( 0, e.mul( e ).mul( 0.06 ), 0 ) );
		const mirrored = vec3( p.x.add( sin( p.y.mul( 18 ).add( t.mul( 3 ) ) ).mul( 0.02 ) ), p.y.mul( - 0.8 ).sub( 0.05 ), p.z );
		return mix( p, mirrored, step( 0.7, h ) );

	},
	color: ( { a, b, t, h } ) => {

		const tau = fract( t.div( 6 ).add( b.w ) ).mul( 6 );
		const e = max( tau.sub( 1 ), 0 );
		const exploded = step( 1, tau );
		const rocket = step( 0.993, fract( h.mul( 97 ) ) ); // only a few points draw the rising rocket
		const vis = mix( rocket, 1, exploded );
		const shell = gradient( fract( a.x.mul( 3.7 ).add( 0.5 ) ), [ 0xff3d5a, 0xffb02e, 0x5effa0, 0x3ab8ff, 0xd16bff ] );
		const sparkle = sin( t.mul( 30 ).add( h.mul( 100 ) ) ).mul( 0.35 ).add( 0.65 );
		// Sparks that fall to the harbor surface (y = 0) are quenched.
		const y = a.y.add( b.y.mul( exp( e.mul( - 1.6 ) ).oneMinus().mul( 0.9 ) ) ).sub( e.mul( e ).mul( 0.06 ) );
		const alive = mix( 1, smoothstep( 0, 0.08, y ), step( 1, tau ) );
		const c = mix( color( 0xfff6e0 ), shell, smoothstep( 0, 0.6, e ) ).mul( exp( e.mul( - 0.8 ) ) ).mul( sparkle ).mul( vis ).mul( alive );
		return c.mul( mix( 1, 0.22, step( 0.7, h ) ) );

	},
	alpha: 0.4,
	size: 0.012
} );

// 79: towers, parabolic main cables, hangers and deck; a light show runs along the cables, cars cross, water mirrors it.
const BRIDGE = [];
const cableY = ( x ) => Math.abs( x ) <= 1.8 ? 0.25 + 1.25 * ( x / 1.8 ) ** 2 : 0.05 + 1.45 * ( ( 4.2 - Math.abs( x ) ) / 2.4 ) ** 1.6;
for ( const z of [ - 0.25, 0.25 ] ) {

	for ( let k = 0; k < 2400; k ++ ) { const x = rand( - 4.2, 4.2 ); BRIDGE.push( [ x, cableY( x ), z, 0 ] ); }
	for ( let x = - 4.05; x < 4.1; x += 0.15 ) for ( let k = 0; k < 40; k ++ ) BRIDGE.push( [ x, rand( 0, cableY( x ) ), z, 1 ] );
	for ( const tx of [ - 1.8, 1.8 ] ) for ( let k = 0; k < 900; k ++ ) BRIDGE.push( [ tx, rand( - 0.6, 1.55 ), z, 2 ] );
	for ( let k = 0; k < 2400; k ++ ) BRIDGE.push( [ rand( - 4.2, 4.2 ), 0, z, 2 ] );

}

for ( const tx of [ - 1.8, 1.8 ] ) for ( const y of [ 0.7, 1.45 ] ) for ( let k = 0; k < 120; k ++ ) BRIDGE.push( [ tx, y, rand( - 0.25, 0.25 ), 2 ] );

const suspensionBridge = defineScene( {
	meta: {
		title: { ko: '현수교', en: 'Suspension Bridge' },
		ref: { ko: '주탑과 주케이블, 행어가 하중을 나눠 지고, 케이블 위로 빛의 물결이 흐른다', en: 'Towers, main cables and hangers share the load while a wave of light runs along the cables' }
	},
	camera: [ 0.5, 0.6, 5.5 ],
	count: 120_000,
	init() {

		if ( Math.random() < 0.25 ) {

			const lane = pick( [ - 0.17, - 0.08, 0.08, 0.17 ] ), car = Math.floor( rand( 0, 24 ) );
			return [ 0, 0, 0, 3, ( car + Math.random() * 0.25 ) / 24, lane < 0 ? - 0.04 : 0.04, lane ]; // right-hand traffic

		}

		const [ x, y, z, kind ] = pick( BRIDGE );
		return [ x, y, z, kind, 0, 0, 0 ];

	},
	position: ( { a, b, t, h } ) => {

		const car = vec3( fract( b.y.add( t.mul( b.z ) ) ).mul( 8.4 ).sub( 4.2 ), 0.03, b.w );
		const p = mix( a, car, step( 2.5, b.x ) );
		const mirrored = vec3( p.x.add( sin( p.y.mul( 14 ).add( t.mul( 2 ) ) ).mul( 0.025 ) ), p.y.negate().sub( 1.2 ), p.z );
		return mix( p, mirrored, step( 0.75, h ) );

	},
	color: ( { a, b, t, h } ) => {

		const wave = sin( a.x.mul( 3 ).sub( t.mul( 1.5 ) ).add( a.y.mul( 2 ) ) ).mul( 0.5 ).add( 0.5 );
		const cable = mix( color( 0x3b2bff ), color( 0x9fe8ff ), wave.mul( wave ) ).mul( mix( 1, 0.6, step( 0.5, b.x ) ) );
		const structure = color( 0xd8c8a8 ).mul( 0.35 );
		const car = mix( color( 0xff3040 ), color( 0xfff4d8 ), step( 0, b.z ) ).mul( 1.4 );
		const c = mix( mix( cable, structure, step( 1.5, b.x ) ), car, step( 2.5, b.x ) );
		return c.mul( mix( 1, 0.2, step( 0.75, h ) ) );

	},
	alpha: 0.35,
	size: 0.012
} );

// 80: towers broadcast expanding wireframe domes (latitude rings and meridians) over a dotted city grid.
const TOWERS = Array.from( { length: 6 }, ( _, k ) => [ - 3 + k * 1.2 + rand( - 0.2, 0.2 ), - 0.8 + rand( 0.6, 1.2 ), rand( - 1.4, 1.2 ), Math.random() ] );
const radioSignals = defineScene( {
	meta: {
		title: { ko: '전파', en: 'Radio Signals' },
		ref: { ko: '기지국 안테나마다 전파가 반구형 파면으로 퍼져 나가 도시 위에서 겹친다', en: 'Each cell tower sends out hemispherical wavefronts that overlap above the city' }
	},
	camera: [ 0, 1.6, 6 ],
	count: 140_000,
	init() {

		const [ x, top, z, off ] = pick( TOWERS );
		const r = Math.random();
		if ( r < 0.12 ) return [ Math.round( rand( - 16, 16 ) ) * 0.25 + rand( - 0.01, 0.01 ), - 0.8, Math.round( rand( - 8, 8 ) ) * 0.25, 0, 0, 0, - 1 ]; // ground grid
		if ( r < 0.17 ) return [ x, rand( - 0.8, top ), z, 0, 0, 0, - 2 ]; // tower mast
		// Dome wireframe: either a latitude ring or a meridian.
		let el, az;
		if ( Math.random() < 0.6 ) { el = Math.floor( rand( 0, 6 ) ) * ( Math.PI / 12 ); az = rand( 0, TAU ); } else { el = rand( - 0.1, Math.PI / 2 ); az = Math.floor( rand( 0, 12 ) ) * ( TAU / 12 ); }
		const ring = Math.floor( rand( 0, 3 ) );
		return [ x, top, z, Math.cos( el ) * Math.cos( az ), Math.sin( el ), Math.cos( el ) * Math.sin( az ), ring / 3 + off ];

	},
	position: ( { a, b, t } ) => a.add( vec3( b.x, b.y, b.z ).mul( fract( t.mul( 0.18 ).add( max( b.w, 0 ) ) ).mul( 3.2 ) ) ),
	color: ( { a, b, t } ) => {

		const r = fract( t.mul( 0.18 ).add( max( b.w, 0 ) ) );
		const fade = r.oneMinus();
		const shell = gradient( fract( a.x.mul( 0.29 ).add( 0.5 ) ), [ 0x2fffd0, 0x38a8ff, 0xa66bff ] ).mul( fade.mul( fade ).mul( 1.4 ) );
		const ground = color( 0x4a5878 ).mul( 0.3 );
		const mast = color( 0x8a95b0 ).mul( 0.4 );
		return mix( shell, mix( ground, mast, step( b.w, - 1.5 ) ), step( b.w, - 0.5 ) );

	},
	alpha: 0.3,
	size: 0.011
} );

export default [ sphere, livingArchitecture, highwayTrails, metroNetwork, skylineWindows, cityGridNight, scrambleCrossing, fireworks, suspensionBridge, radioSignals ];
