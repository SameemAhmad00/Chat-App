export function checkWinner(board: ('X' | 'O' | '')[]): { winner: 'X' | 'O' | 'draw', line?: number[] } | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    // FIX: Assign board[a] to a constant to ensure TypeScript can correctly narrow its type.
    const player = board[a];
    if (player !== '' && player === board[b] && player === board[c]) {
      return { winner: player, line: lines[i] };
    }
  }
  if (board.every(cell => cell !== '')) {
      return { winner: 'draw' };
  }
  return null;
}