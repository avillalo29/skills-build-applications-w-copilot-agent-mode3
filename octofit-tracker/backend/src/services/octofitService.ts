import { Activity, Team, User, Workout } from '../models/index.js';

type ActivityInput = {
  userId: string;
  teamId: string;
  type: string;
  minutes: number;
};

type TeamInput = {
  name: string;
  mascot: string;
  members?: string[];
};

function clientError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw clientError('Activity details are required');
  }
  const { userId, teamId, type, minutes } = input as Partial<ActivityInput>;
  if (!isObjectId(userId) || !isObjectId(teamId)) {
    throw clientError('Valid userId and teamId are required');
  }
  if (typeof type !== 'string' || !type.trim() || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw clientError('A type and positive minutes value are required');
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user) throw clientError('User not found', 404);
  if (!team) throw clientError('Team not found', 404);

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw clientError('Team details are required');
  }
  const { name, mascot, members = [] } = input as Partial<TeamInput>;
  if (typeof name !== 'string' || !name.trim()) throw clientError('A team name is required');
  if (typeof mascot !== 'string' || !mascot.trim()) throw clientError('A team mascot is required');
  if (!Array.isArray(members) || !members.every(isObjectId)) throw clientError('Members must be valid user IDs');

  const users = members.length ? await User.find({ _id: { $in: members } }).select('_id') : [];
  if (users.length !== new Set(members).size) throw clientError('One or more team members were not found', 404);
  return Team.create({ name: name.trim(), mascot: mascot.trim(), members: users.map(({ _id }) => _id) });
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate<{ _id: unknown; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [String(_id), totalPoints]));
  return teams
    .map(({ _id, name }) => ({ teamName: name, totalPoints: pointsByTeam.get(String(_id)) ?? 0 }))
    .sort((first, second) => second.totalPoints - first.totalPoints || first.teamName.localeCompare(second.teamName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function focusForText(value: string) {
  const normalized = value.toLowerCase();
  if (/run|cycle|swim|walk|cardio|endurance/.test(normalized)) return 'endurance';
  if (/strength|weight|resistance|muscle/.test(normalized)) return 'strength';
  if (/yoga|stretch|mobility|flexibility/.test(normalized)) return 'mobility';
  return normalized;
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) throw clientError('User not found', 404);

  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const goalFocus = focusForText(user.fitnessGoal);
  const activityFocus = recentActivity ? focusForText(recentActivity.type) : undefined;
  const workouts = await Workout.find().lean();
  return workouts
    .map((workout) => {
      const focus = workout.focus.toLowerCase();
      const matchesGoal = focus === goalFocus;
      const matchesActivity = focus === activityFocus;
      const reason = matchesGoal
        ? `This workout supports your ${user.fitnessGoal} fitness goal.`
        : matchesActivity
          ? `This workout matches your recent ${recentActivity?.type} activity.`
          : `This workout can complement your ${user.fitnessGoal} fitness goal.`;
      return { ...workout, reason, relevance: Number(matchesGoal) + Number(matchesActivity) };
    })
    .sort((first, second) => second.relevance - first.relevance || first.title.localeCompare(second.title))
    .map(({ relevance: _relevance, ...workout }) => workout);
}

export { User };
