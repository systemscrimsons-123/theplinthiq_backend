import { RequestType, UserRole } from '@prisma/client';

export type InteractionMode = 'open' | 'request_only' | 'pitch_only' | 'blocked';

export interface InteractionPolicyRule {
  fromRole: UserRole;
  toRole: UserRole;
  mode: InteractionMode;
  allowedRequestTypes: RequestType[];
}

export const PARTICIPANT_ROLES: UserRole[] = [
  'artist',
  'gallery',
  'art_professional',
  'collector',
];

const blocked = (fromRole: UserRole, toRole: UserRole): InteractionPolicyRule => ({
  fromRole,
  toRole,
  mode: 'blocked',
  allowedRequestTypes: [],
});

export const INTERACTION_POLICY: InteractionPolicyRule[] = [
  blocked('artist', 'artist'),
  { fromRole: 'artist', toRole: 'gallery', mode: 'pitch_only', allowedRequestTypes: [] },
  blocked('artist', 'art_professional'),
  blocked('artist', 'collector'),

  { fromRole: 'gallery', toRole: 'artist', mode: 'open', allowedRequestTypes: ['pvr', 'enquiry', 'visit'] },
  blocked('gallery', 'gallery'),
  blocked('gallery', 'art_professional'),
  blocked('gallery', 'collector'),

  { fromRole: 'art_professional', toRole: 'artist', mode: 'open', allowedRequestTypes: ['pvr', 'enquiry', 'visit', 'introduction'] },
  { fromRole: 'art_professional', toRole: 'gallery', mode: 'open', allowedRequestTypes: ['pvr', 'enquiry', 'visit', 'introduction'] },
  blocked('art_professional', 'art_professional'),
  blocked('art_professional', 'collector'),

  { fromRole: 'collector', toRole: 'artist', mode: 'request_only', allowedRequestTypes: ['introduction', 'pvr', 'visit'] },
  { fromRole: 'collector', toRole: 'gallery', mode: 'request_only', allowedRequestTypes: ['introduction', 'pvr', 'visit'] },
  blocked('collector', 'art_professional'),
  blocked('collector', 'collector'),
];

const policyMap = new Map(
  INTERACTION_POLICY.map((rule) => [`${rule.fromRole}:${rule.toRole}`, rule]),
);

export function getInteractionPolicy(
  fromRole: UserRole,
  toRole: UserRole,
): InteractionPolicyRule | undefined {
  return policyMap.get(`${fromRole}:${toRole}`);
}
