// Which screen a visitor gets: sign-in, access request, waiting, refused, or the app.
export function gateFor(session, member) {
  if (!session) return 'signed-out';
  if (!member) return 'no-member';
  if (member.status === 'pending') return 'pending';
  if (member.status === 'refused') return 'refused';
  return 'active';
}
