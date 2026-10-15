// Theme 4: Forest & Life — plants, animals and ecology.
import * as THREE from 'three/webgpu';
import { vec3, sin, cos, mix, fract, smoothstep, step, max, pow, normalize, cross, color, mx_noise_float } from 'three/tsl';
import { defineScene, gradient, TAU, rand } from '../../lib/defineScene.js';
import { gauss } from '../../lib/points.js';
import * as rainforest from '../rainforest.js';

// Hash-based pseudo-random in [0, 1). Weyl sequences ((n * m) % 1) line points up in visible 3D rows.
const hr = ( n ) => {

	const x = Math.sin( n * 127.1 + 311.7 ) * 43758.5453;
	return x - Math.floor( x );

};

// 32 Tree Growth: branches extend from the trunk outward, leaves open last.
function growTree() {

	const segs = [];
	const grow = ( start, dir, len, depth ) => {

		const end = start.clone().addScaledVector( dir, len );
		segs.push( { start, end, depth, w: len * Math.pow( 0.62, depth ) } );
		if ( depth >= 6 ) return;
		const kids = depth === 0 ? 3 : 2 + ( Math.random() < 0.5 );
		for ( let k = 0; k < kids; k ++ ) {

			const d = dir.clone().add( new THREE.Vector3( gauss(), gauss() * 0.3 + 0.35, gauss() ).multiplyScalar( 0.55 ) ).normalize();
			grow( end, d, len * rand( 0.68, 0.8 ), depth + 1 );

		}

	};

	grow( new THREE.Vector3( 0, - 1.7, 0 ), new THREE.Vector3( 0, 1, 0 ), 1.0, 0 );
	return segs;

}

let tree, tips;
const treeGrowth = defineScene( {
	meta: {
		title: { ko: '나무의 성장', en: 'Tree Growth' },
		ref: { ko: '줄기에서 가지가 차례로 뻗어 나가고 마지막에 잎이 돋는 한 그루의 성장', en: 'A tree grows from trunk to twig, branch by branch, and leafs out last' }
	},
	camera: [ 0, 0.2, 5.4 ],
	count: 160_000,
	init( i, n ) {

		if ( i === 0 ) {

			tree = growTree();
			tips = tree.filter( ( q ) => q.depth === 6 );

		}

		const wmax = tree[ 0 ].w;
		let s;
		do s = tree[ Math.floor( Math.random() * tree.length ) ]; while ( Math.random() > s.w / wmax + 0.05 );

		if ( i < n * 0.7 ) {

			const u = Math.random(), r = 0.06 * Math.pow( 0.62, s.depth );
			const p = s.start.clone().lerp( s.end, u ).add( new THREE.Vector3( gauss(), gauss(), gauss() ).multiplyScalar( r ) );
			return [ p.x, p.y, p.z, s.start.x, s.start.y, s.start.z, ( s.depth + u ) / 7 ];

		}

		const tip = tips[ Math.floor( Math.random() * tips.length ) ].end;
		const p = tip.clone().add( new THREE.Vector3( gauss(), gauss(), gauss() ).multiplyScalar( 0.11 ) );
		return [ p.x, p.y, p.z, tip.x, tip.y, tip.z, 1 + Math.random() * 0.08 ];

	},
	position: ( { a, b, t } ) => mix( b.xyz, a, smoothstep( b.w, b.w.add( 0.04 ), fract( t.div( 20 ) ).mul( 1.25 ) ) ),
	color: ( { b, t, h } ) => {

		const vis = smoothstep( b.w, b.w.add( 0.04 ), fract( t.div( 20 ) ).mul( 1.25 ) );
		const wood = gradient( b.w, [ 0x4a2a14, 0x8b5a2b, 0xb9874f ] );
		const leaf = mix( color( 0x3f8f2f ), color( 0xc7f06a ), h );
		return mix( wood, leaf, step( 0.999, b.w ) ).mul( vis );

	},
	alpha: 0.35,
	size: 0.011,
	spin: 0.08
} );

