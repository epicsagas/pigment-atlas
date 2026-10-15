// Theme 10: Physics & Math — laws and mathematical structures.
import { Fn, float, vec2, vec3, sin, cos, mix, fract, step, smoothstep, clamp, exp, pow, length, hash, color, refract } from 'three/tsl';
import { defineScene, gradient, TAU, rand } from '../../lib/defineScene.js';

// 91 Lorenz attractor: one long trajectory integrated on the CPU; a bright head races along it.
const LORENZ_N = 160_000;
const lorenz = new Float32Array( LORENZ_N * 3 );
{

	let x = 0.1, y = 0, z = 0;
	const dt = 0.004;
	for ( let k = - 2000; k < LORENZ_N; k ++ ) {

		const dx = 10 * ( y - x ), dy = x * ( 28 - z ) - y, dz = x * y - ( 8 / 3 ) * z;
		x += dx * dt; y += dy * dt; z += dz * dt;
		if ( k >= 0 ) lorenz.set( [ x * 0.07, ( z - 25 ) * 0.07, y * 0.07 ], k * 3 );

	}

}

const lorenzAttractor = defineScene( {
	meta: {
		title: { ko: '로렌츠 끌개', en: 'Lorenz Attractor' },
		ref: { ko: '초기값에 민감한 결정론적 혼돈이 두 날개를 오가는 궤적을 그린다', en: 'Deterministic chaos, sensitive to its start, traces a path looping between two wings' }
	},
	camera: [ 0, 0.2, 5 ],
	count: LORENZ_N,
	init: ( i ) => [ lorenz[ i * 3 ], lorenz[ i * 3 + 1 ], lorenz[ i * 3 + 2 ], i / LORENZ_N ],
	position: ( { a } ) => a,
	color: ( { a, b, t } ) => {

		const behind = fract( t.mul( 0.02 ).sub( b.x ) ); // distance behind the moving head
		const trail = exp( behind.mul( - 25 ) );
		return gradient( smoothstep( - 1.6, 1.6, a.y ), [ 0x3a0d6b, 0xff4f8b, 0xffb547 ] ).mul( trail.mul( 2.2 ).add( 0.18 ) );

	},
	alpha: 0.3,
	size: 0.01,
	spin: 0.06
} );

// 92 Pendulum wave: pendulum k completes (8 + k) swings every 16 s, so the row realigns periodically.
const PENDULUMS = 24, STRING = 1500, BOB = 4500;

const pendulumWave = defineScene( {
	meta: {
		title: { ko: '진자 파동', en: 'Pendulum Wave' },
		ref: { ko: '길이가 조금씩 다른 진자들이 위상차로 뱀 같은 파동과 정렬을 반복한다', en: 'Pendulums of slightly different lengths drift in phase, forming snakes, then realigning' }
	},
	camera: [ 2.4, 1.2, 4.2 ],
	count: PENDULUMS * ( STRING + BOB ),
	init( i ) {

		const k = Math.floor( i / ( STRING + BOB ) ), j = i % ( STRING + BOB );
		const f = ( 8 + k ) / 16, L = 9.81 / ( TAU * f ) ** 2 * 0.55;
		const x = ( k / ( PENDULUMS - 1 ) - 0.5 ) * 4;
		if ( j < STRING ) return [ x, 0, 0, f, L, 0, j / STRING ];
		const r = 0.07 * Math.cbrt( Math.random() ), th = rand( 0, TAU ), ph = Math.acos( rand( - 1, 1 ) );
		return [ x + r * Math.sin( ph ) * Math.cos( th ), r * Math.cos( ph ), r * Math.sin( ph ) * Math.sin( th ), f, L, 1, 1 ];

	},
	position: ( { a, b, t } ) => {

		// Small-angle swing (0.25 rad): only there is T = 2*pi*sqrt(L/g) amplitude-independent, so the row realigns every 16 s.
		const theta = cos( t.mul( b.x ).mul( TAU ) ).mul( 0.25 );
		const d = b.w.mul( b.y );
		return vec3( a.x, d.mul( cos( theta ) ).negate().add( 1.3 ).add( a.y ), d.mul( sin( theta ) ).add( a.z ) );

	},
	color: ( { a, b } ) => gradient( a.x.div( 4 ).add( 0.5 ), [ 0x12d6b0, 0x9bff4f, 0xfff07a ] ).mul( mix( 0.2, 1.1, b.z ) ),
	alpha: 0.4,
	size: 0.011
} );

