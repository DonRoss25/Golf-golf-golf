// Shared Prisma `select` for user relations. Never spread the full User
// model into an API response or a prop passed to a client component —
// it carries `passwordHash`. Use this (or a subset of it) everywhere a
// user relation is included.
export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  homeClubName: true,
  ghinNumber: true,
  isGuest: true,
  createdAt: true,
} as const;
