import { Game } from './core/Game';

const container = document.getElementById('game-viewport') as HTMLDivElement;
const game = new Game(container);
game.init();
game.start();
