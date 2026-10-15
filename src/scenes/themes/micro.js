// Theme 7: Micro — atoms, molecules, cells.
import * as THREE from 'three/webgpu';
import { vec3, sin, cos, mix, fract, step, smoothstep, clamp, abs, pow, length, atan, color, mx_noise_float, mx_noise_vec3 } from 'three/tsl';
import { defineScene, gradient, TAU, rand } from '../../lib/defineScene.js';
import { gauss } from '../../lib/points.js';
import { curl } from '../../tsl/curl.js';

const is = ( v, k ) => step( k - 0.5, v ).mul( step( v, k + 0.5 ) );
const unit = () => new THREE.Vector3().randomDirection();

// Rejection-sample a probability density inside a cube of half-size `box`.
function sample( density, max, box ) {

	for ( ;; ) {

		const x = rand( - box, box ), y = rand( - box, box ), z = rand( - box, box );
		if ( Math.random() * max < density( x, y, z ) ) return [ x, y, z ];

	}

}

// Hydrogen-like |psi|^2, polar axis along y.
const p2 = ( x, y, z ) => y * y * Math.exp( - Math.hypot( x, y, z ) );
const d3 = ( x, y, z ) => {

	const r2 = x * x + y * y + z * z, f = 3 * y * y - r2;
	return f * f * Math.exp( - 2 * Math.sqrt( r2 ) / 3 );

};

const atomicOrbitals = defineScene( {
	meta: {
		title: { ko: '원자 오비탈', en: 'Atomic Orbitals' },
		ref: { ko: '전자가 2p 오비탈과 3d 오비탈 사이를 양자 도약하며, 색은 파동함수의 위상 부호를 나타낸다', en: 'Electron density quantum-jumps between 2p and 3d orbitals; color shows the wavefunction\'s phase sign' }
	},
	camera: [ 0, 0.6, 7 ],
	count: 110_000,
	init( i ) {

		if ( i < 1500 ) {

			const g = [ gauss() * 0.04, gauss() * 0.04, gauss() * 0.04 ];
			return [ ...g, ...g, 1 ];

		}

		const a = sample( p2, 0.55, 12 ).map( ( v ) => v * 0.28 );
		const b = sample( d3, 95, 25 ).map( ( v ) => v * 0.14 );
		return [ ...a, ...b, 0 ];

	},
	position: ( { a, b, t, h } ) => {

		const cycle = fract( t.div( 12 ) );
		const target = smoothstep( 0.3, 0.5, cycle ).sub( smoothstep( 0.8, 1, cycle ) );
		const m = step( h, target ); // each point jumps at its own moment
		return mix( a, b.xyz, m ).add( mx_noise_vec3( a.mul( 5 ).add( t.mul( 2 ) ) ).mul( 0.02 ) );

	},
	color: ( { a, b, t, h } ) => {

		const cycle = fract( t.div( 12 ) );
		const m = step( h, smoothstep( 0.3, 0.5, cycle ).sub( smoothstep( 0.8, 1, cycle ) ) );
		const lb = length( b.xyz );
		const sign = mix( step( 0, a.y ), step( 0, b.y.mul( b.y ).mul( 3 ).sub( lb.mul( lb ) ) ), m );
		const shimmer = sin( t.mul( 3 ).add( h.mul( 30 ) ) ).mul( 0.3 ).add( 0.8 );
		return mix( mix( color( 0xff3fa4 ), color( 0x2fe6d6 ), sign ).mul( shimmer ), color( 0xffffff ).mul( 2 ), b.w );

	},
	alpha: 0.3,
	size: 0.011
} );

// DNA: two backbones offset by a groove angle, base-pair rungs in between, scrolling upward.
// B-DNA: pitch 3.4 nm over radius 1 nm -> pitch 1.87 here, 10.5 bp per turn -> 40 rungs over DNA_H.
const DNA_H = 7.2, DNA_R = 0.55, DNA_K = TAU / ( 3.4 * DNA_R ), GROOVE = 2.3;
const BASES = [ [ 2, 3 ], [ 3, 2 ], [ 4, 5 ], [ 5, 4 ] ]; // A-T, T-A, G-C, C-G
const rungs = Array.from( { length: Math.round( DNA_H / ( 3.4 * DNA_R / 10.5 ) ) }, () => BASES[ Math.floor( rand( 0, 4 ) ) ] );

