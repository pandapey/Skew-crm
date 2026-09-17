export const LEAD_ROLE = 'Lead'
export const LEAD_POSITION = 'Team Lead'

export const teamMemberKey = (member) =>
  String(member?.name ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

export const isTeamLead = (member) =>
  String(member?.roleInProject ?? '').trim().toLowerCase() === LEAD_ROLE.toLowerCase()

const MERGEABLE_FIELDS = ['position', 'department', 'availability', 'avatar', 'roleInProject']

export function dedupeTeam(members) {
  const byPerson = new Map()
  for (const raw of Array.isArray(members) ? members : []) {
    if (!raw) continue
    const key = teamMemberKey(raw)
    if (!key) continue
    const existing = byPerson.get(key)
    if (!existing) {
      byPerson.set(key, { ...raw })
      continue
    }

    for (const field of MERGEABLE_FIELDS) {
      if (!existing[field] && raw[field]) existing[field] = raw[field]
    }
    if (isTeamLead(raw) && !isTeamLead(existing)) {
      existing.roleInProject = raw.roleInProject
      existing.position = raw.position || existing.position || LEAD_POSITION
    }
  }
  const people = [...byPerson.values()]

  return [...people.filter(isTeamLead), ...people.filter((m) => !isTeamLead(m))]
}

export function buildProjectTeam(project) {
  const lead = project?.lead
  return dedupeTeam([
    ...(lead ? [{ name: lead, roleInProject: LEAD_ROLE, position: LEAD_POSITION }] : []),
    ...((project?.members || []).map((m) => ({
      name: m?.name,
      roleInProject: m?.role || 'Member',
      position: m?.role || 'Member',
    }))),
  ])
}
