// Theme 9: Countryside — rural landscapes and farm work.
import { float, vec3, sin, cos, mix, fract, floor, step, smoothstep, clamp, exp, pow, abs, max, min, length, hash, color, mx_noise_float } from 'three/tsl';
import { defineScene, gradient, TAU, rand } from '../../lib/defineScene.js';
import { curl } from '../../tsl/curl.js';

const hr = ( k ) => {

	const x = Math.sin( k * 12.9898 + 78.233 ) * 43758.5453;
	return x - Math.floor( x );

};
const pick = ( arr ) => arr[ Math.floor( Math.random() * arr.length ) ];
const gauss = () => Math.sqrt( - 2 * Math.log( 1 - Math.random() ) ) * Math.cos( TAU * Math.random() );

// 81: a dense field of stalks seen from the edge; gusts bend heads and roll a golden sheen across.
const STALK = 6;
const wheatField = defineScene( {
	meta: {
		title: { ko: '밀밭', en: 'Wheat Field' },
		ref: { ko: '돌풍이 지날 때마다 이삭이 고개를 숙이며 금빛 물결이 밭을 건너간다', en: 'Each gust bows the ears and rolls a golden wave across the field' }
	},
	camera: [ 0, 0.6, 4.2 ],
	count: 180_000,
	init( i ) {

		const k = Math.floor( i / STALK ), j = i % STALK;
		const x = ( hr( k ) - 0.5 ) * 9, z = hr( k + 0.5 ) * - 6.5 + 2.5;
		const head = j >= 3 ? 1 : 0;
		const f = head ? 0.72 + Math.random() * 0.28 : ( j + Math.random() ) / 3 * 0.72;
		return [ x, f, z, 0.35 + hr( k + 0.25 ) * 0.2, head ];

	},
	position: ( { a, b, t } ) => {

		const gust = mx_noise_float( vec3( a.x.mul( 0.5 ).sub( t.mul( 0.7 ) ), a.z.mul( 0.5 ), t.mul( 0.05 ) ) );
		// Wind blows toward +x (gusts travel that way), so stalks only ever lean downwind; gust strength varies the lean.
		const bend = gust.mul( 0.5 ).add( 0.55 ).add( sin( a.x.mul( 1.3 ).add( a.z.mul( 0.4 ) ).sub( t.mul( 1.6 ) ) ).mul( 0.12 ) ).mul( a.y.mul( a.y ) ).mul( 0.3 );
		return vec3( a.x.add( bend ), a.y.mul( b.x ).sub( abs( bend ).mul( 0.3 ) ).sub( 0.7 ), a.z.add( bend.mul( 0.2 ) ) );

	},
	color: ( { a, b, t } ) => {

		const gust = mx_noise_float( vec3( a.x.mul( 0.5 ).sub( t.mul( 0.7 ) ), a.z.mul( 0.5 ), t.mul( 0.05 ) ) );
		const sheen = smoothstep( 0.1, 0.5, gust );
		return mix( color( 0x6a5a22 ), mix( color( 0xd9a63a ), color( 0xffe9a8 ), sheen ), b.y ).mul( sheen.mul( 0.8 ).add( 0.45 ) );

	},
	alpha: 0.3,
	size: 0.011
} );