const dnaHelix = defineScene( {
	meta: {
		title: { ko: 'DNA 이중 나선', en: 'DNA Helix' },
		ref: { ko: '큰 홈과 작은 홈을 이루며 꼬인 두 가닥 사이를 A-T, G-C 염기쌍이 잇는다', en: 'Two strands twist into major and minor grooves, bridged by A-T and G-C base pairs' }
	},
	camera: [ 0, 0, 7.5 ],
	count: 150_000,
	init( i, n ) {

		const j = [ gauss() * 0.035, gauss() * 0.035, gauss() * 0.035 ];
		if ( i < n * 0.66 ) {

			const strand = i % 2;
			return [ rand( 0, DNA_H ), strand, 0, strand, ...j ];

		}

		const k = Math.floor( rand( 0, rungs.length ) ), f = rand( 0.08, 0.92 );
		return [ ( k + 0.5 ) * DNA_H / rungs.length, rungs[ k ][ f < 0.5 ? 0 : 1 ], 0, f, ...j.map( ( v ) => v * 0.5 ) ];

	},
	position: ( { a, b, t } ) => {

		const y = fract( a.x.add( t.mul( 0.25 ) ).div( DNA_H ) ).sub( 0.5 ).mul( DNA_H );
		const th = y.mul( DNA_K );
		// z = -sin keeps the twist right-handed about +y, as in B-DNA.
		const p1 = vec3( cos( th ).mul( DNA_R ), y, sin( th ).mul( - DNA_R ) );
		const p2 = vec3( cos( th.add( GROOVE ) ).mul( DNA_R ), y, sin( th.add( GROOVE ) ).mul( - DNA_R ) );
		return mix( p1, p2, b.x ).add( b.yzw );

	},
	color: ( { a, t } ) => {

		const y = fract( a.x.add( t.mul( 0.25 ) ).div( DNA_H ) ).sub( 0.5 ).mul( DNA_H );
		const id = a.y;
		const c = mix( mix( mix( mix( mix( color( 0x8fb4ff ), color( 0xb6a0ff ), is( id, 1 ) ), color( 0xff4f5e ), is( id, 2 ) ),
			color( 0xffc94a ), is( id, 3 ) ), color( 0x3ddc84 ), is( id, 4 ) ), color( 0x3aa0ff ), is( id, 5 ) );
		return c.mul( smoothstep( DNA_H / 2, DNA_H / 2 - 0.7, abs( y ) ) );

	},
	alpha: 0.32,
	size: 0.011,
	spin: 0.35
} );

// Mitosis: membrane sphere pinches into two daughters while chromosomes condense, align and separate.
const MEMBRANE = 100_000, CHROMOSOMES = 12;
const chromo = Array.from( { length: CHROMOSOMES }, () => {

	const r = Math.sqrt( Math.random() ) * 0.55, a = rand( 0, TAU );
	return { y: r * Math.cos( a ), z: r * Math.sin( a ), phi: rand( 0, TAU ) };

} );

const mitosis = defineScene( {
	meta: {
		title: { ko: '세포 분열', en: 'Mitosis' },
		ref: { ko: '흩어진 염색질이 응축해 적도판에 늘어선 뒤 양극으로 갈라지고, 세포막이 잘록해져 두 세포가 된다', en: 'Chromatin condenses, lines up on the metaphase plate, splits to the poles, and the membrane pinches in two' }
	},
	camera: [ 0, 0.4, 5.4 ],
	count: 150_000,
	init( i ) {

		if ( i < MEMBRANE ) {

			const u = unit(), side = u.x >= 0 ? 1 : - 1;
			const xp = 2 * Math.abs( u.x ) - 1, sc = Math.sqrt( Math.max( 1 - xp * xp, 0 ) ) / Math.max( Math.sqrt( 1 - u.x * u.x ), 1e-3 );
			return [ u.x, u.y, u.z, side * xp, u.y * sc, u.z * sc, 0 ];

		}

		const diffuse = unit().multiplyScalar( Math.cbrt( Math.random() ) * 0.6 );
		const c = chromo[ i % CHROMOSOMES ], side = Math.random() < 0.5 ? - 1 : 1, l = rand( - 0.22, 0.22 );
		const x = side * ( 0.03 + Math.abs( l ) * 0.25 ) + gauss() * 0.012;
		return [ diffuse.x, diffuse.y, diffuse.z, x, c.y + Math.cos( c.phi ) * l + gauss() * 0.012, c.z + Math.sin( c.phi ) * l + gauss() * 0.012, side ];

	},
	position: ( { a, b, t, i } ) => {

		const s = fract( t.div( 14 ) );
		const p1 = smoothstep( 0.12, 0.32, s ), p2 = smoothstep( 0.4, 0.6, s ), p3 = smoothstep( 0.55, 0.85, s );
		const side = step( 0, a.x ).mul( 2 ).sub( 1 );
		const wobble = mx_noise_float( a.mul( 2 ).add( t.mul( 0.3 ) ) ).mul( 0.04 ).add( 1 );
		const membrane = mix( a.mul( 1.15 ), vec3( side, 0, 0 ).add( b.xyz.mul( 0.85 ) ), p3 ).mul( wobble );
		const chrom = mix( a, b.xyz, p1 ).add( vec3( b.w.mul( p2 ).mul( 1 ), 0, 0 ) );
		return mix( membrane, chrom, step( MEMBRANE - 0.5, i.toFloat() ) );

	},
	color: ( { t, i } ) => {

		const s = fract( t.div( 14 ) );
		const fade = smoothstep( 0, 0.05, s ).mul( smoothstep( 1, 0.94, s ) );
		const chrom = mix( color( 0xff4fa3 ), color( 0xffc24a ), smoothstep( 0.4, 0.6, s ) ).mul( 1.4 );
		return mix( color( 0x3fd6b0 ).mul( 0.45 ), chrom, step( MEMBRANE - 0.5, i.toFloat() ) ).mul( fade );

	},
	alpha: 0.32,
	size: 0.011
} );

