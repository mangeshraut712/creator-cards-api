const { throwAppError } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const creatorCardRepository = require('@app/repository/creator-card');
const serializeCard = require('./helpers/serialize-card');

async function getCreatorCard(serviceData) {
  const { slug, access_code: accessCode } = serviceData;

  const card = await creatorCardRepository.findOne({ query: { slug } });

  if (!card) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
  }

  if (card.status === 'draft') {
    throwAppError(CreatorCardMessages.CARD_IS_DRAFT, 'NF02');
  }

  if (card.access_type === 'private' && !accessCode) {
    throwAppError(CreatorCardMessages.PRIVATE_CARD_ACCESS_CODE_REQUIRED, 'AC03');
  }

  if (card.access_type === 'private' && accessCode !== card.access_code) {
    throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE, 'AC04');
  }

  const serializedResponse = serializeCard(card, { includeAccessCode: false });

  return serializedResponse;
}

module.exports = getCreatorCard;