// 33 Mycelium: hyphae spread through soil from spores; nutrient pulses run outward along them.
function hyphae() {

	const segs = [], tips = [];
	for ( let s = 0; s < 5; s ++ ) {

		const x = rand( - 1.5, 1.5 ), z = rand( - 1.5, 1.5 );
		for ( let k = 0; k < 5; k ++ ) tips.push( { x, z, ang: rand( 0, TAU ), d: 0 } );

	}

	while ( tips.length && segs.length < 14000 ) {

		const tip = tips.shift();
		const ang = tip.ang + gauss() * 0.35, x = tip.x + Math.cos( ang ) * 0.05, z = tip.z + Math.sin( ang ) * 0.05;
		if ( Math.hypot( x, z ) > 2.8 ) continue;
		segs.push( [ tip.x, tip.z, x, z, tip.d ] );
		tips.push( { x, z, ang, d: tip.d + 0.05 } );
		if ( Math.random() < 0.06 ) tips.push( { x, z, ang: ang + ( Math.random() < 0.5 ? - 1 : 1 ) * rand( 0.5, 1.1 ), d: tip.d + 0.05 } );

	}

	return segs;

}

let myc, mycMax;
const mycelium = defineScene( {
	meta: {
		title: { ko: '균사 네트워크', en: 'Mycelium' },
		ref: { ko: '포자에서 출발한 균사가 흙 속으로 퍼지고, 양분 신호가 그물을 따라 바깥으로 흐른다', en: 'Hyphae spread through soil from spores while nutrient pulses ripple outward along the web' }
	},
	camera: [ 0, 3.4, 2.8 ],
	count: 160_000,
	init( i, n ) {

		if ( i === 0 ) {

			myc = hyphae();
			mycMax = myc.reduce( ( m, s ) => Math.max( m, s[ 4 ] ), 0 );

		}

		if ( i < n * 0.12 ) return [ rand( - 3, 3 ), rand( - 0.5, - 0.2 ), rand( - 3, 3 ), - 1, 1 ]; // soil specks
		const [ x0, z0, x1, z1, d ] = myc[ Math.floor( Math.random() * myc.length ) ];
		const u = Math.random();
		return [ x0 + ( x1 - x0 ) * u, gauss() * 0.03, z0 + ( z1 - z0 ) * u, ( d + u * 0.05 ) / mycMax, 0 ];

	},
	position: ( { a } ) => a,
	color: ( { b, t } ) => {

		const vis = smoothstep( b.x, b.x.add( 0.03 ), fract( t.div( 22 ) ).mul( 1.15 ) );
		const pulse = smoothstep( 0.85, 1, fract( b.x.mul( 4 ).sub( t.mul( 0.35 ) ) ) );
		const hypha = color( 0xf3e6c8 ).mul( 0.35 ).add( color( 0xffb347 ).mul( pulse.mul( 1.4 ) ) ).mul( vis );
		return mix( hypha, color( 0x3a2616 ).mul( 0.5 ), b.y );

	},
	alpha: 0.35,
	size: 0.01
} );

