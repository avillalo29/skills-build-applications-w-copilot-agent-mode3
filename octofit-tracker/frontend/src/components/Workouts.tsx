import { useApiData } from './useApiData.js';

type Workout = { title: string; focus: string; minutes: number; difficulty: string; reason: string };

export default function Workouts() {
  const result = useApiData<{ suggestions: Workout[] }>(`/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`);
  return <section><h2>Workout suggestions</h2>
    {result.status === 'loading' && <p role="status">Loading workout suggestions...</p>}
    {result.status === 'error' && <p role="alert">Unable to load workout suggestions: {result.message}</p>}
    {result.status === 'success' && (result.data.suggestions.length === 0
      ? <p>No workout suggestions are available.</p>
      : <ul>{result.data.suggestions.map((workout) => <li key={workout.title}>
        <strong>{workout.title}</strong> — {workout.focus}, {workout.minutes} minutes, {workout.difficulty}. {workout.reason}
      </li>)}</ul>)}
  </section>;
}
