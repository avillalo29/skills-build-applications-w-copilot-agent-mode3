import { useApiData } from './useApiData.js';

type Activity = {
  type: string;
  minutes: number;
  points: number;
  occurredAt?: string;
};

export default function Activities() {
  const result = useApiData<{ activities: Activity[] }>('/api/activities');
  return <section><h2>Activities</h2>
    {result.status === 'loading' && <p role="status">Loading activities...</p>}
    {result.status === 'error' && <p role="alert">Unable to load activities: {result.message}</p>}
    {result.status === 'success' && (result.data.activities.length === 0
      ? <p>No activities yet.</p>
      : <ul>{result.data.activities.map((activity, index) => <li key={`${activity.type}-${activity.occurredAt ?? index}`}>
        {activity.type}: {activity.minutes} minutes, {activity.points} points
      </li>)}</ul>)}
  </section>;
}