// 34 Fireflies: random blinking slowly entrains into one synchronized flash.
const fireflies = defineScene( {
	meta: {
		title: { ko: '반딧불이', en: 'Fireflies' },
		ref: { ko: '제각각 깜빡이던 반딧불이들이 서로를 따라 점차 한 박자로 맞춰진다', en: 'Fireflies blinking at random gradually entrain into a single shared rhythm' }
	},
	camera: [ 0, 0.3, 5 ],
	count: 115_000,
	init( i, n ) {

		if ( i < n * 0.65 ) { // grass blades, 50 points each

			const blade = Math.floor( i / 50 ), k = ( i % 50 ) / 49;
			const bx = ( hr( blade * 3 ) - 0.5 ) * 6.4, bz = ( hr( blade * 3 + 1 ) - 0.5 ) * 4, hgt = 0.3 + hr( blade * 3 + 2 ) * 0.5;
			return [ bx + k * k * 0.08, - 1.2 + k * hgt, bz, 0, 1 ];

		}

		const fly = Math.floor( i / 8 ), ph = hr( fly * 5 + 0.5 );
		const r = ( m ) => hr( fly * 5 + m ) - 0.5;
		return [ r( 1 ) * 6 + gauss() * 0.015, r( 2 ) * 2 + 0.1 + gauss() * 0.015, r( 3 ) * 4 + gauss() * 0.015, ph, 0 ];

	},
	position: ( { a, b, t } ) => {

		const ph = b.x;
		const fly = a.add( vec3( sin( t.mul( 0.3 ).add( ph.mul( TAU ) ) ).mul( 0.35 ), sin( t.mul( 0.5 ).add( ph.mul( 17 ) ) ).mul( 0.15 ), cos( t.mul( 0.27 ).add( ph.mul( 11 ) ) ).mul( 0.35 ) ) );
		const grass = a.add( vec3( sin( t.mul( 0.9 ).add( a.x.mul( 2 ) ) ).mul( a.y.add( 1.2 ) ).mul( 0.08 ), 0, 0 ) );
		return mix( fly, grass, b.y );

	},
	color: ( { b, t } ) => {

		const sync = smoothstep( 0.15, 0.75, fract( t.div( 45 ) ) );
		const flash = pow( max( sin( t.mul( 1.1 ).add( b.x.mul( sync.oneMinus() ) ).mul( TAU ) ), 0 ), 10 );
		const fly = mix( color( 0x1a2a10 ), color( 0xe4ff7a ), flash ).mul( flash.mul( 1.6 ).add( 0.15 ) );
		return mix( fly, color( 0x0d2a14 ).mul( 0.6 ), b.y );

	},
	alpha: 0.45,
	size: 0.014
} );

// 35 Bird Migration: flocks travel great-circle routes between breeding and wintering grounds.
const ROUTES = [
	[ 68, - 30, - 55, - 60 ], [ 55, 10, - 15, 25 ], [ 52, - 100, 8, - 75 ], [ 62, 150, - 35, 145 ], [ 45, 125, - 28, 150 ], [ 60, 40, 5, 35 ],
	[ 50, - 5, 10, - 10 ], [ 66, - 150, 20, - 105 ], [ 40, 80, 15, 78 ], [ 58, 100, 20, 105 ], [ 70, 20, 0, 15 ], [ 48, - 70, - 20, - 50 ]
].map( ( r ) => {

	const v = ( lat, lon ) => new THREE.Vector3().setFromSphericalCoords( 1, ( 90 - lat ) * Math.PI / 180, lon * Math.PI / 180 );
	return [ v( r[ 0 ], r[ 1 ] ), v( r[ 2 ], r[ 3 ] ) ];

} );

const birdMigration = defineScene( {
	meta: {
		title: { ko: '철새의 이동', en: 'Bird Migration' },
		ref: { ko: '철새 무리가 번식지와 월동지 사이의 대권 항로를 따라 지구를 가로지른다', en: 'Flocks cross the globe along great-circle routes between breeding and wintering grounds' }
	},
	camera: [ 0, 1.2, 3.6 ],
	count: 140_000,
	init( i, n ) {

		if ( i < n / 2 ) {

			const y = 1 - 2 * ( i + 0.5 ) / ( n / 2 ), r = Math.sqrt( 1 - y * y ), a = i * 2.39996;
			return [ Math.cos( a ) * r, y, Math.sin( a ) * r, 0, 0, 0, - 1 ];

		}

		const k = Math.floor( Math.random() * ROUTES.length ), [ p0, p1 ] = ROUTES[ k ];
		const j = () => gauss() * 0.02;
		return [ p0.x + j(), p0.y + j(), p0.z + j(), p1.x + j(), p1.y + j(), p1.z + j(), ( k / ROUTES.length + Math.floor( Math.random() * 3 ) / 3 + Math.random() * 0.05 ) % 1 ];

	},
	position: ( { a, b, t } ) => {

		// Round trip: spring north, autumn south (triangle wave, no jump back to the start).
		// Migrants fly at most a few km up, so the flock hugs the globe instead of arcing into space.
		const s = fract( t.mul( 0.0175 ).add( b.w ) ).mul( 2 ).sub( 1 ).abs().oneMinus();
		const bird = normalize( mix( a, b.xyz, s ) ).mul( sin( s.mul( Math.PI ) ).mul( 0.02 ).add( 1.025 ) );
		return mix( a, bird, step( 0, b.w ) );

	},
	color: ( { a, b } ) => {

		const land = smoothstep( 0.0, 0.15, mx_noise_float( a.mul( 1.6 ) ) );
		const globe = mix( color( 0x0b2a4a ), color( 0x2f6b4f ), land ).mul( 1.6 );
		return mix( globe, color( 0xffd9a0 ).mul( 1.3 ), step( 0, b.w ) );

	},
	// The Earth is opaque: flocks on the far side must be hidden behind it.
	extras( { scene } ) {

		scene.add( new THREE.Mesh( new THREE.SphereGeometry( 0.985, 64, 32 ), new THREE.MeshBasicNodeMaterial( { color: 0x06182c } ) ) );

	},
	alpha: 0.16,
	size: 0.006,
	spin: 0.04
} );

