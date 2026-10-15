import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { THEMES, SCENES } from './scenes/index.js';

const TOUR_SECONDS = 30;
const DIGIT_WAIT_MS = 700;

const UI = {
	ko: {
		note: 'Refik Anadol 작업의 시각 문법을 연구하는 오마주입니다. 원본 자산을 사용하지 않습니다.',
		fullscreen: '전체화면', exitFullscreen: '창 모드', help: '단축키', index: '목록', lang: 'EN', hideUI: '메뉴 숨기기', showUI: '메뉴 보이기',
		paused: '일시정지', tour: '자동 순환',
		keys: [
			[ '숫자', '장면 번호로 이동 (예: 4 2 = 42번, Enter로 즉시)' ], [ '← →', '이전 / 다음 장면' ], [ '↑ ↓', '이전 / 다음 주제' ],
			[ 'G', '전체 목록' ], [ 'F', '전체화면 (Esc로 복귀)' ], [ 'L', '한국어 / English' ], [ 'Space', '일시정지' ],
			[ 'A', `자동 순환 (${ TOUR_SECONDS }초)` ], [ 'R', '카메라 초기화' ], [ 'H', '메뉴 숨기기 / 보이기 (숨겨도 모든 단축키 동작)' ], [ '?', '단축키 도움말' ], [ 'Esc', '창 닫기, 전체화면 해제' ]
		]
	},
	en: {
		note: 'An homage studying the visual grammar of Refik Anadol\'s work. No original assets are used.',
		fullscreen: 'Fullscreen', exitFullscreen: 'Windowed', help: 'Shortcuts', index: 'Index', lang: '한국어', hideUI: 'Hide menus', showUI: 'Show menus',
		paused: 'Paused', tour: 'Auto tour',
		keys: [
			[ 'Digits', 'Jump to scene number (e.g. 4 2 = #42, Enter jumps now)' ], [ '← →', 'Previous / next scene' ], [ '↑ ↓', 'Previous / next theme' ],
			[ 'G', 'Scene index' ], [ 'F', 'Fullscreen (Esc to exit)' ], [ 'L', '한국어 / English' ], [ 'Space', 'Pause' ],
			[ 'A', `Auto tour (${ TOUR_SECONDS }s)` ], [ 'R', 'Reset camera' ], [ 'H', 'Hide / show menus (all shortcuts keep working)' ], [ '?', 'Shortcut help' ], [ 'Esc', 'Close overlays, exit fullscreen' ]
		]
	}
};

const $ = ( id ) => document.getElementById( id );

// `?webgl` forces the WebGL 2 backend (fallback testing).
const renderer = new THREE.WebGPURenderer( { antialias: false, forceWebGL: new URLSearchParams( location.search ).has( 'webgl' ) } );
renderer.setPixelRatio( Math.min( devicePixelRatio, 2 ) );
renderer.setSize( innerWidth, innerHeight );
renderer.setClearColor( 0x000000 );
document.body.prepend( renderer.domElement );
await renderer.init();

const camera = new THREE.PerspectiveCamera( 45, innerWidth / innerHeight, 0.01, 100 );
const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;

const timer = new THREE.Timer();
timer.connect( document );

const state = { index: 0, lang: localStorage.getItem( 'lang' ) === 'en' ? 'en' : 'ko', paused: false, tour: false, tourStart: 0, digits: '', hideUI: localStorage.getItem( 'hideUI' ) === '1' };
let active, pipeline, sceneStart = 0, digitTimer, toastTimer, mouseTimer;

const sceneLabel = ( i ) => `${ String( i + 1 ).padStart( 3, '0' ) } ${ SCENES[ i ].meta.title[ state.lang ] }`;
const themeStart = ( ti ) => SCENES.findIndex( ( s ) => s.theme === ti );

function resetCamera() {

	camera.position.fromArray( SCENES[ state.index ].cameraPosition );
	controls.target.set( 0, 0, 0 );
	controls.update();

}

