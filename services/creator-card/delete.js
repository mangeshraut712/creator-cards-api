const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const creatorCardRepository = require('@app/repository/creator-card');

const deleteSpec = `root {
  creator_reference string<length:20>
}`;

const parsedDeleteSpec = validator.parse(deleteSpec);

async function deleteCreatorCard(slug, creatorReference) {
  // Validate creator_reference length
  const validatedData = validator.validate(
    { creator_reference: creatorReference },
    parsedDeleteSpec
  );

  // Find the card by slug that is not deleted
  const card = await creatorCardRepository.findOne({ query: { slug } });

  if (!card) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
  }

  // Verify creator_reference matches
  if (card.creator_reference !== validatedData.creator_reference) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
  }

  // Soft delete: set deleted timestamp
  const now = Date.now();
  await creatorCardRepository.updateOne({
    query: { slug },
    updateValues: {
      deleted: now,
      updated: now,
    },
  });

  // Serialize: Map _id to id, keep deleted timestamp
  const { _id, ...rest } = card;
  return {
    id: _id.toString(),
    ...rest,
    deleted: now,
    updated: now,
  };
}

module.exports = { deleteCreatorCard };