// 82: a hill cut into flat water terraces; each paddy reflects the dusk sky, rims and seedlings are green.
const hill = ( x, z ) => 1.6 * Math.exp( - ( x * x + z * z ) / 5 ) + 0.15 * Math.sin( x * 1.3 ) * Math.cos( z * 1.1 );
const riceTerraces = defineScene( {
	meta: {
		title: { ko: '다랑논', en: 'Rice Terraces' },
		ref: { ko: '산비탈을 계단처럼 깎아 물을 댄 논마다 저녁 하늘이 비친다', en: 'A hillside cut into flooded steps, each paddy mirroring the evening sky' }
	},
	camera: [ 3, 2.6, 3.6 ],
	count: 170_000,
	init() {

		const r = 3.2 * Math.sqrt( Math.random() ), th = rand( 0, TAU );
		const x = r * Math.cos( th ), z = r * Math.sin( th ), h = hill( x, z ) * 10;
		const level = Math.floor( h ) / 10, f = h - Math.floor( h );
		const rim = f > 0.86 ? 1 : 0;
		const y = ( rim ? level + ( f - 0.86 ) / 0.14 * 0.1 : level ) * 1.2 - 0.8;
		const seedling = ( Math.abs( ( x * 10 ) % 1 ) < 0.12 && Math.abs( ( z * 10 ) % 1 ) < 0.12 ) ? 1 : 0;
		return [ x, y, z, rim, level, seedling ];

	},
	position: ( { a } ) => a,
	color: ( { a, b, t } ) => {

		const ripple = mx_noise_float( vec3( a.x.mul( 3 ), a.z.mul( 3 ), t.mul( 0.3 ) ) ).mul( 0.5 ).add( 0.5 );
		const sky = gradient( smoothstep( - 3, 3, a.z.add( a.x.mul( 0.4 ) ) ), [ 0x1d2b5e, 0xff8a7a, 0xffd6a5 ] ).mul( ripple.mul( 0.5 ).add( 0.6 ) );
		const green = mix( color( 0x5a4a2a ), color( 0x6fd04a ), b.z.add( b.x.mul( 0.5 ) ) );
		return mix( sky, green, max( b.x, b.z ) ).mul( 0.85 );

	},
	alpha: 0.32,
	size: 0.012,
	spin: 0.03
} );

// 83: turbines on rolling hills, three blades turning in the camera plane, red aviation lights blinking.
const ground = ( x, z ) => 0.3 * Math.sin( x * 0.7 ) * Math.cos( z * 0.5 ) - 1;
const TURBINES = Array.from( { length: 11 }, () => {

	const x = rand( - 4, 4 ), z = rand( - 3.2, 0.6 ), H = rand( 1.1, 1.4 );
	return [ x, ground( x, z ) + H, z, ground( x, z ), rand( 0.8, 1.0 ), rand( 0, TAU ) ]; // ~8-10 rpm, same wind for all

} );
const windTurbines = defineScene( {
	meta: {
		title: { ko: '풍력 발전기', en: 'Wind Turbines' },
		ref: { ko: '구릉 위 풍력 발전기들이 저마다의 속도로 바람을 전기로 바꾼다', en: 'Turbines on rolling hills turn wind into power, each at its own pace' }
	},
	camera: [ 0, 0.8, 6 ],
	count: 150_000,
	init() {

		const r = Math.random();
		if ( r < 0.5 ) { const x = rand( - 5, 5 ), z = rand( - 4, 2 ); return [ x, ground( x, z ), z, 0, 0, 0, 0 ]; }
		const [ x, top, z, base, omega, phase ] = pick( TURBINES );
		if ( r < 0.6 ) return [ x, rand( base, top ), z, 0, 0, 0, 1 ];
		if ( r < 0.61 ) return [ x, top + 0.04, z - 0.05, 0, phase, 0, 3 ];
		const blade = Math.floor( rand( 0, 3 ) );
		return [ x, top, z + 0.04, rand( 0.06, 1 ) * 0.6, phase + blade * TAU / 3, omega, 2 ];

	},
	position: ( { a, b, t } ) => {

		const th = b.y.sub( t.mul( b.z ) ); // clockwise viewed from upwind (+z), as utility turbines turn
		const blade = a.add( vec3( cos( th ), sin( th ), 0 ).mul( b.x ) );
		return mix( a, blade, step( 1.5, b.w ).mul( step( b.w, 2.5 ) ) );

	},
	color: ( { a, b, t } ) => {

		const terrain = gradient( smoothstep( - 1.3, - 0.7, a.y ), [ 0x10301e, 0x3f7a4a, 0x9cc48a ] ).mul( 0.45 );
		const tower = color( 0xdfe6ee ).mul( 0.55 );
		const blade = color( 0xffffff ).mul( 0.75 );
		const lamp = color( 0xff2a2a ).mul( step( 0.6, fract( t.mul( 0.5 ).add( b.y ) ) ).mul( 3 ) );
		return mix( mix( mix( terrain, tower, step( 0.5, b.w ) ), blade, step( 1.5, b.w ) ), lamp, step( 2.5, b.w ) );

	},
	alpha: 0.35,
	size: 0.012
} );

