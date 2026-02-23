
import React from 'react';
import type { UserProfile, Contact, TicTacToeGameState } from '../types';
import { CancelIcon, CheckIcon } from './Icons';

interface GameModalProps {
  game: TicTacToeGameState;
  user: UserProfile;
  partner: Contact;
  onMakeMove: (index: number) => void;
  onForfeit: () => void;
  onClose: () => void;
}

const GameModal: React.FC<GameModalProps> = ({ game, user, partner, onMakeMove, onForfeit, onClose }) => {
  const { board, turn, status, players, winner, winningLine } = game;

  // This guard handles cases where the game object from Firebase is temporarily incomplete.
  if (!board || !players) {
    // Show a loading state instead of an error, as the full game data is likely on its way.
    return (
       <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animation-fade-in">
         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm animation-scale-in flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-t-transparent border-green-500 rounded-full animate-spin"></div>
            <h2 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">Starting game...</h2>
         </div>
       </div>
    );
  }
  
  const isMyTurn = turn === user.uid;
  const mySymbol = players[user.uid];
  
  const getStatusText = () => {
    if (status === 'active') {
      return isMyTurn ? "Your turn" : `Waiting for @${partner.username}...`;
    }
    if (status === 'won') {
      return winner === user.uid ? "You won!" : `@${partner.username} won!`;
    }
    if (status === 'forfeited') {
       return winner === user.uid ? `You won! @${partner.username} forfeited.` : `You forfeited.`;
    }
    if (status === 'draw') {
      return "It's a draw!";
    }
    return '';
  };

  const handleCellClick = (index: number) => {
    if (status === 'active' && isMyTurn && !board[index]) {
      onMakeMove(index);
    }
  };

  const Cell: React.FC<{ index: number }> = ({ index }) => {
    const value = board[index];
    const isWinningCell = winningLine?.includes(index);
    return (
      <button
        onClick={() => handleCellClick(index)}
        className={`w-20 h-20 md:w-24 md:h-24 flex items-center justify-center text-4xl font-bold rounded-lg transition-colors duration-300
          ${isWinningCell ? 'bg-green-400 dark:bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}
          ${!value && isMyTurn && status === 'active' ? 'cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600' : 'cursor-default'}
        `}
        aria-label={`Board cell ${index + 1}, value: ${value || 'empty'}`}
        disabled={!!value || !isMyTurn || status !== 'active'}
      >
        {value === 'X' && <span className="text-blue-500">X</span>}
        {value === 'O' && <span className="text-red-500">O</span>}
      </button>
    );
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animation-fade-in" role="dialog" aria-modal="true" aria-labelledby="game-title">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm animation-scale-in flex flex-col items-center">
        <h2 id="game-title" className="text-2xl font-bold text-gray-800 dark:text-gray-100">Tic-Tac-Toe</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-blue-500">{user.username} (X)</span> vs <span className="font-semibold text-red-500">{partner.username} (O)</span>
        </p>
        
        <div className="my-6 grid grid-cols-3 gap-2">
          {board.map((_, index) => <Cell key={index} index={index} />)}
        </div>

        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 h-8 flex items-center">{getStatusText()}</p>
        
        {status === 'active' && (
          <button
            onClick={onForfeit}
            className="mt-4 px-4 py-2 text-sm text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md font-semibold"
          >
            Forfeit
          </button>
        )}
      </div>
    </div>
  );
};

export default GameModal;