// 93 Lissajous: three nested 3D figures with integer frequency ratios; phase drift makes them breathe.
const FIGURES = [ [ 3, 2, 5, 1.6 ], [ 5, 4, 7, 1.15 ], [ 7, 6, 9, 0.7 ] ];

const lissajous = defineScene( {
	meta: {
		title: { ko: '리사주 곡선', en: 'Lissajous' },
		ref: { ko: '서로 다른 주파수 비의 진동을 겹치면 닫힌 매듭 곡선이 나타난다', en: 'Superposed oscillations with integer frequency ratios close into knotted curves' }
	},
	camera: [ 0, 0, 5 ],
	count: 150_000,
	init( i ) {

		const c = i % 3, [ fa, fb, fc, r ] = FIGURES[ c ];
		return [ fa, fb, fc, Math.random() * TAU, r, c / 2, ( Math.random() - 0.5 ) * 0.02 ];

	},
	position: ( { a, b, t } ) => vec3(
		sin( a.x.mul( b.x ).add( t.mul( 0.25 ) ) ),
		sin( a.y.mul( b.x ) ),
		sin( a.z.mul( b.x ).add( t.mul( 0.17 ) ) )
	).mul( b.y.add( b.w ) ),
	color: ( { b } ) => gradient( b.z, [ 0xb05cff, 0xff5ec4, 0x4ff0ff ] ),
	alpha: 0.35,
	size: 0.01,
	spin: 0.08
} );

// 94 Magnetic dipole: field lines r = L sin^2(theta) in meridian planes, with particles flowing N to S.
const LS = [ 0.5, 0.8, 1.2, 1.7, 2.3, 3 ];

const magneticField = defineScene( {
	meta: {
		title: { ko: '자기력선', en: 'Magnetic Field' },
		ref: { ko: '막대자석의 N극에서 나와 S극으로 들어가는 쌍극자 자기력선', en: 'Dipole field lines leaving a bar magnet\'s north pole and returning to the south' }
	},
	camera: [ 0, 0.3, 5.6 ],
	count: 150_000,
	init( i, n ) {

		if ( i < n * 0.05 ) return [ rand( - 0.08, 0.08 ), rand( - 0.35, 0.35 ), rand( - 0.08, 0.08 ), 0, 0, 0, 1 ];
		return [ LS[ Math.floor( Math.random() * LS.length ) ], Math.floor( Math.random() * 12 ) / 12 * TAU, 0, Math.random(), 0, 0, 0 ];

	},
	position: ( { a, b, t } ) => {

		const theta = mix( 0.08, 0.92, fract( b.x.add( t.mul( 0.12 ).div( a.x ) ) ) ).mul( Math.PI );
		const s = sin( theta ), r = a.x.mul( s ).mul( s );
		const line = vec3( s.mul( cos( a.y ) ), cos( theta ), s.mul( sin( a.y ) ) ).mul( r );
		return mix( line, a, b.w );

	},
	color: ( { a, b, t } ) => {

		const theta = mix( 0.08, 0.92, fract( b.x.add( t.mul( 0.12 ).div( a.x ) ) ) ).mul( Math.PI );
		const field = mix( color( 0x2f6bff ), color( 0xff3b3b ), smoothstep( - 0.6, 0.6, cos( theta ) ) );
		const magnet = mix( color( 0x2f6bff ), color( 0xff3b3b ), step( 0, a.y ) );
		return mix( field.mul( a.x.mul( - 0.2 ).add( 1 ) ), magnet.mul( 1.4 ), b.w );

	},
	alpha: 0.35,
	size: 0.011,
	spin: 0.05
} );

// 95 Chladni plate: sand jumps when the mode changes, then Newton steps pull each grain onto the nodal lines f = 0.
const MODES = [ [ 1, 3 ], [ 2, 5 ], [ 3, 5 ], [ 1, 4 ], [ 2, 7 ], [ 3, 7 ] ];
const MODE_SECONDS = 7;

