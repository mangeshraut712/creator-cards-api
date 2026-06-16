const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const creatorCardRepository = require('@app/repository/creator-card');
const serializeCard = require('./helpers/serialize-card');

const deleteSpec = `root {
  slug string<minLength:1>
  creator_reference string<length:20>
}`;

const parsedDeleteSpec = validator.parse(deleteSpec);

async function deleteCreatorCard(serviceData) {
  const validatedData = validator.validate(serviceData, parsedDeleteSpec);

  const card = await creatorCardRepository.findOne({ query: { slug: validatedData.slug } });

  if (!card) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
  }

  if (card.creator_reference !== validatedData.creator_reference) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
  }

  const deletedAt = Date.now();

  await creatorCardRepository.deleteOne({ query: { slug: validatedData.slug } });

  const serializedResponse = serializeCard(card, {
    deletedOverride: deletedAt,
    updatedOverride: deletedAt,
  });

  return serializedResponse;
}

module.exports = deleteCreatorCard;
