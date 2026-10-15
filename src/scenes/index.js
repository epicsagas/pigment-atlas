import machine from './themes/machine.js';
import atmosphere from './themes/atmosphere.js';
import ocean from './themes/ocean.js';
import life from './themes/life.js';
import earth from './themes/earth.js';
import cosmos from './themes/cosmos.js';
import micro from './themes/micro.js';
import city from './themes/city.js';
import countryside from './themes/countryside.js';
import physics from './themes/physics.js';

export const THEMES = [
	{ title: { ko: '기계의 꿈', en: 'Machine Dreams' }, scenes: machine },
	{ title: { ko: '대기와 날씨', en: 'Atmosphere' }, scenes: atmosphere },
	{ title: { ko: '바다와 물', en: 'Ocean & Water' }, scenes: ocean },
	{ title: { ko: '숲과 생명', en: 'Forest & Life' }, scenes: life },
	{ title: { ko: '대지와 지질', en: 'Earth & Geology' }, scenes: earth },
	{ title: { ko: '우주', en: 'Cosmos' }, scenes: cosmos },
	{ title: { ko: '미시 세계', en: 'Micro' }, scenes: micro },
	{ title: { ko: '도시', en: 'City' }, scenes: city },
	{ title: { ko: '시골', en: 'Countryside' }, scenes: countryside },
	{ title: { ko: '물리와 수학', en: 'Physics & Math' }, scenes: physics }
];

// Flat list with theme index attached; order is the global scene number.
export const SCENES = THEMES.flatMap( ( theme, ti ) => theme.scenes.map( ( scene ) => ( { ...scene, theme: ti } ) ) );