const chladniPlate = defineScene( {
	meta: {
		title: { ko: '클라드니 도형', en: 'Chladni Plate' },
		ref: { ko: '진동하는 판 위의 모래가 움직이지 않는 마디선으로 모여 무늬를 만든다', en: 'Sand on a vibrating plate gathers on the still nodal lines, drawing the mode' }
	},
	camera: [ 0, 3.4, 2.6 ],
	count: 150_000,
	uniforms: { n: 1, m: 3, pn: 3, pm: 7, settle: 0 },
	init: () => [ rand( - 1, 1 ), rand( - 1, 1 ), 0, Math.random() ],
	position: ( { a, b, u } ) => Fn( () => {

		// Grains drift to the nodal lines f = 0 (no displacement); Newton steps find the nearest line.
		const x = a.x.toVar(), y = a.y.toVar();
		const toNodes = ( n, m ) => {

			const N = n.mul( Math.PI ), M = m.mul( Math.PI );
			for ( let k = 0; k < 6; k ++ ) {

				const cnx = cos( N.mul( x ) ), cmx = cos( M.mul( x ) ), cny = cos( N.mul( y ) ), cmy = cos( M.mul( y ) );
				const snx = sin( N.mul( x ) ), smx = sin( M.mul( x ) ), sny = sin( N.mul( y ) ), smy = sin( M.mul( y ) );
				const f = cnx.mul( cmy ).sub( cmx.mul( cny ) );
				const fx = N.negate().mul( snx ).mul( cmy ).add( M.mul( smx ).mul( cny ) ).toVar();
				const fy = M.negate().mul( cnx ).mul( smy ).add( N.mul( cmx ).mul( sny ) ).toVar();
				const s = f.div( fx.mul( fx ).add( fy.mul( fy ) ).add( 0.01 ) ).mul( 0.8 ).toVar();
				x.assign( clamp( x.sub( s.mul( fx ) ), - 1, 1 ) );
				y.assign( clamp( y.sub( s.mul( fy ) ), - 1, 1 ) );

			}

		};

		// Grains travel from the previous mode's nodal lines to the new ones instead of teleporting to a random
		// spread; both patterns are solved from the same start so the path is continuous across mode changes.
		toNodes( u.pn, u.pm );
		const from = vec3( x, 0, y ).toVar();
		x.assign( a.x ); y.assign( a.y );
		toNodes( u.n, u.m );
		const hop = sin( u.settle.mul( Math.PI ) ).mul( b.x.mul( 0.3 ) );
		return mix( from, vec3( x, 0, y ), u.settle ).mul( 1.6 ).add( vec3( 0, hop, 0 ) );

	} )(),
	color: ( { b, u } ) => mix( color( 0x5a4024 ), color( 0xffe2a8 ), u.settle ).mul( b.x.mul( 0.4 ).add( 0.8 ) ),
	update( { u }, t ) {

		const phase = t / MODE_SECONDS, k = Math.floor( phase ) % MODES.length;
		const [ n, m ] = MODES[ k ], [ pn, pm ] = MODES[ ( k + MODES.length - 1 ) % MODES.length ];
		const s = Math.min( ( phase % 1 ) / 0.6, 1 );
		u.n.value = n; u.m.value = m; u.pn.value = pn; u.pm.value = pm; u.settle.value = s * s * ( 3 - 2 * s );

	},
	alpha: 0.35,
	size: 0.01
} );

// 96 Two-source interference on a water-like plane; the sources slowly approach and part.
const GRID = 400;