// Virus capsid: T=16 geodesic lattice of capsomeres (12 pentamers + hexamers) around a coiled genome.
const capsomeres = ( () => {

	const unique = ( geo ) => {

		const p = geo.attributes.position, seen = new Map();
		for ( let k = 0; k < p.count; k ++ ) {

			const v = new THREE.Vector3().fromBufferAttribute( p, k ).normalize();
			seen.set( v.toArray().map( ( c ) => c.toFixed( 3 ) ).join(), v );

		}

		return [ ...seen.values() ];

	};

	const corners = unique( new THREE.IcosahedronGeometry( 1, 0 ) );
	return unique( new THREE.IcosahedronGeometry( 1, 3 ) ).map( ( v ) => ( { v, five: corners.some( ( c ) => c.distanceTo( v ) < 1e-3 ) } ) );

} )();

const genomePath = ( () => {

	const pts = [], p = new THREE.Vector3(), d = unit();
	for ( let k = 0; k < 4000; k ++ ) {

		d.add( unit().multiplyScalar( 0.35 ) ).normalize();
		if ( p.length() > 0.7 ) d.addScaledVector( p, - 0.5 ).normalize();
		p.addScaledVector( d, 0.03 );
		pts.push( p.clone() );

	}

	return pts;

} )();

const virusCapsid = defineScene( {
	meta: {
		title: { ko: '바이러스 캡시드', en: 'Virus Capsid' },
		ref: { ko: '오량체와 육량체 단백질이 정이십면체 대칭으로 맞물려 유전체를 감싼다', en: 'Pentamer and hexamer proteins lock into icosahedral symmetry around a coiled genome' }
	},
	camera: [ 0, 0.5, 4.3 ],
	count: 140_000,
	init( i, n ) {

		if ( i < n * 0.25 ) {

			const q = genomePath[ Math.floor( rand( 0, genomePath.length ) ) ];
			return [ q.x + gauss() * 0.01, q.y + gauss() * 0.01, q.z + gauss() * 0.01, 0, 1 ];

		}

		const { v, five } = capsomeres[ Math.floor( rand( 0, capsomeres.length ) ) ];
		const k = five ? 5 : 6, m = Math.floor( rand( 0, k ) );
		const t1 = new THREE.Vector3().crossVectors( v, Math.abs( v.y ) < 0.9 ? new THREE.Vector3( 0, 1, 0 ) : new THREE.Vector3( 1, 0, 0 ) ).normalize();
		const t2 = new THREE.Vector3().crossVectors( v, t1 );
		const ang = m / k * TAU;
		const p = v.clone().multiplyScalar( 1 + Math.abs( gauss() ) * 0.03 )
			.addScaledVector( t1, Math.cos( ang ) * 0.07 + gauss() * 0.016 )
			.addScaledVector( t2, Math.sin( ang ) * 0.07 + gauss() * 0.016 );
		return [ p.x, p.y, p.z, five ? 1 : 0, 0 ];

	},
	position: ( { a, b, t } ) => a.mul( sin( t.mul( 1.5 ).add( length( a ).mul( 4 ) ) ).mul( 0.02 ).mul( b.y.oneMinus() ).add( 1 ) ),
	color: ( { a, b } ) => {

		const relief = smoothstep( 0.98, 1.06, length( a ) );
		const shell = mix( color( 0x9a8cff ), color( 0xffc24a ), b.x ).mul( relief.mul( 0.8 ).add( 0.45 ) );
		return mix( shell, color( 0x2fd5c0 ).mul( 0.35 ), b.y );

	},
	// Solid body: an opaque black sphere just inside the protein shell; the genome is enclosed and hidden, as in reality hides its far side and anything behind it.
	extras( { scene } ) {

		const body = new THREE.Mesh( new THREE.SphereGeometry( 0.95, 64, 32 ), new THREE.MeshBasicNodeMaterial( { color: 0x000000 } ) );
		scene.add( body );

	},
	alpha: 0.32,
	size: 0.011,
	spin: 0.15
} );