// 36 Beehive: hexagonal wax comb, cells filling with honey, bees looping above.
const HEX = 0.14;
const beehive = defineScene( {
	meta: {
		title: { ko: '벌집', en: 'Beehive' },
		ref: { ko: '육각형 밀랍 칸에 꿀이 차오르고 그 위를 일벌들이 맴돈다', en: 'Honey fills hexagonal wax cells while worker bees loop above the comb' }
	},
	camera: [ 0.6, 0.4, 4.4 ],
	count: 154_000,
	init( i, n ) {

		const col = Math.floor( Math.random() * 18 ), row = Math.floor( Math.random() * 14 );
		const cx = ( col + ( row % 2 ) * 0.5 - 8.75 ) * Math.sqrt( 3 ) * HEX, cy = ( row - 6.5 ) * 1.5 * HEX;
		const cellHash = ( ( col * 12.9898 + row * 78.233 ) * 43758.5453 ) % 1;

		if ( i < n * 0.58 ) { // walls

			const k = Math.floor( Math.random() * 6 ), u = Math.random();
			const c0 = TAU / 12 + k * TAU / 6, c1 = c0 + TAU / 6;
			return [ cx + HEX * ( Math.cos( c0 ) * ( 1 - u ) + Math.cos( c1 ) * u ), cy + HEX * ( Math.sin( c0 ) * ( 1 - u ) + Math.sin( c1 ) * u ), - Math.random() * 0.25, 0, cellHash ];

		}

		if ( i < n * 0.84 ) { // honey

			const r = 0.8 * HEX * Math.sqrt( Math.random() ), a = rand( 0, TAU );
			return [ cx + Math.cos( a ) * r, cy + Math.sin( a ) * r, rand( - 0.25, - 0.2 ), 1, cellHash ];

		}

		const bee = Math.floor( i / 4 );
		const r = ( m ) => ( bee * m ) % 1 - 0.5;
		return [ r( 0.7548 ) * 4 + gauss() * 0.01, r( 0.5698 ) * 2.6 + gauss() * 0.01, 0.35 + gauss() * 0.01, 2, 0, ( bee * 0.618 ) % 1 ];

	},
	position: ( { a, b, t } ) => {

		const ph = b.z;
		const bee = a.add( vec3( sin( t.mul( 1.7 ).add( ph.mul( TAU ) ) ).mul( 0.35 ), sin( t.mul( 2.9 ).add( ph.mul( 9 ) ) ).mul( 0.18 ), sin( t.mul( 2.3 ).add( ph.mul( 5 ) ) ).mul( 0.12 ) ) );
		return mix( a, bee, step( 1.5, b.x ) );

	},
	color: ( { b, t } ) => {

		const isBee = step( 1.5, b.x ), isHoney = step( 0.5, b.x ).mul( isBee.oneMinus() );
		const fill = sin( t.mul( 0.15 ) ).mul( 0.3 ).add( 0.5 );
		const honey = color( 0xff9a1f ).mul( step( b.y, fill ) ).mul( 1.2 );
		const wall = color( 0xf3c14b ).mul( 0.45 );
		return mix( mix( wall, honey, isHoney ), color( 0xfff1b8 ).mul( 1.4 ), isBee );

	},
	alpha: 0.35,
	size: 0.011
} );