// 84: aerial quilt of rectangular fields with furrow rows; each field cycles through seasons, cloud shadows drift over.
const FIELDS = [];
( function split( x0, z0, x1, z1, d ) {

	if ( d > 4 || ( d > 2 && Math.random() < 0.3 ) ) {

		FIELDS.push( { x0, z0, x1, z1, phase: Math.random(), crop: Math.floor( rand( 0, 5 ) ), rows: Math.random() < 0.5 } );
		return;

	}

	if ( x1 - x0 > z1 - z0 ) {

		const m = rand( x0 + ( x1 - x0 ) * 0.3, x1 - ( x1 - x0 ) * 0.3 );
		split( x0, z0, m, z1, d + 1 ); split( m, z0, x1, z1, d + 1 );

	} else {

		const m = rand( z0 + ( z1 - z0 ) * 0.3, z1 - ( z1 - z0 ) * 0.3 );
		split( x0, z0, x1, m, d + 1 ); split( x0, m, x1, z1, d + 1 );

	}

} )( - 4, - 3, 4, 3, 0 );
const FIELD_AREA = FIELDS.map( ( f ) => ( f.x1 - f.x0 ) * ( f.z1 - f.z0 ) );
const FIELD_SUM = FIELD_AREA.reduce( ( s, x ) => s + x, 0 );

const farmlandPatchwork = defineScene( {
	meta: {
		title: { ko: '들판 조각보', en: 'Farmland Patchwork' },
		ref: { ko: '하늘에서 본 경작지가 고랑 무늬 조각보처럼 이어지고 계절 따라 색을 바꾼다', en: 'Seen from above, furrowed fields form a quilt that changes color with the seasons' }
	},
	camera: [ 0, 6.2, 2.4 ],
	count: 170_000,
	init() {

		let r = Math.random() * FIELD_SUM, k = 0;
		while ( r > FIELD_AREA[ k ] ) r -= FIELD_AREA[ k ++ ];
		const f = FIELDS[ k ];
		if ( Math.random() < 0.1 ) { // hedgerow on the field border

			const u = Math.random(), side = Math.floor( rand( 0, 4 ) );
			const x = side < 2 ? f.x0 + u * ( f.x1 - f.x0 ) : ( side === 2 ? f.x0 : f.x1 );
			const z = side < 2 ? ( side === 0 ? f.z0 : f.z1 ) : f.z0 + u * ( f.z1 - f.z0 );
			return [ x, 0.02, z, f.phase, f.crop, 1 ];

		}

		const m = 0.04;
		let x = rand( f.x0 + m, f.x1 - m ), z = rand( f.z0 + m, f.z1 - m );
		const row = ( v, v0 ) => v0 + ( Math.floor( ( v - v0 ) / 0.07 ) + 0.5 ) * 0.07 + gauss() * 0.008;
		if ( f.rows ) z = row( z, f.z0 ); else x = row( x, f.x0 );
		return [ x, 0, z, f.phase, f.crop, 0 ];

	},
	position: ( { a } ) => a,
	color: ( { a, b, t } ) => {

		const season = fract( t.mul( 0.025 ).add( b.x.mul( 0.3 ) ).add( b.y.mul( 0.2 ) ) );
		const crop = gradient( season, [ 0x3d7a2e, 0x8fbf3a, 0xd9b84a, 0x7a5232, 0x3d7a2e ] );
		const shade = smoothstep( - 0.1, 0.35, mx_noise_float( vec3( a.x.mul( 0.35 ).add( t.mul( 0.08 ) ), a.z.mul( 0.35 ), 0 ) ) );
		return mix( crop, color( 0x1f3d1c ), b.z ).mul( shade.mul( - 0.55 ).add( 1 ) ).mul( 0.8 );

	},
	alpha: 0.32,
	size: 0.013
} );

// 85: a moonlit field where a geometric formation is pressed flat in a sweeping order, its drawing edge glowing.
function formation( x, z ) {

	const r = Math.hypot( x, z );
	let m = r < 0.35 || Math.abs( r - 0.75 ) < 0.06 || Math.abs( r - 1.25 ) < 0.05 || Math.abs( r - 1.9 ) < 0.04;
	for ( let k = 0; k < 6; k ++ ) {

		const cx = 1.9 * Math.cos( k * TAU / 6 ), cz = 1.9 * Math.sin( k * TAU / 6 ), d = Math.hypot( x - cx, z - cz );
		m = m || d < 0.22 || Math.abs( d - 0.36 ) < 0.03;

	}

	return m ? 1 : 0;

}