// Blood flow: biconcave red cells tumble down a curving vessel, fastest at the centre (Poiseuille).
const VESSEL_R = 0.75, VESSEL_L = 8, WALL = 45_000, CELL_POINTS = 420;
let cellSeed = null;

const bloodFlow = defineScene( {
	meta: {
		title: { ko: '혈류', en: 'Blood Flow' },
		ref: { ko: '오목한 원반 모양 적혈구가 구르며 혈관을 흐르고, 중심부일수록 빠르다', en: 'Biconcave red cells tumble along a vessel, fastest along its centre' }
	},
	camera: [ 0, 0, 4.2 ],
	count: 160_000,
	init( i ) {

		if ( i < WALL ) {

			const a = rand( 0, TAU ), x = rand( - VESSEL_L / 2, VESSEL_L / 2 );
			return [ x, Math.cos( a ) * VESSEL_R, Math.sin( a ) * VESSEL_R ];

		}

		if ( ! cellSeed || ( i - WALL ) % CELL_POINTS === 0 ) {

			const r = Math.sqrt( Math.random() ) * ( VESSEL_R - 0.15 ), a = rand( 0, TAU );
			cellSeed = { s0: rand( 0, VESSEL_L ), ry: Math.cos( a ) * r, rz: Math.sin( a ) * r, phase: rand( 0, TAU ) + ( Math.random() < 0.08 ? 100 : 0 ) };

		}

		const platelet = cellSeed.phase > 50 ? 0.4 : 1;
		const rho = Math.sqrt( Math.random() ) * 0.12 * platelet, phi = rand( 0, TAU );
		const h = ( 0.022 + 0.035 * ( rho / 0.12 ) ** 2 ) * platelet * ( Math.random() < 0.5 ? - 1 : 1 );
		return [ rho * Math.cos( phi ), rho * Math.sin( phi ), h, cellSeed.s0, cellSeed.ry, cellSeed.rz, cellSeed.phase ];

	},
	position: ( { a, b, t, i } ) => {

		const wall = vec3( a.x, sin( a.x.mul( 0.8 ) ).mul( 0.3 ).add( a.y ), a.z );
		const r2 = b.y.mul( b.y ).add( b.z.mul( b.z ) ).div( VESSEL_R * VESSEL_R );
		const x = fract( b.x.add( t.mul( r2.mul( - 0.7 ).add( 1 ).mul( 0.9 ) ) ).div( VESSEL_L ) ).sub( 0.5 ).mul( VESSEL_L );
		// Cells spin at half the local vorticity of the parabolic profile: rate ~ radial offset, zero on the axis,
		// opposite sense on opposite sides (z offset -> spin about y, y offset -> spin about z).
		const SPIN = 0.9 * 1.4 * 0.5 / ( VESSEL_R * VESSEL_R );
		const ang = b.w.add( t.mul( b.z.mul( SPIN ) ) ), angZ = t.mul( b.y.mul( SPIN ) );
		const l1 = vec3( a.x.mul( cos( ang ) ).sub( a.z.mul( sin( ang ) ) ), a.y, a.x.mul( sin( ang ) ).add( a.z.mul( cos( ang ) ) ) );
		const local = vec3( l1.x.mul( cos( angZ ) ).sub( l1.y.mul( sin( angZ ) ) ), l1.x.mul( sin( angZ ) ).add( l1.y.mul( cos( angZ ) ) ), l1.z );
		const cell = vec3( x, sin( x.mul( 0.8 ) ).mul( 0.3 ).add( b.y ), b.z ).add( local );
		return mix( wall, cell, step( WALL - 0.5, i.toFloat() ) );

	},
	color: ( { a, b, i } ) => {

		const rim = smoothstep( 0.04, 0.12, length( a.xy ) );
		const rbc = mix( color( 0x7a0710 ), color( 0xff4a3a ), rim );
		const cell = mix( rbc, color( 0xffc070 ), step( 50, b.w ) );
		const wall = color( 0x5a1a2a ).mul( mx_noise_float( a.mul( 3 ) ).mul( 0.3 ).add( 0.4 ) );
		return mix( wall, cell, step( WALL - 0.5, i.toFloat() ) );

	},
	alpha: 0.35,
	size: 0.011
} );