// 37 Autumn Leaves: each leaf is a little point-sprite blade, tumbling as it falls.
const autumnLeaves = defineScene( {
	meta: {
		title: { ko: '단풍 낙엽', en: 'Autumn Leaves' },
		ref: { ko: '붉고 노란 잎이 바람에 흔들리며 빙글빙글 회전해 떨어진다', en: 'Red and yellow leaves flutter and spin as they fall through the air' }
	},
	camera: [ 0, 0, 5 ],
	count: 40_000, // ~1000 leaves: a scattered fall, not a wall of foliage
	init( i ) {

		const leaf = Math.floor( i / 40 );
		const r = ( m ) => hr( leaf * 7 + m );
		const lx = rand( - 1, 1 ), ly = ( Math.random() * 2 - 1 ) * Math.sqrt( 1 - lx * lx ) * ( i % 40 < 6 ? 0.05 : 1 );
		return [ ( r( 1 ) - 0.5 ) * 6, ( r( 2 ) - 0.5 ) * 3, lx * 0.07, ly * 0.04, r( 3 ), 0.04 + r( 4 ) * 0.05, r( 5 ) ];

	},
	position: ( { a, b, t } ) => {

		const ph = b.y.mul( TAU );
		// Leaves fall at a low terminal speed (constant) and the wind carries them downwind for as long as they fall.
		const age = fract( t.mul( b.z ).add( b.y ) );
		const center = vec3( a.x.add( sin( t.mul( 0.8 ).add( ph ) ).mul( 0.4 ) ).add( age.sub( 0.5 ).mul( 1.2 ) ), age.oneMinus().mul( 4.6 ).sub( 2.3 ), a.y.add( cos( t.mul( 0.6 ).add( ph ) ).mul( 0.3 ) ) );
		const th = t.mul( 2.2 ).add( ph );
		const leaf = vec3( a.z.mul( cos( th ) ), b.x.mul( cos( th.mul( 0.7 ) ) ), a.z.mul( sin( th ) ).add( b.x.mul( sin( th.mul( 0.7 ) ) ) ) );
		return center.add( leaf );

	},
	color: ( { b } ) => gradient( b.w, [ 0xb3261e, 0xe8590c, 0xf2a541, 0xc9a227 ] ).mul( 0.85 ),
	alpha: 0.4,
	size: 0.011
} );