const cropCircle = defineScene( {
	meta: {
		title: { ko: '미스터리 서클', en: 'Crop Circle' },
		ref: { ko: '달빛 아래 밀밭이 정해진 순서로 눌려 동심원과 위성 원의 기하 무늬가 드러난다', en: 'Under moonlight, wheat is pressed flat in sequence until rings and satellite circles appear' }
	},
	camera: [ 0, 4.6, 3.2 ],
	count: 180_000,
	init() {

		const x = rand( - 3.6, 3.6 ), z = rand( - 3, 3 );
		const order = ( Math.atan2( z, x ) / TAU + 0.5 ) * 0.6 + Math.hypot( x, z ) / 2.4 * 0.4;
		return [ x, 0, z, formation( x, z ), order ];

	},
	position: ( { a, b, t, h } ) => {

		const progress = fract( t.mul( 0.04 ) ).mul( 1.25 );
		const flat = step( b.y, progress ).mul( b.x );
		const sway = sin( t.mul( 1.2 ).add( a.x.mul( 2 ) ) ).mul( 0.01 );
		return vec3( a.x.add( sway.mul( flat.oneMinus() ) ), mix( h.mul( 0.08 ).add( 0.08 ), 0, flat ), a.z );

	},
	color: ( { b, t } ) => {

		const progress = fract( t.mul( 0.04 ) ).mul( 1.25 );
		const flat = step( b.y, progress ).mul( b.x );
		const edge = smoothstep( 0, 0.03, abs( b.y.sub( progress ) ) ).oneMinus().mul( b.x );
		const loopFade = smoothstep( 0, 0.04, progress ).mul( smoothstep( 1.25, 1.17, progress ) );
		return mix( color( 0x3c4a2a ).mul( 0.6 ), color( 0xcfd9ff ), flat ).add( color( 0x7ff5ff ).mul( edge.mul( 1.5 ) ) ).mul( loopFade );

	},
	alpha: 0.3,
	size: 0.012
} );

// 86: raindrops hit random spots on a pond; each impact sends out one damped ring, lily pads bob.
const DROPS = 14;
function pondHeight( a, t ) {

	let height = float( 0 );
	for ( let j = 0; j < DROPS; j ++ ) {

		const clock = t.mul( 0.18 + j * 0.013 ).add( j * 0.37 );
		const cyc = floor( clock ), age = fract( clock ).mul( 3 );
		const cx = hash( cyc.mul( 31 ).add( j * 7 + 1 ) ).sub( 0.5 ).mul( 4.6 ), cz = hash( cyc.mul( 17 ).add( j * 13 + 5 ) ).sub( 0.5 ).mul( 4.6 );
		const x = length( vec3( a.x.sub( cx ), 0, a.z.sub( cz ) ) ).sub( age.mul( 0.9 ) );
		height = height.add( sin( x.mul( 25 ) ).mul( exp( x.mul( x ).mul( - 20 ) ) ).mul( exp( age.mul( - 1.2 ) ) ).mul( 0.06 ) );

	}

	return height;

}