// Protein folding: a stretched chain collapses, N-terminus first, into a compact helical globule.
const RESIDUES = 360;
const chain = Array.from( { length: RESIDUES }, ( _, k ) => {

	const u = k / RESIDUES;
	const unfolded = new THREE.Vector3( ( u - 0.5 ) * 6.4, Math.sin( u * 40 ) * 0.08, Math.cos( u * 23 ) * 0.08 );
	// Compact backbone: a (2,5) torus knot, dressed with an alpha-helix coil on helical stretches.
	const q = u * TAU, R = 0.75 + 0.3 * Math.cos( 5 * q );
	const c = new THREE.Vector3( R * Math.cos( 2 * q ), 0.3 * Math.sin( 5 * q ), R * Math.sin( 2 * q ) );
	const helix = Math.floor( k / 18 ) % 3 !== 2;
	const coil = helix ? 0.12 : 0.04, turn = k * 100 / 180 * Math.PI;
	const folded = c.clone().add( new THREE.Vector3( Math.cos( turn ) * coil, Math.sin( turn ) * coil, Math.sin( turn * 0.5 ) * coil * 0.5 ) );
	return { unfolded, folded };

} );

const proteinFolding = defineScene( {
	meta: {
		title: { ko: '단백질 접힘', en: 'Protein Folding' },
		ref: { ko: '길게 풀린 아미노산 사슬이 N 말단부터 차례로 접혀 나선을 품은 구형 구조가 된다', en: 'An unfolded amino-acid chain folds from its N-terminus into a compact, helix-rich globule' }
	},
	camera: [ 0, 0, 6.5 ],
	count: 120_000,
	init() {

		const k = Math.floor( rand( 0, RESIDUES ) ), { unfolded: u, folded: f } = chain[ k ];
		const o = [ gauss() * 0.035, gauss() * 0.035, gauss() * 0.035 ];
		return [ u.x + o[ 0 ], u.y + o[ 1 ], u.z + o[ 2 ], f.x + o[ 0 ], f.y + o[ 1 ], f.z + o[ 2 ], k / RESIDUES ];

	},
	position: ( { a, b, t } ) => {

		const s = fract( t.div( 16 ) );
		const f = smoothstep( 0.08, 0.45, s ).sub( smoothstep( 0.75, 0.95, s ) );
		const m = smoothstep( 0, 1, clamp( f.mul( 1.6 ).sub( b.w.mul( 0.6 ) ), 0, 1 ) );
		return mix( a, b.xyz, m ).add( curl( a.mul( 1.5 ).add( t.mul( 0.3 ) ) ).mul( 0.06 ).mul( m.oneMinus() ) );

	},
	color: ( { b } ) => gradient( b.w, [ 0x2b3cff, 0x19c6d8, 0x3ddc84, 0xffd23f, 0xff4f3a ] ),
	alpha: 0.3,
	size: 0.011,
	spin: 0.08
} );

// Brownian motion: fast gas molecules bounce in a box; heavy grains wander, one leaves a trail.
const BOX = new THREE.Vector3( 2.4, 1.4, 1 );
const MOLECULES = 135_000, GRAINS = 6, GRAIN_POINTS = 4000;
const grainPath = ( gid, time ) => mx_noise_vec3( vec3( gid.mul( 7.3 ), time.mul( 0.25 ), 0 ) ).mul( vec3( 1.6, 0.9, 0.6 ) )
	.add( mx_noise_vec3( vec3( gid.mul( 3.1 ), time.mul( 3 ), 5 ) ).mul( 0.05 ) );

