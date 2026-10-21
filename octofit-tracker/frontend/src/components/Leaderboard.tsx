import { useApiData } from './useApiData.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const result = useApiData<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard');
  return <section><h2>Leaderboard</h2>
    {result.status === 'loading' && <p role="status">Loading leaderboard...</p>}
    {result.status === 'error' && <p role="alert">Unable to load leaderboard: {result.message}</p>}
    {result.status === 'success' && (result.data.leaderboard.length === 0
      ? <p>No leaderboard rankings yet.</p>
      : <ol>{result.data.leaderboard.map((entry) => <li key={entry.teamName}>
        {entry.teamName}: {entry.totalPoints} points (rank {entry.rank})
      </li>)}</ol>)}
  </section>;
}