const pondRipples = defineScene( {
	meta: {
		title: { ko: '연못의 빗방울', en: 'Pond Ripples' },
		ref: { ko: '빗방울이 아무 데나 떨어질 때마다 한 줄기 물결이 번지다 사라지고 연잎이 흔들린다', en: 'Each raindrop lands at random and sends out a single fading ring; lily pads bob' }
	},
	camera: [ 0, 2.8, 3.8 ],
	count: 140_000,
	init() {

		const pad = Math.random() < 0.05;
		if ( pad ) {

			const c = Math.floor( rand( 0, 9 ) ), r = Math.sqrt( Math.random() ) * 0.22, th = rand( 0, TAU );
			const cx = ( hr( c ) - 0.5 ) * 4, cz = ( hr( c + 0.3 ) - 0.5 ) * 4;
			return [ cx + r * Math.cos( th ), 0, cz + r * Math.sin( th ), 1 ];

		}

		const r = 3 * Math.sqrt( Math.random() ), th = rand( 0, TAU );
		return [ r * Math.cos( th ), 0, r * Math.sin( th ), 0 ];

	},
	position: ( { a, b, t } ) => vec3( a.x, pondHeight( a, t ).mul( mix( 1, 0.5, b.x ) ).add( b.x.mul( 0.01 ) ), a.z ),
	color: ( { a, b, t } ) => {

		const water = gradient( smoothstep( - 2, 2, a.z ), [ 0x06202a, 0x14606e, 0x2a8a8f ] );
		const crest = smoothstep( - 0.02, 0.04, pondHeight( a, t ) ).mul( 1.6 ).add( 0.6 );
		return mix( water, color( 0x2f7a3a ), b.x ).mul( crest ).mul( 0.8 );

	},
	alpha: 0.3,
	size: 0.012
} );

// 87: a snowy village at dusk; chimneys release smoke that rises, drifts downwind, widens and thins.
const HOUSES = Array.from( { length: 9 }, ( _, k ) => [ - 3 + k * 0.75 + rand( - 0.15, 0.15 ), rand( - 1.4, 0.8 ) ] );
// Roof slope at x offset 0.12 is y = -0.30; the stack starts just inside it and tops out above the ridge (-0.2) like a real chimney.
const CHIMNEY_DX = 0.12, CHIMNEY_TOP = - 0.12;
const chimneySmoke = defineScene( {
	meta: {
		title: { ko: '굴뚝 연기', en: 'Chimney Smoke' },
		ref: { ko: '눈 덮인 저녁 마을의 굴뚝마다 연기가 피어올라 바람을 타고 옅어진다', en: 'In a snowy village at dusk, smoke curls from each chimney and thins on the wind' }
	},
	camera: [ 0, 1, 5.5 ],
	count: 140_000,
	init() {

		const [ hx, hz ] = pick( HOUSES );
		// Chimney stack sits on the right roof slope and rises just above the ridge (y = -0.2).
		const cx = hx + CHIMNEY_DX, top = CHIMNEY_TOP;
		const r = Math.random();
		if ( r < 0.55 ) return [ cx, top, hz, gauss(), gauss(), 0, Math.random() ]; // smoke, emitted at the chimney mouth
		if ( r < 0.58 ) return [ cx + rand( - 0.025, 0.025 ), rand( - 0.33, top ), hz + rand( - 0.025, 0.025 ), 0.42, 0.2, 0.15, - 1 ]; // brick stack
		if ( r < 0.73 ) return [ rand( - 4, 4 ), - 0.8, rand( - 2.5, 1.8 ), 0.81, 0.85, 1, - 1 ]; // snow ground (rgb in b.xyz)
		const u = rand( - 0.25, 0.25 ), v = Math.random(), wall = Math.random() < 0.6;
		if ( wall ) {

			const lit = Math.abs( u ) < 0.08 && v > 0.3 && v < 0.6 && Math.random() < 0.5;
			return [ hx + u, - 0.8 + v * 0.35, hz + 0.2, ...( lit ? [ 1.6, 1, 0.5 ] : [ 0.23, 0.2, 0.28 ] ), - 1 ];

		}

		const side = Math.random() < 0.5 ? - 1 : 1, s = Math.random();
		return [ hx + side * ( 1 - s ) * 0.3, - 0.45 + s * 0.25, hz + rand( - 0.2, 0.2 ), 0.35, 0.28, 0.42, - 1 ]; // roof

	},
	position: ( { a, b, t } ) => {

		// Buoyant plume: rise decelerates as the gas cools and mixes (~age^0.6),
		// wind carries it at a steady speed (linear in age), width grows with distance travelled.
		const age = fract( t.mul( 0.1 ).add( b.w ) );
		const rise = pow( age, 0.6 ).mul( 1.5 );
		const drift = age.mul( 1.4 );
		const width = age.mul( 0.32 ).add( 0.012 );
		const turb = curl( vec3( a.x.mul( 0.5 ), age.mul( 2 ).sub( t.mul( 0.1 ) ), a.z.mul( 0.5 ) ) ).mul( age.mul( age ).mul( 0.3 ) );
		const smoke = a.add( vec3( drift.add( b.x.mul( width ) ), rise, b.y.mul( width ) ) ).add( turb );
		return mix( a, smoke, step( 0, b.w ) );

	},
	color: ( { b, t } ) => {

		const age = fract( t.mul( 0.1 ).add( b.w ) );
		const fade = age.oneMinus();
		const smoke = color( 0x9aa3c7 ).mul( fade.mul( fade ).mul( 0.7 ) );
		return mix( vec3( b.x, b.y, b.z ).mul( 0.5 ), smoke, step( 0, b.w ) );

	},
	alpha: 0.3,
	size: 0.013
} );