const brownianMotion = defineScene( {
	meta: {
		title: { ko: '브라운 운동', en: 'Brownian Motion' },
		ref: { ko: '보이지 않는 분자들이 쉼 없이 부딪혀 큰 입자를 불규칙하게 떠민다', en: 'Unseen molecules jostle heavy grains into an endless random walk' }
	},
	camera: [ 0, 0, 5.6 ],
	count: MOLECULES + GRAINS * GRAIN_POINTS + 16_000,
	init( i ) {

		if ( i < MOLECULES ) {

			const v = unit().multiplyScalar( rand( 1.5, 3 ) );
			return [ rand( - BOX.x, BOX.x ), rand( - BOX.y, BOX.y ), rand( - BOX.z, BOX.z ), v.x, v.y, v.z, 0 ];

		}

		if ( i < MOLECULES + GRAINS * GRAIN_POINTS ) {

			const g = unit().multiplyScalar( Math.cbrt( Math.random() ) * 0.12 );
			return [ g.x, g.y, g.z, Math.floor( ( i - MOLECULES ) / GRAIN_POINTS ), 0, 0, 1 ];

		}

		return [ 0, 0, 0, 0, rand( 0, 25 ), 0, 2 ];

	},
	position: ( { a, b, t } ) => {

		const box = vec3( BOX.x, BOX.y, BOX.z );
		const u = a.div( box.mul( 2 ) ).add( 0.5 ).add( b.xyz.mul( t ).div( box.mul( 2 ) ) );
		const tri = abs( fract( u.mul( 0.5 ) ).mul( 2 ).oneMinus() ).oneMinus(); // reflecting walls
		const molecule = tri.sub( 0.5 ).mul( box.mul( 2 ) );
		const grain = grainPath( b.x, t.sub( b.y ) ).add( a );
		return mix( molecule, grain, step( 0.5, b.w ) );

	},
	color: ( { b } ) => color( 0x2a6bff ).mul( 0.22 ).mul( is( b.w, 0 ) )
		.add( color( 0xffc860 ).mul( 1.2 ).mul( is( b.w, 1 ) ) )
		.add( color( 0xffffff ).mul( smoothstep( 25, 0, b.y ) ).mul( is( b.w, 2 ) ) ),
	alpha: 0.35,
	size: 0.01
} );

// Bacterial colonies on agar: each point lights up when the colony front, with fingered edges, reaches it.
const COLONIES = Array.from( { length: 7 }, ( _, k ) => ( {
	c: k === 0 ? [ 0, 0 ] : [ Math.cos( k ) * rand( 0.8, 1.5 ), Math.sin( k * 2.1 ) * rand( 0.6, 1.4 ) ],
	R: rand( 0.35, 0.85 ), strain: k % 3 / 2, p: [ rand( 0, TAU ), rand( 0, TAU ), rand( 0, TAU ) ]
} ) );
const DISH_R = 2.2;
// Colonies stop growing where they meet a neighbour or the dish wall (contact inhibition), so fronts never overlap.
// Fingers reach 1.35 R, so cap R at half the gap to the nearest colony and inside the rim.
COLONIES.forEach( ( col ) => {

	const gap = Math.min( ...COLONIES.filter( ( o ) => o !== col ).map( ( o ) => Math.hypot( o.c[ 0 ] - col.c[ 0 ], o.c[ 1 ] - col.c[ 1 ] ) ) );
	col.R = Math.min( col.R, gap / ( 2 * 1.35 ) * 0.95, ( DISH_R - Math.hypot( ...col.c ) ) / 1.35 * 0.95 );

} );

const bacterialColony = defineScene( {
	meta: {
		title: { ko: '세균 군집', en: 'Bacterial Colony' },
		ref: { ko: '배양 접시의 한천 위에서 세균 군집이 손가락 같은 가장자리를 뻗으며 자란다', en: 'Colonies spread across agar in a petri dish, pushing out fingered edges' }
	},
	camera: [ 0, 5.6, 0.9 ],
	count: 160_000,
	init( i, n ) {

		if ( i < n * 0.06 ) {

			const a = rand( 0, TAU );
			return [ Math.cos( a ) * DISH_R, rand( 0, 0.12 ), Math.sin( a ) * DISH_R, 0, 0, 0, 1 ];

		}

		if ( i < n * 0.16 ) {

			const a = rand( 0, TAU ), r = Math.sqrt( Math.random() ) * DISH_R;
			return [ Math.cos( a ) * r, - 0.02, Math.sin( a ) * r, 0, 0, 0, 2 ];

		}

		const col = COLONIES[ Math.floor( Math.random() ** 0.7 * COLONIES.length ) ];
		const th = rand( 0, TAU ), [ p1, p2, p3 ] = col.p;
		const finger = 1 + 0.35 * ( 0.5 * Math.sin( 5 * th + p1 ) + 0.3 * Math.sin( 11 * th + p2 ) + 0.2 * Math.sin( 23 * th + p3 ) );
		const u = Math.sqrt( Math.random() ), r = col.R * finger * u;
		return [ col.c[ 0 ] + Math.cos( th ) * r, 0, col.c[ 1 ] + Math.sin( th ) * r, Math.min( u + Math.random() * 0.06, 1 ), col.strain, 0, 0 ];

	},
	position: ( { a, b, t } ) => {

		const g = fract( t.div( 18 ) ).mul( 1.15 );
		const vis = step( b.x, g ).mul( is( b.w, 0 ) );
		return vec3( a.x, a.y.add( b.x.oneMinus().mul( 0.05 ).mul( vis ) ), a.z );

	},
	color: ( { b, t } ) => {

		const g = fract( t.div( 18 ) ).mul( 1.15 );
		const vis = step( b.x, g );
		const edge = smoothstep( 0.06, 0, g.sub( b.x ) );
		const colony = gradient( b.y, [ 0x3ddc84, 0xffc940, 0xc86bff ] ).mul( edge.mul( 1.4 ).add( 0.35 ) ).mul( vis ).mul( smoothstep( 1.15, 1.05, g ) );
		return colony.mul( is( b.w, 0 ) ).add( color( 0x6fa8ff ).mul( 0.4 ).mul( is( b.w, 1 ) ) ).add( color( 0xd9b36b ).mul( 0.07 ).mul( is( b.w, 2 ) ) );

	},
	alpha: 0.35,
	size: 0.011
} );