// 38 Dandelion Seeds: a seed head releases parachute seeds one by one into the wind.
const dandelion = defineScene( {
	meta: {
		title: { ko: '민들레 홀씨', en: 'Dandelion Seeds' },
		ref: { ko: '둥근 씨앗 머리에서 갓털 달린 홀씨가 하나씩 떨어져 바람을 타고 흩어진다', en: 'Parachute seeds detach one by one from the seed head and drift away on the wind' }
	},
	camera: [ 0.6, 0, 3.4 ],
	count: 98_000,
	init( i, n ) {

		if ( i < 6000 ) return [ 0, - 1, 0, Math.random() * 2, 0, 0, 2 ]; // stalk
		const seed = Math.floor( ( i - 6000 ) / 80 ), k = ( i - 6000 ) % 80, seeds = Math.floor( ( n - 6000 ) / 80 );
		const y = 1 - 2 * ( seed + 0.5 ) / seeds, r = Math.sqrt( 1 - y * y ), a = seed * 2.39996;
		const detach = ( ( seed * 0.6180339 ) % 1 ) * 0.65 + 0.05; // all released seeds have faded out before the 24 s loop resets
		if ( k < 20 ) return [ Math.cos( a ) * r, y, Math.sin( a ) * r, k / 20 * 0.35, 0, 0, detach ];
		const fil = ( k - 20 ) % 12, step = Math.floor( ( k - 20 ) / 12 ) + 1;
		return [ Math.cos( a ) * r, y, Math.sin( a ) * r, 0.35 + step * 0.012, fil / 12 * TAU, step * 0.024, detach ];

	},
	position: ( { a, b, t } ) => {

		const dir = normalize( a );
		const p1 = normalize( cross( dir, vec3( 0.31, 0.95, 0.07 ) ) ), p2 = cross( dir, p1 );
		const local = dir.mul( b.x.add( 0.12 ) ).add( p1.mul( cos( b.y ) ).add( p2.mul( sin( b.y ) ) ).mul( b.z ) );
		const c = fract( t.div( 24 ) );
		const rel = smoothstep( b.w, b.w.add( 0.01 ), c );
		const tr = max( c.sub( b.w ), 0 ).mul( 24 );
		// Pappus parachute: carried downwind while sinking slowly at terminal speed, small gust wobble.
		const drift = vec3( tr.mul( 0.22 ), tr.mul( - 0.035 ).add( sin( tr.mul( 1.3 ).add( b.w.mul( 40 ) ) ).mul( 0.08 ) ), sin( tr.mul( 0.8 ).add( b.w.mul( 30 ) ) ).mul( 0.15 ) );
		return local.add( drift.mul( rel ) );

	},
	color: ( { b, t } ) => {

		const tr = max( fract( t.div( 24 ) ).sub( b.w ), 0 ).mul( 24 );
		const seed = mix( color( 0x9aa86a ), color( 0xe6eef6 ), smoothstep( 0.3, 0.36, b.x ) ).mul( smoothstep( 7, 4, tr ) ).mul( smoothstep( 0, 0.04, fract( t.div( 24 ) ) ) );
		return mix( seed, color( 0x5f8a3a ).mul( 0.6 ), step( 1.5, b.w ) );

	},
	alpha: 0.18,
	size: 0.009
} );

// 39 Spider Web: radial spokes first, then the capture spiral laid from the outside in, dew glinting.
const SPIRAL_MAX = 160;
const spiderWeb = defineScene( {
	meta: {
		title: { ko: '거미줄', en: 'Spider Web' },
		ref: { ko: '방사실을 먼저 치고 바깥에서 안쪽으로 나선 포획실을 감아 원형 그물을 짓는다', en: 'An orb web: radial spokes first, then the capture spiral wound from the outside in' }
	},
	camera: [ 0, 0, 4.6 ],
	count: 133_000,
	init( i ) {

		if ( i < 30000 ) { // spokes

			const a = Math.floor( Math.random() * 32 ) / 32 * TAU + 0.02, r = rand( 0.05, 1.9 );
			return [ Math.cos( a ) * r, Math.sin( a ) * r, 0, 0, - 1 ];

		}

		if ( i < 40000 ) { // frame octagon

			const k = Math.floor( Math.random() * 8 ), u = Math.random(), a0 = k / 8 * TAU, a1 = ( k + 1 ) / 8 * TAU;
			return [ 1.95 * ( Math.cos( a0 ) * ( 1 - u ) + Math.cos( a1 ) * u ), 1.95 * ( Math.sin( a0 ) * ( 1 - u ) + Math.sin( a1 ) * u ), 0, 0, - 1 ];

		}

		const th = Math.random() * SPIRAL_MAX, r = 0.3 + th * 0.0088;
		return [ Math.cos( th ) * r, Math.sin( th ) * r, 0, i < 43000 ? 2 : 1, 1 - th / SPIRAL_MAX ];

	},
	position: ( { a, t } ) => {

		const r = a.xy.length();
		return vec3( a.x, a.y, sin( t.mul( 0.7 ).add( r.mul( 1.5 ) ) ).mul( 0.05 ).mul( r ) );

	},
	color: ( { b, t, h } ) => {

		const vis = smoothstep( b.y, b.y.add( 0.01 ), fract( t.div( 24 ) ).mul( 1.15 ) );
		const silk = color( 0xcfd8e6 ).mul( 0.5 );
		const dew = color( 0xffffff ).mul( pow( max( sin( t.mul( 3 ).add( h.mul( 40 ) ) ), 0 ), 8 ).mul( 2 ).add( 0.5 ) );
		return mix( silk, dew, step( 1.5, b.x ) ).mul( vis );

	},
	alpha: 0.35,
	size: 0.009
} );

