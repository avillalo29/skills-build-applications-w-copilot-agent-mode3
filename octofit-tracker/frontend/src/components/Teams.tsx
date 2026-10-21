import { useApiData } from './useApiData.js';

type Team = { name: string; mascot?: string; members: unknown[] };

export default function Teams() {
  const result = useApiData<{ teams: Team[] }>('/api/teams');
  return <section><h2>Teams</h2>
    {result.status === 'loading' && <p role="status">Loading teams...</p>}
    {result.status === 'error' && <p role="alert">Unable to load teams: {result.message}</p>}
    {result.status === 'success' && (result.data.teams.length === 0
      ? <p>No teams yet.</p>
      : <ul>{result.data.teams.map((team) => <li key={team.name}>
        {team.name}{team.mascot ? ` (${team.mascot})` : ''} — {team.members.length} members
      </li>)}</ul>)}
  </section>;
}