// Diatom frustules: centric discs (ribs, rings, pores) and pennate ellipses (raphe, striae).
const DIATOMS = [
	{ c: [ - 1.6, 0.7 ], r: 0.7, centric: true, spin: 0.08 }, { c: [ 0.1, - 0.2 ], r: 0.9, centric: true, spin: - 0.05 },
	{ c: [ 1.8, 0.8 ], r: 0.5, centric: true, spin: 0.1 }, { c: [ 1.6, - 1.1 ], r: 0.45, centric: true, spin: - 0.07 },
	{ c: [ - 1.5, - 1.1 ], r: 0.6, centric: false, spin: 0.04 }, { c: [ 0.4, 1.35 ], r: 0.45, centric: false, spin: - 0.06 }
];

function diatomPoint( d ) {

	for ( ;; ) {

		if ( d.centric ) {

			const rho = Math.sqrt( Math.random() ), th = rand( 0, TAU );
			const sector = ( th * 24 / TAU ) % 1, ring = ( rho * 7 ) % 1;
			const cell = [ ( rho * 14 ) % 1 - 0.5, ( th * 48 / TAU ) % 1 - 0.5 ];
			const keep = rho < 0.12 || rho > 0.95 || Math.abs( sector - 0.5 ) > 0.44 || ring < 0.1 || Math.hypot( ...cell ) < 0.26;
			if ( keep ) return [ rho * Math.cos( th ) * d.r, rho * Math.sin( th ) * d.r, 0.12 * d.r * ( 1 - rho * rho ) ];

		} else {

			const x = rand( - 1, 1 ), w = Math.sqrt( 1 - x * x ), y = rand( - 1, 1 ) * w;
			const edge = Math.abs( y ) > w - 0.06, raphe = Math.abs( y ) < 0.03 && Math.abs( x ) > 0.1, striae = ( x * 22 + 100 ) % 1 < 0.3;
			if ( edge || raphe || striae ) return [ x * d.r * 2.2, y * d.r * 0.7, 0.06 * d.r * ( 1 - x * x ) ];

		}

	}

}

const diatoms = defineScene( {
	meta: {
		title: { ko: '규조류', en: 'Diatoms' },
		ref: { ko: '방사 대칭 원반형과 길쭉한 깃털형 규조류의 유리질 껍질에 새겨진 구멍과 늑골 무늬', en: 'Glassy shells of radial and elongated diatoms, etched with pores, ribs and striae' }
	},
	camera: [ 0, 0, 4.8 ],
	count: 160_000,
	init() {

		const d = DIATOMS[ Math.floor( rand( 0, DIATOMS.length ) ) ];
		return [ ...diatomPoint( d ), d.c[ 0 ], d.c[ 1 ], d.spin, 0 ];

	},
	position: ( { a, b, t } ) => {

		const ang = t.mul( b.z );
		return vec3( b.x.add( a.x.mul( cos( ang ) ).sub( a.y.mul( sin( ang ) ) ) ), b.y.add( a.x.mul( sin( ang ) ).add( a.y.mul( cos( ang ) ) ) ), a.z );

	},
	color: ( { a, t } ) => {

		const hue = fract( atan( a.y, a.x ).div( TAU ).add( length( a.xy ).mul( 0.8 ) ).sub( t.mul( 0.05 ) ) );
		return gradient( hue, [ 0x19c6d8, 0xb388ff, 0xffd27a, 0x19c6d8 ] ).mul( 0.85 );

	},
	alpha: 0.3,
	size: 0.01
} );