// 40 Ant Trails: ants shuttle along pheromone paths between the nest and food sources.
const FOODS = 7;
let antPaths;
const antTrails = defineScene( {
	meta: {
		title: { ko: '개미 행렬', en: 'Ant Trails' },
		ref: { ko: '개미들이 페로몬 길을 따라 개미집과 먹이 사이를 쉬지 않고 오간다', en: 'Ants shuttle along pheromone trails between the nest and food sources' }
	},
	camera: [ 0, 4.2, 2.4 ],
	count: 150_000,
	init( i ) {

		if ( i === 0 ) antPaths = Array.from( { length: FOODS }, ( _, k ) => {

			const a = k / FOODS * TAU + rand( - 0.2, 0.2 ), r = rand( 1.6, 2.4 );
			const fx = Math.cos( a ) * r, fz = Math.sin( a ) * r, off = rand( - 0.8, 0.8 );
			return [ fx, fz, fx / 2 - fz / r * off, fz / 2 + fx / r * off ];

		} );

		if ( i < 40000 ) return [ rand( - 3, 3 ), rand( - 2.5, 2.5 ), 0, 0, 0, 2, 0 ]; // ground
		if ( i < 46000 ) { // nest and food piles

			const food = Math.random() < 0.5, p = antPaths[ Math.floor( Math.random() * FOODS ) ];
			const [ x, z ] = food ? [ p[ 0 ], p[ 1 ] ] : [ 0, 0 ];
			return [ x + gauss() * 0.08, z + gauss() * 0.08, 0, 0, 0, 3, food ? 0 : 1 ];

		}

		const [ fx, fz, cx, cz ] = antPaths[ Math.floor( Math.random() * FOODS ) ];
		return [ fx, fz, cx, cz, Math.random(), i < 116000 ? 0 : 1, 0 ];

	},
	position: ( { a, b, t } ) => {

		const isAnt = step( 0.5, b.z ).mul( step( b.z, 1.5 ) ), isStatic = step( 1.5, b.z );
		const q = fract( t.mul( 0.04 ).add( b.y ) );
		const s = mix( b.y, q.mul( 2 ).sub( 1 ).abs().oneMinus(), isAnt ), r = s.oneMinus();
		// Quadratic bezier from the nest (origin) through the control point to the food.
		const x = a.z.mul( r.mul( s ).mul( 2 ) ).add( a.x.mul( s.mul( s ) ) ), z = b.x.mul( r.mul( s ).mul( 2 ) ).add( a.y.mul( s.mul( s ) ) );
		const wiggle = sin( s.mul( 70 ).add( b.y.mul( 50 ) ) ).mul( 0.015 );
		return mix( vec3( x.add( wiggle ), isAnt.mul( 0.01 ), z.sub( wiggle ) ), vec3( a.x, 0, a.y ), isStatic );

	},
	color: ( { b } ) => {

		const trail = mix( color( 0x3fe0c5 ).mul( 0.25 ), color( 0xff5a2a ).mul( 1.3 ), step( 0.5, b.z ) );
		const ground = color( 0x2a1a10 ).mul( 0.6 );
		const pile = mix( color( 0x9be15d ), color( 0xc08a4a ), b.w );
		return mix( mix( trail, ground, step( 1.5, b.z ) ), pile, step( 2.5, b.z ) );

	},
	alpha: 0.4,
	size: 0.011
} );

export default [ rainforest, treeGrowth, mycelium, fireflies, birdMigration, beehive, autumnLeaves, dandelion, spiderWeb, antTrails ];