const waveInterference = defineScene( {
	meta: {
		title: { ko: '파동 간섭', en: 'Wave Interference' },
		ref: { ko: '두 파원에서 나온 물결이 겹쳐 보강과 상쇄의 줄무늬를 만든다', en: 'Ripples from two sources overlap into bands of reinforcement and cancellation' }
	},
	camera: [ 0, 3, 3.6 ],
	count: GRID * GRID,
	init: ( i ) => [ ( i % GRID / ( GRID - 1 ) - 0.5 ) * 5, 0, ( Math.floor( i / GRID ) / ( GRID - 1 ) - 0.5 ) * 5 ],
	position: ( { a, t } ) => {

		const d = sin( t.mul( 0.2 ) ).mul( 0.3 ).add( 0.8 );
		const r1 = length( vec2( a.x.sub( d ), a.z ) ), r2 = length( vec2( a.x.add( d ), a.z ) );
		const w = sin( r1.mul( 12 ).sub( t.mul( 3 ) ) ).div( pow( r1.add( 0.3 ), 0.5 ) )
			.add( sin( r2.mul( 12 ).sub( t.mul( 3 ) ) ).div( pow( r2.add( 0.3 ), 0.5 ) ) );
		return vec3( a.x, w.mul( 0.08 ), a.z );

	},
	color: ( { a, t } ) => {

		const d = sin( t.mul( 0.2 ) ).mul( 0.3 ).add( 0.8 );
		const r1 = length( vec2( a.x.sub( d ), a.z ) ), r2 = length( vec2( a.x.add( d ), a.z ) );
		const w = sin( r1.mul( 12 ).sub( t.mul( 3 ) ) ).div( pow( r1.add( 0.3 ), 0.5 ) )
			.add( sin( r2.mul( 12 ).sub( t.mul( 3 ) ) ).div( pow( r2.add( 0.3 ), 0.5 ) ) );
		return gradient( smoothstep( - 1.6, 1.6, w ), [ 0x060b2e, 0x1f5fd6, 0xe8f4ff ] );

	},
	alpha: 0.4,
	size: 0.012
} );

// 97 Moebius strip: surface points plus travellers that cover "both sides" in one 4π loop.
const mobius = defineScene( {
	meta: {
		title: { ko: '뫼비우스 띠', en: 'Möbius Strip' },
		ref: { ko: '한 바퀴 돌면 뒤집혀 돌아오는, 면이 하나뿐인 띠를 따라 걷는 점들', en: 'Walkers on a one-sided band return flipped after a single lap' }
	},
	camera: [ 0, 1.6, 4.4 ],
	count: 150_000,
	init( i, n ) {

		if ( i < n * 0.85 ) return [ Math.random() * TAU, rand( - 1, 1 ), 0, 0 ];
		return [ Math.random() * 2 * TAU, 0.55 + rand( - 0.04, 0.04 ), 0, 1 ];

	},
	position: ( { a, b, t } ) => {

		const u = a.x.add( t.mul( 0.5 ).mul( b.x ) ), v = a.y.mul( 0.6 );
		const ring = v.mul( cos( u.mul( 0.5 ) ) ).add( 1.4 );
		return vec3( ring.mul( cos( u ) ), v.mul( sin( u.mul( 0.5 ) ) ), ring.mul( sin( u ) ) );

	},
	color: ( { a, b } ) => mix( gradient( cos( a.x ).mul( 0.5 ).add( 0.5 ), [ 0x0b5d4a, 0x2fe0a8 ] ).mul( 0.6 ), color( 0xffb547 ).mul( 1.6 ), b.x ),
	alpha: 0.35,
	size: 0.011,
	spin: 0.1
} );

// 98 Mandelbrot: smooth escape time becomes terrain height; the set itself is a flat plateau.
const MW = 450, MH = 400, MAX_ITER = 100;

const mandelbrot = defineScene( {
	meta: {
		title: { ko: '망델브로 집합', en: 'Mandelbrot Set' },
		ref: { ko: 'z² + c의 발산 속도를 높이로 세운 무한히 복잡한 경계의 지형', en: 'The escape speed of z² + c raised into terrain along an endlessly intricate border' }
	},
	camera: [ 0, 2.8, 3.2 ],
	count: MW * MH,
	init( i ) {

		const px = i % MW, py = Math.floor( i / MW );
		const cx = - 0.6 + ( px / ( MW - 1 ) - 0.5 ) * 3, cy = ( py / ( MH - 1 ) - 0.5 ) * 2.6;
		let x = 0, y = 0, k = 0;
		while ( x * x + y * y < 256 && k < MAX_ITER ) {

			[ x, y ] = [ x * x - y * y + cx, 2 * x * y + cy ];
			k ++;

		}

		const inside = k >= MAX_ITER ? 1 : 0;
		const mu = inside ? 1 : ( k + 1 - Math.log( Math.log( Math.sqrt( x * x + y * y ) ) ) / Math.LN2 ) / MAX_ITER;
		const h = inside ? 0.55 : Math.sqrt( Math.max( mu, 0 ) ) * 0.5;
		return [ ( cx + 0.6 ) * 1.2, h, cy * 1.2, mu, inside ];

	},
	position: ( { a } ) => a,
	color: ( { b, t } ) => {

		const band = gradient( fract( b.x.mul( 3 ).add( t.mul( 0.05 ) ) ), [ 0x0a0a3a, 0x2f7bff, 0xfff2d6, 0xff8a00, 0x0a0a3a ] );
		// Fast-escaping plane stays dim so the boundary carries the light.
		return mix( band.mul( smoothstep( 0.03, 0.3, b.x ).mul( 0.97 ).add( 0.03 ) ), color( 0x1a0b2e ), b.y );

	},
	alpha: 0.4,
	size: 0.011,
	spin: 0.03
} );