// Snowflake: one hexagonal dendrite. Points carry their arrival time along the growth path.
const FLAKE_R = 1.6;
const flakeSegments = ( () => {

	const segs = []; // [x0, y0, x1, y1, t0, t1]
	segs.push( [ 0.12, 0, FLAKE_R, 0, 0.12, FLAKE_R ] );
	for ( let j = 1; j <= 9; j ++ ) {

		const r = 0.12 + j * 0.15;
		const len = ( FLAKE_R - r ) * 0.55 * rand( 0.6, 1 );
		for ( const s of [ 1, - 1 ] ) {

			const dx = Math.cos( Math.PI / 3 ), dy = s * Math.sin( Math.PI / 3 );
			segs.push( [ r, 0, r + dx * len, dy * len, r, r + len ] );
			for ( let m = 1; m <= 2; m ++ ) {

				const q = len * m / 3, sl = ( len - q ) * 0.45;
				const bx = r + dx * q, by = dy * q;
				segs.push( [ bx, by, bx + sl, by, r + q, r + q + sl ] ); // sub-branch parallel to the spine
				segs.push( [ bx, by, bx + Math.cos( s * 2 * Math.PI / 3 ) * sl * 0.8, by + Math.sin( s * 2 * Math.PI / 3 ) * sl * 0.8, r + q, r + q + sl ] );

			}

		}

	}

	return segs;

} )();
const segLen = flakeSegments.map( ( [ x0, y0, x1, y1 ] ) => Math.hypot( x1 - x0, y1 - y0 ) );
const segTotal = segLen.reduce( ( s, l ) => s + l, 0 );

const snowflake = defineScene( {
	meta: {
		title: { ko: '눈 결정', en: 'Snowflake' },
		ref: { ko: '육각 판에서 시작한 하나의 눈 결정이 여섯 방향 대칭으로 수지상 가지를 뻗으며 자란다', en: 'A single crystal grows from a hexagonal plate into six symmetric dendritic arms' }
	},
	camera: [ 0, 0, 4.4 ],
	count: 130_000,
	init( i, n ) {

		const rot = Math.floor( rand( 0, 6 ) ) * Math.PI / 3, c = Math.cos( rot ), s = Math.sin( rot );
		let x, y, arrival;
		if ( i < n * 0.12 ) {

			// Hexagonal plate: radius to the hexagon edge at angle th.
			const th = rand( 0, TAU ), edge = 0.26 * Math.cos( Math.PI / 6 ) / Math.cos( th % ( Math.PI / 3 ) - Math.PI / 6 );
			const r = Math.sqrt( Math.random() ) * edge;
			x = r * Math.cos( th ); y = r * Math.sin( th ); arrival = r / 0.26 * 0.08;

		} else {

			let pick = Math.random() * segTotal, k = 0;
			while ( pick > segLen[ k ] ) pick -= segLen[ k ++ ];
			const [ x0, y0, x1, y1, t0, t1 ] = flakeSegments[ k ], f = pick / segLen[ k ];
			x = x0 + ( x1 - x0 ) * f + gauss() * 0.01; y = y0 + ( y1 - y0 ) * f + gauss() * 0.01;
			arrival = ( t0 + ( t1 - t0 ) * f ) / ( FLAKE_R * 1.35 );

		}

		return [ x * c - y * s, x * s + y * c, gauss() * 0.008, arrival ];

	},
	position: ( { a } ) => a,
	color: ( { a, b, t } ) => {

		const g = fract( t.div( 15 ) ).mul( 1.2 );
		const vis = step( b.x, g ), tip = smoothstep( 0.05, 0, g.sub( b.x ) );
		const prism = sin( atan( a.y, a.x ).mul( 6 ).add( length( a.xy ).mul( 8 ) ) ).mul( 0.5 ).add( 0.5 );
		const ice = mix( mix( color( 0x9fd8ff ), color( 0xc6a8ff ), prism.mul( 0.4 ) ), color( 0xffffff ), tip );
		return ice.mul( tip.mul( 1.2 ).add( 0.6 ) ).mul( vis ).mul( smoothstep( 1.2, 1.1, g ) );

	},
	alpha: 0.35,
	size: 0.011,
	spin: 0.1
} );

export default [ atomicOrbitals, dnaHelix, mitosis, virusCapsid, bloodFlow, proteinFolding, brownianMotion, bacterialColony, diatoms, snowflake ];
