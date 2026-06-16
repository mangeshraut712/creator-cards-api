const { throwAppError } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const creatorCardRepository = require('@app/repository/creator-card');

async function getCreatorCard(slug, queryParams = {}) {
  // Find the card by slug that is not deleted
  const card = await creatorCardRepository.findOne({ query: { slug } });

  // Rule 1: If no card with that slug exists → HTTP 404, NF01
  if (!card) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
  }

  // Rule 2: If the card exists but its status is draft → HTTP 404, NF02
  if (card.status === 'draft') {
    throwAppError(CreatorCardMessages.CARD_IS_DRAFT, 'NF02');
  }

  // Rule 3: If the card is private and no access_code query parameter was supplied → HTTP 403, AC03
  if (card.access_type === 'private' && !queryParams.access_code) {
    throwAppError(CreatorCardMessages.PRIVATE_CARD_ACCESS_CODE_REQUIRED, 'AC03');
  }

  // Rule 4: If the card is private and the supplied access_code does not match → HTTP 403, AC04
  if (card.access_type === 'private' && queryParams.access_code !== card.access_code) {
    throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE, 'AC04');
  }

  // Serialize: Map _id to id, NEVER return access_code
  // eslint-disable-next-line camelcase
  const { _id, access_code, ...rest } = card;
  return {
    id: _id.toString(),
    ...rest,
  };
}

module.exports = { getCreatorCard };