// 99 Voronoi shatter: a cube split into nearest-seed cells that drift apart and reassemble.
const SEEDS = Array.from( { length: 36 }, () => [ rand( - 1, 1 ), rand( - 1, 1 ), rand( - 1, 1 ) ] );

const voronoi = defineScene( {
	meta: {
		title: { ko: '보로노이 분할', en: 'Voronoi Shatter' },
		ref: { ko: '가장 가까운 씨앗점을 기준으로 나뉜 세포들이 흩어졌다 다시 맞물린다', en: 'Cells carved around their nearest seed drift apart and lock back together' }
	},
	camera: [ 2.6, 1.8, 3.8 ],
	count: 150_000,
	init() {

		const p = [ rand( - 1, 1 ), rand( - 1, 1 ), rand( - 1, 1 ) ];
		let d1 = Infinity, d2 = Infinity, best = SEEDS[ 0 ];
		for ( const s of SEEDS ) {

			const d = Math.hypot( p[ 0 ] - s[ 0 ], p[ 1 ] - s[ 1 ], p[ 2 ] - s[ 2 ] );
			if ( d < d1 ) {

				d2 = d1; d1 = d; best = s;

			} else if ( d < d2 ) d2 = d;

		}

		return [ ...p, ...best, d2 - d1 ];

	},
	position: ( { a, b, t } ) => {

		const phase = fract( t.mul( 0.1 ) );
		const e = smoothstep( 0.2, 0.5, phase ).mul( smoothstep( 1, 0.7, phase ) );
		return a.add( b.xyz.mul( e.mul( 0.9 ) ) );

	},
	color: ( { b } ) => {

		const cell = hash( b.x.mul( 731 ).add( b.y.mul( 197 ) ).add( b.z.mul( 53 ) ).add( 1000 ) );
		const edge = smoothstep( 0.08, 0, b.w );
		return gradient( cell, [ 0xff9ec7, 0xc3a6ff, 0x8fe3ff, 0xb8ffb0, 0xffe49a ] ).mul( edge.mul( 1.5 ).add( 0.25 ) );

	},
	alpha: 0.3,
	size: 0.011,
	spin: 0.07
} );

// 100 Prism: a white beam enters a glass prism, refracts at both faces (Snell), and leaves as a fan sorted by wavelength.
const LEFT = [ [ - 0.9, - 0.8 ], [ 0, 0.9 ] ], RIGHT = [ [ 0, 0.9 ], [ 0.9, - 0.8 ] ];
const PRISM_EDGES = [ [ - 0.9, - 0.8, 0.9, - 0.8 ], [ ...LEFT[ 0 ], ...LEFT[ 1 ] ], [ ...RIGHT[ 0 ], ...RIGHT[ 1 ] ] ];
const lerp2 = ( [ p, q ], s ) => [ p[ 0 ] + ( q[ 0 ] - p[ 0 ] ) * s, p[ 1 ] + ( q[ 1 ] - p[ 1 ] ) * s ];
const ENTRY = lerp2( LEFT, 0.55 );
const SOURCE = [ - 3.2, - 0.5 ];
const unit = ( x, y ) => {

	const l = Math.hypot( x, y );
	return [ x / l, y / l ];

};
const BEAM = unit( ENTRY[ 0 ] - SOURCE[ 0 ], ENTRY[ 1 ] - SOURCE[ 1 ] );
const LEFT_NORMAL = unit( - 1.7, 0.9 ), RIGHT_NORMAL = unit( 1.7, 0.9 ); // outward face normals
// Ray from ENTRY meets the right face (0, 0.9) + u (0.9, -1.7) at distance cross(P0 - ENTRY, F) / cross(d, F).
const EXIT_NUM = ( 0 - ENTRY[ 0 ] ) * - 1.7 - ( 0.9 - ENTRY[ 1 ] ) * 0.9;

