const { throwAppError } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const { CreatorCard } = require('@app/models');

function serializeCard(card) {
  const { _id, __v, ...rest } = card;
  return {
    id: _id,
    ...rest,
  };
}

async function deleteCreatorCard(slug, creatorReference) {
  // Validate creator_reference length
  if (!creatorReference || creatorReference.length !== 20) {
    throwAppError('creator_reference must be exactly 20 characters', 'SPCL_VALIDATION');
  }

  // Find the card by slug that is not deleted
  const card = await CreatorCard.findOne({ slug, deleted: null }).exec();

  if (!card) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
  }

  // Soft delete: set deleted timestamp
  card.deleted = Date.now();
  card.updated = Date.now();
  await card.save();

  // Serialize: Map _id to id
  return serializeCard(card.toObject());
}

module.exports = deleteCreatorCard;