function load( index ) {

	state.index = ( index + SCENES.length ) % SCENES.length;
	active?.dispose();
	pipeline?.dispose();

	active = SCENES[ state.index ].create( renderer );
	resetCamera();

	const color = pass( active.scene, camera ).getTextureNode();
	pipeline = new THREE.RenderPipeline( renderer, color.add( bloom( color, 0.9, 0.4, 0.05 ) ) );

	sceneStart = state.tourStart = timer.getElapsed();
	history.replaceState( null, '', `#${ state.index + 1 }` );
	render();
	if ( state.hideUI ) toast( sceneLabel( state.index ) );

}

function button( text, on, onclick ) {

	const b = document.createElement( 'button' );
	b.textContent = text;
	b.className = on ? 'on' : '';
	b.onclick = onclick;
	return b;

}

function render() {

	const t = UI[ state.lang ];
	const current = SCENES[ state.index ];
	document.documentElement.lang = state.lang;

	$( 'themes' ).replaceChildren( ...THEMES.map( ( th, ti ) => button( `${ ti + 1 }. ${ th.title[ state.lang ] }`, ti === current.theme, () => load( themeStart( ti ) ) ) ) );
	$( 'nav' ).replaceChildren( ...SCENES.map( ( s, i ) => [ s, i ] ).filter( ( [ s ] ) => s.theme === current.theme )
		.map( ( [ , i ] ) => button( sceneLabel( i ), i === state.index, () => load( i ) ) ) );
	$( 'counter' ).textContent = `${ String( state.index + 1 ).padStart( 3, '0' ) } / ${ SCENES.length }`;
	$( 'ref' ).textContent = current.meta.ref[ state.lang ];
	$( 'note' ).textContent = t.note;
	$( 'lang' ).textContent = t.lang;
	$( 'fs' ).textContent = document.fullscreenElement ? t.exitFullscreen : t.fullscreen;
	$( 'helpBtn' ).textContent = `? ${ t.help }`;
	$( 'indexBtn' ).textContent = `▦ ${ t.index }`;
	$( 'uiToggle' ).textContent = state.hideUI ? '◧' : `◨ ${ t.hideUI }`;
	$( 'uiToggle' ).title = state.hideUI ? `${ t.showUI } (H)` : `${ t.hideUI } (H)`;
	$( 'uiToggle' ).ariaLabel = $( 'uiToggle' ).title;
	document.body.classList.toggle( 'hide-ui', state.hideUI );
	$( 'status' ).textContent = [ state.digits && `#${ state.digits }`, state.paused && t.paused, state.tour && t.tour ].filter( Boolean ).join( ' · ' );

	$( 'keys' ).replaceChildren( ...t.keys.flatMap( ( [ k, v ] ) => [ Object.assign( document.createElement( 'dt' ), { textContent: k } ), Object.assign( document.createElement( 'dd' ), { textContent: v } ) ] ) );

	$( 'grid' ).replaceChildren( ...THEMES.map( ( th, ti ) => {

		const col = document.createElement( 'section' );
		col.append( Object.assign( document.createElement( 'h2' ), { textContent: `${ ti + 1 }. ${ th.title[ state.lang ] }` } ) );
		SCENES.forEach( ( s, i ) => s.theme === ti && col.append( button( sceneLabel( i ), i === state.index, () => {

			closeOverlays();
			load( i );

		} ) ) );
		return col;

	} ) );

}

const closeOverlays = () => [ 'help', 'index' ].forEach( ( id ) => $( id ).classList.remove( 'open' ) );
const toggleOverlay = ( id ) => {

	const open = ! $( id ).classList.contains( 'open' );
	closeOverlays();
	$( id ).classList.toggle( 'open', open );

};
const toggleFullscreen = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
const toggleLang = () => {

	state.lang = state.lang === 'ko' ? 'en' : 'ko';
	localStorage.setItem( 'lang', state.lang );
	render();

};