const prism = defineScene( {
	meta: {
		title: { ko: '프리즘 분산', en: 'Prism Dispersion' },
		ref: { ko: '굴절률이 파장마다 달라 백색광이 무지개 스펙트럼 부채꼴로 갈라진다', en: 'Wavelength-dependent refraction splits white light into a rainbow fan' }
	},
	camera: [ 0.4, 0.2, 4.6 ],
	count: 140_000,
	init( i, n ) {

		if ( i < n * 0.12 ) {

			// Prism body: triangle edges extruded along z.
			const [ x0, y0, x1, y1 ] = PRISM_EDGES[ Math.floor( Math.random() * 3 ) ], s = Math.random();
			return [ x0 + ( x1 - x0 ) * s, y0 + ( y1 - y0 ) * s, rand( - 0.6, 0.6 ), 0, 0, 1 ];

		}

		return [ rand( - 0.02, 0.02 ), rand( - 0.02, 0.02 ), rand( - 0.05, 0.05 ), Math.random(), Math.random(), 0 ];

	},
	position: ( { a, b, t } ) => {

		const lam = b.x, s = fract( t.mul( 0.25 ).add( b.y ) );
		const A = vec3( SOURCE[ 0 ], SOURCE[ 1 ], 0 ), B = vec3( ENTRY[ 0 ], ENTRY[ 1 ], 0 );

		// Normal dispersion via Cauchy n(λ) = A + B / λ² (λ: 700 nm red to 400 nm violet). Coefficients are a dense
		// flint (~1.5x SF11's spread) so the fan is visible; violet has the larger n and bends most, toward the base.
		const wl = float( 0.7 ).sub( lam.mul( 0.3 ) );
		const n = float( 0.018 ).div( wl.mul( wl ) ).add( 1.62 );

		// Snell's law at both faces (refract() expects the normal to face the incoming ray).
		const inside = refract( vec3( BEAM[ 0 ], BEAM[ 1 ], 0 ), vec3( LEFT_NORMAL[ 0 ], LEFT_NORMAL[ 1 ], 0 ), float( 1 ).div( n ) );
		const C = B.add( inside.mul( float( EXIT_NUM ).div( inside.x.mul( - 1.7 ).sub( inside.y.mul( 0.9 ) ) ) ) );
		const out = refract( inside, vec3( - RIGHT_NORMAL[ 0 ], - RIGHT_NORMAL[ 1 ], 0 ), n );
		const D = C.add( out.mul( 3.2 ) );
		const p1 = mix( A, B, clamp( s.div( 0.35 ), 0, 1 ) );
		const p2 = mix( B, C, clamp( s.sub( 0.35 ).div( 0.15 ), 0, 1 ) );
		const p3 = mix( C, D, clamp( s.sub( 0.5 ).div( 0.5 ), 0, 1 ) );
		const path = mix( mix( p1, p2, step( 0.35, s ) ), p3, step( 0.5, s ) );
		return mix( path.add( a ), a, b.z );

	},
	color: ( { b, t } ) => {

		const s = fract( t.mul( 0.25 ).add( b.y ) );
		const spectrum = gradient( b.x, [ 0xff2a2a, 0xff9a1f, 0xfff23a, 0x3dff6e, 0x2fa8ff, 0x7a3dff ] );
		const beam = mix( color( 0xffffff ), spectrum, smoothstep( 0.35, 0.5, s ) );
		return mix( beam, color( 0x6fb8d6 ).mul( 0.35 ), b.z );

	},
	alpha: 0.4,
	size: 0.012
} );

export default [ lorenzAttractor, pendulumWave, lissajous, magneticField, chladniPlate, waveInterference, mobius, mandelbrot, voronoi, prism ];