// 88: rows of sunflowers; seeds follow the golden angle, heads turn together to follow the sun.
const HEADS = [];
for ( let r = 0; r < 6; r ++ ) for ( let c = 0; c < 8; c ++ ) HEADS.push( [ - 3.5 + c + ( r % 2 ) * 0.5 + rand( - 0.1, 0.1 ), - 0.6 + rand( 1, 1.4 ), - 3 + r * 0.7, Math.random() ] );
const GOLDEN = Math.PI * ( 3 - Math.sqrt( 5 ) );
const sunflowerField = defineScene( {
	meta: {
		title: { ko: '해바라기 밭', en: 'Sunflower Field' },
		ref: { ko: '황금각으로 배열된 씨앗을 품은 해바라기들이 함께 해를 따라 고개를 돌린다', en: 'Sunflowers with golden-angle seed spirals turn their heads together to follow the sun' }
	},
	camera: [ 0, 0.7, 4.4 ],
	count: 110_000,
	init() {

		const [ x, y, z, ph ] = pick( HEADS );
		const r = Math.random();
		if ( r < 0.62 ) {

			const n = Math.floor( rand( 0, 1400 ) );
			const rr = 0.15 * Math.sqrt( n / 1400 ), th = n * GOLDEN;
			return [ x, y, z, rr * Math.cos( th ), rr * Math.sin( th ), 0, ph ];

		}

		if ( r < 0.86 ) {

			const petal = Math.floor( rand( 0, 24 ) ), rr = rand( 0.15, 0.27 ), th = petal * TAU / 24 + gauss() * 0.04 * ( 0.27 - rr ) / 0.12;
			return [ x, y, z, rr * Math.cos( th ), rr * Math.sin( th ), 1, ph ];

		}

		return [ x, y, z, 0, - rand( 0, y + 0.8 ), 2, ph ];

	},
	position: ( { a, b, t } ) => {

		const yaw = sin( t.mul( 0.12 ) ).add( b.w.mul( 0.06 ) ); // one sun for the whole field: heads turn in unison
		const p = 0.35;
		const ly = b.y.mul( Math.cos( p ) ), lz = b.y.mul( Math.sin( p ) );
		const head = a.add( vec3( b.x.mul( cos( yaw ) ).add( lz.mul( sin( yaw ) ) ), ly, b.x.mul( sin( yaw ) ).negate().add( lz.mul( cos( yaw ) ) ) ) );
		const stem = a.add( vec3( 0, b.y, 0 ) );
		return mix( head, stem, step( 1.5, b.z ) );

	},
	color: ( { b } ) => {

		const r = length( vec3( b.x, b.y, 0 ) );
		const seed = mix( color( 0x6b5a1a ), color( 0x3a1f0a ), smoothstep( 0.02, 0.12, r ) );
		return mix( mix( seed, color( 0xffc21a ), step( 0.5, b.z ) ), color( 0x3f7a2a ).mul( 0.5 ), step( 1.5, b.z ) ).mul( 0.9 );

	},
	alpha: 0.35,
	size: 0.011
} );