function jumpToDigits() {

	clearTimeout( digitTimer );
	const n = Number( state.digits );
	state.digits = '';
	if ( n >= 1 && n <= SCENES.length ) load( n - 1 );
	else render();

}

// Clean view: menus hidden, scene title flashes briefly on change, cursor hides when idle.
function toggleUI() {

	state.hideUI = ! state.hideUI;
	localStorage.setItem( 'hideUI', state.hideUI ? '1' : '0' );
	render();
	if ( state.hideUI ) toast( sceneLabel( state.index ) );

}

function toast( text ) {

	$( 'toast' ).textContent = text;
	$( 'toast' ).classList.add( 'show' );
	clearTimeout( toastTimer );
	toastTimer = setTimeout( () => $( 'toast' ).classList.remove( 'show' ), 2200 );

}

addEventListener( 'pointermove', () => {

	document.body.classList.add( 'pointer' );
	clearTimeout( mouseTimer );
	mouseTimer = setTimeout( () => document.body.classList.remove( 'pointer' ), 2000 );

} );

$( 'uiToggle' ).onclick = toggleUI;
$( 'lang' ).onclick = toggleLang;
$( 'fs' ).onclick = toggleFullscreen;
$( 'helpBtn' ).onclick = () => toggleOverlay( 'help' );
$( 'indexBtn' ).onclick = () => toggleOverlay( 'index' );
$( 'help' ).onclick = closeOverlays;
$( 'index' ).onclick = ( e ) => e.target === $( 'index' ) && closeOverlays();
document.addEventListener( 'fullscreenchange', render ); // Esc exit is handled by the browser

const SHORTCUTS = {
	ArrowRight: () => load( state.index + 1 ),
	ArrowLeft: () => load( state.index - 1 ),
	ArrowDown: () => load( themeStart( ( SCENES[ state.index ].theme + 1 ) % THEMES.length ) ),
	ArrowUp: () => load( themeStart( ( SCENES[ state.index ].theme + THEMES.length - 1 ) % THEMES.length ) ),
	Enter: () => state.digits && jumpToDigits(),
	f: toggleFullscreen,
	l: toggleLang,
	g: () => toggleOverlay( 'index' ),
	h: toggleUI,
	r: resetCamera,
	'?': () => toggleOverlay( 'help' ),
	// Browsers exit fullscreen on Esc natively; this covers the cases where the key reaches the page.
	Escape: () => {

		closeOverlays();
		if ( document.fullscreenElement ) document.exitFullscreen();

	},
	' ': () => {

		state.paused = ! state.paused;
		timer.setTimescale( state.paused ? 0 : 1 );
		render();

	},
	a: () => {

		state.tour = ! state.tour;
		state.tourStart = timer.getElapsed();
		render();

	}
};

addEventListener( 'keydown', ( e ) => {

	if ( e.metaKey || e.ctrlKey || e.altKey ) return;
	const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

	if ( /^[0-9]$/.test( key ) ) {

		state.digits = ( state.digits + key ).slice( - 3 );
		clearTimeout( digitTimer );
		digitTimer = setTimeout( jumpToDigits, DIGIT_WAIT_MS );
		render();
		if ( state.hideUI ) toast( `#${ state.digits }` );

	} else if ( SHORTCUTS[ key ] ) {

		e.preventDefault();
		SHORTCUTS[ key ]();

	}

} );

addEventListener( 'resize', () => {

	camera.aspect = innerWidth / innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( innerWidth, innerHeight );

} );

load( Number( location.hash.slice( 1 ) ) - 1 || 0 );

renderer.setAnimationLoop( ( timestamp ) => {

	timer.update( timestamp );
	controls.update();
	// Timer is fed rAF timestamps, which can trail its own clock right after a scene loads; never hand scenes negative time.
	active.update( Math.max( 0, timer.getDelta() ), Math.max( 0, timer.getElapsed() - sceneStart ) );
	pipeline.render();

	if ( state.tour && timer.getElapsed() - state.tourStart > TOUR_SECONDS ) load( state.index + 1 );

} );