// 89: a hilly meadow inside a fence; sheep and cows wander slowly along smooth random paths.
const meadow = ( x, z ) => 0.25 * Math.sin( x * 0.6 ) * Math.cos( z * 0.5 ) - 0.8;
const meadowTSL = ( x, z ) => sin( x.mul( 0.6 ) ).mul( cos( z.mul( 0.5 ) ) ).mul( 0.25 ).sub( 0.8 );
const grazingPasture = defineScene( {
	meta: {
		title: { ko: '방목지', en: 'Grazing Pasture' },
		ref: { ko: '울타리 친 초원 위를 양과 소가 저마다 느린 걸음으로 거닌다', en: 'Sheep and cows amble along slow, meandering paths inside a fenced meadow' }
	},
	camera: [ 0, 2.2, 5.2 ],
	count: 140_000,
	init() {

		const r = Math.random();
		if ( r < 0.8 ) { const x = rand( - 4.5, 4.5 ), z = rand( - 3.5, 2.2 ); return [ x, meadow( x, z ) + rand( 0, 0.03 ), z, 0, 0, 0, 0 ]; }
		if ( r < 0.85 ) {

			const u = Math.random(), side = Math.floor( rand( 0, 4 ) );
			const x = side < 2 ? - 3.8 + u * 7.6 : ( side === 2 ? - 3.8 : 3.8 ), z = side < 2 ? ( side === 0 ? - 2.8 : 1.8 ) : - 2.8 + u * 4.6;
			return [ x, meadow( x, z ) + pick( [ 0.05, 0.1 ] ), z, 0, 0, 0, 1 ];

		}

		const id = Math.floor( rand( 0, 160 ) ), cow = hr( id ) < 0.3;
		const s = cow ? 1.5 : 1;
		return [ ( hr( id + 0.1 ) - 0.5 ) * 6.4, id, ( hr( id + 0.2 ) - 0.5 ) * 3.8 - 0.5, gauss() * 0.06 * s, Math.abs( gauss() ) * 0.035 * s, gauss() * 0.03 * s, cow ? 3 : 2 ];

	},
	position: ( { a, b, t } ) => {

		const ox = mx_noise_float( vec3( a.y.mul( 1.7 ), t.mul( 0.03 ), 0 ) ).mul( 1.2 );
		const oz = mx_noise_float( vec3( a.y.mul( 2.3 ), 0, t.mul( 0.03 ) ) ).mul( 1.2 );
		const x = clamp( a.x.add( ox ), - 3.6, 3.6 ), z = clamp( a.z.add( oz ), - 2.6, 1.6 ); // the fence holds them in
		const animal = vec3( x, meadowTSL( x, z ).add( 0.06 ), z ).add( vec3( b.x, b.y, b.z ) );
		return mix( a, animal, step( 1.5, b.w ) );

	},
	color: ( { a, b, h } ) => {

		const flowers = step( 0.985, h );
		const grass = mix( gradient( smoothstep( - 1.05, - 0.55, a.y ), [ 0x1e4a1c, 0x5aa040, 0xb6d86a ] ).mul( 0.5 ), color( 0xfff0b0 ), flowers );
		const fence = color( 0x8a6a4a ).mul( 0.6 );
		const sheep = color( 0xf2f0e6 );
		const cow = mix( color( 0x5a3a22 ), color( 0xf0ece0 ), step( 0.6, hash( a.y.mul( 7 ).add( floor( b.x.mul( 20 ) ) ).add( 100 ) ) ) );
		return mix( mix( mix( grass, fence, step( 0.5, b.w ) ), sheep, step( 1.5, b.w ) ), cow, step( 2.5, b.w ) );

	},
	alpha: 0.32,
	size: 0.013
} );

// 90: an overshot waterwheel; water runs along a flume, rides down the buckets, then flows away downstream.
const WHEEL_C = [ 0.6, 0.2, 0 ], WHEEL_R = 1.3;
const waterwheel = defineScene( {
	meta: {
		title: { ko: '물레방아', en: 'Waterwheel' },
		ref: { ko: '수로에서 떨어진 물이 바퀴 칸을 채우며 무게로 바퀴를 돌리고 개울로 흘러간다', en: 'Water from the flume fills the buckets, its weight turns the wheel, then it runs off downstream' }
	},
	camera: [ 0, 0.2, 6 ],
	count: 120_000,
	init() {

		const r = Math.random();
		if ( r < 0.45 ) { // wheel: rims, spokes and paddles in local polar coordinates

			const part = Math.random();
			if ( part < 0.4 ) return [ 0, 0, 0, pick( [ WHEEL_R, WHEEL_R - 0.12 ] ), rand( 0, TAU ), pick( [ - 0.25, 0.25 ] ), 0 ];
			if ( part < 0.6 ) return [ 0, 0, 0, rand( 0.08, WHEEL_R ), Math.floor( rand( 0, 8 ) ) * TAU / 8, pick( [ - 0.25, 0.25 ] ), 0 ];
			return [ 0, 0, 0, rand( WHEEL_R - 0.28, WHEEL_R + 0.04 ), Math.floor( rand( 0, 16 ) ) * TAU / 16, rand( - 0.25, 0.25 ), 0 ];

		}

		if ( r < 0.9 ) return [ gauss() * 0.03, gauss() * 0.03, rand( - 0.2, 0.2 ), Math.random(), 0, 0, 1 ]; // water
		if ( r < 0.95 ) return [ rand( - 3.4, 0.8 ), 1.6 + rand( - 0.05, 0 ), pick( [ - 0.24, 0.24, rand( - 0.24, 0.24 ) ] ), 0, 0, 0, 2 ]; // flume, ending just past the wheel top
		return [ rand( - 4, 4 ), - 1.32 - rand( 0, 0.1 ), pick( [ - 0.6, 0.6 ] ) + rand( - 0.1, 0.1 ), 0, 0, 0, 2 ]; // banks

	},
	position: ( { a, b, t } ) => {

		const C = vec3( ...WHEEL_C );
		const th = b.y.sub( t.mul( 0.5 ) );
		const wheel = C.add( vec3( cos( th ).mul( b.x ), sin( th ).mul( b.x ), b.z ) );

		// Overshot wheel turning clockwise (0.5 rad/s): the flume (+x) delivers water just past the top, where buckets
		// descend on the right; water rides IN the buckets at the wheel's angular speed, spills near the bottom, runs off.
		// Cycle 9 s: flume 1.5 s (with a short spout drop), ride 4.5 s (2.25 rad at 0.5 rad/s), stream 3 s.
		const s = fract( t.div( 9 ).add( b.x ) );
		const u1 = s.mul( 6 ), drop = smoothstep( 0.85, 1, u1 );
		const flume = vec3( mix( - 3.2, 0.75, min( u1, 1 ) ), drop.mul( drop ).mul( - 0.25 ).add( 1.65 ), 0 );
		const phi = s.sub( 1 / 6 ).mul( 9 ).mul( - 0.5 ).add( 1.445 );
		const ride = C.add( vec3( cos( phi ), sin( phi ), 0 ).mul( WHEEL_R - 0.1 ) );
		const u3 = s.sub( 2 / 3 ).mul( 3 );
		const fall = smoothstep( 0, 0.2, u3 );
		const stream = vec3( mix( 1.43, 4, u3 ), mix( - 0.66, - 1.25, fall.mul( fall ) ).add( sin( u3.mul( 30 ).add( t.mul( 4 ) ) ).mul( 0.02 ) ), 0 );
		const water = mix( mix( flume, ride, step( 1 / 6, s ) ), stream, step( 2 / 3, s ) ).add( a );

		const isWheel = step( b.w, 0.5 ), isWater = step( 0.5, b.w ).mul( step( b.w, 1.5 ) ), isStatic = step( 1.5, b.w );
		return wheel.mul( isWheel ).add( water.mul( isWater ) ).add( a.mul( isStatic ) );

	},
	color: ( { b, t } ) => {

		const s = fract( t.div( 9 ).add( b.x ) );
		const splash = step( 1 / 6, s ).mul( step( s, 2 / 3 ) );
		const water = mix( color( 0x3fa8d8 ), color( 0xe8fbff ), splash.mul( 0.7 ) );
		const wood = color( 0xb07a45 ).mul( 0.7 );
		const bank = color( 0x6b4a2e ).mul( 0.45 );
		return mix( mix( wood, water, step( 0.5, b.w ) ), bank, step( 1.5, b.w ) );

	},
	alpha: 0.35,
	size: 0.012
} );

export default [ wheatField, riceTerraces, windTurbines, farmlandPatchwork, cropCircle, pondRipples, chimneySmoke, sunflowerField, grazingPasture, waterwheel ];
